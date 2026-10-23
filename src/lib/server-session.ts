import { ACCESS_COOKIE, ADMIN_COOKIE, CUSTOMER_COOKIE, verifyToken, type SessionPayload } from '@/lib/auth';
import type { AppState, BootstrapState } from '@/lib/types';
import { cookies } from 'next/headers';

export interface RequestSessions {
  access: SessionPayload | null;
  admin: SessionPayload | null;
  customer: SessionPayload | null;
}

export async function getSessions(): Promise<RequestSessions> {
  const jar = await cookies();
  const [access, admin, customer] = await Promise.all([
    verifyToken(jar.get(ACCESS_COOKIE)?.value, 'access'),
    verifyToken(jar.get(ADMIN_COOKIE)?.value, 'admin'),
    verifyToken(jar.get(CUSTOMER_COOKIE)?.value, 'customer'),
  ]);
  return { access, admin, customer };
}

export function buildBootstrap(state: AppState, sessions: RequestSessions): BootstrapState {
  const customer = sessions.customer?.id
    ? state.customers.find((candidate) => candidate.id === sessions.customer?.id)
    : undefined;
  return {
    items: state.items,
    modifiers: state.modifiers,
    media: state.media,
    session: {
      hasAccess: Boolean(sessions.access || sessions.admin),
      admin: Boolean(sessions.admin),
      customer: customer
        ? { id: customer.id, name: customer.name, phone: customer.phone, email: customer.email }
        : undefined,
    },
    myOrders: customer ? state.orders.filter((order) => order.customerId === customer.id) : [],
    adminData: sessions.admin ? { orders: state.orders, applications: state.applications } : undefined,
  };
}
