# 6. Expose SonarQube Features as MCP Tools

Date: 2025-06-13

## Status

Accepted

## Context

The Model Context Protocol (MCP) defines a standard for exposing capabilities to AI clients through "tools". When integrating SonarQube functionality into an MCP server, we need to decide how to structure and expose the various SonarQube operations (projects, issues, metrics, quality gates, hotspots, etc.) to AI clients.

SonarQube provides a comprehensive REST API with numerous endpoints covering different aspects of code quality management. These operations have varying complexity, parameters, and return types. We need an architecture that:

1. Makes SonarQube functionality easily discoverable by AI clients
2. Provides clear, single-purpose operations
3. Enables scriptable automation of SonarQube tasks
4. Maintains consistency with MCP patterns
5. Allows for future extensibility

## Decision

We will expose each SonarQube operation as a separate MCP tool registered in index.ts. This tool-based architecture means:

1. **One Tool Per Operation**: Each distinct SonarQube capability (e.g., `searchIssues`, `getProjects`, `getMetrics`, `markIssueFalsePositive`) is implemented as its own MCP tool with a dedicated handler.

2. **Tool Registration**: All tools are registered in index.ts using the MCP server's tool registration mechanism, providing metadata about each tool's purpose, parameters, and schema.

3. **Domain Organization**: Tools are organized by domain modules (projects, issues, metrics, quality gates, hotspots, etc.) but exposed individually to the AI client.

4. **Consistent Naming**: Tools follow a consistent naming pattern that reflects their SonarQube domain and operation (e.g., `sonarqube.issues.search`, `sonarqube.projects.list`).

5. **Parameter Validation**: Each tool defines its own parameter schema for validation, ensuring type safety and clear documentation of required/optional parameters.

## Consequences

### Positive Consequences

1. **Discoverability**: AI clients can easily discover available SonarQube operations through MCP's tool listing mechanism.

2. **Clear Purpose**: Each tool has a single, well-defined purpose, making it easier for AI clients to understand and use correctly.

3. **Scriptability**: AI clients can compose multiple tool calls to create complex workflows (e.g., search for issues, then bulk mark them as false positives).

4. **Documentation**: Each tool can have its own detailed documentation, examples, and parameter descriptions.

5. **Extensibility**: New SonarQube operations can be added as new tools without modifying existing ones.

6. **Type Safety**: Individual parameter schemas per tool provide better type checking and validation.

7. **Testing**: Each tool can be tested independently with focused test cases.

### Negative Consequences

1. **Tool Proliferation**: Large number of tools may overwhelm AI clients or make tool selection more complex.

2. **Granularity**: Some related operations might benefit from being combined, but the tool-per-operation approach enforces separation.

3. **Registration Overhead**: Each new SonarQube feature requires tool registration boilerplate in index.ts.

4. **Naming Consistency**: Maintaining consistent naming across many tools requires discipline and documentation.

5. **Cross-Tool State**: Operations that might benefit from shared state or context must pass data explicitly between tool calls.
