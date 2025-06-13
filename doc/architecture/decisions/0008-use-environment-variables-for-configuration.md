# 8. Use environment variables for configuration

Date: 2025-06-13

## Status

Accepted

## Context

The SonarQube MCP server needs to be configured with various settings including:
- SonarQube server URL
- Authentication credentials (token or username/password)
- Organization key (for SonarCloud)
- Log file path
- Other operational settings

These configuration values need to be:
- Easily changeable without modifying code
- Secure (especially credentials)
- Container-friendly for modern deployment scenarios
- Simple to manage across different environments (development, staging, production)

## Decision

We will use environment variables exclusively for all configuration settings. Key settings will include:
- `SONARQUBE_URL`: The base URL of the SonarQube server
- `SONARQUBE_TOKEN`: Authentication token (preferred over username/password)
- `SONARQUBE_USERNAME` and `SONARQUBE_PASSWORD`: Alternative authentication method
- `SONARQUBE_ORGANIZATION`: Organization key for SonarCloud
- `MCP_LOG_FILE`: Path for log file output

No configuration values will be hard-coded in the source code. Default values may be provided where appropriate, but all settings must be overridable via environment variables.

## Consequences

### Positive
- **Security**: Credentials are kept out of the codebase and can be managed through secure environment variable management systems
- **Container-friendly**: Environment variables are the standard way to configure containerized applications
- **Simplicity**: No need for configuration file parsing or management
- **Flexibility**: Easy to change settings without rebuilding or modifying the application
- **12-Factor App compliance**: Follows the third factor of the twelve-factor app methodology
- **Platform agnostic**: Works consistently across different operating systems and deployment platforms

### Negative
- **Limited structure**: Environment variables are flat key-value pairs, making complex nested configuration more challenging
- **Type safety**: All environment variables are strings, requiring parsing and validation
- **Discovery**: Users need documentation to know which environment variables are available
- **No comments**: Unlike configuration files, environment variables cannot include inline documentation

### Mitigation
- Provide comprehensive documentation of all environment variables
- Implement robust validation and helpful error messages for missing or invalid configuration
- Consider supporting a `.env` file for local development convenience
- Log configuration values (excluding secrets) at startup for debugging
