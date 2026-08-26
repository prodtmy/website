const fs = require('fs');
let code = fs.readFileSync('js/app.js', 'utf8');

// 1. Database version bump to wipe old default lists and force new defaults
code = code.replace("const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;", 
`const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const DB_VERSION = "2";
if (localStorage.getItem('tmy_db_ver') !== DB_VERSION) {
  localStorage.removeItem('tmy_public_tracks');
  localStorage.removeItem('tmy_private_tracks');
  localStorage.setItem('tmy_db_ver', DB_VERSION);
}`);

// 2. Redefine default tracks
const newPublicTracks = `const DEFAULT_PUBLIC_TRACKS = [
  { id: 'p1', title: 'LOOPKIT_1', bpm: 140, key: 'C MIN', date: '2026-08-20', src: 'beats/LOOPKIT1.wav', stems: '', flp: '', credits: 'TMY EXCLUSIVE', isLanding: true },
  { id: 'p2', title: 'BAHN_CHILL', bpm: 130, key: 'F# MIN', date: '2026-08-21', src: 'beats/bahn chill.wav', stems: '', flp: '', credits: 'PROD. TMY', isLanding: true },
  { id: 'p3', title: 'BAHN_RUHIGE', bpm: 120, key: 'A MIN', date: '2026-08-21', src: 'beats/bahn ruhige.wav', stems: '', flp: '', credits: 'PROD. TMY', isLanding: false },
  { id: 'p4', title: 'BEATSWITCH', bpm: 145, key: 'D MIN', date: '2026-08-21', src: 'beats/beatswitch.wav', stems: '', flp: '', credits: 'TMY AUDIO', isLanding: false },
  { id: 'p5', title: 'MAX_NACKE_V2', bpm: 125, key: 'E MIN', date: '2026-08-21', src: 'beats/max nacke_2.wav', stems: '', flp: '', credits: 'MAX NACKE x TMY', isLanding: false },
  { id: 'p6', title: 'PULP', bpm: 138, key: 'G MIN', date: '2026-08-21', src: 'beats/pulp.wav', stems: '', flp: '', credits: 'PROD. TMY', isLanding: false },
  { id: 'p7', title: 'THOMAS_MCDONBALDS', bpm: 142, key: 'B MIN', date: '2026-08-21', src: 'beats/thomas beat mcdonbalds.wav', stems: '', flp: '', credits: 'PROD. TMY', isLanding: false }
];`;

const newPrivateTracks = `const DEFAULT_PRIVATE_TRACKS = [];`;

code = code.replace(/const DEFAULT_PUBLIC_TRACKS = \[[\s\S]*?\];/, newPublicTracks);
code = code.replace(/const DEFAULT_PRIVATE_TRACKS = \[[\s\S]*?\];/, newPrivateTracks);

// 3. setupLandingPlayer filter
code = code.replace("const publicTracks = getStoredTracks(true);", "const publicTracks = getStoredTracks(true).filter(t => t.isLanding === true);");

// 4. setupAssetUploader - isLanding: false
code = code.replace("credits: 'TMY AUDIO VAULT',", "credits: 'TMY AUDIO VAULT',\n              isLanding: false,");

// 5. renderAdminVaultManager - add UI and logic
const userBoxMatch = `<div class="flex items-center gap-1.5 \${track.isPublic ? 'opacity-40 pointer-events-none' : ''} assigned-user-box" id="user-box-\${track.id}">`;
const landingToggleHtml = `
        <!-- Landing Page Toggle -->
        <div class="flex items-center gap-1.5 \${!track.isPublic ? 'hidden' : ''}">
          <span class="text-[10px] font-bold text-muted uppercase">LANDING:</span>
          <select class="bg-surface border border-subtle text-xs px-2 py-1 focus:outline-none focus:border-primary font-mono rounded select-track-landing" data-track-id="\${track.id}">
            <option value="true" \${track.isLanding ? 'selected' : ''}>ON</option>
            <option value="false" \${!track.isLanding ? 'selected' : ''}>OFF</option>
          </select>
        </div>
`;
code = code.replace(userBoxMatch, landingToggleHtml + "        " + userBoxMatch);

// Add event listener for landing toggle
const logicInsertPoint = `    // Delete handler`;
const landingLogic = `
    // Landing Toggle Handler
    const landingSelect = row.querySelector('.select-track-landing');
    if (landingSelect) {
      landingSelect.onchange = () => {
        const isLanding = landingSelect.value === 'true';
        let publics = getStoredTracks(true);
        const target = publics.find(t => t.id === track.id);
        if (target) {
          target.isLanding = isLanding;
          saveStoredTracks(true, publics);
        }
      };
    }
`;
code = code.replace(logicInsertPoint, landingLogic + "    " + logicInsertPoint);

fs.writeFileSync('js/app.js', code);
console.log('done');
