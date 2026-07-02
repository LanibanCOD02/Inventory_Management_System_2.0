const bcrypt = require('bcrypt');
const db = require('better-sqlite3')('database.db');

(async () => {
  const hash = await bcrypt.hash('testpass', 10);
  
  // Fix testadmin
  const adminRes = db.prepare('UPDATE users SET password_hash = ? WHERE username = ?').run(hash, 'testadmin');
  console.log('Updated testadmin:', adminRes.changes);
  
  // Fix teststaff
  const staffRes = db.prepare('UPDATE users SET password_hash = ? WHERE username = ?').run(hash, 'teststaff');
  console.log('Updated teststaff:', staffRes.changes);
})();
