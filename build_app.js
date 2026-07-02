const fs = require('fs');

let appCode = fs.readFileSync('app.js', 'utf8');

const newTransferLogic = `// ─── Transfer Stock Logic ──────────────────────────────
const transferStockModalBackdrop = document.getElementById('transferStockModalBackdrop');
const closeTransferModal = document.getElementById('closeTransferModal');
const cancelTransferModal = document.getElementById('cancelTransferModal');
const transferStockForm = document.getElementById('transferStockForm');
const btnTransferBranch = document.getElementById('btnTransferBranch');
const btnTransferBlock = document.getElementById('btnTransferBlock');
const transferMode = document.getElementById('transferMode');
const transferFromBlockContainer = document.getElementById('transferFromBlockContainer');
const transferToBlockContainer = document.getElementById('transferToBlockContainer');
const transferSourceBranch = document.getElementById('transferSourceBranch');
const transferDestinationBranch = document.getElementById('transferDestinationBranch');
const transferFromBlock = document.getElementById('transferFromBlock');
const transferToBlock = document.getElementById('transferToBlock');

let allTransferBranches = [];

function setTransferMode(mode) {
  transferMode.value = mode;
  if (mode === 'BRANCH') {
    btnTransferBranch.classList.add('active');
    btnTransferBranch.style.background = 'var(--white)';
    btnTransferBranch.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
    btnTransferBranch.style.color = 'var(--text)';
    
    btnTransferBlock.classList.remove('active');
    btnTransferBlock.style.background = 'transparent';
    btnTransferBlock.style.boxShadow = 'none';
    btnTransferBlock.style.color = 'var(--muted)';
    
    transferFromBlockContainer.style.display = 'none';
    transferToBlockContainer.style.display = 'none';
    transferFromBlock.removeAttribute('required');
    transferToBlock.removeAttribute('required');
    
    updateDestinationBranchDropdown();
  } else {
    btnTransferBlock.classList.add('active');
    btnTransferBlock.style.background = 'var(--white)';
    btnTransferBlock.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
    btnTransferBlock.style.color = 'var(--text)';
    
    btnTransferBranch.classList.remove('active');
    btnTransferBranch.style.background = 'transparent';
    btnTransferBranch.style.boxShadow = 'none';
    btnTransferBranch.style.color = 'var(--muted)';
    
    transferFromBlockContainer.style.display = 'flex';
    transferFromBlockContainer.style.flexDirection = 'column';
    transferToBlockContainer.style.display = 'flex';
    transferToBlockContainer.style.flexDirection = 'column';
    transferFromBlock.setAttribute('required', 'true');
    transferToBlock.setAttribute('required', 'true');
    
    updateDestinationBranchDropdown();
  }
}

function updateDestinationBranchDropdown() {
  const currentSource = transferSourceBranch.value;
  const mode = transferMode.value;
  
  let options = '<option value="" disabled selected>Select Destination...</option>';
  allTransferBranches.forEach(b => {
    if (mode === 'BRANCH' && b.id === currentSource) {
      // Hide current branch for branch-to-branch transfers
      return;
    }
    const isCurrent = (b.id === currentSource);
    options += \`<option value="\${b.id}" \${isCurrent && mode === 'BLOCK' ? 'selected' : ''}>\${escapeHTML(b.name)}\${isCurrent ? ' (This branch)' : ''}</option>\`;
  });
  
  transferDestinationBranch.innerHTML = options;
}

if (btnTransferBranch && btnTransferBlock) {
  btnTransferBranch.addEventListener('click', () => setTransferMode('BRANCH'));
  btnTransferBlock.addEventListener('click', () => setTransferMode('BLOCK'));
}

if (transferSourceBranch) {
  transferSourceBranch.addEventListener('change', async () => {
    updateDestinationBranchDropdown();
    // Load blocks for source
    if (transferMode.value === 'BLOCK') {
      try {
        const blocks = await cachedFetch('/branches/' + transferSourceBranch.value + '/blocks');
        transferFromBlock.innerHTML = '<option value="">Select Source Block...</option>' + blocks.map(b => \`<option value="\${b.id}">\${escapeHTML(b.name)}</option>\`).join('');
      } catch (e) {}
    }
  });
}

if (transferDestinationBranch) {
  transferDestinationBranch.addEventListener('change', async () => {
    if (transferMode.value === 'BLOCK') {
      try {
        const blocks = await cachedFetch('/branches/' + transferDestinationBranch.value + '/blocks');
        transferToBlock.innerHTML = '<option value="">Select Destination Block...</option>' + blocks.map(b => \`<option value="\${b.id}">\${escapeHTML(b.name)}</option>\`).join('');
      } catch (e) {}
    }
  });
}

window.openTransferModal = async (branchId, branchName) => {
  if (transferStockForm) transferStockForm.reset();
  setTransferMode('BRANCH');
  
  try {
    const [items, branches] = await Promise.all([
      cachedFetch('/inventory'),
      cachedFetch('/branches')
    ]);
    
    allTransferBranches = branches;
    
    const itemSel = document.getElementById('transferItemSelect');
    itemSel.innerHTML = '<option value="" disabled selected>Select an item...</option>' + 
      items.filter(i => !branchId || i.branch_id === branchId).map(i => \`<option value="\${i.id}">\${i.name} (Stock: \${i.stock} \${i.unit})</option>\`).join('');
      
    transferSourceBranch.innerHTML = '<option value="" disabled selected>Select Source...</option>' + branches.map(b => \`<option value="\${b.id}">\${b.name}</option>\`).join('');
    
    if (branchId) {
      transferSourceBranch.value = branchId;
    } else if (globalSelectedBranch) {
      transferSourceBranch.value = globalSelectedBranch;
    }
    
    updateDestinationBranchDropdown();
    transferSourceBranch.dispatchEvent(new Event('change'));
    transferDestinationBranch.dispatchEvent(new Event('change'));
    
    transferStockModalBackdrop.classList.add('active');
  } catch(err) {
    showToast('Error loading data for transfer', 'error');
  }
};

const transferStockBtn = document.getElementById('transferStockBtn');
if (transferStockBtn) {
  transferStockBtn.addEventListener('click', () => {
    window.openTransferModal(null, null);
  });
}

if(closeTransferModal) closeTransferModal.addEventListener('click', () => transferStockModalBackdrop.classList.remove('active'));
if(cancelTransferModal) cancelTransferModal.addEventListener('click', () => transferStockModalBackdrop.classList.remove('active'));

if(transferStockForm) {
  transferStockForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = new FormData(e.target);
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const ogText = submitBtn.textContent;
    submitBtn.textContent = 'Transferring...';
    submitBtn.disabled = true;
    
    try {
      const res = await fetch('/api/branches/transfer', {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('msc_token')},
        body: JSON.stringify(Object.fromEntries(d))
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      showToast(data.message || 'Stock transferred successfully', 'success');
      transferStockModalBackdrop.classList.remove('active');
      
      invalidateCache('/inventory');
      invalidateCache('/movements');
      await loadInventory();
      // Load transfers if page is active
      if (document.getElementById('sectionTransfers').style.display !== 'none') {
        loadTransfers();
      }
    } catch(err) {
      showToast(err.message, 'error');
    } finally {
      submitBtn.textContent = ogText;
      submitBtn.disabled = false;
    }
  });
}
`;

const regex = /\/\/ ─── Transfer Stock Logic ──────────────────────────────[\s\S]*?\/\/ ==========================================\n\/\/ BULK IMPORT MODAL LOGIC/;
if (appCode.match(regex)) {
  appCode = appCode.replace(regex, newTransferLogic + "\n// ==========================================\n// BULK IMPORT MODAL LOGIC");
  fs.writeFileSync('app.js', appCode);
  console.log('Successfully updated transfer logic in app.js');
} else {
  console.log('Failed to find matching block in app.js');
}
