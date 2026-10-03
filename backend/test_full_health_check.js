async function runFullHealthCheck() {
  console.log('================================================================');
  console.log('🩺 FULL SYSTEM HEALTH CHECK: RAISE 2 RESOLVE');
  console.log('================================================================\n');

  const BASE_URL = process.env.BASE_URL || ('http://localhost:' + (process.env.PORT || 3000));
  let passedCount = 0;
  let totalChecks = 12;

  // 1. Backend & SQLite DB Health Check
  console.log('[Check 1/12] Backend Startup & SQLite DB Connection...');
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  const healthData = await healthRes.json();
  if (healthData.success && healthData.database === 'connected') {
    console.log('  ✅ Backend online, SQLite DB connected, total users:', healthData.usersTotal);
    passedCount++;
  } else {
    throw new Error('Backend health check failed');
  }

  // 2. Citizen Registration
  console.log('[Check 2/12] Citizen Registration & Password Hashing (bcrypt)...');
  const citizenEmail = `health_citizen_${Date.now()}@raise2resolve.gov`;
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Health Check Citizen', email: citizenEmail, password: 'healthpassword123' })
  });
  const regData = await regRes.json();
  if (regData.success && regData.token) {
    console.log('  ✅ Citizen registration successful, token issued');
    passedCount++;
  } else {
    throw new Error('Citizen registration failed');
  }

  const citizenToken = regData.token;

  // 3. Citizen Login & Me Endpoint
  console.log('[Check 3/12] Citizen Login & GET /api/auth/me...');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: citizenEmail, password: 'healthpassword123' })
  });
  const loginData = await loginRes.json();
  
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { 'Authorization': `Bearer ${citizenToken}` }
  });
  const meData = await meRes.json();
  if (loginData.success && meData.success && meData.user.email === citizenEmail) {
    console.log('  ✅ Citizen login & profile verification passed');
    passedCount++;
  } else {
    throw new Error('Login/Me endpoint check failed');
  }

  // 4. Authority Demo Login
  console.log('[Check 4/12] Authority Demo Login & Role Guarding...');
  const authRes = await fetch(`${BASE_URL}/api/auth/demo-authority`, { method: 'POST' });
  const authData = await authRes.json();
  if (authData.success && authData.user.role === 'authority') {
    console.log('  ✅ Authority demo login passed (Role: authority)');
    passedCount++;
  } else {
    throw new Error('Authority login failed');
  }

  const authorityToken = authData.token;

  // 5. Duplicate Detection API
  console.log('[Check 5/12] Duplicate / Similar Complaint Detection...');
  const dupRes = await fetch(`${BASE_URL}/api/complaints/check-similar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category: 'Water Supply', location: 'Main Street', title: 'Water leak' })
  });
  const dupData = await dupRes.json();
  if (dupData.success && Array.isArray(dupData.matches)) {
    console.log('  ✅ Duplicate check API passed (Matches:', dupData.matches.length, ')');
    passedCount++;
  } else {
    throw new Error('Duplicate check failed');
  }

  // 6. Complaint Submission & Multer Upload & GIS Coordinates
  console.log('[Check 6/12] Complaint Creation, Multer Upload, Priority & GIS...');
  const boundary = '----WebKitFormBoundaryHealthCheck7MA4YW';
  const body = 
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="title"\r\n\r\n` +
    `Burst Water Pipeline\r\n` +
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="description"\r\n\r\n` +
    `Major water pipe burst flooding road and pavement\r\n` +
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="category"\r\n\r\n` +
    `Water Supply\r\n` +
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="severity"\r\n\r\n` +
    `high\r\n` +
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="location"\r\n\r\n` +
    `4th Cross, Water Board Ward\r\n` +
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="image"; filename="water.png"\r\n` +
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
  if (compData.success && compData.data.complaint_code && compData.data.latitude) {
    console.log('  ✅ Complaint creation passed (Code:', compData.data.complaint_code, 'Score:', compData.data.priority_score, 'GIS:', compData.data.latitude, compData.data.longitude, ')');
    passedCount++;
  } else {
    throw new Error('Complaint creation check failed');
  }

  const complaintId = compData.data.id;

  // 7. Complaint Support / Upvoting
  console.log('[Check 7/12] Complaint Support / Upvoting & Priority Boost...');
  const upvoteRes = await fetch(`${BASE_URL}/api/complaints/${complaintId}/support`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${citizenToken}` }
  });
  const upvoteData = await upvoteRes.json();
  if (upvoteData.success && upvoteData.support_count === 1) {
    console.log('  ✅ Support upvote passed (Boosted Priority Score:', upvoteData.priority_score, ')');
    passedCount++;
  } else {
    throw new Error('Support upvote check failed');
  }

  // 8. Authority Report Verification
  console.log('[Check 8/12] Authority Report Verification...');
  const verifyRes = await fetch(`${BASE_URL}/api/complaints/${complaintId}/verify`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${authorityToken}` }
  });
  const verifyData = await verifyRes.json();
  if (verifyData.success && verifyData.is_verified === true) {
    console.log('  ✅ Report verification passed (is_verified: true)');
    passedCount++;
  } else {
    throw new Error('Verification check failed');
  }

  // 9. Authority Remarks & Status Update with Simulated Notifications
  console.log('[Check 9/12] Status Change & Simulated Email/SMS Notifications...');
  const updateRes = await fetch(`${BASE_URL}/api/complaints/${complaintId}/authority-update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authorityToken}`
    },
    body: JSON.stringify({
      update_text: 'Water engineering crew shut off main valve and initiated pipe replacement.',
      status_change: 'in_progress',
      action_type: 'dispatch'
    })
  });
  const updateData = await updateRes.json();
  if (updateData.success && updateData.simulatedNotification && updateData.simulatedNotification.email) {
    console.log('  ✅ Status update & Simulated Email/SMS generation passed');
    passedCount++;
  } else {
    throw new Error('Status update check failed');
  }

  // 10. Complaint Details & Timeline Progress
  console.log('[Check 10/12] Complaint Details & Timeline Data...');
  const detailRes = await fetch(`${BASE_URL}/api/complaints/${complaintId}`);
  const detailData = await detailRes.json();
  if (detailData.success && detailData.data.status === 'in_progress' && detailData.data.updates.length >= 2) {
    console.log('  ✅ Complaint details & timeline check passed (Remarks log count:', detailData.data.updates.length, ')');
    passedCount++;
  } else {
    throw new Error('Detail check failed');
  }

  // 11. My Complaints Endpoint
  console.log('[Check 11/12] GET /api/complaints/my (Citizen Dashboard Filter)...');
  const myRes = await fetch(`${BASE_URL}/api/complaints/my`, {
    headers: { 'Authorization': `Bearer ${citizenToken}` }
  });
  const myData = await myRes.json();
  if (myData.success && Array.isArray(myData.data)) {
    console.log('  ✅ My complaints endpoint check passed');
    passedCount++;
  } else {
    throw new Error('My complaints check failed');
  }

  // 12. Flagging Functionality
  console.log('[Check 12/12] Authority Flag / Invalid Report Toggle...');
  const flagRes = await fetch(`${BASE_URL}/api/complaints/${complaintId}/flag`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authorityToken}`
    },
    body: JSON.stringify({ flag_reason: 'Testing flag reason functionality' })
  });
  const flagData = await flagRes.json();
  if (flagData.success) {
    console.log('  ✅ Authority flag check passed');
    passedCount++;
  } else {
    throw new Error('Flag check failed');
  }

  console.log('\n================================================================');
  console.log(`🎉 FULL HEALTH CHECK COMPLETED: ${passedCount}/${totalChecks} CHECKS PASSED (100%)`);
  console.log('================================================================\n');
}

runFullHealthCheck().catch(err => {
  console.error('\n❌ HEALTH CHECK ERROR:', err);
  process.exit(1);
});
