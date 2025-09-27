import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mocked } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ElicitationManager, createElicitationManager } from '../elicitation.js';

describe('ElicitationManager', () => {
  let manager: ElicitationManager;
  let mockServer: Mocked<Server>;

  beforeEach(() => {
    // Reset environment variables
    delete process.env.SONARQUBE_MCP_ELICITATION;
    delete process.env.SONARQUBE_MCP_BULK_THRESHOLD;
    delete process.env.SONARQUBE_MCP_REQUIRE_COMMENTS;
    delete process.env.SONARQUBE_MCP_INTERACTIVE_SEARCH;

    manager = new ElicitationManager();
    mockServer = {
      elicitInput: vi.fn(),
    } as unknown as Mocked<Server>;
  });

  describe('initialization', () => {
    it('should default to disabled', () => {
      expect(manager.isEnabled()).toBe(false);
    });

    it('should not be enabled without a server', () => {
      manager.updateOptions({ enabled: true });
      expect(manager.isEnabled()).toBe(false);
    });

    it('should be enabled with server and enabled option', () => {
      manager.updateOptions({ enabled: true });
      manager.setServer(mockServer);
      expect(manager.isEnabled()).toBe(true);
    });

    it('should respect environment variables', () => {
      process.env.SONARQUBE_MCP_ELICITATION = 'true';
      process.env.SONARQUBE_MCP_BULK_THRESHOLD = '10';
      process.env.SONARQUBE_MCP_REQUIRE_COMMENTS = 'true';
      process.env.SONARQUBE_MCP_INTERACTIVE_SEARCH = 'true';

      const envManager = createElicitationManager();
      expect(envManager.getOptions()).toEqual({
        enabled: true,
        bulkOperationThreshold: 10,
        requireComments: true,
        interactiveSearch: true,
      });
    });
  });

  describe('confirmBulkOperation', () => {
    beforeEach(() => {
      manager.updateOptions({ enabled: true, bulkOperationThreshold: 5 });
      manager.setServer(mockServer);
    });

    it('should auto-accept when disabled', async () => {
      manager.updateOptions({ enabled: false });
      const result = await manager.confirmBulkOperation('delete', 10);
      expect(result).toEqual({ action: 'accept', content: { confirm: true } });
      expect(mockServer.elicitInput).not.toHaveBeenCalled();
    });

    it('should auto-accept when below threshold', async () => {
      const result = await manager.confirmBulkOperation('delete', 3);
      expect(result).toEqual({ action: 'accept', content: { confirm: true } });
      expect(mockServer.elicitInput).not.toHaveBeenCalled();
    });

    it('should request confirmation when above threshold', async () => {
      mockServer.elicitInput.mockResolvedValue({
        action: 'accept',
        content: { confirm: true, comment: 'Test comment' },
      });

      const result = await manager.confirmBulkOperation('delete', 10, ['item1', 'item2']);

      expect(mockServer.elicitInput).toHaveBeenCalledWith({
        message: expect.stringContaining('delete 10 items'),
        requestedSchema: expect.objectContaining({
          properties: expect.objectContaining({
            confirm: expect.any(Object),
            comment: expect.any(Object),
          }),
        }),
      });

      expect(result).toEqual({
        action: 'accept',
        content: { confirm: true, comment: 'Test comment' },
      });
    });

    it('should handle user rejection', async () => {
      mockServer.elicitInput.mockResolvedValue({
        action: 'accept',
        content: { confirm: false },
      });

      const result = await manager.confirmBulkOperation('delete', 10);
      expect(result).toEqual({ action: 'reject' });
    });

    it('should handle cancellation', async () => {
      mockServer.elicitInput.mockResolvedValue({ action: 'cancel' });

      const result = await manager.confirmBulkOperation('delete', 10);
      expect(result).toEqual({ action: 'cancel' });
    });

    it('should handle errors gracefully', async () => {
      mockServer.elicitInput.mockRejectedValue(new Error('Test error'));

      const result = await manager.confirmBulkOperation('delete', 10);
      expect(result).toEqual({ action: 'cancel' });
    });
  });

  describe('collectAuthentication', () => {
    beforeEach(() => {
      manager.updateOptions({ enabled: true });
      manager.setServer(mockServer);
    });

    it('should cancel when disabled', async () => {
      manager.updateOptions({ enabled: false });
      const result = await manager.collectAuthentication();
      expect(result).toEqual({ action: 'cancel' });
    });

    it('should collect token authentication', async () => {
      mockServer.elicitInput.mockResolvedValue({
        action: 'accept',
        content: { method: 'token', token: 'test-token' },
      });

      const result = await manager.collectAuthentication();

      expect(mockServer.elicitInput).toHaveBeenCalledWith({
        message: expect.stringContaining('authentication is not configured'),
        requestedSchema: expect.any(Object),
      });

      expect(result).toEqual({
        action: 'accept',
        content: { method: 'token', token: 'test-token' },
      });
    });

    it('should validate authentication schema', async () => {
      mockServer.elicitInput.mockResolvedValue({
        action: 'accept',
        content: { method: 'basic', username: 'user', password: 'pass' },
      });

      const result = await manager.collectAuthentication();
      expect(result.action).toBe('accept');
      expect(result.content).toEqual({
        method: 'basic',
        username: 'user',
        password: 'pass',
      });
    });
  });

  describe('collectResolutionComment', () => {
    beforeEach(() => {
      manager.updateOptions({ enabled: true, requireComments: true });
      manager.setServer(mockServer);
    });

    it('should auto-accept when comments not required', async () => {
      manager.updateOptions({ requireComments: false });
      const result = await manager.collectResolutionComment('ISSUE-123', 'false positive');
      expect(result).toEqual({ action: 'accept', content: { comment: '' } });
      expect(mockServer.elicitInput).not.toHaveBeenCalled();
    });

    it('should request comment when required', async () => {
      mockServer.elicitInput.mockResolvedValue({
        action: 'accept',
        content: { comment: 'This is a test pattern' },
      });

      const result = await manager.collectResolutionComment('ISSUE-123', 'false positive');

      expect(mockServer.elicitInput).toHaveBeenCalledWith({
        message: expect.stringContaining('ISSUE-123'),
        requestedSchema: expect.objectContaining({
          properties: expect.objectContaining({
            comment: expect.objectContaining({
              minLength: 1,
              maxLength: 500,
              type: 'string',
            }),
          }),
        }),
      });

      expect(result).toEqual({
        action: 'accept',
        content: { comment: 'This is a test pattern' },
      });
    });
  });

  describe('disambiguateSelection', () => {
    beforeEach(() => {
      manager.updateOptions({ enabled: true, interactiveSearch: true });
      manager.setServer(mockServer);
    });

    it('should auto-select single item', async () => {
      const items = [{ name: 'Project A', key: 'proj-a' }];
      const result = await manager.disambiguateSelection(items, 'project');
      expect(result).toEqual({ action: 'accept', content: { selection: 'proj-a' } });
    });

    it('should request selection for multiple items', async () => {
      const items = [
        { name: 'Project A', key: 'proj-a' },
        { name: 'Project B', key: 'proj-b' },
        { name: 'Project C', key: 'proj-c' },
      ];

      mockServer.elicitInput.mockResolvedValue({
        action: 'accept',
        content: { selection: 'proj-b' },
      });

      const result = await manager.disambiguateSelection(items, 'project');

      expect(mockServer.elicitInput).toHaveBeenCalledWith({
        message: expect.stringContaining('Multiple projects found'),
        requestedSchema: expect.objectContaining({
          properties: expect.objectContaining({
            selection: expect.objectContaining({
              enum: ['proj-a', 'proj-b', 'proj-c'],
            }),
          }),
        }),
      });

      expect(result).toEqual({
        action: 'accept',
        content: { selection: 'proj-b' },
      });
    });

    it('should not request when interactive search disabled', async () => {
      manager.updateOptions({ interactiveSearch: false });

      const items = [
        { name: 'Project A', key: 'proj-a' },
        { name: 'Project B', key: 'proj-b' },
      ];

      const result = await manager.disambiguateSelection(items, 'project');
      expect(result).toEqual({ action: 'accept', content: { selection: 'proj-a' } });
      expect(mockServer.elicitInput).not.toHaveBeenCalled();
    });
  });
});
