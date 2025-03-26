# SonarQube MCP Server

[![CI](https://github.com/sapientpants/sonarqube-mcp-server/actions/workflows/ci.yml/badge.svg)](https://github.com/sapientpants/sonarqube-mcp-server/actions/workflows/ci.yml)
[![DeepSource](https://app.deepsource.com/gh/sapientpants/sonarqube-mcp-server.svg/?label=code+coverage&show_trend=true&token=9XrIHVVGs9oZ-6fFSOPah2Ws)](https://app.deepsource.com/gh/sapientpants/sonarqube-mcp-server/)
[![DeepSource](https://app.deepsource.com/gh/sapientpants/sonarqube-mcp-server.svg/?label=active+issues&show_trend=true&token=9XrIHVVGs9oZ-6fFSOPah2Ws)](https://app.deepsource.com/gh/sapientpants/sonarqube-mcp-server/)
[![DeepSource](https://app.deepsource.com/gh/sapientpants/sonarqube-mcp-server.svg/?label=resolved+issues&show_trend=true&token=9XrIHVVGs9oZ-6fFSOPah2Ws)](https://app.deepsource.com/gh/sapientpants/sonarqube-mcp-server/)

A Rust implementation of a Model Context Protocol (MCP) server that integrates with SonarQube to provide AI assistants with access to code quality metrics, issues, and quality gate statuses.

## Overview

The SonarQube MCP Server enables AI assistants to interact with SonarQube's code quality analysis capabilities through the Model Context Protocol. This integration allows AI assistants to:

- Retrieve code metrics (complexity, bugs, code smells, etc.)
- Access and filter issues (bugs, vulnerabilities, code smells)
- Check quality gate statuses and conditions
- Analyze project quality over time

## Features

- **SonarQube API Integration**: Connects to SonarQube servers via REST API
- **MCP Protocol Support**: Implements the Model Context Protocol for AI assistant integration
- **Async Processing**: Efficient handling of requests using Rust's async/await
- **Cross-Platform**: Works on Linux, macOS, and Windows
- **Robust Error Handling**: Comprehensive error handling for network, authentication, and parsing issues

## Installation

### From Source

1. Clone the repository:
   ```bash
   git clone https://github.com/sapientpants/sonarqube-mcp-server.git
   cd sonarqube-mcp-server
   ```

2. Build the project:
   ```bash
   cargo build --release
   ```

3. The executable will be available at `target/release/sonarqube-mcp-server`

### From Releases

Download the pre-built binary for your platform from the [Releases](https://github.com/sapientpants/sonarqube-mcp-server/releases) page.

### Integration with Claude Desktop

1. Edit `claude_desktop_config.json`: Claude Desktop -> `Settings` -> `Developer` -> `Edit Config` 
2. Add the following configuration to the `mcpServers` section:

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
            "SONARQUBE_ORGANIZATION": "your-organization-key"
         }
      }
   }
}
```

3. Restart Claude Desktop to apply the changes

To check MCP logs, use: `tail -n 20 -f ~/Library/Logs/Claude/mcp*.log`

### Available Tools

The SonarQube MCP Server provides the following tools:

1. `sonarqube_get_metrics`: Retrieve code metrics for a project
   - Parameters:
    - `project_key` (required),
    - `metrics` (optional array of metric keys)

2. `sonarqube_get_issues`: Retrieve issues for a project
   - Parameters: 
     - `project_key` (required)
     - `severities` (optional array)
     - `types` (optional array)
     - `statuses` (optional array)
     - `impact_severities` (optional array)
     - `impact_software_qualities` (optional array)
     - `assigned_to_me` (optional boolean)
     - `assignees` (optional array)
     - `authors` (optional array)
     - `code_variants` (optional array)
     - `created_after` (optional string, format: YYYY-MM-DD)
     - `created_before` (optional string, format: YYYY-MM-DD)
     - `created_in_last` (optional string, e.g., '1m' for 1 month)
     - `cwe` (optional array of CWE identifiers)
     - `directories` (optional array)
     - `facets` (optional array)
     - `files` (optional array)
     - `issue_statuses` (optional array)
     - `languages` (optional array)
     - `owasp_top10` (optional array)
     - `owasp_top10_2021` (optional array)
     - `resolutions` (optional array)
     - `resolved` (optional boolean)
     - `rules` (optional array)
     - `sans_top25` (optional array)
     - `sonarsource_security` (optional array)
     - `tags` (optional array)
     - `sort_field` (optional string)
     - `asc` (optional boolean)
     - `page` (optional)
     - `page_size` (optional)

3. `sonarqube_get_quality_gate`: Retrieve quality gate status for a project
   - Parameters:
    - `project_key` (required)

4. `sonarqube_list_projects`: List all SonarQube projects
   - Parameters:
    - `page` (optional),
    - `page_size` (optional),
    - `organization` (optional - can override the environment variable)

## Development

### Prerequisites

- Rust 1.80 or higher
- Cargo
- A SonarQube server instance (for testing)
