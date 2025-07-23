# Identity Provider Integration Guide

## Overview

This guide provides step-by-step instructions for integrating the SonarQube MCP Server with popular identity providers (IdPs) including Azure AD, Okta, Auth0, Keycloak, and others. The MCP Server supports any OAuth 2.0/OpenID Connect compliant identity provider.

## Prerequisites

- SonarQube MCP Server with HTTP transport enabled
- Administrative access to your identity provider
- Understanding of OAuth 2.0 and JWT tokens
- Public key or JWKS endpoint from your IdP

## Azure Active Directory Integration

### 1. Register Application in Azure AD

1. Navigate to Azure Portal → Azure Active Directory → App registrations
2. Click "New registration"
3. Configure the application:
   - Name: `SonarQube MCP Server`
   - Supported account types: Choose based on your needs
   - Redirect URI: Not needed for MCP (uses JWT validation)

### 2. Configure Application

1. Go to "Certificates & secrets" → "Client secrets"
2. Create a new client secret (save for later)
3. Go to "API permissions" → "Add a permission"
4. Add Microsoft Graph permissions:
   - `User.Read`
   - `GroupMember.Read.All`

### 3. Configure Token Settings

1. Go to "Token configuration"
2. Add optional claims for ID token:
   - `email`
   - `groups`
   - `preferred_username`

### 4. Get Configuration Values

From the Overview page, note:
- Application (client) ID: `YOUR_CLIENT_ID`
- Directory (tenant) ID: `YOUR_TENANT_ID`

### 5. MCP Server Configuration

```bash
# Azure AD OAuth configuration
MCP_HTTP_OAUTH_ISSUER=https://login.microsoftonline.com/YOUR_TENANT_ID/v2.0
MCP_HTTP_OAUTH_AUDIENCE=YOUR_CLIENT_ID

# Download and save the public key
curl https://login.microsoftonline.com/YOUR_TENANT_ID/discovery/v2.0/keys > azure-keys.json
# Extract the appropriate key and save as PEM

MCP_HTTP_OAUTH_PUBLIC_KEY_PATH=/config/azure-public.pem
```

### 6. Token Example

Azure AD JWT token structure:
```json
{
  "aud": "YOUR_CLIENT_ID",
  "iss": "https://login.microsoftonline.com/YOUR_TENANT_ID/v2.0",
  "iat": 1234567890,
  "nbf": 1234567890,
  "exp": 1234567890,
  "groups": ["group-id-1", "group-id-2"],
  "name": "John Doe",
  "oid": "user-object-id",
  "preferred_username": "john.doe@company.com",
  "sub": "user-subject-id"
}
```

### 7. Group Mapping

Map Azure AD groups to service accounts:

```bash
# Map Azure AD group IDs to service accounts
SERVICE_ACCOUNT_SA1_GROUP_PATTERN="group-id-1|group-id-2"
SERVICE_ACCOUNT_SA2_GROUP_PATTERN="group-id-3"
```

### 8. Testing

```bash
# Get an access token from Azure AD
ACCESS_TOKEN=$(az account get-access-token --resource YOUR_CLIENT_ID --query accessToken -o tsv)

# Test with MCP Server
curl -H "Authorization: Bearer $ACCESS_TOKEN" https://mcp.company.com/health
```

## Okta Integration

### 1. Create Okta Application

1. Log in to Okta Admin Console
2. Navigate to Applications → Applications
3. Click "Create App Integration"
4. Choose:
   - Sign-in method: OIDC - OpenID Connect
   - Application type: API Services

### 2. Configure Application

1. General Settings:
   - App integration name: `SonarQube MCP Server`
   - Grant type: Client Credentials
2. Save and note the Client ID and Client Secret

### 3. Configure Authorization Server

1. Go to Security → API → Authorization Servers
2. Use default or create custom authorization server
3. Add custom claims:
   - Claim name: `groups`
   - Include in: Access Token
   - Value type: Groups
   - Filter: Matches regex `.*`

### 4. Create Access Policy

1. In Authorization Server → Access Policies
2. Add Policy:
   - Name: `SonarQube MCP Access`
   - Assign to: Your Okta application
3. Add Rule:
   - Grant type: Client Credentials
   - Scopes: Create custom scopes as needed

### 5. MCP Server Configuration

```bash
# Okta OAuth configuration
MCP_HTTP_OAUTH_ISSUER=https://YOUR_DOMAIN.okta.com/oauth2/default
MCP_HTTP_OAUTH_AUDIENCE=api://default

# Option 1: Use JWKS endpoint (when supported)
# MCP_HTTP_OAUTH_JWKS_URI=https://YOUR_DOMAIN.okta.com/oauth2/default/v1/keys

# Option 2: Download public key
curl https://YOUR_DOMAIN.okta.com/oauth2/default/v1/keys > okta-keys.json
# Extract key and convert to PEM format
MCP_HTTP_OAUTH_PUBLIC_KEY_PATH=/config/okta-public.pem
```

### 6. Group-Based Access

Configure Okta groups for team access:

```bash
# Map Okta groups to service accounts
SERVICE_ACCOUNT_SA1_GROUP_PATTERN="Engineering|DevOps"
SERVICE_ACCOUNT_SA2_GROUP_PATTERN="QA|Testing"
SERVICE_ACCOUNT_SA3_GROUP_PATTERN="Security"
```

### 7. Testing

```bash
# Get access token using client credentials
ACCESS_TOKEN=$(curl -X POST https://YOUR_DOMAIN.okta.com/oauth2/default/v1/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET&scope=custom_scope" \
  | jq -r .access_token)

# Test with MCP Server
curl -H "Authorization: Bearer $ACCESS_TOKEN" https://mcp.company.com/health
```

## Auth0 Integration

### 1. Create Auth0 Application

1. Log in to Auth0 Dashboard
2. Navigate to Applications
3. Click "Create Application"
4. Choose:
   - Name: `SonarQube MCP Server`
   - Type: Machine to Machine

### 2. Configure API

1. Go to APIs → Create API
2. Configure:
   - Name: `SonarQube MCP API`
   - Identifier: `https://api.sonarqube-mcp.company.com`
   - Signing Algorithm: RS256

### 3. Authorize Application

1. In API settings → Machine to Machine Applications
2. Authorize your application
3. Select scopes/permissions as needed

### 4. Add Custom Claims

Create an Auth0 Rule:

```javascript
function addGroupsToAccessToken(user, context, callback) {
  const namespace = 'https://sonarqube-mcp/';
  
  // Add groups to access token
  context.accessToken[namespace + 'groups'] = user.groups || [];
  context.accessToken[namespace + 'email'] = user.email;
  context.accessToken[namespace + 'department'] = user.user_metadata.department;
  
  callback(null, user, context);
}
```

### 5. MCP Server Configuration

```bash
# Auth0 OAuth configuration
MCP_HTTP_OAUTH_ISSUER=https://YOUR_DOMAIN.auth0.com/
MCP_HTTP_OAUTH_AUDIENCE=https://api.sonarqube-mcp.company.com

# Download public key
curl https://YOUR_DOMAIN.auth0.com/.well-known/jwks.json > auth0-keys.json
# Extract and convert to PEM
MCP_HTTP_OAUTH_PUBLIC_KEY_PATH=/config/auth0-public.pem
```

### 6. Testing

```bash
# Get access token
ACCESS_TOKEN=$(curl -X POST https://YOUR_DOMAIN.auth0.com/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET",
    "audience": "https://api.sonarqube-mcp.company.com",
    "grant_type": "client_credentials"
  }' | jq -r .access_token)

# Test with MCP Server
curl -H "Authorization: Bearer $ACCESS_TOKEN" https://mcp.company.com/health
```

## Keycloak Integration

### 1. Create Keycloak Client

1. Log in to Keycloak Admin Console
2. Select your realm
3. Go to Clients → Create
4. Configure:
   - Client ID: `sonarqube-mcp`
   - Client Protocol: openid-connect
   - Access Type: confidential

### 2. Configure Client

1. Settings tab:
   - Service Accounts Enabled: ON
   - Authorization Enabled: ON (optional)
2. Credentials tab:
   - Note the Secret

### 3. Configure Client Scopes

1. Go to Client Scopes → Create
2. Add scope: `sonarqube-mcp`
3. Add mappers for groups:
   - Name: `groups`
   - Mapper Type: Group Membership
   - Token Claim Name: `groups`
   - Add to ID token: OFF
   - Add to access token: ON

### 4. MCP Server Configuration

```bash
# Keycloak OAuth configuration
MCP_HTTP_OAUTH_ISSUER=https://keycloak.company.com/auth/realms/YOUR_REALM
MCP_HTTP_OAUTH_AUDIENCE=sonarqube-mcp

# Get realm public key
curl https://keycloak.company.com/auth/realms/YOUR_REALM > realm-info.json
# Extract public_key and format as PEM
MCP_HTTP_OAUTH_PUBLIC_KEY_PATH=/config/keycloak-public.pem
```

### 5. Group Mapping

Map Keycloak groups to service accounts:

```bash
# Keycloak groups mapping
SERVICE_ACCOUNT_SA1_GROUP_PATTERN="/company/engineering"
SERVICE_ACCOUNT_SA2_GROUP_PATTERN="/company/qa"
```

### 6. Testing

```bash
# Get access token
ACCESS_TOKEN=$(curl -X POST https://keycloak.company.com/auth/realms/YOUR_REALM/protocol/openid-connect/token \
  -d "grant_type=client_credentials" \
  -d "client_id=sonarqube-mcp" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  | jq -r .access_token)

# Test with MCP Server
curl -H "Authorization: Bearer $ACCESS_TOKEN" https://mcp.company.com/health
```

## Google Workspace Integration

### 1. Create Google Cloud Project

1. Go to Google Cloud Console
2. Create new project or select existing
3. Enable necessary APIs:
   - Google Identity Platform API
   - Admin SDK API (for groups)

### 2. Create Service Account

1. Go to IAM & Admin → Service accounts
2. Create service account:
   - Name: `sonarqube-mcp`
   - Grant roles: Basic → Viewer
3. Create key (JSON format)

### 3. Configure Domain-Wide Delegation

1. In service account details → Show domain-wide delegation
2. Enable G Suite Domain-wide Delegation
3. Note the Client ID
4. In Google Admin Console:
   - Security → API Controls → Domain-wide delegation
   - Add new:
     - Client ID: Your service account client ID
     - Scopes: `https://www.googleapis.com/auth/admin.directory.group.readonly`

### 4. MCP Server Configuration

```bash
# Google OAuth configuration
MCP_HTTP_OAUTH_ISSUER=https://accounts.google.com
MCP_HTTP_OAUTH_AUDIENCE=YOUR_CLIENT_ID

# Use Google's public keys
# Google rotates keys, so JWKS support is recommended when available
```

### 5. Custom Token Generation

Since Google service accounts don't directly support client credentials flow, you'll need a token service:

```javascript
// Token generation service
const {JWT} = require('google-auth-library');

async function generateToken() {
  const client = new JWT({
    keyFile: 'service-account.json',
    scopes: ['https://www.googleapis.com/auth/admin.directory.group.readonly'],
    subject: 'admin@company.com' // Domain admin
  });
  
  const token = await client.getAccessToken();
  // Include groups in custom token
}
```

## Generic OIDC Provider

### Configuration Template

For any OpenID Connect compliant provider:

```bash
# Generic OIDC configuration
MCP_HTTP_OAUTH_ISSUER=https://idp.company.com
MCP_HTTP_OAUTH_AUDIENCE=sonarqube-mcp

# Option 1: Well-known configuration
# The server will fetch from: https://idp.company.com/.well-known/openid-configuration

# Option 2: Manual configuration
MCP_HTTP_OAUTH_PUBLIC_KEY_PATH=/config/idp-public.pem
# Or
MCP_HTTP_OAUTH_JWKS_URI=https://idp.company.com/.well-known/jwks.json
```

### Required Token Claims

Ensure your IdP includes these claims:

```json
{
  "iss": "https://idp.company.com",
  "sub": "user-identifier",
  "aud": ["sonarqube-mcp"],
  "exp": 1234567890,
  "iat": 1234567890,
  "groups": ["group1", "group2"],  // Or "roles"
  "email": "user@company.com"      // Optional but recommended
}
```

## Troubleshooting

### Common Issues

1. **Invalid Token Signature**
   - Verify public key is correctly formatted
   - Ensure you're using the right key from JWKS
   - Check key algorithm matches (RS256, etc.)

2. **Audience Mismatch**
   - Token's `aud` claim must match `MCP_HTTP_OAUTH_AUDIENCE`
   - Some IdPs use arrays for audience

3. **Expired Token**
   - Check token expiration time
   - Ensure system clocks are synchronized

4. **Missing Groups**
   - Verify groups/roles are included in token
   - Check custom claims configuration
   - Some IdPs need explicit scope requests

### Debug Mode

Enable detailed logging:

```bash
LOG_LEVEL=debug
DEBUG=mcp:auth:*
```

### Token Validation

Test token validation:

```bash
# Decode token (without verification)
echo $ACCESS_TOKEN | cut -d. -f2 | base64 -d | jq

# Test endpoint
curl -v -H "Authorization: Bearer $ACCESS_TOKEN" https://mcp.company.com/health
```

## Security Best Practices

1. **Key Rotation**
   - Regularly rotate IdP signing keys
   - Update MCP Server configuration
   - Support multiple keys during rotation

2. **Scope Limitation**
   - Request minimum required scopes
   - Use audience restrictions
   - Implement fine-grained permissions

3. **Token Lifetime**
   - Use short-lived access tokens
   - Implement token refresh if needed
   - Monitor token usage patterns

4. **Group Management**
   - Regularly audit group memberships
   - Use descriptive group names
   - Document group-to-permission mappings

5. **Monitoring**
   - Track authentication failures
   - Monitor token validation performance
   - Alert on unusual patterns

## Migration Guide

### Moving from Basic Auth to OAuth

1. **Phase 1: Parallel Operation**
   ```bash
   # Keep existing auth
   SONARQUBE_TOKEN=existing-token
   
   # Add OAuth
   MCP_HTTP_OAUTH_ISSUER=https://idp.company.com
   MCP_HTTP_OAUTH_AUDIENCE=sonarqube-mcp
   ```

2. **Phase 2: Test OAuth**
   - Configure subset of users
   - Monitor authentication logs
   - Verify permissions work correctly

3. **Phase 3: Full Migration**
   - Disable basic auth
   - Update all clients
   - Remove legacy configuration

## Support Matrix

| Identity Provider | Status | Notes |
|------------------|---------|--------|
| Azure AD | ✅ Fully Supported | Groups via object IDs |
| Okta | ✅ Fully Supported | Custom claims for groups |
| Auth0 | ✅ Fully Supported | Rules for custom claims |
| Keycloak | ✅ Fully Supported | Native group support |
| Google | ⚠️ Requires Adapter | Service account limitations |
| AWS Cognito | ✅ Fully Supported | Groups in token |
| PingFederate | ✅ Fully Supported | Standard OIDC |
| OneLogin | ✅ Fully Supported | Role-based claims |
| Custom OIDC | ✅ Fully Supported | Follow generic guide |

For IdP-specific support, contact: support@sonarqube-mcp.io