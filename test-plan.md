# SonarQube MCP Server Test Plan

This document outlines a comprehensive test plan to improve code coverage for the SonarQube MCP Server project.

## Current Test Coverage Analysis

The codebase currently has several test modules, including:

- `main_tests.rs`: Tests for CLI argument parsing
- `sonarqube_types_tests.rs`: Tests for SonarQube data types 
- `sonarqube_tools_tests.rs`: Tests for SonarQube tool functionality
- `client_tests.rs`: Tests for SonarQube client operations
- `resources_tests.rs`: Tests for resource management
- `types_tests.rs`: Tests for MCP data types
- `end_to_end_tests.rs`: Integration tests
- `output_test.rs`: Tests for output formatting
- `tools_tests.rs`: Tests for general MCP tool functionality
- `prompts_tests.rs`: Tests for prompt management
- `utilities_tests.rs`: Tests for utility functions

## Identified Test Coverage Gaps

Based on code analysis, the following areas need improved test coverage:

### 1. Main Module Coverage

- **`setup_signal_handlers()`**: Tests for signal handling using mocks for both Unix and Windows platforms
- **`build_rpc_router()`**: Tests for router configuration and method registration
- **`display_info()`**: Tests for output formatting with various command-line arguments
- **`main()`**: Tests for the main JSON-RPC server loop

### 2. SonarQube Integration

- **Error handling**: Test cases for API failures and connection issues
- **Authentication**: Tests for token validation and refresh
- **Query rate limiting**: Tests for respecting rate limits

### 3. JSON-RPC Communication

- **Request parsing**: Tests for malformed requests
- **Response formatting**: Validation of response structure
- **Error handling**: Verification of error responses

### 4. MCP Module

#### Utilities
- **Notification handlers**: Tests for notification processing
- **Graceful shutdown**: Verification of cleanup procedures

#### Resources
- **Edge cases**: Tests for missing or malformed resources

#### Tools
- **Tool registration**: Verify all tools are properly registered

## Implementation Status

### 1. Main Module Tests (Implemented)

New test files have been created to cover critical main module functionality:

- **main_tests.rs**: Removed as functionality moved to more specific test files ✅
- **router_tests.rs**: Added tests for router configuration and method invocation
- **signal_tests.rs**: Added tests for signal handling on both Unix and Windows
- **jsonrpc_tests.rs**: Added tests for JSON-RPC message handling

### 2. SonarQube Integration (Partially Implemented)

Existing test files:
- **client_tests.rs**: Tests basic client operations ✅
  - Get metrics functionality ✅
  - Quality gate status ✅
  - Issue retrieval ✅
  - Project listing ✅
  - Error handling for auth and not found cases ✅
- **sonarqube_tools_tests.rs**: Tests tool functionality ✅
  - Tool registration ✅
  - Error conditions ✅
  - Result formatting ✅

To be implemented:
- More error handling tests
- Authentication failure tests
- Rate limiting tests

### 3. JSON-RPC Communication (Implemented)

Tests implemented in **jsonrpc_tests.rs** cover:
- Request parsing 
- Response formatting
- Error handling
- Notification processing
- Cancellation handling

### 4. MCP Module (Partially Implemented)

Existing test files cover basic functionality:
- **resources_tests.rs**: Basic resource management ✅
- **prompts_tests.rs**: Prompt handling and validation ✅
- **tools_tests.rs**: Tool registration and execution ✅
- **utilities_tests.rs**: Core utility functions ✅
- **types_tests.rs**: Data structure serialization ✅

Completed:
- Tool registration validation ✅
- Response format validation ✅
- Basic error handling ✅
- Fixture management improvements ✅

To be implemented:
- More edge case testing
- More notification handling tests

## Implementation Priority

1. **High Priority**
   - JSON-RPC request/response handling tests ✅
   - Error handling tests ✅
   - SonarQube API integration tests ✅
   - Test fixtures and response formats ✅

2. **Medium Priority**
   - Signal handler tests ✅
   - Main module tests ✅
   - Performance tests

3. **Low Priority**
   - Additional edge cases
   - Stress tests

## Recent Improvements

- Removed unused main_tests.rs and consolidated functionality
- Fixed test fixtures to match expected response formats
- Improved error handling in client tests
- Added project.json fixture for additional test cases
- Updated test helpers for better fixture loading
- Validated all tool registrations
- Fixed quality gate and issues response formats
- Added comprehensive test coverage for SonarQube client operations

## Next Steps

1. Implement remaining error handling tests
2. Add rate limiting tests
3. Add stress tests for API operations
4. Implement performance benchmarks
5. Add more edge cases for error conditions

## Test Environment Requirements

- Mock HTTP server for SonarQube API
- Capture stdout/stderr for output validation
- Signal simulation capabilities
- Memory profiling tools

## Metrics for Success

- Achieve >80% code coverage overall
- Ensure all public functions have tests
- Cover error handling pathways
- Validate all tool registrations 