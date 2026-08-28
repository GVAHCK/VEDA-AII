import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_MODEL, GEMINI_FALLBACK_MODELS, AI_CONFIG } from '@/lib/llm/config';

/** Validates environment configuration on server startup */
export function validateEnvironment(): { geminiConfigured: boolean; keyPresent: boolean } {
  const key = process.env.GEMINI_API_KEY;
  const keyPresent = Boolean(key && key.trim().length > 10 && !key.startsWith('your_'));

  console.log('=================================================');
  console.log(`[AI MODEL]         Default: ${GEMINI_MODEL}`);
  console.log(`[API KEY FOUND]    ${keyPresent ? 'YES' : 'NO'}`);
  console.log(`[MODEL AVAILABLE]  ${keyPresent ? 'READY' : 'STANDBY (Deterministic Fallback Active)'}`);
  console.log('=================================================');

  return { geminiConfigured: keyPresent, keyPresent };
}

/** Executes structured JSON generation with automatic model fallback across supported Gemini versions */
export async function geminiJson<T>(prompt: string): Promise<T> {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key.trim().length === 0) {
    throw new Error('GEMINI_API_KEY is not configured in .env.local');
  }

  const client = new GoogleGenerativeAI(key.trim());
  let lastError: unknown = null;

  for (const modelName of GEMINI_FALLBACK_MODELS) {
    try {
      const model = client.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: AI_CONFIG.temperature,
          maxOutputTokens: AI_CONFIG.maxOutputTokens,
        },
      });

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
      return JSON.parse(cleaned) as T;
    } catch (err) {
      lastError = err;
      console.warn(`[GEMINI FALLBACK] Model "${modelName}" failed, attempting next model... (${err instanceof Error ? err.message : String(err)})`);
    }
  }

  throw lastError || new Error('All Gemini candidate models failed to generate content.');
}
