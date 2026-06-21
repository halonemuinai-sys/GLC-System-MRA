async function runTests() {
  const loginUrl = 'http://localhost:5005/api/auth/login';
  const loginPayload = {
    email: 'admin@mraretail.co.id',
    password: 'MraGlc2026!'
  };

  console.log('1. Logging in to acquire JWT token...');
  try {
    const loginRes = await fetch(loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginPayload)
    });
    
    if (!loginRes.ok) {
      console.error('Login failed:', await loginRes.text());
      return;
    }

    const { token } = await loginRes.json();
    console.log('Login Succeeded. Token acquired.\n');

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // Test GA Dashboard Stats
    console.log('2. Testing GET /api/ga/dashboard-stats...');
    const gaStatsRes = await fetch('http://localhost:5005/api/ga/dashboard-stats', { headers });
    console.log('GA Stats Status:', gaStatsRes.status);
    console.log('GA Stats Data:', await gaStatsRes.json());
    console.log('---------------------------------------------------\n');

    // Test GA Assets List
    console.log('3. Testing GET /api/ga/assets...');
    const gaAssetsRes = await fetch('http://localhost:5005/api/ga/assets?limit=2', { headers });
    console.log('GA Assets Status:', gaAssetsRes.status);
    const gaAssetsData = await gaAssetsRes.json();
    console.log('GA Assets Count in page:', gaAssetsData.data ? gaAssetsData.data.length : 0);
    console.log('GA Assets Meta:', gaAssetsData.meta);
    console.log('---------------------------------------------------\n');

    // Test Legal Dashboard Stats
    console.log('4. Testing GET /api/legal/dashboard-stats...');
    const legalStatsRes = await fetch('http://localhost:5005/api/legal/dashboard-stats', { headers });
    console.log('Legal Stats Status:', legalStatsRes.status);
    console.log('Legal Stats Data:', await legalStatsRes.json());
    console.log('---------------------------------------------------\n');

    // Test Compliance Dashboard Stats
    console.log('5. Testing GET /api/compliance/dashboard-stats...');
    const complianceStatsRes = await fetch('http://localhost:5005/api/compliance/dashboard-stats', { headers });
    console.log('Compliance Stats Status:', complianceStatsRes.status);
    console.log('Compliance Stats Data:', await complianceStatsRes.json());
    console.log('---------------------------------------------------\n');

    console.log('All API Router Endpoint Tests Completed successfully!');

  } catch (err) {
    console.error('Test execution failed:', err);
  }
}

runTests();
