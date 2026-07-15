const fs = require('fs');
const file = 'routes/reports.js';
let code = fs.readFileSync(file, 'utf8');

const newMovements = `// 3. Movement History Excel (Master Ledger)
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
    
    const movsAfterStart = db.prepare(\`
      SELECT item_id, movement_type, quantity, from_branch_id, to_branch_id
      FROM inventory_movements 
      WHERE created_at >= ? AND (voided IS NULL OR voided = 0) AND reference_code NOT LIKE 'VOID-%'
    \`).all(startDate);
    
    movsAfterStart.forEach(m => {
      if(stockMap[m.item_id] !== undefined) {
        if(m.movement_type === 'IN') stockMap[m.item_id] -= m.quantity;
        else if(m.movement_type === 'OUT') stockMap[m.item_id] += m.quantity;
      }
    });

    const movements = db.prepare(\`
      SELECT m.*, i.name as item_name, i.category, i.unit, i.item_code as i_code, i.serial_number as i_serial, i.program, b.name as branch_name, u.username 
      FROM inventory_movements m
      JOIN inventory_items i ON m.item_id = i.id
      LEFT JOIN branches b ON m.branch_id = b.id
      LEFT JOIN users u ON m.created_by = u.id
      WHERE m.created_at >= ? AND m.created_at <= ? AND (m.voided IS NULL OR m.voided = 0) AND m.reference_code NOT LIKE 'VOID-%'
      AND \${condition.replace(/branch_id/g, 'm.branch_id')}
      \${extraCatProg}
      \${extraMov}
      ORDER BY m.created_at ASC
    \`).all(startDate, endDate, ...params);
    
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
    res.setHeader('Content-Disposition', 'attachment; filename="Master_Ledger.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});`;

// Find the old /movements route and replace it
const startIndex = code.indexOf('// 3. Movement History Excel');
const endIndex = code.indexOf('// 4. Backup Data');

if (startIndex !== -1 && endIndex !== -1) {
  code = code.substring(0, startIndex) + newMovements + '\n\n' + code.substring(endIndex);
  fs.writeFileSync(file, code);
  console.log("Patched Movements");
} else {
  console.error("Could not find start or end index for movements route");
}
