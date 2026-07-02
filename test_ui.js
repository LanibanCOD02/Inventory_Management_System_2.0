const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000');
  await page.waitForSelector('#loginForm');
  await page.type('#username', 'teststaff');
  await page.type('#password', 'testpass');
  await page.click('button[type="submit"]');
  
  await page.waitForSelector('#dashboard', { visible: true });
  
  // Open Add Movement Modal
  await page.evaluate(() => {
    window.openMovementModal('OUTWARD');
  });
  
  await page.waitForSelector('#addMovementModalBackdrop.active', { visible: true });
  
  // Fill form
  await page.select('#movementItemSelect', 'f1ae4118-bedd-478d-b5b7-071e47581256');
  await page.type('input[name="quantity"]', '1');
  
  // Wait for network requests
  page.on('response', async res => {
    if (res.url().includes('/api/movements')) {
      console.log('API Response status:', res.status());
      try {
        console.log('API Response body:', await res.json());
      } catch (e) { }
    }
  });

  page.on('dialog', async dialog => {
    console.log('Dialog:', dialog.message());
    await dialog.accept();
  });
  
  await page.click('#movementSubmitBtn');
  
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
})();
