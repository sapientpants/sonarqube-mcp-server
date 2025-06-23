# OAuth Token Validation

This document describes the JWT token validation implementation in the SonarQube MCP Server.

## Overview

The HTTP transport supports OAuth 2.0 Bearer token authentication with comprehensive JWT validation. When configured with authorization servers, all requests to the MCP endpoints require valid JWT tokens.

## Configuration

### Environment Variables

- `MCP_OAUTH_AUTH_SERVERS`: Comma-separated list of authorization server URLs
- `MCP_OAUTH_BUILTIN`: Set to `true` to enable built-in authorization server
- `JWT_PUBLIC_KEY_<issuer>`: Static public key for testing (issuer URL with special chars replaced by underscores)

### Programmatic Configuration

```typescript
const transport = new HttpTransport({
  authorizationServers: ['https://auth.example.com'],
  rateLimitOptions: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
  }
});
```

## Token Validation Process

1. **Format Validation**: Ensures the token is a valid JWT format
2. **Issuer Validation**: Verifies the token issuer is in the allowed list
3. **Signature Verification**: Validates the JWT signature using public keys
4. **Audience Validation**: Ensures the token is intended for this MCP server
5. **Time-based Validation**: Checks expiration (exp) and not-before (nbf) claims
6. **Resource Indicator Validation**: Optional validation of RFC8707 resource indicators

## JWKS Endpoint Fetching (TODO)

Currently, JWKS endpoint fetching is not implemented. The system supports two fallback mechanisms for testing:

### 1. Static Public Keys (Programmatic)

```typescript
const validator = new TokenValidator({
  audience: 'https://mcp.example.com',
  issuers: ['https://auth.example.com'],
  jwksEndpoints: new Map([...]),
  staticPublicKeys: new Map([
    ['https://auth.example.com', publicKeyPEM]
  ])
});
```

### 2. Environment Variable Public Keys

Set the public key via environment variable:
```bash
export JWT_PUBLIC_KEY_https___auth_example_com="-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
-----END PUBLIC KEY-----"
```

The issuer URL has special characters replaced with underscores.

## Error Responses

Failed authentication returns proper HTTP status codes with detailed error information:

### 401 Unauthorized
- `invalid_token`: Token format is invalid
- `expired_token`: Token has expired
- `invalid_signature`: Token signature verification failed

### 403 Forbidden
- `invalid_audience`: Token audience doesn't include this server
- `invalid_issuer`: Token issuer not recognized
- `invalid_resource`: Resource indicator doesn't match
- `token_not_active`: Token nbf claim is in the future

### 429 Too Many Requests
- Rate limit exceeded for authentication attempts

All error responses include a `WWW-Authenticate` header with detailed error information:
```
WWW-Authenticate: Bearer realm="MCP SonarQube Server", error="invalid_token", error_description="Token has expired"
```

## Security Considerations

1. **No Token Logging**: Tokens are never logged to prevent accidental exposure
2. **No Token Passthrough**: OAuth tokens are NOT passed to SonarQube
3. **Rate Limiting**: Built-in rate limiting prevents brute force attacks
4. **Clock Tolerance**: Configurable tolerance (default 5 seconds) for time-based claims

## Testing

For testing environments, use static public keys or environment variables instead of real JWKS endpoints. This allows testing without external dependencies.

Example test setup:
```typescript
process.env.JWT_PUBLIC_KEY_test_issuer = testPublicKey;
const transport = new HttpTransport({
  authorizationServers: ['test_issuer']
});
```

## Future Enhancements

- Implement JWKS endpoint fetching with caching
- Support for JWK key rotation
- Token introspection endpoint support
- Refresh token handling