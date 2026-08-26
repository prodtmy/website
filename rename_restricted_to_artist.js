const fs = require('fs');

// 1. Update app.js
let appJs = fs.readFileSync('js/app.js', 'utf8');

// The default users definition
appJs = appJs.replace(
  "role: 'RESTRICTED', status: 'ACTIVE', key: 'MARIUS'",
  "role: 'ARTIST', status: 'ACTIVE', key: 'MARIUS'"
);

// The logic check
appJs = appJs.replace(
  "if (user.role === 'RESTRICTED') {",
  "if (user.role === 'ARTIST') {"
);

// The role badge rendering
appJs = appJs.replace(
  "user.role === 'RESTRICTED' ? 'bg-accent-red/10 text-accent-red'",
  "user.role === 'ARTIST' ? 'bg-accent-red/10 text-accent-red'"
);

// We should also run a migration loop so that if the user already has Marius in localStorage with role 'RESTRICTED', it updates to 'ARTIST'.
const migration = `
  const storedUsers = localStorage.getItem('tmy_users');
  if (storedUsers) {
    let parsedUsers = JSON.parse(storedUsers);
    let updated = false;
    parsedUsers.forEach(u => {
      if (u.role === 'RESTRICTED') {
        u.role = 'ARTIST';
        updated = true;
      }
    });
    if (updated) localStorage.setItem('tmy_users', JSON.stringify(parsedUsers));
  }
`;

// Insert migration logic at the top of app.js just before getting stored users
appJs = appJs.replace(
  "function getStoredUsers() {",
  migration + "\nfunction getStoredUsers() {"
);

appJs = appJs.replace(/v=8/g, 'v=9');
fs.writeFileSync('js/app.js', appJs);

// 2. Update admin.html
let adminHtml = fs.readFileSync('admin.html', 'utf8');

adminHtml = adminHtml.replace(
  '<option value="RESTRICTED">RESTRICTED (Private Vault Only, No Public)</option>',
  '<option value="ARTIST">ARTIST (Private Vault Only, No Public)</option>'
);

adminHtml = adminHtml.replace(
  '<option value="RESTRICTED">RESTRICTED</option>',
  '<option value="ARTIST">ARTIST</option>'
);

adminHtml = adminHtml.replace(/v=8/g, 'v=9');
fs.writeFileSync('admin.html', adminHtml);

// Cache busters for others
let indexHtml = fs.readFileSync('index.html', 'utf8');
indexHtml = indexHtml.replace(/v=8/g, 'v=9');
fs.writeFileSync('index.html', indexHtml);

let vaultHtml = fs.readFileSync('vault.html', 'utf8');
vaultHtml = vaultHtml.replace(/v=8/g, 'v=9');
fs.writeFileSync('vault.html', vaultHtml);

let contactHtml = fs.readFileSync('contact.html', 'utf8');
contactHtml = contactHtml.replace(/v=8/g, 'v=9'); 
fs.writeFileSync('contact.html', contactHtml);

console.log('Renamed RESTRICTED to ARTIST.');
