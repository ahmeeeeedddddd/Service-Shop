const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

// ── Run inside Electron so better-sqlite3 never needs a rebuild ──────────────
if (!process.versions.electron) {
  const { execSync } = require('child_process');
  console.log('Re-launching migration update under Electron runtime...');
  try {
    execSync(
      `node_modules\\.bin\\electron.cmd --run-migrate "${__filename}"`,
      { cwd: __dirname, stdio: 'inherit' }
    );
  } catch (e) {
    // ignore
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
  console.log(`Connecting to database at: ${dbPath}`);
  
  let db;
  try {
    db = new Database(dbPath);
  } catch (e) {
    console.error('Failed to open database:', e);
    app.exit(1);
    return;
  }

  // Force migration for legacy_id in case db.js hasn't run it yet
  try { db.exec(`ALTER TABLE repairs ADD COLUMN legacy_id TEXT`); } catch(e) {}

  const csvPath = path.join(__dirname, 'Results_new.csv');
  if (!fs.existsSync(csvPath)) {
    console.error(`Could not find ${csvPath}`);
    app.exit(1);
    return;
  }

  console.log('Reading CSV file...');
  let records = [];
  try {
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    records = parse(csvContent, {
      skip_empty_lines: true,
      relax_quotes: true,
      relax_column_count: true
    });
  } catch (e) {
    console.error('Failed to parse CSV:', e);
    app.exit(1);
    return;
  }

  console.log(`Loaded ${records.length} rows from CSV. Processing data...`);

  // Columns:
  // 0: cust_code
  // 1: cust_name
  // 2: mobile
  // 3: car_model
  // 4: car_type
  // 5: plate_number
  // 6: repair_id
  // 7: repair_date
  // 8: odometer
  // 9: work_description
  // 10: work_price

  let newCustomersCount = 0;
  let skippedCustomersCount = 0;
  let newRepairsCount = 0;
  let skippedRepairsCount = 0;

  const insertCustomerStmt = db.prepare('INSERT INTO customers (name, phone, car_name, plate_number) VALUES (?, ?, ?, ?)');
  const checkCustomerStmt = db.prepare('SELECT id FROM customers WHERE phone = ?');
  
  const insertRepairStmt = db.prepare(`
    INSERT INTO repairs (customer_id, description, date, total_amount, odometer, payment_method, legacy_id)
    VALUES (?, ?, ?, ?, ?, 'unknown', ?)
  `);
  const checkRepairStmt = db.prepare('SELECT id FROM repairs WHERE legacy_id = ?');

  // We need to group by repair_id
  const repairsMap = new Map(); // key: repair_id, value: array of rows
  
  // Process customers first, then group repairs
  const customerMobileCache = new Set(); // to avoid repeatedly querying DB for the same mobile in the CSV

  // Pre-load all existing phones into cache
  const existingCustomers = db.prepare("SELECT phone FROM customers WHERE phone IS NOT NULL AND phone != ''").all();
  existingCustomers.forEach(c => customerMobileCache.add(c.phone));
  skippedCustomersCount = existingCustomers.length; // Just informational, but user specifically meant "skipped from CSV"
  skippedCustomersCount = 0;

  db.transaction(() => {
    for (const row of records) {
      if (row.length < 11) continue; // Skip malformed rows
      
      const cust_name = row[1] ? row[1].trim() : 'Unknown';
      let mobile = row[2] ? row[2].trim() : '';
      const car_type = row[4] ? row[4].trim() : '';
      const plate_number = row[5] ? row[5].trim() : '';
      const repair_id = row[6] ? row[6].trim() : '';
      
      if (mobile === '' || mobile === '0') {
          // generate a dummy mobile based on cust_name to group them if no mobile exists
          mobile = 'N/A-' + cust_name; 
      }

      // Handle Customer
      if (!customerMobileCache.has(mobile)) {
        // Customer does not exist in DB or in our new cache
        try {
          insertCustomerStmt.run(cust_name, mobile, car_type, plate_number);
          customerMobileCache.add(mobile);
          newCustomersCount++;
        } catch (e) {
          console.error(`Failed to insert customer ${cust_name}:`, e);
        }
      } else {
        // Duplicate customer
      }

      // Handle Repair grouping
      if (!repair_id || repair_id.toLowerCase() === 'null') {
        continue; // Skip rows where repair_id is missing/NULL
      }

      if (!repairsMap.has(repair_id)) {
        repairsMap.set(repair_id, []);
      }
      repairsMap.get(repair_id).push(row);
    }

    // Now process the grouped repairs
    for (const [legacyId, rows] of repairsMap.entries()) {
      // Check if repair already exists
      const existingRepair = checkRepairStmt.get(legacyId);
      if (existingRepair) {
        skippedRepairsCount++;
        continue;
      }

      // We need the customer_id for this repair
      let mobile = rows[0][2] ? rows[0][2].trim() : '';
      const cust_name = rows[0][1] ? rows[0][1].trim() : 'Unknown';
      if (mobile === '' || mobile === '0') mobile = 'N/A-' + cust_name;

      const cust = checkCustomerStmt.get(mobile);
      if (!cust) {
        console.warn(`Customer with mobile ${mobile} not found for repair ${legacyId}. Skipping repair.`);
        continue;
      }

      const customer_id = cust.id;
      const date = rows[0][7] ? rows[0][7].trim() : new Date().toISOString().split('T')[0];
      
      // Find first valid odometer
      let odometer = '';
      for (const r of rows) {
        const od = r[8] ? r[8].trim() : '';
        if (od && od !== '0') {
          odometer = od;
          break;
        }
      }

      // Build description and sum prices
      const descriptions = [];
      let totalAmount = 0;
      for (const r of rows) {
        const desc = r[9] ? r[9].trim() : '';
        if (desc) descriptions.push(desc);
        
        const price = parseFloat(r[10]) || 0;
        totalAmount += price;
      }

      const finalDescription = descriptions.join(' | ');

      // Insert repair
      try {
        insertRepairStmt.run(customer_id, finalDescription, date, totalAmount, odometer, legacyId);
        newRepairsCount++;
      } catch (e) {
        console.error(`Failed to insert repair ${legacyId}:`, e);
      }
    }
  })();

  // Calculate actual skipped customers from CSV (rows - new - those with no repair id)
  // But a more accurate count is just length of Set minus original Set size, which we tracked via newCustomersCount.
  // Actually, we can just say "added X customers, skipped duplicates".

  console.log('====================================');
  console.log(' Migration Update Completed!        ');
  console.log('====================================');
  console.log(` New Customers Added:      ${newCustomersCount}`);
  console.log(` New Repairs Added:        ${newRepairsCount}`);
  console.log(` Skipped Repairs (Exists): ${skippedRepairsCount}`);
  console.log('====================================');

  app.quit();
});
