const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'index.html');
let code = fs.readFileSync(file, 'utf8');

// Patch login header and form
const loginHeaderFormRegex = /<div class="login-header">[\s\S]*?<\/form>/;
const newLoginContent = `
          <div class="login-header">
            <img src="img/logo.jpg" alt="M.S. Chellamuthu Trust & Research Foundation" class="login-brand-logo" />
            <h3 style="font: 800 24px 'Outfit', sans-serif; margin: 12px 0 8px 0; color: #0f172a; letter-spacing: -0.5px; text-transform: uppercase;">INTERNAL ACCESS</h3>
            <p style="margin-bottom:24px;">Log in to your secure account.</p>
          </div>

          <div id="sessionExpiredMsg" style="display:none;background:var(--danger-bg,#fef2f2);color:var(--danger,#dc2626);font-size:13px;padding:10px 14px;border-radius:6px;margin-bottom:16px;text-align:center;">
            Your session has expired. Please sign in again.
          </div>

          <form id="loginForm" class="login-form">
            <div style="margin-bottom: 16px;">
              <label style="display:block; text-align:left; font-size:13px; font-weight:600; margin-bottom:6px; color:var(--text)">User ID</label>
              <div class="login-input-wrap">
                <i data-lucide="user"></i>
                <input type="text" required placeholder="Enter your ID" id="usernameInput">
              </div>
            </div>

            <div style="margin-bottom: 16px;">
              <label style="display:block; text-align:left; font-size:13px; font-weight:600; margin-bottom:6px; color:var(--text)">Password</label>
              <div class="login-input-wrap">
                <i data-lucide="lock"></i>
                <input type="password" id="passwordInput" required placeholder="••••••••••••">
                <button type="button" id="togglePassword" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);border:0;background:transparent;cursor:pointer;color:var(--muted);width:24px;height:24px;display:grid;place-items:center;padding:0;">
                  <i data-lucide="eye" id="toggleIcon" style="width:16px;height:16px;display:block;"></i>
                </button>
              </div>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; font-size:13px; margin-bottom: 24px;">
              <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
                <input type="checkbox" id="rememberMe" checked style="accent-color: var(--teal); width: 14px; height: 14px; margin:0;"> 
                Remember me
              </label>
              <a href="#" onclick="alert('Please contact your System Administrator at admin@msctrust.org to reset your password.'); return false;" style="color:var(--teal);text-decoration:none;font-weight:500;">Forgot Password?</a>
            </div>

            <div id="loginErrorMsg" style="color: var(--danger); font-size: 13px; text-align: center; min-height: 18px; margin-bottom: 8px; font-weight: 500;"></div>
            <button type="submit" class="primary-btn login-btn">Log In</button>
            
            <div style="margin-top:24px; font-size:12px; color:var(--text-secondary); text-align:center;">
              <p style="margin:0 0 12px 0;">New user? <a href="#" onclick="alert('Please contact your System Administrator at admin@msctrust.org to request an account.'); return false;" style="color:var(--teal);text-decoration:none;font-weight:500;">Contact Administrator</a></p>
              <p style="font-size:10.5px; margin:0; color:var(--muted);">By logging in, you agree to the <a href="#" onclick="alert('This system is for authorized M.S. Chellamuthu Trust personnel only. All activity is logged and monitored.'); return false;" style="color:var(--muted); text-decoration:underline;">Terms of Service & Privacy Policy</a></p>
            </div>
          </form>`;

code = code.replace(loginHeaderFormRegex, newLoginContent.trim());

// Now for the setupScreen
const setupHeaderFormRegex = /<div class="login-header">\s*<img src="img\/logo.jpg"[^>]*>\s*<h2>First-Time Setup<\/h2>[\s\S]*?<\/form>/;
const newSetupContent = `
          <div class="login-header">
            <img src="img/logo.jpg" alt="M.S. Chellamuthu Trust & Research Foundation" class="login-brand-logo" />
            <h3 style="font: 800 24px 'Outfit', sans-serif; margin: 12px 0 8px 0; color: #0f172a; letter-spacing: -0.5px; text-transform: uppercase;">INITIAL SETUP</h3>
            <p style="margin-bottom:24px;">Create the master admin account.</p>
          </div>
          
          <form id="setupForm">
            <div style="margin-bottom: 16px;">
              <label style="display:block; text-align:left; font-size:13px; font-weight:600; margin-bottom:6px; color:var(--text)">Admin User ID</label>
              <div class="login-input-wrap">
                <i data-lucide="user"></i>
                <input type="text" name="username" required placeholder="Enter admin ID">
              </div>
            </div>

            <div style="margin-bottom: 16px;">
              <label style="display:block; text-align:left; font-size:13px; font-weight:600; margin-bottom:6px; color:var(--text)">Password</label>
              <div class="login-input-wrap">
                <i data-lucide="lock"></i>
                <input type="password" name="password" id="setupPassword" required placeholder="Create a strong password" minlength="8">
              </div>
            </div>

            <div style="margin-bottom: 24px;">
              <label style="display:block; text-align:left; font-size:13px; font-weight:600; margin-bottom:6px; color:var(--text)">Confirm Password</label>
              <div class="login-input-wrap">
                <i data-lucide="lock"></i>
                <input type="password" id="setupConfirmPassword" required placeholder="Confirm password" minlength="8">
              </div>
            </div>

            <button type="submit" class="primary-btn login-btn">Create Admin Account</button>
            <div style="margin-top:24px; font-size:12px; color:var(--text-secondary); text-align:center;">
              <p style="font-size:10.5px; margin:0; color:var(--muted);">By creating an account, you agree to the <a href="#" onclick="alert('This system is for authorized M.S. Chellamuthu Trust personnel only. All activity is logged and monitored.'); return false;" style="color:var(--muted); text-decoration:underline;">Terms of Service & Privacy Policy</a></p>
            </div>
          </form>`;

code = code.replace(setupHeaderFormRegex, newSetupContent.trim());

fs.writeFileSync(file, code);
console.log("index.html forms patched.");
