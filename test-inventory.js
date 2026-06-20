
async function test() {
  try {
    // 1. Login
    const loginRes = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin@msctrust.org', password: 'Admin@123' })
    });
    
    if (!loginRes.ok) {
      console.error('Login failed:', loginRes.status, await loginRes.text());
      return;
    }
    
    const { token } = await loginRes.json();
    console.log('Login successful. Token acquired.');

    // 2. Add inventory item
    const invRes = await fetch('http://localhost:3000/api/inventory', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: 'Test Item ' + Date.now(),
        category: 'Test Category',
        stock: 5,
        unit: 'pcs',
        threshold: 2
      })
    });

    console.log('Inventory POST status:', invRes.status);
    console.log('Inventory POST response:', await invRes.text());

  } catch (err) {
    console.error('Test error:', err);
  }
}

test();
