# SonarQube MCP Server Refactoring Plan

This document outlines a comprehensive plan for refactoring the SonarQube MCP server codebase to improve its architecture, maintainability, and extensibility.

## 1. Consistency between RMCP SDK and Custom Implementation

### Issue
The codebase is currently in a transitional state, using both the official RMCP SDK in `main.rs` and a custom implementation in the `server` module.

### Solution
- Remove the legacy custom JSON-RPC server implementation
- Migrate all functionality to use the RMCP SDK consistently
- Update lifecycle handlers and tool registration to use the SDK interfaces

### Tasks
- [x] Refactor `src/server/mod.rs` to be a thin wrapper around RMCP SDK functionality
- [x] Update all tool registrations to use the RMCP tool registration system
- [x] Remove duplicate code and simplify the overall architecture
- [x] Update unit tests to reflect the new implementation

### Implementation Details
- Removed the custom JSON-RPC server implementation in `src/server/mod.rs`
- Simplified the server module to only provide utility functions and command-line argument handling
- Updated lifecycle functions in `src/mcp/lifecycle.rs` to be compatible with the RMCP SDK
- Added test compatibility mode to ensure tests continue to pass
- Modified tool registration in `src/mcp/tools.rs` and `src/mcp/sonarqube/tools.rs` to indicate they're legacy implementations
- Updated exports in `src/lib.rs` to reflect the new architecture

This change reduces code duplication and creates a more consistent architecture that fully leverages the RMCP SDK throughout the codebase. Legacy implementations are kept with clear documentation for backward compatibility during the transition period.

## 2. Dependency Injection Improvement

### Issue
The current implementation uses global static variables for server components like the SonarQube client, making testing difficult and creating tight coupling.

### Solution
- Implement proper dependency injection throughout the codebase
- Remove global state like `SONARQUBE_CLIENT` and `INITIALIZED_RECENTLY`
- Pass dependencies explicitly to functions that need them

### Tasks
- [x] Create a central context/container for server dependencies
- [x] Remove static globals in favor of passed dependencies
- [x] Update tool implementations to accept dependencies through parameters
- [x] Improve testability by making dependencies mockable

### Implementation Details
- Created a new ServerContext struct in `src/mcp/sonarqube/context.rs` to hold all dependencies
- Deprecated the global SONARQUBE_CLIENT static variable in favor of explicit dependency injection
- Updated all tool functions to accept a ServerContext parameter containing dependencies
- Maintained backward compatibility by keeping legacy implementations that use the global state
- Updated the SonarQubeMcpServer implementation to use the new context approach
- Added proper documentation explaining the migration path for legacy code

This change makes the codebase more maintainable and testable by removing global state and enforcing explicit dependency passing. The legacy global state is kept with deprecation warnings for backward compatibility, with clear guidance to migrate to the new approach.

## 3. Error Handling Standardization

### Issue
Error handling is inconsistent across the codebase, with a mix of `anyhow::Result`, `Result<T, ErrorObject>`, and custom errors like `SonarError`.

### Solution
- Standardize error types and handling throughout the codebase
- Implement proper error conversion between different error types
- Add more detailed error contexts to help with debugging

### Tasks
- [x] Create a unified error type hierarchy for the codebase
- [x] Implement conversions between error types
- [x] Improve error messages and context for better debugging
- [x] Add structured logging for errors

### Implementation Details
- Created a unified `McpError` enum in `src/mcp/errors.rs` to represent all possible errors in the system
- Added `McpResult<T>` type alias for standardized result handling throughout the codebase
- Implemented conversions from common error types (`anyhow::Error`, `reqwest::Error`, `SonarError`, etc.) to `McpError`
- Added extension methods on `Result` via the `ResultExt` trait for simplified error handling and logging
- Created helper functions (`map_anyhow_err`, `from_sonar_err`) to streamline error conversion
- Added structured logging with context for better debugging through error annotation
- Updated function signatures across the codebase to use the standardized `McpResult<T>` return type
- Added comprehensive tests in `tests/error_tests.rs` to verify error handling functionality

This change ensures consistent error handling throughout the codebase, improves error messages with additional context, and standardizes the approach to converting between different error types. Legacy functions are maintained with updated signatures that use the new error handling approach.

## 4. Configuration Management Refactoring

### Issue
Configuration is currently handled through command-line arguments with some overlap with environment variables, but lacks structure and validation.

### Solution
- Create a dedicated configuration module
- Support multiple configuration sources (files, env vars, args)
- Add validation for configuration values
- Support dynamic reconfiguration where appropriate

### Tasks
- [x] Create a configuration module with strong typing
- [x] Implement validation for configuration values
- [x] Support loading configuration from multiple sources
- [x] Add unit tests for configuration handling

### Implementation Details
- Created a new `Config` struct in `src/mcp/config.rs` to centralize all configuration
- Implemented configuration loading from multiple sources with a clear precedence order:
  1. Command-line arguments (highest priority)
  2. Environment variables
  3. Configuration file specified by environment variable
  4. Configuration file in the current directory
  5. Configuration file in the user's home directory
- Added strong typing for all configuration values with separate structs for different configuration areas
  - `SonarQubeConfig` for SonarQube connection settings
  - `ServerConfig` for server runtime settings
  - `LoggingConfig` for logging configuration
- Implemented validation for configuration values to ensure required fields are present and have valid values
- Added support for TOML configuration files with detailed comments explaining each option
- Created helper methods for parsing and validating various types of configuration values
- Added the ability to save configuration to a file for easy reuse
- Created comprehensive tests in `tests/config_tests.rs` to verify all aspects of configuration handling
- Provided a sample configuration template file that users can customize and save to their preferred location

This change improves the maintainability of the codebase by centralizing all configuration handling in one place, adds validation to prevent misconfiguration, and provides multiple convenient ways for users to configure the application.

## 5. Module Structure Reorganization

### Issue
The current module structure mixes concerns, with some modules having too many responsibilities.

### Solution
- Reorganize modules around clear boundaries of responsibility
- Apply consistent naming conventions
- Group related functionality together

### Tasks
- [x] Split `sonarqube/tools.rs` into smaller, focused modules
- [x] Rename modules to better reflect their purpose
- [x] Move code to more appropriate modules based on responsibility
- [x] Enforce clear interfaces between modules

### Implementation Details
- Created the following module structure:
  - `src/mcp/core/` - Core MCP functionality
  - `src/mcp/sonarqube/` - SonarQube-specific functionality
  - `src/mcp/server/` - Server interfaces and protocol handling
- Split the monolithic `src/mcp/types.rs` module into:
  - `src/mcp/core/types.rs` for common MCP types
  - `src/mcp/sonarqube/types.rs` for SonarQube-specific types
- Updated all imports across the codebase to reflect the new `types` module structure
- Moved error handling to `src/mcp/core/errors.rs` to centralize all error types
- Organized MCP lifecycle handlers into `src/mcp/core/lifecycle.rs`

This change improves the maintainability of the codebase by reorganizing modules around clear boundaries of responsibility, applying consistent naming conventions, and grouping related functionality together.

## 6. Async Code Improvements

### Issue
Async code is not always used optimally, with some operations potentially blocking the event loop.

### Solution
- Review and refactor async code for optimal performance
- Add proper timeout handling
- Improve concurrency for operations that can be parallelized

### Tasks
- [ ] Review all async code for potential blocking operations
- [x] Add timeouts to network operations
- [ ] Identify opportunities for concurrent operations
- [ ] Implement backpressure handling for high-load scenarios

## 7. Testing Enhancements

### Issue
Test coverage is uneven across the codebase, and some tests rely on global state.

### Solution
- Increase test coverage, especially for core functionality
- Refactor existing tests to avoid global state
- Add integration tests for end-to-end functionality

### Tasks
- [ ] Add unit tests for under-tested modules
- [x] Refactor existing tests to use dependency injection
- [x] Fix test environment issues with properly scoped environment variables
- [ ] Add integration tests for critical server flows
- [ ] Implement property-based testing for complex logic

### Implementation Details
- Refactored `tests/sonarqube_tools_tests.rs` to properly use dependency injection via `ServerContext`
- Fixed environment variable handling in tests to ensure proper isolation between test runs
- Updated mocks in tests to work correctly with the context-based approach
- Eliminated issues with tests trying to recreate contexts that were already established
- Added detailed logging to help diagnose test environment issues

## 8. API Documentation Improvement

### Issue
While the code has good comments, the API documentation could be more comprehensive, especially for external-facing components.

### Solution
- Enhance API documentation with more examples and use cases
- Document expected behavior and error cases
- Add diagrams for complex flows

### Tasks
- [ ] Enhance documentation for all public API functions
- [ ] Add examples of tool usage in documentation
- [ ] Document the JSON-RPC protocol and expected payloads
- [ ] Create architecture diagrams

## 9. Separation of MCP Protocol and SonarQube-Specific Code

### Issue
The MCP protocol implementation is tightly coupled with SonarQube-specific functionality.

### Solution
- Better separate the core MCP protocol from SonarQube integration
- Make it easier to reuse the MCP implementation for other tools

### Tasks
- [ ] Separate core MCP protocol into its own module
- [ ] Create clear interfaces between MCP protocol and SonarQube integration
- [ ] Make SonarQube integration a plugin to the core MCP server
- [ ] Enable easy extension for other tool integrations

### Current Status
The codebase has already begun separating concerns by creating a `core` module within `mcp`. However, there are still areas where MCP protocol functionality is tightly coupled with SonarQube-specific implementations.

### Planned Improvements

1. **Create a Generic Server Interface**:
   - [ ] Define a generic `McpServer` trait in `src/mcp/core/server.rs` that abstracts the MCP protocol handlers
   - [ ] Move server protocol implementation from `SonarQubeMcpServer` into a base implementation of this trait
   - [ ] Modify `SonarQubeMcpServer` to implement this trait and only add SonarQube-specific functionality

2. **Refactor Configuration**:
   - [ ] Split `Config` in `src/mcp/config.rs` into `McpConfig` (server, logging) and `SonarQubeConfig` (SonarQube-specific)
   - [ ] Update configuration loading to handle both configurations independently
   - [ ] Create a generic context type in `src/mcp/core/context.rs` that can be extended by specific implementations

3. **Improve Tool Registration**:
   - [ ] Create a generic tool registration mechanism in `src/mcp/core/tools.rs`
   - [ ] Move SonarQube-specific tools to a dedicated registration function in the SonarQube module
   - [ ] Enable plugins/extensions to register their own tools with the server

4. **Separate Server Context**:
   - [ ] Create a base `McpContext` in `src/mcp/core/context.rs` for common dependencies
   - [ ] Make `ServerContext` in `src/mcp/sonarqube/context.rs` extend this base context
   - [ ] Update dependency injection to use appropriate context types

5. **Modularize Main Application**:
   - [ ] Refactor `main.rs` to separate generic MCP server initialization from SonarQube-specific parts
   - [ ] Create a proper plugin architecture that allows loading different tool providers
   - [ ] Move SonarQube tool declarations from `main.rs` to the SonarQube module

### Outcome
After these changes, the codebase will have a clean separation between:
1. The MCP protocol implementation (communication, lifecycle, base types)
2. SonarQube-specific functionality (client, tools, types)

This will make it easier to:
- Maintain the core MCP protocol independently
- Add support for other static analysis tools beyond SonarQube
- Test components in isolation
- Evolve the MCP protocol without affecting tool implementations

## 10. Performance Optimization

### Issue
Some operations may not be optimized for performance, especially for large SonarQube instances.

### Solution
- Identify performance bottlenecks
- Implement caching for frequently accessed data
- Optimize network requests

### Tasks
- [ ] Add benchmarks for critical operations
- [ ] Implement caching for SonarQube API responses
- [ ] Optimize query construction for SonarQube API
- [ ] Add pagination optimizations for large result sets

## Implementation Priority

1. Consistency between RMCP SDK and custom implementation
2. Dependency injection improvement
3. Module structure reorganization
4. Error handling standardization
5. Configuration management refactoring
6. Separation of MCP protocol and SonarQube-specific code
7. Testing enhancements
8. Async code improvements
9. API documentation improvement
10. Performance optimization 