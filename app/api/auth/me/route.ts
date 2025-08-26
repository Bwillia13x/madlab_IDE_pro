import { NextRequest, NextResponse } from 'next/server';
import { authManager } from '@/lib/enterprise/auth';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ')
      ? auth.slice('Bearer '.length)
      : req.cookies.get('madlab_auth_token')?.value || '';

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    const user = await authManager.validateToken(token);

    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    return NextResponse.json({ authenticated: true, user });
  } catch (error) {
    console.error('Auth validation error:', error);
    return NextResponse.json(
      {
        authenticated: false,
        error: error instanceof Error ? error.message : 'Authentication error',
      },
      { status: 200 }
    );
  }
}
