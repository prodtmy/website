const fs = require('fs');

// 1. Update app.js
let appJs = fs.readFileSync('js/app.js', 'utf8');

const oldLandingFilter = `const publicTracks = getStoredTracks(true).filter(t => t.isLanding === true);`;
const newLandingFilter = `const publicTracks = getStoredTracks(true).filter(t => t.isLanding === true && t.trackType !== 'DRAFT');`;
appJs = appJs.replace(oldLandingFilter, newLandingFilter);

const oldTracklistLogic = `  if (tab === 'public') {
    tracks = getStoredTracks(true);
  } else {
    const allPrivate = getStoredTracks(false);
    tracks = allPrivate.filter(t => Array.isArray(t.assignedTo) && (t.assignedTo.includes(user.id) || user.role === 'ADMIN'));
  }`;
const newTracklistLogic = `  if (tab === 'public') {
    tracks = getStoredTracks(true);
  } else {
    const allPrivate = getStoredTracks(false);
    tracks = allPrivate.filter(t => Array.isArray(t.assignedTo) && (t.assignedTo.includes(user.id) || user.role === 'ADMIN'));
  }

  if (user.role !== 'ADMIN' && user.role !== 'PRODUCER') {
    tracks = tracks.filter(t => t.trackType !== 'DRAFT');
  }`;

if (appJs.includes(oldTracklistLogic)) {
  appJs = appJs.replace(oldTracklistLogic, newTracklistLogic);
} else {
  console.log('Error: Could not find tracklist logic in app.js');
}

const timestamp = Date.now();
appJs = appJs.replace(/v=\d+/g, 'v=' + timestamp);
fs.writeFileSync('js/app.js', appJs);


// 2. Update admin.html
let adminHtml = fs.readFileSync('admin.html', 'utf8');

const oldAssetType = `<option value="IDEA">IDEA</option>`;
const newAssetType = `<option value="IDEA">IDEA</option>
                <option value="DRAFT">DRAFT (Admin/Producer only)</option>`;

// Replace globally so it hits both the upload form and the edit modal
adminHtml = adminHtml.replace(new RegExp(oldAssetType, 'g'), newAssetType);

adminHtml = adminHtml.replace(/v=\d+/g, 'v=' + timestamp);
fs.writeFileSync('admin.html', adminHtml);


// Bump other HTML files
['index.html', 'vault.html', 'contact.html'].forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/v=\d+/g, 'v=' + timestamp);
    fs.writeFileSync(file, content);
});

console.log('Added DRAFT type successfully.');
