-- ==============================================================================
-- UNIFIED SERVICE-SHOP SUPABASE POSTGRES SCHEMA INITIALIZATION
-- ==============================================================================

-- 1. Branches Table
CREATE TABLE IF NOT EXISTS public.branches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

INSERT INTO public.branches (id, name)
VALUES ('main-shop', 'Main Shop'), ('body-shop', 'Body & Paint Shop')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 2. Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  car_name TEXT,
  plate_number TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Customer Cars Table (Body Shop vehicle tracking)
CREATE TABLE IF NOT EXISTS public.customer_cars (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  car_name TEXT,
  plate_number TEXT
);

-- 4. Suppliers Table
CREATE TABLE IF NOT EXISTS public.suppliers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  contact_number TEXT,
  supplies_what TEXT,
  notes TEXT,
  pending_amount NUMERIC(12, 2) DEFAULT 0
);

-- 5. Supplier Transactions Table
CREATE TABLE IF NOT EXISTS public.supplier_transactions (
  id SERIAL PRIMARY KEY,
  supplier_id INTEGER NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  date TEXT,
  type TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  balance_after NUMERIC(12, 2) NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. Parts / Inventory Table
CREATE TABLE IF NOT EXISTS public.parts (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  quantity_in_stock NUMERIC(10, 2) DEFAULT 0,
  unit_price NUMERIC(12, 2) DEFAULT 0,
  supplier_id INTEGER REFERENCES public.suppliers(id) ON DELETE SET NULL
);

-- 7. Employees Table
CREATE TABLE IF NOT EXISTS public.employees (
  id SERIAL PRIMARY KEY,
  employee_id TEXT,
  name TEXT NOT NULL,
  role TEXT,
  daily_rate NUMERIC(12, 2) DEFAULT 0,
  accumulated_deductions NUMERIC(12, 2) DEFAULT 0,
  pending_adjustments TEXT DEFAULT '[]',
  branch_id TEXT REFERENCES public.branches(id),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. Expenses Table
CREATE TABLE IF NOT EXISTS public.expenses (
  id SERIAL PRIMARY KEY,
  description TEXT,
  amount NUMERIC(12, 2) DEFAULT 0,
  category TEXT,
  date TEXT,
  from_cash BOOLEAN DEFAULT TRUE,
  from_deleted_bill BOOLEAN DEFAULT FALSE,
  from_ohda BOOLEAN DEFAULT TRUE,
  branch_id TEXT REFERENCES public.branches(id)
);

-- 9. Ohda Records Table (Petty Cash Fund for Body Shop)
CREATE TABLE IF NOT EXISTS public.ohda_records (
  id SERIAL PRIMARY KEY,
  date TEXT NOT NULL,
  amount NUMERIC(12, 2) DEFAULT 0,
  notes TEXT,
  branch_id TEXT REFERENCES public.branches(id),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 10. Repairs Table
CREATE TABLE IF NOT EXISTS public.repairs (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES public.customers(id),
  car_id INTEGER REFERENCES public.customer_cars(id),
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
  branch_id TEXT REFERENCES public.branches(id)
);

-- 11. Repair Items Table
CREATE TABLE IF NOT EXISTS public.repair_items (
  id SERIAL PRIMARY KEY,
  repair_id INTEGER REFERENCES public.repairs(id) ON DELETE CASCADE,
  item_name TEXT,
  quantity NUMERIC(10, 2) DEFAULT 1,
  unit_price NUMERIC(12, 2) DEFAULT 0
);

-- 12. Pending Bills Table
CREATE TABLE IF NOT EXISTS public.pending_bills (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES public.customers(id),
  car_id INTEGER REFERENCES public.customer_cars(id),
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
  branch_id TEXT REFERENCES public.branches(id)
);

-- 13. Car Expenses Table
CREATE TABLE IF NOT EXISTS public.car_expenses (
  id SERIAL PRIMARY KEY,
  date TEXT,
  customer_id INTEGER REFERENCES public.customers(id),
  car_id INTEGER REFERENCES public.customer_cars(id),
  car_info TEXT,
  total_cost NUMERIC(12, 2) DEFAULT 0,
  details_json TEXT,
  branch_id TEXT REFERENCES public.branches(id)
);

-- 14. Profiles Table (Auth Roles)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  branch_id TEXT REFERENCES public.branches(id),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on all tables
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ohda_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow full access to service_role / authenticated users
CREATE POLICY service_role_all_branches ON public.branches FOR ALL USING (true);
CREATE POLICY service_role_all_customers ON public.customers FOR ALL USING (true);
CREATE POLICY service_role_all_customer_cars ON public.customer_cars FOR ALL USING (true);
CREATE POLICY service_role_all_suppliers ON public.suppliers FOR ALL USING (true);
CREATE POLICY service_role_all_supplier_transactions ON public.supplier_transactions FOR ALL USING (true);
CREATE POLICY service_role_all_parts ON public.parts FOR ALL USING (true);
CREATE POLICY service_role_all_employees ON public.employees FOR ALL USING (true);
CREATE POLICY service_role_all_expenses ON public.expenses FOR ALL USING (true);
CREATE POLICY service_role_all_ohda ON public.ohda_records FOR ALL USING (true);
CREATE POLICY service_role_all_repairs ON public.repairs FOR ALL USING (true);
CREATE POLICY service_role_all_repair_items ON public.repair_items FOR ALL USING (true);
CREATE POLICY service_role_all_pending_bills ON public.pending_bills FOR ALL USING (true);
CREATE POLICY service_role_all_car_expenses ON public.car_expenses FOR ALL USING (true);
CREATE POLICY service_role_all_profiles ON public.profiles FOR ALL USING (true);
