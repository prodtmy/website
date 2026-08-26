const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const html = fs.readFileSync('admin.html', 'utf8');
const script = fs.readFileSync('js/app.js', 'utf8');

const dom = new JSDOM(html, {
  url: 'http://localhost/admin.html',
  runScripts: 'dangerously'
});

const window = dom.window;
window.localStorage = {
  getItem: () => null,
  setItem: () => {}
};

// We need to inject the script because JSDOM external scripts might not execute synchronously if we don't handle them correctly, 
// so let's just evaluate it.
try {
  window.eval(script);
  // simulate DOMContentLoaded
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  
  // wait a bit for setupAdminPage to complete
  setTimeout(() => {
    const list = window.document.getElementById('admin-vault-tracklist');
    console.log("Tracklist innerHTML length:", list ? list.innerHTML.length : 'NULL');
    console.log("Is viewAnalytics hidden:", window.document.getElementById('view-analytics').classList.contains('hidden'));
    
    // Check for errors
    console.log("If you see this, no unhandled exceptions occurred!");
  }, 100);
} catch (e) {
  console.error("ERROR:", e);
}
