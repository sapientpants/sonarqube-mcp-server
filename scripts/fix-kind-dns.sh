#!/bin/bash
# Fix DNS resolution in kind cluster for macOS

echo "Fixing DNS resolution in kind cluster..."

# Get the kind cluster name
CLUSTER_NAME="${1:-sonarqube-mcp-test}"

# Get Docker network used by kind
NETWORK=$(docker network ls | grep kind | awk '{print $2}')

if [ -z "$NETWORK" ]; then
    echo "No kind network found. Is the cluster running?"
    exit 1
fi

echo "Kind network: $NETWORK"

# Check host's DNS servers
echo "Host DNS servers:"
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    scutil --dns | grep "nameserver\[[0-9]*\]" | head -3
    HOST_DNS=$(scutil --dns | grep "nameserver\[[0-9]*\]" | head -1 | awk '{print $3}')
else
    # Linux
    cat /etc/resolv.conf | grep nameserver | head -3
    HOST_DNS=$(cat /etc/resolv.conf | grep nameserver | head -1 | awk '{print $2}')
fi

echo "Primary host DNS: $HOST_DNS"

# Method 1: Update CoreDNS to forward to host DNS or public DNS
echo "Updating CoreDNS configuration..."
kubectl -n kube-system get configmap coredns -o yaml > /tmp/coredns-backup.yaml

# Create updated CoreDNS config
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns
  namespace: kube-system
data:
  Corefile: |
    .:53 {
        errors
        health {
           lameduck 5s
        }
        ready
        kubernetes cluster.local in-addr.arpa ip6.arpa {
           pods insecure
           fallthrough in-addr.arpa ip6.arpa
           ttl 30
        }
        prometheus :9153
        forward . 8.8.8.8 8.8.4.4 1.1.1.1 {
           max_concurrent 1000
           prefer_udp
        }
        cache 30
        loop
        reload
        loadbalance
    }
EOF

# Restart CoreDNS pods
kubectl -n kube-system rollout restart deployment coredns
kubectl -n kube-system rollout status deployment coredns --timeout=60s

# Method 2: If on macOS with Docker Desktop, ensure containers can reach host
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Detected macOS. Checking Docker Desktop DNS settings..."
    
    # Test from within a kind node
    NODE=$(kubectl get nodes -o name | head -1 | cut -d'/' -f2)
    echo "Testing DNS from node $NODE..."
    docker exec $NODE nslookup google.com || echo "DNS still failing from node"
fi

# Test DNS resolution
echo -e "\nTesting DNS resolution in cluster..."
kubectl run test-dns --image=busybox --restart=Never --rm -i --command -- sh -c "
echo 'Testing DNS servers...'
nslookup google.com
echo
nslookup sonarcloud.io
" || echo "DNS test failed"

echo -e "\nDNS fix applied. If issues persist, try:"
echo "1. Restart Docker Desktop"
echo "2. Check Docker Desktop > Preferences > Resources > Network"
echo "3. Ensure your host has working DNS (try: nslookup google.com)"