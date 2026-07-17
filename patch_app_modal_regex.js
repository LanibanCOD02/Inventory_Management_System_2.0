const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'app.js');
let code = fs.readFileSync(file, 'utf8');

const regex = /if\s*\(defaultCategory\)\s*\{\s*const\s*catSel\s*=\s*document\.getElementById\('addItemCategory'\);\s*if\s*\(catSel\)\s*catSel\.value\s*=\s*defaultCategory;\s*\}/;

const replacementStr = `  const catSel = document.getElementById('addItemCategory');
  const catContainer = document.getElementById('addItemCategoryContainer');
  
  if (defaultCategory === 'Groceries') {
    if (catSel) {
      catSel.value = defaultCategory;
      if (!catSel.value) {
        const opt = document.createElement('option');
        opt.value = 'Groceries';
        opt.text = 'Groceries';
        catSel.appendChild(opt);
        catSel.value = 'Groceries';
      }
    }
    if (catContainer) {
      catContainer.style.display = 'none';
    }
  } else {
    if (catSel) {
      catSel.value = defaultCategory || '';
    }
    if (catContainer) {
      catContainer.style.display = '';
    }
  }`;

if (regex.test(code)) {
    code = code.replace(regex, replacementStr);
    fs.writeFileSync(file, code);
    console.log("Regex matched and file patched!");
} else {
    console.log("Regex failed to match! Try harder.");
}
