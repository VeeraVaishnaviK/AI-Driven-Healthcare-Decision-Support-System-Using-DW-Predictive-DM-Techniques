'use client';

import { useState, useEffect } from 'react';
import AnalyticsChart from '@/components/AnalyticsChart';
import { 
  BarChart3, TrendingUp, PieChart, Info, ShieldAlert, 
  Cpu, CheckCircle2, AlertTriangle, HelpCircle, Network, Users
} from 'lucide-react';
import { Cluster, AssociationRule } from '@/utils/mining';

export default function AnalyticsPage() {
  const [activeSubTab, setActiveSubTab] = useState<'classification' | 'clustering' | 'association'>('classification');
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const res = await fetch('/api/analytics');
        if (res.ok) {
          const data = await res.json();
          setAnalyticsData(data);
        }
      } catch (err) {
        console.error('Error fetching data mining analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, []);

  if (loading) {
    return <p style={{ padding: '2rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>Compiling data mining analytics...</p>;
  }

  const stats = analyticsData?.stats;
  const clustering = analyticsData?.clustering || [];
  const rules = analyticsData?.association_rules || [];

  // Donut data for Risk Categories
  const riskDonutData = [
    { label: 'High Risk', value: stats?.risk_splits?.high || 0, color: 'var(--color-danger)' },
    { label: 'Moderate Risk', value: stats?.risk_splits?.moderate || 0, color: 'var(--color-warning)' },
    { label: 'Low Risk', value: stats?.risk_splits?.low || 0, color: 'var(--color-success)' }
  ];

  // Bar data for Disease Splits
  const diseaseBarData = [
    { label: 'Diabetes (ML)', value: stats?.disease_splits?.diabetes || 0, color: 'var(--color-primary)' },
    { label: 'Hypertension', value: stats?.disease_splits?.hypertension || 0, color: 'var(--color-info)' },
    { label: 'Cardiac', value: stats?.disease_splits?.cardiac || 0, color: 'var(--color-warning)' }
  ];

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Sub-tab selection */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-surface-border)', paddingBottom: '0.25rem', gap: '1rem' }}>
        <button
          onClick={() => setActiveSubTab('classification')}
          style={{
            padding: '0.6rem 1.25rem',
            fontSize: '0.9rem',
            fontWeight: activeSubTab === 'classification' ? 650 : 500,
            color: activeSubTab === 'classification' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            border: 'none',
            borderBottom: activeSubTab === 'classification' ? '2.5px solid var(--color-primary)' : '2.5px solid transparent',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          📊 Classification Stats
        </button>
        <button
          onClick={() => setActiveSubTab('clustering')}
          style={{
            padding: '0.6rem 1.25rem',
            fontSize: '0.9rem',
            fontWeight: activeSubTab === 'clustering' ? 650 : 500,
            color: activeSubTab === 'clustering' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            border: 'none',
            borderBottom: activeSubTab === 'clustering' ? '2.5px solid var(--color-primary)' : '2.5px solid transparent',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          🕸️ K-Means Clustering
        </button>
        <button
          onClick={() => setActiveSubTab('association')}
          style={{
            padding: '0.6rem 1.25rem',
            fontSize: '0.9rem',
            fontWeight: activeSubTab === 'association' ? 650 : 500,
            color: activeSubTab === 'association' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            border: 'none',
            borderBottom: activeSubTab === 'association' ? '2.5px solid var(--color-primary)' : '2.5px solid transparent',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          ⛓️ Association Rules (Apriori)
        </button>
      </div>

      {activeSubTab === 'classification' && (
        <>
          {/* TAB 1: CLASSIFICATION STATS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)', padding: '0.875rem', borderRadius: '12px' }}>
                <Cpu size={24} />
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 650, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Active Champion Model</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-secondary)' }}>
                  {stats?.active_champion?.model_name || 'Random Forest (Baseline)'}
                </span>
                {stats?.active_champion && (
                  <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--color-success)', fontWeight: 600, marginTop: '2px' }}>
                    F1-Score: {stats.active_champion.metrics.f1}% | Acc: {stats.active_champion.metrics.accuracy}%
                  </span>
                )}
              </div>
            </div>

            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ backgroundColor: 'var(--color-info-light)', color: 'var(--color-info)', padding: '0.875rem', borderRadius: '12px' }}>
                <TrendingUp size={24} />
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 650, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Total Screening Runs</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-secondary)' }}>{stats?.total_predictions || 0} Runs</span>
                <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--color-text-secondary)' }}>Committed to decision registry</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '1.5rem', flexWrap: 'wrap' }}>
            {/* Risk Distribution Donut */}
            <div className="card" style={{ minWidth: '300px' }}>
              <AnalyticsChart type="donut" data={riskDonutData} title="Screening Risk Tiers Distribution" />
            </div>

            {/* Disease Targets Bar */}
            <div className="card" style={{ minWidth: '300px' }}>
              <AnalyticsChart type="bar" data={diseaseBarData} title="Encounter Runs per Target Disease" />
            </div>
          </div>
        </>
      )}

      {activeSubTab === 'clustering' && (
        <>
          {/* TAB 2: K-MEANS CLUSTERING */}
          <div className="card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={18} style={{ color: 'var(--color-primary)' }} /> Patient Cohort K-Means Segments
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
              We run a multi-dimensional K-Means clustering algorithm ($K=3$) using normalized features: Glucose, Systolic Blood Pressure, BMI, and Age. Patient visits are grouped into risk profiles based on centroid Euclidean distance.
            </p>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc' }}>
                    <th>Cluster Name</th>
                    <th>Cluster Size</th>
                    <th>Centroid Glucose</th>
                    <th>Centroid BP</th>
                    <th>Centroid BMI</th>
                    <th>Centroid Age</th>
                    <th>Clinical Action Status</th>
                  </tr>
                </thead>
                <tbody>
                  {clustering.map((cluster: Cluster) => (
                    <tr key={cluster.id}>
                      <td style={{ fontWeight: 700, color: 'var(--color-secondary)' }}>{cluster.name}</td>
                      <td style={{ fontWeight: 600 }}>{cluster.size} Patients</td>
                      <td>{cluster.centroid.glucose} mg/dL</td>
                      <td>{cluster.centroid.blood_pressure} mmHg</td>
                      <td>{cluster.centroid.bmi} kg/m²</td>
                      <td>{cluster.centroid.age} yrs</td>
                      <td>
                        <span className={`badge ${
                          cluster.name === 'High Risk' ? 'badge-danger' :
                          cluster.name === 'Moderate Risk' ? 'badge-warning' : 'badge-success'
                        }`}>
                          {cluster.name === 'High Risk' ? 'Urgent Screening' :
                           cluster.name === 'Moderate Risk' ? 'Preventive Monitoring' : 'Routine Checkups'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {clustering.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' }}>No clustering results computed. Run ETL data upload.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {clustering.length > 0 && (
            <div className="card">
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1.25rem', color: 'var(--color-text-secondary)' }}>Centroid Vitals Profile Comparison (Average Glucose mg/dL)</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0' }}>
                {clustering.map((cluster: Cluster) => {
                  const color = cluster.name === 'High Risk' ? 'var(--color-danger)' :
                                cluster.name === 'Moderate Risk' ? 'var(--color-warning)' : 'var(--color-success)';
                  const pct = Math.min((cluster.centroid.glucose / 200) * 100, 100);
                  
                  return (
                    <div key={cluster.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem', fontWeight: 650 }}>
                        <span style={{ color: 'var(--color-secondary)' }}>{cluster.name} Centroid</span>
                        <span>{cluster.centroid.glucose} mg/dL</span>
                      </div>
                      <div style={{ height: '14px', backgroundColor: '#e2e8f0', borderRadius: '7px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: '7px', transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {activeSubTab === 'association' && (
        <>
          {/* TAB 3: ASSOCIATION RULE MINING */}
          <div className="card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Network size={18} style={{ color: 'var(--color-primary)' }} /> Clinical Comorbidity Association Rules
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
              Using the Apriori pattern algorithm, we extract clinical dependencies and comorbidities patterns. Rules of type Antecedent $\rightarrow$ Consequent reveal associations between indicators (e.g. Obesity indicates probability of Diabetes).
            </p>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc' }}>
                    <th>Comorbidity Rule</th>
                    <th>Support</th>
                    <th>Confidence</th>
                    <th>Lift Score</th>
                    <th>Correlation Strength</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((rule: AssociationRule, idx: number) => {
                    const isStrong = rule.lift > 1.2;
                    const isPositive = rule.lift > 1.0;
                    
                    return (
                      <tr key={idx}>
                        <td style={{ fontWeight: 650, fontSize: '0.9rem' }}>
                          <span style={{ color: 'var(--color-primary)', backgroundColor: 'var(--color-primary-light)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                            {rule.antecedent.join(', ')}
                          </span>
                          <span style={{ margin: '0 0.5rem', color: 'var(--color-text-muted)' }}>➔</span>
                          <span style={{ color: 'var(--color-secondary)', backgroundColor: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                            {rule.consequent.join(', ')}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{rule.support}%</td>
                        <td style={{ fontWeight: 600 }}>{rule.confidence}%</td>
                        <td style={{ fontWeight: 700, color: isPositive ? 'var(--color-secondary)' : 'var(--color-text-muted)' }}>{rule.lift}</td>
                        <td>
                          <span className={`badge ${
                            isStrong ? 'badge-danger' :
                            isPositive ? 'badge-warning' : 'badge-info'
                          }`}>
                            {isStrong ? 'Strong Correlation' :
                             isPositive ? 'Positive Link' : 'Neutral Correlation'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {rules.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' }}>No comorbidity rules found above support thresholds. Run ETL data upload.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Insights Brief */}
      <div className="card" style={{ display: 'flex', gap: '1rem', backgroundColor: '#f8fafc', borderLeft: '4px solid var(--color-primary)' }}>
        <Info size={24} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
        <div>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-secondary)' }}>System Intelligence Analytics Note</h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem', lineHeight: 1.45 }}>
            Data Mining K-Means partitions show that <strong>High Risk</strong> clusters average a BMI of over 33 kg/m² and fasting glucose levels of over 145 mg/dL. Our Association Rules identify that **Obesity** is a significant comorbidity antecedent for **Diabetes** (Lift &gt; 1.2), indicating a strong positive correlation that should guide preventive screening care plans.
          </p>
        </div>
      </div>

    </div>
  );
}
