const fs = require('fs');

let appJs = fs.readFileSync('js/app.js', 'utf8');

const startStr = "function renderAdminVaultManager() {";
const startIndex = appJs.indexOf(startStr);

let i = startIndex + startStr.length;
let braceCount = 1;
while (i < appJs.length && braceCount > 0) {
  if (appJs[i] === '{') braceCount++;
  if (appJs[i] === '}') braceCount--;
  i++;
}
const endIndex = i;

const newFunction = `function renderAdminVaultManager() {
  const container = document.getElementById('admin-vault-tracklist') || document.getElementById('admin-vault-list');
  if (!container) return;

  try {
    const filter = document.getElementById('admin-vault-filter');
    const filterVal = filter ? filter.value.toUpperCase() : 'ALL';

    let displayTracks = [];
    if (filterVal === 'ALL') {
      displayTracks = [...(getStoredTracks(true) || []), ...(getStoredTracks(false) || [])];
    } else if (filterVal === 'PUBLIC') {
      displayTracks = getStoredTracks(true) || [];
    } else {
      displayTracks = getStoredTracks(false) || [];
    }

    container.innerHTML = '';

    const users = getStoredUsers() || [];

    displayTracks.forEach(track => {
      if (!track) return;
      
      const row = document.createElement('div');
      row.className = 'border-b border-subtle py-4 flex flex-col transition-colors';

      const currentAssigned = Array.isArray(track.assignedTo) && track.assignedTo.length > 0 ? track.assignedTo[0] : '';
      
      const trackIdStr = track.id ? String(track.id).substring(0,4).toUpperCase() : '0000';
      const displayTitle = track.title ? track.title : 'UNTITLED_TRACK_' + trackIdStr;

      let vaultValue = 'PRIVATE';
      if (track.isDraft) vaultValue = 'DRAFT';
      else if (track.isPublic) vaultValue = 'PUBLIC';

      const trackId = track.id || '';
      const trackBpm = track.bpm || '---';
      const trackKey = track.key || '---';
      const trackType = track.trackType || 'BEAT';
      const trackIsPublic = track.isPublic ? 'true' : 'false';

      row.innerHTML = \`
        <div class="flex items-center justify-between gap-4 cursor-pointer select-none group px-4" data-admin-accordion-trigger="\${trackId}">
          <div class="flex items-center gap-3 flex-1 min-w-0">
            <button class="w-9 h-9 rounded-full border border-subtle flex items-center justify-center text-primary hover:bg-black/5 transition-all flex-shrink-0 touch-target" data-track-play-btn="\${trackId}">
              <svg class="w-4 h-4 play-icon ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              <svg class="w-4 h-4 pause-icon hidden" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            </button>
            <div class="flex flex-col truncate">
              <span class="font-bold text-sm text-primary tracking-wide group-hover:underline truncate">\${displayTitle}</span>
              <span class="text-xs text-muted">\${trackBpm} BPM // \${trackKey} <span class="border border-subtle px-1 rounded ml-1 text-[9px] uppercase">\${trackType}</span></span>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <span class="text-xs text-muted group-hover:text-primary transition-transform duration-200 transform accordion-arrow" id="admin-arrow-\${trackId}">
              [ + ]
            </span>
          </div>
        </div>

        <div class="hidden flex-col gap-4 pt-4 px-4" id="admin-accordion-\${trackId}">
          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-3 bg-surface/50 border border-subtle rounded">
            
            <div class="flex flex-wrap items-center gap-3">
              <div class="flex items-center gap-1.5">
                <span class="text-[10px] font-bold text-muted uppercase">TYPE:</span>
                <select class="bg-transparent border-none text-xs focus:outline-none focus:ring-0 font-mono rounded cursor-pointer select-actual-track-type" data-track-id="\${trackId}">
                  <option value="BEAT" \${trackType === 'BEAT' ? 'selected' : ''}>BEAT</option>
                  <option value="LOOP" \${trackType === 'LOOP' ? 'selected' : ''}>LOOP</option>
                  <option value="IDEA" \${trackType === 'IDEA' ? 'selected' : ''}>IDEA</option>
                </select>
              </div>
              
              <div class="flex items-center gap-1.5">
                <span class="text-[10px] font-bold text-muted uppercase">VAULT:</span>
                <select class="bg-transparent border-none text-xs focus:outline-none focus:ring-0 font-mono rounded cursor-pointer select-track-visibility" data-track-id="\${trackId}">
                  <option value="PUBLIC" \${vaultValue === 'PUBLIC' ? 'selected' : ''}>PUBLIC</option>
                  <option value="PRIVATE" \${vaultValue === 'PRIVATE' ? 'selected' : ''}>PRIVATE</option>
                  <option value="DRAFT" \${vaultValue === 'DRAFT' ? 'selected' : ''}>DRAFT</option>
                </select>
              </div>

              <div class="flex items-center gap-1.5 \${vaultValue !== 'PUBLIC' ? 'opacity-40 pointer-events-none' : ''}">
                <span class="text-[10px] font-bold text-muted uppercase">LANDING:</span>
                <select class="bg-transparent border-none text-xs focus:outline-none focus:ring-0 font-mono rounded cursor-pointer select-track-landing" data-track-id="\${trackId}">
                  <option value="true" \${track.isLanding ? 'selected' : ''}>ON</option>
                  <option value="false" \${!track.isLanding ? 'selected' : ''}>OFF</option>
                </select>
              </div>

              <div class="flex items-center gap-1.5 \${vaultValue === 'PUBLIC' ? 'opacity-40 pointer-events-none' : ''} assigned-user-box" id="user-box-\${trackId}">
                <span class="text-[10px] font-bold text-muted uppercase">ASSIGN:</span>
                <select class="bg-transparent border-none text-xs focus:outline-none focus:ring-0 font-mono rounded cursor-pointer select-track-user" data-track-id="\${trackId}">
                  <option value="">-- NONE --</option>
                  \${users.filter(u => u && u.status === 'ACTIVE').map(u => \`
                    <option value="\${u.id}" \${currentAssigned === u.id ? 'selected' : ''}>\${u.name}</option>
                  \`).join('')}
                </select>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <button class="text-[10px] font-bold px-3 py-1.5 border border-subtle text-muted hover:text-primary rounded transition-colors whitespace-nowrap" onclick="window.openEditTrackModal('\${trackId}', \${trackIsPublic})">
                [ EDIT ]
              </button>
              <button class="text-[10px] font-bold px-3 py-1.5 border border-accent-red/40 text-accent-red hover:bg-accent-red/10 rounded transition-colors btn-delete-track whitespace-nowrap" data-track-id="\${trackId}" data-is-public="\${trackIsPublic}">
                [ DELETE ]
              </button>
            </div>

          </div>
        </div>
      \`;

      container.appendChild(row);

      const triggerBtn = row.querySelector(\`[data-admin-accordion-trigger="\${trackId}"]\`);
      if (triggerBtn) {
        triggerBtn.onclick = (e) => {
          if (e.target.closest('button') || e.target.closest('select')) return;
          const content = row.querySelector(\`#admin-accordion-\${trackId}\`);
          const arrow = row.querySelector(\`#admin-arrow-\${trackId}\`);
          if (content && arrow) {
            content.classList.toggle('hidden');
            content.classList.toggle('flex');
            if (content.classList.contains('hidden')) {
              arrow.innerText = '[ + ]';
              arrow.style.transform = 'rotate(0deg)';
            } else {
              arrow.innerText = '[ - ]';
              arrow.style.transform = 'rotate(180deg)';
            }
          }
        };
      }

      const playBtn = row.querySelector(\`[data-track-play-btn="\${trackId}"]\`);
      if (playBtn) {
        playBtn.onclick = () => window.tmyEngine && window.tmyEngine.playTrack(trackId, track.src);
      }

      const typeSelect = row.querySelector('.select-actual-track-type');
      const visSelect = row.querySelector('.select-track-visibility');
      const landSelect = row.querySelector('.select-track-landing');
      const userSelect = row.querySelector('.select-track-user');
      const delBtn = row.querySelector('.btn-delete-track');

      if (typeSelect) {
        typeSelect.onchange = (e) => {
          const val = e.target.value;
          const tracksArr = getStoredTracks(track.isPublic) || [];
          const t = tracksArr.find(x => x && x.id === trackId);
          if (t) {
            t.trackType = val;
            saveStoredTracks(tracksArr, track.isPublic);
            renderAdminVaultManager();
            if (typeof setupLandingPlayer === 'function') setupLandingPlayer();
          }
        };
      }

      if (visSelect) {
        visSelect.onchange = (e) => {
          const val = e.target.value;
          const sourceArr = getStoredTracks(track.isPublic) || [];
          const idx = sourceArr.findIndex(x => x && x.id === trackId);
          if (idx > -1) {
            const t = sourceArr.splice(idx, 1)[0];
            
            if (val === 'DRAFT') {
              t.isPublic = false;
              t.isDraft = true;
            } else if (val === 'PUBLIC') {
              t.isPublic = true;
              t.isDraft = false;
            } else {
              t.isPublic = false;
              t.isDraft = false;
            }
            
            const targetArr = getStoredTracks(t.isPublic) || [];
            targetArr.push(t);
            
            saveStoredTracks(sourceArr, track.isPublic);
            saveStoredTracks(targetArr, t.isPublic);
            renderAdminVaultManager();
            if (typeof setupLandingPlayer === 'function') setupLandingPlayer();
          }
        };
      }

      if (landSelect) {
        landSelect.onchange = (e) => {
          const val = e.target.value === 'true';
          const tracksArr = getStoredTracks(track.isPublic) || [];
          const t = tracksArr.find(x => x && x.id === trackId);
          if (t) {
            t.isLanding = val;
            saveStoredTracks(tracksArr, track.isPublic);
            if (typeof setupLandingPlayer === 'function') setupLandingPlayer();
          }
        };
      }

      if (userSelect) {
        userSelect.onchange = (e) => {
          const val = e.target.value;
          const tracksArr = getStoredTracks(track.isPublic) || [];
          const t = tracksArr.find(x => x && x.id === trackId);
          if (t) {
            t.assignedTo = val ? [val] : [];
            saveStoredTracks(tracksArr, track.isPublic);
          }
        };
      }

      if (delBtn) {
        delBtn.onclick = (e) => {
          if (confirm('Delete track from Vault? This cannot be undone.')) {
            const isPub = e.target.getAttribute('data-is-public') === 'true';
            const tId = e.target.getAttribute('data-track-id');
            const tracksArr = getStoredTracks(isPub) || [];
            const newArr = tracksArr.filter(x => x && x.id !== tId);
            saveStoredTracks(newArr, isPub);
            renderAdminVaultManager();
            if (typeof setupLandingPlayer === 'function') setupLandingPlayer();
          }
        };
      }
    });

    if (displayTracks.length === 0) {
      container.innerHTML = '<div class="p-4 text-xs text-muted text-center font-mono">NO TRACKS FOUND</div>';
    }

  } catch (err) {
    container.innerHTML = '<div class="p-4 text-xs text-accent-red font-mono">ERROR RENDERING VAULT: ' + err.message + '</div>';
    console.error('Render Admin Vault Error:', err);
  }
}`;

appJs = appJs.slice(0, startIndex) + newFunction + appJs.slice(endIndex);

const timestamp = Date.now();
appJs = appJs.replace(/v=\d+/g, 'v=' + timestamp);
fs.writeFileSync('js/app.js', appJs);

['index.html', 'vault.html', 'admin.html', 'contact.html'].forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/v=\d+/g, 'v=' + timestamp);
    fs.writeFileSync(file, content);
});

console.log('Fixed Admin Vault Manager Accordion');
