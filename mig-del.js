const db = require('better-sqlite3')('database.db');
db.exec(`CREATE TABLE IF NOT EXISTS deletion_requests (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL,
    requested_by TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviewed_by TEXT,
    reviewed_at DATETIME,
    FOREIGN KEY (item_id) REFERENCES inventory_items(id),
    FOREIGN KEY (requested_by) REFERENCES users(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id)
);`);
console.log('Table created!');
