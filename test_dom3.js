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

const store = {};
window.localStorage = {
  getItem: (k) => store[k] || null,
  setItem: (k, v) => store[k] = v,
  removeItem: (k) => delete store[k]
};

store['tmy_vault_session'] = JSON.stringify({
  user: { id: 'thomas', name: 'Thomas', role: 'ADMIN', status: 'ACTIVE', key: 'ADMIN2026' },
  timestamp: Date.now()
});

window.alert = console.log;

try {
  // modify script to log session
  const modifiedScript = script.replace('if (!session || (session.role !== \'ADMIN\' && session.role !== \'PRODUCER\')) {', 'console.log("SESSION:", session); if (!session || (session.role !== \'ADMIN\' && session.role !== \'PRODUCER\')) {');
  
  window.eval(modifiedScript);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  
  setTimeout(() => {
    const list = window.document.getElementById('admin-vault-tracklist');
    console.log("Tracklist innerHTML length:", list ? list.innerHTML.length : 'NULL');
    if (list && list.innerHTML.length > 60) console.log("First part:", list.innerHTML.substring(0, 150));
  }, 100);
} catch (e) {
  console.error("ERROR:", e);
}
