const fs = require('fs');
const path = require('path');

// --- Patch styles.css ---
const stylesPath = path.join(__dirname, 'styles.css');
let styles = fs.readFileSync(stylesPath, 'utf8');

styles = styles.replace(
  'max-width: 340px;\n  background: #fff;\n  padding: 32px 28px;',
  'max-width: 320px;\n  background: #fff;\n  padding: 24px 20px;'
);
styles = styles.replace(
  '.login-header {\n  text-align: center;\n  margin-bottom: 32px;\n}',
  '.login-header {\n  text-align: center;\n  margin-bottom: 16px;\n}'
);
styles = styles.replace(
  '.login-input-wrap {\n  position: relative;\n  width: 100%;\n  margin-bottom: 16px;\n}',
  '.login-input-wrap {\n  position: relative;\n  width: 100%;\n  margin-bottom: 12px;\n}'
);
styles = styles.replace(
  '.login-input-wrap input {\n  width: 100%;\n  height: 52px;',
  '.login-input-wrap input {\n  width: 100%;\n  height: 42px;\n  font-size: 13px;'
);
styles = styles.replace(
  '#loginForm .primary-btn {\n  height: 52px;',
  '#loginForm .primary-btn {\n  height: 42px;\n  font-size: 14px;'
);

fs.writeFileSync(stylesPath, styles);


// --- Patch index.html ---
const indexPath = path.join(__dirname, 'index.html');
let indexHtml = fs.readFileSync(indexPath, 'utf8');

// The gap between logo and text
indexHtml = indexHtml.replace(
  '<div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px; justify-content: center;">',
  '<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; justify-content: center;">'
);

// The tinted text effect for M.S. CHELLAMUTHU
indexHtml = indexHtml.replace(
  '<div style="font-weight: 800; font-size: 16px; color: var(--dark-green); letter-spacing: -0.3px; line-height: 1;">M.S. CHELLAMUTHU</div>',
  '<div style="font-weight: 900; font-size: 16px; background: linear-gradient(90deg, #0d9488, #0f766e); -webkit-background-clip: text; -webkit-text-fill-color: transparent; letter-spacing: -0.3px; line-height: 1;">M.S. CHELLAMUTHU</div>'
);

// Form inputs labels margin
indexHtml = indexHtml.replace(
  '<label style="display:block; text-align:left; font-size:13px; font-weight:600; margin-bottom:6px; color:var(--text)">User ID</label>',
  '<label style="display:block; text-align:left; font-size:12px; font-weight:600; margin-bottom:4px; color:var(--text)">User ID</label>'
);
indexHtml = indexHtml.replace(
  '<label style="display:block; text-align:left; font-size:13px; font-weight:600; margin-bottom:6px; color:var(--text)">Password</label>',
  '<label style="display:block; text-align:left; font-size:12px; font-weight:600; margin-bottom:4px; color:var(--text)">Password</label>'
);

// Checkbox area tight margin
indexHtml = indexHtml.replace(
  '<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; font-size: 13px;">',
  '<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; font-size: 12px;">'
);

// Footer text tight margin
indexHtml = indexHtml.replace(
  '<div style="margin-top: 24px; text-align: center; font-size: 13px; color: var(--text-secondary);">',
  '<div style="margin-top: 16px; text-align: center; font-size: 12px; color: var(--text-secondary);">'
);

fs.writeFileSync(indexPath, indexHtml);
console.log('Patched layout files');
