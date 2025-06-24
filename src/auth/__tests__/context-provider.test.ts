import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals';
import { contextProvider } from '../context-provider.js';
import { UserContext } from '../types.js';
import type { Request, Response, NextFunction } from 'express';

describe('ContextProvider', () => {
  let mockUserContext: UserContext;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockUserContext = {
      userId: 'test-user',
      groups: ['developer'],
      scopes: ['sonarqube:read'],
      issuer: 'https://auth.example.com',
      claims: {},
    };

    mockRequest = {
      userContext: mockUserContext,
      sessionId: 'session123',
      headers: {
        'x-request-id': 'req-456',
      },
    } as Request & { userContext: UserContext; sessionId: string };

    mockResponse = {} as Response;
    mockNext = jest.fn();
  });

  afterEach(() => {
    // Clean up any running contexts - no cleanup needed for singleton
  });

  describe('createExpressMiddleware', () => {
    it('should create middleware that sets context and calls next', () => {
      const middleware = contextProvider.createExpressMiddleware();

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle request without user context', () => {
      const requestWithoutContext = {
        sessionId: 'session123',
        headers: {
          'x-request-id': 'req-456',
        },
      } as Request & { sessionId: string };

      const middleware = contextProvider.createExpressMiddleware();

      middleware(requestWithoutContext as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle request without session ID', () => {
      const requestWithoutSession = {
        userContext: mockUserContext,
        headers: {
          'x-request-id': 'req-456',
        },
      } as Request & { userContext: UserContext };

      const middleware = contextProvider.createExpressMiddleware();

      middleware(requestWithoutSession as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle request without request ID', () => {
      const requestWithoutId = {
        userContext: mockUserContext,
        sessionId: 'session123',
        headers: {},
      } as Request & { userContext: UserContext; sessionId: string };

      const middleware = contextProvider.createExpressMiddleware();

      middleware(requestWithoutId as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('context management', () => {
    it('should store and retrieve user context within async context', (done) => {
      const middleware = contextProvider.createExpressMiddleware();

      mockNext = () => {
        // Inside the middleware context
        const retrievedContext = contextProvider.getUserContext();
        expect(retrievedContext).toEqual(mockUserContext);

        const sessionId = contextProvider.getSessionId();
        expect(sessionId).toBe('session123');

        // Request ID is stored in context but no getter method exists

        done();
      };

      middleware(mockRequest as Request, mockResponse as Response, mockNext);
    });

    it('should return undefined when accessed outside of context', () => {
      const userContext = contextProvider.getUserContext();
      const sessionId = contextProvider.getSessionId();
      expect(userContext).toBeUndefined();
      expect(sessionId).toBeUndefined();
    });

    it('should isolate contexts between different requests', (done) => {
      const middleware = contextProvider.createExpressMiddleware();
      let callCount = 0;

      const firstRequest = {
        userContext: {
          ...mockUserContext,
          userId: 'user1',
        },
        sessionId: 'session1',
        headers: { 'x-request-id': 'req1' },
      } as Request & { userContext: UserContext; sessionId: string };

      const secondRequest = {
        userContext: {
          ...mockUserContext,
          userId: 'user2',
        },
        sessionId: 'session2',
        headers: { 'x-request-id': 'req2' },
      } as Request & { userContext: UserContext; sessionId: string };

      const checkContext = (expectedUserId: string, expectedSessionId: string) => {
        return () => {
          const userContext = contextProvider.getUserContext();
          const sessionId = contextProvider.getSessionId();

          expect(userContext?.userId).toBe(expectedUserId);
          expect(sessionId).toBe(expectedSessionId);

          callCount++;
          if (callCount === 2) {
            done();
          }
        };
      };

      // Simulate two concurrent requests
      middleware(
        firstRequest as Request,
        mockResponse as Response,
        checkContext('user1', 'session1')
      );
      middleware(
        secondRequest as Request,
        mockResponse as Response,
        checkContext('user2', 'session2')
      );
    });

    it('should propagate context through async operations', (done) => {
      const middleware = contextProvider.createExpressMiddleware();

      mockNext = async () => {
        // Simulate async operation
        await new Promise((resolve) => setTimeout(resolve, 10));

        const retrievedContext = contextProvider.getUserContext();
        expect(retrievedContext).toEqual(mockUserContext);

        done();
      };

      middleware(mockRequest as Request, mockResponse as Response, mockNext);
    });
  });

  describe('run method', () => {
    it('should execute callback within provided context', (done) => {
      const testContext = {
        userContext: mockUserContext,
        sessionId: 'test-session',
        requestId: 'test-request',
      };

      contextProvider.run(testContext, () => {
        const userContext = contextProvider.getUserContext();
        const sessionId = contextProvider.getSessionId();

        expect(userContext).toEqual(mockUserContext);
        expect(sessionId).toBe('test-session');

        done();
      });
    });

    it('should handle nested contexts correctly', (done) => {
      const outerContext = {
        userContext: mockUserContext,
        sessionId: 'outer-session',
        requestId: 'outer-request',
      };

      const innerContext = {
        userContext: {
          ...mockUserContext,
          userId: 'inner-user',
        },
        sessionId: 'inner-session',
        requestId: 'inner-request',
      };

      contextProvider.run(outerContext, () => {
        // Check outer context
        expect(contextProvider.getUserContext()?.userId).toBe('test-user');
        expect(contextProvider.getSessionId()).toBe('outer-session');

        contextProvider.run(innerContext, () => {
          // Check inner context
          expect(contextProvider.getUserContext()?.userId).toBe('inner-user');
          expect(contextProvider.getSessionId()).toBe('inner-session');
        });

        // Should be back to outer context
        expect(contextProvider.getUserContext()?.userId).toBe('test-user');
        expect(contextProvider.getSessionId()).toBe('outer-session');

        done();
      });
    });

    it('should handle context without user context', (done) => {
      const testContext = {
        sessionId: 'test-session',
        requestId: 'test-request',
      };

      contextProvider.run(testContext, () => {
        const userContext = contextProvider.getUserContext();
        const sessionId = contextProvider.getSessionId();

        expect(userContext).toBeUndefined();
        expect(sessionId).toBe('test-session');

        done();
      });
    });
  });

  describe('error handling', () => {
    it('should handle errors in middleware gracefully', () => {
      const middleware = contextProvider.createExpressMiddleware();

      mockNext = () => {
        throw new Error('Test error');
      };

      expect(() => {
        middleware(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow('Test error');
    });

    it('should handle errors in run callback gracefully', () => {
      const testContext = {
        userContext: mockUserContext,
        sessionId: 'test-session',
        requestId: 'test-request',
      };

      expect(() => {
        contextProvider.run(testContext, () => {
          throw new Error('Test error');
        });
      }).toThrow('Test error');
    });
  });
});
