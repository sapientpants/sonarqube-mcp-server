ping:
  echo '{ "jsonrpc": "2.0", "id": 1, "method": "ping" }' | ./target/debug/sonarqube-mcp-server --mcp

prompts-list:
  echo '{ "jsonrpc": "2.0", "id": 1, "method": "prompts/list" }' | ./target/debug/sonarqube-mcp-server --mcp

prompt-get:
  echo '{ "jsonrpc": "2.0", "id": 1, "method": "prompts/get", "params": {"name":"example","arguments": {} } }' | ./target/debug/sonarqube-mcp-server --mcp

tools-list:
  echo '{ "jsonrpc": "2.0", "id": 1, "method": "tools/list" }' | ./target/debug/sonarqube-mcp-server --mcp

resources-list:
  echo '{ "jsonrpc": "2.0", "id": 1, "method": "resources/list" }' | ./target/debug/sonarqube-mcp-server --mcp

test-mcp:
  echo '{ "jsonrpc": "2.0", "id": 1, "method": "sonarqube_list_projects", "params": {} }' | ./target/debug/sonarqube-mcp-server --mcp
