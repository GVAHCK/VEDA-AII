import type { HandwritingDetectionResult, OCRAudit, OCRBlock, OCRProviderResult } from '@/lib/types';
import type { PageImage } from '@/lib/pdf/rasterize';
import { recognizePagesWithAudit } from '@/lib/ocr/tesseract';
import { technicalVocabularyScore, TECHNICAL_TERMS } from '@/lib/ocr/technical';
import { detectHandwriting } from '@/lib/ocr/handwriting';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_FALLBACK_MODELS, AI_CONFIG } from '@/lib/llm/config';

export type OCRResult = { blocks: OCRBlock[]; confidence: number; provider: string };

export interface OCRProvider {
  readonly name: string;
  extract(page: PageImage): Promise<OCRResult>;
}

function scoreProviderResult(result: OCRResult): Omit<OCRProviderResult, 'status'> {
  const text = result.blocks.map((block) => block.text).join(' ');
  const words = text.match(/[A-Za-z]{2,}/g) ?? [];
  const languageScore = words.length
    ? words.filter((word) => /[aeiou]/i.test(word) && !/(.)\1\1/i.test(word)).length / words.length
    : 0;
  const dictionaryScore = technicalVocabularyScore(text);
  const wordScore = Math.min(1, words.length / 45);
  const qualityScore = Number(
    (result.confidence * 0.55 + languageScore * 0.2 + dictionaryScore * 0.15 + wordScore * 0.1).toFixed(3)
  );

  return {
    provider: result.provider,
    pageNumber: result.blocks[0]?.pageNumber ?? 0,
    confidence: result.confidence,
    wordCount: words.length,
    languageScore,
    dictionaryScore,
    qualityScore,
  };
}

/** Local Tesseract Multi-PSM Engine */
export class TesseractProvider implements OCRProvider {
  readonly name = 'Tesseract';
  async extract(page: PageImage): Promise<OCRResult> {
    const output = await recognizePagesWithAudit([page]);
    return {
      provider: this.name,
      blocks: output.blocks,
      confidence: output.audit.meanConfidence / 100,
    };
  }
}

/** Gemini Multi-Modal Vision OCR Engine for Handwritten & Complex Layouts */
export class GeminiVisionProvider implements OCRProvider {
  readonly name = 'GeminiVision';

  async extract(page: PageImage): Promise<OCRResult> {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key.trim().length === 0 || key.startsWith('your_')) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const client = new GoogleGenerativeAI(key.trim());
    const base64Image = (page.originalImage ?? page.image).toString('base64');

    let lastError: unknown = null;
    for (const modelName of GEMINI_FALLBACK_MODELS) {
      try {
        const model = client.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.0,
            maxOutputTokens: AI_CONFIG.maxOutputTokens,
          },
        });

        const prompt = `You are a high-precision OCR and document transcription engine specializing in handwritten computer science assignments.
Transcribe all text, question numbers (e.g. 1., 2., 3., Q1, Ans 1, 1(a)), mathematical equations, loss functions, matrices, and calculations exactly as written.
Do not summarize or grade. Preserve sequential reading order.

Return JSON ONLY:
{
  "lines": [
    { "text": "line text", "confidence": number 0-1 }
  ],
  "meanConfidence": number 0-1
}`;

        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: base64Image,
              mimeType: 'image/png',
            },
          },
        ]);

        const text = result.response.text().trim();
        const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
        const parsed = JSON.parse(cleaned) as {
          lines?: Array<{ text: string; confidence?: number }>;
          meanConfidence?: number;
        };

        if (Array.isArray(parsed.lines) && parsed.lines.length > 0) {
          const blocks: OCRBlock[] = [];
          parsed.lines.forEach((line, lineIdx) => {
            const lineText = line.text?.trim();
            if (!lineText) return;
            const words = lineText.split(/\s+/);
            const lineConf = typeof line.confidence === 'number' ? line.confidence : 0.95;

            words.forEach((w, wIdx) => {
              blocks.push({
                id: `p${page.pageNumber}-l${lineIdx}-w${wIdx}`,
                pageNumber: page.pageNumber,
                lineIndex: lineIdx,
                text: w,
                confidence: lineConf,
                bbox: {
                  x: 5 + (wIdx * 5) % 85,
                  y: 5 + (lineIdx * 2.5) % 90,
                  width: Math.max(3, w.length * 1.5),
                  height: 2.5,
                },
              });
            });
          });

          return {
            provider: this.name,
            blocks,
            confidence: parsed.meanConfidence ?? 0.95,
          };
        }
      } catch (err) {
        lastError = err;
        console.warn(`[GEMINI VISION] Model "${modelName}" failed for page ${page.pageNumber}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    throw lastError || new Error('GeminiVision transcription failed');
  }
}

class HttpOCRProvider implements OCRProvider {
  constructor(readonly name: string, private endpointVariable: string) {}

  async extract(page: PageImage): Promise<OCRResult> {
    const endpoint = process.env[this.endpointVariable];
    if (!endpoint) throw new Error(`${this.endpointVariable} is not configured`);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        pageNumber: page.pageNumber,
        imageBase64: page.image.toString('base64'),
      }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!response.ok) throw new Error(`${this.name} returned HTTP ${response.status}`);
    const body = (await response.json()) as { blocks?: OCRBlock[]; confidence?: number; text?: string };

    if (Array.isArray(body.blocks) && body.blocks.length > 0) {
      return { provider: this.name, blocks: body.blocks, confidence: body.confidence ?? 0.85 };
    }

    if (typeof body.text === 'string' && body.text.trim()) {
      const words = body.text.trim().split(/\s+/);
      const blocks: OCRBlock[] = words.map((w, idx) => ({
        id: `p${page.pageNumber}-w${idx}`,
        pageNumber: page.pageNumber,
        text: w,
        confidence: body.confidence ?? 0.85,
        bbox: { x: 5, y: 5 + (idx * 2) % 85, width: 20, height: 2 },
      }));
      return { provider: this.name, blocks, confidence: body.confidence ?? 0.85 };
    }

    throw new Error(`${this.name} response has no recognized text blocks`);
  }
}

/** Hosted Hugging Face/Inference Endpoint for microsoft/trocr-*-handwritten */
export class TrOCRProvider extends HttpOCRProvider {
  constructor() {
    super('TrOCR', 'TROCR_ENDPOINT');
  }
}

/** Backwards-compatible alias for TransformerOCRProvider */
export class TransformerOCRProvider extends TrOCRProvider {}

/** Hosted Donut endpoint for document understanding */
export class DonutProvider extends HttpOCRProvider {
  constructor() {
    super('Donut', 'DONUT_ENDPOINT');
  }
}

/** Backwards-compatible alias for DonutOCRProvider */
export class DonutOCRProvider extends DonutProvider {}

/**
 * Phase 2: Token-Level Multi-OCR Voting & Fusion
 * Voting Formula:
 * - 40% OCR Confidence
 * - 30% Language Model / Dictionary Probability
 * - 20% Technical Lexicon Match
 * - 10% Spatial Consistency
 */
function scoreTokenCandidate(token: string, confidence: number): number {
  const clean = token.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!clean) return 0.1;

  // Language validity
  const vowels = (clean.match(/[aeiou]/g) || []).length;
  const langProb = clean.length >= 2 && vowels > 0 && !/(.)\1\1/.test(clean) ? 0.95 : 0.4;

  // Technical lexicon match
  const isTechnical = TECHNICAL_TERMS.some((t) => t.includes(clean) || clean.includes(t));
  const techScore = isTechnical ? 1.0 : 0.3;

  return confidence * 0.4 + langProb * 0.3 + techScore * 0.2 + 0.1;
}

/** Fuses multi-OCR tokens using token-level weighted voting */
function fuseBlocksWithVoting(
  primary: OCRResult,
  candidates: OCRResult[]
): { blocks: OCRBlock[]; fusedCount: number; agreementRatio: number } {
  if (candidates.length < 2) {
    return { blocks: primary.blocks, fusedCount: 0, agreementRatio: 1.0 };
  }

  let fusedCount = 0;
  let agreedTokens = 0;

  const fusedBlocks = primary.blocks.map((block) => {
    const matchingCandidates = candidates
      .flatMap((c) => c.blocks)
      .filter(
        (other) =>
          other.pageNumber === block.pageNumber &&
          Math.abs(other.bbox.y - block.bbox.y) < 1.5 &&
          Math.abs(other.bbox.x - block.bbox.x) < 4.0
      );

    const pool = [block, ...matchingCandidates];
    if (pool.length > 1) {
      agreedTokens += 1;
    }

    const bestToken = pool
      .map((b) => ({ block: b, score: scoreTokenCandidate(b.text, b.confidence ?? 0.8) }))
      .sort((a, b) => b.score - a.score)[0]?.block;

    if (bestToken && bestToken.text !== block.text) {
      fusedCount += 1;
      return {
        ...block,
        text: bestToken.text,
        confidence: Math.max(block.confidence ?? 0, bestToken.confidence ?? 0),
      };
    }
    return block;
  });

  const agreementRatio = primary.blocks.length ? agreedTokens / primary.blocks.length : 1.0;
  return { blocks: fusedBlocks, fusedCount, agreementRatio: Number(agreementRatio.toFixed(3)) };
}

/**
 * Phase 1 & Phase 2: Handwriting-First Routing & Fallback Chain
 * - If page is handwritten:
 *   Primary chain: GeminiVision -> TrOCR -> Donut -> Tesseract
 *   Tesseract only wins if remote/vision providers are unconfigured or fail.
 * - If page is printed:
 *   Primary chain: Tesseract -> GeminiVision -> TrOCR -> Donut
 */
export async function recognizeDocument(
  pages: PageImage[]
): Promise<{ blocks: OCRBlock[]; audit: OCRAudit }> {
  const blocks: OCRBlock[] = [];
  const providerResults: OCRProviderResult[] = [];
  const chosenProvider: string[] = [];
  const handwritingReports: HandwritingDetectionResult[] = [];

  const tesseract = new TesseractProvider();
  const geminiVision = new GeminiVisionProvider();
  const trocr = new TrOCRProvider();
  const donut = new DonutProvider();

  let totalFusedTokens = 0;
  let sumAgreement = 0;

  for (const page of pages) {
    const handwriting = await detectHandwriting(page);
    handwritingReports.push(handwriting);

    console.log(
      `[ROUTING] Page ${page.pageNumber}: "${handwriting.classification.toUpperCase()}" (handwritten: ${handwriting.handwrittenScore}, printed: ${handwriting.printedScore})`
    );

    let chain: OCRProvider[];
    if (handwriting.classification === 'printed') {
      chain = [tesseract, geminiVision, trocr, donut];
    } else {
      // Handwriting-first priority: Vision -> TrOCR -> Donut -> Tesseract
      chain = [geminiVision, trocr, donut, tesseract];
    }

    let selectedResult: OCRResult | null = null;
    const successfulCandidates: Array<{ result: OCRResult; report: Omit<OCRProviderResult, 'status'> }> = [];

    for (const provider of chain) {
      try {
        console.log(`[OCR ENGINE ATTEMPT] Trying ${provider.name} on Page ${page.pageNumber}...`);
        const res = await provider.extract(page);
        const rep = scoreProviderResult(res);
        successfulCandidates.push({ result: res, report: rep });

        if (!selectedResult) {
          selectedResult = res;
          console.log(`  ✓ ${provider.name} succeeded with quality ${(rep.qualityScore * 100).toFixed(0)}% on Page ${page.pageNumber}`);
          // If primary vision or trocr succeeded with high confidence, finish chain
          if (
            (provider.name === 'GeminiVision' && res.confidence >= 0.8) ||
            (provider.name === 'TrOCR' && res.confidence >= 0.8) ||
            (handwriting.classification === 'printed' && provider.name === 'Tesseract')
          ) {
            break;
          }
        }
      } catch (err) {
        console.warn(`  ✗ ${provider.name} unavailable on Page ${page.pageNumber}: ${err instanceof Error ? err.message : String(err)}`);
        providerResults.push({
          provider: provider.name,
          pageNumber: page.pageNumber,
          confidence: 0,
          wordCount: 0,
          languageScore: 0,
          dictionaryScore: 0,
          qualityScore: 0,
          status: /not configured/.test(String(err)) ? 'unavailable' : 'failed',
        });
      }
    }

    // Safety fallback: Ensure at least Tesseract runs
    if (!selectedResult) {
      console.log(`[FALLBACK SAFETY] Running Tesseract baseline for Page ${page.pageNumber}...`);
      selectedResult = await tesseract.extract(page);
      successfulCandidates.push({ result: selectedResult, report: scoreProviderResult(selectedResult) });
    }

    successfulCandidates.forEach((candidate) => {
      providerResults.push({
        ...candidate.report,
        status: candidate.result === selectedResult ? 'selected' : 'available',
      });
    });

    // Run multi-OCR token voting & fusion
    const fusion = fuseBlocksWithVoting(
      selectedResult,
      successfulCandidates.map((c) => c.result)
    );

    totalFusedTokens += fusion.fusedCount;
    sumAgreement += fusion.agreementRatio;

    blocks.push(...fusion.blocks);
    chosenProvider.push(
      `${selectedResult.provider} (${handwriting.classification}; handwriting ${(handwriting.handwrittenScore * 100).toFixed(0)}%)`
    );
  }

  const meanConfidence = blocks.length
    ? blocks.reduce((sum, block) => sum + (block.confidence ?? 0), 0) / blocks.length
    : 0;

  const dominantHandwriting = handwritingReports.some((h) => h.classification === 'handwritten')
    ? 'handwritten'
    : handwritingReports.some((h) => h.classification === 'mixed')
    ? 'mixed'
    : 'printed';

  return {
    blocks,
    audit: {
      meanConfidence: meanConfidence * 100,
      rejectedBlocks: 0,
      selectedModes: chosenProvider,
      preprocess: pages.flatMap((page) => page.preprocessLog ?? []),
      engines: chosenProvider,
      chosenProvider,
      providerResults,
      handwritingDetected: dominantHandwriting !== 'printed',
      handwritingClassification: dominantHandwriting,
      handwritingMetrics: handwritingReports[0],
      ocrDiagnostics: {
        preprocessStages: [],
        tokenVotingStats: {
          totalTokens: blocks.length,
          fusedTokens: totalFusedTokens,
          multiOcrAgreementRatio: pages.length ? Number((sumAgreement / pages.length).toFixed(3)) : 1.0,
        },
      },
      confidenceBreakdown: {
        ocr: meanConfidence,
        mapping: 0,
        grading: 0,
      },
    },
  };
}
