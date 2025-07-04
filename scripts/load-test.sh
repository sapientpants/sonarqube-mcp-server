#!/bin/bash
# Load testing script for SonarQube MCP Server auto-scaling validation
# Tests HPA behavior under load using k6 or Apache Bench

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}⚡ SonarQube MCP Server - Load Testing & Auto-scaling Validation${NC}"
echo "================================================================="

# Configuration
NAMESPACE="${NAMESPACE:-sonarqube-mcp}"
SERVICE_NAME="${SERVICE_NAME:-sonarqube-mcp}"
PORT="${PORT:-3000}"
DURATION="${DURATION:-300}"  # 5 minutes default
CONCURRENT_USERS="${CONCURRENT_USERS:-50}"
REQUESTS_PER_SECOND="${RPS:-100}"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "\n${YELLOW}📋 Checking prerequisites...${NC}"

# Check for kubectl
if ! command_exists kubectl; then
    echo -e "${RED}❌ kubectl is not installed. Please install it first.${NC}"
    exit 1
fi

# Check for load testing tools
LOAD_TOOL=""
if command_exists k6; then
    LOAD_TOOL="k6"
    echo -e "✅ k6 is installed"
elif command_exists ab; then
    LOAD_TOOL="ab"
    echo -e "✅ Apache Bench is installed"
else
    echo -e "${RED}❌ No load testing tool found. Please install k6 or Apache Bench.${NC}"
    echo "   Install k6: brew install k6 (macOS) or https://k6.io/docs/getting-started/installation/"
    echo "   Install ab: Usually comes with Apache (httpd-tools package)"
    exit 1
fi

# Function to get current replica count
get_replica_count() {
    kubectl get deployment "$SERVICE_NAME" -n "$NAMESPACE" -o jsonpath='{.status.replicas}' 2>/dev/null || echo "0"
}

# Function to get HPA status
get_hpa_status() {
    kubectl get hpa -n "$NAMESPACE" -o wide 2>/dev/null || echo "No HPA found"
}

# Function to monitor resources
monitor_resources() {
    echo -e "\n${BLUE}📊 Monitoring resources during load test...${NC}"
    echo "Time | Replicas | CPU Usage | Memory Usage | Ready Pods"
    echo "--------------------------------------------------------"
    
    while true; do
        timestamp=$(date +"%H:%M:%S")
        replicas=$(get_replica_count)
        
        # Get CPU and memory from HPA
        hpa_info=$(kubectl get hpa "$SERVICE_NAME" -n "$NAMESPACE" -o jsonpath='{.status.currentCPUUtilizationPercentage}:{.status.currentReplicas}:{.status.desiredReplicas}' 2>/dev/null || echo "0:0:0")
        cpu_usage=$(echo "$hpa_info" | cut -d: -f1)
        current_replicas=$(echo "$hpa_info" | cut -d: -f2)
        desired_replicas=$(echo "$hpa_info" | cut -d: -f3)
        
        # Get ready pods
        ready_pods=$(kubectl get pods -n "$NAMESPACE" -l "app.kubernetes.io/name=$SERVICE_NAME" -o jsonpath='{.items[?(@.status.conditions[?(@.type=="Ready")].status=="True")].metadata.name}' | wc -w | tr -d ' ')
        
        echo "$timestamp | $current_replicas/$desired_replicas | ${cpu_usage:-N/A}% | N/A | $ready_pods"
        
        sleep 5
    done
}

# Create k6 test script
create_k6_script() {
    cat > /tmp/sonarqube-mcp-load-test.js << 'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: __ENV.CONCURRENT_USERS / 2 }, // Ramp up to half users
    { duration: '30s', target: __ENV.CONCURRENT_USERS },     // Ramp up to full users
    { duration: __ENV.DURATION - 90 + 's', target: __ENV.CONCURRENT_USERS }, // Stay at full load
    { duration: '30s', target: 0 },                          // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    errors: ['rate<0.1'],             // Error rate should be below 10%
  },
};

const BASE_URL = `http://${__ENV.SERVICE_URL}`;

export default function () {
  // Test different endpoints
  const endpoints = [
    '/health',
    '/ready',
    '/metrics',
  ];
  
  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  
  const res = http.get(`${BASE_URL}${endpoint}`);
  
  // Check response
  const success = check(res, {
    'status is 200 or 503': (r) => r.status === 200 || r.status === 503,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  errorRate.add(!success);
  
  // Random sleep between 0.5 and 2 seconds
  sleep(Math.random() * 1.5 + 0.5);
}
EOF
}

# Function to run k6 load test
run_k6_test() {
    local service_url=$1
    
    echo -e "\n${BLUE}🚀 Running k6 load test...${NC}"
    echo "Target: http://$service_url"
    echo "Duration: $DURATION seconds"
    echo "Concurrent users: $CONCURRENT_USERS"
    
    create_k6_script
    
    k6 run \
        -e SERVICE_URL="$service_url" \
        -e CONCURRENT_USERS="$CONCURRENT_USERS" \
        -e DURATION="$DURATION" \
        /tmp/sonarqube-mcp-load-test.js
}

# Function to run Apache Bench test
run_ab_test() {
    local service_url=$1
    
    echo -e "\n${BLUE}🚀 Running Apache Bench load test...${NC}"
    echo "Target: http://$service_url/health"
    echo "Duration: $DURATION seconds"
    echo "Concurrent users: $CONCURRENT_USERS"
    
    # Calculate total requests
    total_requests=$((REQUESTS_PER_SECOND * DURATION))
    
    ab -n "$total_requests" \
       -c "$CONCURRENT_USERS" \
       -t "$DURATION" \
       -s 30 \
       "http://$service_url/health"
}

# Main execution
echo -e "\n${YELLOW}🔍 Checking deployment status...${NC}"

# Check if deployment exists
if ! kubectl get deployment "$SERVICE_NAME" -n "$NAMESPACE" >/dev/null 2>&1; then
    echo -e "${RED}❌ Deployment $SERVICE_NAME not found in namespace $NAMESPACE${NC}"
    exit 1
fi

# Check if HPA exists
if ! kubectl get hpa "$SERVICE_NAME" -n "$NAMESPACE" >/dev/null 2>&1; then
    echo -e "${RED}❌ HPA not found for $SERVICE_NAME in namespace $NAMESPACE${NC}"
    echo "Load testing without auto-scaling..."
fi

# Get initial state
echo -e "\n${BLUE}📊 Initial state:${NC}"
echo "Deployment: $SERVICE_NAME"
echo "Namespace: $NAMESPACE"
echo "Initial replicas: $(get_replica_count)"
echo -e "\nHPA Status:"
get_hpa_status

# Set up port forwarding
echo -e "\n${YELLOW}🔌 Setting up port forwarding...${NC}"
kubectl port-forward -n "$NAMESPACE" "svc/$SERVICE_NAME" 8080:$PORT > /dev/null 2>&1 &
PF_PID=$!
sleep 3

# Verify service is accessible
if ! curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health | grep -q "200\|503"; then
    echo -e "${RED}❌ Service is not responding correctly${NC}"
    kill $PF_PID 2>/dev/null
    exit 1
fi

echo -e "${GREEN}✅ Service is accessible${NC}"

# Start resource monitoring in background
monitor_resources &
MONITOR_PID=$!

# Run load test based on available tool
SERVICE_URL="localhost:8080"

echo -e "\n${YELLOW}⚡ Starting load test...${NC}"
START_TIME=$(date +%s)

case "$LOAD_TOOL" in
    k6)
        run_k6_test "$SERVICE_URL"
        ;;
    ab)
        run_ab_test "$SERVICE_URL"
        ;;
esac

END_TIME=$(date +%s)
DURATION_ACTUAL=$((END_TIME - START_TIME))

# Stop monitoring
kill $MONITOR_PID 2>/dev/null

# Wait for scale down
echo -e "\n${YELLOW}⏳ Waiting 60 seconds for scale down...${NC}"
sleep 60

# Get final state
echo -e "\n${BLUE}📊 Final state:${NC}"
echo "Final replicas: $(get_replica_count)"
echo -e "\nHPA Status:"
get_hpa_status

# Show pod events during test
echo -e "\n${BLUE}📝 Pod events during test:${NC}"
kubectl get events -n "$NAMESPACE" --field-selector involvedObject.kind=Pod \
    --sort-by='.lastTimestamp' | grep -E "(Scaled|Started|Killing)" | tail -10

# Analyze HPA metrics
echo -e "\n${BLUE}📈 HPA scaling analysis:${NC}"

# Get HPA events
kubectl describe hpa "$SERVICE_NAME" -n "$NAMESPACE" | grep -A 20 "Events:" || echo "No HPA events found"

# Cleanup
echo -e "\n${YELLOW}🧹 Cleaning up...${NC}"
kill $PF_PID 2>/dev/null
rm -f /tmp/sonarqube-mcp-load-test.js

# Summary
echo -e "\n================================================================="
echo -e "${GREEN}📊 Load Test Summary:${NC}"
echo "Duration: $DURATION_ACTUAL seconds"
echo "Load tool: $LOAD_TOOL"
echo "Concurrent users: $CONCURRENT_USERS"

# Check if scaling occurred
INITIAL_REPLICAS=1  # Assuming default
FINAL_REPLICAS=$(get_replica_count)

if [ "$FINAL_REPLICAS" -gt "$INITIAL_REPLICAS" ]; then
    echo -e "\n${GREEN}✅ Auto-scaling worked!${NC}"
    echo "Scaled from $INITIAL_REPLICAS to $FINAL_REPLICAS replicas"
else
    echo -e "\n${YELLOW}⚠️  No scaling observed${NC}"
    echo "This could mean:"
    echo "  - Load was not high enough to trigger scaling"
    echo "  - HPA thresholds are too high"
    echo "  - HPA is not configured correctly"
fi

echo -e "\n${YELLOW}💡 Tips:${NC}"
echo "- Increase CONCURRENT_USERS to generate more load"
echo "- Extend DURATION for longer tests"
echo "- Monitor 'kubectl top pods -n $NAMESPACE' during testing"
echo "- Check HPA configuration: kubectl describe hpa -n $NAMESPACE"