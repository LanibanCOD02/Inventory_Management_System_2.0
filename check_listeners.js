const fs = require('fs');
const lines = fs.readFileSync('app.js', 'utf8').split('\n');
lines.forEach((line, index) => {
  if (line.includes('addEventListener') && line.includes('click') && !line.trim().startsWith('//')) {
    if (line.includes('Backdrop') || line.includes('Modal') || line.includes('modal') || line.includes('backdrop')) {
      console.log(`Line ${index + 1}: ${line.trim()}`);
    }
  }
});
