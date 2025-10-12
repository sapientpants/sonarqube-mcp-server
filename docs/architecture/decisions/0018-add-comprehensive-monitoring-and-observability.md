# 18. Add comprehensive monitoring and observability

Date: 2025-01-25
Updated: 2025-10-11 (Added circuit breaker details and cross-references)

## Status

Accepted

## Context

As we move towards enterprise deployment of the SonarQube MCP Server, we need comprehensive monitoring, observability, and operational features. The system needs to provide:

1. **Production Readiness**: Health checks, readiness probes, and dependency monitoring for container orchestration
2. **Performance Insights**: Metrics on request latency, throughput, and resource usage
3. **Operational Visibility**: Error rates, authentication failures, and service account usage patterns
4. **Troubleshooting Capabilities**: Distributed tracing to diagnose issues across service boundaries
5. **SLA Compliance**: Monitor and report on service level objectives

Current monitoring capabilities include:

- Basic health checks for service accounts
- File-based logging with audit trail
- Error handling with retry mechanisms
- No structured metrics collection
- No distributed tracing
- Limited performance monitoring

## Decision

We will implement a comprehensive monitoring and observability stack with the following components:

### 1. Prometheus Metrics

- Expose metrics endpoint at `/metrics` (configurable)
- Use `prom-client` library for Node.js
- Implement custom metrics:
  - Request counters by tool and status
  - Request duration histograms
  - Authentication failure counters
  - Active session gauges
  - Service account usage metrics
  - Permission denial counters
  - Error rate by type

### 2. OpenTelemetry Tracing

- Use `@opentelemetry/api` and related packages
- Support multiple exporters (Jaeger, Zipkin, OTLP)
- Trace MCP requests through the system
- Include SonarQube API calls in traces
- Add custom spans for key operations

### 3. Enhanced Health Checks

- Extend existing `/health` endpoint with dependency status
- Add `/ready` endpoint for Kubernetes readiness probes
- Check connectivity to:
  - SonarQube API
  - Authorization server (if enabled)
  - External IdP (if configured)
- Include version information and uptime

### 4. Performance Monitoring

- Track request latency percentiles (p50, p95, p99)
- Monitor throughput (requests per second)
- Resource usage (CPU, memory, event loop lag)
- Connection pool statistics
- Cache hit rates

### 5. Operational Features

- **Circuit breakers** using `opossum` library
  - Implemented via `CircuitBreakerFactory` pattern (see ADR-0026)
  - Default thresholds: 50% error rate, 10-second timeout, 30-second reset
  - Event-driven monitoring integration:
    - `open` event: Circuit opened due to failures → metrics updated
    - `close` event: Circuit recovered → metrics updated
    - `halfOpen` event: Testing recovery → logged for observability
    - `failure` event: Request failed → failure counter incremented
    - `timeout` event: Request timed out → timeout metrics tracked
    - `reject` event: Request rejected (circuit open) → rejection counter incremented
  - Metrics tracked:
    - Circuit breaker state (open/closed/half-open)
    - Failure count per breaker
    - Rejection count per breaker
    - Success/failure ratio
    - Request latency percentiles
  - See ADR-0026 for complete circuit breaker documentation
- Connection pooling with `undici` or `got`
- Graceful degradation when dependencies fail
- Request rate limiting enhancements

### Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   MCP Client    │────▶│  HTTP Transport  │────▶│ Metrics Service │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │                           │
                               ▼                           ▼
                        ┌──────────────────┐     ┌─────────────────┐
                        │ Tracing Service  │     │   Prometheus    │
                        └──────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │  Jaeger/Zipkin   │
                        └──────────────────┘
```

## Consequences

### Positive

- **Production Ready**: Full observability for enterprise deployments
- **Proactive Monitoring**: Identify issues before they impact users
- **Performance Optimization**: Data-driven performance improvements
- **Troubleshooting**: Quickly diagnose issues with distributed tracing
- **Compliance**: Meet enterprise SLA requirements
- **Integration**: Works with existing monitoring infrastructure
- **Resilience**: Circuit breakers prevent cascading failures and provide fail-fast behavior
- **Observability**: Circuit breaker events integrated with metrics for real-time failure detection

### Negative

- **Complexity**: Additional dependencies and configuration
- **Performance Overhead**: Metrics and tracing add some overhead
- **Storage Requirements**: Metrics and traces require retention storage
- **Learning Curve**: Teams need to understand monitoring tools

### Implementation Plan

1. **Phase 1: Metrics** (Week 1)
   - Add Prometheus client library
   - Implement core metrics
   - Create metrics endpoint
   - Add configuration options

2. **Phase 2: Tracing** (Week 1)
   - Add OpenTelemetry SDK
   - Instrument key operations
   - Configure exporters
   - Test with Jaeger

3. **Phase 3: Health & Performance** (Week 2)
   - Enhance health endpoints
   - Add dependency checks
   - Implement performance metrics
   - Add circuit breakers

4. **Phase 4: Testing & Documentation** (Week 2)
   - Comprehensive testing
   - Performance benchmarks
   - Documentation updates
   - Deployment guides

## References

- [Prometheus Best Practices](https://prometheus.io/docs/practices/naming/)
- [OpenTelemetry Node.js](https://opentelemetry.io/docs/instrumentation/js/)
- [The RED Method](https://www.weave.works/blog/the-red-method-key-metrics-for-microservices-architecture/)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
- ADR-0026: Circuit Breaker Pattern with opossum (complete implementation details)
- Implementation: `src/monitoring/circuit-breaker.ts`
- Metrics Implementation: `src/monitoring/metrics.ts`
