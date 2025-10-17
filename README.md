# SonarQube MCP Server

[![CI](https://github.com/sapientpants/sonarqube-mcp-server/actions/workflows/ci.yml/badge.svg)](https://github.com/sapientpants/sonarqube-mcp-server/actions/workflows/main.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=sonarqube-mcp-server&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=sonarqube-mcp-server)
[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=sonarqube-mcp-server&metric=bugs)](https://sonarcloud.io/summary/new_code?id=sonarqube-mcp-server)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=sonarqube-mcp-server&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=sonarqube-mcp-server)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=sonarqube-mcp-server&metric=coverage)](https://sonarcloud.io/summary/new_code?id=sonarqube-mcp-server)
[![Duplicated Lines (%)](https://sonarcloud.io/api/project_badges/measure?project=sonarqube-mcp-server&metric=duplicated_lines_density)](https://sonarcloud.io/summary/new_code?id=sonarqube-mcp-server)
[![npm version](https://img.shields.io/npm/v/sonarqube-mcp-server.svg)](https://www.npmjs.com/package/sonarqube-mcp-server)
[![npm downloads](https://img.shields.io/npm/dm/sonarqube-mcp-server.svg)](https://www.npmjs.com/package/sonarqube-mcp-server)
[![License](https://img.shields.io/npm/l/sonarqube-mcp-server.svg)](https://github.com/sapientpants/sonarqube-mcp-server/blob/main/LICENSE)

A Model Context Protocol (MCP) server that integrates with SonarQube to provide AI assistants with access to code quality metrics, issues, and analysis results.

## Table of Contents

- [Overview](#overview)
- [Documentation](#documentation)
- [Compatibility](#compatibility)
- [Quick Start](#quick-start)
- [Installation](#installation)
  - [NPX](#npx-recommended)
  - [Docker](#docker-recommended-for-production)
  - [Local Development](#local-development)
- [Configuration](#configuration)
  - [Environment Variables](#environment-variables)
  - [Authentication Methods](#authentication-methods)
- [Available Tools](#available-tools)
- [Usage Examples](#usage-examples)
- [Architecture](#architecture)
- [Development](#development)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)
- [External Resources](#external-resources)

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

## Documentation

### Core Guides

- **[Architecture Guide](docs/architecture.md)** - System architecture, design decisions, and component overview
- **[Troubleshooting Guide](docs/troubleshooting.md)** - Common issues, debugging, and solutions

### Security & Authentication

- **[Security Guide](docs/security.md)** - Authentication, authorization, and security best practices

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

1. Restart Claude Desktop

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

> **Enterprise Deployment**: For production deployments with Kubernetes, Helm charts, and cloud-specific configurations, see our comprehensive [Deployment Guide](docs/deployment.md).

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
        "-e",
        "SONARQUBE_URL",
        "-e",
        "SONARQUBE_TOKEN",
        "-e",
        "SONARQUBE_ORGANIZATION",
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

#### Docker Hub Images

Official images are available on Docker Hub: [`sapientpants/sonarqube-mcp-server`](https://hub.docker.com/r/sapientpants/sonarqube-mcp-server)

**Available tags:**

- `latest` - Latest stable release
- `1.6.0` - Specific version (recommended for production)
- `1.6` - Latest patch version of 1.6.x
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
        "-v",
        "/tmp/sonarqube-logs:/logs",
        "-e",
        "SONARQUBE_URL",
        "-e",
        "SONARQUBE_TOKEN",
        "-e",
        "SONARQUBE_ORGANIZATION",
        "-e",
        "LOG_FILE=/logs/sonarqube-mcp.log",
        "-e",
        "LOG_LEVEL=INFO",
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
   sapientpants/sonarqube-mcp-server:1.6.0
   ```

2. **Resource Limits**: Set appropriate resource limits:

   ```bash
   docker run -i --rm \
     --memory="256m" \
     --cpus="0.5" \
     sapientpants/sonarqube-mcp-server:1.6.0
   ```

3. **Security**: Run as non-root user (default in our image):

   ```bash
   docker run -i --rm \
     --user node \
     sapientpants/sonarqube-mcp-server:1.6.0
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

| Variable                 | Description                                   | Required | Default |
| ------------------------ | --------------------------------------------- | -------- | ------- |
| **Token Authentication** |                                               |          |         |
| `SONARQUBE_TOKEN`        | Authentication token for SonarQube API access | ✅ Yes\* | -       |
| **Basic Authentication** |                                               |          |         |
| `SONARQUBE_USERNAME`     | Username for Basic authentication             | ✅ Yes\* | -       |
| `SONARQUBE_PASSWORD`     | Password for Basic authentication             | ✅ Yes\* | -       |
| **System Passcode**      |                                               |          |         |
| `SONARQUBE_PASSCODE`     | System passcode for SonarQube authentication  | ✅ Yes\* | -       |

\*One authentication method is required. Token authentication takes priority if multiple methods are configured.

#### Connection Settings

| Variable                 | Description                                              | Required  | Default                 |
| ------------------------ | -------------------------------------------------------- | --------- | ----------------------- |
| `SONARQUBE_URL`          | URL of your SonarQube instance                           | ❌ No     | `https://sonarcloud.io` |
| `SONARQUBE_ORGANIZATION` | Organization key (required for SonarCloud)               | ❌ No\*\* | -                       |
| `LOG_FILE`               | Path to write log files (e.g., `/tmp/sonarqube-mcp.log`) | ❌ No     | -                       |
| `LOG_LEVEL`              | Minimum log level (DEBUG, INFO, WARN, ERROR)             | ❌ No     | `DEBUG`                 |

\*\*Required when using SonarCloud

#### HTTP Transport Settings (Advanced)

By default, the server uses stdio transport for communication with Claude Desktop. For programmatic access or running as a web service, HTTP transport is available:

| Variable                                   | Description                                  | Required | Default     |
| ------------------------------------------ | -------------------------------------------- | -------- | ----------- |
| `MCP_TRANSPORT_TYPE`                       | Transport type (`stdio` or `http`)           | ❌ No    | `stdio`     |
| `MCP_HTTP_PORT`                            | Port for HTTP server                         | ❌ No    | `3000`      |
| `MCP_HTTP_SESSION_TIMEOUT`                 | Session timeout in milliseconds              | ❌ No    | `1800000`   |
| `MCP_HTTP_ALLOWED_HOSTS`                   | Comma-separated list of allowed hosts        | ❌ No    | `localhost` |
| `MCP_HTTP_ALLOWED_ORIGINS`                 | Comma-separated list of allowed CORS origins | ❌ No    | `*`         |
| `MCP_HTTP_ENABLE_DNS_REBINDING_PROTECTION` | Enable DNS rebinding protection              | ❌ No    | `false`     |

### Authentication Methods

The server supports three authentication methods, with important differences between SonarQube versions:

#### 1. Token Authentication (Recommended)

##### SonarQube 10.0+ (Bearer Token)

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

##### SonarQube < 10.0 (Token as Username)

- For versions before 10.0, tokens must be sent as the username in Basic authentication
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

#### 2. Basic Authentication

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

### HTTP Transport Mode

The server supports HTTP transport for programmatic access and web service deployments. This enables integration with custom clients and web applications.

#### Running as an HTTP Server

Start the server with HTTP transport:

```bash
# Using environment variables
MCP_TRANSPORT_TYPE=http MCP_HTTP_PORT=3000 npx sonarqube-mcp-server

# With Docker
docker run -i --rm \
  -p 3000:3000 \
  -e MCP_TRANSPORT_TYPE=http \
  -e MCP_HTTP_PORT=3000 \
  -e SONARQUBE_URL=https://sonarcloud.io \
  -e SONARQUBE_TOKEN=your-token \
  sapientpants/sonarqube-mcp-server:latest
```

#### HTTP API Endpoints

When running in HTTP mode, the server exposes the following endpoints:

- `GET /health` - Health check endpoint
- `POST /session` - Create a new session
- `DELETE /session/:sessionId` - Close a session
- `POST /mcp` - Execute MCP requests
- `GET /events/:sessionId` - Server-sent events for notifications

#### Example HTTP Client

See [examples/http-client.ts](examples/http-client.ts) for a complete TypeScript client example.

Basic usage with curl:

```bash
# Health check
curl http://localhost:3000/health

# Create session
SESSION_ID=$(curl -X POST http://localhost:3000/session | jq -r .sessionId)

# Execute MCP request
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d "{
    \"sessionId\": \"$SESSION_ID\",
    \"method\": \"tools/list\",
    \"params\": {}
  }"

# Close session
curl -X DELETE http://localhost:3000/session/$SESSION_ID
```

#### Security Considerations

When running in HTTP mode:

1. **Enable DNS rebinding protection** for public deployments:

   ```bash
   MCP_HTTP_ENABLE_DNS_REBINDING_PROTECTION=true
   ```

2. **Configure CORS** for browser-based clients:

   ```bash
   MCP_HTTP_ALLOWED_ORIGINS=https://yourapp.com,https://anotherapp.com
   ```

3. **Set session timeouts** appropriately:

   ```bash
   MCP_HTTP_SESSION_TIMEOUT=900000  # 15 minutes
   ```

4. **Use HTTPS** in production (configure through a reverse proxy like nginx)

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

1. **Security Audit** - Find critical security issues in authentication modules:

```json
{
  "project_key": "my-project",
  "component_keys": ["src/auth/", "src/security/"],
  "tags": ["security", "vulnerability"],
  "severities": ["CRITICAL", "BLOCKER"],
  "statuses": ["OPEN", "REOPENED"]
}
```

1. **Sprint Planning** - Get open issues for specific team members:

```json
{
  "project_key": "my-project",
  "assignees": ["john.doe@example.com", "jane.smith@example.com"],
  "statuses": ["OPEN", "CONFIRMED"],
  "facets": ["severities", "types"],
  "facet_mode": "effort"
}
```

1. **File-Specific Analysis** - Issues in a specific file:

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

1. **List all test files in a project:**

```json
{
  "component": "my-project",
  "qualifiers": ["UTS"]
}
```

1. **Navigate directory structure:**

```json
{
  "component": "my-project:src/main",
  "strategy": "children",
  "qualifiers": ["DIR", "FIL"]
}
```

1. **Search for components by language:**

```json
{
  "language": "java",
  "qualifiers": ["FIL"],
  "query": "Controller"
}
```

1. **Get project list:**

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

No parameters required.

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

No parameters required.

#### `system_status`

Get the status of the SonarQube instance.

No parameters required.

#### `system_ping`

Ping the SonarQube instance to check if it is up.

No parameters required.

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

- Node.js 22 or higher
- pnpm 10.17.0 or higher
- Docker (for container builds)

### Setup

1. Clone the repository:

```bash
git clone https://github.com/sapientpants/sonarqube-mcp-server.git
cd sonarqube-mcp-server
```

1. Install dependencies:

```bash
pnpm install
```

1. Build the project:

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

## Common Issues and Solutions

### Quick Fixes

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

##### Error: "Authentication failed"

- **Solution**: Check that your SONARQUBE_TOKEN is valid and not expired. Generate a new token from your SonarQube user profile.

##### Error: "No SonarQube authentication configured"

- **Solution**: Set one of the following authentication methods:
  - `SONARQUBE_TOKEN` for token-based authentication (recommended)
  - `SONARQUBE_USERNAME` and `SONARQUBE_PASSWORD` for basic authentication
  - `SONARQUBE_PASSCODE` for system passcode authentication

#### Authorization Errors

##### Error: "Access denied"

- **Solution**: Ensure your token has the required permissions for the operation. Common required permissions:
  - "Execute Analysis" for code analysis
  - "Browse" for reading project data
  - "Administer Issues" for issue management operations

#### Resource Not Found Errors

##### Error: "Resource not found"

- **Solution**: Verify that:
  - The project key/component exists in SonarQube
  - You have access to the resource
  - The URL path is correct (no typos in project keys)

#### Network and Connection Errors

##### Error: "Connection refused"

- **Solution**: Check that:
  - The SonarQube server is running
  - The SONARQUBE_URL is correct
  - There are no firewall rules blocking the connection

##### Error: "Network error" or timeout errors

- **Solution**:
  - Verify your network connection
  - Check if the SonarQube server is accessible
  - Ensure the URL doesn't have a trailing slash
  - For self-hosted instances, verify SSL certificates

#### Rate Limiting

##### Error: "Rate limit exceeded"

- **Solution**: The server automatically retries rate-limited requests with exponential backoff. If you continue to hit rate limits:
  - Reduce the frequency of your requests
  - Implement request batching where possible
  - Contact your SonarQube administrator to increase rate limits

#### Configuration Errors

##### Error: "Invalid SONARQUBE_URL"

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

Made with ❤️ by the SonarQube MCP Server community
