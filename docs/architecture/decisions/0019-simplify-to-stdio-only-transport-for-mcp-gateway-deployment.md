# 19. Simplify to stdio-only transport for MCP gateway deployment

Date: 2025-01-30

## Status

Accepted

## Context

The SonarQube MCP Server initially supported only stdio transport (ADR-0010). Later, HTTP transport with OAuth 2.0 support was added (ADR-0016) to enable enterprise features like multi-tenancy, authentication, and audit logging.

However, this added significant complexity:

- 60+ authentication/authorization files
- Complex OAuth token validation
- Service account management
- Permission filtering system
- Audit logging infrastructure
- HTTP server configuration
- External IdP integration

Meanwhile, the MCP ecosystem has evolved with gateway solutions that handle these enterprise concerns:

- Docker MCP Gateway
- IBM Context Forge
- SGNL
- Operant

These gateways provide authentication, multi-tenancy, monitoring, and other enterprise features at the gateway layer, making the HTTP transport implementation redundant.

## Decision

We will simplify the MCP server to support only stdio transport, removing all HTTP, OAuth, SSE, and related enterprise infrastructure. Enterprise features will be handled by MCP gateways.

This involves:

1. Removing HTTP transport and all OAuth/authentication code
2. Removing service account management and permission filtering
3. Removing audit logging (handled by gateways)
4. Removing Kubernetes/Helm/Terraform deployment configs
5. Simplifying configuration to core SonarQube settings
6. Reducing Docker image size and resource requirements

## Consequences

### Positive

- **Reduced Complexity**: ~40% reduction in codebase size
- **Improved Maintainability**: Focus on core SonarQube integration
- **Better Separation of Concerns**: Business logic vs infrastructure
- **Faster Startup**: No HTTP server or auth initialization
- **Smaller Attack Surface**: No network exposure
- **Easier Testing**: No auth/permission mocking needed
- **Gateway Flexibility**: Users can choose their preferred gateway

### Negative

- **Breaking Change**: Users of HTTP transport must migrate
- **Feature Migration**: Enterprise users need to adopt MCP gateways
- **Documentation Updates**: Significant documentation changes required

### Neutral

- **Unix Philosophy**: Aligns with "do one thing well"
- **Ecosystem Evolution**: Follows MCP community direction
- **Gateway Pattern**: Standard in microservices architecture

## Implementation

The simplification will be implemented in phases:

1. **Phase 1**: Remove HTTP/OAuth infrastructure files
2. **Phase 2**: Simplify configuration and environment variables
3. **Phase 3**: Update documentation for stdio-only approach
4. **Phase 4**: Optimize core functionality and startup time
5. **Phase 5**: Optimize Docker image for minimal footprint
6. **Phase 6**: Update tests and validate functionality

## Migration Path

Users currently using HTTP transport should:

1. Deploy an MCP gateway (Docker MCP Gateway, IBM Context Forge, etc.)
2. Configure the stdio server behind the gateway
3. Move authentication/authorization to the gateway layer
4. Leverage gateway features for monitoring and audit

## References

- GitHub Issue #243: Simplify to stdio-only transport
- ADR-0010: Use stdio transport for MCP communication
- ADR-0016: HTTP transport with OAuth 2.0 (being reverted)
- MCP Specification: Transport layer abstraction
