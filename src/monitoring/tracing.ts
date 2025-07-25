import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { resourceFromAttributes, defaultResource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { ZipkinExporter } from '@opentelemetry/exporter-zipkin';
import { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('Tracing');

let sdkInstance: NodeSDK | null = null;

export interface TracingOptions {
  enabled?: boolean;
  serviceName?: string;
  serviceVersion?: string;
  exporter?: 'otlp' | 'zipkin' | 'console';
  endpoint?: string;
  headers?: Record<string, string>;
  exportIntervalMillis?: number;
  exportTimeoutMillis?: number;
}

/**
 * Initialize OpenTelemetry tracing
 */
export function initializeTracing(options: TracingOptions = {}): NodeSDK | null {
  if (!options.enabled && process.env.OTEL_TRACES_EXPORTER === undefined) {
    logger.info('OpenTelemetry tracing is disabled');
    return null;
  }

  try {
    const serviceName =
      options.serviceName ?? process.env.OTEL_SERVICE_NAME ?? 'sonarqube-mcp-server';
    const serviceVersion = options.serviceVersion ?? process.env.npm_package_version ?? '1.5.1';

    // Create resource
    const resource = defaultResource().merge(
      resourceFromAttributes({
        [ATTR_SERVICE_NAME]: serviceName,
        [ATTR_SERVICE_VERSION]: serviceVersion,
      })
    );

    // Create trace exporter based on configuration
    const traceExporter = createTraceExporter(options);

    // Create metric exporter
    const metricExporter = new OTLPMetricExporter({
      url:
        options.endpoint ??
        process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT ??
        'http://localhost:4318/v1/metrics',
      headers: options.headers ?? parseHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS),
      timeoutMillis: options.exportTimeoutMillis ?? 10000,
    });

    // Create metric reader
    const metricReader = new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: options.exportIntervalMillis ?? 60000, // 60 seconds
    });

    // Create SDK
    const sdk = new NodeSDK({
      resource,
      traceExporter,
      metricReader,
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': {
            enabled: false, // Disable fs instrumentation to reduce noise
          },
          '@opentelemetry/instrumentation-http': {
            enabled: true,
            ignoreIncomingRequestHook: (request) => {
              // Ignore health check endpoints
              const url = request.url;
              return url === '/health' || url === '/ready' || url === '/metrics';
            },
          },
          '@opentelemetry/instrumentation-express': {
            enabled: true,
          },
        }),
      ],
    });

    // Initialize the SDK
    sdk.start();

    logger.info('OpenTelemetry tracing initialized', {
      serviceName,
      serviceVersion,
      exporter: options.exporter ?? 'otlp',
      endpoint: options.endpoint ?? 'default',
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      sdk
        .shutdown()
        .then(() => logger.info('OpenTelemetry SDK shut down successfully'))
        .catch((error) => logger.error('Error shutting down OpenTelemetry SDK', error));
    });

    sdkInstance = sdk;
    return sdk;
  } catch (error) {
    logger.error('Failed to initialize OpenTelemetry tracing', error);
    return null;
  }
}

/**
 * Create trace exporter based on configuration
 */
function createTraceExporter(options: TracingOptions) {
  const exporterType = options.exporter ?? process.env.OTEL_TRACES_EXPORTER ?? 'otlp';

  switch (exporterType) {
    case 'zipkin':
      return new ZipkinExporter({
        url:
          options.endpoint ??
          process.env.OTEL_EXPORTER_ZIPKIN_ENDPOINT ??
          'http://localhost:9411/api/v2/spans',
      });

    case 'otlp':
    default:
      // Note: For Jaeger, use OTLP exporter with Jaeger's OTLP endpoint (typically port 4317 for gRPC or 4318 for HTTP)
      return new OTLPTraceExporter({
        url:
          options.endpoint ??
          process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ??
          'http://localhost:4318/v1/traces',
        headers: options.headers ?? parseHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS),
        timeoutMillis: options.exportTimeoutMillis ?? 10000,
      });
  }
}

/**
 * Parse headers from environment variable format
 */
function parseHeaders(headersStr?: string): Record<string, string> {
  if (!headersStr) return {};

  const headers: Record<string, string> = {};
  const pairs = headersStr.split(',');

  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx !== -1) {
      const key = pair.slice(0, idx).trim();
      const value = pair.slice(idx + 1).trim();
      headers[key] = value;
    }
  }

  return headers;
}

/**
 * Get the global tracer
 */
export function getTracer(name: string = 'sonarqube-mcp-server') {
  return trace.getTracer(name);
}

/**
 * Create a span for an MCP tool execution
 */
export async function traceMcpTool<T>(toolName: string, operation: () => Promise<T>): Promise<T> {
  const tracer = getTracer();
  const span = tracer.startSpan(`mcp.tool.${toolName}`, {
    kind: SpanKind.INTERNAL,
    attributes: {
      'mcp.tool.name': toolName,
    },
  });

  try {
    const result = await context.with(trace.setSpan(context.active(), span), operation);
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.recordException(error as Error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Create a span for a SonarQube API call
 */
export async function traceSonarQubeApi<T>(
  endpoint: string,
  operation: () => Promise<T>
): Promise<T> {
  const tracer = getTracer();
  const span = tracer.startSpan(`sonarqube.api.${endpoint}`, {
    kind: SpanKind.CLIENT,
    attributes: {
      'sonarqube.api.endpoint': endpoint,
      'http.method': 'GET', // Most SonarQube API calls are GET
    },
  });

  const startTime = Date.now();

  try {
    const result = await context.with(trace.setSpan(context.active(), span), operation);

    span.setAttributes({
      'sonarqube.api.duration_ms': Date.now() - startTime,
      'sonarqube.api.success': true,
    });
    span.setStatus({ code: SpanStatusCode.OK });

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    span.setAttributes({
      'sonarqube.api.duration_ms': Date.now() - startTime,
      'sonarqube.api.success': false,
      'sonarqube.api.error': errorMessage,
    });
    span.recordException(error as Error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: errorMessage,
    });

    throw error;
  } finally {
    span.end();
  }
}

/**
 * Add custom attributes to the current span
 */
export function addSpanAttributes(attributes: Record<string, unknown>): void {
  const span = trace.getActiveSpan();
  if (span) {
    // Convert unknown values to appropriate attribute types
    const cleanedAttributes: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(attributes)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        cleanedAttributes[key] = value;
      } else if (value != null) {
        cleanedAttributes[key] = JSON.stringify(value);
      }
    }
    span.setAttributes(cleanedAttributes);
  }
}

/**
 * Add an event to the current span
 */
export function addSpanEvent(name: string, attributes?: Record<string, unknown>): void {
  const span = trace.getActiveSpan();
  if (span) {
    if (attributes) {
      // Convert unknown values to appropriate attribute types
      const cleanedAttributes: Record<string, string | number | boolean> = {};
      for (const [key, value] of Object.entries(attributes)) {
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          cleanedAttributes[key] = value;
        } else if (value != null) {
          cleanedAttributes[key] = String(value);
        }
      }
      span.addEvent(name, cleanedAttributes);
    } else {
      span.addEvent(name);
    }
  }
}

/**
 * Shutdown tracing
 */
export async function shutdownTracing(): Promise<void> {
  if (sdkInstance) {
    try {
      await sdkInstance.shutdown();
      logger.info('OpenTelemetry SDK shut down successfully');
    } catch (error) {
      logger.error('Error shutting down OpenTelemetry SDK', error);
    }
    sdkInstance = null;
  }
}
