const fs = require('fs');
const { JSDOM } = require('jsdom');

const adminHtml = fs.readFileSync('admin.html', 'utf8');
const dom = new JSDOM(adminHtml, { 
  url: "http://localhost",
  runScripts: "dangerously" 
});

dom.window.localStorage.setItem('tmy_vault_session', JSON.stringify({ 
  user: { id: 'thomas', name: 'Thomas', role: 'ADMIN' },
  timestamp: Date.now()
}));

const appJs = fs.readFileSync('js/app.js', 'utf8');
const scriptEl = dom.window.document.createElement('script');
scriptEl.textContent = appJs;
dom.window.document.body.appendChild(scriptEl);

dom.window.setupAdminPage();

const orgOpen = dom.window.openEditTrackModal;
dom.window.openEditTrackModal = function(id, isPub) {
  console.log('Intercepted openEditTrackModal with:', typeof id, id, typeof isPub, isPub);
  const tracks = dom.window.getStoredTracks(isPub);
  console.log('Tracks length:', tracks.length);
  const track = tracks.find(t => t.id === id);
  console.log('Found track:', !!track);
  orgOpen(id, isPub);
}

const editBtn = dom.window.document.querySelector('.btn-delete-track').previousElementSibling;
editBtn.click();
