'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Play, ShieldAlert, Terminal, CheckCircle2, History, Database, Cpu, HardDriveDownload } from 'lucide-react';

export default function EtlPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState<'IDLE' | 'EXTRACT' | 'TRANSFORM' | 'LOAD' | 'DONE'>('IDLE');
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/etl');
      if (res.ok) {
        const json = await res.json();
        setLogs(json.logs || []);
      }
    } catch (err) {
      console.error('Failed to load ETL logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const runEtl = async () => {
    if (running) return;
    setRunning(true);
    setProgress(0);
    setTerminalLogs([]);
    
    const messages = {
      extract: [
        '[INFO] Initializing ETL process: EMR_DWH_SYNC_JOB',
        '[INFO] Resolving endpoint connection to https://api.healthcare-network.local/v1...',
        '[INFO] Connection established. Querying patient encounter charts for last 24 hours...',
        '[INFO] Extraction complete. Found 5 raw clinical records.'
      ],
      transform: [
        '[TRANSFORM] Initiating data mapping rules...',
        '[TRANSFORM] Mapping address fields to formal geographic tokens...',
        '[TRANSFORM] Standardizing blood pressure indicators to systolic values...',
        '[TRANSFORM] Validating clinical metrics range bounds...',
        '[TRANSFORM] Encoding diagnoses to standardized Dimension Disease IDs (ICD-10 maps)...',
        '[TRANSFORM] Data cleansing completed. Quality check: 100% compliant.'
      ],
      load: [
        '[LOAD] Establishing transactional boundary on DWH MySQL Server...',
        '[LOAD] Executing batch dimension inserts to dim_patient...',
        '[LOAD] Executing time dimension index keys to dim_time...',
        '[LOAD] Committing clinical fact measures to fact_patient_visit...',
        '[LOAD] Rebuilding database indices idx_fact_patient and idx_fact_time...',
        '[INFO] ETL Transaction committed successfully.'
      ]
    };

    // Stage 1: Extraction (0 - 30%)
    setCurrentStage('EXTRACT');
    for (let i = 0; i < messages.extract.length; i++) {
      setTerminalLogs(prev => [...prev, messages.extract[i]]);
      setProgress(Math.floor(((i + 1) / messages.extract.length) * 30));
      await sleep(350);
    }

    // Stage 2: Transformation (30 - 70%)
    setCurrentStage('TRANSFORM');
    for (let i = 0; i < messages.transform.length; i++) {
      setTerminalLogs(prev => [...prev, messages.transform[i]]);
      setProgress(30 + Math.floor(((i + 1) / messages.transform.length) * 40));
      await sleep(300);
    }

    // Stage 3: Loading (70 - 95%)
    setCurrentStage('LOAD');
    for (let i = 0; i < messages.load.length; i++) {
      setTerminalLogs(prev => [...prev, messages.load[i]]);
      setProgress(70 + Math.floor(((i + 1) / messages.load.length) * 25));
      await sleep(300);
    }

    // Trigger API to do actual data insert in mock db
    try {
      const res = await fetch('/api/etl', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setTerminalLogs(prev => [
          ...prev, 
          `[SUCCESS] Integration completed. Inserted ${data.insertedCount} new patient fact files. Job ID: ${data.log.log_id}`,
          `[INFO] ETL job completed in ${data.log.duration_ms}ms.`
        ]);
        setProgress(100);
        setCurrentStage('DONE');
        fetchLogs(); // Reload logs list
      } else {
        throw new Error('API Sync failed');
      }
    } catch (err) {
      setTerminalLogs(prev => [...prev, '[CRITICAL] Database write failed. Transaction rolled back.']);
      setCurrentStage('IDLE');
    } finally {
      setRunning(false);
    }
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Visual Pipeline Flow Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto 1fr', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        
        {/* Source EMR */}
        <div className="card" style={{ 
          textAlign: 'center', 
          border: currentStage === 'EXTRACT' ? '2px solid var(--color-primary)' : '1px solid var(--color-surface-border)',
          backgroundColor: currentStage === 'EXTRACT' ? 'var(--color-primary-light)' : 'var(--color-surface)',
          padding: '1.25rem',
          transition: 'all 0.3s'
        }}>
          <HardDriveDownload size={32} style={{ color: currentStage === 'EXTRACT' ? 'var(--color-primary)' : 'var(--color-text-secondary)', marginBottom: '0.5rem' }} />
          <h4 style={{ fontSize: '0.9rem' }}>1. EMR Extraction</h4>
          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Raw Electronic Medical Logs</span>
        </div>

        {/* Arrow 1 */}
        <div style={{ fontSize: '1.5rem', color: currentStage === 'TRANSFORM' || currentStage === 'LOAD' || currentStage === 'DONE' ? 'var(--color-primary)' : 'var(--color-text-muted)', fontWeight: 'bold' }}>➔</div>

        {/* Transform Engine */}
        <div className="card" style={{ 
          textAlign: 'center', 
          border: currentStage === 'TRANSFORM' ? '2px solid var(--color-primary)' : '1px solid var(--color-surface-border)',
          backgroundColor: currentStage === 'TRANSFORM' ? 'var(--color-primary-light)' : 'var(--color-surface)',
          padding: '1.25rem',
          transition: 'all 0.3s'
        }}>
          <Cpu size={32} style={{ color: currentStage === 'TRANSFORM' ? 'var(--color-primary)' : 'var(--color-text-secondary)', marginBottom: '0.5rem' }} />
          <h4 style={{ fontSize: '0.9rem' }}>2. Schema Transformation</h4>
          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Normalizations & ICD-10 Joins</span>
        </div>

        {/* Arrow 2 */}
        <div style={{ fontSize: '1.5rem', color: currentStage === 'LOAD' || currentStage === 'DONE' ? 'var(--color-primary)' : 'var(--color-text-muted)', fontWeight: 'bold' }}>➔</div>

        {/* Target DWH */}
        <div className="card" style={{ 
          textAlign: 'center', 
          border: currentStage === 'LOAD' ? '2px solid var(--color-primary)' : '1px solid var(--color-surface-border)',
          backgroundColor: currentStage === 'LOAD' ? 'var(--color-primary-light)' : 'var(--color-surface)',
          padding: '1.25rem',
          transition: 'all 0.3s'
        }}>
          <Database size={32} style={{ color: currentStage === 'LOAD' ? 'var(--color-primary)' : 'var(--color-text-secondary)', marginBottom: '0.5rem' }} />
          <h4 style={{ fontSize: '0.9rem' }}>3. Warehouse Load</h4>
          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Commit Facts & Dim Indexing</span>
        </div>

      </div>

      {/* Runner Interface */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
        
        {/* Terminal Logger */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: '#020617', borderColor: '#1e293b', color: '#10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b', paddingBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>
              <Terminal size={16} />
              <span>ETL Diagnostics Console</span>
            </div>
            <span style={{ fontSize: '0.7rem', backgroundColor: '#1e293b', color: '#94a3b8', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>Bash</span>
          </div>

          <div style={{ 
            height: '240px', 
            overflowY: 'auto', 
            fontFamily: 'monospace', 
            fontSize: '0.8rem', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '0.35rem',
            padding: '0.5rem 0'
          }}>
            {terminalLogs.length === 0 ? (
              <span style={{ color: '#64748b' }}>Console idle. Click "Run ETL pipeline Sync" to start synchronization workflow...</span>
            ) : (
              terminalLogs.map((logStr, idx) => (
                <div 
                  key={idx} 
                  style={{ 
                    color: logStr.includes('[SUCCESS]') ? '#10b981' : 
                           logStr.includes('[TRANSFORM]') ? '#38bdf8' : 
                           logStr.includes('[LOAD]') ? '#fb7185' : '#e2e8f0'
                  }}
                >
                  {logStr}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Trigger Controls & Status */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>ETL Sync Orchestrator</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
              Pulls newly added electronic medical entries, validates boundaries, and commits records to your Star Schema warehouse.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, justifyContent: 'center' }}>
            
            {/* Progress Bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.5rem', fontWeight: 600 }}>
                <span>Job Integration Progress</span>
                <span>{progress}%</span>
              </div>
              <div style={{ width: '100%', height: '12px', backgroundColor: '#e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                <div 
                  style={{ 
                    width: `${progress}%`, 
                    height: '100%', 
                    backgroundColor: 'var(--color-primary)', 
                    transition: 'width 0.25s ease' 
                  }} 
                />
              </div>
            </div>

            {/* Run Button */}
            <button 
              onClick={runEtl} 
              disabled={running} 
              className={`btn btn-primary ${running ? 'btn-disabled' : ''}`}
              style={{ width: '100%', padding: '0.875rem' }}
            >
              {running ? (
                <>
                  <RefreshCw size={18} className="animate-spin" style={{ animation: 'spin 1.5s linear infinite' }} /> Synchronizing DWH Tables...
                </>
              ) : (
                <>
                  <Play size={18} /> Run ETL Pipeline Sync
                </>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* Sync history logs */}
      <div className="card">
        <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <History size={18} style={{ color: 'var(--color-primary)' }} /> ETL Execution Logs
        </h3>

        <div className="table-container">
          {loading ? (
            <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading logs...</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Job ID</th>
                  <th>Timestamp</th>
                  <th>Pipeline Name</th>
                  <th>Extracted</th>
                  <th>Transformed</th>
                  <th>Loaded</th>
                  <th>Duration</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.log_id}>
                    <td style={{ fontWeight: 650 }}>{log.log_id}</td>
                    <td>{new Date(log.timestamp).toLocaleString()}</td>
                    <td style={{ fontWeight: 600, color: 'var(--color-secondary)' }}>{log.pipeline_name}</td>
                    <td>{log.records_extracted} rows</td>
                    <td>{log.records_transformed} rows</td>
                    <td>{log.records_loaded} rows</td>
                    <td>{log.duration_ms}ms</td>
                    <td>
                      <span className="badge badge-success">
                        <CheckCircle2 size={12} /> {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
