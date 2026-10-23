'use client';

import { useState } from 'react';

export default function AccessPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const response = await fetch('/api/auth/access', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!response.ok) {
      setError(data.error ?? 'Access could not be granted.');
      return;
    }
    window.location.href = '/';
  }

  return (
    <main className="access-shell">
      <form className="access-card" onSubmit={submit}>
        <img src="/logo.png" alt="TK Coffee & Donuts" className="access-logo" />
        <p className="eyebrow">Restricted preview</p>
        <h1>TK Coffee &amp; Donuts</h1>
        <p>The full website is still under maintenance. Enter the site access password to continue.</p>
        <label>
          Site access password
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary-button" disabled={busy}>{busy ? 'Checking…' : 'Enter the site'}</button>
        <a href="/maintenance" className="text-link">Back to maintenance page</a>
      </form>
    </main>
  );
}
