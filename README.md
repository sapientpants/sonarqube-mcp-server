# SonarQube MCP Server

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
   git clone https://github.com/yourusername/sonarqube-mcp-server.git
   cd sonarqube-mcp-server
   ```

2. Build the project:
   ```bash
   cargo build --release
   ```

3. The executable will be available at `target/release/sonarqube-mcp-server`

### From Releases

Download the pre-built binary for your platform from the [Releases](https://github.com/yourusername/sonarqube-mcp-server/releases) page.

## Usage

### CLI Options

* `--mcp`: Enable MCP server mode
* `--resources`: Display available resources
* `--prompts`: Display available prompts
* `--tools`: Display available tools
* `--help`: Show help information

### Configuration

The SonarQube MCP Server requires the following environment variables:

* `SONARQUBE_URL`: The base URL of your SonarQube server (e.g., `https://sonarqube.example.com`)
* `SONARQUBE_TOKEN`: Your SonarQube authentication token

Optional environment variables:

* `SONARQUBE_ORGANIZATION`: Organization key for SonarCloud or multi-organization SonarQube instances
* `SONARQUBE_DEBUG`: Set to "1" or "true" to enable detailed debugging output

### Integration with Claude Desktop

1. Edit `claude_desktop_config.json`: Claude Desktop -> `Settings` -> `Developer` -> `Edit Config` 
2. Add the following configuration to the `mcpServers` section:

```json
{
   "mcpServers": {
      "sonarqube": {
         "command": "sonarqube-mcp-server",
         "args": [
            "--mcp"
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
   - Parameters: `project_key` (required), `metrics` (optional array of metric keys)

2. `sonarqube_get_issues`: Retrieve issues for a project
   - Parameters: `project_key` (required), `severities` (optional array), `types` (optional array), `statuses` (optional array), `impact_severities` (optional array), `impact_software_qualities` (optional array), `page` (optional), `page_size` (optional)

3. `sonarqube_get_quality_gate`: Retrieve quality gate status for a project
   - Parameters: `project_key` (required)

4. `sonarqube_list_projects`: List all SonarQube projects
   - Parameters: `page` (optional), `page_size` (optional), `organization` (optional - can override the environment variable)


## Examples

### Example: Retrieving Metrics

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "sonarqube_get_metrics",
  "params": {
    "project_key": "my-project",
    "metrics": ["ncloc", "bugs", "code_smells", "complexity"]
  }
}
```

Response:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "component": {
      "key": "my-project",
      "name": "My Project",
      "measures": [
        {
          "metric": "ncloc",
          "value": "12500"
        },
        {
          "metric": "bugs",
          "value": "42"
        },
        {
          "metric": "code_smells",
          "value": "156"
        },
        {
          "metric": "complexity",
          "value": "1250"
        }
      ]
    }
  }
}
```

### Example: Getting Issues with Status Filtering

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "sonarqube_get_issues",
  "params": {
    "project_key": "my-project",
    "severities": ["CRITICAL", "BLOCKER"],
    "statuses": ["OPEN", "CONFIRMED"],
    "page": 1,
    "page_size": 20
  }
}
```

### Example: Getting Issues with Impact Filtering

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "sonarqube_get_issues",
  "params": {
    "project_key": "my-project",
    "impact_severities": ["HIGH"],
    "impact_software_qualities": ["MAINTAINABILITY", "SECURITY"],
    "page": 1,
    "page_size": 20
  }
}
```

### Example: Listing Projects with Organization Parameter

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "sonarqube_list_projects", 
  "params": {
    "organization": "my-org-key"
  }
}
```

## Development

### Prerequisites

- Rust 1.70 or higher
- Cargo
- A SonarQube server instance (for testing)

### Running Tests

```bash
cargo test
```

### Building for Development

```bash
cargo build
```

### Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## References

* [SonarQube Web API Documentation](https://docs.sonarsource.com/sonarqube/latest/extension-guide/web-api/)
* [Model Context Protocol (MCP) Specification](https://spec.modelcontextprotocol.io/)
* [MCP Introduction](https://modelcontextprotocol.io/introduction)
* [rust-rpc-router](https://github.com/jeremychone/rust-rpc-router/) - JSON-RPC routing library for Rust
