export type BoundingBox = { x: number; y: number; width: number; height: number };
export type Question = { id: string; number: string; text: string; marks?: number; topic?: string };
export type OCRBlock = { id: string; pageNumber: number; text: string; bbox: BoundingBox; confidence?: number; lineIndex?: number };
export type OCRProviderResult = { provider: string; pageNumber: number; confidence: number; wordCount: number; languageScore: number; dictionaryScore: number; qualityScore: number; status: 'selected' | 'available' | 'unavailable' | 'failed' };

export type AnswerSegment = {
  id: string;
  detectedQuestionNumber?: string;
  text: string;
  rawText?: string;
  reconstructedText?: string;
  concepts?: string[];
  pageStart: number;
  pageEnd: number;
  boxes: BoundingBox[];
  ocrConfidence: number;
  repairConfidence?: number;
  repairOperations?: string[];
  status?: 'mapped' | 'unmatched';
};

export type MappingCandidate = { answerId: string; confidence: number; reason: string };
export type AnswerMapping = {
  questionId: string;
  answerId?: string;
  confidence: number;
  mappingConfidence?: number;
  status: 'answered' | 'unanswered' | 'uncertain';
  reason: string;
  alternatives?: MappingCandidate[];
};

export type Grade = {
  score: number;
  maxScore: number;
  strengths: string[];
  mistakes: string[];
  weaknesses?: string[];
  feedback: string;
  gradingConfidence?: number;
  withheld?: boolean;
  scoringBreakdown?: {
    semanticSimilarity: number;
    keyConcepts: number;
    technicalCorrectness: number;
    completeness: number;
    structure: number;
  };
};

export type PreprocessStage = { stage: string; timestamp?: string; confidence?: number; details?: string };

export type OCRDiagnostics = {
  preprocessStages: PreprocessStage[];
  imageQualityScore?: number;
  skewAngle?: number;
  rotationApplied?: number;
  dimensions?: { width: number; height: number };
  tokenVotingStats?: {
    totalTokens: number;
    fusedTokens: number;
    multiOcrAgreementRatio: number;
  };
  metrics?: {
    cer: number;
    wer: number;
    conceptRecall: number;
    conceptPrecision: number;
  };
};

export type OCRCorrectionAuditEntry = {
  original: string;
  corrected: string;
  confidence: number;
  category?: string;
};

export type HandwritingType = 'printed' | 'mixed' | 'handwritten';

export type HandwritingDetectionResult = {
  classification: HandwritingType;
  handwrittenScore: number;
  printedScore: number;
  mixedScore: number;
  strokeIrregularity: number;
  lineVariance: number;
  characterSpacingVariance: number;
  ocrConfidence?: number;
};

export type OCRAudit = {
  meanConfidence: number;
  rejectedBlocks: number;
  selectedModes: string[];
  preprocess: string[];
  /** Provider selected per page. A provider may transparently fall back to Tesseract. */
  engines?: string[];
  handwritingDetected?: boolean;
  handwritingClassification?: HandwritingType;
  handwritingMetrics?: HandwritingDetectionResult;
  rawText?: string;
  reconstructedText?: string;
  correctedText?: string;
  correctionsApplied?: boolean;
  /** Human-readable correction decisions. Raw OCR remains available above. */
  corrections?: string[];
  ocrCorrectionAudit?: OCRCorrectionAuditEntry[];
  ocrDiagnostics?: OCRDiagnostics;
  providerResults?: OCRProviderResult[];
  chosenProvider?: string[];
  confidenceBreakdown?: { ocr: number; mapping: number; grading: number };
};

export type Review = {
  questions: Question[];
  answers: AnswerSegment[];
  mappings: AnswerMapping[];
  grades: Record<string, Grade>;
  subject?: string;
  subjectConfidence?: number;
  ocrAudit?: OCRAudit;
  overall: {
    score: number;
    maxScore: number;
    feedback: string;
    weakTopics: string[];
    strongTopics: string[];
  };
};
