const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'styles.css');
let css = fs.readFileSync(cssPath, 'utf8');

// 1. Update login-form-container width
css = css.replace(
  /\.login-form-container\s*\{[^}]+\}/,
  `.login-form-container {
  width: 100%;
  max-width: 380px;
  background: #fff;
  padding: 32px 24px;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  animation: slideUpFade 1s cubic-bezier(0.23, 1, 0.32, 1) 0.2s both;
  position: relative;
  z-index: 10;
}`
);

// 2. Update login-input-wrap input height and padding
css = css.replace(
  /\.login-input-wrap input\s*\{[^}]+\}/,
  `.login-input-wrap input {
  width: 100%;
  height: 48px;
  border: 1.5px solid var(--border);
  border-radius: 10px;
  padding: 0 16px 0 44px;
  font: 400 14px 'Inter', sans-serif;
  color: var(--text);
  background: var(--bg);
  transition: border-color .2s, box-shadow .2s;
  outline: none;
}`
);

// 3. Update primary button height
css = css.replace(
  /#loginForm .primary-btn\s*\{[^}]+\}/,
  `#loginForm .primary-btn {
  height: 48px;
  font-size: 15px;
  border-radius: 10px;
  margin-top: 10px;
  width: 100%;
  justify-content: center;
}`
);

// 4. Update margin bottom of input wrap
css = css.replace(
  /\.login-input-wrap\s*\{[^}]+\}/,
  `.login-input-wrap {
  position: relative;
  width: 100%;
  margin-bottom: 12px;
}`
);

fs.writeFileSync(cssPath, css);
console.log("Updated styles.css with balanced spacing");

const htmlPath = path.join(__dirname, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

// The original logo structure was Logo + Trust Name.
// Let's make sure the logo is centered and beautiful like their screenshot.
html = html.replace(
  /<div class="login-header" style="margin-bottom: 24px;">[\s\S]*?<\/div>/,
  `<div class="login-header" style="margin-bottom: 24px;">
          <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 12px;">
            <img src="img/logo.jpg" alt="Logo" class="login-brand-logo" style="margin:0; height: 50px;">
            <div style="text-align: left;">
              <div style="font-weight: 800; font-size: 18px; color: var(--teal); line-height: 1.1;">M.S. CHELLAMUTHU</div>
              <div style="font-size: 10px; font-weight: 600; color: var(--text-secondary); letter-spacing: 0.5px; margin-top: 2px;">TRUST & RESEARCH FOUNDATION</div>
            </div>
          </div>
          <h2 style="margin-bottom: 4px; font-weight: 800;">INTERNAL ACCESS</h2>
          <p style="margin: 0; font-size: 13px; color: var(--text-secondary);">Log in to your secure account.</p>
        </div>`
);

// Also remove inline margin from forms that might be messing it up
html = html.replace(/<div style="margin-bottom: 16px;">/g, '<div style="margin-bottom: 8px;">');
html = html.replace(/<div style="margin-bottom: 24px;">/g, '<div style="margin-bottom: 16px;">');

fs.writeFileSync(htmlPath, html);
console.log("Updated index.html header layout");
