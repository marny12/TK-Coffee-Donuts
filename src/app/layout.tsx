import type { Metadata } from 'next';
import './globals.css';

const maintenance = !['false', '0', 'off', 'no'].includes((process.env.MAINTENANCE_MODE ?? 'true').toLowerCase());

export const metadata: Metadata = {
  title: 'TK Coffee & Donuts — Longwood, FL',
  description: 'Coffee, matcha, boba, refreshment teas, handmade donuts, Texas-style kolache and morning rolls in Longwood, Florida.',
  robots: maintenance ? { index: false, follow: false } : undefined,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
