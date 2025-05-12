/// <reference types="jest" />

/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import axios from 'axios';
import { apiGet, apiPost } from '../api';

// Mock axios manually since jest.mock with ES modules can be problematic
beforeEach(() => {
  jest.clearAllMocks();
});

describe('API Module', () => {
  const baseUrl = 'https://sonarqube.example.com';
  const auth = { username: 'test-token', password: '' };
  const endpoint = '/api/test/endpoint';

  describe('apiGet', () => {
    it('should make a GET request and return data', async () => {
      const mockResponse = { data: { key: 'value' } };

      // Mock implementation for this test
      const originalAxiosGet = axios.get;
      axios.get = jest.fn().mockResolvedValue(mockResponse);

      const result = await apiGet(baseUrl, auth, endpoint);

      expect(axios.get).toHaveBeenCalledWith(`${baseUrl}${endpoint}`, { auth, params: undefined });
      expect(result).toEqual(mockResponse.data);

      // Restore original
      axios.get = originalAxiosGet;
    });

    it('should pass query parameters correctly', async () => {
      const mockResponse = { data: { data: [1, 2, 3] } };
      const params = { page: 1, limit: 10, filter: 'test' };

      // Mock implementation for this test
      const originalAxiosGet = axios.get;
      axios.get = jest.fn().mockResolvedValue(mockResponse);

      const result = await apiGet(baseUrl, auth, endpoint, params);

      expect(axios.get).toHaveBeenCalledWith(`${baseUrl}${endpoint}`, { auth, params });
      expect(result).toEqual(mockResponse.data);

      // Restore original
      axios.get = originalAxiosGet;
    });

    it('should handle arrays in query parameters', async () => {
      const mockResponse = { data: { items: ['a', 'b', 'c'] } };
      const params = { tags: ['tag1', 'tag2'].join(',') };

      // Mock implementation for this test
      const originalAxiosGet = axios.get;
      axios.get = jest.fn().mockResolvedValue(mockResponse);

      const result = await apiGet(baseUrl, auth, endpoint, params);

      expect(axios.get).toHaveBeenCalledWith(`${baseUrl}${endpoint}`, { auth, params });
      expect(result).toEqual(mockResponse.data);

      // Restore original
      axios.get = originalAxiosGet;
    });

    it('should handle error responses', async () => {
      const errorMessage = 'Not found';

      // Mock implementation for this test
      const originalAxiosGet = axios.get;
      axios.get = jest.fn().mockRejectedValue(new Error(errorMessage));

      await expect(apiGet(baseUrl, auth, endpoint)).rejects.toThrow(errorMessage);

      // Restore original
      axios.get = originalAxiosGet;
    });
  });

  describe('apiPost', () => {
    it('should make a POST request and return data', async () => {
      const mockResponse = { data: { id: 123, status: 'created' } };
      const postData = { name: 'Test', value: 42 };

      // Mock implementation for this test
      const originalAxiosPost = axios.post;
      axios.post = jest.fn().mockResolvedValue(mockResponse);

      const result = await apiPost(baseUrl, auth, endpoint, postData);

      expect(axios.post).toHaveBeenCalledWith(`${baseUrl}${endpoint}`, postData, {
        auth,
        params: undefined,
      });
      expect(result).toEqual(mockResponse.data);

      // Restore original
      axios.post = originalAxiosPost;
    });

    it('should pass query parameters correctly', async () => {
      const mockResponse = { data: { success: true } };
      const postData = { name: 'Test', values: [1, 2, 3] };
      const params = { action: 'create' };

      // Mock implementation for this test
      const originalAxiosPost = axios.post;
      axios.post = jest.fn().mockResolvedValue(mockResponse);

      const result = await apiPost(baseUrl, auth, endpoint, postData, params);

      expect(axios.post).toHaveBeenCalledWith(`${baseUrl}${endpoint}`, postData, { auth, params });
      expect(result).toEqual(mockResponse.data);

      // Restore original
      axios.post = originalAxiosPost;
    });

    it('should handle error responses', async () => {
      const errorMessage = 'Bad request';
      const postData = { invalid: true };

      // Mock implementation for this test
      const originalAxiosPost = axios.post;
      axios.post = jest.fn().mockRejectedValue(new Error(errorMessage));

      await expect(apiPost(baseUrl, auth, endpoint, postData)).rejects.toThrow(errorMessage);

      // Restore original
      axios.post = originalAxiosPost;
    });
  });
});
