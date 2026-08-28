import { extractQuestions, extractAnswers } from '../lib/extraction/text';
import { mapAnswers } from '../lib/mapping/engine';
import { gradeAnswer } from '../lib/grading/grade';
import { reconstructAnswerWithQuestionContext } from '../lib/ocr/reconstruct';
import { correctTechnicalText } from '../lib/ocr/technical';
import type { OCRBlock, Question } from '../lib/types';

console.log('======================================================================');
console.log(' VedaAI Handwritten Deep Learning Recovery & Semantic Grading Test');
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

async function runRecoverySuite() {
  // 1. Define Deep Learning Questions
  const questions: Question[] = [
    {
      id: 'q1',
      number: '1',
      text: 'Compare and contrast Random Forest and Gradient Boosting algorithms, explaining bagging, boosting, and variance reduction. [10 marks]',
      marks: 10,
    },
    {
      id: 'q2',
      number: '2',
      text: 'Explain neural network forward propagation, compute the net input and output using sigmoid activation, and explain backpropagation requirements. [10 marks]',
      marks: 10,
    },
  ];

  // 2. Corrupted Handwritten OCR Tokens (Exact corrupted tokens from prompt and logs)
  const corruptedQ1Answer =
    'Ans 1: Random forest uses cowbination of all Frees trained on independen conan sara with bagging for variance reduction . In contrast , GBM vs Random forest uses sequential trees with learning Yale to minimize loss function .';

  const corruptedQ2Answer =
    'Ans 2: Forward propagation will tomputt +he met put and output of vequivemendos of deep leaming using acHvaHom and 5igwo function , followed by gradient descent backpropagation .';

  console.log('--- TEST 1: Question-Aware Domain Repair ---');
  const repairQ1 = await reconstructAnswerWithQuestionContext(questions[0].text, corruptedQ1Answer, 0.7);
  console.log('\nOriginal Q1 OCR:\n', corruptedQ1Answer);
  console.log('Reconstructed Q1:\n', repairQ1.correctedText);
  console.log('Repairs Applied:\n', repairQ1.corrections.join(', '));

  check(repairQ1.correctedText.includes('combination'), 'Repaired "cowbination" -> "combination"');
  check(repairQ1.correctedText.includes('trees'), 'Repaired "Frees" -> "trees"');
  check(repairQ1.correctedText.includes('learning rate'), 'Repaired "learning Yale" -> "learning rate"');
  check(repairQ1.correctedText.includes('independent'), 'Repaired "independen" -> "independent"');

  const repairQ2 = await reconstructAnswerWithQuestionContext(questions[1].text, corruptedQ2Answer, 0.7);
  console.log('\nOriginal Q2 OCR:\n', corruptedQ2Answer);
  console.log('Reconstructed Q2:\n', repairQ2.correctedText);
  console.log('Repairs Applied:\n', repairQ2.corrections.join(', '));

  check(repairQ2.correctedText.includes('compute'), 'Repaired "tomputt" -> "compute"');
  check(repairQ2.correctedText.includes('requirements'), 'Repaired "vequivemendos" -> "requirements"');
  check(repairQ2.correctedText.includes('activation'), 'Repaired "acHvaHom" -> "activation"');
  check(repairQ2.correctedText.includes('sigmoid'), 'Repaired "5igwo" -> "sigmoid"');
  check(repairQ2.correctedText.includes('deep learning'), 'Repaired "deep leaming" -> "deep learning"');

  console.log('\n--- TEST 2: Answer Extraction & Hybrid Mapping ---');
  const rawBlocks: OCRBlock[] = [
    { id: 'b1', pageNumber: 1, text: corruptedQ1Answer, bbox: { x: 5, y: 10, width: 90, height: 10 }, confidence: 0.65 },
    { id: 'b2', pageNumber: 2, text: corruptedQ2Answer, bbox: { x: 5, y: 10, width: 90, height: 10 }, confidence: 0.68 },
  ];

  const answers = extractAnswers(rawBlocks);
  check(answers.length === 2, 'Extracted 2 Answer Segments');

  const mappings = mapAnswers(questions, answers);
  check(mappings.length === 2 && mappings.every((m) => m.status === 'answered'), 'Both answers mapped successfully');

  console.log('\n--- TEST 3: Multi-Criteria Semantic Grading Target (>= 8.0 / 10) ---');
  const grade1 = await gradeAnswer(questions[0], answers[0], { ocrConfidence: 0.65, mappingConfidence: 0.95 });
  console.log(`Q1 Grade: ${grade1.score} / ${grade1.maxScore}`);
  console.log('Q1 Feedback:', grade1.feedback);
  console.log('Q1 Breakdown:', JSON.stringify(grade1.scoringBreakdown));

  const grade2 = await gradeAnswer(questions[1], answers[1], { ocrConfidence: 0.68, mappingConfidence: 0.95 });
  console.log(`\nQ2 Grade: ${grade2.score} / ${grade2.maxScore}`);
  console.log('Q2 Feedback:', grade2.feedback);
  console.log('Q2 Breakdown:', JSON.stringify(grade2.scoringBreakdown));

  const avgScore = (grade1.score + grade2.score) / 2;
  console.log(`\nOverall Average Score: ${avgScore.toFixed(1)} / 10`);

  check(grade1.score >= 8.0, `Q1 Score >= 8.0 / 10 (achieved ${grade1.score}/10)`);
  check(grade2.score >= 8.0, `Q2 Score >= 8.0 / 10 (achieved ${grade2.score}/10)`);
  check(avgScore >= 8.0, `Average Score >= 8.0 / 10 (achieved ${avgScore.toFixed(1)}/10)`);

  console.log('\n======================================================================');
  console.log(`RESULT: ${allPassed ? 'ALL RECOVERY & GRADING TESTS PASSED (Target ≥ 8/10 Met)' : 'TESTS FAILED'}`);
  console.log('======================================================================\n');
}

runRecoverySuite();
