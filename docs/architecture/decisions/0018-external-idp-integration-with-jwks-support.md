# 18. External IdP Integration with JWKS Support

Date: 2025-06-25

## Status

Accepted

## Context

Following the OAuth 2.0 authentication implementation in ADR-0016, we need to add support for external Identity Provider (IdP) integration. This is part of Story 8 in the Enterprise HTTP Transport milestone. Enterprise organizations typically use existing SSO systems (Azure AD, Okta, Auth0) and need the MCP server to validate tokens from these providers.

### Requirements:
1. Support OIDC/OAuth 2.0 token validation from external IdPs
2. Implement JWKS endpoint discovery and caching
3. Support common enterprise IdPs (Azure AD, Okta, Auth0, Keycloak)
4. Handle group claim mapping from different IdP token formats
5. Support multi-tenant scenarios with multiple IdPs
6. Provide IdP health monitoring capabilities
7. Maintain fallback authentication methods

### Challenges:
- Different IdPs use different claim formats (especially for groups)
- JWKS endpoints need efficient caching to avoid performance issues
- Health monitoring is crucial for enterprise reliability
- Multi-tenant support requires careful issuer management

## Decision

We will implement a comprehensive external IdP integration system with the following components:

### 1. External IdP Manager
- Manages multiple IdP configurations
- Handles claim extraction and transformation
- Provides health monitoring for each IdP
- Supports provider-specific defaults

### 2. JWKS Client
- Fetches and caches JWKS endpoints
- Supports OIDC discovery
- Converts JWK to PEM format for JWT validation
- Implements efficient caching with TTL

### 3. Enhanced Token Validator
- Integrates with External IdP Manager
- Falls back to static keys when needed
- Applies IdP-specific claim transformations

### Architecture:

```typescript
// External IdP configuration
interface ExternalIdPConfig {
  provider: 'azure_ad' | 'okta' | 'auth0' | 'keycloak' | 'generic';
  issuer: string;
  jwksUri?: string;
  audience: string | string[];
  groupsClaim?: string;
  groupsTransform?: 'none' | 'extract_name' | 'extract_id';
  enableHealthMonitoring?: boolean;
  tenantId?: string;
}

// JWKS Client with caching
class JWKSClient {
  // Fetches JWKS with caching
  // Supports OIDC discovery
  // Converts JWK to PEM
}

// External IdP Manager
class ExternalIdPManager {
  // Manages multiple IdPs
  // Health monitoring
  // Claim transformation
}
```

### Environment Configuration:
```bash
# External IdP configuration
MCP_EXTERNAL_IDP_1=provider:azure_ad,issuer:https://login.microsoftonline.com/{tenant}/v2.0,audience:api://mcp-server,groups_claim:groups
MCP_EXTERNAL_IDP_2=provider:okta,issuer:https://company.okta.com,audience:api://mcp-server

# JWKS caching configuration
MCP_JWKS_CACHE_TTL=3600000  # 1 hour
MCP_JWKS_REQUEST_TIMEOUT=5000  # 5 seconds

# Health monitoring
MCP_IDP_HEALTH_CHECK_INTERVAL=300000  # 5 minutes
MCP_IDP_HEALTH_MONITORING=true
```

## Consequences

### Positive:
1. **Enterprise Ready**: Full support for external SSO systems
2. **Performance**: Efficient JWKS caching reduces latency
3. **Reliability**: Health monitoring ensures IdP availability tracking
4. **Flexibility**: Provider-specific configurations handle different token formats
5. **Multi-tenant**: Supports multiple IdPs simultaneously
6. **Standards Compliant**: Full OIDC discovery support

### Negative:
1. **Complexity**: Additional components increase system complexity
2. **Dependencies**: Requires careful management of external service dependencies
3. **Cache Management**: JWKS cache invalidation needs consideration

### Neutral:
1. **Migration Path**: Existing static key configurations remain supported
2. **Monitoring**: Health endpoints provide visibility into IdP status
3. **Documentation**: Requires comprehensive setup guides for each IdP

## Implementation Notes

1. **Provider Defaults**: Each provider has sensible defaults for claim mappings
2. **Group Transformations**: Handle Azure AD's complex group object format
3. **Health Monitoring**: Periodic checks ensure IdP availability
4. **Cache Strategy**: TTL-based caching with manual invalidation support
5. **Error Handling**: Graceful fallbacks when IdPs are unavailable

## Security Considerations

1. **JWKS Validation**: Verify JWKS responses to prevent key injection
2. **Issuer Validation**: Strict issuer checking prevents token confusion
3. **Audience Validation**: Ensure tokens are intended for this service
4. **Certificate Pinning**: Consider pinning for critical IdPs
5. **Rate Limiting**: Prevent JWKS endpoint abuse

## Related ADRs

- ADR-0016: HTTP Transport with OAuth 2.0 Metadata Endpoints
- ADR-0014: Current Security Model and Future OAuth2 Considerations
- ADR-0017: Comprehensive Audit Logging System