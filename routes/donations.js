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
    const { donor_name, phone, address, amount, notes, branch_id, donation_type, item_details } = req.body;
    
    // Type validation
    const type = donation_type === 'in-kind' ? 'in-kind' : 'monetary';
    
    if (type === 'monetary') {
      if (amount === undefined || amount === null || isNaN(amount) || amount <= 0) {
        return res.status(400).json({ error: 'A valid Amount is required for Monetary Funds' });
      }
    } else {
      if (!item_details || !item_details.trim()) {
        return res.status(400).json({ error: 'Item Details are required for In-Kind Goods' });
      }
    }

    const resolvedBranchId = getBranchId(req.user, branch_id);
    
    if (!resolvedBranchId) {
      return res.status(400).json({ error: 'Branch assignment is required.' });
    }

    const id = generateUUID();
    const created_at = new Date().toISOString();
    
    // Donor name is optional for in-kind, but we need a default if empty
    const finalDonorName = donor_name ? donor_name.trim() : (type === 'in-kind' ? 'Anonymous Donor' : 'Anonymous');

    db.prepare(`
      INSERT INTO donations (id, donor_name, phone, address, amount, notes, branch_id, created_by, created_at, donation_type, item_details, processed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).run(id, finalDonorName, phone || null, address || null, amount ? parseFloat(amount) : null, notes || null, resolvedBranchId, req.user.id, created_at, type, item_details || null);

    const row = db.prepare(`SELECT * FROM donations WHERE id = ?`).get(id);
    res.status(201).json(row);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT process donation
router.put('/:id/process', authenticateToken, async (req, res) => {
  try {
    const { condition, params } = getBranchFilterSql(req.user, null, true);
    // Security check: ensure donation belongs to user's branch
    const existing = db.prepare(`SELECT * FROM donations WHERE id = ? AND deleted_at IS NULL AND ${condition.replace(/branch_id/g, 'branch_id')}`).get(req.params.id, ...params);
    
    if (!existing) {
      return res.status(404).json({ error: 'Donation not found or unauthorized' });
    }

    db.prepare(`UPDATE donations SET processed = 1 WHERE id = ?`).run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
