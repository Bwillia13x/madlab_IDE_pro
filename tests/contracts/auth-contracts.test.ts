/**
 * Authentication API Contract Tests
 * Tests contracts for login, logout, and user profile endpoints
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { ContractTestHelper, HTTP_STATUS, ERROR_CODES } from './utils/contract-test-utils';
import { commonSchemas } from './schemas/common-schemas';

describe('Authentication API Contracts', () => {
  let contractHelper: ContractTestHelper;
  let mockFetch: any;

  beforeAll(async () => {
    contractHelper = new ContractTestHelper({
      consumer: 'MAD LAB Workbench',
      provider: 'MAD LAB Auth Service',
    });
    await contractHelper.setup();
  });

  afterAll(async () => {
    await contractHelper.finalize();
  });

  beforeEach(() => {
    mockFetch = contractHelper.mockFetch();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('should validate successful login response schema', async () => {
      const loginRequest = {
        email: 'test@example.com',
        password: 'validpassword123',
      };

      const loginResponse = {
        success: true,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          role: 'user',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        token: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          expiresAt: Date.now() + 3600000,
          tokenType: 'Bearer',
        },
        requestId: 'req-login-123',
        timestamp: new Date().toISOString(),
      };

      // Create Pact interaction
      contractHelper.createInteraction({
        description: 'successful login',
        providerState: 'user exists and credentials are valid',
        request: {
          method: 'POST',
          path: '/api/auth/login',
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': 'req-login-123',
          },
          body: loginRequest,
        },
        response: {
          status: HTTP_STATUS.OK,
          headers: {
            'Content-Type': 'application/json',
            'X-API-Version': '1.0.0',
          },
          body: loginResponse,
        },
      });

      // Test the API call
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': 'req-login-123',
        },
        body: JSON.stringify(loginRequest),
      });

      expect(response.status).toBe(HTTP_STATUS.OK);
      const data = await response.json();

      // Validate common response structure
      const commonValidation = contractHelper.validateCommonResponse(data, true);
      expect(commonValidation.isValid).toBe(true);

      // Validate user object
      expect(data.user).toBeDefined();
      expect(data.user.id).toMatch(/^[a-zA-Z0-9-]+$/);
      expect(data.user.email).toBe(loginRequest.email);
      expect(data.user.role).toBeOneOf(['user', 'admin', 'moderator']);
      expect(data.user.createdAt).toBeDefined();
      expect(Date.parse(data.user.createdAt)).toBeTruthy();

      // Validate token object
      expect(data.token).toBeDefined();
      expect(data.token.accessToken).toBeDefined();
      expect(data.token.refreshToken).toBeDefined();
      expect(data.token.expiresAt).toBeGreaterThan(Date.now());
      expect(data.token.tokenType).toBe('Bearer');

      // Validate against schema
      const loginSchema = {
        type: 'object',
        properties: {
          success: { type: 'boolean', enum: [true] },
          user: { $ref: '#/components/schemas/user' },
          token: { $ref: '#/components/schemas/token' },
          requestId: { type: 'string', pattern: '^req-[a-zA-Z0-9-]+$' },
          timestamp: { type: 'string', format: 'date-time' },
        },
        required: ['success', 'user', 'token', 'requestId', 'timestamp'],
      };

      const schemaValidation = contractHelper.validateSchema(data, loginSchema);
      expect(schemaValidation.isValid).toBe(true);
    });

    it('should validate login error response for invalid credentials', async () => {
      const loginRequest = {
        email: 'invalid@example.com',
        password: 'wrongpassword',
      };

      const errorResponse = {
        success: false,
        error: 'Invalid email or password',
        code: ERROR_CODES.AUTH_INVALID_CREDENTIALS,
        timestamp: new Date().toISOString(),
        requestId: 'req-login-456',
        details: {
          field: 'credentials',
          attemptCount: 3,
        },
      };

      // Create Pact interaction for error case
      contractHelper.createInteraction({
        description: 'login with invalid credentials',
        providerState: 'user does not exist or credentials are invalid',
        request: {
          method: 'POST',
          path: '/api/auth/login',
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': 'req-login-456',
          },
          body: loginRequest,
        },
        response: {
          status: HTTP_STATUS.UNAUTHORIZED,
          headers: {
            'Content-Type': 'application/json',
            'X-API-Version': '1.0.0',
          },
          body: errorResponse,
        },
      });

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': 'req-login-456',
        },
        body: JSON.stringify(loginRequest),
      });

      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      const data = await response.json();

      // Validate error response structure
      const errorValidation = contractHelper.validateErrorResponse(data);
      expect(errorValidation.isValid).toBe(true);

      expect(data.code).toBe(ERROR_CODES.AUTH_INVALID_CREDENTIALS);
      expect(data.error).toBeDefined();
      expect(data.details).toBeDefined();
      expect(data.details.field).toBe('credentials');
    });

    it('should validate login validation error for missing fields', async () => {
      const invalidLoginRequest = {
        email: 'not-an-email',
        // missing password
      };

      const validationErrorResponse = {
        success: false,
        error: 'Validation failed',
        code: ERROR_CODES.VALIDATION_ERROR,
        timestamp: new Date().toISOString(),
        requestId: 'req-login-789',
        details: {
          fields: [
            {
              field: 'email',
              message: 'Invalid email format',
            },
            {
              field: 'password',
              message: 'Password is required',
            },
          ],
        },
      };

      // Create Pact interaction for validation error
      contractHelper.createInteraction({
        description: 'login with validation errors',
        providerState: 'validation errors in request',
        request: {
          method: 'POST',
          path: '/api/auth/login',
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': 'req-login-789',
          },
          body: invalidLoginRequest,
        },
        response: {
          status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
          headers: {
            'Content-Type': 'application/json',
            'X-API-Version': '1.0.0',
          },
          body: validationErrorResponse,
        },
      });

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': 'req-login-789',
        },
        body: JSON.stringify(invalidLoginRequest),
      });

      expect(response.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
      const data = await response.json();

      expect(data.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(data.details.fields).toBeDefined();
      expect(Array.isArray(data.details.fields)).toBe(true);
      expect(data.details.fields.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should validate successful logout response', async () => {
      const logoutRequest = {
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      };

      const logoutResponse = {
        success: true,
        message: 'Successfully logged out',
        requestId: 'req-logout-123',
        timestamp: new Date().toISOString(),
      };

      // Create Pact interaction
      contractHelper.createInteraction({
        description: 'successful logout',
        providerState: 'user is authenticated',
        request: {
          method: 'POST',
          path: '/api/auth/logout',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            'X-Request-ID': 'req-logout-123',
          },
          body: logoutRequest,
        },
        response: {
          status: HTTP_STATUS.OK,
          headers: {
            'Content-Type': 'application/json',
            'X-API-Version': '1.0.0',
          },
          body: logoutResponse,
        },
      });

      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          'X-Request-ID': 'req-logout-123',
        },
        body: JSON.stringify(logoutRequest),
      });

      expect(response.status).toBe(HTTP_STATUS.OK);
      const data = await response.json();

      const commonValidation = contractHelper.validateCommonResponse(data, true);
      expect(commonValidation.isValid).toBe(true);

      expect(data.message).toBe('Successfully logged out');
    });

    it('should validate logout without refresh token', async () => {
      const logoutResponse = {
        success: true,
        message: 'Successfully logged out',
        requestId: 'req-logout-456',
        timestamp: new Date().toISOString(),
      };

      // Create Pact interaction for logout without body
      contractHelper.createInteraction({
        description: 'logout without refresh token',
        providerState: 'user is authenticated',
        request: {
          method: 'POST',
          path: '/api/auth/logout',
          headers: {
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            'X-Request-ID': 'req-logout-456',
          },
        },
        response: {
          status: HTTP_STATUS.OK,
          headers: {
            'Content-Type': 'application/json',
            'X-API-Version': '1.0.0',
          },
          body: logoutResponse,
        },
      });

      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          'X-Request-ID': 'req-logout-456',
        },
      });

      expect(response.status).toBe(HTTP_STATUS.OK);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.message).toBe('Successfully logged out');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should validate user profile response', async () => {
      const userProfileResponse = {
        success: true,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          role: 'user',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          preferences: {
            theme: 'dark',
            notifications: true,
            language: 'en',
          },
        },
        requestId: 'req-profile-123',
        timestamp: new Date().toISOString(),
      };

      // Create Pact interaction
      contractHelper.createInteraction({
        description: 'get user profile',
        providerState: 'user is authenticated',
        request: {
          method: 'GET',
          path: '/api/auth/me',
          headers: {
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            'X-Request-ID': 'req-profile-123',
          },
        },
        response: {
          status: HTTP_STATUS.OK,
          headers: {
            'Content-Type': 'application/json',
            'X-API-Version': '1.0.0',
          },
          body: userProfileResponse,
        },
      });

      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          'X-Request-ID': 'req-profile-123',
        },
      });

      expect(response.status).toBe(HTTP_STATUS.OK);
      const data = await response.json();

      const commonValidation = contractHelper.validateCommonResponse(data, true);
      expect(commonValidation.isValid).toBe(true);

      expect(data.user).toBeDefined();
      expect(data.user.id).toBe('user-123');
      expect(data.user.email).toBe('test@example.com');
      expect(data.user.preferences).toBeDefined();
    });

    it('should validate unauthorized access to profile', async () => {
      const errorResponse = {
        success: false,
        error: 'Authentication required',
        code: ERROR_CODES.AUTH_TOKEN_INVALID,
        timestamp: new Date().toISOString(),
        requestId: 'req-profile-456',
      };

      // Create Pact interaction for unauthorized access
      contractHelper.createInteraction({
        description: 'get user profile without authentication',
        providerState: 'user is not authenticated',
        request: {
          method: 'GET',
          path: '/api/auth/me',
          headers: {
            'X-Request-ID': 'req-profile-456',
          },
        },
        response: {
          status: HTTP_STATUS.UNAUTHORIZED,
          headers: {
            'Content-Type': 'application/json',
            'X-API-Version': '1.0.0',
          },
          body: errorResponse,
        },
      });

      const response = await fetch('/api/auth/me', {
        headers: {
          'X-Request-ID': 'req-profile-456',
        },
      });

      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      const data = await response.json();

      const errorValidation = contractHelper.validateErrorResponse(data);
      expect(errorValidation.isValid).toBe(true);

      expect(data.code).toBe(ERROR_CODES.AUTH_TOKEN_INVALID);
    });
  });
});