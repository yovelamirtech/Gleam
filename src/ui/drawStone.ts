import { Skia, type SkCanvas, type SkPaint } from '@shopify/react-native-skia';

import { darken, lighten } from './colors';

/**
 * Draw one faux-3D diamond stone.
 *
 * Gradient light-to-dark along a fixed top-left light source, a small specular
 * highlight and a soft bottom shadow — enough to read as raised without a 3D
 * engine, and cheap enough to repeat 1600 times per board. The light source
 * never moves (no gyroscope) and there is no ambient sparkle, both per
 * BUILD_PLAN.md.
 */
export function drawStone(
  canvas: SkCanvas,
  x: number,
  y: number,
  size: number,
  hex: string,
  opacity = 1
): void {
  const inset = size * 0.08;
  const left = x + inset;
  const top = y + inset;
  const side = size - inset * 2;
  const radius = side * 0.22;
  const rect = Skia.XYWHRect(left, top, side, side);
  const rrect = Skia.RRectXY(rect, radius, radius);

  // Contact shadow, just under the stone.
  const shadow = Skia.Paint();
  shadow.setAntiAlias(true);
  shadow.setColor(Skia.Color('#0f172a'));
  shadow.setAlphaf(0.16 * opacity);
  canvas.drawRRect(
    Skia.RRectXY(Skia.XYWHRect(left, top + side * 0.1, side, side), radius, radius),
    shadow
  );

  // Body: light at the top-left corner, dark at the opposite one.
  const body = Skia.Paint();
  body.setAntiAlias(true);
  body.setAlphaf(opacity);
  body.setShader(
    Skia.Shader.MakeLinearGradient(
      { x: left, y: top },
      { x: left + side, y: top + side },
      [Skia.Color(lighten(hex, 0.45)), Skia.Color(hex), Skia.Color(darken(hex, 0.35))],
      [0, 0.55, 1],
      0 // TileMode.Clamp
    )
  );
  canvas.drawRRect(rrect, body);

  // Facet line across the middle, so the stone reads as cut rather than domed.
  const facet = Skia.Paint();
  facet.setAntiAlias(true);
  facet.setColor(Skia.Color(lighten(hex, 0.25)));
  facet.setAlphaf(0.55 * opacity);
  facet.setStyle(1); // PaintStyle.Stroke
  facet.setStrokeWidth(Math.max(side * 0.05, 0.5));
  canvas.drawLine(left + side * 0.18, top + side * 0.82, left + side * 0.82, top + side * 0.18, facet);

  // Specular highlight near the light source.
  const highlight = Skia.Paint();
  highlight.setAntiAlias(true);
  highlight.setColor(Skia.Color('#ffffff'));
  highlight.setAlphaf(0.7 * opacity);
  canvas.drawOval(
    Skia.XYWHRect(left + side * 0.16, top + side * 0.14, side * 0.26, side * 0.2),
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
