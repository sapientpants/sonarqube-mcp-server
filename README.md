# SonarQube MCP Server

[![CI](https://github.com/sapientpants/sonarqube-mcp-server/actions/workflows/ci.yml/badge.svg)](https://github.com/sapientpants/sonarqube-mcp-server/actions/workflows/ci.yml)

A Model Context Protocol (MCP) server that integrates with SonarQube to provide AI assistants with access to code quality metrics, issues, and analysis results.

## Overview

The SonarQube MCP Server enables AI assistants to interact with SonarQube's code quality analysis capabilities through the Model Context Protocol. This integration allows AI assistants to:

* Retrieve code metrics and analysis results
* Access and filter issues
* Check quality status
* Analyze project quality over time

## Features

* **SonarQube API Integration**: Connects to SonarQube via REST API
* **MCP Protocol Support**: Implements the Model Context Protocol for AI assistant integration
* **TypeScript/Node.js**: Built with TypeScript for type safety and modern JavaScript features
* **Cross-Platform**: Works on Linux, macOS, and Windows
* **Robust Error Handling**: Comprehensive error handling for network, authentication, and parsing issues

## Usage with Claude Desktop

1. Edit `claude_desktop_config.json`:
   - Open Claude Desktop
   - Go to `Settings` -> `Developer` -> `Edit Config`
   - Add the one of the configurations below to the `mcpServers` section

2. Restart Claude Desktop to apply the changes

### Docker

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
        "sapientpants/sonarqube-mcp-server"
      ],
      "env": {
        "SONARQUBE_URL": "https://sonarqube.example.com",
        "SONARQUBE_TOKEN": "your-sonarqube-token",
        "SONARQUBE_ORGANIZATION": "your-organization-key (optional)"
      }
    }
  }
}
```

### NPX

```json
{
  "mcpServers": {
    "sonarqube": {
      "command": "npx",
      "args": [
        "-y",
        "sonarqube-mcp-server@1.0.0"
      ],
      "env": {
        "SONARQUBE_URL": "https://sonarqube.example.com",
        "SONARQUBE_TOKEN": "your-sonarqube-token",
        "SONARQUBE_ORGANIZATION": "your-organization-key (optional)"
      }
    }
  }
}
```

## Available Tools

The SonarQube MCP Server provides the following tools:

### SonarQube Tools

1. `list_projects`: List all SonarQube projects
   * Parameters:
     * `organization` (optional) - Organization key for SonarQube Cloud
     * `page` (optional) - Page number for results pagination
     * `page_size` (optional) - Number of items per page

2. `get_issues`: Get issues from a SonarQube project
   * Parameters:
     * `project_key` (required) - The unique identifier for the SonarQube project
     * `severity` (optional) - Filter issues by severity (INFO, MINOR, MAJOR, CRITICAL, BLOCKER)
     * `organization` (optional) - Organization key for SonarQube Cloud
     * `page` (optional) - Page number for results pagination
     * `page_size` (optional) - Number of items per page
     * `statuses` (optional) - Filter issues by status (array of: OPEN, CONFIRMED, REOPENED, RESOLVED, CLOSED, TO_REVIEW, IN_REVIEW, REVIEWED)
     * `resolutions` (optional) - Filter issues by resolution (array of: FALSE-POSITIVE, WONTFIX, FIXED, REMOVED)
     * `resolved` (optional) - Whether to return only resolved issues (true) or unresolved issues (false)
     * `types` (optional) - Filter issues by type (array of: CODE_SMELL, BUG, VULNERABILITY, SECURITY_HOTSPOT)
     * `rules` (optional) - Array of rule keys to filter issues
     * `tags` (optional) - Array of tags to filter issues
     * `created_after` (optional) - Return issues created after the given date (format: YYYY-MM-DD)
     * `created_before` (optional) - Return issues created before the given date (format: YYYY-MM-DD)
     * `created_at` (optional) - Return issues created on the given date
     * `created_in_last` (optional) - Return issues created during a time span before the current time (e.g., "1d" for issues created in the last day)
     * `assignees` (optional) - Array of assignee login names to filter issues
     * `authors` (optional) - Array of author login names to filter issues
     * `cwe` (optional) - Array of CWE identifiers to filter vulnerability issues
     * `languages` (optional) - Array of languages to filter issues
     * `owasp_top10` (optional) - Array of OWASP Top 10 categories to filter issues
     * `sans_top25` (optional) - Array of SANS Top 25 categories to filter issues 
     * `sonarsource_security` (optional) - Array of SonarSource security categories to filter issues
     * `on_component_only` (optional) - Return only issues at the specified component level (true) or issues from the component's subtree (false)
     * `facets` (optional) - Array of facets to return along with the issues
     * `since_leak_period` (optional) - Return only issues created since the leak period
     * `in_new_code_period` (optional) - Return only issues created in the new code period

## Environment Variables

* `SONARQUBE_URL` - URL of your SonarQube instance (default: https://next.sonarqube.com/sonarqube)
* `SONARQUBE_TOKEN` - Authentication token for SonarQube API access
* `SONARQUBE_ORGANIZATION` - (Optional) Organization key for SonarQube Cloud

## Development

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
pnpm run build
```

4. Configure Claude Desktop
```json
{
  "mcpServers": {
    "sonarqube": {
      "command": "node",
      "args": [
        "/path/to/sonarqube-mcp-server/dist/index.js"
      ],
      "env": {
        "SONARQUBE_TOKEN": "your-sonarqube-token"
      }
    }
  }
}
```

### Prerequisites

* Node.js 20 or higher
* pnpm 10.7.0 or higher
* Docker (for container builds)

### Scripts

* `pnpm run build` - Build the TypeScript code
* `pnpm run start` - Start the server
* `pnpm run dev` - Start the server in development mode
* `pnpm run test` - Run tests
* `pnpm run lint` - Run ESLint
* `pnpm run format` - Format code with Prettier

## License

MIT 