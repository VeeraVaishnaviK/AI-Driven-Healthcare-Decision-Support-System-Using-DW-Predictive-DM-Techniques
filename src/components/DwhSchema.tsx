'use client';

import { useState } from 'react';

export default function DwhSchema() {
  const [highlightedKey, setHighlightedKey] = useState<string | null>(null);

  const handleMouseEnter = (key: string) => setHighlightedKey(key);
  const handleMouseLeave = () => setHighlightedKey(null);

  const isHighlighted = (key: string) => highlightedKey === key;

  return (
    <div style={{ width: '100%', overflowX: 'auto', background: '#0f172a', padding: '2rem', borderRadius: '12px', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)' }}>
      <svg width="850" height="520" viewBox="0 0 850 520" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ margin: '0 auto', display: 'block' }}>
        
        {/* Grids / Background details */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1" />
          </pattern>
          <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#0d9488" />
          </marker>
        </defs>
        <rect width="850" height="520" fill="url(#grid)" rx="8" />

        {/* Lines representing relationships */}
        {/* Patient Join */}
        <path 
          d="M 220 150 L 330 240" 
          stroke={isHighlighted('patient_id') ? '#2dd4bf' : '#334155'} 
          strokeWidth={isHighlighted('patient_id') ? '3' : '1.5'} 
          markerStart="url(#arrow)"
          style={{ transition: 'stroke 0.2s, stroke-width 0.2s' }}
        />
        {/* Doctor Join */}
        <path 
          d="M 425 100 L 425 200" 
          stroke={isHighlighted('doctor_id') ? '#2dd4bf' : '#334155'} 
          strokeWidth={isHighlighted('doctor_id') ? '3' : '1.5'} 
          markerStart="url(#arrow)"
          style={{ transition: 'stroke 0.2s, stroke-width 0.2s' }}
        />
        {/* Disease Join */}
        <path 
          d="M 630 150 L 520 240" 
          stroke={isHighlighted('disease_id') ? '#2dd4bf' : '#334155'} 
          strokeWidth={isHighlighted('disease_id') ? '3' : '1.5'} 
          markerStart="url(#arrow)"
          style={{ transition: 'stroke 0.2s, stroke-width 0.2s' }}
        />
        {/* Time Join */}
        <path 
          d="M 425 420 L 425 350" 
          stroke={isHighlighted('time_id') ? '#2dd4bf' : '#334155'} 
          strokeWidth={isHighlighted('time_id') ? '3' : '1.5'} 
          markerStart="url(#arrow)"
          style={{ transition: 'stroke 0.2s, stroke-width 0.2s' }}
        />

        {/* ======================================================== */}
        {/* 1. Dimension Patients Table */}
        {/* ======================================================== */}
        <g transform="translate(20, 50)">
          <rect width="200" height="170" rx="8" fill="#1e293b" stroke="#334155" strokeWidth="2" />
          <rect width="200" height="40" rx="8" fill="#0f766e" />
          <text x="15" y="25" fill="#ffffff" fontWeight="600" fontSize="13">dim_patient</text>
          
          <g transform="translate(15, 60)" fontSize="12" fill="#e2e8f0" cursor="pointer"
             onMouseEnter={() => handleMouseEnter('patient_id')} onMouseLeave={handleMouseLeave}>
            <text x="0" y="0" fontWeight="bold" fill={isHighlighted('patient_id') ? '#2dd4bf' : '#2dd4bf'}>🔑 patient_id (PK)</text>
            <text x="0" y="22" fill="#94a3b8">patient_name (VARCHAR)</text>
            <text x="0" y="44" fill="#94a3b8">age (INT)</text>
            <text x="0" y="66" fill="#94a3b8">gender (VARCHAR)</text>
            <text x="0" y="88" fill="#94a3b8">address (VARCHAR)</text>
            <text x="0" y="100" fill="#94a3b8" fontSize="10">contact (VARCHAR)</text>
          </g>
        </g>

        {/* ======================================================== */}
        {/* 2. Dimension Doctors Table */}
        {/* ======================================================== */}
        <g transform="translate(325, 10)">
          <rect width="200" height="90" rx="8" fill="#1e293b" stroke="#334155" strokeWidth="2" />
          <rect width="200" height="30" rx="8" fill="#0f766e" />
          <text x="15" y="20" fill="#ffffff" fontWeight="600" fontSize="12">dim_doctor</text>
          
          <g transform="translate(15, 48)" fontSize="12" fill="#e2e8f0" cursor="pointer"
             onMouseEnter={() => handleMouseEnter('doctor_id')} onMouseLeave={handleMouseLeave}>
            <text x="0" y="0" fontWeight="bold" fill={isHighlighted('doctor_id') ? '#2dd4bf' : '#2dd4bf'}>🔑 doctor_id (PK)</text>
            <text x="0" y="20" fill="#94a3b8">doctor_name (VARCHAR)</text>
            <text x="0" y="38" fill="#94a3b8">specialization (VARCHAR)</text>
          </g>
        </g>

        {/* ======================================================== */}
        {/* 3. Dimension Diseases Table */}
        {/* ======================================================== */}
        <g transform="translate(630, 50)">
          <rect width="200" height="90" rx="8" fill="#1e293b" stroke="#334155" strokeWidth="2" />
          <rect width="200" height="30" rx="8" fill="#0f766e" />
          <text x="15" y="20" fill="#ffffff" fontWeight="600" fontSize="12">dim_disease</text>
          
          <g transform="translate(15, 48)" fontSize="12" fill="#e2e8f0" cursor="pointer"
             onMouseEnter={() => handleMouseEnter('disease_id')} onMouseLeave={handleMouseLeave}>
            <text x="0" y="0" fontWeight="bold" fill={isHighlighted('disease_id') ? '#2dd4bf' : '#2dd4bf'}>🔑 disease_id (PK)</text>
            <text x="0" y="20" fill="#94a3b8">disease_name (VARCHAR)</text>
          </g>
        </g>

        {/* ======================================================== */}
        {/* 4. Central Fact Table: Patient Visits */}
        {/* ======================================================== */}
        <g transform="translate(325, 140)">
          <rect width="200" height="230" rx="8" fill="#0f172a" stroke="#0d9488" strokeWidth="2" />
          <rect width="200" height="35" rx="8" fill="#0d9488" />
          <text x="15" y="22" fill="#ffffff" fontWeight="600" fontSize="13">fact_patient_visit</text>
          
          <g transform="translate(15, 52)" fontSize="11" fill="#e2e8f0">
            <text x="0" y="0" fontWeight="bold" fill="#38bdf8">🔑 visit_id (PK)</text>
            
            {/* FK Triggers */}
            <text x="0" y="18" fill={isHighlighted('patient_id') ? '#2dd4bf' : '#e2e8f0'} fontWeight={isHighlighted('patient_id') ? 'bold' : 'normal'} cursor="pointer"
              onMouseEnter={() => handleMouseEnter('patient_id')} onMouseLeave={handleMouseLeave}>🔗 patient_id (FK)</text>
              
            <text x="0" y="34" fill={isHighlighted('doctor_id') ? '#2dd4bf' : '#e2e8f0'} fontWeight={isHighlighted('doctor_id') ? 'bold' : 'normal'} cursor="pointer"
              onMouseEnter={() => handleMouseEnter('doctor_id')} onMouseLeave={handleMouseLeave}>🔗 doctor_id (FK)</text>
              
            <text x="0" y="50" fill={isHighlighted('disease_id') ? '#2dd4bf' : '#e2e8f0'} fontWeight={isHighlighted('disease_id') ? 'bold' : 'normal'} cursor="pointer"
              onMouseEnter={() => handleMouseEnter('disease_id')} onMouseLeave={handleMouseLeave}>🔗 disease_id (FK)</text>
              
            <text x="0" y="66" fill={isHighlighted('time_id') ? '#2dd4bf' : '#e2e8f0'} fontWeight={isHighlighted('time_id') ? 'bold' : 'normal'} cursor="pointer"
              onMouseEnter={() => handleMouseEnter('time_id')} onMouseLeave={handleMouseLeave}>🔗 time_id (FK)</text>
              
            {/* Fact Metrics */}
            <line x1="0" y1="78" x2="170" y2="78" stroke="#334155" strokeWidth="1" />
            <text x="0" y="94" fill="#a7f3d0">📈 glucose (DOUBLE)</text>
            <text x="0" y="110" fill="#a7f3d0">📈 blood_pressure (INT)</text>
            <text x="0" y="126" fill="#a7f3d0">📈 insulin (DOUBLE)</text>
            <text x="0" y="142" fill="#a7f3d0">📈 bmi (DOUBLE)</text>
            <text x="0" y="158" fill="#fb7185">⚙️ prediction_result (VARCHAR)</text>
            <text x="0" y="174" fill="#fde047">⚙️ risk_score (DOUBLE)</text>
          </g>
        </g>

        {/* ======================================================== */}
        {/* 5. Dimension Time Table */}
        {/* ======================================================== */}
        <g transform="translate(325, 410)">
          <rect width="200" height="95" rx="8" fill="#1e293b" stroke="#334155" strokeWidth="2" />
          <rect width="200" height="30" rx="8" fill="#0f766e" />
          <text x="15" y="20" fill="#ffffff" fontWeight="600" fontSize="12">dim_time</text>
          
          <g transform="translate(15, 48)" fontSize="12" fill="#e2e8f0" cursor="pointer"
             onMouseEnter={() => handleMouseEnter('time_id')} onMouseLeave={handleMouseLeave}>
            <text x="0" y="0" fontWeight="bold" fill={isHighlighted('time_id') ? '#2dd4bf' : '#2dd4bf'}>🔑 time_id (PK)</text>
            <text x="0" y="20" fill="#94a3b8">day / month / year (INT)</text>
          </g>
        </g>

      </svg>
    </div>
  );
}
