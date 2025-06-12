import { createLogger } from './logger.js';

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
    const error = new Error(
      'No SonarQube authentication configured. Please set one of the following:\n' +
        '- SONARQUBE_TOKEN for token-based authentication\n' +
        '- SONARQUBE_USERNAME and SONARQUBE_PASSWORD (optional) for basic authentication\n' +
        '- SONARQUBE_PASSCODE for system passcode authentication'
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
      const error = new Error(
        `Invalid SONARQUBE_URL: "${process.env.SONARQUBE_URL}". ` +
          'Please provide a valid URL (e.g., https://sonarcloud.io or https://your-sonarqube-instance.com).'
      );
      logger.error('Invalid SONARQUBE_URL', error);
      throw error;
    }
  }

  // Validate organization if provided
  if (
    process.env.SONARQUBE_ORGANIZATION &&
    typeof process.env.SONARQUBE_ORGANIZATION !== 'string'
  ) {
    const error = new Error(
      'Invalid SONARQUBE_ORGANIZATION. Please provide a valid organization key as a string.'
    );
    logger.error('Invalid SONARQUBE_ORGANIZATION', error);
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
