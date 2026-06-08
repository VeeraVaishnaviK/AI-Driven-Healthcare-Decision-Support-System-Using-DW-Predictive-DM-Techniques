import { NextResponse } from 'next/server';
import { 
  getPatients, savePatient, 
  getVisits, saveVisit, 
  getDoctors, getDiseases, 
  getTimes, saveTime 
} from '@/utils/db';

export async function GET() {
  try {
    const [patients, visits, doctors, diseases, times] = await Promise.all([
      getPatients(),
      getVisits(),
      getDoctors(),
      getDiseases(),
      getTimes()
    ]);

    return NextResponse.json({
      patients,
      visits,
      doctors,
      diseases,
      times
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      patient_id, 
      patient_name, 
      age, 
      gender, 
      address, 
      contact,
      doctor_id,
      disease_id,
      glucose,
      blood_pressure,
      insulin,
      bmi,
      prediction_result,
      risk_score
    } = body;

    if (!patient_id || !patient_name || !doctor_id || !disease_id) {
      return NextResponse.json(
        { error: 'Missing required patient or clinical fields' },
        { status: 400 }
      );
    }

    // 1. Save Patient Dimension
    const patientObj = {
      patient_id,
      patient_name,
      age: Number(age),
      gender,
      address: address || '',
      contact: contact || ''
    };
    await savePatient(patientObj);

    // 2. Create/Save Time Dimension for Today
    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();
    const time_id = `T${year}${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}`;
    
    const timeObj = {
      time_id,
      day,
      month,
      year
    };
    await saveTime(timeObj);

    // 3. Save Patient Visit Fact
    const visit_id = `V${Math.floor(1000 + Math.random() * 9000)}`;
    const visitObj = {
      visit_id,
      patient_id,
      doctor_id,
      disease_id,
      time_id,
      glucose: glucose ? Number(glucose) : 0,
      blood_pressure: blood_pressure ? Number(blood_pressure) : 0,
      insulin: insulin ? Number(insulin) : 0,
      bmi: bmi ? Number(bmi) : 0,
      prediction_result: prediction_result || 'Low Risk / Normal',
      risk_score: risk_score ? Number(risk_score) : 0
    };
    await saveVisit(visitObj);

    return NextResponse.json({ 
      success: true, 
      patient: patientObj, 
      visit: visitObj, 
      time: timeObj 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
