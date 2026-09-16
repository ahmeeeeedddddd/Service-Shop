import postgres from 'postgres';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL is not defined in .env.local');
  process.exit(1);
}

const sql = postgres(connectionString, { prepare: false, ssl: 'require' });

async function initSchema() {
  console.log('⚡ Initializing Supabase Postgres Database Schema...');

  try {
    // 1. Branches table
    await sql`
      CREATE TABLE IF NOT EXISTS branches (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL
      );
    `;

    // Seed branches
    await sql`
      INSERT INTO branches (id, name)
      VALUES ('main-shop', 'Main Shop'), ('body-shop', 'Body & Paint Shop')
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
    `;

    // 2. Customers
    await sql`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        car_name TEXT,
        plate_number TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 3. Customer Cars
    await sql`
      CREATE TABLE IF NOT EXISTS customer_cars (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        car_name TEXT,
        plate_number TEXT
      );
    `;

    // 4. Suppliers
    await sql`
      CREATE TABLE IF NOT EXISTS suppliers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        contact_number TEXT,
        supplies_what TEXT,
        notes TEXT,
        pending_amount NUMERIC(12, 2) DEFAULT 0
      );
    `;

    // 5. Supplier Transactions
    await sql`
      CREATE TABLE IF NOT EXISTS supplier_transactions (
        id SERIAL PRIMARY KEY,
        supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
        date TEXT,
        type TEXT NOT NULL,
        amount NUMERIC(12, 2) NOT NULL,
        balance_after NUMERIC(12, 2) NOT NULL,
        note TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 6. Parts
    await sql`
      CREATE TABLE IF NOT EXISTS parts (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT,
        quantity_in_stock NUMERIC(10, 2) DEFAULT 0,
        unit_price NUMERIC(12, 2) DEFAULT 0,
        supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL
      );
    `;

    // 7. Employees
    await sql`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        employee_id TEXT,
        name TEXT NOT NULL,
        role TEXT,
        daily_rate NUMERIC(12, 2) DEFAULT 0,
        accumulated_deductions NUMERIC(12, 2) DEFAULT 0,
        pending_adjustments TEXT DEFAULT '[]',
        branch_id TEXT REFERENCES branches(id),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 8. Expenses
    await sql`
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        description TEXT,
        amount NUMERIC(12, 2) DEFAULT 0,
        category TEXT,
        date TEXT,
        from_cash BOOLEAN DEFAULT TRUE,
        from_deleted_bill BOOLEAN DEFAULT FALSE,
        from_ohda BOOLEAN DEFAULT TRUE,
        branch_id TEXT REFERENCES branches(id)
      );
    `;

    // 9. Ohda Records
    await sql`
      CREATE TABLE IF NOT EXISTS ohda_records (
        id SERIAL PRIMARY KEY,
        date TEXT NOT NULL,
        amount NUMERIC(12, 2) DEFAULT 0,
        notes TEXT,
        branch_id TEXT REFERENCES branches(id),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 10. Repairs
    await sql`
      CREATE TABLE IF NOT EXISTS repairs (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id),
        car_id INTEGER REFERENCES customer_cars(id),
        description TEXT,
        date TEXT,
        total_amount NUMERIC(12, 2) DEFAULT 0,
        paid_amount NUMERIC(12, 2) DEFAULT 0,
        pending_amount NUMERIC(12, 2) DEFAULT 0,
        discount NUMERIC(12, 2) DEFAULT 0,
        payment_method TEXT,
        odometer TEXT,
        notes TEXT,
        legacy_id TEXT,
        branch_id TEXT REFERENCES branches(id)
      );
    `;

    // 11. Repair Items
    await sql`
      CREATE TABLE IF NOT EXISTS repair_items (
        id SERIAL PRIMARY KEY,
        repair_id INTEGER REFERENCES repairs(id) ON DELETE CASCADE,
        item_name TEXT,
        quantity NUMERIC(10, 2) DEFAULT 1,
        unit_price NUMERIC(12, 2) DEFAULT 0
      );
    `;

    // 12. Pending Bills
    await sql`
      CREATE TABLE IF NOT EXISTS pending_bills (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id),
        car_id INTEGER REFERENCES customer_cars(id),
        description TEXT,
        date_created TEXT,
        total_amount NUMERIC(12, 2) DEFAULT 0,
        paid_amount NUMERIC(12, 2) DEFAULT 0,
        pending_amount NUMERIC(12, 2) DEFAULT 0,
        discount NUMERIC(12, 2) DEFAULT 0,
        payment_method TEXT,
        odometer TEXT,
        notes TEXT,
        line_items_json TEXT,
        branch_id TEXT REFERENCES branches(id)
      );
    `;

    // 13. Car Expenses
    await sql`
      CREATE TABLE IF NOT EXISTS car_expenses (
        id SERIAL PRIMARY KEY,
        date TEXT,
        customer_id INTEGER REFERENCES customers(id),
        car_id INTEGER REFERENCES customer_cars(id),
        car_info TEXT,
        total_cost NUMERIC(12, 2) DEFAULT 0,
        details_json TEXT,
        branch_id TEXT REFERENCES branches(id)
      );
    `;

    // 14. User Profiles (Auth Roles)
    await sql`
      CREATE TABLE IF NOT EXISTS profiles (
        id UUID PRIMARY KEY,
        email TEXT NOT NULL,
        role TEXT NOT NULL,
        branch_id TEXT REFERENCES branches(id),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `;

    console.log('✅ Schema initialization completed successfully!');
  } catch (err) {
    console.error('❌ Schema initialization failed:', err);
  } finally {
    await sql.end();
  }
}

initSchema();
