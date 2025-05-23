/**
 * SonarQube API module for making direct HTTP requests
 */
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * Type alias for query parameter types
 */
export type QueryParameters = Record<
  string,
  string | number | boolean | string[] | undefined | null
>;

/**
 * Type alias for authentication credentials
 */
export type AuthCredentials = { username: string; password: string };

/**
 * Interface for HTTP client
 */
export interface HttpClient {
  get<T>(
    baseUrl: string,
    auth: AuthCredentials,
    endpoint: string,
    params?: QueryParameters
  ): Promise<T>;

  post<T>(
    baseUrl: string,
    auth: AuthCredentials,
    endpoint: string,
    data: Record<string, unknown>,
    params?: QueryParameters
  ): Promise<T>;
}

/**
 * Axios implementation of the HttpClient interface
 */
export class AxiosHttpClient implements HttpClient {
  /**
   * Makes a GET request to the SonarQube API
   * @param baseUrl The base URL of the SonarQube instance
   * @param auth The authentication credentials
   * @param endpoint The API endpoint to call
   * @param params The query parameters to include
   * @returns Promise with the API response data
   */
  async get<T>(
    baseUrl: string,
    auth: AuthCredentials,
    endpoint: string,
    params?: QueryParameters
  ): Promise<T> {
    const config: AxiosRequestConfig = {
      auth,
      params,
    };

    const response: AxiosResponse<T> = await axios.get(`${baseUrl}${endpoint}`, config);
    return response.data;
  }

  /**
   * Makes a POST request to the SonarQube API
   * @param baseUrl The base URL of the SonarQube instance
   * @param auth The authentication credentials
   * @param endpoint The API endpoint to call
   * @param data The request body data
   * @param params The query parameters to include
   * @returns Promise with the API response data
   */
  async post<T>(
    baseUrl: string,
    auth: AuthCredentials,
    endpoint: string,
    data: Record<string, unknown>,
    params?: QueryParameters
  ): Promise<T> {
    const config: AxiosRequestConfig = {
      auth,
      params,
    };

    const response: AxiosResponse<T> = await axios.post(`${baseUrl}${endpoint}`, data, config);
    return response.data;
  }
}

// Export a default instance for backward compatibility
export const defaultHttpClient = new AxiosHttpClient();
