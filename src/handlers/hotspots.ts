import type {
  HotspotSearchParams,
  HotspotStatusUpdateParams,
  ISonarQubeClient,
} from '../types/index.js';
import { getDefaultClient } from '../utils/client-factory.js';
import { createStructuredResponse, createTextResponse } from '../utils/structured-response.js';

/**
 * Handler for searching security hotspots
 * @param params Parameters for the hotspots search
 * @param client Optional SonarQube client instance
 * @returns Promise with the hotspots search result
 */
export async function handleSonarQubeHotspots(
  params: HotspotSearchParams,
  client: ISonarQubeClient = getDefaultClient()
) {
  const result = await client.hotspots(params);

  return createStructuredResponse(result);
}

/**
 * Handler for getting hotspot details
 * @param hotspotKey The key of the hotspot
 * @param client Optional SonarQube client instance
 * @returns Promise with the hotspot details
 */
export async function handleSonarQubeHotspot(
  hotspotKey: string,
  client: ISonarQubeClient = getDefaultClient()
) {
  const result = await client.hotspot(hotspotKey);

  return createStructuredResponse(result);
}

/**
 * Handler for updating hotspot status
 * @param params Parameters for the hotspot status update
 * @param client Optional SonarQube client instance
 * @returns Promise with success message
 */
export async function handleSonarQubeUpdateHotspotStatus(
  params: HotspotStatusUpdateParams,
  client: ISonarQubeClient = getDefaultClient()
) {
  await client.updateHotspotStatus(params);

  return createTextResponse('Hotspot status updated successfully');
}
