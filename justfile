ping:
  echo '{ "jsonrpc": "2.0", "id": 1, "method": "ping" }' | ./target/debug/sonarqube-mcp-server --mcp

prompts-list:
  echo '{ "jsonrpc": "2.0", "id": 1, "method": "prompts/list" }' | ./target/debug/sonarqube-mcp-server --mcp

prompt-get:
  echo '{ "jsonrpc": "2.0", "id": 1, "method": "prompts/get", "params": {"name":"current_time","arguments": {"city": "hangzhou"} } }' | ./target/debug/sonarqube-mcp-server --mcp

tools-list:
  echo '{ "jsonrpc": "2.0", "id": 1, "method": "tools/list" }' | ./target/debug/sonarqube-mcp-server --mcp

resources-list:
  echo '{ "jsonrpc": "2.0", "id": 1, "method": "resources/list" }' | ./target/debug/sonarqube-mcp-server --mcp

current-time:
  echo '{ "jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": { "name": "get_current_time_in_city", "arguments": {"city":"Hangzhou" } } }' | ./target/debug/sonarqube-mcp-server --mcp
