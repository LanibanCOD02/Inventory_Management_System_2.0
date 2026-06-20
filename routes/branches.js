const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken } = require('../middlewares/auth');

// GET /api/branches
router.get('/', authenticateToken, async (req, res) => {
  try {
    const branches = db.prepare('SELECT id, name FROM branches ORDER BY name ASC').all();
    res.json(branches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
