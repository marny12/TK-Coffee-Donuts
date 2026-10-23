import { updateState } from '@/lib/store';
import type { Application } from '@/lib/types';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const clean = (value: string | undefined, max = 500): string => (value ?? '').trim().slice(0, max);

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Partial<Application>;
  const application: Application = {
    id: `app_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    name: clean(body.name, 80),
    phone: clean(body.phone, 40),
    email: clean(body.email, 120),
    position: clean(body.position, 80),
    availability: clean(body.availability, 200),
    message: clean(body.message, 1000),
  };
  if (!application.name || !application.phone || !application.position) {
    return NextResponse.json({ error: 'Name, phone, and the role you want are required.' }, { status: 400 });
  }
  await updateState((state) => {
    state.applications.unshift(application);
  });
  return NextResponse.json({ ok: true, application });
}
