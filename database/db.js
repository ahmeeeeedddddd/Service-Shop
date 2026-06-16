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
}

initDB();

// --- Customers CRUD ---
function getCustomers() {
  return db.prepare('SELECT * FROM customers ORDER BY id DESC').all();
}

function searchCustomers(term) {
  const stmt = db.prepare('SELECT * FROM customers WHERE name LIKE ? OR phone LIKE ? ORDER BY id DESC');
  return stmt.all(`%${term}%`, `%${term}%`);
}

function addCustomer(customer) {
  const stmt = db.prepare('INSERT INTO customers (name, phone, car_name, plate_number) VALUES (?, ?, ?, ?)');
  const info = stmt.run(customer.name, customer.phone, customer.car_name, customer.plate_number);
  return info.lastInsertRowid;
}

// --- Repairs & Repair Items CRUD ---
function addRepair(repair) {
  const stmt = db.prepare('INSERT INTO repairs (customer_id, description, date, total_amount, payment_method) VALUES (?, ?, ?, ?, ?)');
  const info = stmt.run(repair.customer_id, repair.description, repair.date, repair.total_amount, repair.payment_method);
  return info.lastInsertRowid;
}

function addRepairItem(item) {
  const stmt = db.prepare('INSERT INTO repair_items (repair_id, item_name, quantity, unit_price) VALUES (?, ?, ?, ?)');
  stmt.run(item.repair_id, item.item_name, item.quantity, item.unit_price);
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
    ORDER BY parts.id DESC
  `).all();
}

function addPart(part) {
  const stmt = db.prepare('INSERT INTO parts (name, category, quantity_in_stock, unit_price, supplier_id) VALUES (?, ?, ?, ?, ?)');
  const info = stmt.run(part.name, part.category, part.quantity_in_stock, part.unit_price, part.supplier_id);
  return info.lastInsertRowid;
}

function updatePart(id, quantity, price) {
  db.prepare('UPDATE parts SET quantity_in_stock = ?, unit_price = ? WHERE id = ?').run(quantity, price, id);
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
  addExpense
};
