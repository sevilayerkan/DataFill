/**
 * Canonical site URL used for absolute SEO URLs (Open Graph, sitemap, robots).
 *
 * Set `NEXT_PUBLIC_SITE_URL` in production (GitHub Pages workflow sets
 * `NEXT_PUBLIC_SITE_URL=https://sevilayerkan.github.io/DataFill`).
 * Falls back to `http://localhost:3000` for local development.
 * Trailing slashes are stripped so callers can safely do `${siteUrl}/...`.
 */
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "") || "http://localhost:3000";
