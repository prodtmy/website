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

const trackData = [{id: 't1', title: 'TEST', bpm: 120, key: 'C', trackType: 'BEAT', src: '', isPublic: false}];
dom.window.localStorage.setItem('tmy_private_tracks', JSON.stringify(trackData));

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

const editBtn = dom.window.document.querySelector('.btn-delete-track').previousElementSibling;
console.log('Edit btn text:', editBtn.textContent.trim());
console.log('Edit btn onclick attribute:', editBtn.getAttribute('onclick'));

console.log('Modal flex before click:', dom.window.document.getElementById('edit-track-modal').classList.contains('flex'));
editBtn.click();
console.log('Modal flex after click:', dom.window.document.getElementById('edit-track-modal').classList.contains('flex'));

