'use client';

import { useState, useEffect } from 'react';
import { FileSpreadsheet, Printer, Download, Calendar, FileText, CheckCircle } from 'lucide-react';

export default function ReportsPage() {
  const [reportType, setReportType] = useState('clinical');
  const [dateFrom, setDateFrom] = useState('2026-06-01');
  const [dateTo, setDateTo] = useState('2026-06-08');
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

    setTimeout(() => {
      // Filter data context based on reportType
      let compiledList: any[] = [];
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
              onChange={(e) => setReportType(e.target.value)}
              className="form-input"
            >
              <option value="clinical">Clinical High-Risk Outcome Registry</option>
              <option value="etl">Data Warehouse ETL Audit Summary</option>
              <option value="prediction">Screening Operations Activity Log</option>
            </select>
          </div>

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

          {/* Report Sheet */}
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
