import { NextResponse } from 'next/server';
import { getPredictions, savePrediction, getPatients, getSettings } from '@/utils/db';
import { 
  RandomForestClassifier, 
  LogisticRegressionClassifier, 
  DecisionTreeClassifier 
} from '@/utils/ml';

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

    // Resolve patient details
    let patientName = 'Unknown Patient';
    let patientAge = 45; // default fallback
    let patientObj: any = null;

    if (patient_id) {
      const patients = await getPatients();
      patientObj = patients.find(p => p.patient_id === patient_id);
      if (patientObj) {
        patientName = patientObj.patient_name;
        patientAge = patientObj.age;
      }
    }

    const gVal = Number(glucose);
    const bpVal = Number(blood_pressure);
    const iVal = Number(insulin || 0);
    const bmiVal = Number(bmi);

    const settings = await getSettings();
    let score = 15;
    let classification = 'Low Risk / Normal';
    let details = 'Patient indicators reside within acceptable clinical ranges. Continue standard preventative screening.';
    let isMlInference = false;

    // Check if there is a trained model and the disease target is diabetes
    if (disease_type === 'diabetes' && settings.serialized_model_params && settings.serialized_model_type) {
      try {
        const featureVector = [gVal, bpVal, iVal, bmiVal, patientAge];
        const mType = settings.serialized_model_type;
        const mParams = settings.serialized_model_params;

        if (mType === 'logistic_regression') {
          const lr = new LogisticRegressionClassifier();
          lr.fromJSON(mParams);
          const prob = lr.predictProbability(featureVector);
          score = Math.round(prob * 1000) / 10;
          classification = score >= 50 ? 'High Diabetes Risk' : 'Low Diabetes Risk / Normal';
          isMlInference = true;
        } else if (mType === 'decision_tree') {
          const dt = new DecisionTreeClassifier();
          dt.fromJSON(mParams);
          const pred = dt.predict([featureVector])[0];
          score = pred === 1 ? 88.0 : 15.0;
          classification = pred === 1 ? 'High Diabetes Risk' : 'Low Diabetes Risk / Normal';
          isMlInference = true;
        } else if (mType === 'random_forest') {
          // Count tree votes to get probability score
          const rf = new RandomForestClassifier();
          rf.fromJSON(mParams);
          
          // Re-implement vote counting locally
          const trees = (rf as any).trees || [];
          let votesFor1 = 0;
          trees.forEach((tree: any) => {
            const pred = tree.predict([featureVector])[0];
            if (pred === 1) votesFor1++;
          });

          const prob = trees.length > 0 ? votesFor1 / trees.length : 0.5;
          score = Math.round(prob * 1000) / 10;
          classification = score >= 50 ? 'High Diabetes Risk' : 'Low Diabetes Risk / Normal';
          isMlInference = true;
        }

        if (classification.startsWith('High')) {
          details = `🤖 Decision Support System (ML Inferred via ${settings.active_champion.model_name}): Warning! Machine Learning algorithms detect a ${score}% risk of Type 2 Diabetes. Recommend ordering a confirmatory HbA1c test and initiating glycemic tracking.`;
        } else {
          details = `🤖 Decision Support System (ML Inferred via ${settings.active_champion.model_name}): Patient is classified as Low Risk (${score}% probability). Continue standard annual metabolic monitoring.`;
        }
      } catch (err) {
        console.error('ML inference failed, falling back to heuristic:', err);
      }
    }

    // Heuristics Fallback (or default for other diseases like heart/cardiac)
    if (!isMlInference) {
      if (disease_type === 'diabetes') {
        if (gVal >= 126) score += 45;
        else if (gVal >= 100) score += 25;
        if (bmiVal >= 30) score += 20;
        if (bpVal >= 140) score += 15;
        if (score >= 65) {
          classification = 'High Diabetes Risk';
          details = 'Warning: Elevated fasting glucose and BMI indicate likelihood of Type 2 Diabetes. Recommend HbA1c screening.';
        }
      } else if (disease_type === 'hypertension') {
        if (bpVal >= 140) score += 50;
        else if (bpVal >= 130) score += 30;
        if (bmiVal >= 30) score += 15;
        if (score >= 65) {
          classification = 'Stage 2 Hypertension Risk';
          details = 'Warning: Blood pressure exceeds 140 mmHg. Recommend pharmacological evaluation (ACE inhibitors/ARBs) and low-sodium DASH diet.';
        }
      } else if (disease_type === 'cardiac') {
        if (bpVal >= 140) score += 25;
        if (gVal >= 120) score += 20;
        if (bmiVal >= 30) score += 20;
        if (score >= 60) {
          classification = 'High Cardiovascular Risk';
          details = 'Warning: Metabolic markers indicate elevated arterial stress. Recommend stress test and lipid panels.';
        }
      }
      score = Math.min(score, 99.0);
    }

    const predictionId = `PRED${Math.floor(1000 + Math.random() * 9000)}`;
    const newPred = {
      prediction_id: predictionId,
      patient_id: patient_id || 'WALK_IN',
      patient_name: patientName,
      timestamp: new Date().toISOString(),
      model_used: isMlInference 
        ? `Trained ${settings.active_champion.model_name}`
        : disease_type === 'diabetes' 
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
