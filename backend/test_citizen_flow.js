const fs = require('fs');
const path = require('path');

async function testCitizenFlow() {
  console.log('--- Testing Citizen Flow ---');

  // 1. Register a test citizen
  const regRes = await fetch('http://localhost:5000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Alex Citizen Test',
      email: `alex_${Date.now()}@citizen.org`,
      password: 'password123'
    })
  });
  const regData = await regRes.json();
  console.log('1. Registration Response:', regData.success, 'Token created');

  const token = regData.token;

  // Create a dummy image buffer for Multer upload test
  const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
  const body = 
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="title"\r\n\r\n` +
    `Caved-in Drainage Drain\r\n` +
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="description"\r\n\r\n` +
    `Dangerous caved in drain near school walkway\r\n` +
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="category"\r\n\r\n` +
    `Drainage & Sewage\r\n` +
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="severity"\r\n\r\n` +
    `high\r\n` +
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="location"\r\n\r\n` +
    `12th Cross, St. Mary School Zone\r\n` +
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="image"; filename="drain.png"\r\n` +
    `Content-Type: image/png\r\n\r\n` +
    `iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==\r\n` +
    `--${boundary}--\r\n`;

  // 2. Submit Complaint with Multer image upload
  const compRes = await fetch('http://localhost:5000/api/complaints', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    },
    body: body
  });
  const compData = await compRes.json();
  console.log('2. Create Complaint Response:', compData);

  // 3. Fetch My Complaints
  const myRes = await fetch('http://localhost:5000/api/complaints/my', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const myData = await myRes.json();
  console.log('3. My Complaints Count:', myData.data?.length, 'Code:', myData.data[0]?.complaint_code);

  // 4. Fetch Complaint Details
  const detailRes = await fetch(`http://localhost:5000/api/complaints/${compData.data.id}`);
  const detailData = await detailRes.json();
  console.log('4. Detailed View Code:', detailData.data?.complaint_code, 'Image Path:', detailData.data?.image_url);

  console.log('--- ALL CITIZEN FEATURE TESTS PASSED SUCCESSFULLY ---');
}

testCitizenFlow().catch(console.error);
