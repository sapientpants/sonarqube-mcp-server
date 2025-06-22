import { ITransport, ITransportConfig } from './base.js';
import { StdioTransport } from './stdio.js';
import { HttpTransport, HttpTransportOptions } from './http.js';

/**
 * Factory for creating transport instances based on configuration.
 * This factory supports extensibility for new transport types while
 * maintaining backward compatibility with STDIO transport.
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
    switch (config.type) {
      case 'stdio':
        return new StdioTransport();

      case 'http':
        return new HttpTransport(config.options as HttpTransportOptions);

      default:
        throw new Error(`Unsupported transport type: ${config.type}`);
    }
  }

  /**
   * Create a transport based on environment variables.
   * Defaults to STDIO transport if no configuration is provided.
   *
   * @returns A transport instance
   */
  static createFromEnvironment(): ITransport {
    const transportType = process.env.MCP_TRANSPORT?.toLowerCase() as
      | ITransportConfig['type']
      | undefined;

    // Default to STDIO for backward compatibility
    const config: ITransportConfig = {
      type: transportType ?? 'stdio',
      options: {},
    };

    // Add any transport-specific options from environment variables
    if (transportType === 'http') {
      config.options = {
        port: process.env.MCP_HTTP_PORT ?? '3000',
        host: process.env.MCP_HTTP_HOST ?? 'localhost',
      };
    }

    return this.create(config);
  }
}
