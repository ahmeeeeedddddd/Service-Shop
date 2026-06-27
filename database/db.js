const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Resolve db path: Store in APPDATA/ElAnsaryServiceShop for absolute packaging persistence, fall back to __dirname in development
const dbDir = process.env.APPDATA
  ? path.join(process.env.APPDATA, 'ElAnsaryServiceShop')
  : path.join(__dirname);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'shop.db');

// Migration check: Copy existing database if the roaming AppData directory doesn't have it yet
if (!fs.existsSync(dbPath)) {
  const projectDbPath = path.join(__dirname, '..', 'database', 'shop.db');
  const localDbPath = path.join(__dirname, 'shop.db');
  if (fs.existsSync(projectDbPath)) {
    try {
      fs.copyFileSync(projectDbPath, dbPath);
    } catch (e) {
      console.error('Failed to copy project database:', e);
    }
  } else if (fs.existsSync(localDbPath)) {
    try {
      fs.copyFileSync(localDbPath, dbPath);
    } catch (e) {
      console.error('Failed to copy local database:', e);
    }
  }
}

const db = new Database(dbPath);

// Initialize database schema
function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      car_name TEXT,
      plate_number TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS repairs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      description TEXT,
      date TEXT,
      total_amount REAL,
      paid_amount REAL,
      pending_amount REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      payment_method TEXT,
      odometer TEXT,
      notes TEXT,
      FOREIGN KEY(customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS repair_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      repair_id INTEGER,
      item_name TEXT,
      quantity INTEGER,
      unit_price REAL,
      FOREIGN KEY(repair_id) REFERENCES repairs(id)
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact_number TEXT,
      supplies_what TEXT,
      notes TEXT,
      pending_amount REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS parts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT,
      quantity_in_stock INTEGER DEFAULT 0,
      unit_price REAL DEFAULT 0,
      supplier_id INTEGER,
      FOREIGN KEY(supplier_id) REFERENCES suppliers(id)
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT,
      amount REAL,
      category TEXT,
      date TEXT
    );

    CREATE TABLE IF NOT EXISTS pending_bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      description TEXT,
      date_created TEXT,
      total_amount REAL,
      payment_method TEXT,
      odometer TEXT,
      notes TEXT,
      line_items_json TEXT,
      FOREIGN KEY(customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS supplier_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER NOT NULL,
      date TEXT,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      balance_after REAL NOT NULL,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(supplier_id) REFERENCES suppliers(id)
    );
  `);

  // Run migrations
  try {
    db.exec("ALTER TABLE repairs ADD COLUMN odometer TEXT");
  } catch (e) { /* Ignore if exists */ }
  
  try {
    db.exec("ALTER TABLE repairs ADD COLUMN notes TEXT");
  } catch (e) { /* Ignore if exists */ }

  try { db.exec(`ALTER TABLE repairs ADD COLUMN paid_amount REAL`); } catch(e) {}
  try { db.exec(`ALTER TABLE repairs ADD COLUMN pending_amount REAL DEFAULT 0`); } catch(e) {}
  try { db.exec(`ALTER TABLE repairs ADD COLUMN discount REAL DEFAULT 0`); } catch(e) {}
  try { db.exec(`ALTER TABLE suppliers ADD COLUMN pending_amount REAL DEFAULT 0`); } catch(e) {}

  // Create supplier_transactions if it was created before this migration
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS supplier_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER NOT NULL,
      date TEXT,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      balance_after REAL NOT NULL,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(supplier_id) REFERENCES suppliers(id)
    )`);
  } catch(e) {}

  try {
    db.exec("ALTER TABLE supplier_transactions ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP");
  } catch(e) {}

  // Employees table
  db.exec(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id TEXT,
      name TEXT NOT NULL,
      role TEXT,
      daily_rate REAL NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function performAutomaticBackup() {
  try {
    const backupDir = path.join(dbDir, 'backup');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const backupPath = path.join(backupDir, `shop_backup_${todayStr}.db`);

    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(dbPath, backupPath);
      console.log(`Automatic daily backup created at: ${backupPath}`);

      // Clean up backups older than 30 days
      const files = fs.readdirSync(backupDir);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      for (const file of files) {
        if (file.startsWith('shop_backup_') && file.endsWith('.db')) {
          const filePath = path.join(backupDir, file);
          const stat = fs.statSync(filePath);
          if (stat.mtime < thirtyDaysAgo) {
            try {
              fs.unlinkSync(filePath);
            } catch (unlinkErr) {
              console.error(`Failed to delete old backup ${file}:`, unlinkErr);
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Failed to perform automatic database backup:', err);
  }
}

initDB();
performAutomaticBackup();

// --- Customers CRUD ---
function getCustomers() {
  return db.prepare('SELECT * FROM customers ORDER BY name COLLATE NOCASE ASC').all();
}

function searchCustomers(term) {
  const stmt = db.prepare('SELECT * FROM customers WHERE name LIKE ? OR phone LIKE ? ORDER BY name COLLATE NOCASE ASC');
  return stmt.all(`%${term}%`, `%${term}%`);
}

function addCustomer(customer) {
  const stmt = db.prepare('INSERT INTO customers (name, phone, car_name, plate_number) VALUES (?, ?, ?, ?)');
  const info = stmt.run(customer.name, customer.phone, customer.car_name, customer.plate_number);
  return info.lastInsertRowid;
}

function deleteCustomer(id) {
  db.prepare('DELETE FROM customers WHERE id = ?').run(id);
  // Also delete their repairs? Or keep for history? 
  // Usually delete means everything, but for safety let's just delete the customer.
  // repairs has FK but not ON DELETE CASCADE by default in my schema.
}

function getCustomerByPhone(phone) {
  return db.prepare('SELECT * FROM customers WHERE phone = ?').get(phone);
}

// --- Repairs & Repair Items CRUD ---
function addRepair(repair) {
  const stmt = db.prepare('INSERT INTO repairs (customer_id, description, date, total_amount, paid_amount, pending_amount, discount, payment_method, odometer, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const info = stmt.run(repair.customer_id, repair.description, repair.date, repair.total_amount, repair.paid_amount, repair.pending_amount, repair.discount, repair.payment_method, repair.odometer, repair.notes);
  return info.lastInsertRowid;
}

function addRepairItem(item) {
  const stmt = db.prepare('INSERT INTO repair_items (repair_id, item_name, quantity, unit_price) VALUES (?, ?, ?, ?)');
  stmt.run(item.repair_id, item.item_name, item.quantity, item.unit_price);
}

function getRepairs() {
  return db.prepare(`
    SELECT repairs.*, customers.name as customer_name,
           customers.phone as customer_phone, customers.car_name, customers.plate_number 
    FROM repairs 
    JOIN customers ON repairs.customer_id = customers.id 
    ORDER BY repairs.date DESC
  `).all();
}

function getRepairItems(repairId) {
  return db.prepare('SELECT * FROM repair_items WHERE repair_id = ?').all(repairId);
}

function getRepairById(id) {
  return db.prepare(`
    SELECT repairs.*, customers.name as customer_name,
           customers.phone as customer_phone, customers.car_name, customers.plate_number 
    FROM repairs 
    JOIN customers ON repairs.customer_id = customers.id 
    WHERE repairs.id = ?
  `).get(id);
}

function getRepairsByDate(date) {
  return db.prepare(`
    SELECT repairs.*, customers.name as customer_name, customers.car_name as car_name 
    FROM repairs 
    JOIN customers ON repairs.customer_id = customers.id 
    WHERE date = ? 
    ORDER BY repairs.id DESC
  `).all(date);
}

function deleteRepair(id) {
  db.prepare('DELETE FROM repair_items WHERE repair_id = ?').run(id);
  db.prepare('DELETE FROM repairs WHERE id = ?').run(id);
}

function getExpensesByDate(date) {
  return db.prepare('SELECT * FROM expenses WHERE date = ?').all(date);
}

function getRepairsByCustomer(customerId) {
  return db.prepare('SELECT * FROM repairs WHERE customer_id = ? ORDER BY date DESC').all(customerId);
}

// --- Suppliers CRUD ---
function getSuppliers() {
  return db.prepare('SELECT * FROM suppliers ORDER BY id DESC').all();
}

function addSupplier(supplier) {
  const stmt = db.prepare('INSERT INTO suppliers (name, contact_number, supplies_what, notes, pending_amount) VALUES (?, ?, ?, ?, ?)');
  const info = stmt.run(supplier.name, supplier.contact_number, supplier.supplies_what, supplier.notes, supplier.pending_amount || 0);
  return info.lastInsertRowid;
}

function updateSupplierPending(id, pending_amount) {
  db.prepare('UPDATE suppliers SET pending_amount = ? WHERE id = ?').run(pending_amount, id);
}

function deleteSupplier(id) {
  db.prepare('UPDATE parts SET supplier_id = NULL WHERE supplier_id = ?').run(id);
  db.prepare('DELETE FROM supplier_transactions WHERE supplier_id = ?').run(id);
  db.prepare('DELETE FROM suppliers WHERE id = ?').run(id);
}

function addSupplierTransaction(supplierId, type, amount, balanceAfter, note, date) {
  const stmt = db.prepare('INSERT INTO supplier_transactions (supplier_id, type, amount, balance_after, note, date) VALUES (?, ?, ?, ?, ?, ?)');
  const info = stmt.run(supplierId, type, amount, balanceAfter, note || '', date);
  return info.lastInsertRowid;
}

function getSupplierTransactions(supplierId) {
  return db.prepare('SELECT * FROM supplier_transactions WHERE supplier_id = ? ORDER BY date DESC, id DESC').all(supplierId);
}

// --- Parts CRUD ---
function getParts() {
  return db.prepare(`
    SELECT parts.*, suppliers.name as supplier_name 
    FROM parts 
    LEFT JOIN suppliers ON parts.supplier_id = suppliers.id
    ORDER BY parts.name COLLATE NOCASE ASC
  `).all();
}

function addPart(part) {
  const stmt = db.prepare('INSERT INTO parts (name, category, quantity_in_stock, unit_price, supplier_id) VALUES (?, ?, ?, ?, ?)');
  const info = stmt.run(part.name, part.category, part.quantity_in_stock, part.unit_price, part.supplier_id);
  return info.lastInsertRowid;
}

function updatePart(id, quantity, price, name, category, supplier_id) {
  db.prepare('UPDATE parts SET quantity_in_stock = ?, unit_price = ?, name = ?, category = ?, supplier_id = ? WHERE id = ?').run(quantity, price, name, category, supplier_id, id);
}

function updatePartInline(id, quantity, price) {
  db.prepare('UPDATE parts SET quantity_in_stock = ?, unit_price = ? WHERE id = ?').run(quantity, price, id);
}

function deletePart(id) {
  db.prepare('DELETE FROM parts WHERE id = ?').run(id);
}

function deleteRepairItems(repairId) {
  db.prepare('DELETE FROM repair_items WHERE repair_id = ?').run(repairId);
}

function updateRepair(id, total, method) {
  return db.prepare('UPDATE repairs SET total_amount = ?, payment_method = ? WHERE id = ?').run(total, method, id);
}

function updateRepairFull(id, total, description) {
  return db.prepare('UPDATE repairs SET total_amount = ?, description = ? WHERE id = ?').run(total, description, id);
}

function updateCustomer(id, data) {
  return db.prepare('UPDATE customers SET name = ?, phone = ?, car_name = ?, plate_number = ? WHERE id = ?')
    .run(data.name, data.phone, data.car_name, data.plate_number, id);
}

// --- Expenses CRUD ---
function getExpenses() {
  return db.prepare('SELECT * FROM expenses ORDER BY date DESC').all();
}

function addExpense(expense) {
  const stmt = db.prepare('INSERT INTO expenses (description, amount, category, date) VALUES (?, ?, ?, ?)');
  const info = stmt.run(expense.description, expense.amount, expense.category, expense.date);
  return info.lastInsertRowid;
}

function deleteExpense(id) {
  return db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
}

function updateExpense(id, expense) {
  return db.prepare('UPDATE expenses SET description = ?, amount = ?, category = ?, date = ? WHERE id = ?')
    .run(expense.description, expense.amount, expense.category, expense.date, id);
}

// --- Pending Bills CRUD ---
function getPendingBills() {
  return db.prepare(`
    SELECT pending_bills.*, customers.name as customer_name, customers.phone as customer_phone,
           customers.car_name, customers.plate_number
    FROM pending_bills
    JOIN customers ON pending_bills.customer_id = customers.id
    ORDER BY pending_bills.date_created DESC
  `).all();
}

function addPendingBill(bill) {
  const stmt = db.prepare('INSERT INTO pending_bills (customer_id, description, date_created, total_amount, payment_method, odometer, notes, line_items_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  const info = stmt.run(bill.customer_id, bill.description, bill.date_created, bill.total_amount, bill.payment_method, bill.odometer, bill.notes, bill.line_items_json);
  return info.lastInsertRowid;
}

function deletePendingBill(id) {
  db.prepare('DELETE FROM pending_bills WHERE id = ?').run(id);
}

function updatePendingBill(id, bill) {
  db.prepare('UPDATE pending_bills SET description=?, total_amount=?, payment_method=?, odometer=?, notes=?, line_items_json=? WHERE id=?')
    .run(bill.description, bill.total_amount, bill.payment_method, bill.odometer, bill.notes, bill.line_items_json, id);
}

function getPendingBillById(id) {
  return db.prepare(`
    SELECT pending_bills.*, customers.name as customer_name, customers.phone as customer_phone,
           customers.car_name, customers.plate_number
    FROM pending_bills
    JOIN customers ON pending_bills.customer_id = customers.id
    WHERE pending_bills.id = ?
  `).get(id);
}

// --- Employees CRUD ---
function getEmployees() {
  return db.prepare('SELECT * FROM employees ORDER BY name COLLATE NOCASE ASC').all();
}

function addEmployee(emp) {
  const stmt = db.prepare('INSERT INTO employees (employee_id, name, role, daily_rate) VALUES (?, ?, ?, ?)');
  const info = stmt.run(emp.employee_id, emp.name, emp.role, emp.daily_rate);
  return info.lastInsertRowid;
}

function updateEmployee(id, emp) {
  db.prepare('UPDATE employees SET employee_id=?, name=?, role=?, daily_rate=? WHERE id=?')
    .run(emp.employee_id, emp.name, emp.role, emp.daily_rate, id);
}

function deleteEmployee(id) {
  db.prepare('DELETE FROM employees WHERE id = ?').run(id);
}

module.exports = {
  getCustomers,
  searchCustomers,
  addCustomer,
  getRepairs,
  getRepairItems,
  getRepairsByDate,
  getExpensesByDate,
  addRepair,
  addRepairItem,
  getRepairsByCustomer,
  getSuppliers,
  addSupplier,
  updateSupplierPending,
  deleteSupplier,
  addSupplierTransaction,
  getSupplierTransactions,
  getParts,
  addPart,
  updatePart,
  updatePartInline,
  deletePart,
  getExpenses,
  addExpense,
  deleteExpense,
  updateExpense,
  deleteCustomer,
  getCustomerByPhone,
  deleteRepairItems,
  updateRepair,
  updateRepairFull,
  updateCustomer,
  getRepairById,
  deleteRepair,
  getPendingBills,
  addPendingBill,
  deletePendingBill,
  updatePendingBill,
  getPendingBillById,
  getEmployees,
  addEmployee,
  updateEmployee,
  deleteEmployee
};
