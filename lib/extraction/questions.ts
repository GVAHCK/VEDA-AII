import type { Question } from '@/lib/types';

export interface QuestionMatch {
  rawMatch: string;
  number: string;
  remainingText: string;
  marks?: number;
}

export class QuestionBoundaryDetector {
  /** Tests if a line is an institutional header, exam metadata, or instruction line */
  static isHeaderLine(text: string): boolean {
    const trimmed = text.trim();
    if (!trimmed) return true;

    // Critical: Explicit question anchors are NEVER headers
    if (/^\s*(?:(?:q(?:uestion)?|ans(?:wer)?|a)\s*[.:-]?)?\s*(?:\[\s*\d+|\(\s*\d+|\d+\s*[.:)\]\-])/i.test(trimmed)) {
      return false;
    }

    // Roman numeral question anchors: I. II. III.
    if (/^\s*(?:q(?:uestion)?\s*[.:-]?)?\s*(?:[IVXLCDM]+\s*[.:)\-])/i.test(trimmed)) {
      return false;
    }

    return /^\s*(?:department(?:\s+of)?|school(?:\s+of)?|college(?:\s+of)?|university|institute(?:\s+of)?|faculty(?:\s+of)?|program(?:me)?|b\.?\s*tech|m\.?\s*tech|b\.?\s*e\.?|b\.?\s*sc|semester|sem\.?|academic\s+year|year\s*:\s*\d{4}|\d{4}\s*[-/]\s*\d{2,4}|section|sec\.?|subject(?:\s+code)?|course(?:\s+code)?|faculty\s+name|date\s*:|time\s*allowed|duration|max(?:imum)?\s*marks|total\s*marks|marks\s*:\s*\d+|instructions?(?:\s+to\s+candidates?)?|note\s*:\s*all\s+questions|all\s+questions\s+are\s+compulsory|page\s*\d+\s*(?:of\s*\d+)?|\d+\s*\/\s*\d+|assignment(?:\s*[-:#]?\s*\d+)?(?:\s*[:|-]\s*[a-zA-Z\s]+)?$|unit\s+test(?:\s*[-:#]?\s*\d+)?|mid(?:\s*term)?(?:\s*[-:#]?\s*\d+)?|final\s+exam)/i.test(
      trimmed
    );
  }

  /** Tests if a line is pure diagram or symbol noise */
  static isNoiseLine(text: string, confidence: number): boolean {
    const trimmed = text.trim();
    if (!trimmed) return true;
    if (confidence < 0.25 && !/^\s*(?:q\d|\d+[.:)])/i.test(trimmed) && (trimmed.match(/[a-z0-9]/gi) || []).length < 4) {
      return true;
    }
    const alphanumericCount = (trimmed.match(/[a-zA-Z0-9]/g) || []).length;
    const symbolCount = (trimmed.match(/[^a-zA-Z0-9\s.,:;()\[\]\-+/*=]/g) || []).length;
    return symbolCount > alphanumericCount && trimmed.length > 3;
  }

  /**
   * Parses and normalizes question number anchors.
   * Supports: Q1, Q2, 1., 1), (1), [1], Ans 1, Ans [1], Ans [55(d)], Question 1, 1(a), 1.a, 1a, 1(i), 2(ii), I., II., etc.
   */
  static parseBoundary(line: string): QuestionMatch | null {
    const trimmed = line.trim();
    if (!trimmed) return null;

    if (this.isNoiseLine(trimmed, 1.0)) {
      return null;
    }

    // 1. Optional Prefix: "Question", "Q.", "Q", "Ans", "Answer", "A", "Q-", "A-"
    const prefixMatch = trimmed.match(/^\s*(?:(?:q(?:uestion)?|ans(?:wer)?|a)\s*[.:-]?)?\s*/i);
    const prefixLen = prefixMatch ? prefixMatch[0].length : 0;
    const rest = trimmed.slice(prefixLen).trim();
    if (!rest) return null;

    // Pattern A: Bracketed / Parenthesized Subpart: [55(d)], [1(a)], (1(a)), 1(a), 1(i), [1(s)]
    const patSubBracket = rest.match(/^(?:\[|\()\s*(\d+)\s*\(\s*([a-z]|[ivx]{1,4})\s*\)\s*(?:\]|\))\s*(?:[.:)\-]|\s+|$)/i);
    if (patSubBracket) {
      const numDigit = patSubBracket[1];
      const rawMatch = trimmed.slice(0, prefixLen + patSubBracket[0].length);
      const num = `${numDigit}(${patSubBracket[2].toLowerCase()})`;
      const remainingText = trimmed.slice(rawMatch.length).trim();
      return { rawMatch, number: num, remainingText };
    }

    // Pattern B: Subpart with parentheses: 1(a), 11(b), 1(i), 2(iv), 1 ( a )
    const patSubParen = rest.match(/^(?:\(\s*)?(\d+)\s*\(\s*([a-z]|[ivx]{1,4})\s*\)\s*(?:[.:)\-]|\s+|$)/i);
    if (patSubParen) {
      const numDigit = patSubParen[1];
      if (numDigit === '0') return null;
      const rawMatch = trimmed.slice(0, prefixLen + patSubParen[0].length);
      const num = `${numDigit}(${patSubParen[2].toLowerCase()})`;
      const remainingText = trimmed.slice(rawMatch.length).trim();
      return { rawMatch, number: num, remainingText };
    }

    // Pattern C: Subpart with dot/dash/colon: 1.a, 1.b, 1-a, 1:a, 1 . a
    const patSubDot = rest.match(/^(\d+)\s*[.:\-]\s*([a-z]|[ivx]{1,4})\s*(?:[.:)\-]|\s+|$)/i);
    if (patSubDot) {
      const numDigit = patSubDot[1];
      if (numDigit === '0') return null;
      const rawMatch = trimmed.slice(0, prefixLen + patSubDot[0].length);
      const num = `${numDigit}(${patSubDot[2].toLowerCase()})`;
      const remainingText = trimmed.slice(rawMatch.length).trim();
      return { rawMatch, number: num, remainingText };
    }

    // Pattern D: Direct subpart letter: 1a., 1b), 2b:
    const patSubDirect = rest.match(/^(\d+)\s*([a-z])\s*(?:[.:)\-]|\s+|$)/i);
    if (patSubDirect) {
      const numDigit = patSubDirect[1];
      if (numDigit === '0') return null;
      const rawMatch = trimmed.slice(0, prefixLen + patSubDirect[0].length);
      const num = `${numDigit}(${patSubDirect[2].toLowerCase()})`;
      const remainingText = trimmed.slice(rawMatch.length).trim();
      return { rawMatch, number: num, remainingText };
    }

    // Pattern E: Bracketed or Parenthesized simple number: [1], (1), [2], (2), [11]
    const patBracketNum = rest.match(/^(?:\[|\()\s*(\d+)\s*(?:\]|\))\s*(?:[.:)\-]|\s+|$)/i);
    if (patBracketNum) {
      const numDigit = patBracketNum[1];
      if (numDigit === '0') return null;
      const rawMatch = trimmed.slice(0, prefixLen + patBracketNum[0].length);
      const remainingText = trimmed.slice(rawMatch.length).trim();
      return { rawMatch, number: numDigit, remainingText };
    }

    // Pattern F: Simple number with trailing delimiter: 1., 1), 1:, 1-, 1 ., 1 )
    const hasExplicitPrefix = prefixLen > 0 && /q|question|ans|a/i.test(prefixMatch?.[0] || '');
    const patDelimitedNum = rest.match(/^(\d+)\s*(?:[.:)\-]|\s+)/i);
    if (patDelimitedNum) {
      const numDigit = patDelimitedNum[1];
      if (numDigit === '0') return null;
      const rawMatch = trimmed.slice(0, prefixLen + patDelimitedNum[0].length);
      const remainingText = trimmed.slice(rawMatch.length).trim();
      // Require delimiter if no explicit Q/Question/Ans prefix
      if (!hasExplicitPrefix && !/^[.:)\-]/.test(rest.slice(numDigit.length).trimStart())) {
        return null;
      }
      return { rawMatch, number: numDigit, remainingText };
    }

    // Pattern G: Standalone number on a line by itself: "1.", "2.", "3.", "1"
    const patStandalone = rest.match(/^(\d+)\s*[.:\-]?\s*$/i);
    if (patStandalone) {
      const numDigit = patStandalone[1];
      if (numDigit !== '0') {
        return { rawMatch: trimmed, number: numDigit, remainingText: '' };
      }
    }

    // Pattern H: Explicit prefix without delimiter: "Q1 Analyze...", "Question 2 What is..."
    if (hasExplicitPrefix) {
      const patPrefixOnly = rest.match(/^(\d+)(?:\s+|$)/i);
      if (patPrefixOnly) {
        const numDigit = patPrefixOnly[1];
        if (numDigit === '0') return null;
        const rawMatch = trimmed.slice(0, prefixLen + patPrefixOnly[0].length);
        const remainingText = trimmed.slice(rawMatch.length).trim();
        return { rawMatch, number: numDigit, remainingText };
      }
    }

    // Pattern I: Roman numerals: I., II., III., IV., V.
    const patRoman = rest.match(/^([IVXLCDM]+)\s*[.:)\-]\s*/i);
    if (patRoman) {
      const roman = patRoman[1].toUpperCase();
      const rawMatch = trimmed.slice(0, prefixLen + patRoman[0].length);
      const remainingText = trimmed.slice(rawMatch.length).trim();
      return { rawMatch, number: roman, remainingText };
    }

    return null;
  }

  /**
   * Phase 6: Extracts and structures all questions with guaranteed boundary isolation and deduplication.
   */
  static extractQuestions(lines: Array<{ text: string; confidence: number; pageNumber: number }>): Question[] {
    const rawQuestions: Question[] = [];
    let current: Question | undefined;

    for (const line of lines) {
      const trimmed = line.text.trim();
      if (!trimmed) continue;

      const matched = this.parseBoundary(trimmed);
      if (matched) {
        current = {
          id: `q-${rawQuestions.length + 1}`,
          number: matched.number,
          text: matched.remainingText,
        };
        rawQuestions.push(current);
        continue;
      }

      if (this.isHeaderLine(trimmed) || this.isNoiseLine(trimmed, line.confidence)) {
        continue;
      }

      if (current) {
        current.text += `${current.text ? ' ' : ''}${trimmed}`;
      }
    }

    const finalized = rawQuestions
      .map((q) => {
        let marks: number | undefined;
        const cleaned = q.text
          .replace(/(?:\[|\()\s*(\d+)\s*(?:marks?|pts?|points?)?\s*(?:\]|\))/gi, (_m, val) => {
            if (marks === undefined) marks = Number(val);
            return '';
          })
          .replace(/\s{2,}/g, ' ')
          .trim();

        return {
          ...q,
          marks: marks || 10,
          text: cleaned || q.text,
        };
      })
      .filter((q) => q.text.length > 0 && q.number.length > 0);

    const deduplicated: Question[] = [];
    const seen = new Map<string, Question>();
    for (const q of finalized) {
      const key = q.number.toLowerCase().replace(/[^a-z0-9]/g, '');
      const existing = seen.get(key);
      if (!existing) {
        seen.set(key, q);
        deduplicated.push(q);
      } else {
        const inc = q.text.toLowerCase();
        const cur = existing.text.toLowerCase();
        if (!cur.includes(inc) && !inc.includes(cur)) {
          existing.text = `${existing.text} ${q.text}`.trim();
        }
      }
    }

    return deduplicated;
  }
}
