const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'app.js');
let code = fs.readFileSync(file, 'utf8');

// Replace getters
code = code.replace(/localStorage\.getItem\('msc_token'\)/g, "(localStorage.getItem('msc_token') || sessionStorage.getItem('msc_token'))");
code = code.replace(/localStorage\.getItem\('msc_user'\)/g, "(localStorage.getItem('msc_user') || sessionStorage.getItem('msc_user'))");

// Replace removers
code = code.replace(/localStorage\.removeItem\('msc_token'\);?/g, "localStorage.removeItem('msc_token'); sessionStorage.removeItem('msc_token');");
code = code.replace(/localStorage\.removeItem\('msc_user'\);?/g, "localStorage.removeItem('msc_user'); sessionStorage.removeItem('msc_user');");

// Patch the login setter
// Find:
//    localStorage.setItem('msc_token', data.token);
//    localStorage.setItem('msc_user', JSON.stringify(data.user));
const loginSetterRegex = /localStorage\.setItem\('msc_token', data\.token\);\s*localStorage\.setItem\('msc_user', JSON\.stringify\(data\.user\)\);/g;
const newLoginSetter = `
    const rememberMe = document.getElementById('rememberMe') ? document.getElementById('rememberMe').checked : true;
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem('msc_token', data.token);
    storage.setItem('msc_user', JSON.stringify(data.user));
`;
code = code.replace(loginSetterRegex, newLoginSetter.trim());

fs.writeFileSync(file, code);
console.log("app.js auth patched.");
