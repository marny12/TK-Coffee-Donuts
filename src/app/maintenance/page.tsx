export default function MaintenancePage() {
  return (
    <main className="maintenance-shell">
      <section className="maintenance-card">
        <img src="/logo.png" alt="TK Coffee & Donuts" className="maintenance-logo" />
        <p className="eyebrow">TK Coffee &amp; Donuts</p>
        <h1>Our website is under maintenance</h1>
        <p className="maintenance-copy">The shop is open as usual — come see us for coffee, matcha, boba, handmade donuts, and morning rolls.</p>
        <a className="maintenance-call" href="tel:+13219721239">Call (321) 972-1239</a>
        <div className="maintenance-hours" aria-label="Opening hours">
          <p><span>Monday</span><strong>7:00 AM – 2:30 PM</strong></p>
          <p className="closed"><span>Tuesday</span><strong>CLOSED</strong></p>
          <p><span>Wednesday – Sunday</span><strong>7:00 AM – 2:30 PM</strong></p>
        </div>
        <p className="maintenance-address">1155 W State Rd 434 #103, Longwood, FL 32750</p>
        <div className="maintenance-links">
          <a href="https://www.instagram.com/tkcoffeedonuts_fl" target="_blank" rel="noreferrer">Instagram @tkcoffeedonuts_fl</a>
          <a href="/access">Restricted access</a>
        </div>
      </section>
    </main>
  );
}
