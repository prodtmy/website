const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const html = fs.readFileSync('admin.html', 'utf8');
const script = fs.readFileSync('js/app.js', 'utf8');

const dom = new JSDOM(html, {
  url: 'http://localhost/admin.html',
  runScripts: 'dangerously'
});

const window = dom.window;

// Fake localStorage
const store = {};
window.localStorage = {
  getItem: (k) => store[k] || null,
  setItem: (k, v) => store[k] = v,
  removeItem: (k) => delete store[k]
};

// Set session
store['tmy_vault_session'] = JSON.stringify({
  user: { id: 'thomas', name: 'Thomas', role: 'ADMIN', status: 'ACTIVE', key: 'ADMIN2026' },
  timestamp: Date.now()
});

window.alert = console.log;

try {
  window.eval(script);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  
  setTimeout(() => {
    const list = window.document.getElementById('admin-vault-tracklist');
    console.log("Tracklist innerHTML length:", list ? list.innerHTML.length : 'NULL');
    console.log("Is viewVault hidden:", window.document.getElementById('view-vault').classList.contains('hidden'));
    console.log("Is viewAnalytics hidden:", window.document.getElementById('view-analytics').classList.contains('hidden'));
  }, 100);
} catch (e) {
  console.error("ERROR:", e);
}
