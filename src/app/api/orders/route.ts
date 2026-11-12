import { CATEGORIES } from '@/data/seed';
import { lineKey, selectionLabels, unitPriceCents } from '@/lib/pricing';
import { PosIntakeError, submitPosOrder, translateOrderLines, type PosIntakeLine } from '@/lib/pos-intake';
import { getSessions } from '@/lib/server-session';
import { createSquarePayment, SquarePaymentError, squareConfig } from '@/lib/square';
import { getState, updateState } from '@/lib/store';
import type { CartSelection, Order, OrderLine } from '@/lib/types';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * THE ordering door. Every website order is forwarded to the TK POS
 * (onlineOrderIntake) — the POS validates and re-prices it from its own
 * book and works it from its Orders tab. Two ways to pay:
 *  - pickup (default): the order lands at the POS unpaid; the customer
 *    pays at the shop.
 *  - square: the POS quotes the exact total first, Square charges the
 *    card, and ONLY on Square's confirmation does the order go to the
 *    POS marked paid with the Square payment id as its reference.
 * The record saved in this site's own store afterwards is a receipt
 * copy (customer history + admin list) — the POS is the working book.
 */

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
  note?: string;
  payMethod?: 'pickup' | 'square';
  sourceId?: string;
  lines: IncomingLine[];
}

const clean = (value: string | undefined, max = 120): string => (value ?? '').trim().slice(0, max);
const emptySelections = (): CartSelection => ({ flavors: {}, addons: {} });
const SHOP_PHONE = '(321) 972-1239';

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

  // Translate website lines → POS intake lines (names the POS book knows).
  let intakeLines: PosIntakeLine[];
  try {
    intakeLines = translateOrderLines(lines, state.modifiers);
  } catch (error) {
    if (error instanceof PosIntakeError) return NextResponse.json({ error: error.message }, { status: 400 });
    throw error;
  }
  const pickupNote = clean(body.note, 200) || undefined;
  const baseIntake = { customerName, phone: customerPhone, pickupNote, lines: intakeLines };

  let created: Awaited<ReturnType<typeof submitPosOrder>>;
  if (body.payMethod === 'square') {
    const cfg = squareConfig();
    if (!cfg.active) {
      return NextResponse.json(
        { error: 'Paying by card online is not turned on yet — please choose pay at the shop, or call us.' },
        { status: 503 },
      );
    }
    const sourceId = clean(body.sourceId, 200);
    if (!sourceId) return NextResponse.json({ error: 'Card details are missing — please try again.' }, { status: 400 });

    // 1) The POS quotes the exact total from its own book.
    let quote: Awaited<ReturnType<typeof submitPosOrder>>;
    try {
      quote = await submitPosOrder({ ...baseIntake, quoteOnly: true });
    } catch (error) {
      if (error instanceof PosIntakeError) return NextResponse.json({ error: error.message }, { status: 502 });
      throw error;
    }
    // 2) Square charges that exact total. No confirmation, no order.
    let payment: { paymentId: string; status: string };
    try {
      payment = await createSquarePayment({
        sourceId,
        amountC: quote.totalC,
        note: `TK Coffee & Donuts online order — ${customerName} · ${customerPhone}`,
      });
    } catch (error) {
      if (error instanceof SquarePaymentError) return NextResponse.json({ error: error.message }, { status: 402 });
      throw error;
    }
    // 3) Only now does the order reach the POS, marked paid.
    try {
      created = await submitPosOrder({
        ...baseIntake,
        paid: { processor: 'square', ref: payment.paymentId },
        clientQuotedTotalC: quote.totalC,
      });
    } catch (error) {
      console.error('Square payment confirmed but POS intake failed', payment.paymentId, error);
      return NextResponse.json(
        {
          error: `Your card was charged, but the order did not reach the shop. Please call ${SHOP_PHONE} and give payment number ${payment.paymentId} — we will make it right.`,
        },
        { status: 500 },
      );
    }
  } else {
    try {
      created = await submitPosOrder(baseIntake);
    } catch (error) {
      if (error instanceof PosIntakeError) return NextResponse.json({ error: error.message }, { status: 502 });
      throw error;
    }
  }

  // Receipt copy for customer history + the site admin list. The POS
  // order number and POS total are the real ones.
  const order = await updateState((draft) => {
    const createdOrder: Order = {
      id: `pos_${created.orderId}`,
      number: created.orderNumber,
      createdAt: new Date().toISOString(),
      customerType: body.customerType,
      customerId,
      customerName,
      customerPhone,
      customerEmail,
      lines,
      totalCents: created.totalC,
      status: 'New',
      posOrderId: created.orderId,
      posPaymentRef: created.paymentRef || undefined,
      paidOnline: created.paid,
    };
    draft.orders.unshift(createdOrder);
    return createdOrder;
  });

  return NextResponse.json({ ok: true, order });
}
