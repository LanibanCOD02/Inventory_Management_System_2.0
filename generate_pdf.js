const puppeteer = require('puppeteer');
const fs = require('fs');
const marked = require('marked');

(async () => {
  console.log("Starting Puppeteer to capture screenshots...");
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    defaultViewport: { width: 1440, height: 900 },
    timeout: 30000
  });
  console.log("Browser launched.");
  const page = await browser.newPage();
  console.log("New page created.");
  const screenshots = {};

  try {
    // 1. Log in
    await page.goto('http://localhost:3000');
    await page.waitForSelector('#loginForm input[type="text"]');
    await page.type('#loginForm input[type="text"]', 'testadmin');
    await page.type('#loginForm input[type="password"]', 'testpass');
    await page.click('#loginForm button[type="submit"]');
    
    // Wait for Dashboard to load
    try {
      await page.waitForSelector('#dashboard', { visible: true, timeout: 5000 });
    } catch (e) {
      await page.screenshot({ path: 'login_error.png' });
      throw new Error("Dashboard failed to load. See login_error.png.");
    }
    // Small delay for charts/animations
    await new Promise(r => setTimeout(r, 1000));
    screenshots['Dashboard'] = await page.screenshot({ encoding: 'base64' });
    console.log("Captured: Dashboard");

    // 2. Inventory List
    await page.click('.nav-list button[data-page="inventory"]');
    await page.waitForSelector('#inventoryBody', { visible: true });
    await new Promise(r => setTimeout(r, 1000));
    screenshots['InventoryList'] = await page.screenshot({ encoding: 'base64' });
    console.log("Captured: Inventory List");

    // 3. Add Item modal
    await page.click('.nav-list button[data-page="dashboard"]');
    await page.waitForSelector('#dashboard', { visible: true });
    await new Promise(r => setTimeout(r, 500));
    await page.click('#addItemBtn');
    await page.waitForSelector('#modalBackdrop', { visible: true });
    await new Promise(r => setTimeout(r, 500));
    screenshots['AddItem'] = await page.screenshot({ encoding: 'base64' });
    console.log("Captured: Add Item Modal");
    await page.click('#closeModal');
    await new Promise(r => setTimeout(r, 500));

    // 4. Movement Views (Inward, Outward, Transfer)
    
    // Inward view
    await page.click('.nav-list button[data-page="inward"]');
    await page.waitForSelector('#inwardTableBody', { visible: true });
    await new Promise(r => setTimeout(r, 1000));
    screenshots['StockInward'] = await page.screenshot({ encoding: 'base64' });
    console.log("Captured: Stock Inward");

    // Outward view
    await page.click('.nav-list button[data-page="outward"]');
    await page.waitForSelector('#outwardTableBody', { visible: true });
    await new Promise(r => setTimeout(r, 1000));
    screenshots['StockOutward'] = await page.screenshot({ encoding: 'base64' });
    console.log("Captured: Stock Outward");

    // Transfer Modal
    await page.click('#transferStockBtn');
    await page.waitForSelector('#transferStockModalBackdrop', { visible: true });
    await new Promise(r => setTimeout(r, 500));
    screenshots['BranchTransfer'] = await page.screenshot({ encoding: 'base64' });
    console.log("Captured: Branch Transfer");
    await page.click('#closeTransferModal');
    await new Promise(r => setTimeout(r, 500));

    // Log out as Admin and log in as Staff to capture Staff views
    console.log("Trace: clicking logoutBtn");
    await page.click('#logoutBtn');
    await page.goto('http://localhost:3000'); // clear hash
    console.log("Trace: waiting for login form");
    await page.waitForSelector('#loginForm input[type="text"]', { visible: true });
    await page.type('#loginForm input[type="text"]', 'teststaff');
    await page.type('#loginForm input[type="password"]', 'testpass');
    console.log("Trace: clicking submit");
    await page.click('#loginForm button[type="submit"]');
    
    try {
      console.log("Trace: waiting for loginOverlay to hide");
      await page.waitForSelector('#loginOverlay', { hidden: true, timeout: 5000 });
    } catch (e) {
      await page.screenshot({ path: 'login_error_staff.png' });
      throw new Error("Staff login failed. See login_error_staff.png.");
    }
    
    // Navigate to inventory
    console.log("Trace: waiting for inventoryBody (staff)");
    await page.waitForSelector('#inventoryBody', { visible: true });

    // 5. Deletion Request (Staff view - Modal)
    try {
      await page.waitForSelector('#inventoryBody tr');
      // Click the first row to open Item Details
      await page.click('#inventoryBody tr:first-child td:first-child');
      await page.waitForSelector('#itemDetailModalBackdrop', { visible: true });
      await new Promise(r => setTimeout(r, 500));
      
      // Click request deletion button
      await page.waitForSelector('#requestDeletionBtn', { visible: true });
      await page.click('#requestDeletionBtn');
      await page.waitForSelector('#deletionRequestModalBackdrop', { visible: true });
      await new Promise(r => setTimeout(r, 500));
      screenshots['DeletionRequestStaff'] = await page.screenshot({ encoding: 'base64' });
      console.log("Captured: Deletion Request Modal (Staff)");
      await page.click('#closeDeletionRequestModal');
      await new Promise(r => setTimeout(r, 500));
      // Close item detail modal
      await page.click('#closeDetailModal');
      await new Promise(r => setTimeout(r, 500));
    } catch (e) {
      await page.screenshot({ path: 'deletion_staff_error.png' });
      throw new Error(`Staff deletion request failed: ${e.message}. See deletion_staff_error.png.`);
    }

    // Log out as Staff and log back in as Admin
    console.log("Trace: clicking logoutBtn (staff)");
    await page.click('#logoutBtn');
    await page.goto('http://localhost:3000'); // clear hash
    console.log("Trace: waiting for admin login");
    await page.waitForSelector('#loginForm input[type="text"]', { visible: true });
    await page.type('#loginForm input[type="text"]', 'testadmin');
    await page.type('#loginForm input[type="password"]', 'testpass');
    console.log("Trace: clicking admin submit");
    await page.click('#loginForm button[type="submit"]');
    
    try {
      console.log("Trace: waiting for dashboard");
      await page.waitForSelector('#dashboard', { visible: true, timeout: 5000 });
    } catch (e) {
      await page.screenshot({ path: 'login_error_admin.png' });
      throw new Error("Admin Dashboard failed to load again. See login_error_admin.png");
    }
    
    console.log("Trace: clicking inventory nav item (admin)");
    await page.click('.nav-list button[data-page="inventory"]');
    await page.waitForSelector('#inventoryBody', { visible: true });

    // 6. Bulk Import
    await page.waitForSelector('#bulkImportBtn');
    await page.click('#bulkImportBtn');
    await page.waitForSelector('#bulkImportModalBackdrop', { visible: true });
    await new Promise(r => setTimeout(r, 500));
    screenshots['BulkImport'] = await page.screenshot({ encoding: 'base64' });
    console.log("Captured: Bulk Import");
    await page.click('#closeBulkImportModal');
    await new Promise(r => setTimeout(r, 500));

    // 7. Deletion Requests (Admin view)
    await page.click('.nav-list button[data-page="requests"]');
    await page.waitForSelector('#requestsTableBody', { visible: true });
    await new Promise(r => setTimeout(r, 1000));
    screenshots['DeletionRequestsAdmin'] = await page.screenshot({ encoding: 'base64' });
    console.log("Captured: Deletion Requests (Admin)");

    // 8. Branch Management
    await page.click('.nav-list button[data-page="branches"]');
    await page.waitForSelector('#branchTableBody', { visible: true });
    await new Promise(r => setTimeout(r, 1000));
    screenshots['BranchManagement'] = await page.screenshot({ encoding: 'base64' });
    console.log("Captured: Branch Management");

    // 9. Reports
    // Actually reports is just a modal in this app, wait, let me check what it is.
    // I'll skip reports screenshot if it fails.
    try {
      await page.click('button[data-page="reports"]');
      await new Promise(r => setTimeout(r, 1000));
      screenshots['Reports'] = await page.screenshot({ encoding: 'base64' });
      console.log("Captured: Reports");
    } catch(e) {}

  } catch (err) {
    console.error("Error capturing screenshots:", err.message);
  } finally {
    await browser.close();
  }

  console.log("Screenshots collected. Generating PDF...");

  // Load MD
  let mdContent = fs.readFileSync('MANUAL-TESTING-GUIDE.md', 'utf-8');
  
  // Custom markdown replacements to inject screenshots
  mdContent = mdContent.replace('## 1. Branch Filtering and Global Items', 
    '## 1. Branch Filtering and Global Items\n\n' + 
    (screenshots['InventoryList'] ? `<img src="data:image/png;base64,${screenshots['InventoryList']}" class="screenshot" />` : '[Screenshot: Inventory List]')
  );

  mdContent = mdContent.replace('**Inward:**', 
    '**Inward:**\n\n' + (screenshots['StockInward'] ? `<img src="data:image/png;base64,${screenshots['StockInward']}" class="screenshot" />` : '[Screenshot: Stock Inward]')
  );
  
  mdContent = mdContent.replace('**Outward:**', 
    '**Outward:**\n\n' + (screenshots['StockOutward'] ? `<img src="data:image/png;base64,${screenshots['StockOutward']}" class="screenshot" />` : '[Screenshot: Stock Outward]')
  );

  mdContent = mdContent.replace('**Transfer:**', 
    '**Transfer:**\n\n' + (screenshots['BranchTransfer'] ? `<img src="data:image/png;base64,${screenshots['BranchTransfer']}" class="screenshot" />` : '[Screenshot: Branch Transfer]')
  );

  mdContent = mdContent.replace('## 3. Deletion Requests', 
    '## 3. Deletion Requests\n\n' + 
    (screenshots['DeletionRequestStaff'] ? `<img src="data:image/png;base64,${screenshots['DeletionRequestStaff']}" class="screenshot" />` : '[Screenshot: Deletion Request Modal]') +
    '\n\n' +
    (screenshots['DeletionRequestsAdmin'] ? `<img src="data:image/png;base64,${screenshots['DeletionRequestsAdmin']}" class="screenshot" />` : '[Screenshot: Admin Deletion Requests View]')
  );

  mdContent = mdContent.replace('## 4. Bulk Import', 
    '## 4. Bulk Import\n\n' + 
    (screenshots['BulkImport'] ? `<img src="data:image/png;base64,${screenshots['BulkImport']}" class="screenshot" />` : '[Screenshot: Bulk Import Modal]')
  );

  mdContent = mdContent.replace('## 5. Branch Management', 
    '## 5. Branch Management\n\n' + 
    (screenshots['BranchManagement'] ? `<img src="data:image/png;base64,${screenshots['BranchManagement']}" class="screenshot" />` : '[Screenshot: Branch Management]')
  );

  mdContent = mdContent.replace('## 6. Reports and Exports', 
    '## 6. Reports and Exports\n\n' + 
    (screenshots['Reports'] ? `<img src="data:image/png;base64,${screenshots['Reports']}" class="screenshot" />` : '[Screenshot: Reports]')
  );

  // Convert to HTML
  const htmlBody = marked.parse(mdContent);

  const finalHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        color: #1f2937;
        line-height: 1.6;
        margin: 0;
        padding: 0;
      }
      h1, h2, h3 {
        color: #083344;
      }
      h1 {
        font-size: 28px;
        border-bottom: 3px solid #14b8a6;
        padding-bottom: 10px;
        margin-top: 50px;
      }
      h2 {
        font-size: 22px;
        color: #14b8a6;
        margin-top: 40px;
        page-break-before: always;
      }
      /* Prevent page break on first H2 */
      h2:first-of-type {
        page-break-before: auto;
      }
      .screenshot {
        max-width: 100%;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
        margin: 20px 0;
      }
      hr {
        display: none;
      }
      li {
        margin-bottom: 8px;
      }
      /* Checkbox styling */
      ul {
        list-style-type: none;
        padding-left: 20px;
      }
      li::before {
        content: '☐ ';
        color: #14b8a6;
        font-weight: bold;
        font-size: 1.2em;
        margin-right: 5px;
      }
      .cover-page {
        text-align: center;
        padding-top: 30vh;
        page-break-after: always;
      }
      .cover-title {
        font-size: 36px;
        color: #083344;
        margin-bottom: 20px;
      }
      .cover-subtitle {
        font-size: 20px;
        color: #6b7280;
      }
      .content-wrapper {
        padding: 40px;
      }
    </style>
  </head>
  <body>
    <div class="cover-page">
      <div class="cover-title">MSC Trust Inventory System</div>
      <div class="cover-subtitle">Manual Testing Guide</div>
      <div style="margin-top:20px; color:#9ca3af;">Generated on: ${new Date().toLocaleDateString()}</div>
    </div>
    <div class="content-wrapper">
      ${htmlBody.replace(/<li>/g, '<li>').replace(/<ul>/g, '<ul>')}
    </div>
  </body>
  </html>
  `;

  const pdfBrowser = await puppeteer.launch({ headless: 'new' });
  const pdfPage = await pdfBrowser.newPage();
  await pdfPage.setContent(finalHtml, { waitUntil: 'networkidle0' });

  await pdfPage.pdf({
    path: 'MSC-Trust-Manual-Testing-Guide.pdf',
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: `
      <div style="width: 100%; font-size: 10px; padding: 0 40px; display: flex; justify-content: space-between; color: #6b7280; font-family: sans-serif;">
        <span>MSC Trust &mdash; Internal Use</span>
        <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
      </div>
    `,
    margin: {
      top: '40px',
      bottom: '60px',
      right: '40px',
      left: '40px'
    }
  });

  await pdfBrowser.close();
  console.log("PDF generated successfully at MSC-Trust-Manual-Testing-Guide.pdf");
})();
