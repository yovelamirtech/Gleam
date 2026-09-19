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
 * One faceted round rhinestone, like the flat-backed stones diamond painting
 * actually uses: a ring of trapezoid facets radiating from a small flat
 * centre ("table"), not a pointed side-view diamond. Each facet is a flat,
 * distinct shade rather than one smooth gradient — a cut stone reads as
 * faceted through contrast between neighbours, the way the board's own
 * stones don't need to at this size. Shade comes from a fixed top-left light
 * source, same as the rest of the app: facets facing it are near-white,
 * the ones facing away are darkest.
 */
function rhinestone({ cx, cy, r, silhouette = false, silhouetteColor = '#ffffff' }) {
  if (silhouette) {
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${silhouetteColor}" />`;
  }

  const wedges = 12;
  const innerR = r * 0.34;
  const point = (radius, angle) => ({ x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) });
  const poly = (...pts) => pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');

  // Up-left, matching the fixed light source everywhere else in the app.
  const lightX = -Math.SQRT1_2;
  const lightY = -Math.SQRT1_2;

  const edge = darken(ACCENT, 0.5);
  const strokeWidth = Math.max(r * 0.03, 1);

  const facets = [];
  for (let i = 0; i < wedges; i += 1) {
    const start = (i / wedges) * Math.PI * 2 - Math.PI / 2;
    const end = ((i + 1) / wedges) * Math.PI * 2 - Math.PI / 2;
    const mid = (start + end) / 2;
    // -1 (facing the light) .. 1 (facing away), remapped to a shade.
    const facing = -(Math.cos(mid) * lightX + Math.sin(mid) * lightY);
    const shade =
      facing < 0 ? lighten(ACCENT, (-facing) * 0.55) : darken(ACCENT, facing * 0.5);
    facets.push(
      `<polygon points="${poly(point(innerR, start), point(r, start), point(r, end), point(innerR, end))}" fill="${shade}" stroke="${edge}" stroke-width="${strokeWidth}" stroke-linejoin="round" />`
    );
  }

  return `
    <ellipse cx="${cx}" cy="${cy + r * 1.08}" rx="${r * 0.85}" ry="${r * 0.16}" fill="#0f172a" opacity="0.16" />
    ${facets.join('\n    ')}
    <circle cx="${cx}" cy="${cy}" r="${innerR}" fill="${lighten(ACCENT, 0.68)}" stroke="${edge}" stroke-width="${strokeWidth}" />
    <path d="M ${point(r * 0.97, -Math.PI * 0.92).x.toFixed(2)} ${point(r * 0.97, -Math.PI * 0.92).y.toFixed(2)}
             A ${r * 0.97} ${r * 0.97} 0 0 1 ${point(r * 0.97, -Math.PI * 0.42).x.toFixed(2)} ${point(r * 0.97, -Math.PI * 0.42).y.toFixed(2)}"
          fill="none" stroke="#ffffff" stroke-width="${r * 0.05}" stroke-linecap="round" opacity="0.55" />
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
  const r = scale * 0.6;
  return `
    ${rhinestone({ cx, cy, r, silhouette, silhouetteColor: '#ffffff' })}
    ${sparkle({ cx: cx + r * 0.86, cy: cy - r * 0.86, r: scale * 0.11, color: '#ffffff', opacity: silhouette ? 1 : 0.9 })}
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
