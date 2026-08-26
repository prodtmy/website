const fs = require('fs');

// 1. Update vault.html to add ID to contact link
let vaultHtml = fs.readFileSync('vault.html', 'utf8');
vaultHtml = vaultHtml.replace(
    '<a href="contact.html" class="text-muted hover:text-primary px-2.5 py-1.5 transition-colors touch-target flex items-center">[ CONTACT ]</a>',
    '<a href="contact.html" id="vault-contact-link" class="text-muted hover:text-primary px-2.5 py-1.5 transition-colors touch-target flex items-center">[ CONTACT ]</a>'
);
fs.writeFileSync('vault.html', vaultHtml);

// 2. Update app.js
let appJs = fs.readFileSync('js/app.js', 'utf8');

const oldRenderUnauth = `  if (statusBar) {
    statusBar.innerHTML = \`
      <span class="w-1.5 h-1.5 rounded-full bg-online pulse-green mr-2"></span>
      <span>[ SYSTEM: ONLINE // VAULT: RESTRICTED ]</span>
    \`;
  }`;

const oldRenderAuth = `  if (statusBar) {
    statusBar.innerHTML = \`
      <div class="flex items-center gap-3">
        <span class="w-2 h-2 rounded-full bg-online animate-pulse"></span>
        <span class="text-xs font-bold text-primary uppercase">
          ACCESS GRANTED: <span class="text-online">\${user.name.toUpperCase()}</span> // ROLE: \${user.role}
        </span>
        <button id="vault-logout-btn" class="text-[10px] text-muted hover:text-primary transition-colors border border-subtle px-2 py-0.5 rounded">
          [ LOGOUT ]
        </button>
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

const newRenderAuth = `  const contactLink = document.getElementById('vault-contact-link');
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

appJs = appJs.replace(oldRenderUnauth, '');
appJs = appJs.replace(oldRenderAuth, newRenderAuth);

// Bump cache buster
let indexHtml = fs.readFileSync('index.html', 'utf8');
indexHtml = indexHtml.replace('js/app.js?v=3', 'js/app.js?v=4');
fs.writeFileSync('index.html', indexHtml);

let vaultHtml2 = fs.readFileSync('vault.html', 'utf8');
vaultHtml2 = vaultHtml2.replace('js/app.js?v=3', 'js/app.js?v=4');
fs.writeFileSync('vault.html', vaultHtml2);

let adminHtml = fs.readFileSync('admin.html', 'utf8');
adminHtml = adminHtml.replace('js/app.js?v=3', 'js/app.js?v=4');
fs.writeFileSync('admin.html', adminHtml);

let contactHtml = fs.readFileSync('contact.html', 'utf8');
contactHtml = contactHtml.replace('js/app.js', 'js/app.js?v=4'); // Add if missing
fs.writeFileSync('contact.html', contactHtml);

fs.writeFileSync('js/app.js', appJs);

console.log('done');
