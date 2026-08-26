const fs = require('fs');

let appJs = fs.readFileSync('js/app.js', 'utf8');

// 1. Add generateShareLink at the bottom before DOMContentLoaded? Or anywhere global.
const generateShareCode = `
window.generateShareLink = function(trackId, isPublic) {
  const tracks = getStoredTracks(isPublic);
  const track = tracks.find(t => t && t.id === trackId);
  if (!track) {
    alert("Track not found!");
    return;
  }
  
  // Create minimal payload
  const payload = {
    title: track.title,
    bpm: track.bpm,
    key: track.key,
    trackType: track.trackType,
    src: track.src
  };
  
  try {
    const jsonStr = JSON.stringify(payload);
    const base64Data = btoa(encodeURIComponent(jsonStr));
    
    // Construct link
    let baseUrl = window.location.origin + window.location.pathname;
    baseUrl = baseUrl.substring(0, baseUrl.lastIndexOf('/'));
    const shareUrl = baseUrl + '/share.html?data=' + base64Data;
    
    // Copy to clipboard
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert("SHARE LINK COPIED TO CLIPBOARD!\\n\\n" + shareUrl);
    }).catch(err => {
      prompt("Copy this link:", shareUrl);
    });
  } catch(e) {
    alert("Error generating link: " + e.message);
  }
};
`;

if (!appJs.includes('generateShareLink')) {
  appJs += '\n' + generateShareCode + '\n';
}

// 2. Add SHARE button to renderVaultTracklist
// Need to find where the action buttons are. We have PREVIEW, STEMS, and EDIT.
const vaultTracklistActionTarget = `<button class="text-[10px] font-bold px-2 py-1 border border-subtle text-muted hover:text-primary rounded transition-colors" onclick="window.openEditTrackModal('\\${track.id}', \\${track.isPublic})">
          [ EDIT ]
        </button>`;

if (appJs.includes(vaultTracklistActionTarget) && !appJs.includes('[ SHARE ]')) {
  const shareBtnVault = `\${(session && (session.role === 'ADMIN' || session.role === 'PRODUCER')) ? \`
        <button class="text-[10px] font-bold px-2 py-1 border border-subtle text-muted hover:text-primary rounded transition-colors" onclick="window.generateShareLink('\\${track.id}', \\${track.isPublic})">
          [ SHARE ]
        </button>
        \` : ''}
        ` + vaultTracklistActionTarget;
  
  appJs = appJs.replace(vaultTracklistActionTarget, shareBtnVault);
}

// 3. Add SHARE button to renderAdminVaultManager
const adminActionTarget = `<button class="text-[10px] font-bold px-3 py-1.5 border border-subtle text-muted hover:text-primary rounded transition-colors whitespace-nowrap" onclick="window.openEditTrackModal('\\${trackId}', \\${trackIsPublic})">
                [ EDIT ]
              </button>`;

if (appJs.includes(adminActionTarget) && appJs.split('[ SHARE ]').length < 3) {
  const shareBtnAdmin = `
              <button class="text-[10px] font-bold px-3 py-1.5 border border-subtle text-muted hover:text-primary rounded transition-colors whitespace-nowrap" onclick="window.generateShareLink('\\${trackId}', \\${trackIsPublic})">
                [ SHARE ]
              </button>
              ` + adminActionTarget;
  appJs = appJs.replace(adminActionTarget, shareBtnAdmin);
}

fs.writeFileSync('js/app.js', appJs);

console.log('Injected share logic.');
