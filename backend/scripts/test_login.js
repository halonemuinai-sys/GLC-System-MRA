async function testLogin() {
  const url = 'http://localhost:5005/api/auth/login';
  const payload = {
    email: 'admin@mraretail.co.id',
    password: 'MraGlc2026!'
  };

  console.log(`Sending POST request to ${url}...`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log('Status Code:', response.status);
    console.log('Response Body:', JSON.stringify(data, null, 2));

    if (response.ok && data.token) {
      console.log('\n--- Login Test Succeeded! ---');
      console.log('Token:', data.token);
      
      // Let's test the /me endpoint with the token
      await testMe(data.token);
    } else {
      console.log('\n--- Login Test Failed! ---');
    }
  } catch (err) {
    console.error('Request failed:', err);
  }
}

async function testMe(token) {
  const url = 'http://localhost:5005/api/auth/me';
  console.log(`\nSending GET request to ${url}...`);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    console.log('Status Code:', response.status);
    console.log('User Profile:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('\n--- /me Test Succeeded! ---');
    } else {
      console.log('\n--- /me Test Failed! ---');
    }
  } catch (err) {
    console.error('Request failed:', err);
  }
}

testLogin();
