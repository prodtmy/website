const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.error('PAGE ERROR:', error.message));

  const filePath = 'file://' + path.resolve('admin.html');
  await page.goto(filePath, { waitUntil: 'networkidle0' });

  // inject session
  await page.evaluate(() => {
    localStorage.setItem('tmy_vault_session', JSON.stringify({ 
      user: { id: 'thomas', name: 'Thomas', role: 'ADMIN' },
      timestamp: Date.now()
    }));
  });
  
  await page.reload({ waitUntil: 'networkidle0' });

  const isModalVisible = await page.evaluate(() => {
    return document.getElementById('edit-track-modal').classList.contains('flex');
  });
  console.log('Modal visible before click?', isModalVisible);

  // click accordion to open it
  await page.evaluate(() => {
    const row = document.querySelector('[data-admin-accordion-trigger]');
    if(row) row.click();
  });

  // click edit button
  await page.evaluate(() => {
    const editBtn = document.querySelector('button[onclick*="openEditTrackModal"]');
    if (editBtn) {
      console.log('Found edit button, clicking it.');
      editBtn.click();
    } else {
      console.log('Edit button not found!');
    }
  });

  const isModalVisibleAfter = await page.evaluate(() => {
    return document.getElementById('edit-track-modal').classList.contains('flex');
  });
  console.log('Modal visible after click?', isModalVisibleAfter);

  await browser.close();
})();
