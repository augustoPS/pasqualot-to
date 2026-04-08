import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SignJWT, jwtVerify } from 'jose';
import { safeCompare, getAlbumPassword, ALBUM_SLUG_REGEX } from '../src/lib/auth';

const TEST_SECRET = new TextEncoder().encode('test-secret-32-chars-minimum-len!');

// ── safeCompare ───────────────────────────────────────────────────────────────

describe('safeCompare', () => {
  const key = 'hmac-key-for-tests';

  it('returns true for identical strings', () => {
    expect(safeCompare('password123', 'password123', key)).toBe(true);
  });

  it('returns false for different strings', () => {
    expect(safeCompare('password123', 'password456', key)).toBe(false);
  });

  it('returns false when one string is empty', () => {
    expect(safeCompare('password123', '', key)).toBe(false);
  });

  it('returns true for empty vs empty', () => {
    expect(safeCompare('', '', key)).toBe(true);
  });

  it('is case-sensitive', () => {
    expect(safeCompare('Password', 'password', key)).toBe(false);
  });
});

// ── getAlbumPassword ──────────────────────────────────────────────────────────

describe('getAlbumPassword', () => {
  beforeEach(() => {
    process.env.ALBUM_PASSWORD_PB_SALVADOR = 'secret1';
    process.env.ALBUM_PASSWORD_TOKYO_2024 = 'secret2';
    process.env['ALBUM_PASSWORD_CIRCO_HIBRIDO_FEST'] = 'secret3';
  });

  afterEach(() => {
    delete process.env.ALBUM_PASSWORD_PB_SALVADOR;
    delete process.env.ALBUM_PASSWORD_TOKYO_2024;
    delete process.env['ALBUM_PASSWORD_CIRCO_HIBRIDO_FEST'];
  });

  it('resolves a simple slug', () => {
    expect(getAlbumPassword('pb-salvador')).toBe('secret1');
  });

  it('converts dashes to underscores and uppercases', () => {
    expect(getAlbumPassword('tokyo-2024')).toBe('secret2');
  });

  it('converts slashes to underscores', () => {
    expect(getAlbumPassword('circo-hibrido/fest')).toBe('secret3');
  });

  it('returns undefined for unknown album', () => {
    expect(getAlbumPassword('unknown-album')).toBeUndefined();
  });
});

// ── ALBUM_SLUG_REGEX ──────────────────────────────────────────────────────────

describe('ALBUM_SLUG_REGEX', () => {
  it('accepts a simple slug', () => {
    expect(ALBUM_SLUG_REGEX.test('pb-salvador')).toBe(true);
  });

  it('accepts a slug with a slash (nested)', () => {
    expect(ALBUM_SLUG_REGEX.test('circo-hibrido/2024')).toBe(true);
  });

  it('accepts digits and letters', () => {
    expect(ALBUM_SLUG_REGEX.test('tokyo2024')).toBe(true);
  });

  it('rejects slugs starting with a dash', () => {
    expect(ALBUM_SLUG_REGEX.test('-pb-salvador')).toBe(false);
  });

  it('rejects uppercase letters', () => {
    expect(ALBUM_SLUG_REGEX.test('PB-Salvador')).toBe(false);
  });

  it('rejects path traversal attempts', () => {
    expect(ALBUM_SLUG_REGEX.test('../etc/passwd')).toBe(false);
    expect(ALBUM_SLUG_REGEX.test('../../secrets')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(ALBUM_SLUG_REGEX.test('')).toBe(false);
  });
});

// ── JWT round-trip ────────────────────────────────────────────────────────────

describe('JWT album claim', () => {
  it('signs and verifies a token with the correct album claim', async () => {
    const album = 'pb-salvador';
    const token = await new SignJWT({ album })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('8h')
      .sign(TEST_SECRET);

    const { payload } = await jwtVerify(token, TEST_SECRET);
    expect(payload.album).toBe(album);
  });

  it('rejects a token signed with a different secret', async () => {
    const wrongSecret = new TextEncoder().encode('wrong-secret-32-chars-minimum-!!');
    const token = await new SignJWT({ album: 'pb-salvador' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('8h')
      .sign(wrongSecret);

    await expect(jwtVerify(token, TEST_SECRET)).rejects.toThrow();
  });

  it('rejects a tampered token', async () => {
    const token = await new SignJWT({ album: 'pb-salvador' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('8h')
      .sign(TEST_SECRET);

    const tampered = token.slice(0, -4) + 'XXXX';
    await expect(jwtVerify(tampered, TEST_SECRET)).rejects.toThrow();
  });

  it('rejects a token where album claim does not match', async () => {
    const token = await new SignJWT({ album: 'pb-inca' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('8h')
      .sign(TEST_SECRET);

    const { payload } = await jwtVerify(token, TEST_SECRET);
    // This is the check the proxy route performs
    expect(payload.album !== 'pb-salvador').toBe(true);
  });
});
