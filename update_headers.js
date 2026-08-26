const fs = require('fs');

function removeStatus(file) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Pattern for index and contact
    const pattern1 = /<!-- System Status \(Desktop\) -->[\s\S]*?<\/div>\n/;
    content = content.replace(pattern1, '');

    // Pattern for vault
    const pattern2 = /<!-- Dynamic Status in Header \(Desktop \/ Mobile\) -->[\s\S]*?<\/div>\n/;
    content = content.replace(pattern2, '');

    fs.writeFileSync(file, content);
}

['index.html', 'contact.html', 'vault.html'].forEach(removeStatus);
console.log('done');
