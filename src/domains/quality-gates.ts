import type {
  SonarQubeQualityGatesResult,
  SonarQubeQualityGate,
  SonarQubeQualityGateStatus,
  ProjectQualityGateParams,
} from '../types/index.js';
import { BaseDomain } from './base.js';

/**
 * Domain module for quality gates operations
 */
export class QualityGatesDomain extends BaseDomain {
  /**
   * Lists all quality gates
   * @returns Promise with the list of quality gates
   */
  async listQualityGates(): Promise<SonarQubeQualityGatesResult> {
    const response = await this.webApiClient.qualityGates.list();
    return {
      qualitygates: response.qualitygates.map((gate) => ({
        id: gate.id,
        name: gate.name,
        isDefault: gate.isDefault,
        isBuiltIn: gate.isBuiltIn,
        conditions: gate.conditions?.map((condition) => ({
          id: condition.id,
          metric: condition.metric,
          op: condition.operator ?? 'GT', // Default operator
          error: condition.error ?? '',
        })),
      })),
      default: response.default ?? '',
      actions: (response as { actions?: { create?: boolean } }).actions
        ? {
            create: (response as { actions?: { create?: boolean } }).actions?.create,
          }
        : undefined, // actions might not be in the type definition
    };
  }

  /**
   * Gets a specific quality gate by ID
   * @param id The quality gate ID
   * @returns Promise with the quality gate details
   */
  async getQualityGate(id: string): Promise<SonarQubeQualityGate> {
    const response = await this.webApiClient.qualityGates.get({ id });
    return {
      id: response.id,
      name: response.name,
      isDefault: response.isDefault,
      isBuiltIn: response.isBuiltIn,
      conditions: response.conditions?.map((condition) => ({
        id: condition.id,
        metric: condition.metric,
        op:
          (condition as { op?: string; operator?: string }).op ??
          (condition as { op?: string; operator?: string }).operator ??
          'GT',
        error: condition.error ?? '',
      })),
    };
  }

  /**
   * Gets the quality gate status for a project
   * @param params Parameters including project key and optional branch/PR
   * @returns Promise with the quality gate status
   */
  async getProjectQualityGateStatus(
    params: ProjectQualityGateParams
  ): Promise<SonarQubeQualityGateStatus> {
    const { projectKey, branch, pullRequest } = params;

    const request = { projectKey };
    if (branch !== undefined) {
      (request as any).branch = branch;
    }
    if (pullRequest !== undefined) {
      (request as any).pullRequest = pullRequest;
    }

    const response = await this.webApiClient.qualityGates.getProjectStatus(request);

    return response as unknown as SonarQubeQualityGateStatus;
  }
}
