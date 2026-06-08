'use client';

import { useState, useEffect } from 'react';
import { BrainCircuit, Play, CheckCircle, AlertTriangle, ShieldAlert, History, User } from 'lucide-react';

export default function PredictionPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  
  // Form states
  const [patientId, setPatientId] = useState('');
  const [diseaseType, setDiseaseType] = useState('diabetes');
  const [glucose, setGlucose] = useState('110');
  const [bp, setBp] = useState('120');
  const [insulin, setInsulin] = useState('0');
  const [bmi, setBmi] = useState('24.5');
  
  // Results states
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [pageLoading, setPageLoading] = useState(true);

  const loadPatientsAndHistory = async () => {
    try {
      const [pRes, hRes] = await Promise.all([
        fetch('/api/patients'),
        fetch('/api/predictions')
      ]);

      if (pRes.ok) {
        const pData = await pRes.json();
        setPatients(pData.patients || []);
      }
      
      if (hRes.ok) {
        const hData = await hRes.json();
        setHistory(hData.history || []);
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
    if (!pId) return;
    
    // Auto-fill form values from the last visit of this patient
    fetch('/api/patients')
      .then(res => res.json())
      .then(data => {
        const visits = data.visits || [];
        const pVisits = visits.filter((v: any) => v.patient_id === pId);
        if (pVisits.length > 0) {
          // Find latest visit
          const latest = pVisits[pVisits.length - 1];
          setGlucose(latest.glucose.toString());
          setBp(latest.blood_pressure.toString());
          setInsulin(latest.insulin.toString());
          setBmi(latest.bmi.toString());
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
          glucose,
          blood_pressure: bp,
          insulin,
          bmi,
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

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Forms & Realtime Result display */}
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
                  <option value="diabetes">Diabetes Mellitus Risk Model v1.2</option>
                  <option value="hypertension">Hypertension Diagnostic Classifier v1.1</option>
                  <option value="cardiac">Cardiovascular Risk Estimator v2.0</option>
                </select>
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

              <div className="form-group">
                <label className="form-label">Insulin level (uIU/mL)</label>
                <input 
                  type="number" 
                  value={insulin}
                  onChange={(e) => setInsulin(e.target.value)}
                  className="form-input"
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
                <span className="badge badge-info">{result.prediction.model_used}</span>
                
                {/* Score Dial Mock */}
                <div style={{ margin: '1.5rem auto', position: 'relative', width: '130px', height: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="130" height="130" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="3.5" />
                    <circle 
                      cx="18" 
                      cy="18" 
                      r="15.915" 
                      fill="none" 
                      stroke={result.prediction.risk_score >= 75 ? 'var(--color-danger)' : result.prediction.risk_score >= 40 ? 'var(--color-warning)' : 'var(--color-success)'} 
                      strokeWidth="3.5" 
                      strokeDasharray={`${result.prediction.risk_score} ${100 - result.prediction.risk_score}`}
                      style={{ transition: 'stroke-dasharray 0.5s ease' }}
                    />
                  </svg>
                  <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-secondary)' }}>{result.prediction.risk_score}%</span>
                    <span style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)', fontWeight: 650, textTransform: 'uppercase' }}>Probability</span>
                  </div>
                </div>

                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                  Classification: <span style={{ color: result.prediction.risk_score >= 75 ? 'var(--color-danger)' : result.prediction.risk_score >= 40 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                    {result.prediction.result}
                  </span>
                </h3>
              </div>

              {/* Guidelines Output */}
              <div style={{ 
                backgroundColor: result.prediction.risk_score >= 75 ? 'var(--color-danger-light)' : result.prediction.risk_score >= 40 ? 'var(--color-warning-light)' : 'var(--color-success-light)', 
                border: `1.5px solid ${result.prediction.risk_score >= 75 ? 'var(--color-danger-border)' : result.prediction.risk_score >= 40 ? 'var(--color-warning-border)' : 'var(--color-success-border)'}`,
                padding: '1.25rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                lineHeight: 1.45
              }}>
                <strong style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.5rem', fontSize: '0.85rem', color: result.prediction.risk_score >= 75 ? 'var(--color-danger)' : result.prediction.risk_score >= 40 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                  {result.prediction.risk_score >= 75 ? <ShieldAlert size={16} /> : <CheckCircle size={16} />} Clinical Care Path Recommendation:
                </strong>
                {result.details}
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
          {pageLoading ? (
            <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading records...</p>
          ) : (
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
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.prediction_id}>
                    <td style={{ fontWeight: 650 }}>{h.prediction_id}</td>
                    <td>{new Date(h.timestamp).toLocaleString()}</td>
                    <td style={{ fontWeight: 600, color: 'var(--color-secondary)' }}>{h.patient_name}</td>
                    <td>{h.model_used}</td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                      Glucose: {h.inputs?.glucose} | BP: {h.inputs?.blood_pressure} | BMI: {h.inputs?.bmi}
                    </td>
                    <td>
                      <span className={`badge ${
                        h.risk_score >= 75 ? 'badge-danger' : 
                        h.risk_score >= 40 ? 'badge-warning' : 'badge-success'
                      }`}>
                        {h.result}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>{h.risk_score}%</td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' }}>No prediction runs registered. Form submit above to insert.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
