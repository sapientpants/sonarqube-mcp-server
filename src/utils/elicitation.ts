import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { createLogger } from './logger.js';

export interface ElicitationOptions {
  enabled: boolean;
  bulkOperationThreshold: number;
  requireComments: boolean;
  interactiveSearch: boolean;
}

export interface ElicitationResult<T = unknown> {
  action: 'accept' | 'reject' | 'cancel' | 'decline';
  content?: T;
}

export const confirmationSchema = z.object({
  confirm: z.boolean().describe('Confirm the operation'),
  comment: z.string().max(500).optional().describe('Optional comment'),
});

export const authSchema = z
  .object({
    method: z.enum(['token', 'basic', 'passcode']).describe('Authentication method'),
    token: z.string().optional().describe('SonarQube token (for token auth)'),
    username: z.string().optional().describe('Username (for basic auth)'),
    password: z.string().optional().describe('Password (for basic auth)'),
    passcode: z.string().optional().describe('System passcode'),
  })
  .refine(
    (data) => {
      if (data.method === 'token' && !data.token) return false;
      if (data.method === 'basic' && (!data.username || !data.password)) return false;
      if (data.method === 'passcode' && !data.passcode) return false;
      return true;
    },
    {
      message: 'Required fields missing for selected authentication method',
    }
  );

export class ElicitationManager {
  private server: Server | null = null;
  private options: ElicitationOptions;
  private logger = createLogger('ElicitationManager');

  constructor(options: Partial<ElicitationOptions> = {}) {
    this.options = {
      enabled: false,
      bulkOperationThreshold: 5,
      requireComments: false,
      interactiveSearch: false,
      ...options,
    };
  }

  setServer(server: Server): void {
    this.server = server;
  }

  isEnabled(): boolean {
    return this.options.enabled && this.server !== null;
  }

  getOptions(): ElicitationOptions {
    return { ...this.options };
  }

  updateOptions(updates: Partial<ElicitationOptions>): void {
    this.options = { ...this.options, ...updates };
  }

  async confirmBulkOperation(
    operation: string,
    itemCount: number,
    items?: string[]
  ): Promise<ElicitationResult<z.infer<typeof confirmationSchema>>> {
    if (!this.isEnabled() || itemCount < this.options.bulkOperationThreshold) {
      return { action: 'accept', content: { confirm: true } };
    }

    if (!this.server) {
      throw new Error('ElicitationManager not initialized with server');
    }

    const itemsPreview = items?.slice(0, 5).join(', ');
    const hasMore = items && items.length > 5;

    try {
      let itemsDisplay = '';
      if (itemsPreview) {
        itemsDisplay = `: ${itemsPreview}`;
        if (hasMore) {
          itemsDisplay += ', ...';
        }
      }

      const result = await this.server.elicitInput({
        message: `You are about to ${operation} ${itemCount} items${itemsDisplay}. This action cannot be undone.`,
        requestedSchema: {
          ...zodToJsonSchema(confirmationSchema),
          type: 'object' as const,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          properties: (zodToJsonSchema(confirmationSchema) as any).properties ?? {},
        },
      });

      if (result.action === 'accept' && result.content) {
        const parsed = confirmationSchema.parse(result.content);
        if (!parsed.confirm) {
          return { action: 'reject' };
        }
        return { action: 'accept', content: parsed };
      }

      return {
        action: result.action,
        content: result.content as z.infer<typeof confirmationSchema>,
      };
    } catch (error) {
      this.logger.error('Elicitation error:', error);
      return { action: 'cancel' };
    }
  }

  async collectAuthentication(): Promise<ElicitationResult<z.infer<typeof authSchema>>> {
    if (!this.isEnabled()) {
      return { action: 'cancel' };
    }

    if (!this.server) {
      throw new Error('ElicitationManager not initialized with server');
    }

    try {
      const result = await this.server.elicitInput({
        message: `SonarQube authentication is not configured. Please provide authentication details:

Available methods:
1. Token authentication (recommended) - Generate a token in SonarQube under User > My Account > Security
2. Basic authentication - Username and password
3. System passcode - For SonarQube instances with system authentication

Which method would you like to use?`,
        requestedSchema: {
          ...zodToJsonSchema(authSchema),
          type: 'object' as const,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          properties: (zodToJsonSchema(authSchema) as any).properties ?? {},
        },
      });

      if (result.action === 'accept' && result.content) {
        const parsed = authSchema.parse(result.content);
        return { action: 'accept', content: parsed };
      }

      return {
        action: result.action,
        content: result.content as z.infer<typeof authSchema>,
      };
    } catch (error) {
      this.logger.error('Elicitation error:', error);
      return { action: 'cancel' };
    }
  }

  async collectResolutionComment(
    issueKey: string,
    resolution: string
  ): Promise<ElicitationResult<{ comment: string }>> {
    if (!this.isEnabled() || !this.options.requireComments) {
      return { action: 'accept', content: { comment: '' } };
    }

    if (!this.server) {
      throw new Error('ElicitationManager not initialized with server');
    }

    const commentSchema = z.object({
      comment: z.string().min(1).max(500).describe(`Explanation for marking as ${resolution}`),
    });

    try {
      const result = await this.server.elicitInput({
        message: `Please provide a comment explaining why issue ${issueKey} is being marked as ${resolution}:`,
        requestedSchema: {
          ...zodToJsonSchema(commentSchema),
          type: 'object' as const,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          properties: (zodToJsonSchema(commentSchema) as any).properties ?? {},
        },
      });

      if (result.action === 'accept' && result.content) {
        const parsed = commentSchema.parse(result.content);
        return { action: 'accept', content: { comment: parsed.comment } };
      }

      return { action: result.action };
    } catch (error) {
      this.logger.error('Elicitation error:', error);
      return { action: 'cancel' };
    }
  }

  async disambiguateSelection<T extends { name: string; key: string }>(
    items: T[],
    itemType: string
  ): Promise<ElicitationResult<{ selection: string }>> {
    if (!this.isEnabled() || !this.options.interactiveSearch || items.length <= 1) {
      return {
        action: 'accept',
        content: { selection: items[0]?.key || '' },
      };
    }

    if (!this.server) {
      throw new Error('ElicitationManager not initialized with server');
    }

    const selectionSchema = z.object({
      selection: z
        .enum(items.map((item) => item.key) as [string, ...string[]])
        .describe(`Select a ${itemType}`),
    });

    const itemsList = items
      .slice(0, 10)
      .map((item, i) => `${i + 1}. ${item.name} (${item.key})`)
      .join('\n');

    try {
      const result = await this.server.elicitInput({
        message: `Multiple ${itemType}s found. Please select one:\n\n${itemsList}`,
        requestedSchema: {
          ...zodToJsonSchema(selectionSchema),
          type: 'object' as const,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          properties: (zodToJsonSchema(selectionSchema) as any).properties ?? {},
        },
      });

      if (result.action === 'accept' && result.content) {
        const parsed = selectionSchema.parse(result.content);
        return { action: 'accept', content: { selection: parsed.selection } };
      }

      return { action: result.action };
    } catch (error) {
      this.logger.error('Elicitation error:', error);
      return { action: 'cancel' };
    }
  }
}

export const createElicitationManager = (
  options?: Partial<ElicitationOptions>
): ElicitationManager => {
  const envEnabled = process.env.SONARQUBE_MCP_ELICITATION === 'true';
  const envThreshold = process.env.SONARQUBE_MCP_BULK_THRESHOLD
    ? parseInt(process.env.SONARQUBE_MCP_BULK_THRESHOLD, 10)
    : undefined;
  const envRequireComments = process.env.SONARQUBE_MCP_REQUIRE_COMMENTS === 'true';
  const envInteractiveSearch = process.env.SONARQUBE_MCP_INTERACTIVE_SEARCH === 'true';

  const managerOptions: Partial<ElicitationOptions> = {
    enabled: envEnabled,
    requireComments: envRequireComments,
    interactiveSearch: envInteractiveSearch,
    ...options,
  };

  if (envThreshold !== undefined) {
    managerOptions.bulkOperationThreshold = envThreshold;
  }

  return new ElicitationManager(managerOptions);
};
