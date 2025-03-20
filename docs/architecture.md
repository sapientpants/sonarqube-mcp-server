# SonarQube MCP Server Architecture

## Overview

The SonarQube MCP Server is a Rust application designed to integrate SonarQube's code quality analysis capabilities with AI assistants through the Model Context Protocol (MCP). This integration enables AI assistants to access and interact with SonarQube data, such as code metrics, issues, and quality gate statuses, in order to provide intelligent insights about code quality.

## Current Implementation Status

The implementation of the SonarQube MCP Server is now substantially complete. The following components have been implemented:

- **Core MCP Protocol Implementation**:
  - JSON-RPC message handling over stdin/stdout
  - MCP protocol method implementations (initialize, ping, etc.)
  - Base structure for registering and invoking tools
  - Command-line interface for starting the MCP server

- **SonarQube Integration**:
  - SonarQube API client with authentication and error handling
  - Data models for SonarQube API responses
  - MCP tools for accessing SonarQube metrics, issues, and quality gates
  - Comprehensive test suite with fixtures and mocks

- **CI/CD Pipeline**:
  - GitHub Actions workflows for continuous integration
  - Matrix builds across multiple platforms and Rust versions
  - Automated release process for creating binaries

The implementation follows the research documented in `docs/research.md`, which provided guidance on:

1. SonarQube API authentication and endpoints
2. Recommended Rust libraries (Reqwest, Tokio, Serde)
3. Error handling patterns
4. Async processing design

## Core Components

### 1. MCP Server Layer

The MCP Server Layer provides the interface between AI assistants and the SonarQube functionality. It implements the Model Context Protocol, a JSON-RPC based protocol allowing AI assistants to discover and invoke capabilities.

Key components include:

- **JSON-RPC Router**: Processes JSON-RPC requests from MCP clients and routes them to appropriate handlers
- **MCP Protocol Handlers**: Implements required MCP protocol methods like `initialize`, `ping`, and notification handlers
- **Tools Registry**: Registers SonarQube-related tools that can be discovered and called by AI assistants
- **Resource Management**: Provides access to resources like project data and analysis results

### 2. SonarQube Integration Layer

This layer handles all interactions with the SonarQube API, abstracting away the complexities of authentication, HTTP requests, and JSON parsing.

Key components implemented:

- **HTTP Client**: Using Reqwest to make HTTP requests to the SonarQube API
- **Authentication**: Handling authentication with SonarQube using bearer tokens
- **Response Parsing**: Deserializing JSON responses from SonarQube into structured Rust types
- **Error Handling**: Providing robust error handling for network, authorization, and parsing issues

### 3. Data Models

Rust structs that represent both MCP protocol data structures and SonarQube domain objects:

- **MCP Protocol Types**: Structs for MCP messages, capabilities, tools definitions (implemented)
- **SonarQube Types**: Structs representing SonarQube data like metrics, issues, and quality gates (implemented)

## Technical Architecture

```
┌────────────────┐        ┌────────────────┐        ┌────────────────┐
│                │        │                │        │                │
│  AI Assistant  │◄─────►│  MCP Server    │◄─────►│  SonarQube     │
│  (MCP Client)  │  MCP   │  (This App)    │  HTTP  │  Server        │
│                │        │                │        │                │
└────────────────┘        └────────────────┘        └────────────────┘
```

### Communication Flow

1. **AI to MCP Server**: The AI assistant connects to the MCP server over stdin/stdout using JSON-RPC
2. **MCP Server to SonarQube**: The server makes HTTP requests to the SonarQube API
3. **Response Flow**: SonarQube data flows back to the AI in the reverse direction

### Key Technologies

- **Rust**: Core language providing memory safety, performance, and robust error handling
- **Tokio**: Async runtime for efficient concurrent processing of requests
- **Reqwest**: HTTP client for making requests to the SonarQube API
- **Serde**: Serialization/deserialization of JSON for both MCP and SonarQube API
- **RPC Router**: Custom JSON-RPC routing for MCP method handling
- **Clap**: Command-line argument parsing

## Module Structure

Current implementation:

- **main.rs**: Application entry point, MCP server initialization, and CLI handling
- **mcp/mod.rs**: MCP module organization with protocol constants
- **mcp/types.rs**: Data structures for MCP protocol messages
- **mcp/utilities.rs**: Core MCP protocol handler implementations
- **mcp/tools.rs**: Tool registration and example implementations
- **mcp/prompts.rs**: Prompts handling for AI interactions
- **mcp/resources.rs**: Resource management
- **mcp/sonarqube/mod.rs**: SonarQube module organization
- **mcp/sonarqube/client.rs**: SonarQube HTTP client and authentication
- **mcp/sonarqube/types.rs**: SonarQube data models
- **mcp/sonarqube/tools.rs**: SonarQube-specific MCP tools

## SonarQube Integration Details

The SonarQube integration is implemented as a set of MCP tools that invoke SonarQube API endpoints:

1. **Authentication**: Using bearer token authentication via the Authorization header
2. **Metrics Retrieval**: Tools to fetch code metrics like code complexity, bugs, and code smells
3. **Issues Access**: Tools to access and filter issues (bugs, vulnerabilities, code smells)
4. **Quality Gate Status**: Tools to retrieve quality gate status and conditions
5. **Project Analysis**: Tools to access analysis history and results

Each tool will follow a similar pattern:
- Accept parameters from the AI assistant (like project key, filters)
- Construct appropriate SonarQube API requests
- Execute the requests asynchronously
- Parse and process the response
- Return structured data back to the AI

## Error Handling

The architecture implements robust error handling:

- **Custom Error Types**: Using thiserror for clear error definitions
- **Error Propagation**: Rust's ? operator for clean error handling chains
- **Error Mapping**: Mapping between different error domains (HTTP, JSON, SonarQube API)
- **MCP Error Responses**: Structured error responses conforming to the MCP protocol

## Async Processing

The server leverages Rust's async/await for efficient concurrency:

- **Non-blocking I/O**: All SonarQube API calls are asynchronous
- **Concurrent Operations**: Parallel processing of independent SonarQube API requests
- **Resource Efficiency**: Minimized thread usage through the async runtime (implemented with Tokio)

## Extensibility

The architecture is designed for extensibility:

- **Modular Design**: Clear separation between MCP protocol handling and SonarQube integration
- **Tool Registration**: Easy addition of new SonarQube-related tools
- **Protocol Versioning**: Support for MCP protocol evolution

## Development Roadmap

1. **Core MCP Server** (Completed): Basic JSON-RPC handling, MCP protocol methods
2. **SonarQube Client** (Completed): HTTP client, authentication, basic API interaction
3. **SonarQube Tools** (Completed): Implementation of specific tools for SonarQube features
4. **Error Handling** (Completed): Custom error types and comprehensive error handling
5. **Testing** (Completed): Unit and integration tests
6. **CI/CD Pipeline** (Completed): GitHub Actions workflows for CI and releases
7. **Documentation** (In Progress): Architecture and usage documentation
