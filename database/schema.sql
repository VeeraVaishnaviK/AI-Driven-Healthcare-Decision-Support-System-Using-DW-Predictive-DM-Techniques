-- AI-Driven Healthcare Decision Support System
-- Data Warehouse Star Schema Definition (MySQL)

CREATE DATABASE IF NOT EXISTS healthcare_dwh;
USE healthcare_dwh;

-- Drop tables if they exist (ordered by dependencies)
DROP TABLE IF EXISTS fact_patient_visit;
DROP TABLE IF EXISTS dim_time;
DROP TABLE IF EXISTS dim_disease;
DROP TABLE IF EXISTS dim_doctor;
DROP TABLE IF EXISTS dim_patient;

-- 1. Dimension Table: Patients
CREATE TABLE dim_patient (
    patient_id VARCHAR(50) PRIMARY KEY,
    patient_name VARCHAR(100) NOT NULL,
    age INT NOT NULL,
    gender VARCHAR(10) NOT NULL,
    address VARCHAR(255),
    contact VARCHAR(20)
);

-- 2. Dimension Table: Doctors
CREATE TABLE dim_doctor (
    doctor_id VARCHAR(50) PRIMARY KEY,
    doctor_name VARCHAR(100) NOT NULL,
    specialization VARCHAR(100) NOT NULL
);

-- 3. Dimension Table: Diseases
CREATE TABLE dim_disease (
    disease_id VARCHAR(50) PRIMARY KEY,
    disease_name VARCHAR(100) NOT NULL
);

-- 4. Dimension Table: Time
CREATE TABLE dim_time (
    time_id VARCHAR(50) PRIMARY KEY,
    day INT NOT NULL,
    month INT NOT NULL,
    year INT NOT NULL
);

-- 5. Fact Table: Patient Visits
CREATE TABLE fact_patient_visit (
    visit_id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL,
    doctor_id VARCHAR(50) NOT NULL,
    disease_id VARCHAR(50) NOT NULL,
    time_id VARCHAR(50) NOT NULL,
    glucose DOUBLE,
    blood_pressure INT,
    insulin DOUBLE,
    bmi DOUBLE,
    prediction_result VARCHAR(50),
    risk_score DOUBLE,
    FOREIGN KEY (patient_id) REFERENCES dim_patient(patient_id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES dim_doctor(doctor_id) ON DELETE CASCADE,
    FOREIGN KEY (disease_id) REFERENCES dim_disease(disease_id) ON DELETE CASCADE,
    FOREIGN KEY (time_id) REFERENCES dim_time(time_id) ON DELETE CASCADE
);

-- Indexing for optimized querying in Star Schema
CREATE INDEX idx_fact_patient ON fact_patient_visit(patient_id);
CREATE INDEX idx_fact_doctor ON fact_patient_visit(doctor_id);
CREATE INDEX idx_fact_disease ON fact_patient_visit(disease_id);
CREATE INDEX idx_fact_time ON fact_patient_visit(time_id);

-- Insert Sample Dimension Data
INSERT INTO dim_patient (patient_id, patient_name, age, gender, address, contact) VALUES
('P001', 'Sarah Jenkins', 45, 'Female', '123 Pine St, Seattle, WA', '206-555-0143'),
('P002', 'David Chen', 62, 'Male', '456 Oak Ave, Bellevue, WA', '425-555-0188'),
('P003', 'Elena Rodriguez', 29, 'Female', '789 Maple Rd, Tacoma, WA', '253-555-0121'),
('P004', 'James Wilson', 71, 'Male', '321 Elm Dr, Redmond, WA', '425-555-0155'),
('P005', 'Amina Yusuf', 38, 'Female', '654 Birch Ln, Kent, WA', '206-555-0199'),
('P006', 'Robert Miller', 54, 'Male', '987 Cedar Way, Everett, WA', '425-555-0137');

INSERT INTO dim_doctor (doctor_id, doctor_name, specialization) VALUES
('D001', 'Dr. Allison Vance', 'Endocrinology'),
('D002', 'Dr. Marcus Brody', 'Cardiology'),
('D003', 'Dr. Evelyn Foster', 'General Medicine'),
('D004', 'Dr. Sanjay Patel', 'Nephrology');

INSERT INTO dim_disease (disease_id, disease_name) VALUES
('DIS001', 'Diabetes Mellitus'),
('DIS002', 'Hypertension'),
('DIS003', 'Coronary Artery Disease'),
('DIS004', 'Chronic Kidney Disease'),
('DIS005', 'General Screening / Healthy');

INSERT INTO dim_time (time_id, day, month, year) VALUES
('T20260601', 1, 6, 2026),
('T20260602', 2, 6, 2026),
('T20260603', 3, 6, 2026),
('T20260604', 4, 6, 2026),
('T20260605', 5, 6, 2026),
('T20260606', 6, 6, 2026),
('T20260607', 7, 6, 2026),
('T20260608', 8, 6, 2026);

-- Insert Sample Fact Data
INSERT INTO fact_patient_visit (visit_id, patient_id, doctor_id, disease_id, time_id, glucose, blood_pressure, insulin, bmi, prediction_result, risk_score) VALUES
('V001', 'P001', 'D001', 'DIS001', 'T20260601', 148.0, 130, 80.0, 33.6, 'Diabetic Risk Detected', 82.5),
('V002', 'P002', 'D002', 'DIS002', 'T20260602', 110.0, 145, 0.0, 28.2, 'Hypertension Risk Detected', 74.0),
('V003', 'P003', 'D003', 'DIS005', 'T20260603', 85.0, 115, 0.0, 22.4, 'Low Risk / Normal', 12.5),
('V004', 'P004', 'D004', 'DIS004', 'T20260604', 130.0, 138, 95.0, 29.8, 'Kidney Stress Detected', 68.0),
('V005', 'P005', 'D001', 'DIS005', 'T20260605', 99.0, 120, 0.0, 24.1, 'Low Risk / Normal', 18.0),
('V006', 'P006', 'D002', 'DIS003', 'T20260606', 155.0, 160, 110.0, 31.2, 'High Cardiac Risk', 89.2);
