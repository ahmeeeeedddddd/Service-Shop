const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Store DB in APPDATA/ElAnsaryBodyShop — separate from Service-Shop
const dbDir = process.env.APPDATA
  ? path.join(process.env.APPDATA, 'ElAnsaryBodyShop')
  : path.join(__dirname);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'shop.db');
const db = new Database(dbPath);

// ─── Schema Init ──────────────────────────────────────────────────────────────
function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS customer_cars (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      car_name TEXT,
      plate_number TEXT,
      FOREIGN KEY(customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS repairs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      car_id INTEGER,
      description TEXT,
      date TEXT,
      total_amount REAL DEFAULT 0,
      paid_amount REAL DEFAULT 0,
      pending_amount REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      payment_method TEXT,
      odometer TEXT,
      notes TEXT,
      FOREIGN KEY(customer_id) REFERENCES customers(id),
      FOREIGN KEY(car_id) REFERENCES customer_cars(id)
    );

    CREATE TABLE IF NOT EXISTS repair_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      repair_id INTEGER,
      item_name TEXT,
      quantity REAL DEFAULT 1,
      unit_price REAL DEFAULT 0,
      FOREIGN KEY(repair_id) REFERENCES repairs(id)
    );

    CREATE TABLE IF NOT EXISTS pending_bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      car_id INTEGER,
      description TEXT,
      date_created TEXT,
      total_amount REAL DEFAULT 0,
      paid_amount REAL DEFAULT 0,
      pending_amount REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      payment_method TEXT,
      odometer TEXT,
      notes TEXT,
      line_items_json TEXT,
      FOREIGN KEY(customer_id) REFERENCES customers(id),
      FOREIGN KEY(car_id) REFERENCES customer_cars(id)
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT,
      amount REAL DEFAULT 0,
      category TEXT,
      date TEXT,
      from_deleted_bill INTEGER DEFAULT 0,
      from_cash INTEGER DEFAULT 1,
      from_ohda INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS ohda_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      amount REAL DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact_number TEXT,
      supplies_what TEXT,
      notes TEXT,
      pending_amount REAL DEFAULT 0
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

    CREATE TABLE IF NOT EXISTS parts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      quantity_in_stock REAL DEFAULT 0,
      unit_price REAL DEFAULT 0,
      supplier_id INTEGER,
      FOREIGN KEY(supplier_id) REFERENCES suppliers(id)
    );

    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT,
      daily_rate REAL DEFAULT 0,
      pending_adjustments TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS car_expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT,
      customer_id INTEGER,
      car_id INTEGER,
      car_info TEXT,
      total_cost REAL DEFAULT 0,
      details_json TEXT,
      FOREIGN KEY(customer_id) REFERENCES customers(id),
      FOREIGN KEY(car_id) REFERENCES customer_cars(id)
    );
  `);

  // Migrate: add from_ohda column if it doesn't exist yet
  try {
    db.exec(`ALTER TABLE expenses ADD COLUMN from_ohda INTEGER DEFAULT 1`);
  } catch(e) { /* column already exists */ }
}

initDB();

// ─── Customers ────────────────────────────────────────────────────────────────
function getCustomers() {
  return db.prepare('SELECT * FROM customers ORDER BY name COLLATE NOCASE ASC').all();
}

function searchCustomers(term) {
  return db.prepare('SELECT * FROM customers WHERE name LIKE ? OR phone LIKE ? ORDER BY name COLLATE NOCASE ASC')
    .all(`%${term}%`, `%${term}%`);
}

function addCustomer(data) {
  const info = db.prepare('INSERT INTO customers (name, phone) VALUES (?, ?)').run(data.name, data.phone);
  return info.lastInsertRowid;
}

function updateCustomer(id, data) {
  db.prepare('UPDATE customers SET name=?, phone=? WHERE id=?').run(data.name, data.phone, id);
}

function deleteCustomer(id) {
  db.prepare('DELETE FROM customer_cars WHERE customer_id=?').run(id);
  db.prepare('DELETE FROM customers WHERE id=?').run(id);
}

function getCustomerByPhone(phone) {
  return db.prepare('SELECT * FROM customers WHERE phone=?').get(phone);
}

// ─── Customer Cars ────────────────────────────────────────────────────────────
function getCarsByCustomer(customerId) {
  return db.prepare('SELECT * FROM customer_cars WHERE customer_id=? ORDER BY id ASC').all(customerId);
}

function addCar(customerId, carName, plateNumber) {
  const info = db.prepare('INSERT INTO customer_cars (customer_id, car_name, plate_number) VALUES (?, ?, ?)').run(customerId, carName, plateNumber);
  return info.lastInsertRowid;
}

function updateCar(id, carName, plateNumber) {
  db.prepare('UPDATE customer_cars SET car_name=?, plate_number=? WHERE id=?').run(carName, plateNumber, id);
}

function deleteCar(id) {
  db.prepare('DELETE FROM customer_cars WHERE id=?').run(id);
}

function getCarById(id) {
  return db.prepare('SELECT * FROM customer_cars WHERE id=?').get(id);
}

// ─── Repairs (Invoices / Confirmed Bills) ──────────────────────────────────────
function addRepair(r) {
  const info = db.prepare(`INSERT INTO repairs
    (customer_id, car_id, description, date, total_amount, paid_amount, pending_amount, discount, payment_method, odometer, notes)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    .run(r.customer_id, r.car_id, r.description, r.date, r.total_amount, r.paid_amount || 0, r.pending_amount || 0, r.discount || 0, r.payment_method, r.odometer || '', r.notes || '');
  return info.lastInsertRowid;
}

function addRepairItem(item) {
  db.prepare('INSERT INTO repair_items (repair_id, item_name, quantity, unit_price) VALUES (?,?,?,?)')
    .run(item.repair_id, item.item_name, item.quantity, item.unit_price);
}

function getRepairs() {
  return db.prepare(`
    SELECT r.*, c.name as customer_name, c.phone as customer_phone,
           cc.car_name, cc.plate_number
    FROM repairs r
    JOIN customers c ON r.customer_id = c.id
    LEFT JOIN customer_cars cc ON r.car_id = cc.id
    ORDER BY r.date DESC, r.id DESC
  `).all();
}

function getRepairById(id) {
  return db.prepare(`
    SELECT r.*, c.name as customer_name, c.phone as customer_phone,
           cc.car_name, cc.plate_number
    FROM repairs r
    JOIN customers c ON r.customer_id = c.id
    LEFT JOIN customer_cars cc ON r.car_id = cc.id
    WHERE r.id=?
  `).get(id);
}

function getRepairItems(repairId) {
  return db.prepare('SELECT * FROM repair_items WHERE repair_id=?').all(repairId);
}

function getRepairsByDate(date) {
  return db.prepare(`
    SELECT r.*, c.name as customer_name, cc.car_name
    FROM repairs r
    LEFT JOIN customers c ON r.customer_id = c.id
    LEFT JOIN customer_cars cc ON r.car_id = cc.id
    WHERE r.date LIKE ?
    ORDER BY r.id DESC
  `).all(`${date}%`);
}

function getRepairsByCustomer(customerId) {
  return db.prepare(`
    SELECT r.*, cc.car_name, cc.plate_number
    FROM repairs r
    LEFT JOIN customer_cars cc ON r.car_id = cc.id
    WHERE r.customer_id=?
    ORDER BY r.date DESC, r.id DESC
  `).all(customerId);
}

function markRepairAsDeleted(id) {
  db.prepare(`UPDATE repairs SET paid_amount=0, total_amount=0, pending_amount=0, discount=0,
    payment_method='Deleted', description='[Deleted] ' || IFNULL(description,'') WHERE id=?`).run(id);
}

function deleteRepair(id) {
  db.prepare('DELETE FROM repair_items WHERE repair_id=?').run(id);
  db.prepare('DELETE FROM repairs WHERE id=?').run(id);
}

// ─── Pending Bills ────────────────────────────────────────────────────────────
function getPendingBills() {
  return db.prepare(`
    SELECT pb.*, c.name as customer_name, c.phone as customer_phone,
           cc.car_name, cc.plate_number
    FROM pending_bills pb
    JOIN customers c ON pb.customer_id = c.id
    LEFT JOIN customer_cars cc ON pb.car_id = cc.id
    ORDER BY pb.date_created DESC
  `).all();
}

function getPendingBillById(id) {
  return db.prepare(`
    SELECT pb.*, c.name as customer_name, c.phone as customer_phone,
           cc.car_name, cc.plate_number
    FROM pending_bills pb
    JOIN customers c ON pb.customer_id = c.id
    LEFT JOIN customer_cars cc ON pb.car_id = cc.id
    WHERE pb.id=?
  `).get(id);
}

function addPendingBill(bill) {
  const info = db.prepare(`INSERT INTO pending_bills
    (customer_id, car_id, description, date_created, total_amount, paid_amount, pending_amount, discount, payment_method, odometer, notes, line_items_json)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(bill.customer_id, bill.car_id, bill.description, bill.date_created,
         bill.total_amount, bill.paid_amount || 0, bill.pending_amount || 0,
         bill.discount || 0, bill.payment_method, bill.odometer, bill.notes, bill.line_items_json);
  return info.lastInsertRowid;
}

function updatePendingBill(id, bill) {
  db.prepare(`UPDATE pending_bills SET description=?, total_amount=?, paid_amount=?, pending_amount=?,
    discount=?, payment_method=?, odometer=?, notes=?, line_items_json=? WHERE id=?`)
    .run(bill.description, bill.total_amount, bill.paid_amount || 0, bill.pending_amount || 0,
         bill.discount || 0, bill.payment_method, bill.odometer, bill.notes, bill.line_items_json, id);
}

function deletePendingBill(id) {
  db.prepare('DELETE FROM pending_bills WHERE id=?').run(id);
}

// ─── Expenses ─────────────────────────────────────────────────────────────────
function getExpenses() {
  return db.prepare('SELECT * FROM expenses ORDER BY date DESC, id DESC').all();
}

function getExpensesByDate(date) {
  return db.prepare('SELECT * FROM expenses WHERE date LIKE ? ORDER BY id DESC').all(`${date}%`);
}

function addExpense(e) {
  const info = db.prepare('INSERT INTO expenses (description, amount, category, date, from_deleted_bill, from_cash, from_ohda) VALUES (?,?,?,?,?,?,?)')
    .run(e.description, e.amount, e.category, e.date, e.from_deleted_bill || 0,
         e.from_cash !== undefined ? e.from_cash : 1,
         e.from_ohda !== undefined ? e.from_ohda : 1);
  return info.lastInsertRowid;
}

function updateExpense(id, e) {
  db.prepare('UPDATE expenses SET description=?, amount=?, category=?, date=?, from_cash=?, from_ohda=? WHERE id=?')
    .run(e.description, e.amount, e.category, e.date,
         e.from_cash !== undefined ? e.from_cash : 1,
         e.from_ohda !== undefined ? e.from_ohda : 1, id);
}

function deleteExpense(id) {
  db.prepare('DELETE FROM expenses WHERE id=?').run(id);
}

// ─── Ohda (عهده) ────────────────────────────────────────────────────────────
function getOhdaRecords() {
  return db.prepare('SELECT * FROM ohda_records ORDER BY date DESC, id DESC').all();
}

function getOhdaByDate(date) {
  return db.prepare('SELECT * FROM ohda_records WHERE date=? ORDER BY id DESC LIMIT 1').get(date);
}

function addOhdaRecord(rec) {
  const info = db.prepare('INSERT INTO ohda_records (date, amount, notes) VALUES (?,?,?)')
    .run(rec.date, rec.amount, rec.notes || '');
  return info.lastInsertRowid;
}

function updateOhdaRecord(id, rec) {
  db.prepare('UPDATE ohda_records SET date=?, amount=?, notes=? WHERE id=?')
    .run(rec.date, rec.amount, rec.notes || '', id);
}

function deleteOhdaRecord(id) {
  db.prepare('DELETE FROM ohda_records WHERE id=?').run(id);
}

function getOhdaExpenses() {
  return db.prepare('SELECT * FROM expenses WHERE from_ohda=1 ORDER BY date DESC, id DESC').all();
}

// ─── Suppliers ────────────────────────────────────────────────────────────────
function getSuppliers() {
  return db.prepare('SELECT * FROM suppliers ORDER BY id DESC').all();
}

function addSupplier(s) {
  const info = db.prepare('INSERT INTO suppliers (name, contact_number, supplies_what, notes, pending_amount) VALUES (?,?,?,?,?)')
    .run(s.name, s.contact_number, s.supplies_what, s.notes, s.pending_amount || 0);
  return info.lastInsertRowid;
}

function updateSupplier(id, s) {
  db.prepare('UPDATE suppliers SET name=?, contact_number=?, supplies_what=?, notes=? WHERE id=?')
    .run(s.name, s.contact_number, s.supplies_what, s.notes, id);
}

function updateSupplierPending(id, pending_amount) {
  db.prepare('UPDATE suppliers SET pending_amount=? WHERE id=?').run(pending_amount, id);
}

function deleteSupplier(id) {
  db.prepare('UPDATE parts SET supplier_id=NULL WHERE supplier_id=?').run(id);
  db.prepare('DELETE FROM supplier_transactions WHERE supplier_id=?').run(id);
  db.prepare('DELETE FROM suppliers WHERE id=?').run(id);
}

function addSupplierTransaction(supplierId, type, amount, balanceAfter, note, date) {
  const info = db.prepare('INSERT INTO supplier_transactions (supplier_id, type, amount, balance_after, note, date) VALUES (?,?,?,?,?,?)')
    .run(supplierId, type, amount, balanceAfter, note || '', date || new Date().toISOString().split('T')[0]);
  return info.lastInsertRowid;
}

function getSupplierTransactions(supplierId) {
  return db.prepare('SELECT * FROM supplier_transactions WHERE supplier_id=? ORDER BY date DESC, id DESC').all(supplierId);
}

// ─── Parts ────────────────────────────────────────────────────────────────────
function getParts() {
  return db.prepare(`
    SELECT p.*, s.name as supplier_name
    FROM parts p
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    ORDER BY p.name COLLATE NOCASE ASC
  `).all();
}

function searchParts(term) {
  return db.prepare(`
    SELECT p.*, s.name as supplier_name
    FROM parts p
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    WHERE p.name LIKE ?
    ORDER BY p.name COLLATE NOCASE ASC
  `).all(`%${term}%`);
}

function addPart(part) {
  const qty = part.quantity_in_stock !== undefined ? part.quantity_in_stock : (part.qty_in_stock !== undefined ? part.qty_in_stock : 0);
  const price = part.unit_price !== undefined ? part.unit_price : (part.price !== undefined ? part.price : 0);
  const info = db.prepare('INSERT INTO parts (name, quantity_in_stock, unit_price, supplier_id) VALUES (?,?,?,?)')
    .run(part.name, qty, price, part.supplier_id || null);
  return info.lastInsertRowid;
}

function updatePart(id, partData) {
  if (typeof partData === 'object') {
    const qty = partData.quantity_in_stock !== undefined ? partData.quantity_in_stock : (partData.qty_in_stock !== undefined ? partData.qty_in_stock : 0);
    const price = partData.unit_price !== undefined ? partData.unit_price : (partData.price !== undefined ? partData.price : 0);
    db.prepare('UPDATE parts SET name=?, quantity_in_stock=?, unit_price=?, supplier_id=? WHERE id=?')
      .run(partData.name, qty, price, partData.supplier_id || null, id);
  }
}

function deletePart(id) {
  db.prepare('DELETE FROM parts WHERE id=?').run(id);
}

function deductPartStock(id, quantity) {
  db.prepare('UPDATE parts SET quantity_in_stock=MAX(0, quantity_in_stock - ?) WHERE id=?').run(quantity, id);
}

function updatePartStock(id, delta) {
  db.prepare('UPDATE parts SET quantity_in_stock=MAX(0, quantity_in_stock + ?) WHERE id=?').run(delta, id);
}

// ─── Employees ────────────────────────────────────────────────────────────────
function getEmployees() {
  return db.prepare('SELECT * FROM employees ORDER BY name COLLATE NOCASE ASC').all();
}

function addEmployee(emp) {
  const info = db.prepare('INSERT INTO employees (name, role, daily_rate) VALUES (?,?,?)').run(emp.name, emp.role || '', emp.daily_rate || 0);
  return info.lastInsertRowid;
}

function updateEmployee(id, emp) {
  db.prepare('UPDATE employees SET name=?, role=?, daily_rate=? WHERE id=?').run(emp.name, emp.role || '', emp.daily_rate || 0, id);
}

function deleteEmployee(id) {
  db.prepare('DELETE FROM employees WHERE id=?').run(id);
}

function addEmployeeAdjustment(id, adjType, amount, notes) {
  const emp = db.prepare('SELECT pending_adjustments FROM employees WHERE id=?').get(id);
  if (emp) {
    let adjs = [];
    try { if (emp.pending_adjustments) adjs = JSON.parse(emp.pending_adjustments); } catch(e) {}
    adjs.push({ adj_type: adjType, amount: parseFloat(amount) || 0, notes: notes || '', date: new Date().toISOString().split('T')[0] });
    db.prepare('UPDATE employees SET pending_adjustments=? WHERE id=?').run(JSON.stringify(adjs), id);
  }
}

function clearEmployeeAdjustments(id) {
  db.prepare('UPDATE employees SET pending_adjustments=? WHERE id=?').run('[]', id);
}

function clearAllEmployeeAdjustments() {
  db.prepare("UPDATE employees SET pending_adjustments='[]'").run();
}

function updateEmployeeAdjustments(id, adjsArray) {
  db.prepare('UPDATE employees SET pending_adjustments=? WHERE id=?').run(JSON.stringify(adjsArray), id);
}

// ─── Car Expenses ─────────────────────────────────────────────────────────────
function getCarExpenses() {
  return db.prepare(`
    SELECT ce.*, c.name as customer_name
    FROM car_expenses ce
    LEFT JOIN customers c ON ce.customer_id = c.id
    ORDER BY ce.date DESC, ce.id DESC
  `).all();
}

function getCarExpenseById(id) {
  return db.prepare(`
    SELECT ce.*, c.name as customer_name
    FROM car_expenses ce
    LEFT JOIN customers c ON ce.customer_id = c.id
    WHERE ce.id=?
  `).get(id);
}

function addCarExpense(ce) {
  const info = db.prepare('INSERT INTO car_expenses (date, customer_id, car_id, car_info, total_cost, details_json) VALUES (?,?,?,?,?,?)')
    .run(ce.date, ce.customer_id || null, ce.car_id || null, ce.car_type || ce.car_info || '', ce.total_cost || 0, ce.materials_json || ce.details_json || '{}');
  return info.lastInsertRowid;
}

function updateCarExpense(id, ce) {
  db.prepare('UPDATE car_expenses SET date=?, customer_id=?, car_id=?, car_info=?, total_cost=?, details_json=? WHERE id=?')
    .run(ce.date, ce.customer_id || null, ce.car_id || null, ce.car_type || ce.car_info || '', ce.total_cost || 0, ce.materials_json || ce.details_json || '{}', id);
}

function deleteCarExpense(id) {
  db.prepare('DELETE FROM car_expenses WHERE id=?').run(id);
}

module.exports = {
  db,
  // Customers
  getCustomers, searchCustomers, addCustomer, updateCustomer, deleteCustomer, getCustomerByPhone,
  // Cars
  getCarsByCustomer, addCar, updateCar, deleteCar, getCarById,
  // Repairs (Confirmed Bills)
  addRepair, addRepairItem, getRepairs, getRepairById, getRepairItems,
  getRepairsByDate, getRepairsByCustomer, markRepairAsDeleted, deleteRepair,
  // Pending Bills
  getPendingBills, getPendingBillById, addPendingBill, updatePendingBill, deletePendingBill,
  // Expenses
  getExpenses, getExpensesByDate, addExpense, updateExpense, deleteExpense,
  // Ohda (عهده)
  getOhdaRecords, getOhdaByDate, addOhdaRecord, updateOhdaRecord, deleteOhdaRecord, getOhdaExpenses,
  // Suppliers
  getSuppliers, addSupplier, updateSupplier, updateSupplierPending, deleteSupplier,
  addSupplierTransaction, getSupplierTransactions,
  // Parts
  getParts, searchParts, addPart, updatePart, deletePart, deductPartStock, updatePartStock,
  // Employees
  getEmployees, addEmployee, updateEmployee, deleteEmployee,
  addEmployeeAdjustment, clearEmployeeAdjustments, clearAllEmployeeAdjustments, updateEmployeeAdjustments,
  // Car Expenses
  getCarExpenses, getCarExpenseById, addCarExpense, updateCarExpense, deleteCarExpense
};
