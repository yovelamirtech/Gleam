import { darken, hexToRgb, lighten, luminance, readableTextOn, rgbToHex } from '../src/ui/colors';
import { generatePalette, hslToHex } from '../src/game/palette';

describe('hex conversion', () => {
  it('parses long and short hex', () => {
    expect(hexToRgb('#3f7ae0')).toEqual({ r: 0x3f, g: 0x7a, b: 0xe0 });
    expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('round-trips back to hex', () => {
    expect(rgbToHex(hexToRgb('#3f7ae0'))).toBe('#3f7ae0');
  });

  it('clamps out-of-range channels', () => {
    expect(rgbToHex({ r: -10, g: 300, b: 128 })).toBe('#00ff80');
  });
});

describe('stone shading', () => {
  it('lightens towards white and darkens towards black', () => {
    expect(lighten('#000000', 1)).toBe('#ffffff');
    expect(darken('#ffffff', 1)).toBe('#000000');
    expect(lighten('#808080', 0)).toBe('#808080');
  });

  it('keeps the gradient ordered light to dark', () => {
    const base = '#3f7ae0';
    expect(luminance(lighten(base, 0.45))).toBeGreaterThan(luminance(base));
    expect(luminance(darken(base, 0.35))).toBeLessThan(luminance(base));
  });
});

describe('readableTextOn', () => {
  it('puts dark text on light swatches and light text on dark ones', () => {
    expect(readableTextOn('#ffffff')).toBe('#1d2433');
    expect(readableTextOn('#101010')).toBe('#ffffff');
  });
});

describe('generatePalette', () => {
  it('numbers entries from one, the way cells display them', () => {
    const palette = generatePalette(5);
    expect(palette.map((entry) => entry.number)).toEqual([1, 2, 3, 4, 5]);
    expect(palette.map((entry) => entry.index)).toEqual([0, 1, 2, 3, 4]);
  });

  it('gives every entry a distinct colour', () => {
    const palette = generatePalette(24);
    expect(new Set(palette.map((entry) => entry.hex)).size).toBe(24);
  });

  it('converts HSL to the expected corners', () => {
    expect(hslToHex(0, 1, 0.5)).toBe('#ff0000');
    expect(hslToHex(1 / 3, 1, 0.5)).toBe('#00ff00');
    expect(hslToHex(2 / 3, 1, 0.5)).toBe('#0000ff');
    expect(hslToHex(0, 0, 1)).toBe('#ffffff');
  });
});
