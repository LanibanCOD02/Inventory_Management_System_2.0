const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcrypt');
const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'database.db');
const db = new Database(dbPath);

// Enable SQLite optimizations for concurrent read/write performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

// -----------------------------------------------------------------------------
// SELF-INITIALIZING DEPLOYMENT LOGIC
// -----------------------------------------------------------------------------
function initializeDatabase() {
  const usersTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
  if (usersTableExists) {
    console.log('[DB] Existing database detected. Skipping initialization.');
    return;
  }

  console.log('[DB] Uninitialized database detected. Creating schema and seeding initial data...');

  try {
    const adminPasswordHash = bcrypt.hashSync('Admin@123', 10);
    const branchId = 'branch-main-uuid';
    const catId = 'cat-groceries-uuid';
    const adminId = 'admin-user-uuid';
    const now = new Date().toISOString();

    const initTransaction = db.transaction(() => {
      // 1. Create Schema
      db.exec(`
        CREATE TABLE branches (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          location TEXT,
          address TEXT,
          pincode TEXT,
          created_at TEXT,
          deleted_at TEXT
        );

        CREATE TABLE users (
          id TEXT PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL,
          created_at TEXT,
          branch_id TEXT,
          token_version INTEGER DEFAULT 1
        );

        CREATE TABLE inventory_items (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          category TEXT,
          stock INTEGER DEFAULT 0,
          unit TEXT NOT NULL,
          threshold INTEGER DEFAULT 0,
          product_photo_url TEXT,
          bill_image_url TEXT,
          invoice_pdf_url TEXT,
          created_at TEXT,
          deleted_at TEXT,
          unit_price REAL DEFAULT 0,
          default_supplier TEXT,
          program TEXT,
          branch_id TEXT NOT NULL,
          item_code TEXT,
          serial_number TEXT
        );

        CREATE TABLE inventory_movements (
          id TEXT PRIMARY KEY,
          reference_code TEXT,
          item_id TEXT NOT NULL,
          movement_type TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          party_name TEXT,
          created_by TEXT,
          created_at TEXT,
          voided INTEGER DEFAULT 0,
          voided_at TEXT,
          voided_by TEXT,
          branch_id TEXT NOT NULL,
          transfer_id TEXT,
          recipient_name TEXT,
          total_price REAL,
          item_code TEXT,
          serial_number TEXT,
          from_block_id TEXT,
          to_block_id TEXT,
          to_branch_id TEXT,
          notes TEXT
        );

        CREATE TABLE categories (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          created_at TEXT,
          deleted_at TEXT,
          branch_id TEXT
        );

        CREATE TABLE suppliers (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          created_at TEXT,
          deleted_at TEXT,
          branch_id TEXT
        );

        CREATE TABLE programs (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          created_at TEXT,
          deleted_at TEXT,
          branch_id TEXT
        );

        CREATE TABLE deletion_requests (
          id TEXT PRIMARY KEY,
          item_id TEXT NOT NULL,
          requested_by TEXT NOT NULL,
          branch_id TEXT NOT NULL,
          status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
          requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          reviewed_by TEXT,
          reviewed_at DATETIME,
          reason TEXT,
          reason_details TEXT,
          resale_price REAL,
          quantity INTEGER,
          block_id TEXT,
          FOREIGN KEY (item_id) REFERENCES inventory_items(id),
          FOREIGN KEY (requested_by) REFERENCES users(id),
          FOREIGN KEY (branch_id) REFERENCES branches(id)
        );

        CREATE TABLE branch_blocks (
          id TEXT PRIMARY KEY,
          branch_id TEXT NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          created_at TEXT NOT NULL,
          deleted_at TEXT,
          FOREIGN KEY (branch_id) REFERENCES branches(id)
        );

        CREATE TABLE price_history (
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

        CREATE TABLE transfer_requests (
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
          admin_note TEXT,
          FOREIGN KEY (item_id) REFERENCES inventory_items(id),
          FOREIGN KEY (from_branch_id) REFERENCES branches(id),
          FOREIGN KEY (to_branch_id) REFERENCES branches(id)
        );

        CREATE TABLE inventory_item_blocks (
          id TEXT PRIMARY KEY,
          item_id TEXT NOT NULL,
          block_id TEXT NOT NULL,
          stock INTEGER NOT NULL DEFAULT 0,
          UNIQUE(item_id, block_id),
          FOREIGN KEY (item_id) REFERENCES inventory_items(id),
          FOREIGN KEY (block_id) REFERENCES branch_blocks(id)
        );

        CREATE TABLE donations (
          id TEXT PRIMARY KEY,
          donor_name TEXT NOT NULL,
          phone TEXT,
          address TEXT,
          amount REAL NOT NULL,
          notes TEXT,
          branch_id TEXT NOT NULL,
          created_by TEXT,
          created_at TEXT NOT NULL,
          deleted_at TEXT,
          donation_type TEXT DEFAULT 'monetary',
          item_details TEXT,
          processed INTEGER DEFAULT 0,
          FOREIGN KEY (branch_id) REFERENCES branches(id)
        );
      `);

      // 2. Seed Default Branch
      db.prepare("INSERT INTO branches (id, name, created_at) VALUES (?, ?, ?)").run(
        branchId, 'Main Branch', now
      );

      // 3. Seed Default Category
      db.prepare("INSERT INTO categories (id, name, created_at) VALUES (?, ?, ?)").run(
        catId, 'Groceries', now
      );

      // 4. Seed Default Administrator
      db.prepare("INSERT INTO users (id, username, password_hash, role, created_at, branch_id) VALUES (?, ?, ?, ?, ?, ?)").run(
        adminId, 'admin@msctrust.org', adminPasswordHash, 'admin', now, branchId
      );
    });

    initTransaction();
    console.log('[DB] Database successfully initialized with schema and default administrator.');
  } catch (error) {
    console.error('[FATAL] Database initialization failed. Rolling back everything.');
    console.error(error);
    process.exit(1);
  }
}

// Run initialization
initializeDatabase();

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
