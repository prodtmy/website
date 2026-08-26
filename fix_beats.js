const fs = require('fs');
let code = fs.readFileSync('js/app.js', 'utf8');

// Update defaults in the script
code = code.replace(/src: '([^']+?\.wav)'/g, (match, filename) => {
    if (!filename.startsWith('beats/')) {
        return `src: 'beats/${filename}'`;
    }
    return match;
});

// Update the migration logic in getStoredTracks
const oldGetStoredTracks = `function getStoredTracks(isPublic) {
  const key = isPublic ? 'tmy_public_tracks' : 'tmy_private_tracks';
  const data = localStorage.getItem(key);
  if (data) {
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {}
  }`;

const newGetStoredTracks = `function getStoredTracks(isPublic) {
  const key = isPublic ? 'tmy_public_tracks' : 'tmy_private_tracks';
  const data = localStorage.getItem(key);
  if (data) {
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        // Migration to new beats/ folder
        let updated = false;
        parsed.forEach(t => {
          if (t.src && !t.src.startsWith('beats/')) {
            t.src = 'beats/' + t.src;
            updated = true;
          }
        });
        if (updated) localStorage.setItem(key, JSON.stringify(parsed));
        return parsed;
      }
    } catch (e) {}
  }`;

code = code.replace(oldGetStoredTracks, newGetStoredTracks);

fs.writeFileSync('js/app.js', code);
console.log('done');
