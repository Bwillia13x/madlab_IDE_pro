/**
 * Tests for Auth Me API Endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the auth manager
vi.mock('@/lib/enterprise/auth', () => ({
  authManager: {
    validateToken: vi.fn(),
  },
}));

// Import after mocks
import { GET } from '@/app/api/auth/me/route';
import { authManager } from '@/lib/enterprise/auth';

const mockAuthManager = vi.mocked(authManager);

describe('Auth Me API - GET /api/auth/me', () => {
  const mockUser = {
    id: 'user123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    createdAt: '2025-01-20T10:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return authenticated false when no token provided', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/me');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      authenticated: false,
    });

    expect(mockAuthManager.validateToken).not.toHaveBeenCalled();
  });

  it('should extract token from Authorization header', async () => {
    mockAuthManager.validateToken.mockResolvedValue(mockUser);

    const request = new NextRequest('http://localhost:3000/api/auth/me', {
      headers: {
        Authorization: 'Bearer test-jwt-token',
      },
    });

    await GET(request);

    expect(mockAuthManager.validateToken).toHaveBeenCalledWith('test-jwt-token');
  });

  it('should extract token from cookie', async () => {
    mockAuthManager.validateToken.mockResolvedValue(mockUser);

    const request = new NextRequest('http://localhost:3000/api/auth/me');
    // Mock the cookies
    request.cookies.set('madlab_auth_token', 'cookie-jwt-token');

    await GET(request);

    expect(mockAuthManager.validateToken).toHaveBeenCalledWith('cookie-jwt-token');
  });

  it('should prioritize Authorization header over cookie', async () => {
    mockAuthManager.validateToken.mockResolvedValue(mockUser);

    const request = new NextRequest('http://localhost:3000/api/auth/me', {
      headers: {
        Authorization: 'Bearer header-token',
      },
    });
    request.cookies.set('madlab_auth_token', 'cookie-token');

    await GET(request);

    expect(mockAuthManager.validateToken).toHaveBeenCalledWith('header-token');
    expect(mockAuthManager.validateToken).not.toHaveBeenCalledWith('cookie-token');
  });

  it('should return user data when token is valid', async () => {
    mockAuthManager.validateToken.mockResolvedValue(mockUser);

    const request = new NextRequest('http://localhost:3000/api/auth/me', {
      headers: {
        Authorization: 'Bearer valid-token',
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      authenticated: true,
      user: mockUser,
    });
  });

  it('should return authenticated false when token is invalid', async () => {
    mockAuthManager.validateToken.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/auth/me', {
      headers: {
        Authorization: 'Bearer invalid-token',
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      authenticated: false,
    });
  });

  it('should handle malformed Authorization header', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/me', {
      headers: {
        Authorization: 'InvalidFormat',
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      authenticated: false,
    });

    expect(mockAuthManager.validateToken).not.toHaveBeenCalled();
  });

  it('should handle empty Bearer token', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/me', {
      headers: {
        Authorization: 'Bearer ',
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      authenticated: false,
    });

    expect(mockAuthManager.validateToken).not.toHaveBeenCalled();
  });

  it('should handle auth manager errors gracefully', async () => {
    mockAuthManager.validateToken.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/auth/me', {
      headers: {
        Authorization: 'Bearer valid-token',
      },
    });

    // The endpoint should handle errors internally and return false
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      authenticated: false,
      error: expect.stringContaining('Database error'),
    });
  });

  it('should handle different user roles', async () => {
    const adminUser = {
      ...mockUser,
      role: 'admin',
      permissions: ['read', 'write', 'delete'],
    };

    mockAuthManager.validateToken.mockResolvedValue(adminUser);

    const request = new NextRequest('http://localhost:3000/api/auth/me', {
      headers: {
        Authorization: 'Bearer admin-token',
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      authenticated: true,
      user: adminUser,
    });
  });
});
