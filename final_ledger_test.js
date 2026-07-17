const sqlite = require('better-sqlite3');
const path = require('path');
const ExcelJS = require('exceljs');
const db = new sqlite(path.join(__dirname, 'database.db'));

function formatToDDMMYYYY(dateStr) {
  if (!dateStr || dateStr === '-') return '-';
  let s = dateStr.replace('T', ' ').trim();
  const parts = s.split(' ');
  if (parts.length >= 2) {
    const dParts = parts[0].split('-');
    if (dParts.length === 3) {
       const tParts = parts[1].split(':');
       if (tParts.length >= 2) {
         return `${dParts[2]}/${dParts[1]}/${dParts[0]} ${tParts[0]}:${tParts[1]}`;
       }
    }
  }
  return dateStr;
}

async function test() {
  const req = {
    user: { role: 'admin' },
    query: {
      startDate: '2026-07-01',
      endDate: '2026-07-17',
      branch_id: '',
      category: '',
      action_type: ''
    }
  };

  const startDate = new Date(req.query.startDate).toISOString();
  const end = new Date(req.query.endDate);
  end.setHours(23, 59, 59, 999);
  const endDate = end.toISOString();

  const condition = '1=1';
  const params = [];
  const branchMap = {};
  db.prepare('SELECT id, name FROM branches').all().forEach(b => branchMap[b.id] = b.name);
  const blockMap = {};

  let baseCatCond = '';
  const baseParams = [];

  const allItems = db.prepare(`SELECT id, name, item_code, serial_number, category, unit, unit_price, program, branch_id, stock, created_at FROM inventory_items WHERE id = ?`).all('f1ae4118-bedd-478d-b5b7-071e47581256');

  const itemMap = {};
  allItems.forEach(i => {
    itemMap[i.id] = { ...i, reverse_stock: i.stock };
  });

  const movsAfterStart = db.prepare(`
    SELECT m.item_id, m.movement_type, m.quantity
    FROM inventory_movements m
    WHERE m.item_id = 'f1ae4118-bedd-478d-b5b7-071e47581256' AND m.created_at >= ? AND (m.voided IS NULL OR m.voided = 0) AND m.reference_code NOT LIKE 'VOID-%'
  `).all(startDate);

  movsAfterStart.forEach(m => {
    if(itemMap[m.item_id]) {
      if(m.movement_type === 'IN') itemMap[m.item_id].reverse_stock -= m.quantity;
      else if(m.movement_type === 'OUT') itemMap[m.item_id].reverse_stock += m.quantity;
    }
  });

  const combined = [];

  allItems.forEach(i => {
    if (i.created_at < startDate) {
      combined.push({
        _item_id: i.id,
        _date_obj: new Date(new Date(startDate).getTime() - 1),
        _type_code: 'BBF',
        date: formatToDDMMYYYY(new Date(startDate).toISOString()),
        eventType: 'Balance Brought Forward',
        item: i.name, code: i.item_code || '-',
        qtyIn: '', qtyOut: '', bal: itemMap[i.id].reverse_stock
      });
    } else if (i.created_at >= startDate && i.created_at <= endDate) {
      combined.push({
        _item_id: i.id,
        _date_obj: new Date(i.created_at),
        _type_code: 'E',
        date: i.created_at,
        eventType: 'Opening Stock',
        item: i.name, code: i.item_code || '-',
        qtyIn: i.stock, qtyOut: '', bal: null
      });
    }
  });

  const movements = db.prepare(`
    SELECT m.*, i.name as item_name, i.item_code as i_code
    FROM inventory_movements m
    JOIN inventory_items i ON m.item_id = i.id
    WHERE m.item_id = 'f1ae4118-bedd-478d-b5b7-071e47581256' AND m.created_at >= ? AND m.created_at <= ? 
  `).all(startDate, endDate);

  movements.forEach(m => {
    const isTransfer = (m.reference_code && m.reference_code.startsWith('TRF-')) ? true : false;
    const isVoid = (m.voided || (m.reference_code && m.reference_code.startsWith('VOID-'))) ? true : false;
    
    let evType = '';
    let typeCode = '';
    let qIn = ''; let qOut = '';
    
    if (isVoid) {
      evType = 'Voided / Corrected'; typeCode = 'H';
      if (m.movement_type === 'IN') qIn = m.quantity; else qOut = m.quantity;
    } else if (m.movement_type === 'IN') {
      if (isTransfer) {
        evType = 'Received from Branch'; typeCode = 'D';
        qIn = m.quantity;
      } else {
        evType = 'Stock Received'; typeCode = 'A';
        qIn = m.quantity;
      }
    } else if (m.movement_type === 'OUT') {
      if (isTransfer) {
        evType = 'Sent to Branch'; typeCode = 'C';
        qOut = m.quantity;
      } else {
        evType = 'Issued to Program'; typeCode = 'B';
        qOut = m.quantity;
      }
    }

    combined.push({
      _item_id: m.item_id,
      _date_obj: new Date(m.created_at),
      _type_code: typeCode,
      date: m.created_at,
      eventType: evType,
      item: m.item_name, code: m.item_code || m.i_code || '-',
      qtyIn: qIn, qtyOut: qOut, bal: null
    });
  });

  combined.sort((a, b) => a._date_obj - b._date_obj);

  const finalCombined = [];
  const itemHasEvents = {};

  combined.forEach(ev => {
    if (ev._type_code !== 'BBF') {
      itemHasEvents[ev._item_id] = true;
    }
  });

  const currentBal = {};

  combined.forEach(ev => {
    if (ev._type_code === 'BBF') {
      if (itemHasEvents[ev._item_id]) {
        currentBal[ev._item_id] = ev.bal;
        finalCombined.push(ev);
      }
    } else {
      if (currentBal[ev._item_id] === undefined) currentBal[ev._item_id] = 0;
      
      let inQ = parseFloat(ev.qtyIn) || 0;
      let outQ = parseFloat(ev.qtyOut) || 0;
      
      if (ev._type_code !== 'H' && ev._type_code !== 'F') {
         currentBal[ev._item_id] = currentBal[ev._item_id] + inQ - outQ;
      }
      ev.bal = currentBal[ev._item_id];
      if (ev.date) ev.date = formatToDDMMYYYY(ev.date);
      
      finalCombined.push(ev);
    }
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Stock Ledger');

  sheet.addRow(['Header Spacer']);
  sheet.addRow(['Header Spacer']);
  sheet.addRow(['Header Spacer']);
  sheet.addRow(['S.No', 'Date', 'Event Type', 'Item', 'Code', 'Cat', 'Branch', 'Loc', 'Qty In', 'Qty Out', 'Bal']);

  let sno = 1;
  let totalQtyIn = 0;
  let totalQtyOut = 0;

  finalCombined.forEach(m => {
    const row = sheet.addRow([
      (m._type_code === 'BBF' ? '-' : sno++), m.date, m.eventType, m.item, m.code, '-', '-', '-',
      m.qtyIn, m.qtyOut, m.bal
    ]);

    let rowColor = 'FFFFFFFF';
    if (m._type_code === 'BBF') { rowColor = 'FFF1F5F9'; } // Light Grey
    else if (m._type_code === 'A') { rowColor = 'FFE6FAF5'; } // Green
    else if (m._type_code === 'B') { rowColor = 'FFFEF2F2'; } // Red
    else if (m._type_code === 'C' || m._type_code === 'D') { rowColor = 'FFEFF6FF'; } // Blue
    else if (m._type_code === 'H') { rowColor = 'FFF1F5F9'; } // Light Grey

    row.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowColor } };
      if (m._type_code === 'H') cell.font = { strike: true };
      if (m._type_code === 'BBF') cell.font = { italic: true };
    });

    if (m._type_code !== 'BBF' && m._type_code !== 'H') {
      totalQtyIn += parseFloat(m.qtyIn) || 0;
      totalQtyOut += parseFloat(m.qtyOut) || 0;
    }
  });

  const totalRow = sheet.addRow(['TOTALS', '', '', '', '', '', '', '', totalQtyIn, totalQtyOut, '']);
  
  // Output Verification
  console.log("=== EXCEL DATA ROW BY ROW ===");
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 4) {
      let color = row.getCell(2).fill ? row.getCell(2).fill.fgColor.argb : 'None';
      let fontItalic = row.getCell(2).font && row.getCell(2).font.italic ? 'Yes' : 'No';
      let fontStrike = row.getCell(2).font && row.getCell(2).font.strike ? 'Yes' : 'No';
      console.log(`[Color: ${color}, Italic: ${fontItalic}, Strike: ${fontStrike}] | ` + row.values.slice(1).join(' | '));
    }
  });
}

test();
