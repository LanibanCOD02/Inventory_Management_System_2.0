const supabase = require('./config/supabaseClient');
const db = require('./config/db');
require('dotenv').config();

async function migrateDatabase() {
  console.log('Starting migration...');

  // 1. Create schemas
  console.log('Creating tables...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS branches (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT,
      address TEXT,
      pincode TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TEXT,
      branch_id TEXT
    );

    CREATE TABLE IF NOT EXISTS inventory_items (
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
      branch_id TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inventory_movements (
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
      branch_id TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT,
      deleted_at TEXT,
      branch_id TEXT
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT,
      deleted_at TEXT,
      branch_id TEXT
    );

    CREATE TABLE IF NOT EXISTS programs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT,
      deleted_at TEXT,
      branch_id TEXT
    );
  `);

  const tables = ['branches', 'users', 'inventory_items', 'inventory_movements', 'categories', 'suppliers', 'programs'];

  for (const table of tables) {
    console.log('Migrating table: ' + table + '...');
    const { data, error } = await supabase.from(table).select('*');
    
    if (error) {
      console.error('Failed to fetch ' + table + ':', error);
      continue;
    }

    if (data.length === 0) {
      console.log('  No records to migrate for ' + table + '.');
      continue;
    }

    const columns = Object.keys(data[0]);
    const placeholders = columns.map(() => '?').join(', ');
    const insertStmt = db.prepare('INSERT OR REPLACE INTO ' + table + ' (' + columns.join(', ') + ') VALUES (' + placeholders + ')');

    const insertMany = db.transaction((rows) => {
      for (const row of rows) {
        // Convert booleans to 1/0 for SQLite
        const values = columns.map(col => {
          let val = row[col];
          if (typeof val === 'boolean') return val ? 1 : 0;
          return val;
        });
        insertStmt.run(values);
      }
    });

    insertMany(data);
    console.log('  Migrated ' + data.length + ' records for ' + table + '.');
  }

  console.log('Migration completed.');
}

migrateDatabase().catch(console.error);
