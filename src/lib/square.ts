/**
 * Square card payments — SERVER ONLY (except the public ids below).
 *
 * Mirrors the legacy site's Square setup (SQUARE_ACCESS_TOKEN +
 * SQUARE_LOCATION_ID env vars, Web Payments SDK source id → Payments
 * API), rebuilt for this app. The access token never leaves the server.
 *
 * Everything sits behind SQUARE_ENABLED: unless it is exactly "true"
 * AND the application id, location id and access token are all set,
 * card pay is OFF — the order panel hides "Pay now with card" and the
 * orders route refuses square payments. The application id + location
 * id are public identifiers (the Web Payments SDK needs them in the
 * browser); they are exposed to the page through buildBootstrap ONLY
 * when pay is fully on.
 *
 * To turn it on (Vercel project env, website project):
 *   SQUARE_ENABLED=true
 *   SQUARE_ENVIRONMENT=sandbox|production   (default sandbox)
 *   SQUARE_APPLICATION_ID=<Square app id>
 *   SQUARE_LOCATION_ID=<Square location id>
 *   SQUARE_ACCESS_TOKEN=<Square access token for that environment>
 */

export interface SquareConfig {
  active: boolean;
  environment: 'sandbox' | 'production';
  applicationId: string;
  locationId: string;
  sdkUrl: string;
}

export function squareConfig(): SquareConfig {
  const enabled = (process.env.SQUARE_ENABLED ?? '').trim().toLowerCase() === 'true';
  const environment = (process.env.SQUARE_ENVIRONMENT ?? 'sandbox').trim().toLowerCase() === 'production'
    ? 'production'
    : 'sandbox';
  const applicationId = process.env.SQUARE_APPLICATION_ID ?? '';
  const locationId = process.env.SQUARE_LOCATION_ID ?? '';
  const accessToken = process.env.SQUARE_ACCESS_TOKEN ?? '';
  return {
    active: enabled && Boolean(applicationId && locationId && accessToken),
    environment,
    applicationId,
    locationId,
    sdkUrl: environment === 'production'
      ? 'https://web.squarecdn.com/v1/square.js'
      : 'https://sandbox.web.squarecdn.com/v1/square.js',
  };
}

/** What the browser may see: nothing unless pay is fully on. */
export function squarePublicConfig(): { squarePayEnabled: boolean; squareApplicationId?: string; squareLocationId?: string; squareSdkUrl?: string } {
  const cfg = squareConfig();
  if (!cfg.active) return { squarePayEnabled: false };
  return {
    squarePayEnabled: true,
    squareApplicationId: cfg.applicationId,
    squareLocationId: cfg.locationId,
    squareSdkUrl: cfg.sdkUrl,
  };
}

function squareApiBase(): string {
  // SQUARE_API_BASE_URL exists so tests can point at a mock Square.
  if (process.env.SQUARE_API_BASE_URL) return process.env.SQUARE_API_BASE_URL.replace(/\/$/, '');
  return squareConfig().environment === 'production'
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com';
}

export class SquarePaymentError extends Error {}

/**
 * Charge a Web Payments SDK source id for an exact amount (cents).
 * Resolves ONLY on a confirmed (COMPLETED or APPROVED) payment and
 * returns the Square payment id — the proof the POS intake requires.
 */
export async function createSquarePayment(input: {
  sourceId: string;
  amountC: number;
  note: string;
}): Promise<{ paymentId: string; status: string }> {
  const cfg = squareConfig();
  if (!cfg.active) throw new SquarePaymentError('Card payment is not turned on yet.');
  if (!input.sourceId) throw new SquarePaymentError('Card details are missing — please try again.');
  if (!Number.isFinite(input.amountC) || input.amountC <= 0) {
    throw new SquarePaymentError('That total does not look right — please call the shop.');
  }
  let response: Response;
  try {
    response = await fetch(`${squareApiBase()}/v2/payments`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
        'square-version': '2025-01-23',
      },
      body: JSON.stringify({
        idempotency_key: globalThis.crypto.randomUUID(),
        source_id: input.sourceId,
        amount_money: { amount: Math.round(input.amountC), currency: 'USD' },
        location_id: cfg.locationId,
        note: input.note.slice(0, 500),
      }),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new SquarePaymentError('The card service could not be reached — please try again or pay at the shop.');
  }
  const data = (await response.json().catch(() => ({}))) as {
    payment?: { id?: string; status?: string };
    errors?: { detail?: string; code?: string }[];
  };
  const payment = data.payment;
  if (!response.ok || !payment?.id || !['COMPLETED', 'APPROVED'].includes(payment.status ?? '')) {
    const detail = data.errors?.[0]?.detail;
    throw new SquarePaymentError(detail ? `The card did not go through: ${detail}` : 'The card did not go through — please try another card or pay at the shop.');
  }
  return { paymentId: payment.id, status: payment.status ?? '' };
}
