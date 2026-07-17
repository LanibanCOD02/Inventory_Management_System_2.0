const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'styles.css');
let code = fs.readFileSync(file, 'utf8');

// The login styles block goes from .login-wrapper around line 518 to line 612 before .login-form-container
// Let's use regex to replace everything between /* ─── Premium Login Screen ───────────────────────── */
// and .login-form-container {

const startComment = `/* ─── Premium Login Screen ───────────────────────── */`;
const endMarker = `.login-form-container {`;

const startIdx = code.indexOf(startComment);
const endIdx = code.indexOf(endMarker);

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = `${startComment}
.login-wrapper {
  min-height: 100vh;
  display: flex;
  background-color: var(--teal);
  animation: loginFadeIn 0.8s cubic-bezier(0.23, 1, 0.32, 1) forwards;
  position: relative;
  overflow: hidden;
}

.login-wrapper::before {
  content: "";
  position: absolute;
  top: -100%; left: -100%; right: -100%; bottom: -100%;
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><g fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M30 20v20M20 30h20" /><path d="M110 90v20M100 100h20" /><path d="M120 40a10 10 0 0 0-20 0v10a10 10 0 0 0 20 0z"/><path d="M110 50v20"/><path d="M100 60h20"/><path d="M20 110h10l5-15 10 30 5-15h10"/><circle cx="50" cy="110" r="2"/></g></svg>');
  background-size: 160px 160px;
  animation: bgPan 20s linear infinite;
  z-index: 1;
}

@keyframes bgPan {
  from { transform: translate(0, 0); }
  to { transform: translate(160px, 160px); }
}

@keyframes loginFadeIn {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

.login-centered-layout {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 100vh;
  position: relative;
  z-index: 2;
  padding: 24px;
}

`;
  
  code = code.substring(0, startIdx) + replacement + code.substring(endIdx);
}

// Modify .login-form-container to have styling since it lost its background from .login-right
const formContainerRegex = /\.login-form-container\s*\{[\s\S]*?\}/;
code = code.replace(formContainerRegex, 
`.login-form-container {
  width: 100%;
  max-width: 400px;
  background: #fff;
  padding: 48px 40px;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  animation: slideUpFade 1s cubic-bezier(0.23, 1, 0.32, 1) 0.2s both;
  position: relative;
  z-index: 10;
}`
);

// We should also remove .login-right h2 and .login-right p
code = code.replace(/\.login-right h2/g, '.login-header h2');
code = code.replace(/\.login-right p/g, '.login-header p');


fs.writeFileSync(file, code);
console.log("styles.css patched.");
