/**
 * Tests for Auth Login API Endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the auth manager
vi.mock('@/lib/enterprise/auth', () => ({
  authManager: {
    authenticateUser: vi.fn(),
  },
}));

// Import after mocks
import { POST } from '@/app/api/auth/login/route';
import { authManager } from '@/lib/enterprise/auth';

const mockAuthManager = vi.mocked(authManager);

describe('Auth Login API - POST /api/auth/login', () => {
  const mockUser = {
    id: 'user123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    createdAt: '2025-01-20T10:00:00Z',
  };

  const mockToken = {
    accessToken: 'mock-jwt-token',
    refreshToken: 'mock-refresh-token',
    expiresAt: Date.now() + 3600000, // 1 hour
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock process.env
    vi.stubEnv('NODE_ENV', 'development');
  });

  it('should successfully authenticate user with valid credentials', async () => {
    const authResponse = {
      success: true,
      user: mockUser,
      token: mockToken,
      error: null,
    };

    mockAuthManager.authenticateUser.mockResolvedValue(authResponse);

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '192.168.1.100',
        'user-agent': 'Test Browser',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      user: mockUser,
      token: mockToken,
    });

    // Check that auth token cookie is set
    const cookie = response.cookies.get('madlab_auth_token');
    expect(cookie).toBeDefined();
    expect(cookie?.value).toBe('mock-jwt-token');
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe('lax');
    expect(cookie?.path).toBe('/');
    expect(cookie?.secure).toBe(false); // development environment

    // Verify auth manager was called with correct parameters
    expect(mockAuthManager.authenticateUser).toHaveBeenCalledWith(
      'test@example.com',
      'password123',
      '192.168.1.100',
      'Test Browser'
    );
  });

  it('should set secure cookie in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');

    const authResponse = {
      success: true,
      user: mockUser,
      token: mockToken,
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

    const response = await POST(request);
    const cookie = response.cookies.get('madlab_auth_token');

    expect(cookie?.secure).toBe(true);
  });

  it('should return 400 when email is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      error: 'Email and password required',
    });

    expect(mockAuthManager.authenticateUser).not.toHaveBeenCalled();
  });

  it('should return 400 when password is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      error: 'Email and password required',
    });
  });

  it('should return 401 when authentication fails', async () => {
    const authResponse = {
      success: false,
      user: null,
      token: null,
      error: 'Invalid password',
    };

    mockAuthManager.authenticateUser.mockResolvedValue(authResponse);

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'wrongpassword',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({
      error: 'Invalid password',
    });

    // Check that no auth cookie is set
    const cookie = response.cookies.get('madlab_auth_token');
    expect(cookie).toBeUndefined();
  });

  it('should return 401 when auth response is malformed', async () => {
    const authResponse = {
      success: true,
      user: null, // Missing user
      token: null, // Missing token
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

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({
      error: 'Invalid credentials',
    });
  });

  it('should handle authentication service errors', async () => {
    mockAuthManager.authenticateUser.mockRejectedValue(new Error('Database error'));

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

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      error: 'Login failed',
    });
  });

  it('should handle invalid JSON in request body', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: 'invalid json',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      error: 'Login failed',
    });
  });

  it('should handle missing IP and user agent headers', async () => {
    const authResponse = {
      success: true,
      user: mockUser,
      token: mockToken,
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

    await POST(request);

    // Should pass 'unknown' for IP when headers are missing
    expect(mockAuthManager.authenticateUser).toHaveBeenCalledWith(
      'test@example.com',
      'password123',
      'unknown',
      ''
    );
  });
});
