# 16. HTTP Transport with OAuth 2.0 Metadata Endpoints

Date: 2025-06-22

## Status

Accepted

## Context

Following the transport architecture refactoring in ADR-0015, we need to implement HTTP transport to support enterprise deployment scenarios. The HTTP transport must provide authentication discovery mechanisms for MCP clients as outlined in the MCP specification.

### Requirements:
1. Implement HTTP transport as an alternative to STDIO
2. Support OAuth 2.0 metadata discovery endpoints (RFC9728 and RFC8414)
3. Enable enterprise authentication workflows
4. Maintain compatibility with existing transport architecture
5. Prepare for future OAuth 2.0 flow implementation

### Standards Compliance:
- RFC9728: OAuth 2.0 Protected Resource Metadata
- RFC8414: OAuth 2.0 Authorization Server Metadata  
- RFC6750: Bearer Token Usage

## Decision

We will implement HTTP transport with OAuth 2.0 metadata endpoints:

1. **HTTP Transport Implementation**: Express-based HTTP server following the ITransport interface
2. **Metadata Endpoints**: 
   - `/.well-known/oauth-protected-resource` (RFC9728)
   - `/.well-known/oauth-authorization-server` (RFC8414, optional)
3. **Authentication Structure**: WWW-Authenticate headers with resource metadata URLs
4. **Configuration**: Environment variable-based configuration consistent with existing patterns

### Architecture Details:

```typescript
// HTTP Transport with OAuth metadata
class HttpTransport implements ITransport {
  // Express server with CORS support
  // OAuth metadata endpoints
  // Bearer token authentication middleware
  // MCP HTTP transport integration
}

// Protected Resource Metadata response
{
  "resource": "https://mcp.company.com",
  "authorization_servers": ["https://auth.company.com"],
  "bearer_methods_supported": ["header"],
  "resource_signing_alg_values_supported": ["RS256"]
}
```

### Environment Variables:
- `MCP_TRANSPORT=http`: Enable HTTP transport
- `MCP_HTTP_PORT`: HTTP server port
- `MCP_HTTP_HOST`: HTTP server host
- `MCP_HTTP_PUBLIC_URL`: Public URL for metadata endpoints
- `MCP_OAUTH_AUTH_SERVERS`: External authorization server URLs
- `MCP_OAUTH_BUILTIN`: Enable built-in auth server metadata

## Consequences

### Positive:
1. **Enterprise Ready**: Supports enterprise authentication discovery workflows
2. **Standards Compliant**: Follows OAuth 2.0 RFCs for metadata discovery
3. **Extensible**: Structure ready for full OAuth 2.0 flow implementation
4. **Backward Compatible**: STDIO transport remains default
5. **Discovery Mechanism**: Clients can automatically discover authentication requirements

### Negative:
1. **Token Validation Pending**: Actual token validation not yet implemented
2. **Additional Dependencies**: Requires Express and CORS packages

### Neutral:
1. **Incremental Implementation**: Sets foundation for future OAuth stories
2. **Documentation Required**: New transport needs comprehensive documentation

## Implementation Notes

1. HTTP transport integrates with MCP SDK's HTTP server transport
2. Authentication middleware prepared for future token validation
3. Health check endpoint provided for monitoring
4. CORS enabled by default for cross-origin requests
5. All responses follow RFC specifications for JSON structure

## Related ADRs

- ADR-0015: Transport Architecture Refactoring
- ADR-0014: Current Security Model and Future OAuth2 Considerations
- ADR-0008: Use Environment Variables for Configuration