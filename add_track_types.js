const fs = require('fs');

// 1. Update admin.html
let adminHtml = fs.readFileSync('admin.html', 'utf8');

const assetTypeHtml = `
            <div class="space-y-1">
              <label class="text-[11px] font-bold uppercase text-primary">[ TYPE ]</label>
              <select id="asset-type" class="w-full bg-surface border border-subtle text-xs px-3 py-2.5 focus:outline-none focus:border-primary font-mono">
                <option value="BEAT">BEAT</option>
                <option value="LOOP">LOOP</option>
                <option value="IDEA">IDEA</option>
              </select>
            </div>
`;
adminHtml = adminHtml.replace('<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">', '<div class="grid grid-cols-1 sm:grid-cols-4 gap-4">');
adminHtml = adminHtml.replace('</form>', assetTypeHtml + '</form>'); // we will insert it in a better place below

// Actually let's use string replace carefully
let newAdminHtml = fs.readFileSync('admin.html', 'utf8');
newAdminHtml = newAdminHtml.replace(
  '<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">', 
  '<div class="grid grid-cols-1 sm:grid-cols-4 gap-4">'
);
newAdminHtml = newAdminHtml.replace(
  '<input type="number" id="asset-bpm"',
  assetTypeHtml + '            <input type="number" id="asset-bpm"'
);

// Add to Edit Modal
const editTypeHtml = `
          <div class="space-y-1">
            <label class="text-[11px] font-bold uppercase text-primary">[ TYPE ]</label>
            <select id="edit-track-type" class="w-full bg-surface border border-subtle text-xs px-3 py-2.5 focus:outline-none focus:border-primary font-mono">
              <option value="BEAT">BEAT</option>
              <option value="LOOP">LOOP</option>
              <option value="IDEA">IDEA</option>
            </select>
          </div>
`;
newAdminHtml = newAdminHtml.replace(
  '<div class="grid grid-cols-2 gap-4">',
  '<div class="grid grid-cols-3 gap-4">'
);
newAdminHtml = newAdminHtml.replace(
  '<input type="number" id="edit-track-bpm"',
  editTypeHtml + '            <input type="number" id="edit-track-bpm"'
);

fs.writeFileSync('admin.html', newAdminHtml);


// 2. Update app.js
let appJs = fs.readFileSync('js/app.js', 'utf8');

// setupAssetUploader
appJs = appJs.replace(
  "const bpm = parseInt(document.getElementById('asset-bpm').value) || 140;",
  "const bpm = parseInt(document.getElementById('asset-bpm').value) || 140;\n    const trackType = document.getElementById('asset-type') ? document.getElementById('asset-type').value : 'BEAT';"
);
appJs = appJs.replace(
  "credits: 'TMY AUDIO VAULT',",
  "credits: 'TMY AUDIO VAULT',\n              trackType: trackType,"
);

// edit modal
appJs = appJs.replace(
  "document.getElementById('edit-track-bpm').value = track.bpm;",
  "document.getElementById('edit-track-bpm').value = track.bpm;\n  const typeEl = document.getElementById('edit-track-type'); if (typeEl) typeEl.value = track.trackType || 'BEAT';"
);
appJs = appJs.replace(
  "tracks[index].bpm = parseInt(document.getElementById('edit-track-bpm').value) || 140;",
  "tracks[index].bpm = parseInt(document.getElementById('edit-track-bpm').value) || 140;\n    tracks[index].trackType = document.getElementById('edit-track-type') ? document.getElementById('edit-track-type').value : 'BEAT';"
);

// UI Display in Vault Manager
appJs = appJs.replace(
  "<span class=\"text-xs text-muted\">\${track.bpm} BPM // \${track.key}</span>",
  "<span class=\"text-xs text-muted\">\${track.bpm} BPM // \${track.key} <span class=\"border border-subtle px-1 rounded ml-1 text-[9px] uppercase\">\${track.trackType || 'BEAT'}</span></span>"
);

// UI Display in Vault Public / Private Tracklist
appJs = appJs.replace(
  "<span class=\"text-xs text-muted\">\${track.bpm} BPM // \${track.key}</span>",
  "<span class=\"text-xs text-muted\">\${track.bpm} BPM // \${track.key} <span class=\"border border-subtle px-1 rounded ml-1 text-[9px] uppercase\">\${track.trackType || 'BEAT'}</span></span>"
);

// Note: I will just use regex to replace all instances of the track info line.
let regex = /<span class="text-xs text-muted">\\\${track\.bpm} BPM \/\/ \\\${track\.key}<\/span>/g;
appJs = appJs.replace(regex, `<span class="text-xs text-muted">\${track.bpm} BPM // \${track.key} <span class="border border-subtle px-1 rounded ml-1 text-[9px] uppercase">\${track.trackType || 'BEAT'}</span></span>`);

// Cache buster
appJs = appJs.replace(/v=5/g, 'v=6');

fs.writeFileSync('js/app.js', appJs);

let indexHtml = fs.readFileSync('index.html', 'utf8');
indexHtml = indexHtml.replace('js/app.js?v=5', 'js/app.js?v=6');
fs.writeFileSync('index.html', indexHtml);

let vaultHtml = fs.readFileSync('vault.html', 'utf8');
vaultHtml = vaultHtml.replace('js/app.js?v=5', 'js/app.js?v=6');
fs.writeFileSync('vault.html', vaultHtml);

let contactHtml = fs.readFileSync('contact.html', 'utf8');
contactHtml = contactHtml.replace('js/app.js?v=5', 'js/app.js?v=6'); 
fs.writeFileSync('contact.html', contactHtml);

console.log('done');
