const fs = require('fs');
const path = require('path');

function searchDir(dir) {
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchDir(fullPath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('Alert.alert')) {
        console.log(`- ${path.relative('d:\\batuk\\frontandback', fullPath)} has Alert.alert`);
      }
    }
  });
}

console.log('Auditing recursively under frontend/src:');
searchDir('d:\\batuk\\frontandback\\frontend\\src');
