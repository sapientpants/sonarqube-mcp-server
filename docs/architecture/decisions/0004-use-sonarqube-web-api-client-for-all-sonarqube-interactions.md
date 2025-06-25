# 4. Use SonarQube Web API Client for all SonarQube interactions

Date: 2025-06-13

## Status

Accepted

## Context

The SonarQube MCP server needs to interact with SonarQube's REST API to provide functionality for code quality analysis, issue management, and metrics retrieval. We need a reliable and maintainable approach for making these API calls that:

- Handles authentication consistently
- Manages API versioning and endpoint changes
- Provides type safety for API requests and responses
- Reduces boilerplate code for common operations
- Offers a clear abstraction layer between our server and SonarQube's API

## Decision

We will use the `sonarqube-web-api-client` library for all interactions with SonarQube. A custom `SonarQubeClient` class will wrap this API client to:

1. Encapsulate authentication logic (API tokens)
2. Provide higher-level methods for common operations (projects, issues, metrics, etc.)
3. Handle error responses consistently
4. Abstract away the complexity of the underlying API client

All SonarQube API interactions will go through this client wrapper rather than making direct HTTP requests or using the API client library directly in action implementations.

## Consequences

### Positive

- **Consistency**: All API interactions follow the same pattern and error handling approach
- **Maintainability**: Changes to authentication or API endpoints can be handled in one place
- **Type Safety**: The library provides TypeScript types for API requests and responses
- **Reduced Complexity**: Action implementations focus on business logic rather than HTTP details
- **Testability**: The client wrapper can be easily mocked for unit testing

### Negative

- **Dependency**: We're tied to the `sonarqube-web-api-client` library's maintenance and updates
- **Abstraction Overhead**: Adding another layer of abstraction may hide some API capabilities
- **Learning Curve**: Developers need to understand both our wrapper and the underlying library

### Neutral

- The client wrapper pattern is a common architectural approach that most developers will be familiar with
- Future changes to the SonarQube API may require updates to both the library and our wrapper
