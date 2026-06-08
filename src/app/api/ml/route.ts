import { NextResponse } from 'next/server';
import { getPatients, getVisits, getSettings, saveSettings } from '@/utils/db';
import { 
  trainTestSplit, 
  calculatePerformanceMetrics, 
  RandomForestClassifier, 
  LogisticRegressionClassifier, 
  DecisionTreeClassifier 
} from '@/utils/ml';

export async function GET() {
  try {
    const settings = await getSettings();
    
    return NextResponse.json({
      success: true,
      selected_model: settings.selected_model || 'RandomForest v1.0',
      active_champion: settings.active_champion || null,
      model_history: settings.model_history || null
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const [patients, visits, settings] = await Promise.all([
      getPatients(),
      getVisits(),
      getSettings()
    ]);

    const X: number[][] = [];
    const y: number[] = [];

    // Map existing visits to 8 features
    visits.forEach((v: any) => {
      const p = patients.find(pat => pat.patient_id === v.patient_id);
      const age = p ? p.age : 40;

      X.push([
        v.pregnancies || 0,
        v.glucose,
        v.blood_pressure,
        v.skin_thickness || 0,
        v.insulin || 0,
        v.bmi,
        v.diabetes_pedigree || 0.35,
        age
      ]);
      y.push(v.disease_id === 'DIS001' ? 1 : 0);
    });

    // 8-feature Synthetic Fallback Dataset
    if (X.length < 25) {
      const syntheticBase = [
        // Pregnancies, Glucose, BP, Skin, Insulin, BMI, Pedigree, Age -> Outcome
        { x: [6, 148, 72, 35, 80, 33.6, 0.627, 50], y: 1 },
        { x: [1, 85, 66, 29, 0, 26.6, 0.351, 31], y: 0 },
        { x: [8, 183, 64, 0, 0, 23.3, 0.672, 32], y: 1 },
        { x: [1, 89, 66, 23, 94, 28.1, 0.167, 21], y: 0 },
        { x: [0, 137, 40, 35, 168, 43.1, 2.288, 33], y: 1 },
        { x: [5, 116, 74, 0, 0, 25.6, 0.201, 30], y: 0 },
        { x: [3, 78, 50, 32, 88, 31.0, 0.248, 26], y: 1 },
        { x: [10, 115, 0, 0, 0, 35.3, 0.134, 29], y: 0 },
        { x: [2, 197, 70, 45, 543, 30.5, 0.158, 53], y: 1 },
        { x: [8, 125, 96, 0, 0, 0, 0.232, 54], y: 1 },
        { x: [4, 110, 92, 0, 0, 37.6, 0.191, 30], y: 0 },
        { x: [10, 168, 74, 0, 0, 38.0, 0.537, 34], y: 1 },
        { x: [10, 139, 80, 0, 0, 27.1, 1.441, 28], y: 0 },
        { x: [1, 189, 60, 23, 846, 30.1, 0.398, 59], y: 1 },
        { x: [5, 166, 74, 175, 175, 25.8, 0.587, 51], y: 1 },
        { x: [7, 100, 51, 230, 230, 30.0, 0.484, 32], y: 1 },
        { x: [0, 118, 84, 230, 230, 45.8, 0.551, 31], y: 1 },
        { x: [1, 107, 74, 30, 0, 29.6, 0.254, 31], y: 0 },
        { x: [1, 99, 84, 0, 0, 29.0, 0.203, 30], y: 0 },
        { x: [0, 80, 55, 0, 0, 19.1, 0.258, 22], y: 0 },
        { x: [7, 150, 78, 20, 120, 30.5, 0.755, 45], y: 1 },
        { x: [2, 95, 60, 15, 0, 22.0, 0.247, 25], y: 0 },
        { x: [4, 142, 82, 0, 0, 34.0, 0.987, 41], y: 1 },
        { x: [2, 105, 70, 25, 75, 23.5, 0.187, 27], y: 0 },
        { x: [3, 120, 80, 0, 0, 28.2, 0.299, 40], y: 0 }
      ];

      syntheticBase.forEach(syn => {
        X.push(syn.x);
        y.push(syn.y);
      });
    }

    const { X_train, y_train, X_test, y_test } = trainTestSplit(X, y, 0.2);

    // Random Forest (8 features)
    const rf = new RandomForestClassifier(15, 6);
    rf.fit(X_train, y_train);
    const rfPred = rf.predict(X_test);
    const rfMetrics = calculatePerformanceMetrics(y_test, rfPred);

    // Logistic Regression (8 features)
    const lr = new LogisticRegressionClassifier(0.01, 350);
    lr.fit(X_train, y_train);
    const lrPred = lr.predict(X_test);
    const lrMetrics = calculatePerformanceMetrics(y_test, lrPred);

    // Decision Tree (8 features)
    const dt = new DecisionTreeClassifier(6);
    dt.fit(X_train, y_train);
    const dtPred = dt.predict(X_test);
    const dtMetrics = calculatePerformanceMetrics(y_test, dtPred);

    const models = [
      { name: 'Random Forest', metrics: rfMetrics, model: rf, type: 'random_forest' },
      { name: 'Logistic Regression', metrics: lrMetrics, model: lr, type: 'logistic_regression' },
      { name: 'Decision Tree', metrics: dtMetrics, model: dt, type: 'decision_tree' }
    ];

    models.sort((a, b) => b.metrics.f1 - a.metrics.f1);
    const champion = models[0];

    const activeChampionSpecs = {
      model_type: champion.type,
      model_name: champion.name,
      metrics: champion.metrics,
      timestamp: new Date().toISOString(),
      training_samples: X_train.length,
      test_samples: X_test.length
    };

    const modelHistory = {
      random_forest: rfMetrics,
      logistic_regression: lrMetrics,
      decision_tree: dtMetrics
    };

    let serializedParams = {};
    if (champion.type === 'logistic_regression') {
      serializedParams = (champion.model as LogisticRegressionClassifier).toJSON();
    } else if (champion.type === 'decision_tree') {
      serializedParams = (champion.model as DecisionTreeClassifier).toJSON();
    } else {
      serializedParams = (champion.model as RandomForestClassifier).toJSON();
    }

    await saveSettings({
      selected_model: `${champion.name} (Auto-selected)`,
      active_champion: activeChampionSpecs,
      model_history: modelHistory,
      serialized_model_type: champion.type,
      serialized_model_params: serializedParams
    });

    return NextResponse.json({
      success: true,
      metrics: modelHistory,
      champion: activeChampionSpecs
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
