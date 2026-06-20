const db = require('./config/db');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function migrateFiles() {
  console.log('Starting file migration...');

  // Ensure directories exist
  const uploadDirs = ['uploads/products', 'uploads/bills', 'uploads/invoices'];
  uploadDirs.forEach(dir => {
    fs.mkdirSync(path.join(__dirname, dir), { recursive: true });
  });

  const items = db.prepare('SELECT id, product_photo_url, bill_image_url, invoice_pdf_url FROM inventory_items').all();

  const downloadAndProcess = async (url, folderName) => {
    try {
      console.log('Downloading: ' + url);
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch ' + url + ': ' + response.statusText);
      
      const buffer = await response.arrayBuffer();
      const fileBuffer = Buffer.from(buffer);
      
      const isPdf = url.toLowerCase().endsWith('.pdf') || url.includes('.pdf?');
      
      if (!isPdf) {
        // Compress image using sharp
        const filename = Date.now() + '-' + Math.round(Math.random() * 1E9) + '.webp';
        const filepath = path.join(__dirname, 'uploads', folderName, filename);
        
        await sharp(fileBuffer)
          .resize({ width: 800, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toFile(filepath);
          
        return '/uploads/' + folderName + '/' + filename;
      } else {
        // Save PDF directly
        const filename = Date.now() + '-' + Math.round(Math.random() * 1E9) + '.pdf';
        const filepath = path.join(__dirname, 'uploads', folderName, filename);
        
        fs.writeFileSync(filepath, fileBuffer);
        return '/uploads/' + folderName + '/' + filename;
      }
    } catch (err) {
      console.error('Error processing ' + url + ':', err.message);
      return null;
    }
  };

  let processedCount = 0;

  for (const item of items) {
    let updated = false;
    let newProductUrl = item.product_photo_url;
    let newBillUrl = item.bill_image_url;
    let newInvoiceUrl = item.invoice_pdf_url;

    if (item.product_photo_url && item.product_photo_url.startsWith('http')) {
      const localUrl = await downloadAndProcess(item.product_photo_url, 'products');
      if (localUrl) {
        newProductUrl = localUrl;
        updated = true;
      }
    }
    
    if (item.bill_image_url && item.bill_image_url.startsWith('http')) {
      const localUrl = await downloadAndProcess(item.bill_image_url, 'bills');
      if (localUrl) {
        newBillUrl = localUrl;
        updated = true;
      }
    }
    
    if (item.invoice_pdf_url && item.invoice_pdf_url.startsWith('http')) {
      const localUrl = await downloadAndProcess(item.invoice_pdf_url, 'invoices');
      if (localUrl) {
        newInvoiceUrl = localUrl;
        updated = true;
      }
    }

    if (updated) {
      db.prepare('UPDATE inventory_items SET product_photo_url = ?, bill_image_url = ?, invoice_pdf_url = ? WHERE id = ?').run(newProductUrl, newBillUrl, newInvoiceUrl, item.id);
      processedCount++;
    }
  }

  console.log('File migration completed. Updated ' + processedCount + ' items.');
}

migrateFiles().catch(console.error);
