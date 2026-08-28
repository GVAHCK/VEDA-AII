/** Single source of truth for Gemini model selection. */
export const GEMINI_MODEL = 'gemini-3.6-flash';

// Broadly available models as operational fallbacks. The requested
// primary is always tried first, falling back across active models
// if quota limits or model availability changes.
export const GEMINI_FALLBACK_MODELS = [
  GEMINI_MODEL,
  'gemini-3.6-pro',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
];

export const AI_CONFIG = {
  defaultModel: GEMINI_MODEL,
  fallbackModels: GEMINI_FALLBACK_MODELS,
  temperature: 0.1,
  maxOutputTokens: 2048,
} as const;
