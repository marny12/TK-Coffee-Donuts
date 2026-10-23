import { NextRequest, NextResponse } from 'next/server';

const ALWAYS_ALLOWED = ['/maintenance', '/access', '/robots.txt', '/favicon.ico', '/logo.png'];

function maintenanceOn(): boolean {
  const value = (process.env.MAINTENANCE_MODE ?? 'true').toLowerCase();
  return !['false', '0', 'off', 'no'].includes(value);
}

function signingSecret(): string {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  if (process.env.NODE_ENV !== 'production') return 'tk-local-development-signing-secret';
  return `${process.env.SITE_ACCESS_PASSWORD_HASH ?? ''}:${process.env.ADMIN_PASSWORD_HASH ?? ''}:tk`;
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function hasSiteAccess(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get('tk_access')?.value ?? request.cookies.get('tk_admin')?.value;
  if (!token) return false;
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return false;
  try {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(signingSecret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify('HMAC', key, fromBase64Url(signature) as unknown as BufferSource, new TextEncoder().encode(encoded));
    if (!ok) return false;
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(encoded))) as { role?: string; exp?: number };
    return (payload.role === 'access' || payload.role === 'admin') && (payload.exp ?? 0) > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  if (!maintenanceOn()) return NextResponse.next();
  const { pathname } = request.nextUrl;
  if (ALWAYS_ALLOWED.includes(pathname) || pathname.startsWith('/images/') || pathname.startsWith('/uploads/') || pathname === '/api/auth/access') {
    const response = NextResponse.next();
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return response;
  }
  if (await hasSiteAccess(request)) {
    const response = NextResponse.next();
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return response;
  }
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'TK Coffee & Donuts is under maintenance.' }, { status: 503, headers: { 'X-Robots-Tag': 'noindex, nofollow' } });
  }
  const url = request.nextUrl.clone();
  url.pathname = '/maintenance';
  url.search = '';
  const response = NextResponse.rewrite(url);
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
