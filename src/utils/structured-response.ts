import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

/**
 * Creates a structured response for MCP tools that includes both text content
 * (for backward compatibility) and structured content (for better machine readability)
 *
 * @param data The structured data to return
 * @returns A CallToolResult with both text and structured content
 */
export function createStructuredResponse(data: unknown): CallToolResult {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
    structuredContent: data as Record<string, unknown>,
  };
}

/**
 * Creates a simple text response without structured content
 *
 * @param text The text content to return
 * @returns A CallToolResult with only text content
 */
export function createTextResponse(text: string): CallToolResult {
  return {
    content: [
      {
        type: 'text' as const,
        text,
      },
    ],
  };
}

/**
 * Creates an error response with optional structured error details
 *
 * @param message The error message
 * @param details Optional structured error details
 * @returns A CallToolResult marked as an error
 */
export function createErrorResponse(message: string, details?: unknown): CallToolResult {
  const errorData: Record<string, unknown> = {
    error: message,
  };

  if (details !== undefined) {
    errorData.details = details;
  }

  return {
    content: [
      {
        type: 'text' as const,
        text: message,
      },
    ],
    structuredContent: errorData,
    isError: true,
  };
}
