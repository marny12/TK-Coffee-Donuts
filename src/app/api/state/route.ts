import { buildBootstrap, getSessions } from '@/lib/server-session';
import { getState } from '@/lib/store';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const [state, sessions] = await Promise.all([getState(), getSessions()]);
  return NextResponse.json(buildBootstrap(state, sessions));
}
