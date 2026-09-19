import sharp from 'sharp';

function hexToRgb(hex) {
  const v = hex.replace('#', '');
  return { r: parseInt(v.slice(0, 2), 16), g: parseInt(v.slice(2, 4), 16), b: parseInt(v.slice(4, 6), 16) };
}
function rgbToHex({ r, g, b }) {
  const p = (x) => Math.round(Math.min(Math.max(x, 0), 255)).toString(16).padStart(2, '0');
  return `#${p(r)}${p(g)}${p(b)}`;
}
function lighten(hex, amount) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex({ r: r + (255 - r) * amount, g: g + (255 - g) * amount, b: b + (255 - b) * amount });
}
function darken(hex, amount) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex({ r: r * (1 - amount), g: g * (1 - amount), b: b * (1 - amount) });
}

// Same accent as the app's own theme (src/theme/colors.ts).
const BG = '#F5F8FC';
const ADAPTIVE_BG = '#E6F4FE';
const ACCENT = '#4C9AFF';

/**
 * One faceted diamond: a kite outline split into four triangular facets by
 * its two diagonals, each a flat, distinct shade (not one smooth gradient —
 * a diamond reads as *cut* because neighbouring facets contrast, the way the
 * board's own stones don't need to at this size). Light source fixed at the
 * top-left, same as the rest of the app: that facet is near-white, the
 * opposite one the darkest.
 */
function diamond({ cx, cy, width, height, silhouette = false, silhouetteColor = '#ffffff' }) {
  const hw = width / 2;
  const top = { x: cx, y: cy - height / 2 };
  const bottom = { x: cx, y: cy + height / 2 };
  // The girdle (widest point) sits a bit above vertical centre, like a real
  // brilliant cut's crown being shorter than its pavilion.
  const girdleY = cy - height * 0.08;
  const left = { x: cx - hw, y: girdleY };
  const right = { x: cx + hw, y: girdleY };
  const centre = { x: cx, y: girdleY };

  const poly = (...pts) => pts.map((p) => `${p.x},${p.y}`).join(' ');

  if (silhouette) {
    return `<polygon points="${poly(top, right, bottom, left)}" fill="${silhouetteColor}" />`;
  }

  const facets = [
    { pts: [top, left, centre], fill: lighten(ACCENT, 0.62) }, // top-left: brightest, nearest the light
    { pts: [top, centre, right], fill: lighten(ACCENT, 0.18) }, // top-right
    { pts: [left, bottom, centre], fill: ACCENT }, // bottom-left
    { pts: [centre, bottom, right], fill: darken(ACCENT, 0.42) }, // bottom-right: darkest, furthest from the light
  ];
  const edge = darken(ACCENT, 0.55);
  const shadowRy = height * 0.06;

  return `
    <ellipse cx="${cx}" cy="${bottom.y + shadowRy * 0.6}" rx="${width * 0.42}" ry="${shadowRy}" fill="#0f172a" opacity="0.18" />
    ${facets
      .map((f) => `<polygon points="${poly(...f.pts)}" fill="${f.fill}" stroke="${edge}" stroke-width="${Math.max(width * 0.012, 1)}" stroke-linejoin="round" />`)
      .join('\n    ')}
  `;
}

/** A small four-point sparkle/glint, standing in for the "gleam" the diamond is named for. */
function sparkle({ cx, cy, r, color = '#ffffff', opacity = 0.95 }) {
  const k = r * 0.3;
  const pts = [
    { x: cx, y: cy - r },
    { x: cx + k, y: cy - k },
    { x: cx + r, y: cy },
    { x: cx + k, y: cy + k },
    { x: cx, y: cy + r },
    { x: cx - k, y: cy + k },
    { x: cx - r, y: cy },
    { x: cx - k, y: cy - k },
  ];
  const points = pts.map((p) => `${p.x},${p.y}`).join(' ');
  return `<polygon points="${points}" fill="${color}" opacity="${opacity}" />`;
}

function hero({ cx, cy, scale, silhouette = false }) {
  const width = scale;
  const height = scale * 1.2;
  return `
    ${diamond({ cx, cy, width, height, silhouette, silhouetteColor: '#ffffff' })}
    ${sparkle({ cx: cx + width * 0.42, cy: cy - height * 0.46, r: scale * 0.09, color: silhouette ? '#ffffff' : '#ffffff', opacity: silhouette ? 1 : 0.9 })}
  `;
}

function fullIconSvg(size) {
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="${BG}" />
      ${hero({ cx: size / 2, cy: size / 2, scale: size * 0.5 })}
    </svg>
  `;
}

function adaptiveForegroundSvg(size) {
  // Android crops an adaptive icon's foreground to a shape (circle, squircle,
  // rounded square...) whose visible area is roughly the inner 66% of the
  // canvas, so the diamond is sized well inside that to survive every mask.
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      ${hero({ cx: size / 2, cy: size / 2, scale: size * 0.34 })}
    </svg>
  `;
}

function adaptiveBackgroundSvg(size) {
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="${ADAPTIVE_BG}" />
    </svg>
  `;
}

function monochromeSvg(size) {
  // Android 13+ themed icons: a single-color silhouette on a transparent
  // background, tinted by the OS at runtime, so no facets or shadow here.
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      ${hero({ cx: size / 2, cy: size / 2, scale: size * 0.34, silhouette: true })}
    </svg>
  `;
}

async function render(svg, size, outPath) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(outPath);
  console.log('wrote', outPath);
}

const ASSETS = '../../assets';

await render(fullIconSvg(1024), 1024, `${ASSETS}/icon.png`);
await render(fullIconSvg(48), 48, `${ASSETS}/favicon.png`);
await render(adaptiveForegroundSvg(512), 512, `${ASSETS}/android-icon-foreground.png`);
await render(adaptiveBackgroundSvg(512), 512, `${ASSETS}/android-icon-background.png`);
await render(monochromeSvg(432), 432, `${ASSETS}/android-icon-monochrome.png`);
