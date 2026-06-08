# Next.js API Routes Catalog

This catalog documents the REST API endpoints implemented in the **AI-Driven Healthcare Decision Support System**.

---

## 1. Patient Management API (`/api/patients`)

Handles Patient CRUD operations and cascades visit record deletions.

### 1.1 GET (List Patients & Visits)
Retrieve all registered patient profiles along with their complete visit histories.
- **Response** (`200 OK`):
  ```json
  {
    "patients": [
      {
        "patient_id": "P001",
        "patient_name": "Sarah Jenkins",
        "age": 45,
        "gender": "Female",
        "address": "123 Pine St, Seattle, WA",
        "contact": "206-555-0143"
      }
    ],
    "visits": [
      {
        "visit_id": "V001",
        "patient_id": "P001",
        "doctor_id": "D001",
        "disease_id": "DIS001",
        "time_id": "T20260601",
        "pregnancies": 6,
        "glucose": 148,
        "blood_pressure": 72,
        "skin_thickness": 35,
        "insulin": 80,
        "bmi": 33.6,
        "diabetes_pedigree": 0.627,
        "prediction_result": "Diabetic Risk Detected",
        "risk_score": 82.5
      }
    ]
  }
  ```

### 1.2 POST (Create Patient)
Register a new patient card in the DWH database.
- **Request Body**:
  ```json
  {
    "patient_id": "P007",
    "patient_name": "Alice Peterson",
    "age": 31,
    "gender": "Female",
    "address": "789 Pine Way",
    "contact": "555-0192"
  }
  ```

### 1.3 PUT (Update Patient)
Modify demographics for an existing patient card.
- **Request Body**: Same schema as POST.

### 1.4 DELETE (Delete Patient)
Remove a patient card. **WARNING**: Cascades and deletes all matching visits and predictions.
- **Query Parameter**: `?id=P007`

---

## 2. ETL Ingestion API (`/api/etl`)

Manages the Extract, Transform, and Load pipeline.

### 2.1 GET (ETL Log History)
Retrieve logs of past pipeline sync executions.
- **Response** (`200 OK`):
  ```json
  {
    "logs": [
      {
        "log_id": "ETL9023",
        "timestamp": "2026-06-08T10:00:00.000Z",
        "pipeline_name": "EMR Patient Ensembles Sync",
        "status": "COMPLETED",
        "records_extracted": 100,
        "records_transformed": 100,
        "records_loaded": 100,
        "duration_ms": 1450,
        "details": "Synchronized 100 patients. Imputed 5 records containing missing glucose levels."
      }
    ]
  }
  ```

### 2.2 POST (Execute Pipeline / Sync)
Ingest raw EMR records, trigger median-based data cleansing, and load results into the Star Schema tables.
- **Request Body**: Accepts raw CSV text file or triggers automated sync pipeline.

---

## 3. Machine Learning API (`/api/ml`)

Trains, evaluates, and registers predictive models.

### 3.1 GET (ML Models Status)
Check training metadata, performance metrics, and serialized active champion classifiers.
- **Response** (`200 OK`):
  ```json
  {
    "active_champion": {
      "model_name": "RandomForest v1.0",
      "model_type": "random_forest",
      "trained_at": "2026-06-08T09:30:00Z",
      "metrics": {
        "accuracy": 82.5,
        "precision": 81.2,
        "recall": 84.0,
        "f1": 82.6
      }
    }
  }
  ```

### 3.2 POST (Run Training Pipeline)
Train Random Forest, Logistic Regression, and Decision Tree classifiers on current DWH visit records. Selects and registers the best performing champion automatically.
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "champion": "random_forest",
    "accuracy": 82.5
  }
  ```

---

## 4. Prediction Inference API (`/api/predictions`)

Runs real-time clinical screening.

### 4.1 GET (Prediction Registry)
List patient screening audit records.

### 4.2 POST (Run Risk Inference)
Runs predictions for a patient using the active serialized model or clinical heuristics.
- **Request Body**:
  ```json
  {
    "patient_id": "P001",
    "pregnancies": 6,
    "glucose": 148,
    "blood_pressure": 72,
    "skin_thickness": 35,
    "insulin": 80,
    "bmi": 33.6,
    "diabetes_pedigree": 0.627,
    "age": 45,
    "disease_type": "diabetes"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "prediction": {
      "prediction_id": "PRED8492",
      "patient_id": "P001",
      "patient_name": "Sarah Jenkins",
      "timestamp": "2026-06-08T11:00:00.000Z",
      "model_used": "Trained RandomForest v1.0",
      "risk_score": 82.5,
      "confidence_score": 90.0,
      "recommendations": [
        "Consult doctor immediately.",
        "Schedule blood test.",
        "Monitor glucose level.",
        "Improve diet."
      ],
      "result": "High Diabetes Risk"
    },
    "details": "🤖 Decision Support System (ML Inferred): Warning! High Risk of Type 2 Diabetes."
  }
  ```

---

## 5. Analytics Mining API (`/api/analytics`)

Runs advanced data mining algorithms on-demand.

### 5.1 GET (K-Means & Apriori Rules)
Runs K-Means Clustering and Apriori Association Rules.
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "stats": { "total_predictions": 12, "risk_splits": { "high": 4, "moderate": 5, "low": 3 } },
    "clustering": [
      {
        "clusterId": 0,
        "name": "Low Risk",
        "centroid": { "glucose": 95.0, "blood_pressure": 72.0, "bmi": 22.0, "age": 28.0 },
        "points": [...]
      }
    ],
    "association_rules": [
      {
        "antecedent": ["Obesity"],
        "consequent": ["Diabetes"],
        "support": 15.0,
        "confidence": 75.0,
        "lift": 1.5
      }
    ]
  }
  ```
