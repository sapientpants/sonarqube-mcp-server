# MCP Protocol Compatibility

This document outlines the Model Context Protocol (MCP) version compatibility for the SonarQube MCP Server.

## Protocol Version Support

The SonarQube MCP Server supports the following MCP protocol versions:

| Protocol Version | Status | SDK Version Required |
|-----------------|--------|---------------------|
| 2025-06-18 | ✅ Supported | 1.13.0+ |
| 2025-03-26 | ✅ Supported (Default) | 1.13.0+ |
| 2024-11-05 | ✅ Supported | 1.13.0+ |
| 2024-10-07 | ✅ Supported | 1.13.0+ |

### Version Negotiation

- The server uses `@modelcontextprotocol/sdk` version `1.13.0` or higher
- Protocol version is automatically negotiated during the client-server handshake
- The server will use the highest protocol version supported by both client and server
- If no common version is found, the connection will fail with a version mismatch error

### Current SDK Version

The project currently uses `@modelcontextprotocol/sdk` version `1.13.0`, which supports all protocol versions listed above.

## Feature Compatibility

### Protocol Version 2025-06-18
- Latest protocol version
- Full support for all server capabilities
- Enhanced error handling

### Protocol Version 2025-03-26
- Default negotiated version for most clients
- Full support for elicitation capabilities (required for our implementation)
- All standard MCP features

### Protocol Versions 2024-11-05 and 2024-10-07
- Basic MCP functionality
- May not support all advanced features
- Provided for backward compatibility

## Client Compatibility

This server is compatible with any MCP client that supports at least one of the protocol versions listed above. Common clients include:

- Claude Desktop App
- Continue.dev
- Other MCP-compliant clients

## SDK Update Process

When updating the MCP SDK:

1. Check the [MCP SDK releases](https://github.com/modelcontextprotocol/sdk/releases) for new versions
2. Review the changelog for breaking changes
3. Update the dependency in `package.json`
4. Run `pnpm install` to update the lock file
5. Test all server capabilities with multiple protocol versions
6. Update this compatibility document if new protocol versions are supported
7. Run the full test suite: `pnpm run ci`

## Monitoring Protocol Usage

To see which protocol version is being used during runtime, run the server with debug logging enabled:

```bash
DEBUG=* pnpm start
```

The server will log the negotiated protocol version during client connection.

## Deprecated Features

As of MCP protocol version 2025-03-26:
- JSON-RPC batch support has been removed
- Our server uses the SDK's built-in transport layer, which handles this automatically

## References

- [MCP Specification](https://modelcontextprotocol.io)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/sdk)
- [Protocol Version History](https://modelcontextprotocol.io/docs/changelog)