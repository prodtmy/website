const fs = require('fs');

let html = fs.readFileSync('admin.html', 'utf8');

const modalsHtml = `
  <!-- EDIT TRACK MODAL -->
  <div id="edit-track-modal" class="fixed inset-0 z-[100] hidden items-center justify-center bg-black/40 backdrop-blur-sm p-4">
    <div class="bg-card w-full max-w-md p-6 border border-subtle relative shadow-2xl">
      <button id="close-edit-track" class="absolute top-4 right-4 text-muted hover:text-primary transition-colors touch-target">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>
      <h3 class="text-xs font-bold uppercase tracking-wider text-primary mb-6">[ EDIT ASSET ]</h3>
      
      <form id="edit-track-form" class="space-y-4">
        <input type="hidden" id="edit-track-id" />
        <input type="hidden" id="edit-track-ispublic" />
        
        <div class="space-y-1">
          <label class="text-[11px] font-bold uppercase text-primary">[ TITLE ]</label>
          <input type="text" id="edit-track-title" required class="w-full bg-surface border border-subtle text-xs px-3 py-2.5 focus:outline-none focus:border-primary font-mono uppercase" />
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1">
            <label class="text-[11px] font-bold uppercase text-primary">[ BPM ]</label>
            <input type="number" id="edit-track-bpm" required class="w-full bg-surface border border-subtle text-xs px-3 py-2.5 focus:outline-none focus:border-primary font-mono" />
          </div>
          <div class="space-y-1">
            <label class="text-[11px] font-bold uppercase text-primary">[ KEY ]</label>
            <input type="text" id="edit-track-key" required class="w-full bg-surface border border-subtle text-xs px-3 py-2.5 focus:outline-none focus:border-primary font-mono uppercase" />
          </div>
        </div>

        <div class="space-y-1">
          <label class="text-[11px] font-bold uppercase text-primary">[ CREDITS ]</label>
          <input type="text" id="edit-track-credits" class="w-full bg-surface border border-subtle text-xs px-3 py-2.5 focus:outline-none focus:border-primary font-mono uppercase" />
        </div>
        
        <div class="space-y-1">
          <label class="text-[11px] font-bold uppercase text-primary">[ AUDIO FILE (.WAV/.MP3) ]</label>
          <input type="file" id="edit-track-file" accept="audio/*" class="w-full bg-surface border border-subtle text-xs p-2 focus:outline-none focus:border-primary font-mono" />
          <p class="text-[10px] text-muted">Leave empty to keep current file.</p>
        </div>

        <button type="submit" class="w-full bg-primary text-white text-xs font-bold py-3 mt-2 hover:bg-black transition-colors uppercase tracking-widest touch-target">
          [ SAVE CHANGES ]
        </button>
      </form>
    </div>
  </div>

  <!-- EDIT USER MODAL -->
  <div id="edit-user-modal" class="fixed inset-0 z-[100] hidden items-center justify-center bg-black/40 backdrop-blur-sm p-4">
    <div class="bg-card w-full max-w-sm p-6 border border-subtle relative shadow-2xl">
      <button id="close-edit-user" class="absolute top-4 right-4 text-muted hover:text-primary transition-colors touch-target">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>
      <h3 class="text-xs font-bold uppercase tracking-wider text-primary mb-6">[ EDIT USER ]</h3>
      
      <form id="edit-user-form" class="space-y-4">
        <input type="hidden" id="edit-user-id" />
        
        <div class="space-y-1">
          <label class="text-[11px] font-bold uppercase text-primary">[ CLIENT NAME ]</label>
          <input type="text" id="edit-user-name" required class="w-full bg-surface border border-subtle text-xs px-3 py-2.5 focus:outline-none focus:border-primary font-mono" />
        </div>
        
        <div class="space-y-1">
          <label class="text-[11px] font-bold uppercase text-primary">[ ROLE ]</label>
          <select id="edit-user-role" class="w-full bg-surface border border-subtle text-xs px-3 py-2.5 focus:outline-none focus:border-primary font-mono">
            <option value="USER">USER</option>
            <option value="RESTRICTED">RESTRICTED</option>
            <option value="VIP">VIP</option>
            <option value="PRODUCER">PRODUCER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </div>
        
        <div class="space-y-1">
          <label class="text-[11px] font-bold uppercase text-primary">[ ACCESS KEY ]</label>
          <input type="text" id="edit-user-key" required class="w-full bg-surface border border-subtle text-xs px-3 py-2.5 focus:outline-none focus:border-primary font-mono uppercase" />
        </div>

        <button type="submit" class="w-full bg-primary text-white text-xs font-bold py-3 mt-2 hover:bg-black transition-colors uppercase tracking-widest touch-target">
          [ UPDATE USER ]
        </button>
      </form>
    </div>
  </div>
`;

if (!html.includes('edit-track-modal')) {
  html = html.replace('<!-- Footer -->', modalsHtml + '\n  <!-- Footer -->');
  fs.writeFileSync('admin.html', html);
  console.log('Added modals to admin.html');
}

// Update app.js
let app = fs.readFileSync('js/app.js', 'utf8');

// 1. Asset Upload Fix
app = app.replace(
  "src: 'beats/LOOPKIT1.wav',", 
  "src: window._uploadedFilename ? 'beats/' + window._uploadedFilename : 'beats/LOOPKIT1.wav',"
);
app = app.replace(
  "function handleFilesSelected(filename) {",
  "function handleFilesSelected(filename) {\n    window._uploadedFilename = filename;"
);

// 2. Track Edit Logic Injection
const trackEditLogic = `
window.openEditTrackModal = function(id, isPublic) {
  const tracks = getStoredTracks(isPublic);
  const track = tracks.find(t => t.id === id);
  if(!track) return;
  document.getElementById('edit-track-modal').classList.remove('hidden');
  document.getElementById('edit-track-modal').classList.add('flex');
  document.getElementById('edit-track-id').value = track.id;
  document.getElementById('edit-track-ispublic').value = isPublic ? 'true' : 'false';
  document.getElementById('edit-track-title').value = track.title;
  document.getElementById('edit-track-bpm').value = track.bpm;
  document.getElementById('edit-track-key').value = track.key;
  document.getElementById('edit-track-credits').value = track.credits || '';
  document.getElementById('edit-track-file').value = ''; // reset file input
};

document.getElementById('close-edit-track')?.addEventListener('click', () => {
  document.getElementById('edit-track-modal').classList.add('hidden');
  document.getElementById('edit-track-modal').classList.remove('flex');
});

document.getElementById('edit-track-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('edit-track-id').value;
  const isPublic = document.getElementById('edit-track-ispublic').value === 'true';
  const tracks = getStoredTracks(isPublic);
  const index = tracks.findIndex(t => t.id === id);
  
  if (index !== -1) {
    tracks[index].title = document.getElementById('edit-track-title').value.trim().toUpperCase();
    tracks[index].bpm = parseInt(document.getElementById('edit-track-bpm').value) || 140;
    tracks[index].key = document.getElementById('edit-track-key').value.trim().toUpperCase();
    tracks[index].credits = document.getElementById('edit-track-credits').value.trim().toUpperCase();
    
    const fileInput = document.getElementById('edit-track-file');
    if (fileInput.files.length > 0) {
      tracks[index].src = 'beats/' + fileInput.files[0].name;
    }
    
    saveStoredTracks(isPublic, tracks);
    document.getElementById('edit-track-modal').classList.add('hidden');
    document.getElementById('edit-track-modal').classList.remove('flex');
    renderAdminVaultManager();
  }
});

// Edit User Logic
window.openEditUserModal = function(id) {
  const users = getStoredUsers();
  const user = users.find(u => u.id === id);
  if(!user) return;
  document.getElementById('edit-user-modal').classList.remove('hidden');
  document.getElementById('edit-user-modal').classList.add('flex');
  document.getElementById('edit-user-id').value = user.id;
  document.getElementById('edit-user-name').value = user.name;
  document.getElementById('edit-user-role').value = user.role;
  document.getElementById('edit-user-key').value = user.key;
};

document.getElementById('close-edit-user')?.addEventListener('click', () => {
  document.getElementById('edit-user-modal').classList.add('hidden');
  document.getElementById('edit-user-modal').classList.remove('flex');
});

document.getElementById('edit-user-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('edit-user-id').value;
  const users = getStoredUsers();
  const index = users.findIndex(u => u.id === id);
  
  if (index !== -1) {
    users[index].name = document.getElementById('edit-user-name').value.trim();
    users[index].role = document.getElementById('edit-user-role').value;
    users[index].key = document.getElementById('edit-user-key').value.trim().toUpperCase();
    
    saveStoredUsers(users);
    document.getElementById('edit-user-modal').classList.add('hidden');
    document.getElementById('edit-user-modal').classList.remove('flex');
    renderUserManagementTable();
  }
});
`;

if (!app.includes('window.openEditTrackModal')) {
  app += '\n' + trackEditLogic;
}

// 3. Add Edit buttons to Vault Manager rows
const trackActionHtml = `
        <button class="text-[10px] border border-subtle px-2 py-1 rounded text-muted hover:text-primary transition-colors" onclick="window.openEditTrackModal('\${track.id}', \${track.isPublic})">
          [ EDIT ]
        </button>
        <button class="text-[10px] border border-subtle px-2 py-1 rounded text-accent-red hover:bg-accent-red/10 transition-colors btn-delete-track">
`;
app = app.replace(
  `<button class="text-[10px] border border-subtle px-2 py-1 rounded text-accent-red hover:bg-accent-red/10 transition-colors btn-delete-track">`,
  trackActionHtml
);

// 4. Add Edit buttons to User rows
const userActionHtml = `
        <button class="text-accent-blue hover:underline mr-3" onclick="window.openEditUserModal('\${u.id}')">[ EDIT ]</button>
        <button class="\${btnClass} hover:underline btn-toggle-status" data-id="\${u.id}">[\${btnText}]</button>
`;
app = app.replace(
  `<button class="\${btnClass} hover:underline btn-toggle-status" data-id="\${u.id}">[\${btnText}]</button>`,
  userActionHtml
);

// Bump cache buster
app = app.replace(/v=4/g, 'v=5');

fs.writeFileSync('js/app.js', app);

let indexHtml = fs.readFileSync('index.html', 'utf8');
indexHtml = indexHtml.replace('js/app.js?v=4', 'js/app.js?v=5');
fs.writeFileSync('index.html', indexHtml);

let vaultHtml2 = fs.readFileSync('vault.html', 'utf8');
vaultHtml2 = vaultHtml2.replace('js/app.js?v=4', 'js/app.js?v=5');
fs.writeFileSync('vault.html', vaultHtml2);

let adminHtml = fs.readFileSync('admin.html', 'utf8');
adminHtml = adminHtml.replace('js/app.js?v=4', 'js/app.js?v=5');
fs.writeFileSync('admin.html', adminHtml);

let contactHtml = fs.readFileSync('contact.html', 'utf8');
contactHtml = contactHtml.replace('js/app.js?v=4', 'js/app.js?v=5'); 
fs.writeFileSync('contact.html', contactHtml);

console.log('done');
