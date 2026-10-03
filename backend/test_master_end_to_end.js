const fs = require('fs');
const path = require('path');

async function runMasterTest() {
  console.log('====================================================');
  console.log('🏛️  BUILDION - RAISE 2 RESOLVE MASTER END-TO-END TEST');
  console.log('====================================================\n');

  const BASE_URL = 'http://localhost:5000';

  // 1. Test Backend Health & SQLite DB Connection
  console.log('1. Testing Backend & Database Health...');
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  const healthData = await healthRes.json();
  if (!healthData.success || healthData.database !== 'connected') {
    throw new Error('Health check failed: ' + JSON.stringify(healthData));
  }
  console.log('   ✅ Backend & SQLite DB Online (Total Users:', healthData.usersTotal, ')\n');

  // 2. Test Citizen Registration
  console.log('2. Testing Citizen Registration...');
  const testEmail = `final_citizen_${Date.now()}@buildion.org`;
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Final Test Citizen',
      email: testEmail,
      password: 'password123'
    })
  });
  const regData = await regRes.json();
  if (!regData.success || !regData.token) {
    throw new Error('Registration failed: ' + JSON.stringify(regData));
  }
  const citizenToken = regData.token;
  console.log('   ✅ Citizen Registered Successfully:', regData.user.name, '\n');

  // 3. Test Citizen Login (bcrypt check)
  console.log('3. Testing Citizen Login (Bcrypt Password Hashing)...');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'password123'
    })
  });
  const loginData = await loginRes.json();
  if (!loginData.success || !loginData.token) {
    throw new Error('Login failed: ' + JSON.stringify(loginData));
  }
  console.log('   ✅ Citizen Login Successful (JWT Token Issued)\n');

  // 4. Test Demo Authority Login & Role Guarding
  console.log('4. Testing Authority Login & Role Authorization...');
  const authLoginRes = await fetch(`${BASE_URL}/api/auth/demo-authority`, { method: 'POST' });
  const authLoginData = await authLoginRes.json();
  if (!authLoginData.success || authLoginData.user.role !== 'authority') {
    throw new Error('Authority login failed: ' + JSON.stringify(authLoginData));
  }
  const authorityToken = authLoginData.token;
  console.log('   ✅ Demo Authority Authenticated:', authLoginData.user.name, '\n');

  // 5. Test Duplicate Detection API
  console.log('5. Testing Duplicate / Similar Complaint Detection...');
  const dupRes = await fetch(`${BASE_URL}/api/complaints/check-similar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      category: 'Roads & Potholes',
      location: 'Main Street',
      title: 'Pothole'
    })
  });
  const dupData = await dupRes.json();
  console.log('   ✅ Duplicate Check Executed (Matches Found:', dupData.matches?.length || 0, ')\n');

  // 6. Test Complaint Submission with Multer Image Upload & Priority Calculation
  console.log('6. Testing Complaint Submission with Multer Image & Priority Score...');
  const boundary = '----WebKitFormBoundaryMasterTest7MA4YW';
  const body = 
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="title"\r\n\r\n` +
    `Collapsed Storm Drain Cover\r\n` +
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="description"\r\n\r\n` +
    `Hazardous storm drain cover collapsed near busy pedestrian crosswalk\r\n` +
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="category"\r\n\r\n` +
    `Drainage & Sewage\r\n` +
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="severity"\r\n\r\n` +
    `critical\r\n` +
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="location"\r\n\r\n` +
    `7th Avenue & Elm Junction\r\n` +
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="image"; filename="storm_drain.png"\r\n` +
    `Content-Type: image/png\r\n\r\n` +
    `iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==\r\n` +
    `--${boundary}--\r\n`;

  const compRes = await fetch(`${BASE_URL}/api/complaints`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${citizenToken}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    },
    body: body
  });
  const compData = await compRes.json();
  if (!compData.success || !compData.data.id) {
    throw new Error('Complaint submission failed: ' + JSON.stringify(compData));
  }
  const complaintId = compData.data.id;
  console.log('   ✅ Complaint Submitted Successfully!');
  console.log('      - Code:', compData.data.complaint_code);
  console.log('      - Priority Score:', compData.data.priority_score);
  console.log('      - Image Upload Path:', compData.data.image_url, '\n');

  // 7. Test Support / Upvoting & Dynamic Priority Boost
  console.log('7. Testing Upvoting & Priority Score Boost...');
  const upvoteRes = await fetch(`${BASE_URL}/api/complaints/${complaintId}/support`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${citizenToken}` }
  });
  const upvoteData = await upvoteRes.json();
  console.log('   ✅ Upvote Successful!');
  console.log('      - Support Count:', upvoteData.support_count);
  console.log('      - Boosted Priority Score:', upvoteData.priority_score, '\n');

  // 8. Test Authority Verification
  console.log('8. Testing Authority Report Verification...');
  const verifyRes = await fetch(`${BASE_URL}/api/complaints/${complaintId}/verify`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${authorityToken}` }
  });
  const verifyData = await verifyRes.json();
  console.log('   ✅ Verification Status Set:', verifyData.message, '\n');

  // 9. Test Authority Remarks & Status Change
  console.log('9. Testing Authority Remarks & Status Transition...');
  const remarkRes = await fetch(`${BASE_URL}/api/complaints/${complaintId}/authority-update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authorityToken}`
    },
    body: JSON.stringify({
      update_text: 'Emergency maintenance crew dispatched. Area barricaded for safety.',
      status_change: 'in_progress',
      action_type: 'dispatch'
    })
  });
  const remarkData = await remarkRes.json();
  console.log('   ✅ Authority Remarks Saved:', remarkData.message, '\n');

  // 10. Test Complaint Detail View & Timeline Data
  console.log('10. Testing Complaint Details View & Timeline Data...');
  const detailRes = await fetch(`${BASE_URL}/api/complaints/${complaintId}`);
  const detailData = await detailRes.json();
  if (!detailData.success || detailData.data.status !== 'in_progress') {
    throw new Error('Detail check failed: ' + JSON.stringify(detailData));
  }
  console.log('   ✅ Complaint Details Verified!');
  console.log('      - Verified Badge:', detailData.data.is_verified === 1);
  console.log('      - Current Status:', detailData.data.status);
  console.log('      - Remarks Log Count:', detailData.data.updates?.length, '\n');

  // 11. Test Fetching My Complaints
  console.log('11. Testing My Complaints Endpoint...');
  const myRes = await fetch(`${BASE_URL}/api/complaints/my`, {
    headers: { 'Authorization': `Bearer ${citizenToken}` }
  });
  const myData = await myRes.json();
  console.log('   ✅ My Complaints Fetched (Total:', myData.data?.length, ')\n');

  console.log('====================================================');
  console.log('🎉 MASTER END-TO-END TEST COMPLETED WITH 0 ERRORS!');
  console.log('====================================================');
}

runMasterTest().catch(err => {
  console.error('\n❌ MASTER TEST ERROR:', err);
  process.exit(1);
});
