'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  FileSpreadsheet, 
  Printer, 
  Download, 
  Calendar, 
  FileText, 
  CheckCircle, 
  Database, 
  TrendingUp, 
  Activity, 
  Users, 
  Heart, 
  AlertTriangle 
} from 'lucide-react';
import { downloadCSV, downloadExcel } from '@/utils/exports';

export default function ReportsPage() {
  const [reportType, setReportType] = useState('patient_prediction');
  const [dateFrom, setDateFrom] = useState('2026-06-01');
  const [dateTo, setDateTo] = useState('2026-06-08');
  const [selectedPredictionId, setSelectedPredictionId] = useState('');
  const [exportFormat, setExportFormat] = useState('pdf');
  const [generating, setGenerating] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  
  // Base raw data context
  const [rawPatients, setRawPatients] = useState<any[]>([]);
  const [rawVisits, setRawVisits] = useState<any[]>([]);
  const [rawEtl, setRawEtl] = useState<any[]>([]);
  const [rawPredictions, setRawPredictions] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  // Load DWH context
  useEffect(() => {
    async function loadData() {
      try {
        const [pRes, eRes, prRes, aRes] = await Promise.all([
          fetch('/api/patients'),
          fetch('/api/etl'),
          fetch('/api/predictions'),
          fetch('/api/analytics')
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
        if (aRes.ok) {
          const a = await aRes.json();
          setAnalyticsData(a);
        }
        setDataLoaded(true);
      } catch (err) {
        console.error('Failed to load reports DWH context:', err);
        setDataLoaded(true);
      }
    }
    loadData();
  }, []);

  // Helper to compile report data rows based on filters
  const compileReportRows = useCallback((type: string) => {
    const fromMs = new Date(dateFrom).getTime();
    const toMs = new Date(dateTo).getTime() + 24 * 60 * 60 * 1000; // end of day

    if (type === 'patient_prediction') {
      const list = rawPredictions.filter(p => {
        const tMs = new Date(p.timestamp).getTime();
        return tMs >= fromMs && tMs <= toMs;
      });
      return {
        title: 'Patient Prediction Report',
        headers: ['Date & Time', 'Patient ID', 'Patient Name', 'Age', 'Target Disease', 'Risk Score (%)', 'Outcome Result', 'Care Recommendations'],
        rows: list.map(p => [
          new Date(p.timestamp).toLocaleString(),
          p.patient_id,
          p.patient_name,
          p.inputs?.age ?? 'N/A',
          p.model_used,
          p.risk_score,
          p.result,
          p.recommendations?.join('; ') || 'None'
        ]),
        raw: list
      };
    } else if (type === 'disease_analytics') {
      // Create a unified grid structure for K-Means rules and classification splits
      const headers = ['Section / Class', 'Metric / Feature', 'Centroid / Rule Left', 'Support % / Cluster Size', 'Confidence % / Centroid BP', 'Lift / Centroid BMI'];
      const rows: any[][] = [];

      if (analyticsData) {
        // Classification metrics
        rows.push(['1. Classification Stats', 'Total Predictions', String(analyticsData.stats?.total_predictions || 0), '', '', '']);
        rows.push(['1. Classification Stats', 'Active Model Champion', analyticsData.stats?.active_champion?.model_name || 'N/A', '', '', '']);
        rows.push(['1. Classification Stats', 'High Risk Encounters', String(analyticsData.stats?.risk_splits?.high || 0), '', '', '']);
        rows.push(['1. Classification Stats', 'Moderate Risk Encounters', String(analyticsData.stats?.risk_splits?.moderate || 0), '', '', '']);
        rows.push(['1. Classification Stats', 'Low Risk Encounters', String(analyticsData.stats?.risk_splits?.low || 0), '', '', '']);
        rows.push(['', '', '', '', '', '']); // Divider

        // K-Means clusters
        rows.push(['2. K-Means Cohorts', 'Cluster ID', 'Glucose Centroid', 'Cohort Patient Count', 'Age Centroid', 'BMI Centroid']);
        const clusters = analyticsData.clustering || [];
        clusters.forEach((c: any) => {
          rows.push([
            '2. K-Means Cohorts',
            c.clusterId,
            Math.round(c.centroid.glucose) + ' mg/dL',
            c.points.length + ' Patients',
            Math.round(c.centroid.age) + ' yrs',
            Math.round(c.centroid.bmi) + ' kg/m²'
          ]);
        });
        rows.push(['', '', '', '', '', '']); // Divider

        // Association Rules
        rows.push(['3. Association Rules', 'Antecedent Comorbidity', 'Consequent Disease', 'Support (%)', 'Confidence (%)', 'Lift Score']);
        const rules = analyticsData.association_rules || [];
        rules.forEach((r: any) => {
          rows.push([
            '3. Association Rules',
            r.antecedent.join(' & '),
            r.consequent.join(' & '),
            Math.round(r.support * 100) + '%',
            Math.round(r.confidence * 100) + '%',
            r.lift.toFixed(2)
          ]);
        });
      }

      return {
        title: 'Disease Analytics Report',
        headers,
        rows,
        raw: analyticsData
      };
    } else if (type === 'warehouse_summary') {
      const headers = ['Report Block', 'DWH Record ID / Key', 'Sync Time / Parameter', 'Pipeline Name / Value', 'Status / Records Loaded', 'Sync Duration', 'Log Details'];
      const rows: any[][] = [];

      // DWH Summary Stats
      const totalRisk = rawVisits.reduce((acc, v) => acc + v.risk_score, 0);
      const avgRisk = rawVisits.length ? Math.round((totalRisk / rawVisits.length) * 10) / 10 : 0;
      const highRiskCount = rawVisits.filter(v => v.risk_score >= 71).length;

      rows.push(['1. Executive Summary', 'Total Registered Patients', String(rawPatients.length), '', '', '', '']);
      rows.push(['1. Executive Summary', 'Total Encounters Tracked', String(rawVisits.length), '', '', '', '']);
      rows.push(['1. Executive Summary', 'High Risk Patient Count', String(highRiskCount), '', '', '', '']);
      rows.push(['1. Executive Summary', 'Average DWH Risk Score', avgRisk + '%', '', '', '', '']);
      rows.push(['', '', '', '', '', '', '']); // Divider

      // ETL Logs
      rows.push(['2. EMR ETL Sync Log', 'Log ID', 'Timestamp', 'Pipeline Name', 'Status', 'Records Loaded', 'Duration (ms)']);
      rawEtl.forEach((log: any) => {
        rows.push([
          '2. EMR ETL Sync Log',
          log.log_id,
          new Date(log.timestamp).toLocaleString(),
          log.pipeline_name,
          log.status,
          log.records_loaded,
          log.duration_ms + 'ms'
        ]);
      });

      return {
        title: 'Warehouse Summary Report',
        headers,
        rows,
        raw: {
          stats: {
            patients: rawPatients.length,
            visits: rawVisits.length,
            highRisk: highRiskCount,
            avgRisk
          },
          etl: rawEtl
        }
      };
    } else if (type === 'diagnostic') {
      const match = rawPredictions.find(p => p.prediction_id === selectedPredictionId);
      return {
        title: 'Patient Diagnostic & Recommendations Report',
        headers: [],
        rows: [],
        raw: match || null
      };
    }

    return null;
  }, [dateFrom, dateTo, rawPredictions, rawPatients, rawVisits, rawEtl, analyticsData, selectedPredictionId]);

  // Execute compiler
  const handleGenerate = (e?: React.FormEvent, forceType?: string, forceFormat?: string) => {
    if (e) e.preventDefault();
    
    const targetType = forceType || reportType;
    const targetFormat = forceFormat || exportFormat;

    if (targetType === 'diagnostic' && !selectedPredictionId) {
      alert('Please select a patient screening run first.');
      return;
    }

    setGenerating(true);
    setReportData(null);

    // Short timeout to simulate DWH query compilation
    setTimeout(() => {
      const data = compileReportRows(targetType);
      if (!data) {
        setGenerating(false);
        return;
      }

      setReportData(data);
      setGenerating(false);

      // Trigger automatic downloads if format is CSV or Excel
      if (targetFormat === 'csv') {
        const fileBase = targetType.replace(/_/g, '-');
        downloadCSV(data.headers, data.rows, `dwh-${fileBase}-${new Date().toISOString().slice(0,10)}.csv`);
      } else if (targetFormat === 'excel') {
        const fileBase = targetType.replace(/_/g, '-');
        downloadExcel(data.headers, data.rows, `dwh-${fileBase}-${new Date().toISOString().slice(0,10)}.xls`);
      } else if (targetFormat === 'pdf') {
        // Delay print request to allow React DOM compilation
        setTimeout(() => {
          window.print();
        }, 300);
      }
    }, 600);
  };

  // Listen to URL parameters for dashboard direct trigger
  useEffect(() => {
    if (!dataLoaded) return;

    const params = new URLSearchParams(window.location.search);
    const typeParam = params.get('type');
    const formatParam = params.get('format');
    const pidParam = params.get('pid');

    if (typeParam) {
      setReportType(typeParam);
      if (formatParam) setExportFormat(formatParam);
      if (pidParam) setSelectedPredictionId(pidParam);
      
      // Auto compile report
      setTimeout(() => {
        handleGenerate(undefined, typeParam, formatParam || 'pdf');
      }, 500);
    }
  }, [dataLoaded]);

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Parameters Panel */}
      <div className="card no-print">
        <div style={{ marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-secondary)' }}>DWH Decision Support Report Center</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
            Query, compile and export structured clinical audits, classifications, K-Means cluster segmentation cohorts, and patient diagnostics.
          </p>
        </div>

        <form onSubmit={(e) => handleGenerate(e)} style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '220px', marginBottom: 0 }}>
            <label className="form-label">Select Report Target</label>
            <select 
              value={reportType}
              onChange={(e) => {
                setReportType(e.target.value);
                setReportData(null);
              }}
              className="form-input"
            >
              <option value="patient_prediction">Patient Prediction Report</option>
              <option value="disease_analytics">Disease Analytics Report (Clusters & Rules)</option>
              <option value="warehouse_summary">Warehouse Summary Report (DWH & ETL)</option>
              <option value="diagnostic">Patient Diagnostic & Care Recommendations (Single)</option>
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
              <div className="form-group" style={{ flex: 0.4, minWidth: '130px', marginBottom: 0 }}>
                <label className="form-label">Date From</label>
                <input 
                  type="date" 
                  value={dateFrom} 
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ flex: 0.4, minWidth: '130px', marginBottom: 0 }}>
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

          <div className="form-group" style={{ flex: 0.4, minWidth: '130px', marginBottom: 0 }}>
            <label className="form-label">Export Format</label>
            <select 
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              className="form-input"
            >
              <option value="pdf">PDF (Print Layout)</option>
              <option value="excel">Excel Spreadsheet (.xls)</option>
              <option value="csv">CSV Flat File (.csv)</option>
            </select>
          </div>

          <button 
            type="submit" 
            disabled={generating} 
            className={`btn btn-primary ${generating ? 'btn-disabled' : ''}`}
            style={{ height: '42px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <FileText size={18} /> {generating ? 'Compiling DWH...' : 'Generate & Export'}
          </button>
        </form>
      </div>

      {/* Printable Report Preview */}
      {reportData && (
        <div className="animate-slide" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Controls above preview */}
          <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '1rem 1.5rem', borderRadius: '12px', border: '1px solid var(--color-surface-border)' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
              Report compiled successfully. Click Print to export as PDF.
            </span>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button 
                onClick={() => {
                  const data = compileReportRows(reportType);
                  if (data) downloadCSV(data.headers, data.rows, `report-${reportType}.csv`);
                }} 
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem' }}
              >
                <FileSpreadsheet size={16} /> Export CSV
              </button>
              <button 
                onClick={() => {
                  const data = compileReportRows(reportType);
                  if (data) downloadExcel(data.headers, data.rows, `report-${reportType}.xls`);
                }} 
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem' }}
              >
                <Download size={16} /> Export Excel
              </button>
              <button 
                onClick={() => window.print()} 
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem' }}
              >
                <Printer size={16} /> Print Report (PDF)
              </button>
            </div>
          </div>

          {reportType === 'diagnostic' ? (
            /* Patient Diagnostic & Recommendations Report Sheet (Single patient) */
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

              <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: '1.35rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                  Patient Diagnostic & Recommendation Report
                </h2>
                <span style={{ fontSize: '0.8rem', color: '#475569', display: 'block', marginTop: '0.25rem' }}>
                  Decision Support System Inferred Care Recommendation Registry
                </span>
              </div>

              {reportData.raw ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', border: '1px solid #cbd5e1', padding: '1rem', borderRadius: '4px', backgroundColor: '#f8fafc', fontFamily: 'var(--font-sans)', fontSize: '0.85rem' }}>
                    <div>
                      <strong>Patient ID:</strong> {reportData.raw.patient_id}<br />
                      <strong>Patient Name:</strong> {reportData.raw.patient_name}<br />
                      <strong>Age:</strong> {reportData.raw.inputs?.age || 'N/A'} years<br />
                      <strong>Screening Run ID:</strong> {reportData.raw.prediction_id}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <strong>Timestamp:</strong> {new Date(reportData.raw.timestamp).toLocaleString()}<br />
                      <strong>Algorithm Used:</strong> {reportData.raw.model_used}<br />
                      <strong>Outcome Status:</strong> <span style={{ 
                        fontWeight: 700,
                        color: reportData.raw.risk_score >= 71 ? 'var(--color-danger)' : reportData.raw.risk_score >= 41 ? 'var(--color-warning)' : 'var(--color-success)'
                      }}>{reportData.raw.result}</span>
                    </div>
                  </div>

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
                        {reportData.raw.inputs?.pregnancies !== undefined && (
                          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '0.4rem 0.75rem' }}>Pregnancies</td>
                            <td style={{ padding: '0.4rem 0.75rem', fontWeight: 'bold' }}>{reportData.raw.inputs.pregnancies}</td>
                            <td style={{ padding: '0.4rem 0.75rem', color: '#64748b' }}>0 - 4 (Normal)</td>
                            <td style={{ padding: '0.4rem 0.75rem', fontWeight: 600, color: reportData.raw.inputs.pregnancies > 4 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                              {reportData.raw.inputs.pregnancies > 4 ? 'Elevated' : 'Normal'}
                            </td>
                          </tr>
                        )}
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '0.4rem 0.75rem' }}>Glucose Level</td>
                          <td style={{ padding: '0.4rem 0.75rem', fontWeight: 'bold' }}>{reportData.raw.inputs?.glucose} mg/dL</td>
                          <td style={{ padding: '0.4rem 0.75rem', color: '#64748b' }}>70 - 100 mg/dL</td>
                          <td style={{ padding: '0.4rem 0.75rem', fontWeight: 600, color: reportData.raw.inputs?.glucose >= 126 ? 'var(--color-danger)' : reportData.raw.inputs?.glucose >= 100 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                            {reportData.raw.inputs?.glucose >= 126 ? 'Diabetic Fasting' : reportData.raw.inputs?.glucose >= 100 ? 'Pre-diabetic' : 'Normal'}
                          </td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '0.4rem 0.75rem' }}>Systolic Blood Pressure</td>
                          <td style={{ padding: '0.4rem 0.75rem', fontWeight: 'bold' }}>{reportData.raw.inputs?.blood_pressure} mmHg</td>
                          <td style={{ padding: '0.4rem 0.75rem', color: '#64748b' }}>90 - 120 mmHg</td>
                          <td style={{ padding: '0.4rem 0.75rem', fontWeight: 600, color: reportData.raw.inputs?.blood_pressure >= 140 ? 'var(--color-danger)' : reportData.raw.inputs?.blood_pressure >= 130 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                            {reportData.raw.inputs?.blood_pressure >= 140 ? 'Hypertensive' : reportData.raw.inputs?.blood_pressure >= 130 ? 'Elevated' : 'Normal'}
                          </td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '0.4rem 0.75rem' }}>Body Mass Index (BMI)</td>
                          <td style={{ padding: '0.4rem 0.75rem', fontWeight: 'bold' }}>{reportData.raw.inputs?.bmi} kg/m²</td>
                          <td style={{ padding: '0.4rem 0.75rem', color: '#64748b' }}>18.5 - 24.9 kg/m²</td>
                          <td style={{ padding: '0.4rem 0.75rem', fontWeight: 600, color: reportData.raw.inputs?.bmi >= 30 ? 'var(--color-danger)' : reportData.raw.inputs?.bmi >= 25 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                            {reportData.raw.inputs?.bmi >= 30 ? 'Obese' : reportData.raw.inputs?.bmi >= 25 ? 'Overweight' : 'Normal'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '2rem', marginTop: '0.5rem' }}>
                    <div>
                      <h3 style={{ fontSize: '0.95rem', borderBottom: '2px solid #0f172a', paddingBottom: '0.25rem', marginBottom: '0.75rem', fontFamily: 'var(--font-sans)' }}>2. Model Inference Specs</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontFamily: 'var(--font-sans)', fontSize: '0.8rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.25rem' }}>
                          <span>Risk Probability:</span>
                          <strong style={{ fontSize: '0.95rem', color: reportData.raw.risk_score >= 71 ? 'var(--color-danger)' : reportData.raw.risk_score >= 41 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                            {reportData.raw.risk_score}%
                          </strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.25rem' }}>
                          <span>Model Confidence:</span>
                          <strong style={{ fontSize: '0.95rem', color: 'var(--color-primary)' }}>
                            {reportData.raw.confidence_score || 80}%
                          </strong>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 style={{ fontSize: '0.95rem', borderBottom: '2px solid #0f172a', paddingBottom: '0.25rem', marginBottom: '0.75rem', fontFamily: 'var(--font-sans)' }}>3. AI Care Recommendations</h3>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem', fontFamily: 'var(--font-sans)' }}>
                        {reportData.raw.recommendations?.map((rec: string, idx: number) => (
                          <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#1e293b' }}>
                            <span style={{ 
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '14px',
                              height: '14px',
                              borderRadius: '50%',
                              backgroundColor: reportData.raw.risk_score >= 71 ? 'var(--color-danger)' : reportData.raw.risk_score >= 41 ? 'var(--color-warning)' : 'var(--color-success)',
                              color: '#ffffff',
                              fontSize: '8px',
                              fontWeight: 'bold',
                              flexShrink: 0
                            }}>✓</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </>
              ) : (
                <p style={{ textAlign: 'center', fontStyle: 'italic', padding: '2rem' }}>No screening data selected.</p>
              )}

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
            /* Structured Tabular Report Sheets (Predictions, Analytics, Warehouse Summary) */
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
              
              {/* Clinical Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '3px solid #0f172a', paddingBottom: '1.25rem' }}>
                <div>
                  <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)' }}>AI-Driven Healthcare DSS</h1>
                  <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-sans)', color: 'var(--color-text-secondary)', fontWeight: 550 }}>Clinical Data Warehousing and Decision Support Systems</span>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.75rem', fontFamily: 'var(--font-sans)', color: 'var(--color-text-secondary)' }}>
                  <strong>Date Compiled:</strong> {new Date().toLocaleDateString()}<br />
                  <strong>Document Status:</strong> Finalized Audit
                </div>
              </div>

              {/* Title Section */}
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: '1.4rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                  {reportData.title}
                </h2>
                <span style={{ fontSize: '0.8rem', color: '#475569', display: 'block', marginTop: '0.25rem' }}>
                  {reportType === 'disease_analytics' 
                    ? 'Clinical Mining Models: K-Means Clustering & Apriori Rules'
                    : `Data Warehouse Query Filter: ${dateFrom} to ${dateTo}`}
                </span>
              </div>

              {/* Patient Prediction Report Detail Layout */}
              {reportType === 'patient_prediction' && (
                <div style={{ width: '100%', overflowX: 'auto', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left', fontFamily: 'var(--font-sans)' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #0f172a', backgroundColor: '#f1f5f9' }}>
                        <th style={{ padding: '0.6rem 0.8rem', fontWeight: 'bold' }}>Timestamp</th>
                        <th style={{ padding: '0.6rem 0.8rem', fontWeight: 'bold' }}>Patient Details</th>
                        <th style={{ padding: '0.6rem 0.8rem', fontWeight: 'bold' }}>Model Used</th>
                        <th style={{ padding: '0.6rem 0.8rem', fontWeight: 'bold' }}>Risk Score</th>
                        <th style={{ padding: '0.6rem 0.8rem', fontWeight: 'bold' }}>Prediction Result</th>
                        <th style={{ padding: '0.6rem 0.8rem', fontWeight: 'bold' }}>Clinical Recommendation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.raw.map((p: any) => (
                        <tr key={p.prediction_id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '0.6rem 0.8rem', whiteSpace: 'nowrap' }}>{new Date(p.timestamp).toLocaleString()}</td>
                          <td style={{ padding: '0.6rem 0.8rem' }}>
                            <strong>{p.patient_name}</strong><br />
                            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>ID: {p.patient_id} | Age: {p.inputs?.age || 'N/A'}</span>
                          </td>
                          <td style={{ padding: '0.6rem 0.8rem' }}>{p.model_used}</td>
                          <td style={{ padding: '0.6rem 0.8rem', fontWeight: 'bold' }}>{p.risk_score}%</td>
                          <td style={{ padding: '0.6rem 0.8rem' }}>
                            <span style={{ 
                              color: p.risk_score >= 71 ? 'var(--color-danger)' : p.risk_score >= 41 ? 'var(--color-warning)' : 'var(--color-success)',
                              fontWeight: 600
                            }}>{p.result}</span>
                          </td>
                          <td style={{ padding: '0.6rem 0.8rem', fontSize: '0.75rem', maxWidth: '200px' }}>
                            {p.recommendations?.join('; ') || 'No recommendations'}
                          </td>
                        </tr>
                      ))}
                      {reportData.raw.length === 0 && (
                        <tr>
                          <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No clinical prediction runs recorded within the select date range.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Disease Analytics Report Layout */}
              {reportType === 'disease_analytics' && reportData.raw && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', fontFamily: 'var(--font-sans)' }}>
                  
                  {/* Classification statistics */}
                  <div>
                    <h3 style={{ fontSize: '0.95rem', borderBottom: '2px solid #0f172a', paddingBottom: '0.25rem', marginBottom: '0.75rem' }}>1. Classification & Prediction Statistics</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                      <div style={{ border: '1px solid #cbd5e1', padding: '0.75rem', borderRadius: '4px', backgroundColor: '#f8fafc' }}>
                        <span style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', color: '#64748b' }}>Total Inferences Run</span>
                        <strong style={{ fontSize: '1.2rem', color: 'var(--color-primary)' }}>{reportData.raw.stats?.total_predictions || 0}</strong>
                      </div>
                      <div style={{ border: '1px solid #cbd5e1', padding: '0.75rem', borderRadius: '4px', backgroundColor: '#f8fafc' }}>
                        <span style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', color: '#64748b' }}>Active Champion Model</span>
                        <strong style={{ fontSize: '1.05rem', color: 'var(--color-secondary)' }}>{reportData.raw.stats?.active_champion?.model_name || 'Classifiers'}</strong>
                      </div>
                      <div style={{ border: '1px solid #cbd5e1', padding: '0.75rem', borderRadius: '4px', backgroundColor: '#f8fafc' }}>
                        <span style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', color: '#64748b' }}>High Risk Patient Ratio</span>
                        <strong style={{ fontSize: '1.2rem', color: 'var(--color-danger)' }}>{reportData.raw.stats?.risk_splits?.high || 0}</strong>
                      </div>
                    </div>
                  </div>

                  {/* K-Means clustering outcomes */}
                  <div>
                    <h3 style={{ fontSize: '0.95rem', borderBottom: '2px solid #0f172a', paddingBottom: '0.25rem', marginBottom: '0.75rem' }}>2. Patient Cluster Segmentation Cohorts (K-Means)</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #94a3b8', backgroundColor: '#f1f5f9' }}>
                          <th style={{ padding: '0.5rem 0.75rem', fontWeight: 'bold' }}>Cluster ID</th>
                          <th style={{ padding: '0.5rem 0.75rem', fontWeight: 'bold' }}>Centroid Glucose</th>
                          <th style={{ padding: '0.5rem 0.75rem', fontWeight: 'bold' }}>Centroid Systolic BP</th>
                          <th style={{ padding: '0.5rem 0.75rem', fontWeight: 'bold' }}>Centroid BMI</th>
                          <th style={{ padding: '0.5rem 0.75rem', fontWeight: 'bold' }}>Centroid Age</th>
                          <th style={{ padding: '0.5rem 0.75rem', fontWeight: 'bold' }}>Cohort Size</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.raw.clustering?.map((c: any) => (
                          <tr key={c.clusterId} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '0.5rem 0.75rem', fontWeight: 'bold' }}>Cohort {c.clusterId}</td>
                            <td style={{ padding: '0.5rem 0.75rem' }}>{Math.round(c.centroid.glucose)} mg/dL</td>
                            <td style={{ padding: '0.5rem 0.75rem' }}>{Math.round(c.centroid.blood_pressure)} mmHg</td>
                            <td style={{ padding: '0.5rem 0.75rem' }}>{Math.round(c.centroid.bmi)} kg/m²</td>
                            <td style={{ padding: '0.5rem 0.75rem' }}>{Math.round(c.centroid.age)} yrs</td>
                            <td style={{ padding: '0.5rem 0.75rem', fontWeight: 'bold' }}>{c.points.length} Patients</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Association Rules */}
                  <div>
                    <h3 style={{ fontSize: '0.95rem', borderBottom: '2px solid #0f172a', paddingBottom: '0.25rem', marginBottom: '0.75rem' }}>3. Association Rules Discovery (Comorbidities Linkage)</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #94a3b8', backgroundColor: '#f1f5f9' }}>
                          <th style={{ padding: '0.5rem 0.75rem', fontWeight: 'bold' }}>Antecedent Symptom</th>
                          <th style={{ padding: '0.5rem 0.75rem', fontWeight: 'bold' }}>Consequent Disease Link</th>
                          <th style={{ padding: '0.5rem 0.75rem', fontWeight: 'bold' }}>Support (%)</th>
                          <th style={{ padding: '0.5rem 0.75rem', fontWeight: 'bold' }}>Confidence (%)</th>
                          <th style={{ padding: '0.5rem 0.75rem', fontWeight: 'bold' }}>Lift Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.raw.association_rules?.map((r: any, idx: number) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>{r.antecedent.join(' & ')}</td>
                            <td style={{ padding: '0.5rem 0.75rem', color: 'var(--color-primary)' }}>➔ {r.consequent.join(' & ')}</td>
                            <td style={{ padding: '0.5rem 0.75rem' }}>{Math.round(r.support * 100)}%</td>
                            <td style={{ padding: '0.5rem 0.75rem', fontWeight: 'bold' }}>{Math.round(r.confidence * 100)}%</td>
                            <td style={{ padding: '0.5rem 0.75rem' }}>{r.lift.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                </div>
              )}

              {/* Warehouse Summary Report Layout */}
              {reportType === 'warehouse_summary' && reportData.raw && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', fontFamily: 'var(--font-sans)' }}>
                  
                  {/* DWH metrics summary cards */}
                  <div>
                    <h3 style={{ fontSize: '0.95rem', borderBottom: '2px solid #0f172a', paddingBottom: '0.25rem', marginBottom: '0.75rem' }}>1. Data Warehouse Core Metrics</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                      <div style={{ border: '1px solid #cbd5e1', padding: '0.75rem', borderRadius: '4px', backgroundColor: '#f8fafc' }}>
                        <span style={{ display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', color: '#64748b' }}>Total Patients</span>
                        <strong style={{ fontSize: '1.2rem', color: 'var(--color-secondary)' }}>{reportData.raw.stats.patients}</strong>
                      </div>
                      <div style={{ border: '1px solid #cbd5e1', padding: '0.75rem', borderRadius: '4px', backgroundColor: '#f8fafc' }}>
                        <span style={{ display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', color: '#64748b' }}>Visits/Encounters</span>
                        <strong style={{ fontSize: '1.2rem', color: 'var(--color-primary)' }}>{reportData.raw.stats.visits}</strong>
                      </div>
                      <div style={{ border: '1px solid #cbd5e1', padding: '0.75rem', borderRadius: '4px', backgroundColor: '#f8fafc' }}>
                        <span style={{ display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', color: '#64748b' }}>High Risk Patients</span>
                        <strong style={{ fontSize: '1.2rem', color: 'var(--color-danger)' }}>{reportData.raw.stats.highRisk}</strong>
                      </div>
                      <div style={{ border: '1px solid #cbd5e1', padding: '0.75rem', borderRadius: '4px', backgroundColor: '#f8fafc' }}>
                        <span style={{ display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', color: '#64748b' }}>Average Cohort Risk</span>
                        <strong style={{ fontSize: '1.2rem', color: 'var(--color-success)' }}>{reportData.raw.stats.avgRisk}%</strong>
                      </div>
                    </div>
                  </div>

                  {/* ETL Log execution list */}
                  <div>
                    <h3 style={{ fontSize: '0.95rem', borderBottom: '2px solid #0f172a', paddingBottom: '0.25rem', marginBottom: '0.75rem' }}>2. EMR Data Integration Pipelines Audit (ETL Logs)</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #94a3b8', backgroundColor: '#f1f5f9' }}>
                          <th style={{ padding: '0.5rem 0.75rem', fontWeight: 'bold' }}>Log ID</th>
                          <th style={{ padding: '0.5rem 0.75rem', fontWeight: 'bold' }}>Execution Time</th>
                          <th style={{ padding: '0.5rem 0.75rem', fontWeight: 'bold' }}>Pipeline Name</th>
                          <th style={{ padding: '0.5rem 0.75rem', fontWeight: 'bold' }}>Sync Status</th>
                          <th style={{ padding: '0.5rem 0.75rem', fontWeight: 'bold' }}>Records Loaded</th>
                          <th style={{ padding: '0.5rem 0.75rem', fontWeight: 'bold' }}>Duration</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.raw.etl.map((log: any) => (
                          <tr key={log.log_id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '0.5rem 0.75rem', fontWeight: 'bold' }}>{log.log_id}</td>
                            <td style={{ padding: '0.5rem 0.75rem' }}>{new Date(log.timestamp).toLocaleString()}</td>
                            <td style={{ padding: '0.5rem 0.75rem' }}>{log.pipeline_name}</td>
                            <td style={{ padding: '0.5rem 0.75rem' }}>
                              <span style={{ 
                                color: log.status === 'COMPLETED' ? 'var(--color-success)' : 'var(--color-danger)',
                                fontWeight: 'bold'
                              }}>{log.status}</span>
                            </td>
                            <td style={{ padding: '0.5rem 0.75rem' }}>{log.records_loaded} rows</td>
                            <td style={{ padding: '0.5rem 0.75rem' }}>{log.duration_ms} ms</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                </div>
              )}

              {/* Signature section */}
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
