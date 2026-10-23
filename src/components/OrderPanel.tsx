'use client';

import { BalloonStripe, DoughSketch } from '@/components/Art';
import { CATEGORIES } from '@/data/seed';
import { defaultSelections, lineKey, money, optionsFor, selectionLabels, unitPriceCents } from '@/lib/pricing';
import type { BootstrapState, CartSelection, CategoryId, MenuItem, Order, OrderLine } from '@/lib/types';
import { useMemo, useState } from 'react';

export type PanelView = 'categories' | 'review' | 'confirmation';

interface Props {
  open: boolean;
  view: PanelView;
  category: CategoryId;
  confirmation: Order | null;
  data: BootstrapState;
  cart: OrderLine[];
  onClose: () => void;
  onViewChange: (view: PanelView) => void;
  onCategoryChange: (category: CategoryId) => void;
  onConfirmation: (order: Order | null) => void;
  onCartChange: (lines: OrderLine[]) => void;
  onRefresh: () => Promise<void>;
  onNotify: (message: string) => void;
  onAdminTools: () => void;
}

interface Draft {
  item: MenuItem;
  variant: 'single' | 'dozen';
  quantity: number;
  selections: CartSelection;
}

const upsert = (cart: OrderLine[], line: OrderLine): OrderLine[] => {
  const existing = cart.find((candidate) => candidate.key === line.key);
  if (!existing) return [...cart, line];
  return cart.map((candidate) => candidate.key === line.key ? { ...candidate, quantity: candidate.quantity + line.quantity } : candidate);
};

export function makeLine(item: MenuItem, data: BootstrapState, variant: 'single' | 'dozen', quantity: number, selections: CartSelection): OrderLine {
  const category = CATEGORIES.find((candidate) => candidate.id === item.categoryId);
  return {
    key: lineKey(item.id, variant, selections),
    itemId: item.id,
    name: item.name,
    categoryId: item.categoryId,
    categoryName: category?.name ?? item.categoryId,
    variant,
    quantity,
    unitPriceCents: unitPriceCents(item, variant, selections, data.modifiers),
    selections,
    selectionLabels: selectionLabels(item, selections, data.modifiers),
  };
}

export default function OrderPanel(props: Props) {
  const { data, cart } = props;
  const [draft, setDraft] = useState<Draft | null>(null);
  const [checkoutPath, setCheckoutPath] = useState<'guest' | 'account'>('guest');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');

  const total = cart.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);
  const count = cart.reduce((sum, line) => sum + line.quantity, 0);
  const selectedItems = useMemo(() => data.items.filter((item) => item.categoryId === props.category), [data.items, props.category]);
  const selectedCategory = CATEGORIES.find((category) => category.id === props.category)!;

  function changeLineQty(key: string, delta: number) {
    props.onCartChange(cart.flatMap((line) => {
      if (line.key !== key) return [line];
      const quantity = line.quantity + delta;
      return quantity > 0 ? [{ ...line, quantity }] : [];
    }));
  }

  function simpleQty(item: MenuItem): number {
    const selections = defaultSelections(item, data.modifiers);
    const key = lineKey(item.id, 'single', selections);
    return cart.find((line) => line.key === key)?.quantity ?? 0;
  }

  function addSimple(item: MenuItem, delta: number) {
    const selections = defaultSelections(item, data.modifiers);
    const line = makeLine(item, data, 'single', delta, selections);
    if (delta > 0) props.onCartChange(upsert(cart, line));
    else changeLineQty(line.key, delta);
  }

  function openCustomize(item: MenuItem) {
    setDraft({ item, variant: 'single', quantity: 1, selections: defaultSelections(item, data.modifiers) });
  }

  function saveDraft() {
    if (!draft) return;
    props.onCartChange(upsert(cart, makeLine(draft.item, data, draft.variant, draft.quantity, draft.selections)));
    setDraft(null);
    props.onNotify(`${draft.item.name} added to your order.`);
  }

  async function submitCustomerAuth(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    const response = await fetch('/api/auth/customer', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mode: authMode, name: authName, phone: authPhone, email: authEmail, password: authPassword }),
    });
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(result.error ?? 'Could not sign in.');
      return;
    }
    setAuthPassword('');
    await props.onRefresh();
    setCheckoutPath('account');
    props.onNotify(authMode === 'register' ? 'Account created — you’re signed in.' : 'Signed in. Welcome back!');
  }

  async function placeOrder() {
    setError('');
    setPlacing(true);
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        customerType: checkoutPath,
        name: guestName,
        phone: guestPhone,
        lines: cart.map((line) => ({ itemId: line.itemId, variant: line.variant, quantity: line.quantity, selections: line.selections })),
      }),
    });
    const result = (await response.json().catch(() => ({}))) as { order?: Order; error?: string };
    setPlacing(false);
    if (!response.ok || !result.order) {
      setError(result.error ?? 'The order could not be placed.');
      return;
    }
    props.onCartChange([]);
    props.onConfirmation(result.order);
    props.onViewChange('confirmation');
    await props.onRefresh();
  }

  if (!props.open) return null;

  return (
    <div className="panel-backdrop">
      <aside className="order-panel" data-floating-layer aria-label="Menu and order panel">
        <header className="panel-header">
          <button className="panel-order-summary" onClick={() => props.onViewChange(props.view === 'review' ? 'categories' : 'review')}>
            <span>Order & Checkout</span>
            <strong>{count ? `${count} item${count === 1 ? '' : 's'} · ${money(total)}` : 'your order is empty so far'}</strong>
          </button>
          <button className="icon-button light" onClick={props.onClose} aria-label="Close menu panel">×</button>
        </header>

        {data.session.admin && (
          <div className="panel-admin-strip">
            <span>Signed in as owner</span>
            <button onClick={props.onAdminTools}>Admin — shop tools</button>
          </div>
        )}

        {props.view === 'categories' && (
          <div className="panel-scroll">
            <p className="panel-label">Menu categories</p>
            <div className="category-grid">
              {CATEGORIES.map((category) => (
                <button key={category.id} className={`category-tile ${category.id === props.category ? 'active' : ''}`} onClick={() => props.onCategoryChange(category.id)}>
                  <strong>{category.name}</strong>
                  <span>{category.tagline}</span>
                </button>
              ))}
            </div>

            <section className="panel-category">
              <CategoryHeader category={props.category} media={data.media} />
              {[...new Set(selectedItems.map((item) => item.subgroup))].map((subgroup) => (
                <div key={subgroup} className="subgroup-block">
                  <h4>{subgroup}</h4>
                  {selectedItems.filter((item) => item.subgroup === subgroup).map((item) => (
                    <ItemRow key={item.id} item={item} qty={simpleQty(item)} onAdd={() => addSimple(item, 1)} onRemove={() => addSimple(item, -1)} onCustomize={() => openCustomize(item)} />
                  ))}
                </div>
              ))}
            </section>
          </div>
        )}

        {props.view === 'review' && (
          <div className="panel-scroll review-view">
            <button className="back-button" onClick={() => props.onViewChange('categories')}>← Back to menu</button>
            <h3>Your order</h3>
            {cart.length === 0 && <p className="empty-note">Your order is empty so far. Pick a category and add something delicious.</p>}
            {CATEGORIES.map((category) => {
              const lines = cart.filter((line) => line.categoryId === category.id);
              if (!lines.length) return null;
              const subtotal = lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);
              return (
                <div key={category.id} className="review-group">
                  <h4>{category.name}<span>{money(subtotal)}</span></h4>
                  {lines.map((line) => (
                    <div className="review-line" key={line.key}>
                      <div>
                        <strong>{line.name}{line.variant === 'dozen' ? ' — Dozen' : ''}</strong>
                        {line.selectionLabels.length > 0 && <small>{line.selectionLabels.join(' · ')}</small>}
                        <span>{money(line.unitPriceCents)} each</span>
                      </div>
                      <div className="stepper">
                        <button onClick={() => changeLineQty(line.key, -1)} aria-label={`One less ${line.name}`}>−</button>
                        <span>{line.quantity}</span>
                        <button onClick={() => changeLineQty(line.key, 1)} aria-label={`One more ${line.name}`}>+</button>
                      </div>
                      <strong>{money(line.unitPriceCents * line.quantity)}</strong>
                    </div>
                  ))}
                </div>
              );
            })}
            {cart.length > 0 && (
              <>
                <div className="review-total"><span>Total due at pickup</span><strong>{money(total)}</strong></div>
                <div className="checkout-paths" role="tablist" aria-label="Checkout path">
                  <button className={checkoutPath === 'guest' ? 'active' : ''} onClick={() => setCheckoutPath('guest')}>Continue as guest</button>
                  <button className={checkoutPath === 'account' ? 'active' : ''} onClick={() => setCheckoutPath('account')}>Log in / Create account</button>
                </div>
                {checkoutPath === 'guest' && (
                  <div className="checkout-form">
                    <label>Name for pickup<input value={guestName} onChange={(event) => setGuestName(event.target.value)} autoComplete="name" /></label>
                    <label>Phone<input value={guestPhone} onChange={(event) => setGuestPhone(event.target.value)} autoComplete="tel" /></label>
                  </div>
                )}
                {checkoutPath === 'account' && !data.session.customer && (
                  <form className="checkout-form" onSubmit={submitCustomerAuth}>
                    <div className="auth-tabs">
                      <button type="button" className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>Log in</button>
                      <button type="button" className={authMode === 'register' ? 'active' : ''} onClick={() => setAuthMode('register')}>Create account</button>
                    </div>
                    {authMode === 'register' && <>
                      <label>Name<input value={authName} onChange={(event) => setAuthName(event.target.value)} autoComplete="name" /></label>
                      <label>Phone<input value={authPhone} onChange={(event) => setAuthPhone(event.target.value)} autoComplete="tel" /></label>
                    </>}
                    <label>Email<input type="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} autoComplete="email" /></label>
                    <label>Password<input type="password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} autoComplete={authMode === 'register' ? 'new-password' : 'current-password'} /></label>
                    <button className="secondary-button">{authMode === 'register' ? 'Create account' : 'Log in'}</button>
                  </form>
                )}
                {checkoutPath === 'account' && data.session.customer && (
                  <p className="signed-in-note">Signed in as {data.session.customer.name} · {data.session.customer.phone} · {data.session.customer.email}. This order will be saved to your account for easy reordering.</p>
                )}
                {error && <p className="form-error" role="alert">{error}</p>}
                <button className="primary-button place-order" disabled={placing} onClick={placeOrder}>{placing ? 'Placing…' : 'Place order — pay at the counter'}</button>
                <a className="call-link" href="tel:+13219721239">Prefer to talk? Call (321) 972-1239</a>
              </>
            )}
          </div>
        )}

        {props.view === 'confirmation' && props.confirmation && (
          <div className="panel-scroll confirmation-view">
            <div className="confirmation-card">
              <p className="eyebrow">Order placed!</p>
              <h3>Order #{props.confirmation.number} is saved</h3>
              <p>{money(props.confirmation.totalCents)} due at pickup. We’ll take care of you, {props.confirmation.customerName.split(' ')[0]}.</p>
              <ul>{props.confirmation.lines.map((line) => <li key={line.key}>{line.quantity} × {line.name}{line.selectionLabels.length ? ` — ${line.selectionLabels.join(' · ')}` : ''}</li>)}</ul>
              <a className="primary-button" href="tel:+13219721239">Call the shop: (321) 972-1239</a>
              <button className="secondary-button" onClick={() => { props.onConfirmation(null); props.onViewChange('categories'); }}>Start another order</button>
            </div>
          </div>
        )}
      </aside>

      {draft && (
        <div className="sheet-backdrop">
          <section className="customize-sheet" data-floating-layer role="dialog" aria-modal="true" aria-label={`Customize ${draft.item.name}`}>
            <header>
              <div><p className="eyebrow">Customize</p><h3>{draft.item.name}</h3></div>
              <button className="icon-button" onClick={() => setDraft(null)} aria-label="Close customize">×</button>
            </header>
            <CustomizeBody draft={draft} setDraft={setDraft} data={data} />
            <footer>
              <div className="stepper big">
                <button onClick={() => setDraft({ ...draft, quantity: Math.max(1, draft.quantity - 1) })}>−</button>
                <span>{draft.quantity}</span>
                <button onClick={() => setDraft({ ...draft, quantity: Math.min(99, draft.quantity + 1) })}>+</button>
              </div>
              <button className="primary-button" onClick={saveDraft}>Add {draft.quantity} · {money(unitPriceCents(draft.item, draft.variant, draft.selections, data.modifiers) * draft.quantity)}</button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}

function CategoryHeader({ category, media }: { category: CategoryId; media: BootstrapState['media'] }) {
  const found = CATEGORIES.find((candidate) => candidate.id === category)!;
  if (category === 'coffee') {
    return <div className="category-art pop-art"><img src={media.icedCoffeeArt} alt="Iced coffee mural drawing" /><span className="pop-badge">POP!</span><div><h3>{found.name}</h3><p>Bold, cold &amp; crowned</p></div></div>;
  }
  if (category === 'rolls') {
    return <div className="category-art"><img src={media.kolacheArt} alt="Texas-style kolache mural drawing" /><div><p className="eyebrow">Texas-style kolache · Breakfast sweet roll</p><h3>{found.name}</h3></div></div>;
  }
  if (category === 'donuts') {
    return <div className="category-art sketch-art"><DoughSketch className="dough-sketch" /><div><h3>{found.name}</h3><p>Hand-rolled · hand-cut · made fresh daily</p></div></div>;
  }
  if (category === 'fancy') {
    return <div className="category-art sketch-art"><img className="cameo" src={media.bearArt} alt="TK bear mural" /><div><h3>{found.name}</h3><p>{found.tagline}</p></div></div>;
  }
  return <div className="category-art plain-art"><BalloonStripe /><div><h3>{found.name}</h3><p>{found.tagline}</p></div></div>;
}

function ItemRow({ item, qty, onAdd, onRemove, onCustomize }: { item: MenuItem; qty: number; onAdd: () => void; onRemove: () => void; onCustomize: () => void }) {
  return (
    <div className="item-row">
      <div className="item-main">
        <strong>{item.name}</strong>
        <span>{item.description}</span>
        <div className="item-tags">{item.tags.map((tag) => <em key={tag}>{tag}</em>)}</div>
      </div>
      <div className="item-side">
        <strong className="item-price">{item.priceLabel ?? money(item.priceCents)}{item.dozenPriceCents ? <small> · Dozen {money(item.dozenPriceCents)}</small> : null}</strong>
        <div className="item-actions">
          {item.isDrink && <button className="customize-button" onClick={onCustomize}>Customize</button>}
          <div className="stepper">
            <button onClick={onRemove} disabled={qty === 0} aria-label={`One less ${item.name}`}>−</button>
            <span>{qty}</span>
            <button onClick={onAdd} aria-label={`One more ${item.name}`}>+</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomizeBody({ draft, setDraft, data }: { draft: Draft; setDraft: (draft: Draft) => void; data: BootstrapState }) {
  const { item, selections } = draft;
  const setSingle = (field: 'sizeId' | 'sugarId' | 'iceId', id: string) => setDraft({ ...draft, selections: { ...selections, [field]: id } });
  const setQty = (field: 'flavors' | 'addons', id: string, delta: number) => {
    const next = { ...(selections[field] ?? {}) };
    const qty = Math.max(0, Math.min(10, (next[id] ?? 0) + delta));
    if (qty) next[id] = qty; else delete next[id];
    setDraft({ ...draft, selections: { ...selections, [field]: next } });
  };
  const singleGroup = (title: string, group: 'size' | 'sugar' | 'ice', field: 'sizeId' | 'sugarId' | 'iceId') => {
    const options = optionsFor(item, data.modifiers, group);
    if (!options.length) return null;
    return (
      <fieldset className="custom-group">
        <legend>{title}</legend>
        <div className="chip-row">
          {options.map((option) => (
            <button key={option.id} className={selections[field] === option.id ? 'chip active' : 'chip'} onClick={() => setSingle(field, option.id)}>
              {option.name}{option.priceCents ? ` +${money(option.priceCents)}` : ''}
            </button>
          ))}
        </div>
      </fieldset>
    );
  };
  const qtyGroup = (title: string, group: 'flavor' | 'addon', field: 'flavors' | 'addons') => {
    const options = optionsFor(item, data.modifiers, group);
    if (!options.length) return null;
    return (
      <fieldset className="custom-group">
        <legend>{title}</legend>
        {options.map((option) => {
          const qty = selections[field][option.id] ?? 0;
          return (
            <div className="custom-option" key={option.id}>
              <span>{option.name}<small>+{money(option.priceCents)} each</small></span>
              <div className="stepper">
                <button onClick={() => setQty(field, option.id, -1)} disabled={qty === 0}>−</button>
                <span>{qty}</span>
                <button onClick={() => setQty(field, option.id, 1)}>+</button>
              </div>
            </div>
          );
        })}
      </fieldset>
    );
  };

  return (
    <div className="customize-body">
      <p className="custom-price">{item.priceLabel ?? money(item.priceCents)} · Unit with choices: {money(unitPriceCents(item, draft.variant, selections, data.modifiers))}</p>
      {item.dozenPriceCents && (
        <fieldset className="custom-group">
          <legend>Single or dozen</legend>
          <div className="chip-row">
            <button className={draft.variant === 'single' ? 'chip active' : 'chip'} onClick={() => setDraft({ ...draft, variant: 'single' })}>Single {money(item.priceCents)}</button>
            <button className={draft.variant === 'dozen' ? 'chip active' : 'chip'} onClick={() => setDraft({ ...draft, variant: 'dozen' })}>Dozen {money(item.dozenPriceCents)}</button>
          </div>
        </fieldset>
      )}
      {singleGroup('Size', 'size', 'sizeId')}
      {singleGroup('Sugar level', 'sugar', 'sugarId')}
      {item.isIced && singleGroup('Ice level', 'ice', 'iceId')}
      {qtyGroup('Flavors — quantity each', 'flavor', 'flavors')}
      {qtyGroup('Add-ons — quantity each', 'addon', 'addons')}
    </div>
  );
}
