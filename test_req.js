(async () => {
  // Login to get token
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'testadmin', password: 'testpass' })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;

  // Make an outward movement
  const moveRes = await fetch('http://localhost:3000/api/movements', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({
      inventory_id: 'f1ae4118-bedd-478d-b5b7-071e47581256',
      type: 'OUTWARD',
      quantity: 1,
      party_name: 'some-party',
      branch_id: 1
    })
  });
  
  console.log('Status:', moveRes.status);
  const data = await moveRes.json();
  console.log('Response:', data);
})();
