const fs = require('fs');
const path = require('path');

const originalIndex = path.join(__dirname, 'index.html');
const originalStyles = path.join(__dirname, 'styles.css');
const sampleIndex = path.join(__dirname, 'sample_login.html');
const sampleStyles = path.join(__dirname, 'sample_styles.css');

let html = fs.readFileSync(originalIndex, 'utf8');
let css = fs.readFileSync(originalStyles, 'utf8');

// --- Patch HTML ---
// Point to sample styles
html = html.replace('<link rel="stylesheet" href="styles.css">', '<link rel="stylesheet" href="sample_styles.css">');

// Fix gaps by changing the wrapper divs
// Wait, the HTML has CRLF too! Let's just use regex to be safe with newlines.
html = html.replace(
  /<div style="margin-bottom: 16px;">\s*<label style="display:block; text-align:left; font-size:12px; font-weight:600; margin-bottom:4px; color:var\(--text\)">User ID<\/label>/g,
  '<div style="margin-bottom: 8px;">\n              <label style="display:block; text-align:left; font-size:12px; font-weight:600; margin-bottom:2px; color:var(--text)">User ID</label>'
);

html = html.replace(
  /<div style="margin-bottom: 16px;">\s*<label style="display:block; text-align:left; font-size:12px; font-weight:600; margin-bottom:4px; color:var\(--text\)">Password<\/label>/g,
  '<div style="margin-bottom: 8px;">\n              <label style="display:block; text-align:left; font-size:12px; font-weight:600; margin-bottom:2px; color:var(--text)">Password</label>'
);

html = html.replace(
  'justify-content:space-between; align-items:center; font-size:13px; margin-bottom: 24px;',
  'justify-content:space-between; align-items:center; font-size:12px; margin-bottom: 16px;'
);

html = html.replace(
  '<div style="margin-top:24px; font-size:12px; color:var(--text-secondary); text-align:center;">',
  '<div style="margin-top:16px; font-size:12px; color:var(--text-secondary); text-align:center;">'
);

// --- Patch CSS ---
// Fix container padding and size
css = css.replace(
  /max-width: 340px;\s*background: #fff;\s*padding: 32px 28px;/g,
  'max-width: 320px;\r\n  background: #fff;\r\n  padding: 24px 20px;'
);

css = css.replace(
  /\.login-header \{\s*text-align: center;\s*margin-bottom: 32px;\s*\}/g,
  '.login-header {\r\n  text-align: center;\r\n  margin-bottom: 16px;\r\n}'
);

// This is where the accidental double gap came from. Setting it to 0 so only HTML wrapper controls gap.
css = css.replace(
  /\.login-input-wrap \{\s*position: relative;\s*width: 100%;\s*margin-bottom: 16px;\s*\}/g,
  '.login-input-wrap {\r\n  position: relative;\r\n  width: 100%;\r\n  margin-bottom: 0;\r\n}'
);

css = css.replace(
  /\.login-input-wrap input \{\s*width: 100%;\s*height: 52px;/g,
  '.login-input-wrap input {\r\n  width: 100%;\r\n  height: 38px;\r\n  font-size: 13px;'
);

css = css.replace(
  /#loginForm \.primary-btn \{\s*height: 52px;/g,
  '#loginForm .primary-btn {\r\n  height: 38px;\r\n  font-size: 14px;'
);

fs.writeFileSync(sampleIndex, html);
fs.writeFileSync(sampleStyles, css);

console.log("Sample files created successfully.");
