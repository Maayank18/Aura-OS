const fs = require('fs');
const file = 'src/services/langchain.js';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/\\`/g, '`');
fs.writeFileSync(file, content);
console.log('Fixed langchain.js');
