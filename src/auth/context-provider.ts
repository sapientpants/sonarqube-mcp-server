import { AsyncLocalStorage } from 'async_hooks';
import { UserContext } from './types.js';
import { createLogger } from '../utils/logger.js';
import type { Request, Response, NextFunction } from 'express';

const logger = createLogger('ContextProvider');

/**
 * Request context that flows through the handler chain
 */
export interface RequestContext {
  userContext?: UserContext;
  sessionId?: string;
  requestId?: string;
}

/**
 * Context provider using AsyncLocalStorage for request-scoped context
 */
class ContextProvider {
  private readonly storage = new AsyncLocalStorage<RequestContext>();

  /**
   * Run a function with the given context
   */
  run<T>(context: RequestContext, fn: () => T): T {
    return this.storage.run(context, fn);
  }

  /**
   * Get the current context
   */
  getContext(): RequestContext | undefined {
    return this.storage.getStore();
  }

  /**
   * Get the current user context
   */
  getUserContext(): UserContext | undefined {
    const context = this.getContext();
    return context?.userContext;
  }

  /**
   * Get the current session ID
   */
  getSessionId(): string | undefined {
    const context = this.getContext();
    return context?.sessionId;
  }

  /**
   * Check if user context is available
   */
  hasUserContext(): boolean {
    return this.getUserContext() !== undefined;
  }

  /**
   * Create a middleware for Express that sets up context
   */
  createExpressMiddleware() {
    return (
      req: Request & { userContext?: UserContext; sessionId?: string },
      res: Response,
      next: NextFunction
    ) => {
      const context: RequestContext = {
        userContext: req.userContext,
        sessionId: req.sessionId,
        requestId: req.headers['x-request-id'] as string,
      };

      this.run(context, () => {
        logger.debug('Request context set', {
          hasUserContext: !!context.userContext,
          hasSessionId: !!context.sessionId,
          requestId: context.requestId,
        });
        next();
      });
    };
  }
}

// Global instance
export const contextProvider = new ContextProvider();
