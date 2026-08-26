const fs = require('fs');

let appJs = fs.readFileSync('js/app.js', 'utf8');

const target = `      <td class="py-3 px-4 text-right">
        <button class="text-[10px] font-bold px-2 py-1 border rounded transition-colors \${isActive ? 'border-accent-red text-accent-red hover:bg-accent-red/10' : 'border-online text-online hover:bg-online/10'}" data-revoke-key="\${user.key}">
          \${isActive ? '[ REVOKE ACCESS ]' : '[ RESTORE ACCESS ]'}
        </button>
      </td>`;

const replacement = `      <td class="py-3 px-4 text-right">
        <button class="text-[10px] font-bold px-2 py-1 border border-subtle text-muted hover:text-primary rounded transition-colors mr-2" onclick="window.openEditUserModal('\${user.id}')">
          [ EDIT ]
        </button>
        <button class="text-[10px] font-bold px-2 py-1 border rounded transition-colors \${isActive ? 'border-accent-red text-accent-red hover:bg-accent-red/10' : 'border-online text-online hover:bg-online/10'}" data-revoke-key="\${user.key}">
          \${isActive ? '[ REVOKE ACCESS ]' : '[ RESTORE ACCESS ]'}
        </button>
      </td>`;

if (appJs.includes(target)) {
    appJs = appJs.replace(target, replacement);
    
    // Bump cache buster
    appJs = appJs.replace(/v=9/g, 'v=10');
    fs.writeFileSync('js/app.js', appJs);

    let adminHtml = fs.readFileSync('admin.html', 'utf8');
    adminHtml = adminHtml.replace(/v=9/g, 'v=10');
    fs.writeFileSync('admin.html', adminHtml);
    
    console.log('Fixed User EDIT button injection.');
} else {
    console.log('Target not found.');
}
