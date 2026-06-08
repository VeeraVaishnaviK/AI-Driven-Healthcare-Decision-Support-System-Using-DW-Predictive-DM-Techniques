'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, UserPlus, Phone, MapPin, Eye, Calendar, User, Edit2, Trash2 } from 'lucide-react';

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
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'ADD' | 'EDIT'>('ADD');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  // Form states
  const [formPatient, setFormPatient] = useState({
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
        
        // Refresh selected patient to display updated values
        const queryId = searchParams.get('id');
        const activeId = selectedPatient?.patient_id || queryId;
        if (activeId && json.patients) {
          const matched = json.patients.find((p: any) => p.patient_id === activeId);
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

  // Open Add Patient Modal
  const openAddModal = () => {
    setModalMode('ADD');
    setFormError(null);
    setFormPatient({
      patient_id: '',
      patient_name: '',
      age: '',
      gender: 'Female',
      address: '',
      contact: '',
      doctor_id: doctors[0]?.doctor_id || '',
      disease_id: 'DIS005',
      glucose: '100',
      blood_pressure: '120',
      insulin: '0',
      bmi: '24.0'
    });
    setShowModal(true);
  };

  // Open Edit Patient Modal
  const openEditModal = () => {
    if (!selectedPatient) return;
    setModalMode('EDIT');
    setFormError(null);

    // Get latest visit vitals for selected patient
    const pVisits = visits.filter(v => v.patient_id === selectedPatient.patient_id);
    const latest = pVisits.length > 0 ? pVisits[pVisits.length - 1] : {
      glucose: 100,
      blood_pressure: 120,
      insulin: 0,
      bmi: 24.0,
      doctor_id: doctors[0]?.doctor_id || '',
      disease_id: 'DIS005'
    };

    setFormPatient({
      patient_id: selectedPatient.patient_id,
      patient_name: selectedPatient.patient_name,
      age: selectedPatient.age.toString(),
      gender: selectedPatient.gender,
      address: selectedPatient.address,
      contact: selectedPatient.contact,
      doctor_id: latest.doctor_id,
      disease_id: latest.disease_id,
      glucose: latest.glucose.toString(),
      blood_pressure: latest.blood_pressure.toString(),
      insulin: latest.insulin.toString(),
      bmi: latest.bmi.toString()
    });
    setShowModal(true);
  };

  // Handle Form submit (Add/Edit)
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Clinical Input Validations
    const ageNum = Number(formPatient.age);
    const gNum = Number(formPatient.glucose);
    const bpNum = Number(formPatient.blood_pressure);
    const bmiNum = Number(formPatient.bmi);
    const insNum = Number(formPatient.insulin || 0);

    if (isNaN(ageNum) || ageNum <= 0 || ageNum > 115) {
      setFormError('Clinical Validation: Age must be a positive number under 115.');
      return;
    }
    if (isNaN(gNum) || gNum < 30 || gNum > 500) {
      setFormError('Clinical Validation: Glucose Level must be between 30 and 500 mg/dL.');
      return;
    }
    if (isNaN(bpNum) || bpNum < 50 || bpNum > 260) {
      setFormError('Clinical Validation: Systolic Blood Pressure must be between 50 and 260 mmHg.');
      return;
    }
    if (isNaN(bmiNum) || bmiNum < 10 || bmiNum > 65) {
      setFormError('Clinical Validation: BMI must be between 10.0 and 65.0 kg/m².');
      return;
    }
    if (isNaN(insNum) || insNum < 0 || insNum > 1000) {
      setFormError('Clinical Validation: Insulin Level must be a positive number under 1000 uIU/mL.');
      return;
    }

    try {
      if (modalMode === 'ADD') {
        // Validate ID format (Pxxx)
        if (!/^P\d+$/.test(formPatient.patient_id)) {
          setFormError('Validation: Patient ID must start with P followed by digits (e.g., P007).');
          return;
        }

        // Check for duplicates
        const exists = patients.some(p => p.patient_id.toLowerCase() === formPatient.patient_id.toLowerCase());
        if (exists) {
          setFormError(`Validation: Patient ID ${formPatient.patient_id} already exists.`);
          return;
        }

        // Calculate a mock risk level based on inputs
        let risk = 10;
        let result = 'Low Risk / Normal';
        if (gNum >= 126 || bpNum >= 140) {
          risk = 82;
          result = 'High Risk Detected';
        } else if (gNum >= 100 || bpNum >= 130) {
          risk = 48;
          result = 'Moderate Risk Detected';
        }

        const res = await fetch('/api/patients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formPatient,
            risk_score: risk,
            prediction_result: result
          })
        });

        if (res.ok) {
          setShowModal(false);
          loadData();
        } else {
          const err = await res.json();
          setFormError(err.error || 'Server error inserting patient.');
        }
      } else {
        // EDIT mode
        const res = await fetch('/api/patients', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formPatient)
        });

        if (res.ok) {
          setShowModal(false);
          loadData();
        } else {
          const err = await res.json();
          setFormError(err.error || 'Server error updating patient.');
        }
      }
    } catch (err) {
      console.error('Failed to submit form:', err);
      setFormError('Network error. Check server logs.');
    }
  };

  // Delete Patient execution
  const handleDeletePatient = async () => {
    if (!selectedPatient) return;
    try {
      const res = await fetch(`/api/patients?id=${selectedPatient.patient_id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setShowDeleteModal(false);
        setSelectedPatient(null);
        loadData();
      }
    } catch (err) {
      console.error('Deletion failed:', err);
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

          <button onClick={openAddModal} className="btn btn-primary">
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
            
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button 
                onClick={openEditModal} 
                className="btn btn-secondary"
                style={{ padding: '0.35rem', display: 'flex', alignItems: 'center' }}
                title="Edit Patient"
              >
                <Edit2 size={14} />
              </button>
              <button 
                onClick={() => setShowDeleteModal(true)} 
                className="btn btn-secondary"
                style={{ padding: '0.35rem', display: 'flex', alignItems: 'center', color: 'var(--color-danger)' }}
                title="Delete Patient"
              >
                <Trash2 size={14} />
              </button>
              <button 
                onClick={() => setSelectedPatient(null)} 
                className="btn btn-secondary"
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
              >
                Close
              </button>
            </div>
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

      {/* Add / Edit Patient Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem' }}>
          <div className="card animate-slide" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem' }}>
              {modalMode === 'ADD' ? 'Register Patient & Seed Clinical Fact' : 'Update Demographics & Latest Vitals'}
            </h2>

            {formError && (
              <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--color-danger-light)', border: '1.5px solid var(--color-danger-border)', borderRadius: '8px', color: 'var(--color-danger)', fontSize: '0.8rem', fontWeight: 550, marginBottom: '1.25rem' }}>
                {formError}
              </div>
            )}
            
            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Patient ID {modalMode === 'ADD' ? '(Format: Pxxx)' : '(ReadOnly)'}</label>
                  <input
                    type="text"
                    placeholder="P007"
                    value={formPatient.patient_id}
                    onChange={(e) => setFormPatient({ ...formPatient, patient_id: e.target.value })}
                    className="form-input"
                    disabled={modalMode === 'EDIT'}
                    style={{ backgroundColor: modalMode === 'EDIT' ? '#e2e8f0' : 'inherit' }}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Patient Full Name</label>
                  <input
                    type="text"
                    placeholder="Thomas Anderson"
                    value={formPatient.patient_name}
                    onChange={(e) => setFormPatient({ ...formPatient, patient_name: e.target.value })}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Age</label>
                  <input
                    type="number"
                    placeholder="34"
                    value={formPatient.age}
                    onChange={(e) => setFormPatient({ ...formPatient, age: e.target.value })}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select
                    value={formPatient.gender}
                    onChange={(e) => setFormPatient({ ...formPatient, gender: e.target.value })}
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
                    value={formPatient.contact}
                    onChange={(e) => setFormPatient({ ...formPatient, contact: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Address</label>
                  <input
                    type="text"
                    placeholder="101 Matrix Rd, Redmond, WA"
                    value={formPatient.address}
                    onChange={(e) => setFormPatient({ ...formPatient, address: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <hr style={{ borderColor: 'var(--color-surface-border)' }} />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                {modalMode === 'ADD' ? 'Initialize DWH Clinical Visit Fact' : 'Update Latest DWH Clinical Vitals'}
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Attending Doctor {modalMode === 'EDIT' && '(ReadOnly)'}</label>
                  <select
                    value={formPatient.doctor_id}
                    onChange={(e) => setFormPatient({ ...formPatient, doctor_id: e.target.value })}
                    className="form-input"
                    disabled={modalMode === 'EDIT'}
                    style={{ backgroundColor: modalMode === 'EDIT' ? '#e2e8f0' : 'inherit' }}
                    required
                  >
                    <option value="">-- Select Doctor --</option>
                    {doctors.map(d => (
                      <option key={d.doctor_id} value={d.doctor_id}>{d.doctor_name} ({d.specialization})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Primary Diagnosis Code {modalMode === 'EDIT' && '(ReadOnly)'}</label>
                  <select
                    value={formPatient.disease_id}
                    onChange={(e) => setFormPatient({ ...formPatient, disease_id: e.target.value })}
                    className="form-input"
                    disabled={modalMode === 'EDIT'}
                    style={{ backgroundColor: modalMode === 'EDIT' ? '#e2e8f0' : 'inherit' }}
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
                    value={formPatient.glucose}
                    onChange={(e) => setFormPatient({ ...formPatient, glucose: e.target.value })}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Systolic BP (mmHg)</label>
                  <input
                    type="number"
                    placeholder="120"
                    value={formPatient.blood_pressure}
                    onChange={(e) => setFormPatient({ ...formPatient, blood_pressure: e.target.value })}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Insulin level (uIU/mL) - Optional</label>
                  <input
                    type="number"
                    placeholder="80"
                    value={formPatient.insulin}
                    onChange={(e) => setFormPatient({ ...formPatient, insulin: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">BMI (kg/m²)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="24.5"
                    value={formPatient.bmi}
                    onChange={(e) => setFormPatient({ ...formPatient, bmi: e.target.value })}
                    className="form-input"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  💾 {modalMode === 'ADD' ? 'Commit Transaction' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Patient Confirmation Modal */}
      {showDeleteModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem' }}>
          <div className="card animate-slide" style={{ width: '100%', maxWidth: '440px', borderLeft: '4px solid var(--color-danger)' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-secondary)', marginBottom: '0.75rem' }}>⚠️ Delete Clinical Patient Record?</h2>
            
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.45, marginBottom: '1.5rem' }}>
              Are you sure you want to permanently delete <strong>{selectedPatient?.patient_name}</strong> (ID: {selectedPatient?.patient_id})? 
              <br /><br />
              This is a <strong>cascade deletion</strong>. It will remove the patient dimension and permanently delete all clinical visit facts and prediction logs associated with this patient from the Star Schema data warehouse.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button onClick={() => setShowDeleteModal(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={handleDeletePatient} className="btn btn-danger">
                🗑️ Cascade Delete Patient
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
