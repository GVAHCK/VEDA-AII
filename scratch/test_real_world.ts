import { extractQuestions, extractAnswers, isGarbageLine, normalizeNumber } from '../lib/extraction/text';
import { mapAnswers, computeSemanticSimilarity, MIN_SEMANTIC_THRESHOLD } from '../lib/mapping/engine';
import type { OCRBlock, Question, AnswerSegment } from '../lib/types';

console.log('=================================================================');
console.log(' VedaAI Real-World OCR, Extraction & Mapping Validation Suite');
console.log('=================================================================\n');

let passedTests = 0;
let totalTests = 0;

function check(condition: boolean, title: string, failureDetails?: string) {
  totalTests += 1;
  if (condition) {
    console.log(`[PASS] ${title}`);
    passedTests += 1;
  } else {
    console.error(`[FAIL] ${title}${failureDetails ? ` -> ${failureDetails}` : ''}`);
  }
}

// =========================================================================
// 1. NEURAL NETWORK SAMPLE TEST (Raw OCR -> Question & Answer Extraction)
// =========================================================================
console.log('--- TEST 1: Neural Networks Examination Sample ---');
const nnQuestionBlocks: OCRBlock[] = [
  // Page header noise
  { id: 'h1', pageNumber: 1, text: 'CENTRAL UNIVERSITY EXAMINATIONS - 2026', bbox: { x: 10, y: 3, width: 80, height: 2 }, confidence: 0.98 },
  { id: 'h2', pageNumber: 1, text: 'Time Allowed: 3 Hours | Total Marks: 100', bbox: { x: 10, y: 6, width: 80, height: 2 }, confidence: 0.97 },
  // Q1
  { id: 'q1_1', pageNumber: 1, text: '1.', bbox: { x: 5, y: 12, width: 4, height: 2 }, confidence: 0.96 },
  { id: 'q1_2', pageNumber: 1, text: 'Explain the function of Hidden Layers and ReLU activation function in Multi-Layer Perceptrons.', bbox: { x: 10, y: 12, width: 85, height: 4 }, confidence: 0.94 },
  { id: 'q1_3', pageNumber: 1, text: '[5 marks]', bbox: { x: 90, y: 12, width: 8, height: 2 }, confidence: 0.95 },
  // Q2(a)
  { id: 'q2a_1', pageNumber: 1, text: '2(a).', bbox: { x: 5, y: 22, width: 6, height: 2 }, confidence: 0.95 },
  { id: 'q2a_2', pageNumber: 1, text: 'Derive the gradient of Binary Cross-Entropy loss with respect to Sigmoid output.', bbox: { x: 12, y: 22, width: 80, height: 4 }, confidence: 0.93 },
  { id: 'q2a_3', pageNumber: 1, text: '[4]', bbox: { x: 90, y: 22, width: 4, height: 2 }, confidence: 0.96 },
  // Q2(b)
  { id: 'q2b_1', pageNumber: 1, text: '2(b).', bbox: { x: 5, y: 32, width: 6, height: 2 }, confidence: 0.95 },
  { id: 'q2b_2', pageNumber: 1, text: 'Compare Adam optimizer and Stochastic Gradient Descent with momentum.', bbox: { x: 12, y: 32, width: 80, height: 4 }, confidence: 0.94 },
  { id: 'q2b_3', pageNumber: 1, text: '[3]', bbox: { x: 90, y: 32, width: 4, height: 2 }, confidence: 0.96 },
  // Footer noise
  { id: 'f1', pageNumber: 1, text: 'Page 1 of 2 - CONFIDENTIAL', bbox: { x: 10, y: 95, width: 80, height: 2 }, confidence: 0.98 },
];

const nnAnswerBlocks: OCRBlock[] = [
  // Student answer sheet header
  { id: 'ah1', pageNumber: 1, text: 'Student Name: Alex Rivera | Roll No: CS-2024-88', bbox: { x: 10, y: 4, width: 80, height: 2 }, confidence: 0.98 },
  // Ans 1
  { id: 'a1_1', pageNumber: 1, text: '1.', bbox: { x: 5, y: 15, width: 4, height: 2 }, confidence: 0.96 },
  { id: 'a1_2', pageNumber: 1, text: 'Hidden layers extract hierarchical feature representations. ReLU computes f(x) = max(0, x) preventing vanishing gradients in deep networks.', bbox: { x: 10, y: 15, width: 85, height: 8 }, confidence: 0.95 },
  // Ans 2(b) answered before 2(a) (Out of order)
  { id: 'a2b_1', pageNumber: 1, text: '2b.', bbox: { x: 5, y: 35, width: 5, height: 2 }, confidence: 0.94 },
  { id: 'a2b_2', pageNumber: 1, text: 'Adam computes adaptive learning rates using first and second moments of gradients, whereas SGD with momentum uses exponential moving average of velocity.', bbox: { x: 11, y: 35, width: 85, height: 8 }, confidence: 0.93 },
  // Page 2: Continuation of 2(b) + Ans 2(a)
  { id: 'a2b_3', pageNumber: 2, text: 'Continuation 2b: Adam converges faster in non-convex loss landscapes.', bbox: { x: 10, y: 10, width: 85, height: 4 }, confidence: 0.92 },
  { id: 'a2a_1', pageNumber: 2, text: '2a.', bbox: { x: 5, y: 25, width: 5, height: 2 }, confidence: 0.95 },
  { id: 'a2a_2', pageNumber: 2, text: 'The derivative of binary cross-entropy with sigmoid activation simplifies to y_hat - y.', bbox: { x: 11, y: 25, width: 85, height: 6 }, confidence: 0.94 },
  // Extra scratch calculations
  { id: 'ax_1', pageNumber: 2, text: 'Rough calculations: learning_rate = 0.001, beta1 = 0.9, beta2 = 0.999', bbox: { x: 10, y: 60, width: 85, height: 4 }, confidence: 0.85 },
];

const nnExtractedQuestions = extractQuestions(nnQuestionBlocks);
const nnExtractedAnswers = extractAnswers(nnAnswerBlocks);
const nnMappings = mapAnswers(nnExtractedQuestions, nnExtractedAnswers);

check(nnExtractedQuestions.length === 3, 'Neural Networks Question Count is Exactly 3');
check(nnExtractedQuestions[0].number === '1' && nnExtractedQuestions[0].marks === 5, 'Neural Networks Q1 Marks = 5');
check(nnExtractedQuestions[1].number === '2(a)' && nnExtractedQuestions[1].marks === 4, 'Neural Networks Q2(a) Marks = 4');
check(nnExtractedQuestions[2].number === '2(b)' && nnExtractedQuestions[2].marks === 3, 'Neural Networks Q2(b) Marks = 3');

check(nnExtractedAnswers.length === 4, 'Neural Networks Answers Count is 4 (Q1, Q2b multi-page, Q2a, Rough calculations)');
const nnQ2bAnswer = nnExtractedAnswers.find((a) => a.detectedQuestionNumber === '2(b)');
check(nnQ2bAnswer?.pageStart === 1 && nnQ2bAnswer?.pageEnd === 2, 'Neural Networks Q2(b) merged across Page 1 and Page 2');
check(Boolean(nnQ2bAnswer?.text.includes('Adam converges faster in non-convex')), 'Neural Networks Q2(b) text contains continuation content');

check(nnMappings.length === 3 && nnMappings.every((m) => m.status === 'answered'), 'Neural Networks All 3 Questions Mapped');
check(nnMappings[0].confidence >= 0.95, 'Neural Networks Q1 High Confidence');

// Unmatched count
const nnMappedAnswerIds = new Set(nnMappings.map((m) => m.answerId));
const nnUnmatched = nnExtractedAnswers.filter((a) => !nnMappedAnswerIds.has(a.id));
check(nnUnmatched.length === 1 && nnUnmatched[0].text.includes('learning_rate = 0.001'), 'Neural Networks Rough calculations detected as Unmatched');

// =========================================================================
// 2. CROSS-DOCUMENT ISOLATION TEST (Zero Cross-Contamination)
// =========================================================================
console.log('\n--- TEST 2: Cross-Document Semantic Isolation ---');
// When Neural Network questions are compared against Biology answers (Photosynthesis, Xylem, Chloroplasts)
const bioAnswersForIsolation: AnswerSegment[] = [
  { id: 'b1', detectedQuestionNumber: '1', text: 'Photosynthesis uses chlorophyll to convert light and carbon dioxide into glucose.', pageStart: 1, pageEnd: 1, boxes: [], ocrConfidence: 0.95 },
  { id: 'b2', detectedQuestionNumber: '2', text: 'Transpiration pulls water up through xylem tubes in vascular plants.', pageStart: 1, pageEnd: 1, boxes: [], ocrConfidence: 0.94 },
];

const isolationSimQ1 = computeSemanticSimilarity(nnExtractedQuestions[0].text, bioAnswersForIsolation[0].text);
const isolationSimQ2 = computeSemanticSimilarity(nnExtractedQuestions[1].text, bioAnswersForIsolation[1].text);

console.log(`Cross-Topic Cosine Similarity Q1(Neural) vs Ans1(Biology): ${isolationSimQ1.toFixed(3)} (Threshold: ${MIN_SEMANTIC_THRESHOLD})`);
console.log(`Cross-Topic Cosine Similarity Q2(Neural) vs Ans2(Biology): ${isolationSimQ2.toFixed(3)} (Threshold: ${MIN_SEMANTIC_THRESHOLD})`);

check(isolationSimQ1 < MIN_SEMANTIC_THRESHOLD, 'Neural Network Q1 has below-threshold similarity to Biology Answer');
check(isolationSimQ2 < MIN_SEMANTIC_THRESHOLD, 'Neural Network Q2 has below-threshold similarity to Biology Answer');

// =========================================================================
// 3. LOW-QUALITY SCAN & NOISE SANITATION TEST
// =========================================================================
console.log('\n--- TEST 3: Low-Quality Scan & Noise Sanitation ---');
const lowQualityBlocks: OCRBlock[] = [
  { id: 'l1', pageNumber: 1, text: '~~~ ||||| === ####', bbox: { x: 5, y: 2, width: 20, height: 2 }, confidence: 0.15 },
  { id: 'l2', pageNumber: 1, text: 'Page 1 of 1', bbox: { x: 10, y: 5, width: 30, height: 2 }, confidence: 0.99 },
  { id: 'l3', pageNumber: 1, text: '1.', bbox: { x: 5, y: 15, width: 4, height: 2 }, confidence: 0.95 },
  { id: 'l4', pageNumber: 1, text: 'State the law of conservation of energy. [2 marks]', bbox: { x: 10, y: 15, width: 70, height: 4 }, confidence: 0.92 },
  { id: 'l5', pageNumber: 1, text: '..::;;;;___--^^^', bbox: { x: 5, y: 30, width: 30, height: 2 }, confidence: 0.20 },
  { id: 'l6', pageNumber: 1, text: '2.', bbox: { x: 5, y: 40, width: 4, height: 2 }, confidence: 0.96 },
  { id: 'l7', pageNumber: 1, text: 'Define momentum and state its SI unit. [3]', bbox: { x: 10, y: 40, width: 65, height: 4 }, confidence: 0.94 },
  { id: 'l8', pageNumber: 1, text: 'Do not write in this space', bbox: { x: 10, y: 90, width: 50, height: 2 }, confidence: 0.98 },
];

const cleanedQuestions = extractQuestions(lowQualityBlocks);
check(cleanedQuestions.length === 2, 'Low-Quality Scan Filtered down to exactly 2 Genuine Questions', `Got ${cleanedQuestions.length}`);
check(cleanedQuestions[0].text.includes('law of conservation of energy'), 'Cleaned Question 1 text is pristine');
check(cleanedQuestions[1].text.includes('Define momentum and state its SI unit'), 'Cleaned Question 2 text is pristine');

// =========================================================================
// 4. MIXED UNORDERED & SKIPPED COMPOSITE TEST
// =========================================================================
console.log('\n--- TEST 4: Mixed Subject & Unordered Composite Test ---');
const mixedQBlocks: OCRBlock[] = [
  { id: 'mq1', pageNumber: 1, text: '1. What is an enzyme? [3]', bbox: { x: 10, y: 10, width: 80, height: 4 }, confidence: 0.95 },
  { id: 'mq2', pageNumber: 1, text: '2. Name two factors affecting enzyme activity. [2]', bbox: { x: 10, y: 20, width: 80, height: 4 }, confidence: 0.95 },
  { id: 'mq3', pageNumber: 1, text: '3. Describe lock and key hypothesis. [5]', bbox: { x: 10, y: 30, width: 80, height: 4 }, confidence: 0.95 },
];

const mixedABlocks: OCRBlock[] = [
  // Q3 answered first
  { id: 'ma3', pageNumber: 1, text: 'Q3. The lock and key hypothesis states the active site is complementary to substrate shape.', bbox: { x: 10, y: 10, width: 80, height: 6 }, confidence: 0.95 },
  // Q1 answered second
  { id: 'ma1', pageNumber: 1, text: 'Q1. Enzymes are biological catalysts that accelerate chemical reactions without being consumed.', bbox: { x: 10, y: 25, width: 80, height: 6 }, confidence: 0.96 },
  // Q2 is completely skipped
  // Extra notes added
  { id: 'max', pageNumber: 1, text: 'Extra: Optimal human body temperature for enzymes is 37C.', bbox: { x: 10, y: 45, width: 80, height: 4 }, confidence: 0.91 },
];

const mixedQ = extractQuestions(mixedQBlocks);
const mixedA = extractAnswers(mixedABlocks);
const mixedMap = mapAnswers(mixedQ, mixedA);

check(mixedMap[0].status === 'answered' && mixedMap[0].answerId === mixedA[1].id, 'Composite Test: Q1 mapped to second answer');
check(mixedMap[1].status === 'unanswered' && mixedMap[1].confidence === 0, 'Composite Test: Q2 correctly marked Unanswered');
check(mixedMap[2].status === 'answered' && mixedMap[2].answerId === mixedA[0].id, 'Composite Test: Q3 mapped to first answer');

const mixedUnmatched = mixedA.filter((a) => !mixedMap.some((m) => m.answerId === a.id));
check(mixedUnmatched.length === 1 && mixedUnmatched[0].text.includes('Optimal human body temperature'), 'Composite Test: Extra temperature notes marked as Unmatched');

console.log('\n=================================================================');
console.log(`REAL-WORLD QA TEST SUITE: ${passedTests}/${totalTests} TESTS PASSED (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
console.log('=================================================================');
