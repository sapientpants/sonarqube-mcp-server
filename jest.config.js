/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^(\\.{1,2}/.*)\\.ts$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          moduleResolution: "NodeNext"
        }
      },
    ],
  },
  extensionsToTreatAsEsm: ['.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transformIgnorePatterns: [
    'node_modules/(?!(@modelcontextprotocol)/)'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
  ],
  coverageReporters: ['text', 'lcov'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/src/__tests__/lambda-functions.test.ts',
    '/src/__tests__/handlers.test.ts',
    '/src/__tests__/tool-handlers.test.ts',
    '/src/__tests__/mocked-environment.test.ts',
    '/src/__tests__/direct-lambdas.test.ts'
  ],
  // Focusing on total coverage, with sonarqube.ts at 100%
  coverageThreshold: {
    "src/sonarqube.ts": {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100
    },
    global: {
      statements: 68,
      branches: 8,
      functions: 40,
      lines: 68
    }
  },
  bail: 0 // Run all tests regardless of failures
}; 