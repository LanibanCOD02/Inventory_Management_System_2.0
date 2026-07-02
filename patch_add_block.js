const fs = require('fs');
let appCode = fs.readFileSync('app.js', 'utf8');

const addBlockLogic = `
window.openAddBlockModal = (branchId) => {
  document.getElementById('addBlockBranchId').value = branchId;
  document.getElementById('addBlockName').value = '';
  document.getElementById('addBlockDescription').value = '';
  openModal('addBlockModalBackdrop');
};

const addBlockForm = document.getElementById('addBlockForm');
if (addBlockForm) {
  addBlockForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const branchId = document.getElementById('addBlockBranchId').value;
    const name = document.getElementById('addBlockName').value;
    const description = document.getElementById('addBlockDescription').value;
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="spinner" style="border-color:white;border-top-color:transparent;width:14px;height:14px"></span>';
    submitBtn.disabled = true;

    try {
      const res = await fetch(\`/api/branches/\${branchId}/blocks\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('msc_token')
        },
        body: JSON.stringify({ name, description })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create block');
      
      showToast('Block created successfully', 'success');
      closeModal('addBlockModalBackdrop');
      
      // Invalidate the blocks cache and re-render
      invalidateCache(\`/branches/\${branchId}/blocks\`);
      renderBranchesTable();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  });
}
`;

appCode += "\n" + addBlockLogic;
fs.writeFileSync('app.js', appCode);
console.log('Successfully added Add Block logic');
