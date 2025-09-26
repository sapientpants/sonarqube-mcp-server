# 12. Add Elicitation Support for Interactive User Input

Date: 2025-06-19

## Status

Proposed

## Context

The SonarQube MCP server currently operates in a non-interactive mode, requiring all configuration and parameters to be provided upfront through environment variables or tool arguments. This approach has several limitations:

1. **Bulk Operations Risk**: When performing bulk operations (e.g., marking multiple issues as false positive), there's no confirmation step, risking accidental modifications.

2. **Configuration Complexity**: Users must configure authentication before starting the server, with no guidance when configuration is missing or incorrect.

3. **Limited Discoverability**: Users must know exact project keys, component paths, and valid parameter values without assistance.

4. **No Context Collection**: Operations like marking issues as false positive or won't fix lack the ability to collect explanatory comments interactively.

MCP SDK v1.13.0 introduced the elicitation capability, which allows servers to request structured input from users through clients during operation. This feature enables:

- Interactive data collection with JSON schema validation
- Multi-attempt collection with confirmation
- Type-safe input handling
- User-controlled data sharing

## Decision

We will add elicitation support to the SonarQube MCP server to enable interactive user input collection in specific scenarios where it provides clear value for safety, usability, or data quality.

## Implementation Plan

### 1. Elicitation Use Cases

#### Critical Safety Confirmations

- **Bulk False Positive**: Confirm before marking >5 issues as false positive
- **Bulk Won't Fix**: Confirm before marking >5 issues as won't fix
- **Bulk Assignment**: Confirm before assigning >10 issues to a user

#### Configuration Assistance

- **Missing Authentication**: Guide users through auth setup when not configured
- **Invalid Credentials**: Help users correct authentication issues
- **Organization Selection**: List available organizations for SonarCloud users

#### Context Collection

- **False Positive Justification**: Collect explanation when marking issues
- **Won't Fix Reasoning**: Document why issues won't be addressed
- **Resolution Comments**: Gather details about how issues were resolved

#### Search Refinement

- **Component Disambiguation**: When multiple components match a query
- **Project Selection**: When multiple projects are available
- **Filter Refinement**: When initial search returns too many results

### 2. Technical Implementation

#### Schema Definitions

```typescript
// Confirmation schema
const confirmationSchema = {
  type: 'object',
  properties: {
    confirm: {
      type: 'boolean',
      description: 'Confirm the operation',
    },
    comment: {
      type: 'string',
      description: 'Optional comment',
      maxLength: 500,
    },
  },
  required: ['confirm'],
};

// Authentication schema
const authSchema = {
  type: 'object',
  properties: {
    method: {
      type: 'string',
      enum: ['token', 'basic', 'passcode'],
      description: 'Authentication method',
    },
    token: {
      type: 'string',
      description: 'SonarQube token (for token auth)',
    },
    username: {
      type: 'string',
      description: 'Username (for basic auth)',
    },
    password: {
      type: 'string',
      description: 'Password (for basic auth)',
    },
    passcode: {
      type: 'string',
      description: 'System passcode',
    },
  },
  dependencies: {
    method: {
      oneOf: [
        {
          properties: { method: { const: 'token' } },
          required: ['token'],
        },
        {
          properties: { method: { const: 'basic' } },
          required: ['username', 'password'],
        },
        {
          properties: { method: { const: 'passcode' } },
          required: ['passcode'],
        },
      ],
    },
  },
};
```

#### Integration Points

1. **Bulk Operations**: Add threshold checks and confirmation elicitation
2. **Authentication**: Detect missing/invalid auth and offer setup assistance
3. **Tool Enhancement**: Update existing tools to use elicitation when beneficial
4. **Error Recovery**: Use elicitation to help users recover from common errors

### 3. Configuration Options

Add server options to control elicitation behavior:

```typescript
interface ElicitationOptions {
  enabled: boolean; // Master switch for elicitation
  bulkOperationThreshold: number; // Items before confirmation (default: 5)
  requireComments: boolean; // Require comments for resolutions
  interactiveSearch: boolean; // Enable search refinement
}
```

### 4. Backward Compatibility

- Elicitation will be **opt-in** by default
- Environment variable `SONARQUBE_MCP_ELICITATION=true` to enable
- All existing workflows continue to work without elicitation
- Tools detect elicitation availability and adapt behavior

## Consequences

### Positive

1. **Improved Safety**: Prevents accidental bulk modifications
2. **Better UX**: Interactive guidance for complex operations
3. **Higher Data Quality**: Collects context and justifications
4. **Easier Onboarding**: Helps new users configure the server
5. **Reduced Errors**: Validates input before operations
6. **Enhanced Discoverability**: Users learn available options interactively

### Negative

1. **SDK Dependency**: Requires upgrade to MCP SDK v1.13.0+
2. **Increased Complexity**: More code paths to maintain
3. **Workflow Interruption**: May slow down automated workflows
4. **Testing Overhead**: Requires testing both interactive and non-interactive modes
5. **Client Compatibility**: Only works with clients that support elicitation

### Neutral

1. **Optional Feature**: Can be disabled for automation scenarios
2. **Gradual Adoption**: Can be implemented incrementally
3. **Learning Curve**: Users need to understand when elicitation occurs

## Migration Strategy

### Phase 1: Foundation (Week 1)

- Upgrade MCP SDK to v1.13.0+
- Add elicitation configuration system
- Create base elicitation utilities

### Phase 2: Critical Safety (Week 2)

- Implement bulk operation confirmations
- Add tests for confirmation flows
- Document safety features

### Phase 3: Enhanced UX (Week 3-4)

- Add authentication setup assistance
- Implement search refinement
- Add context collection for resolutions

### Phase 4: Polish (Week 5)

- Performance optimization
- Extended documentation
- User feedback incorporation

## Alternatives Considered

1. **Status Quo**: Continue with non-interactive operation
   - Pros: Simple, predictable
   - Cons: Risk of accidents, poor discoverability

2. **Custom Prompting**: Use MCP prompts instead of elicitation
   - Pros: Available in current SDK
   - Cons: Less structured, no validation, one-way communication

3. **External Configuration Tool**: Separate CLI for configuration
   - Pros: Separation of concerns
   - Cons: Additional tool to maintain, poor integration

4. **Client-Side Validation**: Rely on clients to validate
   - Pros: No server changes needed
   - Cons: Inconsistent experience, no server control

## References

- [MCP Elicitation Specification](https://modelcontextprotocol.io/specification/2025-06-18/client/elicitation)
- [MCP SDK v1.13.0 Release Notes](https://github.com/modelcontextprotocol/sdk/releases/tag/v1.13.0)
- [SonarQube Web API Documentation](https://docs.sonarqube.org/latest/web-api/)
