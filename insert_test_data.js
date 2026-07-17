const sqlite = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const db = new sqlite(path.join(__dirname, 'database.db'));
const itemId = 'f1ae4118-bedd-478d-b5b7-071e47581256'; // first aid kit

function uuid() { return crypto.randomUUID(); }

try {
  const branchId = '78401b7c-7811-44b8-aa7c-5d4b8fbec812';

  // OUT movement (Issued)
  db.prepare(`
    INSERT INTO inventory_movements (id, item_id, branch_id, movement_type, quantity, recipient_name, created_at, reference_code)
    VALUES (?, ?, ?, 'OUT', ?, ?, ?, ?)
  `).run(uuid(), itemId, branchId, 3, 'Health Camp A', new Date().toISOString(), 'OUT-1001');

  // IN movement (Transfer)
  db.prepare(`
    INSERT INTO inventory_movements (id, item_id, branch_id, movement_type, quantity, party_name, created_at, reference_code)
    VALUES (?, ?, ?, 'IN', ?, ?, ?, ?)
  `).run(uuid(), itemId, branchId, 5, 'Main Branch', new Date().toISOString(), 'TRF-1001');

  // Voided IN movement
  db.prepare(`
    INSERT INTO inventory_movements (id, item_id, branch_id, movement_type, quantity, party_name, created_at, reference_code, voided)
    VALUES (?, ?, ?, 'IN', ?, ?, ?, ?, 1)
  `).run(uuid(), itemId, branchId, 2, 'Supplier X', new Date().toISOString(), 'VOID-1002');

  // Update item stock
  db.prepare(`UPDATE inventory_items SET stock = stock - 3 + 5 WHERE id = ?`).run(itemId);

  console.log("Test data inserted successfully.");
} catch(err) {
  console.error("Error inserting test data:", err);
}
