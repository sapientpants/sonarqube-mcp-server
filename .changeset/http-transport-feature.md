---
'sonarqube-mcp-server': minor
---

feat: add HTTP transport support for MCP server

Implements Streamable HTTP transport as an alternative to stdio, enabling:

- Web service deployments and programmatic access via HTTP/REST
- Session management with automatic lifecycle control
- RESTful API endpoints for MCP operations
- Server-sent events for real-time notifications
- Security features including DNS rebinding protection and CORS configuration

This change maintains full backward compatibility with the default stdio transport.
