# 26. Circuit Breaker Pattern with opossum

Date: 2025-10-11

## Status

Accepted

## Context

The SonarQube MCP Server integrates with external services (SonarQube API, SonarCloud API) that may experience temporary outages, slow responses, or intermittent failures. Without protective mechanisms, cascading failures can occur:

- **Cascading Failures**: Failed external calls can cause the entire service to become unresponsive
- **Resource Exhaustion**: Hanging requests consume threads, memory, and connections
- **Slow Response Times**: Timeouts accumulate, degrading user experience
- **No Fault Isolation**: Failures in one service affect the entire application
- **Poor Observability**: Difficult to track and diagnose external service issues

Traditional retry mechanisms alone don't solve these problems:

- Simple retries amplify load on failing services
- Exponential backoff helps but doesn't prevent cascading failures
- No mechanism to "fail fast" when a service is known to be down

The Circuit Breaker pattern addresses these issues by:

1. Monitoring external service health
2. Failing fast when a service is unhealthy
3. Automatically recovering when the service becomes healthy
4. Providing observability into service health

Library options considered:

- **opossum**: Battle-tested Node.js library, rich features, good TypeScript support
- **cockatiel**: Modern, TypeScript-first, but less mature ecosystem
- **brakes**: Simpler but less actively maintained
- **Custom implementation**: Full control but significant development and testing effort

## Decision

We will use **opossum** as the circuit breaker library, wrapped in a factory pattern for consistent configuration and monitoring integration.

### Core Architecture

**CircuitBreakerFactory** (`src/monitoring/circuit-breaker.ts`):

- Singleton pattern for managing circuit breakers
- Consistent configuration across all breakers
- Integrated metrics and logging
- Type-safe wrapper functions

### Configuration

**Default Circuit Breaker Settings**:

```typescript
{
  timeout: 10000,                    // 10 seconds - fail if request exceeds
  errorThresholdPercentage: 50,      // Open circuit if 50% of requests fail
  resetTimeout: 30000,                // 30 seconds - try again after this period
  rollingCountTimeout: 10000,         // 10 second rolling window for stats
  rollingCountBuckets: 10,            // 10 buckets (1 second each)
  volumeThreshold: 5                  // Minimum 5 requests before triggering
}
```

**Circuit States**:

1. **CLOSED** (normal): Requests pass through
2. **OPEN** (failing): Requests immediately rejected (fail fast)
3. **HALF_OPEN** (testing): Allow one request to test if service recovered

### Usage Patterns

#### 1. Factory Pattern (Recommended)

```typescript
import { CircuitBreakerFactory } from './monitoring/circuit-breaker.js';

const breaker = CircuitBreakerFactory.getBreaker(
  'sonarqube-api',
  async (projectKey: string) => {
    return await sonarqubeClient.getProject(projectKey);
  },
  {
    timeout: 15000, // Custom timeout for this operation
    volumeThreshold: 10,
  }
);

// Use the breaker
const result = await breaker.fire('my-project-key');
```

#### 2. Function Wrapper Pattern

```typescript
import { wrapWithCircuitBreaker } from './monitoring/circuit-breaker.js';

const getProjectWithCircuitBreaker = wrapWithCircuitBreaker(
  'get-project',
  async (projectKey: string) => {
    return await sonarqubeClient.getProject(projectKey);
  }
);

// Use the wrapped function
const result = await getProjectWithCircuitBreaker('my-project-key');
```

#### 3. Decorator Pattern (Method-level)

```typescript
import { withCircuitBreaker } from './monitoring/circuit-breaker.js';

class SonarQubeService {
  @withCircuitBreaker('sonarqube-service', { timeout: 15000 })
  async getProject(projectKey: string) {
    return await this.client.getProject(projectKey);
  }
}
```

### Event-Driven Monitoring

Circuit breakers emit events for observability:

**State Change Events**:

- `open`: Circuit opened due to failure threshold
- `close`: Circuit closed (recovered)
- `halfOpen`: Circuit testing recovery

**Request Events**:

- `success`: Request succeeded
- `failure`: Request failed
- `timeout`: Request timed out
- `reject`: Request rejected (circuit open)

**Metrics Integration**:

```typescript
breaker.on('open', () => {
  updateCircuitBreakerMetrics(name, 'open');
  logger.warn('Circuit breaker opened', { name });
});

breaker.on('failure', (error) => {
  trackCircuitBreakerFailure(name);
  logger.debug('Request failed', { name, error: error.message });
});
```

### Error Filtering

Custom error filtering for selective circuit breaking:

```typescript
const breaker = CircuitBreakerFactory.getBreaker('sonarqube-api', fetchFunction, {
  errorFilter: (error) => {
    // Don't count 404s as failures
    if (error.message.includes('404')) return false;

    // Don't count authentication errors
    if (error.message.includes('401')) return false;

    // Count all other errors
    return true;
  },
});
```

## Consequences

### Positive

- **Cascading Failure Prevention**: Failed services don't bring down the entire application
- **Fail Fast**: Immediate rejection when service is down (no waiting for timeouts)
- **Automatic Recovery**: Circuit automatically tests and recovers when service is healthy
- **Resource Protection**: Prevents resource exhaustion from hanging requests
- **Observability**: Rich metrics and events for monitoring external service health
- **Consistent Configuration**: Factory pattern ensures uniform settings
- **Type Safety**: TypeScript generics provide type-safe circuit breaker calls
- **Flexible Usage**: Multiple patterns (factory, wrapper, decorator) for different use cases
- **Metrics Integration**: Built-in integration with monitoring system
- **Battle-Tested**: opossum is production-proven with years of usage
- **Selective Breaking**: Error filtering allows fine-grained control

### Negative

- **Complexity**: Adds another layer of abstraction and configuration
- **False Positives**: Circuit may open due to temporary network blips
- **Configuration Overhead**: Need to tune parameters for each service
- **Delayed Recovery**: ResetTimeout means delayed recovery even if service recovers immediately
- **Testing Complexity**: Need to test circuit breaker behavior in unit/integration tests
- **Dependency**: Adds opossum as a runtime dependency
- **State Management**: Circuit breaker state is in-memory (not shared across instances)

### Neutral

- **Performance Overhead**: Minimal overhead for healthy services (< 1ms)
- **Memory Usage**: Small memory footprint for state tracking
- **Learning Curve**: Team needs to understand circuit breaker pattern
- **Error Handling**: Need to handle circuit breaker exceptions separately from service errors

## Implementation

### Installation

```bash
pnpm add opossum
pnpm add -D @types/opossum
```

### Basic Usage Example

```typescript
import { CircuitBreakerFactory } from './monitoring/circuit-breaker.js';

// Create a circuit breaker for SonarQube API calls
const breaker = CircuitBreakerFactory.getBreaker(
  'sonarqube-issues-search',
  async (projectKey: string, severity: string) => {
    // This function will be protected by the circuit breaker
    const response = await fetch(
      `${baseUrl}/api/issues/search?projectKeys=${projectKey}&severities=${severity}`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!response.ok) {
      throw new Error(`SonarQube API returned ${response.status}`);
    }

    return response.json();
  },
  {
    timeout: 15000, // 15 second timeout
    errorThresholdPercentage: 40, // Open at 40% failure rate
    volumeThreshold: 10, // Need 10 requests before circuit can open
  }
);

// Use the circuit breaker
try {
  const issues = await breaker.fire('my-project', 'CRITICAL');
  console.log('Found issues:', issues.total);
} catch (error) {
  if (error.message.includes('breaker is open')) {
    // Circuit is open - service is known to be failing
    console.error('SonarQube API is currently unavailable');
  } else {
    // Individual request failed
    console.error('Request failed:', error.message);
  }
}
```

### Advanced Configuration

```typescript
const breaker = CircuitBreakerFactory.getBreaker('sonarqube-quality-gates', fetchQualityGate, {
  // Timing
  timeout: 20000, // 20 second timeout
  resetTimeout: 60000, // Try recovery after 60 seconds

  // Failure thresholds
  errorThresholdPercentage: 30, // Open at 30% failure rate
  volumeThreshold: 20, // Need 20 requests minimum

  // Rolling window
  rollingCountTimeout: 20000, // 20 second rolling window
  rollingCountBuckets: 20, // 20 buckets (1 second each)

  // Error filtering
  errorFilter: (error: Error) => {
    // Don't count 404 as failures
    return !error.message.includes('404');
  },
});
```

### Monitoring Circuit Breaker Health

```typescript
import { CircuitBreakerFactory } from './monitoring/circuit-breaker.js';

// Get statistics for a specific circuit breaker
const stats = CircuitBreakerFactory.getStats('sonarqube-api');

if (stats) {
  console.log({
    successCount: stats.successes,
    failureCount: stats.failures,
    rejectedCount: stats.rejects,
    timeoutCount: stats.timeouts,
    averageResponseTime: stats.latencyMean,
    percentiles: {
      p50: stats.percentiles[50],
      p95: stats.percentiles[95],
      p99: stats.percentiles[99],
    },
  });
}

// Get all circuit breakers
const allBreakers = CircuitBreakerFactory.getAllBreakers();
for (const [name, breaker] of allBreakers) {
  console.log(`${name}: ${breaker.opened ? 'OPEN' : 'CLOSED'}`);
}
```

### Testing with Circuit Breakers

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { CircuitBreakerFactory } from './circuit-breaker.js';

describe('Circuit Breaker', () => {
  beforeEach(() => {
    // Reset circuit breakers between tests
    CircuitBreakerFactory.reset();
  });

  it('should open circuit after failure threshold', async () => {
    const failingFunction = async () => {
      throw new Error('Service unavailable');
    };

    const breaker = CircuitBreakerFactory.getBreaker('test-service', failingFunction, {
      errorThresholdPercentage: 50,
      volumeThreshold: 3,
      timeout: 1000,
    });

    // Trigger failures to open circuit
    for (let i = 0; i < 5; i++) {
      try {
        await breaker.fire();
      } catch (error) {
        // Expected to fail
      }
    }

    // Circuit should now be open
    expect(breaker.opened).toBe(true);

    // Next request should be rejected immediately
    await expect(breaker.fire()).rejects.toThrow('breaker is open');
  });
});
```

### Graceful Shutdown

```typescript
import { CircuitBreakerFactory } from './monitoring/circuit-breaker.js';

// On application shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down circuit breakers...');
  CircuitBreakerFactory.shutdown();
  console.log('Circuit breakers shut down');
  process.exit(0);
});
```

## State Machine Diagram

```
                     ┌────────────────────────┐
                     │                        │
                     │       CLOSED           │
                     │  (Normal Operation)    │
                     │                        │
                     └───────────┬────────────┘
                                 │
                                 │ Failure threshold
                                 │ exceeded
                                 ↓
                     ┌────────────────────────┐
                     │                        │
                     │        OPEN            │
                     │   (Fail Fast Mode)     │
                     │                        │
                     └───────────┬────────────┘
                                 │
                                 │ Reset timeout
                                 │ elapsed
                                 ↓
                     ┌────────────────────────┐
                     │                        │
                     │      HALF_OPEN         │
                     │   (Testing Recovery)   │
                     │                        │
                     └───┬───────────┬────────┘
                         │           │
                         │ Success   │ Failure
                         ↓           ↓
                       CLOSED       OPEN
```

## Examples

### Example 1: SonarQube API Integration

```typescript
import { wrapWithCircuitBreaker } from './monitoring/circuit-breaker.js';
import { SonarQubeClient } from './sonarqube-client.js';

const client = new SonarQubeClient(config);

// Wrap API calls with circuit breaker
export const searchIssues = wrapWithCircuitBreaker(
  'sonarqube.searchIssues',
  async (params: IssueSearchParams) => {
    return await client.issues.search(params);
  },
  {
    timeout: 15000,
    errorThresholdPercentage: 40,
  }
);

export const getProject = wrapWithCircuitBreaker(
  'sonarqube.getProject',
  async (key: string) => {
    return await client.projects.get(key);
  },
  {
    timeout: 10000,
    errorThresholdPercentage: 50,
  }
);
```

### Example 2: Handling Circuit Breaker States

```typescript
import { CircuitBreakerFactory } from './monitoring/circuit-breaker.js';

async function fetchWithFallback(projectKey: string) {
  const breaker = CircuitBreakerFactory.getBreaker('sonarqube-api', async (key: string) => {
    return await sonarqubeClient.getProject(key);
  });

  try {
    return await breaker.fire(projectKey);
  } catch (error) {
    if (error.message.includes('breaker is open')) {
      // Circuit is open - return cached data or default
      console.warn('Circuit breaker is open, using fallback');
      return getCachedProject(projectKey);
    }

    // Other error - propagate
    throw error;
  }
}
```

### Example 3: Custom Error Handling

```typescript
const breaker = CircuitBreakerFactory.getBreaker('sonarqube-with-filter', fetchData, {
  errorFilter: (error: Error) => {
    // Don't count 404 (not found) as a failure
    if (error.message.includes('404')) {
      return false;
    }

    // Don't count 401/403 (auth errors) as failures
    if (error.message.includes('401') || error.message.includes('403')) {
      return false;
    }

    // Count 500-level errors and timeouts
    return true;
  },
});
```

## References

- opossum Documentation: https://nodeshift.dev/opossum/
- opossum GitHub: https://github.com/nodeshift/opossum
- Circuit Breaker Pattern: https://martinfowler.com/bliki/CircuitBreaker.html
- Implementation: src/monitoring/circuit-breaker.ts
- Tests: src/monitoring/**tests**/circuit-breaker.test.ts
- Related ADR: ADR-0018 (Comprehensive Monitoring and Observability)
- Metrics Integration: src/monitoring/metrics.ts
