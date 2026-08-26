const fs = require('fs');

const files = ['index.html', 'vault.html', 'admin.html', 'contact.html'];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/\?v=\d+/g, '?v=' + Date.now());
    fs.writeFileSync(file, content);
});

console.log('Forced cache bump on all HTML files.');
