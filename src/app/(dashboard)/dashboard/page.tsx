'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AnalyticsChart from '@/components/AnalyticsChart';
import { Users, Activity, Heart, RefreshCw, AlertTriangle, ArrowRight } from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    patients: 0,
    predictions: 0,
    alerts: 0,
    etlStatus: 'COMPLETED',
    lastSync: '...'
  });
  const [recentVisits, setRecentVisits] = useState<any[]>([]);
  const [admissionsData, setAdmissionsData] = useState<any[]>([]);
  const [riskData, setRiskData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const [patientsRes, predictionsRes, etlRes] = await Promise.all([
          fetch('/api/patients'),
          fetch('/api/predictions'),
          fetch('/api/etl')
        ]);

        let patientsCount = 0;
        let visits: any[] = [];
        if (patientsRes.ok) {
          const pData = await patientsRes.json();
          patientsCount = pData.patients?.length || 0;
          visits = pData.visits || [];
        }

        let predictionsCount = 0;
        let alertCount = 0;
        if (predictionsRes.ok) {
          const predData = await predictionsRes.json();
          predictionsCount = predData.history?.length || 0;
          // Count predictions that are High risk
          alertCount = predData.history?.filter((p: any) => p.risk_score >= 75).length || 0;
        }

        let etlLogs: any[] = [];
        if (etlRes.ok) {
          const eData = await etlRes.json();
          etlLogs = eData.logs || [];
        }

        // Set state values
        const latestSync = etlLogs[0]?.timestamp 
          ? new Date(etlLogs[0].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '10:00 AM';

        setStats({
          patients: patientsCount,
          predictions: predictionsCount,
          alerts: alertCount,
          etlStatus: etlLogs[0]?.status || 'COMPLETED',
          lastSync: latestSync
        });

        // 1. Sort and filter high risk patient visits (recent alerts)
        const sortedHighRisk = visits
          .filter((v: any) => v.risk_score >= 70)
          .slice(0, 4);
        setRecentVisits(sortedHighRisk);

        // 2. Generate Admissions trends mock values based on actual database size
        setAdmissionsData([
          { label: 'Mon', value: 4 },
          { label: 'Tue', value: 6 },
          { label: 'Wed', value: 2 },
          { label: 'Thu', value: 5 },
          { label: 'Fri', value: admissionsCountToVisit(visits, 5) },
          { label: 'Sat', value: admissionsCountToVisit(visits, 6) },
          { label: 'Sun', value: admissionsCountToVisit(visits, 7) }
        ]);

        // 3. Generate Risk breakdown ratios
        const highRisk = visits.filter((v: any) => v.risk_score >= 75).length;
        const modRisk = visits.filter((v: any) => v.risk_score >= 40 && v.risk_score < 75).length;
        const lowRisk = visits.filter((v: any) => v.risk_score < 40).length;

        setRiskData([
          { label: 'High Risk', value: highRisk || 1, color: 'var(--color-danger)' },
          { label: 'Moderate Risk', value: modRisk || 2, color: 'var(--color-warning)' },
          { label: 'Normal / Healthy', value: lowRisk || 3, color: 'var(--color-success)' }
        ]);

      } catch (err) {
        console.error('Error loading dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    }

    function admissionsCountToVisit(visits: any[], offset: number) {
      // Mock variations
      return Math.max(1, (visits.length - offset) + Math.floor(Math.random() * 3));
    }

    fetchDashboardData();
  }, []);

  if (loading) {
    return <p style={{ padding: '2rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>Loading dashboard indicators...</p>;
  }

  return (
    <div className="animate-slide" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Welcome banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-secondary)' }}>Clinical Decision Support Portal</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>Overview of Patient Warehouse Metrics and Predictive Screening Runs.</p>
        </div>
        <span style={{ fontSize: '0.8rem', backgroundColor: '#f8fafc', border: '1px solid var(--color-surface-border)', padding: '0.5rem 1rem', borderRadius: '20px', fontWeight: 550, color: 'var(--color-text-secondary)' }}>
          System Online
        </span>
      </div>

      {/* Stats Counter Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
        
        {/* KPI: Patients */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)', padding: '0.8rem', borderRadius: '12px' }}>
            <Users size={24} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 650, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Patients Tracked</span>
            <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-secondary)' }}>{stats.patients}</span>
          </div>
        </div>

        {/* KPI: Predictions */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ backgroundColor: 'var(--color-info-light)', color: 'var(--color-info)', padding: '0.8rem', borderRadius: '12px' }}>
            <Activity size={24} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 650, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Screening Scans</span>
            <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-secondary)' }}>{stats.predictions}</span>
          </div>
        </div>

        {/* KPI: Alerts */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ backgroundColor: 'var(--color-danger-light)', color: 'var(--color-danger)', padding: '0.8rem', borderRadius: '12px' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 650, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>High Risk Alerts</span>
            <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-secondary)' }}>{stats.alerts}</span>
          </div>
        </div>

        {/* KPI: ETL status */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ backgroundColor: 'var(--color-success-light)', color: 'var(--color-success)', padding: '0.8rem', borderRadius: '12px' }}>
            <RefreshCw size={24} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 650, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>EMR ETL Sync</span>
            <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-secondary)' }}>{stats.etlStatus}</span>
            <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>Last: {stats.lastSync}</span>
          </div>
        </div>

      </div>

      {/* Visual Analytics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', flexWrap: 'wrap' }}>
        
        {/* Line Chart */}
        <div className="card" style={{ minWidth: '320px' }}>
          <AnalyticsChart type="line" data={admissionsData} title="Patient Visits Trend (Weekly Admissions)" />
        </div>

        {/* Donut Chart */}
        <div className="card" style={{ minWidth: '280px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <AnalyticsChart type="donut" data={riskData} title="Cohort Risk Allocation" />
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

        {/* Quick action panel */}
        <div className="card" style={{ minWidth: '260px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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

      </div>

      {/* Responsive adjustments override style */}
      <style jsx>{`
        @media (max-width: 992px) {
          div {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
