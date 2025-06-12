import type {
  ComponentMeasuresParams,
  ComponentsMeasuresParams,
  MeasuresHistoryParams,
  ISonarQubeClient,
} from '../types/index.js';
import { getDefaultClient } from '../utils/client-factory.js';

/**
 * Handler for getting measures for a specific component
 * @param params Parameters for the component measures request
 * @param client Optional SonarQube client instance
 * @returns Promise with the component measures result
 */
export async function handleSonarQubeComponentMeasures(
  params: ComponentMeasuresParams,
  client: ISonarQubeClient = getDefaultClient()
) {
  const result = await client.getComponentMeasures(params);

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
 * Handler for getting measures for multiple components
 * @param params Parameters for the components measures request
 * @param client Optional SonarQube client instance
 * @returns Promise with the components measures result
 */
export async function handleSonarQubeComponentsMeasures(
  params: ComponentsMeasuresParams,
  client: ISonarQubeClient = getDefaultClient()
) {
  const result = await client.getComponentsMeasures(params);

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
 * Handler for getting measures history
 * @param params Parameters for the measures history request
 * @param client Optional SonarQube client instance
 * @returns Promise with the measures history result
 */
export async function handleSonarQubeMeasuresHistory(
  params: MeasuresHistoryParams,
  client: ISonarQubeClient = getDefaultClient()
) {
  const result = await client.getMeasuresHistory(params);

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(result),
      },
    ],
  };
}
