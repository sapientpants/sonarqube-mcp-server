import {
  SonarQubeError as SonarQubeClientError,
  ApiError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  NetworkError,
  ServerError,
  ValidationError,
} from 'sonarqube-web-api-client';
import { createLogger } from './utils/logger.js';

export enum SonarQubeErrorType {
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  AUTHORIZATION_FAILED = 'AUTHORIZATION_FAILED',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RATE_LIMITED = 'RATE_LIMITED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface SonarQubeError extends Error {
  type: SonarQubeErrorType;
  operation?: string;
  statusCode?: number;
  context?: Record<string, unknown>;
  solution?: string;
}

export class SonarQubeAPIError extends Error implements SonarQubeError {
  type: SonarQubeErrorType;
  operation?: string;
  statusCode?: number;
  context?: Record<string, unknown>;
  solution?: string;

  constructor(
    message: string,
    type: SonarQubeErrorType,
    options?: {
      operation?: string;
      statusCode?: number;
      context?: Record<string, unknown>;
      solution?: string;
    }
  ) {
    super(message);
    this.name = 'SonarQubeAPIError';
    this.type = type;
    if (options?.operation !== undefined) {
      this.operation = options.operation;
    }
    if (options?.statusCode !== undefined) {
      this.statusCode = options.statusCode;
    }
    if (options?.context !== undefined) {
      this.context = options.context;
    }
    if (options?.solution !== undefined) {
      this.solution = options.solution;
    }
  }

  override toString(): string {
    let result = `Error: ${this.message}`;
    if (this.operation) {
      result += `\nOperation: ${this.operation}`;
    }
    if (this.statusCode) {
      result += `\nStatus Code: ${this.statusCode}`;
    }
    if (this.solution) {
      result += `\nSolution: ${this.solution}`;
    }
    if (this.context && Object.keys(this.context).length > 0) {
      result += `\nContext: ${JSON.stringify(this.context, null, 2)}`;
    }
    return result;
  }
}

function getErrorTypeFromClientError(error: SonarQubeClientError): {
  type: SonarQubeErrorType;
  solution: string | undefined;
} {
  if (error instanceof AuthenticationError) {
    return {
      type: SonarQubeErrorType.AUTHENTICATION_FAILED,
      solution:
        'Please check your SONARQUBE_TOKEN or credentials. Ensure the token is valid and not expired.',
    };
  }
  if (error instanceof AuthorizationError) {
    return {
      type: SonarQubeErrorType.AUTHORIZATION_FAILED,
      solution: 'Ensure your token has the required permissions for this operation.',
    };
  }
  if (error instanceof NotFoundError) {
    return {
      type: SonarQubeErrorType.RESOURCE_NOT_FOUND,
      solution: 'Verify the project key/component exists and you have access to it.',
    };
  }
  if (error instanceof RateLimitError) {
    return {
      type: SonarQubeErrorType.RATE_LIMITED,
      solution: 'Please wait before retrying. Consider implementing request throttling.',
    };
  }
  if (error instanceof NetworkError) {
    return {
      type: SonarQubeErrorType.NETWORK_ERROR,
      solution: 'Check your network connection and verify the SonarQube URL.',
    };
  }
  if (error instanceof ServerError) {
    return {
      type: SonarQubeErrorType.SERVER_ERROR,
      solution:
        'The server is experiencing issues. Please try again later or contact your administrator.',
    };
  }
  if (error instanceof ValidationError) {
    return {
      type: SonarQubeErrorType.VALIDATION_ERROR,
      solution: 'Please check your request parameters and try again.',
    };
  }
  return {
    type: SonarQubeErrorType.UNKNOWN_ERROR,
    solution: undefined,
  };
}

export function transformError(error: unknown, operation: string): SonarQubeAPIError {
  if (error instanceof SonarQubeAPIError) {
    return error;
  }

  if (error instanceof SonarQubeClientError) {
    const { type, solution } = getErrorTypeFromClientError(error);
    const context: Record<string, unknown> = {};

    // Extract status code if available
    let statusCode: number | undefined;
    if (error instanceof ApiError && 'statusCode' in error) {
      statusCode = (error as ApiError & { statusCode?: number }).statusCode;
    }

    const errorOptions: {
      operation?: string;
      statusCode?: number;
      context?: Record<string, unknown>;
      solution?: string;
    } = {
      operation,
      context,
    };
    if (statusCode !== undefined) {
      errorOptions.statusCode = statusCode;
    }
    if (solution !== undefined) {
      errorOptions.solution = solution;
    }
    return new SonarQubeAPIError(error.message, type, errorOptions);
  }

  if (error instanceof Error) {
    return new SonarQubeAPIError(error.message, SonarQubeErrorType.UNKNOWN_ERROR, {
      operation,
    });
  }

  return new SonarQubeAPIError(String(error), SonarQubeErrorType.UNKNOWN_ERROR, {
    operation,
  });
}

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
}

const logger = createLogger('errors');

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
};

function shouldRetry(error: unknown): boolean {
  if (!(error instanceof SonarQubeAPIError)) {
    return false;
  }

  // Retry on network errors, rate limiting, and server errors
  return [
    SonarQubeErrorType.NETWORK_ERROR,
    SonarQubeErrorType.RATE_LIMITED,
    SonarQubeErrorType.SERVER_ERROR,
  ].includes(error.type);
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withErrorHandling<T>(
  operation: string,
  apiCall: () => Promise<T>,
  retryOptions?: RetryOptions
): Promise<T> {
  const options = { ...DEFAULT_RETRY_OPTIONS, ...retryOptions };
  let lastError: unknown;
  let delay = options.initialDelay;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      // Only transform errors from the SonarQube client
      if (error instanceof SonarQubeClientError) {
        lastError = transformError(error, operation);
      } else {
        // Pass through other errors unchanged (e.g., test mocks)
        lastError = error;
      }

      if (attempt < options.maxRetries && shouldRetry(lastError)) {
        const retryDelay = Math.min(delay, options.maxDelay);
        logger.info(`Retrying ${operation} after ${retryDelay}ms`, {
          attempt: attempt + 1,
          maxRetries: options.maxRetries,
          delay: retryDelay,
        });
        await sleep(retryDelay);
        delay *= options.backoffFactor;
      } else {
        break;
      }
    }
  }

  throw lastError;
}

export function formatErrorForMCP(error: SonarQubeAPIError): { code: number; message: string } {
  const errorMap: Record<SonarQubeErrorType, number> = {
    [SonarQubeErrorType.AUTHENTICATION_FAILED]: -32001,
    [SonarQubeErrorType.AUTHORIZATION_FAILED]: -32002,
    [SonarQubeErrorType.RESOURCE_NOT_FOUND]: -32003,
    [SonarQubeErrorType.RATE_LIMITED]: -32004,
    [SonarQubeErrorType.NETWORK_ERROR]: -32005,
    [SonarQubeErrorType.CONFIGURATION_ERROR]: -32006,
    [SonarQubeErrorType.VALIDATION_ERROR]: -32007,
    [SonarQubeErrorType.SERVER_ERROR]: -32008,
    [SonarQubeErrorType.UNKNOWN_ERROR]: -32000,
  };

  return {
    code: errorMap[error.type] ?? -32000,
    message: error.toString(),
  };
}
