# 14. Current Security Model and Future OAuth2 Considerations

Date: 2025-06-19

## Status

Accepted

## Context

The SonarQube MCP Server currently uses environment variables for authentication (token, basic auth, or admin passcode), which is appropriate for its design as a single-user local tool. However, the MCP specification positions MCP servers as OAuth 2.1 resource servers, which has implications for future development, especially if HTTP transport is added.

The MCP specification states that:
- MCP servers should act as OAuth 2.1 resource servers
- HTTP-based connections require OAuth token validation
- RFC8707 resource indicators should be used for token scoping
- Multi-client scenarios need proper authorization mechanisms

Our current implementation:
- Uses stdio transport (not HTTP)
- Designed for single-user local usage
- Manages authentication via environment variables
- Directly uses SonarQube's authentication mechanisms

## Decision

We will maintain the current environment variable-based authentication approach for local single-user scenarios while documenting the limitations and future OAuth2 considerations.

Specifically:
1. Continue using environment variables for authentication configuration
2. Document the current security model clearly in README.md
3. Document authentication best practices in SECURITY.md
4. Acknowledge OAuth2 requirements for potential future HTTP transport
5. Design the codebase to allow future OAuth2 implementation without breaking changes

The authentication priority remains:
1. Token authentication (most secure, recommended)
2. Basic authentication (username/password)
3. System passcode (for admin scenarios)

## Consequences

### Positive Consequences

- **Simple Setup**: Users can quickly configure authentication without complex OAuth flows
- **Appropriate Security**: The security model matches the single-user local tool use case
- **Direct Integration**: Leverages SonarQube's existing authentication mechanisms
- **Backward Compatible**: Future OAuth2 support can be added without breaking existing usage

### Negative Consequences

- **Limited to Local Use**: Not suitable for multi-user or hosted scenarios without modifications
- **No Token Validation**: The MCP server trusts the provided credentials without additional validation
- **Future Migration**: Adding OAuth2 support will require significant changes if HTTP transport is implemented

### Security Considerations

- Credentials are stored in the MCP client's configuration file (e.g., Claude Desktop config)
- Users must ensure proper file permissions on configuration files
- Token-based authentication is strongly recommended over passwords
- Tokens should be scoped with minimal required permissions

### Future Work

If HTTP transport is added:
1. Implement OAuth 2.1 resource server capabilities
2. Add token validation middleware
3. Support RFC8707 resource indicators
4. Implement proper multi-client authorization
5. Maintain backward compatibility with environment variable auth for local usage
