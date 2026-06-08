'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, Server, Sliders, BrainCircuit, BellRing, CheckCircle2 } from 'lucide-react';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Configuration states
  const [emrEndpoint, setEmrEndpoint] = useState('https://api.healthcare-network.local/v1');
  const [syncFreq, setSyncFreq] = useState('daily');
  const [threshold, setThreshold] = useState(75);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [selectedModel, setSelectedModel] = useState('RandomForest v1.0');
  
  // DWH credentials
  const [mysqlHost, setMysqlHost] = useState('localhost');
  const [mysqlUser, setMysqlUser] = useState('root');
  const [mysqlDb, setMysqlDb] = useState('healthcare_dwh');

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          const s = data.settings || {};
          if (s.emr_endpoint) setEmrEndpoint(s.emr_endpoint);
          if (s.sync_frequency) setSyncFreq(s.sync_frequency);
          if (s.alert_threshold) setThreshold(Number(s.alert_threshold));
          if (s.email_alerts !== undefined) setEmailAlerts(s.email_alerts);
          if (s.selected_model) setSelectedModel(s.selected_model);
          if (s.dwh_mysql_host) setMysqlHost(s.dwh_mysql_host);
          if (s.dwh_mysql_user) setMysqlUser(s.dwh_mysql_user);
          if (s.dwh_mysql_db) setMysqlDb(s.dwh_mysql_db);
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emr_endpoint: emrEndpoint,
          sync_frequency: syncFreq,
          alert_threshold: threshold,
          email_alerts: emailAlerts,
          selected_model: selectedModel,
          dwh_mysql_host: mysqlHost,
          dwh_mysql_user: mysqlUser,
          dwh_mysql_db: mysqlDb
        })
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p style={{ padding: '2rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>Querying configs...</p>;
  }

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {success && (
        <div className="animate-slide" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', backgroundColor: 'var(--color-success-light)', border: '1.5px solid var(--color-success-border)', borderRadius: '8px', color: 'var(--color-success)', fontWeight: 600, fontSize: '0.85rem' }}>
          <CheckCircle2 size={18} /> Settings successfully committed to database configuration file.
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', flexWrap: 'wrap' }}>
          
          {/* EMR & Synchronization settings */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--color-surface-border)', paddingBottom: '0.5rem' }}>
              <Server size={18} style={{ color: 'var(--color-primary)' }} /> EMR Integrations & ETL
            </h3>

            <div className="form-group">
              <label className="form-label">Electronic Medical Record API Endpoint</label>
              <input 
                type="text" 
                value={emrEndpoint}
                onChange={(e) => setEmrEndpoint(e.target.value)}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">ETL Pipeline Sync Frequency</label>
              <select 
                value={syncFreq} 
                onChange={(e) => setSyncFreq(e.target.value)}
                className="form-input"
              >
                <option value="hourly">Hourly Automated Synchronization</option>
                <option value="daily">Daily Cron Synchronization</option>
                <option value="weekly">Weekly Automated Sync</option>
                <option value="manual">Manual Execution Only</option>
              </select>
            </div>
          </div>

          {/* Model selection configurations */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--color-surface-border)', paddingBottom: '0.5rem' }}>
              <BrainCircuit size={18} style={{ color: 'var(--color-primary)' }} /> Predictive Mining Algorithms
            </h3>

            <div className="form-group">
              <label className="form-label">Active Machine Learning Model</label>
              <select 
                value={selectedModel} 
                onChange={(e) => setSelectedModel(e.target.value)}
                className="form-input"
              >
                <option value="RandomForest v1.0">Random Forest Classifier (Default - Star Schema compliant)</option>
                <option value="XGBoost v2.1">XGBoost Gradient Boosting Classifier</option>
                <option value="Logistic v1.0">Logistic Regression Probability Model</option>
              </select>
            </div>

            <div className="form-group">
              <span className="form-label">Framework Context</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', lineHeight: 1.4, display: 'block', padding: '0.5rem', backgroundColor: '#f8fafc', borderRadius: '4px' }}>
                Active model will run inferences on clinical inputs (Glucose, Blood Pressure, Insulin, BMI) and load findings directly into <strong>fact_patient_visit</strong>.
              </span>
            </div>
          </div>

          {/* DWH Engine credentials */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--color-surface-border)', paddingBottom: '0.5rem' }}>
              <Sliders size={18} style={{ color: 'var(--color-primary)' }} /> DWH MySQL Credentials
            </h3>

            <div className="form-group">
              <label className="form-label">Database Server Host</label>
              <input 
                type="text" 
                value={mysqlHost}
                onChange={(e) => setMysqlHost(e.target.value)}
                className="form-input"
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">User Profile</label>
                <input 
                  type="text" 
                  value={mysqlUser}
                  onChange={(e) => setMysqlUser(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">DWH Schema Name</label>
                <input 
                  type="text" 
                  value={mysqlDb}
                  onChange={(e) => setMysqlDb(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
            </div>
          </div>

          {/* Decision limits & notification flags */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--color-surface-border)', paddingBottom: '0.5rem' }}>
              <BellRing size={18} style={{ color: 'var(--color-primary)' }} /> Decision Alerts Thresholds
            </h3>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 550 }}>
                <label>Dashboard Warning Trigger Score</label>
                <strong>{threshold}% Risk Probability</strong>
              </div>
              <input 
                type="range" 
                min="50" 
                max="95" 
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--color-primary)' }}
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'block', marginTop: '0.25rem' }}>
                Triggers visual alarms in the dashboard if model risk outputs exceed this threshold.
              </span>
            </div>

            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
              <input 
                type="checkbox" 
                id="email_chk"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)' }}
              />
              <label htmlFor="email_chk" style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                Enable email notifications for attending specialists on critical triggers
              </label>
            </div>
          </div>

        </div>

        <button 
          type="submit" 
          disabled={saving} 
          className={`btn btn-primary ${saving ? 'btn-disabled' : ''}`}
          style={{ padding: '0.875rem', alignSelf: 'flex-end', minWidth: '180px' }}
        >
          <Save size={18} /> {saving ? 'Writing Configs...' : 'Save Configuration'}
        </button>

      </form>
      
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
