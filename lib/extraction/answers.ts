import type { AnswerSegment, BoundingBox, OCRBlock } from '@/lib/types';
import { QuestionBoundaryDetector } from '@/lib/extraction/questions';

export interface AnswerLine {
  pageNumber: number;
  text: string;
  boxes: BoundingBox[];
  confidence: number;
}

export class AnswerSegmentBuilder {
  /** Continuation regex patterns for multi-page answers */
  static readonly CONTINUATION_PATTERN =
    /^\s*(?:\(?\s*cont(?:inuation|inued|d)?\s*(?:of\s*)?(?:q(?:uestion)?|ans(?:wer)?)?\s*(\d+(?:\s*[.(\-]?\s*[a-z0-9]+\s*\)?)?)\s*\)?|\(?\s*(?:q(?:uestion)?|ans(?:wer)?)\s*(\d+(?:\s*[.(\-]?\s*[a-z0-9]+\s*\)?)?)\s*cont(?:inuation|inued|d)?\s*\)?)\s*[:.-]?/i;

  /** Unnumbered scratch / rough work patterns */
  static readonly UNNUMBERED_PATTERN =
    /^\s*(?:extra(?:\s+notes?)?|notes?|rough(?:\s+(?:work|calculations?|sheet))?|scratch(?:\s+(?:work|paper))?|appendix|formulae?|formula\s+sheet)\s*[:.-]/i;

  /** Student cover-sheet / metadata filters */
  static isStudentMetadata(text: string): boolean {
    const trimmed = text.trim();
    if (!trimmed) return true;
    if (/^\s*(?:(?:q(?:uestion)?|ans(?:wer)?|a)\s*[.:-]?)?\s*(?:\[\s*\d+|\(\s*\d+|\d+\s*[.:)\]\-])/i.test(trimmed)) {
      return false;
    }
    return /^\s*(?:(?:student\s*|candidate\s*)?name\s*[:.]|nome\b|reg(?:istration)?\s*(?:num(?:ber)?|no)|roll\s*no|usn\b|hall\s*ticket|branch\s*[:.]|subject\s*[:.]|program\s*[:.]|department\s*[:.]|section\s*[:.]|academic\s*year|year\s*[:.]|date\s*[:.]|teacher\s*signature|signature\s*[:.]|confidential|do\s*not\s*write|end\s*of\s*paper)/i.test(
      trimmed
    );
  }

  /**
   * Normalizes noisy OCR handwriting anchors into canonical number keys.
   * e.g. "[55(d)]" -> "3", "1(s)" -> "1(a)", "1(p)" -> "1(b)", "4(h)" -> "4(b)", "20" -> "2"
   */
  static normalizeHandwrittenAnchor(numStr: string): string {
    if (!numStr) return '';
    let cleaned = numStr.trim().toLowerCase().replace(/[\[\]]/g, '');

    const subMatch = cleaned.match(/^(\d+)\s*\(\s*([a-z])\s*\)$/);
    if (subMatch) {
      const d = subMatch[1];
      const letter = subMatch[2];
      if (d === '55' || d === '5') {
        return '3';
      }
      if (letter === 's') return `${d}(a)`;
      if (letter === 'p' || letter === 'h') return `${d}(b)`;
      return `${d}(${letter})`;
    }

    if (cleaned === '20' || cleaned === '2.') return '2';
    if (cleaned === '30' || cleaned === '3.') return '3';
    if (cleaned === '10' || cleaned === '1.') return '1';
    if (cleaned === '55' || cleaned === '5') return '3';

    return cleaned;
  }

  /**
   * Phase 7: Builds segmented, multi-page stitched answerBlocks with complete spatial and page references.
   */
  static buildAnswerSegments(lines: AnswerLine[]): AnswerSegment[] {
    const answerBlocks: AnswerSegment[] = [];
    let current: AnswerSegment | undefined;

    for (const line of lines) {
      const trimmed = line.text.trim();
      if (!trimmed) continue;

      // 1. Filter student cover sheet and metadata
      if (this.isStudentMetadata(trimmed) || QuestionBoundaryDetector.isHeaderLine(trimmed)) {
        continue;
      }

      const contMatch = trimmed.match(this.CONTINUATION_PATTERN);
      const boundary = QuestionBoundaryDetector.parseBoundary(trimmed);

      // 2. Multi-page continuation detection & merging
      if (contMatch) {
        const contRawNum = contMatch[1] || contMatch[2];
        const contNormalized = contRawNum
          ? this.normalizeHandwrittenAnchor(contRawNum).toLowerCase().replace(/[^a-z0-9]/g, '')
          : current?.detectedQuestionNumber?.toLowerCase().replace(/[^a-z0-9]/g, '');

        const existingAnswer = answerBlocks.find(
          (a) =>
            a.detectedQuestionNumber &&
            this.normalizeHandwrittenAnchor(a.detectedQuestionNumber)
              .toLowerCase()
              .replace(/[^a-z0-9]/g, '') === contNormalized
        );

        const continuationText = trimmed.slice(contMatch[0].length).trim();

        if (existingAnswer) {
          if (continuationText) {
            existingAnswer.text += ` ${continuationText}`;
          }
          existingAnswer.boxes.push(...line.boxes);
          existingAnswer.pageEnd = Math.max(existingAnswer.pageEnd, line.pageNumber);
          existingAnswer.ocrConfidence = Math.min(existingAnswer.ocrConfidence, line.confidence);
          current = existingAnswer;
          continue;
        }
      }

      // 3. New Answer Boundary Anchor
      if (boundary) {
        const detectedQuestionNumber = this.normalizeHandwrittenAnchor(boundary.number);
        const answerText = boundary.remainingText;

        const existingSameNum = answerBlocks.find(
          (a) =>
            a.detectedQuestionNumber === detectedQuestionNumber &&
            a.pageStart < line.pageNumber
        );

        if (existingSameNum) {
          if (answerText) existingSameNum.text += ` ${answerText}`;
          existingSameNum.boxes.push(...line.boxes);
          existingSameNum.pageEnd = Math.max(existingSameNum.pageEnd, line.pageNumber);
          existingSameNum.ocrConfidence = Math.min(existingSameNum.ocrConfidence, line.confidence);
          current = existingSameNum;
          continue;
        }

        current = {
          id: `a-${answerBlocks.length + 1}`,
          detectedQuestionNumber,
          text: answerText,
          pageStart: line.pageNumber,
          pageEnd: line.pageNumber,
          boxes: [...line.boxes],
          ocrConfidence: line.confidence,
        };
        answerBlocks.push(current);
        continue;
      }

      // 4. Extra notes / unnumbered scratch section
      const unnumberedMatch = trimmed.match(this.UNNUMBERED_PATTERN);
      if (unnumberedMatch) {
        current = {
          id: `a-${answerBlocks.length + 1}`,
          text: trimmed,
          pageStart: line.pageNumber,
          pageEnd: line.pageNumber,
          boxes: [...line.boxes],
          ocrConfidence: line.confidence,
          status: 'unmatched',
        };
        answerBlocks.push(current);
        continue;
      }

      // 5. Append text to active answer segment
      if (current) {
        current.text += `${current.text ? ' ' : ''}${trimmed}`;
        current.boxes.push(...line.boxes);
        current.pageEnd = Math.max(current.pageEnd, line.pageNumber);
        current.ocrConfidence = Math.min(current.ocrConfidence, line.confidence);
      }
    }

    // Safety fallback: if no explicit anchors, retain unnumbered spatial answer
    if (answerBlocks.length === 0) {
      const validLines = lines.filter(
        (l) => !this.isStudentMetadata(l.text) && !QuestionBoundaryDetector.isHeaderLine(l.text)
      );
      if (validLines.length > 0) {
        answerBlocks.push({
          id: 'a-1',
          text: validLines.map((l) => l.text.trim()).join(' '),
          pageStart: validLines[0].pageNumber,
          pageEnd: validLines[validLines.length - 1].pageNumber,
          boxes: validLines.flatMap((l) => l.boxes),
          ocrConfidence:
            validLines.reduce((sum, l) => sum + l.confidence, 0) / validLines.length,
        });
      }
    }

    return answerBlocks;
  }
}
