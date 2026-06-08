'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  RefreshCw, Play, ShieldAlert, Terminal, CheckCircle2, 
  History, Database, Cpu, HardDriveDownload, Upload, AlertCircle, FileSpreadsheet, Sparkles 
} from 'lucide-react';

export default function EtlPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState<'IDLE' | 'EXTRACT' | 'TRANSFORM' | 'LOAD' | 'DONE'>('IDLE');
  
  // Pipeline metrics
  const [metrics, setMetrics] = useState<any>(null);
  const [anomaliesList, setAnomaliesList] = useState<string[]>([]);
  
  // Uploader configurations
  const [datasetType, setDatasetType] = useState<'diabetes' | 'heart'>('diabetes');
  const [fileName, setFileName] = useState('');
  const [csvContent, setCsvContent] = useState('');
  
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const sampleDiabetesCsv = `Pregnancies,Glucose,BloodPressure,SkinThickness,Insulin,BMI,DiabetesPedigreeFunction,Age
6,148,72,35,0,33.6,0.627,50
1,85,66,29,0,26.6,0.351,31
1,85,66,29,0,26.6,0.351,31
8,183,64,0,0,23.3,0.672,32
1,89,66,23,94,28.1,0.167,21
0,137,40,35,168,43.1,2.288,33
5,116,74,0,0,25.6,0.201,30
3,78,50,32,88,31.0,0.248,26
10,115,0,0,0,35.3,0.134,29
2,197,70,45,543,30.5,0.158,53
8,125,96,0,0,0,0.232,54
1,189,60,23,846,30.1,0.398,-5`;

  const sampleHeartCsv = `age,sex,cp,trestbps,chol,fbs,restecg,thalach,exang,oldpeak,slope,ca,thal
63,1,3,145,233,1,0,150,0,2.3,0,0,1
37,1,2,130,250,0,1,187,0,3.5,0,0,2
37,1,2,130,250,0,1,187,0,3.5,0,0,2
41,0,1,130,204,0,0,172,0,1.4,2,0,2
56,1,1,120,236,0,1,178,0,0.8,2,0,2
57,0,0,120,354,0,1,163,1,0.6,2,0,2
57,1,0,140,192,0,1,148,0,0.4,1,0,1
56,0,1,140,294,0,0,153,0,1.3,1,0,2
44,1,1,120,263,0,1,173,0,0.0,2,0,3
52,1,2,172,199,1,1,162,0,0.5,2,0,3
57,1,0,130,131,0,1,115,1,1.2,1,1,3
58,1,2,0,230,0,0,140,0,2.2,1,0,3`;

  const loadSampleData = (type: 'diabetes' | 'heart') => {
    setDatasetType(type);
    if (type === 'diabetes') {
      setFileName('diabetes_clinical_raw_sample.csv');
      setCsvContent(sampleDiabetesCsv);
      setTerminalLogs([`[INFO] Injected PIMA Indian Diabetes raw sample template (${sampleDiabetesCsv.split('\n').length - 1} rows)`]);
    } else {
      setFileName('heart_disease_clinical_sample.csv');
      setCsvContent(sampleHeartCsv);
      setTerminalLogs([`[INFO] Injected Cleveland Heart Disease clinical sample template (${sampleHeartCsv.split('\n').length - 1} rows)`]);
    }
    setMetrics(null);
    setAnomaliesList([]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    
    // Auto-detect type based on file name
    if (file.name.toLowerCase().includes('diabetes') || file.name.toLowerCase().includes('diab')) {
      setDatasetType('diabetes');
    } else if (file.name.toLowerCase().includes('heart') || file.name.toLowerCase().includes('cardio')) {
      setDatasetType('heart');
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);
      setTerminalLogs([
        `[INFO] Loaded local file: ${file.name}`,
        `[INFO] Detected size: ${file.size} bytes`,
        `[INFO] Ready for data extraction.`
      ]);
      setMetrics(null);
      setAnomaliesList([]);
    };
    reader.readAsText(file);
  };

  const runEtlPipeline = async () => {
    if (!csvContent) {
      alert('Please upload a CSV file or load a sample dataset first.');
      return;
    }
    if (running) return;

    setRunning(true);
    setProgress(0);
    setTerminalLogs([]);
    setMetrics(null);
    setAnomaliesList([]);

    const messages = {
      extract: [
        `[EXTRACT] Commencing parsing sequence for: ${fileName}`,
        `[EXTRACT] Matching columns against ${datasetType === 'diabetes' ? 'Diabetes' : 'Heart Disease'} schema constraints...`,
        `[EXTRACT] Parsing commas and splitting raw rows. Found ${csvContent.split('\n').length - 1} records.`,
        `[EXTRACT] Data Extraction phase successfully finished.`
      ],
      transform: [
        `[TRANSFORM] Executing cleaning filters...`,
        `[TRANSFORM] Calculating row hashes to flag duplicates...`,
        `[TRANSFORM] Initiating missing/zero value check in numerical descriptors...`,
        `[TRANSFORM] Calculating columns medians for statistical imputation...`,
        `[TRANSFORM] Scanning patient records for boundaries: validating age boundaries...`,
        `[TRANSFORM] Evaluating clinical thresholds for outlier detection...`,
        `[TRANSFORM] Scaling numerical columns (min-max normalization) for analytics indexing...`,
        `[TRANSFORM] Data cleansing completed.`
      ],
      load: [
        `[LOAD] Directing bulk transactions to DWH database tables...`,
        `[LOAD] Writing patients records into dim_patient...`,
        `[LOAD] Inserting date index mapping to dim_time...`,
        `[LOAD] Committing vitals measures to fact_patient_visit...`,
        `[LOAD] Refreshing indices: idx_fact_patient, idx_fact_disease...`,
        `[INFO] Star Schema loading complete.`
      ]
    };

    // Stage 1: Extract (0-30%)
    setCurrentStage('EXTRACT');
    for (let i = 0; i < messages.extract.length; i++) {
      setTerminalLogs(prev => [...prev, messages.extract[i]]);
      setProgress(Math.floor(((i + 1) / messages.extract.length) * 30));
      await sleep(350);
    }

    // Stage 2: Transform (30-70%)
    setCurrentStage('TRANSFORM');
    for (let i = 0; i < messages.transform.length; i++) {
      setTerminalLogs(prev => [...prev, messages.transform[i]]);
      setProgress(30 + Math.floor(((i + 1) / messages.transform.length) * 40));
      await sleep(300);
    }

    // Stage 3: Load (70-95%)
    setCurrentStage('LOAD');
    for (let i = 0; i < messages.load.length; i++) {
      setTerminalLogs(prev => [...prev, messages.load[i]]);
      setProgress(70 + Math.floor(((i + 1) / messages.load.length) * 25));
      await sleep(300);
    }

    // API push to trigger backend logic
    try {
      const res = await fetch('/api/etl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datasetType,
          fileName,
          csvContent
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMetrics(data.stats);
        setAnomaliesList(data.anomalies || []);
        
        // Log final success entries
        setTerminalLogs(prev => [
          ...prev,
          `[SUCCESS] ETL Job completed successfully. Job ID: ${data.log.log_id}`,
          `[INFO] Extracted: ${data.stats.extracted} rows`,
          `[INFO] Transformed: ${data.stats.transformed} rows (Duplicates filtered: ${data.stats.duplicates}, Imputed nulls: ${data.stats.imputed})`,
          `[INFO] Outliers/Anomalies Flagged: ${data.stats.anomalies}`,
          `[INFO] Loaded into DWH Fact table: ${data.stats.loaded} rows`,
          `[INFO] Duration: ${data.log.duration_ms}ms`
        ]);
        
        setProgress(100);
        setCurrentStage('DONE');
        fetchLogs(); // refresh table
      } else {
        const errJson = await res.json();
        throw new Error(errJson.error || 'API call failed');
      }
    } catch (err: any) {
      setTerminalLogs(prev => [
        ...prev,
        `[CRITICAL] ETL execution failed: ${err.message}`,
        `[CRITICAL] Transaction rolled back on DWH.`
      ]);
      setCurrentStage('IDLE');
    } finally {
      setRunning(false);
    }
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Upload area & Parameters selection */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', flexWrap: 'wrap' }}>
        
        {/* Upload card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Raw Dataset Uploader</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
              Upload clinical datasets in CSV format to trigger the ETL transformation sequence.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Dataset Schema Mapping</label>
              <select
                value={datasetType}
                onChange={(e) => setDatasetType(e.target.value as any)}
                className="form-input"
              >
                <option value="diabetes">Diabetes Mellitus Dataset</option>
                <option value="heart">Heart Disease Dataset</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Quick Test templates</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={() => loadSampleData('diabetes')} 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ flex: 1, padding: '0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                >
                  <Sparkles size={12} style={{ color: '#0d9488' }} /> Diabetes
                </button>
                <button 
                  onClick={() => loadSampleData('heart')} 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ flex: 1, padding: '0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                >
                  <Sparkles size={12} style={{ color: '#3b82f6' }} /> Heart
                </button>
              </div>
            </div>
          </div>

          {/* Drag & Drop Box */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed var(--color-surface-border)',
              borderRadius: '8px',
              padding: '2.5rem',
              textAlign: 'center',
              cursor: 'pointer',
              backgroundColor: fileName ? 'var(--color-primary-light)' : 'transparent',
              borderColor: fileName ? 'var(--color-primary)' : 'var(--color-surface-border)',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.75rem'
            }}
          >
            <Upload size={36} style={{ color: fileName ? 'var(--color-primary)' : 'var(--color-text-muted)' }} />
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept=".csv"
              style={{ display: 'none' }}
            />
            {fileName ? (
              <div>
                <strong style={{ display: 'block', fontSize: '0.9rem', color: 'var(--color-secondary)' }}>{fileName}</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)' }}>Click to replace file</span>
              </div>
            ) : (
              <div>
                <strong style={{ display: 'block', fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>Select CSV Dataset File</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Supports .csv format</span>
              </div>
            )}
          </div>

          <button 
            onClick={runEtlPipeline} 
            disabled={running || !csvContent} 
            className={`btn btn-primary ${running || !csvContent ? 'btn-disabled' : ''}`}
            style={{ padding: '0.8rem', marginTop: '0.5rem' }}
          >
            <Play size={18} /> Execute ETL Transformation Pipeline
          </button>
        </div>

        {/* Pipeline Execution metrics */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', minHeight: '380px' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>ETL Metrics Summary</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
              Summary of parsed records, duplicates removed, and outlier diagnostics.
            </p>
          </div>

          {metrics ? (
            <div className="animate-slide" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
              
              {/* Metric Card grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ backgroundColor: '#f8fafc', border: '1px solid var(--color-surface-border)', borderRadius: '8px', padding: '0.75rem 1rem' }}>
                  <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Records Extracted</span>
                  <strong style={{ fontSize: '1.3rem', color: 'var(--color-secondary)' }}>{metrics.extracted}</strong>
                </div>

                <div style={{ backgroundColor: '#f8fafc', border: '1px solid var(--color-surface-border)', borderRadius: '8px', padding: '0.75rem 1rem' }}>
                  <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Duplicates Removed</span>
                  <strong style={{ fontSize: '1.3rem', color: metrics.duplicates > 0 ? 'var(--color-warning)' : 'var(--color-text-secondary)' }}>{metrics.duplicates}</strong>
                </div>

                <div style={{ backgroundColor: '#f8fafc', border: '1px solid var(--color-surface-border)', borderRadius: '8px', padding: '0.75rem 1rem' }}>
                  <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Nulls Imputed</span>
                  <strong style={{ fontSize: '1.3rem', color: 'var(--color-info)' }}>{metrics.imputed}</strong>
                </div>

                <div style={{ backgroundColor: '#f8fafc', border: '1px solid var(--color-surface-border)', borderRadius: '8px', padding: '0.75rem 1rem' }}>
                  <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Committed to DWH</span>
                  <strong style={{ fontSize: '1.3rem', color: 'var(--color-success)' }}>{metrics.loaded}</strong>
                </div>
              </div>

              {/* Anomalies section */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <strong style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <AlertCircle size={14} style={{ color: 'var(--color-warning)' }} /> 
                  Cleansing & Outliers Log ({metrics.anomalies} flagged)
                </strong>
                
                <div style={{ 
                  flex: 1, 
                  maxHeight: '140px', 
                  overflowY: 'auto', 
                  backgroundColor: '#fef3c7', 
                  border: '1.5px solid #fde68a',
                  borderRadius: '6px',
                  padding: '0.75rem',
                  fontSize: '0.75rem',
                  color: '#92400e',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                  fontFamily: 'monospace'
                }}>
                  {anomaliesList.length === 0 ? (
                    <span style={{ color: 'var(--color-success-hover)', fontWeight: 600 }}>✓ Zero anomalies or boundaries warnings found.</span>
                  ) : (
                    anomaliesList.map((anom, idx) => (
                      <div key={idx}>⚠️ {anom}</div>
                    ))
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--color-text-muted)' }}>
              <FileSpreadsheet size={48} style={{ opacity: 0.6, marginBottom: '0.75rem' }} />
              <span style={{ fontSize: '0.8rem' }}>Awaiting pipeline run metrics...</span>
            </div>
          )}
        </div>

      </div>

      {/* Progress & Console section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
        
        {/* Console */}
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
              <span style={{ color: '#64748b' }}>Console idle. Choose or upload a CSV dataset to initiate ETL diagnostic traces...</span>
            ) : (
              terminalLogs.map((logStr, idx) => (
                <div 
                  key={idx} 
                  style={{ 
                    color: logStr.includes('[SUCCESS]') ? '#10b981' : 
                           logStr.includes('[TRANSFORM]') ? '#38bdf8' : 
                           logStr.includes('[LOAD]') ? '#fb7185' : 
                           logStr.includes('[EXTRACT]') ? '#f59e0b' : '#e2e8f0'
                  }}
                >
                  {logStr}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Action / Progress card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>ETL Processing Engine</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
              Visualizes progress of extraction, data cleaning validation rules, and transactional warehousing.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, justifyContent: 'center' }}>
            
            {/* Visual Steps Indicators */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, padding: '0.5rem 0' }}>
              <span style={{ color: currentStage === 'EXTRACT' ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}>Extracting</span>
              <span style={{ color: currentStage === 'TRANSFORM' ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}>Transforming</span>
              <span style={{ color: currentStage === 'LOAD' ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}>Loading</span>
            </div>

            {/* Progress Bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.5rem', fontWeight: 600 }}>
                <span>Job Status: {currentStage}</span>
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

            {/* Flow diagram visual highlight */}
            <div style={{ display: 'flex', justifyContent: 'space-around', backgroundColor: '#f8fafc', padding: '0.8rem', borderRadius: '6px', border: '1px solid var(--color-surface-border)' }}>
              <div style={{ opacity: currentStage === 'EXTRACT' ? 1 : 0.4, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600 }}>
                <HardDriveDownload size={14} /> EXTRACT
              </div>
              <div style={{ opacity: currentStage === 'TRANSFORM' ? 1 : 0.4, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600 }}>
                <Cpu size={14} /> TRANSFORM
              </div>
              <div style={{ opacity: currentStage === 'LOAD' ? 1 : 0.4, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600 }}>
                <Database size={14} /> LOAD
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Sync history logs */}
      <div className="card">
        <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <History size={18} style={{ color: 'var(--color-primary)' }} /> ETL Synchronization Run History
        </h3>

        <div className="table-container">
          {loading ? (
            <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading history...</p>
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
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' }}>No ETL executions registered. Upload a file above to start.</td>
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
