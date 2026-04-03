/**
 * Constructs an absolute API URL by prepending VITE_API_BASE_URL when set.
 *
 * In development the Vite dev-server proxies /api → the local API server so
 * a plain "/api/…" path works. In production (e.g. Vercel frontend + separate
 * API host) VITE_API_BASE_URL must be set to the full API origin, e.g.
 * "https://api.myapp.com". This helper ensures every direct fetch() call
 * targets the correct host regardless of deployment topology.
 */
const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, "") ?? "";

export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${normalized}`;
}
