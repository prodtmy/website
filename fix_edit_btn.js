const fs = require('fs');
let appJs = fs.readFileSync('js/app.js', 'utf8');

const target = `<!-- Delete Action -->
        <button class="text-[10px] font-bold px-2 py-1 border border-accent-red/40 text-accent-red hover:bg-accent-red/10 rounded transition-colors btn-delete-track"`;

const replacement = `<!-- Edit Action -->
        <button class="text-[10px] font-bold px-2 py-1 border border-subtle text-muted hover:text-primary rounded transition-colors" onclick="window.openEditTrackModal('\${track.id}', \${track.isPublic})">
          [ EDIT ]
        </button>
        <!-- Delete Action -->
        <button class="text-[10px] font-bold px-2 py-1 border border-accent-red/40 text-accent-red hover:bg-accent-red/10 rounded transition-colors btn-delete-track"`;

if (appJs.includes(target)) {
    appJs = appJs.replace(target, replacement);
    fs.writeFileSync('js/app.js', appJs);
    
    // Bump cache buster
    let adminHtml = fs.readFileSync('admin.html', 'utf8');
    adminHtml = adminHtml.replace(/v=6/g, 'v=7');
    fs.writeFileSync('admin.html', adminHtml);
    
    console.log('Fixed EDIT button injection.');
} else {
    console.log('Target not found.');
}
