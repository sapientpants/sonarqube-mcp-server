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

## What's New in v1.3.0

### Enhanced Issues Tool
- **Branch/PR Analysis**: Analyze issues in feature branches and pull requests
- **Multi-Project Support**: Query issues across multiple projects simultaneously
- **Advanced Sorting**: Sort results by severity, creation date, update date, and more
- **Clean Code Taxonomy**: Filter by clean code attributes and software quality impacts (SonarQube 10.x+)
- **Enhanced Filtering**: New filters for assigned issues, specific authors, and OWASP Top 10 2021

### Security Hotspot Tools
- **Search Hotspots**: Find security hotspots with specialized filters for review workflows
- **Hotspot Details**: Get comprehensive security context and vulnerability information
- **Update Status**: Change hotspot status and resolution with proper permissions

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

4. Restart Claude Desktop

### 3. Start Using

Ask Claude to analyze your SonarQube projects:

```
"List all my SonarQube projects"
"Show me critical issues in project xyz"
"What's the code coverage for my main project?"
"Check the quality gate status"
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

### Docker

Run the server using Docker:

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
        "sapientpants/sonarqube-mcp-server"
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

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `SONARQUBE_TOKEN` | Authentication token for SonarQube API access | ✅ Yes | - |
| `SONARQUBE_URL` | URL of your SonarQube instance | ❌ No | `https://sonarcloud.io` |
| `SONARQUBE_ORGANIZATION` | Organization key (required for SonarCloud) | ❌ No* | - |
| `LOG_FILE` | Path to write log files (e.g., `/tmp/sonarqube-mcp.log`) | ❌ No | - |
| `LOG_LEVEL` | Minimum log level (DEBUG, INFO, WARN, ERROR) | ❌ No | `DEBUG` |

*Required when using SonarCloud

### SonarCloud vs SonarQube

**For SonarCloud:**
- Set `SONARQUBE_URL` to `https://sonarcloud.io`
- `SONARQUBE_ORGANIZATION` is required

**For SonarQube Server:**
- Set `SONARQUBE_URL` to your instance URL
- `SONARQUBE_ORGANIZATION` is typically not needed

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
Get issues from SonarQube projects with advanced filtering, sorting, and branch/PR support.

**Component Filters:**
- `project_key` (optional): Single project key (backward compatible)
- `projects` (optional): Array of project keys for multi-project analysis
- `component_keys` (optional): Array of component keys
- `components` (optional): Array of components
- `on_component_only` (optional): Boolean to limit to specific component

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
- `tags` (optional): Array of tags

**Date Filters:**
- `created_after` (optional): Issues created after date (YYYY-MM-DD)
- `created_before` (optional): Issues created before date (YYYY-MM-DD)
- `created_at` (optional): Issues created on date (YYYY-MM-DD)
- `created_in_last` (optional): Issues created in last period (e.g., "30d", "1m")

**Assignment:**
- `assigned` (optional): Boolean filter for assigned/unassigned
- `assignees` (optional): Array of assignee logins
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

### Security Hotspots

#### `search_hotspots`
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

#### `get_hotspot_details`
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

#### `project_quality_gate_status`
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