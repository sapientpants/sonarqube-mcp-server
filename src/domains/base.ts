import { SonarQubeClient as WebApiClient } from 'sonarqube-web-api-client';
import { createLogger } from '../utils/logger.js';

/**
 * Base class for all domain modules
 */
export abstract class BaseDomain {
  protected readonly logger = createLogger(this.constructor.name);

  constructor(
    protected readonly webApiClient: WebApiClient,
    protected readonly organization: string | null
  ) {}
}
