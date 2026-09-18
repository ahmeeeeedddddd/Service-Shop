import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Supabase environment variables missing in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

// Locate Main Shop SQLite DB
// Priority: workspace root shop.db (most recent) → APPDATA → main-shop/database
const workspaceRootDb = path.join(__dirname, '..', 'shop.db');
const appdataPath = path.join(process.env.APPDATA || '', 'ElAnsaryServiceShop', 'shop.db');
const legacyPath = path.join(__dirname, '..', 'main-shop', 'database', 'shop.db');

const dbPath = fs.existsSync(workspaceRootDb)
  ? workspaceRootDb
  : fs.existsSync(appdataPath)
  ? appdataPath
  : legacyPath;

if (!fs.existsSync(dbPath)) {
  console.error(`❌ Main Shop SQLite database not found. Tried:\n  ${workspaceRootDb}\n  ${appdataPath}\n  ${legacyPath}`);
  process.exit(1);
}

console.log(`📂 Opening Main Shop SQLite database: ${dbPath}`);
const sqlite = new Database(dbPath, { readonly: true });

function chunkArray<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

async function migrateMainShop() {
  console.log('🚀 Starting Fast Batched Main Shop Migration to Supabase Postgres...');
  const stats = {
    customers: 0,
    suppliers: 0,
    supplierTransactions: 0,
    parts: 0,
    employees: 0,
    expenses: 0,
    repairs: 0,
    repairItems: 0,
    pendingBills: 0,
    errors: 0,
  };

  // 1. Ensure branch records exist
  await supabase.from('branches').upsert([
    { id: 'main-shop', name: 'Main Shop' },
    { id: 'body-shop', name: 'Body & Paint Shop' },
  ]);

  // 2. Migrate Customers in Batches
  const customerIdMap: Record<number, number> = {};
  const phoneMap: Record<string, number> = {};

  try {
    const custRows: any[] = sqlite.prepare('SELECT * FROM customers').all();
    console.log(`📋 Found ${custRows.length} customers in Main Shop SQLite.`);

    const custBatches = chunkArray(custRows, 250);
    for (let i = 0; i < custBatches.length; i++) {
      const batch = custBatches[i];
      const payload = batch.map((r) => ({
        name: r.name || 'Unknown Customer',
        phone: r.phone || null,
        car_name: r.car_name || null,
        plate_number: r.plate_number || null,
      }));

      const { data, error } = await supabase.from('customers').insert(payload).select('id, phone');
      if (error) {
        console.error(`Error inserting customer batch ${i}:`, error.message);
        stats.errors += batch.length;
      } else if (data) {
        data.forEach((inserted, index) => {
          const originalId = batch[index].id;
          customerIdMap[originalId] = inserted.id;
          if (inserted.phone) phoneMap[inserted.phone.trim()] = inserted.id;
        });
        stats.customers += data.length;
      }
      process.stdout.write(`\r  Customers progress: ${stats.customers}/${custRows.length}`);
    }
    console.log('\n  ✅ Customers batch migration finished.');
  } catch (err: any) {
    console.error('Error migrating customers:', err.message);
  }

  // Save phoneMap cache for body shop deduplication
  const cachePath = path.join(__dirname, '.customer_phone_map.json');
  fs.writeFileSync(cachePath, JSON.stringify(phoneMap, null, 2));

  // 3. Migrate Suppliers
  const supplierIdMap: Record<number, number> = {};
  try {
    const suppRows: any[] = sqlite.prepare('SELECT * FROM suppliers').all();
    console.log(`📋 Found ${suppRows.length} suppliers.`);

    if (suppRows.length > 0) {
      const payload = suppRows.map((r) => ({
        name: r.name,
        contact_number: r.contact_number || null,
        supplies_what: r.supplies_what || null,
        notes: r.notes || null,
        pending_amount: r.pending_amount || 0,
      }));

      const { data, error } = await supabase.from('suppliers').insert(payload).select('id');
      if (error) {
        console.error('Error inserting suppliers:', error.message);
        stats.errors += suppRows.length;
      } else if (data) {
        data.forEach((inserted, index) => {
          supplierIdMap[suppRows[index].id] = inserted.id;
        });
        stats.suppliers += data.length;
      }
    }
  } catch (err: any) {
    console.error('Error migrating suppliers:', err.message);
  }

  // 4. Migrate Supplier Transactions
  try {
    const transRows: any[] = sqlite.prepare('SELECT * FROM supplier_transactions').all();
    console.log(`📋 Found ${transRows.length} supplier transactions.`);

    const validTrans = transRows
      .filter((r) => supplierIdMap[r.supplier_id])
      .map((r) => ({
        supplier_id: supplierIdMap[r.supplier_id],
        date: r.date || null,
        type: r.type,
        amount: r.amount || 0,
        balance_after: r.balance_after || 0,
        note: r.note || null,
      }));

    if (validTrans.length > 0) {
      const batches = chunkArray(validTrans, 250);
      for (const batch of batches) {
        const { error } = await supabase.from('supplier_transactions').insert(batch);
        if (error) stats.errors += batch.length;
        else stats.supplierTransactions += batch.length;
      }
    }
  } catch (err: any) {
    console.error('Error migrating supplier transactions:', err.message);
  }

  // 5. Migrate Parts / Inventory
  try {
    const partsRows: any[] = sqlite.prepare('SELECT * FROM parts').all();
    console.log(`📋 Found ${partsRows.length} parts.`);

    if (partsRows.length > 0) {
      const payload = partsRows.map((r) => ({
        name: r.name,
        category: r.category || null,
        quantity_in_stock: r.quantity_in_stock || 0,
        unit_price: r.unit_price || 0,
        supplier_id: r.supplier_id ? supplierIdMap[r.supplier_id] || null : null,
      }));

      const batches = chunkArray(payload, 250);
      for (const batch of batches) {
        const { error } = await supabase.from('parts').insert(batch);
        if (error) stats.errors += batch.length;
        else stats.parts += batch.length;
      }
    }
  } catch (err: any) {
    console.error('Error migrating parts:', err.message);
  }

  // 6. Migrate Employees
  try {
    const empRows: any[] = sqlite.prepare('SELECT * FROM employees').all();
    console.log(`📋 Found ${empRows.length} employees.`);

    if (empRows.length > 0) {
      const payload = empRows.map((r) => ({
        employee_id: r.employee_id || null,
        name: r.name,
        role: r.role || null,
        daily_rate: r.daily_rate || 0,
        accumulated_deductions: r.accumulated_deductions || 0,
        pending_adjustments: r.pending_adjustments || '[]',
        branch_id: 'main-shop',
      }));

      const { error } = await supabase.from('employees').insert(payload);
      if (error) stats.errors += empRows.length;
      else stats.employees += empRows.length;
    }
  } catch (err: any) {
    console.error('Error migrating employees:', err.message);
  }

  // 7. Migrate Expenses
  try {
    const expRows: any[] = sqlite.prepare('SELECT * FROM expenses').all();
    console.log(`📋 Found ${expRows.length} expenses.`);

    if (expRows.length > 0) {
      const payload = expRows.map((r) => ({
        description: r.description || null,
        amount: r.amount || 0,
        category: r.category || null,
        date: r.date || null,
        from_cash: r.from_cash !== undefined ? Boolean(r.from_cash) : true,
        branch_id: 'main-shop',
      }));

      const batches = chunkArray(payload, 250);
      for (const batch of batches) {
        const { error } = await supabase.from('expenses').insert(batch);
        if (error) stats.errors += batch.length;
        else stats.expenses += batch.length;
      }
    }
  } catch (err: any) {
    console.error('Error migrating expenses:', err.message);
  }

  // 8. Migrate Repairs and Repair Items in Batches
  const repairIdMap: Record<number, number> = {};
  try {
    const repairRows: any[] = sqlite.prepare('SELECT * FROM repairs').all();
    console.log(`📋 Found ${repairRows.length} repairs.`);

    const repairBatches = chunkArray(repairRows, 250);
    for (let i = 0; i < repairBatches.length; i++) {
      const batch = repairBatches[i];
      const payload = batch.map((r) => ({
        customer_id: r.customer_id ? customerIdMap[r.customer_id] || null : null,
        description: r.description || null,
        date: r.date || null,
        total_amount: r.total_amount || 0,
        paid_amount: r.paid_amount || 0,
        pending_amount: r.pending_amount || 0,
        discount: r.discount || 0,
        payment_method: r.payment_method || null,
        odometer: r.odometer || null,
        notes: r.notes || null,
        legacy_id: r.legacy_id || null,
        branch_id: 'main-shop',
      }));

      const { data, error } = await supabase.from('repairs').insert(payload).select('id');
      if (error) {
        console.error(`Error inserting repair batch ${i}:`, error.message);
        stats.errors += batch.length;
      } else if (data) {
        data.forEach((inserted, index) => {
          repairIdMap[batch[index].id] = inserted.id;
        });
        stats.repairs += data.length;
      }
      process.stdout.write(`\r  Repairs progress: ${stats.repairs}/${repairRows.length}`);
    }
    console.log('\n  ✅ Repairs batch migration finished.');

    // Repair items
    const itemRows: any[] = sqlite.prepare('SELECT * FROM repair_items').all();
    console.log(`📋 Found ${itemRows.length} repair items.`);

    const validItems = itemRows
      .filter((r) => repairIdMap[r.repair_id])
      .map((r) => ({
        repair_id: repairIdMap[r.repair_id],
        item_name: r.item_name || null,
        quantity: r.quantity || 1,
        unit_price: r.unit_price || 0,
      }));

    if (validItems.length > 0) {
      const itemBatches = chunkArray(validItems, 500);
      for (const batch of itemBatches) {
        const { error } = await supabase.from('repair_items').insert(batch);
        if (error) stats.errors += batch.length;
        else stats.repairItems += batch.length;
      }
    }
  } catch (err: any) {
    console.error('Error migrating repairs/items:', err.message);
  }

  // 9. Migrate Pending Bills
  try {
    const billRows: any[] = sqlite.prepare('SELECT * FROM pending_bills').all();
    console.log(`📋 Found ${billRows.length} pending bills.`);

    if (billRows.length > 0) {
      const payload = billRows.map((r) => ({
        customer_id: r.customer_id ? customerIdMap[r.customer_id] || null : null,
        description: r.description || null,
        date_created: r.date_created || null,
        total_amount: r.total_amount || 0,
        payment_method: r.payment_method || null,
        odometer: r.odometer || null,
        notes: r.notes || null,
        line_items_json: r.line_items_json || '[]',
        discount: r.discount || 0,
        branch_id: 'main-shop',
      }));

      const batches = chunkArray(payload, 250);
      for (const batch of batches) {
        const { error } = await supabase.from('pending_bills').insert(batch);
        if (error) stats.errors += batch.length;
        else stats.pendingBills += batch.length;
      }
    }
  } catch (err: any) {
    console.error('Error migrating pending bills:', err.message);
  }

  console.log('\n==================================================');
  console.log('🎉 MAIN SHOP MIGRATION COMPLETE');
  console.log('==================================================');
  console.log(`Customers migrated           : ${stats.customers}`);
  console.log(`Suppliers migrated           : ${stats.suppliers}`);
  console.log(`Supplier Transactions        : ${stats.supplierTransactions}`);
  console.log(`Parts / Inventory            : ${stats.parts}`);
  console.log(`Employees migrated           : ${stats.employees}`);
  console.log(`Expenses migrated            : ${stats.expenses}`);
  console.log(`Repairs migrated             : ${stats.repairs}`);
  console.log(`Repair items migrated        : ${stats.repairItems}`);
  console.log(`Pending bills migrated       : ${stats.pendingBills}`);
  console.log(`Errors encountered           : ${stats.errors}`);
  console.log('==================================================\n');
}

migrateMainShop();
