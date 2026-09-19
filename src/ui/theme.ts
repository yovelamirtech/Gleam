/** Light UI palette for the whole game, per BUILD_PLAN.md (light, not dark/luxury). */
export const theme = {
  appBackground: '#f6f8fc',
  boardBackground: '#ffffff',
  cellEmpty: '#f1f4f9',
  cellGrid: '#dde3ec',
  cellNumber: '#8a94a6',
  panel: '#ffffff',
  panelBorder: '#e2e8f2',
  text: '#1d2433',
  textMuted: '#697386',
  accent: '#3f7ae0',
  positive: '#2fa36b',
  negative: '#dd5b5b',
  shadow: '#0f172a',
} as const;

/** Faux-3D stones use one fixed light source, top-left, with no ambient sparkle. */
export const LIGHT_SOURCE = { x: -0.7, y: -0.7 } as const;
