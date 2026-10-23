import ShopApp from '@/components/ShopApp';
import { buildBootstrap, getSessions } from '@/lib/server-session';
import { getState } from '@/lib/store';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [state, sessions] = await Promise.all([getState(), getSessions()]);
  return <ShopApp initial={buildBootstrap(state, sessions)} />;
}
