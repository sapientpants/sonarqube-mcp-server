import type { SourceCodeParams, ScmBlameParams, ISonarQubeClient } from '../types/index.js';
import { getDefaultClient } from '../utils/client-factory.js';

/**
 * Handler for getting source code
 * @param params Parameters for the source code request
 * @param client Optional SonarQube client instance
 * @returns Promise with the source code result
 */
export async function handleSonarQubeGetSourceCode(
  params: SourceCodeParams,
  client: ISonarQubeClient = getDefaultClient()
) {
  const result = await client.getSourceCode(params);

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
 * Handler for getting SCM blame information
 * @param params Parameters for the SCM blame request
 * @param client Optional SonarQube client instance
 * @returns Promise with the SCM blame result
 */
export async function handleSonarQubeGetScmBlame(
  params: ScmBlameParams,
  client: ISonarQubeClient = getDefaultClient()
) {
  const result = await client.getScmBlame(params);

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(result),
      },
    ],
  };
}
