import { ITransport, ITransportConfig, IHttpTransportConfig } from './base.js';
import { StdioTransport } from './stdio.js';
import { HttpTransport } from './http.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('transport-factory');

/**
 * Factory for creating transport instances.
 * This factory creates transport instances for MCP communication based on configuration.
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
    logger.debug(`Creating transport of type: ${config.type}`);

    switch (config.type) {
      case 'stdio':
        return new StdioTransport();

      case 'http': {
        const httpConfig = config as IHttpTransportConfig;
        return new HttpTransport(httpConfig.options);
      }

      default:
        throw new Error(`Unsupported transport type: ${config.type as string}`);
    }
  }

  /**
   * Create a transport based on environment variables.
   * Supports both STDIO and HTTP transports based on MCP_TRANSPORT_TYPE.
   *
   * @returns A transport instance
   */
  static createFromEnvironment(): ITransport {
    const transportType = process.env.MCP_TRANSPORT_TYPE?.toLowerCase() || 'stdio';

    logger.info(`Creating transport from environment: ${transportType}`);

    if (transportType === 'http') {
      // Parse HTTP configuration from environment
      const options: IHttpTransportConfig['options'] = {};

      if (process.env.MCP_HTTP_PORT) {
        options.port = Number.parseInt(process.env.MCP_HTTP_PORT, 10);
      }
      if (process.env.MCP_HTTP_ALLOWED_HOSTS) {
        options.allowedHosts = process.env.MCP_HTTP_ALLOWED_HOSTS.split(',').map((h) => h.trim());
      }
      if (process.env.MCP_HTTP_ALLOWED_ORIGINS) {
        options.allowedOrigins = process.env.MCP_HTTP_ALLOWED_ORIGINS.split(',').map((o) =>
          o.trim()
        );
      }
      if (process.env.MCP_HTTP_SESSION_TIMEOUT) {
        options.sessionTimeout = Number.parseInt(process.env.MCP_HTTP_SESSION_TIMEOUT, 10);
      }
      if (process.env.MCP_HTTP_ENABLE_DNS_REBINDING_PROTECTION === 'true') {
        options.enableDnsRebindingProtection = true;
      }

      const config: IHttpTransportConfig = {
        type: 'http',
        options,
      };

      // Log configuration (without sensitive data)
      logger.debug('HTTP transport configuration:', {
        port: config.options?.port,
        allowedHosts: config.options?.allowedHosts,
        allowedOrigins: config.options?.allowedOrigins,
        sessionTimeout: config.options?.sessionTimeout,
        enableDnsRebindingProtection: config.options?.enableDnsRebindingProtection,
      });

      return TransportFactory.create(config);
    }

    // Default to STDIO transport
    return new StdioTransport();
  }
}
