import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TransportFactory } from '../../transports/factory.js';
import { StdioTransport } from '../../transports/stdio.js';
import type { ITransportConfig } from '../../transports/base.js';

describe('TransportFactory', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('create', () => {
    it('should create a stdio transport', () => {
      const config: ITransportConfig = { type: 'stdio' };
      const transport = TransportFactory.create(config);

      expect(transport).toBeInstanceOf(StdioTransport);
      expect(transport.getName()).toBe('stdio');
    });

    it('should throw error for unsupported transport type', () => {
      const config = { type: 'unsupported' as any } as ITransportConfig;

      expect(() => TransportFactory.create(config)).toThrow(
        'Unsupported transport type: unsupported'
      );
    });

    it('should throw error for undefined transport type', () => {
      const config = {} as ITransportConfig;

      expect(() => TransportFactory.create(config)).toThrow(
        'Unsupported transport type: undefined'
      );
    });

    it('should throw error for null transport type', () => {
      const config = { type: null } as unknown as ITransportConfig;

      expect(() => TransportFactory.create(config)).toThrow('Unsupported transport type: null');
    });
  });

  describe('createFromEnvironment', () => {
    it('should always create stdio transport', () => {
      const transport = TransportFactory.createFromEnvironment();

      expect(transport).toBeInstanceOf(StdioTransport);
      expect(transport.getName()).toBe('stdio');
    });

    it('should create stdio transport regardless of environment variables', () => {
      // Set some random environment variables
      process.env.TRANSPORT_TYPE = 'other';
      process.env.MCP_TRANSPORT = 'unused';

      const transport = TransportFactory.createFromEnvironment();

      expect(transport).toBeInstanceOf(StdioTransport);
      expect(transport.getName()).toBe('stdio');
    });

    it('should create different instances on multiple calls', () => {
      const transport1 = TransportFactory.createFromEnvironment();
      const transport2 = TransportFactory.createFromEnvironment();

      expect(transport1).toBeInstanceOf(StdioTransport);
      expect(transport2).toBeInstanceOf(StdioTransport);
      expect(transport1).not.toBe(transport2); // Different instances
    });
  });

  describe('integration', () => {
    it('should create equivalent transports using both methods', () => {
      const configTransport = TransportFactory.create({ type: 'stdio' });
      const envTransport = TransportFactory.createFromEnvironment();

      expect(configTransport.getName()).toBe(envTransport.getName());
      expect(configTransport).toBeInstanceOf(StdioTransport);
      expect(envTransport).toBeInstanceOf(StdioTransport);
    });
  });
});
