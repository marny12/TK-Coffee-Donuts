'use client';

import AdminWorkspace from '@/components/AdminWorkspace';
import AiChat from '@/components/AiChat';
import { BalloonStripe, EspressoSketch } from '@/components/Art';
import OrderPanel, { makeLine, type PanelView } from '@/components/OrderPanel';
import { CATEGORIES } from '@/data/seed';
import { defaultSelections, money } from '@/lib/pricing';
import type { BootstrapState, CategoryId, Order, OrderLine } from '@/lib/types';
import { useCallback, useEffect, useRef, useState } from 'react';

const HOURS = [
  ['Monday', '7:00 AM – 2:30 PM'],
  ['Tuesday', 'CLOSED'],
  ['Wednesday', '7:00 AM – 2:30 PM'],
  ['Thursday', '7:00 AM – 2:30 PM'],
  ['Friday', '7:00 AM – 2:30 PM'],
  ['Saturday', '7:00 AM – 2:30 PM'],
  ['Sunday', '7:00 AM – 2:30 PM'],
] as const;

function upsertMany(cart: OrderLine[], additions: OrderLine[]): OrderLine[] {
  let next = [...cart];
  for (const addition of additions) {
    const existing = next.find((line) => line.key === addition.key);
    if (existing) next = next.map((line) => line.key === addition.key ? { ...line, quantity: line.quantity + addition.quantity } : line);
    else next.push(addition);
  }
  return next;
}

export default function ShopApp({ initial }: { initial: BootstrapState }) {
  const [data, setData] = useState(initial);
  const [cart, setCart] = useState<OrderLine[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelView, setPanelView] = useState<PanelView>('categories');
  const [category, setCategory] = useState<CategoryId>('matcha');
  const [confirmation, setConfirmation] = useState<Order | null>(null);
  const [toast, setToast] = useState('');
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminWorkspaceOpen, setAdminWorkspaceOpen] = useState(false);
  const [applicationSent, setApplicationSent] = useState(false);
  const [openLabel, setOpenLabel] = useState('Open today · 7:00 AM – 2:30 PM');
  const toastTimer = useRef<number | undefined>(undefined);
  const pointerStart = useRef<{ x: number; y: number; target: EventTarget | null } | null>(null);

  const refresh = useCallback(async () => {
    const response = await fetch('/api/state', { cache: 'no-store' });
    if (response.ok) setData((await response.json()) as BootstrapState);
  }, []);

  const notify = useCallback((message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 3600);
  }, []);

  useEffect(() => {
    const update = () => {
      const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
      const weekday = parts.find((part) => part.type === 'weekday')?.value;
      const minutes = Number(parts.find((part) => part.type === 'hour')?.value ?? 0) * 60 + Number(parts.find((part) => part.type === 'minute')?.value ?? 0);
      if (weekday === 'Tue') setOpenLabel('Closed today · Tuesdays are our day off');
      else if (minutes >= 420 && minutes < 870) setOpenLabel('Open now · til 2:30 PM');
      else setOpenLabel('Open today · 7:00 AM – 2:30 PM');
    };
    update();
    const timer = window.setInterval(update, 60000);
    return () => window.clearInterval(timer);
  }, []);

  // Tap-anywhere, done with real pointer events and a movement guard so scrolling never closes a layer.
  useEffect(() => {
    const down = (event: PointerEvent) => {
      pointerStart.current = { x: event.clientX, y: event.clientY, target: event.target };
    };
    const up = (event: PointerEvent) => {
      const start = pointerStart.current;
      pointerStart.current = null;
      if (!start) return;
      if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 12) return;
      const startElement = start.target as HTMLElement | null;
      const endElement = event.target as HTMLElement | null;
      if (adminWorkspaceOpen) {
        if (!startElement?.closest('.admin-workspace') && !endElement?.closest('.admin-workspace')) setAdminWorkspaceOpen(false);
        return;
      }
      if (adminLoginOpen) {
        if (!startElement?.closest('.admin-login-card') && !endElement?.closest('.admin-login-card')) setAdminLoginOpen(false);
        return;
      }
      if (panelOpen && !startElement?.closest('[data-floating-layer]') && !endElement?.closest('[data-floating-layer]')) {
        setPanelOpen(false);
      }
    };
    document.addEventListener('pointerdown', down);
    document.addEventListener('pointerup', up);
    return () => {
      document.removeEventListener('pointerdown', down);
      document.removeEventListener('pointerup', up);
    };
  }, [panelOpen, adminLoginOpen, adminWorkspaceOpen]);

  const openMenu = useCallback((nextCategory: CategoryId = 'matcha', view: PanelView = 'categories') => {
    setCategory(nextCategory);
    setPanelView(view);
    setPanelOpen(true);
  }, []);

  const addItemById = useCallback((itemId: string) => {
    const item = data.items.find((candidate) => candidate.id === itemId);
    if (!item) return;
    const line = makeLine(item, data, 'single', 1, defaultSelections(item, data.modifiers));
    setCart((current) => upsertMany(current, [line]));
  }, [data]);

  const addSavedLines = useCallback((lines: Array<Pick<OrderLine, 'itemId' | 'variant' | 'quantity' | 'selections'>>) => {
    const additions: OrderLine[] = [];
    for (const raw of lines) {
      const item = data.items.find((candidate) => candidate.id === raw.itemId);
      if (item) additions.push(makeLine(item, data, raw.variant, raw.quantity, raw.selections));
    }
    setCart((current) => upsertMany(current, additions));
  }, [data]);

  async function submitAdminLogin(event: React.FormEvent) {
    event.preventDefault();
    setAdminError('');
    const response = await fetch('/api/auth/admin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: adminPassword }) });
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setAdminError(result.error ?? 'Owner sign-in failed.');
      return;
    }
    setAdminPassword('');
    setAdminLoginOpen(false);
    await refresh();
    setPanelOpen(true);
    setPanelView('categories');
    notify('Signed in as owner. Your shop tools are in the Menu & Order panel.');
  }

  async function signOutAdmin() {
    await fetch('/api/auth/admin', { method: 'DELETE' });
    setAdminWorkspaceOpen(false);
    await refresh();
    notify('Signed out of admin. The shop tools are hidden again.');
  }

  async function signOutCustomer() {
    await fetch('/api/auth/customer', { method: 'DELETE' });
    await refresh();
    notify('Signed out of your customer account.');
  }

  async function submitApplication(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const response = await fetch('/api/applications', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(fields.entries())),
    });
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      notify(result.error ?? 'The application could not be sent.');
      return;
    }
    form.reset();
    setApplicationSent(true);
    notify('Application sent. Thank you!');
    if (data.session.admin) void refresh();
  }

  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const cartTotal = cart.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);
  const favoriteIds = ['iced-matcha-latte', 'dubai-donut', 'glazed', 'black-sugar-boba-fresh-milk'];
  const favorites = favoriteIds.map((id) => data.items.find((item) => item.id === id)).filter(Boolean);
  const dubai = data.items.find((item) => item.id === 'dubai-donut');

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="TK Coffee and Donuts home">
          <img src="/logo.png" alt="" />
          <span>TK Coffee<em>&amp; Donuts</em></span>
        </a>
        <div className="header-actions">
          <span className="open-pill"><i />{openLabel}</span>
          <button className="menu-order-button" data-menu-toggle onClick={() => openMenu(category)}>☰ Menu &amp; Order</button>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <img className="hero-logo-backdrop" src="/logo.png" alt="" aria-hidden="true" />
          <div className="hero-inner">
            <EspressoSketch className="hero-sketch" />
            <div className="hero-grid">
              <div className="hero-copy">
                <p className="eyebrow">Longwood, Florida · From 7 AM</p>
                <h1>Donuts worth <span>waking up</span> for.</h1>
                <p className="hero-lede">Drinks first — coffee, matcha, boba and refreshment teas — with handmade donuts made fresh daily, Texas-style kolache, and morning rolls baked in-house.</p>
                <div className="hero-ctas">
                  <button className="primary-button" onClick={() => openMenu('matcha')}>Explore the menu</button>
                  <a className="secondary-button" href="tel:+13219721239">Call (321) 972-1239</a>
                </div>
                <p className="rating-line">★ 4.9 · 100+ Google reviews</p>
              </div>
              <div className="hero-visuals">
                <figure className="hero-photo-card">
                  <img src={data.media.heroPhoto} alt="Inside TK Coffee & Donuts" />
                  <figcaption><span className="sun-pill">☀ Up with the sun · from 7 AM</span></figcaption>
                </figure>
                <figure className="bear-card">
                  <img src={data.media.bearArt} alt="The TK Bear mural — a crowned bear with a sprinkle donut in a coffee-cup balloon" />
                  <figcaption>The TK Bear — our shop mural</figcaption>
                  <BalloonStripe className="mini-stripe" />
                </figure>
              </div>
            </div>
          </div>
        </section>
        <BalloonStripe />

        <section className="section favorites-section">
          <div className="section-heading with-cameo">
            <img className="bear-cameo" src={data.media.bearArt} alt="" aria-hidden="true" />
            <div>
              <p className="eyebrow">Customer favorites</p>
              <h2>The ones they come back for</h2>
            </div>
          </div>
          <div className="favorites-grid">
            {favorites.map((item) => item && (
              <article className="favorite-card" key={item.id}>
                <div className="favorite-card-top">
                  <h3>{item.name}</h3>
                  {item.id === 'iced-matcha-latte' && <span className="iced-badge">Served iced</span>}
                  {item.id === 'dubai-donut' && <span className="loved-badge">★ Most loved</span>}
                </div>
                <p>{item.description}</p>
                <div className="favorite-card-foot">
                  <strong>{item.priceLabel ?? money(item.priceCents)}</strong>
                  <button onClick={() => openMenu(item.categoryId)}>Order in the menu</button>
                </div>
              </article>
            ))}
          </div>
          <figure className="favorites-photo"><img src={data.media.favoritesPhoto} alt="TK Coffee & Donuts shop photo" /></figure>
        </section>

        <section className="section matcha-section">
          <div className="section-heading matcha-heading">
            <p className="eyebrow">Matcha &amp; Teas</p>
            <h2>Whisked to order, the real way</h2>
          </div>
          <figure className="matcha-card">
            <img src={data.media.matchaArt || '/images/matcha-whisk.jpg'} alt="Hand-drawn bamboo matcha whisk (chasen) in a bowl of frothy green matcha, with a wooden spoon of matcha powder" />
          </figure>
          <p className="matcha-copy">No scoops from a mix — real matcha, whisked by hand with a bamboo chasen until it froths, the way it has always been done. It is the heart of our house favorite, made with ceremonial-grade Matcha Kari.</p>
          <p className="matcha-price">House favorite · Iced Matcha Latte <strong>$6.19</strong></p>
          <button className="primary-button" onClick={() => openMenu('matcha')}>Order Matcha &amp; Teas</button>
        </section>

        <section className="section feature-section">
          <div className="section-heading">
            <p className="eyebrow">From our mural wall</p>
            <h2>Texas-style kolache and iced coffee</h2>
          </div>
          <div className="feature-grid">
            <article className="feature-card kolache-card">
              <img src={data.media.kolacheArt} alt="Texas-style kolache mural drawing" />
              <div>
                <p className="eyebrow">Breakfast sweet roll</p>
                <h3>Texas-style kolache breakfast rolls</h3>
                <p>The Texas breakfast sweet roll, TK style — smoked cheese kolaches and croissant rolls, baked in-house every morning.</p>
                <button className="primary-button" onClick={() => openMenu('rolls')}>Order Morning Rolls</button>
              </div>
            </article>
            <article className="feature-card pop-card">
              <div className="pop-sticker">
                <img src={data.media.icedCoffeeArt} alt="Iced coffee mural drawing" />
                <span className="pop-badge">POP!</span>
              </div>
              <div>
                <p className="eyebrow">Bold, cold &amp; crowned</p>
                <h3>Iced lattes &amp; signature coffee</h3>
                <p>Handmade espresso over ice — the Iced Latte, the TK Signature, pistachio and rose — customized your way.</p>
                <button className="primary-button" onClick={() => openMenu('coffee')}>Order Morning Coffee</button>
              </div>
            </article>
          </div>
        </section>

        <section className="section dubai-section">
          <div className="dubai-panel">
            <p className="eyebrow">Small batch · Signature</p>
            <h2>The Dubai Donut</h2>
            <p>Our signature spotlight from the fancy case — the one visitors ask for by name.</p>
            <div className="dubai-foot">
              <strong>{dubai ? (dubai.priceLabel ?? money(dubai.priceCents)) : ''}</strong>
              <button className="cherry-button" onClick={() => openMenu('fancy')}>Find it in Fancy &amp; Dossants</button>
            </div>
          </div>
          <p className="menu-pointer">The full menu lives in <button className="inline-link" onClick={() => openMenu('matcha')}>Menu &amp; Order</button> — tap, customize, check out, and we’ll have it ready.</p>
        </section>

        <section className="section instagram-section">
          <div className="section-heading">
            <p className="eyebrow">Fresh from the shop</p>
            <h2>Straight from our Instagram</h2>
          </div>
          <div className="instagram-frame">
            <iframe title="TK Coffee & Donuts on Instagram" src="https://www.instagram.com/tkcoffeedonuts_fl/embed" loading="lazy" />
          </div>
          <a className="text-link" href="https://www.instagram.com/tkcoffeedonuts_fl" target="_blank" rel="noreferrer">Follow @tkcoffeedonuts_fl</a>
        </section>

        <section className="section visit-section" id="visit">
          <div className="visit-panel">
            <figure className="neon-card">
              <img src={data.media.neonSignPhoto || '/neon-sign.jpg'} alt="TK Coffee & Donuts storefront window at dusk — the neon sign glows: This is your sign to get a donut & coffee, your daily duo, with the donut case inside" />
              <figcaption>
                <strong>This is your sign.</strong>
                <span>Donuts in the case, coffee on.</span>
              </figcaption>
            </figure>
            <div className="visit-info">
              <div>
                <p className="eyebrow">Visit us</p>
                <h2>Coffee first, donuts close behind</h2>
                <p className="visit-address">1155 W State Rd 434 #103<br />Longwood, FL 32750</p>
                <a className="primary-button" href="tel:+13219721239">Call (321) 972-1239</a>
              </div>
              <div className="hours-card">
                <h3>Hours</h3>
                {HOURS.map(([day, time]) => (
                  <p key={day} className={time === 'CLOSED' ? 'closed-row' : ''}><span>{day}</span><strong>{time === 'CLOSED' ? 'Closed Tuesdays' : time}</strong></p>
                ))}
                <p className="hours-note">{openLabel}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section hiring-section" id="hiring">
          <div className="section-heading">
            <p className="eyebrow">Join the shop</p>
            <h2>We’re Hiring!</h2>
            <p>Morning people, donut people, people people — apply below and the owner will review it personally.</p>
          </div>
          {applicationSent ? (
            <div className="application-thanks"><h3>Application sent — thank you!</h3><p>We’ll be in touch. Come say hello at the counter sometime.</p></div>
          ) : (
            <form className="application-form" onSubmit={submitApplication}>
              <label>Full name<input name="name" required autoComplete="name" /></label>
              <label>Phone<input name="phone" required autoComplete="tel" /></label>
              <label>Email<input name="email" type="email" autoComplete="email" /></label>
              <label>Role you want
                <select name="position" required defaultValue="Counter / Barista">
                  <option>Counter / Barista</option>
                  <option>Baker / Morning Prep</option>
                  <option>Kitchen / Rolls</option>
                  <option>Any role</option>
                </select>
              </label>
              <label>Availability<input name="availability" placeholder="Weekday mornings, weekends…" /></label>
              <label className="wide">Anything we should know?<textarea name="message" rows={3} /></label>
              <button className="primary-button wide">Apply Now</button>
            </form>
          )}
        </section>
      </main>

      <BalloonStripe />
      <footer className="site-footer">
        <img className="footer-logo" src="/logo.png" alt="" aria-hidden="true" />
        <div className="footer-content">
          <strong>TK Coffee &amp; Donuts</strong>
          <p>1155 W State Rd 434 #103, Longwood, FL 32750 · (321) 972-1239</p>
          <p>Mon &amp; Wed–Sun 7:00 AM–2:30 PM · <span className="closed-text">Tuesday Closed</span></p>
          <nav>
            <button onClick={() => openMenu('matcha')}>Menu &amp; Order</button>
            <a href="#visit">Visit</a>
            <a href="#hiring">We’re Hiring</a>
            <a href="https://www.instagram.com/tkcoffeedonuts_fl" target="_blank" rel="noreferrer">Instagram</a>
          </nav>
          <div className="footer-session">
            {data.session.customer && <span>Signed in as {data.session.customer.name} <button onClick={signOutCustomer}>Sign out</button></span>}
            {data.session.admin ? (
              <span>Admin · signed in <button onClick={() => setAdminWorkspaceOpen(true)}>Shop tools</button> <button onClick={signOutAdmin}>Sign out of admin</button></span>
            ) : (
              <button className="admin-link" onClick={() => setAdminLoginOpen(true)}>Admin</button>
            )}
          </div>
          <small>© 2026 TK Coffee &amp; Donuts</small>
        </div>
        <img className="footer-bear" src={data.media.bearArt} alt="" aria-hidden="true" />
      </footer>

      <OrderPanel
        open={panelOpen}
        view={panelView}
        category={category}
        confirmation={confirmation}
        data={data}
        cart={cart}
        onClose={() => setPanelOpen(false)}
        onViewChange={setPanelView}
        onCategoryChange={setCategory}
        onConfirmation={setConfirmation}
        onCartChange={setCart}
        onRefresh={refresh}
        onNotify={notify}
        onAdminTools={() => setAdminWorkspaceOpen(true)}
      />

      {cartCount > 0 && !panelOpen && (
        <button className="floating-order-bar" onClick={() => openMenu(category, 'review')}>
          <span>{cartCount} item{cartCount === 1 ? '' : 's'} · {money(cartTotal)}</span><strong>Review order</strong>
        </button>
      )}

      <AiChat data={data} onAddLines={addSavedLines} onAddItem={addItemById} onOpenMenu={() => openMenu(category)} />

      {adminLoginOpen && (
        <div className="modal-backdrop">
          <form className="admin-login-card" data-floating-layer onSubmit={submitAdminLogin}>
            <button type="button" className="icon-button modal-close" aria-label="Close owner sign-in" onClick={() => setAdminLoginOpen(false)}>×</button>
            <p className="eyebrow">Owner sign-in</p>
            <h2>Admin</h2>
            <p>Shop tools are for the owner only. Customers never see this.</p>
            <label>Owner password<input type="password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} autoComplete="current-password" required /></label>
            {adminError && <p className="form-error" role="alert">{adminError}</p>}
            <button className="primary-button">Sign in</button>
          </form>
        </div>
      )}

      {adminWorkspaceOpen && data.session.admin && (
        <AdminWorkspace data={data} onClose={() => setAdminWorkspaceOpen(false)} onRefresh={refresh} onNotify={notify} />
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

export { CATEGORIES };
