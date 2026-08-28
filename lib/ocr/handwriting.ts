import { createCanvas, loadImage } from '@napi-rs/canvas';
import type { PageImage } from '@/lib/pdf/rasterize';
import type { HandwritingDetectionResult, HandwritingType } from '@/lib/types';

/**
 * Phase 3: Comprehensive Handwriting Detection
 * Measures:
 * 1. Stroke irregularity (local edge & gradient transition variability)
 * 2. Line variance (baseline row standard deviation / text line straightness)
 * 3. Character spacing variance (gap length variance between ink runs)
 * 4. OCR confidence correlation (handwriting typically has lower character-level certainty)
 */
export async function detectHandwriting(
  page: PageImage,
  ocrConfidence?: number
): Promise<HandwritingDetectionResult> {
  try {
    const image = await loadImage(page.originalImage ?? page.image);
    const sample = Math.max(1, Math.floor(Math.max(image.width, image.height) / 800));
    const width = Math.ceil(image.width / sample);
    const height = Math.ceil(image.height / sample);

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return {
        classification: 'printed',
        handwrittenScore: 0.2,
        printedScore: 0.8,
        mixedScore: 0.1,
        strokeIrregularity: 0.2,
        lineVariance: 0.2,
        characterSpacingVariance: 0.2,
        ocrConfidence,
      };
    }

    ctx.drawImage(image, 0, 0, width, height);
    const pixels = ctx.getImageData(0, 0, width, height).data;

    let inkCount = 0;
    let transitions = 0;
    const rowInks = new Int32Array(height);
    const gapLengths: number[] = [];

    for (let y = 0; y < height; y += 1) {
      let inInk = false;
      let currentGap = 0;
      let rowInk = 0;

      for (let x = 0; x < width; x += 1) {
        const i = (y * width + x) * 4;
        const lum = (pixels[i] * 299 + pixels[i + 1] * 587 + pixels[i + 2] * 114) / 1000;
        const isDark = lum < 140;

        if (isDark) {
          inkCount += 1;
          rowInk += 1;
          if (!inInk && currentGap > 0) {
            gapLengths.push(currentGap);
            currentGap = 0;
          }
          inInk = true;
        } else {
          if (inInk) {
            transitions += 1;
            inInk = false;
          }
          currentGap += 1;
        }
      }
      rowInks[y] = rowInk;
    }

    // 1. Stroke Irregularity: ratio of ink transitions to total ink
    const strokeIrregularity = Math.min(1, Math.max(0, transitions / Math.max(1, inkCount * 0.4)));

    // 2. Line Variance: Standard deviation of horizontal projection profile
    const activeRows = Array.from(rowInks).filter((r) => r > width * 0.02);
    let lineVariance = 0;
    if (activeRows.length > 0) {
      const mean = activeRows.reduce((a, b) => a + b, 0) / activeRows.length;
      const variance = activeRows.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / activeRows.length;
      const stdDev = Math.sqrt(variance);
      lineVariance = Math.min(1, stdDev / (width * 0.15 || 1));
    }

    // 3. Character Spacing Variance
    let characterSpacingVariance = 0;
    if (gapLengths.length > 10) {
      const meanGap = gapLengths.reduce((a, b) => a + b, 0) / gapLengths.length;
      const gapVar = gapLengths.reduce((a, b) => a + Math.pow(b - meanGap, 2), 0) / gapLengths.length;
      characterSpacingVariance = Math.min(1, Math.sqrt(gapVar) / (meanGap || 1));
    }

    // 4. Combined Handwriting Metric
    const ocrPenalty = ocrConfidence !== undefined ? (1 - Math.min(1, ocrConfidence)) * 0.2 : 0;
    const rawHandwritten =
      strokeIrregularity * 0.4 +
      lineVariance * 0.3 +
      characterSpacingVariance * 0.2 +
      ocrPenalty;

    const handwrittenScore = Number(Math.max(0, Math.min(1, rawHandwritten)).toFixed(3));
    const printedScore = Number((1 - handwrittenScore).toFixed(3));
    const mixedScore = Number(Math.max(0, 1 - Math.abs(handwrittenScore - printedScore) * 1.5).toFixed(3));

    let classification: HandwritingType = 'printed';
    if (handwrittenScore > 0.6) {
      classification = 'handwritten';
    } else if (handwrittenScore > 0.35 || mixedScore > 0.45) {
      classification = 'mixed';
    }

    return {
      classification,
      handwrittenScore,
      printedScore,
      mixedScore,
      strokeIrregularity: Number(strokeIrregularity.toFixed(3)),
      lineVariance: Number(lineVariance.toFixed(3)),
      characterSpacingVariance: Number(characterSpacingVariance.toFixed(3)),
      ocrConfidence,
    };
  } catch (err) {
    console.warn('[HANDWRITING DETECTION] Error during handwriting analysis, using default printed', err);
    return {
      classification: 'printed',
      handwrittenScore: 0.2,
      printedScore: 0.8,
      mixedScore: 0.1,
      strokeIrregularity: 0.2,
      lineVariance: 0.2,
      characterSpacingVariance: 0.2,
      ocrConfidence,
    };
  }
}
