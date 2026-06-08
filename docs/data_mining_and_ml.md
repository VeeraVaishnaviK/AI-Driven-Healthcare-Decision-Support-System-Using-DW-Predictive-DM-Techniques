# Predictive Data Mining & Machine Learning Documentation

This document explains the mathematical formulas, algorithms, and data cleansing logic implemented in the **AI-Driven Healthcare Decision Support System**.

---

## 1. Data Cleaning & Median-Based Imputation (ETL)

During ETL ingestion (`src/app/api/etl/route.ts`), patient records frequently contain missing values, or placeholder zeros in fields where zero is clinically impossible (e.g. Blood Pressure, Glucose, Insulin, BMI). 

To clean the data without distorting distributions, the ETL pipeline uses **Median-Based Imputation**.

### Mathematical Formula
For a sorted feature set $X = [x_1, x_2, \dots, x_N]$:

$$\text{Median}(X) = \begin{cases} 
x_{\frac{N+1}{2}} & \text{if } N \text{ is odd} \\ 
\frac{x_{\frac{N}{2}} + x_{\frac{N}{2} + 1}}{2} & \text{if } N \text{ is even} 
\end{cases}$$

### Rationale
Median imputation is chosen over mean imputation because it is **robust to outliers**. Extreme values (e.g., highly elevated glucose spikes) do not distort the median, ensuring imputed values remain clinically realistic.

---

## 2. Supervised Machine Learning Classifiers

Three classifiers are implemented from scratch in TypeScript (`src/utils/ml.ts`) to predict diabetes risk using an 8-dimensional feature vector:
$$\mathbf{x} = [\text{Pregnancies}, \text{Glucose}, \text{Blood Pressure}, \text{Skin Thickness}, \text{Insulin}, \text{BMI}, \text{Diabetes Pedigree}, \text{Age}]$$

### 2.1 Logistic Regression
Predicts a probability $P(y=1|\mathbf{x})$ by passing a linear combination of inputs through the Sigmoid activation function.

#### Mathematical Formulas
- **Inference Sigmoid Function**:
  $$P(y=1|\mathbf{x}) = \sigma(\mathbf{w}^T\mathbf{x} + b) = \frac{1}{1 + e^{-(\mathbf{w}^T\mathbf{x} + b)}}$$
  Where $\mathbf{w}$ is the weights vector and $b$ is the bias.
  
- **Model Confidence**:
  $$\text{Confidence} = |P(y=1|\mathbf{x}) - 0.5| \times 2 \times 100\%$$
  The confidence is scaled relative to the $0.5$ decision boundary.

### 2.2 Decision Tree
Computes binary splits recursively on feature ranges, choosing partitions that maximize **Information Gain** based on **Entropy** or **Gini Impurity**.

#### Mathematical Formulas
- **Entropy of Node $S$**:
  $$H(S) = - \sum_{i=1}^C p_i \log_2(p_i)$$
  Where $p_i$ is the probability of class $i$.
  
- **Information Gain ($IG$) of Split on Feature $A$**:
  $$IG(S, A) = H(S) - \sum_{v \in \text{Values}(A)} \frac{|S_v|}{|S|} H(S_v)$$
  The algorithm splits nodes where $IG(S, A)$ is maximized.

### 2.3 Random Forest
An ensemble method that grows multiple independent decision trees (bagging) and aggregates their votes to reduce variance and combat overfitting.

#### Mathematical Formulas
- **Consensus Prediction Probability**:
  $$P_{RF} = \frac{1}{T} \sum_{t=1}^T P_t(\mathbf{x})$$
  Where $T$ is the number of trees and $P_t(\mathbf{x}) \in \{0, 1\}$ is the classification prediction of tree $t$.
  
- **Ensemble Consensus Confidence**:
  $$\text{Confidence} = \frac{\max(V_1, V_0)}{T} \times 100\%$$
  Where $V_1$ is the number of trees voting for Diabetic and $V_0$ is the number of trees voting for Healthy.

---

## 3. Unsupervised K-Means Clustering

K-Means grouping segment patient cohorts (`src/utils/mining.ts`) into three risk groups: Low, Moderate, and High Risk.

### Step 1: Min-Max Feature Normalization
To prevent features with large scales (e.g. Glucose) from dominating features with small scales (e.g. Pedigree Function), values are normalized between $0$ and $1$:
$$x'_{ij} = \frac{x_{ij} - \min(X_j)}{\max(X_j) - \min(X_j)}$$

### Step 2: Euclidean Distance Calculation
Points are assigned to the nearest cluster centroid by calculating the Euclidean distance in 4-dimensional normalized space `[Glucose, Blood Pressure, BMI, Age]`:
$$d(\mathbf{x}, \mathbf{c}) = \sqrt{\sum_{k=1}^4 (x_k - c_k)^2}$$
$$\text{Assignment}(i) = \arg\min_{j \in \{1,\dots,K\}} d(\mathbf{x}_i, \mathbf{c}_j)$$

### Step 3: Centroid Recalculation
Centroids are recalculated as the arithmetic mean of all points assigned to that cluster:
$$\mathbf{c}_j = \frac{1}{|S_j|} \sum_{\mathbf{x}_i \in S_j} \mathbf{x}_i$$

*If a cluster becomes empty, the algorithm reseeds its centroid to a random patient data point to maintain convergence stability.*

### Step 4: Sorting Risk Cohorts
Clusters are dynamically sorted by their members' average clinical risk scores to consistently map cluster indexes to labels:
- **Cohort 0**: Low Risk
- **Cohort 1**: Moderate Risk
- **Cohort 2**: High Risk

---

## 4. Association Rule Mining (Apriori)

Discovers comorbidities and risk correlations among patient records (`src/utils/mining.ts`) using binary items: `Diabetes`, `Hypertension`, `Obesity`, and `Elderly`.

### 4.1 Support
Measures the frequency of the rule's itemset in the transaction list:
$$\text{Support}(A \rightarrow B) = \frac{\text{Count}(A \cap B)}{\text{Total Transactions } N}$$

### 4.2 Confidence
Measures the reliability of the inference $A \rightarrow B$; the probability that transaction contains $B$ given it contains $A$:
$$\text{Confidence}(A \rightarrow B) = \frac{\text{Support}(A \cap B)}{\text{Support}(A)} = \frac{\text{Count}(A \cap B)}{\text{Count}(A)}$$

### 4.3 Lift
Evaluates the strength of the rule by comparing the joint occurrence probability against independence:
$$\text{Lift}(A \rightarrow B) = \frac{\text{Confidence}(A \rightarrow B)}{\text{Support}(B)}$$

- **Lift > 1**: Positive correlation. The presence of item $A$ increases the likelihood of item $B$ occurring (e.g. `Obesity ➔ Diabetes` has Lift ~ 1.5).
- **Lift = 1**: Independence. No correlation.
- **Lift < 1**: Negative correlation.
