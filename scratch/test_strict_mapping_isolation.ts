import { extractAnswers } from '../lib/extraction/text';
import { mapAnswers } from '../lib/mapping/engine';
import { gradeAnswer } from '../lib/grading/grade';
import { reconstructAnswerWithQuestionContext } from '../lib/ocr/reconstruct';
import { ConceptExtractor } from '../lib/extraction/concepts';
import type { OCRBlock, Question } from '../lib/types';

console.log('======================================================================');
console.log(' VedaAI Strict Mapping & Cross-Question Isolation Benchmark');
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

async function runStrictIsolationTest() {
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
      text: 'Explain neural network forward propagation, compute the net input and output using ReLU and Sigmoid activation, and explain backpropagation with BCE loss. [10 marks]',
      marks: 10,
    },
    {
      id: 'q-3',
      number: '3',
      text: 'Compare and contrast Batch Gradient Descent, Mini-Batch SGD, and Adam optimization algorithms. [10 marks]',
      marks: 10,
    },
  ];

  // Simulating real handwritten OCR tokens with potential anchor collisions
  const rawAnswerBlocks: OCRBlock[] = [
    // Answer Block 1: Random Forest & Bagging
    {
      id: 'ans_rf',
      pageNumber: 1,
      text: 'Ans 1: Random forest uses cowbination of all Frees trained on independen conan sara with bagging for variance reduction . In contrast , GBM vs Random forest uses sequential trees with learning Yale to minimize loss function .',
      bbox: { x: 5, y: 10, width: 90, height: 10 },
      confidence: 0.60,
    },

    // Answer Block 2: Neural Network ReLU/Sigmoid/BCE (even if anchor has OCR noise like "Ans 20" or "Ans 2")
    {
      id: 'ans_nn',
      pageNumber: 2,
      text: 'Ans 2: Forward propagation will tomputt +he met put and output of hidden layer and output layer using acHvaHom ReLU and 5igwo function , followed by vadient descent backpropagation to minimize binary cross entropy loss .',
      bbox: { x: 5, y: 10, width: 90, height: 10 },
      confidence: 0.62,
    },

    // Answer Block 3: Optimization Algorithms
    {
      id: 'ans_opt',
      pageNumber: 4,
      text: 'Ans [55(d)]: Batch vadient descent uses entire dataset per epoch . Mini-batch SGD compute gradients on smaller batches for faster convergence . Adam optimizer combines momentum and RMSprop with adaptive learning rates to escape saddle points .',
      bbox: { x: 5, y: 10, width: 90, height: 10 },
      confidence: 0.58,
    },
  ];

  console.log('--- STEP 1: ANSWER EXTRACTION & RECONSTRUCTION ---');
  const answers = extractAnswers(rawAnswerBlocks);
  check(answers.length === 3, `Extracted 3 Answer Segments (got ${answers.length})`);

  for (let i = 0; i < answers.length; i++) {
    const ans = answers[i];
    ans.rawText = ans.text;
    const qContext = questions[i]?.text || 'Deep Learning';
    const rec = await reconstructAnswerWithQuestionContext(qContext, ans.text, ans.ocrConfidence);
    ans.reconstructedText = rec.correctedText;
    ans.repairOperations = rec.corrections;
    ans.concepts = ConceptExtractor.extractConcepts(ans.reconstructedText, qContext);
  }

  console.log('\n--- STEP 2: GLOBAL OPTIMAL MAPPING ---');
  const mappings = mapAnswers(questions, answers);
  mappings.forEach((m) => {
    const mappedAns = answers.find((a) => a.id === m.answerId);
    console.log(`Question Q${questions.find((q) => q.id === m.questionId)?.number} -> Ans ${m.answerId} (${m.status}) [${m.reason}]`);
    console.log(`  Preview: "${mappedAns?.reconstructedText?.slice(0, 75)}..."\n`);
  });

  const mapQ1 = mappings.find((m) => m.questionId === 'q-1');
  const mapQ2 = mappings.find((m) => m.questionId === 'q-2');
  const mapQ3 = mappings.find((m) => m.questionId === 'q-3');

  check(mapQ1?.answerId === 'a-1', 'Question 1 correctly mapped to Random Forest answer (a-1)');
  check(mapQ2?.answerId === 'a-2', 'Question 2 correctly mapped to Neural Network answer (a-2)');
  check(mapQ3?.answerId === 'a-3', 'Question 3 correctly mapped to Optimization answer (a-3)');

  // Strict isolation assertion: Q2 MUST NOT contain Random Forest or Bagging!
  const q2Ans = answers.find((a) => a.id === mapQ2?.answerId);
  const q2Text = q2Ans?.reconstructedText || '';
  check(!q2Text.includes('Random forest') && !q2Text.includes('bagging'), 'Question 2 has ZERO contamination from Random Forest / Bagging');
  check(q2Text.includes('Forward propagation') && q2Text.includes('sigmoid'), 'Question 2 contains verified Neural Network & Sigmoid text');

  console.log('--- STEP 3: SEMANTIC GRADING (ONLY RECONSTRUCTED TEXT) ---');
  const grades = await Promise.all(
    questions.map(async (q) => {
      const map = mappings.find((m) => m.questionId === q.id);
      const ans = answers.find((a) => a.id === map?.answerId);
      return gradeAnswer(q, ans, { ocrConfidence: ans?.ocrConfidence ?? 0.6, mappingConfidence: map?.confidence ?? 0.95 });
    })
  );

  grades.forEach((g, idx) => {
    console.log(`Q${questions[idx].number} Score: ${g.score} / ${g.maxScore}`);
    console.log(`  Feedback: ${g.feedback}`);
    console.log(`  Breakdown: ${JSON.stringify(g.scoringBreakdown)}`);
  });

  // Calculate 20-mark normalized score (Q1 + Q2)
  const score20 = grades[0].score + grades[1].score;
  console.log(`\n======================================================================`);
  console.log(`20-MARK ASSIGNMENT SCORE: ${score20.toFixed(1)} / 20 (${((score20 / 20) * 100).toFixed(1)}%)`);
  console.log(`======================================================================`);

  check(grades[0].score >= 8.5, `Q1 Score >= 8.5 / 10 (got ${grades[0].score}/10)`);
  check(grades[1].score >= 8.5, `Q2 Score >= 8.5 / 10 (got ${grades[1].score}/10)`);
  check(grades[2].score >= 8.5, `Q3 Score >= 8.5 / 10 (got ${grades[2].score}/10)`);
  check(score20 >= 17.0, `20-Mark Score >= 17.0 / 20 (got ${score20.toFixed(1)} / 20)`);

  console.log('\n======================================================================');
  console.log(`RESULT: ${allPassed ? 'STRICT ISOLATION & MAPPING RESCUE VERIFIED (Score > 17/20 Met)' : 'TESTS FAILED'}`);
  console.log('======================================================================\n');
}

runStrictIsolationTest();
