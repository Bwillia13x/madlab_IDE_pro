import { NextRequest, NextResponse } from 'next/server';
import { DocumentationGenerator } from '@/lib/documentation/generator';

export async function POST(_req: NextRequest) {
  const isDev = process.env.NODE_ENV !== 'production';
  if (!isDev) {
    return NextResponse.json({ success: false, message: 'Docs generation disabled in production' }, { status: 403 });
  }
  try {
    const gen = new DocumentationGenerator('./docs');
    await gen.generateDocumentation();
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'generation error' }, { status: 500 });
  }
}

