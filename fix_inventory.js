const fs = require('fs');
let code = fs.readFileSync('routes/inventory.js', 'utf8');

code = code.replace(
  "{ header: 'Item Name', key: 'name', width: 30 },\n        { header: 'Category', key: 'category', width: 20 },\n        { header: 'Unit', key: 'unit', width: 15 }",
  "{ header: 'Item Name', key: 'name', width: 30 },\n        { header: 'Category', key: 'category', width: 20 },\n        { header: 'Item Code', key: 'item_code', width: 15 },\n        { header: 'Serial Number', key: 'serial_number', width: 20 },\n        { header: 'Unit', key: 'unit', width: 15 }"
);

code = code.replace(
  "rowData.name = 'Sample Item';\n      rowData.category = 'Stationery';\n      rowData.unit = 'pcs';",
  "rowData.name = 'Sample Item';\n      rowData.category = 'Stationery';\n      rowData.item_code = 'ITM-001';\n      rowData.serial_number = 'SN-001';\n      rowData.unit = 'pcs';"
);

code = code.replace(
  "if (header === 'item name') colMap['name'] = colNumber;\n      if (header === 'category') colMap['category'] = colNumber;\n      if (header === 'unit') colMap['unit'] = colNumber;",
  "if (header === 'item name') colMap['name'] = colNumber;\n      if (header === 'category') colMap['category'] = colNumber;\n      if (header === 'item code') colMap['item_code'] = colNumber;\n      if (header === 'serial number') colMap['serial_number'] = colNumber;\n      if (header === 'unit') colMap['unit'] = colNumber;"
);

code = code.replace(
  "const updateItem = db.prepare('UPDATE inventory_items SET category = ?, unit = ?, threshold = ?, stock = ?, deleted_at = NULL WHERE id = ?');",
  "const updateItem = db.prepare('UPDATE inventory_items SET category = ?, unit = ?, threshold = ?, stock = ?, deleted_at = NULL, item_code = ?, serial_number = ? WHERE id = ?');"
);

code = code.replace(
  "const insertItem = db.prepare('INSERT INTO inventory_items (id, name, category, stock, unit, threshold, branch_id, created_at, unit_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');",
  "const insertItem = db.prepare('INSERT INTO inventory_items (id, name, category, stock, unit, threshold, branch_id, created_at, unit_price, item_code, serial_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');"
);

code = code.replace(
  "const insertMovement = db.prepare('INSERT INTO inventory_movements (id, item_id, movement_type, quantity, party_name, reference_code, branch_id, created_at) VALUES (?, ?, \\'IN\\', ?, \\'Initial Stock\\', \\'BULK-IMPORT\\', ?, ?)');",
  "const insertMovement = db.prepare('INSERT INTO inventory_movements (id, item_id, movement_type, quantity, party_name, reference_code, branch_id, created_at, item_code, serial_number, total_price) VALUES (?, ?, \\'IN\\', ?, \\'Initial Stock\\', \\'BULK-IMPORT\\', ?, ?, ?, ?, ?)');"
);

code = code.replace(
  "const iName = colMap['name'] ? getVal(row.getCell(colMap['name'])).trim() : '';\n        const cat = colMap['category'] ? getVal(row.getCell(colMap['category'])).trim() : '';",
  "const iName = colMap['name'] ? getVal(row.getCell(colMap['name'])).trim() : '';\n        const cat = colMap['category'] ? getVal(row.getCell(colMap['category'])).trim() : '';\n        const iCode = colMap['item_code'] ? getVal(row.getCell(colMap['item_code'])).trim() : '';\n        const sNum = colMap['serial_number'] ? getVal(row.getCell(colMap['serial_number'])).trim() : '';"
);

code = code.replace(
  "updateItem.run(cat || null, unit, threshold, stock, existing.id);",
  "updateItem.run(cat || null, unit, threshold, stock, iCode || null, sNum || null, existing.id);"
);

code = code.replace(
  "insertItem.run(newId, iName, cat || null, stock, unit, threshold, branchId, nowStr, unitPrice);",
  "insertItem.run(newId, iName, cat || null, stock, unit, threshold, branchId, nowStr, unitPrice, iCode || null, sNum || null);"
);

code = code.replace(
  "insertMovement.run(generateUUID(), newId, stock, branchId, nowStr);",
  "insertMovement.run(generateUUID(), newId, stock, branchId, nowStr, iCode || null, sNum || null, stock * unitPrice);"
);

fs.writeFileSync('routes/inventory.js', code);
console.log('Update complete.');
