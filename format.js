const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'routes/reports.js');
let code = fs.readFileSync(file, 'utf8');

// 1. movements report
// Replace heights
code = code.replace(
  "sheet.getRow(1).height = 36;\n\n    sheet.mergeCells('A2:U2');\n    const subtitleCell = sheet.getCell('A2');\n    subtitleCell.value = `TRANSACTION LEDGER | Branch: ${branchName} | Period: ${startStr} to ${endStr} | Generated: ${generatedStr}`;\n    subtitleCell.font = { name: 'Calibri', size: 10, color: { argb: 'FF042F2E' } };\n    subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };\n    subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDFA' } };\n    sheet.getRow(2).height = 24;\n\n    sheet.addRow([]);\n\n    const headers = [\n      'S.No', 'Date & Time', 'Reference No.', 'Event Type', 'Item Name', 'Item Code', \n      'Category', 'Branch', 'Location/Block', 'Qty In', 'Qty Out', 'Running Balance', \n      'Unit', 'Unit Price (Rs.)', 'Total Value (Rs.)', 'From / Supplier', 'To / Recipient', \n      'Program / Scheme', 'Authorized By', 'Invoice/Bill No.', 'Remarks'\n    ];\n\n    const headerRow = sheet.addRow(headers);\n    headerRow.height = 25;",
  "sheet.getRow(1).height = 40;\n\n    sheet.mergeCells('A2:U2');\n    const subtitleCell = sheet.getCell('A2');\n    subtitleCell.value = `TRANSACTION LEDGER | Branch: ${branchName} | Period: ${startStr} to ${endStr} | Generated: ${generatedStr}`;\n    subtitleCell.font = { name: 'Calibri', size: 10, color: { argb: 'FF042F2E' } };\n    subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };\n    subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDFA' } };\n    sheet.getRow(2).height = 20;\n\n    sheet.addRow([]);\n\n    const headers = [\n      'S.No', 'Date & Time', 'Reference No.', 'Event Type', 'Item Name', 'Item Code', \n      'Category', 'Branch', 'Location/Block', 'Qty In', 'Qty Out', 'Running Balance', \n      'Unit', 'Unit Price (Rs.)', 'Total Value (Rs.)', 'From / Supplier', 'To / Recipient', \n      'Program / Scheme', 'Authorized By', 'Invoice/Bill No.', 'Remarks'\n    ];\n\n    const headerRow = sheet.addRow(headers);\n    headerRow.height = 35;"
);

const autoSizeCode = `
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

    const safeBranch =`;

code = code.replace("    const safeBranch =", autoSizeCode);


// 2. Groceries Ledger
code = code.replace(
  "sheet.getRow(1).height = 36;\n\n    sheet.mergeCells('A2:V2');\n    const subtitleCell = sheet.getCell('A2');\n    subtitleCell.value = `GROCERIES LEDGER | Branch: ${safeBranchName} | Period: ${startStr} to ${endStr} | Generated: ${generatedStr}`;\n    subtitleCell.font = { name: 'Calibri', size: 10, color: { argb: 'FF042F2E' } };\n    subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };\n    subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDFA' } };\n    sheet.getRow(2).height = 24;\n\n    sheet.addRow([]);\n\n    const headers = [\n      'S.No', 'Date & Time', 'Reference No.', 'Event Type', 'Item Name', 'Item Code', \n      'Category', 'Branch', 'Location/Block', 'Qty In', 'Qty Out', 'Running Balance', \n      'Unit', 'Unit Price (Rs.)', 'Total Value (Rs.)', 'From / Supplier', 'To / Recipient', \n      'Program / Scheme', 'Meal / Purpose', 'Authorized By', 'Invoice/Bill No.', 'Remarks'\n    ];\n\n    const headerRow = sheet.addRow(headers);\n    headerRow.height = 25;",
  "sheet.getRow(1).height = 40;\n\n    sheet.mergeCells('A2:V2');\n    const subtitleCell = sheet.getCell('A2');\n    subtitleCell.value = `GROCERIES LEDGER | Branch: ${safeBranchName} | Period: ${startStr} to ${endStr} | Generated: ${generatedStr}`;\n    subtitleCell.font = { name: 'Calibri', size: 10, color: { argb: 'FF042F2E' } };\n    subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };\n    subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDFA' } };\n    sheet.getRow(2).height = 20;\n\n    sheet.addRow([]);\n\n    const headers = [\n      'S.No', 'Date & Time', 'Reference No.', 'Event Type', 'Item Name', 'Item Code', \n      'Category', 'Branch', 'Location/Block', 'Qty In', 'Qty Out', 'Running Balance', \n      'Unit', 'Unit Price (Rs.)', 'Total Value (Rs.)', 'From / Supplier', 'To / Recipient', \n      'Program / Scheme', 'Meal / Purpose', 'Authorized By', 'Invoice/Bill No.', 'Remarks'\n    ];\n\n    const headerRow = sheet.addRow(headers);\n    headerRow.height = 35;"
);

const autoSizeCodeGroceries = `
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

    const safeBranchNameStr =`;

code = code.replace("    const safeBranchNameStr =", autoSizeCodeGroceries);

// 3. Comprehensive Export (Stock Ledger)
code = code.replace(
  "sheet.getRow(1).height = 36;\n\n    sheet.mergeCells('A2:V2');\n    const subtitleCell = sheet.getCell('A2');\n    subtitleCell.value = `STOCK LEDGER (COMPREHENSIVE) | Branch: ${bName} | Period: ${new Date(startDate).toLocaleDateString('en-GB')} to ${new Date(endDate).toLocaleDateString('en-GB')}`;\n    subtitleCell.font = { name: 'Calibri', size: 10, italic: true };\n    subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };\n    subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDFA' } };\n    sheet.getRow(2).height = 24;\n\n    sheet.addRow([]);\n\n    const headers = [\n      'S.No', 'Date & Time', 'Event Type', 'Item Name', 'Item Code', \n      'Category', 'Branch', 'Location/Block', 'Qty In', 'Qty Out', 'Running Balance', \n      'Unit', 'Unit Price (Rs.)', 'Total Value (Rs.)', 'From / Supplier', 'To / Recipient', \n      'Program / Scheme', 'Meal / Purpose', 'Authorized By', 'Reference No.', 'Invoice/Bill No.', 'Remarks'\n    ];\n\n    const headerRow = sheet.addRow(headers);\n    headerRow.height = 25;",
  "sheet.getRow(1).height = 40;\n\n    sheet.mergeCells('A2:V2');\n    const subtitleCell = sheet.getCell('A2');\n    subtitleCell.value = `STOCK LEDGER (COMPREHENSIVE) | Branch: ${bName} | Period: ${new Date(startDate).toLocaleDateString('en-GB')} to ${new Date(endDate).toLocaleDateString('en-GB')}`;\n    subtitleCell.font = { name: 'Calibri', size: 10, color: { argb: 'FF042F2E' } };\n    subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };\n    subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDFA' } };\n    sheet.getRow(2).height = 20;\n\n    sheet.addRow([]);\n\n    const headers = [\n      'S.No', 'Date & Time', 'Event Type', 'Item Name', 'Item Code', \n      'Category', 'Branch', 'Location/Block', 'Qty In', 'Qty Out', 'Running Balance', \n      'Unit', 'Unit Price (Rs.)', 'Total Value (Rs.)', 'From / Supplier', 'To / Recipient', \n      'Program / Scheme', 'Meal / Purpose', 'Authorized By', 'Reference No.', 'Invoice/Bill No.', 'Remarks'\n    ];\n\n    const headerRow = sheet.addRow(headers);\n    headerRow.height = 35;"
);

code = code.replace(
  "    sheet.columns.forEach((column, i) => {\n      let maxLen = 10;\n      column.eachCell({ includeEmpty: true }, cell => {\n        if (cell.value) {\n          const len = cell.value.toString().length;\n          if (len > maxLen) maxLen = len;\n        }\n      });\n      column.width = maxLen + 2;\n    });",
  `    // Auto-size columns (min 5, max 45)
    sheet.columns.forEach((column) => {
      let maxLength = 5;
      column.eachCell({ includeEmpty: false }, cell => {
        if (cell.row >= 3 && cell.value !== undefined && cell.value !== null) {
          const length = cell.value.toString().length;
          if (length > maxLength) maxLength = length;
        }
      });
      column.width = Math.min(45, maxLength + 6);
    });`
);

fs.writeFileSync(file, code);
console.log("Formatting injected.");
