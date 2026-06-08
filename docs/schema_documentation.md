# Database & Data Warehouse Schema Documentation

This document describes the Star Schema modeling, indexing structure, and relational integrity constraints designed for the **AI-Driven Healthcare Decision Support System**.

---

## 1. Dimensional Modeling Paradigm

The Data Warehouse (DWH) is structured as a **Star Schema** to optimize query performance, simplify dimensional aggregations, and support rapid analytics. In this design:
- A single central **Fact Table** (`fact_patient_visit`) contains clinical parameters, risk percentages, and foreign keys.
- Four **Dimension Tables** (`dim_patient`, `dim_doctor`, `dim_disease`, `dim_time`) enclose demographical, operational, and chronological contexts.

```
                  +------------------+
                  |    dim_patient   |
                  +------------------+
                  | patient_id (PK)  | <---------+
                  | patient_name     |           |
                  | age, gender      |           |
                  | address, contact |           |
                  +------------------+           |
                                                 |
+----------------+      +--------------------+   |   +----------------+
|   dim_doctor   |      | fact_patient_visit |   |   |  dim_disease   |
+----------------+      +--------------------+   |   +----------------+
| doctor_id (PK) | <--- | visit_id (PK)      |   |   | disease_id(PK) |
| doctor_name    |      | patient_id (FK) ---+---|-> | disease_name   |
| specialization |      | doctor_id (FK)     |   |   +----------------+
+----------------+      | disease_id (FK) ---+---+
                        | time_id (FK)       |   |
                        | pregnancies        |   |
                        | glucose, insulin   |   |   +----------------+
                        | blood_pressure     |   |   |    dim_time    |
                        | skin_thickness     |   |   +----------------+
                        | bmi, pedigree      |   +-> | time_id (PK)   |
                        | prediction_result  |       | day            |
                        | risk_score         |       | month, year    |
                        +--------------------+       +----------------+
```

---

## 2. Table Structures

### 2.1 dim_patient (Patient Dimension)
Contains unique patient records.
| Column Name | Data Type | Key / Constraint | Description |
| :--- | :--- | :--- | :--- |
| `patient_id` | `VARCHAR(50)` | Primary Key | Unique patient identifier |
| `patient_name` | `VARCHAR(100)` | Not Null | Full name of patient |
| `age` | `INT` | Not Null | Age in years |
| `gender` | `VARCHAR(10)` | Not Null | Patient gender (Male/Female) |
| `address` | `VARCHAR(255)` | - | Home address |
| `contact` | `VARCHAR(20)` | - | Mobile/telephone number |

### 2.2 dim_doctor (Doctor Dimension)
Contains details of clinical professionals.
| Column Name | Data Type | Key / Constraint | Description |
| :--- | :--- | :--- | :--- |
| `doctor_id` | `VARCHAR(50)` | Primary Key | Unique doctor identifier |
| `doctor_name` | `VARCHAR(100)` | Not Null | Full name of doctor |
| `specialization`| `VARCHAR(100)` | Not Null | Primary specialization (e.g. Cardiology) |

### 2.3 dim_disease (Disease Dimension)
Catalog of target diseases.
| Column Name | Data Type | Key / Constraint | Description |
| :--- | :--- | :--- | :--- |
| `disease_id` | `VARCHAR(50)` | Primary Key | Unique disease identifier |
| `disease_name` | `VARCHAR(100)` | Not Null | Academic name of disease |

### 2.4 dim_time (Time Dimension)
Chronological lookup table.
| Column Name | Data Type | Key / Constraint | Description |
| :--- | :--- | :--- | :--- |
| `time_id` | `VARCHAR(50)` | Primary Key | Formatted date key (e.g. `T20260601`) |
| `day` | `INT` | Not Null | Day of month (1-31) |
| `month` | `INT` | Not Null | Month number (1-12) |
| `year` | `INT` | Not Null | Calendar year (e.g. 2026) |

### 2.5 fact_patient_visit (Fact Table)
Stores clinical visits, 8 predictive features, prediction outputs, and risk assessments.
| Column Name | Data Type | Key / Constraint | Description |
| :--- | :--- | :--- | :--- |
| `visit_id` | `VARCHAR(50)` | Primary Key | Unique visit encounter key |
| `patient_id` | `VARCHAR(50)` | Foreign Key | Reference to `dim_patient` |
| `doctor_id` | `VARCHAR(50)` | Foreign Key | Reference to `dim_doctor` |
| `disease_id` | `VARCHAR(50)` | Foreign Key | Reference to `dim_disease` |
| `time_id` | `VARCHAR(50)` | Foreign Key | Reference to `dim_time` |
| `pregnancies` | `INT` | Default 0 | Clinical feature 1 |
| `glucose` | `DOUBLE` | - | Clinical feature 2 (mg/dL) |
| `blood_pressure`| `INT` | - | Clinical feature 3 (mmHg) |
| `skin_thickness`| `DOUBLE` | Default 0 | Clinical feature 4 (mm) |
| `insulin` | `DOUBLE` | - | Clinical feature 5 (uIU/mL) |
| `bmi` | `DOUBLE` | - | Clinical feature 6 (kg/m²) |
| `diabetes_pedigree`| `DOUBLE` | Default 0.35 | Clinical feature 7 |
| `prediction_result`| `VARCHAR(50)` | - | ML/Heuristic output classification |
| `risk_score` | `DOUBLE` | - | Probability percentage (0-100%) |

---

## 3. Database Indexes

To accelerate data warehouse query aggregations (such as grouping risk trends by month or disease type), custom indices are declared on all foreign keys inside the fact table:

```sql
CREATE INDEX idx_fact_patient ON fact_patient_visit(patient_id);
CREATE INDEX idx_fact_doctor ON fact_patient_visit(doctor_id);
CREATE INDEX idx_fact_disease ON fact_patient_visit(disease_id);
CREATE INDEX idx_fact_time ON fact_patient_visit(time_id);
```

---

## 4. Referential Integrity & Cascade Deletes

To maintain structural integrity and prevent orphaned rows when patient records are removed:
1. **Cascade Deletes**: Foreign key constraints in MySQL are configured with `ON DELETE CASCADE`. When a patient card is deleted from `dim_patient`, all corresponding encounter records are deleted automatically from `fact_patient_visit`.
2. **JSON Fallback Simulation**: For deployments using the file system database fallback (`data/db.json`), the delete utility in `src/utils/db.ts` programmatically performs the cascade:
   ```typescript
   db.dim_patient = db.dim_patient.filter(p => p.patient_id !== patientId);
   db.fact_patient_visit = db.fact_patient_visit.filter(v => v.patient_id !== patientId);
   db.predictions = db.predictions.filter(p => p.patient_id !== patientId);
   ```
