# 7. Support Multiple Authentication Methods for SonarQube

Date: 2025-06-13

## Status

Accepted

## Context

SonarQube offers different deployment models (SonarQube Server and SonarCloud) that use different authentication mechanisms:

- SonarQube Server typically uses user tokens or username/password authentication
- SonarCloud uses bearer tokens
- Some installations may use system-level passcodes for authentication

To provide a flexible MCP server that works across all SonarQube deployment scenarios, we need to support multiple authentication methods.

## Decision

We will support three authentication methods for SonarQube API access:

1. **Bearer Token Authentication** (preferred)
   - Uses the `SONARQUBE_TOKEN` environment variable
   - Sent as `Authorization: Bearer <token>` header
   - Primary method for SonarCloud and modern SonarQube Server installations

2. **HTTP Basic Authentication**
   - Uses `SONARQUBE_USERNAME` and `SONARQUBE_PASSWORD` environment variables
   - Sent as `Authorization: Basic <base64(username:password)>` header
   - Fallback for older SonarQube Server installations

3. **System Passcode Authentication**
   - Uses the `SONARQUBE_PASSCODE` environment variable
   - Sent as `X-Sonar-Passcode` header
   - For system-level operations on certain SonarQube Server configurations

The authentication method is automatically selected based on which environment variables are present, with bearer token authentication taking precedence.

## Consequences

### Positive

- **Broad compatibility**: The MCP server works with all SonarQube deployment models
- **User flexibility**: Administrators can choose the authentication method that best fits their security policies
- **Future-proof**: Supporting token-based authentication aligns with modern security practices
- **Backward compatibility**: HTTP Basic auth ensures older installations remain supported

### Negative

- **Configuration complexity**: Users need to understand which authentication method to use for their setup
- **Security considerations**: Supporting multiple auth methods increases the attack surface
- **Maintenance burden**: Each authentication method needs to be tested and maintained

### Mitigation

- Clear documentation explaining which authentication method to use for different SonarQube deployments
- Security warnings in documentation about the relative security of each method
- Automated tests covering all authentication scenarios
