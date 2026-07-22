const path = require('path');

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

  // Fallback DATA_DIR (Optional)
  if (!process.env.DATA_DIR) {
    process.env.DATA_DIR = path.join(__dirname, '..', 'data');
  }
}

module.exports = validateEnv;
