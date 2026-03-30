/**
 * Base HTTP Client for Voice.ai API
 * 
 * Provides common functionality for all API clients including:
 * - Authentication via Bearer token
 * - Error handling and response parsing
 * - Common HTTP methods (GET, POST, PUT, PATCH, DELETE)
 */

import type { AuthTokenProvider, ErrorResponse, HTTPValidationError } from '../types';

/** Error thrown by Voice.ai API client */
export class VoiceAIError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string,
    public readonly detail?: string
  ) {
    super(message);
    this.name = 'VoiceAIError';
  }
}

/** Configuration for BaseClient */
export interface BaseClientConfig {
  apiKey?: string;
  authToken?: string;
  getAuthToken?: AuthTokenProvider;
  apiUrl: string;
}

/**
 * Base HTTP client with authentication and error handling
 */
export class BaseClient {
  protected readonly apiKey: string;
  protected readonly authToken?: string;
  protected readonly getAuthToken?: AuthTokenProvider;
  protected readonly apiUrl: string;

  constructor(config: BaseClientConfig) {
    this.apiKey = config.apiKey || '';
    this.authToken = config.authToken;
    this.getAuthToken = config.getAuthToken;
    this.apiUrl = config.apiUrl;
  }

  protected async resolveBearerToken(): Promise<string> {
    if (this.apiKey) {
      return this.apiKey;
    }
    if (this.authToken) {
      return this.authToken;
    }
    if (this.getAuthToken) {
      const resolvedToken = await this.getAuthToken();
      if (typeof resolvedToken === 'string' && resolvedToken.trim()) {
        return resolvedToken;
      }
    }
    throw new VoiceAIError('Authentication required. Configure apiKey, authToken, or getAuthToken.', 401, 'UNAUTHORIZED');
  }

  /**
   * Build headers with authentication
   */
  protected async getHeaders(contentType: string = 'application/json'): Promise<Record<string, string>> {
    const bearerToken = await this.resolveBearerToken();
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${bearerToken}`,
    };
    
    if (contentType) {
      headers['Content-Type'] = contentType;
    }
    
    return headers;
  }

  /**
   * Handle API response and parse errors
   */
  protected async handleResponse<T>(response: Response): Promise<T> {
    if (response.ok) {
      // Check if response has content
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return response.json() as Promise<T>;
      }
      // For 204 No Content or non-JSON responses
      return undefined as T;
    }

    // Parse error response
    let errorData: ErrorResponse | HTTPValidationError | null = null;
    try {
      errorData = await response.json();
    } catch {
      // Response body might not be JSON
    }

    // Handle specific error codes
    if (response.status === 401) {
      throw new VoiceAIError(
        'Authentication failed. Please check your API key or auth token.',
        401,
        'UNAUTHORIZED'
      );
    }

    if (response.status === 403) {
      const detail = (errorData as ErrorResponse)?.detail || (errorData as ErrorResponse)?.error;
      const code = (errorData as ErrorResponse)?.code;
      throw new VoiceAIError(
        detail || 'Forbidden - insufficient permissions',
        403,
        code || 'FORBIDDEN',
        detail
      );
    }

    if (response.status === 404) {
      const detail = (errorData as ErrorResponse)?.detail || (errorData as ErrorResponse)?.error;
      throw new VoiceAIError(
        detail || 'Resource not found',
        404,
        'NOT_FOUND',
        detail
      );
    }

    if (response.status === 422) {
      const validationError = errorData as HTTPValidationError;
      const detail = validationError?.detail?.[0]?.msg || 'Validation error';
      throw new VoiceAIError(
        detail,
        422,
        'VALIDATION_ERROR',
        JSON.stringify(validationError?.detail)
      );
    }

    // Generic error
    const errorMsg = (errorData as ErrorResponse)?.error || 
                     (errorData as ErrorResponse)?.detail || 
                     `Request failed with status ${response.status}`;
    throw new VoiceAIError(
      errorMsg,
      response.status,
      (errorData as ErrorResponse)?.code
    );
  }

  /**
   * Perform GET request
   */
  protected async get<T>(path: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(`${this.apiUrl}${path}`);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => url.searchParams.append(key, String(v)));
          } else {
            url.searchParams.append(key, String(value));
          }
        }
      });
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: await this.getHeaders(),
    });

    return this.handleResponse<T>(response);
  }

  /**
   * Perform GET request that returns binary data (Blob)
   */
  protected async getForBlob(path: string, params?: Record<string, any>): Promise<Blob> {
    const url = new URL(`${this.apiUrl}${path}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => url.searchParams.append(key, String(v)));
          } else {
            url.searchParams.append(key, String(value));
          }
        }
      });
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: await this.getHeaders(),
    });

    if (!response.ok) {
      let errorData: ErrorResponse | null = null;
      try {
        errorData = await response.json();
      } catch {
        // Not JSON
      }

      throw new VoiceAIError(
        errorData?.error || errorData?.detail || `Request failed with status ${response.status}`,
        response.status,
        errorData?.code
      );
    }

    return response.blob();
  }

  /**
   * Perform POST request
   */
  protected async post<T>(path: string, body?: any): Promise<T> {
    const response = await fetch(`${this.apiUrl}${path}`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  /**
   * Perform POST request with FormData (for file uploads)
   */
  protected async postFormData<T>(path: string, formData: FormData): Promise<T> {
    // Don't set Content-Type header - browser will set it with boundary
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${await this.resolveBearerToken()}`,
    };

    const response = await fetch(`${this.apiUrl}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    return this.handleResponse<T>(response);
  }

  /**
   * Perform PUT request
   */
  protected async put<T>(path: string, body?: any): Promise<T> {
    const response = await fetch(`${this.apiUrl}${path}`, {
      method: 'PUT',
      headers: await this.getHeaders(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  /**
   * Perform PATCH request
   */
  protected async patch<T>(path: string, body?: any): Promise<T> {
    const response = await fetch(`${this.apiUrl}${path}`, {
      method: 'PATCH',
      headers: await this.getHeaders(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  /**
   * Perform DELETE request
   */
  protected async httpDelete<T>(path: string): Promise<T> {
    const response = await fetch(`${this.apiUrl}${path}`, {
      method: 'DELETE',
      headers: await this.getHeaders(),
    });

    return this.handleResponse<T>(response);
  }

  /**
   * Perform POST request that returns binary data (Blob)
   */
  protected async postForBlob(path: string, body?: any): Promise<Blob> {
    const response = await fetch(`${this.apiUrl}${path}`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      // Try to parse error from JSON
      let errorData: ErrorResponse | null = null;
      try {
        errorData = await response.json();
      } catch {
        // Not JSON
      }
      
      throw new VoiceAIError(
        errorData?.error || errorData?.detail || `Request failed with status ${response.status}`,
        response.status,
        errorData?.code
      );
    }

    return response.blob();
  }

  /**
   * Perform POST request that returns a streaming Response
   */
  protected async postForStream(path: string, body?: any): Promise<Response> {
    const response = await fetch(`${this.apiUrl}${path}`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      // Try to parse error from JSON
      let errorData: ErrorResponse | null = null;
      try {
        errorData = await response.json();
      } catch {
        // Not JSON
      }
      
      throw new VoiceAIError(
        errorData?.error || errorData?.detail || `Request failed with status ${response.status}`,
        response.status,
        errorData?.code
      );
    }

    return response;
  }
}
