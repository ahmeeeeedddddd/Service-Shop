const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure the database directory exists
const dbPath = path.join(__dirname, 'shop.db');
const db = new Database(dbPath, { verbose: console.log });

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
      notes TEXT
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
  `);

  // Run migrations
  try {
    db.exec("ALTER TABLE repairs ADD COLUMN odometer TEXT");
  } catch (e) { /* Ignore if exists */ }
  
  try {
    db.exec("ALTER TABLE repairs ADD COLUMN notes TEXT");
  } catch (e) { /* Ignore if exists */ }
}

initDB();

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
  const stmt = db.prepare('INSERT INTO repairs (customer_id, description, date, total_amount, payment_method, odometer, notes) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const info = stmt.run(repair.customer_id, repair.description, repair.date, repair.total_amount, repair.payment_method, repair.odometer, repair.notes);
  return info.lastInsertRowid;
}

function addRepairItem(item) {
  const stmt = db.prepare('INSERT INTO repair_items (repair_id, item_name, quantity, unit_price) VALUES (?, ?, ?, ?)');
  stmt.run(item.repair_id, item.item_name, item.quantity, item.unit_price);
}

function getRepairs() {
  return db.prepare(`
    SELECT repairs.*, customers.name as customer_name 
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
    SELECT repairs.*, customers.name as customer_name 
    FROM repairs 
    JOIN customers ON repairs.customer_id = customers.id 
    WHERE repairs.id = ?
  `).get(id);
}

function getRepairsByDate(date) {
  return db.prepare(`
    SELECT repairs.*, customers.name as customer_name 
    FROM repairs 
    JOIN customers ON repairs.customer_id = customers.id 
    WHERE date = ? 
    ORDER BY repairs.id DESC
  `).all(date);
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
  const stmt = db.prepare('INSERT INTO suppliers (name, contact_number, supplies_what, notes) VALUES (?, ?, ?, ?)');
  const info = stmt.run(supplier.name, supplier.contact_number, supplier.supplies_what, supplier.notes);
  return info.lastInsertRowid;
}

function deleteSupplier(id) {
  db.prepare('DELETE FROM suppliers WHERE id = ?').run(id);
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
  deleteSupplier,
  getParts,
  addPart,
  updatePart,
  getExpenses,
  getExpenses,
  addExpense,
  deleteCustomer,
  getCustomerByPhone,
  deleteRepairItems,
  updateRepair,
  updateRepairFull
};
