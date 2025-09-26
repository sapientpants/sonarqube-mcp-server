import { ITransport, ITransportConfig } from './base.js';
import { StdioTransport } from './stdio.js';

/**
 * Factory for creating transport instances.
 * This factory creates stdio transport instances for MCP communication.
 */
export class TransportFactory {
  /**
   * Create a transport instance based on the provided configuration.
   *
   * @param config Transport configuration
   * @returns A transport instance
   * @throws Error if the transport type is not supported
   */
  static create(config: ITransportConfig): ITransport {
    if (config.type === 'stdio') {
      return new StdioTransport();
    }

    throw new Error(`Unsupported transport type: ${config.type as string}`);
  }

  /**
   * Create a transport based on environment variables.
   * Always returns STDIO transport for simplicity.
   *
   * @returns A transport instance
   */
  static createFromEnvironment(): ITransport {
    // Always use STDIO transport
    return new StdioTransport();
  }
}
