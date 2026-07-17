const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

const regex = /try\s*\{\s*const response = await fetch\(url.*?revokeObjectURL\(downloadUrl\);\s*\}/s;

const newStr = `try {
    // Navigate directly to download to prevent silent blocking by popup blockers or Safari
    window.location.href = url;
  }`;

code = code.replace(regex, newStr);
fs.writeFileSync('app.js', code);
