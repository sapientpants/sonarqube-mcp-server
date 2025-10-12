# 28. Session-Based HTTP Transport with Server-Sent Events

Date: 2025-10-12

## Status

Accepted

## Context

Following the removal of OAuth-based HTTP transport in ADR-0019, the SonarQube MCP Server operated exclusively with stdio transport. However, certain use cases emerged that required HTTP-based communication without the complexity of OAuth authentication:

### Use Cases Requiring HTTP Transport:

1. **Web-Based Clients**: Browser-based MCP clients that cannot use stdio
2. **Cloud Deployments**: Serverless and container environments where stdio is impractical
3. **Development and Testing**: Easier debugging with HTTP endpoints (curl, Postman, etc.)
4. **Service Integration**: RESTful APIs for integration with other systems
5. **Real-Time Notifications**: Server-sent events for push notifications to clients

### Requirements:

- Simpler than the OAuth-based approach (ADR-0016)
- No authentication/authorization complexity (delegated to gateways or external systems)
- Session management for stateful client connections
- Server-sent events (SSE) for server-to-client notifications
- Easy to deploy and configure
- Compatible with MCP gateway solutions

### Design Considerations:

Unlike the OAuth-based HTTP transport (ADR-0016) which included:

- Complex OAuth 2.0 token validation
- Service account management
- Permission filtering
- External IdP integration

The new HTTP transport focuses on:

- Simple session-based state management
- RESTful endpoints for MCP operations
- SSE for real-time updates
- Security via network controls (not application-level auth)

## Decision

We will implement a **session-based HTTP transport** with Server-Sent Events for real-time notifications. This transport provides HTTP access to MCP functionality without OAuth complexity.

### Architecture

#### Core Components

1. **HttpTransport** (`src/transports/http.ts`):
   - Express-based HTTP server
   - Implements `ITransport` interface
   - Session lifecycle management
   - RESTful endpoints for MCP operations

2. **SessionManager** (`src/transports/session-manager.ts`):
   - UUID-based session identifiers
   - Automatic session timeout and cleanup
   - Session statistics for monitoring
   - Configurable limits (max sessions, timeout duration)

3. **SSE Endpoint** (Server-Sent Events):
   - Real-time notifications to clients
   - Heartbeat mechanism for connection keep-alive
   - Automatic cleanup on client disconnect

#### HTTP Endpoints

```
POST   /session              Create new session
POST   /mcp                  Execute MCP operation (requires sessionId)
GET    /events/:sessionId    SSE connection for notifications
DELETE /session/:sessionId   Close session
GET    /health               Health check with session statistics
```

#### Session Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Workflow                          │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│  1. Create Session: POST /session                               │
│     Response: { "sessionId": "uuid", "message": "..." }         │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│  2. Open SSE Connection: GET /events/:sessionId                 │
│     - Receive: { "type": "connected", "sessionId": "..." }      │
│     - Heartbeat every 30 seconds                                │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│  3. Execute MCP Operations: POST /mcp                           │
│     Body: {                                                     │
│       "sessionId": "uuid",                                      │
│       "method": "tools/list",                                   │
│       "params": { ... }                                         │
│     }                                                           │
│     Response: { "sessionId": "uuid", "result": { ... } }       │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│  4. Close Session: DELETE /session/:sessionId                   │
│     Response: { "message": "Session closed successfully" }      │
└─────────────────────────────────────────────────────────────────┘
```

### Configuration

#### Environment Variables

```bash
# Enable HTTP transport (default: stdio)
MCP_TRANSPORT_TYPE=http

# HTTP server configuration
MCP_HTTP_PORT=3000                                    # Server port (default: 3000)
MCP_HTTP_ALLOWED_HOSTS=localhost,127.0.0.1,::1       # Allowed host headers
MCP_HTTP_ALLOWED_ORIGINS=*                            # CORS allowed origins
MCP_HTTP_SESSION_TIMEOUT=1800000                      # Session timeout in ms (default: 30 min)
MCP_HTTP_ENABLE_DNS_REBINDING_PROTECTION=false        # DNS rebinding protection (default: false)
```

#### Default Configuration

```typescript
{
  port: 3000,
  sessionTimeout: 1800000,           // 30 minutes
  enableDnsRebindingProtection: false,
  allowedHosts: ['localhost', '127.0.0.1', '::1'],
  allowedOrigins: ['*']
}
```

### Session Management

#### Session Lifecycle

1. **Creation**: Client calls `POST /session` → returns UUID
2. **Activity**: Each request updates `lastActivityAt` timestamp
3. **Timeout**: Inactive sessions expire after `sessionTimeout` (default: 30 minutes)
4. **Cleanup**: Automatic cleanup runs every 5 minutes
5. **Explicit Close**: Client calls `DELETE /session/:sessionId`

#### Session Limits

- **Maximum Concurrent Sessions**: 100 (configurable via `SessionManager`)
- **Session Timeout**: 30 minutes (configurable)
- **Cleanup Interval**: 5 minutes (configurable)

#### Session Statistics

Available via `GET /health`:

```json
{
  "status": "healthy",
  "transport": "http",
  "sessions": {
    "activeSessions": 5,
    "maxSessions": 100,
    "sessionTimeout": 1800000,
    "oldestSession": "2025-10-12T10:30:00.000Z",
    "newestSession": "2025-10-12T11:45:00.000Z"
  },
  "uptime": 3600
}
```

### Server-Sent Events (SSE)

#### SSE Endpoint: `GET /events/:sessionId`

Provides real-time, server-to-client notifications using the SSE protocol.

#### Event Types

```typescript
// Connection established
{ "type": "connected", "sessionId": "uuid" }

// Keep-alive heartbeat (every 30 seconds)
{ "type": "heartbeat" }

// Custom notifications (future extensibility)
{ "type": "notification", "data": { ... } }
```

#### Connection Management

- **Automatic Heartbeat**: Sent every 30 seconds to keep connection alive
- **Session Validation**: Connection closed if session expires
- **Client Disconnect**: Automatic cleanup when client closes connection

### Security Model

This HTTP transport deliberately does NOT implement authentication/authorization, instead relying on:

1. **Network-Level Security**: Deploy behind VPN, private network, or firewall
2. **Gateway Authentication**: Use MCP gateways for authentication (Docker MCP Gateway, IBM Context Forge, etc.)
3. **DNS Rebinding Protection**: Optional host header validation
4. **CORS Configuration**: Control allowed origins for browser-based clients
5. **Session Limits**: Prevent resource exhaustion (max 100 concurrent sessions)

### Example Client Implementation

```typescript
// TypeScript/JavaScript client example

// 1. Create session
const sessionResponse = await fetch('http://localhost:3000/session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
});
const { sessionId } = await sessionResponse.json();

// 2. Open SSE connection
const eventSource = new EventSource(`http://localhost:3000/events/${sessionId}`);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Server event:', data);
};

// 3. Execute MCP operations
async function callMcpMethod(method: string, params?: unknown) {
  const response = await fetch('http://localhost:3000/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      method,
      params,
    }),
  });
  return response.json();
}

// List available tools
const toolsResponse = await callMcpMethod('tools/list');
console.log('Available tools:', toolsResponse.result);

// Search SonarQube issues
const issuesResponse = await callMcpMethod('tools/call', {
  name: 'sonarqube_issues',
  arguments: {
    project_key: 'my-project',
    severity: 'CRITICAL',
  },
});
console.log('Issues:', issuesResponse.result);

// 4. Close session when done
await fetch(`http://localhost:3000/session/${sessionId}`, {
  method: 'DELETE',
});

// Close SSE connection
eventSource.close();
```

### Docker Deployment

```bash
# Docker run with HTTP transport
docker run -d \
  -e MCP_TRANSPORT_TYPE=http \
  -e MCP_HTTP_PORT=3000 \
  -e SONARQUBE_URL=https://sonarqube.company.com \
  -e SONARQUBE_TOKEN=your-token \
  -p 3000:3000 \
  sapientpants/sonarqube-mcp-server:latest

# Verify server is running
curl http://localhost:3000/health
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sonarqube-mcp-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: sonarqube-mcp-server
  template:
    metadata:
      labels:
        app: sonarqube-mcp-server
    spec:
      containers:
        - name: server
          image: sapientpants/sonarqube-mcp-server:latest
          env:
            - name: MCP_TRANSPORT_TYPE
              value: 'http'
            - name: MCP_HTTP_PORT
              value: '3000'
            - name: SONARQUBE_URL
              valueFrom:
                secretKeyRef:
                  name: sonarqube-config
                  key: url
            - name: SONARQUBE_TOKEN
              valueFrom:
                secretKeyRef:
                  name: sonarqube-config
                  key: token
          ports:
            - containerPort: 3000
              protocol: TCP
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: sonarqube-mcp-server
spec:
  type: ClusterIP
  ports:
    - port: 3000
      targetPort: 3000
      protocol: TCP
  selector:
    app: sonarqube-mcp-server
```

## Consequences

### Positive

- **Simplicity**: Much simpler than OAuth-based approach (ADR-0016)
- **Web-Ready**: Enables browser-based MCP clients and web applications
- **Real-Time Updates**: SSE provides push notifications to clients
- **Developer-Friendly**: Easy to test with curl, Postman, or browser DevTools
- **Stateless Design**: Session manager handles state, server logic remains stateless
- **Gateway Compatible**: Works with MCP gateways for enterprise features
- **Automatic Cleanup**: Session timeout prevents resource leaks
- **Monitoring**: Built-in health checks and session statistics
- **Cloud-Native**: Suitable for containerized and serverless deployments
- **CORS Support**: Enables cross-origin requests for browser clients

### Negative

- **No Built-in Authentication**: Security must be handled externally
- **Session Overhead**: Memory consumption for session storage (mitigated by limits)
- **Single-Server State**: Sessions not shared across multiple instances (requires sticky sessions or external session store)
- **SSE Browser Limitations**: Some older browsers have limited SSE support
- **Session Timeout Risk**: Long-running operations may hit timeout (30 min default)
- **CORS Complexity**: Requires proper configuration for production deployments

### Neutral

- **Transport Choice**: Users can choose between stdio (default) and HTTP based on needs
- **Complementary**: HTTP transport does not replace stdio, it complements it
- **Security Model**: Delegates authentication to infrastructure layer (gateways, network)
- **Configuration**: Requires environment variable configuration vs stdio's zero-config

## Implementation Notes

### Transport Selection

The transport is selected via environment variable or configuration:

```typescript
// src/transports/factory.ts
export class TransportFactory {
  static createFromEnvironment(): ITransport {
    const transportType = process.env.MCP_TRANSPORT_TYPE?.toLowerCase() || 'stdio';

    if (transportType === 'http') {
      // Parse HTTP configuration and create HttpTransport
      return new HttpTransport(options);
    }

    // Default to STDIO transport
    return new StdioTransport();
  }
}
```

### Session State Management

Sessions are stored in-memory using a `Map`:

```typescript
// src/transports/session-manager.ts
export class SessionManager {
  private readonly sessions: Map<string, ISession> = new Map();

  createSession(server: Server, metadata?: Record<string, unknown>): ISession {
    const sessionId = uuidv4();
    const session: ISession = {
      id: sessionId,
      server,
      createdAt: new Date(),
      lastActivityAt: new Date(),
      metadata,
    };

    this.sessions.set(sessionId, session);
    return session;
  }
}
```

### SSE Implementation

Server-Sent Events use standard HTTP/1.1 chunked transfer encoding:

```typescript
// Set SSE headers
res.writeHead(200, {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
});

// Send event
res.write(`data: ${JSON.stringify({ type: 'connected', sessionId })}\n\n`);

// Heartbeat interval
const heartbeatInterval = setInterval(() => {
  if (!this.sessionManager.hasSession(sessionId)) {
    clearInterval(heartbeatInterval);
    res.end();
    return;
  }
  res.write(`data: ${JSON.stringify({ type: 'heartbeat' })}\n\n`);
}, 30000);
```

### Middleware Stack

Express middleware provides:

1. JSON body parsing (10MB limit)
2. CORS with origin validation
3. Optional DNS rebinding protection
4. Request logging
5. Global error handling

## Comparison with ADR-0016

### OAuth-Based HTTP Transport (ADR-0016) - Removed in ADR-0019

- ✗ OAuth 2.0 token validation
- ✓ Service account management
- ✓ Permission filtering
- ✓ External IdP integration
- ✓ Built-in authentication
- ✗ 60+ auth-related files
- ✗ High complexity
- ✗ JWT validation overhead
- ✗ Bearer token management

### Session-Based HTTP Transport (ADR-0028) - Current

- ✗ No built-in authentication (delegated to gateways)
- ✓ Session management
- ✓ Server-Sent Events (SSE)
- ✓ Health checks
- ✓ Simple configuration
- ✓ Low complexity (~500 LOC)
- ✓ Fast performance (no auth overhead)
- ✓ UUID-based sessions
- ✓ Automatic cleanup

## Related ADRs

- **ADR-0010**: Use stdio transport for MCP communication (original transport)
- **ADR-0016**: HTTP transport with OAuth 2.0 (superseded by ADR-0019)
- **ADR-0019**: Simplify to stdio-only transport (removed OAuth HTTP)
- **ADR-0015**: Transport architecture refactoring (ITransport interface)
- **ADR-0011**: Docker containerization (deployment with HTTP transport)
- **ADR-0018**: Comprehensive monitoring (health checks integration)

## References

- Implementation: `src/transports/http.ts`
- Session Manager: `src/transports/session-manager.ts`
- Transport Factory: `src/transports/factory.ts`
- Base Interface: `src/transports/base.ts`
- Server-Sent Events Specification: https://html.spec.whatwg.org/multipage/server-sent-events.html
- MCP Specification: https://modelcontextprotocol.io/docs/specification
- Express Documentation: https://expressjs.com/
- CORS Documentation: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
