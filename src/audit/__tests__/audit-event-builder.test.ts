import { AuditEventBuilder } from '../audit-event-builder.js';
import { AuditEventType, AuditEventCategory } from '../types.js';
import type { UserContext } from '../../auth/types.js';
import type { TokenClaims } from '../../auth/types.js';

describe('AuditEventBuilder', () => {
  const mockUserContext: UserContext = {
    userId: 'test-user',
    groups: ['developers', 'admins'],
    scopes: ['read', 'write'],
  };

  const mockTokenClaims: TokenClaims = {
    sub: 'user@example.com',
    iss: 'https://auth.example.com',
    aud: 'https://mcp.example.com',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    jti: 'token-123',
    groups: ['developers'],
  };

  describe('basic event building', () => {
    it('should build a complete audit event', () => {
      const event = new AuditEventBuilder()
        .withEventType(AuditEventType.TOOL_INVOKED)
        .withUserContext(mockUserContext, 'session-123')
        .withTarget('tool', 'issues', 'Issues Tool')
        .withAction('execute', 'success', { project: 'test' }, undefined, 100)
        .withContext({ traceId: 'trace-123' })
        .withSecurity({ tlsVersion: '1.3' })
        .withCompliance({ dataClassification: 'internal' })
        .build();

      expect(event.eventType).toBe(AuditEventType.TOOL_INVOKED);
      expect(event.eventCategory).toBe(AuditEventCategory.TOOL_ACCESS);
      expect(event.actor).toEqual({
        userId: 'test-user',
        userGroups: ['developers', 'admins'],
        sessionId: 'session-123',
      });
      expect(event.target).toEqual({
        type: 'tool',
        id: 'issues',
        name: 'Issues Tool',
      });
      expect(event.action).toEqual({
        type: 'execute',
        result: 'success',
        parameters: { project: 'test' },
        error: undefined,
        duration: 100,
      });
      expect(event.context).toEqual({ traceId: 'trace-123' });
      expect(event.security).toEqual({ tlsVersion: '1.3' });
      expect(event.compliance).toEqual({ dataClassification: 'internal' });
    });

    it('should infer event category from event type', () => {
      const authEvent = new AuditEventBuilder()
        .withEventType(AuditEventType.AUTH_LOGIN)
        .withActor({ userId: 'test' })
        .withTarget('auth', 'test')
        .withAction('login', 'success')
        .build();
      expect(authEvent.eventCategory).toBe(AuditEventCategory.AUTHENTICATION);

      const permEvent = new AuditEventBuilder()
        .withEventType(AuditEventType.PERMISSION_DENIED)
        .withActor({ userId: 'test' })
        .withTarget('resource', 'test')
        .withAction('access', 'failure')
        .build();
      expect(permEvent.eventCategory).toBe(AuditEventCategory.AUTHORIZATION);

      const toolEvent = new AuditEventBuilder()
        .withEventType(AuditEventType.TOOL_COMPLETED)
        .withActor({ userId: 'test' })
        .withTarget('tool', 'test')
        .withAction('execute', 'success')
        .build();
      expect(toolEvent.eventCategory).toBe(AuditEventCategory.TOOL_ACCESS);

      const dataEvent = new AuditEventBuilder()
        .withEventType(AuditEventType.DATA_FILTERED)
        .withActor({ userId: 'test' })
        .withTarget('data', 'test')
        .withAction('filter', 'success')
        .build();
      expect(dataEvent.eventCategory).toBe(AuditEventCategory.DATA_ACCESS);

      const configEvent = new AuditEventBuilder()
        .withEventType(AuditEventType.SERVICE_ACCOUNT_ADDED)
        .withActor({ userId: 'test' })
        .withTarget('config', 'test')
        .withAction('add', 'success')
        .build();
      expect(configEvent.eventCategory).toBe(AuditEventCategory.CONFIGURATION);
    });

    it('should build event from token claims', () => {
      const event = new AuditEventBuilder()
        .withEventType(AuditEventType.AUTH_TOKEN_VALIDATED)
        .withTokenClaims(mockTokenClaims, 'session-456')
        .withTarget('auth', mockTokenClaims.sub)
        .withAction('validate', 'success')
        .withTokenSecurity(mockTokenClaims)
        .build();

      expect(event.actor).toEqual({
        userId: 'user@example.com',
        userGroups: ['developers'],
        sessionId: 'session-456',
      });
      expect(event.security).toEqual({
        tokenAud: 'https://mcp.example.com',
        tokenIss: 'https://auth.example.com',
        tokenJti: 'token-123',
      });
    });

    it('should throw error if required fields are missing', () => {
      expect(() => new AuditEventBuilder().build()).toThrow('Event type is required');

      expect(() =>
        new AuditEventBuilder().withEventType(AuditEventType.TOOL_INVOKED).build()
      ).toThrow('Actor information is required');

      expect(() =>
        new AuditEventBuilder()
          .withEventType(AuditEventType.TOOL_INVOKED)
          .withActor({ userId: 'test' })
          .build()
      ).toThrow('Target information is required');

      expect(() =>
        new AuditEventBuilder()
          .withEventType(AuditEventType.TOOL_INVOKED)
          .withActor({ userId: 'test' })
          .withTarget('tool', 'test')
          .build()
      ).toThrow('Action information is required');
    });
  });

  describe('static factory methods', () => {
    it('should create tool invocation event', () => {
      const event = AuditEventBuilder.toolInvocation(
        'issues',
        { project: 'test-project' },
        mockUserContext,
        150
      ).build();

      expect(event.eventType).toBe(AuditEventType.TOOL_COMPLETED);
      expect(event.target.id).toBe('issues');
      expect(event.action.type).toBe('execute');
      expect(event.action.result).toBe('success');
      expect(event.action.duration).toBe(150);
    });

    it('should create tool failure event', () => {
      const event = AuditEventBuilder.toolFailure(
        'projects',
        { filter: 'invalid' },
        'Invalid filter syntax',
        mockUserContext,
        50
      ).build();

      expect(event.eventType).toBe(AuditEventType.TOOL_FAILED);
      expect(event.target.id).toBe('projects');
      expect(event.action.result).toBe('failure');
      expect(event.action.error).toBe('Invalid filter syntax');
    });

    it('should create permission denied event', () => {
      const event = AuditEventBuilder.permissionDenied(
        'project',
        'secret-project',
        'read',
        'Not authorized for this project',
        mockUserContext
      ).build();

      expect(event.eventType).toBe(AuditEventType.PERMISSION_DENIED);
      expect(event.target.type).toBe('project');
      expect(event.target.id).toBe('secret-project');
      expect(event.action.result).toBe('failure');
      expect(event.security.permissionChecks).toEqual([
        {
          permission: 'read',
          result: false,
          reason: 'Not authorized for this project',
        },
      ]);
    });

    it('should create data access event', () => {
      const event = AuditEventBuilder.dataAccess(
        'issues',
        'query-result',
        'read',
        100,
        false,
        mockUserContext
      ).build();

      expect(event.eventType).toBe(AuditEventType.DATA_ACCESSED);
      expect(event.action.parameters).toEqual({
        recordCount: 100,
        filtered: false,
      });

      const filteredEvent = AuditEventBuilder.dataAccess(
        'issues',
        'query-result',
        'read',
        50,
        true,
        mockUserContext
      ).build();

      expect(filteredEvent.eventType).toBe(AuditEventType.DATA_FILTERED);
    });

    it('should create authentication events', () => {
      const loginEvent = AuditEventBuilder.authentication('login', mockTokenClaims, true).build();

      expect(loginEvent.eventType).toBe(AuditEventType.AUTH_LOGIN);
      expect(loginEvent.action.result).toBe('success');

      const rejectedEvent = AuditEventBuilder.authentication(
        'token_rejected',
        mockTokenClaims,
        false,
        'Token expired'
      ).build();

      expect(rejectedEvent.eventType).toBe(AuditEventType.AUTH_TOKEN_REJECTED);
      expect(rejectedEvent.action.result).toBe('failure');
      expect(rejectedEvent.action.error).toBe('Token expired');
    });

    it('should create configuration change event', () => {
      const event = AuditEventBuilder.configurationChange(
        'service-account',
        'prod-account',
        'updated',
        { url: 'https://old.example.com' },
        { url: 'https://new.example.com' },
        mockUserContext
      ).build();

      expect(event.eventType).toBe(AuditEventType.CONFIG_CHANGED);
      expect(event.target.type).toBe('service-account');
      expect(event.target.id).toBe('prod-account');
      expect(event.action.type).toBe('updated');
      expect(event.action.parameters).toEqual({
        oldValue: { url: 'https://old.example.com' },
        newValue: { url: 'https://new.example.com' },
      });
    });
  });

  describe('permission checks', () => {
    it('should add permission check results', () => {
      const event = new AuditEventBuilder()
        .withEventType(AuditEventType.PERMISSION_CHECK)
        .withActor({ userId: 'test' })
        .withTarget('resource', 'test')
        .withAction('check', 'success')
        .withPermissionChecks([
          { permission: 'read', result: true },
          { permission: 'write', result: false, reason: 'Read-only user' },
        ])
        .build();

      expect(event.security.permissionChecks).toEqual([
        { permission: 'read', result: true },
        { permission: 'write', result: false, reason: 'Read-only user' },
      ]);
    });
  });
});
