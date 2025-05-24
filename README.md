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

## Overview

The SonarQube MCP Server enables AI assistants to interact with SonarQube's code quality analysis capabilities through the Model Context Protocol. This integration allows AI assistants to:

- 📊 **Retrieve code metrics and analysis results** - Access detailed quality metrics for your projects
- 🐛 **Access and filter issues** - Search and filter code issues by severity, type, status, and more
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

*Required when using SonarCloud

### SonarCloud vs SonarQube

**For SonarCloud:**
- Set `SONARQUBE_URL` to `https://sonarcloud.io`
- `SONARQUBE_ORGANIZATION` is required

**For SonarQube Server:**
- Set `SONARQUBE_URL` to your instance URL
- `SONARQUBE_ORGANIZATION` is typically not needed

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
Get issues from a SonarQube project with extensive filtering options.

**Parameters:**
- `project_key` (required): The unique identifier for the project
- `severity` (optional): Filter by severity (INFO, MINOR, MAJOR, CRITICAL, BLOCKER)
- `statuses` (optional): Filter by status array
- `resolutions` (optional): Filter by resolution array
- `types` (optional): Filter by type array
- `rules` (optional): Array of rule keys
- `tags` (optional): Array of tags
- `created_after` (optional): Issues created after date (YYYY-MM-DD)
- `created_before` (optional): Issues created before date (YYYY-MM-DD)
- `assignees` (optional): Array of assignee logins
- `authors` (optional): Array of author logins
- `languages` (optional): Array of languages
- And many more filtering options...

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
```

### Quality Monitoring
```
"Check the quality gate status for my main project"
"Show me the code coverage history for the last month"
"What are the quality gate conditions?"
"Compare metrics between develop and main branches"
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