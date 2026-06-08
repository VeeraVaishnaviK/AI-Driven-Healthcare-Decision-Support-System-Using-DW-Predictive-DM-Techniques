import { NextResponse } from 'next/server';
import { 
  getPatients, savePatient, deletePatient,
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

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { 
      patient_id, 
      patient_name, 
      age, 
      gender, 
      address, 
      contact,
      glucose,
      blood_pressure,
      insulin,
      bmi
    } = body;

    if (!patient_id || !patient_name) {
      return NextResponse.json(
        { error: 'Missing required patient fields' },
        { status: 400 }
      );
    }

    // 1. Update Patient Dimension
    const patientObj = {
      patient_id,
      patient_name,
      age: Number(age),
      gender,
      address: address || '',
      contact: contact || ''
    };
    await savePatient(patientObj);

    // 2. Update Patient Visit Fact (vitals)
    const visits = await getVisits();
    // Find latest visit for this patient
    const pVisits = visits.filter(v => v.patient_id === patient_id);
    
    if (pVisits.length > 0) {
      // Get latest visit
      const latestVisit = pVisits[pVisits.length - 1];
      
      const g = glucose ? Number(glucose) : latestVisit.glucose;
      const bp = blood_pressure ? Number(blood_pressure) : latestVisit.blood_pressure;
      const ins = insulin !== undefined ? Number(insulin) : latestVisit.insulin;
      const b = bmi ? Number(bmi) : latestVisit.bmi;

      // Re-calculate risk score
      let score = 12;
      if (g >= 126 || bp >= 140) {
        score = 81;
      } else if (g >= 100 || bp >= 130) {
        score = 46;
      }

      const outcome = score >= 75 ? 'High Risk Detected' : 
                      score >= 40 ? 'Moderate Risk Detected' : 'Healthy / Normal';

      const updatedVisit = {
        ...latestVisit,
        glucose: g,
        blood_pressure: bp,
        insulin: ins,
        bmi: b,
        prediction_result: outcome,
        risk_score: score
      };

      await saveVisit(updatedVisit);
    }

    return NextResponse.json({ success: true, patient: patientObj });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing patient ID parameter' }, { status: 400 });
    }

    await deletePatient(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
