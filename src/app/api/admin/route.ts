import { getSessions } from '@/lib/server-session';
import { updateState } from '@/lib/store';
import type { CategoryId, MediaState, ModifierGroup, ModifierOption } from '@/lib/types';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface AdminRequest {
  action: string;
  itemId?: string;
  priceCents?: number;
  modifierId?: string;
  enabled?: boolean;
  name?: string;
  group?: ModifierGroup;
  subgroup?: string;
  categoryIds?: CategoryId[];
  media?: Partial<MediaState>;
}

const slug = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'option';

export async function POST(request: Request) {
  const sessions = await getSessions();
  if (!sessions.admin) return NextResponse.json({ error: 'Owner sign-in required.' }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as AdminRequest;

  const result = await updateState((state) => {
    switch (body.action) {
      case 'updatePrice': {
        const item = state.items.find((candidate) => candidate.id === body.itemId);
        if (!item || body.priceCents === undefined) return { error: 'Item or price missing.' };
        item.priceCents = Math.max(0, Math.min(100000, Math.round(body.priceCents)));
        item.priceLabel = undefined;
        return { ok: true };
      }
      case 'setModifierEnabled': {
        const option = state.modifiers.find((candidate) => candidate.id === body.modifierId);
        if (!option || body.enabled === undefined) return { error: 'Modifier missing.' };
        option.enabled = body.enabled;
        return { ok: true };
      }
      case 'deleteModifier': {
        state.modifiers = state.modifiers.filter((candidate) => candidate.id !== body.modifierId);
        return { ok: true };
      }
      case 'addModifier': {
        const name = (body.name ?? '').trim().slice(0, 80);
        if (!name || !body.group) return { error: 'Name and group are required.' };
        const option: ModifierOption = {
          id: `${body.group}-${slug(name)}-${Math.random().toString(36).slice(2, 6)}`,
          group: body.group,
          subgroup: (body.subgroup ?? 'Owner added').trim().slice(0, 80) || 'Owner added',
          name,
          priceCents: Math.max(0, Math.min(10000, Math.round(body.priceCents ?? 0))),
          enabled: true,
          categoryIds: body.categoryIds?.length ? body.categoryIds : ['matcha', 'coffee', 'boba'],
          source: 'preview-spec',
        };
        state.modifiers.push(option);
        return { ok: true, option };
      }
      case 'updateMedia': {
        if (!body.media) return { error: 'Media patch missing.' };
        state.media = { ...state.media, ...body.media };
        return { ok: true };
      }
      default:
        return { error: 'Unknown admin action.' };
    }
  });

  if ('error' in result) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}
