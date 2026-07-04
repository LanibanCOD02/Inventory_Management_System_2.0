const ExcelJS = require('exceljs');

async function createSample(filename) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Bulk Import Template');
  
  const cols = [
    { header: 'Branch Name', key: 'branch', width: 25 },
    { header: 'Block', key: 'block', width: 20 },
    { header: 'Item Name', key: 'name', width: 30 },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Unit', key: 'unit', width: 15 },
    { header: 'Initial Stock', key: 'stock', width: 15 },
    { header: 'Threshold', key: 'threshold', width: 15 },
    { header: 'Unit Price', key: 'price', width: 15 },
    { header: 'Item Code', key: 'item_code', width: 20 },
    { header: 'Serial Number', key: 'serial_number', width: 25 }
  ];
  worksheet.columns = cols;
  
  // Item 1: Assigned to Block A
  worksheet.addRow({
    branch: 'Main Branch',
    block: 'Block A',
    name: 'Standard Desk',
    category: 'Furniture',
    unit: 'pcs',
    stock: 20,
    threshold: 5,
    price: 150.00,
    item_code: 'FURN-001',
    serial_number: ''
  });

  // Item 1: Assigned to Block B in the same branch
  worksheet.addRow({
    branch: 'Main Branch',
    block: 'Block B',
    name: 'Standard Desk', // Same item name!
    category: 'Furniture',
    unit: 'pcs',
    stock: 15, // 15 here, 20 in Block A = 35 total in branch
    threshold: 5,
    price: 150.00,
    item_code: 'FURN-001',
    serial_number: ''
  });

  // Item 2: Secondary Branch, Block X
  worksheet.addRow({
    branch: 'Secondary Branch',
    block: 'Block X',
    name: 'Whiteboard',
    category: 'Stationery',
    unit: 'pcs',
    stock: 5,
    threshold: 2,
    price: 80.00,
    item_code: 'STAT-002',
    serial_number: ''
  });

  // Item 2: Secondary Branch, Block Y
  worksheet.addRow({
    branch: 'Secondary Branch',
    block: 'Block Y',
    name: 'Whiteboard',
    category: 'Stationery',
    unit: 'pcs',
    stock: 10,
    threshold: 2,
    price: 80.00,
    item_code: 'STAT-002',
    serial_number: ''
  });

  // Item 3: Secondary Branch, Block Z
  worksheet.addRow({
    branch: 'Secondary Branch',
    block: 'Block Z',
    name: 'Whiteboard',
    category: 'Stationery',
    unit: 'pcs',
    stock: 25,
    threshold: 2,
    price: 80.00,
    item_code: 'STAT-002',
    serial_number: ''
  });

  // Item 4: Main Branch, General stock (No block)
  worksheet.addRow({
    branch: 'Main Branch',
    block: '',
    name: 'Stapler',
    category: 'Stationery',
    unit: 'pcs',
    stock: 45,
    threshold: 10,
    price: 15.00,
    item_code: 'STAT-003',
    serial_number: ''
  });

  // Item 5: Alagarkoil Administrative Office, Block A
  worksheet.addRow({
    branch: 'Alagarkoil Administrative Office',
    block: 'Block A',
    name: 'First aid kit',
    category: 'Medical',
    unit: 'boxes',
    stock: 120,
    threshold: 20,
    price: 450.00,
    item_code: 'MED-001',
    serial_number: ''
  });

  // Item 5: Alagarkoil Administrative Office, Block B
  worksheet.addRow({
    branch: 'Alagarkoil Administrative Office',
    block: 'Block B',
    name: 'First aid kit',
    category: 'Medical',
    unit: 'boxes',
    stock: 50,
    threshold: 20,
    price: 450.00,
    item_code: 'MED-001',
    serial_number: ''
  });

  // Item 6: Alagarkoil Administrative Office, Block C
  worksheet.addRow({
    branch: 'Alagarkoil Administrative Office',
    block: 'Block C',
    name: 'First aid kit',
    category: 'Medical',
    unit: 'boxes',
    stock: 30,
    threshold: 20,
    price: 450.00,
    item_code: 'MED-001',
    serial_number: ''
  });
  
  await workbook.xlsx.writeFile(filename);
  console.log(`Created ${filename}`);
}

async function main() {
  await createSample('sample-bulk-import-test-v2.xlsx');
  await createSample('test-v2.xlsx');
}

main();
