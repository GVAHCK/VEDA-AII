import { extractQuestions, extractAnswers, normalizeNumber } from '../lib/extraction/text';
import { mapAnswers, computeSemanticSimilarity, MIN_SEMANTIC_THRESHOLD } from '../lib/mapping/engine';
import type { OCRBlock, Question, AnswerSegment } from '../lib/types';

console.log('====================================================');
console.log(' VedaAI Comprehensive Accuracy & Fixture Validation');
console.log('====================================================\n');

let allPassed = true;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
  } else {
    console.error(`[FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
    allPassed = false;
  }
}

// ---------------------------------------------------------
// FIXTURE A: Standard Biology In-Order Test
// ---------------------------------------------------------
console.log('--- FIXTURE A: Standard Biology In-Order Test ---');
const fixtureA_Q_Blocks: OCRBlock[] = [
  { id: 'q1', pageNumber: 1, text: '1. Explain the process of photosynthesis. [5 marks]', bbox: { x: 10, y: 10, width: 80, height: 4 }, confidence: 0.95 },
  { id: 'q2', pageNumber: 1, text: '2. Describe transpiration in plants. [4]', bbox: { x: 10, y: 20, width: 80, height: 4 }, confidence: 0.94 },
  { id: 'q3', pageNumber: 1, text: '3. Outline cohesion-tension theory. [5]', bbox: { x: 10, y: 30, width: 80, height: 4 }, confidence: 0.96 },
];

const fixtureA_A_Blocks: OCRBlock[] = [
  { id: 'a1', pageNumber: 1, text: '1. Photosynthesis converts light energy into chemical energy using chlorophyll and CO2.', bbox: { x: 10, y: 10, width: 80, height: 8 }, confidence: 0.95 },
  { id: 'a2', pageNumber: 1, text: '2. Transpiration is the loss of water vapour from stomata in leaves.', bbox: { x: 10, y: 25, width: 80, height: 8 }, confidence: 0.93 },
  { id: 'a3', pageNumber: 1, text: '3. Cohesion-tension theory explains water movement up xylem vessels via hydrogen bonding.', bbox: { x: 10, y: 40, width: 80, height: 8 }, confidence: 0.96 },
];

const qA = extractQuestions(fixtureA_Q_Blocks);
const aA = extractAnswers(fixtureA_A_Blocks);
const mapA = mapAnswers(qA, aA);

assert(qA.length === 3, 'Fixture A Question Count', `Expected 3, got ${qA.length}`);
assert(qA[0].marks === 5 && qA[1].marks === 4 && qA[2].marks === 5, 'Fixture A Marks Extraction');
assert(mapA.length === 3 && mapA.every((m) => m.status === 'answered'), 'Fixture A 100% Mapping Success');
assert(mapA[0].confidence >= 0.95 && mapA[1].confidence >= 0.95 && mapA[2].confidence >= 0.95, 'Fixture A High Confidence Generation');

// ---------------------------------------------------------
// FIXTURE B: Skipped Question Test (Q2 Unanswered)
// ---------------------------------------------------------
console.log('\n--- FIXTURE B: Skipped Question Test ---');
const fixtureB_A_Blocks: OCRBlock[] = [
  { id: 'a1', pageNumber: 1, text: '1. Photosynthesis converts sunlight and CO2 into glucose.', bbox: { x: 10, y: 10, width: 80, height: 8 }, confidence: 0.95 },
  // Q2 is completely skipped by student
  { id: 'a3', pageNumber: 1, text: '3. Cohesion-tension pulls water through the xylem.', bbox: { x: 10, y: 30, width: 80, height: 8 }, confidence: 0.94 },
];

const aB = extractAnswers(fixtureB_A_Blocks);
const mapB = mapAnswers(qA, aB);

assert(mapB[0].status === 'answered' && mapB[0].answerId === aB[0].id, 'Fixture B Q1 Answered');
assert(mapB[1].status === 'unanswered' && mapB[1].confidence === 0, 'Fixture B Q2 Correctly Unanswered');
assert(mapB[2].status === 'answered' && mapB[2].answerId === aB[1].id, 'Fixture B Q3 Answered');

// ---------------------------------------------------------
// FIXTURE C: Extra Notes & Unmatched Segment Test
// ---------------------------------------------------------
console.log('\n--- FIXTURE C: Extra Notes & Unmatched Detection ---');
const fixtureC_A_Blocks: OCRBlock[] = [
  { id: 'a1', pageNumber: 1, text: '1. Photosynthesis converts light energy into chemical energy.', bbox: { x: 10, y: 10, width: 80, height: 8 }, confidence: 0.95 },
  { id: 'a2', pageNumber: 1, text: 'Extra notes: Mitochondria are also involved in ATP synthesis during cellular respiration.', bbox: { x: 10, y: 30, width: 80, height: 8 }, confidence: 0.88 },
  { id: 'a3', pageNumber: 1, text: 'Rough work: 6CO2 + 6H2O -> C6H12O6 + 6O2 delta G calculations', bbox: { x: 10, y: 50, width: 80, height: 8 }, confidence: 0.75 },
];

const aC = extractAnswers(fixtureC_A_Blocks);
const mapC = mapAnswers(qA, aC);

const mappedC_Ids = new Set(mapC.map((m) => m.answerId).filter(Boolean));
const unmatchedC = aC.filter((a) => !mappedC_Ids.has(a.id));

assert(aC.length === 3, 'Fixture C Answer Segments Count (Q1 + Extra notes + Rough work)', `Expected 3, got ${aC.length}`);
assert(mapC[0].status === 'answered', 'Fixture C Q1 Mapped');
assert(unmatchedC.length === 2, 'Fixture C Exactly 2 Unmatched Segments Detected', `Got ${unmatchedC.length}`);
assert(mapC[1].status === 'unanswered' && mapC[2].status === 'unanswered', 'Fixture C Q2 & Q3 Remain Unanswered without false consumption');

// ---------------------------------------------------------
// FIXTURE D: Out-of-Order Answers Test (Q3, Q1, Q2)
// ---------------------------------------------------------
console.log('\n--- FIXTURE D: Out-of-Order Answers Test ---');
const fixtureD_A_Blocks: OCRBlock[] = [
  { id: 'ad3', pageNumber: 1, text: 'Q3. Cohesion-tension theory explains xylem sap ascent.', bbox: { x: 10, y: 10, width: 80, height: 8 }, confidence: 0.96 },
  { id: 'ad1', pageNumber: 1, text: 'Q1. Photosynthesis occurs in chloroplasts generating glucose.', bbox: { x: 10, y: 30, width: 80, height: 8 }, confidence: 0.95 },
  { id: 'ad2', pageNumber: 1, text: 'Q2. Transpiration is water evaporation from stomata.', bbox: { x: 10, y: 50, width: 80, height: 8 }, confidence: 0.94 },
];

const aD = extractAnswers(fixtureD_A_Blocks);
const mapD = mapAnswers(qA, aD);

assert(mapD[0].answerId === aD[1].id, 'Fixture D Q1 Maps to Second Answer (Q1)');
assert(mapD[1].answerId === aD[2].id, 'Fixture D Q2 Maps to Third Answer (Q2)');
assert(mapD[2].answerId === aD[0].id, 'Fixture D Q3 Maps to First Answer (Q3)');
assert(mapD.every((m) => m.status === 'answered'), 'Fixture D All Out-of-Order Answers Correctly Mapped');

// ---------------------------------------------------------
// FIXTURE E: Multi-Page Answer Continuation Test
// ---------------------------------------------------------
console.log('\n--- FIXTURE E: Multi-Page Answer Continuation Test ---');
const fixtureE_A_Blocks: OCRBlock[] = [
  { id: 'ae1', pageNumber: 1, text: '1. Photosynthesis is the light-driven synthesis of organic molecules.', bbox: { x: 10, y: 10, width: 80, height: 8 }, confidence: 0.95 },
  { id: 'ae2', pageNumber: 1, text: '3. Cohesion-tension theory begins with water uptake at roots.', bbox: { x: 10, y: 40, width: 80, height: 8 }, confidence: 0.94 },
  // Page 2 continuation of Question 3
  { id: 'ae3', pageNumber: 2, text: 'Continuation Q3: Transpiration pull generates negative pressure pulling xylem sap upward to leaves.', bbox: { x: 10, y: 10, width: 80, height: 8 }, confidence: 0.92 },
];

const aE = extractAnswers(fixtureE_A_Blocks);
const mapE = mapAnswers(qA, aE);

assert(aE.length === 2, 'Fixture E Combined into 2 Answers (Q1 and Q3 multi-page)', `Expected 2, got ${aE.length}`);
const q3Answer = aE.find((a) => a.detectedQuestionNumber === '3');
assert(q3Answer !== undefined && q3Answer.pageStart === 1 && q3Answer.pageEnd === 2, 'Fixture E Multi-page Answer spans Page 1 to Page 2');
assert(Boolean(q3Answer?.text.includes('negative pressure pulling xylem sap')), 'Fixture E Continuation Text Merged Seamlessly');
assert(Boolean(mapE.find((m) => m.questionId === qA[2].id)?.status === 'answered'), 'Fixture E Q3 Mapping Success with Multi-Page Boxes');

// ---------------------------------------------------------
// FIXTURE F: Cross-Topic Semantic Negative Test
// (Neural Network Question vs Biology Answer Sheet)
// ---------------------------------------------------------
console.log('\n--- FIXTURE F: Cross-Topic Semantic Negative Match Test ---');
const fixtureF_Neural_Questions: Question[] = [
  { id: 'qn1', number: '1', text: 'Explain the role of hidden layer and ReLU activation in deep convolutional networks.', marks: 5 },
  { id: 'qn2', number: '2', text: 'How does backpropagation compute gradient descent in recurrent neural networks?', marks: 5 },
];

const mapF = mapAnswers(fixtureF_Neural_Questions, aA);
console.log('Neural Network Q1 ↔ Biology Answer 1 Similarity:', computeSemanticSimilarity(fixtureF_Neural_Questions[0].text, aA[0].text).toFixed(3));
console.log('Neural Network Q2 ↔ Biology Answer 2 Similarity:', computeSemanticSimilarity(fixtureF_Neural_Questions[1].text, aA[1].text).toFixed(3));

// If student unnumbered answers are from a completely different topic:
const unnumberedBiologyAnswer: AnswerSegment[] = [
  { id: 'u1', text: 'Photosynthesis uses chlorophyll to absorb blue and red photons and synthesize sugars.', pageStart: 1, pageEnd: 1, boxes: [], ocrConfidence: 0.9 },
];
const mapF_Unnumbered = mapAnswers(fixtureF_Neural_Questions, unnumberedBiologyAnswer);
assert(mapF_Unnumbered[0].status === 'unanswered', 'Fixture F Unnumbered Cross-Topic Answer NOT mistakenly mapped to Neural Network Q1');
assert(mapF_Unnumbered[1].status === 'unanswered', 'Fixture F Unnumbered Cross-Topic Answer NOT mistakenly mapped to Neural Network Q2');

console.log('\n====================================================');
console.log(`FINAL RESULT: ${allPassed ? 'ALL FIXTURES PASSED PERFECTLY' : 'SOME FIXTURES FAILED'}`);
console.log('====================================================');
