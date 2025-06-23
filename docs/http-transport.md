# Streamable HTTP Transport with OAuth 2.0 Metadata

The SonarQube MCP Server supports Streamable HTTP transport (as defined in MCP specification) with OAuth 2.0 metadata endpoints for authentication discovery.

## Configuration

### Environment Variables

#### Basic Configuration
- `MCP_TRANSPORT`: Set to `http` to enable HTTP transport (can also use `SONARQUBE_MCP_MODE` for compatibility)
- `MCP_HTTP_PORT`: Port to listen on (default: 3000 for HTTP, 3443 for HTTPS)  
- `MCP_HTTP_HOST`: Host to bind to (default: localhost, use 0.0.0.0 for all interfaces)
- `MCP_HTTP_PUBLIC_URL`: Public URL of the MCP server (default: http://localhost:3000)
- `SONARQUBE_MCP_BASE_URL`: Alias for MCP_HTTP_PUBLIC_URL (for compatibility)

#### HTTPS/TLS Configuration
- `MCP_HTTP_TLS_ENABLED`: Set to `true` to enable HTTPS
- `MCP_HTTP_TLS_CERT`: Path to TLS certificate file
- `MCP_HTTP_TLS_KEY`: Path to TLS key file
- `MCP_HTTP_TLS_CA`: Path to CA certificate file (optional)

#### OAuth Configuration
- `MCP_OAUTH_AUTH_SERVERS`: Comma-separated list of external authorization server URLs
- `MCP_OAUTH_BUILTIN`: Set to `true` to enable built-in authorization server metadata
- `MCP_HTTP_ALLOW_NO_AUTH`: **SECURITY WARNING** - Set to `true` to allow unauthenticated access (DEVELOPMENT ONLY - NEVER USE IN PRODUCTION)

#### Session Management
- `MCP_SESSION_TIMEOUT`: Session timeout in milliseconds (default: 3600000 - 1 hour)
- `MCP_SESSION_CLEANUP_INTERVAL`: Cleanup interval in milliseconds (default: 300000 - 5 minutes)
- `MCP_MAX_SESSIONS`: Maximum concurrent sessions (default: 1000)

#### Service Account Configuration
- `SONARQUBE_TOKEN`: Default service account token
- `SONARQUBE_SA{N}_TOKEN`: Service account N token (where N is 1-10)
- `SONARQUBE_SA{N}_NAME`: Service account N display name
- `SONARQUBE_SA{N}_URL`: Service account N SonarQube URL (optional)
- `SONARQUBE_SA{N}_ORGANIZATION`: Service account N organization (optional)
- `SONARQUBE_SA{N}_SCOPES`: Comma-separated allowed scopes for service account N

#### Service Account Mapping Rules
- `MCP_DEFAULT_SERVICE_ACCOUNT`: Default service account ID (default: 'default')
- `MCP_MAPPING_RULE_{N}`: Mapping rule N (where N is 1-10) in format: `priority:1,user:*@company.com,issuer:https://*.auth.com,scopes:read|write,sa:company-sa`
  - `priority`: Rule priority (lower = higher priority)
  - `user`: User subject pattern (glob-style: * matches any characters, ? matches one character)
  - `issuer`: Issuer pattern (glob-style: * matches any characters, ? matches one character)
  - `scopes`: Required scopes (pipe-separated)
  - `sa`: Service account ID to use

### Example Configurations

#### Basic HTTP Configuration
```bash
export MCP_TRANSPORT=http
export MCP_HTTP_PORT=8080
export MCP_HTTP_HOST=0.0.0.0
export MCP_HTTP_PUBLIC_URL=https://mcp.company.com
export MCP_OAUTH_AUTH_SERVERS=https://auth.company.com
```

#### HTTPS Configuration
```bash
export MCP_TRANSPORT=http
export MCP_HTTP_TLS_ENABLED=true
export MCP_HTTP_TLS_CERT=/path/to/cert.pem
export MCP_HTTP_TLS_KEY=/path/to/key.pem
export MCP_HTTP_PORT=3443
export MCP_HTTP_HOST=0.0.0.0
export MCP_HTTP_PUBLIC_URL=https://mcp.company.com:3443
export MCP_OAUTH_AUTH_SERVERS=https://auth.company.com
```

#### Service Account Configuration
```bash
# Default service account
export SONARQUBE_TOKEN=squ_default_token_here
export SONARQUBE_URL=https://sonarcloud.io

# Additional service accounts
export SONARQUBE_SA1_TOKEN=squ_dev_team_token
export SONARQUBE_SA1_NAME="Development Team"
export SONARQUBE_SA1_SCOPES="sonarqube:read,sonarqube:write"

export SONARQUBE_SA2_TOKEN=squ_qa_team_token  
export SONARQUBE_SA2_NAME="QA Team"
export SONARQUBE_SA2_SCOPES="sonarqube:read"

# Mapping rules
export MCP_MAPPING_RULE_1="priority:1,user:*@dev.company.com,sa:sa1"
export MCP_MAPPING_RULE_2="priority:2,user:*@qa.company.com,sa:sa2"
export MCP_DEFAULT_SERVICE_ACCOUNT=default
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

## Health Check Endpoints

### Health Check

A basic health check endpoint is available at `/health`:

```http
GET /health HTTP/1.1
Host: mcp.company.com

HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "ok"
}
```

### Ready Check

A readiness check endpoint is available at `/ready`:

```http
GET /ready HTTP/1.1
Host: mcp.company.com

HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "ready",
  "features": {
    "authentication": true,
    "sessionManagement": true,
    "serviceAccountMapping": true,
    "tls": false
  }
}
```

If the server is not ready:

```http
HTTP/1.1 503 Service Unavailable
Content-Type: application/json

{
  "status": "not_ready",
  "message": "Server is initializing"
}
```

## CORS Support

The HTTP transport includes CORS support for cross-origin requests. Custom CORS options can be configured programmatically.

## Session Management

The HTTP transport includes session management for concurrent users:

### Session Creation
When a valid Bearer token is provided, the server:
1. Validates the OAuth token
2. Maps the user to a service account based on configured rules
3. Creates a SonarQube client with the service account credentials
4. Returns a session ID in the `MCP-Session-ID` response header

### Session Usage
Clients should include the session ID in subsequent requests:

```http
POST /mcp HTTP/1.1
Host: mcp.company.com
Authorization: Bearer <access_token>
MCP-Session-ID: 550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json
```

### Session Lifecycle
- Sessions timeout after 1 hour of inactivity (configurable)
- Expired sessions are automatically cleaned up
- Each user can have multiple concurrent sessions
- Sessions are tied to the authenticated user (subject claim)

## Service Account Mapping

The server maps OAuth users to SonarQube service accounts based on configurable rules:

### Mapping Process
1. Extract user claims from the validated OAuth token
2. Evaluate mapping rules in priority order
3. Use the first matching rule's service account
4. Fall back to default service account if no rules match

### Mapping Rule Examples

Map all users from dev.company.com to development service account:
```bash
export MCP_MAPPING_RULE_1="priority:1,user:*@dev.company.com,sa:sa1"
```

Map users from specific issuer with admin scope to admin service account:
```bash
export MCP_MAPPING_RULE_2="priority:2,issuer:auth.company.com,scopes:sonarqube:admin,sa:admin"
```

### Service Account Isolation
Each session uses its own SonarQube client instance with the mapped service account credentials, ensuring:
- User actions are performed with appropriate permissions
- Audit trails show the service account used
- No credential leakage between users

## Token Validation

The HTTP transport includes full OAuth 2.0 token validation support. When configured with authorization servers, it will:
- Validate JWT tokens against the configured issuers
- Verify token signatures using JWKS endpoints
- Check token expiration and other standard claims
- Enforce audience and resource validation

For more details on token validation, see [OAuth Token Validation](./oauth-token-validation.md).