import { Skia, type SkCanvas, type SkPaint } from '@shopify/react-native-skia';

import { darken, lighten } from './colors';

// Up-left, matching the fixed light source everywhere else in the app
// (the same source `tools/app-icon/make-icons.mjs`'s `rhinestone()` uses).
const LIGHT_X = -Math.SQRT1_2;
const LIGHT_Y = -Math.SQRT1_2;

// The icon uses 12 facets, sized for a ~350px hero. At CELL=24 a wedge would
// be a couple of pixels wide, so this stays at 8: fewer, flat-shaded draw
// calls per stone while still reading as faceted rather than domed. See
// HANDOFF.md's "Restyle the in-game stones" note.
const WEDGES = 8;

/**
 * Draw one faceted round rhinestone, matching the app icon's shape language
 * (a ring of trapezoid facets around a small flat centre "table") instead of
 * the earlier rounded-square-with-gradient stone.
 *
 * Each facet is a flat shade picked by its angle against the fixed top-left
 * light source, no shader — cheap enough to repeat up to 1600 times per
 * board redraw. The light source never moves (no gyroscope) and there is no
 * ambient sparkle, both per BUILD_PLAN.md.
 */
export function drawStone(
  canvas: SkCanvas,
  x: number,
  y: number,
  size: number,
  hex: string,
  opacity = 1
): void {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size * 0.42;
  const innerR = r * 0.34;

  // Contact shadow, just under the stone.
  const shadow = Skia.Paint();
  shadow.setAntiAlias(true);
  shadow.setColor(Skia.Color('#0f172a'));
  shadow.setAlphaf(0.16 * opacity);
  canvas.drawOval(Skia.XYWHRect(cx - r * 0.85, cy + r * 0.92, r * 1.7, r * 0.32), shadow);

  const point = (radius: number, angle: number) => ({
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  });

  const edgeColor = darken(hex, 0.5);
  const edge = Skia.Paint();
  edge.setAntiAlias(true);
  edge.setColor(Skia.Color(edgeColor));
  edge.setAlphaf(opacity);
  edge.setStyle(1); // PaintStyle.Stroke
  edge.setStrokeWidth(Math.max(r * 0.06, 0.5));
  edge.setStrokeJoin(1); // StrokeJoin.Round

  const facet = Skia.Paint();
  facet.setAntiAlias(true);
  facet.setAlphaf(opacity);

  for (let i = 0; i < WEDGES; i += 1) {
    const start = (i / WEDGES) * Math.PI * 2 - Math.PI / 2;
    const end = ((i + 1) / WEDGES) * Math.PI * 2 - Math.PI / 2;
    const mid = (start + end) / 2;
    // -1 (facing the light) .. 1 (facing away), remapped to a shade.
    const facing = -(Math.cos(mid) * LIGHT_X + Math.sin(mid) * LIGHT_Y);
    const shade = facing < 0 ? lighten(hex, -facing * 0.55) : darken(hex, facing * 0.5);

    const path = Skia.Path.Make();
    const inStart = point(innerR, start);
    const outStart = point(r, start);
    const outEnd = point(r, end);
    const inEnd = point(innerR, end);
    path.moveTo(inStart.x, inStart.y);
    path.lineTo(outStart.x, outStart.y);
    path.lineTo(outEnd.x, outEnd.y);
    path.lineTo(inEnd.x, inEnd.y);
    path.close();

    facet.setColor(Skia.Color(shade));
    canvas.drawPath(path, facet);
    canvas.drawPath(path, edge);
  }

  // Flat centre "table".
  const table = Skia.Paint();
  table.setAntiAlias(true);
  table.setColor(Skia.Color(lighten(hex, 0.68)));
  table.setAlphaf(opacity);
  canvas.drawCircle(cx, cy, innerR, table);
  canvas.drawCircle(cx, cy, innerR, edge);

  // Specular arc near the light source.
  const highlight = Skia.Paint();
  highlight.setAntiAlias(true);
  highlight.setColor(Skia.Color('#ffffff'));
  highlight.setAlphaf(0.55 * opacity);
  highlight.setStyle(1); // PaintStyle.Stroke
  highlight.setStrokeWidth(Math.max(r * 0.1, 0.5));
  highlight.setStrokeCap(1); // StrokeCap.Round
  canvas.drawArc(
    Skia.XYWHRect(cx - r * 0.97, cy - r * 0.97, r * 1.94, r * 1.94),
    -167,
    50,
    false,
    highlight
  );
}

/** Outline used for the drop preview under the dragged strip. */
export function strokePaint(hex: string, width: number, opacity = 1): SkPaint {
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  paint.setColor(Skia.Color(hex));
  paint.setAlphaf(opacity);
  paint.setStyle(1); // PaintStyle.Stroke
  paint.setStrokeWidth(width);
  return paint;
}
