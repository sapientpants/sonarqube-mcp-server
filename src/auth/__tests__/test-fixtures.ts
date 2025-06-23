import { PermissionConfig, PermissionRule, UserContext } from '../types.js';
import { TokenClaims } from '../token-validator.js';

/**
 * Test fixtures and factories for permission system tests
 */

/**
 * Create a mock user context for testing
 */
export function createMockUserContext(overrides: Partial<UserContext> = {}): UserContext {
  return {
    userId: 'test-user',
    groups: ['developer'],
    scopes: ['sonarqube:read', 'sonarqube:write'],
    issuer: 'https://auth.example.com',
    claims: {},
    ...overrides,
  };
}

/**
 * Create mock token claims for testing
 */
export function createMockTokenClaims(overrides: Partial<TokenClaims> = {}): TokenClaims {
  const now = Math.floor(Date.now() / 1000);
  return {
    sub: 'test-user',
    iss: 'https://auth.example.com',
    aud: 'sonarqube-mcp',
    exp: now + 3600,
    iat: now,
    ...overrides,
  };
}

/**
 * Create a mock permission rule for testing
 */
export function createMockPermissionRule(overrides: Partial<PermissionRule> = {}): PermissionRule {
  return {
    groups: ['developer'],
    allowedProjects: ['^dev-.*', '^feature-.*'],
    allowedTools: ['projects', 'issues'],
    readonly: false,
    priority: 50,
    ...overrides,
  };
}

/**
 * Create a mock permission configuration for testing
 */
export function createMockPermissionConfig(
  overrides: Partial<PermissionConfig> = {}
): PermissionConfig {
  return {
    rules: [
      createMockPermissionRule({
        groups: ['admin'],
        allowedProjects: ['.*'],
        allowedTools: ['projects', 'issues', 'markIssueFalsePositive'],
        readonly: false,
        priority: 100,
      }),
      createMockPermissionRule({
        groups: ['developer'],
        allowedProjects: ['^dev-.*', '^feature-.*'],
        allowedTools: ['projects', 'issues'],
        deniedTools: ['markIssueFalsePositive'],
        readonly: false,
        maxSeverity: 'CRITICAL',
        priority: 50,
      }),
      createMockPermissionRule({
        groups: ['viewer'],
        allowedProjects: ['^public-.*'],
        allowedTools: ['projects'],
        readonly: true,
        hideSensitiveData: true,
        allowedStatuses: ['OPEN', 'CONFIRMED'],
        priority: 10,
      }),
    ],
    defaultRule: {
      allowedProjects: [],
      allowedTools: [],
      readonly: true,
    },
    enableCaching: true,
    cacheTtl: 300,
    enableAudit: true,
    ...overrides,
  };
}

/**
 * Create mock logger for testing
 */
export function createMockLogger() {
  const mockFn = () => {};
  return {
    info: mockFn,
    error: mockFn,
    debug: mockFn,
    warn: mockFn,
  };
}

/**
 * Common test scenarios for user contexts
 */
export const TEST_USER_CONTEXTS = {
  admin: createMockUserContext({
    userId: 'admin-user',
    groups: ['admin'],
    scopes: ['sonarqube:read', 'sonarqube:write', 'sonarqube:admin'],
  }),

  developer: createMockUserContext({
    userId: 'dev-user',
    groups: ['developer'],
    scopes: ['sonarqube:read', 'sonarqube:write'],
  }),

  viewer: createMockUserContext({
    userId: 'viewer-user',
    groups: ['viewer'],
    scopes: ['sonarqube:read'],
  }),

  guest: createMockUserContext({
    userId: 'guest-user',
    groups: ['guest'],
    scopes: ['sonarqube:read'],
  }),

  noGroups: createMockUserContext({
    userId: 'no-groups-user',
    groups: [],
    scopes: ['sonarqube:read'],
  }),
};

/**
 * Common test scenarios for token claims
 */
export const TEST_TOKEN_CLAIMS = {
  withGroups: createMockTokenClaims({
    groups: ['admin', 'developer'],
    scope: 'sonarqube:read sonarqube:write',
  }),

  withRoles: createMockTokenClaims({
    roles: ['admin'],
    scope: 'sonarqube:read',
  }),

  withCommaGroups: createMockTokenClaims({
    group: 'admin,developer,qa',
    scope: 'sonarqube:read',
  }),

  withSpaceGroups: createMockTokenClaims({
    authorities: 'admin developer qa',
    scope: 'sonarqube:read sonarqube:write',
  }),

  minimal: createMockTokenClaims({
    scope: 'sonarqube:read',
  }),
};

/**
 * Project keys for testing different access patterns
 */
export const TEST_PROJECT_KEYS = {
  adminAccess: 'admin-project',
  devAccess: 'dev-project-1',
  featureAccess: 'feature-branch-project',
  publicAccess: 'public-project',
  restrictedAccess: 'restricted-project',
  testAccess: 'test-project',
};

/**
 * Mock SonarQube issues for testing
 */
export const TEST_ISSUES = [
  {
    key: 'issue-1',
    project: TEST_PROJECT_KEYS.devAccess,
    severity: 'MAJOR',
    status: 'OPEN',
    author: 'test-author',
    message: 'Test issue 1',
  },
  {
    key: 'issue-2',
    project: TEST_PROJECT_KEYS.publicAccess,
    severity: 'CRITICAL',
    status: 'CONFIRMED',
    author: 'test-author-2',
    message: 'Test issue 2',
  },
  {
    key: 'issue-3',
    project: TEST_PROJECT_KEYS.restrictedAccess,
    severity: 'BLOCKER',
    status: 'OPEN',
    author: 'test-author-3',
    message: 'Test issue 3',
  },
];

/**
 * Mock SonarQube projects for testing
 */
export const TEST_PROJECTS = [
  {
    key: TEST_PROJECT_KEYS.devAccess,
    name: 'Dev Project 1',
    qualifier: 'TRK',
    visibility: 'private',
  },
  {
    key: TEST_PROJECT_KEYS.publicAccess,
    name: 'Public Project',
    qualifier: 'TRK',
    visibility: 'public',
  },
  {
    key: TEST_PROJECT_KEYS.restrictedAccess,
    name: 'Restricted Project',
    qualifier: 'TRK',
    visibility: 'private',
  },
];
