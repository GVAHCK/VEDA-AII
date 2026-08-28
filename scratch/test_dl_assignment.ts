import { extractQuestions, validateQuestionSequence, linesFromBlocks } from '../lib/extraction/text';
import type { OCRBlock } from '../lib/types';

console.log('=================================================================');
console.log(' VedaAI Deep Learning Assignment (DL_Assignment-1) Extraction Test');
console.log('=================================================================\n');

// Simulated raw OCR blocks from DL_Assignment-1.pdf
const dlAssignmentBlocks: OCRBlock[] = [
  // Page 1 Header
  { id: 'h1', pageNumber: 1, lineIndex: 0, text: 'Department of Computer Science - Deep Learning Assignment 1', bbox: { x: 10, y: 5, width: 80, height: 2 }, confidence: 0.98 },
  { id: 'h2', pageNumber: 1, lineIndex: 1, text: 'Course: CS-701 | Max Marks: 25 | Due Date: Sept 15', bbox: { x: 10, y: 8, width: 80, height: 2 }, confidence: 0.97 },

  // Question 1
  { id: 'q1_l0', pageNumber: 1, lineIndex: 2, text: '1.', bbox: { x: 5, y: 14, width: 3, height: 2 }, confidence: 0.96 },
  { id: 'q1_l1', pageNumber: 1, lineIndex: 2, text: 'What is the vanishing gradient problem in deep feedforward neural networks? [5 marks]', bbox: { x: 9, y: 14, width: 85, height: 3 }, confidence: 0.95 },
  { id: 'q1_body', pageNumber: 1, lineIndex: 3, text: 'Explain how the choice of activation function (e.g., Sigmoid vs ReLU) affects the gradient flow during backpropagation.', bbox: { x: 9, y: 18, width: 85, height: 4 }, confidence: 0.94 },

  // Question 2
  { id: 'q2_l0', pageNumber: 1, lineIndex: 4, text: '2.', bbox: { x: 5, y: 26, width: 3, height: 2 }, confidence: 0.96 },
  { id: 'q2_l1', pageNumber: 1, lineIndex: 4, text: 'Derive the backpropagation gradient equations for a 2-layer MLP with Cross-Entropy loss. [10 marks]', bbox: { x: 9, y: 26, width: 85, height: 3 }, confidence: 0.95 },
  { id: 'q2_body', pageNumber: 1, lineIndex: 5, text: 'Include explicit derivations for dL/dW1, dL/db1, dL/dW2, and dL/db2 using matrix calculus.', bbox: { x: 9, y: 30, width: 85, height: 4 }, confidence: 0.93 },

  // Question 3
  { id: 'q3_l0', pageNumber: 1, lineIndex: 6, text: '3.', bbox: { x: 5, y: 38, width: 3, height: 2 }, confidence: 0.96 },
  { id: 'q3_l1', pageNumber: 1, lineIndex: 6, text: 'Compare and contrast Batch Gradient Descent, Mini-Batch SGD, and Adam optimization algorithms. [10 marks]', bbox: { x: 9, y: 38, width: 85, height: 3 }, confidence: 0.94 },
  { id: 'q3_body', pageNumber: 1, lineIndex: 7, text: 'Discuss convergence rate, memory complexity, and ability to escape saddle points.', bbox: { x: 9, y: 42, width: 85, height: 4 }, confidence: 0.93 },

  // Page 1 Footer
  { id: 'f1', pageNumber: 1, lineIndex: 8, text: 'Page 1 of 1 - End of Question Paper', bbox: { x: 10, y: 92, width: 80, height: 2 }, confidence: 0.98 },
];

console.log('--- STEP 1: RAW OCR LINES ---');
const rawLines = linesFromBlocks(dlAssignmentBlocks);

console.log('\n--- STEP 2: EXTRACTED QUESTIONS ---');
const extractedQuestions = extractQuestions(dlAssignmentBlocks);

console.log('\n--- STEP 3: VALIDATION AUDIT ---');
const audit = validateQuestionSequence(extractedQuestions);

console.log('\n--- VERIFICATION CHECKS ---');
let allOk = true;
function test(cond: boolean, desc: string) {
  if (cond) {
    console.log(`[PASS] ${desc}`);
  } else {
    console.error(`[FAIL] ${desc}`);
    allOk = false;
  }
}

test(extractedQuestions.length === 3, `Extracted count is 3 (got ${extractedQuestions.length})`);
test(extractedQuestions[0].number === '1', `Question 1 number is "1" (got "${extractedQuestions[0]?.number}")`);
test(extractedQuestions[1].number === '2', `Question 2 number is "2" (got "${extractedQuestions[1]?.number}")`);
test(extractedQuestions[2].number === '3', `Question 3 number is "3" (got "${extractedQuestions[2]?.number}")`);

test(extractedQuestions[0].marks === 5, 'Question 1 marks parsed as 5');
test(extractedQuestions[1].marks === 10, 'Question 2 marks parsed as 10');
test(extractedQuestions[2].marks === 10, 'Question 3 marks parsed as 10');

test(audit.duplicates.length === 0, 'No duplicate question numbers');
test(audit.missing.length === 0, 'No missing question gaps');
test(audit.isSequenceValid, 'Question sequence is fully valid');

console.log('\n=================================================================');
console.log(`RESULT: ${allOk ? 'DL ASSIGNMENT 1 EXTRACTION VERIFIED SUCCESSFULLY' : 'TESTS FAILED'}`);
console.log('=================================================================');
