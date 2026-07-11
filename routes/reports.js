const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const { getBranchFilterSql } = require('../config/branchFilter');

// Helper to get branch names map
function getBranchMap() {
  const branches = db.prepare('SELECT id, name FROM branches').all();
  const map = {};
  branches.forEach(b => map[b.id] = b.name);
  return map;
}

// 1. Inventory Summary Excel
router.get('/inventory-summary', authenticateToken, async (req, res) => {
  try {
    const { condition, params } = getBranchFilterSql(req.user, req.query.branch_id);
    const category = req.query.category || '';
    const program = req.query.program || '';
    let extraCatProg = '';
    if (category) { extraCatProg += ' AND i.category = ?'; params.push(category); }
    if (program) { extraCatProg += ' AND i.program = ?'; params.push(program); }
    const items = db.prepare(`SELECT * FROM inventory_items i WHERE deleted_at IS NULL AND ${condition.replace(/branch_id/g, 'i.branch_id')} ${extraCatProg} ORDER BY i.name ASC`).all(...params);
    const branchMap = getBranchMap();

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'MSC Trust Inventory System';
    
    // Group items by branch
    const branchGroups = {};
    let trustWideTotal = 0;
    
    items.forEach(item => {
      const bId = item.branch_id || 'trust_wide';
      if (!branchGroups[bId]) branchGroups[bId] = [];
      branchGroups[bId].push(item);
      trustWideTotal += item.stock;
    });

    const isAllBranches = req.user.role === 'Admin' && (!req.query.branch_id || req.query.branch_id === '');
    
    if (isAllBranches) {
      const summarySheet = workbook.addWorksheet('Trust-Wide Summary');
      summarySheet.columns = [
        { header: 'Metric', key: 'metric', width: 30 },
        { header: 'Value', key: 'value', width: 20 }
      ];
      summarySheet.getRow(1).font = { bold: true };
      summarySheet.addRow({ metric: 'Total Unique Items', value: items.length });
      summarySheet.addRow({ metric: 'Total Combined Stock', value: trustWideTotal });
    }

    if (Object.keys(branchGroups).length === 0) {
      const sheet = workbook.addWorksheet('Inventory Summary');
      sheet.addRow(['No items found.']);
    } else {
      for (const bId of Object.keys(branchGroups)) {
        const branchName = bId === 'trust_wide' ? 'Global Unassigned' : (branchMap[bId] || 'Unknown Branch');
        const safeSheetName = branchName.replace(/[\[\]\/*\?:\\\\]/g, '').substring(0, 31);
        
        const sheet = workbook.addWorksheet(safeSheetName, { views: [{ state: 'frozen', ySplit: 1 }] });
        sheet.columns = [
          { header: 'Item Name', key: 'name', width: 30 },
          { header: 'Category', key: 'category', width: 20 },
          { header: 'Unit', key: 'unit', width: 15 },
          { header: 'Current Stock', key: 'stock', width: 15 },
          { header: 'Threshold', key: 'threshold', width: 15 },
          { header: 'Unit Price (₹)', key: 'price', width: 15 },
          { header: 'Date Added', key: 'created_at', width: 20 }
        ];
        sheet.getRow(1).font = { bold: true };
        
        branchGroups[bId].forEach(i => {
          sheet.addRow({
            name: i.name,
            category: i.category || '-',
            unit: i.unit || '-',
            stock: i.stock,
            threshold: i.threshold,
            price: i.unit_price || 0,
            created_at: i.created_at ? i.created_at.split('T')[0] : '-'
          });
        });
      }
    }
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Inventory_Summary_${new Date().toISOString().split('T')[0]}.xlsx"`);
    
    await workbook.xlsx.write(res);
    res.end();
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Low Stock Report Excel
router.get('/low-stock', authenticateToken, async (req, res) => {
  try {
    const { condition, params } = getBranchFilterSql(req.user, req.query.branch_id);
    const items = db.prepare(`SELECT * FROM inventory_items WHERE deleted_at IS NULL AND stock <= threshold AND ${condition} ORDER BY name ASC`).all(...params);
    const branchMap = getBranchMap();

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'MSC Trust Inventory System';

    if (items.length === 0) {
      const sheet = workbook.addWorksheet('Low Stock Report');
      sheet.addRow(['No items currently below threshold']);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="Low_Stock_Report_${new Date().toISOString().split('T')[0]}.xlsx"`);
      await workbook.xlsx.write(res);
      return res.end();
    }

    const branchGroups = {};
    items.forEach(item => {
      const bId = item.branch_id || 'trust_wide';
      if (!branchGroups[bId]) branchGroups[bId] = [];
      branchGroups[bId].push(item);
    });

    for (const bId of Object.keys(branchGroups)) {
      const branchName = bId === 'trust_wide' ? 'Global Unassigned' : (branchMap[bId] || 'Unknown Branch');
      const safeSheetName = branchName.replace(/[\[\]\/*\?:\\\\]/g, '').substring(0, 31);
      
      const sheet = workbook.addWorksheet(safeSheetName, { views: [{ state: 'frozen', ySplit: 1 }] });
      sheet.columns = [
        { header: 'Item Name', key: 'name', width: 30 },
        { header: 'Category', key: 'category', width: 20 },
        { header: 'Current Stock', key: 'stock', width: 15 },
        { header: 'Threshold', key: 'threshold', width: 15 },
        { header: 'Shortage', key: 'shortage', width: 15 }
      ];
      sheet.getRow(1).font = { bold: true };
      
      branchGroups[bId]
        .sort((a, b) => (b.threshold - b.stock) - (a.threshold - a.stock))
        .forEach(i => {
          sheet.addRow({
            name: i.name,
            category: i.category || '-',
            stock: i.stock,
            threshold: i.threshold,
            shortage: i.threshold - i.stock
          });
        });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Low_Stock_Report_${new Date().toISOString().split('T')[0]}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Movement History Excel (Master Ledger)
router.get('/movements', authenticateToken, async (req, res) => {
  try {
    const { startDate: qStart, endDate: qEnd, category, program, action_type, block_id } = req.query;
    if (!qStart || !qEnd) return res.status(400).json({ error: "Start and end dates required" });

    const startDate = new Date(qStart).toISOString();
    const end = new Date(qEnd);
    end.setHours(23, 59, 59, 999);
    const endDate = end.toISOString();

    const { condition, params } = getBranchFilterSql(req.user, req.query.branch_id);
    const branchMap = getBranchMap();
    
    let extraCatProg = '';
    if (category) { extraCatProg += ' AND i.category = ?'; params.push(category); }
    if (program) { extraCatProg += ' AND i.program = ?'; params.push(program); }
    
    let extraMov = '';
    if (action_type) { extraMov += ' AND m.movement_type = ?'; params.push(action_type); }
    if (block_id) { extraMov += ' AND (m.from_block_id = ? OR m.to_block_id = ?)'; params.push(block_id, block_id); }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'MSC Trust Inventory System';

    const movSheet = workbook.addWorksheet('Master Ledger');
    movSheet.columns = [
      { header: 'S.No', key: 'sno', width: 8 },
      { header: 'Date & Time', key: 'date', width: 22 },
      { header: 'Ref/Bill No', key: 'ref', width: 15 },
      { header: 'Action Type', key: 'type', width: 15 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Item Name', key: 'item', width: 30 },
      { header: 'Item Code', key: 'code', width: 15 },
      { header: 'Serial No', key: 'serial', width: 15 },
      { header: 'Qty Changed', key: 'quantity', width: 15 },
      { header: 'Unit', key: 'unit', width: 10 },
      { header: 'Running Bal.', key: 'balance', width: 15 },
      { header: 'Unit Price (₹)', key: 'price', width: 15 },
      { header: 'Total Amt (₹)', key: 'amount', width: 15 },
      { header: 'From Location', key: 'from_loc', width: 30 },
      { header: 'To Location', key: 'to_loc', width: 30 },
      { header: 'Party / Recipient', key: 'party', width: 25 },
      { header: 'Program', key: 'program', width: 20 },
      { header: 'Handled By', key: 'user', width: 20 },
      { header: 'Notes', key: 'notes', width: 40 }
    ];
    movSheet.getRow(1).font = { bold: true };
    
    const blockMap = {};
    db.prepare('SELECT id, name FROM branch_blocks').all().forEach(b => blockMap[b.id] = b.name);
    
    const allItems = db.prepare('SELECT id, stock FROM inventory_items').all();
    const stockMap = {};
    allItems.forEach(i => stockMap[i.id] = i.stock);
    
    const movsAfterStart = db.prepare(`
      SELECT item_id, movement_type, quantity, branch_id, to_branch_id
      FROM inventory_movements 
      WHERE created_at >= ? AND (voided IS NULL OR voided = 0) AND reference_code NOT LIKE 'VOID-%'
    `).all(startDate);
    
    movsAfterStart.forEach(m => {
      if(stockMap[m.item_id] !== undefined) {
        if(m.movement_type === 'IN') stockMap[m.item_id] -= m.quantity;
        else if(m.movement_type === 'OUT') stockMap[m.item_id] += m.quantity;
      }
    });

    const movements = db.prepare(`
      SELECT m.*, i.name as item_name, i.category, i.unit, i.item_code as i_code, i.serial_number as i_serial, i.program, b.name as branch_name, u.username 
      FROM inventory_movements m
      JOIN inventory_items i ON m.item_id = i.id
      LEFT JOIN branches b ON m.branch_id = b.id
      LEFT JOIN users u ON m.created_by = u.id
      WHERE m.created_at >= ? AND m.created_at <= ? AND (m.voided IS NULL OR m.voided = 0) AND m.reference_code NOT LIKE 'VOID-%'
      AND ${condition.replace(/branch_id/g, 'm.branch_id')}
      ${extraCatProg}
      ${extraMov}
      ORDER BY m.created_at ASC
    `).all(startDate, endDate, ...params);
    
    let sno = 1;
    movements.forEach(m => {
      if(m.movement_type === 'IN') stockMap[m.item_id] += m.quantity;
      else if(m.movement_type === 'OUT') stockMap[m.item_id] -= m.quantity;
      
      let fromLoc = m.branch_name || 'Global';
      if(m.from_block_id) fromLoc += ' - ' + (blockMap[m.from_block_id] || 'Block');
      else if(m.movement_type === 'IN') fromLoc = 'External Supplier/Donor';
      
      let toLoc = m.branch_name || 'Global';
      if(m.to_block_id) toLoc += ' - ' + (blockMap[m.to_block_id] || 'Block');
      if(m.movement_type === 'TRANSFER' && m.to_branch_id) {
         const tb = branchMap[m.to_branch_id] || 'Branch';
         toLoc = tb + (m.to_block_id ? ' - ' + (blockMap[m.to_block_id] || 'Block') : '');
      } else if (m.movement_type === 'OUT') {
         toLoc = 'External / Consumed';
      }

      let dt = m.created_at ? m.created_at.replace('T', ' ').substring(0, 19) : '-';
      
      movSheet.addRow({
        sno: sno++,
        date: dt,
        ref: m.reference_code || '-',
        type: m.movement_type,
        category: m.category || '-',
        item: m.item_name,
        code: m.item_code || m.i_code || '-',
        serial: m.serial_number || m.i_serial || '-',
        quantity: m.quantity,
        unit: m.unit || '-',
        balance: stockMap[m.item_id],
        price: m.total_price ? (m.total_price / m.quantity).toFixed(2) : '-',
        amount: m.total_price || '-',
        from_loc: fromLoc,
        to_loc: toLoc,
        party: m.party_name || m.recipient_name || '-',
        program: m.program || '-',
        user: m.username || '-',
        notes: m.notes || '-'
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Inventory_Movement_History.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Backup Data
router.get('/backup-zip', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const AdmZip = require('adm-zip');
    const zip = new AdmZip();

    const dataDir = process.env.DATA_DIR || path.join(__dirname, '..');
    
    // Append database file
    const dbPath = path.join(dataDir, 'database.db');
    if (fs.existsSync(dbPath)) {
      zip.addLocalFile(dbPath);
    }

    // Append uploads directory
    const uploadsPath = path.join(dataDir, 'uploads');
    if (fs.existsSync(uploadsPath)) {
      zip.addLocalFolder(uploadsPath, 'uploads');
    }

    const zipBuffer = zip.toBuffer();
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="msc-backup-${Date.now()}.zip"`);
    res.setHeader('Content-Length', zipBuffer.length);
    res.end(zipBuffer);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Comprehensive Export
router.get('/comprehensive', authenticateToken, async (req, res) => {
  try {
    const { startDate: qStart, endDate: qEnd } = req.query;
    if (!qStart || !qEnd) return res.status(400).json({ error: "Start and end dates required" });

    const startDate = new Date(qStart).toISOString();
    const end = new Date(qEnd);
    end.setHours(23, 59, 59, 999);
    const endDate = end.toISOString();

    const { condition, params } = getBranchFilterSql(req.user, req.query.branch_id);
    const branchMap = getBranchMap();

    const category = req.query.category || '';
    const program = req.query.program || '';
    const action_type = req.query.action_type || '';
    const block_id = req.query.block_id || '';

    let extraCatProg = '';
    const itemParams = [...params];
    if (category) { extraCatProg += ' AND category = ?'; itemParams.push(category); }
    if (program) { extraCatProg += ' AND program = ?'; itemParams.push(program); }

    let extraCatProgMov = '';
    const movParams = [startDate, endDate, ...params];
    if (category) { extraCatProgMov += ' AND i.category = ?'; movParams.push(category); }
    if (program) { extraCatProgMov += ' AND i.program = ?'; movParams.push(program); }

    let extraMov = '';
    if (action_type) { extraMov += ' AND m.movement_type = ?'; movParams.push(action_type); }
    if (block_id) { extraMov += ' AND (m.from_block_id = ? OR m.to_block_id = ?)'; movParams.push(block_id, block_id); }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'MSC Trust Inventory System';

    const safeBranchFilter = condition.replace(/branch_id/g, 'branch_id');

    // Sheet 1: Inventory & Groceries
    const invSheet = workbook.addWorksheet('Inventory & Groceries');
    invSheet.columns = [
      { header: 'Branch', key: 'branch', width: 25 },
      { header: 'Item Name', key: 'name', width: 30 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Unit', key: 'unit', width: 15 },
      { header: 'Current Stock', key: 'stock', width: 15 },
      { header: 'Threshold', key: 'threshold', width: 15 },
      { header: 'Unit Price (₹)', key: 'price', width: 15 },
      { header: 'Date Added', key: 'created_at', width: 20 }
    ];
    invSheet.getRow(1).font = { bold: true };
    const items = db.prepare(`SELECT * FROM inventory_items WHERE deleted_at IS NULL AND ${condition} ${extraCatProg} ORDER BY name ASC`).all(...itemParams);
    items.forEach(i => invSheet.addRow({
      branch: branchMap[i.branch_id] || 'Global',
      name: i.name, category: i.category || '-', unit: i.unit || '-',
      stock: i.stock, threshold: i.threshold, price: i.unit_price || 0,
      created_at: i.created_at ? i.created_at.split('T')[0] : '-'
    }));

    // Sheet 2: Movements Log
    const movSheet = workbook.addWorksheet('Movements Log');
    movSheet.columns = [
      { header: 'S.No', key: 'sno', width: 8 },
      { header: 'Date & Time', key: 'date', width: 22 },
      { header: 'Ref/Bill No', key: 'ref', width: 15 },
      { header: 'Action Type', key: 'type', width: 15 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Item Name', key: 'item', width: 30 },
      { header: 'Item Code', key: 'code', width: 15 },
      { header: 'Serial No', key: 'serial', width: 15 },
      { header: 'Qty Changed', key: 'quantity', width: 15 },
      { header: 'Unit', key: 'unit', width: 10 },
      { header: 'Running Bal.', key: 'balance', width: 15 },
      { header: 'Unit Price (₹)', key: 'price', width: 15 },
      { header: 'Total Amt (₹)', key: 'amount', width: 15 },
      { header: 'From Location', key: 'from_loc', width: 30 },
      { header: 'To Location', key: 'to_loc', width: 30 },
      { header: 'Party / Recipient', key: 'party', width: 25 },
      { header: 'Program', key: 'program', width: 20 },
      { header: 'Handled By', key: 'user', width: 20 },
      { header: 'Notes', key: 'notes', width: 40 }
    ];
    movSheet.getRow(1).font = { bold: true };
    
    const blockMap = {};
    db.prepare('SELECT id, name FROM branch_blocks').all().forEach(b => blockMap[b.id] = b.name);
    
    // Calculate opening stock for running balance
    const allItems = db.prepare('SELECT id, stock FROM inventory_items').all();
    const stockMap = {};
    allItems.forEach(i => stockMap[i.id] = i.stock);
    
    const movsAfterStart = db.prepare(`
      SELECT item_id, movement_type, quantity, branch_id, to_branch_id
      FROM inventory_movements 
      WHERE created_at >= ? AND (voided IS NULL OR voided = 0) AND reference_code NOT LIKE 'VOID-%'
    `).all(startDate);
    
    movsAfterStart.forEach(m => {
      if(stockMap[m.item_id] !== undefined) {
        if(m.movement_type === 'IN') stockMap[m.item_id] -= m.quantity;
        else if(m.movement_type === 'OUT') stockMap[m.item_id] += m.quantity;
      }
    });

    const movements = db.prepare(`
      SELECT m.*, i.name as item_name, i.category, i.unit, i.item_code as i_code, i.serial_number as i_serial, i.program, b.name as branch_name, u.username 
      FROM inventory_movements m
      JOIN inventory_items i ON m.item_id = i.id
      LEFT JOIN branches b ON m.branch_id = b.id
      LEFT JOIN users u ON m.created_by = u.id
      WHERE m.created_at >= ? AND m.created_at <= ? AND (m.voided IS NULL OR m.voided = 0) AND m.reference_code NOT LIKE 'VOID-%'
      AND ${condition.replace(/branch_id/g, 'm.branch_id')}
      ${extraCatProgMov}
      ${extraMov}
      ORDER BY m.created_at ASC
    `).all(...movParams);
    
    let sno = 1;
    movements.forEach(m => {
      if(m.movement_type === 'IN') stockMap[m.item_id] += m.quantity;
      else if(m.movement_type === 'OUT') stockMap[m.item_id] -= m.quantity;
      
      let fromLoc = m.branch_name || 'Global';
      if(m.from_block_id) fromLoc += ' - ' + (blockMap[m.from_block_id] || 'Block');
      else if(m.movement_type === 'IN') fromLoc = 'External Supplier/Donor';
      
      let toLoc = m.branch_name || 'Global';
      if(m.to_block_id) toLoc += ' - ' + (blockMap[m.to_block_id] || 'Block');
      if(m.movement_type === 'TRANSFER' && m.to_branch_id) {
         const tb = branchMap[m.to_branch_id] || 'Branch';
         toLoc = tb + (m.to_block_id ? ' - ' + (blockMap[m.to_block_id] || 'Block') : '');
      } else if (m.movement_type === 'OUT') {
         toLoc = 'External / Consumed';
      }

      let dt = m.created_at ? m.created_at.replace('T', ' ').substring(0, 19) : '-';
      
      movSheet.addRow({
        sno: sno++,
        date: dt,
        ref: m.reference_code || '-',
        type: m.movement_type,
        category: m.category || '-',
        item: m.item_name,
        code: m.item_code || m.i_code || '-',
        serial: m.serial_number || m.i_serial || '-',
        quantity: m.quantity,
        unit: m.unit || '-',
        balance: stockMap[m.item_id],
        price: m.total_price ? (m.total_price / m.quantity).toFixed(2) : '-',
        amount: m.total_price || '-',
        from_loc: fromLoc,
        to_loc: toLoc,
        party: m.party_name || m.recipient_name || '-',
        program: m.program || '-',
        user: m.username || '-',
        notes: m.notes || '-'
      });
    });

    // Sheet 3: Donations (In-Kind)
    const donSheet = workbook.addWorksheet('Donations');
    donSheet.columns = [
      { header: 'Date', key: 'date', width: 20 },
      { header: 'Branch', key: 'branch', width: 25 },
      { header: 'Donor Name', key: 'donor', width: 30 },
      { header: 'Item Details', key: 'item_details', width: 35 },
      { header: 'Est. Value (₹)', key: 'amount', width: 15 },
      { header: 'Phone', key: 'phone', width: 20 },
      { header: 'Address', key: 'address', width: 40 },
      { header: 'Status', key: 'status', width: 15 }
    ];
    donSheet.getRow(1).font = { bold: true };
    const donations = db.prepare(`SELECT d.*, b.name as branch_name FROM donations d LEFT JOIN branches b ON d.branch_id = b.id WHERE d.deleted_at IS NULL AND d.created_at >= ? AND d.created_at <= ? AND ${condition.replace(/branch_id/g, 'd.branch_id')} ORDER BY d.created_at ASC`).all(startDate, endDate, ...params);
    donations.forEach(d => donSheet.addRow({
      date: d.created_at ? d.created_at.split('T')[0] : '-',
      branch: d.branch_name || '-', donor: d.donor_name,
      item_details: d.item_details || '-', amount: d.amount || 0,
      phone: d.phone || '-', address: d.address || '-',
      status: d.processed ? 'Processed' : 'Pending'
    }));

    // Sheet 4: Transfers
    const transSheet = workbook.addWorksheet('Transfers');
    transSheet.columns = [
      { header: 'Date Requested', key: 'date', width: 20 },
      { header: 'From Branch', key: 'from', width: 25 },
      { header: 'To Branch', key: 'to', width: 25 },
      { header: 'Item Name', key: 'item', width: 30 },
      { header: 'Quantity', key: 'quantity', width: 15 },
      { header: 'Status', key: 'status', width: 15 }
    ];
    transSheet.getRow(1).font = { bold: true };
    const transfers = db.prepare(`SELECT t.*, i.name as item_name, bf.name as from_branch, bt.name as to_branch FROM transfer_requests t JOIN inventory_items i ON t.item_id = i.id LEFT JOIN branches bf ON t.from_branch_id = bf.id LEFT JOIN branches bt ON t.to_branch_id = bt.id WHERE t.created_at >= ? AND t.created_at <= ? AND (${condition.replace(/branch_id/g, 't.from_branch_id')} OR ${condition.replace(/branch_id/g, 't.to_branch_id')}) ORDER BY t.created_at ASC`).all(startDate, endDate, ...params, ...params);
    transfers.forEach(t => transSheet.addRow({
      date: t.created_at ? t.created_at.split('T')[0] : '-',
      from: t.from_branch || '-', to: t.to_branch || '-',
      item: t.item_name, quantity: t.quantity, status: t.status
    }));

    // Sheet 5: Suppliers
    const supSheet = workbook.addWorksheet('Suppliers');
    supSheet.columns = [{ header: 'Name', key: 'name', width: 30 }, { header: 'Description', key: 'desc', width: 40 }, { header: 'Branch', key: 'branch', width: 25 }];
    supSheet.getRow(1).font = { bold: true };
    db.prepare(`SELECT s.*, b.name as branch_name FROM suppliers s LEFT JOIN branches b ON s.branch_id = b.id WHERE s.deleted_at IS NULL AND ${condition.replace(/branch_id/g, 's.branch_id')}`).all(...params).forEach(s => supSheet.addRow({ name: s.name, desc: s.description || '-', branch: s.branch_name || 'Global' }));

    // Sheet 6: Programs & Categories
    const progSheet = workbook.addWorksheet('Programs & Categories');
    progSheet.columns = [{ header: 'Type', key: 'type', width: 20 }, { header: 'Name', key: 'name', width: 30 }, { header: 'Description', key: 'desc', width: 40 }, { header: 'Branch', key: 'branch', width: 25 }];
    progSheet.getRow(1).font = { bold: true };
    db.prepare(`SELECT c.*, b.name as branch_name FROM categories c LEFT JOIN branches b ON c.branch_id = b.id WHERE c.deleted_at IS NULL AND ${condition.replace(/branch_id/g, 'c.branch_id')}`).all(...params).forEach(c => progSheet.addRow({ type: 'Category', name: c.name, desc: c.description || '-', branch: c.branch_name || 'Global' }));
    db.prepare(`SELECT p.*, b.name as branch_name FROM programs p LEFT JOIN branches b ON p.branch_id = b.id WHERE p.deleted_at IS NULL AND ${condition.replace(/branch_id/g, 'p.branch_id')}`).all(...params).forEach(p => progSheet.addRow({ type: 'Program', name: p.name, desc: p.description || '-', branch: p.branch_name || 'Global' }));

    // Sheet 7: Branches & Blocks
    const branchSheet = workbook.addWorksheet('Branches & Blocks');
    branchSheet.columns = [{ header: 'Branch', key: 'branch', width: 25 }, { header: 'Block Name', key: 'block', width: 30 }, { header: 'Description', key: 'desc', width: 40 }];
    branchSheet.getRow(1).font = { bold: true };
    const adminCond = req.user.role === 'Admin' ? '1=1' : condition.replace(/branch_id/g, 'b.id');
    db.prepare(`SELECT bb.*, b.name as branch_name FROM branch_blocks bb JOIN branches b ON bb.branch_id = b.id WHERE bb.deleted_at IS NULL AND b.deleted_at IS NULL AND ${adminCond}`).all(...params).forEach(bb => branchSheet.addRow({ branch: bb.branch_name, block: bb.name, desc: bb.description || '-' }));

    // Sheet 8: Users
    const userSheet = workbook.addWorksheet('Users');
    userSheet.columns = [{ header: 'Username', key: 'name', width: 25 }, { header: 'Role', key: 'role', width: 20 }, { header: 'Branch', key: 'branch', width: 25 }];
    userSheet.getRow(1).font = { bold: true };
    const userCond = req.user.role === 'Admin' ? '1=1' : condition.replace(/branch_id/g, 'u.branch_id');
    db.prepare(`SELECT u.*, b.name as branch_name FROM users u LEFT JOIN branches b ON u.branch_id = b.id WHERE ${userCond}`).all(...params).forEach(u => userSheet.addRow({ name: u.username, role: u.role, branch: u.branch_name || 'All' }));

    // Sheet 9: System Activity
    const actSheet = workbook.addWorksheet('System Activity');
    actSheet.columns = [
      { header: 'Date', key: 'date', width: 20 },
      { header: 'Branch', key: 'branch', width: 25 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Item Name', key: 'item', width: 30 },
      { header: 'Item Code', key: 'code', width: 15 },
      { header: 'Details', key: 'details', width: 50 },
      { header: 'User', key: 'user', width: 20 }
    ];
    actSheet.getRow(1).font = { bold: true };
    
    // Price changes
    db.prepare(`SELECT ph.*, i.name as item_name, b.name as branch_name, u.username FROM price_history ph JOIN inventory_items i ON ph.item_id = i.id LEFT JOIN branches b ON ph.branch_id = b.id LEFT JOIN users u ON ph.changed_by = u.id WHERE ph.created_at >= ? AND ph.created_at <= ? AND ${condition.replace(/branch_id/g, 'ph.branch_id')}`).all(startDate, endDate, ...params).forEach(p => actSheet.addRow({ date: p.created_at ? p.created_at.split('T')[0] : '-', type: 'Price Change', item: p.item_name, branch: p.branch_name || 'Global', details: `Old: ₹${p.old_unit_price || 0} -> New: ₹${p.new_unit_price}`, user: p.username || '-' }));
    
    // Resales/Deletions
    db.prepare(`SELECT dr.*, i.name as item_name, b.name as branch_name, u.username FROM deletion_requests dr JOIN inventory_items i ON dr.item_id = i.id JOIN branches b ON dr.branch_id = b.id LEFT JOIN users u ON dr.requested_by = u.id WHERE dr.requested_at >= ? AND dr.requested_at <= ? AND ${condition.replace(/branch_id/g, 'dr.branch_id')}`).all(startDate, endDate, ...params).forEach(r => actSheet.addRow({ date: r.requested_at ? r.requested_at.split(' ')[0] : '-', type: `Deletion Request (${r.reason})`, item: r.item_name, branch: r.branch_name || 'Global', details: `Status: ${r.status}. Qty: ${r.quantity || 'All'}. Notes: ${r.reason_details || '-'}`, user: r.username || '-' }));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Comprehensive_Export_${qStart}_to_${qEnd}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
