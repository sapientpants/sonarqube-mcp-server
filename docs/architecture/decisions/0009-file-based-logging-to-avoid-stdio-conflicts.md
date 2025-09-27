# 9. File-based logging to avoid STDIO conflicts

Date: 2025-06-13

## Status

Accepted

## Context

The Model Context Protocol (MCP) uses standard input/output (STDIO) streams for communication between the client and server. This creates a fundamental conflict with traditional logging approaches that write to stdout or stderr.

When an MCP server writes anything to stdout, it must be valid JSON-RPC messages conforming to the MCP protocol. Any non-protocol output (such as log messages) written to stdout would corrupt the communication stream and cause protocol errors.

Similarly, stderr output could interfere with the client's ability to properly parse and handle MCP messages, potentially causing connection failures or undefined behavior.

## Decision

We will implement file-based logging for all diagnostic and debugging output in the MCP server.

The server will:

- Write all log messages to a file specified by the `LOG_FILE` environment variable
- Default to no logging if `LOG_FILE` is not set
- Never write log messages to stdout or stderr
- Ensure all stdout output consists only of valid MCP protocol messages

## Consequences

### Positive

- **Protocol integrity**: The MCP communication stream remains clean and uncorrupted
- **Reliable communication**: Prevents protocol errors caused by interleaved log messages
- **Debugging capability**: Developers can still access detailed logs for troubleshooting
- **Configuration flexibility**: Log file location can be customized via environment variable

### Negative

- **No console logging**: Developers cannot see logs in real-time in the console during development
- **File management**: Log files need to be managed (rotation, cleanup) to prevent disk space issues
- **Additional setup**: Developers must know where to find log files for debugging
- **Potential permissions issues**: The server must have write permissions to the log file location

### Mitigation

- Document the log file location clearly in README and error messages
- Consider implementing log rotation to manage file size
- Provide clear error messages if log file cannot be created
- Include log file location in any error output that is part of the protocol
