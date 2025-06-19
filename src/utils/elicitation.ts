import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

export interface ElicitationOptions {
  enabled: boolean;
  bulkOperationThreshold: number;
  requireComments: boolean;
  interactiveSearch: boolean;
}

export interface ElicitationResult<T = unknown> {
  action: 'accept' | 'reject' | 'cancel';
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        requestedSchema: zodToJsonSchema(confirmationSchema) as any,
      });

      if (result.action === 'accept' && result.content) {
        const parsed = confirmationSchema.parse(result.content);
        if (!parsed.confirm) {
          return { action: 'reject' };
        }
        return { action: 'accept', content: parsed };
      }

      return result as ElicitationResult<z.infer<typeof confirmationSchema>>;
    } catch (error) {
      console.error('Elicitation error:', error);
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        requestedSchema: zodToJsonSchema(authSchema) as any,
      });

      if (result.action === 'accept' && result.content) {
        const parsed = authSchema.parse(result.content);
        return { action: 'accept', content: parsed };
      }

      return result as ElicitationResult<z.infer<typeof authSchema>>;
    } catch (error) {
      console.error('Elicitation error:', error);
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        requestedSchema: zodToJsonSchema(commentSchema) as any,
      });

      if (result.action === 'accept' && result.content) {
        const parsed = commentSchema.parse(result.content);
        return { action: 'accept', content: parsed };
      }

      return result as ElicitationResult<{ comment: string }>;
    } catch (error) {
      console.error('Elicitation error:', error);
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        requestedSchema: zodToJsonSchema(selectionSchema) as any,
      });

      if (result.action === 'accept' && result.content) {
        const parsed = selectionSchema.parse(result.content);
        return { action: 'accept', content: parsed };
      }

      return result as ElicitationResult<{ selection: string }>;
    } catch (error) {
      console.error('Elicitation error:', error);
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

  return new ElicitationManager({
    enabled: envEnabled,
    bulkOperationThreshold: envThreshold ?? options?.bulkOperationThreshold,
    requireComments: envRequireComments ?? options?.requireComments,
    interactiveSearch: envInteractiveSearch ?? options?.interactiveSearch,
    ...options,
  });
};
