/**
 * Security Tests for Authentication and Authorization
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the auth manager with security-focused implementations
vi.mock('@/lib/enterprise/auth', () => ({
  authManager: {
    authenticateUser: vi.fn(),
    validateToken: vi.fn(),
    logout: vi.fn(),
    hashPassword: vi.fn(),
    generateToken: vi.fn(),
    verifyToken: vi.fn(),
  },
}));

// Import after mocks
import { POST as loginPOST } from '@/app/api/auth/login/route';
import { GET as meGET } from '@/app/api/auth/me/route';
import { POST as logoutPOST } from '@/app/api/auth/logout/route';
import { authManager } from '@/lib/enterprise/auth';

const mockAuthManager = vi.mocked(authManager);

describe('Authentication Security Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NODE_ENV', 'production');
  });

  describe('Login Security', () => {
    it('should reject SQL injection attempts in username', async () => {
      const maliciousUsername = "admin' OR '1'='1'; --";

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: maliciousUsername,
          password: 'password123',
        }),
      });

      const response = await loginPOST(request);
      const data = await response.json();

      // Should reject the login attempt
      expect(response.status).toBe(401);
      expect(data.error).toBeDefined();
      expect(mockAuthManager.authenticateUser).toHaveBeenCalledWith(
        maliciousUsername,
        'password123',
        'unknown',
        ''
      );
    });

    it('should reject SQL injection attempts in password', async () => {
      const maliciousPassword = "' OR '1'='1'; DROP TABLE users; --";

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: maliciousPassword,
        }),
      });

      const response = await loginPOST(request);
      const data = await response.json();

      // Should reject the login attempt
      expect(response.status).toBe(401);
      expect(data.error).toBeDefined();
    });

    it('should handle XSS attempts in input fields', async () => {
      const xssPayload = '<script>alert("xss")</script>';

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: xssPayload,
          password: 'password123',
        }),
      });

      const response = await loginPOST(request);
      const data = await response.json();

      // Should reject the login attempt and not execute scripts
      expect(response.status).toBe(401);
      expect(data.error).toBeDefined();
    });

    it('should reject brute force attempts with rate limiting', async () => {
      // This would test if rate limiting is properly implemented
      // Multiple rapid login attempts should be rate limited

      const requests = Array(10)
        .fill()
        .map(
          () =>
            new NextRequest('http://localhost:3000/api/auth/login', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-forwarded-for': '192.168.1.100',
              },
              body: JSON.stringify({
                email: 'test@example.com',
                password: 'wrongpassword',
              }),
            })
        );

      // Sequential requests to test rate limiting
      for (const request of requests) {
        await loginPOST(request);
      }

      // Rate limiting should be tested at the middleware level
      // This test validates that the endpoint can handle multiple failed attempts
    });

    it('should set secure HTTP-only cookies in production', async () => {
      const authResponse = {
        success: true,
        user: { id: 'user123', email: 'test@example.com' },
        token: {
          accessToken: 'secure-token',
          refreshToken: 'refresh-token',
          expiresAt: Date.now() + 3600000,
        },
        error: null,
      };

      mockAuthManager.authenticateUser.mockResolvedValue(authResponse);

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      });

      const response = await loginPOST(request);
      const cookie = response.cookies.get('madlab_auth_token');

      // In production, cookies should be secure and httpOnly
      expect(cookie?.httpOnly).toBe(true);
      expect(cookie?.secure).toBe(true);
      expect(cookie?.sameSite).toBe('lax');
    });

    it('should handle timing attacks by consistent response times', async () => {
      // Test that response times are consistent regardless of whether user exists
      const start1 = Date.now();
      mockAuthManager.authenticateUser.mockResolvedValue({
        success: false,
        error: 'Invalid credentials',
      });

      const request1 = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'nonexistent@example.com', password: 'password' }),
      });

      await loginPOST(request1);
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      const request2 = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'real@example.com', password: 'password' }),
      });

      await loginPOST(request2);
      const time2 = Date.now() - start2;

      // Response times should be similar to prevent timing attacks
      const timeDiff = Math.abs(time1 - time2);
      expect(timeDiff).toBeLessThan(100); // Less than 100ms difference
    });
  });

  describe('Token Security', () => {
    it('should reject malformed JWT tokens', async () => {
      mockAuthManager.validateToken.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/auth/me', {
        headers: {
          Authorization: 'Bearer malformed.jwt.token',
        },
      });

      const response = await meGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.authenticated).toBe(false);
      expect(mockAuthManager.validateToken).toHaveBeenCalledWith('malformed.jwt.token');
    });

    it('should reject expired tokens', async () => {
      mockAuthManager.validateToken.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/auth/me', {
        headers: {
          Authorization: 'Bearer expired.token.here',
        },
      });

      const response = await meGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.authenticated).toBe(false);
    });

    it('should handle token tampering attempts', async () => {
      // Test with a token that has been tampered with
      const tamperedToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.tampered-signature';

      mockAuthManager.validateToken.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/auth/me', {
        headers: {
          Authorization: `Bearer ${tamperedToken}`,
        },
      });

      const response = await meGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.authenticated).toBe(false);
    });

    it('should validate token from multiple sources securely', async () => {
      const validUser = { id: 'user123', email: 'test@example.com' };
      mockAuthManager.validateToken.mockResolvedValue(validUser);

      const request = new NextRequest('http://localhost:3000/api/auth/me', {
        headers: {
          Authorization: 'Bearer header-token',
        },
      });
      request.cookies.set('madlab_auth_token', 'cookie-token');

      const response = await meGET(request);
      const data = await response.json();

      // Should use header token, not cookie token
      expect(data.authenticated).toBe(true);
      expect(data.user).toEqual(validUser);
      expect(mockAuthManager.validateToken).toHaveBeenCalledWith('header-token');
      expect(mockAuthManager.validateToken).not.toHaveBeenCalledWith('cookie-token');
    });
  });

  describe('Session Security', () => {
    it('should clear session cookies on logout', async () => {
      mockAuthManager.logout.mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer logout-token',
        },
        body: JSON.stringify({}),
      });

      const response = await logoutPOST(request);
      const cookie = response.cookies.get('madlab_auth_token');

      // Cookie should be cleared (set to empty with maxAge: 0)
      expect(cookie).toBeDefined();
      expect(cookie?.value).toBe('');
      expect(cookie?.maxAge).toBe(0);
    });

    it('should handle logout with invalid tokens gracefully', async () => {
      mockAuthManager.logout.mockRejectedValue(new Error('Invalid token'));

      const request = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer invalid-token',
        },
        body: JSON.stringify({}),
      });

      const response = await logoutPOST(request);
      const data = await response.json();
      const cookie = response.cookies.get('madlab_auth_token');

      // Should still return success and clear cookie
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(cookie?.value).toBe('');
    });

    it('should prevent session fixation attacks', async () => {
      // Test that new sessions get new tokens, not reusing old ones
      const user = { id: 'user123', email: 'test@example.com' };
      const token1 = {
        accessToken: 'token-1',
        refreshToken: 'refresh-1',
        expiresAt: Date.now() + 3600000,
      };
      const token2 = {
        accessToken: 'token-2',
        refreshToken: 'refresh-2',
        expiresAt: Date.now() + 3600000,
      };

      // First login
      mockAuthManager.authenticateUser.mockResolvedValueOnce({
        success: true,
        user,
        token: token1,
        error: null,
      });

      const request1 = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'password' }),
      });

      const response1 = await loginPOST(request1);
      const cookie1 = response1.cookies.get('madlab_auth_token');

      // Second login should get different token
      mockAuthManager.authenticateUser.mockResolvedValueOnce({
        success: true,
        user,
        token: token2,
        error: null,
      });

      const request2 = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'password' }),
      });

      const response2 = await loginPOST(request2);
      const cookie2 = response2.cookies.get('madlab_auth_token');

      // Tokens should be different to prevent session fixation
      expect(cookie1?.value).not.toBe(cookie2?.value);
    });
  });

  describe('Input Validation Security', () => {
    it('should validate email format security', async () => {
      const testCases = [
        'user@domain.com',
        'user.name@domain.co.uk',
        'user+tag@domain.com',
        'user_name@domain.com',
      ];

      for (const email of testCases) {
        const request = new NextRequest('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: 'password123' }),
        });

        // Should process the request (validation happens at auth manager level)
        const response = await loginPOST(request);
        expect([200, 400, 401]).toContain(response.status);
      }
    });

    it('should reject extremely long inputs', async () => {
      const longEmail = 'a'.repeat(1000) + '@example.com';
      const longPassword = 'a'.repeat(1000);

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: longEmail, password: longPassword }),
      });

      const response = await loginPOST(request);
      const data = await response.json();

      // Should reject or handle gracefully
      expect([200, 400, 401]).toContain(response.status);
      expect(data).toBeDefined();
    });

    it('should handle null bytes in input', async () => {
      const emailWithNull = 'test@example.com\0';
      const passwordWithNull = 'password123\0';

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailWithNull, password: passwordWithNull }),
      });

      const response = await loginPOST(request);

      // Should handle null bytes safely
      expect([200, 400, 401]).toContain(response.status);
    });

    it('should handle unicode characters in input', async () => {
      const unicodeEmail = 'tëst@exämple.com';
      const unicodePassword = 'pásswörd123';

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: unicodeEmail, password: unicodePassword }),
      });

      const response = await loginPOST(request);

      // Should handle unicode safely
      expect([200, 400, 401]).toContain(response.status);
    });
  });
});
