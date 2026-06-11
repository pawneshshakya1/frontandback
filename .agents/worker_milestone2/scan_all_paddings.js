const fs = require('fs');
const path = require('path');

const dir = 'd:\\batuk\\frontandback\\frontend\\src\\screens\\main';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

console.log(`Scanning ${files.length} files for horizontal paddings...`);

files.forEach(file => {
  const filePath = path.join(dir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  lines.forEach((line, idx) => {
    // Look for paddingHorizontal, paddingLeft, paddingRight
    if (line.includes('paddingHorizontal') || line.includes('paddingLeft') || line.includes('paddingRight')) {
      const trimmed = line.trim();
      // Print any line that doesn't explicitly use 16, 8, 0, or SCREEN_PADDING
      if (
        !trimmed.includes('16') && 
        !trimmed.includes('8') && 
        !trimmed.includes('0') && 
        !trimmed.includes('SCREEN_PADDING') && 
        !trimmed.includes('SPACING') &&
        !trimmed.includes('paddingLeft: 12') &&
        !trimmed.includes('paddingRight: 12') &&
        !trimmed.includes('paddingRight: 10')
      ) {
        console.log(`${file}:${idx + 1}: ${trimmed}`);
      }
    }
  });
});
