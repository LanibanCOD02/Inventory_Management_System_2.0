const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');
const PDFDocument = require('pdfkit-table');
const archiver = require('archiver');
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

// 1. Inventory Summary PDF
router.get('/inventory-summary', authenticateToken, async (req, res) => {
  try {
    const { condition, params } = getBranchFilterSql(req.user, req.query.branch_id);
    const items = db.prepare(`SELECT * FROM inventory_items WHERE deleted_at IS NULL AND ${condition} ORDER BY name ASC`).all(...params);
    const branchMap = getBranchMap();

    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="Inventory_Summary.pdf"');
    doc.pipe(res);

    doc.fontSize(20).text('MSC Trust — Inventory Summary', { align: 'center' });
    doc.moveDown();

    // Group items by branch
    const branchGroups = {};
    let trustWideTotal = 0;
    
    items.forEach(item => {
      const bId = item.branch_id || 'trust_wide';
      if (!branchGroups[bId]) branchGroups[bId] = [];
      branchGroups[bId].push(item);
      trustWideTotal += item.stock;
    });

    // If Admin and "All Branches" (i.e. req.user.role === 'Admin' and no req.query.branch_id filtering down)
    const isAllBranches = req.user.role === 'Admin' && (!req.query.branch_id || req.query.branch_id === '');
    
    if (isAllBranches) {
      doc.fontSize(14).text(`Trust-Wide Total Items: ${trustWideTotal}`, { underline: true });
      doc.moveDown();
    }

    // Branch-wise sections
    for (const bId of Object.keys(branchGroups)) {
      const branchName = bId === 'trust_wide' ? 'Global/Unassigned' : (branchMap[bId] || 'Unknown Branch');
      
      const table = {
        title: `Branch: ${branchName}`,
        headers: ['Item Name', 'Category', 'Stock', 'Unit'],
        rows: branchGroups[bId].map(i => [
          i.name, i.category || '-', i.stock.toString(), i.unit || '-'
        ])
      };
      
      await doc.table(table, {
        prepareHeader: () => doc.font("Helvetica-Bold").fontSize(10),
        prepareRow: (row, indexColumn, indexRow, rectRow) => doc.font("Helvetica").fontSize(10)
      });
      doc.moveDown();
    }

    doc.end();
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Low Stock Report PDF
router.get('/low-stock', authenticateToken, async (req, res) => {
  try {
    const { condition, params } = getBranchFilterSql(req.user, req.query.branch_id);
    const items = db.prepare(`SELECT * FROM inventory_items WHERE deleted_at IS NULL AND stock <= threshold AND ${condition} ORDER BY name ASC`).all(...params);
    const branchMap = getBranchMap();

    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="Low_Stock_Report.pdf"');
    doc.pipe(res);

    doc.fontSize(20).text('MSC Trust — Low Stock Report', { align: 'center' });
    doc.moveDown();

    if (items.length === 0) {
      doc.fontSize(14).text('No items currently below threshold.', { align: 'center' });
      doc.end();
      return;
    }

    const branchGroups = {};
    items.forEach(item => {
      const bId = item.branch_id || 'trust_wide';
      if (!branchGroups[bId]) branchGroups[bId] = [];
      branchGroups[bId].push(item);
    });

    for (const bId of Object.keys(branchGroups)) {
      const branchName = bId === 'trust_wide' ? 'Global/Unassigned' : (branchMap[bId] || 'Unknown Branch');
      
      const table = {
        title: `Branch: ${branchName}`,
        headers: ['Item Name', 'Current Stock', 'Threshold', 'Deficit'],
        rows: branchGroups[bId].map(i => [
          i.name, i.stock.toString(), i.threshold.toString(), (i.threshold - i.stock).toString()
        ])
      };
      
      await doc.table(table, {
        prepareHeader: () => doc.font("Helvetica-Bold").fontSize(10),
        prepareRow: (row, indexColumn, indexRow, rectRow) => {
          doc.font("Helvetica").fontSize(10);
          if (indexColumn === 3) doc.fillColor('red');
          else doc.fillColor('black');
        }
      });
      doc.moveDown();
    }

    doc.end();
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Movement History
router.get('/movements', authenticateToken, async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) return res.status(400).json({ error: "Month and year required" });

    // JS Date month is 0-indexed, but query string comes as 1-12
    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 1).toISOString(); // first day of next month

    const { condition, params } = getBranchFilterSql(req.user, req.query.branch_id);
    
    const querySql = `
      SELECT m.*, i.name as item_name, i.unit 
      FROM inventory_movements m 
      LEFT JOIN inventory_items i ON m.item_id = i.id 
      WHERE m.created_at >= ? AND m.created_at < ? 
      AND (m.voided IS NULL OR m.voided = 0)
      AND m.reference_code NOT LIKE 'VOID-%'
      AND ${condition.replace(/branch_id/g, 'm.branch_id')} 
      ORDER BY m.created_at ASC
    `;
    const fullParams = [startDate, endDate, ...params];

    const movements = db.prepare(querySql).all(...fullParams);
    const branchMap = getBranchMap();

    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Movement_History_${year}_${month}.pdf"`);
    doc.pipe(res);

    doc.fontSize(20).text(`MSC Trust — Movement History (${month}/${year})`, { align: 'center' });
    doc.moveDown();

    if (movements.length === 0) {
      doc.fontSize(14).text('No movements recorded for this period.', { align: 'center' });
      doc.end();
      return;
    }

    const branchGroups = {};
    let totalIn = 0;
    let totalOut = 0;

    movements.forEach(m => {
      const bId = m.branch_id || 'trust_wide';
      if (!branchGroups[bId]) branchGroups[bId] = { in: 0, out: 0, list: [] };
      branchGroups[bId].list.push(m);
      if (m.movement_type === 'IN') { branchGroups[bId].in += m.quantity; totalIn += m.quantity; }
      else if (m.movement_type === 'OUT') { branchGroups[bId].out += m.quantity; totalOut += m.quantity; }
    });

    const isAllBranches = req.user.role === 'Admin' && (!req.query.branch_id || req.query.branch_id === '');
    
    if (isAllBranches) {
      doc.fontSize(14).text(`Trust-Wide Summary`, { underline: true });
      doc.fontSize(12).text(`Total IN: ${totalIn} | Total OUT: ${totalOut}`);
      doc.moveDown();
    }

    for (const bId of Object.keys(branchGroups)) {
      const branchName = bId === 'trust_wide' ? 'Global/Unassigned' : (branchMap[bId] || 'Unknown Branch');
      const bData = branchGroups[bId];

      doc.fontSize(12).font("Helvetica-Bold").text(`Branch: ${branchName} (IN: ${bData.in}, OUT: ${bData.out})`);
      doc.moveDown(0.5);

      const table = {
        headers: ['Date', 'Type', 'Item', 'Qty', 'Party/Prog', 'Ref Code'],
        rows: bData.list.map(m => [
          new Date(m.created_at).toLocaleDateString(),
          m.movement_type,
          m.item_name || 'Unknown Item',
          m.quantity.toString(),
          m.party_name || '-',
          m.reference_code || '-'
        ])
      };
      
      await doc.table(table, {
        prepareHeader: () => doc.font("Helvetica-Bold").fontSize(9),
        prepareRow: (row, indexColumn, indexRow, rectRow) => {
          doc.font("Helvetica").fontSize(9);
          if (indexColumn === 1) {
             if (row[1] === 'IN') doc.fillColor('green');
             else doc.fillColor('red');
          } else {
             doc.fillColor('black');
          }
        }
      });
      doc.moveDown();
    }

    doc.end();

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

module.exports = router;
