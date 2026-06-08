'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, UserPlus, Phone, MapPin, Eye, Calendar, User } from 'lucide-react';

// Main component with Suspense wrapper to handle useSearchParams safely
export default function PatientsPage() {
  return (
    <Suspense fallback={<div>Loading Patient Management...</div>}>
      <PatientsPageContent />
    </Suspense>
  );
}

function PatientsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Data lists
  const [patients, setPatients] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [diseases, setDiseases] = useState<any[]>([]);
  
  // States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newPatient, setNewPatient] = useState({
    patient_id: '',
    patient_name: '',
    age: '',
    gender: 'Female',
    address: '',
    contact: '',
    doctor_id: '',
    disease_id: 'DIS005',
    glucose: '',
    blood_pressure: '',
    insulin: '',
    bmi: ''
  });

  const loadData = async () => {
    try {
      const res = await fetch('/api/patients');
      if (res.ok) {
        const json = await res.json();
        setPatients(json.patients || []);
        setVisits(json.visits || []);
        setDoctors(json.doctors || []);
        setDiseases(json.diseases || []);
        
        // Auto-select if search ID exists
        const queryId = searchParams.get('id');
        if (queryId && json.patients) {
          const matched = json.patients.find((p: any) => p.patient_id === queryId);
          if (matched) {
            setSelectedPatient(matched);
          }
        }
      }
    } catch (err) {
      console.error('Error loading patients:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchParams]);

  // Sync search query from header redirect
  useEffect(() => {
    const q = searchParams.get('search');
    if (q) {
      setSearchQuery(q);
    }
  }, [searchParams]);

  const handlePatientSelect = (p: any) => {
    setSelectedPatient(p);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Calculate a mock risk level based on inputs
      const g = Number(newPatient.glucose || 0);
      const bp = Number(newPatient.blood_pressure || 0);
      const bmi = Number(newPatient.bmi || 0);
      
      let risk = 10;
      let result = 'Low Risk / Normal';
      
      if (g >= 126 || bp >= 140) {
        risk = 82;
        result = 'High Risk Detected';
      } else if (g >= 100 || bp >= 130) {
        risk = 48;
        result = 'Moderate Risk Detected';
      }

      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newPatient,
          risk_score: risk,
          prediction_result: result
        })
      });

      if (res.ok) {
        setShowAddModal(false);
        // Reset form
        setNewPatient({
          patient_id: '',
          patient_name: '',
          age: '',
          gender: 'Female',
          address: '',
          contact: '',
          doctor_id: '',
          disease_id: 'DIS005',
          glucose: '',
          blood_pressure: '',
          insulin: '',
          bmi: ''
        });
        loadData();
      }
    } catch (err) {
      console.error('Failed to add patient:', err);
    }
  };

  // Get visits relating to selected patient
  const getPatientVisits = () => {
    if (!selectedPatient) return [];
    return visits.filter(v => v.patient_id === selectedPatient.patient_id);
  };

  // Filter patients by search
  const filteredPatients = patients.filter(p => {
    const q = searchQuery.toLowerCase();
    return p.patient_name.toLowerCase().includes(q) || p.patient_id.toLowerCase().includes(q);
  });

  // Helper to resolve descriptions
  const getDoctorName = (docId: string) => {
    return doctors.find(d => d.doctor_id === docId)?.doctor_name || docId;
  };
  const getDiseaseName = (disId: string) => {
    return diseases.find(d => d.disease_id === disId)?.disease_name || disId;
  };

  // Resolve overall health status badge based on visits
  const getHealthStatus = (patientId: string) => {
    const pVisits = visits.filter(v => v.patient_id === patientId);
    if (pVisits.length === 0) return 'Normal / Screening';
    
    // Find highest risk score
    const highestRisk = Math.max(...pVisits.map(v => v.risk_score));
    if (highestRisk >= 75) return 'Critical Risk';
    if (highestRisk >= 40) return 'Moderate Risk';
    return 'Healthy / Normal';
  };

  return (
    <div className="animate-fade" style={{ display: 'grid', gridTemplateColumns: selectedPatient ? '1.5fr 1fr' : '1fr', gap: '2rem', transition: 'all 0.3s ease' }}>
      
      {/* List Panel */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ position: 'relative', width: '300px' }}>
            <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} size={16} />
            <input 
              type="text" 
              placeholder="Search patients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.25rem' }}
            />
          </div>

          <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
            <UserPlus size={18} /> Register New Patient
          </button>
        </div>

        {/* Patients Table */}
        <div className="table-container">
          {loading ? (
            <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading registry...</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Patient ID</th>
                  <th>Patient Name</th>
                  <th>Age / Gender</th>
                  <th>Contact</th>
                  <th>Health Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((p) => {
                  const status = getHealthStatus(p.patient_id);
                  return (
                    <tr 
                      key={p.patient_id} 
                      onClick={() => handlePatientSelect(p)}
                      style={{ 
                        cursor: 'pointer',
                        backgroundColor: selectedPatient?.patient_id === p.patient_id ? 'var(--color-primary-light)' : 'transparent'
                      }}
                    >
                      <td style={{ fontWeight: 650 }}>{p.patient_id}</td>
                      <td style={{ fontWeight: 600, color: 'var(--color-secondary)' }}>{p.patient_name}</td>
                      <td>{p.age} yrs / {p.gender}</td>
                      <td>{p.contact}</td>
                      <td>
                        <span className={`badge ${
                          status === 'Critical Risk' ? 'badge-danger' : 
                          status === 'Moderate Risk' ? 'badge-warning' : 'badge-success'
                        }`}>
                          {status}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                          <Eye size={12} /> Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredPatients.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2.5rem' }}>No patients found matching query.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Selected Patient Detail Drawer */}
      {selectedPatient && (
        <div className="card animate-slide" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', borderLeft: '4px solid var(--color-primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span className="badge badge-info">{selectedPatient.patient_id}</span>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.5rem' }}>{selectedPatient.patient_name}</h2>
            </div>
            <button 
              onClick={() => setSelectedPatient(null)} 
              className="btn btn-secondary"
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
            >
              Close
            </button>
          </div>

          {/* Demographics Card */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
              <User size={16} style={{ color: 'var(--color-primary)' }} />
              <div>
                <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.7rem' }}>Demographics</span>
                <strong>{selectedPatient.age} yrs / {selectedPatient.gender}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
              <Phone size={16} style={{ color: 'var(--color-primary)' }} />
              <div>
                <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.7rem' }}>Contact Info</span>
                <strong>{selectedPatient.contact}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', gridColumn: 'span 2' }}>
              <MapPin size={16} style={{ color: 'var(--color-primary)' }} />
              <div>
                <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.7rem' }}>Residential Address</span>
                <strong>{selectedPatient.address}</strong>
              </div>
            </div>
          </div>

          {/* Clinical Visit Facts */}
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={16} style={{ color: 'var(--color-primary)' }} /> Clinical Fact Logs (DWH)
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {getPatientVisits().map((v: any) => (
                <div key={v.visit_id} style={{ border: '1px solid var(--color-surface-border)', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <span style={{ fontWeight: 650, color: 'var(--color-primary)' }}>Visit: {v.visit_id}</span>
                    <span style={{ color: 'var(--color-text-muted)' }}>Date ID: {v.time_id}</span>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.75rem' }}>
                    <span>Glucose: <strong>{v.glucose} mg/dL</strong></span>
                    <span>BP: <strong>{v.blood_pressure} mmHg</strong></span>
                    <span>Insulin: <strong>{v.insulin} uIU/mL</strong></span>
                    <span>BMI: <strong>{v.bmi} kg/m²</strong></span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem', borderTop: '1px dashed var(--color-surface-border)', paddingTop: '0.5rem', fontSize: '0.75rem' }}>
                    <div>Doctor: <strong>{getDoctorName(v.doctor_id)}</strong></div>
                    <div>Diagnosed: <strong>{getDiseaseName(v.disease_id)}</strong></div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem', backgroundColor: v.risk_score >= 75 ? 'var(--color-danger-light)' : v.risk_score >= 40 ? 'var(--color-warning-light)' : 'var(--color-success-light)', padding: '0.5rem', borderRadius: '4px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: v.risk_score >= 75 ? 'var(--color-danger)' : v.risk_score >= 40 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                      🛡️ Decision outcome: {v.prediction_result}
                    </span>
                    <strong style={{ fontSize: '0.8rem' }}>{v.risk_score}%</strong>
                  </div>
                </div>
              ))}
              
              {getPatientVisits().length === 0 && (
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textAlign: 'center', padding: '1rem' }}>No clinical facts indexed for this patient.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Patient Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem' }}>
          <div className="card animate-slide" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem' }}>Register Patient & Seed Clinical Fact</h2>
            
            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Patient ID (Format: Pxxx)</label>
                  <input
                    type="text"
                    placeholder="P007"
                    value={newPatient.patient_id}
                    onChange={(e) => setNewPatient({ ...newPatient, patient_id: e.target.value })}
                    className="form-input"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Patient Full Name</label>
                  <input
                    type="text"
                    placeholder="Thomas Anderson"
                    value={newPatient.patient_name}
                    onChange={(e) => setNewPatient({ ...newPatient, patient_name: e.target.value })}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Age</label>
                  <input
                    type="number"
                    placeholder="34"
                    value={newPatient.age}
                    onChange={(e) => setNewPatient({ ...newPatient, age: e.target.value })}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select
                    value={newPatient.gender}
                    onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
                    className="form-input"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Contact phone</label>
                  <input
                    type="text"
                    placeholder="206-555-0100"
                    value={newPatient.contact}
                    onChange={(e) => setNewPatient({ ...newPatient, contact: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Address</label>
                  <input
                    type="text"
                    placeholder="101 Matrix Rd, Redmond, WA"
                    value={newPatient.address}
                    onChange={(e) => setNewPatient({ ...newPatient, address: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <hr style={{ borderColor: 'var(--color-surface-border)' }} />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-primary)' }}>Initialize DWH Clinical Visit Fact</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Attending Doctor</label>
                  <select
                    value={newPatient.doctor_id}
                    onChange={(e) => setNewPatient({ ...newPatient, doctor_id: e.target.value })}
                    className="form-input"
                    required
                  >
                    <option value="">-- Select Doctor --</option>
                    {doctors.map(d => (
                      <option key={d.doctor_id} value={d.doctor_id}>{d.doctor_name} ({d.specialization})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Primary Diagnosis Code</label>
                  <select
                    value={newPatient.disease_id}
                    onChange={(e) => setNewPatient({ ...newPatient, disease_id: e.target.value })}
                    className="form-input"
                    required
                  >
                    {diseases.map(d => (
                      <option key={d.disease_id} value={d.disease_id}>{d.disease_name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Glucose Level (mg/dL)</label>
                  <input
                    type="number"
                    placeholder="110"
                    value={newPatient.glucose}
                    onChange={(e) => setNewPatient({ ...newPatient, glucose: e.target.value })}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Systolic BP (mmHg)</label>
                  <input
                    type="number"
                    placeholder="120"
                    value={newPatient.blood_pressure}
                    onChange={(e) => setNewPatient({ ...newPatient, blood_pressure: e.target.value })}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Insulin level (uIU/mL) - Optional</label>
                  <input
                    type="number"
                    placeholder="80"
                    value={newPatient.insulin}
                    onChange={(e) => setNewPatient({ ...newPatient, insulin: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">BMI (kg/m²)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="24.5"
                    value={newPatient.bmi}
                    onChange={(e) => setNewPatient({ ...newPatient, bmi: e.target.value })}
                    className="form-input"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  💾 Commit Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
