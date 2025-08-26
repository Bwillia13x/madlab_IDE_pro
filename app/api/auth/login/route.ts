import { NextRequest, NextResponse } from 'next/server';
import { authManager } from '@/lib/enterprise/auth';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = (await req.json()) as { email?: string; password?: string };
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const ua = req.headers.get('user-agent') || '';
    const res = await authManager.authenticateUser(email, password, ip, ua);
    if (!res.success || !res.user || !res.token) {
      return NextResponse.json({ error: res.error || 'Invalid credentials' }, { status: 401 });
    }
    const response = NextResponse.json({ user: res.user, token: res.token });
    // Set a cookie compatible with middleware; prefer httpOnly for security
    response.cookies.set('madlab_auth_token', res.token.accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
    });
    return response;
  } catch {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
