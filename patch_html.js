const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'index.html');
let code = fs.readFileSync(file, 'utf8');

// Patch login screen start
code = code.replace(/<div id="loginScreen" class="login-wrapper">[\s\S]*?<div class="login-form-container">/, 
  `<div id="loginScreen" class="login-wrapper">\n    <div class="login-centered-layout">\n      <div class="login-form-container">`
);

// Patch login screen end
code = code.replace(/<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<div class="app-shell"/, 
  `      </div>\n    </div>\n  </div>\n\n  <div class="app-shell"`
);

// Patch setup screen start
code = code.replace(/<div id="setupScreen" style="display:none;" class="login-wrapper">[\s\S]*?<div class="login-form-container">/, 
  `<div id="setupScreen" style="display:none;" class="login-wrapper">\n  <div class="login-centered-layout">\n    <div class="login-form-container">`
);

// Patch setup screen end
// In setupScreen, it ends before </body> maybe? Let's check the end of the file.
// The setup screen is around line 1260.
code = code.replace(/<\/div>\s*<\/div>\s*<\/div>\s*<\/body>/, 
  `    </div>\n  </div>\n</div>\n</body>`
);

// Oh wait, let's just make sure we are removing ONE </div> at the end of setupScreen.
// Setup screen ends with:
//         </form>
//       </div>
//     </div>
//   </div>
// </div>
// </body>

// Let's do a more robust replacement for setup end:
code = code.replace(/<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/body>/, 
  `    </div>\n  </div>\n</div>\n</body>`
);

fs.writeFileSync(file, code);
console.log("index.html patched.");
