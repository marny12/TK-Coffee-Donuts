import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const maintenance = !['false', '0', 'off', 'no'].includes((process.env.MAINTENANCE_MODE ?? 'true').toLowerCase());
  if (maintenance) return { rules: { userAgent: '*', disallow: '/' } };
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: 'https://tkcoffeeanddonuts.com/sitemap.xml',
  };
}
