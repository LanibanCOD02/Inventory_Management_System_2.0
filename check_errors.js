const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  
  await page.goto('http://localhost:3000');
  
  await page.type('input[name="username"]', 'admin');
  await page.type('input[name="password"]', 'admin123');
  await page.click('button[type="submit"]');
  
  await new Promise(r => setTimeout(r, 3000));
  
  const content = await page.evaluate(() => {
    return document.getElementById('inventoryBody') ? document.getElementById('inventoryBody').innerHTML : 'No inventoryBody';
  });
  
  console.log("BODY HTML length:", content.length);
  if (content.includes('skeleton')) {
    console.log("ERROR: STILL SHOWING SKELETON LOADERS!");
  } else {
    console.log("SUCCESS: TABLE RENDERED!");
  }
  
  await browser.close();
})();
