/**
 * Data Mining Algorithms (Pure TypeScript)
 * Implements K-Means Clustering and Association Rule Mining (Apriori-style).
 */

// ---------------------------------------------------------------------
// 1. K-MEANS CLUSTERING TYPES & IMPLEMENTATION
// ---------------------------------------------------------------------

export interface ClusterCentroid {
  glucose: number;
  blood_pressure: number;
  bmi: number;
  age: number;
}

export interface Cluster {
  id: number;
  name: string; // "Low Risk" | "Moderate Risk" | "High Risk"
  size: number;
  centroid: ClusterCentroid;
  patientIds: string[];
}

export interface KMeansInput {
  patientId: string;
  glucose: number;
  blood_pressure: number;
  bmi: number;
  age: number;
  risk_score: number;
}

/**
 * Executes K-Means clustering on clinical features
 */
export function runKMeans(inputs: KMeansInput[], k = 3): Cluster[] {
  const n = inputs.length;
  if (n === 0) return [];

  // Extract raw vectors: [glucose, bp, bmi, age]
  const X = inputs.map(input => [
    input.glucose,
    input.blood_pressure,
    input.bmi,
    input.age
  ]);

  // 1. Min-Max Normalization
  const numFeatures = 4;
  const mins = new Array(numFeatures).fill(Infinity);
  const maxs = new Array(numFeatures).fill(-Infinity);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < numFeatures; j++) {
      if (X[i][j] < mins[j]) mins[j] = X[i][j];
      if (X[i][j] > maxs[j]) maxs[j] = X[i][j];
    }
  }

  const scaledX = X.map(row => {
    return row.map((val, j) => {
      const denom = maxs[j] - mins[j];
      return denom === 0 ? 0 : (val - mins[j]) / denom;
    });
  });

  // 2. Initialize Centroids (pick k random points or unique profiles)
  let centroids: number[][] = [];
  const pickedIndices = new Set<number>();
  
  // Try to find distinct starting points
  while (centroids.length < k && pickedIndices.size < n) {
    const randIdx = Math.floor(Math.random() * n);
    if (!pickedIndices.has(randIdx)) {
      pickedIndices.add(randIdx);
      centroids.push([...scaledX[randIdx]]);
    }
  }

  // Fallback if we have fewer unique data points than k
  while (centroids.length < k) {
    centroids.push([Math.random(), Math.random(), Math.random(), Math.random()]);
  }

  let assignments = new Array(n).fill(-1);
  let converged = false;
  let maxIterations = 40;

  for (let iter = 0; iter < maxIterations && !converged; iter++) {
    // A. Assignment Step
    let assignmentsChanged = false;
    for (let i = 0; i < n; i++) {
      let minDist = Infinity;
      let closestCluster = -1;

      for (let c = 0; c < k; c++) {
        // Euclidean distance
        let distSq = 0;
        for (let j = 0; j < numFeatures; j++) {
          const diff = scaledX[i][j] - centroids[c][j];
          distSq += diff * diff;
        }
        if (distSq < minDist) {
          minDist = distSq;
          closestCluster = c;
        }
      }

      if (assignments[i] !== closestCluster) {
        assignments[i] = closestCluster;
        assignmentsChanged = true;
      }
    }

    if (!assignmentsChanged && iter > 0) {
      converged = true;
      break;
    }

    // B. Update Step
    const newCentroids = Array.from({ length: k }, () => new Array(numFeatures).fill(0));
    const counts = new Array(k).fill(0);

    for (let i = 0; i < n; i++) {
      const c = assignments[i];
      counts[c]++;
      for (let j = 0; j < numFeatures; j++) {
        newCentroids[c][j] += scaledX[i][j];
      }
    }

    // If any cluster is empty, reseed centroid to a random point to avoid division by zero
    for (let c = 0; c < k; c++) {
      if (counts[c] === 0) {
        const randIdx = Math.floor(Math.random() * n);
        centroids[c] = [...scaledX[randIdx]];
      } else {
        for (let j = 0; j < numFeatures; j++) {
          newCentroids[c][j] /= counts[c];
        }
        centroids[c] = newCentroids[c];
      }
    }
  }

  // 3. De-normalize Centroids & Group Members
  const clusters: Cluster[] = Array.from({ length: k }, (_, c) => {
    // De-scale centroid
    const deScaledCentroid = centroids[c].map((scaledVal, j) => {
      return scaledVal * (maxs[j] - mins[j]) + mins[j];
    });

    const members = inputs.filter((_, idx) => assignments[idx] === c);
    const avgRisk = members.length 
      ? members.reduce((acc, m) => acc + m.risk_score, 0) / members.length 
      : 0;

    return {
      id: c,
      name: '', // Will map by risk tier
      size: members.length,
      centroid: {
        glucose: Math.round(deScaledCentroid[0] * 10) / 10,
        blood_pressure: Math.round(deScaledCentroid[1] * 10) / 10,
        bmi: Math.round(deScaledCentroid[2] * 10) / 10,
        age: Math.round(deScaledCentroid[3] * 10) / 10
      },
      patientIds: members.map(m => m.patientId),
      // Temporarily store avg risk for sorting
      _avgRisk: avgRisk
    } as any;
  });

  // Sort clusters by average risk score to map names correctly:
  // Low Risk (lowest average risk) -> Moderate Risk -> High Risk
  clusters.sort((a: any, b: any) => a._avgRisk - b._avgRisk);

  const riskNames = ['Low Risk', 'Moderate Risk', 'High Risk'];
  clusters.forEach((cluster: any, idx) => {
    cluster.name = riskNames[idx];
    cluster.id = idx;
    delete cluster._avgRisk;
  });

  return clusters;
}

// ---------------------------------------------------------------------
// 2. APRIORI ASSOCIATION RULE MINING
// ---------------------------------------------------------------------

export interface AssociationRule {
  antecedent: string[];
  consequent: string[];
  support: number;
  confidence: number;
  lift: number;
}

export interface MiningTransactionInput {
  glucose: number;
  blood_pressure: number;
  bmi: number;
  age: number;
  disease_id: string;
}

/**
 * Runs Association Rule Mining (Apriori) on comorbidities
 */
export function runAssociationRules(
  visits: MiningTransactionInput[], 
  minSupport = 0.1, 
  minConfidence = 0.4
): AssociationRule[] {
  const n = visits.length;
  if (n === 0) return [];

  // Define transactions of clinical flags
  const transactions: string[][] = visits.map(v => {
    const items: string[] = [];
    if (v.glucose >= 126 || v.disease_id === 'DIS001') items.push('Diabetes');
    if (v.blood_pressure >= 140 || v.disease_id === 'DIS002') items.push('Hypertension');
    if (v.bmi >= 30) items.push('Obesity');
    if (v.age >= 55) items.push('Elderly');
    return items;
  });

  const itemsList = ['Diabetes', 'Hypertension', 'Obesity', 'Elderly'];
  const totalTransactions = transactions.length;

  const rules: AssociationRule[] = [];

  // Generate 2-item association rules: A -> B
  for (let i = 0; i < itemsList.length; i++) {
    for (let j = 0; j < itemsList.length; j++) {
      if (i === j) continue;

      const A = itemsList[i];
      const B = itemsList[j];

      // Count occurrences
      let countA = 0;
      let countB = 0;
      let countAB = 0;

      transactions.forEach(t => {
        const hasA = t.includes(A);
        const hasB = t.includes(B);

        if (hasA) countA++;
        if (hasB) countB++;
        if (hasA && hasB) countAB++;
      });

      if (countAB === 0) continue;

      const support = countAB / totalTransactions;
      const confidence = countA > 0 ? countAB / countA : 0;
      const supportB = countB / totalTransactions;
      const lift = (confidence > 0 && supportB > 0) ? confidence / supportB : 0;

      // Filter by minSupport and minConfidence thresholds
      if (support >= minSupport && confidence >= minConfidence) {
        rules.push({
          antecedent: [A],
          consequent: [B],
          support: Math.round(support * 1000) / 10,
          confidence: Math.round(confidence * 1000) / 10,
          lift: Math.round(lift * 100) / 100
        });
      }
    }
  }

  // Sort rules by Lift descending
  return rules.sort((a, b) => b.lift - a.lift);
}
