const fs = require('fs');
const file = 'routes/reports.js';
let code = fs.readFileSync(file, 'utf8');

// Replace comprehensive endpoint start to extract new query params
code = code.replace(
  /const { startDate: qStart, endDate: qEnd } = req\.query;\n\s+if \(!qStart \|\| !qEnd\) return res\.status\(400\)\.json\({ error: "Start and end dates required" }\);\n\n\s+const startDate = new Date\(qStart\)\.toISOString\(\);\n\s+const end = new Date\(qEnd\);\n\s+end\.setHours\(23, 59, 59, 999\);\n\s+const endDate = end\.toISOString\(\);\n\n\s+const { condition, params } = getBranchFilterSql\(req\.user, req\.query\.branch_id\);/,
  `const { startDate: qStart, endDate: qEnd, category, program, action_type, block_id } = req.query;
    if (!qStart || !qEnd) return res.status(400).json({ error: "Start and end dates required" });

    const startDate = new Date(qStart).toISOString();
    const end = new Date(qEnd);
    end.setHours(23, 59, 59, 999);
    const endDate = end.toISOString();

    const { condition, params } = getBranchFilterSql(req.user, req.query.branch_id);
    
    let extraCatProg = '';
    if (category) { extraCatProg += ' AND i.category = ?'; params.push(category); }
    if (program) { extraCatProg += ' AND i.program = ?'; params.push(program); }
    
    let extraMov = '';
    if (action_type) { extraMov += ' AND m.movement_type = ?'; params.push(action_type); }
    if (block_id) { extraMov += ' AND (m.from_block_id = ? OR m.to_block_id = ?)'; params.push(block_id, block_id); }`
);

// Replace the invSheet query
code = code.replace(
  /const items = db\.prepare\(\`SELECT \* FROM inventory_items WHERE deleted_at IS NULL AND \$\{condition\} ORDER BY name ASC\`\)\.all\(\.\.\.params\);/,
  `const items = db.prepare(\`SELECT * FROM inventory_items i WHERE deleted_at IS NULL AND \${condition.replace(/branch_id/g, 'i.branch_id')} \${extraCatProg} ORDER BY i.name ASC\`).all(...params);`
);

// Replace movSheet columns and logic
code = code.replace(
  /const movSheet = workbook\.addWorksheet\('Movements Log'\);[\s\S]*?\/\/\s*Sheet 3: Donations \(In-Kind\)/,
  `const movSheet = workbook.addWorksheet('Movements Log');
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

    // Sheet 3: Donations (In-Kind)`
);

// Replace System Activity columns and rows
code = code.replace(
  /const actSheet = workbook\.addWorksheet\('System Activity'\);[\s\S]*?actSheet\.getRow\(1\)\.font = \{ bold: true \};/,
  `const actSheet = workbook.addWorksheet('System Activity');
    actSheet.columns = [
      { header: 'Date', key: 'date', width: 20 },
      { header: 'Branch', key: 'branch', width: 25 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Item Name', key: 'item', width: 30 },
      { header: 'Item Code', key: 'code', width: 15 },
      { header: 'Details', key: 'details', width: 50 },
      { header: 'User', key: 'user', width: 20 }
    ];
    actSheet.getRow(1).font = { bold: true };`
);

code = code.replace(
  /delReqs\.forEach\(r => actSheet\.addRow\({[\s\S]*?}\)\);/,
  `delReqs.forEach(r => actSheet.addRow({
      date: r.created_at ? r.created_at.split('T')[0] : '-',
      branch: r.branch_name || 'Global',
      type: 'Deletion Request (' + r.status + ')',
      item: r.item_name,
      code: r.item_code || '-',
      details: \`Requested deletion of \${r.quantity} units. Reason: \${r.reason}. Resale Price: \${r.resale_price}\`,
      user: r.username
    }));`
);

code = code.replace(
  /prices\.forEach\(p => actSheet\.addRow\({[\s\S]*?}\)\);/,
  `prices.forEach(p => actSheet.addRow({
      date: p.created_at ? p.created_at.split('T')[0] : '-',
      branch: p.branch_name || 'Global',
      type: 'Price Change',
      item: p.item_name,
      code: p.item_code || '-',
      details: \`Price changed from ₹\${p.old_unit_price||0} to ₹\${p.new_unit_price}. Added \${p.quantity_added} units.\`,
      user: p.username
    }));`
);

fs.writeFileSync(file, code);
console.log("Patched Comprehensive");
