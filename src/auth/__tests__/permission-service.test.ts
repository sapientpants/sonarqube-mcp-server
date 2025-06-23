import { describe, expect, it, beforeEach } from '@jest/globals';
import { PermissionService } from '../permission-service.js';
import { PermissionConfig, UserContext } from '../types.js';
import { TokenClaims } from '../token-validator.js';

describe('PermissionService', () => {
  let permissionService: PermissionService;
  let mockConfig: PermissionConfig;
  let mockUserContext: UserContext;

  beforeEach(() => {
    mockConfig = {
      rules: [
        {
          groups: ['admin'],
          allowedProjects: ['.*'],
          allowedTools: ['projects', 'issues', 'markIssueFalsePositive'],
          readonly: false,
          priority: 100,
        },
        {
          groups: ['developer'],
          allowedProjects: ['^dev-.*', '^feature-.*'],
          allowedTools: ['projects', 'issues'],
          deniedTools: ['markIssueFalsePositive'],
          readonly: false,
          maxSeverity: 'CRITICAL',
          priority: 50,
        },
        {
          groups: ['viewer'],
          allowedProjects: ['^public-.*'],
          allowedTools: ['projects'],
          readonly: true,
          hideSensitiveData: true,
          allowedStatuses: ['OPEN', 'CONFIRMED'],
          priority: 10,
        },
      ],
      defaultRule: {
        allowedProjects: [],
        allowedTools: [],
        readonly: true,
      },
      enableCaching: true,
      cacheTtl: 300,
      enableAudit: true,
    };

    permissionService = new PermissionService(mockConfig);

    mockUserContext = {
      userId: 'test-user',
      groups: ['developer'],
      scopes: ['sonarqube:read', 'sonarqube:write'],
      issuer: 'https://auth.example.com',
      claims: {},
    };
  });

  describe('extractUserContext', () => {
    it('should extract user context from token claims', () => {
      const claims: TokenClaims = {
        sub: 'user123',
        iss: 'https://auth.example.com',
        aud: 'sonarqube-mcp',
        exp: Date.now() / 1000 + 3600,
        groups: ['admin', 'developer'],
        scope: 'sonarqube:read sonarqube:write',
      };

      const context = permissionService.extractUserContext(claims);

      expect(context.userId).toBe('user123');
      expect(context.groups).toEqual(['admin', 'developer']);
      expect(context.scopes).toEqual(['sonarqube:read', 'sonarqube:write']);
      expect(context.issuer).toBe('https://auth.example.com');
    });

    it('should handle different group claim formats', () => {
      const claimsWithRoles: TokenClaims = {
        sub: 'user123',
        iss: 'https://auth.example.com',
        aud: 'sonarqube-mcp',
        exp: Date.now() / 1000 + 3600,
        roles: ['admin'],
        scope: 'sonarqube:read',
      };

      const context = permissionService.extractUserContext(claimsWithRoles);
      expect(context.groups).toEqual(['admin']);
    });

    it('should handle comma-separated groups', () => {
      const claims: TokenClaims = {
        sub: 'user123',
        iss: 'https://auth.example.com',
        aud: 'sonarqube-mcp',
        exp: Date.now() / 1000 + 3600,
        group: 'admin,developer,qa',
        scope: 'sonarqube:read',
      };

      const context = permissionService.extractUserContext(claims);
      expect(context.groups).toEqual(['admin', 'developer', 'qa']);
    });

    it('should handle space-separated groups', () => {
      const claims: TokenClaims = {
        sub: 'user123',
        iss: 'https://auth.example.com',
        aud: 'sonarqube-mcp',
        exp: Date.now() / 1000 + 3600,
        authorities: 'admin developer qa',
        scope: 'sonarqube:read',
      };

      const context = permissionService.extractUserContext(claims);
      expect(context.groups).toEqual(['admin', 'developer', 'qa']);
    });

    it('should deduplicate groups', () => {
      const claims: TokenClaims = {
        sub: 'user123',
        iss: 'https://auth.example.com',
        aud: 'sonarqube-mcp',
        exp: Date.now() / 1000 + 3600,
        groups: ['admin', 'developer'],
        roles: ['admin', 'qa'],
        scope: 'sonarqube:read',
      };

      const context = permissionService.extractUserContext(claims);
      expect(context.groups).toEqual(['admin', 'developer', 'qa']);
    });

    it('should handle missing scope', () => {
      const claims: TokenClaims = {
        sub: 'user123',
        iss: 'https://auth.example.com',
        aud: 'sonarqube-mcp',
        exp: Date.now() / 1000 + 3600,
        groups: ['admin'],
      };

      const context = permissionService.extractUserContext(claims);
      expect(context.scopes).toEqual([]);
    });
  });

  describe('checkToolAccess', () => {
    it('should allow access to tools in allowedTools list', async () => {
      const result = await permissionService.checkToolAccess(mockUserContext, 'projects');

      expect(result.allowed).toBe(true);
      expect(result.appliedRule).toBeDefined();
    });

    it('should deny access to tools not in allowedTools list', async () => {
      const result = await permissionService.checkToolAccess(mockUserContext, 'system_health');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not in allowed tools list');
    });

    it('should deny access to explicitly denied tools', async () => {
      const result = await permissionService.checkToolAccess(
        mockUserContext,
        'markIssueFalsePositive'
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('explicitly denied');
    });

    it('should deny write operations for readonly users', async () => {
      // Create a config where viewer has the tool but is readonly
      const configWithWriteTool: PermissionConfig = {
        ...mockConfig,
        rules: [
          {
            groups: ['viewer'],
            allowedProjects: ['^public-.*'],
            allowedTools: ['projects', 'markIssueFalsePositive'], // Include the write tool
            readonly: true, // But make it readonly
            priority: 10,
          },
        ],
      };
      const serviceWithWriteTool = new PermissionService(configWithWriteTool);

      const viewerContext: UserContext = {
        ...mockUserContext,
        groups: ['viewer'],
      };

      const result = await serviceWithWriteTool.checkToolAccess(
        viewerContext,
        'markIssueFalsePositive'
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('read-only users');
    });

    it('should apply highest priority rule', async () => {
      const adminDevContext: UserContext = {
        ...mockUserContext,
        groups: ['admin', 'developer'],
      };

      const result = await permissionService.checkToolAccess(
        adminDevContext,
        'markIssueFalsePositive'
      );

      expect(result.allowed).toBe(true);
      expect(result.appliedRule?.priority).toBe(100);
    });

    it('should use default rule when no specific rule matches', async () => {
      const unknownUserContext: UserContext = {
        ...mockUserContext,
        groups: ['unknown'],
      };

      const result = await permissionService.checkToolAccess(unknownUserContext, 'projects');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not in allowed tools list');
    });

    it('should deny access when no rules match and no default rule', async () => {
      const configWithoutDefault: PermissionConfig = {
        ...mockConfig,
        defaultRule: undefined,
      };
      const serviceWithoutDefault = new PermissionService(configWithoutDefault);

      const unknownUserContext: UserContext = {
        ...mockUserContext,
        groups: ['unknown'],
      };

      const result = await serviceWithoutDefault.checkToolAccess(unknownUserContext, 'projects');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('No applicable permission rule found');
    });
  });

  describe('checkProjectAccess', () => {
    it('should allow access to projects matching regex patterns', async () => {
      const result = await permissionService.checkProjectAccess(mockUserContext, 'dev-project-1');

      expect(result.allowed).toBe(true);
    });

    it('should deny access to projects not matching regex patterns', async () => {
      const result = await permissionService.checkProjectAccess(mockUserContext, 'prod-project-1');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('does not match any allowed patterns');
    });

    it('should handle invalid regex patterns gracefully', async () => {
      const configWithInvalidRegex: PermissionConfig = {
        ...mockConfig,
        rules: [
          {
            groups: ['developer'],
            allowedProjects: ['[invalid-regex'],
            allowedTools: ['projects'],
            readonly: false,
          },
        ],
      };
      const serviceWithInvalidRegex = new PermissionService(configWithInvalidRegex);

      const result = await serviceWithInvalidRegex.checkProjectAccess(
        mockUserContext,
        'any-project'
      );

      expect(result.allowed).toBe(false);
    });
  });

  describe('filterProjects', () => {
    it('should filter projects based on allowed patterns', async () => {
      const projects = [
        { key: 'dev-project-1', name: 'Dev Project 1' },
        { key: 'feature-branch-test', name: 'Feature Test' },
        { key: 'prod-project-1', name: 'Production Project' },
        { key: 'dev-project-2', name: 'Dev Project 2' },
      ];

      const filtered = await permissionService.filterProjects(mockUserContext, projects);

      expect(filtered).toHaveLength(3);
      expect(filtered.map((p) => p.key)).toEqual([
        'dev-project-1',
        'feature-branch-test',
        'dev-project-2',
      ]);
    });

    it('should return empty array when no projects are allowed', async () => {
      const unknownUserContext: UserContext = {
        ...mockUserContext,
        groups: ['unknown'],
      };

      const projects = [{ key: 'any-project', name: 'Any Project' }];

      const filtered = await permissionService.filterProjects(unknownUserContext, projects);

      expect(filtered).toHaveLength(0);
    });
  });

  describe('filterIssues', () => {
    const mockIssues = [
      {
        key: 'issue-1',
        severity: 'MINOR',
        status: 'OPEN',
        author: 'john.doe',
        assignee: 'jane.smith',
      },
      {
        key: 'issue-2',
        severity: 'BLOCKER',
        status: 'CONFIRMED',
        author: 'bob.wilson',
      },
      {
        key: 'issue-3',
        severity: 'MAJOR',
        status: 'CLOSED',
        author: 'alice.brown',
      },
    ];

    it('should filter issues by maximum severity', async () => {
      const filtered = await permissionService.filterIssues(mockUserContext, mockIssues);

      expect(filtered).toHaveLength(2);
      expect(filtered.map((i) => i.key)).toEqual(['issue-1', 'issue-3']);
    });

    it('should filter issues by allowed statuses', async () => {
      const viewerContext: UserContext = {
        ...mockUserContext,
        groups: ['viewer'],
      };

      const filtered = await permissionService.filterIssues(viewerContext, mockIssues);

      expect(filtered).toHaveLength(2);
      expect(filtered.map((i) => i.key)).toEqual(['issue-1', 'issue-2']);
    });

    it('should redact sensitive data when configured', async () => {
      const viewerContext: UserContext = {
        ...mockUserContext,
        groups: ['viewer'],
      };

      const filtered = await permissionService.filterIssues(viewerContext, [...mockIssues]);

      const issueWithAuthor = filtered.find((i) => i.key === 'issue-1');
      expect(issueWithAuthor?.author).toBe('[REDACTED]');
      expect(issueWithAuthor?.assignee).toBe('[REDACTED]');
    });

    it('should return empty array when no rule is found', async () => {
      // Create config without default rule
      const configWithoutDefault: PermissionConfig = {
        ...mockConfig,
        defaultRule: undefined,
      };
      const serviceWithoutDefault = new PermissionService(configWithoutDefault);

      const unknownUserContext: UserContext = {
        ...mockUserContext,
        groups: ['unknown'],
      };

      const filtered = await serviceWithoutDefault.filterIssues(unknownUserContext, mockIssues);

      expect(filtered).toHaveLength(0);
    });
  });

  describe('caching', () => {
    it('should cache permission check results', async () => {
      const result1 = await permissionService.checkToolAccess(mockUserContext, 'projects');
      const result2 = await permissionService.checkToolAccess(mockUserContext, 'projects');

      expect(result1).toEqual(result2);
    });

    it('should clear cache', () => {
      permissionService.clearCache();
      // Cache is cleared - mainly testing that method exists and doesn't throw
      expect(true).toBe(true);
    });
  });

  describe('audit logging', () => {
    it('should record audit entries when enabled', async () => {
      await permissionService.checkToolAccess(mockUserContext, 'projects');

      const auditLog = permissionService.getAuditLog();
      expect(auditLog.length).toBeGreaterThan(0);

      const lastEntry = auditLog[auditLog.length - 1];
      expect(lastEntry.userId).toBe(mockUserContext.userId);
      expect(lastEntry.action).toContain('access_tool:projects');
      expect(lastEntry.allowed).toBe(true);
    });

    it('should not record audit entries when disabled', async () => {
      const configWithoutAudit: PermissionConfig = {
        ...mockConfig,
        enableAudit: false,
      };
      const serviceWithoutAudit = new PermissionService(configWithoutAudit);

      await serviceWithoutAudit.checkToolAccess(mockUserContext, 'projects');

      const auditLog = serviceWithoutAudit.getAuditLog();
      expect(auditLog).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle rules without groups (applies to all)', async () => {
      const configWithUniversalRule: PermissionConfig = {
        rules: [
          {
            allowedProjects: ['.*'],
            allowedTools: ['projects'],
            readonly: true,
          },
        ],
      };
      const serviceWithUniversalRule = new PermissionService(configWithUniversalRule);

      const anyUserContext: UserContext = {
        ...mockUserContext,
        groups: ['any-group'],
      };

      const result = await serviceWithUniversalRule.checkToolAccess(anyUserContext, 'projects');
      expect(result.allowed).toBe(true);
    });

    it('should handle empty group lists', async () => {
      const userWithNoGroups: UserContext = {
        ...mockUserContext,
        groups: [],
      };

      const result = await permissionService.checkToolAccess(userWithNoGroups, 'projects');
      expect(result.allowed).toBe(false);
    });
  });
});
