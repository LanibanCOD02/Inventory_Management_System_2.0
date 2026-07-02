const ExcelJS = require('exceljs');

async function createExcel() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Bulk Import Template');

  // Exact headers as expected by the backend
  worksheet.columns = [
    { header: 'Branch Name', key: 'branch', width: 40 },
    { header: 'Item Name', key: 'name', width: 30 },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Unit', key: 'unit', width: 15 },
    { header: 'Initial Stock', key: 'stock', width: 15 },
    { header: 'Threshold', key: 'threshold', width: 15 },
    { header: 'Unit Price', key: 'price', width: 15 },
    { header: 'Item Code', key: 'item_code', width: 20 },
    { header: 'Serial Number', key: 'serial_number', width: 25 }
  ];

  const rows = [
    // --- Updates to existing items ---
    {
      branch: 'Alagar Kovil Registered Office',
      name: 'first aid kit',
      category: 'Clinical & Pharma',
      unit: 'Boxes',
      stock: 45, // Upsert should update stock to 45
      threshold: 15, price: 50.00, item_code: 'FA-001', serial_number: 'SN-FA-1001' },
    {
      branch: 'Aruldoss Puram Rehabilitation Center',
      name: 'first aid kit',
      category: 'Clinical & Pharma',
      unit: 'Boxes',
      stock: 30, // Upsert should update stock to 30
      threshold: 10, price: 45.00, item_code: 'FA-002', serial_number: 'SN-FA-1002' },
    // --- New realistic items ---
    {
      branch: 'KK Nagar Head Office',
      name: 'A4 Printing Paper (500 sheets)',
      category: 'Stationery',
      unit: 'Packs',
      stock: 150,
      threshold: 50, price: 120.00, item_code: 'A4-500', serial_number: 'SN-PAPER-01' },
    {
      branch: 'KK Nagar Head Office',
      name: 'Blue Ink Pens',
      category: 'Stationery',
      unit: 'Boxes',
      stock: 20,
      threshold: 5, price: 10.00, item_code: 'PEN-B-01', serial_number: '' },
    {
      branch: 'Lake Area Training Institute (MSCIMHR)',
      name: 'Whiteboard Markers',
      category: 'School & Education',
      unit: 'Boxes',
      stock: 3, // Deliberately below threshold
      threshold: 10, price: 45.00, item_code: 'MRK-W-01', serial_number: '' },
    {
      branch: 'Lake Area Training Institute (MSCIMHR)',
      name: 'Training Manuals',
      category: 'Program materials',
      unit: 'Units',
      stock: 200,
      threshold: 20, price: 200.00, item_code: 'MNL-TR-01', serial_number: '' },
    {
      branch: 'Alagarkoil Administrative Office',
      name: 'Hand Sanitizer (500ml)',
      category: 'Clinical & Pharma',
      unit: 'Bottles',
      stock: 25,
      threshold: 10, price: 45.00, item_code: 'HS-500ML', serial_number: 'SN-HS-500' },
    {
      branch: 'Alagarkoil Administrative Office',
      name: 'Disinfectant Wipes',
      category: 'Clinical & Pharma',
      unit: 'Packs',
      stock: 5, // Deliberately below threshold
      threshold: 15, price: 50.00, item_code: 'DW-01', serial_number: 'SN-DW-123' },
    {
      branch: 'Alagarkoil Administrative Office',
      name: 'Stapler Pins',
      category: 'Stationery',
      unit: 'Boxes',
      stock: 50,
      threshold: 10, price: 45.00, item_code: 'STP-01', serial_number: '' },
    // --- Deliberately invalid row ---
    {
      branch: 'Chennai Branch', // Doesn't exist
      name: 'Invalid Test Item',
      category: 'Stationery',
      unit: 'Units',
      stock: 10,
      threshold: 5, price: 15.00, item_code: 'INV-01', serial_number: 'SN-INV' }
  ];

  worksheet.addRows(rows);

  await workbook.xlsx.writeFile('sample-bulk-import-test.xlsx');
  console.log('sample-bulk-import-test.xlsx generated successfully.');
}

createExcel().catch(console.error);
