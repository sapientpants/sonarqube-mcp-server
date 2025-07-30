# Troubleshooting Guide

## Overview

This guide helps diagnose and resolve common issues with the SonarQube MCP Server. It covers authentication problems, connection issues, performance concerns, and provides debugging techniques.

## Quick Diagnostics

### Enable Debug Logging

```bash
# Set environment variables
export LOG_LEVEL=DEBUG
export LOG_FILE=/tmp/sonarqube-mcp-debug.log

# Or in your configuration
{
  "env": {
    "LOG_LEVEL": "DEBUG",
    "LOG_FILE": "/tmp/sonarqube-mcp-debug.log"
  }
}
```

### Check Server Logs

```bash
# View recent logs
tail -f /tmp/sonarqube-mcp-debug.log

# Search for errors
grep ERROR /tmp/sonarqube-mcp-debug.log

# Check authentication issues
grep "auth" /tmp/sonarqube-mcp-debug.log
```

## Common Issues

### 1. Authentication Failures

#### "Authentication failed"

**Causes & Solutions:**

1. **Invalid Token**
   - Verify token in SonarQube: **My Account** → **Security**
   - Generate a new token if expired
   - Ensure token has proper permissions

2. **Wrong Authentication Method**
   ```json
   // Token authentication (recommended)
   {
     "env": {
       "SONARQUBE_TOKEN": "squ_xxxxxxxx"
     }
   }
   
   // Basic authentication
   {
     "env": {
       "SONARQUBE_USERNAME": "user",
       "SONARQUBE_PASSWORD": "pass"
     }
   }
   ```

3. **SonarQube Version Compatibility**
   - SonarQube 10.0+: Uses Bearer token authentication
   - SonarQube < 10.0: Token used as username in Basic auth
   - Server automatically handles this

#### "No SonarQube authentication configured"

**Solution:** Set one of these authentication methods:
- `SONARQUBE_TOKEN` (recommended)
- `SONARQUBE_USERNAME` and `SONARQUBE_PASSWORD`
- `SONARQUBE_PASSCODE`

### 2. Connection Issues

#### "Connection refused" or "ECONNREFUSED"

**Diagnostics:**
```bash
# Test SonarQube connectivity
curl -I https://your-sonarqube.com/api/system/status

# Check with authentication
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-sonarqube.com/api/system/status
```

**Solutions:**
1. Verify `SONARQUBE_URL` is correct
2. Check network connectivity
3. Verify firewall rules
4. For self-hosted: ensure SonarQube is running

#### "SSL/TLS Certificate Error"

**For self-signed certificates:**
```bash
# Option 1: Add CA certificate
export NODE_EXTRA_CA_CERTS=/path/to/ca-cert.pem

# Option 2: DEVELOPMENT ONLY - disable verification
export NODE_TLS_REJECT_UNAUTHORIZED=0
```

### 3. SonarCloud Issues

#### "Organization required"

**Solution:** Add organization for SonarCloud:
```json
{
  "env": {
    "SONARQUBE_URL": "https://sonarcloud.io",
    "SONARQUBE_TOKEN": "your-token",
    "SONARQUBE_ORGANIZATION": "your-org-key"
  }
}
```

### 4. Permission Issues

#### "Access denied" or "Insufficient permissions"

**Solutions:**
1. Check token permissions in SonarQube
2. Ensure user has "Browse" permission on projects
3. For admin tools: verify admin permissions
4. Create project-specific tokens if needed

### 5. Performance Issues

#### Slow Response Times

**Diagnostics:**
```bash
# Check circuit breaker status in logs
grep "circuit breaker" /tmp/sonarqube-mcp-debug.log

# Monitor API response times
grep "API call took" /tmp/sonarqube-mcp-debug.log
```

**Solutions:**
1. Check SonarQube server performance
2. Review network latency
3. Circuit breaker may be activated - check logs
4. Consider reducing request complexity

### 6. Docker Issues

#### Container Exits Immediately

**Diagnostics:**
```bash
# Check container logs
docker logs sonarqube-mcp

# Run interactively for debugging
docker run -it --rm \
  -e SONARQUBE_URL=https://sonarqube.com \
  -e SONARQUBE_TOKEN=token \
  -e LOG_LEVEL=DEBUG \
  sapientpants/sonarqube-mcp-server:latest
```

#### "No such file or directory"

**Solution:** Ensure volume mounts exist:
```bash
# Create log directory
mkdir -p ./logs

# Run with proper volume
docker run -v ./logs:/logs ...
```

### 7. Claude Desktop Issues

#### Server Not Appearing in Claude

**Solutions:**
1. Restart Claude Desktop after config changes
2. Check configuration syntax:
   ```json
   {
     "mcpServers": {
       "sonarqube": {
         "command": "npx",
         "args": ["-y", "sonarqube-mcp-server@latest"],
         "env": {
           "SONARQUBE_URL": "https://sonarqube.com",
           "SONARQUBE_TOKEN": "your-token"
         }
       }
     }
   }
   ```

#### "Command not found"

**Solutions:**
1. Ensure Node.js is installed
2. Use Docker instead of npx
3. Check PATH environment variable

## Debugging Techniques

### 1. Verbose Logging

```json
{
  "env": {
    "LOG_LEVEL": "DEBUG",
    "LOG_FILE": "/tmp/sonarqube-mcp.log"
  }
}
```

### 2. Test Specific Tools

In Claude Desktop:
```
Use the system_ping tool to check SonarQube connectivity
```

### 3. Isolate Issues

Test components individually:
```bash
# Test SonarQube API directly
curl -H "Authorization: Bearer $SONARQUBE_TOKEN" \
  $SONARQUBE_URL/api/system/status

# Test MCP server standalone
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | \
  npx sonarqube-mcp-server
```

### 4. Environment Verification

```bash
# Check all environment variables
env | grep SONARQUBE

# Verify no conflicting variables
env | grep -E "(PROXY|SSL|TLS|NODE)"
```

## Error Messages Reference

| Error | Cause | Solution |
|-------|-------|----------|
| "Authentication failed" | Invalid credentials | Check token/password |
| "Resource not found" | Invalid project/component | Verify resource exists |
| "Network error" | Connection issue | Check URL and network |
| "Rate limit exceeded" | Too many requests | Wait and retry |
| "Circuit breaker open" | Multiple failures | Check SonarQube health |
| "Invalid URL" | Malformed URL | Remove trailing slash |
| "Organization required" | SonarCloud without org | Add SONARQUBE_ORGANIZATION |

## Getting Help

### Collect Debug Information

When reporting issues, include:
1. Server version
2. Error messages from logs
3. Environment configuration (without secrets)
4. Steps to reproduce

### Support Channels

- GitHub Issues: https://github.com/sapientpants/sonarqube-mcp-server/issues
- Documentation: https://github.com/sapientpants/sonarqube-mcp-server/docs

### Debug Checklist

- [ ] Enable debug logging
- [ ] Check authentication configuration
- [ ] Verify network connectivity
- [ ] Test SonarQube API directly
- [ ] Review recent changes
- [ ] Check for version compatibility
- [ ] Isolate the failing component