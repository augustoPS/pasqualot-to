import { PHOTOS_CDN } from '../config';

/**
 * URL helpers for photo delivery.
 *
 * Public photos (unprotected albums + protected album previews):
 *   → Cloudflare CDN (PHOTOS_CDN), zero Vercel bandwidth
 *
 * Locked photos (protected album non-preview files):
 *   → /api/photos/ Vercel proxy, JWT-gated
 */

export function cdnUrl(albumId: string, file: string): string {
  return `${PHOTOS_CDN}/${albumId}/${file}`;
}

export function cdnThumbUrl(albumId: string, file: string): string {
  const jpg = file.replace(/\.[^.]+$/, '.jpg');
  return `${PHOTOS_CDN}/${albumId}/thumbs/${jpg}`;
}

export function apiUrl(albumId: string, file: string): string {
  return `/api/photos/${albumId}/${file}`;
}

export function apiThumbUrl(albumId: string, file: string): string {
  return `/api/photos/${albumId}/${file}?w=300`;
}
