const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

// ── Run inside Electron so better-sqlite3 never needs a rebuild ──────────────
// When called via `node migrate.js`, re-spawn under Electron and exit.
if (!process.versions.electron) {
  const { execSync } = require('child_process');
  console.log('Re-launching migration under Electron runtime...');
  try {
    execSync(
      `node_modules/.bin/electron --run-migrate "${__filename}"`,
      { cwd: __dirname, stdio: 'inherit' }
    );
  } catch (e) {
    // non-zero exit from Electron is normal (it exits with 1 on app.exit(0) sometimes)
  }
  process.exit(0);
}

// ── Running inside Electron ───────────────────────────────────────────────────
const { app } = require('electron');
const Database = require('better-sqlite3');

app.whenReady().then(() => {

const dbDir = process.env.APPDATA
  ? path.join(process.env.APPDATA, 'ElAnsaryServiceShop')
  : path.join(__dirname, 'database');

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'shop.db');
const db = new Database(dbPath);

console.log('Clearing old migration data...');
db.prepare('DELETE FROM repair_items').run();
db.prepare('DELETE FROM repairs').run();
db.prepare('DELETE FROM customers').run();
try {
  db.prepare('DELETE FROM supplier_transactions').run();
} catch (e) {
  // Ignored if table doesn't exist
}
try {
  db.prepare('DELETE FROM suppliers').run();
} catch (e) {
  // Ignored if table doesn't exist
}
try {
  db.prepare('DELETE FROM sqlite_sequence WHERE name IN ("customers", "repairs", "repair_items", "suppliers", "supplier_transactions")').run();
} catch (e) {
  // Ignored if sqlite_sequence doesn't exist
}

console.log('Starting data migration...');

const csvPath = path.join(__dirname, 'Results.csv');
if (!fs.existsSync(csvPath)) {
  console.error(`Cannot find CSV file at ${csvPath}`);
  process.exit(1);
}

const fileContent = fs.readFileSync(csvPath, 'utf8');

// Parse the CSV
// Assuming no headers present as specified
const records = parse(fileContent, {
  skip_empty_lines: true,
  trim: true
});

let customersImported = 0;
let repairsImported = 0;

// Track which cust_code maps to which database customer_id
const custCodeToDbId = {};

// Group repairs by repair_id
const repairGroups = {};

// Prepare SQL statements
const insertCustomer = db.prepare('INSERT INTO customers (name, phone, car_name, plate_number) VALUES (?, ?, ?, ?)');
const updateCustomerStmt = db.prepare('UPDATE customers SET name = ?, car_name = ?, plate_number = ? WHERE id = ?');
const getCustomerByPhone = db.prepare('SELECT id FROM customers WHERE phone = ?');
const getCustomerByExactNameAndPhone = db.prepare('SELECT id FROM customers WHERE name = ? AND phone = ?');

for (const row of records) {
  // cust_code, cust_name, mobile, car_model, car_type, plate_number, repair_id, repair_date, odometer, work_description, work_price
  const [
    cust_code, 
    cust_name, 
    mobile, 
    car_model, 
    car_type, 
    plate_number, 
    repair_id, 
    repair_date, 
    odometer,
    work_description, 
    work_price
  ] = row;

  if (!cust_code) continue; // Skip lines with absolutely no customer code

  // Step 2: Insert customers uniquely
  if (!custCodeToDbId[cust_code]) {
    let existingCustomerId = null;
    
    // Some phones might be empty, if so, we can't search by phone
    if (mobile && mobile.toLowerCase() !== 'null') {
      const existing = getCustomerByPhone.get(mobile);
      if (existing) {
        existingCustomerId = existing.id;
      }
    } else if (cust_name) {
       // if no mobile, let's just make sure we don't have exactly same name/phone match
       const existing = getCustomerByExactNameAndPhone.get(cust_name, mobile || '');
       if (existing) existingCustomerId = existing.id;
    }

    if (existingCustomerId) {
      custCodeToDbId[cust_code] = existingCustomerId;
    } else {
      const carNamePieces = [];
      if (car_model && car_model.toLowerCase() !== 'null') carNamePieces.push(car_model);
      if (car_type && car_type.toLowerCase() !== 'null') carNamePieces.push(car_type);
      const carName = carNamePieces.join(' ');
      
      const p_name = cust_name && cust_name.toLowerCase() !== 'null' ? cust_name : 'Unknown';
      const p_phone = mobile && mobile.toLowerCase() !== 'null' ? mobile : '';
      const p_plate = plate_number && plate_number.toLowerCase() !== 'null' ? plate_number : '';

      try {
        const info = insertCustomer.run(p_name, p_phone, carName, p_plate);
        custCodeToDbId[cust_code] = info.lastInsertRowid;
        customersImported++;
      } catch (err) {
        console.error(`Error inserting customer ${p_name}:`, err.message);
      }
    }
  }

  // Step 3: Handle repair grouping
  if (!repair_id || repair_id.toUpperCase() === 'NULL' || repair_id.trim() === '') {
    continue; // Skip lines with no repair record
  }

  if (!repairGroups[repair_id]) {
    repairGroups[repair_id] = {
      cust_code: cust_code,
      repair_date: repair_date,
      descriptions: [],
      total_amount: 0,
      odometer: ''
    };
  }

  if (odometer && odometer.toUpperCase() !== 'NULL') {
    const odoVal = parseInt(odometer, 10);
    if (!isNaN(odoVal) && odoVal !== 0) {
      if (!repairGroups[repair_id].odometer || repairGroups[repair_id].odometer === '') {
        repairGroups[repair_id].odometer = String(odoVal);
      }
    }
  }

  if (work_description && work_description.toUpperCase() !== 'NULL') {
    repairGroups[repair_id].descriptions.push(work_description);
  }

  if (work_price && work_price.toUpperCase() !== 'NULL') {
    const price = parseFloat(work_price);
    if (!isNaN(price)) {
      repairGroups[repair_id].total_amount += price;
    }
  }
}

// Prepare insert statement for repairs
const insertRepair = db.prepare(`
  INSERT INTO repairs (customer_id, description, date, total_amount, payment_method, odometer, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

// Insert the grouped repairs into the database
for (const [r_id, group] of Object.entries(repairGroups)) {
  const customerDbId = custCodeToDbId[group.cust_code];
  
  if (!customerDbId) {
    console.log(`Warning: Found repair ${r_id} but couldn't resolve customer ID. Skipping.`);
    continue;
  }

  const combinedDescription = group.descriptions.length > 0 ? group.descriptions.join(' | ') : 'No description';
  
  let finalDate = '';
  if (group.repair_date && group.repair_date.toUpperCase() !== 'NULL') {
    finalDate = group.repair_date;
  } else {
    // If date is missing, set to today format YYYY-MM-DD
    finalDate = new Date().toISOString().split('T')[0];
  }

  try {
    insertRepair.run(
      customerDbId, 
      combinedDescription, 
      finalDate, 
      group.total_amount, 
      'unknown', // payment_method
      group.odometer || '', // odometer
      ''  // notes
    );
    repairsImported++;
  } catch (err) {
    console.error(`Error inserting repair ${r_id}:`, err.message);
  }
}

// --- Supplier & Supplier History Migration ---
console.log('Starting supplier migration...');
const suppliersCsvPath = path.join(__dirname, 'suppliers.csv');
const insertSupplier = db.prepare('INSERT INTO suppliers (name, contact_number, supplies_what, notes, pending_amount) VALUES (?, ?, ?, ?, ?)');

let suppliersImported = 0;
const compCodeToDbId = {};
const supplierStartValues = {};

if (fs.existsSync(suppliersCsvPath)) {
  const suppliersContent = fs.readFileSync(suppliersCsvPath, 'utf8');
  const suppliersRecords = parse(suppliersContent, {
    skip_empty_lines: true,
    trim: true
  });

  for (const row of suppliersRecords) {
    const [comp_code, comp_name, start_value] = row;
    if (!comp_code || !comp_name) continue;

    const startVal = parseFloat(start_value) || 0;

    try {
      const info = insertSupplier.run(comp_name, '', '', '', startVal);
      const dbId = info.lastInsertRowid;
      compCodeToDbId[comp_code] = dbId;
      supplierStartValues[dbId] = startVal;
      suppliersImported++;
    } catch (err) {
      console.error(`Error inserting supplier ${comp_name}:`, err.message);
    }
  }
}

const historyCsvPath = path.join(__dirname, 'supplierhistory.csv');
if (fs.existsSync(historyCsvPath)) {
  const historyContent = fs.readFileSync(historyCsvPath, 'utf8');
  const historyRecords = parse(historyContent, {
    skip_empty_lines: true,
    trim: true
  });

  // Group history records by comp_code
  const historyByCompCode = {};
  for (const row of historyRecords) {
    const [comp_code, date, credit, debit, note] = row;
    if (!comp_code) continue;

    if (!historyByCompCode[comp_code]) {
      historyByCompCode[comp_code] = [];
    }

    historyByCompCode[comp_code].push({
      date: date || '',
      credit: parseFloat(credit) || 0,
      debit: parseFloat(debit) || 0,
      note: note || ''
    });
  }

  const insertTransaction = db.prepare(`
    INSERT INTO supplier_transactions (supplier_id, date, type, amount, balance_after, note)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const updateSupplierBalance = db.prepare(`
    UPDATE suppliers SET pending_amount = ? WHERE id = ?
  `);

  let transactionsImported = 0;

  for (const [comp_code, transactions] of Object.entries(historyByCompCode)) {
    const supplierDbId = compCodeToDbId[comp_code];
    if (!supplierDbId) continue;

    // Sort chronologically by date
    transactions.sort((a, b) => {
      const dateA = a.date ? new Date(a.date.replace(/-/g, '/')) : new Date(0);
      const dateB = b.date ? new Date(b.date.replace(/-/g, '/')) : new Date(0);
      return dateA - dateB;
    });

    let runningBalance = supplierStartValues[supplierDbId] || 0;

    for (const tx of transactions) {
      let type = 'purchase';
      let amount = 0;

      if (tx.debit > 0) {
        type = 'purchase';
        amount = tx.debit;
        runningBalance += tx.debit;
      } else if (tx.credit > 0) {
        type = 'payment';
        amount = tx.credit;
        runningBalance -= tx.credit;
      } else {
        type = 'purchase';
        amount = 0;
      }

      try {
        insertTransaction.run(
          supplierDbId,
          tx.date,
          type,
          amount,
          runningBalance,
          tx.note
        );
        transactionsImported++;
      } catch (err) {
        console.error(`Error inserting transaction for supplier ID ${supplierDbId}:`, err.message);
      }
    }

    // Update supplier's pending_amount to the final running balance
    try {
      updateSupplierBalance.run(runningBalance, supplierDbId);
    } catch (err) {
      console.error(`Error updating balance for supplier ID ${supplierDbId}:`, err.message);
    }
  }

  console.log(`Total new suppliers imported: ${suppliersImported}`);
  console.log(`Total supplier transactions imported: ${transactionsImported}`);
}

console.log('--- Migration Completed ---');
console.log(`Total new customers imported: ${customersImported}`);
console.log(`Total repair visits imported: ${repairsImported}`);

app.exit(0);
}); // end app.whenReady
