const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');
const crypto = require('crypto');

// GET /api/transfers/requests
router.get('/requests', authenticateToken, (req, res) => {
  try {
    let requests;
    const query = `
      SELECT tr.*, 
        i.name as item_name, i.item_code, i.serial_number, i.unit,
        fb.name as from_branch_name,
        tb.name as to_branch_name,
        fbl.name as from_block_name,
        tbl.name as to_block_name,
        u.username as requested_by_name
      FROM transfer_requests tr
      JOIN inventory_items i ON tr.item_id = i.id
      JOIN branches fb ON tr.from_branch_id = fb.id
      JOIN branches tb ON tr.to_branch_id = tb.id
      LEFT JOIN branch_blocks fbl ON tr.from_block_id = fbl.id
      LEFT JOIN branch_blocks tbl ON tr.to_block_id = tbl.id
      LEFT JOIN users u ON tr.requested_by = u.id
      ORDER BY tr.created_at DESC
    `;
    
    if (req.user.role === 'Admin' || req.user.role === 'admin') {
      requests = db.prepare(query).all();
    } else {
      // Staff see requests originating from or targeting their branch
      const staffQuery = query.replace('ORDER BY tr.created_at DESC', 'WHERE tr.from_branch_id = ? OR tr.to_branch_id = ? ORDER BY tr.created_at DESC');
      requests = db.prepare(staffQuery).all(req.user.branch_id, req.user.branch_id);
    }
    
    res.json(requests);
  } catch (err) {
    console.error('Fetch transfers error:', err);
    res.status(500).json({ error: 'Failed to fetch transfer requests' });
  }
});

// POST /api/transfers/requests/:id/approve
router.post('/requests/:id/approve', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const request = db.prepare('SELECT * FROM transfer_requests WHERE id = ?').get(id);
    
    if (!request) return res.status(404).json({ error: 'Transfer request not found' });
    if (request.status !== 'PENDING') return res.status(400).json({ error: 'Request is already ' + request.status });
    
    const item = db.prepare('SELECT * FROM inventory_items WHERE id = ? AND branch_id = ? AND deleted_at IS NULL').get(request.item_id, request.from_branch_id);
    if (!item || item.stock < request.quantity) {
      return res.status(400).json({ error: 'Insufficient stock in source branch to approve this transfer.' });
    }

    const now = new Date().toISOString();

    // --- Name resolution for party_name ---
    const isInternal = request.from_branch_id === request.to_branch_id;
    const fromBranch = db.prepare('SELECT name FROM branches WHERE id = ?').get(request.from_branch_id);
    const toBranch = db.prepare('SELECT name FROM branches WHERE id = ?').get(request.to_branch_id);
    const fromBlock = request.from_block_id ? db.prepare('SELECT name FROM branch_blocks WHERE id = ?').get(request.from_block_id) : null;
    const toBlock = request.to_block_id ? db.prepare('SELECT name FROM branch_blocks WHERE id = ?').get(request.to_block_id) : null;

    let outPartyName = '';
    let inPartyName = '';

    if (isInternal) {
      if (request.to_block_id && request.from_block_id) {
        outPartyName = `Transfer to Block ${toBlock ? toBlock.name : 'Unknown'}`;
        inPartyName = `Transfer from Block ${fromBlock ? fromBlock.name : 'Unknown'}`;
      } else if (request.to_block_id) {
        outPartyName = `Transfer to Block ${toBlock ? toBlock.name : 'Unknown'}`;
        inPartyName = `Transfer from Main Inventory`;
      } else if (request.from_block_id) {
        outPartyName = `Transfer to Main Inventory`;
        inPartyName = `Transfer from Block ${fromBlock ? fromBlock.name : 'Unknown'}`;
      } else {
        outPartyName = `Transfer to Same Branch`;
        inPartyName = `Transfer from Same Branch`;
      }
    } else {
      let toStr = `${toBranch ? toBranch.name : 'Unknown'}`;
      let fromStr = `${fromBranch ? fromBranch.name : 'Unknown'}`;
      if (request.to_block_id) toStr += ` (Block ${toBlock ? toBlock.name : 'Unknown'})`;
      if (request.from_block_id) fromStr += ` (Block ${fromBlock ? fromBlock.name : 'Unknown'})`;
      outPartyName = `Transfer to Branch ${toStr}`;
      inPartyName = `Transfer from Branch ${fromStr}`;
    }

    const transfer = db.transaction(() => {
      // Update status
      db.prepare("UPDATE transfer_requests SET status = 'APPROVED', updated_at = ? WHERE id = ?").run(now, id);

      // Deduct from source branch
      db.prepare('UPDATE inventory_items SET stock = stock - ? WHERE id = ? AND branch_id = ?')
        .run(request.quantity, request.item_id, request.from_branch_id);

      // Add to destination branch
      const destItem = db.prepare('SELECT * FROM inventory_items WHERE name = ? AND branch_id = ? AND deleted_at IS NULL').get(item.name, request.to_branch_id);
      let destItemId;
      if (destItem) {
        db.prepare('UPDATE inventory_items SET stock = stock + ? WHERE id = ? AND branch_id = ?')
          .run(request.quantity, destItem.id, request.to_branch_id);
        destItemId = destItem.id;
      } else {
        destItemId = crypto.randomUUID();
        db.prepare('INSERT INTO inventory_items (id, name, category, stock, unit, threshold, branch_id, created_at, unit_price, item_code, serial_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .run(destItemId, item.name, item.category, request.quantity, item.unit, item.threshold, request.to_branch_id, now, item.unit_price || 0, item.item_code || null, item.serial_number || null);
      }

      const refCode = `TRF-REQ-${Date.now()}`;

      // Log outward
      db.prepare(`INSERT INTO inventory_movements (id, item_id, movement_type, quantity, party_name, reference_code, from_block_id, to_block_id, to_branch_id, notes, branch_id, created_at, item_code, serial_number)
        VALUES (?, ?, 'OUT', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(crypto.randomUUID(), request.item_id, request.quantity, outPartyName,
          refCode, request.from_block_id || null, request.to_block_id || null,
          request.to_branch_id, request.notes || null, request.from_branch_id, now, item.item_code || null, item.serial_number || null);

      // Log inward
      db.prepare(`INSERT INTO inventory_movements (id, item_id, movement_type, quantity, party_name, reference_code, from_block_id, to_block_id, to_branch_id, notes, branch_id, created_at, item_code, serial_number)
        VALUES (?, ?, 'IN', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(crypto.randomUUID(), destItemId, request.quantity, inPartyName,
          refCode, request.from_block_id || null, request.to_block_id || null,
          request.from_branch_id, request.notes || null, request.to_branch_id, now, item.item_code || null, item.serial_number || null);
    });

    transfer();
    res.json({ success: true, message: 'Transfer request approved and stock transferred successfully.' });
  } catch (err) {
    console.error('Approve transfer error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/transfers/requests/:id/reject
router.post('/requests/:id/reject', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const request = db.prepare('SELECT * FROM transfer_requests WHERE id = ?').get(id);
    
    if (!request) return res.status(404).json({ error: 'Transfer request not found' });
    if (request.status !== 'PENDING') return res.status(400).json({ error: 'Request is already ' + request.status });
    
    db.prepare("UPDATE transfer_requests SET status = 'REJECTED', updated_at = ? WHERE id = ?").run(new Date().toISOString(), id);
    res.json({ success: true, message: 'Transfer request rejected successfully.' });
  } catch (err) {
    console.error('Reject transfer error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
