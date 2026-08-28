import type { Question } from '@/lib/types';

export const SUBJECT_KEYWORDS: Record<string, string[]> = {
  'Computer Networks': [
    'computer network', 'tcp', 'udp', 'ip address', 'routing', 'router', 'osi',
    'protocol', 'subnet', 'ethernet', 'dns', 'http', 'https', 'packet', 'bandwidth',
    'latency', 'throughput', 'congestion control', 'flow control', 'three-way handshake',
    'socket', 'port', 'firewall', 'gateway', 'topology', 'lan', 'wan', 'man'
  ],
  'Operating Systems': [
    'operating system', 'process scheduling', 'thread', 'deadlock', 'virtual memory',
    'page replacement', 'semaphore', 'mutex', 'paging', 'segmentation', 'context switch',
    'cpu scheduling', 'round robin', 'first come first served', 'shortest job first',
    'banker algorithm', 'critical section', 'inter-process communication', 'kernel', 'fork'
  ],
  DBMS: [
    'database', 'relational', 'sql', 'normalization', 'first normal form', 'second normal form',
    'third normal form', 'bcnf', 'transaction', 'acid', 'atomicity', 'consistency',
    'isolation', 'durability', 'primary key', 'foreign key', 'indexing', 'b-tree',
    'query optimization', 'join', 'concurrency control', 'two-phase locking', 'erd', 'schema'
  ],
  OOP: [
    'object oriented', 'inheritance', 'polymorphism', 'encapsulation', 'abstraction',
    'class', 'object', 'method overriding', 'method overloading', 'interface',
    'abstract class', 'constructor', 'destructor', 'dynamic binding', 'access specifier'
  ],
  Java: [
    'java', 'jvm', 'jdk', 'jre', 'garbage collection', 'bytecode', 'package',
    'exception handling', 'try catch', 'throw throws', 'abstract class', 'interface',
    'arraylist', 'hashmap', 'multithreading', 'runnable', 'synchronized'
  ],
  Python: [
    'python', 'list comprehension', 'dictionary', 'tuple', 'virtual environment',
    'pip', 'lambda', 'generator', 'decorator', 'pandas', 'numpy', 'matplotlib',
    'indentation', 'docstring', 'py_test', 'dunder', '__init__'
  ],
  'Machine Learning': [
    'machine learning', 'random forest', 'gradient boosting', 'regression',
    'classification', 'overfitting', 'underfitting', 'training set', 'test set',
    'validation set', 'cross validation', 'decision tree', 'k-means', 'clustering',
    'support vector machine', 'svm', 'pca', 'bias variance', 'supervised', 'unsupervised'
  ],
  'Deep Learning': [
    'deep learning', 'neural network', 'backpropagation', 'convolution', 'convolutional',
    'relu', 'sigmoid', 'softmax', 'tanh', 'cross entropy', 'gradient descent',
    'activation', 'epoch', 'batch size', 'dropout', 'transformer', 'recurrent',
    'loss function', 'learning rate', 'vanishing gradient', 'exploding gradient', 'perceptron'
  ],
  'Data Science': [
    'data science', 'data analysis', 'data visualization', 'data mining', 'dataset',
    'pandas', 'dataframe', 'exploratory data analysis', 'eda', 'feature engineering',
    'correlation', 'distribution', 'histogram', 'seaborn', 'scikit-learn'
  ],
  'Data Structures': [
    'linked list', 'binary tree', 'stack', 'queue', 'hash table', 'graph traversal',
    'algorithm complexity', 'binary search tree', 'heap', 'trie', 'avl tree', 'dijkstra'
  ],
  'Artificial Intelligence': [
    'artificial intelligence', 'search algorithm', 'knowledge representation',
    'expert system', 'intelligent agent', 'a* search', 'minimax', 'alpha beta'
  ],
  'Cyber Security': [
    'cyber security', 'encryption', 'decryption', 'cryptography', 'symmetric encryption',
    'asymmetric encryption', 'rsa', 'aes', 'public key', 'private key', 'digital signature',
    'malware', 'firewall', 'authentication', 'authorization', 'vulnerability',
    'penetration testing', 'sql injection', 'xss', 'cross site scripting', 'ddos', 'man in the middle'
  ],
  // Retained for cross-domain compatibility
  Biology: ['cell', 'photosynthesis', 'respiration', 'organism', 'dna', 'protein', 'biology'],
  Physics: ['force', 'velocity', 'energy', 'momentum', 'wave', 'electric', 'physics'],
  Chemistry: ['chemical', 'molecule', 'reaction', 'atom', 'bond', 'molar', 'chemistry'],
  Mathematics: ['equation', 'derivative', 'integral', 'matrix', 'probability', 'theorem', 'mathematics'],
};

/**
 * Phase 11: 10-Class Subject Classification
 * Returns detected subject, confidence, and keyword breakdown.
 */
export function detectSubject(
  questions: Question[]
): { subject: string; confidence: number; scores: Record<string, number> } {
  const corpus = questions.map((q) => q.text).join(' ').toLowerCase();
  let best = { subject: 'General', score: 0 };
  const scores: Record<string, number> = {};

  for (const [subject, keywords] of Object.entries(SUBJECT_KEYWORDS)) {
    const score = keywords.reduce((sum, phrase) => {
      if (corpus.includes(phrase)) {
        return sum + phrase.split(' ').length * 1.5;
      }
      return sum;
    }, 0);

    scores[subject] = score;
    if (score > best.score) {
      best = { subject, score };
    }
  }

  const confidence = best.score ? Math.min(0.98, Number((0.6 + Math.min(0.38, best.score * 0.06)).toFixed(3))) : 0.5;

  return {
    subject: best.subject,
    confidence,
    scores,
  };
}
