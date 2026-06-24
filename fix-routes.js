const fs = require('fs');

let content = fs.readFileSync('app.js', 'utf8');

// 1. Add sectionBranches definition
content = content.replace('const sectionUsers = document.getElementById("sectionUsers");', 'const sectionUsers = document.getElementById("sectionUsers");\nconst sectionBranches = document.getElementById("sectionBranches");');

// 2. Update switchPage logic
content = content.replace(/if\(sectionUsers\) sectionUsers\.hidden = true;/g, 'if(sectionUsers) sectionUsers.hidden = true; if(sectionBranches) sectionBranches.hidden = true;');

content = content.replace('} else if (page === "users") {', `} else if (page === "branches") {
    dashboard.hidden = true;
    sectionView.hidden = true;
    if(sectionUsers) sectionUsers.hidden = true;
    if(sectionBranches) sectionBranches.hidden = false;
    if(document.getElementById('sectionRequests')) document.getElementById('sectionRequests').hidden = true;
    pageHeading.textContent = "Branch Management";
    loadBranches();
  } else if (page === "users") {`);
  
content = content.replace(/page === 'users' \? sectionUsers : sectionView;/g, "page === 'users' ? sectionUsers : page === 'branches' ? sectionBranches : sectionView;");

// 3. Add loadBranches function to end of file
const loadBranchesCode = `
// ─── Branch Management ──────────────────────────────
async function loadBranches() {
  const tbody = document.getElementById('branchesBody');
  if(!tbody) return;
  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">Loading branches...</td></tr>';
  try {
    const branches = await cachedFetch('/branches');
    tbody.innerHTML = '';
    if(branches.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--muted)">No branches found</td></tr>';
      return;
    }
    branches.forEach(b => {
      const tr = document.createElement('tr');
      tr.innerHTML = \`
        <td style="font-weight:500;color:var(--text)">\${escapeHTML(b.name)}</td>
        <td>\${escapeHTML(b.location || '-')}</td>
        <td>\${escapeHTML(b.address || '-')}</td>
        <td style="text-align:right">
          <div style="display:flex;gap:8px;justify-content:flex-end">
            <button class="icon-btn" onclick="editBranch('\${b.id}', '\${escapeHTML(b.name)}', '\${escapeHTML(b.location||'')}', '\${escapeHTML(b.address||'')}', '\${escapeHTML(b.pincode||'')}')"><i data-lucide="pencil" style="width:16px;height:16px;color:var(--text-light)"></i></button>
            <button class="icon-btn" onclick="deactivateBranch('\${b.id}')"><i data-lucide="trash-2" style="width:16px;height:16px;color:var(--danger)"></i></button>
          </div>
        </td>
      \`;
      tbody.appendChild(tr);
    });
    renderIcons(tbody);
  } catch (err) {
    tbody.innerHTML = \`<tr><td colspan="4" style="text-align:center;color:var(--danger)">Error loading branches: \${err.message}</td></tr>\`;
  }
}

// Branch modal logic
const addBranchBtn = document.getElementById('addBranchBtn');
const addBranchModalBackdrop = document.getElementById('addBranchModalBackdrop');
const closeAddBranchModal = document.getElementById('closeAddBranchModal');
const cancelAddBranchModal = document.getElementById('cancelAddBranchModal');
const addBranchForm = document.getElementById('addBranchForm');

if(addBranchBtn) addBranchBtn.addEventListener('click', () => { addBranchForm.reset(); addBranchModalBackdrop.classList.add('show'); });
if(closeAddBranchModal) closeAddBranchModal.addEventListener('click', () => addBranchModalBackdrop.classList.remove('show'));
if(cancelAddBranchModal) cancelAddBranchModal.addEventListener('click', () => addBranchModalBackdrop.classList.remove('show'));

if(addBranchForm) {
  addBranchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    try {
      const res = await fetch('/api/branches', {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token')},
        body: JSON.stringify(data)
      });
      if(!res.ok) throw new Error((await res.json()).error);
      addBranchModalBackdrop.classList.remove('show');
      showToast('Branch added successfully', 'success');
      loadBranches();
    } catch(err) {
      showToast(err.message, 'error');
    }
  });
}

const editBranchModalBackdrop = document.getElementById('editBranchModalBackdrop');
const closeEditBranchModal = document.getElementById('closeEditBranchModal');
const cancelEditBranchModal = document.getElementById('cancelEditBranchModal');
const editBranchForm = document.getElementById('editBranchForm');
let currentEditBranchId = null;

if(closeEditBranchModal) closeEditBranchModal.addEventListener('click', () => editBranchModalBackdrop.classList.remove('show'));
if(cancelEditBranchModal) cancelEditBranchModal.addEventListener('click', () => editBranchModalBackdrop.classList.remove('show'));

window.editBranch = function(id, name, location, address, pincode) {
  currentEditBranchId = id;
  document.getElementById('editBranchName').value = name;
  document.getElementById('editBranchLocation').value = location;
  document.getElementById('editBranchAddress').value = address;
  document.getElementById('editBranchPincode').value = pincode;
  editBranchModalBackdrop.classList.add('show');
};

if(editBranchForm) {
  editBranchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    try {
      const res = await fetch('/api/branches/' + currentEditBranchId, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token')},
        body: JSON.stringify(data)
      });
      if(!res.ok) throw new Error((await res.json()).error);
      editBranchModalBackdrop.classList.remove('show');
      showToast('Branch updated successfully', 'success');
      loadBranches();
    } catch(err) {
      showToast(err.message, 'error');
    }
  });
}

window.deactivateBranch = async function(id) {
  if(!confirm('Are you sure you want to delete this branch?')) return;
  try {
    const res = await fetch('/api/branches/' + id + '/deactivate', {
      method: 'POST',
      headers: {'Authorization': 'Bearer ' + localStorage.getItem('token')}
    });
    if(!res.ok) throw new Error((await res.json()).error);
    showToast('Branch deleted successfully', 'success');
    loadBranches();
  } catch(err) {
    showToast(err.message, 'error');
  }
};
`;

content += '\n' + loadBranchesCode;

fs.writeFileSync('app.js', content, 'utf8');
console.log('Routes and Branches logic appended successfully');
