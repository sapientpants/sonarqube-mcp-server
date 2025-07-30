# Deployment Guide

## Overview

This guide provides instructions for deploying the SonarQube MCP Server using Docker and MCP gateways. The server uses stdio transport exclusively, making it ideal for deployment through MCP gateway solutions.

## Prerequisites

- Docker 20.10+ or compatible container runtime
- SonarQube 9.9 LTS or 10.x
- Valid SonarQube authentication credentials
- (Optional) MCP Gateway solution

## Docker Deployment

### Quick Start

```bash
# Pull the latest image
docker pull sapientpants/sonarqube-mcp-server:latest

# Run with basic configuration (stdio mode)
docker run -i --rm \
  -e SONARQUBE_URL=https://sonarqube.company.com \
  -e SONARQUBE_TOKEN=your-token \
  sapientpants/sonarqube-mcp-server:latest
```

### Production Docker Configuration

Create a `.env` file with your configuration:

```bash
# SonarQube Configuration
SONARQUBE_URL=https://sonarqube.company.com
SONARQUBE_TOKEN=squ_xxxxxxxxxxxxx
SONARQUBE_ORGANIZATION=your-org  # For SonarCloud

# Logging
LOG_FILE=/logs/sonarqube-mcp.log
LOG_LEVEL=INFO

# Optional: Elicitation
SONARQUBE_MCP_ELICITATION=true
SONARQUBE_MCP_BULK_THRESHOLD=10
```

### Docker Compose

```yaml
version: '3.8'

services:
  sonarqube-mcp:
    image: sapientpants/sonarqube-mcp-server:latest
    container_name: sonarqube-mcp
    env_file:
      - .env
    volumes:
      - ./logs:/logs
    stdin_open: true
    tty: true
    restart: unless-stopped
```

## MCP Gateway Deployment

The stdio-only design makes this server perfect for deployment through MCP gateways, which handle:
- Authentication and authorization
- Multi-tenant isolation
- Load balancing and scaling
- Monitoring and observability
- API exposure

### Docker MCP Gateway

Docker MCP Gateway can containerize and manage stdio MCP servers:

```yaml
# Example configuration for Docker MCP Gateway
services:
  - name: sonarqube
    image: sapientpants/sonarqube-mcp-server:latest
    environment:
      SONARQUBE_URL: ${SONARQUBE_URL}
      SONARQUBE_TOKEN: ${SONARQUBE_TOKEN}
```

### IBM Context Forge

IBM Context Forge provides enterprise-grade MCP server management:

1. Deploy the stdio server as a Context Forge service
2. Configure authentication at the gateway level
3. Enable multi-tenant access with proper isolation

### SGNL

SGNL offers policy-based access control for MCP servers:

1. Deploy the stdio server behind SGNL
2. Define access policies based on user attributes
3. Audit all access through SGNL's logging

### Operant

Operant provides a Kubernetes-native MCP gateway:

```yaml
apiVersion: mcp.operant.io/v1
kind: MCPServer
metadata:
  name: sonarqube
spec:
  image: sapientpants/sonarqube-mcp-server:latest
  transport: stdio
  env:
    - name: SONARQUBE_URL
      valueFrom:
        secretKeyRef:
          name: sonarqube-credentials
          key: url
    - name: SONARQUBE_TOKEN
      valueFrom:
        secretKeyRef:
          name: sonarqube-credentials
          key: token
```

## Best Practices

### 1. Resource Allocation

The stdio transport is lightweight, requiring minimal resources:

```yaml
resources:
  requests:
    memory: "128Mi"
    cpu: "100m"
  limits:
    memory: "256Mi"
    cpu: "500m"
```

### 2. Logging

Configure file-based logging for debugging:

```bash
LOG_FILE=/logs/sonarqube-mcp.log
LOG_LEVEL=INFO  # Use DEBUG for troubleshooting
```

### 3. Secret Management

Use proper secret management for credentials:

- Docker Secrets
- Kubernetes Secrets
- Vault or similar secret management systems
- Environment variable injection at runtime

### 4. Health Monitoring

While the stdio server doesn't expose HTTP health endpoints, monitor:
- Container health (process running)
- Log file activity
- SonarQube API connectivity

### 5. Updates

Use specific version tags in production:

```bash
# Good - specific version
docker pull sapientpants/sonarqube-mcp-server:1.7.0

# Avoid in production - latest tag
docker pull sapientpants/sonarqube-mcp-server:latest
```

## Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Verify SONARQUBE_TOKEN is valid
   - Check token permissions in SonarQube
   - Ensure proper environment variable injection

2. **Connection Issues**
   - Verify SONARQUBE_URL is accessible from container
   - Check for proxy/firewall restrictions
   - Validate SSL certificates if using HTTPS

3. **Performance Issues**
   - Enable circuit breaker logs to identify API issues
   - Check SonarQube server performance
   - Review log files for error patterns

### Debug Mode

Enable debug logging for troubleshooting:

```bash
docker run -i --rm \
  -e SONARQUBE_URL=https://sonarqube.company.com \
  -e SONARQUBE_TOKEN=your-token \
  -e LOG_LEVEL=DEBUG \
  -e LOG_FILE=/logs/debug.log \
  -v ./logs:/logs \
  sapientpants/sonarqube-mcp-server:latest
```

## Migration from HTTP Transport

If migrating from the previous HTTP transport version:

1. Remove all HTTP-related environment variables
2. Remove port mappings (no longer needed)
3. Update health checks to monitor container/process health
4. Deploy behind an MCP gateway for enterprise features
5. Move authentication/authorization to the gateway layer

## Support

For issues and questions:
- GitHub Issues: https://github.com/sapientpants/sonarqube-mcp-server/issues
- Documentation: https://github.com/sapientpants/sonarqube-mcp-server/docs