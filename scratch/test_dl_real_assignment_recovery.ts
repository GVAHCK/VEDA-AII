import { extractQuestions, extractAnswers } from '../lib/extraction/text';
import { mapAnswers } from '../lib/mapping/engine';
import { gradeAnswer } from '../lib/grading/grade';
import { reconstructAnswerWithQuestionContext } from '../lib/ocr/reconstruct';
import type { OCRBlock, Question } from '../lib/types';

console.log('======================================================================');
console.log(' VedaAI Real DL Assignment: 3-Question Recovery & Grading Test');
console.log('======================================================================\n');

let allPassed = true;
function check(condition: boolean, name: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ [PASS] ${name}`);
  } else {
    console.error(`  ✗ [FAIL] ${name}${detail ? ` -> ${detail}` : ''}`);
    allPassed = false;
  }
}

async function runRealAssignmentTest() {
  const questions: Question[] = [
    {
      id: 'q-1',
      number: '1',
      text: 'Compare and contrast Random Forest and Gradient Boosting algorithms, explaining bagging, boosting, and variance reduction. [10 marks]',
      marks: 10,
    },
    {
      id: 'q-2',
      number: '2',
      text: 'Explain neural network forward propagation, compute the net input and output using sigmoid activation, and explain backpropagation requirements. [10 marks]',
      marks: 10,
    },
    {
      id: 'q-3',
      number: '3',
      text: 'Compare and contrast Batch Gradient Descent, Mini-Batch SGD, and Adam optimization algorithms. [10 marks]',
      marks: 10,
    },
  ];

  // Handwritten OCR with real-world artifacts across 6 pages
  const answerBlocks: OCRBlock[] = [
    // Page 1 & 2: Q1
    {
      id: 'p1_1',
      pageNumber: 1,
      text: 'Ans 1: Random forest uses cowbination of all Frees trained on independen conan sara with bagging for variance reduction .',
      bbox: { x: 5, y: 10, width: 90, height: 10 },
      confidence: 0.62,
    },
    {
      id: 'p2_1',
      pageNumber: 2,
      text: 'In contrast , GBM vs Random forest uses sequential trees with learning Yale to minimize loss function .',
      bbox: { x: 5, y: 10, width: 90, height: 10 },
      confidence: 0.60,
    },

    // Page 2 & 3: Q2
    {
      id: 'p2_2',
      pageNumber: 2,
      text: 'Ans 2: Forward propagation will tomputt +he met put and output of vequivemendos of deep leaming using acHvaHom and 5igwo function ,',
      bbox: { x: 5, y: 40, width: 90, height: 10 },
      confidence: 0.65,
    },
    {
      id: 'p3_1',
      pageNumber: 3,
      text: 'followed by gradient descent backpropagation using chain rule and weight updates .',
      bbox: { x: 5, y: 10, width: 90, height: 10 },
      confidence: 0.64,
    },

    // Page 4, 5, 6: Q3 (simulating noisy anchor "Ans [55(d)]" from real OCR log)
    {
      id: 'p4_1',
      pageNumber: 4,
      text: 'Ans [55(d)]: Batch gradient descent uses entire dataset per epoch for gradient descent optimization .',
      bbox: { x: 5, y: 15, width: 90, height: 10 },
      confidence: 0.58,
    },
    {
      id: 'p5_1',
      pageNumber: 5,
      text: 'Mini-batch SGD computes gradients on smaller batches for faster convergence and lower memory complexity .',
      bbox: { x: 5, y: 10, width: 90, height: 10 },
      confidence: 0.61,
    },
    {
      id: 'p6_1',
      pageNumber: 6,
      text: 'Adam optimizer combines momentum and RMSprop with adaptive learning rates to escape saddle points .',
      bbox: { x: 5, y: 10, width: 90, height: 10 },
      confidence: 0.55,
    },
  ];

  console.log('--- STEP 1: ANSWER SEGMENT EXTRACTION ---');
  const extractedAnswers = extractAnswers(answerBlocks);
  console.log(`Extracted ${extractedAnswers.length} answer segments.`);
  check(extractedAnswers.length >= 3, `Extracted at least 3 answer segments (got ${extractedAnswers.length})`);

  console.log('\n--- STEP 2: PRE-MAPPING RECONSTRUCTION ---');
  for (let i = 0; i < extractedAnswers.length; i++) {
    const ans = extractedAnswers[i];
    ans.rawText = ans.text;
    const qContext = questions[i]?.text || 'Deep Learning';
    const rec = await reconstructAnswerWithQuestionContext(qContext, ans.text, ans.ocrConfidence);
    ans.reconstructedText = rec.correctedText;
    ans.repairOperations = rec.corrections;
    console.log(`Ans ${ans.id} (Page ${ans.pageStart}-${ans.pageEnd}) Reconstructed:\n  ${ans.reconstructedText}`);
  }

  console.log('\n--- STEP 3: HYBRID MAPPING WITH SEQUENTIAL FALLBACK ---');
  const mappings = mapAnswers(questions, extractedAnswers);
  mappings.forEach((m) => {
    console.log(`Question ${m.questionId} -> Answer ${m.answerId || 'NONE'} (${m.status}, conf: ${m.confidence}) [${m.reason}]`);
  });

  check(mappings.length === 3, 'All 3 questions have mappings');
  check(mappings.every((m) => m.status === 'answered' && m.answerId !== undefined), 'All 3 questions mapped to valid answer segments (NO unanswered / dropped questions)');

  console.log('\n--- STEP 4: SEMANTIC GRADING (ONLY ON RECONSTRUCTED TEXT) ---');
  const grades = await Promise.all(
    questions.map(async (q) => {
      const map = mappings.find((m) => m.questionId === q.id);
      const ans = extractedAnswers.find((a) => a.id === map?.answerId);
      return gradeAnswer(q, ans, { ocrConfidence: ans?.ocrConfidence ?? 0.6, mappingConfidence: map?.confidence ?? 0.85 });
    })
  );

  grades.forEach((g, idx) => {
    console.log(`\nQ${questions[idx].number} Score: ${g.score} / ${g.maxScore}`);
    console.log(`  Feedback: ${g.feedback}`);
    console.log(`  Breakdown: ${JSON.stringify(g.scoringBreakdown)}`);
  });

  const totalScore = grades.reduce((sum, g) => sum + g.score, 0);
  const maxScore = grades.reduce((sum, g) => sum + g.maxScore, 0);
  const avg10Score = (totalScore / maxScore) * 10;

  console.log('\n======================================================================');
  console.log(`TOTAL SCORE: ${totalScore.toFixed(1)} / ${maxScore} (Normalized: ${avg10Score.toFixed(1)} / 10)`);
  console.log('======================================================================');

  check(grades[0].score >= 8.0, `Q1 Score >= 8.0 / 10 (got ${grades[0].score}/10)`);
  check(grades[1].score >= 8.0, `Q2 Score >= 8.0 / 10 (got ${grades[1].score}/10)`);
  check(grades[2].score >= 8.0, `Q3 Score >= 8.0 / 10 (got ${grades[2].score}/10)`);
  check(avg10Score >= 8.5, `Overall Normalized Score >= 8.5 / 10 (got ${avg10Score.toFixed(1)}/10)`);

  console.log('\n======================================================================');
  console.log(`RESULT: ${allPassed ? 'REAL DL ASSIGNMENT RECOVERY SUCCESSFUL (Score ≥ 8.5/10 Met)' : 'TESTS FAILED'}`);
  console.log('======================================================================\n');
}

runRealAssignmentTest();
