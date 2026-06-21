const BASE_URL = 'http://localhost:5005';

async function test() {
  console.log('--- TESTING ADMIN PANEL API ENDPOINTS ---');

  // 1. Login to get token
  console.log('\n1. Logging in as Admin...');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@mraretail.co.id',
      password: 'MraGlc2026!'
    })
  });

  if (!loginRes.ok) {
    console.error('Login failed:', await loginRes.text());
    return;
  }

  const { token } = await loginRes.json();
  console.log('Login successful! Token acquired.');

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // 2. Test GET /api/admin/users
  console.log('\n2. Testing GET /api/admin/users...');
  const usersRes = await fetch(`${BASE_URL}/api/admin/users`, { headers });
  if (usersRes.ok) {
    const users = await usersRes.json();
    console.log(`Success! Fetched ${users.length} users.`);
    if (users.length > 0) {
      console.log('First user:', {
        id: users[0].id,
        full_name: users[0].full_name,
        email: users[0].email,
        role: users[0].role
      });
    }
  } else {
    console.error('GET /api/admin/users failed:', await usersRes.text());
  }

  // 3. Test GET /api/admin/permissions
  console.log('\n3. Testing GET /api/admin/permissions...');
  const permRes = await fetch(`${BASE_URL}/api/admin/permissions`, { headers });
  if (permRes.ok) {
    const perms = await permRes.json();
    console.log(`Success! Fetched ${perms.length} role permissions.`);
    if (perms.length > 0) {
      console.log('Sample permission entry:', perms[0]);
    }
  } else {
    console.error('GET /api/admin/permissions failed:', await permRes.text());
  }

  // 4. Test GET /api/admin/audit-logs
  console.log('\n4. Testing GET /api/admin/audit-logs...');
  const logsRes = await fetch(`${BASE_URL}/api/admin/audit-logs?limit=3`, { headers });
  if (logsRes.ok) {
    const logsData = await logsRes.json();
    console.log(`Success! Fetched ${logsData.data?.length || 0} audit logs. Total count: ${logsData.meta?.total || 0}`);
    if (logsData.data && logsData.data.length > 0) {
      console.log('Sample log entry:', logsData.data[0]);
    }
  } else {
    console.error('GET /api/admin/audit-logs failed:', await logsRes.text());
  }

  console.log('\n--- ALL TESTS COMPLETED ---');
}

test().catch(console.error);
