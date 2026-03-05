// constants/ai.ts
export const AI_MODELS = {
  GEMINI_2_5_FLASH: 'gemini-2.5-flash',
  GEMINI_2_5_PRO: 'gemini-2.5-pro'
} as const;

export type AiModel = typeof AI_MODELS[keyof typeof AI_MODELS];

export const AI_PROVIDERS = {
  GOOGLE: 'google',
} as const;

export type AiProvider = typeof AI_PROVIDERS[keyof typeof AI_PROVIDERS];

export const DEFAULT_AI_SETTINGS = {
  apiKey: '',
  model: AI_MODELS.GEMINI_2_0_FLASH,
  isEditingSettings: false,
  provider: AI_PROVIDERS.GOOGLE,
} as const;

export type AiSettings = typeof DEFAULT_AI_SETTINGS;
