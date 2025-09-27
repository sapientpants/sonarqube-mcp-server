import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

/**
 * Base transport interface for MCP server transports.
 * This interface defines the contract that all transport implementations must follow.
 */
export interface ITransport {
  /**
   * Connect the transport to the MCP server.
   * This method should establish the connection and start listening for messages.
   *
   * @param server The MCP server instance to connect to
   * @returns Promise that resolves when the connection is established
   */
  connect(server: Server): Promise<void>;

  /**
   * Get the name of the transport for logging and debugging purposes.
   *
   * @returns The transport name (e.g., 'stdio')
   */
  getName(): string;
}

/**
 * Configuration options for transport initialization.
 */
export interface ITransportConfig {
  /**
   * The type of transport to use.
   */
  type: 'stdio' | 'http';

  /**
   * Optional configuration specific to the transport type.
   */
  options?: Record<string, unknown>;
}

/**
 * HTTP-specific transport configuration.
 */
export interface IHttpTransportConfig extends ITransportConfig {
  type: 'http';
  options?: {
    /**
     * Port to listen on for HTTP requests.
     */
    port?: number;

    /**
     * Allowed hosts for DNS rebinding protection.
     */
    allowedHosts?: string[];

    /**
     * Allowed origins for CORS.
     */
    allowedOrigins?: string[];

    /**
     * Session timeout in milliseconds.
     */
    sessionTimeout?: number;

    /**
     * Enable DNS rebinding protection.
     */
    enableDnsRebindingProtection?: boolean;
  };
}

/**
 * Type guard to check if a transport instance is STDIO transport.
 * This is useful for maintaining backward compatibility.
 */
export function isStdioTransport(transport: unknown): transport is StdioServerTransport {
  return transport instanceof StdioServerTransport;
}
