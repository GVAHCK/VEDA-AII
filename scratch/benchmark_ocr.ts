import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { characterErrorRate, wordErrorRate } from '../lib/ocr/metrics';

type Candidate = { name: string; text?: string; status: 'measured' | 'unavailable' };
const reference = process.env.OCR_BENCHMARK_REFERENCE || (existsSync('fixtures/ocr-reference.txt') ? readFileSync('fixtures/ocr-reference.txt', 'utf8') : '');
const candidates: Candidate[] = [
  { name: 'Raw Tesseract', text: process.env.OCR_RAW_TESSERACT, status: process.env.OCR_RAW_TESSERACT ? 'measured' : 'unavailable' },
  { name: 'Enhanced Tesseract', text: process.env.OCR_ENHANCED_TESSERACT, status: process.env.OCR_ENHANCED_TESSERACT ? 'measured' : 'unavailable' },
  { name: 'TrOCR', text: process.env.OCR_TROCR, status: process.env.OCR_TROCR ? 'measured' : 'unavailable' },
  { name: 'Donut', text: process.env.OCR_DONUT, status: process.env.OCR_DONUT ? 'measured' : 'unavailable' },
  { name: 'Hybrid output', text: process.env.OCR_HYBRID, status: process.env.OCR_HYBRID ? 'measured' : 'unavailable' },
];
const report = { generatedAt: new Date().toISOString(), referenceAvailable: Boolean(reference), candidates: candidates.map((candidate) => ({ ...candidate, wer: reference && candidate.text ? Number(wordErrorRate(reference, candidate.text).toFixed(4)) : null, cer: reference && candidate.text ? Number(characterErrorRate(reference, candidate.text).toFixed(4)) : null })) };
writeFileSync('ocr-benchmark.json', `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
