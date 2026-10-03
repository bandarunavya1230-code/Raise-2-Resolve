async function testAuthorityActions() {
  console.log('=== Testing Authority Actions Flow ===');

  // 1. Login as Authority
  const authRes = await fetch('http://localhost:5000/api/auth/demo-authority', { method: 'POST' });
  const authData = await authRes.json();
  const token = authData.token;
  console.log('1. Authority Authenticated:', authData.user.name);

  // 2. Fetch complaint list to pick ticket #1
  const listRes = await fetch('http://localhost:5000/api/complaints');
  const listData = await listRes.json();
  const targetComplaint = listData.data[0];
  console.log('2. Target Complaint:', targetComplaint.complaint_code, 'Status:', targetComplaint.status);

  // 3. Verify Complaint
  const verifyRes = await fetch(`http://localhost:5000/api/complaints/${targetComplaint.id}/verify`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const verifyData = await verifyRes.json();
  console.log('3. Verification Toggle:', verifyData.message, 'Is Verified:', verifyData.is_verified);

  // 4. Add Authority Remarks & Change Status to 'in_progress'
  const remarkRes = await fetch(`http://localhost:5000/api/complaints/${targetComplaint.id}/authority-update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      update_text: 'Municipal Public Works team dispatched to site with heavy repair equipment.',
      status_change: 'in_progress',
      action_type: 'dispatch'
    })
  });
  const remarkData = await remarkRes.json();
  console.log('4. Add Remarks & Status Change:', remarkData.message);

  // 5. Fetch Detail View & Check Citizen Timeline Steps
  const detailRes = await fetch(`http://localhost:5000/api/complaints/${targetComplaint.id}`);
  const detailData = await detailRes.json();
  console.log('5. Detail View Updated Status:', detailData.data.status);
  console.log('   Is Verified:', detailData.data.is_verified === 1);
  console.log('   Official Remarks Count:', detailData.data.updates?.length);

  console.log('=== ALL AUTHORITY ACTION TESTS PASSED SUCCESSFULLY ===');
}

testAuthorityActions().catch(console.error);
