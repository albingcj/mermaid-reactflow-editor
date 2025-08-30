// constants/ai.ts
export const AI_MODELS = {
  GEMINI_FLASH: 'gemini-2.0-flash',
  GEMINI_PRO: 'gemini-1.5-pro',
  GEMINI_PRO_FLASH: 'gemini-pro',
} as const;

export type AiModel = typeof AI_MODELS[keyof typeof AI_MODELS];

export const AI_PROVIDERS = {
  GOOGLE: 'google',
} as const;

export type AiProvider = typeof AI_PROVIDERS[keyof typeof AI_PROVIDERS];

export const DEFAULT_AI_SETTINGS = {
  apiKey: '',
  model: AI_MODELS.GEMINI_FLASH,
  isEditingSettings: false,
  provider: AI_PROVIDERS.GOOGLE,
} as const;

export type AiSettings = typeof DEFAULT_AI_SETTINGS;