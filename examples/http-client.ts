/**
 * Example HTTP client for the SonarQube MCP Server with HTTP transport.
 * This demonstrates how to interact with the MCP server over HTTP.
 *
 * To run this example:
 * 1. Start the server with HTTP transport:
 *    MCP_TRANSPORT_TYPE=http MCP_HTTP_PORT=3000 pnpm start
 * 2. Run this client:
 *    npx tsx examples/http-client.ts
 */

interface McpHttpRequest {
  sessionId?: string;
  method: string;
  params?: unknown;
}

interface McpHttpResponse {
  sessionId?: string;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

class McpHttpClient {
  private sessionId?: string;
  private baseUrl: string;

  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  /**
   * Check server health.
   */
  async health(): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}/health`);
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Initialize a new session.
   */
  async connect(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to create session: ${response.statusText}`);
    }

    const data = await response.json();
    this.sessionId = data.sessionId;
    // Session created successfully
  }

  /**
   * Call an MCP method.
   */
  async call(method: string, params?: unknown): Promise<unknown> {
    if (!this.sessionId) {
      throw new Error('Not connected. Call connect() first.');
    }

    const request: McpHttpRequest = {
      sessionId: this.sessionId,
      method,
      params,
    };

    const response = await fetch(`${this.baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`MCP call failed: ${response.statusText}`);
    }

    const data = (await response.json()) as McpHttpResponse;

    if (data.error) {
      throw new Error(`MCP error: ${data.error.message}`);
    }

    return data.result;
  }

  /**
   * Connect to server-sent events for notifications.
   */
  connectToEvents(onMessage: (data: unknown) => void): EventSource {
    if (!this.sessionId) {
      throw new Error('Not connected. Call connect() first.');
    }

    // Note: EventSource is not available in Node.js by default
    // You'd need to use a library like 'eventsource' for Node.js
    if (typeof EventSource === 'undefined') {
      throw new Error('EventSource not available. Install "eventsource" package for Node.js.');
    }

    const eventSource = new EventSource(`${this.baseUrl}/events/${this.sessionId}`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage(data);
    };

    eventSource.onerror = (error) => {
      throw new Error(`SSE error: ${error}`);
    };

    return eventSource;
  }

  /**
   * Disconnect and cleanup session.
   */
  async disconnect(): Promise<void> {
    if (!this.sessionId) {
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/session/${this.sessionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to close session: ${response.statusText}`);
      }
    } catch {
      // Ignore errors during cleanup
    } finally {
      this.sessionId = undefined;
    }
  }
}

// Example usage
async function main() {
  /* eslint-disable no-console */
  const client = new McpHttpClient();

  try {
    // Check server health
    console.log('Checking server health...');
    const health = await client.health();
    console.log('Server health:', health);

    // Connect to the server
    console.log('\nConnecting to server...');
    await client.connect();

    // Example MCP calls (these would need to be implemented in the server)
    console.log('\nMaking example MCP calls...');

    // List available tools
    const tools = await client.call('tools/list');
    console.log('Available tools:', tools);

    // Call a specific tool (example with SonarQube projects)
    const projects = await client.call('tools/execute', {
      name: 'projects',
      params: {
        page: 1,
        page_size: 10,
      },
    });
    console.log('Projects:', projects);

    // Connect to events for real-time notifications
    console.log('\nConnecting to server events...');
    const eventSource = client.connectToEvents((data) => {
      console.log('Event received:', data);
    });

    // Keep the connection open for a bit to receive events
    if (eventSource) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      eventSource.close();
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Always disconnect when done
    console.log('\nDisconnecting...');
    await client.disconnect();
  }
  /* eslint-enable no-console */
}

// Run the example if this file is executed directly
// Note: For ES modules, use import.meta.url comparison
// For CommonJS compatibility, we check if this is the main module
if (typeof require !== 'undefined' && require.main === module) {
  // eslint-disable-next-line no-console
  main().catch(console.error);
} else if (typeof import.meta !== 'undefined' && import.meta.url === `file://${process.argv[1]}`) {
  // ES module execution detection
  // eslint-disable-next-line no-console
  main().catch(console.error);
}

export { McpHttpClient };
