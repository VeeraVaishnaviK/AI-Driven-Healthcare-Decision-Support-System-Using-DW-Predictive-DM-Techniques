'use client';

import { useState, useEffect } from 'react';
import DwhSchema from '@/components/DwhSchema';
import { Database, Table, HelpCircle, Activity } from 'lucide-react';

export default function WarehousePage() {
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('fact_patient_visit');
  const [loading, setLoading] = useState(true);
  const [dbMode, setDbMode] = useState<'MySQL' | 'File System Fallback'>('File System Fallback');

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/patients');
        if (res.ok) {
          const json = await res.ok ? await res.json() : null;
          if (json) {
            setData(json);
          }
        }
        
        // Fetch settings to check if MySQL is configured
        const settingsRes = await fetch('/api/settings');
        if (settingsRes.ok) {
          const sJson = await settingsRes.json();
          if (sJson?.settings?.dwh_mysql_host && sJson?.settings?.dwh_mysql_user) {
            setDbMode('MySQL');
          }
        }
      } catch (err) {
        console.error('Error fetching warehouse data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const tabs = [
    { id: 'fact_patient_visit', label: 'fact_patient_visit (Fact)' },
    { id: 'dim_patient', label: 'dim_patient (Dimension)' },
    { id: 'dim_doctor', label: 'dim_doctor (Dimension)' },
    { id: 'dim_disease', label: 'dim_disease (Dimension)' },
    { id: 'dim_time', label: 'dim_time (Dimension)' },
  ];

  const renderTableData = () => {
    if (!data) return <p style={{ padding: '1rem', color: 'var(--color-text-secondary)' }}>No warehouse records found.</p>;

    switch (activeTab) {
      case 'fact_patient_visit':
        return (
          <table className="data-table">
            <thead>
              <tr>
                <th>Visit ID</th>
                <th>Patient ID</th>
                <th>Doctor ID</th>
                <th>Disease ID</th>
                <th>Time ID</th>
                <th>Glucose</th>
                <th>Blood Pressure</th>
                <th>Insulin</th>
                <th>BMI</th>
                <th>Result</th>
                <th>Risk Score</th>
              </tr>
            </thead>
            <tbody>
              {data.visits?.map((v: any) => (
                <tr key={v.visit_id}>
                  <td style={{ fontWeight: 650, color: 'var(--color-primary)' }}>{v.visit_id}</td>
                  <td>{v.patient_id}</td>
                  <td>{v.doctor_id}</td>
                  <td>{v.disease_id}</td>
                  <td>{v.time_id}</td>
                  <td>{v.glucose} mg/dL</td>
                  <td>{v.blood_pressure} mmHg</td>
                  <td>{v.insulin} uIU/mL</td>
                  <td>{v.bmi} kg/m²</td>
                  <td>
                    <span className={`badge ${
                      v.risk_score >= 75 ? 'badge-danger' : 
                      v.risk_score >= 40 ? 'badge-warning' : 'badge-success'
                    }`}>
                      {v.prediction_result}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{v.risk_score}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'dim_patient':
        return (
          <table className="data-table">
            <thead>
              <tr>
                <th>Patient ID</th>
                <th>Patient Name</th>
                <th>Age</th>
                <th>Gender</th>
                <th>Address</th>
                <th>Contact</th>
              </tr>
            </thead>
            <tbody>
              {data.patients?.map((p: any) => (
                <tr key={p.patient_id}>
                  <td style={{ fontWeight: 650 }}>{p.patient_id}</td>
                  <td style={{ fontWeight: 600, color: 'var(--color-secondary)' }}>{p.patient_name}</td>
                  <td>{p.age} yrs</td>
                  <td>{p.gender}</td>
                  <td>{p.address}</td>
                  <td>{p.contact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'dim_doctor':
        return (
          <table className="data-table">
            <thead>
              <tr>
                <th>Doctor ID</th>
                <th>Doctor Name</th>
                <th>Specialization</th>
              </tr>
            </thead>
            <tbody>
              {data.doctors?.map((d: any) => (
                <tr key={d.doctor_id}>
                  <td style={{ fontWeight: 650 }}>{d.doctor_id}</td>
                  <td style={{ fontWeight: 600, color: 'var(--color-secondary)' }}>{d.doctor_name}</td>
                  <td>
                    <span className="badge badge-info">{d.specialization}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'dim_disease':
        return (
          <table className="data-table">
            <thead>
              <tr>
                <th>Disease ID</th>
                <th>Disease Name</th>
              </tr>
            </thead>
            <tbody>
              {data.diseases?.map((d: any) => (
                <tr key={d.disease_id}>
                  <td style={{ fontWeight: 650 }}>{d.disease_id}</td>
                  <td style={{ fontWeight: 600 }}>{d.disease_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'dim_time':
        return (
          <table className="data-table">
            <thead>
              <tr>
                <th>Time ID</th>
                <th>Day</th>
                <th>Month</th>
                <th>Year</th>
              </tr>
            </thead>
            <tbody>
              {data.times?.map((t: any) => (
                <tr key={t.time_id}>
                  <td style={{ fontWeight: 650 }}>{t.time_id}</td>
                  <td>{t.day}</td>
                  <td>{t.month}</td>
                  <td>{t.year}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      default:
        return null;
    }
  };

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Overview stats cards */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div className="card" style={{ flex: 1, minWidth: '240px', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ backgroundColor: 'var(--color-primary-light)', padding: '0.875rem', borderRadius: '50%', color: 'var(--color-primary)' }}>
            <Database size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Warehouse Engine</span>
            <span style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-secondary)' }}>Star Schema (MySQL)</span>
            <span style={{ fontSize: '0.7rem', display: 'block', color: dbMode === 'MySQL' ? 'var(--color-success)' : 'var(--color-warning)', fontWeight: 550, marginTop: '2px' }}>
              ● Connected: {dbMode}
            </span>
          </div>
        </div>

        <div className="card" style={{ flex: 1, minWidth: '240px', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ backgroundColor: 'var(--color-success-light)', padding: '0.875rem', borderRadius: '50%', color: 'var(--color-success)' }}>
            <Table size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Total Warehouse Records</span>
            <span style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-secondary)' }}>
              {data ? (data.visits?.length + data.patients?.length + data.doctors?.length + data.diseases?.length + data.times?.length) : '...'} Records
            </span>
            <span style={{ fontSize: '0.7rem', display: 'block', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              4 Dimensions | 1 Fact Table
            </span>
          </div>
        </div>
      </div>

      {/* Relational Star Schema Diagram */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Logical Schema Diagram</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>Hover over keys to highlight relationship joins (Foreign Keys to Primary Keys)</p>
          </div>
          <span className="badge badge-info" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Activity size={12} /> Live Joins
          </span>
        </div>
        <DwhSchema />
      </div>

      {/* Database Viewer Grid */}
      <div className="card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Relational Table Viewer</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>Select a database table to query records in real-time</p>
          </div>
          
          {/* Table Selector Tabs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', borderBottom: '1px solid var(--color-surface-border)', paddingBottom: '0.5rem' }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.85rem',
                  fontWeight: activeTab === tab.id ? 600 : 500,
                  backgroundColor: activeTab === tab.id ? 'var(--color-primary-light)' : 'transparent',
                  color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  border: 'none',
                  borderBottom: activeTab === tab.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  borderRadius: '4px 4px 0 0'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Data Grid */}
        <div className="table-container">
          {loading ? (
            <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Querying tables...</p>
          ) : (
            renderTableData()
          )}
        </div>
      </div>
    </div>
  );
}
