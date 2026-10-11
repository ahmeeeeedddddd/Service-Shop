-- ==============================================================================
-- Schema Migration: Table for Weekly Operating Expenses (مصاريف تشغيل أسبوعية)
-- Scope: Main Shop ('main-shop')
-- Week cycle: Monday to Saturday inclusive
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.weekly_expenses (
  id SERIAL PRIMARY KEY,
  branch_id TEXT REFERENCES branches(id) DEFAULT 'main-shop',
  category TEXT DEFAULT 'عام',
  type TEXT DEFAULT 'manual', -- 'salary', 'supplier_payment', 'regular_expense', 'manual'
  description TEXT,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  date TEXT NOT NULL,
  week_start TEXT,
  week_end TEXT,
  reference_id INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS and public access policy consistent with other shop tables
ALTER TABLE public.weekly_expenses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'weekly_expenses' AND policyname = 'Allow public read and write on weekly_expenses'
  ) THEN
    CREATE POLICY "Allow public read and write on weekly_expenses"
    ON public.weekly_expenses FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
