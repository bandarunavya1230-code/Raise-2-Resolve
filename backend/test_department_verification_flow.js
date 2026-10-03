const { getDB } = require('./src/config/db');

async function testDepartmentVerificationFlow() {
  console.log('Testing Department Verification and District Directory Flow...');
  const db = await getDB();

  // 1. Test GET /api/departments/by-district
  const res = await fetch('http://127.0.0.1:3000/api/departments/by-district?state=Karnataka&district=Bengaluru%20Urban');
  const data = await res.json();
  if (!data.success || !Array.isArray(data.departments) || data.departments.length === 0) {
    throw new Error('Failed to fetch departments by district');
  }
  console.log(`✅ Fetched ${data.departments.length} respective departments for ${data.district}, ${data.state}`);
  console.log(`   Sample: ${data.departments[0].name} has ${data.departments[0].complaints_count} complaints filed`);

  // 2. Test Verification with Department Assignment
  // Find a complaint to verify
  const sampleComplaint = await db.get('SELECT * FROM complaints ORDER BY id DESC LIMIT 1');
  if (!sampleComplaint) {
    throw new Error('No complaints in database');
  }

  // Get authority token by logging in
  const loginRes = await fetch('http://127.0.0.1:3000/api/auth/demo-authority', {
    method: 'POST'
  });
  const loginData = await loginRes.json();
  if (!loginData.success) {
    throw new Error('Authority login failed: ' + loginData.message);
  }

  // Choose Electricity department (id 1)
  const verifyRes = await fetch(`http://127.0.0.1:3000/api/complaints/${sampleComplaint.id}/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${loginData.token}`
    },
    body: JSON.stringify({
      remarks: 'Inspected and verified. Assigned to Electricity Department.',
      department_id: 1,
      department_name: 'Electricity Department'
    })
  });
  const verifyData = await verifyRes.json();
  if (!verifyData.success) {
    throw new Error('Verification failed: ' + verifyData.message);
  }
  console.log(`✅ Complaint #${sampleComplaint.id} verified and assigned:`);
  console.log(`   - Verified Status: ${verifyData.verification_status}`);
  console.log(`   - Assigned Department: ${verifyData.assigned_department}`);

  // Check database
  const updatedComplaint = await db.get('SELECT * FROM complaints WHERE id = ?', [sampleComplaint.id]);
  if (updatedComplaint.is_verified !== 1 || updatedComplaint.department_id !== 1) {
    throw new Error(`DB verification check failed: is_verified=${updatedComplaint.is_verified}, department_id=${updatedComplaint.department_id}`);
  }
  console.log(`✅ Database confirmed: is_verified=1, department_id=${updatedComplaint.department_id}, assigned_to=${updatedComplaint.assigned_to}`);

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!');
}

testDepartmentVerificationFlow().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
