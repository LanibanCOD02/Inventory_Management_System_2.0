const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'index.html');
let code = fs.readFileSync(file, 'utf8');

const loginHeaderRegex = /<div class="login-header">[\s\S]*?<p style="margin-bottom:24px;">Log in to your secure account.<\/p>\s*<\/div>/;
const newLoginHeader = `
          <div class="login-header" style="margin-bottom: 24px;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px; justify-content: center;">
              <img src="img/logo.jpg" alt="Logo" style="height: 44px; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);" />
              <div style="text-align: left;">
                <div style="font-weight: 800; font-size: 17px; color: var(--dark-green); letter-spacing: -0.3px; line-height: 1;">M.S. CHELLAMUTHU</div>
                <div style="font-size: 9px; color: var(--text-secondary); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px;">Trust & Research Foundation</div>
              </div>
            </div>
            <div style="text-align: center;">
              <h3 style="font: 800 20px 'Outfit', sans-serif; margin: 0 0 6px 0; color: #0f172a; letter-spacing: -0.5px; text-transform: uppercase;">INTERNAL ACCESS</h3>
              <p style="margin: 0; font-size: 13px; color: var(--text-secondary);">Log in to your secure account.</p>
            </div>
          </div>
`;
code = code.replace(loginHeaderRegex, newLoginHeader.trim());

const setupHeaderRegex = /<div class="login-header">[\s\S]*?<p style="margin-bottom:24px;">Create the master admin account.<\/p>\s*<\/div>/;
const newSetupHeader = `
          <div class="login-header" style="margin-bottom: 24px;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px; justify-content: center;">
              <img src="img/logo.jpg" alt="Logo" style="height: 44px; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);" />
              <div style="text-align: left;">
                <div style="font-weight: 800; font-size: 17px; color: var(--dark-green); letter-spacing: -0.3px; line-height: 1;">M.S. CHELLAMUTHU</div>
                <div style="font-size: 9px; color: var(--text-secondary); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px;">Trust & Research Foundation</div>
              </div>
            </div>
            <div style="text-align: center;">
              <h3 style="font: 800 20px 'Outfit', sans-serif; margin: 0 0 6px 0; color: #0f172a; letter-spacing: -0.5px; text-transform: uppercase;">INITIAL SETUP</h3>
              <p style="margin: 0; font-size: 13px; color: var(--text-secondary);">Create the master admin account.</p>
            </div>
          </div>
`;
code = code.replace(setupHeaderRegex, newSetupHeader.trim());

// Also tighten up the margins in the form globally (from 16px to 12px, from 24px to 16px)
// We have: <div style="margin-bottom: 16px;">
// and <div style="margin-bottom: 24px;">
// We can just use string replace for those specific ones.

fs.writeFileSync(file, code);
console.log("index.html logo and header patched.");
