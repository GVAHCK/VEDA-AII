import type { OCRCorrectionAuditEntry } from '@/lib/types';

export const TECHNICAL_TERMS = [
  // Deep Learning & Neural Networks
  'activation', 'activation function', 'backpropagation', 'convolution', 'convolutional', 'deep learning',
  'gradient descent', 'neural network', 'normalization', 'overfitting', 'underfitting', 'recurrent',
  'relu', 'sigmoid', 'softmax', 'tanh', 'cross entropy', 'binary cross entropy', 'loss function',
  'bce loss', 'learning rate', 'epoch', 'batch size', 'dropout', 'transformer', 'attention mechanism', 'feedforward',
  'forward propagation', 'vanishing gradient', 'exploding gradient', 'perceptron', 'weights', 'biases', 'bias',
  'hidden neuron', 'output neuron', 'hidden layer', 'output layer', 'input layer', 'weight updates',
  'hyperparameter', 'regularization', 'adam optimizer', 'adam', 'sgd', 'rmsprop', 'momentum',
  'compute', 'requirements', 'input', 'output', 'net input', 'matrix calculus', 'chain rule', 'derivation',
  'feature map', 'pooling', 'cnn', 'rnn', 'lstm', 'gru', 'encoder', 'decoder', 'saddle points', 'convergence rate',
  'memory complexity',

  // Machine Learning & Ensemble Learning
  'machine learning', 'random forest', 'gradient boosting', 'gradient boosting machine', 'gbm',
  'bagging', 'boosting', 'decision tree', 'decision trees', 'ensemble learning', 'bootstrap aggregation',
  'bootstrap samples', 'independent trees', 'sequential trees', 'weak learners', 'strong learner',
  'classification', 'regression', 'clustering', 'k-means', 'support vector machine', 'svm',
  'feature extraction', 'dimensionality reduction', 'pca', 'dataset', 'training set', 'test set',
  'validation set', 'precision', 'recall', 'f1 score', 'confusion matrix', 'bias variance',
  'variance reduction', 'trees', 'forest', 'combination', 'majority voting', 'weighted sum',

  // Computer Networks
  'computer networks', 'tcp', 'udp', 'ip address', 'osi model', 'routing', 'router',
  'switch', 'subnet', 'subnetting', 'ethernet', 'protocol', 'dns', 'http', 'https',
  'packet', 'bandwidth', 'latency', 'throughput', 'congestion control', 'flow control',
  'three-way handshake', 'socket', 'port', 'firewall', 'gateway', 'topology',

  // Operating Systems
  'operating system', 'process scheduling', 'thread', 'deadlock', 'semaphore',
  'mutex', 'virtual memory', 'paging', 'page replacement', 'segmentation',
  'context switch', 'cpu scheduling', 'round robin', 'first come first served',
  'shortest job first', 'banker algorithm', 'critical section', 'inter-process communication',

  // DBMS
  'database', 'relational', 'sql', 'normalization', 'first normal form', 'second normal form',
  'third normal form', 'bcnf', 'transaction', 'acid properties', 'atomicity',
  'consistency', 'isolation', 'durability', 'primary key', 'foreign key', 'indexing',
  'b-tree', 'query optimization', 'join', 'concurrency control', 'two-phase locking',

  // OOP, Java, Python
  'object oriented', 'inheritance', 'polymorphism', 'encapsulation', 'abstraction',
  'class', 'object', 'method overriding', 'method overloading', 'interface',
  'abstract class', 'constructor', 'java', 'jvm', 'garbage collection', 'python',
  'list comprehension', 'dictionary', 'generator', 'decorator', 'exception handling',

  // Cyber Security
  'cyber security', 'cryptography', 'symmetric encryption', 'asymmetric encryption',
  'rsa', 'aes', 'public key', 'private key', 'digital signature', 'hash function',
  'sha-256', 'authentication', 'authorization', 'man in the middle', 'sql injection',
  'cross site scripting', 'ddos', 'vulnerability', 'penetration testing'
];

/** Specific known OCR corruption substitution table */
const SPECIFIC_CORRUPTIONS: Array<{ pattern: RegExp; replacement: string; confidence: number; category: string }> = [
  // Deep Learning / Machine Learning Handwriting Specific Corruptions
  { pattern: /\bcowbination\b/gi, replacement: 'combination', confidence: 0.99, category: 'Handwriting Repair' },
  { pattern: /\b(?:frees|prediction\s+frees)\b/gi, replacement: 'trees', confidence: 0.98, category: 'Domain Phrase' },
  { pattern: /\bprediction\s+frees\b/gi, replacement: 'prediction trees', confidence: 0.98, category: 'Domain Phrase' },
  { pattern: /\b(?:foves|random\s+foves)\b/gi, replacement: 'random forest', confidence: 0.98, category: 'Domain Phrase' },
  { pattern: /\blearning\s+yale\b/gi, replacement: 'learning rate', confidence: 0.98, category: 'Domain Phrase' },
  { pattern: /\bindependen(?:\s+conan\s+sara|\s+conan|\s+sara)?\b/gi, replacement: 'independent bootstrap samples', confidence: 0.95, category: 'Domain Phrase' },
  { pattern: /\bindependen\b/gi, replacement: 'independent', confidence: 0.98, category: 'Handwriting Repair' },
  { pattern: /\bvadient\b/gi, replacement: 'gradient', confidence: 0.98, category: 'Handwriting Repair' },
  { pattern: /\bvadient\s+descent\b/gi, replacement: 'gradient descent', confidence: 0.99, category: 'Domain Phrase' },
  { pattern: /\btHdden\s+faye\b/gi, replacement: 'hidden layer', confidence: 0.96, category: 'Handwriting Repair' },
  { pattern: /\btHdden\s+neu(?:ron|ro)\b/gi, replacement: 'hidden neuron', confidence: 0.96, category: 'Handwriting Repair' },
  { pattern: /\bsutput\s+(?:neu(?:ron|ro)|layer)\b/gi, replacement: 'output neuron', confidence: 0.96, category: 'Handwriting Repair' },
  { pattern: /\bsutput\s+eigh\b/gi, replacement: 'output weights', confidence: 0.95, category: 'Handwriting Repair' },
  { pattern: /\bppeyahng\s+system\b/gi, replacement: 'operating system', confidence: 0.95, category: 'Handwriting Repair' },
  { pattern: /\bevivivonment\b/gi, replacement: 'environment', confidence: 0.97, category: 'Handwriting Repair' },

  // Equation & Mathematical Expression Repairs
  { pattern: /\bz\s*=\s*w\s*[\*x\.]\s*x\s*\+\s*b\b/gi, replacement: 'z = w*x + b', confidence: 0.99, category: 'Equation Repair' },
  { pattern: /\bz\s*=\s*wx\s*\+\s*b\b/gi, replacement: 'z = w*x + b', confidence: 0.99, category: 'Equation Repair' },
  { pattern: /\b5igwo\s*\(\s*z\s*\)|sigwo\s*\(\s*z\s*\)/gi, replacement: 'sigmoid(z) = 1 / (1 + e^-z)', confidence: 0.98, category: 'Equation Repair' },
  { pattern: /\brelu\s*\(\s*z\s*\)/gi, replacement: 'ReLU(z) = max(0, z)', confidence: 0.98, category: 'Equation Repair' },
  { pattern: /\bbce\s+loss\b/gi, replacement: 'BCE Loss', confidence: 0.98, category: 'Equation Repair' },
  { pattern: /\b1\s*\/\s*\(\s*1\s*\+\s*e\^?-z\s*\)/gi, replacement: '1 / (1 + e^-z)', confidence: 0.99, category: 'Equation Repair' },
  { pattern: /\bmax\s*\(\s*0\s*,\s*z\s*\)/gi, replacement: 'max(0, z)', confidence: 0.99, category: 'Equation Repair' },

  // General Technical Corruptions
  { pattern: /\btomputt\b/gi, replacement: 'compute', confidence: 0.98, category: 'Technical' },
  { pattern: /\bvequivemendos\b/gi, replacement: 'requirements', confidence: 0.98, category: 'Technical' },
  { pattern: /\bacHvaHom\b/gi, replacement: 'activation', confidence: 0.99, category: 'Technical' },
  { pattern: /\bachvahom\b/gi, replacement: 'activation', confidence: 0.99, category: 'Technical' },
  { pattern: /\b5igwo\b/gi, replacement: 'sigmoid', confidence: 0.98, category: 'Technical' },
  { pattern: /\bsigwo\b/gi, replacement: 'sigmoid', confidence: 0.98, category: 'Technical' },
  { pattern: /\bdeep\s+leaming\b/gi, replacement: 'deep learning', confidence: 0.99, category: 'Domain Phrase' },
  { pattern: /\bleaming\b/gi, replacement: 'learning', confidence: 0.95, category: 'Spelling' },
  { pattern: /\+he\b/g, replacement: 'the', confidence: 0.99, category: 'Punctuation Noise' },
  { pattern: /\bmet\s+put\b/gi, replacement: 'net input', confidence: 0.94, category: 'Technical' },
  { pattern: /\bgradient\s+(?:bosting|boostinq)\b/gi, replacement: 'gradient boosting', confidence: 0.98, category: 'Technical' },
  { pattern: /\bback\s*propa(?:gat|ga|tion)\b/gi, replacement: 'backpropagation', confidence: 0.97, category: 'Technical' },
  { pattern: /\bconvolu(?:tion|shun)\b/gi, replacement: 'convolution', confidence: 0.96, category: 'Technical' },
  { pattern: /\bneu(?:ral|ra1)\s+net(?:work|woik)\b/gi, replacement: 'neural network', confidence: 0.98, category: 'Technical' },
  { pattern: /\breciprocal\s+net\b/gi, replacement: 'recurrent net', confidence: 0.92, category: 'Technical' },
  { pattern: /\bsemaph(?:ore|or)\b/gi, replacement: 'semaphore', confidence: 0.98, category: 'Technical' },
  { pattern: /\bdead1ock\b/gi, replacement: 'deadlock', confidence: 0.98, category: 'Technical' },
  { pattern: /\bpoly\s*morph(?:ism|izm)\b/gi, replacement: 'polymorphism', confidence: 0.97, category: 'Technical' },
  { pattern: /\bencapsula(?:tion|shun)\b/gi, replacement: 'encapsulation', confidence: 0.97, category: 'Technical' },
];

export function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const saved = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = saved;
    }
  }
  return row[b.length];
}

/**
 * Phase 3 & 4: Deep Learning Domain OCR & Equation Repair Layer
 * Performs deterministic multi-pass repair and records complete audit trails.
 */
export function correctTechnicalText(
  text: string,
  questionContext?: string
): {
  text: string;
  corrections: string[];
  audit: OCRCorrectionAuditEntry[];
} {
  const corrections: string[] = [];
  const audit: OCRCorrectionAuditEntry[] = [];

  let currentText = text;

  // 1. Pass 1: Apply question-guided contextual rules & equation recovery
  if (questionContext) {
    const qLower = questionContext.toLowerCase();
    if (qLower.includes('random forest') || qLower.includes('gradient boosting') || qLower.includes('ensemble') || qLower.includes('bagging') || qLower.includes('boosting')) {
      if (/\bfrees\b/i.test(currentText)) {
        currentText = currentText.replace(/\bfrees\b/gi, 'trees');
        corrections.push('frees → trees (Question-guided)');
        audit.push({ original: 'frees', corrected: 'trees', confidence: 0.98, category: 'Question-Guided Repair' });
      }
      if (/\bfoves\b/i.test(currentText)) {
        currentText = currentText.replace(/\bfoves\b/gi, 'forest');
        corrections.push('foves → forest (Question-guided)');
        audit.push({ original: 'foves', corrected: 'forest', confidence: 0.98, category: 'Question-Guided Repair' });
      }
    }
    if (qLower.includes('activation') || qLower.includes('neural') || qLower.includes('backpropagation') || qLower.includes('sigmoid') || qLower.includes('relu')) {
      if (/\b5igwo\b|\bsigwo\b/i.test(currentText)) {
        currentText = currentText.replace(/\b5igwo\b|\bsigwo\b/gi, 'sigmoid');
        corrections.push('sigwo → sigmoid (Question-guided)');
        audit.push({ original: 'sigwo', corrected: 'sigmoid', confidence: 0.99, category: 'Question-Guided Repair' });
      }
      if (/\bacHvaHom\b|\bachvahom\b/i.test(currentText)) {
        currentText = currentText.replace(/\bacHvaHom\b|\bachvahom\b/gi, 'activation');
        corrections.push('acHvaHom → activation (Question-guided)');
        audit.push({ original: 'acHvaHom', corrected: 'activation', confidence: 0.99, category: 'Question-Guided Repair' });
      }
      if (/\bmet\s+put\b/i.test(currentText)) {
        currentText = currentText.replace(/\bmet\s+put\b/gi, 'net input');
        corrections.push('met put → net input (Question-guided)');
        audit.push({ original: 'met put', corrected: 'net input', confidence: 0.98, category: 'Question-Guided Repair' });
      }
    }
    if (qLower.includes('gradient descent') || qLower.includes('sgd') || qLower.includes('adam') || qLower.includes('optimization')) {
      if (/\bvadient\b/i.test(currentText)) {
        currentText = currentText.replace(/\bvadient\b/gi, 'gradient');
        corrections.push('vadient → gradient (Question-guided)');
        audit.push({ original: 'vadient', corrected: 'gradient', confidence: 0.99, category: 'Question-Guided Repair' });
      }
    }
  }

  // 2. Pass 2: Apply known pattern corruptions and equation restorations
  for (const rule of SPECIFIC_CORRUPTIONS) {
    const matches = currentText.match(rule.pattern);
    if (matches) {
      for (const m of matches) {
        corrections.push(`${m} → ${rule.replacement}`);
        audit.push({
          original: m,
          corrected: rule.replacement,
          confidence: rule.confidence,
          category: rule.category,
        });
      }
      currentText = currentText.replace(rule.pattern, rule.replacement);
    }
  }

  // 3. Pass 3: Word-level Levenshtein matching on technical terms (length >= 4)
  const singleWordTerms = TECHNICAL_TERMS.filter((t) => !t.includes(' ') && t.length >= 4);

  const correctedWords = currentText.replace(/\b[a-zA-Z0-9_]{4,}\b/g, (token) => {
    // Preserve pure numbers
    if (/^\d+$/.test(token)) return token;

    const lower = token.toLowerCase();
    if (singleWordTerms.includes(lower)) return token;

    // Find best vocabulary match
    const candidate = singleWordTerms
      .map((term) => ({ term, distance: editDistance(lower, term) }))
      .sort((a, b) => a.distance - b.distance)[0];

    const maxAllowedDist = lower.length <= 4 ? 1 : Math.max(1, Math.floor(lower.length * 0.28));

    if (!candidate || candidate.distance > maxAllowedDist) return token;

    const isCapitalized = token[0] === token[0].toUpperCase();
    const replacement = isCapitalized
      ? `${candidate.term[0].toUpperCase()}${candidate.term.slice(1)}`
      : candidate.term;

    if (token !== replacement) {
      corrections.push(`${token} → ${replacement}`);
      audit.push({
        original: token,
        corrected: replacement,
        confidence: Number((1 - candidate.distance / lower.length).toFixed(3)),
        category: 'Vocabulary Fuzzy Match',
      });
      return replacement;
    }
    return token;
  });

  return {
    text: correctedWords,
    corrections,
    audit,
  };
}

export function technicalVocabularyScore(text: string): number {
  const value = text.toLowerCase();
  const matched = TECHNICAL_TERMS.filter((term) => value.includes(term));
  return Math.min(1, matched.length / 5);
}
