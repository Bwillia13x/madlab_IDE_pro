import { NextRequest, NextResponse } from 'next/server';
import { authManager } from '@/lib/enterprise/auth';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ')
      ? auth.slice('Bearer '.length)
      : (req.cookies.get('madlab_auth_token')?.value || (await req.json()).token || '');
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    await authManager.logout(token);
    const resp = NextResponse.json({ success: true });
    resp.cookies.set('madlab_auth_token', '', { maxAge: 0 });
    return resp;
  } catch {
    const resp = NextResponse.json({ success: true });
    resp.cookies.set('madlab_auth_token', '', { maxAge: 0 });
    return resp;
  }
}

