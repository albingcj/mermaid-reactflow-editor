// constants/theme.ts
export const THEME_PREFERENCES = {
  SYSTEM: 'system',
  LIGHT: 'light',
  DARK: 'dark',
} as const;

export type ThemePreference = typeof THEME_PREFERENCES[keyof typeof THEME_PREFERENCES];

export const EFFECTIVE_THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
} as const;

export type EffectiveTheme = typeof EFFECTIVE_THEMES[keyof typeof EFFECTIVE_THEMES];