import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { isStdioTransport } from '../../transports/base.js';

describe('Transport Base', () => {
  describe('isStdioTransport', () => {
    it('should return true for StdioServerTransport instance', () => {
      const transport = new StdioServerTransport();
      expect(isStdioTransport(transport)).toBe(true);
    });

    it('should return false for non-StdioServerTransport instances', () => {
      expect(isStdioTransport({})).toBe(false);
      expect(isStdioTransport(null)).toBe(false);
      expect(isStdioTransport(undefined)).toBe(false);
      expect(isStdioTransport('string')).toBe(false);
      expect(isStdioTransport(123)).toBe(false);
    });
  });
});
