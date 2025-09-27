# Security Guide

## Overview

This guide covers security best practices for the SonarQube MCP Server, focusing on authentication, credential management, and secure deployment patterns.

## Authentication Methods

The server supports three authentication methods for connecting to SonarQube:

### 1. Token Authentication (Recommended)

The most secure method for API access.

```json
{
  "env": {
    "SONARQUBE_TOKEN": "squ_xxxxxxxxxxxxxxxx"
  }
}
```

**Benefits:**

- Tokens can be scoped with limited permissions
- Easy to revoke without changing passwords
- No password exposure in logs or configs
- Works with both SonarCloud and SonarQube

**SonarQube Version Differences:**

- **SonarQube 10.0+**: Uses Bearer token authentication
- **SonarQube < 10.0**: Automatically uses token as username in Basic auth

### 2. Basic Authentication

Traditional username/password authentication.

```json
{
  "env": {
    "SONARQUBE_USERNAME": "your-username",
    "SONARQUBE_PASSWORD": "your-password"
  }
}
```

**Considerations:**

- Suitable for self-hosted SonarQube instances
- May not work with SonarCloud if 2FA is enabled
- Passwords visible in environment variables

### 3. System Passcode

Special authentication for system administration.

```json
{
  "env": {
    "SONARQUBE_PASSCODE": "system-passcode"
  }
}
```

**Use Cases:**

- Automated deployment scenarios
- System-level operations
- Emergency access

## Credential Security Best Practices

### 1. Token Management

**Creating Secure Tokens:**

1. Log into SonarQube/SonarCloud
2. Navigate to **My Account** → **Security**
3. Generate tokens with minimal required permissions:
   - Read-only tokens for analysis
   - Write tokens only when needed
   - Project-specific tokens when possible

**Token Rotation:**

- Rotate tokens every 90 days
- Immediately revoke compromised tokens
- Use different tokens for different environments

### 2. Credential Storage

**Local Development (Claude Desktop):**

- Credentials stored in Claude Desktop's config file
- Ensure proper file permissions (600 on Unix)
- Consider using OS keychain integration

**Docker Deployment:**

```bash
# Use Docker secrets
docker secret create sonarqube-token token.txt
docker run --secret sonarqube-token ...

# Or use environment file with restricted permissions
chmod 600 .env
docker run --env-file .env ...
```

**MCP Gateway Deployment:**

- Use gateway's secret management
- Leverage vault integration if available
- Rotate credentials at gateway level

### 3. Environment Variable Security

**DO:**

- Use `.env` files with restricted permissions
- Load secrets from secure sources at runtime
- Use placeholder values in version control

**DON'T:**

- Commit credentials to version control
- Log environment variables
- Pass secrets via command line arguments

## Network Security

### 1. TLS/SSL Configuration

Always use HTTPS for SonarQube connections:

```json
{
  "env": {
    "SONARQUBE_URL": "https://sonarqube.example.com",
    "NODE_TLS_REJECT_UNAUTHORIZED": "1"
  }
}
```

### 2. Certificate Validation

For self-signed certificates:

```bash
# Add CA certificate to trusted store
export NODE_EXTRA_CA_CERTS=/path/to/ca-cert.pem
```

Never disable certificate validation in production:

```bash
# INSECURE - Development only
NODE_TLS_REJECT_UNAUTHORIZED=0
```

## Deployment Security

### 1. Container Security

**Image Security:**

- Use specific version tags, not `latest`
- Scan images for vulnerabilities
- Use minimal base images (Alpine)

**Runtime Security:**

```yaml
# docker-compose.yml
services:
  sonarqube-mcp:
    image: sapientpants/sonarqube-mcp-server:1.7.0
    user: '1001:1001' # Non-root user
    read_only: true # Read-only filesystem
    tmpfs:
      - /tmp
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
```

### 2. Resource Limits

Prevent resource exhaustion:

```yaml
resources:
  limits:
    memory: '256M'
    cpus: '0.5'
  requests:
    memory: '128M'
    cpus: '0.1'
```

### 3. Network Isolation

For stdio transport, no network exposure needed:

```yaml
networks:
  internal:
    driver: bridge
    internal: true # No external access
```

## Logging and Monitoring

### 1. Secure Logging

Configure logging to avoid credential exposure:

```json
{
  "env": {
    "LOG_LEVEL": "INFO",
    "LOG_FILE": "/logs/sonarqube-mcp.log"
  }
}
```

**Log Security:**

- Never log authentication tokens
- Redact sensitive data in logs
- Rotate logs regularly
- Restrict log file access

### 2. Monitoring Access

Track usage patterns:

- Monitor failed authentication attempts
- Track unusual API usage patterns
- Alert on circuit breaker activations

## Security Checklist

### Pre-Deployment

- [ ] Use token authentication instead of passwords
- [ ] Create tokens with minimal required permissions
- [ ] Store credentials securely
- [ ] Use HTTPS for all SonarQube connections
- [ ] Review and apply container security settings

### Deployment

- [ ] Use specific version tags for images
- [ ] Run containers as non-root user
- [ ] Apply resource limits
- [ ] Enable secure logging
- [ ] Restrict file permissions on configs

### Post-Deployment

- [ ] Regularly rotate tokens
- [ ] Monitor logs for security events
- [ ] Keep server and dependencies updated
- [ ] Review access patterns periodically
- [ ] Test disaster recovery procedures

## Incident Response

### Compromised Credentials

1. **Immediate Actions:**
   - Revoke compromised tokens in SonarQube
   - Generate new tokens
   - Update all deployments

2. **Investigation:**
   - Review access logs
   - Check for unauthorized changes
   - Identify exposure source

3. **Prevention:**
   - Implement stricter access controls
   - Increase rotation frequency
   - Add additional monitoring

### Security Updates

Stay informed about security updates:

- Watch the [GitHub repository](https://github.com/sapientpants/sonarqube-mcp-server)
- Subscribe to security advisories
- Test updates in non-production first

## Compliance Considerations

### Data Privacy

- The server doesn't store any SonarQube data
- All data remains in SonarQube
- Consider data residency requirements

### Audit Requirements

When deployed with MCP gateways:

- Leverage gateway audit capabilities
- Track all access at gateway level
- Maintain audit logs per compliance needs

## Support

For security concerns:

- Report vulnerabilities via GitHub Security Advisory
- Contact maintainers for sensitive issues
- Check documentation for updates
