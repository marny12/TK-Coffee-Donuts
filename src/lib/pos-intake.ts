/**
 * TK POS order intake — SERVER ONLY.
 *
 * This module runs only in server code (the /api/orders route). It holds
 * the shared intake key and the POS address; neither may ever be sent to
 * the browser. The browser talks to /api/orders; this module talks to
 * the POS.
 *
 * Flow: website cart line → translateOrderLine() (website ids become
 * POS item/modifier NAMES via pos-menu-map) → submitPosOrder() → the
 * POS validates every line against its own book, re-prices from the
 * book (7% tax included), and files the order in its Orders tab as
 * Online. The POS total in the response is the final word.
 */
import { POS_DOZEN_BY_SITE_ID, POS_ITEM_BY_SITE_ID, POS_MOD_BY_SITE_ID } from '@/lib/pos-menu-map';
import type { ModifierOption, OrderLine } from '@/lib/types';

export class PosIntakeError extends Error {}

export interface PosIntakeLine {
  itemName: string;
  qty: number;
  mods: { modName: string; qty: number }[];
  notes: string[];
}

export interface PosSubmitRequest {
  customerName: string;
  phone: string;
  pickupNote?: string;
  lines: PosIntakeLine[];
  paid?: { processor: 'square'; ref: string };
  clientQuotedTotalC?: number;
  quoteOnly?: boolean;
}

export interface PosSubmitResult {
  orderId: string;
  orderNumber: number;
  subtotalC: number;
  taxC: number;
  totalC: number;
  paid: boolean;
  paymentRef: string;
  message: string;
  quote?: boolean;
}

function posApiUrl(): string {
  return process.env.TK_POS_API_URL || 'https://tk-pos-three.vercel.app/api';
}

function intakeKey(): string {
  const key = process.env.TK_INTAKE_KEY || '';
  if (!key) {
    throw new PosIntakeError('Online ordering is not turned on yet — please call the shop to order.');
  }
  return key;
}

const optionName = (modifiers: ModifierOption[], id: string | undefined): string | undefined =>
  id ? modifiers.find((option) => option.id === id)?.name : undefined;

/**
 * Translate one website cart line into a POS intake line. Throws
 * PosIntakeError with a plain, customer-safe message when the item or a
 * priced add-on has no POS counterpart.
 */
export function translateOrderLine(line: OrderLine, modifiers: ModifierOption[]): PosIntakeLine {
  const posName =
    line.variant === 'dozen' ? POS_DOZEN_BY_SITE_ID[line.itemId] : POS_ITEM_BY_SITE_ID[line.itemId];
  if (!posName) {
    throw new PosIntakeError(
      line.variant === 'dozen'
        ? `A dozen ${line.name} isn't available for online ordering yet — please call the shop.`
        : `${line.name} isn't available for online ordering yet — please call the shop.`,
    );
  }

  const mods: PosIntakeLine['mods'] = [];
  const pushMod = (siteModId: string, qty: number) => {
    if (!qty || qty < 1) return;
    const posModName = POS_MOD_BY_SITE_ID[siteModId];
    if (!posModName) {
      const siteName = optionName(modifiers, siteModId) ?? 'That add-on';
      throw new PosIntakeError(`${siteName} isn't available for online ordering yet — please call the shop.`);
    }
    mods.push({ modName: posModName, qty });
  };
  for (const [id, qty] of Object.entries(line.selections.flavors ?? {})) pushMod(id, qty);
  for (const [id, qty] of Object.entries(line.selections.addons ?? {})) pushMod(id, qty);

  // Size / sugar / ice are prep instructions for the kitchen ticket.
  const notes: string[] = [];
  const size = optionName(modifiers, line.selections.sizeId);
  if (size) notes.push(size);
  const sugar = optionName(modifiers, line.selections.sugarId);
  if (sugar) notes.push(`Sugar ${sugar}`);
  const ice = optionName(modifiers, line.selections.iceId);
  if (ice) notes.push(ice);
  if (line.variant === 'dozen') notes.push('Dozen');

  return { itemName: posName, qty: line.quantity, mods, notes };
}

export function translateOrderLines(lines: OrderLine[], modifiers: ModifierOption[]): PosIntakeLine[] {
  return lines.map((line) => translateOrderLine(line, modifiers));
}

/** POST one order (or quote) to the POS intake. Never call from the browser. */
export async function submitPosOrder(req: PosSubmitRequest): Promise<PosSubmitResult> {
  const key = intakeKey();
  let response: Response;
  try {
    response = await fetch(posApiUrl(), {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-tk-intake-key': key },
      body: JSON.stringify({ action: 'onlineOrderIntake', ...req }),
      signal: AbortSignal.timeout(12000),
    });
  } catch {
    throw new PosIntakeError('The shop could not be reached — please call us to order.');
  }
  const data = (await response.json().catch(() => ({}))) as Partial<PosSubmitResult> & { ok?: boolean; error?: string };
  if (!response.ok || !data.ok) {
    throw new PosIntakeError(data.error || 'The shop could not take that order — please call us to order.');
  }
  return {
    orderId: String(data.orderId ?? ''),
    orderNumber: Number(data.orderNumber ?? 0),
    subtotalC: Number(data.subtotalC ?? 0),
    taxC: Number(data.taxC ?? 0),
    totalC: Number(data.totalC ?? 0),
    paid: Boolean(data.paid),
    paymentRef: String(data.paymentRef ?? ''),
    message: String(data.message ?? ''),
    quote: Boolean(data.quote),
  };
}
