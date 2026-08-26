const fs = require('fs');

let appJs = fs.readFileSync('js/app.js', 'utf8');

// 1. Rename TYPE: to VAULT: and insert the actual TYPE selector
const targetHtml = `        <!-- Visibility Selector -->
        <div class="flex items-center gap-1.5">
          <span class="text-[10px] font-bold text-muted uppercase">TYPE:</span>
          <select class="bg-surface border border-subtle text-xs px-2 py-1 focus:outline-none focus:border-primary font-mono rounded select-track-visibility" data-track-id="\${track.id}">`;

const replacementHtml = `        <!-- Asset Type Selector -->
        <div class="flex items-center gap-1.5">
          <span class="text-[10px] font-bold text-muted uppercase">TYPE:</span>
          <select class="bg-surface border border-subtle text-xs px-2 py-1 focus:outline-none focus:border-primary font-mono rounded select-actual-track-type" data-track-id="\${track.id}">
            <option value="BEAT" \${track.trackType === 'BEAT' || !track.trackType ? 'selected' : ''}>BEAT</option>
            <option value="LOOP" \${track.trackType === 'LOOP' ? 'selected' : ''}>LOOP</option>
            <option value="IDEA" \${track.trackType === 'IDEA' ? 'selected' : ''}>IDEA</option>
            <option value="DRAFT" \${track.trackType === 'DRAFT' ? 'selected' : ''}>DRAFT</option>
          </select>
        </div>
        
        <!-- Visibility Selector -->
        <div class="flex items-center gap-1.5">
          <span class="text-[10px] font-bold text-muted uppercase">VAULT:</span>
          <select class="bg-surface border border-subtle text-xs px-2 py-1 focus:outline-none focus:border-primary font-mono rounded select-track-visibility" data-track-id="\${track.id}">`;

if (appJs.includes(targetHtml)) {
  appJs = appJs.replace(targetHtml, replacementHtml);
} else {
  console.log("HTML TARGET NOT FOUND");
}


// 2. Add change listener for select-actual-track-type
const targetLogic = `    // Landing Toggle Handler
    const landingSelect = row.querySelector('.select-track-landing');`;

const replacementLogic = `    // Asset Type Toggle Handler
    const typeSelect = row.querySelector('.select-actual-track-type');
    if (typeSelect) {
      typeSelect.onchange = () => {
        const newType = typeSelect.value;
        let publics = getStoredTracks(true);
        let privates = getStoredTracks(false);
        
        let target = publics.find(t => t.id === track.id);
        if (target) {
          target.trackType = newType;
          saveStoredTracks(true, publics);
        } else {
          target = privates.find(t => t.id === track.id);
          if (target) {
            target.trackType = newType;
            saveStoredTracks(false, privates);
          }
        }
        renderAdminVaultManager(); // re-render to update badges
      };
    }

    // Landing Toggle Handler
    const landingSelect = row.querySelector('.select-track-landing');`;

if (appJs.includes(targetLogic)) {
  appJs = appJs.replace(targetLogic, replacementLogic);
} else {
  console.log("LOGIC TARGET NOT FOUND");
}

// Bump cache buster
const timestamp = Date.now();
appJs = appJs.replace(/v=\d+/g, 'v=' + timestamp);
fs.writeFileSync('js/app.js', appJs);

['index.html', 'admin.html', 'vault.html', 'contact.html'].forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/v=\d+/g, 'v=' + timestamp);
  fs.writeFileSync(file, content);
});

console.log('Fixed Type dropdown.');
