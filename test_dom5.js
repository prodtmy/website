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

// We need to implement a full localStorage mock that stores everything
const store = {};
window.localStorage = {
  getItem: (k) => {
    return store[k] || null;
  },
  setItem: (k, v) => store[k] = v,
  removeItem: (k) => delete store[k]
};

// set a good session
store['tmy_vault_session'] = JSON.stringify({
  user: { id: 'thomas', name: 'Thomas', role: 'ADMIN', status: 'ACTIVE', key: 'ADMIN2026' },
  timestamp: Date.now()
});

window.alert = console.log;

try {
  // Let's modify the script to print debugging info
  const modifiedScript = script.replace(
    'const session = getVaultSession();',
    'const session = getVaultSession(); console.log("SESSION OBJECT IS:", session);'
  );
  
  window.eval(modifiedScript);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  setTimeout(() => {
    const list = window.document.getElementById('admin-vault-tracklist');
    console.log("Tracklist HTML length:", list ? list.innerHTML.length : 'NULL');
    if (list) console.log("First part:", list.innerHTML.substring(0, 500));
  }, 100);
} catch (e) {
  console.error("ERROR:", e);
}
