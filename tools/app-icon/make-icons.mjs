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

// Same palette family as the app's own theme (src/theme/colors.ts) and the
// stones drawn on the board (src/ui/drawStone.ts): light background, blue
// accent, plus two more hues so the icon reads as a little cluster of
// diamond-painting stones rather than one plain app-launcher blob.
const BG = '#F5F8FC';
const ADAPTIVE_BG = '#E6F4FE';
const HUES = {
  blue: '#4C9AFF',
  amber: '#F5A623',
  mint: '#3FBF8F',
};

/**
 * One faux-3D gem: a rounded square with a top-left-to-bottom-right
 * gradient, a diagonal facet line and a specular highlight, matching the
 * stones drawn on the board in src/ui/drawStone.ts.
 */
function gem({ cx, cy, side, hue, gradientId, rotation = 0, shadow = true, silhouette = false, silhouetteColor = '#ffffff' }) {
  const left = cx - side / 2;
  const top = cy - side / 2;
  const radius = side * 0.22;
  const transform = rotation ? `rotate(${rotation} ${cx} ${cy})` : undefined;
  const group = (inner) => (transform ? `<g transform="${transform}">${inner}</g>` : inner);

  if (silhouette) {
    return group(
      `<rect x="${left}" y="${top}" width="${side}" height="${side}" rx="${radius}" ry="${radius}" fill="${silhouetteColor}" />`
    );
  }

  const light = lighten(hue, 0.45);
  const dark = darken(hue, 0.35);
  const facet = lighten(hue, 0.25);
  const shadowRy = side * 0.08;

  return group(`
    <defs>
      <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${light}" />
        <stop offset="55%" stop-color="${hue}" />
        <stop offset="100%" stop-color="${dark}" />
      </linearGradient>
    </defs>
    ${shadow ? `<ellipse cx="${cx}" cy="${top + side + shadowRy * 0.4}" rx="${side * 0.52}" ry="${shadowRy}" fill="#0f172a" opacity="0.16" />` : ''}
    <rect x="${left}" y="${top}" width="${side}" height="${side}" rx="${radius}" ry="${radius}" fill="url(#${gradientId})" />
    <line x1="${left + side * 0.18}" y1="${top + side * 0.82}" x2="${left + side * 0.82}" y2="${top + side * 0.18}"
          stroke="${facet}" stroke-width="${Math.max(side * 0.045, 1)}" stroke-linecap="round" opacity="0.55" />
    <ellipse cx="${left + side * 0.29}" cy="${top + side * 0.24}" rx="${side * 0.13}" ry="${side * 0.1}" fill="#ffffff" opacity="0.7" />
  `);
}

/** A small cluster of three gems: two smaller ones behind, one large in front. */
function cluster({ cx, cy, scale, silhouette = false }) {
  const back = scale * 0.34;
  const front = scale * 0.5;
  return `
    ${gem({ cx: cx - scale * 0.24, cy: cy - scale * 0.2, side: back, hue: HUES.amber, gradientId: 'gBack1', rotation: -8, shadow: !silhouette, silhouette, silhouetteColor: silhouette ? '#ffffff' : undefined })}
    ${gem({ cx: cx + scale * 0.26, cy: cy - scale * 0.16, side: back, hue: HUES.mint, gradientId: 'gBack2', rotation: 10, shadow: !silhouette, silhouette, silhouetteColor: silhouette ? '#ffffff' : undefined })}
    ${gem({ cx, cy: cy + scale * 0.08, side: front, hue: HUES.blue, gradientId: 'gFront', rotation: 0, shadow: !silhouette, silhouette, silhouetteColor: silhouette ? '#ffffff' : undefined })}
  `;
}

function fullIconSvg(size) {
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="${BG}" />
      ${cluster({ cx: size / 2, cy: size / 2, scale: size * 0.62 })}
    </svg>
  `;
}

function adaptiveForegroundSvg(size) {
  // Android crops an adaptive icon's foreground to a shape (circle, squircle,
  // rounded square...) whose visible area is roughly the inner 66% of the
  // canvas, so the cluster is sized well inside that to survive every mask.
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      ${cluster({ cx: size / 2, cy: size / 2, scale: size * 0.44 })}
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
  // background, tinted by the OS at runtime, so no gradient or shadow here.
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      ${cluster({ cx: size / 2, cy: size / 2, scale: size * 0.44, silhouette: true })}
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
