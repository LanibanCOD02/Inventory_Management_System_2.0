require('dotenv').config();
const jwt = require('jsonwebtoken');
const db = require('./config/db');

const user = db.prepare('SELECT id, role, branch_id FROM users LIMIT 1').get();
if (!user) {
  console.error("No users found in database");
  process.exit(1);
}

const token = jwt.sign(
  { id: user.id, role: user.role, branch_id: user.branch_id },
  process.env.JWT_SECRET || 'supersecretkey',
  { expiresIn: '1h' }
);

async function test() {
  try {
    // 1. Inventory Summary
    let res = await fetch('http://localhost:3000/api/reports/inventory-summary?token=' + token);
    console.log('Inventory Summary:', res.status, res.headers.get('content-type'));

    // 2. Low Stock
    res = await fetch('http://localhost:3000/api/reports/low-stock?token=' + token);
    console.log('Low Stock:', res.status, res.headers.get('content-type'));

    // 3. Movements
    res = await fetch('http://localhost:3000/api/reports/movements?month=6&year=2026&token=' + token);
    console.log('Movements:', res.status, res.headers.get('content-type'));

    // 4. Backup
    res = await fetch('http://localhost:3000/api/reports/backup-zip?token=' + token);
    console.log('Backup:', res.status, res.headers.get('content-type'));
    if (res.status === 500) {
      console.log('Error:', await res.text());
    }
  } catch (err) {
    console.error('Error during fetch:', err);
  }
}
test();
