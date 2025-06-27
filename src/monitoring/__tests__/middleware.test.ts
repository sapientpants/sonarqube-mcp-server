import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';
import express, { Request, Response } from 'express';
import request from 'supertest';
import { metricsMiddleware } from '../middleware.js';
import { getMetricsService, cleanupMetricsService } from '../metrics.js';

describe('Metrics Middleware', () => {
  let app: express.Express;
  let metricsService: ReturnType<typeof getMetricsService>;

  beforeEach(() => {
    // Reset metrics service
    cleanupMetricsService();
    metricsService = getMetricsService();

    app = express();
    app.use(express.json()); // Add JSON parsing middleware
    app.use(metricsMiddleware());

    // Add test routes
    app.get('/test', (req: Request, res: Response) => {
      res.status(200).json({ success: true });
    });

    app.get('/error', (req: Request, res: Response) => {
      res.status(500).json({ error: 'Internal server error' });
    });

    app.get('/slow', async (req: Request, res: Response) => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      res.status(200).json({ slow: true });
    });

    app.post('/data', (req: Request, res: Response) => {
      res.status(201).json({ created: true });
    });
  });

  afterEach(() => {
    cleanupMetricsService();
  });

  describe('Request counting', () => {
    it('should count successful requests', async () => {
      // Make requests
      await request(app).get('/test').expect(200);
      await request(app).get('/test').expect(200);

      // Get metrics
      const metrics = await metricsService.getMetrics();

      // Check counter
      expect(metrics).toContain(
        'http_requests_total{method="GET",endpoint="/test",status="200"} 2'
      );
    });

    it('should count error requests', async () => {
      await request(app).get('/error').expect(500);

      const metrics = await metricsService.getMetrics();
      expect(metrics).toContain(
        'http_requests_total{method="GET",endpoint="/error",status="500"} 1'
      );
    });

    it('should count different HTTP methods', async () => {
      await request(app).get('/test').expect(200);
      await request(app).post('/data').expect(201);

      const metrics = await metricsService.getMetrics();
      expect(metrics).toContain(
        'http_requests_total{method="GET",endpoint="/test",status="200"} 1'
      );
      expect(metrics).toContain(
        'http_requests_total{method="POST",endpoint="/data",status="201"} 1'
      );
    });
  });

  describe('Response time measurement', () => {
    it('should measure response time', async () => {
      await request(app).get('/test').expect(200);

      const metrics = await metricsService.getMetrics();

      // Check that histogram exists
      expect(metrics).toContain('http_request_duration_seconds_bucket');
      expect(metrics).toContain('http_request_duration_seconds_sum');
      expect(metrics).toContain('http_request_duration_seconds_count');
    });

    it('should measure slow requests', async () => {
      await request(app).get('/slow').expect(200);

      const metrics = await metricsService.getMetrics();

      // Check that the slow request was measured
      expect(metrics).toMatch(
        /http_request_duration_seconds_sum\{[^}]*endpoint="\/slow"[^}]*\}\s+0\.\d+/
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle requests without response end', async () => {
      app.get('/no-end', (req: Request, res: Response) => {
        // Simulate a response that doesn't call end() explicitly
        res.status(204);
        res.end();
      });

      await request(app).get('/no-end').expect(204);

      const metrics = await metricsService.getMetrics();
      expect(metrics).toContain(
        'http_requests_total{method="GET",endpoint="/no-end",status="204"} 1'
      );
    });

    it('should handle requests with custom end() calls', async () => {
      app.get('/custom-end', (req: Request, res: Response) => {
        res.status(200);
        res.end('Custom response');
      });

      const response = await request(app).get('/custom-end').expect(200);
      expect(response.text).toBe('Custom response');

      const metrics = await metricsService.getMetrics();
      expect(metrics).toContain(
        'http_requests_total{method="GET",endpoint="/custom-end",status="200"} 1'
      );
    });

    it('should handle requests with multiple end() calls', async () => {
      app.get('/double-end', (req: Request, res: Response) => {
        res.status(200);
        res.end();
        // This should not cause issues
        try {
          res.end();
        } catch {
          // Expected to throw
        }
      });

      await request(app).get('/double-end').expect(200);

      const metrics = await metricsService.getMetrics();
      // Should only count once
      expect(metrics).toContain(
        'http_requests_total{method="GET",endpoint="/double-end",status="200"} 1'
      );
    });
  });

  describe('URL normalization', () => {
    it('should normalize URLs with parameters', async () => {
      app.get('/users/:id', (req: Request, res: Response) => {
        res.json({ id: req.params.id });
      });

      await request(app).get('/users/123').expect(200);
      await request(app).get('/users/456').expect(200);

      const metrics = await metricsService.getMetrics();
      // Both requests should be counted under the same endpoint
      expect(metrics).toContain(
        'http_requests_total{method="GET",endpoint="/users/:id",status="200"} 2'
      );
    });

    it('should handle query parameters', async () => {
      await request(app).get('/test?foo=bar&baz=qux').expect(200);

      const metrics = await metricsService.getMetrics();
      // Query parameters should be stripped
      expect(metrics).toContain(
        'http_requests_total{method="GET",endpoint="/test",status="200"} 1'
      );
    });
  });
});
