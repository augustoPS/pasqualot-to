import { describe, it, expect } from 'vitest';
import { cdnUrl, cdnThumbUrl, apiUrl, apiThumbUrl } from '../src/lib/photos';

const CDN = 'https://photos.pasqualo.to';

// ── cdnUrl ────────────────────────────────────────────────────────────────────

describe('cdnUrl', () => {
  it('constructs the correct CDN URL', () => {
    expect(cdnUrl('pb-salvador', 'IMG_1234.jpg')).toBe(`${CDN}/pb-salvador/IMG_1234.jpg`);
  });

  it('handles nested album slugs', () => {
    expect(cdnUrl('circo-hibrido/2024', 'photo.jpg')).toBe(`${CDN}/circo-hibrido/2024/photo.jpg`);
  });
});

// ── cdnThumbUrl ───────────────────────────────────────────────────────────────

describe('cdnThumbUrl', () => {
  it('constructs the correct thumbnail URL', () => {
    expect(cdnThumbUrl('pb-salvador', 'IMG_1234.jpg')).toBe(`${CDN}/pb-salvador/thumbs/IMG_1234.jpg`);
  });

  it('replaces uppercase extensions with .jpg', () => {
    expect(cdnThumbUrl('album', 'IMG_1234.HEIC')).toBe(`${CDN}/album/thumbs/IMG_1234.jpg`);
    expect(cdnThumbUrl('album', 'IMG_1234.JPG')).toBe(`${CDN}/album/thumbs/IMG_1234.jpg`);
  });

  it('handles filenames with multiple dots', () => {
    expect(cdnThumbUrl('album', 'IMG.1234.jpg')).toBe(`${CDN}/album/thumbs/IMG.1234.jpg`);
  });

  it('handles filenames with no extension', () => {
    // No dot → replace replaces nothing → appends nothing
    const result = cdnThumbUrl('album', 'IMG_1234');
    expect(result).toBe(`${CDN}/album/thumbs/IMG_1234`);
  });
});

// ── apiUrl ────────────────────────────────────────────────────────────────────

describe('apiUrl', () => {
  it('constructs the correct proxy URL', () => {
    expect(apiUrl('pb-salvador', 'IMG_1234.jpg')).toBe('/api/photos/pb-salvador/IMG_1234.jpg');
  });

  it('handles nested slugs', () => {
    expect(apiUrl('circo-hibrido/2024', 'photo.jpg')).toBe('/api/photos/circo-hibrido/2024/photo.jpg');
  });
});

// ── apiThumbUrl ───────────────────────────────────────────────────────────────

describe('apiThumbUrl', () => {
  it('appends ?w=300 to the proxy URL', () => {
    expect(apiThumbUrl('pb-salvador', 'IMG_1234.jpg')).toBe('/api/photos/pb-salvador/IMG_1234.jpg?w=300');
  });

  it('differs from apiUrl only by the query string', () => {
    const base = apiUrl('pb-salvador', 'IMG_1234.jpg');
    const thumb = apiThumbUrl('pb-salvador', 'IMG_1234.jpg');
    expect(thumb).toBe(`${base}?w=300`);
  });
});
