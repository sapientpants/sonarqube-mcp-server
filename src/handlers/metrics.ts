import type { PaginationParams, ISonarQubeClient } from '../types/index.js';
import { getDefaultClient } from '../utils/client-factory.js';

/**
 * Handler for getting SonarQube metrics
 * @param params Parameters for the metrics request
 * @param client Optional SonarQube client instance
 * @returns Promise with the metrics result
 */
export async function handleSonarQubeGetMetrics(
  params: PaginationParams,
  client: ISonarQubeClient = getDefaultClient()
) {
  const result = await client.getMetrics(params);

  // Create a properly structured response matching the expected format
  const response = {
    metrics: result.metrics ?? [],
    paging: result.paging ?? {
      pageIndex: params.page ?? 1,
      pageSize: params.pageSize ?? 100,
      total: (result.metrics ?? []).length,
    },
  };

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(response),
      },
    ],
  };
}
