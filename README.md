# SonarQube MCP Server

[![CI](https://github.com/sapientpants/sonarqube-mcp-server/actions/workflows/ci.yml/badge.svg)](https://github.com/sapientpants/sonarqube-mcp-server/actions/workflows/ci.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=sonarqube-mcp-server&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=sonarqube-mcp-server)
[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=sonarqube-mcp-server&metric=bugs)](https://sonarcloud.io/summary/new_code?id=sonarqube-mcp-server)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=sonarqube-mcp-server&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=sonarqube-mcp-server)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=sonarqube-mcp-server&metric=coverage)](https://sonarcloud.io/summary/new_code?id=sonarqube-mcp-server)
[![Duplicated Lines (%)](https://sonarcloud.io/api/project_badges/measure?project=sonarqube-mcp-server&metric=duplicated_lines_density)](https://sonarcloud.io/summary/new_code?id=sonarqube-mcp-server)
[![npm version](https://img.shields.io/npm/v/sonarqube-mcp-server.svg)](https://www.npmjs.com/package/sonarqube-mcp-server)
[![npm downloads](https://img.shields.io/npm/dm/sonarqube-mcp-server.svg)](https://www.npmjs.com/package/sonarqube-mcp-server)
[![License](https://img.shields.io/npm/l/sonarqube-mcp-server.svg)](https://github.com/sapientpants/sonarqube-mcp-server/blob/main/LICENSE)

A Model Context Protocol (MCP) server that integrates with SonarQube to provide AI assistants with access to code quality metrics, issues, and analysis results.

## What's New in v1.9.0

### Built-in Authorization Server
- **OAuth 2.0 Server**: Complete built-in OAuth 2.0 authorization server for self-contained authentication
- **Authorization Code Flow**: Full support for OAuth 2.0 authorization code flow with PKCE
- **Dynamic Client Registration**: Register OAuth clients dynamically via API (RFC7591)
- **User Management**: Built-in user store with secure password hashing (bcrypt)
- **API Key Support**: Generate API keys for automation and CI/CD workflows
- **Token Management**: JWT token issuance with RS256 signing and automatic key rotation
- **Refresh Token Rotation**: Secure refresh token support with automatic rotation
- **Admin Interface**: RESTful API for user and client management
- **Zero Configuration**: Automatically creates default admin user on first start

## Previous Updates

### v1.8.0 - External Identity Provider (IdP) Integration
- **OIDC/OAuth 2.0 Support**: Full integration with external identity providers
- **JWKS Endpoint Discovery**: Automatic discovery and caching of JSON Web Key Sets
- **Provider Support**: Pre-configured support for Azure AD, Okta, Auth0, and Keycloak
- **Group Claim Mapping**: Automatic transformation of provider-specific group formats
- **Multi-tenant Support**: Handle multiple tenants with tenant-specific configurations
- **IdP Health Monitoring**: Continuous monitoring of IdP availability with failover
- **Fallback Authentication**: Graceful fallback to static keys when IdPs are unavailable

### Previous Updates (v1.7.0)

### HTTP Transport with OAuth 2.0 Metadata
- **HTTP Transport**: Added HTTP transport support as an alternative to STDIO
- **OAuth Metadata Endpoints**: Implements RFC9728 (Protected Resource Metadata) and RFC8414 (Authorization Server Metadata)
- **WWW-Authenticate Headers**: Proper Bearer token authentication with metadata discovery
- **CORS Support**: Built-in CORS handling for cross-origin requests
- **Extensible Architecture**: Prepared for future OAuth 2.0 flow implementation

### Previous Updates (v1.6.0)

### Elicitation Support (Experimental)
- **Interactive User Input**: Added support for MCP elicitation capability (requires MCP SDK v1.13.0+)
- **Bulk Operation Safety**: Confirmation prompts before marking multiple issues as false positive or won't fix
- **Context Collection**: Optional comment collection when resolving issues
- **Authentication Assistance**: Interactive setup when credentials are missing
- **Opt-in Feature**: Enable with `SONARQUBE_MCP_ELICITATION=true` environment variable

### Previous Updates (v1.5.0)

### Component Navigation Enhancement
- **Components Tool**: Added comprehensive search and navigation for SonarQube components (projects, directories, files)
- **Text Search**: Find components by name with free text search
- **Type Filtering**: Filter by component types (project, directory, file, test, etc.)
- **Tree Navigation**: Navigate component hierarchies with different traversal strategies
- **Language Filtering**: Find components by programming language

### Documentation Updates
- **Admin Permission Clarification**: Clarified that the `projects` tool requires admin permissions
- **Alternative for Non-Admins**: Added guidance to use `components` tool with project qualifier for listing accessible projects


## Overview

The SonarQube MCP Server enables AI assistants to interact with SonarQube's code quality analysis capabilities through the Model Context Protocol. This integration allows AI assistants to:

- 📊 **Retrieve code metrics and analysis results** - Access detailed quality metrics for your projects
- 🐛 **Access and filter issues** - Search and filter code issues by severity, type, status, and more
- 🔒 **Review security hotspots** - Find and manage security vulnerabilities with dedicated workflows
- 🌿 **Analyze branches and PRs** - Review code quality in feature branches and pull requests
- 📦 **Multi-project analysis** - Query issues and metrics across multiple projects simultaneously
- ✅ **Check quality gates** - Monitor whether projects meet quality standards
- 📈 **Analyze project quality over time** - Track metrics history and trends
- 🔍 **View source code with issues** - See problematic code with highlighted issues
- 🏥 **Monitor system health** - Check SonarQube instance status and availability
- 🔄 **Enhanced error handling** - Clear error messages with solutions and automatic retry for transient failures

## Compatibility

For detailed information about MCP protocol version support and SDK compatibility, see [COMPATIBILITY.md](COMPATIBILITY.md).

## Quick Start

### Prerequisites

- [Claude Desktop](https://claude.ai/download) installed
- A SonarQube instance or [SonarCloud](https://sonarcloud.io) account
- A SonarQube/SonarCloud authentication token

### 1. Get Your SonarQube Token

**For SonarCloud:**
1. Log in to [SonarCloud](https://sonarcloud.io)
2. Go to **My Account** → **Security**
3. Generate a new token

**For SonarQube:**
1. Log in to your SonarQube instance
2. Go to **My Account** → **Security**
3. Generate a new token

### 2. Configure Claude Desktop

1. Open Claude Desktop
2. Go to **Settings** → **Developer** → **Edit Config**
3. Add the SonarQube server configuration:

```json
{
  "mcpServers": {
    "sonarqube": {
      "command": "npx",
      "args": ["-y", "sonarqube-mcp-server@latest"],
      "env": {
        "SONARQUBE_URL": "https://sonarcloud.io",
        "SONARQUBE_TOKEN": "your-token-here",
        "SONARQUBE_ORGANIZATION": "your-org (for SonarCloud)"
      }
    }
  }
}
```

**Alternative authentication methods:**

Using Basic Authentication:
```json
{
  "mcpServers": {
    "sonarqube": {
      "command": "npx",
      "args": ["-y", "sonarqube-mcp-server@latest"],
      "env": {
        "SONARQUBE_URL": "https://your-sonarqube.com",
        "SONARQUBE_USERNAME": "your-username",
        "SONARQUBE_PASSWORD": "your-password"
      }
    }
  }
}
```

Using System Passcode:
```json
{
  "mcpServers": {
    "sonarqube": {
      "command": "npx",
      "args": ["-y", "sonarqube-mcp-server@latest"],
      "env": {
        "SONARQUBE_URL": "https://your-sonarqube.com",
        "SONARQUBE_PASSCODE": "your-system-passcode"
      }
    }
  }
}
```

4. Restart Claude Desktop

### 3. Start Using

Ask Claude to analyze your SonarQube projects:

```
"List all my SonarQube projects"
"Show me critical issues in project xyz"
"What's the code coverage for project xyz?"
"Check the quality gate status for project xyz"
"Retrieve security hotspots in project xyz and create a plan to address them"
"Retrieve the issues for pr 123 in project xyz and create a plan to address them"
```

## Installation

### NPX (Recommended)

The simplest way to use the SonarQube MCP Server is through npx:

```json
{
  "mcpServers": {
    "sonarqube": {
      "command": "npx",
      "args": ["-y", "sonarqube-mcp-server@latest"],
      "env": {
        "SONARQUBE_URL": "https://sonarqube.example.com",
        "SONARQUBE_TOKEN": "your-sonarqube-token",
        "SONARQUBE_ORGANIZATION": "your-organization-key"
      }
    }
  }
}
```

### Docker (Recommended for Production)

Docker provides the most reliable deployment method by packaging all dependencies and ensuring consistent behavior across different environments.

#### Quick Start with Docker

**For stdio transport (Claude Desktop):**
```json
{
  "mcpServers": {
    "sonarqube": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e", "SONARQUBE_URL",
        "-e", "SONARQUBE_TOKEN",
        "-e", "SONARQUBE_ORGANIZATION",
        "sapientpants/sonarqube-mcp-server:latest"
      ],
      "env": {
        "SONARQUBE_URL": "https://sonarqube.example.com",
        "SONARQUBE_TOKEN": "your-sonarqube-token",
        "SONARQUBE_ORGANIZATION": "your-organization-key"
      }
    }
  }
}
```

**For SSE transport (Web applications):**
```bash
docker run -d \
  --name sonarqube-mcp \
  -p 3000:3000 \
  -e SONARQUBE_URL="https://sonarqube.example.com" \
  -e SONARQUBE_TOKEN="your-token" \
  -e SONARQUBE_ORGANIZATION="your-org" \
  -e TRANSPORT="sse" \
  sapientpants/sonarqube-mcp-server:latest
```

#### Docker Hub Images

Official images are available on Docker Hub: [`sapientpants/sonarqube-mcp-server`](https://hub.docker.com/r/sapientpants/sonarqube-mcp-server)

**Available tags:**
- `latest` - Latest stable release
- `1.3.2` - Specific version (recommended for production)
- `1.3` - Latest patch version of 1.3.x
- `1` - Latest minor version of 1.x.x

**Pull the image:**
```bash
docker pull sapientpants/sonarqube-mcp-server:latest
```

#### Advanced Docker Configuration

**With logging enabled:**
```json
{
  "mcpServers": {
    "sonarqube": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-v", "/tmp/sonarqube-logs:/logs",
        "-e", "SONARQUBE_URL",
        "-e", "SONARQUBE_TOKEN",
        "-e", "SONARQUBE_ORGANIZATION",
        "-e", "LOG_FILE=/logs/sonarqube-mcp.log",
        "-e", "LOG_LEVEL=INFO",
        "sapientpants/sonarqube-mcp-server:latest"
      ],
      "env": {
        "SONARQUBE_URL": "https://sonarqube.example.com",
        "SONARQUBE_TOKEN": "your-sonarqube-token",
        "SONARQUBE_ORGANIZATION": "your-organization-key"
      }
    }
  }
}
```

**Using Docker Compose:**
```yaml
version: '3.8'
services:
  sonarqube-mcp:
    image: sapientpants/sonarqube-mcp-server:latest
    environment:
      - SONARQUBE_URL=https://sonarqube.example.com
      - SONARQUBE_TOKEN=${SONARQUBE_TOKEN}
      - SONARQUBE_ORGANIZATION=${SONARQUBE_ORGANIZATION}
      - LOG_FILE=/logs/sonarqube-mcp.log
      - LOG_LEVEL=INFO
    volumes:
      - ./logs:/logs
    stdin_open: true
    tty: true
```

#### Building Your Own Docker Image

If you need to customize the server, you can build your own image:

```bash
# Clone the repository
git clone https://github.com/sapientpants/sonarqube-mcp-server.git
cd sonarqube-mcp-server

# Build the Docker image
docker build -t my-sonarqube-mcp-server .

# Run your custom image
docker run -i --rm \
  -e SONARQUBE_URL="https://sonarqube.example.com" \
  -e SONARQUBE_TOKEN="your-token" \
  my-sonarqube-mcp-server
```

#### Docker Best Practices

1. **Version Pinning**: Always use specific version tags in production:
   ```bash
   sapientpants/sonarqube-mcp-server:1.3.2
   ```

2. **Resource Limits**: Set appropriate resource limits:
   ```bash
   docker run -i --rm \
     --memory="256m" \
     --cpus="0.5" \
     sapientpants/sonarqube-mcp-server:1.3.2
   ```

3. **Security**: Run as non-root user (default in our image):
   ```bash
   docker run -i --rm \
     --user node \
     sapientpants/sonarqube-mcp-server:1.3.2
   ```

4. **Health Checks**: The container includes a health check that verifies the Node.js process is running

### Local Development

For development or customization:

```json
{
  "mcpServers": {
    "sonarqube": {
      "command": "node",
      "args": ["/path/to/sonarqube-mcp-server/dist/index.js"],
      "env": {
        "SONARQUBE_URL": "https://sonarqube.example.com",
        "SONARQUBE_TOKEN": "your-sonarqube-token",
        "SONARQUBE_ORGANIZATION": "your-organization-key"
      }
    }
  }
}
```

## Configuration

### Environment Variables

#### Authentication (choose one method)

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| **Token Authentication** | | | |
| `SONARQUBE_TOKEN` | Authentication token for SonarQube API access | ✅ Yes* | - |
| **Basic Authentication** | | | |
| `SONARQUBE_USERNAME` | Username for HTTP Basic authentication | ✅ Yes* | - |
| `SONARQUBE_PASSWORD` | Password for HTTP Basic authentication | ✅ Yes* | - |
| **System Passcode** | | | |
| `SONARQUBE_PASSCODE` | System passcode for SonarQube authentication | ✅ Yes* | - |

*One authentication method is required. Token authentication takes priority if multiple methods are configured.

#### Connection Settings

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `SONARQUBE_URL` | URL of your SonarQube instance | ❌ No | `https://sonarcloud.io` |
| `SONARQUBE_ORGANIZATION` | Organization key (required for SonarCloud) | ❌ No** | - |
| `LOG_FILE` | Path to write log files (e.g., `/tmp/sonarqube-mcp.log`) | ❌ No | - |
| `LOG_LEVEL` | Minimum log level (DEBUG, INFO, WARN, ERROR) | ❌ No | `DEBUG` |

**Required when using SonarCloud

#### Transport Settings

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `MCP_TRANSPORT` | Transport type (stdio, http) | ❌ No | `stdio` |
| **HTTP Transport** | | | |
| `MCP_HTTP_PORT` | Port for HTTP transport | ❌ No | `3000` |
| `MCP_HTTP_HOST` | Host for HTTP transport | ❌ No | `localhost` |
| `MCP_HTTP_PUBLIC_URL` | Public URL for metadata endpoints | ❌ No | `http://localhost:3000` |
| `MCP_OAUTH_AUTH_SERVERS` | Comma-separated list of OAuth authorization servers | ❌ No | - |
| `MCP_OAUTH_BUILTIN` | Enable built-in OAuth authorization server metadata | ❌ No | `false` |
| **External IdP Settings** | | | |
| `MCP_EXTERNAL_IDP_1` | External IdP configuration (see format below) | ❌ No | - |
| `MCP_EXTERNAL_IDP_2` | Additional IdP configurations (up to 10) | ❌ No | - |

### Authentication Methods

The server supports three authentication methods, with important differences between SonarQube versions:

#### 1. Token Authentication (Recommended)

**SonarQube 10.0+ (Bearer Token)**
- Starting with SonarQube 10.0, Bearer token authentication is the recommended approach
- Most secure and flexible option
- Tokens can have limited permissions
- Configuration:
  ```json
  {
    "env": {
      "SONARQUBE_TOKEN": "your-token-here"
    }
  }
  ```

**SonarQube < 10.0 (Token as Username)**
- For versions before 10.0, tokens must be sent as the username in HTTP Basic authentication
- No password is required when using a token as username
- The server automatically handles this based on your SonarQube version
- Configuration remains the same - just use `SONARQUBE_USERNAME` with the token value:
  ```json
  {
    "env": {
      "SONARQUBE_USERNAME": "your-token-here"
    }
  }
  ```

#### 2. HTTP Basic Authentication
- Traditional username and password authentication
- Suitable for self-hosted SonarQube instances
- May not work with SonarCloud if 2FA is enabled
- Configuration:
  ```json
  {
    "env": {
      "SONARQUBE_USERNAME": "your-username",
      "SONARQUBE_PASSWORD": "your-password"
    }
  }
  ```

#### 3. System Passcode
- Special authentication for SonarQube system administration
- Typically used for automated deployment scenarios
- Configuration:
  ```json
  {
    "env": {
      "SONARQUBE_PASSCODE": "your-system-passcode"
    }
  }
  ```

**Note:** Token authentication takes priority if multiple authentication methods are configured. The server will automatically use the appropriate authentication strategy based on your SonarQube version.

### SonarCloud vs SonarQube

**For SonarCloud:**
- Set `SONARQUBE_URL` to `https://sonarcloud.io`
- `SONARQUBE_ORGANIZATION` is required
- Token authentication is recommended

**For SonarQube Server:**
- Set `SONARQUBE_URL` to your instance URL
- `SONARQUBE_ORGANIZATION` is typically not needed
- All authentication methods are supported

### External Identity Provider (IdP) Configuration

When using HTTP transport, you can configure external identity providers for enhanced authentication with JWKS endpoint discovery and automatic token validation.

**Configuration Format:**
```
MCP_EXTERNAL_IDP_1=provider:azure-ad,issuer:https://login.microsoftonline.com/{tenant}/v2.0,audience:api://your-app-id,tenantId:your-tenant-id
MCP_EXTERNAL_IDP_2=provider:okta,issuer:https://your-domain.okta.com,audience:api://default
MCP_EXTERNAL_IDP_3=provider:auth0,issuer:https://your-domain.auth0.com/,audience:https://your-api
MCP_EXTERNAL_IDP_4=provider:keycloak,issuer:https://keycloak.example.com/realms/your-realm,audience:account
```

**Supported Providers:**
- `azure-ad` - Microsoft Azure Active Directory
- `okta` - Okta Identity Platform
- `auth0` - Auth0 Identity Platform
- `keycloak` - Keycloak/Red Hat SSO
- `generic` - Any OIDC-compliant provider

**Configuration Options:**
- `provider` - Provider type (required)
- `issuer` - OIDC issuer URL (required)
- `audience` - Expected audience (required, use `|` for multiple)
- `jwksUri` - JWKS endpoint (optional, auto-discovered via OIDC)
- `groupsClaim` - JWT claim containing groups (optional, provider defaults apply)
- `groupsTransform` - Transform groups: `none`, `extract_name`, `extract_id` (optional)
- `enableHealthMonitoring` - Enable health checks: `true`/`false` (optional)
- `tenantId` - Tenant ID for multi-tenant providers (optional)

**Example with Full Options:**
```bash
MCP_EXTERNAL_IDP_1=provider:azure-ad,issuer:https://login.microsoftonline.com/12345678-1234-1234-1234-123456789012/v2.0,audience:api://my-app-id|api://another-app,groupsClaim:groups,groupsTransform:extract_id,enableHealthMonitoring:true,tenantId:12345678-1234-1234-1234-123456789012
```

**Provider-Specific Defaults:**
- **Azure AD**: `groupsClaim=groups`, `groupsTransform=extract_id`
- **Okta**: `groupsClaim=groups`, `groupsTransform=none`
- **Auth0**: `groupsClaim=https://auth0.com/groups`, `groupsTransform=none`
- **Keycloak**: `groupsClaim=groups`, `groupsTransform=extract_name`

### Built-in Authorization Server

For environments that cannot use external IdPs, the server includes a minimal built-in OAuth 2.0 authorization server.

**Enabling the Built-in Auth Server:**
```bash
MCP_BUILT_IN_AUTH_SERVER=true
```

**Features:**
- OAuth 2.0 authorization code flow with PKCE
- Dynamic client registration (POST `/auth/register`)
- User authentication with secure password storage
- API key generation for automation
- JWT token issuance with automatic key rotation
- Refresh token support with rotation

**Default Admin User:**
On first start, a default admin user is created:
- Email: `admin@example.com`
- Password: Randomly generated and logged to console
- **Important**: Change this password immediately via the admin API

**Endpoints:**
- `GET /.well-known/oauth-authorization-server` - OAuth 2.0 metadata
- `POST /auth/register` - Register new OAuth client
- `GET /auth/authorize` - Authorization endpoint
- `POST /auth/token` - Token endpoint
- `POST /auth/revoke` - Token revocation
- `GET /auth/jwks` - JSON Web Key Set
- `POST /auth/admin/users` - Create users (admin only)
- `GET /auth/admin/users` - List users (admin only)
- `POST /auth/admin/users/:id/api-keys` - Generate API keys

**API Key Authentication:**
For automation and CI/CD, use API keys instead of OAuth flow:
```bash
curl -H "Authorization: ApiKey YOUR_API_KEY" http://localhost:3000/mcp
```

**Security Notes:**
- This is a minimal implementation for development/testing
- For production, use external IdPs when possible
- Always use HTTPS in production (configure TLS)
- Regularly rotate API keys

### Elicitation Configuration (Experimental)

The server supports interactive user input through MCP's elicitation capability. This feature is opt-in and requires compatible MCP clients.

**Environment Variables:**
- `SONARQUBE_MCP_ELICITATION`: Set to `true` to enable elicitation
- `SONARQUBE_MCP_BULK_THRESHOLD`: Number of items before confirmation (default: 5)
- `SONARQUBE_MCP_REQUIRE_COMMENTS`: Set to `true` to require comments for resolutions
- `SONARQUBE_MCP_INTERACTIVE_SEARCH`: Set to `true` for interactive disambiguation

**Example Configuration:**
```json
{
  "mcpServers": {
    "sonarqube": {
      "command": "npx",
      "args": ["-y", "sonarqube-mcp-server@latest"],
      "env": {
        "SONARQUBE_URL": "https://sonarcloud.io",
        "SONARQUBE_TOKEN": "your-token",
        "SONARQUBE_MCP_ELICITATION": "true",
        "SONARQUBE_MCP_BULK_THRESHOLD": "10",
        "SONARQUBE_MCP_REQUIRE_COMMENTS": "true"
      }
    }
  }
}
```

**Features When Enabled:**
1. **Bulk Operation Confirmation**: Prompts for confirmation before marking multiple issues
2. **Comment Collection**: Collects explanatory comments when marking issues as false positive or won't fix
3. **Authentication Setup**: Guides through authentication setup when credentials are missing
4. **Search Disambiguation**: Helps select from multiple matching components or projects

**Note:** This feature requires MCP clients that support elicitation. Not all clients may support this capability.

### Logging Configuration

The server supports file-based logging for debugging and monitoring. Since MCP servers use stdout for protocol communication, logs are written to a file instead of stdout/stderr to avoid interference.

**Enable Logging:**
```json
{
  "mcpServers": {
    "sonarqube": {
      "command": "npx",
      "args": ["-y", "sonarqube-mcp-server@latest"],
      "env": {
        "SONARQUBE_URL": "https://sonarcloud.io",
        "SONARQUBE_TOKEN": "your-token-here",
        "SONARQUBE_ORGANIZATION": "your-org",
        "LOG_FILE": "/tmp/sonarqube-mcp.log",
        "LOG_LEVEL": "INFO"
      }
    }
  }
}
```

**Log Levels:**
- `DEBUG`: Detailed information for debugging
- `INFO`: General information about server operation
- `WARN`: Warning events that might lead to issues
- `ERROR`: Error events (server continues running)

**Example Log Output:**
```
2024-01-15T10:30:45.123Z INFO [index] Starting SonarQube MCP server
2024-01-15T10:30:45.234Z INFO [index] Environment variables validated successfully
2024-01-15T10:30:45.345Z INFO [index] SonarQube client created successfully
2024-01-15T10:30:45.456Z INFO [index] SonarQube MCP server started successfully
2024-01-15T10:30:50.123Z DEBUG [index] Handling SonarQube projects request
2024-01-15T10:30:50.567Z INFO [index] Successfully retrieved projects {"count": 5}
```

### Audit Logging (Enterprise HTTP Transport)

When using the HTTP transport with authentication enabled, the server provides comprehensive audit logging for compliance with SOC 2, ISO 27001, and other enterprise security requirements.

**Features:**
- **Structured JSON audit logs** with all security-relevant fields
- **Authentication tracking**: All login attempts, token validations, and failures
- **Tool invocation logging**: Complete audit trail of all MCP tool calls with parameters
- **Permission checks**: Log of all authorization decisions and denials  
- **Data access tracking**: Records of data queries and filtering operations
- **PII redaction**: Automatic redaction of sensitive data (emails, IPs, SSNs, etc.)
- **Log integrity**: SHA-256 checksums for tamper detection
- **Configurable retention**: Automatic pruning based on retention policies

**Configuration:**
```json
{
  "mcpServers": {
    "sonarqube": {
      "command": "npx",
      "args": ["-y", "sonarqube-mcp-server@latest"],
      "transport": ["http"],
      "transportOptions": {
        "port": 3000,
        "publicUrl": "https://mcp.example.com"
      },
      "env": {
        "SONARQUBE_URL": "https://sonarqube.example.com",
        "MCP_OAUTH_AUTH_SERVERS": "https://auth.example.com",
        "AUDIT_LOG_PATH": "/var/log/sonarqube-mcp/audit",
        "AUDIT_RETENTION_DAYS": "90",
        "AUDIT_REDACT_PII": "true"
      }
    }
  }
}
```

**Audit Event Example:**
```json
{
  "timestamp": "2024-01-20T10:30:00.123Z",
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "eventType": "TOOL_COMPLETED",
  "eventCategory": "tool_access",
  "actor": {
    "userId": "user@company.com",
    "userGroups": ["engineering"],
    "ipAddress": "192.168.1.100"
  },
  "target": {
    "type": "tool",
    "id": "issues"
  },
  "action": {
    "type": "execute",
    "result": "success",
    "parameters": {
      "project": "frontend",
      "severities": ["CRITICAL", "BLOCKER"]
    },
    "duration": 245
  },
  "context": {
    "sessionId": "session-123",
    "traceId": "trace-456"
  },
  "security": {
    "tokenAud": "https://mcp.example.com",
    "tokenIss": "https://auth.example.com",
    "tlsVersion": "1.3"
  },
  "compliance": {
    "dataClassification": "internal",
    "piiRedacted": true
  },
  "checksum": "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3"
}
```

**Environment Variables:**
- `AUDIT_LOG_PATH`: Directory for audit log files (default: `./logs/audit`)
- `AUDIT_RETENTION_DAYS`: Days to retain audit logs (default: 90)
- `AUDIT_REDACT_PII`: Enable PII redaction (default: true)
- `AUDIT_REDACT_IP_ADDRESSES`: Redact IP addresses (default: false)
- `AUDIT_LOG_MAX_SIZE_MB`: Max size per log file (default: 100)
- `AUDIT_ENABLE_HMAC`: Enable HMAC signing for integrity (default: false)
- `AUDIT_HMAC_SECRET`: Secret key for HMAC signing

**Note:** Audit logging is only available when using HTTP transport with OAuth authentication enabled. It is not available in stdio mode.

### Monitoring and Observability

The SonarQube MCP Server provides comprehensive monitoring and observability features for production deployments, including Prometheus metrics, OpenTelemetry tracing, health checks, and circuit breakers.

#### Prometheus Metrics

**Endpoint:** `/metrics` (HTTP transport only)

**Available Metrics:**

| Metric | Type | Description | Labels |
|--------|------|-------------|--------|
| `mcp_requests_total` | Counter | Total number of MCP requests | `tool`, `status` |
| `mcp_request_duration_seconds` | Histogram | MCP request duration | `tool` |
| `mcp_auth_failures_total` | Counter | Authentication failures | `reason` |
| `mcp_active_sessions` | Gauge | Number of active sessions | `transport` |
| `mcp_sonarqube_requests_total` | Counter | SonarQube API requests | `endpoint`, `status` |
| `mcp_sonarqube_request_duration_seconds` | Histogram | SonarQube API request duration | `endpoint` |
| `mcp_sonarqube_errors_total` | Counter | SonarQube API errors | `type`, `endpoint` |
| `mcp_permission_denials_total` | Counter | Permission denials | `user`, `resource`, `action` |
| `mcp_service_account_health_status` | Gauge | Service account health (1=healthy, 0=unhealthy) | `service_account` |
| `mcp_cache_hits_total` | Counter | Cache hits | `cache` |
| `mcp_cache_misses_total` | Counter | Cache misses | `cache` |
| `mcp_circuit_breaker_state` | Gauge | Circuit breaker state (0=closed, 1=open, 2=half-open) | `service` |
| `mcp_event_loop_lag_seconds` | Histogram | Node.js event loop lag | - |

**Example Prometheus Configuration:**

```yaml
scrape_configs:
  - job_name: 'sonarqube-mcp'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
```

#### OpenTelemetry Tracing

The server supports distributed tracing via OpenTelemetry with multiple exporters.

**Environment Variables:**

```bash
# Enable tracing
export OTEL_ENABLED=true

# Service configuration
export OTEL_SERVICE_NAME=sonarqube-mcp-server
export OTEL_SERVICE_VERSION=1.5.1

# Exporter configuration (choose one)
export OTEL_TRACES_EXPORTER=otlp  # Options: otlp, jaeger, zipkin

# OTLP exporter (default)
export OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://localhost:4318/v1/traces
export OTEL_EXPORTER_OTLP_HEADERS="Authorization=Bearer token"

# Jaeger exporter
export OTEL_EXPORTER_JAEGER_ENDPOINT=http://localhost:14268/api/traces

# Zipkin exporter
export OTEL_EXPORTER_ZIPKIN_ENDPOINT=http://localhost:9411/api/v2/spans
```

**Traced Operations:**
- All MCP tool invocations
- SonarQube API calls
- HTTP requests (Express middleware)
- Database operations (if applicable)

#### Health Checks

**Endpoints:**

1. **`/health`** - Comprehensive health check
   ```json
   {
     "status": "healthy",
     "version": "1.5.1",
     "uptime": 86400000,
     "timestamp": "2024-01-15T10:30:00Z",
     "dependencies": {
       "sonarqube": {
         "status": "healthy",
         "latency": 45
       },
       "authServer": {
         "status": "healthy",
         "latency": 12
       }
     },
     "features": {
       "authentication": true,
       "metrics": true,
       "tracing": true
     }
   }
   ```

2. **`/ready`** - Kubernetes readiness probe
   ```json
   {
     "ready": true,
     "checks": {
       "server": { "ready": true },
       "authentication": { "ready": true },
       "sonarqube": { "ready": true }
     }
   }
   ```

**Kubernetes Configuration Example:**

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
```

#### Circuit Breakers

All SonarQube API calls are protected by circuit breakers to prevent cascading failures.

**Configuration:**
- **Timeout:** 30 seconds per request
- **Error Threshold:** 50% failure rate
- **Volume Threshold:** 5 requests minimum
- **Reset Timeout:** 60 seconds
- **Excluded Errors:** 4xx errors (except 429)

**Behavior:**
1. **Closed State:** Normal operation
2. **Open State:** Requests fail fast without calling SonarQube
3. **Half-Open State:** Limited requests to test recovery

#### Performance Monitoring

**Event Loop Monitoring:**
- Tracks Node.js event loop lag
- Measured every 5 seconds
- Alerts on high lag (>100ms)

**Resource Monitoring:**
- CPU usage (via default Prometheus metrics)
- Memory usage (heap, RSS, external)
- Active handles and requests
- Garbage collection metrics

#### Integration Examples

**Grafana Dashboard:**

Create a dashboard with these key panels:
1. Request Rate: `rate(mcp_requests_total[5m])`
2. Error Rate: `rate(mcp_sonarqube_errors_total[5m])`
3. Latency P95: `histogram_quantile(0.95, mcp_request_duration_seconds)`
4. Circuit Breaker Status: `mcp_circuit_breaker_state`
5. Active Sessions: `mcp_active_sessions`

**Alerting Rules (Prometheus):**

```yaml
groups:
  - name: sonarqube-mcp
    rules:
      - alert: HighErrorRate
        expr: rate(mcp_sonarqube_errors_total[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High SonarQube API error rate"
          
      - alert: CircuitBreakerOpen
        expr: mcp_circuit_breaker_state == 1
        for: 1m
        annotations:
          summary: "Circuit breaker is open"
          
      - alert: ServiceAccountUnhealthy
        expr: mcp_service_account_health_status == 0
        for: 5m
        annotations:
          summary: "Service account is unhealthy"
```

## Security Model and Authentication

### Current Security Model

The SonarQube MCP Server is designed as a **single-user local tool** that runs on your local machine. Authentication credentials are managed through environment variables, which is appropriate for desktop/local usage scenarios.

**Key characteristics:**
- **Single-user design**: One MCP server instance per user
- **Local execution**: Runs on the user's machine with their credentials
- **Direct authentication**: Uses SonarQube's existing authentication mechanisms
- **No OAuth flow**: As a stdio-based local tool, no OAuth is needed

### Authentication Security Considerations

1. **Token Authentication (Recommended)**
   - Most secure option for API access
   - Tokens can be scoped with limited permissions
   - Can be revoked without changing passwords
   - Recommended for both SonarCloud and SonarQube

2. **Credential Storage**
   - Credentials are stored in Claude Desktop's configuration file
   - Ensure your system's file permissions protect this configuration
   - Consider using a password manager to generate and store tokens

3. **Permission Scoping**
   - Create tokens with minimal required permissions
   - Use read-only tokens when write access isn't needed
   - Regularly review and rotate tokens

### Future OAuth2 Considerations

While the current implementation is well-suited for local single-user scenarios, the MCP specification positions MCP servers as OAuth 2.1 resource servers for future HTTP-based transport:

**If HTTP transport is added in the future:**
- The server would need to validate OAuth access tokens
- Support for RFC8707 resource indicators would be required
- Multi-client scenarios would need proper token scoping
- The current environment variable approach would remain for backward compatibility

**Current approach benefits:**
- Simple setup without complex OAuth flows
- Direct integration with existing SonarQube auth
- Appropriate security for local single-user tools
- No additional authentication infrastructure needed

## Available Tools

### Permission Requirements

Different SonarQube tools require different permission levels:

**Tools requiring Admin permissions:**
- `projects` - Lists all SonarQube projects with metadata (visibility, lastAnalysisDate, revision)

**Tools accessible to all users:**
- `components` - Search and navigate projects, directories, and files (requires 'Browse' permission on at least one project)
- All other tools require appropriate permissions based on the resources being accessed

#### Listing Projects

**For Administrators:**
Use the `projects` tool to get full project metadata including visibility, last analysis date, and revision info.

**For All Users:**
Use the `components` tool with project qualifier:
- "List all projects I have access to" → `components` with `qualifiers: ['TRK']`
- "Search for projects containing 'mobile'" → `components` with `query: 'mobile', qualifiers: ['TRK']`

The `components` tool provides a more accessible alternative for non-admin users to discover projects they have access to.

### Project Management

#### `projects`
List all SonarQube projects with pagination support.

**Parameters:**
- `page` (optional): Page number for results pagination
- `page_size` (optional): Number of items per page

### Metrics and Measures

#### `metrics`
Get available metrics from SonarQube.

**Parameters:**
- `page` (optional): Page number for results pagination
- `page_size` (optional): Number of items per page

#### `measures_component`
Get measures for a specific component.

**Parameters:**
- `component` (required): Component key
- `metric_keys` (required): Array of metric keys
- `additional_fields` (optional): Additional fields to return
- `branch` (optional): Branch name
- `pull_request` (optional): Pull request key
- `period` (optional): Period index

#### `measures_components`
Get measures for multiple components.

**Parameters:**
- `component_keys` (required): Array of component keys
- `metric_keys` (required): Array of metric keys
- Additional parameters same as `measures_component`
- `page` (optional): Page number
- `page_size` (optional): Items per page

#### `measures_history`
Get measures history for a component.

**Parameters:**
- `component` (required): Component key
- `metrics` (required): Array of metric keys
- `from` (optional): Start date (YYYY-MM-DD)
- `to` (optional): End date (YYYY-MM-DD)
- `branch` (optional): Branch name
- `pull_request` (optional): Pull request key
- `page` (optional): Page number
- `page_size` (optional): Items per page

### Issue Management

#### `issues`
Search and filter SonarQube issues by severity, status, assignee, tag, file path, and more. Critical for dashboards, targeted clean-up sprints, security audits, and regression testing. Supports faceted search for aggregations.

**Component/File Path Filters:**
- `project_key` (optional): Single project key (backward compatible)
- `projects` (optional): Array of project keys for multi-project analysis
- `component_keys` (optional): Array of component keys (file paths, directories, or modules) - use this to filter issues by specific files or folders
- `components` (optional): Alias for component_keys
- `on_component_only` (optional): Boolean to return only issues on specified components, not sub-components

**Branch/PR Support:**
- `branch` (optional): Branch name for branch analysis
- `pull_request` (optional): Pull request ID for PR analysis

**Issue Filters:**
- `issues` (optional): Array of specific issue keys to retrieve
- `severity` (optional): Single severity (deprecated, use severities)
- `severities` (optional): Array of severities (INFO, MINOR, MAJOR, CRITICAL, BLOCKER)
- `statuses` (optional): Array of statuses (OPEN, CONFIRMED, REOPENED, RESOLVED, CLOSED)
- `resolutions` (optional): Array of resolutions (FALSE-POSITIVE, WONTFIX, FIXED, REMOVED)
- `resolved` (optional): Boolean filter for resolved/unresolved
- `types` (optional): Array of types (CODE_SMELL, BUG, VULNERABILITY, SECURITY_HOTSPOT)

**Clean Code Taxonomy (SonarQube 10.x+):**
- `clean_code_attribute_categories` (optional): Array (ADAPTABLE, CONSISTENT, INTENTIONAL, RESPONSIBLE)
- `impact_severities` (optional): Array (HIGH, MEDIUM, LOW)
- `impact_software_qualities` (optional): Array (MAINTAINABILITY, RELIABILITY, SECURITY)
- `issue_statuses` (optional): Array of new issue status values

**Rules and Tags:**
- `rules` (optional): Array of rule keys
- `tags` (optional): Array of issue tags - essential for security audits, regression testing, and categorized analysis

**Date Filters:**
- `created_after` (optional): Issues created after date (YYYY-MM-DD)
- `created_before` (optional): Issues created before date (YYYY-MM-DD)
- `created_at` (optional): Issues created on date (YYYY-MM-DD)
- `created_in_last` (optional): Issues created in last period (e.g., "30d", "1m")

**Assignment:**
- `assigned` (optional): Boolean filter for assigned/unassigned
- `assignees` (optional): Array of assignee logins - critical for targeted clean-up sprints and workload analysis
- `author` (optional): Single author login
- `authors` (optional): Array of author logins

**Security Standards:**
- `cwe` (optional): Array of CWE identifiers
- `owasp_top10` (optional): Array of OWASP Top 10 categories
- `owasp_top10_v2021` (optional): Array of OWASP Top 10 2021 categories
- `sans_top25` (optional): Array of SANS Top 25 categories
- `sonarsource_security` (optional): Array of SonarSource security categories
- `sonarsource_security_category` (optional): Additional security categories

**Other Filters:**
- `languages` (optional): Array of programming languages
- `facets` (optional): Array of facets to aggregate
- `facet_mode` (optional): Facet aggregation mode ('effort' or 'count')
- `since_leak_period` (optional): Boolean for leak period filter (deprecated)
- `in_new_code_period` (optional): Boolean for new code period filter

**Sorting:**
- `s` (optional): Sort field (e.g., 'SEVERITY', 'CREATION_DATE', 'UPDATE_DATE')
- `asc` (optional): Boolean for ascending sort direction (default: false)

**Response Control:**
- `additional_fields` (optional): Array of additional fields to include
- `page` (optional): Page number for pagination
- `page_size` (optional): Number of items per page

**Faceted Search (Dashboard Support):**
- `facets` (optional): Array of facets to compute for aggregations. Available facets: severities, statuses, resolutions, rules, tags, types, authors, assignees, languages, etc.
- `facet_mode` (optional): Mode for facet computation: 'count' (number of issues) or 'effort' (remediation effort)

**Example Use Cases:**

1. **Dashboard Query** - Get issue counts by severity and assignee:
```json
{
  "project_key": "my-project",
  "facets": ["severities", "assignees", "tags"],
  "facet_mode": "count"
}
```

2. **Security Audit** - Find critical security issues in authentication modules:
```json
{
  "project_key": "my-project",
  "component_keys": ["src/auth/", "src/security/"],
  "tags": ["security", "vulnerability"],
  "severities": ["CRITICAL", "BLOCKER"],
  "statuses": ["OPEN", "REOPENED"]
}
```

3. **Sprint Planning** - Get open issues for specific team members:
```json
{
  "project_key": "my-project",
  "assignees": ["john.doe@example.com", "jane.smith@example.com"],
  "statuses": ["OPEN", "CONFIRMED"],
  "facets": ["severities", "types"],
  "facet_mode": "effort"
}
```

4. **File-Specific Analysis** - Issues in a specific file:
```json
{
  "project_key": "my-project",  
  "component_keys": ["src/main/java/com/example/PaymentService.java"],
  "on_component_only": true
}
```

### Component Navigation

#### `components`
Search and navigate SonarQube components (projects, directories, files). Supports text search, filtering by type/language, and tree navigation.

**Search Parameters:**
- `query` (optional): Text search query
- `qualifiers` (optional): Array of component types (TRK, DIR, FIL, UTS, BRC, APP, VW, SVW, LIB)
- `language` (optional): Programming language filter

**Tree Navigation Parameters:**
- `component` (optional): Component key for tree navigation
- `strategy` (optional): Tree traversal strategy ('all', 'children', 'leaves')

**Common Parameters:**
- `asc` (optional): Sort ascending/descending
- `ps` (optional): Page size (default: 100, max: 500)
- `p` (optional): Page number
- `branch` (optional): Branch name
- `pullRequest` (optional): Pull request ID

**Component Qualifiers:**
- `TRK`: Project
- `DIR`: Directory
- `FIL`: File
- `UTS`: Unit Test
- `BRC`: Branch
- `APP`: Application
- `VW`: View
- `SVW`: Sub-view
- `LIB`: Library

**Example Use Cases:**

1. **Find specific files:**
```json
{
  "query": "UserService",
  "qualifiers": ["FIL"]
}
```

2. **List all test files in a project:**
```json
{
  "component": "my-project",
  "qualifiers": ["UTS"]
}
```

3. **Navigate directory structure:**
```json
{
  "component": "my-project:src/main",
  "strategy": "children",
  "qualifiers": ["DIR", "FIL"]
}
```

4. **Search for components by language:**
```json
{
  "language": "java",
  "qualifiers": ["FIL"],
  "query": "Controller"
}
```

5. **Get project list:**
```json
{
  "qualifiers": ["TRK"]
}
```

### Security Hotspots

#### `hotspots`
Search for security hotspots with specialized filters for security review workflows.

**Parameters:**
- `project_key` (optional): Project key to filter hotspots
- `branch` (optional): Branch name for branch analysis
- `pull_request` (optional): Pull request ID for PR analysis
- `status` (optional): Hotspot status (TO_REVIEW, REVIEWED)
- `resolution` (optional): Hotspot resolution (FIXED, SAFE)
- `files` (optional): Array of file paths to filter
- `assigned_to_me` (optional): Boolean to show only assigned hotspots
- `since_leak_period` (optional): Boolean for leak period filter
- `in_new_code_period` (optional): Boolean for new code period filter
- `page` (optional): Page number for pagination
- `page_size` (optional): Number of items per page

#### `hotspot`
Get detailed information about a specific security hotspot including security context.

**Parameters:**
- `hotspot_key` (required): The unique key of the hotspot

**Returns:**
- Detailed hotspot information including:
  - Security category and vulnerability probability
  - Rule information and security context
  - Changelog and comments
  - Code flows and locations

#### `update_hotspot_status`
Update the status of a security hotspot (requires appropriate permissions).

**Parameters:**
- `hotspot_key` (required): The unique key of the hotspot
- `status` (required): New status (TO_REVIEW, REVIEWED)
- `resolution` (optional): Resolution when status is REVIEWED (FIXED, SAFE)
- `comment` (optional): Comment explaining the status change

### Quality Gates

#### `quality_gates`
List available quality gates.

**No parameters required**

#### `quality_gate`
Get quality gate conditions.

**Parameters:**
- `id` (required): Quality gate ID

#### `quality_gate_status`
Get project quality gate status.

**Parameters:**
- `project_key` (required): Project key
- `branch` (optional): Branch name
- `pull_request` (optional): Pull request key

### Source Code

#### `source_code`
View source code with issues highlighted.

**Parameters:**
- `key` (required): File key
- `from` (optional): Start line
- `to` (optional): End line
- `branch` (optional): Branch name
- `pull_request` (optional): Pull request key

#### `scm_blame`
Get SCM blame information for source code.

**Parameters:**
- Same as `source_code`

### System Monitoring

#### `system_health`
Get the health status of the SonarQube instance.

**No parameters required**

#### `system_status`
Get the status of the SonarQube instance.

**No parameters required**

#### `system_ping`
Ping the SonarQube instance to check if it is up.

**No parameters required**

### Issue Resolution and Management

#### `markIssueFalsePositive`
Mark an issue as false positive.

**Parameters:**
- `issue_key` (required): The key of the issue to mark
- `comment` (optional): Comment explaining why it's a false positive

#### `markIssueWontFix`
Mark an issue as won't fix.

**Parameters:**
- `issue_key` (required): The key of the issue to mark
- `comment` (optional): Comment explaining why it won't be fixed

#### `markIssuesFalsePositive`
Mark multiple issues as false positive in bulk.

**Parameters:**
- `issue_keys` (required): Array of issue keys to mark
- `comment` (optional): Comment applying to all issues

#### `markIssuesWontFix`
Mark multiple issues as won't fix in bulk.

**Parameters:**
- `issue_keys` (required): Array of issue keys to mark
- `comment` (optional): Comment applying to all issues

#### `addCommentToIssue`
Add a comment to a SonarQube issue.

**Parameters:**
- `issue_key` (required): The key of the issue to comment on
- `text` (required): The comment text (supports markdown formatting)

#### `assignIssue`
Assign a SonarQube issue to a user or unassign it.

**Parameters:**
- `issueKey` (required): The key of the issue to assign
- `assignee` (optional): Username of the assignee. Leave empty to unassign the issue

**Example usage:**
```json
{
  "issueKey": "PROJECT-123",
  "assignee": "john.doe"
}
```

## Usage Examples

### Basic Project Analysis
```
"List all my SonarQube projects"
"Show me the code coverage for project xyz"
"What metrics are available for analysis?"
```

### Issue Investigation
```
"Show me all critical bugs in project abc"
"Find security vulnerabilities in the main branch"
"List all code smells created in the last week"
"Show unresolved issues assigned to john.doe"
"Analyze issues in the feature/new-login branch"
"Compare issues between main and develop branches"
"Find issues across multiple projects: proj1, proj2, proj3"
"Show me issues sorted by severity in descending order"
"Find all issues with clean code impact on reliability"
```

### Component Navigation
```
"Find all files containing 'UserService' in their name"
"List all test files in my project"
"Show me the directory structure of src/main"
"Find all Java controller files"
"List all projects in SonarQube"
"Navigate to the authentication module"
"Search for TypeScript files in the frontend directory"
"Show me all directories under src/components"
```

### Issue Management
```
"Assign issue PROJECT-123 to john.doe"
"Unassign issue PROJECT-456"
"Mark issue ABC-789 as false positive with comment: 'Test code only'"
"Add comment to issue XYZ-111: 'Fixed in commit abc123'"
"Bulk mark issues DEF-222, DEF-223 as won't fix"
```

### Quality Monitoring
```
"Check the quality gate status for my main project"
"Show me the code coverage history for the last month"
"What are the quality gate conditions?"
"Compare metrics between develop and main branches"
```

### Security Hotspot Review
```
"Find all security hotspots that need review in project xyz"
"Show me hotspots in the authentication module"
"Get details for hotspot HSP-12345"
"List all hotspots assigned to me"
"Mark hotspot HSP-12345 as safe with explanation"
"Find hotspots in the new code period"
"Show security hotspots in pull request #42"
```

### Source Code Analysis
```
"Show me the source code for file xyz with issues highlighted"
"Get blame information for the problematic file"
"View issues in the authentication module"
```

### System Health
```
"Check if SonarQube is running"
"What's the health status of the SonarQube instance?"
"Show me the system status"
```

## Architecture

The SonarQube MCP Server follows a modular architecture:

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Claude Desktop │────▶│  MCP Server      │────▶│  SonarQube API  │
│  (MCP Client)   │◀────│  (index.ts)      │◀────│                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │  SonarQube       │
                        │  Client          │
                        │  (sonarqube.ts)  │
                        └──────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │  API Module      │
                        │  (api.ts)        │
                        └──────────────────┘
```

### Key Components

1. **MCP Server (`index.ts`)**: Main entry point that initializes the MCP server and registers all available tools
2. **SonarQube Client (`sonarqube.ts`)**: Handles business logic and parameter transformation
3. **API Module (`api.ts`)**: Manages HTTP requests to the SonarQube API
4. **Type Definitions**: TypeScript interfaces for type safety

### Data Flow

1. MCP clients make requests through registered tools
2. Tool handlers validate and transform parameters
3. SonarQube client methods process the requests
4. API module executes HTTP requests
5. Responses are formatted and returned to the client

## Development

### Prerequisites

- Node.js 20 or higher
- pnpm 10.7.0 or higher
- Docker (for container builds)

### Setup

1. Clone the repository:
```bash
git clone https://github.com/sapientpants/sonarqube-mcp-server.git
cd sonarqube-mcp-server
```

2. Install dependencies:
```bash
pnpm install
```

3. Build the project:
```bash
pnpm build
```

### Development Commands

```bash
# Install dependencies
pnpm install

# Build the project
pnpm build

# Run in development mode with auto-reload
pnpm dev

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Lint the code
pnpm lint

# Fix linting issues
pnpm lint:fix

# Check types
pnpm check-types

# Format code
pnpm format

# Run all validations
pnpm validate

# Inspect MCP schema
pnpm inspect
```

### Testing

The project uses Jest for testing with:
- Unit tests for all major components
- Mocked HTTP responses using `nock`
- Coverage reporting
- TypeScript support

Run specific test files:
```bash
NODE_ENV=test NODE_OPTIONS='--experimental-vm-modules --no-warnings' jest src/__tests__/file-name.test.ts
```

### Code Quality

The project maintains high code quality through:
- TypeScript for type safety
- ESLint for code linting
- Prettier for code formatting
- Jest for testing
- SonarCloud for continuous code analysis

## Troubleshooting

### Common Issues

#### "Authentication failed"
- **Cause**: Invalid or expired token
- **Solution**: Generate a new token in SonarQube/SonarCloud

#### "Project not found"
- **Cause**: Incorrect project key or insufficient permissions
- **Solution**: Verify the project key and check token permissions

#### "Organization required"
- **Cause**: Using SonarCloud without organization parameter
- **Solution**: Add `SONARQUBE_ORGANIZATION` to your configuration

#### "Connection refused"
- **Cause**: Incorrect URL or network issues
- **Solution**: Verify `SONARQUBE_URL` and network connectivity

#### "No output or errors visible"
- **Cause**: Errors might be happening but not visible in Claude Desktop
- **Solution**: Enable logging with `LOG_FILE` and check the log file for detailed error messages


### FAQ

**Q: Can I use this with both SonarQube and SonarCloud?**
A: Yes! Set the appropriate `SONARQUBE_URL` and include `SONARQUBE_ORGANIZATION` for SonarCloud.

**Q: What permissions does my token need?**
A: The token needs "Execute Analysis" permission and access to the projects you want to analyze.

**Q: How do I filter issues by multiple criteria?**
A: The `issues` tool supports extensive filtering. You can combine multiple parameters like severity, type, status, and date ranges.

**Q: Can I analyze pull requests?**
A: Yes! Many tools support `branch` and `pull_request` parameters for branch and PR analysis.

## Troubleshooting

### Common Error Messages and Solutions

#### Authentication Errors

**Error: "Authentication failed"**
- **Solution**: Check that your SONARQUBE_TOKEN is valid and not expired. Generate a new token from your SonarQube user profile.

**Error: "No SonarQube authentication configured"**
- **Solution**: Set one of the following authentication methods:
  - `SONARQUBE_TOKEN` for token-based authentication (recommended)
  - `SONARQUBE_USERNAME` and `SONARQUBE_PASSWORD` for basic authentication
  - `SONARQUBE_PASSCODE` for system passcode authentication

#### Authorization Errors

**Error: "Access denied"**
- **Solution**: Ensure your token has the required permissions for the operation. Common required permissions:
  - "Execute Analysis" for code analysis
  - "Browse" for reading project data
  - "Administer Issues" for issue management operations

#### Resource Not Found Errors

**Error: "Resource not found"**
- **Solution**: Verify that:
  - The project key/component exists in SonarQube
  - You have access to the resource
  - The URL path is correct (no typos in project keys)

#### Network and Connection Errors

**Error: "Connection refused"**
- **Solution**: Check that:
  - The SonarQube server is running
  - The SONARQUBE_URL is correct
  - There are no firewall rules blocking the connection

**Error: "Network error" or timeout errors**
- **Solution**: 
  - Verify your network connection
  - Check if the SonarQube server is accessible
  - Ensure the URL doesn't have a trailing slash
  - For self-hosted instances, verify SSL certificates

#### Rate Limiting

**Error: "Rate limit exceeded"**
- **Solution**: The server automatically retries rate-limited requests with exponential backoff. If you continue to hit rate limits:
  - Reduce the frequency of your requests
  - Implement request batching where possible
  - Contact your SonarQube administrator to increase rate limits

#### Configuration Errors

**Error: "Invalid SONARQUBE_URL"**
- **Solution**: Provide a valid URL including the protocol:
  - ✅ Correct: `https://sonarcloud.io`
  - ✅ Correct: `https://sonarqube.example.com`
  - ❌ Wrong: `sonarcloud.io` (missing protocol)
  - ❌ Wrong: `https://sonarqube.example.com/` (trailing slash)

### Debugging Tips

1. **Enable Debug Logging**:
   ```bash
   export LOG_LEVEL=DEBUG
   ```

2. **Check Environment Variables**:
   ```bash
   echo $SONARQUBE_URL
   echo $SONARQUBE_TOKEN
   echo $SONARQUBE_ORGANIZATION
   ```

3. **Test Connection**:
   Use the `ping` tool to verify connectivity:
   ```bash
   # In your MCP client
   sonarqube.ping
   ```

4. **Verify Permissions**:
   Use the `projects` tool to list accessible projects:
   ```bash
   # In your MCP client
   sonarqube.projects
   ```

### Retry Behavior

The server automatically retries failed requests for transient errors:
- **Network errors**: Retried up to 3 times
- **Rate limiting**: Retried with exponential backoff
- **Server errors (5xx)**: Retried up to 3 times

Retry delays: 1s → 2s → 4s (capped at 10s)

### Getting Help

If you continue to experience issues:

1. Check the [GitHub Issues](https://github.com/sapientpants/sonarqube-mcp-server/issues) for similar problems
2. Enable debug logging and collect error details
3. Create a new issue with:
   - Error messages
   - Environment details (OS, Node version)
   - SonarQube version
   - Steps to reproduce

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Write tests for new features
- Update documentation as needed
- Follow the existing code style
- Ensure all tests pass
- Add appropriate error handling

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## External Resources

### SonarQube Documentation
- [SonarQube Documentation](https://docs.sonarqube.org/latest/)
- [SonarCloud Documentation](https://docs.sonarcloud.io/)
- [Web API Documentation](https://docs.sonarqube.org/latest/extend/web-api/)

### Model Context Protocol
- [MCP Documentation](https://modelcontextprotocol.io/)
- [MCP Specification](https://github.com/modelcontextprotocol/specification)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)

---

<p align="center">
  Made with ❤️ by the SonarQube MCP Server community
</p>