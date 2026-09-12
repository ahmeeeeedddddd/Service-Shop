/**
 * migrate_customers_to_bodyshop.js
 *
 * Copies all customer records from the original Service-Shop database
 * into the new Body-Shop database.
 *
 * Skips duplicates by matching on phone number.
 * Also copies the cars_json column if it exists (multi-car support).
 *
 * HOW TO RUN (from any folder, using Node.js):
 *   node C:\Users\Administrator\Desktop\Service-Shop\migrate_customers_to_bodyshop.js
 *
 * REQUIREMENTS:
 *   - The original Service-Shop must have been run at least once (so its db exists)
 *   - The new Body-Shop must have been run at least once (so its db exists)
 *   - better-sqlite3 must be installed in the Service-Shop folder (it already is)
 */

const Database = require('./node_modules/better-sqlite3');
const path = require('path');
const fs   = require('fs');

// ── Paths ──────────────────────────────────────────────────────────────────
const SOURCE_DB = path.join(
  process.env.APPDATA,
  'ElAnsaryServiceShop',
  'shop.db'
);

// ⚠️  Update this to match the AppData folder name the Body-Shop app uses.
//     If the Body-Shop app uses 'ElAnsaryBodyShop', leave as-is.
//     If it uses a different name, change it here.
const TARGET_DB = path.join(
  process.env.APPDATA,
  'ElAnsaryBodyShop',
  'shop.db'
);

// ── Validate paths ─────────────────────────────────────────────────────────
if (!fs.existsSync(SOURCE_DB)) {
  console.error('❌  Source database not found at:', SOURCE_DB);
  console.error('    Make sure the original Service-Shop app has been opened at least once.');
  process.exit(1);
}

if (!fs.existsSync(TARGET_DB)) {
  console.error('❌  Target (Body-Shop) database not found at:', TARGET_DB);
  console.error('    Make sure the new Body-Shop app has been opened at least once so it creates its database.');
  process.exit(1);
}

// ── Open databases ─────────────────────────────────────────────────────────
console.log('📂  Opening source database:', SOURCE_DB);
const src = new Database(SOURCE_DB, { readonly: true });

console.log('📂  Opening target database:', TARGET_DB);
const tgt = new Database(TARGET_DB);

// ── Read all customers from source ─────────────────────────────────────────
const sourceCustomers = src.prepare('SELECT * FROM customers').all();
console.log(`\n📋  Found ${sourceCustomers.length} customers in source database.\n`);

// ── Detect if source has extra columns (multi-car cars_json, etc.) ─────────
const sourceColumns = src.prepare("PRAGMA table_info(customers)").all().map(c => c.name);
const hasCarsJson   = sourceColumns.includes('cars_json');
console.log('Source customer columns:', sourceColumns.join(', '));

// ── Detect target columns ──────────────────────────────────────────────────
const targetColumns = tgt.prepare("PRAGMA table_info(customers)").all().map(c => c.name);
const targetHasCarsJson = targetColumns.includes('cars_json');
console.log('Target customer columns:', targetColumns.join(', '));

// ── Add cars_json to target if source has it but target doesn't ────────────
if (hasCarsJson && !targetHasCarsJson) {
  console.log('\n🔧  Adding cars_json column to target customers table...');
  tgt.exec("ALTER TABLE customers ADD COLUMN cars_json TEXT DEFAULT '[]'");
}

// ── Prepare insert statement ───────────────────────────────────────────────
// We check for existing customer by phone number to avoid duplicates.
const checkExisting = tgt.prepare('SELECT id FROM customers WHERE phone = ? LIMIT 1');

let inserted = 0;
let skipped  = 0;

const insertStmt = tgt.prepare(`
  INSERT INTO customers (name, phone, car_name, plate_number, cars_json, created_at)
  VALUES (@name, @phone, @car_name, @plate_number, @cars_json, @created_at)
`);

// ── Run migration inside a transaction ────────────────────────────────────
const migrate = tgt.transaction(() => {
  for (const c of sourceCustomers) {
    // Skip if phone already exists in target (avoid duplicates)
    if (c.phone) {
      const existing = checkExisting.get(c.phone);
      if (existing) {
        console.log(`  ⏭️  Skipping duplicate: ${c.name} (${c.phone})`);
        skipped++;
        continue;
      }
    }

    insertStmt.run({
      name:        c.name        || '',
      phone:       c.phone       || '',
      car_name:    c.car_name    || '',
      plate_number: c.plate_number || '',
      cars_json:   c.cars_json   || '[]',
      created_at:  c.created_at  || new Date().toISOString()
    });

    console.log(`  ✅  Migrated: ${c.name} (${c.phone || 'no phone'})`);
    inserted++;
  }
});

migrate();

// ── Summary ────────────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════════');
console.log(`✅  Migration complete!`);
console.log(`    Inserted : ${inserted} customers`);
console.log(`    Skipped  : ${skipped} (already existed)`);
console.log(`    Target DB: ${TARGET_DB}`);
console.log('════════════════════════════════════════\n');

src.close();
tgt.close();
