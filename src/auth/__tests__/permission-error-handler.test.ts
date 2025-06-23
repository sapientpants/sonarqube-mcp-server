import { describe, it, expect } from '@jest/globals';
import {
  createPermissionError,
  createInsufficientScopeError,
  createProjectAccessError,
  createToolAccessError,
  createReadOnlyError,
  formatErrorMessage,
  PermissionErrorType,
} from '../permission-error-handler.js';

describe('permission-error-handler', () => {
  describe('createPermissionError', () => {
    it('should create basic permission error', () => {
      const error = createPermissionError('access_denied', 'Access denied');

      expect(error.name).toBe('PermissionError');
      expect(error.message).toBe('Access denied');
      expect(error.code).toBe('access_denied');
      expect(error.type).toBe('permission');
    });

    it('should create permission error with additional context', () => {
      const context = { userId: 'test-user', tool: 'issues' };
      const error = createPermissionError('tool_denied', 'Tool access denied', context);

      expect(error.name).toBe('PermissionError');
      expect(error.message).toBe('Tool access denied');
      expect(error.code).toBe('tool_denied');
      expect(error.type).toBe('permission');
      expect(error.context).toEqual(context);
    });
  });

  describe('createInsufficientScopeError', () => {
    it('should create insufficient scope error', () => {
      const userScopes = ['sonarqube:read'];
      const requiredScopes = ['sonarqube:write'];
      const error = createInsufficientScopeError(userScopes, requiredScopes);

      expect(error.name).toBe('PermissionError');
      expect(error.message).toContain('Insufficient OAuth scope');
      expect(error.message).toContain('sonarqube:write');
      expect(error.message).toContain('sonarqube:read');
      expect(error.code).toBe('insufficient_scope');
      expect(error.type).toBe('scope');
      expect(error.context).toEqual({
        userScopes,
        requiredScopes,
      });
    });

    it('should handle multiple required scopes', () => {
      const userScopes = ['sonarqube:read'];
      const requiredScopes = ['sonarqube:write', 'sonarqube:admin'];
      const error = createInsufficientScopeError(userScopes, requiredScopes);

      expect(error.message).toContain('sonarqube:write, sonarqube:admin');
    });

    it('should handle empty user scopes', () => {
      const userScopes: string[] = [];
      const requiredScopes = ['sonarqube:read'];
      const error = createInsufficientScopeError(userScopes, requiredScopes);

      expect(error.message).toContain('User has: none');
    });
  });

  describe('createProjectAccessError', () => {
    it('should create project access error', () => {
      const projectKey = 'my-project';
      const allowedPatterns = ['dev-.*', 'test-.*'];
      const error = createProjectAccessError(projectKey, allowedPatterns);

      expect(error.name).toBe('PermissionError');
      expect(error.message).toContain('Access denied to project');
      expect(error.message).toContain(projectKey);
      expect(error.message).toContain('dev-.*');
      expect(error.message).toContain('test-.*');
      expect(error.code).toBe('project_access_denied');
      expect(error.type).toBe('project');
      expect(error.context).toEqual({
        projectKey,
        allowedPatterns,
      });
    });

    it('should handle empty allowed patterns', () => {
      const projectKey = 'my-project';
      const allowedPatterns: string[] = [];
      const error = createProjectAccessError(projectKey, allowedPatterns);

      expect(error.message).toContain('User has access to: none');
    });

    it('should handle single allowed pattern', () => {
      const projectKey = 'my-project';
      const allowedPatterns = ['dev-.*'];
      const error = createProjectAccessError(projectKey, allowedPatterns);

      expect(error.message).toContain('User has access to: dev-.*');
    });
  });

  describe('createToolAccessError', () => {
    it('should create tool access error', () => {
      const tool = 'issues';
      const allowedTools = ['projects', 'metrics'];
      const error = createToolAccessError(tool, allowedTools);

      expect(error.name).toBe('PermissionError');
      expect(error.message).toContain('Access denied to tool');
      expect(error.message).toContain(tool);
      expect(error.message).toContain('projects');
      expect(error.message).toContain('metrics');
      expect(error.code).toBe('tool_access_denied');
      expect(error.type).toBe('tool');
      expect(error.context).toEqual({
        tool,
        allowedTools,
      });
    });

    it('should handle empty allowed tools', () => {
      const tool = 'issues';
      const allowedTools: string[] = [];
      const error = createToolAccessError(tool, allowedTools);

      expect(error.message).toContain('User has access to: none');
    });

    it('should handle single allowed tool', () => {
      const tool = 'issues';
      const allowedTools = ['projects'];
      const error = createToolAccessError(tool, allowedTools);

      expect(error.message).toContain('User has access to: projects');
    });
  });

  describe('createReadOnlyError', () => {
    it('should create read-only error', () => {
      const operation = 'markIssueFalsePositive';
      const error = createReadOnlyError(operation);

      expect(error.name).toBe('PermissionError');
      expect(error.message).toContain('Read-only access');
      expect(error.message).toContain(operation);
      expect(error.code).toBe('read_only_access');
      expect(error.type).toBe('readonly');
      expect(error.context).toEqual({
        operation,
      });
    });
  });

  describe('formatErrorMessage', () => {
    it('should format permission error type', () => {
      const type: PermissionErrorType = 'permission';
      const message = 'Access denied';
      const result = formatErrorMessage(type, message);

      expect(result).toBe('[Permission] Access denied');
    });

    it('should format scope error type', () => {
      const type: PermissionErrorType = 'scope';
      const message = 'Insufficient scope';
      const result = formatErrorMessage(type, message);

      expect(result).toBe('[Scope] Insufficient scope');
    });

    it('should format project error type', () => {
      const type: PermissionErrorType = 'project';
      const message = 'Project access denied';
      const result = formatErrorMessage(type, message);

      expect(result).toBe('[Project] Project access denied');
    });

    it('should format tool error type', () => {
      const type: PermissionErrorType = 'tool';
      const message = 'Tool access denied';
      const result = formatErrorMessage(type, message);

      expect(result).toBe('[Tool] Tool access denied');
    });

    it('should format readonly error type', () => {
      const type: PermissionErrorType = 'readonly';
      const message = 'Read-only access';
      const result = formatErrorMessage(type, message);

      expect(result).toBe('[ReadOnly] Read-only access');
    });

    it('should handle empty message', () => {
      const type: PermissionErrorType = 'permission';
      const message = '';
      const result = formatErrorMessage(type, message);

      expect(result).toBe('[Permission] ');
    });
  });
});
