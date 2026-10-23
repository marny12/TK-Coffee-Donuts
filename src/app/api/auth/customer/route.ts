import { CUSTOMER_COOKIE, cookieOptions, createToken, hashPassword, verifyPasswordHash } from '@/lib/auth';
import { updateState } from '@/lib/store';
import type { Customer } from '@/lib/types';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface CustomerRequest {
  mode: 'login' | 'register';
  name?: string;
  phone?: string;
  email?: string;
  password?: string;
}

const clean = (value: string | undefined, max = 120): string => (value ?? '').trim().slice(0, max);

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as CustomerRequest;
  const email = clean(body.email).toLowerCase();
  const password = body.password ?? '';
  if (!email.includes('@') || password.length < 6) {
    return NextResponse.json({ error: 'Use a valid email and a password of at least 6 characters.' }, { status: 400 });
  }

  let customer: Customer | undefined;
  let error: string | undefined;
  await updateState((state) => {
    const existing = state.customers.find((candidate) => candidate.email === email);
    if (body.mode === 'register') {
      if (existing) {
        error = 'That email already has an account. Log in instead.';
        return;
      }
      const name = clean(body.name, 80);
      const phone = clean(body.phone, 40);
      if (!name || !phone) {
        error = 'Name and phone are needed to create the account.';
        return;
      }
      customer = {
        id: `cust_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        name,
        phone,
        email,
        passwordHash: hashPassword(password),
        createdAt: new Date().toISOString(),
      };
      state.customers.push(customer);
      return;
    }
    if (!existing || !verifyPasswordHash(password, existing.passwordHash)) {
      error = 'Email or password did not match.';
      return;
    }
    customer = existing;
  });

  if (error || !customer) return NextResponse.json({ error: error ?? 'Could not sign in.' }, { status: 401 });
  const found = customer as Customer;
  const token = await createToken({ role: 'customer', id: found.id, name: found.name, email: found.email, phone: found.phone }, 30);
  const response = NextResponse.json({ ok: true, customer: { id: found.id, name: found.name, phone: found.phone, email: found.email } });
  response.cookies.set(CUSTOMER_COOKIE, token, cookieOptions(30 * 24 * 60 * 60));
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(CUSTOMER_COOKIE, '', { ...cookieOptions(0), maxAge: 0 });
  return response;
}
