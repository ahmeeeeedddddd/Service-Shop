import { supabase } from '../db/client';
import {
  assertAllowedTable,
  assertPositiveInt,
  sanitizeSearchTerm,
  safeParseJson,
  safeStringifyJson,
  sanitizePayload,
} from '../utils/sanitize';

export interface Customer {
  id: number;
  name: string;
  phone?: string | null;
  car_name?: string | null;
  plate_number?: string | null;
  created_at?: string;
}

export interface CustomerCar {
  id: number;
  customer_id: number;
  car_name?: string | null;
  plate_number?: string | null;
}

export interface Supplier {
  id: number;
  name: string;
  contact_number?: string | null;
  supplies_what?: string | null;
  notes?: string | null;
  pending_amount?: number;
}

export interface SupplierTransaction {
  id: number;
  supplier_id: number;
  date?: string | null;
  type: string;
  amount: number;
  balance_after: number;
  note?: string | null;
  created_at?: string;
}

export interface Part {
  id: number;
  name: string;
  category?: string | null;
  quantity_in_stock: number;
  cost_price?: number;
  unit_price: number;
  supplier_id?: number | null;
  branch_id?: string | null;
}

export interface Employee {
  id: number;
  employee_id?: string | null;
  name: string;
  role?: string | null;
  daily_rate: number;
  accumulated_deductions?: number;
  pending_adjustments?: string;
  branch_id?: string | null;
  created_at?: string;
}

export interface Expense {
  id: number;
  description?: string | null;
  amount: number;
  category?: string | null;
  date?: string | null;
  from_cash?: boolean;
  from_deleted_bill?: boolean;
  from_ohda?: boolean;
  branch_id?: string | null;
}

export interface WeeklyExpense {
  id: number;
  branch_id?: string | null;
  category?: string | null;
  type?: string | null; // 'salary', 'supplier_payment', 'regular_expense', 'manual'
  description?: string | null;
  amount: number;
  date: string;
  week_start?: string | null;
  week_end?: string | null;
  reference_id?: number | null;
  notes?: string | null;
  created_at?: string;
}


export interface OhdaRecord {
  id: number;
  date: string;
  amount: number;
  notes?: string | null;
  branch_id?: string | null;
  created_at?: string;
}

export interface Repair {
  id: number;
  customer_id?: number | null;
  car_id?: number | null;
  description?: string | null;
  date?: string | null;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  discount: number;
  payment_method?: string | null;
  odometer?: string | null;
  notes?: string | null;
  branch_id?: string | null;
  customers?: Customer;
  repair_items?: RepairItem[];
}

export interface RepairItem {
  id: number;
  repair_id: number;
  item_name?: string | null;
  quantity: number;
  unit_price: number;
}

export interface PendingBill {
  id: number;
  customer_id?: number | null;
  car_id?: number | null;
  description?: string | null;
  date_created?: string | null;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  discount: number;
  payment_method?: string | null;
  odometer?: string | null;
  notes?: string | null;
  line_items_json?: string | null;
  branch_id?: string | null;
  customers?: Customer;
}

export interface CarExpense {
  id: number;
  date?: string | null;
  customer_id?: number | null;
  car_id?: number | null;
  car_info?: string | null;
  total_cost: number;
  details_json?: string | null;
  branch_id?: string | null;
  customers?: Customer;
}

// ─── Customers ────────────────────────────────────────────────────────────────
export async function getCustomers(searchQuery?: string): Promise<Customer[]> {
  let query = supabase.from('customers').select('*').order('id', { ascending: false });

  if (searchQuery && searchQuery.trim()) {
    // Sanitize before embedding in PostgREST filter string (prevents ReDoS & filter injection)
    const term = sanitizeSearchTerm(searchQuery);
    if (!term) return [];
    query = query.or(`name.ilike.%${term}%,phone.ilike.%${term}%,car_name.ilike.%${term}%,plate_number.ilike.%${term}%`).limit(5000);
  } else {
    // No search: load only the 50 most recent to keep initial load fast
    query = query.limit(50);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching customers:', error);
    return [];
  }
  return data || [];
}

export async function addCustomer(payload: Omit<Customer, 'id' | 'created_at'>): Promise<Customer | null> {
  const clean = sanitizePayload(payload as Record<string, unknown>);
  const { data, error } = await supabase.from('customers').insert([clean]).select().single();
  if (error) {
    console.error('Error adding customer:', error);
    return null;
  }
  return data;
}

export async function updateCustomer(id: number, payload: Partial<Customer>): Promise<boolean> {
  assertPositiveInt(id, 'customer id');
  const clean = sanitizePayload(payload as Record<string, unknown>);
  const { error } = await supabase.from('customers').update(clean).eq('id', id);
  if (error) {
    console.error('Error updating customer:', error);
    return false;
  }
  return true;
}

export async function deleteCustomer(id: number): Promise<boolean> {
  assertPositiveInt(id, 'customer id');
  const { error } = await supabase.from('customers').delete().eq('id', id);
  if (error) {
    console.error('Error deleting customer:', error);
    return false;
  }
  return true;
}

// ─── Customer Cars ────────────────────────────────────────────────────────────
export async function getCustomerCars(customerId: number): Promise<CustomerCar[]> {
  const { data, error } = await supabase.from('customer_cars').select('*').eq('customer_id', customerId);
  if (error) {
    console.error('Error fetching customer cars:', error);
    return [];
  }
  return data || [];
}

export async function addCustomerCar(payload: Omit<CustomerCar, 'id'>): Promise<CustomerCar | null> {
  const { data, error } = await supabase.from('customer_cars').insert([payload]).select().single();
  if (error) {
    console.error('Error adding car:', error);
    return null;
  }
  return data;
}

// ─── Suppliers ────────────────────────────────────────────────────────────────
export async function getSuppliers(): Promise<Supplier[]> {
  const { data, error } = await supabase.from('suppliers').select('*').order('name', { ascending: true });
  if (error) {
    console.error('Error fetching suppliers:', error);
    return [];
  }
  return data || [];
}

export async function addSupplier(payload: Omit<Supplier, 'id'>): Promise<Supplier | null> {
  const { data, error } = await supabase.from('suppliers').insert([payload]).select().single();
  if (error) {
    console.error('Error adding supplier:', error);
    return null;
  }
  return data;
}

export async function getSupplierTransactions(supplierId: number): Promise<SupplierTransaction[]> {
  const { data, error } = await supabase
    .from('supplier_transactions')
    .select('*')
    .eq('supplier_id', supplierId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false });
  if (error) {
    console.error('Error fetching supplier transactions:', error);
    return [];
  }
  return data || [];
}

export async function addSupplierTransaction(payload: Omit<SupplierTransaction, 'id' | 'created_at'>): Promise<boolean> {
  const { error } = await supabase.from('supplier_transactions').insert([payload]);
  if (error) {
    console.error('Error adding supplier transaction:', error);
    return false;
  }
  // Also update supplier pending_amount
  await supabase.from('suppliers').update({ pending_amount: payload.balance_after }).eq('id', payload.supplier_id);
  return true;
}

// ─── Inventory / Parts ────────────────────────────────────────────────────────
function parsePartCategoryAndCost(p: Part): Part {
  if (!p) return p;
  let costPrice = p.cost_price || 0;
  let cleanCategory = p.category || '';

  if (cleanCategory.includes('|cost:')) {
    const parts = cleanCategory.split('|cost:');
    cleanCategory = parts[0];
    if (!costPrice && parts[1]) {
      costPrice = parseFloat(parts[1]) || 0;
    }
  }

  return {
    ...p,
    category: cleanCategory,
    cost_price: costPrice,
  };
}

export async function getParts(branchId?: string): Promise<Part[]> {
  const { data, error } = await supabase.from('parts').select('*').order('name', { ascending: true });
  if (error) {
    console.error('Error fetching parts:', error);
    return [];
  }
  return (data || []).map(parsePartCategoryAndCost);
}

export async function addPart(payload: Omit<Part, 'id'>): Promise<Part | null> {
  const { branch_id, ...cleanPayload } = payload as any;
  const cost = cleanPayload.cost_price || 0;

  let categoryWithCost = cleanPayload.category || '';
  if (cost > 0 && !categoryWithCost.includes('|cost:')) {
    categoryWithCost = `${categoryWithCost}|cost:${cost}`;
  }

  const payloadWithEncodedCategory = {
    ...cleanPayload,
    category: categoryWithCost,
  };

  const { data, error } = await supabase.from('parts').insert([payloadWithEncodedCategory]).select().single();
  if (error) {
    console.error('Error adding part:', error.message);
    if (error.message && (error.message.includes('cost_price') || error.code === 'PGRST204')) {
      const { cost_price, ...fallbackPayload } = payloadWithEncodedCategory;
      const { data: fbData, error: fbError } = await supabase.from('parts').insert([fallbackPayload]).select().single();
      if (fbError) {
        console.error('Fallback add part failed:', fbError.message);
        return null;
      }
      return fbData ? parsePartCategoryAndCost(fbData) : null;
    }
    return null;
  }
  return data ? parsePartCategoryAndCost(data) : null;
}

export async function updatePart(id: number, payload: Partial<Part>): Promise<boolean> {
  const cost = payload.cost_price !== undefined ? payload.cost_price : undefined;

  let updatedPayload = { ...payload } as any;
  if (cost !== undefined) {
    let cat: string = payload.category ?? '';
    if (payload.category === undefined) {
      const { data: existing } = await supabase.from('parts').select('category').eq('id', id).single();
      cat = existing?.category || '';
    }
    if (cat.includes('|cost:')) {
      cat = cat.split('|cost:')[0];
    }
    if (cost > 0) {
      cat = `${cat}|cost:${cost}`;
    }
    updatedPayload.category = cat;
  }

  const { error } = await supabase.from('parts').update(updatedPayload).eq('id', id);
  if (error) {
    console.error('Error updating part:', error.message);
    if (error.message && (error.message.includes('cost_price') || error.code === 'PGRST204')) {
      const { cost_price, ...fallbackPayload } = updatedPayload;
      const { error: fbError } = await supabase.from('parts').update(fallbackPayload).eq('id', id);
      if (fbError) {
        console.error('Fallback update part failed:', fbError.message);
        return false;
      }
      return true;
    }
    return false;
  }
  return true;
}

// ─── Employees ────────────────────────────────────────────────────────────────
export async function getEmployees(branchId?: string): Promise<Employee[]> {
  let query = supabase.from('employees').select('*').order('name', { ascending: true });
  if (branchId) query = query.eq('branch_id', branchId);
  const { data, error } = await query;
  if (error) {
    console.error('Error fetching employees:', error);
    return [];
  }
  return data || [];
}

export async function addEmployee(payload: Omit<Employee, 'id' | 'created_at'>): Promise<Employee | null> {
  const { data, error } = await supabase.from('employees').insert([payload]).select().single();
  if (error) {
    console.error('Error adding employee:', error);
    return null;
  }
  return data;
}

// Helper to fetch all rows across 1000-limit PostgREST pages
const FETCH_ALL_ROWS_MAX_PAGES = 20; // Safety cap: max 20,000 rows per call

export async function fetchAllRows<T = any>(table: string, selectCols: string = '*', branchId?: string): Promise<T[]> {
  // Guard: table name must be in the explicit allowlist
  assertAllowedTable(table);

  let allData: T[] = [];
  let page = 0;
  const pageSize = 1000;
  while (page < FETCH_ALL_ROWS_MAX_PAGES) {
    let query = supabase.from(table).select(selectCols).range(page * pageSize, (page + 1) * pageSize - 1);
    if (branchId) query = query.eq('branch_id', branchId);
    const { data, error } = await query;
    if (error || !data || data.length === 0) break;
    allData = allData.concat(data as T[]);
    if (data.length < pageSize) break;
    page++;
  }
  return allData;
}

export async function getExactCount(table: string, branchId?: string): Promise<number> {
  let query = supabase.from(table).select('*', { count: 'exact', head: true });
  if (branchId) query = query.eq('branch_id', branchId);
  const { count, error } = await query;
  if (error) {
    console.error(`Error fetching exact count for ${table}:`, error);
    return 0;
  }
  return count || 0;
}

export function formatEndDateForQuery(endDate?: string): string | undefined {
  if (!endDate) return undefined;
  const trimmed = endDate.trim();
  if (trimmed.length === 10) {
    return `${trimmed} 23:59:59`;
  }
  return trimmed;
}

export function getTodayLocalDateStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ─── Expenses ─────────────────────────────────────────────────────────────────
export async function getExpenses(branchId?: string, startDate?: string, endDate?: string): Promise<Expense[]> {
  let query = supabase.from('expenses').select('*').order('date', { ascending: false }).order('id', { ascending: false });
  if (branchId) query = query.eq('branch_id', branchId);
  if (startDate) query = query.gte('date', startDate);
  if (endDate) query = query.lte('date', formatEndDateForQuery(endDate)!);
  const { data, error } = await query;
  if (error) {
    console.error('Error fetching expenses:', error);
    return [];
  }
  return data || [];
}

export async function addExpense(payload: Omit<Expense, 'id'>): Promise<Expense | null> {
  const { data, error } = await supabase.from('expenses').insert([payload]).select().single();
  if (error) {
    console.error('Error adding expense:', error);
    return null;
  }
  return data;
}

// ─── Weekly Operating Expenses ───────────────────────────────────────────────
export function getMondayToSaturdayWeek(inputDate?: string | Date): {
  weekStart: string;
  weekEnd: string;
} {
  const d = inputDate ? (typeof inputDate === 'string' ? new Date(inputDate) : new Date(inputDate)) : new Date();
  const day = d.getDay(); // 0: Sun, 1: Mon, ..., 6: Sat
  // Mon to Sat week: Mon is start
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);

  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);

  const format = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const dayStr = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${dayStr}`;
  };

  return {
    weekStart: format(monday),
    weekEnd: format(saturday),
  };
}

export async function getWeeklyExpenses(
  branchId: string = 'main-shop',
  startDate?: string,
  endDate?: string
): Promise<WeeklyExpense[]> {
  try {
    let query = supabase
      .from('weekly_expenses')
      .select('*')
      .order('date', { ascending: false })
      .order('id', { ascending: false });
    if (branchId) query = query.eq('branch_id', branchId);
    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', formatEndDateForQuery(endDate)!);
    const { data, error } = await query;
    if (error) {
      console.error('Error fetching weekly expenses:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Unexpected error fetching weekly expenses:', err);
    return [];
  }
}

export async function addWeeklyExpense(
  payload: Omit<WeeklyExpense, 'id' | 'created_at'>
): Promise<WeeklyExpense | null> {
  try {
    // If week_start or week_end missing, compute from date
    let toInsert = { ...payload };
    if (!toInsert.week_start || !toInsert.week_end) {
      const range = getMondayToSaturdayWeek(toInsert.date || new Date());
      toInsert.week_start = range.weekStart;
      toInsert.week_end = range.weekEnd;
    }
    const { data, error } = await supabase.from('weekly_expenses').insert([toInsert]).select().single();
    if (error) {
      console.error('Error adding weekly expense:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Unexpected error adding weekly expense:', err);
    return null;
  }
}

export async function deleteWeeklyExpense(id: number): Promise<boolean> {
  try {
    const { error } = await supabase.from('weekly_expenses').delete().eq('id', id);
    if (error) {
      console.error('Error deleting weekly expense:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Unexpected error deleting weekly expense:', err);
    return false;
  }
}

export async function updateWeeklyExpense(
  id: number,
  updates: Partial<Omit<WeeklyExpense, 'id' | 'created_at'>>
): Promise<WeeklyExpense | null> {
  try {
    const { data, error } = await supabase
      .from('weekly_expenses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error('Error updating weekly expense:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Unexpected error updating weekly expense:', err);
    return null;
  }
}


// ─── Ohda Records ─────────────────────────────────────────────────────────────
export async function getOhdaRecords(branchId: string = 'body-shop', startDate?: string, endDate?: string): Promise<OhdaRecord[]> {
  let query = supabase
    .from('ohda_records')
    .select('*')
    .eq('branch_id', branchId)
    .order('date', { ascending: false });
  if (startDate) query = query.gte('date', startDate);
  if (endDate) query = query.lte('date', formatEndDateForQuery(endDate)!);
  const { data, error } = await query;
  if (error) {
    console.error('Error fetching ohda records:', error);
    return [];
  }
  return data || [];
}

export async function addOhdaRecord(payload: Omit<OhdaRecord, 'id' | 'created_at'>): Promise<OhdaRecord | null> {
  const { data, error } = await supabase.from('ohda_records').insert([payload]).select().single();
  if (error) {
    console.error('Error adding ohda record:', error);
    return null;
  }
  return data;
}

export async function updateOhdaRecord(id: number, payload: Partial<OhdaRecord>): Promise<boolean> {
  const { error } = await supabase.from('ohda_records').update(payload).eq('id', id);
  if (error) {
    console.error('Error updating ohda record:', error);
    return false;
  }
  return true;
}

// ─── Repairs & Invoices ───────────────────────────────────────────────────────
export async function getRepairs(branchId?: string, startDate?: string, endDate?: string): Promise<Repair[]> {
  let query = supabase
    .from('repairs')
    .select('*, customers(*), repair_items(*)')
    .order('id', { ascending: false });
  if (branchId) query = query.eq('branch_id', branchId);
  if (startDate) query = query.gte('date', startDate);
  if (endDate) query = query.lte('date', formatEndDateForQuery(endDate)!);
  const { data, error } = await query;
  if (error) {
    console.error('Error fetching repairs:', error);
    return [];
  }
  return data || [];
}

export async function getRepairsByCustomerId(customerId: number): Promise<Repair[]> {
  const { data, error } = await supabase
    .from('repairs')
    .select('*, customers(*), repair_items(*)')
    .eq('customer_id', customerId)
    .order('id', { ascending: false });
  if (error) {
    console.error('Error fetching customer repairs:', error);
    return [];
  }
  return data || [];
}

export async function addRepair(
  repairPayload: Omit<Repair, 'id' | 'customers' | 'repair_items'>,
  itemsPayload: Array<Omit<RepairItem, 'id' | 'repair_id'>>
): Promise<Repair | null> {
  const { data: repairData, error: repairError } = await supabase
    .from('repairs')
    .insert([repairPayload])
    .select()
    .single();

  if (repairError || !repairData) {
    console.error('Error adding repair:', repairError);
    return null;
  }

  if (itemsPayload && itemsPayload.length > 0) {
    const itemsToInsert = itemsPayload.map((item) => ({
      ...item,
      repair_id: repairData.id,
    }));
    const { error: itemsError } = await supabase.from('repair_items').insert(itemsToInsert);
    if (itemsError) {
      console.error('Error inserting repair items:', itemsError);
    }
  }

  return repairData;
}

// ─── Pending Bills ────────────────────────────────────────────────────────────
export async function getPendingBills(branchId?: string): Promise<PendingBill[]> {
  let query = supabase.from('pending_bills').select('*, customers(*)').order('id', { ascending: false });
  if (branchId) query = query.eq('branch_id', branchId);
  const { data, error } = await query;
  if (error) {
    console.error('Error fetching pending bills:', error);
    return [];
  }
  return data || [];
}

export async function addPendingBill(payload: Omit<PendingBill, 'id' | 'customers'>): Promise<PendingBill | null> {
  const { data, error } = await supabase.from('pending_bills').insert([payload]).select().single();
  if (error) {
    console.error('Error adding pending bill:', error);
    return null;
  }
  return data;
}

export async function deletePendingBill(id: number): Promise<boolean> {
  assertPositiveInt(id, 'pending bill id');
  const { error } = await supabase.from('pending_bills').delete().eq('id', id);
  if (error) {
    console.error('Error deleting pending bill:', error);
    return false;
  }
  return true;
}

export async function updateEmployee(id: number, payload: Partial<Employee>): Promise<boolean> {
  const { error } = await supabase.from('employees').update(payload).eq('id', id);
  if (error) {
    console.error('Error updating employee:', error);
    return false;
  }
  return true;
}

export async function deleteEmployee(id: number): Promise<boolean> {
  assertPositiveInt(id, 'employee id');
  const { error } = await supabase.from('employees').delete().eq('id', id);
  if (error) {
    console.error('Error deleting employee:', error);
    return false;
  }
  return true;
}

export async function deleteExpense(id: number): Promise<boolean> {
  assertPositiveInt(id, 'expense id');
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) {
    console.error('Error deleting expense:', error);
    return false;
  }
  return true;
}

export async function deletePart(id: number): Promise<boolean> {
  assertPositiveInt(id, 'part id');
  const { error } = await supabase.from('parts').delete().eq('id', id);
  if (error) {
    console.error('Error deleting part:', error);
    return false;
  }
  return true;
}

// ─── Car Expenses (Body Shop) ─────────────────────────────────────────────────
export async function getCarExpenses(branchId: string = 'body-shop', startDate?: string, endDate?: string): Promise<CarExpense[]> {
  let query = supabase
    .from('car_expenses')
    .select('*, customers(*)')
    .eq('branch_id', branchId)
    .order('id', { ascending: false });
  if (startDate) query = query.gte('date', startDate);
  if (endDate) query = query.lte('date', formatEndDateForQuery(endDate)!);
  const { data, error } = await query;
  if (error) {
    console.error('Error fetching car expenses:', error);
    return [];
  }
  return data || [];
}

export async function addCarExpense(payload: Omit<CarExpense, 'id' | 'customers'>): Promise<CarExpense | null> {
  const { data, error } = await supabase.from('car_expenses').insert([payload]).select().single();
  if (error) {
    console.error('Error adding car expense:', error);
    return null;
  }
  return data;
}

export async function deleteCarExpense(id: number): Promise<boolean> {
  assertPositiveInt(id, 'car expense id');
  const { error } = await supabase.from('car_expenses').delete().eq('id', id);
  if (error) {
    console.error('Error deleting car expense:', error);
    return false;
  }
  return true;
}

export async function updateCarExpense(id: number, payload: Partial<CarExpense>): Promise<boolean> {
  const { error } = await supabase.from('car_expenses').update(payload).eq('id', id);
  if (error) {
    console.error('Error updating car expense:', error);
    return false;
  }
  return true;
}

export async function deleteOhdaRecord(id: number): Promise<boolean> {
  assertPositiveInt(id, 'ohda record id');
  const { error } = await supabase.from('ohda_records').delete().eq('id', id);
  if (error) {
    console.error('Error deleting ohda record:', error);
    return false;
  }
  return true;
}

export async function updatePendingBill(id: number, payload: Partial<PendingBill>): Promise<boolean> {
  const { error } = await supabase.from('pending_bills').update(payload).eq('id', id);
  if (error) {
    console.error('Error updating pending bill:', error);
    return false;
  }
  return true;
}


// ─── Repair Details & Stock Management ──────────────────────────────
export async function getRepairById(id: number): Promise<Repair | null> {
  const { data, error } = await supabase
    .from('repairs')
    .select('*, customers(*), repair_items(*)')
    .eq('id', id)
    .single();
  if (error) {
    console.error('Error fetching repair by id:', error);
    return null;
  }
  return data;
}

export async function deleteRepair(id: number): Promise<boolean> {
  // Soft delete repair by updating payment_method to 'Deleted'
  const { data: repair } = await supabase.from('repairs').select('*').eq('id', id).single();
  if (!repair) return false;

  const { error } = await supabase
    .from('repairs')
    .update({ payment_method: 'Deleted' })
    .eq('id', id);

  if (error) {
    console.error('Error deleting repair:', error);
    return false;
  }

  // Record an expense entry if paid_amount > 0 to reflect cash refunded/cancelled
  if (repair.paid_amount > 0 && repair.payment_method === 'Cash') {
    await addExpense({
      description: `فاتورة ملغاة #${id} - ${repair.description || 'إلغاء فاتورة'}`,
      amount: repair.paid_amount,
      category: 'فاتورة ملغاة',
      date: new Date().toISOString().split('T')[0],
      from_cash: true,
      from_deleted_bill: true,
      branch_id: repair.branch_id || 'main-shop'
    });
  }

  return true;
}

export async function deductPartStock(partId: number, qtyToDeduct: number): Promise<boolean> {
  const { data: part } = await supabase.from('parts').select('quantity_in_stock').eq('id', partId).single();
  if (!part) return false;
  const newQty = Math.max(0, (part.quantity_in_stock || 0) - qtyToDeduct);
  const { error } = await supabase.from('parts').update({ quantity_in_stock: newQty }).eq('id', partId);
  return !error;
}

export async function processPendingBill(
  billId: number,
  finalMethod: string,
  paidAmount: number,
  pendingAmount: number,
  discount: number,
  notes?: string
): Promise<Repair | null> {
  const { data: bill } = await supabase.from('pending_bills').select('*').eq('id', billId).single();
  if (!bill) return null;

  // Use safe parser — malformed JSON returns [] instead of throwing
  const items: any[] = safeParseJson<any[]>(bill.line_items_json, []);

  // Create real repair
  const repairPayload = {
    customer_id: bill.customer_id,
    car_id: bill.car_id,
    description: bill.description,
    date: getTodayLocalDateStr(),
    total_amount: bill.total_amount,
    paid_amount: paidAmount,
    pending_amount: pendingAmount,
    discount: discount,
    payment_method: finalMethod,
    odometer: bill.odometer,
    notes: notes !== undefined ? notes : bill.notes,
    branch_id: bill.branch_id || 'main-shop'
  };

  const repairItemsPayload = items.map((it: any) => ({
    item_name: it.item_name || it.name,
    quantity: Number(it.quantity || it.qty || 1),
    unit_price: Number(it.unit_price || it.price || 0)
  }));

  const createdRepair = await addRepair(repairPayload, repairItemsPayload);
  if (createdRepair) {
    // Deduct stock if items match parts
    for (const it of items) {
      if (it.part_id) {
        await deductPartStock(it.part_id, Number(it.quantity || 1));
      }
    }
    // Delete pending bill
    await deletePendingBill(billId);
  }

  return createdRepair;
}

// ─── Employee Adjustments (Borrows, Deductions, Bonuses) ──────────────────────
export async function addEmployeeAdjustment(
  empId: number,
  adjustment: { type: 'borrow' | 'deduction' | 'bonus'; amount: number; note?: string; date?: string }
): Promise<boolean> {
  const { data: emp } = await supabase.from('employees').select('pending_adjustments').eq('id', empId).single();
  if (!emp) return false;

  const list: any[] = safeParseJson<any[]>(
    typeof emp.pending_adjustments === 'string' ? emp.pending_adjustments : null,
    Array.isArray(emp.pending_adjustments) ? emp.pending_adjustments : []
  );

  list.push({
    id: Date.now(),
    type: adjustment.type,
    amount: adjustment.amount,
    note: adjustment.note || '',
    date: adjustment.date || new Date().toISOString().split('T')[0]
  });

  const { error } = await supabase
    .from('employees')
    .update({ pending_adjustments: safeStringifyJson(list) })
    .eq('id', empId);

  return !error;
}

export async function deleteEmployeeAdjustment(empId: number, adjId: number): Promise<boolean> {
  assertPositiveInt(empId, 'empId');
  const { data: emp } = await supabase.from('employees').select('pending_adjustments').eq('id', empId).single();
  if (!emp || !emp.pending_adjustments) return false;

  let list: any[] = safeParseJson<any[]>(
    typeof emp.pending_adjustments === 'string' ? emp.pending_adjustments : null,
    Array.isArray(emp.pending_adjustments) ? emp.pending_adjustments : []
  );

  list = list.filter((item: any) => item.id !== adjId);

  const { error } = await supabase
    .from('employees')
    .update({ pending_adjustments: safeStringifyJson(list) })
    .eq('id', empId);

  return !error;
}

export async function clearEmployeeAdjustments(empId: number): Promise<boolean> {
  const { error } = await supabase
    .from('employees')
    .update({ pending_adjustments: '[]' })
    .eq('id', empId);
  return !error;
}

export async function clearAllEmployeeAdjustments(branchId?: string): Promise<boolean> {
  let query = supabase.from('employees').update({ pending_adjustments: '[]' });
  if (branchId) query = query.eq('branch_id', branchId);
  else query = query.gt('id', 0);
  const { error } = await query;
  return !error;
}

// ─── Combined Owner Dashboard Metrics ──────────────────────────────────────────
export async function getOwnerDashboardMetrics(startDate?: string, endDate?: string) {
  const start = startDate || undefined;
  const end = endDate || undefined;

  try {
    const [
      mainRepairs,
      bodyRepairs,
      mainExpenses,
      bodyExpenses,
      suppliers,
      ohdaRecords,
      carExpenses,
      parts,
      customerCount,
    ] = await Promise.all([
      getRepairs('main-shop', start, end),
      getRepairs('body-shop', start, end),
      getExpenses('main-shop', start, end),
      getExpenses('body-shop', start, end),
      getSuppliers(),
      getOhdaRecords('body-shop', start, end),
      getCarExpenses('body-shop', start, end),
      getParts(),
      getExactCount('customers'),
    ]);

    const mainTotalIncome = mainRepairs.reduce((acc, r) => acc + (Number(r.paid_amount) || 0), 0);
    const mainPendingIncome = mainRepairs.reduce((acc, r) => acc + (Number(r.pending_amount) || 0), 0);
    const mainTotalExpenses = mainExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

    const bodyTotalIncome = bodyRepairs.reduce((acc, r) => acc + (Number(r.paid_amount) || 0), 0);
    const bodyPendingIncome = bodyRepairs.reduce((acc, r) => acc + (Number(r.pending_amount) || 0), 0);
    const bodyTotalExpenses = bodyExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

    const totalOhdaReceived = ohdaRecords.reduce((acc, o) => acc + (Number(o.amount) || 0), 0);
    const totalOhdaSpent = bodyExpenses.filter((e) => e.from_ohda !== false).reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const totalSupplierDebt = suppliers.reduce((acc, s) => acc + (Number(s.pending_amount) || 0), 0);
    const totalPartsValue = parts.reduce((acc, p) => acc + (Number(p.quantity_in_stock || 0) * Number(p.unit_price || 0)), 0);

    return {
      mainShop: {
        totalIncome: mainTotalIncome,
        pendingIncome: mainPendingIncome,
        totalExpenses: mainTotalExpenses,
        netProfit: mainTotalIncome - mainTotalExpenses,
        repairCount: mainRepairs.length,
        repairs: mainRepairs,
        expenses: mainExpenses,
      },
      bodyShop: {
        totalIncome: bodyTotalIncome,
        pendingIncome: bodyPendingIncome,
        totalExpenses: bodyTotalExpenses,
        netProfit: bodyTotalIncome - bodyTotalExpenses,
        repairCount: bodyRepairs.length,
        repairs: bodyRepairs,
        expenses: bodyExpenses,
      },
      ohda: {
        totalReceived: totalOhdaReceived,
        totalSpent: totalOhdaSpent,
        netBalance: totalOhdaReceived - totalOhdaSpent,
        records: ohdaRecords,
        ohdaExpenses: bodyExpenses.filter((e) => e.from_ohda !== false),
      },
      carExpenses: carExpenses,
      parts: parts,
      totalPartsValue: totalPartsValue,
      combined: {
        totalIncome: mainTotalIncome + bodyTotalIncome,
        pendingIncome: mainPendingIncome + bodyPendingIncome,
        totalExpenses: mainTotalExpenses + bodyTotalExpenses,
        netProfit: (mainTotalIncome + bodyTotalIncome) - (mainTotalExpenses + bodyTotalExpenses),
        totalCustomers: customerCount,
        totalSupplierDebt,
      },
    };
  } catch (err) {
    console.error('Error fetching owner metrics:', err);
    return {
      mainShop: { totalIncome: 0, pendingIncome: 0, totalExpenses: 0, netProfit: 0, repairCount: 0, repairs: [], expenses: [] },
      bodyShop: { totalIncome: 0, pendingIncome: 0, totalExpenses: 0, netProfit: 0, repairCount: 0, repairs: [], expenses: [] },
      ohda: { totalReceived: 0, totalSpent: 0, netBalance: 0, records: [], ohdaExpenses: [] },
      carExpenses: [],
      parts: [],
      totalPartsValue: 0,
      combined: { totalIncome: 0, pendingIncome: 0, totalExpenses: 0, netProfit: 0, totalCustomers: 0, totalSupplierDebt: 0 },
    };
  }
}


