import type { ISonarQubeClient } from '../types/index.js';
import { getDefaultClient } from '../utils/client-factory.js';

/**
 * Handler for getting SonarQube system health status
 * @param client Optional SonarQube client instance
 * @returns Promise with the health status result
 */
export async function handleSonarQubeGetHealth(client: ISonarQubeClient = getDefaultClient()) {
  const result = await client.getHealth();

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
