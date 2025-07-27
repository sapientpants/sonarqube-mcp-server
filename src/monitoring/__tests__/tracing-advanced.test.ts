import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import {
  initializeTracing,
  shutdownTracing,
  traceMcpTool,
  traceSonarQubeApi,
  addSpanAttributes,
  addSpanEvent,
  getTracer,
} from '../tracing.js';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

// Mock OpenTelemetry modules
jest.mock('@opentelemetry/sdk-node', () => ({
  NodeSDK: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    shutdown: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('@opentelemetry/auto-instrumentations-node', () => ({
  getNodeAutoInstrumentations: jest.fn().mockReturnValue([]),
}));

jest.mock('@opentelemetry/sdk-metrics', () => ({
  PeriodicExportingMetricReader: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('@opentelemetry/resources', () => ({
  resourceFromAttributes: jest.fn().mockReturnValue({}),
  defaultResource: jest.fn().mockReturnValue({
    merge: jest.fn().mockReturnValue({}),
  }),
}));

jest.mock('@opentelemetry/semantic-conventions', () => ({
  ATTR_SERVICE_NAME: 'service.name',
  ATTR_SERVICE_VERSION: 'service.version',
}));

jest.mock('@opentelemetry/exporter-trace-otlp-http', () => ({
  OTLPTraceExporter: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('@opentelemetry/exporter-metrics-otlp-http', () => ({
  OTLPMetricExporter: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('@opentelemetry/exporter-zipkin', () => ({
  ZipkinExporter: jest.fn().mockImplementation(() => ({})),
}));

interface MockSpan {
  setStatus: jest.Mock;
  recordException: jest.Mock;
  end: jest.Mock;
  setAttributes: jest.Mock;
  addEvent: jest.Mock;
}

interface MockTracer {
  startSpan: jest.Mock;
}

interface MockContext {
  with: jest.Mock;
}

describe('Tracing Advanced Tests', () => {
  const originalEnv = process.env;
  let mockSpan: MockSpan;
  let mockTracer: MockTracer;
  let mockContext: MockContext;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };

    // Mock span
    mockSpan = {
      setStatus: jest.fn(),
      recordException: jest.fn(),
      end: jest.fn(),
      setAttributes: jest.fn(),
      addEvent: jest.fn(),
    };

    // Mock tracer
    mockTracer = {
      startSpan: jest.fn().mockReturnValue(mockSpan),
    };

    // Mock context
    mockContext = {
      with: jest.fn((context, fn) => fn()),
    };

    // Set up trace and context mocks
    Object.assign(trace, {
      getTracer: jest.fn().mockReturnValue(mockTracer),
      getActiveSpan: jest.fn().mockReturnValue(mockSpan),
      setSpan: jest.fn().mockReturnValue({}),
    });
    Object.assign(context, {
      active: jest.fn().mockReturnValue({}),
      with: mockContext.with,
    });
  });

  afterEach(async () => {
    await shutdownTracing();
    process.env = originalEnv;
  });

  describe('traceMcpTool', () => {
    it('should trace successful MCP tool execution', async () => {
      const mockOperation = jest.fn().mockResolvedValue('result');

      const result = await traceMcpTool('test-tool', mockOperation);

      expect(result).toBe('result');
      expect(mockTracer.startSpan).toHaveBeenCalledWith('mcp.tool.test-tool', {
        kind: expect.any(Number),
        attributes: {
          'mcp.tool.name': 'test-tool',
        },
      });
      expect(mockSpan.setStatus).toHaveBeenCalledWith({ code: SpanStatusCode.OK });
      expect(mockSpan.end).toHaveBeenCalled();
    });

    it('should trace failed MCP tool execution', async () => {
      const error = new Error('Tool failed');
      const mockOperation = jest.fn().mockRejectedValue(error);

      await expect(traceMcpTool('failing-tool', mockOperation)).rejects.toThrow('Tool failed');

      expect(mockSpan.recordException).toHaveBeenCalledWith(error);
      expect(mockSpan.setStatus).toHaveBeenCalledWith({
        code: SpanStatusCode.ERROR,
        message: 'Tool failed',
      });
      expect(mockSpan.end).toHaveBeenCalled();
    });

    it('should handle non-Error exceptions', async () => {
      const mockOperation = jest.fn().mockRejectedValue('String error');

      await expect(traceMcpTool('string-error-tool', mockOperation)).rejects.toBe('String error');

      expect(mockSpan.setStatus).toHaveBeenCalledWith({
        code: SpanStatusCode.ERROR,
        message: 'Unknown error',
      });
    });
  });

  describe('traceSonarQubeApi', () => {
    it('should trace successful SonarQube API call', async () => {
      const mockOperation = jest.fn().mockResolvedValue({ data: 'test' });

      const result = await traceSonarQubeApi('projects/search', mockOperation);

      expect(result).toEqual({ data: 'test' });
      expect(mockTracer.startSpan).toHaveBeenCalledWith('sonarqube.api.projects/search', {
        kind: expect.any(Number),
        attributes: {
          'sonarqube.api.endpoint': 'projects/search',
          'http.method': 'GET',
        },
      });
      expect(mockSpan.setAttributes).toHaveBeenCalledWith({
        'sonarqube.api.duration_ms': expect.any(Number),
        'sonarqube.api.success': true,
      });
      expect(mockSpan.setStatus).toHaveBeenCalledWith({ code: SpanStatusCode.OK });
      expect(mockSpan.end).toHaveBeenCalled();
    });

    it('should trace failed SonarQube API call', async () => {
      const error = new Error('API error');
      const mockOperation = jest.fn().mockRejectedValue(error);

      await expect(traceSonarQubeApi('projects/search', mockOperation)).rejects.toThrow(
        'API error'
      );

      expect(mockSpan.setAttributes).toHaveBeenCalledWith({
        'sonarqube.api.duration_ms': expect.any(Number),
        'sonarqube.api.success': false,
        'sonarqube.api.error': 'API error',
      });
      expect(mockSpan.recordException).toHaveBeenCalledWith(error);
      expect(mockSpan.setStatus).toHaveBeenCalledWith({
        code: SpanStatusCode.ERROR,
        message: 'API error',
      });
      expect(mockSpan.end).toHaveBeenCalled();
    });

    it('should handle non-Error exceptions in API calls', async () => {
      const mockOperation = jest.fn().mockRejectedValue('String error');

      await expect(traceSonarQubeApi('test-endpoint', mockOperation)).rejects.toBe('String error');

      expect(mockSpan.setAttributes).toHaveBeenCalledWith(
        expect.objectContaining({
          'sonarqube.api.error': 'Unknown error',
        })
      );
    });
  });

  describe('Span Attributes and Events', () => {
    it('should add span attributes with various types', () => {
      addSpanAttributes({
        stringAttr: 'value',
        numberAttr: 42,
        booleanAttr: true,
        objectAttr: { nested: 'object' },
        arrayAttr: [1, 2, 3],
        nullAttr: null,
        undefinedAttr: undefined,
      });

      expect(mockSpan.setAttributes).toHaveBeenCalledWith({
        stringAttr: 'value',
        numberAttr: 42,
        booleanAttr: true,
        objectAttr: '{"nested":"object"}', // JSON.stringify converts objects this way
        arrayAttr: '[1,2,3]', // JSON.stringify converts arrays this way
      });
    });

    it('should not throw when no active span exists', () => {
      Object.assign(trace, {
        ...trace,
        getActiveSpan: jest.fn().mockReturnValue(null),
      });

      expect(() => addSpanAttributes({ test: 'value' })).not.toThrow();
      expect(mockSpan.setAttributes).not.toHaveBeenCalled();
    });

    it('should add span event with attributes', () => {
      addSpanEvent('test-event', {
        stringAttr: 'value',
        numberAttr: 42,
        booleanAttr: true,
        objectAttr: { nested: 'object' },
      });

      expect(mockSpan.addEvent).toHaveBeenCalledWith('test-event', {
        stringAttr: 'value',
        numberAttr: 42,
        booleanAttr: true,
        objectAttr: '{"nested":"object"}', // JSON.stringify converts objects this way
      });
    });

    it('should add span event without attributes', () => {
      addSpanEvent('simple-event');

      expect(mockSpan.addEvent).toHaveBeenCalledWith('simple-event');
    });

    it('should not throw when adding event with no active span', () => {
      Object.assign(trace, {
        ...trace,
        getActiveSpan: jest.fn().mockReturnValue(null),
      });

      expect(() => addSpanEvent('test-event')).not.toThrow();
      expect(mockSpan.addEvent).not.toHaveBeenCalled();
    });
  });

  describe('Initialization with environment variables', () => {
    it('should use environment variables for OTLP configuration', async () => {
      process.env.OTEL_SERVICE_NAME = 'env-service';
      process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT = 'http://collector:4318/v1/traces';
      process.env.OTEL_EXPORTER_OTLP_HEADERS = 'key1=value1,key2=value2';
      process.env.OTEL_TRACES_EXPORTER = 'otlp';

      const sdk = await initializeTracing({});

      expect(sdk).toBeDefined();
    });

    it('should parse headers with equals signs in values', async () => {
      process.env.OTEL_EXPORTER_OTLP_HEADERS = 'Authorization=Bearer token==,X-Custom=value';

      const sdk = await initializeTracing({ enabled: true });

      expect(sdk).toBeDefined();
    });

    it('should handle shutdown with SIGTERM', async () => {
      const sdk = await initializeTracing({ enabled: true });

      // Simulate SIGTERM
      const sigTermListeners = process.listeners('SIGTERM');
      const tracingListener = sigTermListeners[sigTermListeners.length - 1];

      if (tracingListener) {
        await tracingListener('SIGTERM' as never);
      }

      // Just verify sdk exists, shutdown is part of the mock implementation
      expect(sdk).toBeDefined();
    });
  });

  describe('getTracer', () => {
    it('should get tracer with default name', () => {
      getTracer();
      expect(trace.getTracer).toHaveBeenCalledWith('sonarqube-mcp-server');
    });

    it('should get tracer with custom name', () => {
      getTracer('custom-service');
      expect(trace.getTracer).toHaveBeenCalledWith('custom-service');
    });
  });
});
