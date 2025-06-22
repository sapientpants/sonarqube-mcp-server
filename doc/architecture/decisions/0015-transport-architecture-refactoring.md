# 15. Transport Architecture Refactoring

Date: 2025-06-22

## Status

Accepted

## Context

The current SonarQube MCP server implementation is tightly coupled to STDIO transport, making it difficult to add support for alternative transport mechanisms like HTTP or WebSocket. As per ADR-0003, the transport layer should be abstracted to allow future support for different transport types.

### Current Issues:
1. Direct dependency on `StdioServerTransport` in the main entry point
2. No abstraction layer between the MCP server and transport implementation
3. Tight coupling makes testing and extending the transport layer difficult
4. The STDIO transport requires a workaround (adding a dummy `connect` method) for TypeScript compatibility

### Requirements:
1. Support multiple transport mechanisms (STDIO, HTTP, WebSocket)
2. Maintain backward compatibility with existing STDIO transport
3. Allow transport selection via environment variables
4. Enable easy addition of new transport types in the future
5. Follow existing architectural patterns in the codebase

## Decision

We will refactor the transport architecture by introducing:

1. **Transport Interface (`ITransport`)**: A common interface that all transport implementations must follow
2. **Transport Factory (`TransportFactory`)**: A factory pattern for creating transport instances based on configuration
3. **Environment-based Configuration**: Use `MCP_TRANSPORT` environment variable to select transport type
4. **Modular Transport Implementations**: Each transport type in its own module under `src/transports/`

### Architecture Details:

```typescript
// Transport Interface
interface ITransport {
  connect(server: Server): Promise<void>;
  getName(): string;
}

// Transport Factory
class TransportFactory {
  static create(config: ITransportConfig): ITransport;
  static createFromEnvironment(): ITransport;
}
```

### Environment Variables:
- `MCP_TRANSPORT`: Transport type selection (stdio|http), defaults to 'stdio'
- `MCP_HTTP_PORT`: HTTP transport port (for future HTTP implementation)
- `MCP_HTTP_HOST`: HTTP transport host (for future HTTP implementation)

## Consequences

### Positive:
1. **Extensibility**: Easy to add new transport types without modifying core logic
2. **Testability**: Transport implementations can be tested in isolation
3. **Backward Compatibility**: STDIO remains the default transport, no breaking changes
4. **Clean Architecture**: Follows SOLID principles with clear separation of concerns
5. **Type Safety**: Proper TypeScript interfaces ensure type safety across transport implementations
6. **Future-Ready**: HTTP transport can be added in a future story without architectural changes

### Negative:
1. **Additional Abstraction**: Adds one more layer of abstraction (minimal overhead)
2. **More Files**: Transport logic is now spread across multiple files (better organization)

### Neutral:
1. **Configuration**: Environment variable approach aligns with existing patterns (ADR-0008)
2. **Testing**: Requires new test files for transport modules (improves coverage)

## Implementation Notes

1. The STDIO transport workaround (adding `connect` method) is now encapsulated within the `StdioTransport` class
2. HTTP transport throws a "not yet implemented" error, allowing the structure to be in place for future implementation
3. All transport modules follow the project's existing patterns for module organization and exports
4. Tests are implemented using Jest globals pattern consistent with other tests in the project

## Related ADRs

- ADR-0003: Uses MCP SDK to Create Server (mentions future transport abstraction)
- ADR-0008: Uses Environment Variables for Configuration (transport selection pattern)
- ADR-0010: Uses STDIO Server Transport (current transport choice)