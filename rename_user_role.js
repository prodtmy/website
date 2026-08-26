const fs = require('fs');

// 1. Update app.js
let appJs = fs.readFileSync('js/app.js', 'utf8');

// Default users update
appJs = appJs.replace(
  "role: 'USER', status: 'ACTIVE', key: 'USER2026'",
  "role: 'ARTIST (FULL ACCESS)', status: 'ACTIVE', key: 'USER2026'"
);
appJs = appJs.replace(
  "role: 'USER', status: 'ACTIVE', key: 'NACKE'",
  "role: 'ARTIST (FULL ACCESS)', status: 'ACTIVE', key: 'NACKE'"
);

// Migration script update (add USER to ARTIST (FULL ACCESS) mapping)
const oldMigration = `    parsedUsers.forEach(u => {
      if (u.role === 'RESTRICTED') {
        u.role = 'ARTIST';
        updated = true;
      }
    });`;

const newMigration = `    parsedUsers.forEach(u => {
      if (u.role === 'RESTRICTED') {
        u.role = 'ARTIST';
        updated = true;
      }
      if (u.role === 'USER') {
        u.role = 'ARTIST (FULL ACCESS)';
        updated = true;
      }
    });`;

if (appJs.includes(oldMigration)) {
  appJs = appJs.replace(oldMigration, newMigration);
}

const timestamp = Date.now();
appJs = appJs.replace(/v=\d+/g, 'v=' + timestamp);
fs.writeFileSync('js/app.js', appJs);

// 2. Update admin.html
let adminHtml = fs.readFileSync('admin.html', 'utf8');

adminHtml = adminHtml.replace(
  '<option value="USER">USER (Standard Vault Access)</option>',
  '<option value="ARTIST (FULL ACCESS)">ARTIST (FULL ACCESS)</option>'
);

adminHtml = adminHtml.replace(
  '<option value="USER">USER</option>',
  '<option value="ARTIST (FULL ACCESS)">ARTIST (FULL ACCESS)</option>'
);

adminHtml = adminHtml.replace(/v=\d+/g, 'v=' + timestamp);
fs.writeFileSync('admin.html', adminHtml);

// Cache busters for others
['index.html', 'vault.html', 'contact.html'].forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/v=\d+/g, 'v=' + timestamp);
    fs.writeFileSync(file, content);
});

console.log('Renamed USER to ARTIST (FULL ACCESS).');
