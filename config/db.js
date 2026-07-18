const Database = require('better-sqlite3');
const path = require('path');
const dataDir = process.env.DATA_DIR || path.join(__dirname, '..');
const dbPath = path.join(dataDir, 'database.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrent read/write performance
db.pragma('journal_mode = WAL');

// Safe migrations
try { db.exec("ALTER TABLE inventory_movements ADD COLUMN transfer_id TEXT"); } catch (e) { /* Ignore if exists */ }
try { db.exec("ALTER TABLE inventory_movements ADD COLUMN recipient_name TEXT"); } catch (e) { /* Ignore if exists */ }
try { db.exec("ALTER TABLE branches ADD COLUMN deleted_at TEXT"); } catch (e) { /* Ignore if exists */ }
try { db.exec("ALTER TABLE deletion_requests ADD COLUMN reason TEXT"); } catch (e) { /* Ignore if exists */ }
try { db.exec("ALTER TABLE deletion_requests ADD COLUMN reason_details TEXT"); } catch (e) { /* Ignore if exists */ }
try { db.exec("ALTER TABLE deletion_requests ADD COLUMN resale_price REAL"); } catch (e) { /* Ignore if exists */ }
try { db.exec("ALTER TABLE deletion_requests ADD COLUMN quantity INTEGER"); } catch (e) { /* Ignore if exists */ }
try { db.exec("ALTER TABLE deletion_requests ADD COLUMN block_id TEXT"); } catch (e) { /* Ignore if exists */ }

try { db.exec("ALTER TABLE transfer_requests ADD COLUMN admin_note TEXT"); } catch (e) { /* Ignore if exists */ }

try { db.exec("ALTER TABLE inventory_movements ADD COLUMN total_price REAL"); } catch(e) { /* Ignore if exists */ }

try { db.exec("ALTER TABLE inventory_items ADD COLUMN item_code TEXT"); } catch(e) {}
try { db.exec("ALTER TABLE inventory_items ADD COLUMN serial_number TEXT"); } catch(e) {}
try { db.exec("ALTER TABLE inventory_movements ADD COLUMN item_code TEXT"); } catch(e) {}
try { db.exec("ALTER TABLE inventory_movements ADD COLUMN serial_number TEXT"); } catch(e) {}
try { db.exec("ALTER TABLE users ADD COLUMN token_version INTEGER DEFAULT 1"); } catch(e) {}

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS branch_blocks (
      id TEXT PRIMARY KEY,
      branch_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (branch_id) REFERENCES branches(id)
    )
  `);
} catch(e) {}

try { db.exec("ALTER TABLE branch_blocks ADD COLUMN deleted_at TEXT"); } catch(e) {}

try { db.exec("ALTER TABLE inventory_movements ADD COLUMN from_block_id TEXT"); } catch(e) {}
try { db.exec("ALTER TABLE inventory_movements ADD COLUMN to_block_id TEXT"); } catch(e) {}
try { db.exec("ALTER TABLE inventory_movements ADD COLUMN to_branch_id TEXT"); } catch(e) {}
try { db.exec("ALTER TABLE inventory_movements ADD COLUMN notes TEXT"); } catch(e) {}


try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS inventory_item_blocks (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      block_id TEXT NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      UNIQUE(item_id, block_id),
      FOREIGN KEY (item_id) REFERENCES inventory_items(id),
      FOREIGN KEY (block_id) REFERENCES branch_blocks(id)
    );
  `);
} catch(e) {}
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS price_history (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      branch_id TEXT,
      old_unit_price REAL,
      new_unit_price REAL NOT NULL,
      quantity_added INTEGER NOT NULL,
      total_price_paid REAL NOT NULL,
      changed_by TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (item_id) REFERENCES inventory_items(id)
    );
  `);
} catch (e) {
  console.error("Failed to create price_history table:", e);
}

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS transfer_requests (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      from_branch_id TEXT NOT NULL,
      to_branch_id TEXT NOT NULL,
      from_block_id TEXT,
      to_block_id TEXT,
      quantity INTEGER NOT NULL,
      notes TEXT,
      requested_by TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      created_at TEXT NOT NULL,
      updated_at TEXT,
      FOREIGN KEY (item_id) REFERENCES inventory_items(id),
      FOREIGN KEY (from_branch_id) REFERENCES branches(id),
      FOREIGN KEY (to_branch_id) REFERENCES branches(id)
    );
  `);
} catch (e) {
  console.error("Failed to create transfer_requests table:", e);
}
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS donations (
      id TEXT PRIMARY KEY,
      donor_name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      amount REAL,
      notes TEXT,
      branch_id TEXT NOT NULL,
      created_by TEXT,
      created_at TEXT NOT NULL,
      deleted_at TEXT,
      FOREIGN KEY (branch_id) REFERENCES branches(id)
    );
  `);
} catch (e) {}

try { db.exec("ALTER TABLE donations ADD COLUMN donation_type TEXT DEFAULT 'monetary'"); } catch(e) {}
try { db.exec("ALTER TABLE donations ADD COLUMN item_details TEXT"); } catch(e) {}
try { db.exec("ALTER TABLE donations ADD COLUMN processed INTEGER DEFAULT 0"); } catch(e) {}

// Seed required default categories if they don't exist
try {
  const existingCategory = db.prepare("SELECT id FROM categories WHERE name = 'Groceries'").get();
  if (!existingCategory) {
    db.prepare("INSERT INTO categories (id, name, created_at) VALUES (?, ?, ?)").run(
      'cat-groceries-uuid', 'Groceries', new Date().toISOString()
    );
  }
} catch (e) {
  console.error("Failed to seed default Groceries category:", e);
}

module.exports = db;
