/**
 * Canonical site URL used for absolute SEO URLs (Open Graph, sitemap, robots).
 *
 * Set `NEXT_PUBLIC_SITE_URL` in production (e.g. `https://fadelytext.vercel.app`).
 * Falls back to `http://localhost:3000` for local development.
 */
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
