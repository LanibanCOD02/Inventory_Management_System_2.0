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

// Helper to format date to DD/MM/YYYY HH:MM AM/PM
function formatToDDMMYYYY(dateStr) {
  if (!dateStr || dateStr === '-') return '-';
  
  // Treat raw SQLite timestamps as UTC by appending 'Z'
  let isoStr = dateStr.trim();
  if (!isoStr.endsWith('Z')) {
    isoStr = isoStr.replace(' ', 'T') + 'Z';
  }
  
  const d = new Date(isoStr);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 hour should be 12
    const strHours = String(hours).padStart(2, '0');

    return `${day}/${month}/${year} ${strHours}:${minutes} ${ampm}`;
  }

  return dateStr;
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
    const blockMap = {};
    db.prepare('SELECT id, name FROM branch_blocks').all().forEach(b => blockMap[b.id] = b.name);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'MSC Trust Inventory System';
    
    const sheet = workbook.addWorksheet('Inventory Summary', { views: [{ state: 'frozen', ySplit: 4 }] });

    const qBranchId = req.query.branch_id;
    let headerBranchName = 'All Branches';
    if (qBranchId && branchMap[qBranchId]) {
      headerBranchName = branchMap[qBranchId];
    } else if (req.user.role !== 'Admin') {
      headerBranchName = branchMap[req.user.branch_id] || 'Your Branch';
    }

    const qEndDate = req.query.endDate || new Date().toISOString().split('T')[0];
    const generatedDate = new Date().toLocaleString();

    // Row 1
    sheet.mergeCells('A1:N1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'M.S. CHELLAMUTHU TRUST & RESEARCH FOUNDATION';
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D9488' } };
    titleCell.font = { name: 'Calibri', color: { argb: 'FFFFFFFF' }, bold: true, size: 14 };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(1).height = 40; // Increased height for neatness

    // Row 2
    sheet.mergeCells('A2:N2');
    const subTitleCell = sheet.getCell('A2');
    subTitleCell.value = `INVENTORY SUMMARY REPORT | Branch: ${headerBranchName} | As of: ${qEndDate} | Generated: ${generatedDate}`;
    subTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDFA' } };
    // Increased size, removed italic, and used much darker text for better visibility
    subTitleCell.font = { name: 'Calibri', color: { argb: 'FF042F2E' }, size: 10 };
    subTitleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(2).height = 20;

    // Row 3 (Headers - no spacer)
    sheet.getRow(3).values = [
      'S.No', 'Item Name', 'Item Code', 'Category', 'Branch', 'Location/Block', 
      'Current Stock', 'Unit', 'Unit Price (Rs.)', 'Total Value (Rs.)', 
      'Status', 'Minimum Required', 'Shortage', 'Last Updated'
    ];
    
    sheet.getRow(3).height = 35; // Increased height for neatness
    sheet.getRow(3).eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D9488' } };
      cell.font = { name: 'Calibri', color: { argb: 'FFFFFFFF' }, bold: true, size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFB0BEC5' } },
        left: { style: 'thin', color: { argb: 'FFB0BEC5' } },
        bottom: { style: 'thin', color: { argb: 'FFB0BEC5' } },
        right: { style: 'thin', color: { argb: 'FFB0BEC5' } }
      };
    });
    
    sheet.autoFilter = 'A3:N3';

    sheet.columns = [
      { key: 'sno' },
      { key: 'name' },
      { key: 'code' },
      { key: 'category' },
      { key: 'branch' },
      { key: 'block' },
      { key: 'stock' },
      { key: 'unit' },
      { key: 'price' },
      { key: 'value' },
      { key: 'status' },
      { key: 'min' },
      { key: 'shortage' },
      { key: 'updated' }
    ];

    if (items.length === 0) {
      sheet.mergeCells('A4:N4');
      const emptyCell = sheet.getCell('A4');
      emptyCell.value = 'No inventory items found for the selected filters.';
      emptyCell.alignment = { vertical: 'middle', horizontal: 'center' };
    } else {
      let sumStock = 0;
      let sumValue = 0;
      
      items.forEach((i, index) => {
        const branchName = i.branch_id === 'trust_wide' ? 'Global Unassigned' : (branchMap[i.branch_id] || 'Global');
        const blockName = blockMap[i.block_id] || '-';
        
        const stock = i.stock || 0;
        const threshold = i.threshold || 0;
        const price = i.unit_price || 0;
        const totalValue = stock * price;
        
        sumStock += stock;
        sumValue += totalValue;
        
        let status = 'In Stock';
        let shortage = '';
        if (stock === 0) {
          status = 'Out of Stock';
          shortage = threshold;
        } else if (stock <= threshold) {
          status = 'Low Stock';
          shortage = threshold - stock;
        }

        const row = sheet.addRow({
          sno: index + 1,
          name: i.name || '-',
          code: i.item_code || ('#' + (i.id ? i.id.substring(0, 8) : '')),
          category: i.category || '-',
          branch: branchName,
          block: blockName,
          stock: stock,
          unit: i.unit || '-',
          price: price,
          value: totalValue,
          status: status,
          min: threshold,
          shortage: shortage,
          updated: (i.updated_at || i.created_at) ? new Date(i.updated_at || i.created_at).toLocaleDateString('en-GB') : '-'
        });
        
        // Alignment
        row.eachCell((cell, colNumber) => {
          if (colNumber === 7 || colNumber === 9 || colNumber === 10 || colNumber === 12 || colNumber === 13) {
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
          } else {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          }
          cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF334155' } };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
          };
        });
        
        // Formatting
        row.getCell('stock').font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF334155' } };
        row.getCell('price').numFmt = '#,##0.00';
        row.getCell('value').numFmt = '#,##0.00';
        
        // Coloring logic
        if (status === 'Out of Stock') {
          row.eachCell((cell) => {
             cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
             if (cell.col === 11) cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFEF4444' } }; // column K (11) is status
          });
        } else if (status === 'Low Stock') {
          row.eachCell((cell) => {
             cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
             if (cell.col === 11) cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFF59E0B' } };
          });
        } else {
          // In stock - alternating
          row.getCell('status').font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF10B981' } };
          if ((index + 1) % 2 === 0) {
            row.eachCell((cell) => {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDFA' } };
            });
          }
        }
      });
      
      // Blank spacer
      sheet.addRow([]);
      
      // Totals Row
      const totalsRow = sheet.addRow({
        sno: 'TOTALS',
        stock: sumStock,
        value: sumValue
      });
      totalsRow.font = { bold: true };
      totalsRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      });
      totalsRow.getCell('stock').alignment = { horizontal: 'right' };
      totalsRow.getCell('value').alignment = { horizontal: 'right' };
      totalsRow.getCell('value').numFmt = '#,##0.00';
    }

    // Auto-size columns (min 5, max 45)
    sheet.columns.forEach((column) => {
      let maxLength = 5;
      column.eachCell({ includeEmpty: false }, cell => {
        // Measure from row 3 downwards (so we include the header row in width calculation)
        if (cell.row >= 3 && cell.value !== undefined && cell.value !== null) {
          const length = cell.value.toString().length;
          if (length > maxLength) {
            maxLength = length;
          }
        }
      });
      // Add generous padding (+6) to ensure the Excel filter dropdown icon doesn't cover text
      column.width = Math.min(45, maxLength + 6);
    });

    let fileNameBranch = headerBranchName.replace(/\s+/g, '_');
    const safeDate = qEndDate.replace(/[^a-zA-Z0-9-]/g, '');
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="MSC_Inventory_Summary_${fileNameBranch}_${safeDate}.xlsx"`);
    
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
    
    // Create single sheet
    const sheet = workbook.addWorksheet('Low Stock Alert', { views: [{ state: 'frozen', ySplit: 4 }] }); // freeze from row 5
    
    const branchName = req.query.branch_id ? (branchMap[req.query.branch_id] || req.query.branch_id) : 'All Branches';
    const now = new Date();
    const generatedStr = now.toLocaleDateString('en-GB') + ' ' + now.toLocaleTimeString('en-US');

    // Row 1
    sheet.mergeCells('A1:L1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'M.S. CHELLAMUTHU TRUST & RESEARCH FOUNDATION';
    titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D9488' } };
    sheet.getRow(1).height = 40; // Increased height for neatness

    // Row 2
    sheet.mergeCells('A2:L2');
    const subtitleCell = sheet.getCell('A2');
    subtitleCell.value = `LOW STOCK ALERT REPORT | Branch: ${branchName} | Generated: ${generatedStr}`;
    // Increased size, removed italic, and used much darker text for better visibility
    subtitleCell.font = { name: 'Calibri', size: 10, color: { argb: 'FF042F2E' } };
    subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDFA' } };
    sheet.getRow(2).height = 20;

    if (items.length === 0) {
      sheet.mergeCells('A3:L3');
      const noDataCell = sheet.getCell('A3');
      noDataCell.value = "All items are sufficiently stocked. No items below threshold.";
      noDataCell.alignment = { horizontal: 'center', vertical: 'middle' };
      noDataCell.font = { name: 'Calibri', italic: true };
      
  
    // Auto-size columns (min 5, max 45)
    sheet.columns.forEach((column) => {
      let maxLength = 5;
      column.eachCell({ includeEmpty: false }, cell => {
        if (cell.row >= 3 && cell.value !== undefined && cell.value !== null) {
          const length = cell.value.toString().length;
          if (length > maxLength) maxLength = length;
        }
      });
      column.width = Math.min(45, maxLength + 6);
    });

    // Auto-size columns (min 5, max 45)
    sheet.columns.forEach((column) => {
      let maxLength = 5;
      column.eachCell({ includeEmpty: false }, cell => {
        if (cell.row >= 3 && cell.value !== undefined && cell.value !== null) {
          const length = cell.value.toString().length;
          if (length > maxLength) maxLength = length;
        }
      });
      column.width = Math.min(45, maxLength + 6);
    });

    const safeBranch = branchName.replace(/[^a-zA-Z0-9-]/g, '_');
      const dateStr = now.toISOString().split('T')[0];
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="MSC_Low_Stock_Alert_${safeBranch}_${dateStr}.xlsx"`);
      await workbook.xlsx.write(res);
      return res.end();
    }

    // Row 3 Headers
    const headers = [
      'S.No', 'Item Name', 'Category', 'Branch', 'Location/Block', 
      'Current Stock', 'Minimum Required', 'Shortage', 'Unit', 
      'Default Supplier', 'Last Received Date', 'Urgency'
    ];
    const headerRow = sheet.addRow(headers);
    headerRow.height = 35; // Increased height for neatness
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D9488' } };
      cell.font = { name: 'Calibri', color: { argb: 'FFFFFFFF' }, bold: true, size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFB0BEC5' } },
        left: { style: 'thin', color: { argb: 'FFB0BEC5' } },
        bottom: { style: 'thin', color: { argb: 'FFB0BEC5' } },
        right: { style: 'thin', color: { argb: 'FFB0BEC5' } }
      };
    });
    sheet.autoFilter = 'A3:L3';

    // Process items
    let sortedItems = items.map(item => {
      const shortage = item.threshold - item.stock;
      
      // Fetch location/block
      const blocks = db.prepare('SELECT b.name FROM inventory_item_blocks ib JOIN branch_blocks b ON ib.block_id = b.id WHERE ib.item_id = ? AND ib.stock > 0').all(item.id);
      const location = blocks.length > 0 ? blocks.map(b => b.name).join(', ') : '-';
      
      // Fetch last received
      const lastRec = db.prepare("SELECT created_at FROM inventory_movements WHERE item_id = ? AND movement_type = 'IN' ORDER BY created_at DESC LIMIT 1").get(item.id);
      let lastRecDate = '-';
      if (lastRec) {
         const d = new Date(lastRec.created_at);
         lastRecDate = d.toLocaleDateString('en-GB'); // DD/MM/YYYY
      }

      return {
        ...item,
        shortage,
        location,
        lastRecDate,
        isCritical: item.stock === 0
      };
    });

    // Sort order (most critical first):
    // Out of Stock items first (stock = 0)
    // Then Low Stock items sorted by Shortage descending (biggest shortage at top)
    sortedItems.sort((a, b) => {
      if (a.isCritical && !b.isCritical) return -1;
      if (!a.isCritical && b.isCritical) return 1;
      return b.shortage - a.shortage;
    });

    let totalShortage = 0;
    let criticalCount = 0;

    sortedItems.forEach((i, idx) => {
      totalShortage += i.shortage;
      if (i.isCritical) criticalCount++;

      let urgency = "LOW — Needs Restock";
      if (i.isCritical) urgency = "CRITICAL — Out of Stock";

      const bName = i.branch_id === 'trust_wide' ? 'Global Unassigned' : (branchMap[i.branch_id] || '-');

      const row = sheet.addRow([
        idx + 1,
        i.name,
        i.category || '-',
        bName,
        i.location,
        i.stock,
        i.threshold,
        i.shortage,
        i.unit || '-',
        i.default_supplier || '-',
        i.lastRecDate,
        urgency
      ]);

      const stockCell = row.getCell(6); // Current Stock
      const shortageCell = row.getCell(8); // Shortage
      const urgencyCell = row.getCell(12); // Urgency

      row.eachCell((cell) => {
        cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF334155' } };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
      });

      if (i.isCritical) {
        // entire row red background #FEF2F2
        row.eachCell({ includeEmpty: true }, (c) => {
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
        });
        stockCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFEF4444' } }; // red text
        shortageCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFEF4444' } };
        urgencyCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFEF4444' } };
      } else {
        // entire row amber background #FFFBEB
        row.eachCell({ includeEmpty: true }, (c) => {
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
        });
        stockCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFD97706' } }; // amber text
        shortageCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFD97706' } };
        urgencyCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFD97706' } };
      }
      
      // alignment
      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      stockCell.alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
      shortageCell.alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(11).alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // Summary rows
    sheet.addRow([]); // Blank spacer
    
    const countRow = sheet.addRow([`Total Items Needing Attention: ${sortedItems.length}`]);
    countRow.getCell(1).font = { bold: true, color: { argb: 'FF0D9488' } };
    
    const critRow = sheet.addRow([`Items Completely Out of Stock: ${criticalCount}`]);
    critRow.getCell(1).font = { bold: true, color: { argb: 'FFEF4444' } };
    
    const sumRow = sheet.addRow([`Total Stock Deficit (units): ${totalShortage}`]);
    sumRow.getCell(1).font = { bold: true };

    // Auto-size columns (min 5, max 45)
    sheet.columns.forEach((column) => {
      let maxLength = 5;
      column.eachCell({ includeEmpty: false }, cell => {
        // Measure from row 3 downwards (so we include the header row in width calculation)
        if (cell.row >= 3 && cell.value !== undefined && cell.value !== null) {
          const length = cell.value.toString().length;
          if (length > maxLength) {
            maxLength = length;
          }
        }
      });
      // Add generous padding (+6) to ensure the Excel filter dropdown icon doesn't cover text
      column.width = Math.min(45, maxLength + 6);
    });

    // Auto-size columns (min 5, max 45)
    sheet.columns.forEach((column) => {
      let maxLength = 5;
      column.eachCell({ includeEmpty: false }, cell => {
        if (cell.row >= 3 && cell.value !== undefined && cell.value !== null) {
          const length = cell.value.toString().length;
          if (length > maxLength) maxLength = length;
        }
      });
      column.width = Math.min(45, maxLength + 6);
    });

    const safeBranch = branchName.replace(/[^a-zA-Z0-9-]/g, '_');
    const dateStr = now.toISOString().split('T')[0];
    const finalFilename = `MSC_Low_Stock_Alert_${safeBranch}_${dateStr}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${finalFilename}"`);
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
    
    let voidCondition = "AND (m.voided IS NULL OR m.voided = 0) AND m.reference_code NOT LIKE 'VOID-%'";
    let extraMov = '';
    if (action_type) {
      if (action_type === 'VOID') {
        voidCondition = "AND (m.voided = 1 OR m.reference_code LIKE 'VOID-%')";
      } else {
        extraMov += ' AND m.movement_type = ?'; params.push(action_type);
      }
    }
    if (block_id) { extraMov += ' AND (m.from_block_id = ? OR m.to_block_id = ?)'; params.push(block_id, block_id); }

    const blockMap = {};
    db.prepare('SELECT id, name FROM branch_blocks').all().forEach(b => blockMap[b.id] = b.name);
    
    const allItems = db.prepare('SELECT id, stock FROM inventory_items').all();
    const stockMap = {};
    allItems.forEach(i => stockMap[i.id] = i.stock);
    
    // Reverse calculate stock back to startDate for inventory_movements
    const movsAfterStart = db.prepare(`
      SELECT item_id, movement_type, quantity, branch_id, to_branch_id
      FROM inventory_movements 
      WHERE created_at >= ? AND (voided IS NULL OR voided = 0)
    `).all(startDate);
    
    movsAfterStart.forEach(m => {
      if(stockMap[m.item_id] !== undefined) {
        if(m.movement_type === 'IN') stockMap[m.item_id] -= m.quantity;
        else if(m.movement_type === 'OUT') stockMap[m.item_id] += m.quantity;
      }
    });

    // Reverse calculate stock back to startDate for deletion_requests
    const delsAfterStart = db.prepare(`
      SELECT item_id, quantity 
      FROM deletion_requests 
      WHERE status = 'approved' AND requested_at >= ?
    `).all(startDate);
    
    delsAfterStart.forEach(d => {
      if(stockMap[d.item_id] !== undefined) {
         stockMap[d.item_id] += d.quantity;
      }
    });

    const movements = db.prepare(`
      SELECT m.*, i.name as item_name, i.category, i.unit, i.item_code as i_code, i.serial_number as i_serial, i.program, b.name as branch_name, u.username 
      FROM inventory_movements m
      JOIN inventory_items i ON m.item_id = i.id
      LEFT JOIN branches b ON m.branch_id = b.id
      LEFT JOIN users u ON m.created_by = u.id
      WHERE m.created_at >= ? AND m.created_at <= ? ${voidCondition}
      AND ${condition.replace(/branch_id/g, 'm.branch_id')}
      ${extraCatProg}
      ${extraMov}
    `).all(startDate, endDate, ...params);

    const deletions = db.prepare(`
       SELECT dr.id, dr.item_id, dr.requested_at as created_at, dr.quantity, dr.branch_id, dr.reason, dr.reason_details as notes, dr.resale_price,
              i.name as item_name, i.category, i.unit, i.item_code as i_code, i.serial_number as i_serial, i.program,
              b.name as branch_name, u.username 
       FROM deletion_requests dr
       JOIN inventory_items i ON dr.item_id = i.id
       LEFT JOIN branches b ON dr.branch_id = b.id
       LEFT JOIN users u ON dr.requested_by = u.id
       WHERE dr.status = 'approved' AND dr.requested_at >= ? AND dr.requested_at <= ?
       AND ${condition.replace(/branch_id/g, 'dr.branch_id')}
       ${extraCatProg}
    `).all(startDate, endDate, ...params);

    let combined = [...movements, ...deletions.map(d => ({
        ...d,
        is_deletion: true,
        movement_type: 'OUT',
        total_price: d.resale_price || 0,
        reference_code: '-',
        party_name: '-',
        recipient_name: '-'
    }))];

    combined.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'MSC Trust Inventory System';

    const sheet = workbook.addWorksheet('Transaction Ledger', { views: [{ state: 'frozen', ySplit: 4 }] });

    const safeBranchName = req.query.branch_id ? (branchMap[req.query.branch_id] || req.query.branch_id) : 'All Branches';
    const generatedStr = new Date().toLocaleString('en-GB');
    const startStr = new Date(startDate).toLocaleDateString('en-GB');
    const endStr = new Date(endDate).toLocaleDateString('en-GB');

    sheet.mergeCells('A1:U1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'M.S. CHELLAMUTHU TRUST & RESEARCH FOUNDATION';
    titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D9488' } };
    sheet.getRow(1).height = 40;

    sheet.mergeCells('A2:U2');
    const subtitleCell = sheet.getCell('A2');
    subtitleCell.value = `MASTER TRANSACTION LEDGER | Branch: ${safeBranchName} | Period: ${startStr} to ${endStr} | Generated: ${generatedStr}`;
    subtitleCell.font = { name: 'Calibri', size: 10, color: { argb: 'FF042F2E' } };
    subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDFA' } };
    sheet.getRow(2).height = 20;

    sheet.addRow([]);
    const isFiltered = !!(req.query.action_type || req.query.block_id);
    const headers = [
      'S.No', 'Date & Time', 'Reference No.', 'Event Type', 'Item Name', 'Item Code', 
      'Category', 'Branch', 'Location/Block', 'Qty In', 'Qty Out', 
      isFiltered ? 'Running Balance (n/a — filters active)' : 'Running Balance', 
      'Unit', 'Unit Price (Rs.)', 'Total Value (Rs.)', 'From / Supplier', 'To / Recipient', 
      'Program / Scheme', 'Authorized By', 'Invoice/Bill No.', 'Remarks'
    ];

    const headerRow = sheet.addRow(headers);
    headerRow.height = 35;
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D9488' } };
      cell.font = { name: 'Calibri', color: { argb: 'FFFFFFFF' }, bold: true, size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFB0BEC5' } },
        left: { style: 'thin', color: { argb: 'FFB0BEC5' } },
        bottom: { style: 'thin', color: { argb: 'FFB0BEC5' } },
        right: { style: 'thin', color: { argb: 'FFB0BEC5' } }
      };
    });
    sheet.autoFilter = 'A4:U4';

    if (combined.length === 0) {
      sheet.mergeCells('A5:U5');
      const noData = sheet.getCell('A5');
      noData.value = "No transactions found for the selected period and filters.";
      noData.alignment = { horizontal: 'center', vertical: 'middle' };
      noData.font = { italic: true };
    } else {
      let sno = 1;
      let totalQtyIn = 0;
      let totalQtyOut = 0;
      let totalValue = 0;

      combined.forEach(m => {
        let eventType = '';
        let rowColor = null;
        let leftBorderColor = null;
        let isStrikethrough = false;
        
        const isTransfer = m.reference_code && m.reference_code.startsWith('TRF-');
        
        if (m.is_deletion) {
            stockMap[m.item_id] -= m.quantity;
            if (m.reason === 'scrap') { eventType = 'Written Off'; rowColor = 'FFFFF7ED'; leftBorderColor = 'FFF97316'; }
            else if (m.reason === 'resale') { eventType = 'Resold'; rowColor = 'FFF5F3FF'; leftBorderColor = 'FF8B5CF6'; }
            else if (m.reason === 'mistake') { eventType = 'Correction Removed'; rowColor = 'FFF1F5F9'; isStrikethrough = true; }
            else { eventType = 'Removed — Other'; rowColor = 'FFF1F5F9'; }
        } else {
            if (m.movement_type === 'IN') stockMap[m.item_id] += m.quantity;
            else if (m.movement_type === 'OUT') stockMap[m.item_id] -= m.quantity;
            
            if (m.voided) {
                eventType = 'Voided / Corrected';
                rowColor = 'FFF1F5F9';
                isStrikethrough = true;
            } else if (m.movement_type === 'IN' && !isTransfer) {
                eventType = 'Stock Received';
                rowColor = 'FFE6FAF5';
                leftBorderColor = 'FF10B981';
            } else if (m.movement_type === 'OUT' && !isTransfer) {
                eventType = 'Issued to Program';
                rowColor = 'FFFEF2F2';
                leftBorderColor = 'FFEF4444';
            } else if (m.movement_type === 'OUT' && isTransfer) {
                eventType = 'Sent to Branch';
                rowColor = 'FFFEF2F2';
                leftBorderColor = 'FFEF4444';
            } else if (m.movement_type === 'IN' && isTransfer) {
                eventType = 'Received from Branch';
                rowColor = 'FFE6FAF5';
                leftBorderColor = 'FF10B981';
            }
        }

        let fromLoc = '';
        let toLoc = '';
        if (eventType === 'Stock Received') { fromLoc = m.party_name || '-'; }
        else if (eventType === 'Sent to Branch') { toLoc = m.to_branch_id ? (branchMap[m.to_branch_id] || '-') : '-'; }
        else if (eventType === 'Received from Branch') { fromLoc = m.party_name || '-'; }
        else if (eventType === 'Issued to Program') { toLoc = m.recipient_name || m.party_name || '-'; }
        
        const qtyIn = (m.movement_type === 'IN' && !m.voided && !m.is_deletion) ? m.quantity : '';
        const qtyOut = ((m.movement_type === 'OUT' || m.is_deletion) && !m.voided) ? m.quantity : '';
        
        if (qtyIn !== '') totalQtyIn += m.quantity;
        if (qtyOut !== '') totalQtyOut += m.quantity;
        
        const val = m.total_price || 0;
        if (!m.voided) totalValue += val;

        const row = sheet.addRow([
          sno++,
          m.created_at ? formatToDDMMYYYY(m.created_at) : '-',
          m.reference_code || '-',
          eventType,
          m.item_name,
          m.i_code || '-',
          m.category || '-',
          m.branch_name || 'Global',
          m.is_deletion ? '-' : (blockMap[m.from_block_id] || blockMap[m.to_block_id] || '-'),
          qtyIn,
          qtyOut,
          isFiltered ? '' : stockMap[m.item_id],
          m.unit || '-',
          m.quantity ? (val / m.quantity).toFixed(2) : '-',
          val,
          fromLoc || '-',
          toLoc || '-',
          m.program || '-',
          m.username || '-',
          m.reference_code || '-', // Assuming Invoice/Bill No is same as ref for now
          m.notes || '-'
        ]);

        const balCell = row.getCell(12);
        balCell.font = { bold: true };
        if (stockMap[m.item_id] < 0) {
            balCell.font = { bold: true, color: { argb: 'FFEF4444' } };
        }
        
        row.getCell(14).numFmt = '#,##0.00'; // Unit Price
        row.getCell(15).numFmt = '#,##0.00'; // Total Value

        if (!rowColor) {
            rowColor = (sno % 2 !== 0) ? 'FFF8FAFC' : 'FFFFFFFF'; // Alternating (sno is already incremented)
        }

        row.eachCell((cell, colNum) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowColor } };
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
            };
            if (colNum === 1) {
                cell.border.left = leftBorderColor ? { style: 'thick', color: { argb: leftBorderColor } } : { style: 'thin', color: { argb: 'FFE2E8F0' } };
            }
            if (isStrikethrough) {
                cell.font = { strike: true, color: { argb: 'FF94A3B8' } };
            }
        });
      });

      sheet.addRow([]);
      
      const sumRow = sheet.addRow([
          'PERIOD TOTALS', '', '', '', '', '', '', '', '',
          totalQtyIn, totalQtyOut, '', '', '', totalValue, '', '', '', '', '', ''
      ]);
      sumRow.font = { bold: true };
      sumRow.getCell(10).alignment = { horizontal: 'left' };
      sumRow.getCell(11).alignment = { horizontal: 'left' };
      sumRow.getCell(15).numFmt = '#,##0.00';
    }

    sheet.columns.forEach(column => {
        let maxLen = 10;
        column.eachCell({ includeEmpty: false }, cell => {
            if (cell.row > 3) {
               const val = cell.value ? cell.value.toString() : '';
               if (val.length > maxLen) maxLen = val.length;
            }
        });
        column.width = Math.min(40, maxLen + 2);
    });

    const safeBranchNameFile = safeBranchName.replace(/[^a-zA-Z0-9-]/g, '_');
    const safeStart = startStr.replace(/\//g, '-');
    const safeEnd = endStr.replace(/\//g, '-');
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="MSC_Transaction_Ledger_${safeBranchNameFile}_${safeStart}to${safeEnd}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});


// --- GROCERIES LEDGER ---
router.get('/groceries-ledger', authenticateToken, async (req, res) => {
  try {
    const targetCategory = 'Food & nutrition';
    
    // Validate category exists
    const catCheck = db.prepare('SELECT COUNT(*) as cnt FROM inventory_items WHERE category = ?').get(targetCategory);
    const categoryExists = catCheck && catCheck.cnt > 0;

    const { startDate: qStart, endDate: qEnd, program, action_type } = req.query;
    if (!qStart || !qEnd) return res.status(400).json({ error: "Start and end dates required" });

    const startDate = new Date(qStart).toISOString();
    const end = new Date(qEnd);
    end.setHours(23, 59, 59, 999);
    const endDate = end.toISOString();

    const { condition, params } = getBranchFilterSql(req.user, req.query.branch_id);
    const branchMap = getBranchMap();
    
    let extraCatProg = ' AND i.category = ?'; 
    params.push(targetCategory);
    
    if (program) { extraCatProg += ' AND i.program = ?'; params.push(program); }
    
    let voidCondition = "AND (m.voided IS NULL OR m.voided = 0) AND m.reference_code NOT LIKE 'VOID-%'";
    let extraMov = '';
    if (action_type) {
      if (action_type === 'VOID') {
        voidCondition = "AND (m.voided = 1 OR m.reference_code LIKE 'VOID-%')";
      } else {
        extraMov += ' AND m.movement_type = ?'; params.push(action_type);
      }
    }
    
    const blockMap = {};
    db.prepare('SELECT id, name FROM branch_blocks').all().forEach(b => blockMap[b.id] = b.name);
    
    const allItems = db.prepare('SELECT id, stock FROM inventory_items WHERE category = ?').all(targetCategory);
    const stockMap = {};
    allItems.forEach(i => stockMap[i.id] = i.stock);
    
    // Reverse calculate stock back to startDate for inventory_movements
    const movsAfterStart = db.prepare(`
      SELECT m.item_id, m.movement_type, m.quantity
      FROM inventory_movements m
      JOIN inventory_items i ON m.item_id = i.id
      WHERE m.created_at >= ? AND (m.voided IS NULL OR m.voided = 0)
      AND i.category = ?
    `).all(startDate, targetCategory);
    
    movsAfterStart.forEach(m => {
      if(stockMap[m.item_id] !== undefined) {
        if(m.movement_type === 'IN') stockMap[m.item_id] -= m.quantity;
        else if(m.movement_type === 'OUT') stockMap[m.item_id] += m.quantity;
      }
    });

    // Reverse calculate stock back to startDate for deletion_requests
    const delsAfterStart = db.prepare(`
      SELECT dr.item_id, dr.quantity 
      FROM deletion_requests dr
      JOIN inventory_items i ON dr.item_id = i.id
      WHERE dr.status = 'approved' AND dr.requested_at >= ?
      AND i.category = ?
    `).all(startDate, targetCategory);
    
    delsAfterStart.forEach(d => {
      if(stockMap[d.item_id] !== undefined) {
         stockMap[d.item_id] += d.quantity;
      }
    });

    const movements = db.prepare(`
      SELECT m.*, i.name as item_name, i.category, i.unit, i.item_code as i_code, i.serial_number as i_serial, i.program, b.name as branch_name, u.username 
      FROM inventory_movements m
      JOIN inventory_items i ON m.item_id = i.id
      LEFT JOIN branches b ON m.branch_id = b.id
      LEFT JOIN users u ON m.created_by = u.id
      WHERE m.created_at >= ? AND m.created_at <= ? ${voidCondition}
      AND ${condition.replace(/branch_id/g, 'm.branch_id')}
      ${extraCatProg}
      ${extraMov}
    `).all(startDate, endDate, ...params);

    const deletions = db.prepare(`
       SELECT dr.id, dr.item_id, dr.requested_at as created_at, dr.quantity, dr.branch_id, dr.reason, dr.reason_details as notes, dr.resale_price,
              i.name as item_name, i.category, i.unit, i.item_code as i_code, i.serial_number as i_serial, i.program,
              b.name as branch_name, u.username 
       FROM deletion_requests dr
       JOIN inventory_items i ON dr.item_id = i.id
       LEFT JOIN branches b ON dr.branch_id = b.id
       LEFT JOIN users u ON dr.requested_by = u.id
       WHERE dr.status = 'approved' AND dr.requested_at >= ? AND dr.requested_at <= ?
       AND ${condition.replace(/branch_id/g, 'dr.branch_id')}
       ${extraCatProg}
    `).all(startDate, endDate, ...params);

    let combined = [...movements, ...deletions.map(d => ({
        ...d,
        is_deletion: true,
        movement_type: 'OUT',
        total_price: d.resale_price || 0,
        reference_code: '-',
        party_name: '-',
        recipient_name: '-'
    }))];

    combined.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'MSC Trust Inventory System';

    const sheet = workbook.addWorksheet('Groceries Ledger', { views: [{ state: 'frozen', ySplit: 4 }] });

    const safeBranchName = req.query.branch_id ? (branchMap[req.query.branch_id] || req.query.branch_id) : 'All Branches';
    const generatedStr = new Date().toLocaleString('en-GB');
    const startStr = new Date(startDate).toLocaleDateString('en-GB');
    const endStr = new Date(endDate).toLocaleDateString('en-GB');

    sheet.mergeCells('A1:V1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'M.S. CHELLAMUTHU TRUST & RESEARCH FOUNDATION';
    titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D9488' } };
    sheet.getRow(1).height = 40;

    sheet.mergeCells('A2:V2');
    const subtitleCell = sheet.getCell('A2');
    subtitleCell.value = `GROCERIES LEDGER | Branch: ${safeBranchName} | Period: ${startStr} to ${endStr} | Generated: ${generatedStr}`;
    subtitleCell.font = { name: 'Calibri', size: 10, color: { argb: 'FF042F2E' } };
    subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDFA' } };
    sheet.getRow(2).height = 20;

    sheet.addRow([]);

    const isFiltered = !!req.query.action_type; // Groceries doesn't have block filter explicitly in UI, but just in case
    const headers = [
      'S.No', 'Date & Time', 'Reference No.', 'Event Type', 'Item Name', 'Item Code', 
      'Category', 'Branch', 'Location/Block', 'Qty In', 'Qty Out', 
      isFiltered ? 'Running Balance (n/a — filters active)' : 'Running Balance', 
      'Unit', 'Unit Price (Rs.)', 'Total Value (Rs.)', 'From / Supplier', 'To / Recipient', 
      'Program / Scheme', 'Meal / Purpose', 'Authorized By', 'Invoice/Bill No.', 'Remarks'
    ];

    const headerRow = sheet.addRow(headers);
    headerRow.height = 35;
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D9488' } };
      cell.font = { name: 'Calibri', color: { argb: 'FFFFFFFF' }, bold: true, size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFB0BEC5' } },
        left: { style: 'thin', color: { argb: 'FFB0BEC5' } },
        bottom: { style: 'thin', color: { argb: 'FFB0BEC5' } },
        right: { style: 'thin', color: { argb: 'FFB0BEC5' } }
      };
    });
    sheet.autoFilter = 'A4:V4';

    if (combined.length === 0) {
      sheet.mergeCells('A5:V5');
      const noData = sheet.getCell('A5');
      if (!categoryExists) {
        noData.value = "No 'Food & nutrition' category found in the system. Please create this category first to track groceries.";
      } else {
        noData.value = "No transactions found for the selected period and filters.";
      }
      noData.alignment = { horizontal: 'center', vertical: 'middle' };
      noData.font = { italic: true };
    } else {
      let sno = 1;
      let totalQtyIn = 0;
      let totalQtyOut = 0;
      let totalValue = 0;

      combined.forEach(m => {
        let eventType = '';
        let rowColor = null;
        let leftBorderColor = null;
        let isStrikethrough = false;
        
        const isTransfer = m.reference_code && m.reference_code.startsWith('TRF-');
        
        if (m.is_deletion) {
            stockMap[m.item_id] -= m.quantity;
            if (m.reason === 'scrap') { eventType = 'Written Off'; rowColor = 'FFFFF7ED'; leftBorderColor = 'FFF97316'; }
            else if (m.reason === 'resale') { eventType = 'Resold'; rowColor = 'FFF5F3FF'; leftBorderColor = 'FF8B5CF6'; }
            else if (m.reason === 'mistake') { eventType = 'Correction Removed'; rowColor = 'FFF1F5F9'; isStrikethrough = true; }
            else { eventType = 'Removed — Other'; rowColor = 'FFF1F5F9'; }
        } else {
            if (m.movement_type === 'IN') stockMap[m.item_id] += m.quantity;
            else if (m.movement_type === 'OUT') stockMap[m.item_id] -= m.quantity;
            
            if (m.voided) {
                eventType = 'Voided / Corrected';
                rowColor = 'FFF1F5F9';
                isStrikethrough = true;
            } else if (m.movement_type === 'IN' && !isTransfer) {
                eventType = 'Stock Received';
                rowColor = 'FFE6FAF5';
                leftBorderColor = 'FF10B981';
            } else if (m.movement_type === 'OUT' && !isTransfer) {
                eventType = 'Issued to Program';
                rowColor = 'FFFEF2F2';
                leftBorderColor = 'FFEF4444';
            } else if (m.movement_type === 'OUT' && isTransfer) {
                eventType = 'Sent to Branch';
                rowColor = 'FFFEF2F2';
                leftBorderColor = 'FFEF4444';
            } else if (m.movement_type === 'IN' && isTransfer) {
                eventType = 'Received from Branch';
                rowColor = 'FFE6FAF5';
                leftBorderColor = 'FF10B981';
            }
        }

        let fromLoc = '';
        let toLoc = '';
        if (eventType === 'Stock Received') { fromLoc = m.party_name || '-'; }
        else if (eventType === 'Sent to Branch') { toLoc = m.to_branch_id ? (branchMap[m.to_branch_id] || '-') : '-'; }
        else if (eventType === 'Received from Branch') { fromLoc = m.party_name || '-'; }
        else if (eventType === 'Issued to Program') { toLoc = m.recipient_name || m.party_name || '-'; }
        
        const qtyIn = (m.movement_type === 'IN' && !m.voided && !m.is_deletion) ? m.quantity : '';
        const qtyOut = ((m.movement_type === 'OUT' || m.is_deletion) && !m.voided) ? m.quantity : '';
        
        if (qtyIn !== '') totalQtyIn += m.quantity;
        if (qtyOut !== '') totalQtyOut += m.quantity;
        
        const val = m.total_price || 0;
        if (!m.voided) totalValue += val;

        const mealPurpose = m.program || m.notes || '-';

        const row = sheet.addRow([
          sno++,
          m.created_at ? formatToDDMMYYYY(m.created_at) : '-',
          m.reference_code || '-',
          eventType,
          m.item_name,
          m.i_code || '-',
          m.category || '-',
          m.branch_name || 'Global',
          m.is_deletion ? '-' : (blockMap[m.from_block_id] || blockMap[m.to_block_id] || '-'),
          qtyIn,
          qtyOut,
          isFiltered ? '' : stockMap[m.item_id],
          m.unit || '-',
          m.quantity ? (val / m.quantity).toFixed(2) : '-',
          val,
          fromLoc || '-',
          toLoc || '-',
          m.program || '-',
          mealPurpose,
          m.username || '-',
          m.reference_code || '-', 
          m.notes || '-'
        ]);

        const balCell = row.getCell(12);
        balCell.font = { bold: true };
        if (stockMap[m.item_id] < 0) {
            balCell.font = { bold: true, color: { argb: 'FFEF4444' } };
        }
        
        row.getCell(14).numFmt = '#,##0.00'; 
        row.getCell(15).numFmt = '#,##0.00'; 

        if (!rowColor) {
            rowColor = (sno % 2 !== 0) ? 'FFF8FAFC' : 'FFFFFFFF'; 
        }

        row.eachCell((cell, colNum) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowColor } };
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
            };
            if (colNum === 1) {
                cell.border.left = leftBorderColor ? { style: 'thick', color: { argb: leftBorderColor } } : { style: 'thin', color: { argb: 'FFE2E8F0' } };
            }
            if (isStrikethrough) {
                cell.font = { strike: true, color: { argb: 'FF94A3B8' } };
            }
        });
      });

      sheet.addRow([]);
      
      const sumRow = sheet.addRow([
          'PERIOD TOTALS', '', '', '', '', '', '', '', '',
          totalQtyIn, totalQtyOut, '', '', '', totalValue, '', '', '', '', '', '', ''
      ]);
      sumRow.font = { bold: true };
      sumRow.getCell(10).alignment = { horizontal: 'left' };
      sumRow.getCell(11).alignment = { horizontal: 'left' };
      sumRow.getCell(15).numFmt = '#,##0.00';
    }

    sheet.columns.forEach(column => {
        let maxLen = 10;
        column.eachCell({ includeEmpty: false }, cell => {
            if (cell.row > 3) {
               const val = cell.value ? cell.value.toString() : '';
               if (val.length > maxLen) maxLen = val.length;
            }
        });
        column.width = Math.min(40, maxLen + 2);
    });

    const safeBranchNameFile = safeBranchName.replace(/[^a-zA-Z0-9-]/g, '_');
    const safeStart = startStr.replace(/\//g, '-');
    const safeEnd = endStr.replace(/\//g, '-');
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="MSC_Groceries_Ledger_${safeBranchNameFile}_${safeStart}to${safeEnd}.xlsx"`);
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

    const dataDir = process.env.DATA_DIR;
    
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
    const { startDate: qStart, endDate: qEnd, category, action_type } = req.query;
    if (!qStart || !qEnd) return res.status(400).json({ error: "Start and end dates required" });

    const startDate = new Date(qStart).toISOString();
    const end = new Date(qEnd);
    end.setHours(23, 59, 59, 999);
    const endDate = end.toISOString();

    const { condition, params } = getBranchFilterSql(req.user, req.query.branch_id);
    const branchMap = getBranchMap();
    
    const blockMap = {};
    db.prepare('SELECT id, name FROM branch_blocks').all().forEach(b => blockMap[b.id] = b.name);

    let baseCatCond = '';
    const baseParams = [...params];
    if (category) {
      baseCatCond = ' AND category = ?';
      baseParams.push(category);
    }
    
    // Check if price_history exists
    let hasPriceHistory = false;
    try {
      db.prepare('SELECT 1 FROM price_history LIMIT 1').get();
      hasPriceHistory = true;
    } catch(e) {}

    // Fetch all items to get basic info and current stock
    const allItems = db.prepare(`SELECT id, name, item_code, serial_number, category, unit, unit_price, program, branch_id, stock, created_at FROM inventory_items WHERE ${condition.replace(/branch_id/g, 'branch_id')} ${baseCatCond}`).all(...baseParams);
    
    const itemMap = {};
    allItems.forEach(i => {
      itemMap[i.id] = { ...i, reverse_stock: i.stock };
    });

    // We only care about items that have events in the selected range, OR items that were created in the selected range.
    // However, the reverse stock needs to be calculated accurately back to startDate.
    // Reverse calculation: stock at startDate = current stock - (INs after startDate) + (OUTs after startDate)

    const movsAfterStart = db.prepare(`
      SELECT m.item_id, m.movement_type, m.quantity
      FROM inventory_movements m
      WHERE m.created_at >= ? AND (m.voided IS NULL OR m.voided = 0)
    `).all(startDate);
    
    movsAfterStart.forEach(m => {
      if(itemMap[m.item_id]) {
        if(m.movement_type === 'IN') itemMap[m.item_id].reverse_stock -= m.quantity;
        else if(m.movement_type === 'OUT') itemMap[m.item_id].reverse_stock += m.quantity;
      }
    });

    const delsAfterStart = db.prepare(`
      SELECT dr.item_id, dr.quantity 
      FROM deletion_requests dr
      WHERE dr.status = 'approved' AND COALESCE(dr.reviewed_at, dr.requested_at) >= ?
    `).all(startDate);
    
    delsAfterStart.forEach(d => {
      if(itemMap[d.item_id]) {
         itemMap[d.item_id].reverse_stock += d.quantity;
      }
    });

    const combined = [];

    // Add Balance Brought Forward for items created BEFORE startDate that have transactions AFTER startDate
    // Wait, the rule is "For every item that has transactions within the selected date range but was created BEFORE the startDate".
    // We can just add it for ALL items created before startDate, and later filter out items with no events.
    // Or we can add it for all items created before startDate, then sort, and if an item only has a Balance Brought Forward event, we can strip it.
    
    allItems.forEach(i => {
      if (i.created_at < startDate) {
        combined.push({
          _item_id: i.id,
          _date_obj: new Date(new Date(startDate).getTime() - 1), // 1ms before start date to sort first
          _type_code: 'BBF',
          date: formatToDDMMYYYY(new Date(startDate).toISOString()), // formatting later
          eventType: 'Balance Brought Forward',
          item: i.name, code: i.item_code || i.serial_number || '-', category: i.category || '-',
          branch: branchMap[i.branch_id] || 'Global', loc: '-',
          qtyIn: '', qtyOut: '', bal: itemMap[i.id].reverse_stock, unit: i.unit || '-',
          price: '', val: '', from: '', to: '', prog: i.program || '-',
          auth: '', ref: '', inv: '', resalePrice: '', resaleBuyer: '', reason: '', remarks: ''
        });
      } else if (i.created_at >= startDate && i.created_at <= endDate) {
        combined.push({
          _item_id: i.id,
          _date_obj: new Date(i.created_at),
          _type_code: 'E',
          date: i.created_at,
          eventType: 'Opening Stock',
          item: i.name, code: i.item_code || i.serial_number || '-', category: i.category || '-',
          branch: branchMap[i.branch_id] || 'Global', loc: '-',
          qtyIn: i.stock, qtyOut: '', bal: null, unit: i.unit || '-',
          price: '', val: '', from: '', to: '', prog: i.program || '-',
          auth: '', ref: '', inv: '', resalePrice: '', resaleBuyer: '', reason: '', remarks: ''
        });
      }
    });

    // 2. Fetch Movements within date range
    let movCatCond = '';
    const movParamsRange = [startDate, endDate, ...params];
    if (category) {
      movCatCond = ' AND i.category = ?';
      movParamsRange.push(category);
    }
    
    // We ignore action_type filter if it's set to something non-movement? No, the prompt says applies filters: action_type.
    let movExtra = '';
    let voidCond = "AND (m.voided IS NULL OR m.voided = 0) AND m.reference_code NOT LIKE 'VOID-%'";
    
    if (action_type) {
      if (action_type === 'VOID') {
        voidCond = "AND (m.voided = 1 OR m.reference_code LIKE 'VOID-%')";
      } else {
        movExtra = ' AND m.movement_type = ?'; 
        movParamsRange.push(action_type);
      }
    }

    const movements = db.prepare(`
      SELECT m.*, i.name as item_name, i.category, i.unit, i.item_code as i_code, i.serial_number as i_serial, i.program, b.name as branch_name, u.username 
      FROM inventory_movements m
      JOIN inventory_items i ON m.item_id = i.id
      LEFT JOIN branches b ON m.branch_id = b.id
      LEFT JOIN users u ON m.created_by = u.id
      WHERE m.created_at >= ? AND m.created_at <= ? ${voidCond}
      AND ${condition.replace(/branch_id/g, 'm.branch_id')}
      ${movCatCond}
      ${movExtra}
    `).all(...movParamsRange);

    movements.forEach(m => {
      const isTransfer = (m.reference_code && m.reference_code.startsWith('TRF-')) ? true : false;
      const isVoid = (m.voided || (m.reference_code && m.reference_code.startsWith('VOID-'))) ? true : false;
      
      let evType = '';
      let typeCode = '';
      let qIn = ''; let qOut = '';
      let from = ''; let to = '';
      
      if (isVoid) {
        evType = 'Voided / Corrected'; typeCode = 'H';
        if (m.movement_type === 'IN') qIn = m.quantity; else qOut = m.quantity;
      } else if (m.movement_type === 'IN') {
        if (isTransfer) {
          evType = 'Received from Branch'; typeCode = 'D';
          qIn = m.quantity; from = m.party_name || '-';
        } else {
          evType = 'Stock Received'; typeCode = 'A';
          qIn = m.quantity; from = m.party_name || '-';
        }
      } else if (m.movement_type === 'OUT') {
        if (isTransfer) {
          evType = 'Sent to Branch'; typeCode = 'C';
          qOut = m.quantity; to = branchMap[m.to_branch_id] || m.recipient_name || '-';
        } else {
          evType = 'Issued to Program'; typeCode = 'B';
          qOut = m.quantity; to = m.recipient_name || m.party_name || '-';
        }
      }
      
      let loc = m.branch_name || 'Global';
      if (m.movement_type === 'IN' && m.to_block_id) loc += ' - ' + (blockMap[m.to_block_id] || 'Block');
      else if (m.movement_type === 'OUT' && m.from_block_id) loc += ' - ' + (blockMap[m.from_block_id] || 'Block');

      combined.push({
        _item_id: m.item_id,
        _date_obj: new Date(m.created_at),
        _type_code: typeCode,
        date: m.created_at,
        eventType: evType,
        item: m.item_name, code: m.item_code || m.i_code || m.serial_number || m.i_serial || '-', category: m.category || '-',
        branch: m.branch_name || 'Global', loc: loc,
        qtyIn: qIn, qtyOut: qOut, bal: null, unit: m.unit || '-',
        price: m.total_price ? (m.total_price / m.quantity) : '',
        val: m.total_price || '',
        from: from, to: to, prog: m.program || '-',
        auth: m.username || '-', ref: m.reference_code || '-', inv: m.invoice_no || '-',
        resalePrice: '', resaleBuyer: '', reason: '', remarks: m.notes || '-'
      });
    });

    // 3. Deletion Requests
    const deletions = db.prepare(`
      SELECT dr.*, i.name as item_name, i.category, i.unit, i.item_code as i_code, i.serial_number as i_serial, i.program, b.name as branch_name, u.username 
      FROM deletion_requests dr
      JOIN inventory_items i ON dr.item_id = i.id
      JOIN branches b ON dr.branch_id = b.id
      LEFT JOIN users u ON dr.reviewed_by = u.id
      WHERE dr.status = 'approved' AND COALESCE(dr.reviewed_at, dr.requested_at) >= ? AND COALESCE(dr.reviewed_at, dr.requested_at) <= ?
      AND ${condition.replace(/branch_id/g, 'dr.branch_id')}
      ${movCatCond}
    `).all(...movParamsRange);

    deletions.forEach(dr => {
      let evType = 'Written Off';
      if (dr.reason === 'resale') evType = 'Resold';
      else if (dr.reason === 'mistake') evType = 'Correction Removed';
      
      const dt = dr.reviewed_at || dr.requested_at;

      combined.push({
        _item_id: dr.item_id,
        _date_obj: new Date(dt),
        _type_code: 'G',
        date: dt,
        eventType: evType,
        item: dr.item_name, code: dr.i_code || dr.i_serial || '-', category: dr.category || '-',
        branch: dr.branch_name || 'Global', loc: '-',
        qtyIn: '', qtyOut: dr.quantity, bal: null, unit: dr.unit || '-',
        price: '', val: '', from: '', to: '', prog: dr.program || '-',
        auth: dr.username || '-', ref: dr.id.substring(0,8), inv: '',
        resalePrice: dr.resale_price || '', resaleBuyer: (evType === 'Resold' ? dr.reason_details : ''), 
        reason: dr.reason || '-', remarks: dr.reason_details || '-'
      });
    });

    // 4. Price History
    if (hasPriceHistory) {
      const phist = db.prepare(`
        SELECT ph.*, i.name as item_name, i.category, i.unit, i.item_code as i_code, i.serial_number as i_serial, i.program, b.name as branch_name, u.username 
        FROM price_history ph
        JOIN inventory_items i ON ph.item_id = i.id
        LEFT JOIN branches b ON ph.branch_id = b.id
        LEFT JOIN users u ON ph.changed_by = u.id
        WHERE ph.created_at >= ? AND ph.created_at <= ?
        AND ${condition.replace(/branch_id/g, 'ph.branch_id')}
        ${movCatCond}
      `).all(...movParamsRange);

      phist.forEach(ph => {
        combined.push({
          _item_id: ph.item_id,
          _date_obj: new Date(ph.created_at),
          _type_code: 'F',
          date: ph.created_at,
          eventType: 'Price Updated',
          item: ph.item_name, code: ph.i_code || ph.i_serial || '-', category: ph.category || '-',
          branch: ph.branch_name || 'Global', loc: '-',
          qtyIn: '', qtyOut: '', bal: null, unit: ph.unit || '-',
          price: ph.new_unit_price, val: '', from: '', to: '', prog: ph.program || '-',
          auth: ph.username || '-', ref: '', inv: '',
          resalePrice: '', resaleBuyer: '', reason: '', 
          remarks: `Price changed from Rs.${ph.old_unit_price||0} to Rs.${ph.new_unit_price}`
        });
      });
    }

    // Sort combined by Item Name, Item ID, Branch, then Date
    combined.sort((a, b) => {
      if (a.item !== b.item) return (a.item || '').localeCompare(b.item || '');
      if (a._item_id !== b._item_id) return (a._item_id || '').localeCompare(b._item_id || '');
      if (a.branch !== b.branch) return (a.branch || '').localeCompare(b.branch || '');
      return a._date_obj - b._date_obj;
    });

    const isFiltered = !!req.query.action_type;

    // Calculate running balance and strip orphaned BBF rows
    const finalCombined = [];
    const itemHasEvents = {};

    // First pass to identify which items have real events
    combined.forEach(ev => {
      if (ev._type_code !== 'BBF') {
        itemHasEvents[ev._item_id] = true;
      }
    });

    const currentBal = {};
    let currentGroupKey = null;
    
    combined.forEach(ev => {
      const groupKey = `${ev._item_id}-${ev.branch}`;

      if (ev._type_code === 'BBF') {
        if (itemHasEvents[ev._item_id]) {
          currentBal[groupKey] = ev.bal;
          if (groupKey !== currentGroupKey) {
             ev.isFirstInGroup = true;
             currentGroupKey = groupKey;
          }
          finalCombined.push(ev);
        }
      } else {
        if (groupKey !== currentGroupKey) {
           ev.isFirstInGroup = true;
           currentGroupKey = groupKey;
        }

        if (currentBal[groupKey] === undefined) {
          // Fallback if no BBF
          currentBal[groupKey] = 0;
        }
        
        let inQ = parseFloat(ev.qtyIn) || 0;
        let outQ = parseFloat(ev.qtyOut) || 0;
        
        if (ev._type_code !== 'H' && ev._type_code !== 'F') { // Not voided and not price update
           currentBal[groupKey] = currentBal[groupKey] + inQ - outQ;
        }
        ev.bal = currentBal[groupKey];
        
        // Date formatting
        if (ev.date) {
           ev.date = formatToDDMMYYYY(ev.date);
        }
        
        finalCombined.push(ev);
      }
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Stock Ledger');

    sheet.mergeCells('A1:X1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = "M.S. CHELLAMUTHU TRUST & RESEARCH FOUNDATION — STOCK LEDGER";
    titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D9488' } };
    sheet.getRow(1).height = 40;

    sheet.mergeCells('A2:X2');
    const subtitleCell = sheet.getCell('A2');
    const safeBranchName = branchMap[req.query.branch_id] || 'All Branches';
    const genDate = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const fmtStart = qStart.split('-').reverse().join('-');
    const fmtEnd = qEnd.split('-').reverse().join('-');
    
    subtitleCell.value = `Period: ${fmtStart} to ${fmtEnd} | Branch: ${safeBranchName} | Generated: ${genDate}`;
    subtitleCell.font = { name: 'Calibri', size: 10, color: { argb: 'FF042F2E' } };
    subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDFA' } };
    sheet.getRow(2).height = 20;

    sheet.addRow([]);

    const headers = [
      'S.No', 'Date & Time', 'Event Type', 'Item Name', 'Item Code', 'Category', 'Branch', 
      'Location/Block', 'Qty In', 'Qty Out', isFiltered ? 'Running Balance (n/a — filters active)' : 'Running Balance', 'Unit', 'Unit Price (Rs.)', 
      'Total Value (Rs.)', 'From / Supplier', 'To / Recipient', 'Program / Scheme', 
      'Authorized By', 'Reference No.', 'Invoice/Bill No.', 'Resale Price (Rs.)', 
      'Resale Buyer', 'Reason for Removal', 'Remarks'
    ];

    const headerRow = sheet.addRow(headers);
    headerRow.height = 35;
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D9488' } };
      cell.font = { name: 'Calibri', color: { argb: 'FFFFFFFF' }, bold: true, size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFB0BEC5' } },
        left: { style: 'thin', color: { argb: 'FFB0BEC5' } },
        bottom: { style: 'thin', color: { argb: 'FFB0BEC5' } },
        right: { style: 'thin', color: { argb: 'FFB0BEC5' } }
      };
    });
    sheet.views = [{ state: 'frozen', ySplit: 4 }];
    sheet.autoFilter = 'A4:X4';

    if (finalCombined.length === 0) {
      sheet.mergeCells('A5:X5');
      const noData = sheet.getCell('A5');
      noData.value = "No stock activity found for the selected period and filters.";
      noData.alignment = { horizontal: 'center', vertical: 'middle' };
      noData.font = { italic: true };
    } else {
      let sno = 1;
      let totalQtyIn = 0;
      let totalQtyOut = 0;
      let sumTotalValue = 0;
      let sumResalePrice = 0;

      finalCombined.forEach(m => {
        const row = sheet.addRow([
          (m._type_code === 'BBF' ? '-' : sno++), m.date, m.eventType, m.item, m.code, m.category, m.branch,
          m.loc, m.qtyIn, m.qtyOut, isFiltered ? '' : m.bal, m.unit, m.price, m.val, m.from, m.to,
          m.prog, m.auth, m.ref, m.inv, m.resalePrice, m.resaleBuyer, m.reason, m.remarks
        ]);

        let rowColor = 'FFFFFFFF';
        let leftBorder = 'FFB0BEC5';
        let isItalic = false;
        let isStrike = false;

        if (m._type_code === 'BBF') { rowColor = 'FFF1F5F9'; leftBorder = 'FF94A3B8'; isItalic = true; }
        else if (m._type_code === 'A') { rowColor = 'FFE6FAF5'; leftBorder = 'FF10B981'; }
        else if (m._type_code === 'B') { rowColor = 'FFFEF2F2'; leftBorder = 'FFEF4444'; }
        else if (m._type_code === 'C' || m._type_code === 'D') { rowColor = 'FFEFF6FF'; leftBorder = 'FF6366F1'; }
        else if (m._type_code === 'E') { rowColor = 'FFF5F3FF'; leftBorder = 'FF8B5CF6'; }
        else if (m._type_code === 'F') { rowColor = 'FFFEFCE8'; leftBorder = 'FFF59E0B'; }
        else if (m._type_code === 'G') {
          if (m.eventType === 'Resold') { rowColor = 'FFF5F3FF'; leftBorder = 'FF8B5CF6'; }
          else { rowColor = 'FFFFFBEB'; leftBorder = 'FFEF4444'; }
        }
        else if (m._type_code === 'H') { rowColor = 'FFF1F5F9'; isStrike = true; }

        row.eachCell((cell, colNum) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowColor } };
          cell.alignment = { vertical: 'middle', wrapText: true };
          cell.border = {
            top: { style: m.isFirstInGroup ? 'medium' : 'thin', color: { argb: m.isFirstInGroup ? 'FF0D9488' : 'FFEEEEEE' } },
            bottom: { style: 'thin', color: { argb: 'FFEEEEEE' } },
            right: { style: 'thin', color: { argb: 'FFEEEEEE' } }
          };
          if (colNum === 1) cell.border.left = { style: 'medium', color: { argb: leftBorder } };
          
          if (isStrike) cell.font = { strike: true };
          if (isItalic && m._type_code === 'BBF') cell.font = { italic: true };
          
          // Running Balance formatting
          if (colNum === 11) {
            cell.font = { bold: true, color: { argb: ((!isFiltered && m.bal < 0) ? 'FFEF4444' : 'FF000000') }, strike: isStrike };
            cell.alignment = { horizontal: 'center' };
          }
          
          if (colNum === 13 || colNum === 14 || colNum === 21) {
             cell.numFmt = '#,##0.00';
          }
        });

        if (m._type_code !== 'BBF' && m._type_code !== 'H') {
          totalQtyIn += parseFloat(m.qtyIn) || 0;
          totalQtyOut += parseFloat(m.qtyOut) || 0;
          sumTotalValue += parseFloat(m.val) || 0;
          sumResalePrice += parseFloat(m.resalePrice) || 0;
        }
      });

      sheet.addRow([]);
      const totalRow = sheet.addRow([
        'TOTALS', '', '', '', '', '', '', '', totalQtyIn, totalQtyOut, '', '', '', 
        sumTotalValue, '', '', '', '', '', '', sumResalePrice, '', '', ''
      ]);
      totalRow.font = { bold: true };
      totalRow.getCell(13).numFmt = '#,##0.00';
      totalRow.getCell(14).numFmt = '#,##0.00';
      totalRow.getCell(21).numFmt = '#,##0.00';
    }

    sheet.columns.forEach((column, i) => {
      let maxLen = 10;
      column.eachCell({ includeEmpty: true }, cell => {
        if (cell.value) {
          const len = cell.value.toString().length;
          if (len > maxLen) maxLen = len;
        }
      });
      column.width = Math.min(maxLen + 2, 40);
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    const safeBranchNameFile = branchMap[req.query.branch_id] ? branchMap[req.query.branch_id].replace(/[^a-zA-Z0-9]/g, '_') : 'All_Branches';
    res.setHeader('Content-Disposition', `attachment; filename="MSC_Stock_Ledger_${safeBranchNameFile}_${qStart}to${qEnd}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
