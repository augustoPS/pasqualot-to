import { describe, it, expect } from 'vitest';
import { parseWidth, ALBUM_SLUG_REGEX, FILENAME_REGEX } from '../src/lib/validate';

// ── parseWidth ────────────────────────────────────────────────────────────────

describe('parseWidth', () => {
  it('returns null for null input', () => {
    expect(parseWidth(null)).toBeNull();
  });

  it('returns the value for a valid width', () => {
    expect(parseWidth('300')).toBe(300);
  });

  it('returns null for zero', () => {
    expect(parseWidth('0')).toBeNull();
  });

  it('returns null for negative values', () => {
    expect(parseWidth('-1')).toBeNull();
    expect(parseWidth('-300')).toBeNull();
  });

  it('returns null for non-numeric input', () => {
    expect(parseWidth('abc')).toBeNull();
    expect(parseWidth('30px')).toBeNull();
  });

  it('returns 2400 at the cap', () => {
    expect(parseWidth('2400')).toBe(2400);
  });

  it('caps values above 2400', () => {
    expect(parseWidth('3000')).toBe(2400);
    expect(parseWidth('99999')).toBe(2400);
  });

  it('returns null for empty string', () => {
    expect(parseWidth('')).toBeNull();
  });
});

// ── FILENAME_REGEX ────────────────────────────────────────────────────────────

describe('FILENAME_REGEX', () => {
  it('accepts a normal JPEG filename', () => {
    expect(FILENAME_REGEX.test('IMG_1234.jpg')).toBe(true);
  });

  it('accepts filenames with uppercase extensions', () => {
    expect(FILENAME_REGEX.test('IMG_1234.JPG')).toBe(true);
  });

  it('accepts filenames with dots and dashes', () => {
    expect(FILENAME_REGEX.test('my-photo.2024.jpg')).toBe(true);
  });

  it('rejects path traversal with ../', () => {
    expect(FILENAME_REGEX.test('../secrets.jpg')).toBe(false);
  });

  it('rejects filenames with slashes', () => {
    expect(FILENAME_REGEX.test('folder/file.jpg')).toBe(false);
  });

  it('rejects filenames with spaces', () => {
    expect(FILENAME_REGEX.test('my photo.jpg')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(FILENAME_REGEX.test('')).toBe(false);
  });
});

// ── ALBUM_SLUG_REGEX (re-exported from validate) ──────────────────────────────

describe('ALBUM_SLUG_REGEX (validate)', () => {
  it('accepts a valid slug', () => {
    expect(ALBUM_SLUG_REGEX.test('tokyo-2024')).toBe(true);
  });

  it('rejects slugs with uppercase', () => {
    expect(ALBUM_SLUG_REGEX.test('Tokyo-2024')).toBe(false);
  });

  it('rejects path traversal', () => {
    expect(ALBUM_SLUG_REGEX.test('../etc')).toBe(false);
  });
});
