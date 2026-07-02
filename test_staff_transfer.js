const puppeteer = require('puppeteer');
const http = require('http');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000');
  
  // Login as staff
  await page.type('input[name="username"]', 'staff_test');
  await page.type('input[name="password"]', 'staff123');
  await page.click('button[type="submit"]');
  
  await new Promise(r => setTimeout(r, 2000));
  
  const isTransferVisible = await page.evaluate(() => {
    const btn = document.getElementById('transferStockBtn');
    return btn && window.getComputedStyle(btn).display !== 'none';
  });
  
  console.log("Is Transfer Button visible to Staff:", isTransferVisible);
  
  const token = await page.evaluate(() => localStorage.getItem('msc_token'));
  
  console.log("Got staff token:", !!token);
  
  const res = await fetch('http://localhost:3000/api/movements/transfer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      inventory_id: 1,
      source_branch_id: 1,
      destination_branch_id: 2,
      quantity: 5
    })
  });
  
  console.log("Transfer API response status as Staff:", res.status);
  
  await browser.close();
})();
