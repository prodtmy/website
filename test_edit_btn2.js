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

dom.window.setupAdminPage();

const orgOpen = dom.window.openEditTrackModal;
dom.window.openEditTrackModal = function(id, isPub) {
  try {
    console.log('openEditTrackModal called with', id, isPub);
    orgOpen(id, isPub);
    console.log('openEditTrackModal finished successfully.');
  } catch (e) {
    console.error('openEditTrackModal error:', e.stack);
  }
}

const editBtn = dom.window.document.querySelector('.btn-delete-track').previousElementSibling;
editBtn.click();
console.log('Modal flex?', dom.window.document.getElementById('edit-track-modal').classList.contains('flex'));
