async function testSimulatedNotifications() {
  console.log('=== Testing Status Change -> Simulated Notification Flow ===');

  // 1. Login as Authority
  const authRes = await fetch('http://localhost:5000/api/auth/demo-authority', { method: 'POST' });
  const authData = await authRes.json();
  const token = authData.token;

  // 2. Fetch complaint list to pick ticket #1
  const listRes = await fetch('http://localhost:5000/api/complaints');
  const listData = await listRes.json();
  const targetComplaint = listData.data[0];

  // 3. Update status & verify simulated notification in API response
  const updateRes = await fetch(`http://localhost:5000/api/complaints/${targetComplaint.id}/authority-update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      update_text: 'Repair team completed pothole patching and asphalt sealing.',
      status_change: 'resolved',
      action_type: 'resolution'
    })
  });
  const updateData = await updateRes.json();

  if (!updateData.success || !updateData.simulatedNotification) {
    throw new Error('Notification payload missing from update response: ' + JSON.stringify(updateData));
  }

  const notif = updateData.simulatedNotification;
  console.log('1. Status Change Successful!');
  console.log('2. Simulated Email Label:', notif.email.label);
  console.log('   - To:', notif.email.to);
  console.log('   - Subject:', notif.email.subject);
  console.log('3. Simulated SMS Label:', notif.sms.label);
  console.log('   - To:', notif.sms.to);
  console.log('   - Body:', notif.sms.body);

  console.log('=== SIMULATED NOTIFICATION TEST PASSED WITH 0 ERRORS ===');
}

testSimulatedNotifications().catch(console.error);
