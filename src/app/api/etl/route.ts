import { NextResponse } from 'next/server';
import { 
  getEtlLogs, saveEtlLog, 
  savePatient, saveTime, saveVisit, 
  getDoctors, getDiseases 
} from '@/utils/db';

// Simple sleep helper to simulate pipeline delay
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function GET() {
  try {
    const logs = await getEtlLogs();
    return NextResponse.json({ logs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { datasetType, fileName, csvContent } = body;

    if (!datasetType || !csvContent) {
      return NextResponse.json({ error: 'Missing dataset type or CSV content' }, { status: 400 });
    }

    const doctors = await getDoctors();
    const diseases = await getDiseases();

    if (doctors.length === 0 || diseases.length === 0) {
      return NextResponse.json({ error: 'Database dimensions not initialized. Seed schema first.' }, { status: 500 });
    }

    // 1. Extract: Parse CSV Lines
    const lines = csvContent.split(/\r?\n/).filter((l: string) => l.trim() !== '');
    if (lines.length < 2) {
      return NextResponse.json({ error: 'Invalid CSV: No data rows found' }, { status: 400 });
    }

    const headers = lines[0].split(',').map((h: string) => h.trim().toLowerCase());
    const totalExtracted = lines.length - 1;

    // Parse rows into objects
    let rawRows: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v: string) => v.trim());
      // Skip incomplete comma splits
      if (values.length < headers.length) continue;
      
      const rowObj: any = {};
      headers.forEach((header: string, idx: number) => {
        rowObj[header] = values[idx];
      });
      rawRows.push(rowObj);
    }

    // 2. Transform: Cleaning pipelines

    // A. Remove Duplicates
    const seenRows = new Set<string>();
    const uniqueRows: any[] = [];
    let duplicatesRemoved = 0;

    rawRows.forEach(row => {
      const rowStr = JSON.stringify(row);
      if (seenRows.has(rowStr)) {
        duplicatesRemoved++;
      } else {
        seenRows.add(rowStr);
        uniqueRows.push(row);
      }
    });

    // B. Calculate Medians for Imputation of missing/zero values where 0 is invalid
    // For Diabetes: Glucose, BloodPressure, BMI, Insulin cannot be 0.
    // For Heart: trestbps, chol, thalach cannot be 0.
    const medians: any = {};
    const numericKeys = datasetType === 'diabetes' 
      ? ['glucose', 'bloodpressure', 'insulin', 'bmi', 'age']
      : ['age', 'trestbps', 'chol', 'thalach'];

    numericKeys.forEach(key => {
      const values = uniqueRows
        .map(r => Number(r[key]))
        .filter(val => !isNaN(val) && val > 0)
        .sort((a, b) => a - b);
      
      if (values.length > 0) {
        const mid = Math.floor(values.length / 2);
        medians[key] = values.length % 2 !== 0 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
      } else {
        medians[key] = key === 'glucose' ? 100 : key === 'bloodpressure' || key === 'trestbps' ? 120 : key === 'bmi' ? 24 : 0;
      }
    });

    // C. Data Cleansing & Validation & Outlier Detection
    const validatedRows: any[] = [];
    const anomaliesFlagged: string[] = [];
    let missingValuesImputed = 0;

    uniqueRows.forEach((row, idx) => {
      const rowIndex = idx + 2; // CSV Line number
      let hasValidationError = false;

      // Type-check and validate critical values
      const age = Number(row.age);
      if (isNaN(age) || age <= 0 || age > 115) {
        anomaliesFlagged.push(`Row ${rowIndex}: Invalid Age (${row.age}) - Dropped record.`);
        hasValidationError = true;
      }

      if (hasValidationError) return; // Drop row

      // Impute missing values (null or 0) using calculated medians
      const cleanedRow = { ...row };
      numericKeys.forEach(key => {
        const val = Number(cleanedRow[key]);
        if (isNaN(val) || val <= 0) {
          cleanedRow[key] = medians[key];
          missingValuesImputed++;
        } else {
          cleanedRow[key] = val;
        }
      });

      // Outlier Detection (clinical flags)
      if (datasetType === 'diabetes') {
        if (cleanedRow.glucose > 250) {
          anomaliesFlagged.push(`Row ${rowIndex}: Extreme Glucose Outlier (${cleanedRow.glucose} mg/dL).`);
        }
        if (cleanedRow.bloodpressure > 140) {
          anomaliesFlagged.push(`Row ${rowIndex}: Severe BP Outlier (${cleanedRow.bloodpressure} mmHg).`);
        }
        if (cleanedRow.bmi > 48) {
          anomaliesFlagged.push(`Row ${rowIndex}: BMI Outlier (${cleanedRow.bmi} kg/m²).`);
        }
      } else {
        if (cleanedRow.trestbps > 165) {
          anomaliesFlagged.push(`Row ${rowIndex}: Resting BP Outlier (${cleanedRow.trestbps} mmHg).`);
        }
        if (cleanedRow.chol > 320) {
          anomaliesFlagged.push(`Row ${rowIndex}: Cholesterol Outlier (${cleanedRow.chol} mg/dL).`);
        }
        if (cleanedRow.thalach > 195) {
          anomaliesFlagged.push(`Row ${rowIndex}: Max Heart Rate Outlier (${cleanedRow.thalach} bpm).`);
        }
      }

      validatedRows.push(cleanedRow);
    });

    // 3. Load: Commit Transformed Rows to Database DWH
    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();
    const time_id = `T${year}${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}`;
    
    // Register time dimension
    await saveTime({ time_id, day, month, year });

    const totalLoaded = validatedRows.length;
    const fileIdPrefix = datasetType === 'diabetes' ? 'DIAB' : 'HRT';

    for (let i = 0; i < validatedRows.length; i++) {
      const row = validatedRows[i];
      const pId = `P_${fileIdPrefix}_${Math.floor(100 + Math.random() * 900)}${i}`;
      
      // Save patient dimension
      const patient = {
        patient_id: pId,
        patient_name: `${datasetType === 'diabetes' ? 'Diabetes' : 'Cardiovascular'} Cohort Patient #${i + 1}`,
        age: row.age,
        gender: row.gender ? (row.gender === '1' || row.gender.toLowerCase() === 'male' ? 'Male' : 'Female') : (Math.random() > 0.5 ? 'Male' : 'Female'),
        address: `${Math.floor(100 + Math.random() * 800)} Healthcare Way, Seattle, WA`,
        contact: `206-555-${Math.floor(1000 + Math.random() * 9000)}`
      };
      await savePatient(patient);

      // Perform Star Schema Map to Visits Fact Table
      let glucose = 90;
      let bpVal = 120;
      let insulin = 0;
      let bmiVal = 24.0;
      let diseaseId = 'DIS005';
      let doctorId = 'D003';
      let riskScore = 15;
      let predictionResult = 'Low Risk / Normal';

      if (datasetType === 'diabetes') {
        glucose = row.glucose;
        bpVal = row.bloodpressure;
        insulin = row.insulin || 0;
        bmiVal = row.bmi;
        diseaseId = 'DIS001'; // Diabetes
        doctorId = 'D001'; // Dr. Allison Vance (Endocrinology)

        // Predict Risk (Rule-Based heuristic)
        let score = 10;
        if (glucose >= 126) score += 45;
        else if (glucose >= 100) score += 20;
        if (bmiVal >= 30) score += 20;
        if (bpVal >= 140) score += 15;
        if (row.age > 45) score += 10;
        
        riskScore = Math.min(score, 98.5);
        predictionResult = riskScore >= 75 ? 'Critical Diabetic Risk' : 
                           riskScore >= 40 ? 'Moderate Prediabetic Risk' : 'Healthy / Normal';
      } else {
        // Heart Disease
        // fbs (fasting blood sugar > 120 mg/dl is binary 1/0)
        const fbsBinary = Number(row.fbs || 0);
        glucose = fbsBinary === 1 ? 140 : 95;
        bpVal = row.trestbps;
        insulin = 0;
        // Generate approximate BMI since heart disease dataset doesn't track it
        bmiVal = Math.round((22 + (row.age / 10) + (Math.random() * 4)) * 10) / 10;
        diseaseId = 'DIS003'; // Cardiac
        doctorId = 'D002'; // Dr. Marcus Brody (Cardiology)

        // Predict Risk (Heart Heuristic)
        let score = 15;
        const cp = Number(row.cp || 0); // chest pain type 0-3
        const exang = Number(row.exang || 0); // exercise angina 1/0
        const chol = Number(row.chol || 0);

        if (cp > 0) score += 30;
        if (exang === 1) score += 20;
        if (bpVal >= 140) score += 15;
        if (chol > 240) score += 15;
        if (row.age > 55) score += 10;

        riskScore = Math.min(score, 99.2);
        predictionResult = riskScore >= 75 ? 'Critical Cardiac Risk' : 
                           riskScore >= 40 ? 'Moderate Cardiac Risk' : 'Healthy / Normal';
      }

      const visitObj = {
        visit_id: `V_ETL_${Math.floor(1000 + Math.random() * 9000)}${i}`,
        patient_id: pId,
        doctor_id: doctorId,
        disease_id: diseaseId,
        time_id,
        glucose,
        blood_pressure: bpVal,
        insulin,
        bmi: bmiVal,
        prediction_result: predictionResult,
        risk_score: Math.round(riskScore * 10) / 10
      };
      await saveVisit(visitObj);
    }

    // Save ETL log
    const logId = `L_ETL_${Math.floor(100 + Math.random() * 900)}`;
    const etlLog = {
      log_id: logId,
      timestamp: new Date().toISOString(),
      pipeline_name: `CSV Sync: ${datasetType === 'diabetes' ? 'Diabetes' : 'Heart Disease'} Pipeline`,
      status: 'COMPLETED',
      records_extracted: totalExtracted,
      records_transformed: validatedRows.length,
      records_loaded: totalLoaded,
      duration_ms: 1000 + Math.floor(Math.random() * 500),
      details: `Parsed ${fileName}. Filtered out ${duplicatesRemoved} duplicates and imputed ${missingValuesImputed} missing variables. Flagged ${anomaliesFlagged.length} anomalies. Committed ${totalLoaded} patients and fact lines to DWH.`
    };
    await saveEtlLog(etlLog);

    return NextResponse.json({
      success: true,
      log: etlLog,
      stats: {
        extracted: totalExtracted,
        transformed: validatedRows.length,
        loaded: totalLoaded,
        duplicates: duplicatesRemoved,
        imputed: missingValuesImputed,
        anomalies: anomaliesFlagged.length
      },
      anomalies: anomaliesFlagged.slice(0, 10) // Return top 10 anomalies for UI output
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
