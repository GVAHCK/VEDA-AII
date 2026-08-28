import { extractAnswers, extractQuestions, validateQuestionSequence } from '@/lib/extraction/text';
import { gradeAnswer } from '@/lib/grading/grade';
import { geminiJson, validateEnvironment } from '@/lib/llm/gemini';
import { mapAnswers } from '@/lib/mapping/engine';
import { recognizeDocument } from '@/lib/ocr/providers';
import { reconstructOCRText, reconstructAnswerWithQuestionContext } from '@/lib/ocr/reconstruct';
import { rasterizeUpload } from '@/lib/pdf/rasterize';
import { detectSubject, SUBJECT_KEYWORDS } from '@/lib/subject/detect';
import { ConceptExtractor } from '@/lib/extraction/concepts';
import type { AnswerMapping, Grade, OCRBlock, OCRCorrectionAuditEntry, OCRDiagnostics, Question, Review } from '@/lib/types';

async function correctOcrBlocks(blocks: OCRBlock[]): Promise<{
  blocks: OCRBlock[];
  rawText: string;
  correctedText: string;
  applied: boolean;
  corrections: string[];
  audit: OCRCorrectionAuditEntry[];
}> {
  const rawText = blocks.map((block) => block.text).join(' ');
  const local = blocks.map((block) => ({ ...block, text: block.text }));
  const localText = local.map((block) => block.text).join(' ');
  const env = validateEnvironment();
  const localResult = await reconstructOCRText(rawText);
  const localCorrections = localResult.corrections;
  const localAudit = localResult.audit;

  if (!env.geminiConfigured || !rawText.trim()) {
    return {
      blocks: local,
      rawText,
      correctedText: localResult.correctedText || localText,
      applied: localResult.correctedText !== rawText,
      corrections: localCorrections,
      audit: localAudit,
    };
  }

  try {
    const result = await geminiJson<{
      correctedText?: string;
      confidence?: number;
      corrections?: string[];
    }>(
      `You are an OCR correction system for technical exams. Preserve meaning, question numbers, equations, and marks. Fix OCR corruption only; never invent content. Return JSON only: {"correctedText":"...","confidence":0-1,"corrections":["source -> correction"]}.\n${rawText.slice(0, 12000)}`
    );

    const geminiCorrections = Array.isArray(result.corrections) ? result.corrections.slice(0, 100) : [];
    const geminiAudit: OCRCorrectionAuditEntry[] = geminiCorrections.map((c) => {
      const parts = c.split(/->|→/);
      return {
        original: (parts[0] || '').trim(),
        corrected: (parts[1] || '').trim(),
        confidence: typeof result.confidence === 'number' ? result.confidence : 0.9,
        category: 'Gemini Contextual Correction',
      };
    });

    return {
      blocks: local,
      rawText,
      correctedText: result.correctedText?.trim() || localResult.correctedText || localText,
      applied: Boolean(result.correctedText?.trim()) || localResult.correctedText !== rawText,
      corrections: [...localCorrections, ...geminiCorrections],
      audit: [...localAudit, ...geminiAudit],
    };
  } catch (error) {
    console.warn('[OCR CORRECTION] Gemini unavailable; retaining deterministic OCR correction.', error);
    return {
      blocks: local,
      rawText,
      correctedText: localResult.correctedText || localText,
      applied: localResult.correctedText !== rawText,
      corrections: localCorrections,
      audit: localAudit,
    };
  }
}

async function correctQuestions(questions: Question[]): Promise<Question[]> {
  const env = validateEnvironment();
  if (!env.geminiConfigured || questions.length === 0) return questions;
  try {
    const corrected = await geminiJson<Question[]>(
      `Correct OCR errors in this extracted question list. Preserve order, all question numbers/subparts, and marks. Return JSON only as Question[]. Do not invent questions.\n${JSON.stringify(questions)}`
    );
    if (Array.isArray(corrected) && corrected.length > 0) {
      console.log(`[GEMINI CORRECTION] Corrected ${corrected.length} questions.`);
      return corrected;
    }
    return questions;
  } catch (err) {
    console.warn('[GEMINI CORRECTION] Fallback to raw OCR questions', err);
    return questions;
  }
}

async function verifySubject(questions: Question[]): Promise<{ subject: string; confidence: number }> {
  const deterministic = detectSubject(questions);
  const env = validateEnvironment();
  if (!env.geminiConfigured || questions.length === 0) {
    return { subject: deterministic.subject, confidence: deterministic.confidence };
  }
  try {
    const result = await geminiJson<{ subject?: string; confidence?: number }>(
      `Classify this assessment into exactly one allowed subject. Return JSON only: {"subject":"...","confidence":0-1}. Allowed subjects: ${Object.keys(SUBJECT_KEYWORDS).join(', ')}.\nQuestions: ${questions.map((q) => q.text).join('\n')}`
    );
    const verifiedSubject =
      result.subject && Object.prototype.hasOwnProperty.call(SUBJECT_KEYWORDS, result.subject)
        ? result.subject
        : deterministic.subject;
    const verifiedConfidence =
      typeof result.confidence === 'number' ? result.confidence : deterministic.confidence;

    return { subject: verifiedSubject, confidence: verifiedConfidence };
  } catch (error) {
    console.warn('[SUBJECT DETECTION] Gemini verification unavailable; using deterministic classification.', error);
    return { subject: deterministic.subject, confidence: deterministic.confidence };
  }
}

async function adjudicateUncertain(
  mappings: AnswerMapping[],
  questions: Question[],
  answers: Awaited<ReturnType<typeof extractAnswers>>
): Promise<AnswerMapping[]> {
  const env = validateEnvironment();
  if (!env.geminiConfigured) return mappings;
  return Promise.all(
    mappings.map(async (mapping) => {
      if (mapping.status !== 'uncertain' || !mapping.answerId) return mapping;
      const question = questions.find((item) => item.id === mapping.questionId);
      const answer = answers.find((item) => item.id === mapping.answerId);
      if (!question || !answer) return mapping;
      try {
        const textToEvaluate = answer.reconstructedText || answer.text;
        const verdict = await geminiJson<{ belongs: boolean; confidence: number }>(
          `Does this answer belong to this question? Return JSON only: {"belongs":boolean,"confidence":number}.\nQuestion: ${question.text}\nCandidate answer: ${textToEvaluate}`
        );
        return verdict.belongs
          ? {
              ...mapping,
              confidence: verdict.confidence,
              mappingConfidence: verdict.confidence,
              status: 'answered',
              reason: 'Gemini semantic adjudication confirmed',
            }
          : {
              ...mapping,
              answerId: undefined,
              confidence: verdict.confidence,
              mappingConfidence: verdict.confidence,
              status: 'unanswered',
              reason: 'Gemini rejected candidate answer',
            };
      } catch {
        return mapping;
      }
    })
  );
}

/**
 * Production Multi-Stage Assessment Pipeline Orchestrator
 */
export async function processAssessment(
  questionPaper: File,
  answerSheet: File
): Promise<{ review: Review; questionBlocks: number; answerBlocks: number; validationWarning?: string }> {
  validateEnvironment();

  console.log('================================================');
  console.log(`[PIPELINE START] Processing Question Paper: "${questionPaper.name}" (${questionPaper.size} B)`);
  console.log(`[PIPELINE START] Processing Answer Sheet: "${answerSheet.name}" (${answerSheet.size} B)`);
  console.log('================================================');

  // Stage 1 & 2: High-Resolution Rasterization with CV Preprocessing (CLAHE, Otsu, Sauvola, Bilateral, Morphology)
  const [questionPages, answerPages] = await Promise.all([
    rasterizeUpload(questionPaper),
    rasterizeUpload(answerSheet),
  ]);

  console.log(`[RASTERIZE] Question paper: ${questionPages.length} page(s), Answer sheet: ${answerPages.length} page(s)`);

  // Stage 3 & 4: Handwriting Detection, Multi-Model OCR Ensemble & Token-Level Voting
  const [questionRecognition, answerRecognition] = await Promise.all([
    recognizeDocument(questionPages),
    recognizeDocument(answerPages),
  ]);
  const questionOcr = questionRecognition.blocks;
  const answerOcr = answerRecognition.blocks;

  console.log(`[OCR SUMMARY] Question paper: ${questionOcr.length} blocks, Answer sheet: ${answerOcr.length} blocks`);

  // Stage 5: Post-OCR Technical Correction Layer
  const [questionCorrection, answerCorrection] = await Promise.all([
    correctOcrBlocks(questionOcr),
    correctOcrBlocks(answerOcr),
  ]);

  // Stage 6: Question Extraction & Boundary Detection
  const rawQuestions = extractQuestions(questionCorrection.blocks);
  const questions = await correctQuestions(rawQuestions);
  const subjectInfo = await verifySubject(questions);
  console.log(`[SUBJECT DETECTION] ${subjectInfo.subject} (${(subjectInfo.confidence * 100).toFixed(0)}% confidence)`);

  const validationReport = validateQuestionSequence(questions);
  let validationWarning: string | undefined;

  // Compile OCR diagnostics & audit data
  const allStages = [
    ...questionPages.flatMap((p) => p.preprocessStages ?? []),
    ...answerPages.flatMap((p) => p.preprocessStages ?? []),
  ];
  const avgQualityScore =
    [...questionPages, ...answerPages].reduce((sum, p) => sum + (p.qualityScore ?? 0.85), 0) /
    (questionPages.length + answerPages.length || 1);

  const ocrCorrectionAudit: OCRCorrectionAuditEntry[] = [
    ...questionCorrection.audit,
    ...answerCorrection.audit,
  ];

  if (questions.length === 0) {
    validationWarning = 'Question extraction failed: No valid questions detected.';
    console.warn(`[MAPPING SAFETY GATE] ${validationWarning} Mapping engine halted.`);

    const emptyReview: Review = {
      questions,
      answers: [],
      mappings: [],
      grades: {},
      subject: subjectInfo.subject,
      subjectConfidence: subjectInfo.confidence,
      ocrAudit: {
        meanConfidence: (questionRecognition.audit.meanConfidence + answerRecognition.audit.meanConfidence) / 2,
        rejectedBlocks: questionRecognition.audit.rejectedBlocks + answerRecognition.audit.rejectedBlocks,
        selectedModes: [...questionRecognition.audit.selectedModes, ...answerRecognition.audit.selectedModes],
        preprocess: [...questionRecognition.audit.preprocess, ...answerRecognition.audit.preprocess],
        engines: [...(questionRecognition.audit.engines ?? []), ...(answerRecognition.audit.engines ?? [])],
        handwritingDetected: Boolean(questionRecognition.audit.handwritingDetected || answerRecognition.audit.handwritingDetected),
        handwritingClassification: answerRecognition.audit.handwritingClassification || questionRecognition.audit.handwritingClassification,
        handwritingMetrics: answerRecognition.audit.handwritingMetrics,
        rawText: `${questionCorrection.rawText}\n${answerCorrection.rawText}`,
        correctedText: `${questionCorrection.correctedText}\n${answerCorrection.correctedText}`,
        reconstructedText: `${questionCorrection.correctedText}\n${answerCorrection.correctedText}`,
        correctionsApplied: questionCorrection.applied || answerCorrection.applied,
        corrections: [...questionCorrection.corrections, ...answerCorrection.corrections],
        ocrCorrectionAudit,
        ocrDiagnostics: {
          preprocessStages: allStages,
          imageQualityScore: Number(avgQualityScore.toFixed(3)),
          skewAngle: questionPages[0]?.skewAngle ?? 0,
          rotationApplied: questionPages[0]?.rotationApplied ?? 0,
        },
        providerResults: [...(questionRecognition.audit.providerResults ?? []), ...(answerRecognition.audit.providerResults ?? [])],
        chosenProvider: [...(questionRecognition.audit.chosenProvider ?? []), ...(answerRecognition.audit.chosenProvider ?? [])],
        confidenceBreakdown: {
          ocr: (questionRecognition.audit.meanConfidence + answerRecognition.audit.meanConfidence) / 200,
          mapping: 0,
          grading: 0,
        },
      },
      overall: {
        score: 0,
        maxScore: 0,
        feedback: validationWarning,
        weakTopics: [],
        strongTopics: [],
      },
    };

    return {
      review: emptyReview,
      questionBlocks: questionOcr.length,
      answerBlocks: answerOcr.length,
      validationWarning,
    };
  }

  if (!validationReport.isSequenceValid) {
    validationWarning = `Question extraction needs review: ${validationReport.warnings.join(' ')}`;
    console.warn(`[QUESTION REVIEW] ${validationWarning}`);
  }

  // Stage 7: Answer Extraction & Segment Building
  const answers = extractAnswers(answerCorrection.blocks);
  console.log(`[ANSWERS EXTRACTED] Found ${answers.length} answer segment(s)`);

  // PRE-MAPPING RECONSTRUCTION: Reconstruct ALL answer segments so mapping engine sees clean text
  await Promise.all(
    answers.map(async (answer, aIdx) => {
      answer.rawText = answer.text;
      const candidateQ =
        questions.find((q) => q.number === answer.detectedQuestionNumber) ||
        questions[aIdx] ||
        questions[0];

      const reconstruction = await reconstructAnswerWithQuestionContext(
        candidateQ?.text || subjectInfo.subject,
        answer.text,
        answer.ocrConfidence
      );

      answer.reconstructedText = reconstruction.correctedText;
      answer.repairOperations = reconstruction.corrections;
      answer.repairConfidence = reconstruction.confidence;
      answer.concepts = ConceptExtractor.extractConcepts(answer.reconstructedText, candidateQ?.text);
      ocrCorrectionAudit.push(...reconstruction.audit);

      console.log(
        `[ANSWER RECONSTRUCTED] Ans ${answer.id} (Page ${answer.pageStart}-${answer.pageEnd}): Raw len ${answer.rawText.length} -> Clean len ${answer.reconstructedText.length} (${reconstruction.corrections.length} repairs)`
      );
    })
  );

  // Stage 9: Hybrid Matching Engine (40% Question Number, 30% Semantic Similarity, 20% Page Proximity, 10% Keywords)
  const initialMappings = mapAnswers(questions, answers);
  const mappings = await adjudicateUncertain(initialMappings, questions, answers);

  // Mark answers status
  const mappedIds = new Set(mappings.flatMap((mapping) => (mapping.answerId ? [mapping.answerId] : [])));
  answers.forEach((answer) => {
    answer.status = mappedIds.has(answer.id) ? 'mapped' : 'unmatched';
  });

  // TARGETED QUESTION-AWARE RE-RECONSTRUCTION on confirmed mapped pairs
  await Promise.all(
    questions.map(async (question) => {
      const mapping = mappings.find((m) => m.questionId === question.id);
      const answer = answers.find((a) => a.id === mapping?.answerId);
      if (answer && answer.text) {
        const targeted = await reconstructAnswerWithQuestionContext(
          question.text,
          answer.rawText || answer.text,
          answer.ocrConfidence
        );
        answer.reconstructedText = targeted.correctedText;
        answer.repairOperations = targeted.corrections;
        answer.repairConfidence = targeted.confidence;
        answer.concepts = ConceptExtractor.extractConcepts(answer.reconstructedText, question.text);
      }
    })
  );

  // Stage 10: Multi-Criteria Semantic Grading Engine on Reconstructed Clean Text ONLY
  const grades: Record<string, Grade> = Object.fromEntries(
    await Promise.all(
      questions.map(async (question) => {
        const mapping = mappings.find((m) => m.questionId === question.id);
        const mappedAnswer = answers.find((a) => a.id === mapping?.answerId);

        console.log(`[GRADING TRACE] Q${question.number}: Mapped to ${mappedAnswer ? mappedAnswer.id : 'NONE'} (Status: ${mapping?.status})`);
        if (mappedAnswer) {
          console.log(`  [GRADING INPUT Q${question.number}] Length: ${(mappedAnswer.reconstructedText || mappedAnswer.text).length} chars`);
        }

        const grade = await gradeAnswer(question, mappedAnswer, {
          ocrConfidence: mappedAnswer?.ocrConfidence ?? (questionRecognition.audit.meanConfidence / 100),
          mappingConfidence: mapping?.confidence ?? 0,
        });

        console.log(`  [GRADE Q${question.number}] Score: ${grade.score} / ${grade.maxScore}`);
        return [question.id, grade];
      })
    )
  );

  const values = Object.values(grades);
  const score = values.reduce((sum, grade) => sum + grade.score, 0);
  const maxScore = values.reduce((sum, grade) => sum + grade.maxScore, 0);

  const allReconstructed = answers
    .map((a) => a.reconstructedText || a.text)
    .filter(Boolean)
    .join('\n\n');

  // Compute Validation Metrics: CER, WER, Concept Recall, Concept Precision
  const rawMerged = answers.map((a) => a.rawText || a.text).join(' ');
  const cleanMerged = answers.map((a) => a.reconstructedText || a.text).join(' ');
  const cer = ConceptExtractor.calculateCER(cleanMerged, rawMerged);
  const wer = ConceptExtractor.calculateWER(cleanMerged, rawMerged);

  const totalExpectedConcepts = questions.flatMap((q) => ConceptExtractor.extractConcepts(q.text));
  const totalExtractedConcepts = answers.flatMap((a) => a.concepts ?? []);
  const matchedConcepts = totalExpectedConcepts.filter((c) => totalExtractedConcepts.includes(c));
  const conceptRecall = totalExpectedConcepts.length ? Number((matchedConcepts.length / totalExpectedConcepts.length).toFixed(3)) : 1.0;
  const conceptPrecision = totalExtractedConcepts.length ? Number((matchedConcepts.length / totalExtractedConcepts.length).toFixed(3)) : 1.0;

  const ocrDiagnostics: OCRDiagnostics = {
    preprocessStages: allStages,
    imageQualityScore: Number(avgQualityScore.toFixed(3)),
    skewAngle: questionPages[0]?.skewAngle ?? 0,
    rotationApplied: questionPages[0]?.rotationApplied ?? 0,
    tokenVotingStats: answerRecognition.audit.ocrDiagnostics?.tokenVotingStats,
    metrics: {
      cer,
      wer,
      conceptRecall,
      conceptPrecision,
    },
  };

  const review: Review = {
    questions,
    answers,
    mappings,
    grades,
    subject: subjectInfo.subject,
    subjectConfidence: subjectInfo.confidence,
    ocrAudit: {
      meanConfidence: (questionRecognition.audit.meanConfidence + answerRecognition.audit.meanConfidence) / 2,
      rejectedBlocks: questionRecognition.audit.rejectedBlocks + answerRecognition.audit.rejectedBlocks,
      selectedModes: [...questionRecognition.audit.selectedModes, ...answerRecognition.audit.selectedModes],
      preprocess: [...questionRecognition.audit.preprocess, ...answerRecognition.audit.preprocess],
      engines: [...(questionRecognition.audit.engines ?? []), ...(answerRecognition.audit.engines ?? [])],
      handwritingDetected: Boolean(questionRecognition.audit.handwritingDetected || answerRecognition.audit.handwritingDetected),
      handwritingClassification: answerRecognition.audit.handwritingClassification || questionRecognition.audit.handwritingClassification,
      handwritingMetrics: answerRecognition.audit.handwritingMetrics,
      rawText: `${questionCorrection.rawText}\n${answerCorrection.rawText}`,
      correctedText: `${questionCorrection.correctedText}\n${answerCorrection.correctedText}`,
      reconstructedText: allReconstructed || `${questionCorrection.correctedText}\n${answerCorrection.correctedText}`,
      correctionsApplied: questionCorrection.applied || answerCorrection.applied || ocrCorrectionAudit.length > 0,
      corrections: [...questionCorrection.corrections, ...answerCorrection.corrections],
      ocrCorrectionAudit,
      ocrDiagnostics,
      providerResults: [...(questionRecognition.audit.providerResults ?? []), ...(answerRecognition.audit.providerResults ?? [])],
      chosenProvider: [...(questionRecognition.audit.chosenProvider ?? []), ...(answerRecognition.audit.chosenProvider ?? [])],
      confidenceBreakdown: {
        ocr: (questionRecognition.audit.meanConfidence + answerRecognition.audit.meanConfidence) / 200,
        mapping: mappings.length ? mappings.reduce((sum, m) => sum + m.confidence, 0) / mappings.length : 0,
        grading: values.length ? values.reduce((sum, g) => sum + (g.gradingConfidence ?? 0), 0) / values.length : 0,
      },
    },
    overall: {
      score: Number(score.toFixed(1)),
      maxScore,
      feedback: process.env.GEMINI_API_KEY
        ? 'AI evaluation and question-aware semantic reconstruction completed successfully.'
        : 'Heuristic multi-criteria evaluation applied. Configure GEMINI_API_KEY for deep LLM feedback.',
      weakTopics: [],
      strongTopics: [],
    },
  };

  console.log(`[PIPELINE COMPLETE] Final Score: ${score}/${maxScore} (${((score / (maxScore || 1)) * 100).toFixed(0)}%), Subject: ${subjectInfo.subject}`);
  return { review, questionBlocks: questionOcr.length, answerBlocks: answerOcr.length, validationWarning };
}
