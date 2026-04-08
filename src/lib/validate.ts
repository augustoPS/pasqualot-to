export const ALBUM_SLUG_REGEX = /^[a-z0-9][a-z0-9/-]*$/;
export const FILENAME_REGEX = /^[a-zA-Z0-9._-]+$/;

/**
 * Parse and clamp the ?w= query parameter for image resizing.
 * Returns null if the value is absent, non-numeric, zero, or negative.
 * Caps at 2400px to prevent abuse.
 */
export function parseWidth(w: string | null): number | null {
  if (!w || !/^\d+$/.test(w)) return null;
  const parsed = parseInt(w, 10);
  return parsed > 0 ? Math.min(parsed, 2400) : null;
}
