const Database = require('better-sqlite3');
const path = require('path');
const dataDir = process.env.DATA_DIR || path.join(__dirname, '..');
const dbPath = path.join(dataDir, 'database.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrent read/write performance
db.pragma('journal_mode = WAL');

module.exports = db;
