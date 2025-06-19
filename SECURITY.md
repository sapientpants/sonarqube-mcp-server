# Security Policy

## Supported Versions

The latest minor release will receive support for security updates. Users of older versions are requested to upgrade to the latest minor version.

| Version | Supported          |
| ------- | ------------------ |
| 1.4.x   | :white_check_mark: |
| < 1.4.0 | :x:                |

## Authentication Security Best Practices

The SonarQube MCP Server uses environment variables for authentication, which is appropriate for its design as a single-user local tool. Follow these best practices to ensure secure usage:

### 1. Use Token Authentication

Token authentication is the most secure option and is strongly recommended:

- **Generate dedicated tokens** for the MCP server rather than reusing existing tokens
- **Use minimal permissions** - create tokens with only the necessary read permissions
- **Rotate tokens regularly** - establish a schedule for token rotation
- **Revoke unused tokens** - immediately revoke tokens that are no longer needed

### 2. Protect Configuration Files

Since credentials are stored in the MCP client's configuration file:

- **Check file permissions** - ensure configuration files are readable only by your user account
- **Use secure storage** - on macOS, Claude Desktop stores config in `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Don't commit configs** - never commit configuration files containing credentials to version control
- **Use password managers** - store tokens in a password manager and copy them when needed

### 3. Authentication Method Security

Listed from most to least secure:

1. **Token Authentication** (Recommended)
   - Tokens can be scoped with limited permissions
   - Can be revoked without changing passwords
   - Works with all SonarQube versions

2. **Basic Authentication**
   - Use only when token auth is not available
   - Requires transmitting username and password
   - May not work with SonarCloud if 2FA is enabled

3. **System Passcode**
   - Only for special administrative scenarios
   - Provides system-level access
   - Use with extreme caution

### 4. SonarQube-Specific Considerations

- **SonarQube 10.0+**: Uses Bearer token authentication (most secure)
- **SonarQube < 10.0**: Tokens sent as username in Basic auth
- **SonarCloud**: Always use token authentication, especially with 2FA enabled

### 5. Environment Variable Security

When setting environment variables:

- **Avoid command history** - Use configuration files instead of export commands
- **Clear sensitive variables** - Unset variables after use if set temporarily
- **Use dedicated shells** - Run the MCP server in a dedicated terminal session

### 6. Network Security

- **Use HTTPS** - Always connect to SonarQube instances over HTTPS
- **Verify certificates** - Ensure SSL certificates are valid
- **Use VPN** - When accessing internal SonarQube instances, use VPN

## Security Architecture

The SonarQube MCP Server operates with the following security model:

- **Single-user design**: Each instance runs with one user's credentials
- **Local execution**: Runs on the user's machine, not as a shared service
- **Direct authentication**: Uses SonarQube's native authentication mechanisms
- **No credential storage**: The server itself doesn't store credentials

## Future Security Considerations

While the current model is appropriate for local usage, future HTTP transport support would require:

- OAuth 2.1 resource server implementation
- Token validation and scoping per RFC8707
- Multi-client authorization mechanisms
- Backward compatibility with current auth methods

## Reporting a Vulnerability

To report a security issue, please email marc.tremblay@gmail.com with a description of the issue, the steps you took to create the issue, affected versions, and if known, mitigations for the issue. Our vulnerability management team will acknowledge receiving your email within 3 working days. This project follows a 90 day disclosure timeline.
