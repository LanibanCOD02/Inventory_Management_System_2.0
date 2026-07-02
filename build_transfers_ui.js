const fs = require('fs');
let appCode = fs.readFileSync('app.js', 'utf8');

const transfersLogic = `// ─── Transfer Requests Logic ─────────────────────────────
async function loadTransfers() {
  const tbody = document.getElementById('transfersTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:40px; color:var(--muted);">Loading requests...</td></tr>';
  
  try {
    const res = await fetch('/api/transfers/requests', {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('msc_token') }
    });
    if (!res.ok) throw new Error('Failed to load transfers');
    const transfers = await res.json();
    
    if (transfers.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:40px; color:var(--muted);">No transfer requests found.</td></tr>';
      return;
    }
    
    tbody.innerHTML = transfers.map(t => {
      const isPending = t.status === 'PENDING';
      const statusColor = t.status === 'APPROVED' ? 'var(--emerald)' : (t.status === 'REJECTED' ? 'var(--rose)' : 'var(--amber)');
      const badge = \`<span style="background:\${statusColor}20; color:\${statusColor}; padding:4px 8px; border-radius:12px; font-size:12px; font-weight:600;">\${t.status}</span>\`;
      
      const actions = (isPending && (globalUserRole === 'Admin' || globalUserRole === 'admin'))
        ? \`
          <button class="icon-btn" style="color:var(--emerald)" onclick="approveTransfer('\${t.id}')" title="Approve"><i data-lucide="check-circle"></i></button>
          <button class="icon-btn" style="color:var(--rose)" onclick="rejectTransfer('\${t.id}')" title="Reject"><i data-lucide="x-circle"></i></button>
        \`
        : '-';
        
      const itemName = escapeHTML(t.item_name) + 
        (t.item_code ? \`<br><small style="color:var(--muted)">\${escapeHTML(t.item_code)}\${t.serial_number ? ' / ' + escapeHTML(t.serial_number) : ''}</small>\` : '');
        
      const fromDetails = escapeHTML(t.from_branch_name) + (t.from_block_name ? \` <small style="color:var(--muted)">(&#128230; \${escapeHTML(t.from_block_name)})</small>\` : '');
      const toDetails = escapeHTML(t.to_branch_name) + (t.to_block_name ? \` <small style="color:var(--muted)">(&#128230; \${escapeHTML(t.to_block_name)})</small>\` : '');
        
      return \`
        <tr>
          <td>\${new Date(t.created_at).toLocaleDateString()}</td>
          <td>\${itemName}</td>
          <td>\${fromDetails}</td>
          <td>\${toDetails}</td>
          <td>\${t.quantity} \${escapeHTML(t.unit || '')}</td>
          <td>\${badge}</td>
          <td><div style="display:flex; gap:8px;">\${actions}</div></td>
        </tr>
      \`;
    }).join('');
    lucide.createIcons();
  } catch(err) {
    tbody.innerHTML = \`<tr><td colspan="7" style="text-align:center; padding:40px; color:var(--rose);">\${err.message}</td></tr>\`;
  }
}

window.approveTransfer = async (id) => {
  if (!confirm('Are you sure you want to approve this transfer?')) return;
  try {
    const res = await fetch(\`/api/transfers/requests/\${id}/approve\`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('msc_token') }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    showToast('Transfer approved', 'success');
    loadTransfers();
    invalidateCache('/inventory');
    invalidateCache('/movements');
  } catch (err) {
    showToast(err.message, 'error');
  }
};

window.rejectTransfer = async (id) => {
  if (!confirm('Are you sure you want to reject this transfer?')) return;
  try {
    const res = await fetch(\`/api/transfers/requests/\${id}/reject\`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('msc_token') }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    showToast('Transfer rejected', 'success');
    loadTransfers();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// ==========================================
// BULK IMPORT MODAL LOGIC`;

const switchPagePatch = `
  if (page === "dashboard") {
    dashboard.hidden = false;
    sectionView.hidden = true;
    if(sectionUsers) sectionUsers.hidden = true; if(sectionBranches) sectionBranches.hidden = true;
    if(document.getElementById('sectionRequests')) document.getElementById('sectionRequests').hidden = true;
    if(document.getElementById('sectionTransfers')) document.getElementById('sectionTransfers').hidden = true;
    pageHeading.textContent = "Inventory Dashboard";
    loadInventory();
  } else if (page === "branches") {
    dashboard.hidden = true;
    sectionView.hidden = true;
    if(sectionUsers) sectionUsers.hidden = true;
    if(sectionBranches) sectionBranches.hidden = false;
    if(document.getElementById('sectionRequests')) document.getElementById('sectionRequests').hidden = true;
    if(document.getElementById('sectionTransfers')) document.getElementById('sectionTransfers').hidden = true;
    pageHeading.textContent = "Branch Management";
    renderBranchesTable();
  } else if (page === "users") {
    dashboard.hidden = true;
    sectionView.hidden = true;
    if(sectionUsers) sectionUsers.hidden = false;
    if(document.getElementById('sectionRequests')) document.getElementById('sectionRequests').hidden = true;
    if(document.getElementById('sectionTransfers')) document.getElementById('sectionTransfers').hidden = true;
    pageHeading.textContent = "User Management";
    loadUsers();
  } else if (page === "requests") {
    dashboard.hidden = true;
    sectionView.hidden = true;
    if(sectionUsers) sectionUsers.hidden = true; if(sectionBranches) sectionBranches.hidden = true;
    if(document.getElementById('sectionRequests')) document.getElementById('sectionRequests').hidden = false;
    if(document.getElementById('sectionTransfers')) document.getElementById('sectionTransfers').hidden = true;
    pageHeading.textContent = "Deletion Requests";
    loadRequests();
  } else if (page === "transfers") {
    dashboard.hidden = true;
    sectionView.hidden = true;
    if(sectionUsers) sectionUsers.hidden = true; if(sectionBranches) sectionBranches.hidden = true;
    if(document.getElementById('sectionRequests')) document.getElementById('sectionRequests').hidden = true;
    if(document.getElementById('sectionTransfers')) document.getElementById('sectionTransfers').hidden = false;
    pageHeading.textContent = "Transfer Requests";
    loadTransfers();
  } else {
    dashboard.hidden = true;
    if(sectionUsers) sectionUsers.hidden = true; if(sectionBranches) sectionBranches.hidden = true;
    if(document.getElementById('sectionRequests')) document.getElementById('sectionRequests').hidden = true;
    if(document.getElementById('sectionTransfers')) document.getElementById('sectionTransfers').hidden = true;
    sectionView.hidden = false;`;

appCode = appCode.replace(/\/\/ ==========================================\n\/\/ BULK IMPORT MODAL LOGIC/, transfersLogic);

const switchPageRegex = /if \(page === "dashboard"\) \{[\s\S]*?sectionView\.hidden = false;/;
appCode = appCode.replace(switchPageRegex, switchPagePatch);

fs.writeFileSync('app.js', appCode);
console.log('Successfully added transfer requests UI logic');
