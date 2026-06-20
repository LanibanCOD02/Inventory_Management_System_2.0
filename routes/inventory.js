const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');
const { getBranchFilterSql, getBranchId } = require('../config/branchFilter');
const crypto = require('crypto');

function generateUUID() {
  return crypto.randomUUID();
}

// Get all inventory items
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const { condition, params } = getBranchFilterSql(req.user, req.query.branch_id);
    
    const items = db.prepare(`
      SELECT id, name, category, stock, unit, threshold, product_photo_url, created_at, default_supplier, program 
      FROM inventory_items 
      WHERE deleted_at IS NULL AND ${condition} 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/inventory/alerts
router.get('/alerts', authenticateToken, async (req, res) => {
  try {
    const { condition, params } = getBranchFilterSql(req.user, req.query.branch_id);
    
    const data = db.prepare(`
      SELECT id, name, stock, unit, threshold, category 
      FROM inventory_items 
      WHERE deleted_at IS NULL AND ${condition} 
      ORDER BY stock ASC
    `).all(...params);
    
    // Filter items where stock is less than or equal to threshold
    const alerts = data
      .filter(item => Number(item.stock) <= Number(item.threshold))
      .map(item => ({
        ...item,
        criticality: Number(item.stock) === 0 ? 'critical' : 'low'
      }));
      
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add new inventory item (Admin Only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, category, stock, unit, threshold, unit_price, product_photo_url, bill_image_url, invoice_pdf_url, branch_id, default_supplier } = req.body;

    const resolvedBranchId = getBranchId(req.user, branch_id);

    // Manual uniqueness check per branch
    let existQuerySql = `SELECT id, deleted_at FROM inventory_items WHERE name = ?`;
    let existParams = [name];
    if (resolvedBranchId) {
      existQuerySql += ` AND branch_id = ?`;
      existParams.push(resolvedBranchId);
    } else {
      existQuerySql += ` AND branch_id IS NULL`;
    }
    
    const existing = db.prepare(existQuerySql).get(...existParams);
    
    let itemId;
    let itemStock = Number(stock) || 0;
    let itemUnitPrice = Number(unit_price) || 0;

    if (existing) {
      if (existing.deleted_at) {
        // It was deleted. Restore and update it.
        itemId = existing.id;
        db.prepare(`
          UPDATE inventory_items 
          SET category = ?, stock = ?, unit = ?, threshold = ?, unit_price = ?, product_photo_url = ?, bill_image_url = ?, invoice_pdf_url = ?, deleted_at = NULL 
          WHERE id = ?
        `).run(category, itemStock, unit, Number(threshold) || 10, itemUnitPrice, product_photo_url, bill_image_url, invoice_pdf_url, itemId);
      } else {
        return res.status(400).json({ error: 'An item with this exact name already exists in active inventory.' });
      }
    } else {
      // Insert new
      itemId = generateUUID();
      db.prepare(`
        INSERT INTO inventory_items (id, name, category, stock, unit, threshold, unit_price, product_photo_url, bill_image_url, invoice_pdf_url, branch_id, default_supplier, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(itemId, name, category, itemStock, unit, Number(threshold) || 10, itemUnitPrice, product_photo_url, bill_image_url, invoice_pdf_url, resolvedBranchId || null, default_supplier || null, new Date().toISOString());
    }

    const insertedItem = db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(itemId);

    // If initial stock > 0, auto-create an INWARD movement
    if (insertedItem.stock > 0) {
      const refCode = `IN-${Math.floor(Math.random() * 9000) + 1000}`;
      let partyName = 'Initial Stock Entry';
      
      if (default_supplier) {
        // Check if default_supplier is a valid UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(default_supplier)) {
          const supplier = db.prepare('SELECT name FROM suppliers WHERE id = ?').get(default_supplier);
          if (supplier) partyName = supplier.name;
        } else {
          partyName = default_supplier;
        }
      }

      db.prepare(`
        INSERT INTO inventory_movements (id, reference_code, item_id, movement_type, quantity, party_name, created_by, branch_id, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(generateUUID(), refCode, insertedItem.id, 'IN', insertedItem.stock, partyName, req.user.id, resolvedBranchId || null, new Date().toISOString());
    }

    res.status(201).json(insertedItem);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.message.includes('UNIQUE')) {
       return res.status(400).json({ error: 'An item with this exact name already exists in active inventory.' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Get movements
router.get('/movements', authenticateToken, async (req, res) => {
  try {
    const { type } = req.query; // 'IN' or 'OUT'
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    const { condition, params } = getBranchFilterSql(req.user, req.query.branch_id);
    
    let typeCondition = '';
    if (type) {
      typeCondition = ' AND m.movement_type = ?';
      params.push(type);
    }
    
    // Total count
    const countQuery = db.prepare(`SELECT COUNT(*) as total FROM inventory_movements m WHERE ${condition.replace(/branch_id/g, 'm.branch_id')} ${typeCondition}`).get(...params);
    const count = countQuery.total;

    // Data
    const data = db.prepare(`
      SELECT m.*, i.name as inventory_items_name, i.unit as inventory_items_unit
      FROM inventory_movements m
      LEFT JOIN inventory_items i ON m.item_id = i.id
      WHERE ${condition.replace(/branch_id/g, 'm.branch_id')} ${typeCondition}
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    // Map data to match old format
    const mappedData = data.map(row => {
      const { inventory_items_name, inventory_items_unit, ...movementData } = row;
      return {
        ...movementData,
        inventory_items: {
          name: inventory_items_name,
          unit: inventory_items_unit
        }
      };
    });

    res.json({
      data: mappedData,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific inventory item by ID (Full data including document URLs)
router.get('/:id', authenticateToken, async (req, res, next) => {
  // Fallback just in case
  if (req.params.id === 'movements') return next(); 
  
  try {
    const { id } = req.params;
    const item = db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(id);

    if (!item) throw new Error('Item not found');
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add movement (Inward/Outward)
router.post('/:id/movement', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { movement_type, quantity, party_name } = req.body;

    const qty = Number(quantity);
    if (!qty || qty <= 0) return res.status(400).json({ error: 'Quantity must be positive' });
    if (!party_name) return res.status(400).json({ error: 'Party name is required' });

    // Verify item exists
    const item = db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(id);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    if (movement_type === 'OUT' && item.stock < qty) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    // Insert movement
    const refCode = `${movement_type}-${Math.floor(Math.random() * 9000) + 1000}`;
    const moveId = generateUUID();
    db.prepare(`
      INSERT INTO inventory_movements (id, reference_code, item_id, movement_type, quantity, party_name, created_by, branch_id, created_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(moveId, refCode, id, movement_type, qty, party_name, req.user.id, item.branch_id, new Date().toISOString());

    const movement = db.prepare('SELECT * FROM inventory_movements WHERE id = ?').get(moveId);

    // Update stock
    const newStock = movement_type === 'IN' ? item.stock + qty : item.stock - qty;
    db.prepare('UPDATE inventory_items SET stock = ? WHERE id = ?').run(newStock, id);

    res.status(201).json(movement);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update inventory item (Admin Only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, unit, threshold, unit_price, product_photo_url, bill_image_url, invoice_pdf_url, default_supplier, program, branch_id } = req.body;

    const updates = [];
    const params = [];

    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (category !== undefined) { updates.push('category = ?'); params.push(category); }
    if (unit !== undefined) { updates.push('unit = ?'); params.push(unit); }
    if (threshold !== undefined) { updates.push('threshold = ?'); params.push(Number(threshold)); }
    if (unit_price !== undefined) { updates.push('unit_price = ?'); params.push(Number(unit_price)); }
    if (product_photo_url !== undefined) { updates.push('product_photo_url = ?'); params.push(product_photo_url); }
    if (bill_image_url !== undefined) { updates.push('bill_image_url = ?'); params.push(bill_image_url); }
    if (invoice_pdf_url !== undefined) { updates.push('invoice_pdf_url = ?'); params.push(invoice_pdf_url); }
    if (default_supplier !== undefined) { updates.push('default_supplier = ?'); params.push(default_supplier); }
    if (program !== undefined) { updates.push('program = ?'); params.push(program); }
    if (branch_id !== undefined) { updates.push('branch_id = ?'); params.push(branch_id); }

    if (updates.length > 0) {
      params.push(id);
      db.prepare(`UPDATE inventory_items SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    const updatedItem = db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(id);
    res.json(updatedItem);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'An item with this exact name already exists in this branch.' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Soft-delete inventory item (Admin Only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('UPDATE inventory_items SET deleted_at = ? WHERE id = ?').run(new Date().toISOString(), id);
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Deletion Requests (Staff/Admin) ────────────────

// 1. Get all deletion requests
router.get('/deletion-requests/all', authenticateToken, async (req, res) => {
  try {
    const { condition, params } = getBranchFilterSql(req.user, req.query.branch_id);
    
    // Admin sees all based on branch filter, Staff sees only their branch
    const requests = db.prepare(`
      SELECT dr.*, i.name as item_name, i.product_photo_url, u.name as requested_by_name, b.name as branch_name
      FROM deletion_requests dr
      JOIN inventory_items i ON dr.item_id = i.id
      JOIN users u ON dr.requested_by = u.id
      JOIN branches b ON dr.branch_id = b.id
      WHERE ${condition.replace(/branch_id/g, 'dr.branch_id')}
      ORDER BY dr.requested_at DESC
    `).all(...params);
    
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Request deletion (Staff)
router.post('/:id/request-deletion', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const item = db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(id);
    
    if (!item) return res.status(404).json({ error: 'Item not found' });
    
    // Check if staff belongs to the same branch
    if (req.user.role !== 'Admin' && req.user.branch_id !== item.branch_id) {
      return res.status(403).json({ error: 'Forbidden: Item belongs to another branch' });
    }
    
    // Check if pending request already exists
    const existing = db.prepare('SELECT * FROM deletion_requests WHERE item_id = ? AND status = ?').get(id, 'pending');
    if (existing) return res.status(400).json({ error: 'A deletion request is already pending for this item.' });
    
    const reqId = generateUUID();
    db.prepare(`
      INSERT INTO deletion_requests (id, item_id, requested_by, branch_id, status, requested_at)
      VALUES (?, ?, ?, ?, 'pending', ?)
    `).run(reqId, id, req.user.id, item.branch_id, new Date().toISOString());
    
    res.status(201).json({ message: 'Deletion request submitted.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Approve deletion request (Admin Only)
router.post('/deletion-requests/:reqId/approve', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { reqId } = req.params;
    const request = db.prepare('SELECT * FROM deletion_requests WHERE id = ?').get(reqId);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ error: 'Request is no longer pending' });
    
    // Start transaction to approve and soft-delete
    const approveTx = db.transaction(() => {
      // 1. Update request
      db.prepare(`UPDATE deletion_requests SET status = 'approved', reviewed_by = ?, reviewed_at = ? WHERE id = ?`)
        .run(req.user.id, new Date().toISOString(), reqId);
      // 2. Soft-delete item
      db.prepare('UPDATE inventory_items SET deleted_at = ? WHERE id = ?')
        .run(new Date().toISOString(), request.item_id);
    });
    approveTx();
    
    res.json({ message: 'Request approved and item deleted.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Reject deletion request (Admin Only)
router.post('/deletion-requests/:reqId/reject', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { reqId } = req.params;
    const request = db.prepare('SELECT * FROM deletion_requests WHERE id = ?').get(reqId);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ error: 'Request is no longer pending' });
    
    db.prepare(`UPDATE deletion_requests SET status = 'rejected', reviewed_by = ?, reviewed_at = ? WHERE id = ?`)
      .run(req.user.id, new Date().toISOString(), reqId);
      
    res.json({ message: 'Request rejected.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
