# 10. Use STDIO transport for MCP communication

Date: 2025-06-13

## Status

Accepted

## Context

The Model Context Protocol (MCP) server needs a transport mechanism to communicate with MCP clients. The transport layer determines how the server receives requests and sends responses.

Several transport options are available:

- STDIO (Standard Input/Output)
- WebSocket
- HTTP
- Named pipes

The server needs to be easily invokable from various environments (node, npx, Docker) without requiring complex network configuration or exposing network ports.

## Decision

We will use StdioServerTransport for MCP communication, with a dummy `connect()` method for compatibility with the MCP protocol requirements.

The server communicates with clients over standard input/output streams, making it a CLI tool that can be launched as a subprocess by MCP clients.

## Consequences

### Positive

- **Simple invocation**: The server can be launched via `node`, `npx`, or `docker run` commands without additional configuration
- **No network exposure**: Eliminates security concerns about open network ports or unauthorized access
- **Cross-platform compatibility**: STDIO works consistently across all operating systems
- **Process isolation**: Each client gets its own server process with isolated state
- **Easy debugging**: STDIO communication can be easily logged and inspected
- **Container-friendly**: Works seamlessly in Docker containers without port mapping

### Negative

- **Single client per process**: Each MCP client requires its own server process
- **No remote access**: Clients must run on the same machine or use SSH/container forwarding
- **Process lifecycle management**: The client is responsible for starting and stopping the server process
- **Resource overhead**: Multiple clients mean multiple Node.js processes

### Implementation Notes

- The dummy `connect()` method is required because the MCP protocol expects all transports to implement this interface, even though STDIO doesn't need an explicit connection step
- The server reads JSON-RPC messages from stdin and writes responses to stdout
- Error messages and logs should be written to stderr to avoid interfering with the JSON-RPC communication
