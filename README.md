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

* Retrieve code metrics and analysis results
* Access and filter issues
* Check quality status
* Analyze project quality over time

## Features

- List all SonarQube projects with pagination support
- Get detailed issue information from SonarQube projects with extensive filtering options
- Support for both SonarQube and SonarCloud
- Comprehensive parameter validation using Zod schemas
- Full TypeScript support

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
        "sonarqube-mcp-server@1.0.1"
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

1. `projects`: List all SonarQube projects
   * Parameters:
     * `organization` (optional) - Organization key for SonarQube Cloud
     * `page` (optional) - Page number for results pagination
     * `page_size` (optional) - Number of items per page

2. `issues`: Get issues from a SonarQube project
   * Parameters:
     * `project_key` (required) - The unique identifier for the SonarQube project
     * `branch` (optional) - Filter issues for a specific branch
     * `pull_request` (optional) - Filter issues for a specific pull request
     * `hotspots` (optional) - Filter for security hotspots
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