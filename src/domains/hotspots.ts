import type {
  HotspotSearchParams,
  SonarQubeHotspotSearchResult,
  SonarQubeHotspotDetails,
  HotspotStatusUpdateParams,
  SonarQubeHotspot,
  SeverityLevel,
} from '../types/index.js';
import { BaseDomain } from './base.js';

/**
 * Domain module for security hotspots operations
 */
export class HotspotsDomain extends BaseDomain {
  /**
   * Search for security hotspots
   * @param params Search parameters
   * @returns Promise with the search results
   */
  async hotspots(params: HotspotSearchParams): Promise<SonarQubeHotspotSearchResult> {
    const builder = this.webApiClient.hotspots.search();

    if (params.projectKey) {
      builder.projectKey(params.projectKey);
    }
    // Note: The hotspots API doesn't support branch/pullRequest filtering directly
    // These parameters might be ignored or need to be handled differently
    if (params.status) {
      builder.status(params.status);
    }
    if (params.resolution) {
      builder.resolution(params.resolution);
    }
    if (params.files) {
      builder.files(params.files);
    }
    if (params.assignedToMe !== undefined) {
      builder.onlyMine(params.assignedToMe);
    }
    if (params.sinceLeakPeriod !== undefined) {
      builder.sinceLeakPeriod(params.sinceLeakPeriod);
    }
    if (params.inNewCodePeriod !== undefined) {
      // inNewCodePeriod might not be available, use sinceLeakPeriod instead
      if (params.inNewCodePeriod) {
        builder.sinceLeakPeriod(true);
      }
    }
    if (params.page !== undefined) {
      builder.page(params.page);
    }
    if (params.pageSize !== undefined) {
      builder.pageSize(params.pageSize);
    }

    const response = await builder.execute();

    return {
      hotspots: response.hotspots as SonarQubeHotspot[],
      components: response.components?.map((comp) => ({
        key: comp.key,
        qualifier: comp.qualifier,
        name: comp.name,
        longName: comp.longName,
        path: comp.path,
      })),
      paging: response.paging ?? { pageIndex: 1, pageSize: 100, total: 0 },
    };
  }

  /**
   * Get details for a specific hotspot
   * @param hotspotKey The hotspot key
   * @returns Promise with the hotspot details
   */
  async hotspot(hotspotKey: string): Promise<SonarQubeHotspotDetails> {
    const response = await this.webApiClient.hotspots.show({ hotspot: hotspotKey });
    // Map the response to our interface
    return {
      key: response.key,
      component: response.component.key,
      project: response.project.key,
      securityCategory: response.rule.securityCategory,
      vulnerabilityProbability: response.rule.vulnerabilityProbability as SeverityLevel,
      status: response.status,
      ...(response.resolution && { resolution: response.resolution }),
      line: response.line ?? 0,
      message: response.message,
      ...(response.assignee?.login && { assignee: response.assignee.login }),
      ...(response.author?.login && { author: response.author.login }),
      creationDate: response.creationDate,
      updateDate: response.updateDate,
      rule: {
        key: response.rule.key,
        name: response.rule.name,
        securityCategory: response.rule.securityCategory,
        vulnerabilityProbability: response.rule.vulnerabilityProbability as SeverityLevel,
      },
      changelog: response.changelog?.map((change) => ({
        user: change.user?.login,
        userName: change.user?.name,
        creationDate: change.creationDate,
        diffs:
          change.diffs?.map((diff) => ({
            key: diff.key,
            oldValue: diff.oldValue,
            newValue: diff.newValue,
          })) ?? [],
      })),
      comment: response.comment,
      users: (response as { users?: SonarQubeHotspotDetails['users'] }).users,
    };
  }

  /**
   * Update the status of a hotspot
   * @param params Update parameters
   * @returns Promise that resolves when the update is complete
   */
  async updateHotspotStatus(params: HotspotStatusUpdateParams): Promise<void> {
    const request: {
      hotspot: string;
      status: 'TO_REVIEW' | 'REVIEWED';
      resolution?: 'FIXED' | 'SAFE';
      comment?: string;
    } = {
      hotspot: params.hotspot,
      status: params.status,
    };

    if (params.resolution !== undefined) {
      request.resolution = params.resolution;
    }
    if (params.comment !== undefined) {
      request.comment = params.comment;
    }

    await this.webApiClient.hotspots.changeStatus(request);
  }
}
