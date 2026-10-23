import { ADMIN_COOKIE, checkConfiguredPassword, cookieOptions, createToken } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const { password } = (await request.json().catch(() => ({}))) as { password?: string };
  const check = checkConfiguredPassword('admin', password ?? '');
  if (!check.ok) {
    return NextResponse.json(
      { error: check.mode === 'locked' ? 'Owner sign-in is not configured yet.' : 'That password did not match.' },
      { status: check.mode === 'locked' ? 503 : 401 },
    );
  }
  const token = await createToken({ role: 'admin', name: 'Owner' }, 14);
  const response = NextResponse.json({ ok: true, mode: check.mode });
  response.cookies.set(ADMIN_COOKIE, token, cookieOptions(14 * 24 * 60 * 60));
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, '', { ...cookieOptions(0), maxAge: 0 });
  return response;
}
