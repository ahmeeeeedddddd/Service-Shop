const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const OLD_DB_PATH = path.join(process.env.APPDATA || process.env.USERPROFILE + '\\AppData\\Roaming', 'ElAnsaryServiceShop', 'shop.db');
const NEW_DB_PATH = path.join(process.env.APPDATA || process.env.USERPROFILE + '\\AppData\\Roaming', 'ElAnsaryBodyShop', 'shop.db');

console.log('--- El Ansary Full DB Migration (Customers, Cars & Repairs History) ---');
console.log('Old DB path:', OLD_DB_PATH);
console.log('New DB path:', NEW_DB_PATH);

if (!fs.existsSync(OLD_DB_PATH)) {
    console.error('❌ Error: Old database not found at', OLD_DB_PATH);
    process.exit(1);
}

if (!fs.existsSync(NEW_DB_PATH)) {
    console.error('❌ Error: New database not found. Please run the new application once to initialize the DB.');
    process.exit(1);
}

const oldDb = new Database(OLD_DB_PATH, { fileMustExist: true });
const newDb = new Database(NEW_DB_PATH);

try {
    const oldCustomers = oldDb.prepare('SELECT * FROM customers').all();
    console.log(`Found ${oldCustomers.length} customers in old DB.`);

    const insertCustomer = newDb.prepare('INSERT INTO customers (name, phone) VALUES (?, ?)');
    const insertCar = newDb.prepare('INSERT INTO customer_cars (customer_id, car_name, plate_number) VALUES (?, ?, ?)');
    const checkCustomerByPhone = newDb.prepare('SELECT id FROM customers WHERE phone = ?');
    const checkCustomerByName = newDb.prepare('SELECT id FROM customers WHERE name = ?');
    
    const insertRepair = newDb.prepare(`
        INSERT INTO repairs (customer_id, car_id, description, date, total_amount, paid_amount, pending_amount, discount, payment_method, odometer, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const insertRepairItem = newDb.prepare(`
        INSERT INTO repair_items (repair_id, item_name, quantity, unit_price)
        VALUES (?, ?, ?, ?)
    `);

    let addedCustomers = 0;
    let skippedCustomers = 0;
    let carsAdded = 0;
    let repairsMigrated = 0;
    let itemsMigrated = 0;

    const oldToNewCustomerId = new Map();

    newDb.transaction(() => {
        // 1. Migrate Customers & Cars
        for (const c of oldCustomers) {
            let customerId;
            if (c.phone) {
                const existing = checkCustomerByPhone.get(c.phone);
                if (existing) customerId = existing.id;
            }
            if (!customerId && c.name) {
                const existing = checkCustomerByName.get(c.name);
                if (existing) customerId = existing.id;
            }

            if (!customerId) {
                const result = insertCustomer.run(c.name, c.phone || null);
                customerId = result.lastInsertRowid;
                addedCustomers++;
            } else {
                skippedCustomers++;
            }

            oldToNewCustomerId.set(c.id, customerId);

            // Insert car
            if (c.car_name || c.plate_number) {
                const existingCar = newDb.prepare('SELECT id FROM customer_cars WHERE customer_id = ? AND (plate_number = ? OR car_name = ?)')
                    .get(customerId, c.plate_number || null, c.car_name || null);
                if (!existingCar) {
                    insertCar.run(customerId, c.car_name || 'Unknown', c.plate_number || null);
                    carsAdded++;
                }
            }
        }

        // 2. Migrate Repairs & Repair Items
        const oldRepairs = oldDb.prepare('SELECT * FROM repairs').all();
        console.log(`Found ${oldRepairs.length} repair records in old DB.`);

        for (const r of oldRepairs) {
            const newCustId = oldToNewCustomerId.get(r.customer_id);
            if (!newCustId) continue; // skip orphan repairs

            // Find car ID for this customer
            let carId = null;
            const carRow = newDb.prepare('SELECT id FROM customer_cars WHERE customer_id = ? LIMIT 1').get(newCustId);
            if (carRow) carId = carRow.id;

            // Check if repair already migrated (to avoid duplicate imports)
            const existingRepair = newDb.prepare('SELECT id FROM repairs WHERE customer_id = ? AND date = ? AND total_amount = ? AND description = ?')
                .get(newCustId, r.date, r.total_amount, r.description);

            let repairId;
            if (!existingRepair) {
                const res = insertRepair.run(
                    newCustId,
                    carId,
                    r.description || '',
                    r.date || new Date().toISOString().split('T')[0],
                    r.total_amount || 0,
                    r.paid_amount || 0,
                    r.pending_amount || 0,
                    r.discount || 0,
                    r.payment_method || 'Cash',
                    r.odometer || '',
                    r.notes || ''
                );
                repairId = res.lastInsertRowid;
                repairsMigrated++;

                // Migrate items for this repair
                const oldItems = oldDb.prepare('SELECT * FROM repair_items WHERE repair_id = ?').all(r.id);
                for (const item of oldItems) {
                    insertRepairItem.run(repairId, item.item_name, item.quantity || 1, item.unit_price || 0);
                    itemsMigrated++;
                }
            }
        }
    })();

    console.log(`✅ Migration successful!`);
    console.log(`   - Customers added: ${addedCustomers}`);
    console.log(`   - Customers mapped: ${skippedCustomers}`);
    console.log(`   - Cars added: ${carsAdded}`);
    console.log(`   - Repairs migrated: ${repairsMigrated}`);
    console.log(`   - Repair line items migrated: ${itemsMigrated}`);

} catch (err) {
    console.error('❌ Migration failed:', err);
} finally {
    oldDb.close();
    newDb.close();
}
