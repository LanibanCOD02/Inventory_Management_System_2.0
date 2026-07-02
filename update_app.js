const fs = require('fs');

const appJsPath = 'app.js';
let content = fs.readFileSync(appJsPath, 'utf8');

// Step 1: Define global variables and rewriting loadSuppliers / loadPrograms
const loadSuppliersTarget = `async function loadSuppliers() {
  try {
    const data = await cachedFetch('/suppliers');
    populateDatalist('supplierDatalist', data);
    // also populate movement select
    const select = document.getElementById('movementSupplierSelect');
    if (select) {
      select.innerHTML = \`<option value="">Select supplier...</option>\` +
        data.map(s => \`<option value="\${s.name}">\${s.name}</option>\`).join('');
    }
  } catch(err) { console.error('Failed to load suppliers:', err); }
}

async function loadPrograms() {
  try {
    const data = await cachedFetch('/programs');
    populateDatalist('programDatalist', data);
    const select = document.getElementById('movementProgramSelect');
    if (select) {
      select.innerHTML = \`<option value="">Select program...</option>\` +
        data.map(p => \`<option value="\${p.name}">\${p.name}</option>\`).join('');
    }
  } catch(err) { console.error('Failed to load programs:', err); }
}`;

const loadSuppliersReplacement = `let globalSuppliers = [];
let globalPrograms = [];

window.updateSupplierDropdowns = function(branchId = null) {
  const data = branchId ? globalSuppliers.filter(s => String(s.branch_id) === String(branchId)) : globalSuppliers;
  populateDatalist('supplierDatalist', data);
  const select = document.getElementById('movementSupplierSelect');
  if (select) {
    select.innerHTML = \`<option value="">Select supplier...</option>\` +
      data.map(s => \`<option value="\${s.name}">\${s.name}</option>\`).join('');
  }
};

window.updateProgramDropdowns = function(branchId = null) {
  const data = branchId ? globalPrograms.filter(p => String(p.branch_id) === String(branchId)) : globalPrograms;
  populateDatalist('programDatalist', data);
  const select = document.getElementById('movementProgramSelect');
  if (select) {
    select.innerHTML = \`<option value="">Select program...</option>\` +
      data.map(p => \`<option value="\${p.name}">\${p.name}</option>\`).join('');
  }
};

async function loadSuppliers() {
  try {
    globalSuppliers = await cachedFetch('/suppliers');
    window.updateSupplierDropdowns();
  } catch(err) { console.error('Failed to load suppliers:', err); }
}

async function loadPrograms() {
  try {
    globalPrograms = await cachedFetch('/programs');
    window.updateProgramDropdowns();
  } catch(err) { console.error('Failed to load programs:', err); }
}`;

content = content.replace(loadSuppliersTarget, loadSuppliersReplacement);


// Step 2: Add Item form branch change listener
// Add an event listener to addItemBranch globally
const addItemBranchListenerTarget = `    if(globalSelect) {
      globalSelect.onchange = async (e) => {`;
const addItemBranchListenerReplacement = `    if (addItemBranch) {
      addItemBranch.addEventListener('change', (e) => {
        window.updateSupplierDropdowns(e.target.value);
        window.updateProgramDropdowns(e.target.value);
        if (document.getElementById('addItemSupplierInput')) document.getElementById('addItemSupplierInput').value = '';
        if (document.getElementById('addItemProgramInput')) document.getElementById('addItemProgramInput').value = '';
      });
    }
    if (editItemBranch) {
      editItemBranch.addEventListener('change', (e) => {
        window.updateSupplierDropdowns(e.target.value);
        window.updateProgramDropdowns(e.target.value);
        if (document.getElementById('editItemSupplierInput')) document.getElementById('editItemSupplierInput').value = '';
        if (document.getElementById('editItemProgramInput')) document.getElementById('editItemProgramInput').value = '';
      });
    }
    if(globalSelect) {
      globalSelect.onchange = async (e) => {`;

content = content.replace(addItemBranchListenerTarget, addItemBranchListenerReplacement);

// Step 3: Populate Edit Item form with initial branch suppliers
const editItemBtnTarget = `    const branchInput = document.getElementById('editItemBranch');
    if (branchInput && item.branch_id) {
      branchInput.value = item.branch_id;
    }`;
const editItemBtnReplacement = `    const branchInput = document.getElementById('editItemBranch');
    if (branchInput && item.branch_id) {
      branchInput.value = item.branch_id;
      window.updateSupplierDropdowns(item.branch_id);
      window.updateProgramDropdowns(item.branch_id);
    } else {
      window.updateSupplierDropdowns();
      window.updateProgramDropdowns();
    }`;

content = content.replace(editItemBtnTarget, editItemBtnReplacement);

// Step 4: Populate Add Item form with initial branch suppliers
const addItemBtnTarget = `function openModal() {
  document.getElementById("addItemForm").reset();
  if (globalSelectedBranch) {
    const sel = document.getElementById('addItemBranch');
    if (sel) sel.value = globalSelectedBranch;
  }
  modal.classList.add("active");`;

const addItemBtnReplacement = `function openModal() {
  document.getElementById("addItemForm").reset();
  if (globalSelectedBranch) {
    const sel = document.getElementById('addItemBranch');
    if (sel) sel.value = globalSelectedBranch;
  }
  
  const sel = document.getElementById('addItemBranch');
  window.updateSupplierDropdowns(sel?.value);
  window.updateProgramDropdowns(sel?.value);
  
  modal.classList.add("active");`;

content = content.replace(addItemBtnTarget, addItemBtnReplacement);

// Step 5: Update Movement Modal branch listener to also update Suppliers/Programs
const movementBranchListenerTarget = `  const addMovementBranch = document.getElementById('addMovementBranch');
  if (addMovementBranch) {
    addMovementBranch.addEventListener('change', () => {
      updateMovementItemDropdown();
      document.getElementById("movementItemSelect").value = "";
    });
  }`;
const movementBranchListenerReplacement = `  const addMovementBranch = document.getElementById('addMovementBranch');
  if (addMovementBranch) {
    addMovementBranch.addEventListener('change', () => {
      updateMovementItemDropdown();
      document.getElementById("movementItemSelect").value = "";
      
      const branchId = addMovementBranch.value;
      window.updateSupplierDropdowns(branchId);
      window.updateProgramDropdowns(branchId);
      if (document.getElementById('movementSupplierSelect')) document.getElementById('movementSupplierSelect').value = '';
      if (document.getElementById('movementProgramSelect')) document.getElementById('movementProgramSelect').value = '';
    });
  }`;

content = content.replace(movementBranchListenerTarget, movementBranchListenerReplacement);

// Step 6: Update Movement Modal to update Suppliers/Programs when opening
const movementOpenModalTarget = `    // Populate filtered items after branch has been set
    updateMovementItemDropdown();

    movementModal.classList.add("active");`;

const movementOpenModalReplacement = `    // Populate filtered items after branch has been set
    updateMovementItemDropdown();
    const branchId = bSel ? bSel.value : null;
    window.updateSupplierDropdowns(branchId);
    window.updateProgramDropdowns(branchId);

    movementModal.classList.add("active");`;

content = content.replace(movementOpenModalTarget, movementOpenModalReplacement);

fs.writeFileSync(appJsPath, content);
console.log("Updated app.js successfully!");
