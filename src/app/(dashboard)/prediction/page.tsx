'use client';

import { useState, useEffect } from 'react';
import { 
  BrainCircuit, Play, CheckCircle, AlertTriangle, ShieldAlert, 
  History, User, BarChart3, TrendingUp, HelpCircle, RefreshCw, Cpu 
} from 'lucide-react';

export default function PredictionPage() {
  const [activeTab, setActiveTab] = useState<'screening' | 'models'>('screening');
  const [patients, setPatients] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  
  // Screening Form states
  const [patientId, setPatientId] = useState('');
  const [diseaseType, setDiseaseType] = useState('diabetes');
  const [pregnancies, setPregnancies] = useState('0');
  const [glucose, setGlucose] = useState('110');
  const [bp, setBp] = useState('120');
  const [skinThickness, setSkinThickness] = useState('20');
  const [insulin, setInsulin] = useState('0');
  const [bmi, setBmi] = useState('24.5');
  const [diabetesPedigree, setDiabetesPedigree] = useState('0.372');
  const [age, setAge] = useState('30');
  
  // Results states
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  // ML Model Management states
  const [training, setRunningTraining] = useState(false);
  const [mlSpecs, setMlSpecs] = useState<any>(null);
  const [trainingLogs, setTrainingLogs] = useState<string[]>([]);
  const [pageLoading, setPageLoading] = useState(true);

  const loadPatientsAndHistory = async () => {
    try {
      const [pRes, hRes, mRes] = await Promise.all([
        fetch('/api/patients'),
        fetch('/api/predictions'),
        fetch('/api/ml')
      ]);

      if (pRes.ok) {
        const pData = await pRes.json();
        setPatients(pData.patients || []);
      }
      
      if (hRes.ok) {
        const hData = await hRes.json();
        setHistory(hData.history || []);
      }

      if (mRes.ok) {
        const mData = await mRes.json();
        if (mData.active_champion) {
          setMlSpecs(mData);
        }
      }
    } catch (err) {
      console.error('Failed to load predictions context:', err);
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    loadPatientsAndHistory();
  }, []);

  const handlePatientChange = (pId: string) => {
    setPatientId(pId);
    if (!pId) {
      setAge('30');
      return;
    }

    const selectedPat = patients.find(p => p.patient_id === pId);
    if (selectedPat) {
      setAge(selectedPat.age.toString());
    }
    
    // Auto-fill form values from the last visit of this patient
    fetch('/api/patients')
      .then(res => res.json())
      .then(data => {
        const visits = data.visits || [];
        const pVisits = visits.filter((v: any) => v.patient_id === pId);
        if (pVisits.length > 0) {
          // Find latest visit
          const latest = pVisits[pVisits.length - 1];
          setGlucose((latest.glucose ?? 110).toString());
          setBp((latest.blood_pressure ?? 120).toString());
          setInsulin((latest.insulin ?? 0).toString());
          setBmi((latest.bmi ?? 24.5).toString());
          setPregnancies((latest.pregnancies ?? 0).toString());
          setSkinThickness((latest.skin_thickness ?? 20).toString());
          setDiabetesPedigree((latest.diabetes_pedigree ?? 0.372).toString());
        }
      });
  };

  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patientId,
          pregnancies,
          glucose,
          blood_pressure: bp,
          skin_thickness: skinThickness,
          insulin,
          bmi,
          diabetes_pedigree: diabetesPedigree,
          age,
          disease_type: diseaseType
        })
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data);
        loadPatientsAndHistory(); // Reload history
      }
    } catch (err) {
      console.error('Prediction calculation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // ML Training Pipeline trigger
  const runTrainingPipeline = async () => {
    if (training) return;
    setRunningTraining(true);
    setTrainingLogs([
      '[TRAIN] Initializing predictive data mining pipeline...',
      '[TRAIN] Querying patients and clinical visit records from Data Warehouse...',
      '[TRAIN] Parsing Star Schema joins... Vectorizing features: [pregnancies, glucose, blood_pressure, skin_thickness, insulin, bmi, diabetes_pedigree, age]',
      '[TRAIN] Partitioning dataset: 80% Training cohort, 20% validation Test cohort.'
    ]);

    await sleep(400);
    setTrainingLogs(prev => [...prev, '[MODEL 1] Commencing Random Forest ensemble (12 trees)...']);
    await sleep(400);
    setTrainingLogs(prev => [...prev, '[MODEL 2] Fitting Logistic Regression Sigmoid parameters (300 epochs)...']);
    await sleep(400);
    setTrainingLogs(prev => [...prev, '[MODEL 3] Traversing Decision Tree recursive binary splits...']);
    await sleep(400);
    setTrainingLogs(prev => [...prev, '[EVAL] Conducting performance test metrics scans...']);
    await sleep(300);

    try {
      const res = await fetch('/api/ml', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setTrainingLogs(prev => [
          ...prev,
          `[SUCCESS] Model training complete. Champion: ${data.champion.model_name}`,
          `[EVAL] Metrics: Accuracy: ${data.champion.metrics.accuracy}%, Precision: ${data.champion.metrics.precision}%, Recall: ${data.champion.metrics.recall}%, F1 Score: ${data.champion.metrics.f1}%`,
          `[LOAD] Serialized champion parameters committed to database configurations.`
        ]);
        
        // Refresh ml settings
        loadPatientsAndHistory();
      }
    } catch (err) {
      setTrainingLogs(prev => [...prev, '[CRITICAL] ML pipeline failed. Check server connection.']);
    } finally {
      setRunningTraining(false);
    }
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  if (pageLoading) {
    return <p style={{ padding: '2rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>Loading prediction workflows...</p>;
  }

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Sub-tab selection */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-surface-border)', paddingBottom: '0.25rem', gap: '1rem' }}>
        <button
          onClick={() => setActiveTab('screening')}
          style={{
            padding: '0.6rem 1.25rem',
            fontSize: '0.9rem',
            fontWeight: activeTab === 'screening' ? 650 : 500,
            color: activeTab === 'screening' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            border: 'none',
            borderBottom: activeTab === 'screening' ? '2.5px solid var(--color-primary)' : '2.5px solid transparent',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          🧠 Diagnostic Risk Screening
        </button>
        <button
          onClick={() => setActiveTab('models')}
          style={{
            padding: '0.6rem 1.25rem',
            fontSize: '0.9rem',
            fontWeight: activeTab === 'models' ? 650 : 500,
            color: activeTab === 'models' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            border: 'none',
            borderBottom: activeTab === 'models' ? '2.5px solid var(--color-primary)' : '2.5px solid transparent',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          ⚙️ Model Management & Data Mining
        </button>
      </div>

      {activeTab === 'screening' ? (
        <>
          {/* TAB 1: SCREENING WIZARD */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', flexWrap: 'wrap' }}>
            
            {/* Screening form */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Clinical Screening Parameters</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                  Input clinical descriptors and trigger predictive screening algorithm.
                </p>
              </div>

              <form onSubmit={handlePredict} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Select Patient from Register (Optional)</label>
                    <select 
                      value={patientId}
                      onChange={(e) => handlePatientChange(e.target.value)}
                      className="form-input"
                    >
                      <option value="">-- Anonymous Walk-In --</option>
                      {patients.map(p => (
                        <option key={p.patient_id} value={p.patient_id}>{p.patient_name} (ID: {p.patient_id}, Age: {p.age})</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Predictive Model Target</label>
                    <select 
                      value={diseaseType}
                      onChange={(e) => setDiseaseType(e.target.value)}
                      className="form-input"
                    >
                      <option value="diabetes">Diabetes Mellitus Risk Model (ML Inferred)</option>
                      <option value="hypertension">Hypertension Diagnostic Classifier (Heuristic)</option>
                      <option value="cardiac">Cardiovascular Risk Estimator (Heuristic)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Age (years)</label>
                    <input 
                      type="number" 
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>

                  <div className="form-group" style={{ opacity: diseaseType === 'diabetes' ? 1 : 0.5 }}>
                    <label className="form-label">Pregnancies</label>
                    <input 
                      type="number" 
                      value={pregnancies}
                      onChange={(e) => setPregnancies(e.target.value)}
                      className="form-input"
                      disabled={diseaseType !== 'diabetes'}
                      required={diseaseType === 'diabetes'}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Glucose Level (mg/dL)</label>
                    <input 
                      type="number" 
                      value={glucose}
                      onChange={(e) => setGlucose(e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Systolic BP (mmHg)</label>
                    <input 
                      type="number" 
                      value={bp}
                      onChange={(e) => setBp(e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>

                  <div className="form-group" style={{ opacity: diseaseType === 'diabetes' ? 1 : 0.5 }}>
                    <label className="form-label">Skin Thickness (mm)</label>
                    <input 
                      type="number" 
                      value={skinThickness}
                      onChange={(e) => setSkinThickness(e.target.value)}
                      className="form-input"
                      disabled={diseaseType !== 'diabetes'}
                    />
                  </div>

                  <div className="form-group" style={{ opacity: diseaseType === 'diabetes' ? 1 : 0.5 }}>
                    <label className="form-label">Insulin level (uIU/mL)</label>
                    <input 
                      type="number" 
                      value={insulin}
                      onChange={(e) => setInsulin(e.target.value)}
                      className="form-input"
                      disabled={diseaseType !== 'diabetes'}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">BMI (kg/m²)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={bmi}
                      onChange={(e) => setBmi(e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>

                  <div className="form-group" style={{ opacity: diseaseType === 'diabetes' ? 1 : 0.5 }}>
                    <label className="form-label">Diabetes Pedigree</label>
                    <input 
                      type="number" 
                      step="0.001"
                      value={diabetesPedigree}
                      onChange={(e) => setDiabetesPedigree(e.target.value)}
                      className="form-input"
                      disabled={diseaseType !== 'diabetes'}
                    />
                  </div>

                </div>

                <button 
                  type="submit" 
                  disabled={loading} 
                  className={`btn btn-primary ${loading ? 'btn-disabled' : ''}`}
                  style={{ width: '100%', padding: '0.8rem' }}
                >
                  <BrainCircuit size={18} /> {loading ? 'Running ML Inference...' : 'Calculate Predictive Risk'}
                </button>
              </form>
            </div>

            {/* Screening Results readout */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', justifyContent: 'center', minHeight: '380px' }}>
              {result ? (
                <div className="animate-slide" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ textAlign: 'center' }}>
                    <span className="badge badge-info" style={{ fontWeight: 650 }}>{result.prediction.model_used}</span>
                    
                    {/* Double Score Gauges Side-by-Side */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', margin: '1.5rem auto' }}>
                      {/* Risk Gauge */}
                      <div style={{ position: 'relative', width: '110px', height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="110" height="110" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="3.2" />
                          <circle 
                            cx="18" 
                            cy="18" 
                            r="15.915" 
                            fill="none" 
                            stroke={
                              result.prediction.risk_score >= 71 
                                ? 'var(--color-danger)' 
                                : result.prediction.risk_score >= 41 
                                  ? 'var(--color-warning)' 
                                  : 'var(--color-success)'
                            } 
                            strokeWidth="3.2" 
                            strokeDasharray={`${result.prediction.risk_score} ${100 - result.prediction.risk_score}`}
                            style={{ transition: 'stroke-dasharray 0.5s ease' }}
                          />
                        </svg>
                        <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-secondary)' }}>{result.prediction.risk_score}%</span>
                          <span style={{ fontSize: '0.55rem', color: 'var(--color-text-muted)', fontWeight: 650, textTransform: 'uppercase' }}>Risk Score</span>
                        </div>
                      </div>

                      {/* Confidence Gauge */}
                      <div style={{ position: 'relative', width: '110px', height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="110" height="110" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="3.2" />
                          <circle 
                            cx="18" 
                            cy="18" 
                            r="15.915" 
                            fill="none" 
                            stroke="var(--color-primary)" 
                            strokeWidth="3.2" 
                            strokeDasharray={`${result.prediction.confidence_score || 80} ${100 - (result.prediction.confidence_score || 80)}`}
                            style={{ transition: 'stroke-dasharray 0.5s ease' }}
                          />
                        </svg>
                        <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-secondary)' }}>{result.prediction.confidence_score || 80}%</span>
                          <span style={{ fontSize: '0.55rem', color: 'var(--color-text-muted)', fontWeight: 650, textTransform: 'uppercase' }}>Confidence</span>
                        </div>
                      </div>
                    </div>

                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                      Classification:{' '}
                      <span 
                        className={`badge ${
                          result.prediction.risk_score >= 71 
                            ? 'badge-danger' 
                            : result.prediction.risk_score >= 41 
                              ? 'badge-warning' 
                              : 'badge-success'
                        }`}
                        style={{ fontSize: '0.9rem', padding: '0.3rem 0.8rem', marginLeft: '0.5rem' }}
                      >
                        {result.prediction.result}
                      </span>
                    </h3>
                  </div>

                  {/* Guidelines Output */}
                  <div style={{ 
                    backgroundColor: 
                      result.prediction.risk_score >= 71 
                        ? 'var(--color-danger-light)' 
                        : result.prediction.risk_score >= 41 
                          ? 'var(--color-warning-light)' 
                          : 'var(--color-success-light)', 
                    border: `1.5px solid ${
                      result.prediction.risk_score >= 71 
                        ? 'var(--color-danger-border)' 
                        : result.prediction.risk_score >= 41 
                          ? 'var(--color-warning-border)' 
                          : 'var(--color-success-border)'
                    }`,
                    padding: '1.25rem',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    lineHeight: 1.45
                  }}>
                    <strong style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.25rem', 
                      marginBottom: '0.5rem', 
                      fontSize: '0.85rem', 
                      color: 
                        result.prediction.risk_score >= 71 
                          ? 'var(--color-danger)' 
                          : result.prediction.risk_score >= 41 
                            ? 'var(--color-warning)' 
                            : 'var(--color-success)' 
                    }}>
                      {result.prediction.risk_score >= 71 ? (
                        <ShieldAlert size={16} />
                      ) : result.prediction.risk_score >= 41 ? (
                        <AlertTriangle size={16} />
                      ) : (
                        <CheckCircle size={16} />
                      )}{' '}
                      Clinical Care Path Recommendation:
                    </strong>
                    <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>{result.details}</p>

                    {/* AI Recommendation Checklist */}
                    {result.prediction.recommendations && result.prediction.recommendations.length > 0 && (
                      <div style={{ 
                        marginTop: '0.85rem', 
                        borderTop: `1px solid ${
                          result.prediction.risk_score >= 71 
                            ? 'var(--color-danger-border)' 
                            : result.prediction.risk_score >= 41 
                              ? 'var(--color-warning-border)' 
                              : 'var(--color-success-border)'
                        }`, 
                        paddingTop: '0.75rem' 
                      }}>
                        <span style={{ 
                          fontWeight: 700, 
                          display: 'block', 
                          marginBottom: '0.4rem', 
                          textTransform: 'uppercase', 
                          fontSize: '0.68rem', 
                          letterSpacing: '0.05em',
                          color: 
                            result.prediction.risk_score >= 71 
                              ? 'var(--color-danger)' 
                              : result.prediction.risk_score >= 41 
                                ? 'var(--color-warning)' 
                                : 'var(--color-success)'
                        }}>
                          AI Actionable Guidelines Checklist:
                        </span>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          {result.prediction.recommendations.map((rec: string, idx: number) => (
                            <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
                              <span style={{ 
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '14px',
                                height: '14px',
                                borderRadius: '50%',
                                backgroundColor: 
                                  result.prediction.risk_score >= 71 
                                    ? 'var(--color-danger)' 
                                    : result.prediction.risk_score >= 41 
                                      ? 'var(--color-warning)' 
                                      : 'var(--color-success)',
                                color: '#ffffff',
                                fontSize: '8px',
                                fontWeight: 'bold'
                              }}>✓</span>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                  <BrainCircuit size={48} style={{ color: 'var(--color-text-muted)', marginBottom: '1rem', opacity: 0.7 }} />
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Awaiting Diagnostic Inference</h3>
                  <p style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Select indicators and execute calculation to display model outputs.</p>
                </div>
              )}
            </div>

          </div>

          {/* Predictions list */}
          <div className="card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <History size={18} style={{ color: 'var(--color-primary)' }} /> Screening History Registry
            </h3>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Prediction ID</th>
                    <th>Timestamp</th>
                    <th>Patient Name</th>
                    <th>Model Used</th>
                    <th>Clinical Inputs</th>
                    <th>Classification</th>
                    <th>Risk Score</th>
                    <th>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.prediction_id}>
                      <td style={{ fontWeight: 650 }}>{h.prediction_id}</td>
                      <td>{new Date(h.timestamp).toLocaleString()}</td>
                      <td style={{ fontWeight: 600, color: 'var(--color-secondary)' }}>{h.patient_name}</td>
                      <td>{h.model_used}</td>
                      <td style={{ fontSize: '0.73rem', color: 'var(--color-text-secondary)', lineHeight: 1.3 }}>
                        {h.inputs?.pregnancies !== undefined && `Preg: ${h.inputs.pregnancies} | `}
                        Glucose: {h.inputs?.glucose} | BP: {h.inputs?.blood_pressure} | 
                        {h.inputs?.skin_thickness !== undefined && ` Skin: ${h.inputs.skin_thickness} | `}
                        BMI: {h.inputs?.bmi}
                        {h.inputs?.age !== undefined && ` | Age: ${h.inputs.age}`}
                      </td>
                      <td>
                        <span className={`badge ${
                          h.risk_score >= 71 
                            ? 'badge-danger' 
                            : h.risk_score >= 41 
                              ? 'badge-warning' 
                              : 'badge-success'
                        }`}>
                          {h.result}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700 }}>{h.risk_score}%</td>
                      <td style={{ fontWeight: 650, color: 'var(--color-primary)' }}>
                        {h.confidence_score !== undefined ? `${h.confidence_score}%` : 'N/A'}
                      </td>
                    </tr>
                  ))}
                  {history.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' }}>No prediction runs registered. Form submit above to insert.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* TAB 2: MODEL MANAGEMENT & DATA MINING */}
          
          {/* Champion Model Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem', flexWrap: 'wrap' }}>
            
            {/* Training control panel */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>ML Training Orchestrator</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                  Executes training scripts on the Data Warehouse cohort to optimize Random Forest, Logistic Regression, and Decision Tree parameters.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid var(--color-surface-border)' }}>
                <div style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)', padding: '0.5rem', borderRadius: '50%' }}>
                  <TrendingUp size={20} />
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block' }}>Active Model Specification</span>
                  <strong>{mlSpecs?.selected_model || 'RandomForest v1.0 (Mock / Baseline)'}</strong>
                  {mlSpecs?.active_champion && (
                    <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--color-success)', fontWeight: 600, marginTop: '2px' }}>
                      ✓ Trained: {new Date(mlSpecs.active_champion.timestamp).toLocaleDateString()} (Acc: {mlSpecs.active_champion.metrics.accuracy}%, F1: {mlSpecs.active_champion.metrics.f1}%)
                    </span>
                  )}
                </div>
              </div>

              <button 
                onClick={runTrainingPipeline} 
                disabled={training} 
                className={`btn btn-primary ${training ? 'btn-disabled' : ''}`}
                style={{ alignSelf: 'flex-start', padding: '0.8rem 1.5rem' }}
              >
                {training ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" style={{ animation: 'spin 1.5s linear infinite' }} /> Training Algorithms...
                  </>
                ) : (
                  <>
                    <Play size={16} /> Train & Compare Models
                  </>
                )}
              </button>

              {/* Terminal Logs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', backgroundColor: '#020617', padding: '1rem', borderRadius: '6px', border: '1px solid #1e293b', color: '#10b981', fontFamily: 'monospace', fontSize: '0.75rem', height: '140px', overflowY: 'auto' }}>
                {trainingLogs.length === 0 ? (
                  <span style={{ color: '#64748b' }}>Logs Console: Idle. Click "Train & Compare Models" to execute fitting loops.</span>
                ) : (
                  trainingLogs.map((log, idx) => (
                    <div key={idx} style={{ color: log.includes('[SUCCESS]') ? '#10b981' : log.includes('[EVAL]') ? '#f59e0b' : '#e2e8f0' }}>{log}</div>
                  ))
                )}
              </div>
            </div>

            {/* Performance metrics breakdown */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Active Model Performance</h3>
              
              {mlSpecs?.active_champion ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-surface-border)', paddingBottom: '0.5rem', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Algorithm Type:</span>
                    <strong>{mlSpecs.active_champion.model_name}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-surface-border)', paddingBottom: '0.5rem', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Training Set Size:</span>
                    <strong>{mlSpecs.active_champion.training_samples} visits</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-surface-border)', paddingBottom: '0.5rem', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Test Set Size:</span>
                    <strong>{mlSpecs.active_champion.test_samples} visits</strong>
                  </div>
                  
                  {/* Gauge metrics bars */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                        <span>Accuracy</span>
                        <strong>{mlSpecs.active_champion.metrics.accuracy}%</strong>
                      </div>
                      <div style={{ height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${mlSpecs.active_champion.metrics.accuracy}%`, height: '100%', backgroundColor: 'var(--color-success)' }} />
                      </div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                        <span>F1 Score</span>
                        <strong>{mlSpecs.active_champion.metrics.f1}%</strong>
                      </div>
                      <div style={{ height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${mlSpecs.active_champion.metrics.f1}%`, height: '100%', backgroundColor: 'var(--color-primary)' }} />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--color-text-muted)', textAlign: 'center' }}>
                  <Cpu size={36} style={{ marginBottom: '0.5rem', opacity: 0.7 }} />
                  <span style={{ fontSize: '0.8rem' }}>No custom model data registered. Submit a training run to build and save.</span>
                </div>
              )}
            </div>

          </div>

          {/* Model Comparisons Table */}
          <div className="card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart3 size={18} style={{ color: 'var(--color-primary)' }} /> Classifier Algorithms Benchmark Matrix
            </h3>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc' }}>
                    <th style={{ padding: '1rem' }}>Algorithm</th>
                    <th style={{ padding: '1rem' }}>Accuracy Score</th>
                    <th style={{ padding: '1rem' }}>Precision Score</th>
                    <th style={{ padding: '1rem' }}>Recall Score</th>
                    <th style={{ padding: '1rem' }}>F1 Metric (Split Key)</th>
                    <th style={{ padding: '1rem' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {mlSpecs?.model_history ? (
                    <>
                      <tr>
                        <td style={{ fontWeight: 650, color: 'var(--color-secondary)' }}>Random Forest Classifier</td>
                        <td>{mlSpecs.model_history.random_forest.accuracy}%</td>
                        <td>{mlSpecs.model_history.random_forest.precision}%</td>
                        <td>{mlSpecs.model_history.random_forest.recall}%</td>
                        <td style={{ fontWeight: 700 }}>{mlSpecs.model_history.random_forest.f1}%</td>
                        <td>
                          {mlSpecs.active_champion.model_type === 'random_forest' ? (
                            <span className="badge badge-success">● Active Champion</span>
                          ) : (
                            <span className="badge badge-info">Evaluation Ready</span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 650, color: 'var(--color-secondary)' }}>Logistic Regression Sigmoid</td>
                        <td>{mlSpecs.model_history.logistic_regression.accuracy}%</td>
                        <td>{mlSpecs.model_history.logistic_regression.precision}%</td>
                        <td>{mlSpecs.model_history.logistic_regression.recall}%</td>
                        <td style={{ fontWeight: 700 }}>{mlSpecs.model_history.logistic_regression.f1}%</td>
                        <td>
                          {mlSpecs.active_champion.model_type === 'logistic_regression' ? (
                            <span className="badge badge-success">● Active Champion</span>
                          ) : (
                            <span className="badge badge-info">Evaluation Ready</span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 650, color: 'var(--color-secondary)' }}>Decision Tree Classifier</td>
                        <td>{mlSpecs.model_history.decision_tree.accuracy}%</td>
                        <td>{mlSpecs.model_history.decision_tree.precision}%</td>
                        <td>{mlSpecs.model_history.decision_tree.recall}%</td>
                        <td style={{ fontWeight: 700 }}>{mlSpecs.model_history.decision_tree.f1}%</td>
                        <td>
                          {mlSpecs.active_champion.model_type === 'decision_tree' ? (
                            <span className="badge badge-success">● Active Champion</span>
                          ) : (
                            <span className="badge badge-info">Evaluation Ready</span>
                          )}
                        </td>
                      </tr>
                    </>
                  ) : (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' }}>
                        No algorithm benchmarks recorded. Execute training above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Custom SVG performance comparison charts */}
            {mlSpecs?.model_history && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginTop: '2rem' }}>
                {['accuracy', 'precision', 'recall', 'f1'].map((metricName) => {
                  const mKey = metricName as 'accuracy' | 'precision' | 'recall' | 'f1';
                  const rfVal = mlSpecs.model_history.random_forest[mKey];
                  const lrVal = mlSpecs.model_history.logistic_regression[mKey];
                  const dtVal = mlSpecs.model_history.decision_tree[mKey];
                  
                  return (
                    <div key={metricName} className="card" style={{ padding: '1rem', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>{metricName} Comparison</span>
                      <div style={{ flex: 1, height: '110px', display: 'flex', alignItems: 'flex-end', gap: '1rem', padding: '0.5rem' }}>
                        
                        {/* RF bar */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                          <span style={{ fontSize: '0.65rem', fontWeight: 'bold' }}>{rfVal}%</span>
                          <div style={{ width: '100%', height: `${rfVal}px`, backgroundColor: '#0d9488', borderRadius: '3px 3px 0 0' }} />
                          <span style={{ fontSize: '0.55rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>RF</span>
                        </div>

                        {/* LR bar */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                          <span style={{ fontSize: '0.65rem', fontWeight: 'bold' }}>{lrVal}%</span>
                          <div style={{ width: '100%', height: `${lrVal}px`, backgroundColor: '#3b82f6', borderRadius: '3px 3px 0 0' }} />
                          <span style={{ fontSize: '0.55rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>LR</span>
                        </div>

                        {/* DT bar */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                          <span style={{ fontSize: '0.65rem', fontWeight: 'bold' }}>{dtVal}%</span>
                          <div style={{ width: '100%', height: `${dtVal}px`, backgroundColor: '#f59e0b', borderRadius: '3px 3px 0 0' }} />
                          <span style={{ fontSize: '0.55rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>DT</span>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </>
      )}

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
