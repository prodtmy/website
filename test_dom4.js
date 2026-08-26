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
window.localStorage = {
  getItem: (k) => {
    if (k === 'tmy_vault_session') return JSON.stringify({
      user: { id: 'thomas', name: 'Thomas', role: 'ADMIN', status: 'ACTIVE', key: 'ADMIN2026' },
      timestamp: Date.now()
    });
    return null;
  },
  setItem: () => {}
};
window.alert = console.log;

try {
  window.eval(script);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  setTimeout(() => {
    const list = window.document.getElementById('admin-vault-tracklist');
    console.log("Tracklist HTML:\n", list ? list.innerHTML : 'NULL');
  }, 100);
} catch (e) {
  console.error("ERROR:", e);
}
