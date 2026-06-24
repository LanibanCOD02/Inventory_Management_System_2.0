const fs = require('fs');

const transferLogic = `
// ─── Transfer Stock Logic ──────────────────────────────
const transferStockBtn = document.getElementById('transferStockBtn');
const transferStockModalBackdrop = document.getElementById('transferStockModalBackdrop');
const closeTransferModal = document.getElementById('closeTransferModal');
const cancelTransferModal = document.getElementById('cancelTransferModal');
const transferStockForm = document.getElementById('transferStockForm');

if (transferStockBtn) {
  transferStockBtn.addEventListener('click', async () => {
    transferStockForm.reset();
    
    // Load Items and Branches
    try {
      const [items, branches] = await Promise.all([
        cachedFetch('/inventory'),
        cachedFetch('/branches')
      ]);
      
      const itemSel = document.getElementById('transferItemSelect');
      const srcSel = document.getElementById('transferSourceBranch');
      const dstSel = document.getElementById('transferDestinationBranch');
      
      itemSel.innerHTML = '<option value="" disabled selected>Select an item...</option>' + 
        items.map(i => \`<option value="\${i.id}">\${i.name} (Stock: \${i.stock} \${i.unit})</option>\`).join('');
        
      const branchOptions = branches.map(b => \`<option value="\${b.id}">\${b.name}</option>\`).join('');
      srcSel.innerHTML = '<option value="" disabled selected>Select Source...</option>' + branchOptions;
      dstSel.innerHTML = '<option value="" disabled selected>Select Destination...</option>' + branchOptions;
      
      if (globalSelectedBranch) {
        srcSel.value = globalSelectedBranch;
      }
      
      transferStockModalBackdrop.classList.add('show');
    } catch(err) {
      showToast('Error loading data for transfer', 'error');
    }
  });
}

if(closeTransferModal) closeTransferModal.addEventListener('click', () => transferStockModalBackdrop.classList.remove('show'));
if(cancelTransferModal) cancelTransferModal.addEventListener('click', () => transferStockModalBackdrop.classList.remove('show'));

if(transferStockForm) {
  transferStockForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = new FormData(e.target);
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const ogText = submitBtn.textContent;
    submitBtn.textContent = 'Transferring...';
    submitBtn.disabled = true;
    
    try {
      const res = await fetch('/api/movements/transfer', {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token')},
        body: JSON.stringify(Object.fromEntries(d))
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      showToast('Stock transferred successfully', 'success');
      transferStockModalBackdrop.classList.remove('show');
      
      invalidateCache('/inventory');
      invalidateCache('/movements');
      await loadInventory();
    } catch(err) {
      showToast(err.message, 'error');
    } finally {
      submitBtn.textContent = ogText;
      submitBtn.disabled = false;
    }
  });
}
`;

fs.appendFileSync('app.js', '\\n' + transferLogic, 'utf8');
console.log('Transfer logic appended');
