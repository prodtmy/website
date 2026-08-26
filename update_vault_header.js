const fs = require('fs');

let appJs = fs.readFileSync('js/app.js', 'utf8');

const target = `  const contactLink = document.getElementById('vault-contact-link');
  if (contactLink) {
    contactLink.outerHTML = \`
      <button id="vault-logout-btn" class="text-muted hover:text-primary px-2.5 py-1.5 transition-colors touch-target flex items-center">
        [ LOGOUT ]
      </button>
    \`;
    const logoutBtn = document.getElementById('vault-logout-btn');
    if (logoutBtn) {
      logoutBtn.onclick = () => {
        clearVaultSession();
        window.location.reload();
      };
    }
  }`;

const replacement = `  const nav = document.querySelector('header nav');
  if (nav) {
    nav.innerHTML = \`
      <div class="flex items-center gap-4 text-xs">
        <span class="text-primary font-bold hidden sm:inline" id="vault-user-tag">\${user.name.toUpperCase()} [\${user.role}]</span>
        <button id="vault-logout-btn" class="text-muted hover:text-primary transition-colors touch-target">[ LOGOUT ]</button>
      </div>
    \`;
    const logoutBtn = document.getElementById('vault-logout-btn');
    if (logoutBtn) {
      logoutBtn.onclick = () => {
        clearVaultSession();
        window.location.reload();
      };
    }
  }`;

appJs = appJs.replace(target, replacement);
appJs = appJs.replace(/v=7/g, 'v=8');
fs.writeFileSync('js/app.js', appJs);

let indexHtml = fs.readFileSync('index.html', 'utf8');
indexHtml = indexHtml.replace(/v=7/g, 'v=8');
fs.writeFileSync('index.html', indexHtml);

let vaultHtml = fs.readFileSync('vault.html', 'utf8');
vaultHtml = vaultHtml.replace(/v=7/g, 'v=8');
fs.writeFileSync('vault.html', vaultHtml);

let adminHtml = fs.readFileSync('admin.html', 'utf8');
adminHtml = adminHtml.replace(/v=7/g, 'v=8');
fs.writeFileSync('admin.html', adminHtml);

let contactHtml = fs.readFileSync('contact.html', 'utf8');
contactHtml = contactHtml.replace(/v=7/g, 'v=8'); 
fs.writeFileSync('contact.html', contactHtml);

console.log('updated');
