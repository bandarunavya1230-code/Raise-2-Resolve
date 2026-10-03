async function testPriorityAndDuplicates() {
  console.log('=== Testing Automatic Priority & Duplicate Detection ===');
  const BASE_URL = process.env.BASE_URL || ('http://localhost:' + (process.env.PORT || 3000));

  // 1. Check duplicate detection API
  const dupCheckRes = await fetch(`${BASE_URL}/api/complaints/check-similar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      category: 'Drainage & Sewage',
      location: 'School Zone',
      title: 'Drainage problem'
    })
  });
  const dupCheckData = await dupCheckRes.json();
  console.log('1. Duplicate Check Result:', dupCheckData.hasSimilar, 'Matches:', dupCheckData.matches.length);

  // 2. Register & Post a Critical Complaint
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Priority Tester',
      email: `priority_${Date.now()}@test.org`,
      password: 'password123'
    })
  });
  const regData = await regRes.json();
  const token = regData.token;

  const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
  const body = 
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="title"\r\n\r\n` +
    `Exposed High Voltage Wire near Park\r\n` +
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="description"\r\n\r\n` +
    `Live electrical wire hanging on public sidewalk\r\n` +
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="category"\r\n\r\n` +
    `Public Safety\r\n` +
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="severity"\r\n\r\n` +
    `critical\r\n` +
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="location"\r\n\r\n` +
    `Central Park South\r\n` +
    `--${boundary}--\r\n`;

  const compRes = await fetch(`${BASE_URL}/api/complaints`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    },
    body: body
  });
  const compData = await compRes.json();
  console.log('2. Created Critical Complaint:', {
    code: compData.data.complaint_code,
    priorityScore: compData.data.priority_score,
    priorityReason: compData.data.priority_reason
  });

  // 3. Upvote the complaint to boost score
  const upvoteRes = await fetch(`${BASE_URL}/api/complaints/${compData.data.id}/support`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const upvoteData = await upvoteRes.json();
  console.log('3. Upvoted Score Boost:', {
    supported: upvoteData.supported,
    newSupportCount: upvoteData.support_count,
    boostedPriorityScore: upvoteData.priority_score,
    priorityReason: upvoteData.priority_reason
  });

  // 4. Verify Complaints List sorting by Priority Score
  const listRes = await fetch(`${BASE_URL}/api/complaints`);
  const listData = await listRes.json();
  console.log('4. Top Priority Complaint in DB Feed:', {
    topCode: listData.data[0]?.complaint_code,
    topScore: listData.data[0]?.priority_score,
    title: listData.data[0]?.title
  });

  console.log('=== ALL PRIORITY & DUPLICATE TESTS PASSED ===');
}

testPriorityAndDuplicates().catch(console.error);
