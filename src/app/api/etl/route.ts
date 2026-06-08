import { NextResponse } from 'next/server';
import { getEtlLogs, saveEtlLog, savePatient, saveTime, saveVisit, getPatients, getDoctors, getDiseases } from '@/utils/db';

export async function GET() {
  try {
    const logs = await getEtlLogs();
    return NextResponse.json({ logs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Sleep helper
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST() {
  try {
    // Simulate pipeline run time
    await sleep(1500);

    const doctors = await getDoctors();
    const diseases = await getDiseases();
    
    // Check if doctors are populated, if not, wait
    if (doctors.length === 0 || diseases.length === 0) {
      return NextResponse.json({ error: 'Database dimensions not initialized' }, { status: 400 });
    }

    // Mock newly extracted records
    const mockNames = ['Lori Martinez', 'William Taylor', 'Isabella Campbell', 'George Harrison', 'Sophia Loren'];
    const mockGenders = ['Female', 'Male', 'Female', 'Male', 'Female'];
    const mockAddresses = ['502 Spruce St', '981 Maple St', '304 Birch Rd', '888 Abbey Rd', '405 Hollywood Blvd'];
    
    const count = mockNames.length;
    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();
    const time_id = `T${year}${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}`;

    // Add time dimension
    await saveTime({ time_id, day, month, year });

    const newPatients = [];
    const newVisits = [];

    for (let i = 0; i < count; i++) {
      const pid = `P${Math.floor(100 + Math.random() * 900)}`;
      const patient = {
        patient_id: pid,
        patient_name: mockNames[i],
        age: Math.floor(20 + Math.random() * 60),
        gender: mockGenders[i],
        address: mockAddresses[i] + ', WA',
        contact: `206-555-${Math.floor(1000 + Math.random() * 9000)}`
      };
      
      await savePatient(patient);
      newPatients.push(patient);

      // Random clinical details
      const glucose = Math.floor(70 + Math.random() * 110);
      const bp = Math.floor(110 + Math.random() * 50);
      const insulin = Math.random() > 0.5 ? Math.floor(10 + Math.random() * 150) : 0;
      const bmi = Math.round((18 + Math.random() * 18) * 10) / 10;
      
      const randDoc = doctors[Math.floor(Math.random() * doctors.length)];
      const randDisease = diseases[Math.floor(Math.random() * diseases.length)];

      let risk = 10;
      let predResult = 'Low Risk / Normal';
      if (glucose > 130 || bp > 140) {
        risk = Math.round((50 + Math.random() * 45) * 10) / 10;
        predResult = risk > 75 ? 'Critical Risk / Alert' : 'Moderate Clinical Risk';
      }

      const visit = {
        visit_id: `V${Math.floor(1000 + Math.random() * 9000)}`,
        patient_id: pid,
        doctor_id: randDoc.doctor_id,
        disease_id: randDisease.disease_id,
        time_id,
        glucose,
        blood_pressure: bp,
        insulin,
        bmi,
        prediction_result: predResult,
        risk_score: risk
      };

      await saveVisit(visit);
      newVisits.push(visit);
    }

    // Save ETL log
    const logId = `L${Math.floor(100 + Math.random() * 900)}`;
    const etlLog = {
      log_id: logId,
      timestamp: new Date().toISOString(),
      pipeline_name: 'EMR Sync Pipeline',
      status: 'COMPLETED',
      records_extracted: count,
      records_transformed: count,
      records_loaded: count,
      duration_ms: 1500 + Math.floor(Math.random() * 300),
      details: `Successfully pulled ${count} EMR records. Transformed names & addresses. Mapped and loaded into dim_patient and fact_patient_visit.`
    };

    await saveEtlLog(etlLog);

    return NextResponse.json({
      success: true,
      log: etlLog,
      insertedCount: count
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
