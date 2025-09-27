#!/bin/bash

echo "Starting SonarQube MCP Server with HTTP transport..."

# Start the server in the background with HTTP transport
MCP_TRANSPORT_TYPE=http \
MCP_HTTP_PORT=3000 \
SONARQUBE_URL=https://sonarcloud.io \
SONARQUBE_TOKEN=dummy_token \
LOG_LEVEL=INFO \
LOG_FILE=/tmp/http-transport-test.log \
pnpm start &

SERVER_PID=$!
echo "Server started with PID: $SERVER_PID"

# Wait for server to start
echo "Waiting for server to start..."
sleep 3

# Test health endpoint
echo ""
echo "Testing health endpoint..."
curl -s http://localhost:3000/health | jq .

# Create a session
echo ""
echo "Creating session..."
SESSION_RESPONSE=$(curl -s -X POST http://localhost:3000/session)
SESSION_ID=$(echo "$SESSION_RESPONSE" | jq -r .sessionId)
echo "Session created: $SESSION_ID"

# Test MCP endpoint (will fail with placeholder response, but tests the endpoint)
echo ""
echo "Testing MCP endpoint..."
curl -s -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\": \"$SESSION_ID\", \"method\": \"tools/list\", \"params\": {}}" | jq .

# Close session
echo ""
echo "Closing session..."
curl -s -X DELETE "http://localhost:3000/session/$SESSION_ID" | jq .

# Kill the server
echo ""
echo "Stopping server..."
kill $SERVER_PID
wait $SERVER_PID 2>/dev/null

echo ""
echo "Test completed!"
echo "Check logs at /tmp/http-transport-test.log for server logs."