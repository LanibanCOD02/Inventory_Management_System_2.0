const fs = require('fs');
const path = require('path');
const routesDir = path.join(__dirname, 'routes');

fs.readdirSync(routesDir).forEach(file => {
  if (file.endsWith('.js')) {
    const p = path.join(routesDir, file);
    let content = fs.readFileSync(p, 'utf8');
    // We want to unescape: \` -> ` , \$ -> $ , \\n -> \n
    // These were mistakenly written with literal backslashes
    content = content.replace(/\\`/g, '`');
    content = content.replace(/\\\$/g, '$');
    content = content.replace(/\\\\n/g, '\\n');
    fs.writeFileSync(p, content);
  }
});
console.log('Fixed routes');
