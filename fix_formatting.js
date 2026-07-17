const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'routes/reports.js');
let code = fs.readFileSync(file, 'utf8');

// Replace all height = 36 with 40
code = code.replace(/sheet\.getRow\(1\)\.height = 36;/g, 'sheet.getRow(1).height = 40;');
// Replace all height = 24 with 20
code = code.replace(/sheet\.getRow\(2\)\.height = 24;/g, 'sheet.getRow(2).height = 20;');
// Replace all headerRow.height = 25 with 35
code = code.replace(/headerRow\.height = 25;/g, 'headerRow.height = 35;');

// Update comprehensive subtitle font
code = code.replace(
  /subtitleCell\.font = \{ name: 'Calibri', size: 10, italic: true \};/g,
  "subtitleCell.font = { name: 'Calibri', size: 10, color: { argb: 'FF042F2E' } };"
);

// Add auto-size to movements
// We will replace `const safeBranch = branchName.replace` with the auto-size block + the matched line
code = code.replace(
  /const safeBranch = branchName\.replace/g,
  `// Auto-size columns (min 5, max 45)
    sheet.columns.forEach((column) => {
      let maxLength = 5;
      column.eachCell({ includeEmpty: false }, cell => {
        if (cell.row >= 3 && cell.value !== undefined && cell.value !== null) {
          const length = cell.value.toString().length;
          if (length > maxLength) maxLength = length;
        }
      });
      column.width = Math.min(45, maxLength + 6);
    });\n\n    const safeBranch = branchName.replace`
);

// Add auto-size to groceries
code = code.replace(
  /const safeBranchNameStr = safeBranchName\.replace/g,
  `// Auto-size columns (min 5, max 45)
    sheet.columns.forEach((column) => {
      let maxLength = 5;
      column.eachCell({ includeEmpty: false }, cell => {
        if (cell.row >= 3 && cell.value !== undefined && cell.value !== null) {
          const length = cell.value.toString().length;
          if (length > maxLength) maxLength = length;
        }
      });
      column.width = Math.min(45, maxLength + 6);
    });\n\n    const safeBranchNameStr = safeBranchName.replace`
);

// Replace auto-size in comprehensive
code = code.replace(
  /sheet\.columns\.forEach\(\(column, i\) => \{\s+let maxLen = 10;\s+column\.eachCell\(\{ includeEmpty: true \}, cell => \{\s+if \(cell\.value\) \{\s+const len = cell\.value\.toString\(\)\.length;\s+if \(len > maxLen\) maxLen = len;\s+\}\s+\}\);\s+column\.width = maxLen \+ 2;\s+\}\);/g,
  `// Auto-size columns (min 5, max 45)
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
console.log("Formatting fixed.");
