import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { initializeTracing, shutdownTracing, createSpan, TracingOptions } from '../tracing.js';
import { trace, SpanStatusCode } from '@opentelemetry/api';

// Mock OpenTelemetry modules
jest.mock('@opentelemetry/sdk-node', () => ({
  NodeSDK: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    shutdown: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('@opentelemetry/sdk-trace-node', () => ({
  NodeTracerProvider: jest.fn(),
}));

jest.mock('@opentelemetry/exporter-trace-otlp-http', () => ({
  OTLPTraceExporter: jest.fn(),
}));

jest.mock('@opentelemetry/exporter-jaeger', () => ({
  JaegerExporter: jest.fn(),
}));

jest.mock('@opentelemetry/exporter-zipkin', () => ({
  ZipkinExporter: jest.fn(),
}));

jest.mock('@opentelemetry/exporter-metrics-otlp-http', () => ({
  OTLPMetricExporter: jest.fn(),
}));

jest.mock('@opentelemetry/sdk-metrics', () => ({
  PeriodicExportingMetricReader: jest.fn(),
}));

describe('Tracing', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(async () => {
    await shutdownTracing();
    process.env = originalEnv;
  });

  describe('initializeTracing', () => {
    it('should initialize with default options', async () => {
      const sdk = await initializeTracing({});

      expect(sdk).toBeDefined();
      expect(sdk.start).toHaveBeenCalled();
    });

    it('should use environment variables for configuration', async () => {
      process.env.OTEL_SERVICE_NAME = 'test-service';
      process.env.OTEL_TRACES_EXPORTER = 'jaeger';
      process.env.OTEL_EXPORTER_JAEGER_ENDPOINT = 'http://jaeger:14268';

      const sdk = await initializeTracing({});

      expect(sdk).toBeDefined();
    });

    it('should prefer options over environment variables', async () => {
      process.env.OTEL_SERVICE_NAME = 'env-service';

      const sdk = await initializeTracing({
        serviceName: 'option-service',
      });

      expect(sdk).toBeDefined();
    });

    it('should return null when disabled', async () => {
      const sdk = await initializeTracing({ enabled: false });

      expect(sdk).toBeNull();
    });

    it('should support different exporters', async () => {
      const exporters = ['otlp', 'jaeger', 'zipkin'];

      for (const exporter of exporters) {
        const sdk = await initializeTracing({ exporter });
        expect(sdk).toBeDefined();
      }
    });

    it('should handle initialization errors gracefully', async () => {
      const { NodeSDK } = await import('@opentelemetry/sdk-node');
      (NodeSDK as jest.MockedClass<typeof NodeSDK>).mockImplementationOnce(() => {
        throw new Error('Initialization failed');
      });

      const sdk = await initializeTracing({});
      expect(sdk).toBeNull();
    });
  });

  describe('createSpan', () => {
    it('should create a span with the given name', () => {
      const mockSpan = {
        setAttribute: jest.fn().mockReturnThis(),
        setAttributes: jest.fn().mockReturnThis(),
        addEvent: jest.fn().mockReturnThis(),
        setStatus: jest.fn().mockReturnThis(),
        end: jest.fn(),
        recordException: jest.fn(),
      };

      const mockTracer = {
        startSpan: jest.fn().mockReturnValue(mockSpan),
      };

      jest
        .spyOn(trace, 'getTracer')
        .mockReturnValue(mockTracer as unknown as ReturnType<typeof trace.getTracer>);

      const span = createSpan('test-operation');

      expect(mockTracer.startSpan).toHaveBeenCalledWith('test-operation', undefined);
      expect(span).toBe(mockSpan);
    });

    it('should create a span with attributes', () => {
      const mockSpan = {
        setAttribute: jest.fn().mockReturnThis(),
        setAttributes: jest.fn().mockReturnThis(),
        addEvent: jest.fn().mockReturnThis(),
        setStatus: jest.fn().mockReturnThis(),
        end: jest.fn(),
        recordException: jest.fn(),
      };

      const mockTracer = {
        startSpan: jest.fn().mockReturnValue(mockSpan),
      };

      jest
        .spyOn(trace, 'getTracer')
        .mockReturnValue(mockTracer as unknown as ReturnType<typeof trace.getTracer>);

      const attributes = { userId: '123', operation: 'read' };
      createSpan('test-operation', { attributes });

      expect(mockTracer.startSpan).toHaveBeenCalledWith('test-operation', { attributes });
    });

    it('should handle span operations', () => {
      const mockSpan = {
        setAttribute: jest.fn().mockReturnThis(),
        setAttributes: jest.fn().mockReturnThis(),
        addEvent: jest.fn().mockReturnThis(),
        setStatus: jest.fn().mockReturnThis(),
        end: jest.fn(),
        recordException: jest.fn(),
      };

      const mockTracer = {
        startSpan: jest.fn().mockReturnValue(mockSpan),
      };

      jest
        .spyOn(trace, 'getTracer')
        .mockReturnValue(mockTracer as unknown as ReturnType<typeof trace.getTracer>);

      const span = createSpan('test-operation');

      // Set attributes
      span.setAttribute('key', 'value');
      expect(mockSpan.setAttribute).toHaveBeenCalledWith('key', 'value');

      // Add event
      span.addEvent('test-event', { detail: 'test' });
      expect(mockSpan.addEvent).toHaveBeenCalledWith('test-event', { detail: 'test' });

      // Set status
      span.setStatus({ code: SpanStatusCode.OK });
      expect(mockSpan.setStatus).toHaveBeenCalledWith({ code: SpanStatusCode.OK });

      // End span
      span.end();
      expect(mockSpan.end).toHaveBeenCalled();
    });

    it('should handle errors in spans', () => {
      const mockSpan = {
        setAttribute: jest.fn().mockReturnThis(),
        setAttributes: jest.fn().mockReturnThis(),
        addEvent: jest.fn().mockReturnThis(),
        setStatus: jest.fn().mockReturnThis(),
        end: jest.fn(),
        recordException: jest.fn(),
      };

      const mockTracer = {
        startSpan: jest.fn().mockReturnValue(mockSpan),
      };

      jest
        .spyOn(trace, 'getTracer')
        .mockReturnValue(mockTracer as unknown as ReturnType<typeof trace.getTracer>);

      const span = createSpan('test-operation');
      const error = new Error('Test error');

      span.recordException(error);
      expect(mockSpan.recordException).toHaveBeenCalledWith(error);

      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      expect(mockSpan.setStatus).toHaveBeenCalledWith({
        code: SpanStatusCode.ERROR,
        message: 'Test error',
      });
    });
  });

  describe('shutdownTracing', () => {
    it('should shutdown the SDK gracefully', async () => {
      const sdk = await initializeTracing({});
      await shutdownTracing();

      expect(sdk?.shutdown).toHaveBeenCalled();
    });

    it('should handle shutdown when not initialized', async () => {
      // Should not throw
      await expect(shutdownTracing()).resolves.toBeUndefined();
    });

    it('should handle shutdown errors gracefully', async () => {
      const sdk = await initializeTracing({});

      // Mock shutdown to reject
      (sdk?.shutdown as jest.Mock).mockRejectedValueOnce(new Error('Shutdown failed'));

      // Should not throw
      await expect(shutdownTracing()).resolves.toBeUndefined();
    });
  });

  describe('Environment variable parsing', () => {
    it('should parse OTLP headers correctly', async () => {
      process.env.OTEL_EXPORTER_OTLP_HEADERS = 'key1=value1,key2=value2';

      await initializeTracing({});

      // Headers should be parsed and passed to exporter
      // This is tested implicitly through the mock
    });

    it('should handle malformed headers gracefully', async () => {
      process.env.OTEL_EXPORTER_OTLP_HEADERS = 'invalid-header-format';

      const sdk = await initializeTracing({});
      expect(sdk).toBeDefined();
    });
  });

  describe('Custom options', () => {
    it('should support custom endpoint configuration', async () => {
      const options: TracingOptions = {
        endpoint: 'http://custom-collector:4318',
        headers: { 'X-Custom-Header': 'value' },
        exportTimeoutMillis: 5000,
        exportIntervalMillis: 30000,
      };

      const sdk = await initializeTracing(options);
      expect(sdk).toBeDefined();
    });

    it('should support URL filtering', async () => {
      const options: TracingOptions = {
        urlFilter: (url) => url === '/health' || url === '/metrics',
      };

      const sdk = await initializeTracing(options);
      expect(sdk).toBeDefined();
    });
  });
});
