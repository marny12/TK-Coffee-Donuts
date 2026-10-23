import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export const ACCESS_COOKIE = 'tk_access';
export const ADMIN_COOKIE = 'tk_admin';
export const CUSTOMER_COOKIE = 'tk_customer';

/** Local development only. These are refused when NODE_ENV=production. */
export const DEV_ACCESS_PASSWORD = 'dev-access-only';
export const DEV_ADMIN_PASSWORD = 'dev-admin-only';

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('base64url');
  const hash = scryptSync(password, salt, 64).toString('base64url');
  return `scrypt:${salt}:${hash}`;
}

export function verifyPasswordHash(password: string, stored: string | undefined): boolean {
  if (!stored?.startsWith('scrypt:')) return false;
  const [, salt, expected] = stored.split(':');
  if (!salt || !expected) return false;
  const actual = scryptSync(password, salt, 64);
  const expectedBuffer = Buffer.from(expected, 'base64url');
  return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
}

export type PasswordCheck = { ok: true; mode: 'env' | 'dev-placeholder' } | { ok: false; mode: 'locked' | 'wrong' };

export function checkConfiguredPassword(kind: 'access' | 'admin', candidate: string): PasswordCheck {
  const envName = kind === 'access' ? 'SITE_ACCESS_PASSWORD_HASH' : 'ADMIN_PASSWORD_HASH';
  const configured = process.env[envName];
  if (configured) return verifyPasswordHash(candidate, configured) ? { ok: true, mode: 'env' } : { ok: false, mode: 'wrong' };

  const devAllowed = process.env.NODE_ENV !== 'production' && process.env.ALLOW_DEV_PLACEHOLDERS === 'true';
  if (devAllowed) {
    const placeholder = kind === 'access' ? DEV_ACCESS_PASSWORD : DEV_ADMIN_PASSWORD;
    return candidate === placeholder ? { ok: true, mode: 'dev-placeholder' } : { ok: false, mode: 'wrong' };
  }
  return { ok: false, mode: 'locked' };
}

export interface SessionPayload {
  role: 'access' | 'admin' | 'customer';
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  exp: number;
}

function signingSecret(): string {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  if (process.env.NODE_ENV !== 'production') return 'tk-local-development-signing-secret';
  // Production last-mile setup sets AUTH_SECRET. This derivation only keeps a misconfigured
  // deployment from becoming unsigned; it is not a substitute for setting AUTH_SECRET.
  return `${process.env.SITE_ACCESS_PASSWORD_HASH ?? ''}:${process.env.ADMIN_PASSWORD_HASH ?? ''}:tk`;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

function base64urlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

export async function createToken(payload: Omit<SessionPayload, 'exp'>, days = 30): Promise<string> {
  const body: SessionPayload = { ...payload, exp: Math.floor(Date.now() / 1000) + days * 24 * 60 * 60 };
  const encoded = base64urlJson(body);
  const key = await hmacKey(signingSecret());
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(encoded));
  return `${encoded}.${Buffer.from(signature).toString('base64url')}`;
}

export async function verifyToken(token: string | undefined, role?: SessionPayload['role']): Promise<SessionPayload | null> {
  if (!token) return null;
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return null;
  try {
    const key = await hmacKey(signingSecret());
    const ok = await crypto.subtle.verify(
      'HMAC',
      key,
      Uint8Array.from(Buffer.from(signature, 'base64url')),
      new TextEncoder().encode(encoded),
    );
    if (!ok) return null;
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as SessionPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (role && payload.role !== role) return null;
    return payload;
  } catch {
    return null;
  }
}

export function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeSeconds,
  };
}
