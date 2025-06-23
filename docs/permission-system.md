# Permission Filtering System

The SonarQube MCP server includes a comprehensive permission filtering system that ensures users only see data they're authorized to access based on their groups and roles from the OAuth token.

## Overview

The permission system provides:

- **Group-based access control**: Map OAuth token groups/roles to permissions
- **Project filtering**: Control access to projects using regex patterns
- **Tool authorization**: Allow/deny access to specific MCP tools
- **Issue filtering**: Filter issues by severity and status
- **Sensitive data redaction**: Hide author/assignee information when needed
- **Write operation control**: Separate read and write permissions
- **Performance optimization**: Built-in caching for permission checks

## Configuration

### Environment Variable

Set the path to your permission configuration file:

```bash
export MCP_PERMISSION_CONFIG_PATH=/path/to/permissions.json
```

### Configuration File Format

The permission configuration is a JSON file with the following structure:

```json
{
  "rules": [
    {
      "groups": ["admin", "sonarqube-admin"],
      "allowedProjects": [".*"],
      "allowedTools": [
        "projects", "metrics", "issues", "markIssueFalsePositive",
        "markIssueWontFix", "markIssuesFalsePositive", "markIssuesWontFix",
        "addCommentToIssue", "assignIssue", "confirmIssue", "unconfirmIssue",
        "resolveIssue", "reopenIssue", "system_health", "system_status",
        "system_ping", "measures_component", "measures_components",
        "measures_history", "quality_gates", "quality_gate",
        "quality_gate_status", "source_code", "scm_blame",
        "hotspots", "hotspot", "update_hotspot_status", "components"
      ],
      "readonly": false,
      "priority": 100
    },
    {
      "groups": ["developer", "dev"],
      "allowedProjects": ["^(dev-|feature-|test-).*"],
      "allowedTools": [
        "projects", "metrics", "issues", "markIssueFalsePositive",
        "markIssueWontFix", "addCommentToIssue", "assignIssue",
        "confirmIssue", "unconfirmIssue", "measures_component",
        "measures_components", "measures_history", "quality_gate_status",
        "source_code", "scm_blame", "components"
      ],
      "deniedTools": ["system_health", "system_status"],
      "readonly": false,
      "maxSeverity": "CRITICAL",
      "priority": 50
    },
    {
      "groups": ["qa", "quality-assurance"],
      "allowedProjects": [".*"],
      "allowedTools": [
        "projects", "metrics", "issues", "measures_component",
        "measures_components", "measures_history", "quality_gates",
        "quality_gate", "quality_gate_status", "source_code",
        "hotspots", "hotspot", "components"
      ],
      "readonly": true,
      "priority": 40
    },
    {
      "groups": ["guest", "viewer"],
      "allowedProjects": ["^public-.*"],
      "allowedTools": [
        "projects", "metrics", "issues", "quality_gate_status"
      ],
      "readonly": true,
      "maxSeverity": "MAJOR",
      "hideSensitiveData": true,
      "priority": 10
    }
  ],
  "defaultRule": {
    "allowedProjects": [],
    "allowedTools": [],
    "readonly": true
  },
  "enableCaching": true,
  "cacheTtl": 300,
  "enableAudit": false
}
```

## Permission Rule Properties

### Required Properties

- **`allowedProjects`** (string[]): Array of regex patterns for allowed projects
  - Use `[".*"]` to allow all projects
  - Use `["^prefix-.*"]` to allow projects starting with "prefix-"
  - Empty array `[]` means no projects allowed

- **`allowedTools`** (string[]): Array of allowed MCP tool names
  - See "Available Tools" section for complete list
  - Empty array means no tools allowed

- **`readonly`** (boolean): Whether the user has read-only access
  - `true`: Can only use read tools
  - `false`: Can use both read and write tools

### Optional Properties

- **`groups`** (string[]): Groups this rule applies to
  - If omitted, rule applies to all groups
  - Matches against groups/roles from OAuth token

- **`deniedTools`** (string[]): Tools explicitly denied
  - Takes precedence over `allowedTools`
  - Useful for exceptions

- **`maxSeverity`** (string): Maximum issue severity visible
  - Options: `INFO`, `MINOR`, `MAJOR`, `CRITICAL`, `BLOCKER`
  - Users won't see issues above this severity

- **`allowedStatuses`** (string[]): Allowed issue statuses
  - Options: `OPEN`, `CONFIRMED`, `REOPENED`, `RESOLVED`, `CLOSED`
  - If specified, only these statuses are visible

- **`hideSensitiveData`** (boolean): Redact sensitive information
  - Hides author, assignee, comments, and changelog

- **`priority`** (number): Rule priority (higher = higher priority)
  - Default: 0
  - When user has multiple groups, highest priority rule applies

## Available Tools

### Read Operations
- `projects` - List all projects
- `metrics` - Get available metrics
- `issues` - Search and filter issues
- `system_health` - Get system health status
- `system_status` - Get system status
- `system_ping` - Ping the system
- `measures_component` - Get measures for a component
- `measures_components` - Get measures for multiple components
- `measures_history` - Get measures history
- `quality_gates` - List quality gates
- `quality_gate` - Get quality gate details
- `quality_gate_status` - Get quality gate status
- `source_code` - View source code
- `scm_blame` - Get SCM blame information
- `hotspots` - Search security hotspots
- `hotspot` - Get hotspot details
- `components` - Search and navigate components

### Write Operations
- `markIssueFalsePositive` - Mark issue as false positive
- `markIssueWontFix` - Mark issue as won't fix
- `markIssuesFalsePositive` - Bulk mark issues as false positive
- `markIssuesWontFix` - Bulk mark issues as won't fix
- `addCommentToIssue` - Add comment to issue
- `assignIssue` - Assign/unassign issue
- `confirmIssue` - Confirm issue
- `unconfirmIssue` - Unconfirm issue
- `resolveIssue` - Resolve issue
- `reopenIssue` - Reopen issue
- `update_hotspot_status` - Update security hotspot status

## Group Extraction

The system extracts groups from OAuth tokens using these claim names:
- `groups` (preferred)
- `group`
- `roles`
- `role`
- `authorities`

Groups can be:
- Array: `["admin", "developer"]`
- Comma-separated string: `"admin,developer"`
- Space-separated string: `"admin developer"`

## Security Considerations

### Fail-Closed Design
- If no rules match, access is denied by default
- Explicit `defaultRule` required to change this behavior
- No information leakage in error messages

### Rule Evaluation
1. Rules are sorted by priority (descending)
2. First matching rule is applied
3. `deniedTools` takes precedence over `allowedTools`
4. Write operations require `readonly: false`

### Performance
- Permission checks are cached (configurable TTL)
- Regex patterns are compiled once and reused
- Audit logging available for debugging

## Examples

### Development Team Configuration

```json
{
  "rules": [
    {
      "groups": ["frontend-team"],
      "allowedProjects": ["^frontend-.*", "^ui-.*"],
      "allowedTools": ["issues", "measures_component", "source_code"],
      "readonly": false,
      "maxSeverity": "CRITICAL"
    },
    {
      "groups": ["backend-team"],
      "allowedProjects": ["^api-.*", "^service-.*"],
      "allowedTools": ["issues", "measures_component", "source_code", "hotspots"],
      "readonly": false
    }
  ],
  "defaultRule": {
    "allowedProjects": [],
    "allowedTools": [],
    "readonly": true
  }
}
```

### Multi-Environment Configuration

```json
{
  "rules": [
    {
      "groups": ["prod-access"],
      "allowedProjects": ["^prod-.*"],
      "allowedTools": ["issues", "quality_gate_status", "measures_component"],
      "readonly": true,
      "hideSensitiveData": true
    },
    {
      "groups": ["staging-access"],
      "allowedProjects": ["^staging-.*"],
      "allowedTools": ["issues", "quality_gate_status", "measures_component", "source_code"],
      "readonly": false,
      "maxSeverity": "CRITICAL"
    }
  ]
}
```

## Testing Your Configuration

1. Create a test configuration file
2. Set the environment variable
3. Start the server with HTTP transport
4. Make authenticated requests with different group claims
5. Verify filtering behavior

## Troubleshooting

### Enable Audit Logging

Set `"enableAudit": true` in your configuration to log all permission checks:

```json
{
  "enableAudit": true,
  "rules": [...]
}
```

### Common Issues

1. **No projects visible**: Check `allowedProjects` regex patterns
2. **Tools access denied**: Verify tool names in `allowedTools`
3. **Write operations failing**: Ensure `readonly: false`
4. **Wrong rule applied**: Check rule priorities and group matching

## Integration with OAuth Providers

The permission system integrates with any OAuth 2.0 provider that includes group/role information in tokens:

- **Keycloak**: Configure client mappers to include groups
- **Auth0**: Add groups to custom claims
- **Okta**: Include groups in token claims
- **Azure AD**: Map AD groups to token claims

Ensure your OAuth provider is configured to include group information in the access token or ID token used for authentication.