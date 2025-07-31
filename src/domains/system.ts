import type { SonarQubeHealthStatus, SonarQubeSystemStatus } from '../types/index.js';
import { BaseDomain } from './base.js';

/**
 * Domain module for system-related operations
 */
export class SystemDomain extends BaseDomain {
  /**
   * Gets the health status of the SonarQube instance using V2 API
   *
   * The V2 API response structure differs from V1:
   * - V2 returns `status` field instead of `health`
   * - V2 includes optional `nodes` array for clustered setups
   * - Each node can have its own `causes` array for health issues
   *
   * This method transforms the V2 response to maintain backward compatibility
   * with the existing SonarQubeHealthStatus interface.
   *
   * @returns Promise with the health status containing aggregated causes from all nodes
   */
  async getHealth(): Promise<SonarQubeHealthStatus> {
    return this.tracedApiCall('system/health', async () => {
      const response = await this.webApiClient.system.getHealthV2();
      const causes = this.extractCausesFromNodes(response.nodes);

      return {
        health: response.status,
        causes,
      };
    });
  }

  /**
   * Extracts and aggregates causes from all nodes in a clustered SonarQube setup
   *
   * @param nodes - Optional array of nodes from V2 health API response
   * @returns Array of all causes from all nodes, or empty array if no nodes/causes
   * @private
   */
  private extractCausesFromNodes(nodes?: Array<{ causes?: string[] }>): string[] {
    if (!nodes) {
      return [];
    }

    const causes: string[] = [];
    nodes.forEach((node) => {
      if (node.causes) {
        causes.push(...node.causes);
      }
    });

    return causes;
  }

  /**
   * Gets the system status of the SonarQube instance
   * @returns Promise with the system status
   */
  async getStatus(): Promise<SonarQubeSystemStatus> {
    return this.tracedApiCall('system/status', async () => {
      const response = await this.webApiClient.system.status();
      return {
        id: response.id,
        version: response.version,
        status: response.status,
      };
    });
  }

  /**
   * Pings the SonarQube instance
   * @returns Promise with the ping response
   */
  async ping(): Promise<string> {
    return this.tracedApiCall('system/ping', async () => {
      const response = await this.webApiClient.system.ping();
      return response;
    });
  }
}
