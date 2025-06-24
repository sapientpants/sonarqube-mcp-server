import { describe, it, expect } from '@jest/globals';
import { UserContext, McpTool } from '../types.js';

describe('permission-error-handler simple coverage', () => {
  it('should test all error creation functions', async () => {
    const errorHandler = await import('../permission-error-handler.js');

    // Test createPermissionDeniedError
    const permDenied = errorHandler.createPermissionDeniedError(
      'projects' as McpTool,
      'user123',
      'No access'
    );
    expect(permDenied).toEqual({
      success: false,
      error: 'Access denied',
      errorCode: 'PERMISSION_DENIED',
    });

    // Test without reason
    const permDenied2 = errorHandler.createPermissionDeniedError('issues' as McpTool, 'user456');
    expect(permDenied2.success).toBe(false);
    expect(permDenied2.errorCode).toBe('PERMISSION_DENIED');

    // Test createProjectAccessDeniedError
    const projDenied = errorHandler.createProjectAccessDeniedError(
      'my-project',
      'User not authorized'
    );
    expect(projDenied).toEqual({
      success: false,
      error: "Access denied to project 'my-project': User not authorized",
      errorCode: 'PROJECT_ACCESS_DENIED',
    });

    // Test without reason
    const projDenied2 = errorHandler.createProjectAccessDeniedError('another-project');
    expect(projDenied2.error).toBe("Access denied to project 'another-project'");

    // Test createInternalError with Error object
    const internalErr = errorHandler.createInternalError(
      'metrics' as McpTool,
      new Error('Something went wrong')
    );
    expect(internalErr).toEqual({
      success: false,
      error: 'Something went wrong',
      errorCode: 'INTERNAL_ERROR',
    });

    // Test with non-Error object
    const internalErr2 = errorHandler.createInternalError(
      'quality_gates' as McpTool,
      'String error'
    );
    expect(internalErr2).toEqual({
      success: false,
      error: 'String error',
      errorCode: 'INTERNAL_ERROR',
    });

    // Test with null/undefined
    const internalErr3 = errorHandler.createInternalError('hotspots' as McpTool, null);
    expect(internalErr3.error).toBe('null');

    const internalErr4 = errorHandler.createInternalError('components' as McpTool, undefined);
    expect(internalErr4.error).toBe('undefined');

    // Test createSuccessResponse
    const success1 = errorHandler.createSuccessResponse({ data: 'test' });
    expect(success1).toEqual({
      success: true,
      data: { data: 'test' },
    });

    const success2 = errorHandler.createSuccessResponse('string data');
    expect(success2).toEqual({
      success: true,
      data: 'string data',
    });

    const success3 = errorHandler.createSuccessResponse(null);
    expect(success3).toEqual({
      success: true,
      data: null,
    });
  });

  it('should test handlePermissionError function', async () => {
    const { handlePermissionError } = await import('../permission-error-handler.js');

    const mockUserContext: UserContext = {
      userId: 'test-user',
      username: 'testuser',
      roles: ['user'],
      permissions: ['issues:read'],
      sessionId: 'session-123',
    };

    // Test with access denied error
    const accessDeniedResult = handlePermissionError(
      'issues' as McpTool,
      mockUserContext,
      new Error('Access denied: Insufficient permissions')
    );
    expect(accessDeniedResult.success).toBe(false);
    expect(accessDeniedResult.errorCode).toBe('PERMISSION_DENIED');

    // Test with project error
    const projectErrorResult = handlePermissionError(
      'projects' as McpTool,
      mockUserContext,
      new Error('Cannot access project: restricted-project')
    );
    expect(projectErrorResult.success).toBe(false);
    expect(projectErrorResult.errorCode).toBe('PROJECT_ACCESS_DENIED');

    // Test with generic error
    const genericErrorResult = handlePermissionError(
      'metrics' as McpTool,
      mockUserContext,
      new Error('Network timeout')
    );
    expect(genericErrorResult.success).toBe(false);
    expect(genericErrorResult.errorCode).toBe('INTERNAL_ERROR');

    // Test with non-Error object
    const nonErrorResult = handlePermissionError(
      'hotspots' as McpTool,
      mockUserContext,
      'String error'
    );
    expect(nonErrorResult.success).toBe(false);
    expect(nonErrorResult.errorCode).toBe('INTERNAL_ERROR');

    // Test with undefined userContext
    const noContextResult = handlePermissionError(
      'issues' as McpTool,
      undefined,
      new Error('Access denied')
    );
    expect(noContextResult.success).toBe(false);
    expect(noContextResult.errorCode).toBe('PERMISSION_DENIED');
  });

  it('should test PermissionError class and related functions', async () => {
    const errorHandler = await import('../permission-error-handler.js');

    // Test PermissionError class
    const permError = new errorHandler.PermissionError('test_code', 'Test message', 'permission', {
      key: 'value',
    });
    expect(permError).toBeInstanceOf(Error);
    expect(permError.name).toBe('PermissionError');
    expect(permError.code).toBe('test_code');
    expect(permError.message).toBe('Test message');
    expect(permError.type).toBe('permission');
    expect(permError.context).toEqual({ key: 'value' });

    // Test without context
    const permError2 = new errorHandler.PermissionError('no_context', 'No context error', 'tool');
    expect(permError2.context).toBeUndefined();

    // Test createPermissionError
    const genError = errorHandler.createPermissionError('auth_failed', 'Authentication failed', {
      attempts: 3,
    });
    expect(genError).toBeInstanceOf(errorHandler.PermissionError);
    expect(genError.code).toBe('auth_failed');
    expect(genError.type).toBe('permission');

    // Test without context
    const genError2 = errorHandler.createPermissionError(
      'generic_error',
      'Generic permission error'
    );
    expect(genError2.context).toBeUndefined();

    // Test createInsufficientScopeError
    const scopeError = errorHandler.createInsufficientScopeError(
      ['read:issues'],
      ['read:issues', 'write:issues']
    );
    expect(scopeError.code).toBe('insufficient_scope');
    expect(scopeError.message).toBe(
      'Insufficient OAuth scope. Required: read:issues, write:issues. User has: read:issues'
    );
    expect(scopeError.type).toBe('scope');
    expect(scopeError.context).toEqual({
      userScopes: ['read:issues'],
      requiredScopes: ['read:issues', 'write:issues'],
    });

    // Test with empty user scopes
    const scopeError2 = errorHandler.createInsufficientScopeError([], ['admin:all']);
    expect(scopeError2.message).toBe(
      'Insufficient OAuth scope. Required: admin:all. User has: none'
    );

    // Test createProjectAccessError
    const projError = errorHandler.createProjectAccessError('secure-project', [
      'public-.*',
      'dev-.*',
    ]);
    expect(projError.code).toBe('project_access_denied');
    expect(projError.message).toBe(
      "Access denied to project 'secure-project'. User has access to: public-.*, dev-.*"
    );
    expect(projError.type).toBe('project');

    // Test with empty patterns
    const projError2 = errorHandler.createProjectAccessError('any-project', []);
    expect(projError2.message).toBe(
      "Access denied to project 'any-project'. User has access to: none"
    );

    // Test createToolAccessError
    const toolError = errorHandler.createToolAccessError('admin_tool', ['issues', 'projects']);
    expect(toolError.code).toBe('tool_access_denied');
    expect(toolError.message).toBe(
      "Access denied to tool 'admin_tool'. User has access to: issues, projects"
    );
    expect(toolError.type).toBe('tool');

    // Test with empty tools
    const toolError2 = errorHandler.createToolAccessError('restricted_tool', []);
    expect(toolError2.message).toBe(
      "Access denied to tool 'restricted_tool'. User has access to: none"
    );

    // Test createReadOnlyError
    const readOnlyError = errorHandler.createReadOnlyError('deleteIssue');
    expect(readOnlyError.code).toBe('read_only_access');
    expect(readOnlyError.message).toBe("Read-only access denied for operation 'deleteIssue'");
    expect(readOnlyError.type).toBe('readonly');

    // Test formatErrorMessage
    expect(errorHandler.formatErrorMessage('permission', 'Access denied')).toBe(
      '[Permission] Access denied'
    );
    expect(errorHandler.formatErrorMessage('scope', 'Insufficient scope')).toBe(
      '[Scope] Insufficient scope'
    );
    expect(errorHandler.formatErrorMessage('project', 'Project not accessible')).toBe(
      '[Project] Project not accessible'
    );
    expect(errorHandler.formatErrorMessage('tool', 'Tool not allowed')).toBe(
      '[Tool] Tool not allowed'
    );
    expect(errorHandler.formatErrorMessage('readonly', 'Write operation denied')).toBe(
      '[ReadOnly] Write operation denied'
    );
  });
});
