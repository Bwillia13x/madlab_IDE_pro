import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const enforceAuth = String(process.env.NEXT_PUBLIC_FEATURE_AUTH || '').toLowerCase() === 'true';
  if (!enforceAuth) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (!pathname.startsWith('/api')) return NextResponse.next();
  if (pathname.startsWith('/api/health') || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ')
    ? auth.slice('Bearer '.length)
    : (req.cookies.get('madlab_auth_token')?.value || '');

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};

