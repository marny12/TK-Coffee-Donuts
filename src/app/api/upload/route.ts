import { getSessions } from '@/lib/server-session';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

export async function POST(request: Request) {
  const sessions = await getSessions();
  if (!sessions.admin) return NextResponse.json({ error: 'Owner sign-in required.' }, { status: 403 });
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'Choose a photo or video file.' }, { status: 400 });
  if (file.size > 15 * 1024 * 1024) return NextResponse.json({ error: 'Files are limited to 15 MB in this build.' }, { status: 413 });
  const extension = EXTENSIONS[file.type];
  if (!extension) return NextResponse.json({ error: 'Use JPG, PNG, WebP, GIF, MP4, WebM, or MOV.' }, { status: 400 });

  const name = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const directory = path.join(process.cwd(), 'public', 'uploads');
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, name), Buffer.from(await file.arrayBuffer()));
  return NextResponse.json({ ok: true, url: `/uploads/${name}` });
}
