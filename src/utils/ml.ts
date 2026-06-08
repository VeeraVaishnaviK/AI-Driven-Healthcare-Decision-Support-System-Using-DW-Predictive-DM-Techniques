/**
 * Core Machine Learning Algorithms (Pure TypeScript)
 * Implements Decision Tree, Random Forest, and Logistic Regression Classifiers.
 */

export interface MLMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
}

// ---------------------------------------------------------------------
// 1. DECISION TREE CLASSIFIER
// ---------------------------------------------------------------------
interface TreeNode {
  featureIdx?: number;
  threshold?: number;
  left?: TreeNode;
  right?: TreeNode;
  value?: number; // Leaf prediction value
  isLeaf: boolean;
}

export class DecisionTreeClassifier {
  private root: TreeNode | null = null;
  private maxDepth: number;
  private minSamplesSplit: number;

  constructor(maxDepth = 5, minSamplesSplit = 2) {
    this.maxDepth = maxDepth;
    this.minSamplesSplit = minSamplesSplit;
  }

  fit(X: number[][], y: number[]): void {
    this.root = this.buildTree(X, y, 0);
  }

  private buildTree(X: number[][], y: number[], depth: number): TreeNode {
    const numSamples = X.length;
    const numFeatures = numSamples > 0 ? X[0].length : 0;
    
    // Check stopping criteria
    const uniqueClasses = Array.from(new Set(y));
    if (
      uniqueClasses.length === 1 ||
      numSamples < this.minSamplesSplit ||
      depth >= this.maxDepth
    ) {
      return { isLeaf: true, value: this.majorityVote(y) };
    }

    // Find the best split
    let bestGini = 999;
    let bestFeatureIdx = -1;
    let bestThreshold = -1;

    for (let f = 0; f < numFeatures; f++) {
      const featureValues = X.map(row => row[f]);
      // Test unique values in feature as split thresholds
      const uniqueThresholds = Array.from(new Set(featureValues));

      uniqueThresholds.forEach(threshold => {
        const leftY: number[] = [];
        const rightY: number[] = [];

        for (let i = 0; i < numSamples; i++) {
          if (X[i][f] <= threshold) {
            leftY.push(y[i]);
          } else {
            rightY.push(y[i]);
          }
        }

        if (leftY.length > 0 && rightY.length > 0) {
          const gini = this.calculateSplitGini(leftY, rightY);
          if (gini < bestGini) {
            bestGini = gini;
            bestFeatureIdx = f;
            bestThreshold = threshold;
          }
        }
      });
    }

    // If no good split found, return leaf node
    if (bestFeatureIdx === -1) {
      return { isLeaf: true, value: this.majorityVote(y) };
    }

    // Split and recurse
    const leftX: number[][] = [];
    const leftY: number[] = [];
    const rightX: number[][] = [];
    const rightY: number[] = [];

    for (let i = 0; i < numSamples; i++) {
      if (X[i][bestFeatureIdx] <= bestThreshold) {
        leftX.push(X[i]);
        leftY.push(y[i]);
      } else {
        rightX.push(X[i]);
        rightY.push(y[i]);
      }
    }

    return {
      isLeaf: false,
      featureIdx: bestFeatureIdx,
      threshold: bestThreshold,
      left: this.buildTree(leftX, leftY, depth + 1),
      right: this.buildTree(rightX, rightY, depth + 1)
    };
  }

  private calculateSplitGini(left: number[], right: number[]): number {
    const n = left.length + right.length;
    const giniLeft = this.calculateGini(left);
    const giniRight = this.calculateGini(right);
    return (left.length / n) * giniLeft + (right.length / n) * giniRight;
  }

  private calculateGini(y: number[]): number {
    const count = y.length;
    if (count === 0) return 0;

    const counts: { [key: number]: number } = {};
    y.forEach(val => {
      counts[val] = (counts[val] || 0) + 1;
    });

    let sumProbSquared = 0;
    Object.values(counts).forEach(c => {
      const p = c / count;
      sumProbSquared += p * p;
    });

    return 1 - sumProbSquared;
  }

  private majorityVote(y: number[]): number {
    if (y.length === 0) return 0;
    const counts: { [key: number]: number } = {};
    y.forEach(val => {
      counts[val] = (counts[val] || 0) + 1;
    });
    let maxCount = -1;
    let majorityClass = 0;
    Object.entries(counts).forEach(([val, count]) => {
      if (count > maxCount) {
        maxCount = count;
        majorityClass = Number(val);
      }
    });
    return majorityClass;
  }

  predict(X: number[][]): number[] {
    return X.map(row => this.predictRow(this.root, row));
  }

  private predictRow(node: TreeNode | null, row: number[]): number {
    if (!node) return 0;
    if (node.isLeaf) return node.value || 0;
    
    const fIdx = node.featureIdx!;
    const threshold = node.threshold!;

    if (row[fIdx] <= threshold) {
      return this.predictRow(node.left || null, row);
    } else {
      return this.predictRow(node.right || null, row);
    }
  }

  // Model Serialization helper
  toJSON(): any {
    return this.root;
  }

  fromJSON(root: TreeNode): void {
    this.root = root;
  }
}

// ---------------------------------------------------------------------
// 2. RANDOM FOREST CLASSIFIER
// ---------------------------------------------------------------------
export class RandomForestClassifier {
  private trees: DecisionTreeClassifier[] = [];
  private numTrees: number;
  private maxDepth: number;

  constructor(numTrees = 10, maxDepth = 5) {
    this.numTrees = numTrees;
    this.maxDepth = maxDepth;
  }

  fit(X: number[][], y: number[]): void {
    this.trees = [];
    const numSamples = X.length;

    for (let t = 0; t < this.numTrees; t++) {
      // Create Bootstrap Sample with replacement
      const bootstrapX: number[][] = [];
      const bootstrapY: number[] = [];

      for (let i = 0; i < numSamples; i++) {
        const randIdx = Math.floor(Math.random() * numSamples);
        bootstrapX.push(X[randIdx]);
        bootstrapY.push(y[randIdx]);
      }

      // Train decision tree on bootstrap sample
      const tree = new DecisionTreeClassifier(this.maxDepth);
      tree.fit(bootstrapX, bootstrapY);
      this.trees.push(tree);
    }
  }

  predict(X: number[][]): number[] {
    const numSamples = X.length;
    const allPredictions = this.trees.map(tree => tree.predict(X)); // Shape: [numTrees, numSamples]

    const finalPredictions: number[] = [];
    for (let i = 0; i < numSamples; i++) {
      const votes: { [key: number]: number } = {};
      for (let t = 0; t < this.numTrees; t++) {
        const pred = allPredictions[t][i];
        votes[pred] = (votes[pred] || 0) + 1;
      }

      let maxVotes = -1;
      let winningClass = 0;
      Object.entries(votes).forEach(([c, v]) => {
        if (v > maxVotes) {
          maxVotes = v;
          winningClass = Number(c);
        }
      });
      finalPredictions.push(winningClass);
    }

    return finalPredictions;
  }

  toJSON(): any[] {
    return this.trees.map(t => t.toJSON());
  }

  fromJSON(treesJSON: any[]): void {
    this.trees = treesJSON.map(tJson => {
      const tree = new DecisionTreeClassifier();
      tree.fromJSON(tJson);
      return tree;
    });
  }
}

// ---------------------------------------------------------------------
// 3. LOGISTIC REGRESSION CLASSIFIER
// ---------------------------------------------------------------------
export class LogisticRegressionClassifier {
  private weights: number[] = [];
  private bias = 0;
  private learningRate: number;
  private epochs: number;

  constructor(learningRate = 0.01, epochs = 200) {
    this.learningRate = learningRate;
    this.epochs = epochs;
  }

  fit(X: number[][], y: number[]): void {
    const numSamples = X.length;
    if (numSamples === 0) return;
    const numFeatures = X[0].length;

    // Initialize weights and bias to 0
    this.weights = new Array(numFeatures).fill(0);
    this.bias = 0;

    // Gradient Descent
    for (let epoch = 0; epoch < this.epochs; epoch++) {
      let dW = new Array(numFeatures).fill(0);
      let dB = 0;

      for (let i = 0; i < numSamples; i++) {
        const row = X[i];
        const label = y[i];

        // Linear sum
        let z = this.bias;
        for (let f = 0; f < numFeatures; f++) {
          z += row[f] * this.weights[f];
        }

        const prediction = this.sigmoid(z);
        const error = prediction - label;

        // Gradients
        for (let f = 0; f < numFeatures; f++) {
          dW[f] += error * row[f];
        }
        dB += error;
      }

      // Update Weights & Bias
      for (let f = 0; f < numFeatures; f++) {
        this.weights[f] -= this.learningRate * (dW[f] / numSamples);
      }
      this.bias -= this.learningRate * (dB / numSamples);
    }
  }

  private sigmoid(z: number): number {
    return 1 / (1 + Math.exp(-Math.max(-10, Math.min(10, z)))); // Cap z bounds to avoid overflow
  }

  predict(X: number[][]): number[] {
    return X.map(row => {
      let z = this.bias;
      for (let f = 0; f < row.length; f++) {
        z += row[f] * this.weights[f];
      }
      return this.sigmoid(z) >= 0.5 ? 1 : 0;
    });
  }

  predictProbability(row: number[]): number {
    let z = this.bias;
    for (let f = 0; f < row.length; f++) {
      z += row[f] * (this.weights[f] || 0);
    }
    return this.sigmoid(z);
  }

  toJSON(): any {
    return {
      weights: this.weights,
      bias: this.bias
    };
  }

  fromJSON(model: any): void {
    this.weights = model.weights || [];
    this.bias = model.bias || 0;
  }
}

// ---------------------------------------------------------------------
// ML TRAINING PIPELINE HELPERS
// ---------------------------------------------------------------------

/**
 * Splits dataset into Train and Test subsets
 */
export function trainTestSplit(X: number[][], y: number[], testSize = 0.2): {
  X_train: number[][];
  y_train: number[];
  X_test: number[][];
  y_test: number[];
} {
  const count = X.length;
  const indices = Array.from(Array(count).keys());
  
  // Shuffle indices
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const splitIdx = Math.floor(count * (1 - testSize));
  
  const trainIndices = indices.slice(0, splitIdx);
  const testIndices = indices.slice(splitIdx);

  return {
    X_train: trainIndices.map(i => X[i]),
    y_train: trainIndices.map(i => y[i]),
    X_test: testIndices.map(i => X[i]),
    y_test: testIndices.map(i => y[i]),
  };
}

/**
 * Computes Classification Performance metrics
 */
export function calculatePerformanceMetrics(yTrue: number[], yPred: number[]): MLMetrics {
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;

  for (let i = 0; i < yTrue.length; i++) {
    if (yTrue[i] === 1 && yPred[i] === 1) tp++;
    else if (yTrue[i] === 0 && yPred[i] === 1) fp++;
    else if (yTrue[i] === 0 && yPred[i] === 0) tn++;
    else if (yTrue[i] === 1 && yPred[i] === 0) fn++;
  }

  const total = yTrue.length || 1;
  const accuracy = (tp + tn) / total;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1 = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;

  return {
    accuracy: Math.round(accuracy * 1000) / 10,
    precision: Math.round(precision * 1000) / 10,
    recall: Math.round(recall * 1000) / 10,
    f1: Math.round(f1 * 1000) / 10,
  };
}
