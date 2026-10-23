'use client';

import { CATEGORIES } from '@/data/seed';
import { money } from '@/lib/pricing';
import type { BootstrapState, CategoryId, ModifierGroup } from '@/lib/types';
import { useEffect, useState } from 'react';

interface Props {
  data: BootstrapState;
  onClose: () => void;
  onRefresh: () => Promise<void>;
  onNotify: (message: string) => void;
}

const GROUP_LABELS: Record<ModifierGroup, string> = {
  size: 'Sizes',
  sugar: 'Sugar levels',
  ice: 'Ice levels',
  flavor: 'Flavors',
  addon: 'Add-ons',
};

const MEDIA_FIELDS: Array<{ key: 'heroPhoto' | 'favoritesPhoto' | 'dubaiPhoto' | 'bearArt' | 'kolacheArt' | 'icedCoffeeArt' | 'matchaArt' | 'shopVideo'; label: string; video?: boolean }> = [
  { key: 'heroPhoto', label: 'Hero photo' },
  { key: 'favoritesPhoto', label: 'Favorites photo' },
  { key: 'dubaiPhoto', label: 'Dubai spotlight photo' },
  { key: 'bearArt', label: 'Bear mural art' },
  { key: 'kolacheArt', label: 'Kolache mural art' },
  { key: 'icedCoffeeArt', label: 'Iced coffee mural art' },
  { key: 'matchaArt', label: 'Matcha whisk art' },
  { key: 'shopVideo', label: 'Shop video', video: true },
];

export default function AdminWorkspace({ data, onClose, onRefresh, onNotify }: Props) {
  const [tab, setTab] = useState<'prices' | 'modifiers' | 'media' | 'orders' | 'applications'>('prices');
  const [priceEdits, setPriceEdits] = useState<Record<string, string>>({});
  const [mediaEdits, setMediaEdits] = useState({ ...data.media });
  const [newName, setNewName] = useState('');
  const [newGroup, setNewGroup] = useState<ModifierGroup>('flavor');
  const [newPrice, setNewPrice] = useState('0.79');
  const [newScope, setNewScope] = useState<'drinks' | CategoryId>('drinks');
  const [busy, setBusy] = useState('');

  useEffect(() => {
    setPriceEdits(Object.fromEntries(data.items.map((item) => [item.id, (item.priceCents / 100).toFixed(2)])));
  }, [data.items]);
  useEffect(() => setMediaEdits({ ...data.media }), [data.media]);

  async function adminAction(payload: Record<string, unknown>, success: string) {
    setBusy(success);
    const response = await fetch('/api/admin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    setBusy('');
    if (!response.ok) {
      onNotify(result.error ?? 'That change could not be saved.');
      return false;
    }
    await onRefresh();
    onNotify(success);
    return true;
  }

  async function upload(slot: string, file: File, video = false) {
    const form = new FormData();
    form.set('file', file);
    setBusy('Uploading…');
    const response = await fetch('/api/upload', { method: 'POST', body: form });
    const result = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
    setBusy('');
    if (!response.ok || !result.url) {
      onNotify(result.error ?? 'Upload failed.');
      return;
    }
    const patch = { [slot]: result.url };
    setMediaEdits((current) => ({ ...current, ...patch }));
    await adminAction({ action: 'updateMedia', media: patch }, video ? 'Shop video saved.' : 'Photo saved.');
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="admin-workspace" data-floating-layer role="dialog" aria-modal="true" aria-label="Owner admin tools">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">Owner only</p>
            <h2>Admin — shop tools</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close admin tools">×</button>
        </header>
        <nav className="workspace-tabs" aria-label="Admin sections">
          {(['prices', 'modifiers', 'media', 'orders', 'applications'] as const).map((name) => (
            <button key={name} className={tab === name ? 'active' : ''} onClick={() => setTab(name)}>
              {name === 'media' ? 'Photos & Videos' : name[0].toUpperCase() + name.slice(1)}
            </button>
          ))}
        </nav>
        {busy && <p className="admin-busy">{busy}</p>}

        {tab === 'prices' && (
          <div className="admin-list">
            <p className="admin-note">Price changes save to the shop data and appear on the public site without a redeploy.</p>
            {CATEGORIES.map((category) => (
              <div key={category.id}>
                <h3>{category.name}</h3>
                {data.items.filter((item) => item.categoryId === category.id).map((item) => (
                  <div className="admin-row" key={item.id}>
                    <span>{item.name}{item.pendingConfirmation ? <em> · pending confirmation</em> : null}</span>
                    <label>$<input inputMode="decimal" value={priceEdits[item.id] ?? ''} onChange={(event) => setPriceEdits((current) => ({ ...current, [item.id]: event.target.value }))} /></label>
                    <button onClick={() => adminAction({ action: 'updatePrice', itemId: item.id, priceCents: Math.round(parseFloat(priceEdits[item.id] || '0') * 100) }, `${item.name} price saved.`)}>Save</button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {tab === 'modifiers' && (
          <div className="admin-list">
            <p className="admin-note">Off or deleted options disappear from customer drink panels. Orders already placed keep the lines they were saved with.</p>
            {(Object.keys(GROUP_LABELS) as ModifierGroup[]).map((group) => (
              <div key={group}>
                <h3>{GROUP_LABELS[group]}</h3>
                {data.modifiers.filter((option) => option.group === group).map((option) => (
                  <div className={`admin-row modifier-row ${option.enabled ? '' : 'is-off'}`} key={option.id}>
                    <span><strong>{option.name}</strong><small>{option.subgroup} · {money(option.priceCents)}</small></span>
                    <label className="switch-label">
                      <input type="checkbox" checked={option.enabled} onChange={(event) => adminAction({ action: 'setModifierEnabled', modifierId: option.id, enabled: event.target.checked }, `${option.name} ${event.target.checked ? 'turned on' : 'turned off'}.`)} />
                      {option.enabled ? 'On' : 'Off'}
                    </label>
                    <button className="danger-button" onClick={() => adminAction({ action: 'deleteModifier', modifierId: option.id }, `${option.name} deleted.`)}>Delete</button>
                  </div>
                ))}
              </div>
            ))}
            <form
              className="add-modifier-form"
              onSubmit={(event) => {
                event.preventDefault();
                void adminAction(
                  {
                    action: 'addModifier',
                    name: newName,
                    group: newGroup,
                    priceCents: Math.round(parseFloat(newPrice || '0') * 100),
                    categoryIds: newScope === 'drinks' ? ['matcha', 'coffee', 'boba'] : [newScope],
                  },
                  `${newName} added.`,
                ).then((ok) => { if (ok) setNewName(''); });
              }}
            >
              <h3>Add an option</h3>
              <input placeholder="Name — e.g. Ube" value={newName} onChange={(event) => setNewName(event.target.value)} required />
              <select value={newGroup} onChange={(event) => setNewGroup(event.target.value as ModifierGroup)}>
                {(Object.keys(GROUP_LABELS) as ModifierGroup[]).map((group) => <option key={group} value={group}>{GROUP_LABELS[group]}</option>)}
              </select>
              <label>$<input inputMode="decimal" value={newPrice} onChange={(event) => setNewPrice(event.target.value)} /></label>
              <select value={newScope} onChange={(event) => setNewScope(event.target.value as 'drinks' | CategoryId)}>
                <option value="drinks">All drink categories</option>
                {CATEGORIES.filter((category) => ['matcha', 'coffee', 'boba'].includes(category.id)).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
              <button className="primary-button">Add option</button>
            </form>
          </div>
        )}

        {tab === 'media' && (
          <div className="admin-list">
            <p className="admin-note">Replace a photo or video by uploading a file, or paste a URL and save. Changes are stored and shown on the site.</p>
            {MEDIA_FIELDS.map(({ key, label, video }) => (
              <div className="media-row" key={key}>
                <span>{label}<small>{mediaEdits[key] || 'Not set'}</small></span>
                <input value={mediaEdits[key]} onChange={(event) => setMediaEdits((current) => ({ ...current, [key]: event.target.value }))} placeholder={video ? 'Video URL' : 'Photo URL'} />
                <button onClick={() => adminAction({ action: 'updateMedia', media: { [key]: mediaEdits[key] } }, `${label} saved.`)}>Save</button>
                <label className="upload-button">
                  Upload
                  <input type="file" accept={video ? 'video/*' : 'image/*'} hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(key, file, video); }} />
                </label>
              </div>
            ))}
            <label className="sync-row">
              <input
                type="checkbox"
                checked={mediaEdits.instagramSync}
                onChange={(event) => {
                  const instagramSync = event.target.checked;
                  setMediaEdits((current) => ({ ...current, instagramSync }));
                  void adminAction({ action: 'updateMedia', media: { instagramSync } }, `Instagram auto-sync ${instagramSync ? 'on' : 'off'}.`);
                }}
              />
              Instagram auto-sync for the “Straight from our Instagram” section
            </label>
          </div>
        )}

        {tab === 'orders' && (
          <div className="admin-list">
            {(data.adminData?.orders ?? []).length === 0 && <p className="admin-note">No saved orders yet.</p>}
            {(data.adminData?.orders ?? []).map((order) => (
              <article className="record-card" key={order.id}>
                <header><strong>Order #{order.number}</strong><span>{new Date(order.createdAt).toLocaleString()}</span></header>
                <p>{order.customerName} · {order.customerPhone} · {order.customerType}</p>
                <ul>{order.lines.map((line) => <li key={line.key}>{line.quantity} × {line.name}{line.selectionLabels.length ? ` — ${line.selectionLabels.join(' · ')}` : ''}</li>)}</ul>
                <strong>{money(order.totalCents)} due at pickup</strong>
              </article>
            ))}
          </div>
        )}

        {tab === 'applications' && (
          <div className="admin-list">
            {(data.adminData?.applications ?? []).length === 0 && <p className="admin-note">No applications yet.</p>}
            {(data.adminData?.applications ?? []).map((application) => (
              <article className="record-card" key={application.id}>
                <header><strong>{application.name}</strong><span>{new Date(application.createdAt).toLocaleDateString()}</span></header>
                <p>{application.position} · {application.phone}{application.email ? ` · ${application.email}` : ''}</p>
                <p>{application.availability}</p>
                {application.message && <p>{application.message}</p>}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
