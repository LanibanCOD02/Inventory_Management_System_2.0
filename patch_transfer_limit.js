const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'app.js');
let code = fs.readFileSync(file, 'utf8');

// Replace 1
code = code.replace(
  '.map(i => `<option value="${i.id}">${i.name} (Stock: ${i.stock} ${i.unit || \'\'})</option>`).join(\'\');',
  '.map(i => `<option value="${i.id}" data-stock="${i.stock}">${i.name} (Stock: ${i.stock} ${i.unit || \'\'})</option>`).join(\'\');'
);

// Replace 2
code = code.replace(
  '.map(i => `<option value="${i.id}">${i.name} (Stock: ${i.stock} ${i.unit})</option>`).join(\'\');',
  '.map(i => `<option value="${i.id}" data-stock="${i.stock}">${i.name} (Stock: ${i.stock} ${i.unit})</option>`).join(\'\');'
);

const evtListener = `
// Transfer limit logic
document.addEventListener('DOMContentLoaded', () => {
  const transferItemSelect = document.getElementById('transferItemSelect');
  const transferQuantityInput = document.getElementById('transferQuantityInput');

  if (transferItemSelect && transferQuantityInput) {
    transferItemSelect.addEventListener('change', (e) => {
      const selectedOption = e.target.options[e.target.selectedIndex];
      if (selectedOption && selectedOption.dataset.stock !== undefined) {
        transferQuantityInput.max = selectedOption.dataset.stock;
        if (Number(transferQuantityInput.value) > Number(selectedOption.dataset.stock)) {
          transferQuantityInput.value = selectedOption.dataset.stock;
        }
      } else {
        transferQuantityInput.removeAttribute('max');
      }
    });

    transferQuantityInput.addEventListener('input', (e) => {
      if (e.target.max !== '' && Number(e.target.value) > Number(e.target.max)) {
        e.target.value = e.target.max;
      }
    });
  }
});
`;

code += "\n" + evtListener;

fs.writeFileSync(file, code);
console.log("Patched app.js successfully.");
