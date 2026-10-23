import { CATEGORIES } from '@/data/seed';
import { lineKey, selectionLabels, unitPriceCents } from '@/lib/pricing';
import { getSessions } from '@/lib/server-session';
import { getState, updateState } from '@/lib/store';
import type { CartSelection, Order, OrderLine } from '@/lib/types';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface IncomingLine {
  itemId: string;
  variant?: 'single' | 'dozen';
  quantity: number;
  selections?: Partial<CartSelection>;
}

interface OrderRequest {
  customerType: 'guest' | 'account';
  name?: string;
  phone?: string;
  lines: IncomingLine[];
}

const clean = (value: string | undefined, max = 120): string => (value ?? '').trim().slice(0, max);
const emptySelections = (): CartSelection => ({ flavors: {}, addons: {} });

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as OrderRequest;
  if (!Array.isArray(body.lines) || body.lines.length === 0) {
    return NextResponse.json({ error: 'Your order is empty.' }, { status: 400 });
  }
  const sessions = await getSessions();
  const state = await getState();

  let customerId: string | undefined;
  let customerName = clean(body.name, 80);
  let customerPhone = clean(body.phone, 40);
  let customerEmail: string | undefined;
  if (body.customerType === 'account') {
    const customer = sessions.customer?.id ? state.customers.find((candidate) => candidate.id === sessions.customer?.id) : undefined;
    if (!customer) return NextResponse.json({ error: 'Log in or create an account first, or check out as guest.' }, { status: 401 });
    customerId = customer.id;
    customerName = customer.name;
    customerPhone = customer.phone;
    customerEmail = customer.email;
  } else if (!customerName || !customerPhone) {
    return NextResponse.json({ error: 'Guest checkout needs a name and phone for pickup.' }, { status: 400 });
  }

  const lines: OrderLine[] = [];
  for (const incoming of body.lines.slice(0, 50)) {
    const item = state.items.find((candidate) => candidate.id === incoming.itemId);
    if (!item) return NextResponse.json({ error: 'One item is no longer on the menu.' }, { status: 400 });
    const quantity = Math.max(1, Math.min(99, Math.floor(incoming.quantity) || 1));
    const selections: CartSelection = {
      ...emptySelections(),
      ...(incoming.selections ?? {}),
      flavors: incoming.selections?.flavors ?? {},
      addons: incoming.selections?.addons ?? {},
    };
    const variant = incoming.variant === 'dozen' && item.dozenPriceCents ? 'dozen' : 'single';
    const category = CATEGORIES.find((candidate) => candidate.id === item.categoryId);
    lines.push({
      key: lineKey(item.id, variant, selections),
      itemId: item.id,
      name: item.name,
      categoryId: item.categoryId,
      categoryName: category?.name ?? item.categoryId,
      variant,
      quantity,
      unitPriceCents: unitPriceCents(item, variant, selections, state.modifiers),
      selections,
      selectionLabels: selectionLabels(item, selections, state.modifiers),
    });
  }

  const order = await updateState((draft) => {
    const created: Order = {
      id: `order_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      number: draft.nextOrderNumber++,
      createdAt: new Date().toISOString(),
      customerType: body.customerType,
      customerId,
      customerName,
      customerPhone,
      customerEmail,
      lines,
      totalCents: lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0),
      status: 'New',
    };
    draft.orders.unshift(created);
    return created;
  });

  return NextResponse.json({ ok: true, order });
}
