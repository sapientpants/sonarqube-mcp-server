import type { SonarQubeHealthStatus, SonarQubeSystemStatus } from '../types/index.js';
import { BaseDomain } from './base.js';

/**
 * Domain module for system-related operations
 */
export class SystemDomain extends BaseDomain {
  /**
   * Gets the health status of the SonarQube instance
   * @returns Promise with the health status
   */
  async getHealth(): Promise<SonarQubeHealthStatus> {
    const response = await this.webApiClient.system.health();
    return {
      health: response.health,
      causes: response.causes ?? [],
    };
  }

  /**
   * Gets the system status of the SonarQube instance
   * @returns Promise with the system status
   */
  async getStatus(): Promise<SonarQubeSystemStatus> {
    const response = await this.webApiClient.system.status();
    return {
      id: response.id,
      version: response.version,
      status: response.status,
    };
  }

  /**
   * Pings the SonarQube instance
   * @returns Promise with the ping response
   */
  async ping(): Promise<string> {
    const response = await this.webApiClient.system.ping();
    return response;
  }
}
