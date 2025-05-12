/**
 * SonarQube API module for making direct HTTP requests
 */
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * Makes a GET request to the SonarQube API
 * @param baseUrl The base URL of the SonarQube instance
 * @param auth The authentication credentials
 * @param endpoint The API endpoint to call
 * @param params The query parameters to include
 * @returns Promise with the API response data
 */
export async function apiGet<T>(
  baseUrl: string,
  auth: { username: string; password: string },
  endpoint: string,
  params?: Record<string, string | number | boolean | string[] | undefined | null>
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
export async function apiPost<T>(
  baseUrl: string,
  auth: { username: string; password: string },
  endpoint: string,
  data: Record<string, unknown>,
  params?: Record<string, string | number | boolean | string[] | undefined | null>
): Promise<T> {
  const config: AxiosRequestConfig = {
    auth,
    params,
  };

  const response: AxiosResponse<T> = await axios.post(`${baseUrl}${endpoint}`, data, config);
  return response.data;
}
