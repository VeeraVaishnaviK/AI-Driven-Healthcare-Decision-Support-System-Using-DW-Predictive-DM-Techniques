import { NextResponse } from 'next/server';
import { getPredictions, savePrediction, getPatients } from '@/utils/db';

export async function GET() {
  try {
    const history = await getPredictions();
    return NextResponse.json({ history });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { patient_id, glucose, blood_pressure, insulin, bmi, disease_type } = body;

    if (!glucose || !blood_pressure || !bmi || !disease_type) {
      return NextResponse.json({ error: 'Missing required clinical indicators' }, { status: 400 });
    }

    // Resolve patient name
    let patientName = 'Unknown Patient';
    if (patient_id) {
      const patients = await getPatients();
      const patient = patients.find(p => p.patient_id === patient_id);
      if (patient) {
        patientName = patient.patient_name;
      }
    }

    const gVal = Number(glucose);
    const bpVal = Number(blood_pressure);
    const iVal = Number(insulin || 0);
    const bmiVal = Number(bmi);

    // Dynamic predictive score modeling (heuristic-based)
    let score = 10; // baseline
    let details = 'Patient indicators reside within acceptable clinical ranges. Continue standard preventative screening.';
    let classification = 'Low Risk / Normal';

    if (disease_type === 'diabetes') {
      // Diabetes Risk Criteria (ADA Guidelines: Fasting Glucose > 100 is prediabetic, >125 diabetic)
      if (gVal >= 126) {
        score += 45;
      } else if (gVal >= 100) {
        score += 25;
      }

      if (bmiVal >= 30) {
        score += 20;
      } else if (bmiVal >= 25) {
        score += 10;
      }

      if (iVal > 150) {
        score += 15;
      }

      if (score >= 70) {
        classification = 'High Diabetes Risk';
        details = 'Warning: Elevated fasting glucose and BMI indicate strong likelihood of Type 2 Diabetes. Recommend ordering a confirmatory HbA1c test, initiating nutritional counseling, and monitoring glycemic response.';
      } else if (score >= 40) {
        classification = 'Moderate Risk (Prediabetic)';
        details = 'Note: Borderline glucose levels and weight indicate mild insulin resistance. Recommend lifestyle intervention, carbohydrate-conscious diet, and repeating lab tests in 6 months.';
      }
    } else if (disease_type === 'hypertension') {
      // Hypertension Criteria (AHA Guidelines: Systolic > 130 is Stage 1, >140 Stage 2)
      if (bpVal >= 140) {
        score += 50;
      } else if (bpVal >= 130) {
        score += 30;
      }

      if (bmiVal >= 30) {
        score += 15;
      }

      if (score >= 65) {
        classification = 'Stage 2 Hypertension Risk';
        details = 'Warning: Blood pressure exceeds 140 mmHg. Strongly recommend initiating pharmacological evaluation (ACE inhibitors/ARBs), implementing low-sodium DASH diet, and tracking daily home blood pressure readings.';
      } else if (score >= 35) {
        classification = 'Stage 1 Hypertension Risk';
        details = 'Note: Elevated blood pressure detected. Recommend structural diet modification, weight reduction strategies, and scheduling a follow-up assessment within 4 weeks.';
      }
    } else if (disease_type === 'cardiac') {
      // Cardiovascular indicators based on BP, Glucose, BMI
      if (bpVal >= 140) score += 25;
      if (gVal >= 120) score += 20;
      if (bmiVal >= 30) score += 20;
      if (bmiVal >= 25) score += 10;

      if (score >= 60) {
        classification = 'High Cardiovascular Risk';
        details = 'Warning: Co-occurrence of metabolic risk factors (hypertension and obesity) heightens arterial cardiovascular risk. Recommend scheduling a stress test, lipid panel screening, and evaluating lipid-lowering therapies (statins).';
      } else if (score >= 30) {
        classification = 'Moderate Cardiovascular Risk';
        details = 'Note: Combined indicators suggest mild arterial stress. Recommend active cardiovascular exercise program (150 mins/week) and optimization of diet.';
      }
    }

    // Ensure score is capped at 99.9%
    score = Math.min(score, 98.8);
    score = Math.round(score * 10) / 10;

    const predictionId = `PRED${Math.floor(1000 + Math.random() * 9000)}`;
    const newPred = {
      prediction_id: predictionId,
      patient_id: patient_id || 'WALK_IN',
      patient_name: patientName,
      timestamp: new Date().toISOString(),
      model_used: disease_type === 'diabetes' 
        ? 'Diabetes Risk Classifier v1.2' 
        : disease_type === 'hypertension' 
          ? 'Hypertension Classifier v1.1' 
          : 'Cardiovascular Risk Model v2.0',
      inputs: {
        glucose: gVal,
        blood_pressure: bpVal,
        insulin: iVal,
        bmi: bmiVal
      },
      risk_score: score,
      result: classification
    };

    await savePrediction(newPred);

    return NextResponse.json({
      success: true,
      prediction: newPred,
      details
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
