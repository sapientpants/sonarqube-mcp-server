import { describe, it, expect, jest } from '@jest/globals';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioTransport } from '../../transports/stdio.js';

describe('StdioTransport', () => {
  it('should create instance with transport', () => {
    const transport = new StdioTransport();
    expect(transport).toBeDefined();
    expect(transport.getName()).toBe('stdio');
  });

  it('should return underlying transport', () => {
    const transport = new StdioTransport();
    const underlying = transport.getUnderlyingTransport();
    expect(underlying).toBeDefined();
    expect(underlying.constructor.name).toBe('StdioServerTransport');
  });

  it('should connect to server', async () => {
    const transport = new StdioTransport();
    const mockServer = {
      connect: jest.fn().mockResolvedValue(undefined),
    } as unknown as Server;

    await transport.connect(mockServer);
    expect(mockServer.connect).toHaveBeenCalledWith(transport.getUnderlyingTransport());
  });

  it('should add connect method to underlying transport', () => {
    const transport = new StdioTransport();
    const underlying = transport.getUnderlyingTransport();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((underlying as any).connect).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(typeof (underlying as any).connect).toBe('function');
  });
});
