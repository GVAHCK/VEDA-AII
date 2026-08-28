import type { AnswerSegment, BoundingBox, OCRBlock, Question } from '@/lib/types';
import { QuestionBoundaryDetector } from '@/lib/extraction/questions';
import { AnswerSegmentBuilder, type AnswerLine } from '@/lib/extraction/answers';

export type OCRLine = { pageNumber: number; text: string; boxes: BoundingBox[]; confidence: number };

export { QuestionBoundaryDetector } from '@/lib/extraction/questions';
export { AnswerSegmentBuilder } from '@/lib/extraction/answers';

export const isHeaderLine = QuestionBoundaryDetector.isHeaderLine;
export const isNoiseLine = QuestionBoundaryDetector.isNoiseLine;
export const isGarbageLine = isNoiseLine;
export const isStudentMetadata = AnswerSegmentBuilder.isStudentMetadata;
export const isMetadataLine = isStudentMetadata;

export const continuationPattern = AnswerSegmentBuilder.CONTINUATION_PATTERN;
export const unnumberedSectionPattern = AnswerSegmentBuilder.UNNUMBERED_PATTERN;

/** Normalizes question and answer numbers to a canonical format: e.g. "11a", "11(a)", "11.a." -> "11(a)" */
export function normalizeQuestionNumber(value: string): string {
  if (!value) return '';
  const cleaned = value
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[-.:]/g, '')
    .replace(/[()]/g, '');

  const match = cleaned.match(/^(\d+)([a-z]|[ivx]{1,4})?$/i);
  if (match) {
    const num = match[1];
    const sub = match[2];
    return sub ? `${num}(${sub})` : num;
  }
  return cleaned;
}

export const normalizeNumber = normalizeQuestionNumber;

/** Parses question number anchors */
export function parseQuestionNumber(
  line: string
): { rawMatch: string; number: string; remainingText: string } | null {
  return QuestionBoundaryDetector.parseBoundary(line);
}

export const matchQuestionNumber = parseQuestionNumber;

/** Layout-aware reconstruction of OCR words into ordered lines */
export function linesFromBlocks(blocks: OCRBlock[]): OCRLine[] {
  const lines: OCRLine[] = [];
  const uniquePages = [...new Set(blocks.map((b) => b.pageNumber))].sort((a, b) => a - b);

  for (const pageNumber of uniquePages) {
    const pageBlocks = blocks.filter((b) => b.pageNumber === pageNumber);
    const hasLineIndices = pageBlocks.some((b) => b.lineIndex !== undefined);

    if (hasLineIndices) {
      const lineMap = new Map<number, OCRBlock[]>();
      for (const block of pageBlocks) {
        const idx = block.lineIndex ?? 0;
        if (!lineMap.has(idx)) lineMap.set(idx, []);
        lineMap.get(idx)!.push(block);
      }

      const sortedLineIndices = [...lineMap.keys()].sort((a, b) => a - b);
      for (const lineIdx of sortedLineIndices) {
        const lineWords = lineMap.get(lineIdx)!.sort((a, b) => a.bbox.x - b.bbox.x);
        const text = lineWords.map((w) => w.text).join(' ');
        const boxes = lineWords.map((w) => w.bbox);
        const confidence =
          lineWords.reduce((sum, w) => sum + (w.confidence ?? 0), 0) / (lineWords.length || 1);

        lines.push({ pageNumber, text, boxes, confidence });
      }
    } else {
      const sortedWords = pageBlocks.sort((a, b) => a.bbox.y - b.bbox.y || a.bbox.x - b.bbox.x);
      for (const word of sortedWords) {
        const current = lines[lines.length - 1];
        const isSamePage = current && current.pageNumber === pageNumber;
        const isSameLine =
          isSamePage &&
          Math.abs(current.boxes[0].y - word.bbox.y) < Math.min(0.8, word.bbox.height * 0.5);

        if (isSameLine) {
          current.text += `${current.text ? ' ' : ''}${word.text}`;
          current.boxes.push(word.bbox);
          current.confidence = Math.min(current.confidence, word.confidence ?? 0);
        } else {
          lines.push({
            pageNumber,
            text: word.text,
            boxes: [word.bbox],
            confidence: word.confidence ?? 0,
          });
        }
      }
    }
  }

  return lines.filter((l) => !isNoiseLine(l.text, l.confidence));
}

export interface QuestionValidationReport {
  detected: string[];
  missing: string[];
  duplicates: string[];
  isSequenceValid: boolean;
  warnings: string[];
  headersRemoved: number;
  metadataRemoved: number;
  noiseRemoved: number;
}

/** Audits extracted question numbers for continuity, duplicates, and gaps */
export function validateQuestionSequence(
  questions: Question[],
  counters: { headersRemoved: number; metadataRemoved: number; noiseRemoved: number } = {
    headersRemoved: 0,
    metadataRemoved: 0,
    noiseRemoved: 0,
  }
): QuestionValidationReport {
  const detected = questions.map((q) => `Q${q.number}`);
  const seen = new Set<string>();
  const duplicates: string[] = [];
  const warnings: string[] = [];

  const firstNum = questions[0]?.number;
  if (firstNum && firstNum !== '1' && !firstNum.startsWith('1(') && !firstNum.startsWith('1a')) {
    const critMsg = `[CRITICAL] Missing first question detected. Expected Q1 but sequence began at Q${firstNum}`;
    console.error(critMsg);
    warnings.push(critMsg);
  }

  for (const q of questions) {
    const num = q.number;
    if (seen.has(num)) {
      duplicates.push(`Q${num}`);
      warnings.push(`[DUPLICATE QUESTION NUMBER] Detected duplicate question number "Q${num}" (ID: ${q.id})`);
    } else {
      seen.add(num);
    }
  }

  const integerNumbers = questions
    .map((q) => {
      const m = q.number.match(/^(\d+)/);
      return m ? Number(m[1]) : null;
    })
    .filter((n): n is number => n !== null);

  const missing: string[] = [];
  if (integerNumbers.length > 1) {
    const min = Math.min(...integerNumbers);
    const max = Math.max(...integerNumbers);
    const numSet = new Set(integerNumbers);
    for (let i = min; i <= max; i++) {
      if (!numSet.has(i)) {
        missing.push(`Q${i}`);
        warnings.push(`[QUESTION GAP DETECTED] Question sequence gap: missing Q${i}`);
      }
    }
  }

  return {
    detected,
    missing,
    duplicates,
    isSequenceValid: duplicates.length === 0 && questions.length > 0 && (!firstNum || firstNum === '1' || firstNum.startsWith('1')),
    warnings,
    headersRemoved: counters.headersRemoved,
    metadataRemoved: counters.metadataRemoved,
    noiseRemoved: counters.noiseRemoved,
  };
}

/** Extracts structured questions with QuestionBoundaryDetector */
export function extractQuestions(blocks: OCRBlock[]): Question[] {
  const lines = linesFromBlocks(blocks);
  return QuestionBoundaryDetector.extractQuestions(lines);
}

/** Extracts student answers with AnswerSegmentBuilder */
export function extractAnswers(blocks: OCRBlock[]): AnswerSegment[] {
  const lines = linesFromBlocks(blocks);
  return AnswerSegmentBuilder.buildAnswerSegments(lines as AnswerLine[]);
}
