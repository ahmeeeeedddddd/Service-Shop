import { pgTable, serial, text, numeric, timestamp, boolean, integer, uuid } from 'drizzle-orm/pg-core';

// ─── Branches ────────────────────────────────────────────────────────────────
export const branches = pgTable('branches', {
  id: text('id').primaryKey(), // 'main-shop' or 'body-shop'
  name: text('name').notNull(),
});

// ─── Shared Entities ──────────────────────────────────────────────────────────
export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone'),
  carName: text('car_name'),
  plateNumber: text('plate_number'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const customerCars = pgTable('customer_cars', {
  id: serial('id').primaryKey(),
  customerId: integer('customer_id')
    .notNull()
    .references(() => customers.id, { onDelete: 'cascade' }),
  carName: text('car_name'),
  plateNumber: text('plate_number'),
});

export const suppliers = pgTable('suppliers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  contactNumber: text('contact_number'),
  suppliesWhat: text('supplies_what'),
  notes: text('notes'),
  pendingAmount: numeric('pending_amount', { precision: 12, scale: 2 }).default('0'),
});

export const supplierTransactions = pgTable('supplier_transactions', {
  id: serial('id').primaryKey(),
  supplierId: integer('supplier_id')
    .notNull()
    .references(() => suppliers.id, { onDelete: 'cascade' }),
  date: text('date'),
  type: text('type').notNull(), // 'PURCHASE', 'PAYMENT', etc.
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  balanceAfter: numeric('balance_after', { precision: 12, scale: 2 }).notNull(),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const parts = pgTable('parts', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category'),
  quantityInStock: numeric('quantity_in_stock', { precision: 10, scale: 2 }).default('0'),
  unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).default('0'),
  supplierId: integer('supplier_id').references(() => suppliers.id, { onDelete: 'set null' }),
});

// ─── Branch Scoped Entities ───────────────────────────────────────────────────
export const employees = pgTable('employees', {
  id: serial('id').primaryKey(),
  employeeId: text('employee_id'),
  name: text('name').notNull(),
  role: text('role'),
  dailyRate: numeric('daily_rate', { precision: 12, scale: 2 }).default('0'),
  accumulatedDeductions: numeric('accumulated_deductions', { precision: 12, scale: 2 }).default('0'),
  pendingAdjustments: text('pending_adjustments').default('[]'),
  branchId: text('branch_id').references(() => branches.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const expenses = pgTable('expenses', {
  id: serial('id').primaryKey(),
  description: text('description'),
  amount: numeric('amount', { precision: 12, scale: 2 }).default('0'),
  category: text('category'),
  date: text('date'),
  fromCash: boolean('from_cash').default(true),
  fromDeletedBill: boolean('from_deleted_bill').default(false),
  fromOhda: boolean('from_ohda').default(true),
  branchId: text('branch_id').references(() => branches.id),
});

export const ohdaRecords = pgTable('ohda_records', {
  id: serial('id').primaryKey(),
  date: text('date').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).default('0'),
  notes: text('notes'),
  branchId: text('branch_id').references(() => branches.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const repairs = pgTable('repairs', {
  id: serial('id').primaryKey(),
  customerId: integer('customer_id').references(() => customers.id),
  carId: integer('car_id').references(() => customerCars.id),
  description: text('description'),
  date: text('date'),
  totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).default('0'),
  paidAmount: numeric('paid_amount', { precision: 12, scale: 2 }).default('0'),
  pendingAmount: numeric('pending_amount', { precision: 12, scale: 2 }).default('0'),
  discount: numeric('discount', { precision: 12, scale: 2 }).default('0'),
  paymentMethod: text('payment_method'),
  odometer: text('odometer'),
  notes: text('notes'),
  legacyId: text('legacy_id'),
  branchId: text('branch_id').references(() => branches.id),
});

export const repairItems = pgTable('repair_items', {
  id: serial('id').primaryKey(),
  repairId: integer('repair_id').references(() => repairs.id, { onDelete: 'cascade' }),
  itemName: text('item_name'),
  quantity: numeric('quantity', { precision: 10, scale: 2 }).default('1'),
  unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).default('0'),
});

export const pendingBills = pgTable('pending_bills', {
  id: serial('id').primaryKey(),
  customerId: integer('customer_id').references(() => customers.id),
  carId: integer('car_id').references(() => customerCars.id),
  description: text('description'),
  dateCreated: text('date_created'),
  totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).default('0'),
  paidAmount: numeric('paid_amount', { precision: 12, scale: 2 }).default('0'),
  pendingAmount: numeric('pending_amount', { precision: 12, scale: 2 }).default('0'),
  discount: numeric('discount', { precision: 12, scale: 2 }).default('0'),
  paymentMethod: text('payment_method'),
  odometer: text('odometer'),
  notes: text('notes'),
  lineItemsJson: text('line_items_json'),
  branchId: text('branch_id').references(() => branches.id),
});

export const carExpenses = pgTable('car_expenses', {
  id: serial('id').primaryKey(),
  date: text('date'),
  customerId: integer('customer_id').references(() => customers.id),
  carId: integer('car_id').references(() => customerCars.id),
  carInfo: text('car_info'),
  totalCost: numeric('total_cost', { precision: 12, scale: 2 }).default('0'),
  detailsJson: text('details_json'),
  branchId: text('branch_id').references(() => branches.id),
});

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull(),
  role: text('role').notNull(), // 'operator_main', 'operator_body', 'owner'
  branchId: text('branch_id').references(() => branches.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
