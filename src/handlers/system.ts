import type { ISonarQubeClient } from '../types/index.js';
import { getDefaultClient } from '../utils/client-factory.js';
import { createLogger } from '../utils/logger.js';
import { withErrorHandling, SonarQubeAPIError, formatErrorForMCP } from '../errors.js';

const logger = createLogger('handlers/system');

/**
 * Handler for getting SonarQube system health status
 * @param client Optional SonarQube client instance
 * @returns Promise with the health status result
 */
export async function handleSonarQubeGetHealth(client: ISonarQubeClient = getDefaultClient()) {
  logger.debug('Handling get health request');

  try {
    const result = await withErrorHandling('Get SonarQube health status', () => client.getHealth());
    logger.info('Successfully retrieved health status', { health: result.health });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(result),
        },
      ],
    };
  } catch (error) {
    logger.error('Failed to get health status', error);
    if (error instanceof SonarQubeAPIError) {
      const { code, message } = formatErrorForMCP(error);
      throw { code, message };
    }
    throw error;
  }
}

/**
 * Handler for getting SonarQube system status
 * @param client Optional SonarQube client instance
 * @returns Promise with the system status result
 */
export async function handleSonarQubeGetStatus(client: ISonarQubeClient = getDefaultClient()) {
  const result = await client.getStatus();

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(result),
      },
    ],
  };
}

/**
 * Handler for pinging SonarQube system
 * @param client Optional SonarQube client instance
 * @returns Promise with the ping result
 */
export async function handleSonarQubePing(client: ISonarQubeClient = getDefaultClient()) {
  const result = await client.ping();

  return {
    content: [
      {
        type: 'text' as const,
        text: result,
      },
    ],
  };
}
