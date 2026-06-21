async function testLogin() {
  const url = 'http://localhost:5005/api/auth/login';
  const payload = {
    email: 'aris@mraretail.co.id',
    password: 'Kmzway87aa!!'
  };

  console.log(`Sending POST request to ${url} with email: ${payload.email}...`);

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
      console.log('\n--- Login Succeeded! ---');
    } else {
      console.log('\n--- Login Failed! ---');
    }
  } catch (err) {
    console.error('Request failed:', err);
  }
}

testLogin();
