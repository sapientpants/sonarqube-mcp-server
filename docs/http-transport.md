# Streamable HTTP Transport with OAuth 2.0 Metadata

The SonarQube MCP Server supports Streamable HTTP transport (as defined in MCP specification) with OAuth 2.0 metadata endpoints for authentication discovery.

## Configuration

### Environment Variables

- `MCP_TRANSPORT`: Set to `http` to enable HTTP transport
- `MCP_HTTP_PORT`: Port to listen on (default: 3000)
- `MCP_HTTP_HOST`: Host to bind to (default: localhost)
- `MCP_HTTP_PUBLIC_URL`: Public URL of the MCP server (default: http://localhost:3000)
- `MCP_OAUTH_AUTH_SERVERS`: Comma-separated list of external authorization server URLs
- `MCP_OAUTH_BUILTIN`: Set to `true` to enable built-in authorization server metadata
- `MCP_HTTP_ALLOW_NO_AUTH`: **SECURITY WARNING** - Set to `true` to allow unauthenticated access (DEVELOPMENT ONLY - NEVER USE IN PRODUCTION)

### Example Configuration

```bash
export MCP_TRANSPORT=http
export MCP_HTTP_PORT=8080
export MCP_HTTP_HOST=0.0.0.0
export MCP_HTTP_PUBLIC_URL=https://mcp.company.com
export MCP_OAUTH_AUTH_SERVERS=https://auth.company.com
```

## OAuth 2.0 Metadata Endpoints

### Protected Resource Metadata (RFC9728)

**Endpoint**: `/.well-known/oauth-protected-resource`

Returns metadata about the protected resource and its authorization requirements:

```json
{
  "resource": "https://mcp.company.com",
  "authorization_servers": ["https://auth.company.com"],
  "bearer_methods_supported": ["header"],
  "resource_signing_alg_values_supported": ["RS256"],
  "scopes_supported": ["sonarqube:read", "sonarqube:write", "sonarqube:admin"],
  "resource_documentation": "https://github.com/sapientpants/sonarqube-mcp-server/blob/main/README.md"
}
```

### Authorization Server Metadata (RFC8414) - Optional

**Endpoint**: `/.well-known/oauth-authorization-server`

Only available when `MCP_OAUTH_BUILTIN=true`. Returns metadata about the built-in authorization server:

```json
{
  "issuer": "https://mcp.company.com",
  "authorization_endpoint": "https://mcp.company.com/oauth/authorize",
  "token_endpoint": "https://mcp.company.com/oauth/token",
  "jwks_uri": "https://mcp.company.com/oauth/jwks",
  "scopes_supported": ["sonarqube:read", "sonarqube:write", "sonarqube:admin"],
  "response_types_supported": ["code"],
  "response_modes_supported": ["query"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "token_endpoint_auth_methods_supported": ["client_secret_basic", "client_secret_post"],
  "token_endpoint_auth_signing_alg_values_supported": ["RS256"],
  "service_documentation": "https://github.com/sapientpants/sonarqube-mcp-server/blob/main/README.md",
  "code_challenge_methods_supported": ["S256"]
}
```

## MCP Endpoint

The server provides a single MCP endpoint at `/mcp` that supports both:
- **POST**: For sending JSON-RPC messages to the server
- **GET**: For establishing SSE streams for server-to-client communication

### Protocol Version

Clients should include the `MCP-Protocol-Version` header in their requests:

```http
MCP-Protocol-Version: 2025-06-18
```

## Authentication

The HTTP transport **REQUIRES** Bearer token authentication for the MCP endpoint in production environments.

### Security Requirements

⚠️ **IMPORTANT**: Authentication is mandatory for production use. The server will reject requests if no authentication is configured unless explicitly running in insecure development mode.

To configure authentication, you must set either:
- `MCP_OAUTH_AUTH_SERVERS`: External OAuth 2.0 authorization server URLs, OR
- `MCP_OAUTH_BUILTIN=true`: Enable the built-in authorization server (for development)

### Development Mode (INSECURE)

For local development ONLY, you can bypass authentication by setting:
```bash
export MCP_HTTP_ALLOW_NO_AUTH=true
```

**WARNING**: This completely disables authentication and exposes all MCP endpoints without any access control. NEVER use this in production or any environment accessible from the internet.

### WWW-Authenticate Header

When a request is made without authentication, the server responds with:

```http
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer realm="MCP SonarQube Server" resource_metadata="https://mcp.company.com/.well-known/oauth-protected-resource"
Content-Type: application/json

{
  "error": "unauthorized",
  "error_description": "Bearer token required"
}
```

### Bearer Token Usage

Include the Bearer token in the Authorization header:

```http
POST /mcp HTTP/1.1
Host: mcp.company.com
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "method": "tools/list",
  "id": 1
}
```

## Health Check

A health check endpoint is available at `/health`:

```http
GET /health HTTP/1.1
Host: mcp.company.com

HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "ok"
}
```

## CORS Support

The HTTP transport includes CORS support for cross-origin requests. Custom CORS options can be configured programmatically.

## Token Validation

The HTTP transport includes full OAuth 2.0 token validation support. When configured with authorization servers, it will:
- Validate JWT tokens against the configured issuers
- Verify token signatures using JWKS endpoints
- Check token expiration and other standard claims
- Enforce audience and resource validation

For more details on token validation, see [OAuth Token Validation](./oauth-token-validation.md).