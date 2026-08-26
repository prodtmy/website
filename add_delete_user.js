const fs = require('fs');

let appJs = fs.readFileSync('js/app.js', 'utf8');

const targetHtml = `      <td class="py-3 px-4 text-right">
        <button class="text-[10px] font-bold px-2 py-1 border border-subtle text-muted hover:text-primary rounded transition-colors mr-2" onclick="window.openEditUserModal('\${user.id}')">
          [ EDIT ]
        </button>
        <button class="text-[10px] font-bold px-2 py-1 border rounded transition-colors \${isActive ? 'border-accent-red text-accent-red hover:bg-accent-red/10' : 'border-online text-online hover:bg-online/10'}" data-revoke-key="\${user.key}">
          \${isActive ? '[ REVOKE ACCESS ]' : '[ RESTORE ACCESS ]'}
        </button>
      </td>`;

const replacementHtml = `      <td class="py-3 px-4 text-right">
        <button class="text-[10px] font-bold px-2 py-1 border border-subtle text-muted hover:text-primary rounded transition-colors mr-2" onclick="window.openEditUserModal('\${user.id}')">
          [ EDIT ]
        </button>
        <button class="text-[10px] font-bold px-2 py-1 border border-accent-red/40 text-accent-red hover:bg-accent-red/10 rounded transition-colors mr-2 btn-delete-user" data-user-id="\${user.id}">
          [ DELETE ]
        </button>
        <button class="text-[10px] font-bold px-2 py-1 border rounded transition-colors \${isActive ? 'border-accent-red text-accent-red hover:bg-accent-red/10' : 'border-online text-online hover:bg-online/10'}" data-revoke-key="\${user.key}">
          \${isActive ? '[ REVOKE ACCESS ]' : '[ RESTORE ACCESS ]'}
        </button>
      </td>`;

const targetLogic = `        populateUserDropdowns();
      };
    }
  });`;

const replacementLogic = `        populateUserDropdowns();
      };
    }

    const delBtn = tr.querySelector('.btn-delete-user');
    if (delBtn) {
      delBtn.onclick = () => {
        if (confirm('DELETE USER: Are you sure?')) {
          const index = users.findIndex(u => u.id === user.id);
          if (index !== -1) {
            users.splice(index, 1);
            saveStoredUsers(users);
            renderUserManagementTable();
            populateUserDropdowns();
          }
        }
      };
    }
  });`;

if (appJs.includes(targetHtml) && appJs.includes(targetLogic)) {
    appJs = appJs.replace(targetHtml, replacementHtml);
    appJs = appJs.replace(targetLogic, replacementLogic);
    
    // Bump cache buster
    const timestamp = Date.now();
    appJs = appJs.replace(/v=\d+/g, 'v=' + timestamp);
    fs.writeFileSync('js/app.js', appJs);

    ['index.html', 'admin.html', 'vault.html', 'contact.html'].forEach(file => {
      let content = fs.readFileSync(file, 'utf8');
      content = content.replace(/v=\d+/g, 'v=' + timestamp);
      fs.writeFileSync(file, content);
    });

    console.log('Added Delete button successfully.');
} else {
    console.log('Targets not found.');
}
