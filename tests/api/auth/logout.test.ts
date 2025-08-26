/**
 * Tests for Auth Logout API Endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the auth manager
vi.mock('@/lib/enterprise/auth', () => ({
  authManager: {
    logout: vi.fn(),
  },
}));

// Import after mocks
import { POST } from '@/app/api/auth/logout/route';
import { authManager } from '@/lib/enterprise/auth';

const mockAuthManager = vi.mocked(authManager);

describe('Auth Logout API - POST /api/auth/logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 when no token provided', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      error: 'Missing token',
    });

    expect(mockAuthManager.logout).not.toHaveBeenCalled();
  });

  it('should extract token from Authorization header', async () => {
    mockAuthManager.logout.mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost:3000/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer header-logout-token',
      },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
    });

    expect(mockAuthManager.logout).toHaveBeenCalledWith('header-logout-token');
  });

  it('should extract token from cookie', async () => {
    mockAuthManager.logout.mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost:3000/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    request.cookies.set('madlab_auth_token', 'cookie-logout-token');

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
    });

    expect(mockAuthManager.logout).toHaveBeenCalledWith('cookie-logout-token');
  });

  it('should extract token from request body', async () => {
    mockAuthManager.logout.mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost:3000/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: 'body-logout-token',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
    });

    expect(mockAuthManager.logout).toHaveBeenCalledWith('body-logout-token');
  });

  it('should prioritize Authorization header over cookie and body', async () => {
    mockAuthManager.logout.mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost:3000/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer priority-header-token',
      },
      body: JSON.stringify({
        token: 'body-token',
      }),
    });
    request.cookies.set('madlab_auth_token', 'cookie-token');

    await POST(request);

    expect(mockAuthManager.logout).toHaveBeenCalledWith('priority-header-token');
    expect(mockAuthManager.logout).not.toHaveBeenCalledWith('cookie-token');
    expect(mockAuthManager.logout).not.toHaveBeenCalledWith('body-token');
  });

  it('should prioritize cookie over request body', async () => {
    mockAuthManager.logout.mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost:3000/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: 'body-token',
      }),
    });
    request.cookies.set('madlab_auth_token', 'priority-cookie-token');

    await POST(request);

    expect(mockAuthManager.logout).toHaveBeenCalledWith('priority-cookie-token');
    expect(mockAuthManager.logout).not.toHaveBeenCalledWith('body-token');
  });

  it('should clear auth cookie on successful logout', async () => {
    mockAuthManager.logout.mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost:3000/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({}),
    });

    const response = await POST(request);

    // Check that the cookie is cleared
    const cookie = response.cookies.get('madlab_auth_token');
    expect(cookie).toBeDefined();
    expect(cookie?.value).toBe('');
    expect(cookie?.maxAge).toBe(0);
  });

  it('should handle auth manager logout errors gracefully', async () => {
    mockAuthManager.logout.mockRejectedValue(new Error('Logout service error'));

    const request = new NextRequest('http://localhost:3000/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer error-token',
      },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
    });

    // Should still clear the cookie even if logout service fails
    const cookie = response.cookies.get('madlab_auth_token');
    expect(cookie).toBeDefined();
    expect(cookie?.value).toBe('');
  });

  it('should handle malformed Authorization header', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'InvalidFormat',
      },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      error: 'Missing token',
    });
  });

  it('should handle empty Bearer token', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ',
      },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      error: 'Missing token',
    });
  });

  it('should handle JSON parsing errors', async () => {
    mockAuthManager.logout.mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost:3000/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer fallback-token',
      },
      body: 'invalid json',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
    });

    // Should fallback to header token when JSON parsing fails
    expect(mockAuthManager.logout).toHaveBeenCalledWith('fallback-token');
  });
});
