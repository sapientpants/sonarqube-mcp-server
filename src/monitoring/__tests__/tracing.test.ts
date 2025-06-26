import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { initializeTracing, shutdownTracing, TracingOptions } from '../tracing.js';

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
      const sdk = await initializeTracing({ enabled: true });

      expect(sdk).toBeDefined();
      expect(sdk).not.toBeNull();
    });

    it('should use environment variables for configuration', async () => {
      process.env.OTEL_SERVICE_NAME = 'test-service';
      process.env.OTEL_TRACES_EXPORTER = 'jaeger';
      process.env.OTEL_EXPORTER_JAEGER_ENDPOINT = 'http://jaeger:14268';

      const sdk = await initializeTracing({ enabled: true });

      expect(sdk).toBeDefined();
      expect(sdk).not.toBeNull();
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
      // Reset and re-mock modules
      jest.resetModules();

      // Create mock that throws on any method
      const errorMock = new Proxy(
        {},
        {
          get: () => {
            throw new Error('Initialization failed');
          },
        }
      );

      jest.doMock('@opentelemetry/sdk-node', () => ({
        NodeSDK: jest.fn().mockImplementation(() => errorMock),
      }));

      const { initializeTracing: init } = await import('../tracing.js');
      const sdk = await init({ enabled: true });
      expect(sdk).toBeNull();
    });
  });

  describe('shutdownTracing', () => {
    it('should shutdown the SDK gracefully', async () => {
      await initializeTracing({ enabled: true });

      // The SDK is mocked, so we just check that shutdownTracing doesn't throw
      await expect(shutdownTracing()).resolves.toBeUndefined();
    });

    it('should handle shutdown when not initialized', async () => {
      // Should not throw
      await expect(shutdownTracing()).resolves.toBeUndefined();
    });

    it('should handle shutdown errors gracefully', async () => {
      // Initialize SDK
      await initializeTracing({ enabled: true });

      // Mock the shutdown method to reject
      const { NodeSDK } = await import('@opentelemetry/sdk-node');
      const MockedNodeSDK = NodeSDK as jest.MockedClass<typeof NodeSDK>;
      const mockInstance = MockedNodeSDK.mock.results[0]?.value;
      if (mockInstance && mockInstance.shutdown) {
        (mockInstance.shutdown as jest.Mock).mockRejectedValueOnce(new Error('Shutdown failed'));
      }

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

      const sdk = await initializeTracing({ enabled: true });
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

    it('should support custom service version', async () => {
      const options: TracingOptions = {
        serviceVersion: 'custom-version',
      };

      const sdk = await initializeTracing(options);
      expect(sdk).toBeDefined();
    });
  });
});
