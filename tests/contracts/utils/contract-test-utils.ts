/**
 * Contract testing utilities for MAD LAB Platform
 * Provides Pact integration, schema validation, and testing helpers
 */

import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import { vi } from 'vitest';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { Validator } from 'jsonschema';
import { commonSchemas } from '../schemas/common-schemas';

// Initialize validators
const ajv = new Ajv({ allErrors: true, verbose: true });
addFormats(ajv);

const jsonSchemaValidator = new Validator();

// Register common schemas
Object.entries(commonSchemas).forEach(([name, schema]) => {
  ajv.addSchema(schema, `#/components/schemas/${name}`);
  jsonSchemaValidator.addSchema(schema, `/common/${name}`);
});

export interface ContractTestConfig {
  consumer: string;
  provider: string;
  port?: number;
  host?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class ContractTestHelper {
  private pact: PactV3;
  private config: ContractTestConfig;

  constructor(config: ContractTestConfig) {
    this.config = config;
    this.pact = new PactV3({
      consumer: config.consumer,
      provider: config.provider,
      port: config.port || 1234,
      host: config.host || 'localhost',
      log: './logs/pact.log',
      dir: './pacts',
      logLevel: process.env.LOG_LEVEL || 'info',
    });
  }

  /**
   * Validate response against JSON schema
   */
  validateSchema(data: any, schema: any): ValidationResult {
    const validate = ajv.compile(schema);
    const isValid = validate(data);

    return {
      isValid,
      errors: validate.errors?.map(err => `${err.instancePath}: ${err.message}`) || [],
      warnings: [],
    };
  }

  /**
   * Validate response against JSON Schema (legacy)
   */
  validateSchemaLegacy(data: any, schema: any): ValidationResult {
    const result = jsonSchemaValidator.validate(data, schema);

    return {
      isValid: result.valid,
      errors: result.errors.map(err => err.toString()),
      warnings: [],
    };
  }

  /**
   * Create Pact interaction for API endpoint
   */
  createInteraction(options: {
    description: string;
    providerState?: string;
    request: {
      method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      path: string;
      headers?: Record<string, string>;
      body?: any;
      query?: Record<string, string>;
    };
    response: {
      status: number;
      headers?: Record<string, string>;
      body?: any;
    };
  }) {
    const interaction = this.pact.newInteraction(options.description);

    if (options.providerState) {
      interaction.given(options.providerState);
    }

    interaction
      .uponReceiving(options.description)
      .withRequest({
        method: options.request.method,
        path: options.request.path,
        headers: options.request.headers || { 'Content-Type': 'application/json' },
        ...(options.request.body && { body: options.request.body }),
        ...(options.request.query && { query: options.request.query }),
      })
      .willRespondWith({
        status: options.response.status,
        headers: options.response.headers || { 'Content-Type': 'application/json' },
        ...(options.response.body && { body: options.response.body }),
      });

    return interaction;
  }

  /**
   * Mock fetch for testing
   */
  mockFetch(mockResponse: {
    status?: number;
    headers?: Record<string, string>;
    body?: any;
    ok?: boolean;
  } = {}) {
    const mockFn = vi.fn();
    global.fetch = mockFn;

    mockFn.mockResolvedValue({
      ok: mockResponse.ok !== undefined ? mockResponse.ok : true,
      status: mockResponse.status || 200,
      headers: {
        get: (header: string) => mockResponse.headers?.[header] || null,
        ...mockResponse.headers,
      },
      json: () => Promise.resolve(mockResponse.body || {}),
      text: () => Promise.resolve(JSON.stringify(mockResponse.body || {})),
    });

    return mockFn;
  }

  /**
   * Validate common response structure
   */
  validateCommonResponse(response: any, expectedSuccess: boolean = true): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (typeof response.success !== 'boolean') {
      errors.push('Response must have boolean "success" field');
    } else if (response.success !== expectedSuccess) {
      errors.push(`Expected success to be ${expectedSuccess}, got ${response.success}`);
    }

    if (expectedSuccess && response.success) {
      if (!response.timestamp || !Date.parse(response.timestamp)) {
        warnings.push('Response should have valid timestamp');
      }
      if (!response.requestId || !/^req-[a-zA-Z0-9-]+$/.test(response.requestId)) {
        warnings.push('Response should have valid requestId format');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate error response structure
   */
  validateErrorResponse(response: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (response.success !== false) {
      errors.push('Error response must have success: false');
    }

    if (!response.error || typeof response.error !== 'string') {
      errors.push('Error response must have string "error" field');
    }

    if (!response.code || !/^[A-Z_]+$/.test(response.code)) {
      errors.push('Error response must have valid error code');
    }

    if (!response.timestamp || !Date.parse(response.timestamp)) {
      errors.push('Error response must have valid timestamp');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Setup pact for testing
   */
  async setup() {
    await this.pact.setup();
  }

  /**
   * Finalize pact after testing
   */
  async finalize() {
    await this.pact.finalize();
  }

  /**
   * Verify pact interactions
   */
  async verify() {
    await this.pact.verify();
  }
}

// Utility functions for common validations
export const validateTimestamp = (timestamp: string): boolean => {
  return !!(timestamp && Date.parse(timestamp));
};

export const validateRequestId = (requestId: string): boolean => {
  return !!(requestId && /^req-[a-zA-Z0-9-]+$/.test(requestId));
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// HTTP status code ranges
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Common error codes
export const ERROR_CODES = {
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_ACCESS_DENIED: 'AUTH_ACCESS_DENIED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;