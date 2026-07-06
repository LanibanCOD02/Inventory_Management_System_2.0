const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken } = require('../middlewares/auth');
const { getBranchFilterSql, getBranchId } = require('../config/branchFilter');
const crypto = require('crypto');

function generateUUID() {
  return crypto.randomUUID();
}

// GET all donations (excluding soft-deleted)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { condition, params } = getBranchFilterSql(req.user, req.query.branch_id, true);
    // Join with branches and users for friendly names
    const rows = db.prepare(`
      SELECT d.*, b.name as branch_name, u.username as created_by_name 
      FROM donations d
      LEFT JOIN branches b ON d.branch_id = b.id
      LEFT JOIN users u ON d.created_by = u.id
      WHERE d.deleted_at IS NULL AND ${condition.replace(/branch_id/g, 'd.branch_id')}
      ORDER BY d.created_at DESC
    `).all(...params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST new donation
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { donor_name, phone, address, amount, notes, branch_id } = req.body;
    
    if (!donor_name) return res.status(400).json({ error: 'Donor Name is required' });
    if (amount === undefined || amount === null || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'A valid Amount is required' });
    }

    const resolvedBranchId = getBranchId(req.user, branch_id);
    
    if (!resolvedBranchId) {
      return res.status(400).json({ error: 'Branch assignment is required.' });
    }

    const id = generateUUID();
    const created_at = new Date().toISOString();

    db.prepare(`
      INSERT INTO donations (id, donor_name, phone, address, amount, notes, branch_id, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, donor_name, phone || null, address || null, parseFloat(amount), notes || null, resolvedBranchId, req.user.id, created_at);

    const row = db.prepare(`SELECT * FROM donations WHERE id = ?`).get(id);
    res.status(201).json(row);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
