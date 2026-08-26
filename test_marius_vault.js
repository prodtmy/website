const fs = require('fs');
const { JSDOM } = require('jsdom');

const vaultHtml = fs.readFileSync('vault.html', 'utf8');
const dom = new JSDOM(vaultHtml, { 
  url: "http://localhost/vault.html",
  runScripts: "dangerously" 
});

const mariusUser = { id: 'marius', name: 'Marius', role: 'ARTIST', status: 'ACTIVE', key: 'MARIUS' };

dom.window.localStorage.setItem('tmy_users', JSON.stringify([
  { id: 'thomas', name: 'Thomas', role: 'ADMIN', status: 'ACTIVE', key: 'ADMIN2026' },
  mariusUser
]));

dom.window.localStorage.setItem('tmy_vault_session', JSON.stringify({ 
  user: mariusUser,
  timestamp: Date.now()
}));

const trackData = [
  { id: 'p1', title: 'LOOPKIT_1', bpm: 140, key: 'C MIN', trackType: 'BEAT', src: 'beats/LOOPKIT1.wav', isPublic: false, assignedTo: ['marius'] }
];
dom.window.localStorage.setItem('tmy_private_tracks', JSON.stringify(trackData));
dom.window.localStorage.setItem('tmy_public_tracks', JSON.stringify([]));
dom.window.localStorage.setItem('tmy_db_ver', "2");

dom.window.Audio = class {
  constructor() {
    this.addEventListener = () => {};
    this.play = () => Promise.resolve();
    this.pause = () => {};
  }
};

const appJs = fs.readFileSync('js/app.js', 'utf8');
const scriptEl = dom.window.document.createElement('script');
scriptEl.textContent = appJs;
dom.window.document.body.appendChild(scriptEl);

try {
  dom.window.setupVaultPage();
  const container = dom.window.document.getElementById('vault-tracklist-container');
  console.log("Container children count:", container.children.length);
  console.log("Container innerHTML:", container.innerHTML);
} catch(e) {
  console.error("SETUP VAULT PAGE ERROR:", e);
}
