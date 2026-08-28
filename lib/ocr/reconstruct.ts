import { geminiJson, validateEnvironment } from '@/lib/llm/gemini';
import { correctTechnicalText } from '@/lib/ocr/technical';
import type { OCRCorrectionAuditEntry } from '@/lib/types';

export type OCRReconstruction = {
  rawText: string;
  correctedText: string;
  confidence: number;
  corrections: string[];
  audit: OCRCorrectionAuditEntry[];
};

/**
 * Phase 4 & Phase 5: Question-Aware LLM Semantic Reconstruction
 * 1. Takes the Question context and raw OCR answer text.
 * 2. Uses question context to disambiguate corrupted tokens (e.g. "frees" -> "trees" in Random Forest questions).
 * 3. Preserves mathematical formulas, equations, matrices, and numeric calculations.
 * 4. Never invents concepts not written by student.
 */
export async function reconstructAnswerWithQuestionContext(
  questionText: string,
  rawAnswerText: string,
  ocrConfidence = 0.8
): Promise<OCRReconstruction> {
  const local = correctTechnicalText(rawAnswerText, questionText);

  if (!rawAnswerText.trim()) {
    return {
      rawText: rawAnswerText,
      correctedText: '',
      confidence: 0,
      corrections: [],
      audit: [],
    };
  }

  const env = validateEnvironment();
  if (!env.geminiConfigured) {
    return {
      rawText: rawAnswerText,
      correctedText: local.text,
      confidence: local.text === rawAnswerText ? ocrConfidence : Math.max(0.85, ocrConfidence),
      corrections: local.corrections,
      audit: local.audit,
    };
  }

  try {
    const prompt = `You are reconstructing OCR-corrupted handwritten deep learning exam answers.
Preserve meaning.
Repair corrupted technical terminology and mathematical formulas.
Do not invent concepts not present in the answer.
Output cleaned academic answer only.

Question Prompt:
${questionText}

Student Handwritten OCR Text:
${local.text.slice(0, 10000)}

Return JSON ONLY in this format:
{
  "cleanedAnswer": "reconstructed answer text",
  "confidence": number (0 to 1),
  "repairs": ["original term -> repaired term"]
}`;

    const result = await geminiJson<{
      cleanedAnswer?: string;
      confidence?: number;
      repairs?: string[];
    }>(prompt);

    const reconstructed = result.cleanedAnswer?.trim() || local.text;
    const additionalRepairs = Array.isArray(result.repairs) ? result.repairs.slice(0, 100) : [];
    const geminiAudit: OCRCorrectionAuditEntry[] = additionalRepairs.map((c) => {
      const parts = c.split(/->|→/);
      return {
        original: (parts[0] || '').trim(),
        corrected: (parts[1] || '').trim(),
        confidence: typeof result.confidence === 'number' ? result.confidence : 0.95,
        category: 'Question-Aware LLM Reconstruction',
      };
    });

    return {
      rawText: rawAnswerText,
      correctedText: reconstructed,
      confidence: typeof result.confidence === 'number' ? Math.max(0, Math.min(1, result.confidence)) : 0.92,
      corrections: [...local.corrections, ...additionalRepairs],
      audit: [...local.audit, ...geminiAudit],
    };
  } catch (err) {
    console.warn('[QUESTION-AWARE RECONSTRUCT] Gemini repair unavailable, using domain repair result', err);
    return {
      rawText: rawAnswerText,
      correctedText: local.text,
      confidence: Math.max(0.8, ocrConfidence),
      corrections: local.corrections,
      audit: local.audit,
    };
  }
}

/** Legacy signature maintaining backward compatibility */
export async function reconstructOCRText(corruptedText: string): Promise<OCRReconstruction> {
  const result = await reconstructAnswerWithQuestionContext('', corruptedText);
  return result;
}

/** Pre-grading semantic recovery helper */
export async function recoverSemanticText(
  text: string,
  ocrConfidence: number,
  questionContext?: string
): Promise<string> {
  const reconstructed = await reconstructAnswerWithQuestionContext(questionContext || '', text, ocrConfidence);
  return reconstructed.correctedText || text;
}
