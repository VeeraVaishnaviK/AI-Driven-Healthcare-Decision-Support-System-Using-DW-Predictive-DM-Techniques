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
    const { 
      patient_id, 
      pregnancies, 
      glucose, 
      blood_pressure, 
      skin_thickness, 
      insulin, 
      bmi, 
      diabetes_pedigree, 
      age, 
      disease_type 
    } = body;

    if (!glucose || !blood_pressure || !bmi || !disease_type) {
      return NextResponse.json({ error: 'Missing required clinical indicators (glucose, blood pressure, BMI, and target disease are mandatory)' }, { status: 400 });
    }

    // Resolve patient details
    let patientName = 'Unknown Patient';
    let patientAge = Number(age || 45); // default fallback
    let patientObj: any = null;

    if (patient_id) {
      const patients = await getPatients();
      patientObj = patients.find(p => p.patient_id === patient_id);
      if (patientObj) {
        patientName = patientObj.patient_name;
        if (!age) {
          patientAge = patientObj.age;
        }
      }
    }

    const pregVal = Number(pregnancies || 0);
    const gVal = Number(glucose);
    const bpVal = Number(blood_pressure);
    const skinVal = Number(skin_thickness || 0);
    const iVal = Number(insulin || 0);
    const bmiVal = Number(bmi);
    const pedVal = Number(diabetes_pedigree || 0.35);
    const ageVal = Number(patientAge);

    const settings = await getSettings();
    let score = 15;
    let confidence = 80.0;
    let classification = 'Low Risk / Normal';
    let details = 'Patient indicators reside within acceptable clinical ranges. Continue standard preventative screening.';
    let isMlInference = false;

    // Check if there is a trained model and the disease target is diabetes
    if (disease_type === 'diabetes' && settings.serialized_model_params && settings.serialized_model_type) {
      try {
        const featureVector = [pregVal, gVal, bpVal, skinVal, iVal, bmiVal, pedVal, ageVal];
        const mType = settings.serialized_model_type;
        const mParams = settings.serialized_model_params;

        if (mType === 'logistic_regression') {
          const lr = new LogisticRegressionClassifier();
          lr.fromJSON(mParams);
          const prob = lr.predictProbability(featureVector);
          score = Math.round(prob * 1000) / 10;
          
          // Distance from 0.5 decision boundary scaled to 0 - 100%
          confidence = Math.round(Math.abs(prob - 0.5) * 2 * 1000) / 10;
          isMlInference = true;
        } else if (mType === 'decision_tree') {
          const dt = new DecisionTreeClassifier();
          dt.fromJSON(mParams);
          const pred = dt.predict([featureVector])[0];
          score = pred === 1 ? 85.0 : 15.0;
          
          // Base DT confidence on active champion accuracy, otherwise default
          confidence = settings.active_champion?.metrics?.accuracy || 80.0;
          isMlInference = true;
        } else if (mType === 'random_forest') {
          const rf = new RandomForestClassifier();
          rf.fromJSON(mParams);
          
          const trees = (rf as any).trees || [];
          let votesFor1 = 0;
          trees.forEach((tree: any) => {
            const pred = tree.predict([featureVector])[0];
            if (pred === 1) votesFor1++;
          });

          const votesFor0 = trees.length - votesFor1;
          const consensusVotes = Math.max(votesFor1, votesFor0);
          confidence = trees.length > 0 ? Math.round((consensusVotes / trees.length) * 1000) / 10 : 80.0;

          const prob = trees.length > 0 ? votesFor1 / trees.length : 0.5;
          score = Math.round(prob * 1000) / 10;
          isMlInference = true;
        }

        // Map classification to standard risk thresholds: 0-40% Low, 41-70% Moderate, 71-100% High Risk
        if (score >= 71) {
          classification = 'High Diabetes Risk';
          details = `🤖 Decision Support System (ML Inferred via ${settings.active_champion.model_name}): Warning! Machine Learning algorithms detect a High Risk (${score}% probability with ${confidence}% model confidence) of Type 2 Diabetes. Recommend ordering a confirmatory HbA1c test and initiating glycemic tracking.`;
        } else if (score >= 41) {
          classification = 'Moderate Diabetes Risk';
          details = `🤖 Decision Support System (ML Inferred via ${settings.active_champion.model_name}): Machine Learning algorithms detect a Moderate Risk (${score}% probability with ${confidence}% model confidence) of Type 2 Diabetes. Recommend regular fasting glucose tests and lifestyle modifications.`;
        } else {
          classification = 'Low Diabetes Risk / Normal';
          details = `🤖 Decision Support System (ML Inferred via ${settings.active_champion.model_name}): Patient is classified as Low Risk (${score}% probability with ${confidence}% model confidence). Continue standard annual metabolic monitoring.`;
        }
      } catch (err) {
        console.error('ML inference failed, falling back to heuristic:', err);
      }
    }

    // Heuristics Fallback (or default for other diseases like heart/cardiac)
    if (!isMlInference) {
      if (disease_type === 'diabetes') {
        let hScore = 10;
        if (gVal >= 126) hScore += 40;
        else if (gVal >= 100) hScore += 20;
        if (bmiVal >= 30) hScore += 20;
        if (bpVal >= 140) hScore += 10;
        if (pregVal > 4) hScore += 5;
        if (pedVal > 0.6) hScore += 5;
        if (ageVal > 45) hScore += 5;
        
        score = Math.min(hScore, 99.0);
        confidence = 75.0; // Static confidence for manual heuristics
        
        if (score >= 71) {
          classification = 'High Diabetes Risk';
          details = `Clinical Heuristics Warning: High probability (${score}%) of Type 2 Diabetes. Fasting glucose (${gVal} mg/dL) and BMI (${bmiVal}) indicate urgent diagnostic testing (HbA1c).`;
        } else if (score >= 41) {
          classification = 'Moderate Diabetes Risk';
          details = `Clinical Heuristics Info: Moderate probability (${score}%) of Type 2 Diabetes. Monitor metabolic indicators regularly, and optimize diet and physical activity.`;
        } else {
          classification = 'Low Diabetes Risk / Normal';
          details = `Clinical Heuristics Info: Low probability (${score}%) of Type 2 Diabetes. Patient indicators reside within acceptable clinical ranges.`;
        }
      } else if (disease_type === 'hypertension') {
        let hScore = 15;
        if (bpVal >= 140) hScore += 45;
        else if (bpVal >= 130) hScore += 25;
        if (bmiVal >= 30) hScore += 15;
        score = Math.min(hScore, 99.0);
        confidence = 80.0;
        
        if (score >= 71) {
          classification = 'Stage 2 Hypertension Risk';
          details = 'Warning: Blood pressure exceeds 140 mmHg. Recommend pharmacological evaluation (ACE inhibitors/ARBs) and low-sodium DASH diet.';
        } else if (score >= 41) {
          classification = 'Stage 1 Hypertension Risk';
          details = 'Warning: Blood pressure is elevated. Recommend lifestyle modification and regular self-monitoring.';
        } else {
          classification = 'Low Risk / Normal';
          details = 'Normal range blood pressure. Maintain current diet and exercise habits.';
        }
      } else if (disease_type === 'cardiac') {
        let hScore = 15;
        if (bpVal >= 140) hScore += 25;
        if (gVal >= 120) hScore += 20;
        if (bmiVal >= 30) hScore += 20;
        score = Math.min(hScore, 99.0);
        confidence = 80.0;

        if (score >= 71) {
          classification = 'High Cardiovascular Risk';
          details = 'Warning: Metabolic markers indicate elevated arterial stress. Recommend stress test and lipid panels.';
        } else if (score >= 41) {
          classification = 'Moderate Cardiovascular Risk';
          details = 'Arterial indices are slightly elevated. Monitor cholesterol levels and prioritize cardiovascular exercises.';
        } else {
          classification = 'Low Risk / Normal';
          details = 'Cardiovascular markers are healthy. Continue healthy heart routines.';
        }
      }
    }

    const predictionId = `PRED${Math.floor(1000 + Math.random() * 9000)}`;
    
    // Generate AI recommendations array based on risk score thresholds
    let recommendations: string[] = [];
    if (score >= 71) {
      recommendations = [
        'Consult doctor immediately.',
        'Schedule blood test.',
        'Monitor glucose level.',
        'Improve diet.'
      ];
    } else if (score >= 41) {
      recommendations = [
        'Increase physical activity.',
        'Monitor blood sugar.',
        'Follow preventive care.'
      ];
    } else {
      recommendations = [
        'Maintain healthy lifestyle.',
        'Routine checkups.'
      ];
    }

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
        pregnancies: pregVal,
        glucose: gVal,
        blood_pressure: bpVal,
        skin_thickness: skinVal,
        insulin: iVal,
        bmi: bmiVal,
        diabetes_pedigree: pedVal,
        age: ageVal
      },
      risk_score: score,
      confidence_score: confidence,
      recommendations,
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
