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

// Locate Body Shop SQLite DB
const primaryPath = path.join(process.env.APPDATA || '', 'ElAnsaryBodyShop', 'shop.db');
const fallbackPath = path.join(__dirname, '..', 'body-shop', 'database', 'shop.db');
const dbPath = fs.existsSync(primaryPath) ? primaryPath : fallbackPath;

if (!fs.existsSync(dbPath)) {
  console.error(`❌ Body Shop SQLite database not found at ${primaryPath} or ${fallbackPath}`);
  process.exit(1);
}

console.log(`📂 Opening Body Shop SQLite database: ${dbPath}`);
const sqlite = new Database(dbPath, { readonly: true });

function chunkArray<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

async function migrateBodyShop() {
  console.log('🚀 Starting Fast Batched Body Shop Migration to Supabase Postgres...');
  const stats = {
    customersMigrated: 0,
    customersSkipped: 0,
    customerCars: 0,
    suppliers: 0,
    supplierTransactions: 0,
    parts: 0,
    employees: 0,
    expenses: 0,
    ohdaRecords: 0,
    carExpenses: 0,
    repairs: 0,
    repairItems: 0,
    pendingBills: 0,
    errors: 0,
  };

  // 1. Fetch existing customers from Postgres & cache file for phone de-duplication
  const phoneToPgId: Record<string, number> = {};
  
  const cachePath = path.join(__dirname, '.customer_phone_map.json');
  if (fs.existsSync(cachePath)) {
    try {
      const cacheData = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      Object.assign(phoneToPgId, cacheData);
    } catch (e) {}
  }

  const { data: existingPgCustomers } = await supabase.from('customers').select('id, phone');
  if (existingPgCustomers) {
    for (const c of existingPgCustomers) {
      if (c.phone) phoneToPgId[c.phone.trim()] = c.id;
    }
  }

  // 2. Migrate Customers with Phone De-duplication
  const customerIdMap: Record<number, number> = {};
  try {
    const custRows: any[] = sqlite.prepare('SELECT * FROM customers').all();
    console.log(`📋 Found ${custRows.length} customers in Body Shop SQLite.`);

    const newCustomersToInsert: { sqliteId: number; payload: any }[] = [];

    for (const row of custRows) {
      const phone = row.phone ? String(row.phone).trim() : null;

      if (phone && phoneToPgId[phone]) {
        // Linked duplicate customer!
        customerIdMap[row.id] = phoneToPgId[phone];
        stats.customersSkipped++;
      } else {
        newCustomersToInsert.push({
          sqliteId: row.id,
          payload: {
            name: row.name || 'Unknown Customer',
            phone: phone,
            created_at: row.created_at || new Date().toISOString(),
          },
        });
      }
    }

    console.log(`  ℹ️  ${stats.customersSkipped} existing customer matches linked.`);
    console.log(`  ℹ️  ${newCustomersToInsert.length} new Body Shop customers to insert.`);

    if (newCustomersToInsert.length > 0) {
      const batches = chunkArray(newCustomersToInsert, 250);
      for (const batch of batches) {
        const payload = batch.map((item) => item.payload);
        const { data, error } = await supabase.from('customers').insert(payload).select('id, phone');
        if (error) {
          console.error('Error inserting customer batch:', error.message);
          stats.errors += batch.length;
        } else if (data) {
          data.forEach((inserted, idx) => {
            const origId = batch[idx].sqliteId;
            customerIdMap[origId] = inserted.id;
            if (inserted.phone) phoneToPgId[inserted.phone.trim()] = inserted.id;
          });
          stats.customersMigrated += data.length;
        }
      }
    }
  } catch (err: any) {
    console.error('Error migrating customers:', err.message);
  }

  // 3. Migrate Customer Cars
  const carIdMap: Record<number, number> = {};
  try {
    const carRows: any[] = sqlite.prepare('SELECT * FROM customer_cars').all();
    console.log(`📋 Found ${carRows.length} customer cars.`);

    const validCars = carRows
      .filter((r) => customerIdMap[r.customer_id])
      .map((r) => ({
        origId: r.id,
        payload: {
          customer_id: customerIdMap[r.customer_id],
          car_name: r.car_name || null,
          plate_number: r.plate_number || null,
        },
      }));

    if (validCars.length > 0) {
      const batches = chunkArray(validCars, 250);
      for (const batch of batches) {
        const payload = batch.map((item) => item.payload);
        const { data, error } = await supabase.from('customer_cars').insert(payload).select('id');
        if (error) {
          stats.errors += batch.length;
        } else if (data) {
          data.forEach((inserted, idx) => {
            carIdMap[batch[idx].origId] = inserted.id;
          });
          stats.customerCars += data.length;
        }
      }
    }
  } catch (err: any) {
    console.error('Error migrating customer cars:', err.message);
  }

  // 4. Migrate Suppliers
  const supplierIdMap: Record<number, number> = {};
  try {
    const suppRows: any[] = sqlite.prepare('SELECT * FROM suppliers').all();
    console.log(`📋 Found ${suppRows.length} suppliers in Body Shop.`);

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
        stats.errors += suppRows.length;
      } else if (data) {
        data.forEach((inserted, idx) => {
          supplierIdMap[suppRows[idx].id] = inserted.id;
        });
        stats.suppliers += data.length;
      }
    }
  } catch (err: any) {
    console.error('Error migrating suppliers:', err.message);
  }

  // 5. Migrate Supplier Transactions
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

  // 6. Migrate Parts
  try {
    const partsRows: any[] = sqlite.prepare('SELECT * FROM parts').all();
    console.log(`📋 Found ${partsRows.length} parts.`);

    if (partsRows.length > 0) {
      const payload = partsRows.map((r) => ({
        name: r.name,
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

  // 7. Migrate Employees
  try {
    const empRows: any[] = sqlite.prepare('SELECT * FROM employees').all();
    console.log(`📋 Found ${empRows.length} employees.`);

    if (empRows.length > 0) {
      const payload = empRows.map((r) => ({
        name: r.name,
        role: r.role || null,
        daily_rate: r.daily_rate || 0,
        pending_adjustments: r.pending_adjustments || '[]',
        branch_id: 'body-shop',
      }));

      const { error } = await supabase.from('employees').insert(payload);
      if (error) stats.errors += empRows.length;
      else stats.employees += empRows.length;
    }
  } catch (err: any) {
    console.error('Error migrating employees:', err.message);
  }

  // 8. Migrate Expenses
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
        from_deleted_bill: Boolean(r.from_deleted_bill || 0),
        from_ohda: r.from_ohda !== undefined ? Boolean(r.from_ohda) : true,
        branch_id: 'body-shop',
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

  // 9. Migrate Ohda Records
  try {
    const ohdaRows: any[] = sqlite.prepare('SELECT * FROM ohda_records').all();
    console.log(`📋 Found ${ohdaRows.length} ohda records.`);

    if (ohdaRows.length > 0) {
      const payload = ohdaRows.map((r) => ({
        date: r.date,
        amount: r.amount || 0,
        notes: r.notes || null,
        branch_id: 'body-shop',
      }));

      const batches = chunkArray(payload, 250);
      for (const batch of batches) {
        const { error } = await supabase.from('ohda_records').insert(batch);
        if (error) stats.errors += batch.length;
        else stats.ohdaRecords += batch.length;
      }
    }
  } catch (err: any) {
    console.error('Error migrating ohda records:', err.message);
  }

  // 10. Migrate Car Expenses
  try {
    const carExpRows: any[] = sqlite.prepare('SELECT * FROM car_expenses').all();
    console.log(`📋 Found ${carExpRows.length} car expenses.`);

    if (carExpRows.length > 0) {
      const payload = carExpRows.map((r) => ({
        date: r.date || null,
        customer_id: r.customer_id ? customerIdMap[r.customer_id] || null : null,
        car_id: r.car_id ? carIdMap[r.car_id] || null : null,
        car_info: r.car_info || null,
        total_cost: r.total_cost || 0,
        details_json: r.details_json || '[]',
        branch_id: 'body-shop',
      }));

      const batches = chunkArray(payload, 250);
      for (const batch of batches) {
        const { error } = await supabase.from('car_expenses').insert(batch);
        if (error) stats.errors += batch.length;
        else stats.carExpenses += batch.length;
      }
    }
  } catch (err: any) {
    console.error('Error migrating car expenses:', err.message);
  }

  // 11. Migrate Repairs and Repair Items
  const repairIdMap: Record<number, number> = {};
  try {
    const repairRows: any[] = sqlite.prepare('SELECT * FROM repairs').all();
    console.log(`📋 Found ${repairRows.length} repairs in Body Shop.`);

    if (repairRows.length > 0) {
      const repairBatches = chunkArray(repairRows, 250);
      for (const batch of repairBatches) {
        const payload = batch.map((r) => ({
          customer_id: r.customer_id ? customerIdMap[r.customer_id] || null : null,
          car_id: r.car_id ? carIdMap[r.car_id] || null : null,
          description: r.description || null,
          date: r.date || null,
          total_amount: r.total_amount || 0,
          paid_amount: r.paid_amount || 0,
          pending_amount: r.pending_amount || 0,
          discount: r.discount || 0,
          payment_method: r.payment_method || null,
          odometer: r.odometer || null,
          notes: r.notes || null,
          branch_id: 'body-shop',
        }));

        const { data, error } = await supabase.from('repairs').insert(payload).select('id');
        if (error) {
          stats.errors += batch.length;
        } else if (data) {
          data.forEach((inserted, idx) => {
            repairIdMap[batch[idx].id] = inserted.id;
          });
          stats.repairs += data.length;
        }
      }

      // Repair Items
      const itemRows: any[] = sqlite.prepare('SELECT * FROM repair_items').all();
      console.log(`📋 Found ${itemRows.length} repair items in Body Shop.`);

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
    }
  } catch (err: any) {
    console.error('Error migrating repairs/items:', err.message);
  }

  // 12. Migrate Pending Bills
  try {
    const billRows: any[] = sqlite.prepare('SELECT * FROM pending_bills').all();
    console.log(`📋 Found ${billRows.length} pending bills in Body Shop.`);

    if (billRows.length > 0) {
      const payload = billRows.map((r) => ({
        customer_id: r.customer_id ? customerIdMap[r.customer_id] || null : null,
        car_id: r.car_id ? carIdMap[r.car_id] || null : null,
        description: r.description || null,
        date_created: r.date_created || null,
        total_amount: r.total_amount || 0,
        paid_amount: r.paid_amount || 0,
        pending_amount: r.pending_amount || 0,
        discount: r.discount || 0,
        payment_method: r.payment_method || null,
        odometer: r.odometer || null,
        notes: r.notes || null,
        line_items_json: r.line_items_json || '[]',
        branch_id: 'body-shop',
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
  console.log('🎉 BODY SHOP MIGRATION COMPLETE');
  console.log('==================================================');
  console.log(`New customers migrated      : ${stats.customersMigrated}`);
  console.log(`Duplicate customers linked  : ${stats.customersSkipped}`);
  console.log(`Customer cars migrated      : ${stats.customerCars}`);
  console.log(`Suppliers migrated          : ${stats.suppliers}`);
  console.log(`Supplier Transactions       : ${stats.supplierTransactions}`);
  console.log(`Parts / Inventory           : ${stats.parts}`);
  console.log(`Employees migrated          : ${stats.employees}`);
  console.log(`Expenses migrated           : ${stats.expenses}`);
  console.log(`Ohda records migrated       : ${stats.ohdaRecords}`);
  console.log(`Car expenses migrated       : ${stats.carExpenses}`);
  console.log(`Repairs migrated            : ${stats.repairs}`);
  console.log(`Repair items migrated       : ${stats.repairItems}`);
  console.log(`Pending bills migrated      : ${stats.pendingBills}`);
  console.log(`Errors encountered          : ${stats.errors}`);
  console.log('==================================================\n');
}

migrateBodyShop();
