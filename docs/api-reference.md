# API Reference

## Overview

The SonarQube MCP Server exposes SonarQube functionality through the Model Context Protocol (MCP). This reference documents all available tools, their parameters, and response formats.


## MCP Tools

### Projects Domain

#### projects

List all SonarQube projects with metadata.

Parameters:
```typescript
{
  page?: string;        // Page number (default: "1")
  page_size?: string;   // Items per page (default: "100")
}
```

Response:
```json
{
  "projects": [
    {
      "key": "my-project",
      "name": "My Project",
      "qualifier": "TRK",
      "visibility": "private",
      "lastAnalysisDate": "2024-01-15T10:00:00Z"
    }
  ],
  "paging": {
    "pageIndex": 1,
    "pageSize": 100,
    "total": 150
  }
}
```

### Issues Domain

#### issues

Search and filter SonarQube issues by multiple criteria.

Parameters:
```typescript
{
  // Project filters
  project_key?: string;              // Single project key
  projects?: string | string[];      // Multiple project keys
  
  // Component filters
  components?: string | string[];    // File paths or directories
  directories?: string | string[];   // Directory paths
  files?: string | string[];         // Specific file paths
  
  // Issue filters
  severities?: string | string[];    // INFO, MINOR, MAJOR, CRITICAL, BLOCKER
  statuses?: string | string[];      // OPEN, CONFIRMED, REOPENED, RESOLVED, CLOSED
  resolutions?: string | string[];   // FALSE-POSITIVE, WONTFIX, FIXED, REMOVED
  types?: string | string[];         // CODE_SMELL, BUG, VULNERABILITY, SECURITY_HOTSPOT
  
  // Assignment filters
  assigned?: boolean | string;       // Filter by assignment status
  assignees?: string | string[];     // Filter by assignee usernames
  authors?: string | string[];       // Filter by issue authors
  
  // Time filters
  created_after?: string;            // ISO date string
  created_before?: string;           // ISO date string
  created_in_last?: string;          // e.g., "7d", "1m"
  in_new_code_period?: boolean;      // Issues in new code
  
  // Tag filters
  tags?: string | string[];          // Issue tags
  
  // Rule filters
  rules?: string | string[];         // Rule keys
  
  // Security filters
  cwe?: string | string[];           // CWE identifiers
  owasp_top10?: string | string[];   // OWASP Top 10 categories
  sans_top25?: string | string[];    // SANS Top 25 categories
  
  // Scope filters
  scopes?: string | string[];        // MAIN, TEST, OVERALL
  
  // Faceted search
  facets?: string | string[];        // Enable aggregations
  facet_mode?: "count" | "effort";   // Aggregation mode
  
  // Pagination
  page?: string;                     // Page number
  page_size?: string;                // Items per page
  
  // Sorting
  s?: string;                        // Sort field
  asc?: boolean | string;            // Sort direction
}
```

Response:
```json
{
  "issues": [
    {
      "key": "AXoMyRsdsef2-udVH3wZ",
      "rule": "java:S1192",
      "severity": "MAJOR",
      "component": "com.example:MyProject:src/main/java/Example.java",
      "project": "com.example:MyProject",
      "line": 42,
      "message": "Define a constant instead of duplicating this literal \"example\" 5 times.",
      "effort": "5min",
      "debt": "5min",
      "assignee": "john.doe",
      "author": "jane.smith",
      "tags": ["convention"],
      "creationDate": "2024-01-15T10:00:00+0000",
      "updateDate": "2024-01-15T10:00:00+0000",
      "type": "CODE_SMELL",
      "status": "OPEN"
    }
  ],
  "paging": {
    "pageIndex": 1,
    "pageSize": 100,
    "total": 523
  },
  "facets": [
    {
      "property": "severities",
      "values": [
        {"val": "MAJOR", "count": 234},
        {"val": "MINOR", "count": 189},
        {"val": "CRITICAL", "count": 89},
        {"val": "BLOCKER", "count": 11}
      ]
    }
  ]
}
```

#### markIssueFalsePositive

Mark a single issue as false positive.

Parameters:
```typescript
{
  issue_key: string;    // Issue key (required)
  comment?: string;     // Optional explanation
}
```

Response:
```json
{
  "issue": {
    "key": "AXoMyRsdsef2-udVH3wZ",
    "resolution": "FALSE-POSITIVE",
    "status": "RESOLVED",
    "updateDate": "2024-01-15T10:30:00+0000"
  }
}
```

#### markIssueWontFix

Mark a single issue as won't fix.

Parameters:
```typescript
{
  issue_key: string;    // Issue key (required)
  comment?: string;     // Optional explanation
}
```

#### markIssuesFalsePositive

Bulk mark multiple issues as false positive.

Parameters:
```typescript
{
  issue_keys: string[];  // Array of issue keys (required)
  comment?: string;      // Optional explanation
}
```

Response:
```json
{
  "issues": [
    {
      "key": "issue1",
      "resolution": "FALSE-POSITIVE",
      "status": "RESOLVED"
    },
    {
      "key": "issue2",
      "resolution": "FALSE-POSITIVE",
      "status": "RESOLVED"
    }
  ],
  "failures": []
}
```

#### addCommentToIssue

Add a comment to an issue.

Parameters:
```typescript
{
  issue_key: string;    // Issue key (required)
  text: string;         // Comment text (required, supports markdown)
}
```

#### assignIssue

Assign or unassign an issue.

Parameters:
```typescript
{
  issueKey: string;     // Issue key (required)
  assignee?: string;    // Username (empty to unassign)
}
```

#### confirmIssue / unconfirmIssue / resolveIssue / reopenIssue

Change issue status.

Parameters:
```typescript
{
  issue_key: string;    // Issue key (required)
  comment?: string;     // Optional comment
}
```

### Metrics Domain

#### metrics

Get available metrics from SonarQube.

Parameters:
```typescript
{
  page?: string;        // Page number
  page_size?: string;   // Items per page
}
```

Response:
```json
{
  "metrics": [
    {
      "key": "coverage",
      "type": "PERCENT",
      "name": "Coverage",
      "description": "Coverage by tests",
      "domain": "Coverage",
      "qualitative": true,
      "direction": 1,
      "hidden": false
    }
  ]
}
```

### Measures Domain

#### measures_component

Get measures for a specific component.

Parameters:
```typescript
{
  component: string;              // Component key (required)
  metric_keys: string[];          // Metric keys (required)
  branch?: string;                // Branch name
  pull_request?: string | number; // PR identifier
  additional_fields?: string[];   // Extra fields
}
```

Response:
```json
{
  "component": {
    "key": "my-project",
    "name": "My Project",
    "measures": [
      {
        "metric": "coverage",
        "value": "85.3",
        "bestValue": false
      },
      {
        "metric": "bugs",
        "value": "12"
      }
    ]
  }
}
```

#### measures_history

Get measure history for a component.

Parameters:
```typescript
{
  component: string;      // Component key (required)
  metrics: string[];      // Metric keys (required)
  from?: string;          // Start date (ISO format)
  to?: string;            // End date (ISO format)
  page?: string;          // Page number
  page_size?: string;     // Items per page
}
```

Response:
```json
{
  "measures": [
    {
      "metric": "coverage",
      "history": [
        {"date": "2024-01-01T00:00:00+0000", "value": "82.1"},
        {"date": "2024-01-08T00:00:00+0000", "value": "83.5"},
        {"date": "2024-01-15T00:00:00+0000", "value": "85.3"}
      ]
    }
  ]
}
```

### Quality Gates Domain

#### quality_gates

List available quality gates.

Parameters: None

Response:
```json
{
  "qualitygates": [
    {
      "id": 1,
      "name": "Sonar way",
      "isDefault": true,
      "isBuiltIn": true
    }
  ]
}
```

#### quality_gate_status

Get project quality gate status.

Parameters:
```typescript
{
  project_key: string;            // Project key (required)
  branch?: string;                // Branch name
  pull_request?: string | number; // PR identifier
}
```

Response:
```json
{
  "projectStatus": {
    "status": "ERROR",
    "conditions": [
      {
        "status": "ERROR",
        "metricKey": "new_coverage",
        "comparator": "LT",
        "periodIndex": 1,
        "errorThreshold": "80",
        "actualValue": "75.5"
      }
    ]
  }
}
```

### Hotspots Domain

#### hotspots

Search for security hotspots.

Parameters:
```typescript
{
  project_key?: string;           // Project key
  branch?: string;                // Branch name
  pull_request?: string | number; // PR identifier
  status?: "TO_REVIEW" | "REVIEWED";
  resolution?: "FIXED" | "SAFE";
  assigned_to_me?: boolean;
  in_new_code_period?: boolean;
  files?: string[];
  page?: string;
  page_size?: string;
}
```

Response:
```json
{
  "hotspots": [
    {
      "key": "AXoMyRsdsef2-udVH3wZ",
      "component": "com.example:MyProject:src/main/java/Security.java",
      "project": "com.example:MyProject",
      "securityCategory": "sql-injection",
      "vulnerabilityProbability": "HIGH",
      "status": "TO_REVIEW",
      "line": 89,
      "message": "Make sure using this database query is safe here.",
      "author": "security-scan",
      "creationDate": "2024-01-15T10:00:00+0000"
    }
  ]
}
```

#### update_hotspot_status

Update security hotspot status.

Parameters:
```typescript
{
  hotspot_key: string;            // Hotspot key (required)
  status: "TO_REVIEW" | "REVIEWED"; // New status (required)
  resolution?: "FIXED" | "SAFE";   // Resolution if REVIEWED
  comment?: string;                // Optional comment
}
```

### Source Code Domain

#### source_code

View source code with issue highlighting.

Parameters:
```typescript
{
  key: string;                    // File key (required)
  from?: string;                  // Start line
  to?: string;                    // End line
  branch?: string;                // Branch name
  pull_request?: string | number; // PR identifier
}
```

Response:
```json
{
  "sources": [
    {
      "line": 1,
      "code": "package com.example;",
      "scmRevision": "a3c5f8d",
      "scmAuthor": "john.doe@example.com",
      "scmDate": "2024-01-10T15:30:00+0000"
    }
  ]
}
```

#### scm_blame

Get SCM blame information.

Parameters:
```typescript
{
  key: string;                    // File key (required)
  from?: string;                  // Start line
  to?: string;                    // End line
  branch?: string;                // Branch name
  pull_request?: string | number; // PR identifier
}
```

### Components Domain

#### components

Search and navigate components (files, directories, modules).

Parameters:
```typescript
{
  component?: string;      // Parent component for tree navigation
  query?: string;          // Text search query
  qualifiers?: string[];   // Component types: TRK, DIR, FIL, UTS
  language?: string;       // Programming language filter
  strategy?: "all" | "children" | "leaves";
  p?: string;              // Page number
  ps?: string;             // Page size
}
```

Response:
```json
{
  "components": [
    {
      "key": "com.example:MyProject:src/main/java/Example.java",
      "name": "Example.java",
      "qualifier": "FIL",
      "path": "src/main/java/Example.java",
      "language": "java"
    }
  ],
  "paging": {
    "pageIndex": 1,
    "pageSize": 100,
    "total": 250
  }
}
```

### System Domain

#### system_health

Get system health status (requires admin permissions).

Parameters: None

Response:
```json
{
  "health": "GREEN",
  "causes": []
}
```

#### system_status

Get system status.

Parameters: None

Response:
```json
{
  "id": "AVdOWe3L9PvOr2PH",
  "version": "10.3",
  "status": "UP"
}
```

#### system_ping

Ping the SonarQube instance.

Parameters: None

Response:
```json
{
  "status": "pong"
}
```

## Authentication

### OAuth 2.0 Bearer Token

Include the JWT token in the Authorization header:

```bash
curl -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..." \
  https://mcp.company.com/
```

### Token Requirements

The JWT token must include:

```json
{
  "iss": "https://auth.company.com",
  "aud": ["sonarqube-mcp"],
  "sub": "user123",
  "exp": 1234567890,
  "groups": ["developers", "team-alpha"]
}
```

## Error Responses

### Standard Error Format

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32603,
    "message": "Authentication failed",
    "data": {
      "type": "AUTH_ERROR",
      "details": "Token expired"
    }
  }
}
```

### HTTP Status Codes

| Status | Description |
|--------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limited |
| 500 | Internal Server Error |
| 503 | Service Unavailable - Circuit breaker open |

## Rate Limiting

Default limits:
- 100 requests per minute per user
- 1000 requests per hour per user

Headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1234567890
```

## Webhooks and Events

The MCP Server supports real-time notifications through webhooks (coming soon):

```json
{
  "event": "issue.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "issue": {
      "key": "AXoMyRsdsef2-udVH3wZ",
      "severity": "CRITICAL",
      "type": "BUG"
    }
  }
}
```

## SDK Usage

### TypeScript/JavaScript

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: 'sonarqube-mcp',
  env: {
    SONARQUBE_BASE_URL: 'https://sonarqube.company.com',
    SONARQUBE_TOKEN: 'your-token'
  }
});

const client = new Client({
  name: 'my-app',
  version: '1.0.0'
}, {
  capabilities: {}
});

await client.connect(transport);

// List available tools
const tools = await client.listTools();

// Call a tool
const result = await client.callTool({
  name: 'issues',
  arguments: {
    project_key: 'my-project',
    severities: ['CRITICAL', 'BLOCKER'],
    statuses: ['OPEN']
  }
});
```

### Python

```python
from mcp import Client, StdioTransport

transport = StdioTransport(
    command=['sonarqube-mcp'],
    env={
        'SONARQUBE_BASE_URL': 'https://sonarqube.company.com',
        'SONARQUBE_TOKEN': 'your-token'
    }
)

async with Client('my-app', '1.0.0') as client:
    await client.connect(transport)
    
    # List tools
    tools = await client.list_tools()
    
    # Call tool
    result = await client.call_tool(
        'issues',
        project_key='my-project',
        severities=['CRITICAL', 'BLOCKER']
    )
```

## Versioning

The API follows semantic versioning:

- **Major**: Breaking changes to tool signatures
- **Minor**: New tools or optional parameters
- **Patch**: Bug fixes and performance improvements

Current version: 1.9.0

## Deprecation Policy

- Deprecated features are marked in documentation
- Minimum 6 months notice before removal
- Migration guides provided

## Support

- GitHub Issues: https://github.com/sapientpants/sonarqube-mcp-server/issues
- API Status: https://status.sonarqube-mcp.io
- Email: api-support@sonarqube-mcp.io