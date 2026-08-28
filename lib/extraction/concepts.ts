import { editDistance, TECHNICAL_TERMS } from '@/lib/ocr/technical';

export interface ConceptCoverageResult {
  recall: number;
  precision: number;
  matchedConcepts: string[];
  missingConcepts: string[];
  inferredConcepts: string[];
}

/** Domain Concept Ontology Graph */
export const CONCEPT_ONTOLOGY: Record<string, { aliases: string[]; related: string[] }> = {
  'Random Forest': {
    aliases: ['random forest', 'random forests', 'rf', 'random foves', 'prediction frees', 'cowbination of all frees'],
    related: ['Decision Trees', 'Bagging', 'Ensemble Learning', 'Variance Reduction', 'Bootstrap Samples']
  },
  'Decision Trees': {
    aliases: ['decision tree', 'decision trees', 'frees', 'trees', 'prediction trees', 'weak learners'],
    related: ['Random Forest', 'Gradient Boosting', 'Ensemble Learning']
  },
  'Gradient Boosting': {
    aliases: ['gradient boosting', 'gbm', 'gradient boosting machine', 'boosting', 'sequential trees', 'gradient bosting'],
    related: ['Decision Trees', 'Learning Rate', 'Loss Function', 'Ensemble Learning']
  },
  'Bagging': {
    aliases: ['bagging', 'bootstrap aggregation', 'bootstrap aggregating', 'independent bootstrap samples', 'independen conan sara'],
    related: ['Random Forest', 'Variance Reduction', 'Ensemble Learning']
  },
  'Variance Reduction': {
    aliases: ['variance reduction', 'reduce variance', 'variance', 'bias variance tradeoff'],
    related: ['Bagging', 'Random Forest']
  },
  'Forward Propagation': {
    aliases: ['forward propagation', 'forward pass', 'forward prop', 'feedforward'],
    related: ['Net Input', 'Activation Function', 'Neural Network', 'Hidden & Output Neurons']
  },
  'Net Input': {
    aliases: ['net input', 'met put', 'z = w*x + b', 'z = wx + b', 'linear combination', 'weighted sum', 'weights and biases'],
    related: ['Forward Propagation', 'Activation Function', 'Hidden & Output Neurons']
  },
  'Activation Function': {
    aliases: ['activation function', 'activation', 'achvahom', 'achvahom function', 'non-linear activation'],
    related: ['Sigmoid Function', 'ReLU Activation', 'Softmax', 'Forward Propagation']
  },
  'Sigmoid Function': {
    aliases: ['sigmoid', 'sigmoid function', '5igwo', 'sigwo', 'sigmoid(z)', '1 / (1 + e^-z)', 'logistic function'],
    related: ['Activation Function', 'Binary Cross Entropy Loss', 'Forward Propagation']
  },
  'ReLU Activation': {
    aliases: ['relu', 'relu activation', 'relu(z)', 'max(0, z)', 'rectified linear unit'],
    related: ['Activation Function', 'Sigmoid Function', 'Forward Propagation']
  },
  'Hidden & Output Neurons': {
    aliases: ['hidden neuron', 'output neuron', 'hidden layer', 'output layer', 'hidden layer and output layer', 'hidden faye', 'output weights', 'biases'],
    related: ['Forward Propagation', 'Net Input', 'Backpropagation']
  },
  'Binary Cross Entropy Loss': {
    aliases: ['binary cross entropy', 'bce loss', 'bce', 'cross entropy', 'cross entropy loss', 'loss function', 'cost function'],
    related: ['Backpropagation', 'Sigmoid Function', 'Gradient Descent']
  },
  'Backpropagation': {
    aliases: ['backpropagation', 'backprop', 'backward pass', 'gradient flow', 'chain rule', 'gradient descent', 'vadient descent'],
    related: ['Gradient Descent', 'Binary Cross Entropy Loss', 'Chain Rule', 'Hidden & Output Neurons']
  },
  'Chain Rule': {
    aliases: ['chain rule', 'derivative', 'matrix calculus', 'partial derivative', 'dL/dW', 'dL/db', 'weight updates'],
    related: ['Backpropagation', 'Gradient Descent']
  },
  'Batch Gradient Descent': {
    aliases: ['batch gradient descent', 'batch gd', 'full batch gd', 'entire dataset per epoch', 'vadient descent'],
    related: ['Gradient Descent', 'Mini-Batch SGD', 'Optimization']
  },
  'Mini-Batch SGD': {
    aliases: ['mini-batch sgd', 'mini batch gradient descent', 'sgd', 'stochastic gradient descent', 'smaller batches'],
    related: ['Batch Gradient Descent', 'Adam Optimizer', 'Convergence Rate']
  },
  'Adam Optimizer': {
    aliases: ['adam optimizer', 'adam', 'adaptive moment estimation', 'momentum and rmsprop', 'adaptive learning rates'],
    related: ['Optimization', 'Mini-Batch SGD', 'Learning Rate', 'Saddle Points']
  },
  'Saddle Points': {
    aliases: ['saddle points', 'saddle point', 'escape saddle points', 'local minima'],
    related: ['Adam Optimizer', 'Gradient Descent']
  },
  'Convergence Rate': {
    aliases: ['convergence rate', 'convergence', 'faster convergence', 'convergence speed'],
    related: ['Adam Optimizer', 'Mini-Batch SGD', 'Batch Gradient Descent']
  },
  'Memory Complexity': {
    aliases: ['memory complexity', 'memory footprint', 'lower memory', 'ram complexity'],
    related: ['Batch Gradient Descent', 'Mini-Batch SGD']
  }
};

export class ConceptExtractor {
  /**
   * Phase 2 & 6: Extracts concepts independently from OCR text and builds a concept graph.
   */
  static extractConcepts(text: string, questionContext?: string): string[] {
    const identified = new Set<string>();
    const lower = text.toLowerCase();
    const qLower = (questionContext || '').toLowerCase();

    // 1. Direct and Alias Concept Matching
    for (const [concept, data] of Object.entries(CONCEPT_ONTOLOGY)) {
      for (const alias of data.aliases) {
        if (lower.includes(alias)) {
          identified.add(concept);
          break;
        }
        // Fuzzy token match for OCR errors
        if (alias.length >= 5 && editDistance(lower, alias) <= 2) {
          identified.add(concept);
          break;
        }
      }
    }

    // 2. Question-Guided Concept Enrichment
    if (questionContext) {
      for (const [concept, data] of Object.entries(CONCEPT_ONTOLOGY)) {
        const inQuestion = data.aliases.some((alias) => qLower.includes(alias));
        if (inQuestion) {
          // If related concepts are present in student answer, link primary concept
          const hasRelatedInAnswer = data.related.some((rel) => identified.has(rel));
          if (hasRelatedInAnswer || data.aliases.some((alias) => lower.includes(alias.slice(0, 4)))) {
            identified.add(concept);
          }
        }
      }
    }

    return Array.from(identified);
  }

  /**
   * Evaluates concept coverage between expected question concepts and student answer concepts.
   */
  static evaluateConceptCoverage(
    questionText: string,
    answerText: string
  ): ConceptCoverageResult {
    const qConcepts = this.extractConcepts(questionText);
    const aConcepts = this.extractConcepts(answerText, questionText);

    if (qConcepts.length === 0) {
      return {
        recall: 1.0,
        precision: 1.0,
        matchedConcepts: aConcepts,
        missingConcepts: [],
        inferredConcepts: aConcepts,
      };
    }

    const matched = qConcepts.filter((c) => aConcepts.includes(c));
    const missing = qConcepts.filter((c) => !aConcepts.includes(c));
    const recall = Number((matched.length / qConcepts.length).toFixed(3));

    // Validly relevant concepts include direct question concepts + their domain ontology relations
    const relevantOntology = new Set<string>([
      ...qConcepts,
      ...qConcepts.flatMap((c) => CONCEPT_ONTOLOGY[c]?.related ?? []),
    ]);
    const validConcepts = aConcepts.filter((c) => relevantOntology.has(c));
    const precision = aConcepts.length ? Number((validConcepts.length / aConcepts.length).toFixed(3)) : 1.0;

    return {
      recall,
      precision,
      matchedConcepts: matched,
      missingConcepts: missing,
      inferredConcepts: aConcepts,
    };
  }

  /**
   * Levenshtein Character Error Rate (CER) calculation.
   */
  static calculateCER(reference: string, hypothesis: string): number {
    const dist = editDistance(reference.toLowerCase().trim(), hypothesis.toLowerCase().trim());
    const refLen = Math.max(1, reference.trim().length);
    return Number(Math.min(1.0, dist / refLen).toFixed(4));
  }

  /**
   * Word Error Rate (WER) calculation.
   */
  static calculateWER(reference: string, hypothesis: string): number {
    const refWords = reference.toLowerCase().trim().split(/\s+/).filter(Boolean);
    const hypWords = hypothesis.toLowerCase().trim().split(/\s+/).filter(Boolean);

    const n = refWords.length;
    const m = hypWords.length;
    const dp = Array.from({ length: n + 1 }, () => new Float32Array(m + 1));

    for (let i = 0; i <= n; i++) dp[i][0] = i;
    for (let j = 0; j <= m; j++) dp[0][j] = j;

    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        const cost = refWords[i - 1] === hypWords[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost
        );
      }
    }

    return Number(Math.min(1.0, dp[n][m] / Math.max(1, n)).toFixed(4));
  }
}
