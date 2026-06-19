const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, 'database', 'shop.db');
const db = new Database(dbPath);

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
  // cust_code, cust_name, mobile, car_model, car_type, plate_number, repair_id, repair_date, work_description, work_price
  const [
    cust_code, 
    cust_name, 
    mobile, 
    car_model, 
    car_type, 
    plate_number, 
    repair_id, 
    repair_date, 
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
      total_amount: 0
    };
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
      '', // odometer
      ''  // notes
    );
    repairsImported++;
  } catch (err) {
    console.error(`Error inserting repair ${r_id}:`, err.message);
  }
}

console.log('--- Migration Completed ---');
console.log(`Total new customers imported: ${customersImported}`);
console.log(`Total repair visits imported: ${repairsImported}`);
process.exit(0);
