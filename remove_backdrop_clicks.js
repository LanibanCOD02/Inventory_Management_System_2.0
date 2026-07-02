const fs = require('fs');

const appJsPath = 'app.js';
let content = fs.readFileSync(appJsPath, 'utf8');

const regexesToReplace = [
  // infoModalBackdrop
  /(\s*)(infoModalBackdrop\.addEventListener\('click',\s*e\s*=>\s*\{\s*if\s*\(e\.target\s*===\s*infoModalBackdrop\)\s*closeInfoModal\(\);\s*\}\);)/g,
  
  // confirmModalBackdrop
  /(\s*)(backdrop\.addEventListener\('click',\s*e\s*=>\s*\{\s*if\s*\(e\.target\s*===\s*backdrop\)\s*close\(\);\s*\},\s*\{\s*once:\s*true\s*\}\);)/g,
  
  // itemDetailModalBackdrop
  /(\s*)(document\.getElementById\("itemDetailModalBackdrop"\)\.addEventListener\("click",\s*e\s*=>\s*\{\s*if\s*\(e\.target\s*===\s*document\.getElementById\("itemDetailModalBackdrop"\)\)\s*closeItemDetail\(\);\s*\}\);)/g,
  
  // editItemModalBackdrop
  /(\s*)(if\(editModal\)\s*editModal\.addEventListener\("click",\s*e\s*=>\s*\{\s*if\s*\(e\.target\s*===\s*editModal\)\s*closeEditModalFn\(\);\s*\}\);)/g,
  
  // documentViewerModalBackdrop
  /(\s*)(document\.getElementById\("documentViewerModalBackdrop"\)\.addEventListener\("click",\s*e\s*=>\s*\{\s*if\s*\(e\.target\s*===\s*document\.getElementById\("documentViewerModalBackdrop"\)\)\s*closeDocumentViewer\(\);\s*\}\);)/g,
  
  // addEntityModalBackdrop
  /(\s*)(modal\.addEventListener\("click",\s*e\s*=>\s*\{\s*if\s*\(e\.target\s*===\s*modal\)\s*modal\.classList\.remove\("active"\);\s*\}\);)/g,
  
  // editEntityModalBackdrop
  /(\s*)(editEntityModal\.addEventListener\("click",\s*e\s*=>\s*\{\s*if\s*\(e\.target\s*===\s*editEntityModal\)\s*editEntityModal\.classList\.remove\("active"\);\s*\}\);)/g,
  
  // addUserModalBackdrop
  /(\s*)(addUserModal\.addEventListener\("click",\s*e\s*=>\s*\{\s*if\s*\(e\.target\s*===\s*addUserModal\)\s*addUserModal\.classList\.remove\("active"\);\s*\}\);)/g,
  
  // editUserModalBackdrop
  /(\s*)(editUserModal\.addEventListener\("click",\s*e\s*=>\s*\{\s*if\s*\(e\.target\s*===\s*editUserModal\)\s*editUserModal\.classList\.remove\("active"\);\s*\}\);)/g,
  
  // addMovementModalBackdrop (Stock Inward/Outward)
  /(\s*)(movementModal\.addEventListener\("click",\s*e\s*=>\s*\{\s*if\s*\(e\.target\s*===\s*movementModal\)\s*movementModal\.classList\.remove\("active"\);\s*\}\);)/g,
  
  // backupModalBackdrop
  /(\s*)(if\(backupModal\)\s*backupModal\.addEventListener\("click",\s*e\s*=>\s*\{\s*if\s*\(e\.target\s*===\s*backupModal\)\s*backupModal\.classList\.remove\("active"\);\s*\}\);)/g,
  
  // addBranchModalBackdrop
  /(\s*)(addBranchModalBackdrop\.addEventListener\("click",\s*e\s*=>\s*\{\s*if\s*\(e\.target\s*===\s*addBranchModalBackdrop\)\s*addBranchModalBackdrop\.classList\.remove\("active"\);\s*\}\);)/g,

  // editBranchModalBackdrop
  /(\s*)(editBranchModalBackdrop\.addEventListener\("click",\s*e\s*=>\s*\{\s*if\s*\(e\.target\s*===\s*editBranchModalBackdrop\)\s*editBranchModalBackdrop\.classList\.remove\("active"\);\s*\}\);)/g,

  // bulkImportModalBackdrop
  /(\s*)(importModalBackdrop\.addEventListener\("click",\s*e\s*=>\s*\{\s*if\s*\(e\.target\s*===\s*importModalBackdrop\)\s*importModalBackdrop\.classList\.remove\("active"\);\s*\}\);)/g,

  // transferStockModalBackdrop
  /(\s*)(transferStockModalBackdrop\.addEventListener\("click",\s*e\s*=>\s*\{\s*if\s*\(e\.target\s*===\s*transferStockModalBackdrop\)\s*transferStockModalBackdrop\.classList\.remove\("active"\);\s*\}\);)/g,

  // deletionRequestModalBackdrop
  /(\s*)(deletionRequestModalBackdrop\.addEventListener\("click",\s*e\s*=>\s*\{\s*if\s*\(e\.target\s*===\s*deletionRequestModalBackdrop\)\s*deletionRequestModalBackdrop\.classList\.remove\("active"\);\s*\}\);)/g,
];

let matchCount = 0;
for (const regex of regexesToReplace) {
  content = content.replace(regex, (match, p1, p2) => {
    matchCount++;
    // Add // in front of each line
    const commented = p2.split('\n').map(line => '// ' + line).join('\n' + p1);
    return p1 + commented;
  });
}

// Now generic catch-all for any missed ones that follow the pattern exactly
content = content.replace(/(\s*)((\w+Backdrop|\w+Modal)\.addEventListener\(['"]click['"],\s*e\s*=>\s*\{\s*if\s*\(e\.target\s*===\s*\3\)\s*[^{}]+\s*\}\);)/g, (match, p1, p2) => {
    matchCount++;
    const commented = p2.split('\n').map(line => '// ' + line).join('\n' + p1);
    return p1 + commented;
});

fs.writeFileSync(appJsPath, content);
console.log(`Successfully commented out ${matchCount} backdrop click listeners.`);
