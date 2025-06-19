import type { ProjectQualityGateParams, ISonarQubeClient } from '../types/index.js';
import { getDefaultClient } from '../utils/client-factory.js';
import { createStructuredResponse } from '../utils/structured-response.js';

/**
 * Handler for listing quality gates
 * @param client Optional SonarQube client instance
 * @returns Promise with the quality gates list
 */
export async function handleSonarQubeListQualityGates(
  client: ISonarQubeClient = getDefaultClient()
) {
  const result = await client.listQualityGates();

  return createStructuredResponse(result);
}

/**
 * Handler for getting a specific quality gate
 * @param params Parameters containing the quality gate ID
 * @param client Optional SonarQube client instance
 * @returns Promise with the quality gate details
 */
export async function handleSonarQubeGetQualityGate(
  params: { id: string },
  client: ISonarQubeClient = getDefaultClient()
) {
  const result = await client.getQualityGate(params.id);

  return createStructuredResponse(result);
}

/**
 * Handler for getting quality gate status for a project
 * @param params Parameters for the quality gate status request
 * @param client Optional SonarQube client instance
 * @returns Promise with the quality gate status
 */
export async function handleSonarQubeQualityGateStatus(
  params: ProjectQualityGateParams,
  client: ISonarQubeClient = getDefaultClient()
) {
  const result = await client.getProjectQualityGateStatus(params);

  return createStructuredResponse(result);
}
