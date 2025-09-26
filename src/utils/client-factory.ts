import { createLogger } from './logger.js';
import type { ISonarQubeClient } from '../types/index.js';
import { createSonarQubeClientFromEnv } from '../sonarqube.js';
import { SonarQubeAPIError, SonarQubeErrorType } from '../errors.js';

const logger = createLogger('client-factory');

/**
 * Validates environment variables for SonarQube authentication
 * @throws Error if no authentication method is configured or if invalid values are provided
 */
export const validateEnvironmentVariables = () => {
  logger.debug('Validating environment variables');

  // Check if any authentication method is configured
  const hasToken = !!process.env.SONARQUBE_TOKEN;
  const hasBasicAuth = !!process.env.SONARQUBE_USERNAME;
  const hasPasscode = !!process.env.SONARQUBE_PASSCODE;

  if (!hasToken && !hasBasicAuth && !hasPasscode) {
    const error = new SonarQubeAPIError(
      'No SonarQube authentication configured',
      SonarQubeErrorType.CONFIGURATION_ERROR,
      {
        operation: 'validateEnvironmentVariables',
        statusCode: undefined,
        solution:
          'Set one of the following authentication methods:\n' +
          '• SONARQUBE_TOKEN for token-based authentication (recommended)\n' +
          '• SONARQUBE_USERNAME and SONARQUBE_PASSWORD for basic authentication\n' +
          '• SONARQUBE_PASSCODE for system passcode authentication',
        context: {
          hasToken,
          hasBasicAuth,
          hasPasscode,
        },
      }
    );
    logger.error('Missing authentication environment variables', error);
    throw error;
  }

  // Validate URL if provided
  if (process.env.SONARQUBE_URL) {
    try {
      new URL(process.env.SONARQUBE_URL);
      logger.debug('Valid SONARQUBE_URL provided', { url: process.env.SONARQUBE_URL });
    } catch {
      const error = new SonarQubeAPIError(
        `Invalid SONARQUBE_URL: "${process.env.SONARQUBE_URL}"`,
        SonarQubeErrorType.CONFIGURATION_ERROR,
        {
          operation: 'validateEnvironmentVariables',
          statusCode: undefined,
          solution:
            'Provide a valid URL including protocol (e.g., https://sonarcloud.io or https://your-sonarqube.com)\n' +
            'Note: URL should not have a trailing slash',
          context: {
            providedUrl: process.env.SONARQUBE_URL,
          },
        }
      );
      logger.error('Invalid SONARQUBE_URL', error);
      throw error;
    }
  }

  // Validate organization if provided
  if (process.env.SONARQUBE_ORGANIZATION && process.env.SONARQUBE_ORGANIZATION.trim() === '') {
    const error = new SonarQubeAPIError(
      'Empty SONARQUBE_ORGANIZATION',
      SonarQubeErrorType.CONFIGURATION_ERROR,
      {
        operation: 'validateEnvironmentVariables',
        statusCode: undefined,
        solution:
          'Provide a valid organization key (e.g., "my-org") or remove the environment variable',
        context: {
          providedValue: '(empty string)',
        },
      }
    );
    logger.error('Empty SONARQUBE_ORGANIZATION', error);
    throw error;
  }

  // Log which authentication method is being used
  if (hasToken) {
    logger.info('Using token authentication');
  } else if (hasBasicAuth) {
    logger.info('Using basic authentication');
  } else if (hasPasscode) {
    logger.info('Using passcode authentication');
  }

  logger.info('Environment variables validated successfully');
};

// Create the SonarQube client
const createDefaultClient = (): ISonarQubeClient => {
  // Validate environment variables
  validateEnvironmentVariables();

  // Create and return client
  return createSonarQubeClientFromEnv();
};

// Default client instance for backward compatibility
// Created lazily to allow environment variable validation at runtime
let defaultClient: ISonarQubeClient | null = null;

export const getDefaultClient = (): ISonarQubeClient => {
  defaultClient ??= createDefaultClient();
  return defaultClient;
};

// Export for testing purposes
export const resetDefaultClient = () => {
  defaultClient = null;
};
