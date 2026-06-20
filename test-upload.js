async function test() {
  try {
    const loginRes = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin@msctrust.org', password: 'Admin@123' })
    });
    
    const { token } = await loginRes.json();

    const formData = new FormData();
    formData.append('productPhoto', new Blob(['test'], { type: 'text/plain' }), 'test.txt');

    const invRes = await fetch('http://localhost:3000/api/uploads', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    console.log('Upload POST status:', invRes.status);
    console.log('Upload POST response:', await invRes.text());

  } catch (err) {
    console.error('Test error:', err);
  }
}

test();
