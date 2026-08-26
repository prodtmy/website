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
  // Let's modify the script to print debugging info inside the catch
  const modifiedScript = script.replace(
    '} catch (e) {',
    '} catch (e) { console.log("CAUGHT EXCEPTION IN SESSION GET:", e);'
  ).replace(
    'const session = getVaultSession();',
    'const session = getVaultSession(); console.log("SESSION OBJECT IS:", session);'
  );
  
  window.eval(modifiedScript);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
} catch (e) {
  console.error("ERROR:", e);
}
