const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');
const crypto = require('crypto');

function generateUUID() {
  return crypto.randomUUID();
}

// GET /api/branches
router.get('/', authenticateToken, async (req, res) => {
  try {
    const branches = db.prepare('SELECT id, name, location, address, pincode FROM branches WHERE deleted_at IS NULL ORDER BY name ASC').all();
    res.json(branches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/branches (Admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, location, address, pincode } = req.body;
    if (!name) return res.status(400).json({ error: 'Branch name is required' });

    const id = generateUUID();
    db.prepare(`
      INSERT INTO branches (id, name, location, address, pincode, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name, location, address, pincode, new Date().toISOString());

    const newBranch = db.prepare('SELECT * FROM branches WHERE id = ?').get(id);
    res.json(newBranch);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// POST /api/branches/transfer — transfer stock between blocks/branches
router.post('/transfer', authenticateToken, (req, res) => {
  try {
    const { item_id, quantity, from_branch_id, from_block_id, to_branch_id, to_block_id, notes } = req.body;
    if (!item_id || !quantity || !from_branch_id || !to_branch_id) {
      return res.status(400).json({ error: 'item_id, quantity, from_branch_id and to_branch_id are required' });
    }
    
    const isAdmin = req.user.role === 'Admin' || req.user.role === 'admin';
    if (!isAdmin && req.user.branch_id !== from_branch_id) {
      return res.status(403).json({ error: 'You can only transfer stock from your own branch' });
    }

    if (from_branch_id === to_branch_id && from_block_id && to_block_id && from_block_id === to_block_id) {
      return res.status(400).json({ error: 'Cannot transfer stock to the same block. Please select a different destination block.' });
    }

    // Check sufficient stock at source
    const item = db.prepare('SELECT * FROM inventory_items WHERE id = ? AND branch_id = ? AND deleted_at IS NULL').get(item_id, from_branch_id);
    if (!item) return res.status(404).json({ error: 'Item not found in source branch' });
    if (item.stock < quantity) return res.status(400).json({ error: `Insufficient stock. Available: ${item.stock}` });

    const isInternal = from_branch_id === to_branch_id;
    const crypto = require('crypto');
    const now = new Date().toISOString();

    if (!isInternal && !isAdmin) {
      const reqId = crypto.randomUUID();
      db.prepare(`INSERT INTO transfer_requests (id, item_id, from_branch_id, to_branch_id, from_block_id, to_block_id, quantity, notes, requested_by, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)`)
        .run(reqId, item_id, from_branch_id, to_branch_id, from_block_id || null, to_block_id || null, quantity, notes || null, req.user.id, now);
      return res.json({ success: true, message: 'Transfer request submitted and is pending admin approval.' });
    }

    // Run as a transaction
    const transfer = db.transaction(() => {


      // Deduct from source branch
      db.prepare('UPDATE inventory_items SET stock = stock - ? WHERE id = ? AND branch_id = ?')
        .run(quantity, item_id, from_branch_id);

      // Add to destination branch — find matching item by name
      const destItem = db.prepare('SELECT * FROM inventory_items WHERE name = ? AND branch_id = ? AND deleted_at IS NULL').get(item.name, to_branch_id);
      if (destItem) {
        db.prepare('UPDATE inventory_items SET stock = stock + ? WHERE id = ? AND branch_id = ?')
          .run(quantity, destItem.id, to_branch_id);
      } else {
        // Create the item in destination branch if it doesn't exist
        const newId = crypto.randomUUID();
        db.prepare('INSERT INTO inventory_items (id, name, category, stock, unit, threshold, branch_id, created_at, unit_price, item_code, serial_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .run(newId, item.name, item.category, quantity, item.unit, item.threshold, to_branch_id, now, item.unit_price || 0, item.item_code || null, item.serial_number || null);
      }

      // Log outward movement at source
      db.prepare(`INSERT INTO inventory_movements (id, item_id, movement_type, quantity, party_name, reference_code, from_block_id, to_block_id, to_branch_id, notes, branch_id, created_at)
        VALUES (?, ?, 'OUT', ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(crypto.randomUUID(), item_id, quantity, `Transfer to ${to_branch_id}`,
          `TRF-${Date.now()}`, from_block_id || null, to_block_id || null,
          to_branch_id, notes || null, from_branch_id, now);

      // Log inward movement at destination
      const destItemFinal = db.prepare('SELECT * FROM inventory_items WHERE name = ? AND branch_id = ? AND deleted_at IS NULL').get(item.name, to_branch_id);
      db.prepare(`INSERT INTO inventory_movements (id, item_id, movement_type, quantity, party_name, reference_code, from_block_id, to_block_id, to_branch_id, notes, branch_id, created_at)
        VALUES (?, ?, 'IN', ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(crypto.randomUUID(), destItemFinal.id, quantity, `Transfer from ${from_branch_id}`,
          `TRF-${Date.now()}`, from_block_id || null, to_block_id || null,
          from_branch_id, notes || null, to_branch_id, now);
    });
    transfer();
    res.json({ success: true, message: 'Stock transferred successfully' });
  } catch(err) {
    console.error('Transfer error:', err);
    res.status(500).json({ error: err.message });
  }
});


// GET /api/branches/:id/blocks — list all blocks for a branch
router.get('/:id/blocks', authenticateToken, (req, res) => {
  try {
    const blocks = db.prepare('SELECT * FROM branch_blocks WHERE branch_id = ? AND deleted_at IS NULL ORDER BY name').all(req.params.id);
    res.json(blocks);
  } catch(err) {
    console.error('Fetch blocks error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/branches/:id/blocks — add a new block to a branch
router.post('/:id/blocks', authenticateToken, (req, res) => {
  try {
    if (req.user.role !== 'Admin' && req.user.role !== 'admin' && req.user.branch_id !== req.params.id) {
      return res.status(403).json({ error: 'Access denied: You can only add blocks to your own branch.' });
    }
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Block name is required' });
    const id = crypto.randomUUID();
    const created_at = new Date().toISOString();
    db.prepare('INSERT INTO branch_blocks (id, branch_id, name, description, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(id, req.params.id, name, description || null, created_at);
    res.status(201).json({ id, branch_id: req.params.id, name, description, created_at });
  } catch(err) {
    console.error('Create block error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/branches/:branchId/blocks/:id — edit a block
router.put('/:branchId/blocks/:id', authenticateToken, (req, res) => {
  try {
    if (req.user.role !== 'Admin' && req.user.role !== 'admin' && req.user.branch_id !== req.params.branchId) {
      return res.status(403).json({ error: 'Access denied: You can only edit blocks in your own branch.' });
    }
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Block name is required' });
    
    const info = db.prepare('UPDATE branch_blocks SET name = ?, description = ? WHERE id = ? AND branch_id = ?').run(name, description, req.params.id, req.params.branchId);
    
    if (info.changes === 0) {
      return res.status(404).json({ error: 'Block not found or does not belong to this branch' });
    }
    res.json({ success: true, message: 'Block updated successfully' });
  } catch(err) {
    console.error('Edit block error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/branches/:branchId/blocks/:id — soft delete a block
router.delete('/:branchId/blocks/:id', authenticateToken, (req, res) => {
  try {
    if (req.user.role !== 'Admin' && req.user.role !== 'admin' && req.user.branch_id !== req.params.branchId) {
      return res.status(403).json({ error: 'Access denied: You can only delete blocks in your own branch.' });
    }
    
    const now = new Date().toISOString();
    const info = db.prepare('UPDATE branch_blocks SET deleted_at = ? WHERE id = ? AND branch_id = ?').run(now, req.params.id, req.params.branchId);
    
    if (info.changes === 0) {
      return res.status(404).json({ error: 'Block not found or does not belong to this branch' });
    }
    res.json({ success: true, message: 'Block deleted successfully' });
  } catch(err) {
    console.error('Delete block error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/branches/:id (Admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location, address, pincode } = req.body;
    if (!name) return res.status(400).json({ error: 'Branch name is required' });

    const existing = db.prepare('SELECT * FROM branches WHERE id = ? AND deleted_at IS NULL').get(id);
    if (!existing) return res.status(404).json({ error: 'Branch not found' });

    db.prepare(`
      UPDATE branches 
      SET name = ?, location = ?, address = ?, pincode = ?
      WHERE id = ?
    `).run(name, location, address, pincode, id);

    const updatedBranch = db.prepare('SELECT * FROM branches WHERE id = ?').get(id);
    res.json(updatedBranch);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/branches/:id/deactivate (Admin only)
router.post('/:id/deactivate', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM branches WHERE id = ? AND deleted_at IS NULL').get(id);
    if (!existing) return res.status(404).json({ error: 'Branch not found' });

    db.prepare('UPDATE branches SET deleted_at = ? WHERE id = ?').run(new Date().toISOString(), id);
    res.json({ success: true, message: 'Branch deactivated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
