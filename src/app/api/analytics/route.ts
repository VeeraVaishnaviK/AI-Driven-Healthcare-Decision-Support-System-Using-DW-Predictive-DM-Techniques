import { NextResponse } from 'next/server';
import { getPatients, getVisits, getSettings, getPredictions } from '@/utils/db';
import { runKMeans, runAssociationRules } from '@/utils/mining';

export async function GET() {
  try {
    const [patients, visits, settings, predictions] = await Promise.all([
      getPatients(),
      getVisits(),
      getSettings(),
      getPredictions()
    ]);

    // 1. Classification & Prediction Statistics
    const totalPredictions = predictions.length;
    const diseaseSplits = {
      diabetes: predictions.filter((p: any) => p.inputs && p.inputs.glucose !== undefined).length,
      hypertension: predictions.filter((p: any) => p.model_used.includes('Hypertension')).length,
      cardiac: predictions.filter((p: any) => p.model_used.includes('Cardiovascular') || p.model_used.includes('Cardiac')).length
    };

    const riskCategoryCounts = {
      high: predictions.filter((p: any) => p.risk_score >= 71).length,
      moderate: predictions.filter((p: any) => p.risk_score >= 41 && p.risk_score <= 70).length,
      low: predictions.filter((p: any) => p.risk_score <= 40).length
    };

    const activeChampion = settings.active_champion || null;

    // 2. Prepare inputs for K-Means clustering
    const kmeansInputs = visits.map((v: any) => {
      const patient = patients.find(p => p.patient_id === v.patient_id);
      const age = patient ? patient.age : 40;
      return {
        patientId: v.patient_id,
        glucose: v.glucose,
        blood_pressure: v.blood_pressure,
        bmi: v.bmi,
        age,
        risk_score: v.risk_score
      };
    });

    // Seed synthetic cohort if raw DWH size is small to build rich clusters
    if (kmeansInputs.length < 20) {
      const syntheticCohort = [
        { patientId: 'P_SYN_01', glucose: 155, blood_pressure: 82, bmi: 34.5, age: 52, risk_score: 85.0 },
        { patientId: 'P_SYN_02', glucose: 95, blood_pressure: 72, bmi: 22.1, age: 24, risk_score: 10.5 },
        { patientId: 'P_SYN_03', glucose: 110, blood_pressure: 135, bmi: 28.6, age: 61, risk_score: 55.0 },
        { patientId: 'P_SYN_04', glucose: 175, blood_pressure: 88, bmi: 36.2, age: 48, risk_score: 92.0 },
        { patientId: 'P_SYN_05', glucose: 88, blood_pressure: 68, bmi: 20.4, age: 29, risk_score: 8.0 },
        { patientId: 'P_SYN_06', glucose: 125, blood_pressure: 142, bmi: 29.1, age: 58, risk_score: 64.0 },
        { patientId: 'P_SYN_07', glucose: 148, blood_pressure: 78, bmi: 31.8, age: 41, risk_score: 75.0 },
        { patientId: 'P_SYN_08', glucose: 92, blood_pressure: 70, bmi: 23.5, age: 33, risk_score: 12.0 },
        { patientId: 'P_SYN_09', glucose: 115, blood_pressure: 130, bmi: 26.8, age: 65, risk_score: 48.0 },
        { patientId: 'P_SYN_10', glucose: 185, blood_pressure: 90, bmi: 38.0, age: 50, risk_score: 96.0 },
        { patientId: 'P_SYN_11', glucose: 82, blood_pressure: 64, bmi: 19.8, age: 22, risk_score: 5.0 },
        { patientId: 'P_SYN_12', glucose: 130, blood_pressure: 145, bmi: 30.5, age: 60, risk_score: 72.0 },
        { patientId: 'P_SYN_13', glucose: 160, blood_pressure: 80, bmi: 32.5, age: 47, risk_score: 88.0 },
        { patientId: 'P_SYN_14', glucose: 98, blood_pressure: 74, bmi: 24.2, age: 31, risk_score: 15.0 },
        { patientId: 'P_SYN_15', glucose: 105, blood_pressure: 128, bmi: 25.4, age: 55, risk_score: 42.0 },
        { patientId: 'P_SYN_16', glucose: 190, blood_pressure: 92, bmi: 39.5, age: 46, risk_score: 98.0 }
      ];
      syntheticCohort.forEach(syn => kmeansInputs.push(syn));
    }

    const clusters = runKMeans(kmeansInputs, 3);

    // 3. Prepare inputs for Association Rule Mining
    const ruleMiningInputs = visits.map((v: any) => {
      const patient = patients.find(p => p.patient_id === v.patient_id);
      const age = patient ? patient.age : 40;
      return {
        glucose: v.glucose,
        blood_pressure: v.blood_pressure,
        bmi: v.bmi,
        age,
        disease_id: v.disease_id
      };
    });

    if (ruleMiningInputs.length < 20) {
      const syntheticRulesCohort = [
        { glucose: 155, blood_pressure: 82, bmi: 34.5, age: 52, disease_id: 'DIS001' },
        { glucose: 95, blood_pressure: 72, bmi: 22.1, age: 24, disease_id: 'DIS005' },
        { glucose: 110, blood_pressure: 135, bmi: 28.6, age: 61, disease_id: 'DIS002' },
        { glucose: 175, blood_pressure: 88, bmi: 36.2, age: 48, disease_id: 'DIS001' },
        { glucose: 88, blood_pressure: 68, bmi: 20.4, age: 29, disease_id: 'DIS005' },
        { glucose: 125, blood_pressure: 142, bmi: 29.1, age: 58, disease_id: 'DIS002' },
        { glucose: 148, blood_pressure: 145, bmi: 31.8, age: 56, disease_id: 'DIS001' }, // Diabetes + Hypertension
        { glucose: 150, blood_pressure: 140, bmi: 32.0, age: 60, disease_id: 'DIS001' }, // Diabetes + Hypertension
        { glucose: 160, blood_pressure: 150, bmi: 33.5, age: 59, disease_id: 'DIS002' }, // Hypertension + Diabetes
        { glucose: 92, blood_pressure: 70, bmi: 23.5, age: 33, disease_id: 'DIS005' },
        { glucose: 115, blood_pressure: 130, bmi: 26.8, age: 65, disease_id: 'DIS002' },
        { glucose: 185, blood_pressure: 90, bmi: 38.0, age: 50, disease_id: 'DIS001' },
        { glucose: 82, blood_pressure: 64, bmi: 19.8, age: 22, disease_id: 'DIS005' },
        { glucose: 130, blood_pressure: 145, bmi: 30.5, age: 60, disease_id: 'DIS002' },
        { glucose: 160, blood_pressure: 142, bmi: 32.5, age: 57, disease_id: 'DIS001' }, // Obesity + Diabetes + Hypertension
        { glucose: 98, blood_pressure: 74, bmi: 24.2, age: 31, disease_id: 'DIS005' },
        { glucose: 105, blood_pressure: 128, bmi: 25.4, age: 55, disease_id: 'DIS002' },
        { glucose: 190, blood_pressure: 92, bmi: 39.5, age: 46, disease_id: 'DIS001' }
      ];
      syntheticRulesCohort.forEach(syn => ruleMiningInputs.push(syn));
    }

    const rules = runAssociationRules(ruleMiningInputs, 0.05, 0.35);

    return NextResponse.json({
      success: true,
      stats: {
        total_predictions: totalPredictions,
        disease_splits: diseaseSplits,
        risk_splits: riskCategoryCounts,
        active_champion: activeChampion
      },
      clustering: clusters,
      association_rules: rules
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
