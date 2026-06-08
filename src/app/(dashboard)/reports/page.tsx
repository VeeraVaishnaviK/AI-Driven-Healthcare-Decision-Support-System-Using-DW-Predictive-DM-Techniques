'use client';

import { useState, useEffect } from 'react';
import { FileSpreadsheet, Printer, Download, Calendar, FileText, CheckCircle } from 'lucide-react';

export default function ReportsPage() {
  const [reportType, setReportType] = useState('clinical');
  const [dateFrom, setDateFrom] = useState('2026-06-01');
  const [dateTo, setDateTo] = useState('2026-06-08');
  const [selectedPredictionId, setSelectedPredictionId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  
  // Base raw data context
  const [rawPatients, setRawPatients] = useState<any[]>([]);
  const [rawVisits, setRawVisits] = useState<any[]>([]);
  const [rawEtl, setRawEtl] = useState<any[]>([]);
  const [rawPredictions, setRawPredictions] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [pRes, eRes, prRes] = await Promise.all([
          fetch('/api/patients'),
          fetch('/api/etl'),
          fetch('/api/predictions')
        ]);
        if (pRes.ok) {
          const p = await pRes.json();
          setRawPatients(p.patients || []);
          setRawVisits(p.visits || []);
        }
        if (eRes.ok) {
          const e = await eRes.json();
          setRawEtl(e.logs || []);
        }
        if (prRes.ok) {
          const pr = await prRes.json();
          setRawPredictions(pr.history || []);
        }
      } catch (err) {
        console.error('Failed to pre-load reports data:', err);
      }
    }
    loadData();
  }, []);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setReportData(null);

    if (reportType === 'diagnostic' && !selectedPredictionId) {
      alert('Please select a patient screening run first.');
      setGenerating(false);
      return;
    }

    setTimeout(() => {
      // Filter data context based on reportType
      let compiledList: any = [];
      const fromMs = new Date(dateFrom).getTime();
      const toMs = new Date(dateTo).getTime() + 24 * 60 * 60 * 1000; // end of day

      if (reportType === 'clinical') {
        // High Risk Patients from Visits
        compiledList = rawVisits
          .filter(v => v.risk_score >= 60)
          .map(v => {
            const matchPatient = rawPatients.find(p => p.patient_id === v.patient_id);
            return {
              id: v.patient_id,
              name: matchPatient?.patient_name || 'Unknown',
              vitals: `BP: ${v.blood_pressure} | Glucose: ${v.glucose}`,
              risk: v.risk_score,
              outcome: v.prediction_result
            };
          });
      } else if (reportType === 'etl') {
        // ETL execution log runs
        compiledList = rawEtl
          .filter(l => {
            const tMs = new Date(l.timestamp).getTime();
            return tMs >= fromMs && tMs <= toMs;
          })
          .map(l => ({
            id: l.log_id,
            name: l.pipeline_name,
            vitals: `Records sync: ${l.records_loaded}`,
            risk: `${l.duration_ms}ms`,
            outcome: l.status
          }));
      } else if (reportType === 'prediction') {
        // Disease screening records
        compiledList = rawPredictions
          .filter(p => {
            const tMs = new Date(p.timestamp).getTime();
            return tMs >= fromMs && tMs <= toMs;
          })
          .map(p => ({
            id: p.prediction_id,
            name: p.patient_name,
            vitals: p.model_used,
            risk: p.risk_score,
            outcome: p.result
          }));
      } else if (reportType === 'diagnostic') {
        // Retrieve single prediction run
        const match = rawPredictions.find(p => p.prediction_id === selectedPredictionId);
        compiledList = match || null;
      }

      setReportData(compiledList);
      setGenerating(false);
    }, 800);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Parameters Panel */}
      <div className="card no-print">
        <div style={{ marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Report Query Form</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
            Compile database queries into clinical and audit reports.
          </p>
        </div>

        <form onSubmit={handleGenerate} style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '220px', marginBottom: 0 }}>
            <label className="form-label">Report Type Target</label>
            <select 
              value={reportType}
              onChange={(e) => {
                setReportType(e.target.value);
                setReportData(null);
              }}
              className="form-input"
            >
              <option value="clinical">Clinical High-Risk Outcome Registry</option>
              <option value="etl">Data Warehouse ETL Pipelines Audit Summary</option>
              <option value="prediction">Screening Operations Activity Log</option>
              <option value="diagnostic">Patient Diagnostic & Care Recommendations</option>
            </select>
          </div>

          {reportType === 'diagnostic' ? (
            <div className="form-group" style={{ flex: 1.2, minWidth: '240px', marginBottom: 0 }}>
              <label className="form-label">Select Patient Screening Run</label>
              <select 
                value={selectedPredictionId}
                onChange={(e) => setSelectedPredictionId(e.target.value)}
                className="form-input"
                required
              >
                <option value="">-- Choose past screening record --</option>
                {rawPredictions.map((pred) => (
                  <option key={pred.prediction_id} value={pred.prediction_id}>
                    {pred.patient_name} (ID: {pred.patient_id}) - {pred.result} - {new Date(pred.timestamp).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div className="form-group" style={{ flex: 0.5, minWidth: '130px', marginBottom: 0 }}>
                <label className="form-label">Date From</label>
                <input 
                  type="date" 
                  value={dateFrom} 
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ flex: 0.5, minWidth: '130px', marginBottom: 0 }}>
                <label className="form-label">Date To</label>
                <input 
                  type="date" 
                  value={dateTo} 
                  onChange={(e) => setDateTo(e.target.value)}
                  className="form-input"
                />
              </div>
            </>
          )}

          <button 
            type="submit" 
            disabled={generating} 
            className={`btn btn-primary ${generating ? 'btn-disabled' : ''}`}
            style={{ height: '42px' }}
          >
            <FileText size={18} /> {generating ? 'Querying DWH...' : 'Compile Report'}
          </button>
        </form>
      </div>

      {/* Printable Report Preview */}
      {reportData && (
        <div className="animate-slide" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Controls above preview */}
          <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button onClick={handlePrint} className="btn btn-secondary">
              <Printer size={16} /> Print Report
            </button>
          </div>

          {reportType === 'diagnostic' ? (
            /* Patient Diagnostic & Recommendations Report Sheet */
            <div className="card report-sheet" style={{ 
              backgroundColor: '#ffffff', 
              borderColor: '#94a3b8',
              padding: '3rem',
              fontFamily: 'serif',
              boxShadow: '0 0 10px rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              color: '#0f172a'
            }}>
              {/* Report Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '3px solid #0f172a', paddingBottom: '1rem' }}>
                <div>
                  <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)' }}>AI-Driven Healthcare DSS</h1>
                  <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-sans)', color: 'var(--color-text-secondary)', fontWeight: 550 }}>Clinical Data Warehousing & Prediction Engine</span>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.75rem', fontFamily: 'var(--font-sans)', color: 'var(--color-text-secondary)' }}>
                  <strong>Date Compiled:</strong> {new Date().toLocaleDateString()}<br />
                  <strong>Status:</strong> Final Clinical Diagnosis
                </div>
              </div>

              {/* Document Title */}
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: '1.35rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                  Patient Diagnostic & Recommendation Report
                </h2>
                <span style={{ fontSize: '0.8rem', color: '#475569', display: 'block', marginTop: '0.25rem' }}>
                  Decision Support System Inferred Care Recommendation Registry
                </span>
              </div>

              {/* Patient Metadata Box */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', border: '1px solid #cbd5e1', padding: '1rem', borderRadius: '4px', backgroundColor: '#f8fafc', fontFamily: 'var(--font-sans)', fontSize: '0.85rem' }}>
                <div>
                  <strong>Patient ID:</strong> {reportData.patient_id}<br />
                  <strong>Patient Name:</strong> {reportData.patient_name}<br />
                  <strong>Age:</strong> {reportData.inputs?.age || 'N/A'} years<br />
                  <strong>Screening Run ID:</strong> {reportData.prediction_id}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong>Timestamp:</strong> {new Date(reportData.timestamp).toLocaleString()}<br />
                  <strong>Algorithm Used:</strong> {reportData.model_used}<br />
                  <strong>Outcome Status:</strong> <span style={{ 
                    fontWeight: 700,
                    color: reportData.risk_score >= 71 ? 'var(--color-danger)' : reportData.risk_score >= 41 ? 'var(--color-warning)' : 'var(--color-success)'
                  }}>{reportData.result}</span>
                </div>
              </div>

              {/* Vitals Table */}
              <div>
                <h3 style={{ fontSize: '0.95rem', borderBottom: '2px solid #0f172a', paddingBottom: '0.25rem', marginBottom: '0.6rem', fontFamily: 'var(--font-sans)' }}>1. Clinical Vitals Summary</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left', fontFamily: 'var(--font-sans)' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #94a3b8', backgroundColor: '#f1f5f9' }}>
                      <th style={{ padding: '0.4rem 0.75rem', fontWeight: 'bold' }}>Parameter</th>
                      <th style={{ padding: '0.4rem 0.75rem', fontWeight: 'bold' }}>Recorded Value</th>
                      <th style={{ padding: '0.4rem 0.75rem', fontWeight: 'bold' }}>Reference Range</th>
                      <th style={{ padding: '0.4rem 0.75rem', fontWeight: 'bold' }}>Status Evaluation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.inputs?.pregnancies !== undefined && (
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '0.4rem 0.75rem' }}>Pregnancies</td>
                        <td style={{ padding: '0.4rem 0.75rem', fontWeight: 'bold' }}>{reportData.inputs.pregnancies}</td>
                        <td style={{ padding: '0.4rem 0.75rem', color: '#64748b' }}>0 - 4 (Normal)</td>
                        <td style={{ padding: '0.4rem 0.75rem', fontWeight: 600, color: reportData.inputs.pregnancies > 4 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                          {reportData.inputs.pregnancies > 4 ? 'Elevated' : 'Normal'}
                        </td>
                      </tr>
                    )}
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '0.4rem 0.75rem' }}>Glucose Level</td>
                      <td style={{ padding: '0.4rem 0.75rem', fontWeight: 'bold' }}>{reportData.inputs?.glucose} mg/dL</td>
                      <td style={{ padding: '0.4rem 0.75rem', color: '#64748b' }}>70 - 100 mg/dL</td>
                      <td style={{ padding: '0.4rem 0.75rem', fontWeight: 600, color: reportData.inputs?.glucose >= 126 ? 'var(--color-danger)' : reportData.inputs?.glucose >= 100 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                        {reportData.inputs?.glucose >= 126 ? 'Diabetic Fasting' : reportData.inputs?.glucose >= 100 ? 'Pre-diabetic' : 'Normal'}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '0.4rem 0.75rem' }}>Systolic Blood Pressure</td>
                      <td style={{ padding: '0.4rem 0.75rem', fontWeight: 'bold' }}>{reportData.inputs?.blood_pressure} mmHg</td>
                      <td style={{ padding: '0.4rem 0.75rem', color: '#64748b' }}>90 - 120 mmHg</td>
                      <td style={{ padding: '0.4rem 0.75rem', fontWeight: 600, color: reportData.inputs?.blood_pressure >= 140 ? 'var(--color-danger)' : reportData.inputs?.blood_pressure >= 130 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                        {reportData.inputs?.blood_pressure >= 140 ? 'Hypertensive' : reportData.inputs?.blood_pressure >= 130 ? 'Elevated' : 'Normal'}
                      </td>
                    </tr>
                    {reportData.inputs?.skin_thickness !== undefined && (
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '0.4rem 0.75rem' }}>Skin Thickness</td>
                        <td style={{ padding: '0.4rem 0.75rem', fontWeight: 'bold' }}>{reportData.inputs.skin_thickness} mm</td>
                        <td style={{ padding: '0.4rem 0.75rem', color: '#64748b' }}>10 - 35 mm</td>
                        <td style={{ padding: '0.4rem 0.75rem', fontWeight: 600, color: reportData.inputs.skin_thickness > 35 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                          {reportData.inputs.skin_thickness > 35 ? 'Elevated' : 'Normal'}
                        </td>
                      </tr>
                    )}
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '0.4rem 0.75rem' }}>Insulin Level</td>
                      <td style={{ padding: '0.4rem 0.75rem', fontWeight: 'bold' }}>{reportData.inputs?.insulin} uIU/mL</td>
                      <td style={{ padding: '0.4rem 0.75rem', color: '#64748b' }}>15 - 276 uIU/mL</td>
                      <td style={{ padding: '0.4rem 0.75rem', fontWeight: 600, color: reportData.inputs?.insulin > 160 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                        {reportData.inputs?.insulin > 160 ? 'Elevated' : 'Normal'}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '0.4rem 0.75rem' }}>Body Mass Index (BMI)</td>
                      <td style={{ padding: '0.4rem 0.75rem', fontWeight: 'bold' }}>{reportData.inputs?.bmi} kg/m²</td>
                      <td style={{ padding: '0.4rem 0.75rem', color: '#64748b' }}>18.5 - 24.9 kg/m²</td>
                      <td style={{ padding: '0.4rem 0.75rem', fontWeight: 600, color: reportData.inputs?.bmi >= 30 ? 'var(--color-danger)' : reportData.inputs?.bmi >= 25 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                        {reportData.inputs?.bmi >= 30 ? 'Obese' : reportData.inputs?.bmi >= 25 ? 'Overweight' : 'Normal'}
                      </td>
                    </tr>
                    {reportData.inputs?.diabetes_pedigree !== undefined && (
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '0.4rem 0.75rem' }}>Diabetes Pedigree Function</td>
                        <td style={{ padding: '0.4rem 0.75rem', fontWeight: 'bold' }}>{reportData.inputs.diabetes_pedigree}</td>
                        <td style={{ padding: '0.4rem 0.75rem', color: '#64748b' }}>0.08 - 2.42</td>
                        <td style={{ padding: '0.4rem 0.75rem', fontWeight: 600, color: reportData.inputs.diabetes_pedigree > 0.6 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                          {reportData.inputs.diabetes_pedigree > 0.6 ? 'Elevated Genetic Link' : 'Low Link'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Inference Results & Recommendations */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '2rem', marginTop: '0.5rem' }}>
                
                {/* Risk Metrics */}
                <div>
                  <h3 style={{ fontSize: '0.95rem', borderBottom: '2px solid #0f172a', paddingBottom: '0.25rem', marginBottom: '0.75rem', fontFamily: 'var(--font-sans)' }}>2. Model Inference Specs</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontFamily: 'var(--font-sans)', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.25rem' }}>
                      <span>Risk Probability:</span>
                      <strong style={{ fontSize: '0.95rem', color: reportData.risk_score >= 71 ? 'var(--color-danger)' : reportData.risk_score >= 41 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                        {reportData.risk_score}%
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.25rem' }}>
                      <span>Model Confidence:</span>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--color-primary)' }}>
                        {reportData.confidence_score || 80}%
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.25rem' }}>
                      <span>Classification Outcome:</span>
                      <span style={{ fontWeight: 'bold' }}>{reportData.result}</span>
                    </div>
                    <p style={{ fontSize: '0.73rem', color: '#64748b', fontStyle: 'italic', lineHeight: 1.35, marginTop: '0.4rem', margin: 0 }}>
                      Predictive model inferences are based on machine learning parameters compiled from DWH cohorts. They serve to guide clinical practitioners.
                    </p>
                  </div>
                </div>

                {/* Actionable Recommendations */}
                <div>
                  <h3 style={{ fontSize: '0.95rem', borderBottom: '2px solid #0f172a', paddingBottom: '0.25rem', marginBottom: '0.75rem', fontFamily: 'var(--font-sans)' }}>3. AI Care Recommendations</h3>
                  {reportData.recommendations && reportData.recommendations.length > 0 ? (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem', fontFamily: 'var(--font-sans)' }}>
                      {reportData.recommendations.map((rec: string, idx: number) => (
                        <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#1e293b' }}>
                          <span style={{ 
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '14px',
                            height: '14px',
                            borderRadius: '50%',
                            backgroundColor: 
                              reportData.risk_score >= 71 
                                ? 'var(--color-danger)' 
                                : reportData.risk_score >= 41 
                                  ? 'var(--color-warning)' 
                                  : 'var(--color-success)',
                            color: '#ffffff',
                            fontSize: '8px',
                            fontWeight: 'bold',
                            flexShrink: 0
                          }}>✓</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ fontStyle: 'italic', color: '#64748b', fontSize: '0.8rem', fontFamily: 'var(--font-sans)' }}>No care recommendations found for this record.</p>
                  )}
                </div>

              </div>

              {/* Disclaimer & Signatures */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem', marginTop: '2.5rem', fontSize: '0.72rem', lineHeight: 1.4, color: '#475569', borderTop: '1px dashed #cbd5e1', paddingTop: '1rem' }}>
                <div>
                  <strong>Legal & Clinical Disclaimer:</strong> This decision support report contains predictive scoring metrics. The recommendations output are generated based on mathematical classifiers synced from data warehouse repositories. They are designed to support and supplement, not substitute, clinical diagnoses of certified physicians.
                </div>
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center' }}>
                  <span style={{ borderBottom: '1px solid #475569', width: '80%', paddingBottom: '0.2rem', fontWeight: 'bold' }}>
                    Dr. Vaishnav
                  </span>
                  <span style={{ textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                    Authorized DSS Signee
                  </span>
                </div>
              </div>

            </div>
          ) : (
            /* Tabular Report Preview Sheet */
            <div className="card report-sheet" style={{ 
              backgroundColor: '#ffffff', 
              borderColor: '#94a3b8',
              padding: '3rem',
              fontFamily: 'serif',
              boxShadow: '0 0 10px rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '2rem',
              color: '#0f172a'
            }}>
              {/* Report Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '3px solid #0f172a', paddingBottom: '1.25rem' }}>
                <div>
                  <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)' }}>AI-Driven Healthcare DSS</h1>
                  <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-sans)', color: 'var(--color-text-secondary)', fontWeight: 550 }}>Clinical Data Warehousing and Predictive Systems</span>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.75rem', fontFamily: 'var(--font-sans)', color: 'var(--color-text-secondary)' }}>
                  <strong>Date Compiled:</strong> {new Date().toLocaleDateString()}<br />
                  <strong>Status:</strong> Clinical Finalized
                </div>
              </div>

              {/* Document Title */}
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: '1.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {reportType === 'clinical' ? 'Clinical Outcomes High-Risk Registry' : 
                   reportType === 'etl' ? 'Data Warehouse ETL Pipelines Audit Summary' : 
                   'Screening Operations Activity Report'}
                </h2>
                <span style={{ fontSize: '0.8rem', color: '#475569', display: 'block', marginTop: '0.25rem' }}>
                  Data Warehouse Query Range: {dateFrom} to {dateTo}
                </span>
              </div>

              {/* Table */}
              <div style={{ width: '100%', overflowX: 'auto', border: '1px solid #94a3b8', borderRadius: '4px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #0f172a', backgroundColor: '#f1f5f9' }}>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 'bold' }}>Record ID</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 'bold' }}>Subject / Resource</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 'bold' }}>Clinical Indicators / Context</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 'bold' }}>Metric Score</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 'bold' }}>Decision System Outcome</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((row: any) => (
                      <tr key={row.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 'bold' }}>{row.id}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>{row.name}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>{row.vitals}</td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 'bold' }}>
                          {typeof row.risk === 'number' ? `${row.risk}%` : row.risk}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{row.outcome}</td>
                      </tr>
                    ))}
                    {reportData.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#475569' }}>No database matches found for query filters.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Disclaimer & Signatures */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem', marginTop: '3rem', fontSize: '0.75rem', lineHeight: 1.4, color: '#475569', borderTop: '1px dashed #cbd5e1', paddingTop: '1.5rem' }}>
                <div>
                  <strong>Legal & Clinical Disclaimer:</strong> This decision support report contains predictive scoring metrics. The probabilities output are generated based on mathematical classifiers synced from data warehouse repositories. They are designed to support and supplement, not substitute, clinical diagnoses of certified physicians.
                </div>
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '2.5rem', alignItems: 'center' }}>
                  <span style={{ borderBottom: '1px solid #475569', width: '80%', paddingBottom: '0.25rem', fontWeight: 'bold' }}>
                    Dr. Vaishnav
                  </span>
                  <span style={{ textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                    Authorized DSS Signee
                  </span>
                </div>
              </div>

            </div>
          )}
        </div>
      )}

      {/* Printing Styles */}
      <style jsx global>{`
        @media print {
          .no-print, header, aside, .main-layout-viewport > header {
            display: none !important;
          }
          .main-layout-viewport {
            margin: 0 !important;
            padding: 0 !important;
          }
          body {
            background-color: #ffffff !important;
          }
          .report-sheet {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
