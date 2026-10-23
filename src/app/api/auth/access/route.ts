import { ACCESS_COOKIE, checkConfiguredPassword, cookieOptions, createToken } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const { password } = (await request.json().catch(() => ({}))) as { password?: string };
  const check = checkConfiguredPassword('access', password ?? '');
  if (!check.ok) {
    return NextResponse.json(
      { error: check.mode === 'locked' ? 'Restricted access is not configured yet.' : 'That password did not match.' },
      { status: check.mode === 'locked' ? 503 : 401 },
    );
  }
  const token = await createToken({ role: 'access' }, 30);
  const response = NextResponse.json({ ok: true, mode: check.mode });
  response.cookies.set(ACCESS_COOKIE, token, cookieOptions(30 * 24 * 60 * 60));
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ACCESS_COOKIE, '', { ...cookieOptions(0), maxAge: 0 });
  return response;
}
