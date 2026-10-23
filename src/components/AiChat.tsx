'use client';

import { money } from '@/lib/pricing';
import type { BootstrapState, OrderLine } from '@/lib/types';
import { useEffect, useMemo, useRef, useState } from 'react';

interface Props {
  data: BootstrapState;
  onAddLines: (lines: Array<Pick<OrderLine, 'itemId' | 'variant' | 'quantity' | 'selections'>>) => void;
  onAddItem: (itemId: string) => void;
  onOpenMenu: () => void;
}

interface Message { role: 'assistant' | 'user'; text: string }

const GUEST_LINES = [
  "Welcome to TK — come in, you're right on time. The glazed are still warm from this morning and the Dubai Donut has been waiting for you. Want me to start an order?",
  "Good morning, come on in — I'll look after you. Silky iced matcha, boba pearls cooked this morning, donuts made fresh… tell me what you're craving.",
  "You're here — perfect timing. I'll have it ready for you: something warm, something sweet, or a cold Black Sugar Boba with your name on it?",
  "Welcome in. Take your time, I'm right here — and when you're ready, the Dubai Donut and a handmade espresso make a very good morning.",
];

export default function AiChat({ data, onAddLines, onAddItem, onOpenMenu }: Props) {
  const [open, setOpen] = useState(false);
  const [bubble, setBubble] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const pointerStart = useRef<{ x: number; y: number; inside: boolean } | null>(null);

  const usual = useMemo(() => {
    const counts = new Map<string, { name: string; count: number }>();
    for (const order of data.myOrders) {
      for (const line of order.lines) {
        const entry = counts.get(line.itemId) ?? { name: line.name, count: 0 };
        entry.count += line.quantity;
        counts.set(line.itemId, entry);
      }
    }
    return [...counts.values()].sort((a, b) => b.count - a.count)[0];
  }, [data.myOrders]);

  const firstName = data.session.customer?.name.split(' ')[0];
  const welcome = firstName && usual
    ? `Welcome back, ${firstName} — I've got you. Your usual ${usual.name} is one tap away, and I'll have it ready for you.`
    : GUEST_LINES[Math.floor(Math.random() * GUEST_LINES.length)];
  const welcomeRef = useRef(welcome);
  welcomeRef.current = welcome;

  useEffect(() => {
    let fade: number | undefined;
    let show: number | undefined;
    try {
      if (sessionStorage.getItem('tk-ai-welcomed')) return;
      sessionStorage.setItem('tk-ai-welcomed', '1');
    } catch { /* private mode: still welcome once for this page view */ }
    show = window.setTimeout(() => {
      setBubble(true);
      fade = window.setTimeout(() => setBubble(false), 16000);
    }, 1000);
    return () => { window.clearTimeout(show); window.clearTimeout(fade); };
  }, []);

  useEffect(() => {
    const down = (event: PointerEvent) => {
      pointerStart.current = { x: event.clientX, y: event.clientY, inside: Boolean((event.target as HTMLElement).closest('[data-ai-root]')) };
    };
    const up = (event: PointerEvent) => {
      const start = pointerStart.current;
      pointerStart.current = null;
      if (!start || start.inside) return;
      if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 12) return;
      setBubble(false);
      setOpen(false);
    };
    document.addEventListener('pointerdown', down);
    document.addEventListener('pointerup', up);
    return () => {
      document.removeEventListener('pointerdown', down);
      document.removeEventListener('pointerup', up);
    };
  }, []);

  function openChat() {
    setBubble(false);
    setOpen(true);
    setMessages((current) => current.length ? current : [{ role: 'assistant', text: welcomeRef.current }]);
  }

  function findItem(text: string) {
    const normalized = text.toLowerCase();
    return data.items.find((item) => normalized.includes(item.name.toLowerCase()) || normalized.includes(item.name.toLowerCase().replace(/[^a-z ]/g, '').trim()));
  }

  function answer(raw: string): string {
    const text = raw.toLowerCase();
    if (text.includes('reorder') || text.includes('usual') || text.includes('favorites') && text.includes('add')) return addUsual();
    if (text.includes('hour') || text.includes('open') || text.includes('close') || text.includes('tuesday')) {
      return "We're open Monday and Wednesday–Sunday, 7:00 AM–2:30 PM — and closed Tuesdays, every Tuesday. Come see us at 1155 W State Rd 434 #103 in Longwood, or call (321) 972-1239.";
    }
    if (text.includes('where') || text.includes('address') || text.includes('phone') || text.includes('call')) {
      return 'Find us at 1155 W State Rd 434 #103, Longwood, FL 32750. Call the shop at (321) 972-1239 — we’ll take good care of you.';
    }
    if (text.includes('order') || text.includes('checkout') || text.includes('pay')) {
      return 'Easy: tap Menu & Order, pick a category, set quantities — drinks can be customized with size, sugar, ice, flavors and add-ons — then review and check out as guest or with your account. You pay at the counter when you pick up.';
    }
    if (text.includes('popular') || text.includes('favorite') || text.includes('best') || text.includes('recommend')) {
      return 'The ones everybody comes back for: the Dubai Donut, our house-favorite Iced Matcha Latte, a warm Glazed, and Black Sugar Boba. My favorite morning move? A Dubai Donut with a handmade espresso — sweet, rich, perfect.';
    }
    if (text.includes('kolache') || text.includes('roll')) {
      return 'Our Morning Rolls are the Texas-style kolache breakfast rolls — Regular Smoked Cheese and Jalapeño Smoked Cheese at $3.29, Beef Smoked (No Cheese) at $3.49 — plus croissant rolls baked in-house. Warm one with a coffee and you’re set.';
    }
    if (text.includes('job') || text.includes('hiring') || text.includes('work')) {
      return 'We’re hiring! Use the We’re Hiring section on this page and send the Apply Now form — the owner reviews every application personally.';
    }
    const item = findItem(raw);
    if (item && (text.includes('price') || text.includes('cost') || text.includes('much') || text.includes('$'))) {
      return `${item.name} is ${item.priceLabel ?? money(item.priceCents)}. Want me to point you to it in Menu & Order?`;
    }
    if (text.includes('matcha')) return 'Our Iced Matcha Latte is the house favorite at $5.19, and the refreshment teas are $5.89 — Strawberry, Mango, Lychee, Passionfruit, Peach, Rose. Silky, cold, and made to order.';
    if (text.includes('boba') || text.includes('milk tea')) return 'Black Sugar Boba/Fresh Milk is $4.95, and Green, Taro, and Coconut Milk Teas are $5.89. Sugar for boba and teas runs 100 / 75 / 50 / 25 — tell me your level and I’ll point the way.';
    if (text.includes('coffee') || text.includes('latte')) return 'Handmade espresso, hot or iced: Iced Latte $4.69, TK Signature Iced Coffee $5.95, Iced Pistachio Latte $5.69. Add a warm Glazed beside it — trust me.';
    if (text.includes('donut')) return 'Handmade and made fresh daily: Glazed $1.59, Sprinkle $1.89, Filled $2.09, and the Dubai Donut is our signature spotlight. Donut Holes are $2.79 a dozen.';
    return `I've got you — tell me a craving (matcha, boba, coffee, donut, kolache) or ask me what's popular, and I'll look after the rest. You can also tap Menu & Order and I'll cheer you on from here.`;
  }

  function addUsual(): string {
    const latest = data.myOrders[0];
    if (latest) {
      onAddLines(latest.lines.map((line) => ({ itemId: line.itemId, variant: line.variant, quantity: line.quantity, selections: line.selections })));
      return `Done — your usual from last time is in the order: ${latest.lines.map((line) => `${line.quantity} × ${line.name}`).join(', ')}. Tap Menu & Order to review it; I'll have it ready for you.`;
    }
    onAddItem('iced-matcha-latte');
    onAddItem('glazed');
    return 'No saved usual yet, so I started you with the favorites everybody reorders: an Iced Matcha Latte and a warm Glazed. Make an account at checkout and I’ll remember your usual for next time.';
  }

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((current) => [...current, { role: 'user', text: trimmed }, { role: 'assistant', text: answer(trimmed) }]);
    setInput('');
  }

  return (
    <div ref={rootRef} data-ai-root className="ai-root">
      {bubble && !open && (
        <div className="ai-bubble" role="status">
          <button className="ai-bubble-close" aria-label="Dismiss welcome" onClick={() => setBubble(false)}>×</button>
          <button className="ai-bubble-text" onClick={openChat}>{welcome}</button>
        </div>
      )}
      {open && (
        <section className="ai-panel" aria-label="TK AI chat">
          <header>
            <div><strong>TK AI</strong><span>Here to take care of you</span></div>
            <button className="icon-button" aria-label="Close TK AI" onClick={() => setOpen(false)}>×</button>
          </header>
          <div className="ai-messages">
            {messages.map((message, index) => <p key={index} className={`ai-message ${message.role}`}>{message.text}</p>)}
          </div>
          <div className="ai-chips">
            <button onClick={() => send("What's popular?")}>What’s popular?</button>
            <button onClick={() => send('What are your hours?')}>Hours</button>
            <button onClick={() => send('How do I order?')}>How do I order?</button>
            <button onClick={() => send('Reorder my favorites')}>Reorder my favorites</button>
            <button onClick={() => send('Add my usual again')}>Add my usual again</button>
            <button onClick={onOpenMenu}>Open Menu & Order</button>
          </div>
          <form className="ai-form" onSubmit={(event) => { event.preventDefault(); send(input); }}>
            <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask about the menu, hours, your usual…" aria-label="Ask TK AI" />
            <button>Send</button>
          </form>
        </section>
      )}
      <button className="ai-button" onClick={() => (open ? setOpen(false) : openChat())} aria-label="Open TK AI">
        <span aria-hidden="true">•••</span><span className="ai-button-label">TK AI</span>
      </button>
    </div>
  );
}
