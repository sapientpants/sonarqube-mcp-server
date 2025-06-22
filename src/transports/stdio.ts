import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ITransport } from './base.js';

/**
 * Extended interface for StdioServerTransport with the connect method.
 * This is a temporary workaround until the MCP SDK types are updated.
 * @todo Remove this interface when MCP SDK includes proper connect method typing
 */
interface StdioServerTransportWithConnect extends StdioServerTransport {
  connect: () => Promise<void>;
}

/**
 * STDIO transport implementation for MCP server.
 * This transport uses standard input/output streams for communication.
 */
export class StdioTransport implements ITransport {
  private transport: StdioServerTransportWithConnect;

  constructor() {
    this.transport = new StdioServerTransport() as StdioServerTransportWithConnect;

    // Add the connect method workaround for proper TypeScript compatibility
    // This is a known issue with the current MCP SDK types
    this.transport.connect = () => Promise.resolve();
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
