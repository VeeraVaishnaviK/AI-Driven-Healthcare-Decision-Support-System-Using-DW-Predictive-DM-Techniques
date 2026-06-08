import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';

// Path to local JSON database fallback
const jsonDbPath = path.join(process.cwd(), 'data', 'db.json');

// Interface structures
export interface Patient {
  patient_id: string;
  patient_name: string;
  age: number;
  gender: string;
  address: string;
  contact: string;
}

export interface Doctor {
  doctor_id: string;
  doctor_name: string;
  specialization: string;
}

export interface Disease {
  disease_id: string;
  disease_name: string;
}

export interface Time {
  time_id: string;
  day: number;
  month: number;
  year: number;
}

export interface PatientVisit {
  visit_id: string;
  patient_id: string;
  doctor_id: string;
  disease_id: string;
  time_id: string;
  glucose: number;
  blood_pressure: number;
  insulin: number;
  bmi: number;
  prediction_result: string;
  risk_score: number;
}

export interface EtlLog {
  log_id: string;
  timestamp: string;
  pipeline_name: string;
  status: string;
  records_extracted: number;
  records_transformed: number;
  records_loaded: number;
  duration_ms: number;
  details: string;
}

export interface PredictionHistory {
  prediction_id: string;
  patient_id: string;
  patient_name: string;
  timestamp: string;
  model_used: string;
  inputs: {
    glucose: number;
    blood_pressure: number;
    insulin: number;
    bmi: number;
  };
  risk_score: number;
  result: string;
}

// Function to establish MySQL pool if configuration exists
let pool: mysql.Pool | null = null;

function getMySQLPool(): mysql.Pool | null {
  const host = process.env.MYSQL_HOST || process.env.NEXT_PUBLIC_MYSQL_HOST;
  const user = process.env.MYSQL_USER;
  const password = process.env.MYSQL_PASSWORD;
  const database = process.env.MYSQL_DATABASE || 'healthcare_dwh';
  const port = parseInt(process.env.MYSQL_PORT || '3306', 10);

  if (!host || !user) {
    return null; // Not configured, use JSON fallback
  }

  if (!pool) {
    try {
      pool = mysql.createPool({
        host,
        user,
        password,
        database,
        port,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      });
    } catch (error) {
      console.error('Failed to create MySQL pool, falling back to JSON:', error);
      pool = null;
    }
  }

  return pool;
}

// Read JSON database helper
function readJsonDb(): any {
  try {
    if (!fs.existsSync(jsonDbPath)) {
      // Create empty db structures if file doesn't exist
      const defaultDb = {
        users: [{ email: "admin@healthcare.com", password: "admin123", name: "Dr. Vaishnav" }],
        dim_patient: [],
        dim_doctor: [],
        dim_disease: [],
        dim_time: [],
        fact_patient_visit: [],
        etl_logs: [],
        predictions: [],
        settings: {
          emr_endpoint: "https://api.healthcare-network.local/v1",
          sync_frequency: "daily",
          alert_threshold: 75,
          email_alerts: true,
          selected_model: "RandomForest v1.0"
        }
      };
      fs.writeFileSync(jsonDbPath, JSON.stringify(defaultDb, null, 2), 'utf-8');
      return defaultDb;
    }
    const data = fs.readFileSync(jsonDbPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading JSON DB file:', error);
    return {};
  }
}

// Write JSON database helper
function writeJsonDb(data: any): void {
  try {
    fs.writeFileSync(jsonDbPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing JSON DB file:', error);
  }
}

// ----------------------------------------------------
// DATABASE API IMPLEMENTATIONS
// ----------------------------------------------------

export async function getPatients(): Promise<Patient[]> {
  const mysqlPool = getMySQLPool();
  if (mysqlPool) {
    try {
      const [rows] = await mysqlPool.query('SELECT * FROM dim_patient');
      return rows as Patient[];
    } catch (error) {
      console.warn('MySQL getPatients query failed, using JSON fallback:', error);
    }
  }
  return readJsonDb().dim_patient || [];
}

export async function savePatient(patient: Patient): Promise<void> {
  const mysqlPool = getMySQLPool();
  if (mysqlPool) {
    try {
      await mysqlPool.query(
        `INSERT INTO dim_patient (patient_id, patient_name, age, gender, address, contact) 
         VALUES (?, ?, ?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE 
         patient_name = VALUES(patient_name), age = VALUES(age), gender = VALUES(gender), 
         address = VALUES(address), contact = VALUES(contact)`,
        [patient.patient_id, patient.patient_name, patient.age, patient.gender, patient.address, patient.contact]
      );
      return;
    } catch (error) {
      console.warn('MySQL savePatient query failed, using JSON fallback:', error);
    }
  }

  const db = readJsonDb();
  db.dim_patient = db.dim_patient || [];
  const existingIdx = db.dim_patient.findIndex((p: Patient) => p.patient_id === patient.patient_id);
  if (existingIdx >= 0) {
    db.dim_patient[existingIdx] = patient;
  } else {
    db.dim_patient.push(patient);
  }
  writeJsonDb(db);
}

export async function getDoctors(): Promise<Doctor[]> {
  const mysqlPool = getMySQLPool();
  if (mysqlPool) {
    try {
      const [rows] = await mysqlPool.query('SELECT * FROM dim_doctor');
      return rows as Doctor[];
    } catch (error) {
      console.warn('MySQL getDoctors query failed, using JSON fallback:', error);
    }
  }
  return readJsonDb().dim_doctor || [];
}

export async function saveDoctor(doctor: Doctor): Promise<void> {
  const mysqlPool = getMySQLPool();
  if (mysqlPool) {
    try {
      await mysqlPool.query(
        `INSERT INTO dim_doctor (doctor_id, doctor_name, specialization) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE doctor_name = VALUES(doctor_name), specialization = VALUES(specialization)`,
        [doctor.doctor_id, doctor.doctor_name, doctor.specialization]
      );
      return;
    } catch (error) {
      console.warn('MySQL saveDoctor failed, using JSON:', error);
    }
  }
  const db = readJsonDb();
  db.dim_doctor = db.dim_doctor || [];
  const idx = db.dim_doctor.findIndex((d: Doctor) => d.doctor_id === doctor.doctor_id);
  if (idx >= 0) db.dim_doctor[idx] = doctor;
  else db.dim_doctor.push(doctor);
  writeJsonDb(db);
}

export async function getDiseases(): Promise<Disease[]> {
  const mysqlPool = getMySQLPool();
  if (mysqlPool) {
    try {
      const [rows] = await mysqlPool.query('SELECT * FROM dim_disease');
      return rows as Disease[];
    } catch (error) {
      console.warn('MySQL getDiseases query failed, using JSON fallback:', error);
    }
  }
  return readJsonDb().dim_disease || [];
}

export async function saveDisease(disease: Disease): Promise<void> {
  const mysqlPool = getMySQLPool();
  if (mysqlPool) {
    try {
      await mysqlPool.query(
        `INSERT INTO dim_disease (disease_id, disease_name) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE disease_name = VALUES(disease_name)`,
        [disease.disease_id, disease.disease_name]
      );
      return;
    } catch (error) {
      console.warn('MySQL saveDisease failed, using JSON:', error);
    }
  }
  const db = readJsonDb();
  db.dim_disease = db.dim_disease || [];
  const idx = db.dim_disease.findIndex((d: Disease) => d.disease_id === disease.disease_id);
  if (idx >= 0) db.dim_disease[idx] = disease;
  else db.dim_disease.push(disease);
  writeJsonDb(db);
}

export async function getTimes(): Promise<Time[]> {
  const mysqlPool = getMySQLPool();
  if (mysqlPool) {
    try {
      const [rows] = await mysqlPool.query('SELECT * FROM dim_time');
      return rows as Time[];
    } catch (error) {
      console.warn('MySQL getTimes query failed, using JSON fallback:', error);
    }
  }
  return readJsonDb().dim_time || [];
}

export async function saveTime(time: Time): Promise<void> {
  const mysqlPool = getMySQLPool();
  if (mysqlPool) {
    try {
      await mysqlPool.query(
        `INSERT INTO dim_time (time_id, day, month, year) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE day = VALUES(day), month = VALUES(month), year = VALUES(year)`,
        [time.time_id, time.day, time.month, time.year]
      );
      return;
    } catch (error) {
      console.warn('MySQL saveTime failed, using JSON:', error);
    }
  }
  const db = readJsonDb();
  db.dim_time = db.dim_time || [];
  const idx = db.dim_time.findIndex((t: Time) => t.time_id === time.time_id);
  if (idx >= 0) db.dim_time[idx] = time;
  else db.dim_time.push(time);
  writeJsonDb(db);
}

export async function getVisits(): Promise<PatientVisit[]> {
  const mysqlPool = getMySQLPool();
  if (mysqlPool) {
    try {
      const [rows] = await mysqlPool.query('SELECT * FROM fact_patient_visit');
      return rows as PatientVisit[];
    } catch (error) {
      console.warn('MySQL getVisits query failed, using JSON fallback:', error);
    }
  }
  return readJsonDb().fact_patient_visit || [];
}

export async function saveVisit(visit: PatientVisit): Promise<void> {
  const mysqlPool = getMySQLPool();
  if (mysqlPool) {
    try {
      await mysqlPool.query(
        `INSERT INTO fact_patient_visit (visit_id, patient_id, doctor_id, disease_id, time_id, glucose, blood_pressure, insulin, bmi, prediction_result, risk_score)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
         patient_id = VALUES(patient_id), doctor_id = VALUES(doctor_id), disease_id = VALUES(disease_id), time_id = VALUES(time_id),
         glucose = VALUES(glucose), blood_pressure = VALUES(blood_pressure), insulin = VALUES(insulin), bmi = VALUES(bmi),
         prediction_result = VALUES(prediction_result), risk_score = VALUES(risk_score)`,
        [visit.visit_id, visit.patient_id, visit.doctor_id, visit.disease_id, visit.time_id, visit.glucose, visit.blood_pressure, visit.insulin, visit.bmi, visit.prediction_result, visit.risk_score]
      );
      return;
    } catch (error) {
      console.warn('MySQL saveVisit failed, using JSON:', error);
    }
  }

  const db = readJsonDb();
  db.fact_patient_visit = db.fact_patient_visit || [];
  const idx = db.fact_patient_visit.findIndex((v: PatientVisit) => v.visit_id === visit.visit_id);
  if (idx >= 0) {
    db.fact_patient_visit[idx] = visit;
  } else {
    db.fact_patient_visit.push(visit);
  }
  writeJsonDb(db);
}

// ETL Log functions
export async function getEtlLogs(): Promise<EtlLog[]> {
  // Store ETL logs in JSON database for simplicity, or we can use mysql if table exists
  return readJsonDb().etl_logs || [];
}

export async function saveEtlLog(log: EtlLog): Promise<void> {
  const db = readJsonDb();
  db.etl_logs = db.etl_logs || [];
  db.etl_logs.unshift(log); // Add to beginning
  writeJsonDb(db);
}

// Prediction History functions
export async function getPredictions(): Promise<PredictionHistory[]> {
  return readJsonDb().predictions || [];
}

export async function savePrediction(pred: PredictionHistory): Promise<void> {
  const db = readJsonDb();
  db.predictions = db.predictions || [];
  db.predictions.unshift(pred);
  writeJsonDb(db);
}

// Settings functions
export async function getSettings(): Promise<any> {
  return readJsonDb().settings || {};
}

export async function saveSettings(settings: any): Promise<void> {
  const db = readJsonDb();
  db.settings = { ...db.settings, ...settings };
  writeJsonDb(db);
}

// Auth simulation
export async function authenticateUser(email: string, password: string): Promise<any> {
  const db = readJsonDb();
  const users = db.users || [];
  const user = users.find((u: any) => u.email === email && u.password === password);
  if (user) {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
  return null;
}
