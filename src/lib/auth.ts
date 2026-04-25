import { timingSafeEqual, createHmac } from 'node:crypto';

export const ALBUM_SLUG_REGEX = /^[a-z0-9][a-z0-9/-]*$/;

/**
 * Timing-safe string comparison using HMAC normalization.
 * Both inputs are hashed to equal-length digests before comparison
 * so the result is constant-time regardless of input length differences.
 */
export function safeCompare(a: string, b: string, key: string | Uint8Array): boolean {
  const hmacA = createHmac('sha256', key).update(a).digest();
  const hmacB = createHmac('sha256', key).update(b).digest();
  return timingSafeEqual(hmacA, hmacB);
}

/**
 * Look up the password for a given album from environment variables.
 * Albums use the convention: ALBUM_PASSWORD_<SLUG_UPPERCASE_DASHES_SLASHES_TO_UNDERSCORES>
 */
export function getAlbumPassword(albumId: string): string | undefined {
  const key = `ALBUM_PASSWORD_${albumId.toUpperCase().replace(/[-/]/g, '_')}`;
  return process.env[key];
}
