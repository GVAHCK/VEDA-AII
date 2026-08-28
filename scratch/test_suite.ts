import { extractQuestions, extractAnswers, linesFromBlocks } from '../lib/extraction/text';
import { mapAnswers } from '../lib/mapping/engine';
import { gradeAnswer } from '../lib/grading/grade';
import type { OCRBlock, Question, AnswerSegment } from '../lib/types';

console.log('=== VedaAI Comprehensive QA Test Suite ===\n');

// 1. Question Extraction Test
console.log('--- Test 1: Question Extraction (Ordered & Subparts) ---');
const sampleQuestionBlocks: OCRBlock[] = [
  { id: '1', pageNumber: 1, text: '1.', bbox: { x: 10, y: 10, width: 5, height: 2 }, confidence: 0.95 },
  { id: '2', pageNumber: 1, text: 'Explain', bbox: { x: 16, y: 10, width: 10, height: 2 }, confidence: 0.95 },
  { id: '3', pageNumber: 1, text: 'photosynthesis.', bbox: { x: 27, y: 10, width: 15, height: 2 }, confidence: 0.95 },
  { id: '4', pageNumber: 1, text: '[5 marks]', bbox: { x: 43, y: 10, width: 10, height: 2 }, confidence: 0.95 },
  { id: '5', pageNumber: 1, text: '11(a).', bbox: { x: 10, y: 20, width: 8, height: 2 }, confidence: 0.94 },
  { id: '6', pageNumber: 1, text: 'State', bbox: { x: 19, y: 20, width: 8, height: 2 }, confidence: 0.94 },
  { id: '7', pageNumber: 1, text: 'organelle.', bbox: { x: 28, y: 20, width: 12, height: 2 }, confidence: 0.94 },
  { id: '8', pageNumber: 1, text: '[2]', bbox: { x: 41, y: 20, width: 4, height: 2 }, confidence: 0.94 },
  { id: '9', pageNumber: 1, text: '11(b).', bbox: { x: 10, y: 30, width: 8, height: 2 }, confidence: 0.93 },
  { id: '10', pageNumber: 1, text: 'Compare', bbox: { x: 19, y: 30, width: 10, height: 2 }, confidence: 0.93 },
  { id: '11', pageNumber: 1, text: 'cells.', bbox: { x: 30, y: 30, width: 8, height: 2 }, confidence: 0.93 },
  { id: '12', pageNumber: 1, text: '[4]', bbox: { x: 39, y: 30, width: 4, height: 2 }, confidence: 0.93 },
  { id: '13', pageNumber: 1, text: '11(c).', bbox: { x: 10, y: 40, width: 8, height: 2 }, confidence: 0.92 },
  { id: '14', pageNumber: 1, text: 'Define', bbox: { x: 19, y: 40, width: 8, height: 2 }, confidence: 0.92 },
  { id: '15', pageNumber: 1, text: 'osmosis.', bbox: { x: 28, y: 40, width: 10, height: 2 }, confidence: 0.92 },
  { id: '16', pageNumber: 1, text: '[4]', bbox: { x: 39, y: 40, width: 4, height: 2 }, confidence: 0.92 },
];

const extractedQuestions = extractQuestions(sampleQuestionBlocks);
console.log('Extracted Questions Count:', extractedQuestions.length);
extractedQuestions.forEach((q) => {
  console.log(`- Q[${q.number}] (${q.marks} marks): "${q.text}"`);
});

const qTestPassed =
  extractedQuestions.length === 4 &&
  extractedQuestions[0].number === '1' &&
  extractedQuestions[0].marks === 5 &&
  extractedQuestions[1].number === '11(a)' &&
  extractedQuestions[1].marks === 2 &&
  extractedQuestions[2].number === '11(b)' &&
  extractedQuestions[2].marks === 4 &&
  extractedQuestions[3].number === '11(c)' &&
  extractedQuestions[3].marks === 4;

console.log('Test 1 Result:', qTestPassed ? 'PASS' : 'FAIL');

// 2. Answer Extraction (Out of Order, Multi-line, Multi-page)
console.log('\n--- Test 2: Answer Extraction & Out of Order Segmenting ---');
const sampleAnswerBlocks: OCRBlock[] = [
  // Answer 11b first
  { id: 'a1', pageNumber: 1, text: '11b.', bbox: { x: 10, y: 15, width: 6, height: 2 }, confidence: 0.91 },
  { id: 'a2', pageNumber: 1, text: 'Plant cells have cell wall.', bbox: { x: 18, y: 15, width: 40, height: 2 }, confidence: 0.91 },
  // Answer 1 second
  { id: 'a3', pageNumber: 1, text: '1.', bbox: { x: 10, y: 35, width: 4, height: 2 }, confidence: 0.96 },
  { id: 'a4', pageNumber: 1, text: 'Photosynthesis converts light into chemical energy.', bbox: { x: 16, y: 35, width: 60, height: 2 }, confidence: 0.96 },
  // Answer 11a third (on page 2)
  { id: 'a5', pageNumber: 2, text: '11a.', bbox: { x: 10, y: 10, width: 6, height: 2 }, confidence: 0.94 },
  { id: 'a6', pageNumber: 2, text: 'Mitochondrion is the powerhouse.', bbox: { x: 18, y: 10, width: 45, height: 2 }, confidence: 0.94 },
  // Extra unmatched answer
  { id: 'a7', pageNumber: 2, text: 'Extra notes:', bbox: { x: 10, y: 50, width: 12, height: 2 }, confidence: 0.75 },
  { id: 'a8', pageNumber: 2, text: 'A cell has cytoplasm.', bbox: { x: 24, y: 50, width: 30, height: 2 }, confidence: 0.75 },
];

const extractedAnswers = extractAnswers(sampleAnswerBlocks);
console.log('Extracted Answers Count:', extractedAnswers.length);
extractedAnswers.forEach((a) => {
  console.log(`- Ans[detected: ${a.detectedQuestionNumber || 'None'}] (Page ${a.pageStart}-${a.pageEnd}): "${a.text}"`);
});

// 3. Mapping Engine (Out of Order, Unanswered, Unmatched)
console.log('\n--- Test 3: Mapping Engine (Out of Order, Unanswered, Unmatched) ---');
const mappings = mapAnswers(extractedQuestions, extractedAnswers);
mappings.forEach((m) => {
  const q = extractedQuestions.find((x) => x.id === m.questionId);
  const a = extractedAnswers.find((x) => x.id === m.answerId);
  console.log(`- Question [${q?.number}]: ${m.status.toUpperCase()} -> Answer [${a?.detectedQuestionNumber || a?.id || 'NONE'}], Conf: ${(m.confidence * 100).toFixed(0)}%, Reason: "${m.reason}"`);
});

// Verify 11(c) is marked UNANSWERED
const unansCheck = mappings.find((m) => m.questionId === extractedQuestions[3].id);
console.log('Question 11(c) Status:', unansCheck?.status, '(Expected: unanswered)');

// Verify Unmatched detection
const mappedAnswerIds = new Set(mappings.map((m) => m.answerId).filter(Boolean));
const unmatchedAnswers = extractedAnswers.filter((a) => !mappedAnswerIds.has(a.id));
console.log('Unmatched Answers Count:', unmatchedAnswers.length, '(Expected: 1)');
unmatchedAnswers.forEach((u) => console.log(`- Unmatched answer text: "${u.text}"`));

const mappingTestPassed =
  mappings[0].status === 'answered' && // Q1 mapped
  mappings[1].status === 'answered' && // Q11a mapped
  mappings[2].status === 'answered' && // Q11b mapped
  mappings[3].status === 'unanswered' && // Q11c unanswered
  unmatchedAnswers.length === 1;

console.log('Test 3 Result:', mappingTestPassed ? 'PASS' : 'FAIL');

// 4. Grading Fallback Test
console.log('\n--- Test 4: Grading Graceful Fallback ---');
(async () => {
  const gradeForSkipped = await gradeAnswer(extractedQuestions[3], undefined);
  console.log('Grading for Skipped Question:', gradeForSkipped);

  const gradeForAnswered = await gradeAnswer(extractedQuestions[0], extractedAnswers[1]);
  console.log('Grading for Answered Question (No Key):', gradeForAnswered);

  const gradingTestPassed =
    gradeForSkipped.score === 0 &&
    gradeForSkipped.mistakes.includes('No response detected') &&
    gradeForAnswered.score === 0;

  console.log('Test 4 Result:', gradingTestPassed ? 'PASS' : 'FAIL');
  console.log('\n=== ALL QA PIPELINE TESTS COMPLETE ===');
})();
