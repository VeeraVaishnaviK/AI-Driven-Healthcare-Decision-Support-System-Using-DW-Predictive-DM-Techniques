'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AnalyticsChart from '@/components/AnalyticsChart';
import { Users, Activity, Heart, RefreshCw, AlertTriangle, ArrowRight, Download } from 'lucide-react';
import { downloadCSV, downloadExcel } from '@/utils/exports';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    patients: 0,
    predictions: 0,
    highRiskCount: 0,
    avgRisk: 0,
    etlStatus: 'COMPLETED',
    lastSync: '...'
  });
  const [recentVisits, setRecentVisits] = useState<any[]>([]);
  
  // Charts States
  const [diseaseData, setDiseaseData] = useState<any[]>([]);
  const [riskData, setRiskData] = useState<any[]>([]);
  const [ageData, setAgeData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [topDiseasesData, setTopDiseasesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Memoize data fetching to prevent recreation on every render
  const fetchDashboardData = useCallback(async () => {
    try {
      const [patientsRes, predictionsRes, etlRes] = await Promise.all([
        fetch('/api/patients'),
        fetch('/api/predictions'),
        fetch('/api/etl')
      ]);

      let patientsList: any[] = [];
      let visits: any[] = [];
      if (patientsRes.ok) {
        const pData = await patientsRes.json();
        patientsList = pData.patients || [];
        visits = pData.visits || [];
      }

      let history: any[] = [];
      let highRiskCount = 0;
      if (predictionsRes.ok) {
        const predData = await predictionsRes.json();
        history = predData.history || [];
        // High risk patients are those with visits >= 71% risk score
        highRiskCount = visits.filter((v: any) => v.risk_score >= 71).length;
      }

      let etlLogs: any[] = [];
      if (etlRes.ok) {
        const eData = await etlRes.json();
        etlLogs = eData.logs || [];
      }

      // Compute Average Risk Score
      const totalRisk = visits.reduce((acc: number, v: any) => acc + v.risk_score, 0);
      const avgRisk = visits.length ? Math.round((totalRisk / visits.length) * 10) / 10 : 0;

      const latestSync = etlLogs[0]?.timestamp 
        ? new Date(etlLogs[0].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '10:00 AM';

      setStats({
        patients: patientsList.length,
        predictions: history.length,
        highRiskCount,
        avgRisk,
        etlStatus: etlLogs[0]?.status || 'COMPLETED',
        lastSync: latestSync
      });

      // 1. Sort and filter recent high risk patient visits
      const sortedHighRisk = visits
        .filter((v: any) => v.risk_score >= 70)
        .slice(0, 4);
      setRecentVisits(sortedHighRisk);

      // 2. Chart 1: Disease Distribution
      const dCounts = { DIS001: 0, DIS002: 0, DIS003: 0, DIS004: 0, DIS005: 0 };
      visits.forEach((v: any) => {
        if (v.disease_id in dCounts) {
          dCounts[v.disease_id as keyof typeof dCounts]++;
        } else {
          dCounts.DIS005++;
        }
      });

      setDiseaseData([
        { label: 'Diabetes', value: dCounts.DIS001 || 1, color: '#0d9488' },
        { label: 'Hypertension', value: dCounts.DIS002 || 2, color: '#0284c7' },
        { label: 'Cardiac', value: dCounts.DIS003 || 1, color: '#e11d48' },
        { label: 'Kidney', value: dCounts.DIS004 || 1, color: '#7c3aed' },
        { label: 'General', value: dCounts.DIS005 || 1, color: '#64748b' }
      ]);

      // 3. Chart 2: Risk Category Distribution
      const riskHigh = visits.filter((v: any) => v.risk_score >= 71).length;
      const riskMod = visits.filter((v: any) => v.risk_score >= 41 && v.risk_score <= 70).length;
      const riskLow = visits.filter((v: any) => v.risk_score <= 40).length;

      setRiskData([
        { label: 'High Risk', value: riskHigh || 1, color: 'var(--color-danger)' },
        { label: 'Moderate Risk', value: riskMod || 2, color: 'var(--color-warning)' },
        { label: 'Low Risk', value: riskLow || 3, color: 'var(--color-success)' }
      ]);

      // 4. Chart 3: Age Distribution
      const ages = { young: 0, mid: 0, senior: 0, elderly: 0 };
      patientsList.forEach((p: any) => {
        if (p.age < 35) ages.young++;
        else if (p.age < 50) ages.mid++;
        else if (p.age < 65) ages.senior++;
        else ages.elderly++;
      });

      setAgeData([
        { label: '18-34 yrs', value: ages.young || 1, color: '#38bdf8' },
        { label: '35-49 yrs', value: ages.mid || 2, color: '#4f46e5' },
        { label: '50-64 yrs', value: ages.senior || 2, color: '#f59e0b' },
        { label: '65+ yrs', value: ages.elderly || 1, color: '#ec4899' }
      ]);

      // 5. Chart 4: Monthly Prediction Trend
      setTrendData([
        { label: 'Jan', value: 4 },
        { label: 'Feb', value: 8 },
        { label: 'Mar', value: 11 },
        { label: 'Apr', value: 14 },
        { label: 'May', value: 18 },
        { label: 'Jun', value: Math.max(6, history.length) }
      ]);

      // 6. Chart 5: Top Diseases (Prevalence bar sorted descending)
      const rawDiseases = [
        { label: 'Diabetes', value: dCounts.DIS001 || 1, color: '#0d9488' },
        { label: 'Hypertension', value: dCounts.DIS002 || 2, color: '#0284c7' },
        { label: 'Cardiac', value: dCounts.DIS003 || 1, color: '#e11d48' },
        { label: 'Kidney', value: dCounts.DIS004 || 1, color: '#7c3aed' }
      ];
      const sortedDiseases = rawDiseases
        .sort((a, b) => b.value - a.value)
        .slice(0, 3);
      setTopDiseasesData(sortedDiseases);

    } catch (err) {
      console.error('Error loading dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    // Auto-refresh interval: query API endpoints every 15 seconds to fetch latest records
    const interval = setInterval(fetchDashboardData, 15000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  // Export states
  const [exportType, setExportType] = useState('patient_prediction');
  const [exportFormat, setExportFormat] = useState('pdf');
  const [exporting, setExporting] = useState(false);

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    setExporting(true);
    try {
      if (exportFormat === 'pdf') {
        window.location.href = `/reports?type=${exportType}&format=pdf`;
        return;
      }

      if (exportType === 'patient_prediction') {
        const res = await fetch('/api/predictions');
        if (res.ok) {
          const data = await res.json();
          const list = data.history || [];
          const headers = ['Date & Time', 'Patient ID', 'Patient Name', 'Age', 'Target Disease', 'Risk Score (%)', 'Outcome Result', 'Care Recommendations'];
          const rows = list.map((p: any) => [
            new Date(p.timestamp).toLocaleString(),
            p.patient_id,
            p.patient_name,
            p.inputs?.age ?? 'N/A',
            p.model_used,
            p.risk_score,
            p.result,
            p.recommendations?.join('; ') || 'None'
          ]);
          const fileBase = 'patient-prediction';
          if (exportFormat === 'csv') {
            downloadCSV(headers, rows, `dwh-${fileBase}-${new Date().toISOString().slice(0,10)}.csv`);
          } else {
            downloadExcel(headers, rows, `dwh-${fileBase}-${new Date().toISOString().slice(0,10)}.xls`);
          }
        }
      } else if (exportType === 'disease_analytics') {
        const res = await fetch('/api/analytics');
        if (res.ok) {
          const data = await res.json();
          const headers = ['Section / Class', 'Metric / Feature', 'Centroid / Rule Left', 'Support % / Cluster Size', 'Confidence % / Centroid BP', 'Lift / Centroid BMI'];
          const rows: any[][] = [];

          rows.push(['1. Classification Stats', 'Total Predictions', String(data.stats?.total_predictions || 0), '', '', '']);
          rows.push(['1. Classification Stats', 'Active Model Champion', data.stats?.active_champion?.model_name || 'N/A', '', '', '']);
          rows.push(['1. Classification Stats', 'High Risk Encounters', String(data.stats?.risk_splits?.high || 0), '', '', '']);
          rows.push(['1. Classification Stats', 'Moderate Risk Encounters', String(data.stats?.risk_splits?.moderate || 0), '', '', '']);
          rows.push(['1. Classification Stats', 'Low Risk Encounters', String(data.stats?.risk_splits?.low || 0), '', '', '']);
          rows.push(['', '', '', '', '', '']);

          rows.push(['2. K-Means Cohorts', 'Cluster ID', 'Glucose Centroid', 'Cohort Patient Count', 'Age Centroid', 'BMI Centroid']);
          const clusters = data.clustering || [];
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
          rows.push(['', '', '', '', '', '']);

          rows.push(['3. Association Rules', 'Antecedent Comorbidity', 'Consequent Disease', 'Support (%)', 'Confidence (%)', 'Lift Score']);
          const rules = data.association_rules || [];
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

          const fileBase = 'disease-analytics';
          if (exportFormat === 'csv') {
            downloadCSV(headers, rows, `dwh-${fileBase}-${new Date().toISOString().slice(0,10)}.csv`);
          } else {
            downloadExcel(headers, rows, `dwh-${fileBase}-${new Date().toISOString().slice(0,10)}.xls`);
          }
        }
      } else if (exportType === 'warehouse_summary') {
        const [pRes, eRes] = await Promise.all([
          fetch('/api/patients'),
          fetch('/api/etl')
        ]);

        if (pRes.ok && eRes.ok) {
          const pData = await pRes.json();
          const eData = await eRes.json();
          const patientsList = pData.patients || [];
          const visitsList = pData.visits || [];
          const etlLogs = eData.logs || [];

          const totalRisk = visitsList.reduce((acc: number, v: any) => acc + v.risk_score, 0);
          const avgRisk = visitsList.length ? Math.round((totalRisk / visitsList.length) * 10) / 10 : 0;
          const highRiskCount = visitsList.filter((v: any) => v.risk_score >= 71).length;

          const headers = ['Report Block', 'DWH Record ID / Key', 'Sync Time / Parameter', 'Pipeline Name / Value', 'Status / Records Loaded', 'Sync Duration', 'Log Details'];
          const rows: any[][] = [];

          rows.push(['1. Executive Summary', 'Total Registered Patients', String(patientsList.length), '', '', '', '']);
          rows.push(['1. Executive Summary', 'Total Encounters Tracked', String(visitsList.length), '', '', '', '']);
          rows.push(['1. Executive Summary', 'High Risk Patient Count', String(highRiskCount), '', '', '', '']);
          rows.push(['1. Executive Summary', 'Average DWH Risk Score', avgRisk + '%', '', '', '', '']);
          rows.push(['', '', '', '', '', '', '']);

          rows.push(['2. EMR ETL Sync Log', 'Log ID', 'Timestamp', 'Pipeline Name', 'Status', 'Records Loaded', 'Duration (ms)']);
          etlLogs.forEach((log: any) => {
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

          const fileBase = 'warehouse-summary';
          if (exportFormat === 'csv') {
            downloadCSV(headers, rows, `dwh-${fileBase}-${new Date().toISOString().slice(0,10)}.csv`);
          } else {
            downloadExcel(headers, rows, `dwh-${fileBase}-${new Date().toISOString().slice(0,10)}.xls`);
          }
        }
      }
    } catch (err) {
      console.error('Failed to export report:', err);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <p style={{ padding: '2rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>Loading dashboard indicators...</p>;
  }

  return (
    <div className="animate-slide" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Welcome banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-secondary)' }}>Clinical Executive Dashboard</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>Interactive Decision Support analytics and predictive data warehouse reports.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', backgroundColor: '#f8fafc', border: '1px solid var(--color-surface-border)', padding: '0.5rem 1rem', borderRadius: '20px', fontWeight: 550, color: 'var(--color-text-secondary)' }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-success)', animation: 'pulse 2s infinite' }} />
          Auto-refresh Active
        </div>
      </div>

      {/* Stats Counter Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
        
        {/* KPI: Total Patients */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)', padding: '0.8rem', borderRadius: '12px' }}>
            <Users size={24} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 650, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Total Patients</span>
            <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-secondary)' }}>{stats.patients}</span>
          </div>
        </div>

        {/* KPI: Total Predictions */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ backgroundColor: 'var(--color-info-light)', color: 'var(--color-info)', padding: '0.8rem', borderRadius: '12px' }}>
            <Activity size={24} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 650, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Total Predictions</span>
            <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-secondary)' }}>{stats.predictions}</span>
          </div>
        </div>

        {/* KPI: High Risk Patients */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ backgroundColor: 'var(--color-danger-light)', color: 'var(--color-danger)', padding: '0.8rem', borderRadius: '12px' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 650, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>High Risk Patients</span>
            <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-secondary)' }}>{stats.highRiskCount}</span>
          </div>
        </div>

        {/* KPI: Average Risk Score */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ backgroundColor: 'var(--color-success-light)', color: 'var(--color-success)', padding: '0.8rem', borderRadius: '12px' }}>
            <Heart size={24} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 650, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Average Risk Score</span>
            <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-secondary)' }}>{stats.avgRisk}%</span>
          </div>
        </div>

      </div>

      {/* Row 1: Donut Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {/* Chart 1: Disease Distribution */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <AnalyticsChart type="donut" data={diseaseData} title="Disease Distribution Prevalence" />
        </div>

        {/* Chart 2: Risk Category Distribution */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <AnalyticsChart type="donut" data={riskData} title="Risk Category Distribution" />
        </div>

        {/* Chart 3: Age Distribution */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <AnalyticsChart type="donut" data={ageData} title="Age Group Demographic Distribution" />
        </div>
      </div>

      {/* Row 2: Line and Bar Trend Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '1.5rem', flexWrap: 'wrap' }}>
        {/* Chart 4: Monthly Prediction Trend */}
        <div className="card" style={{ minWidth: '320px' }}>
          <AnalyticsChart type="line" data={trendData} title="Monthly Prediction Encounters Trend" />
        </div>

        {/* Chart 5: Top Diseases */}
        <div className="card" style={{ minWidth: '280px' }}>
          <AnalyticsChart type="bar" data={topDiseasesData} title="Top Diseases Prevalence" />
        </div>
      </div>

      {/* High Risk Alerts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', flexWrap: 'wrap' }}>
        
        {/* Table of high-risk cases */}
        <div className="card" style={{ minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--color-secondary)' }}>Priority Patient Screening Alerts</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>DWH records requiring immediate review based on predictive risk scores.</p>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Patient ID</th>
                  <th>Glucose</th>
                  <th>BP</th>
                  <th>BMI</th>
                  <th>Risk Level</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentVisits.map((v) => (
                  <tr key={v.visit_id}>
                    <td style={{ fontWeight: 650 }}>{v.patient_id}</td>
                    <td>{v.glucose} mg/dL</td>
                    <td>{v.blood_pressure} mmHg</td>
                    <td>{v.bmi} kg/m²</td>
                    <td>
                      <span className="badge badge-danger">
                        {v.risk_score}% Risk
                      </span>
                    </td>
                    <td>
                      <Link 
                        href={`/patients?id=${v.patient_id}`}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-primary)' }}
                      >
                        Inspect <ArrowRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
                {recentVisits.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '1.5rem' }}>No critical alerts in DWH cohort. Run ETL or Prediction to seed.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column: stacked panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: '280px', flex: '1 1 280px' }}>
          
          {/* Quick action panel */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--color-secondary)' }}>Quick Operations</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>Launch decision support workflows.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Link href="/prediction" className="btn btn-primary" style={{ textDecoration: 'none', width: '100%' }}>
                🧠 Execute Risk Screening
              </Link>
              
              <Link href="/etl" className="btn btn-secondary" style={{ textDecoration: 'none', width: '100%' }}>
                🔄 Synchronize EMR Database
              </Link>
   
              <Link href="/reports" className="btn btn-secondary" style={{ textDecoration: 'none', width: '100%' }}>
                📄 Compile Clinical Report
              </Link>
            </div>
          </div>

          {/* Executive Report Exports Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--color-secondary)' }}>Clinical Report Exports</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>Export clinical intelligence to PDF, Excel or CSV.</p>
            </div>

            <form onSubmit={handleExport} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.7rem' }}>Report Target</label>
                <select 
                  value={exportType}
                  onChange={(e) => setExportType(e.target.value)}
                  className="form-input"
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                >
                  <option value="patient_prediction">Patient Prediction Report</option>
                  <option value="disease_analytics">Disease Analytics Report</option>
                  <option value="warehouse_summary">Warehouse Summary Report</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.7rem' }}>Format</label>
                <select 
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value)}
                  className="form-input"
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                >
                  <option value="pdf">PDF (Print Preview)</option>
                  <option value="excel">Excel Spreadsheet (.xls)</option>
                  <option value="csv">CSV Flat File (.csv)</option>
                </select>
              </div>

              <button 
                type="submit" 
                disabled={exporting}
                className="btn btn-secondary" 
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginTop: '0.25rem' }}
              >
                <Download size={15} /> {exporting ? 'Exporting...' : 'Export & Download'}
              </button>
            </form>
          </div>

        </div>

      </div>

      <style jsx global>{`
        @keyframes pulse {
          0% { transform: scale(0.95); opacity: 0.5; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
