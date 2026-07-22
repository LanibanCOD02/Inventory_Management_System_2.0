const path = require('path');
const fs = require('fs');

function getWritableDataDir() {
  let targetDir = process.env.DATA_DIR;

  if (targetDir) {
    // Check if the provided DATA_DIR is writable
    try {
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      fs.accessSync(targetDir, fs.constants.W_OK);
      return targetDir;
    } catch (e) {
      console.warn(`[WARN] DATA_DIR '${targetDir}' is not writable or cannot be created. Falling back to local workspace data directory.`);
    }
  }

  // Fallback to local project directory
  const localDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }
  return localDir;
}

function validateEnv() {
  // Validate JWT_SECRET (Required)
  if (!process.env.JWT_SECRET) {
    console.error('[FATAL] Missing required environment variable: JWT_SECRET');
    console.error('[FATAL] The server cannot start without a JWT_SECRET for security reasons.');
    process.exit(1);
  }

  // Fallback PORT (Optional)
  if (!process.env.PORT) {
    process.env.PORT = '3000';
  }

  // Resolve and force DATA_DIR to a verified writable path
  process.env.DATA_DIR = getWritableDataDir();
}

module.exports = validateEnv;
