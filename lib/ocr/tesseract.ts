import { createWorker, PSM } from 'tesseract.js';
import type { OCRAudit, OCRBlock } from '@/lib/types';
import type { PageImage } from '@/lib/pdf/rasterize';

/** Checks if a token is pure garbage symbol noise or below minimum spatial dimension */
function isNoiseWord(text: string, confidence: number, pixelWidth: number, pixelHeight: number): boolean {
  if (!text || text.length === 0) return true;
  if (pixelWidth < 2 || pixelHeight < 2) return true;
  // Handwriting frequently produces low-confidence but useful word fragments.
  // Preserve plausible alphabetic tokens for line-level reconstruction; only
  // discard very low-confidence single character noise.
  if (confidence < 0.15 && !/^[a-z0-9]{2,}$/i.test(text)) return true;
  if (/^[~`!@#$%^&*()_+=\-[\]\\{}|;':",./<>?]{3,}$/.test(text)) return true;
  return false;
}

interface PSMRunResult {
  psmMode: string;
  blocks: OCRBlock[];
  meanConfidence: number;
  filteredCount: number;
  qualityScore: number;
}

/** Performs OCR with a specific PSM mode */
async function runWorkerWithPSM(
  worker: Awaited<ReturnType<typeof createWorker>>,
  page: PageImage,
  psmMode: PSM,
  psmName: string
): Promise<PSMRunResult> {
  await worker.setParameters({
    tessedit_pageseg_mode: psmMode,
    user_defined_dpi: '300',
  });

  // Use enhanced grayscale image if available, fallback to image
  const inputBuffer = page.enhancedImage ?? page.image;
  const result = await worker.recognize(inputBuffer);
  const lines = result.data.lines ?? [];
  const words = result.data.words ?? [];
  const maxX = page.width || Math.max(...words.map((word) => word.bbox.x1), 1);
  const maxY = page.height || Math.max(...words.map((word) => word.bbox.y1), 1);

  const blocks: OCRBlock[] = [];
  let keptWordCount = 0;
  let filteredCount = 0;
  let confidenceSum = 0;

  if (lines.length > 0) {
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx += 1) {
      const line = lines[lineIdx];
      const lineWords = line.words ?? [];

      for (let wordIdx = 0; wordIdx < lineWords.length; wordIdx += 1) {
        const word = lineWords[wordIdx];
        const text = word.text.trim();
        const confidence = word.confidence / 100;
        const wWidth = word.bbox.x1 - word.bbox.x0;
        const wHeight = word.bbox.y1 - word.bbox.y0;

        if (!text || isNoiseWord(text, confidence, wWidth, wHeight)) {
          filteredCount += 1;
          continue;
        }

        blocks.push({
          id: `p${page.pageNumber}-l${lineIdx}-w${wordIdx}`,
          pageNumber: page.pageNumber,
          lineIndex: lineIdx,
          text,
          confidence,
          bbox: {
            x: Number(((word.bbox.x0 / maxX) * 100).toFixed(3)),
            y: Number(((word.bbox.y0 / maxY) * 100).toFixed(3)),
            width: Number((((word.bbox.x1 - word.bbox.x0) / maxX) * 100).toFixed(3)),
            height: Number((((word.bbox.y1 - word.bbox.y0) / maxY) * 100).toFixed(3)),
          },
        });
        keptWordCount += 1;
        confidenceSum += confidence;
      }
    }
  } else {
    for (let index = 0; index < words.length; index += 1) {
      const word = words[index];
      const text = word.text.trim();
      const confidence = word.confidence / 100;
      const wWidth = word.bbox.x1 - word.bbox.x0;
      const wHeight = word.bbox.y1 - word.bbox.y0;

      if (!text || isNoiseWord(text, confidence, wWidth, wHeight)) {
        filteredCount += 1;
        continue;
      }

      blocks.push({
        id: `p${page.pageNumber}-w${index}`,
        pageNumber: page.pageNumber,
        text,
        confidence,
        bbox: {
          x: Number(((word.bbox.x0 / maxX) * 100).toFixed(3)),
          y: Number(((word.bbox.y0 / maxY) * 100).toFixed(3)),
          width: Number((((word.bbox.x1 - word.bbox.x0) / maxX) * 100).toFixed(3)),
          height: Number((((word.bbox.y1 - word.bbox.y0) / maxY) * 100).toFixed(3)),
        },
      });
      keptWordCount += 1;
      confidenceSum += confidence;
    }
  }

  const meanConfidence = keptWordCount > 0 ? (confidenceSum / keptWordCount) * 100 : 0;
  // Composite score: balances word recall and word confidence so sparse modes don't win by dropping 90% of page text
  const qualityScore = meanConfidence * 0.6 + Math.min(1, keptWordCount / 80) * 40;

  return { psmMode: psmName, blocks, meanConfidence, filteredCount, qualityScore };
}

/** Performs multi-PSM OCR with automatic best-confidence selection */
export async function recognizePages(pages: PageImage[]): Promise<OCRBlock[]> {
  return (await recognizePagesWithAudit(pages)).blocks;
}

/** OCR output plus auditable per-page decision data for the review debugger. */
export async function recognizePagesWithAudit(pages: PageImage[]): Promise<{ blocks: OCRBlock[]; audit: OCRAudit }> {
  const worker = await createWorker('eng');
  try {
    const finalBlocks: OCRBlock[] = [];
    const selectedModes: string[] = [];
    let rejectedBlocks = 0;

    for (const page of pages) {
      console.log(`[OCR PREPROCESS] Page ${page.pageNumber} (${page.width || 'auto'}x${page.height || 'auto'} px)`);

      // 1. Run primary PSM 6 (SINGLE_BLOCK)
      const resPsm6 = await runWorkerWithPSM(worker, page, PSM.SINGLE_BLOCK, 'PSM 6 (SINGLE_BLOCK)');
      let bestResult = resPsm6;

      // 2. Run PSM 4 (SINGLE_COLUMN)
      const resPsm4 = await runWorkerWithPSM(worker, page, PSM.SINGLE_COLUMN, 'PSM 4 (SINGLE_COLUMN)');
      if (resPsm4.qualityScore > bestResult.qualityScore && resPsm4.blocks.length > 0) {
        bestResult = resPsm4;
      }

      // 3. Run PSM 3 (AUTO) if needed
      if (bestResult.qualityScore < 75) {
        const resPsm3 = await runWorkerWithPSM(worker, page, PSM.AUTO, 'PSM 3 (AUTO)');
        if (resPsm3.qualityScore > bestResult.qualityScore && resPsm3.blocks.length > 0) {
          bestResult = resPsm3;
        }
      }

      // 4. PSM 11 only if page has very sparse text (< 20 words kept so far)
      if (bestResult.blocks.length < 20) {
        const resPsm11 = await runWorkerWithPSM(worker, page, PSM.SPARSE_TEXT, 'PSM 11 (SPARSE_TEXT)');
        if (resPsm11.qualityScore > bestResult.qualityScore && resPsm11.blocks.length > 0) {
          bestResult = resPsm11;
        }
      }

      console.log(`[OCR MODE] Page ${page.pageNumber}: Selected ${bestResult.psmMode}`);
      console.log(`[OCR CONFIDENCE] Page ${page.pageNumber}: ${bestResult.meanConfidence.toFixed(1)}% (${bestResult.blocks.length} words kept, ${bestResult.filteredCount} tokens filtered)`);

      finalBlocks.push(...bestResult.blocks);
      selectedModes.push(`Page ${page.pageNumber}: ${bestResult.psmMode}`);
      rejectedBlocks += bestResult.filteredCount;
    }

    return {
      blocks: finalBlocks,
      audit: {
        meanConfidence: finalBlocks.length ? finalBlocks.reduce((sum, block) => sum + (block.confidence ?? 0), 0) / finalBlocks.length : 0,
        rejectedBlocks,
        selectedModes,
        preprocess: pages.flatMap((page) => page.preprocessLog ?? []),
      },
    };
  } finally {
    await worker.terminate();
  }
}
