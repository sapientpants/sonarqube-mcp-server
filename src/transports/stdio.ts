import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ITransport } from './base.js';

/**
 * STDIO transport implementation for MCP server.
 * This transport uses standard input/output streams for communication.
 */
export class StdioTransport implements ITransport {
  private transport: StdioServerTransport;

  constructor() {
    this.transport = new StdioServerTransport();

    // Add the connect method workaround for proper TypeScript compatibility
    // This is a known issue with the current MCP SDK types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.transport as any).connect = () => Promise.resolve();
  }

  /**
   * Connect the STDIO transport to the MCP server.
   *
   * @param server The MCP server instance to connect to
   * @returns Promise that resolves when the connection is established
   */
  async connect(server: Server): Promise<void> {
    await server.connect(this.transport);
  }

  /**
   * Get the name of this transport.
   *
   * @returns 'stdio'
   */
  getName(): string {
    return 'stdio';
  }

  /**
   * Get the underlying StdioServerTransport instance.
   * This is useful for backward compatibility and testing.
   *
   * @returns The underlying STDIO transport
   */
  getUnderlyingTransport(): StdioServerTransport {
    return this.transport;
  }
}
