// constants/panels.ts
export const PANEL_TYPES = {
  CODE: 'code',
  PREVIEW: 'preview',
  CANVAS: 'canvas',
} as const;

export type PanelType = typeof PANEL_TYPES[keyof typeof PANEL_TYPES];

export const FULLSCREEN_PANELS = {
  CODE: 'code',
  PREVIEW: 'preview',
  CANVAS: 'canvas',
} as const;

export type FullscreenPanel = typeof FULLSCREEN_PANELS[keyof typeof FULLSCREEN_PANELS];

export const DEFAULT_PANEL_VISIBILITY = {
  [PANEL_TYPES.CODE]: true,
  [PANEL_TYPES.PREVIEW]: true,
  [PANEL_TYPES.CANVAS]: true,
} as const;