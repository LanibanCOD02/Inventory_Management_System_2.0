const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'app.js');
let code = fs.readFileSync(file, 'utf8');

const targetStr = `  if (defaultCategory) {
    const catSel = document.getElementById('addItemCategory');
    if (catSel) catSel.value = defaultCategory;
  }`;

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

code = code.replace(targetStr, replacementStr);
fs.writeFileSync(file, code);
console.log("app.js patched for category dropdown.");
