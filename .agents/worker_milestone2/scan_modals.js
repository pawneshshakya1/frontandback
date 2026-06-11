const fs = require('fs');
const path = require('path');

const dir = 'd:\\batuk\\frontandback\\frontend\\src\\screens\\main';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

console.log('Searching for <Modal in all screens...');

files.forEach(file => {
  const filePath = path.join(dir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('<Modal')) {
    console.log(`- ${file} uses <Modal>`);
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (line.includes('<Modal') || line.includes('Modal ') || line.includes('BlurView')) {
        console.log(`  Line ${idx + 1}: ${line.trim()}`);
      }
    });
  }
});
