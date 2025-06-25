# Service Account Management

This document describes the service account management system in the SonarQube MCP Server, which provides advanced features for managing and mapping authenticated users to appropriate SonarQube service accounts.

## Overview

The service account management system provides:

- **Multiple Service Account Support**: Configure and manage multiple service accounts for different teams/environments
- **Group-Based Mapping**: Map user groups to specific service accounts automatically
- **Health Monitoring**: Automatic health checks and failover for failed accounts
- **Secure Credential Storage**: Encrypted storage of service account tokens
- **Audit Logging**: Comprehensive tracking of service account usage
- **Automatic Failover**: Seamless failover to backup accounts when primary accounts fail

## Configuration

### Service Accounts

Service accounts can be configured via environment variables or programmatically.

#### Environment Variables

```bash
# Default service account
SONARQUBE_TOKEN=svc_mcp_prod_token
SONARQUBE_NAME="Production Service Account"
SONARQUBE_URL=https://sonarqube.company.com
SONARQUBE_ORGANIZATION=company
SONARQUBE_ENVIRONMENT=production
SONARQUBE_FALLBACK=sa1
SONARQUBE_SCOPES=sonarqube:read,sonarqube:write

# Additional service accounts (SA1-SA10)
SONARQUBE_SA1_TOKEN=svc_mcp_dev_token
SONARQUBE_SA1_NAME="Development Service Account"
SONARQUBE_SA1_URL=https://sonarqube-dev.company.com
SONARQUBE_SA1_ENVIRONMENT=development
SONARQUBE_SA1_FALLBACK=sa2
```

#### Programmatic Configuration

```typescript
const mapper = new ServiceAccountMapper({
  serviceAccounts: [
    {
      id: 'prod',
      name: 'Production Account',
      token: 'prod-token',
      url: 'https://sonarqube.company.com',
      environment: 'production',
      fallbackAccountId: 'prod-backup'
    },
    {
      id: 'dev',
      name: 'Development Account',
      token: 'dev-token',
      url: 'https://sonarqube-dev.company.com',
      environment: 'development'
    }
  ]
});
```

### Mapping Rules

Define rules to map users to service accounts based on patterns, groups, and scopes.

#### Environment Variables

```bash
# Format: priority:n,user:pattern,issuer:pattern,groups:group1|group2,scopes:scope1|scope2,sa:accountId
MCP_MAPPING_RULE_1=priority:1,user:*@dev.company.com,sa:dev
MCP_MAPPING_RULE_2=priority:2,groups:developers|qa,sa:dev
MCP_MAPPING_RULE_3=priority:3,issuer:https://auth.company.com,groups:production,sa:prod
```

#### Programmatic Configuration

```typescript
const mapper = new ServiceAccountMapper({
  mappingRules: [
    {
      priority: 1,
      userPattern: new PatternMatcher('*@dev.company.com'),
      serviceAccountId: 'dev'
    },
    {
      priority: 2,
      requiredGroups: ['developers', 'qa'],
      serviceAccountId: 'dev'
    },
    {
      priority: 3,
      issuerPattern: new PatternMatcher('https://auth.company.com'),
      requiredGroups: ['production'],
      serviceAccountId: 'prod'
    }
  ]
});
```

## Features

### Health Monitoring

The health monitoring system periodically checks service account validity and tracks their health status.

```typescript
const mapper = new ServiceAccountMapper({
  enableHealthMonitoring: true,
  healthMonitor: new ServiceAccountHealthMonitor({
    checkInterval: 5 * 60 * 1000, // 5 minutes
    maxFailures: 3,
    checkTimeout: 10 * 1000 // 10 seconds
  })
});
```

Health information is exposed via the `/ready` endpoint:

```json
{
  "status": "ready",
  "serviceAccountHealth": {
    "totalAccounts": 3,
    "healthyAccounts": 2,
    "accounts": [
      {
        "id": "prod",
        "healthy": true,
        "lastCheck": "2024-01-20T10:30:00Z"
      },
      {
        "id": "dev",
        "healthy": false,
        "lastCheck": "2024-01-20T10:30:00Z",
        "error": "Connection timeout"
      }
    ]
  }
}
```

### Automatic Failover

When a service account fails, the system automatically fails over to a backup account if configured:

```typescript
const accounts = [
  {
    id: 'primary',
    name: 'Primary Account',
    token: 'primary-token',
    fallbackAccountId: 'backup'
  },
  {
    id: 'backup',
    name: 'Backup Account',
    token: 'backup-token'
  }
];
```

### Secure Credential Storage

Service account tokens can be stored securely using encryption:

```typescript
const credentialStore = new CredentialStore({
  masterPassword: process.env.MCP_CREDENTIAL_MASTER_PASSWORD,
  storagePath: '/secure/path/credentials.json',
  useEncryption: true
});

const mapper = new ServiceAccountMapper({
  credentialStore
});
```

Environment variables for credential storage:
```bash
MCP_CREDENTIAL_MASTER_PASSWORD=strong-password
MCP_CREDENTIAL_STORE_PATH=/secure/path/credentials.json
```

### Audit Logging

All service account access is logged for security and compliance:

```typescript
const auditor = mapper.getAuditor();

// Get audit events for a specific account
const events = auditor.getAccountEvents('prod');

// Get statistics
const stats = auditor.getAccountStatistics('prod');
console.log(`Success rate: ${(1 - stats.failureRate) * 100}%`);

// Detect anomalies
const anomalies = auditor.detectAnomalies();
```

## Security Best Practices

1. **Use Strong Tokens**: Generate strong, unique tokens for each service account
2. **Rotate Tokens Regularly**: Implement a token rotation schedule
3. **Limit Scopes**: Grant only necessary permissions to each service account
4. **Monitor Health**: Enable health monitoring to detect issues early
5. **Enable Audit Logging**: Track all service account usage
6. **Use Encryption**: Enable credential encryption in production
7. **Implement Failover**: Configure backup accounts for critical services

## Example: Complete Configuration

```bash
# Master password for credential encryption
export MCP_CREDENTIAL_MASTER_PASSWORD="$(openssl rand -base64 32)"

# Production service account
export SONARQUBE_TOKEN="svc_mcp_prod_$(uuidgen)"
export SONARQUBE_NAME="Production Service Account"
export SONARQUBE_URL="https://sonarqube.company.com"
export SONARQUBE_ORGANIZATION="company"
export SONARQUBE_ENVIRONMENT="production"
export SONARQUBE_FALLBACK="sa1"

# Backup production account
export SONARQUBE_SA1_TOKEN="svc_mcp_prod_backup_$(uuidgen)"
export SONARQUBE_SA1_NAME="Production Backup"
export SONARQUBE_SA1_URL="https://sonarqube.company.com"
export SONARQUBE_SA1_ENVIRONMENT="production-backup"

# Development service account
export SONARQUBE_SA2_TOKEN="svc_mcp_dev_$(uuidgen)"
export SONARQUBE_SA2_NAME="Development Service Account"
export SONARQUBE_SA2_URL="https://sonarqube-dev.company.com"
export SONARQUBE_SA2_ENVIRONMENT="development"

# Mapping rules
export MCP_MAPPING_RULE_1="priority:1,groups:production|prod-support,sa:default"
export MCP_MAPPING_RULE_2="priority:2,groups:developers|qa,sa:sa2"
export MCP_MAPPING_RULE_3="priority:3,user:*@company.com,sa:default"

# Default service account (fallback)
export MCP_DEFAULT_SERVICE_ACCOUNT="default"
```

## Monitoring and Troubleshooting

### Check Service Account Health

```bash
curl https://mcp.company.com/ready | jq .serviceAccountHealth
```

### View Audit Logs

Audit logs are written to the configured log file with the component name `ServiceAccountAuditor`.

### Common Issues

1. **Service Account Unhealthy**
   - Check token validity
   - Verify SonarQube server accessibility
   - Review recent audit logs for errors

2. **Mapping Not Working**
   - Verify mapping rules priority
   - Check user groups in token claims
   - Enable debug logging

3. **Failover Not Occurring**
   - Ensure `enableFailover` is true
   - Verify fallback account is configured
   - Check fallback account health

## API Reference

See the source code documentation for detailed API reference:
- [ServiceAccountMapper](../src/auth/service-account-mapper.ts)
- [ServiceAccountHealthMonitor](../src/auth/service-account-health.ts)
- [ServiceAccountAuditor](../src/auth/service-account-auditor.ts)
- [CredentialStore](../src/auth/credential-store.ts)