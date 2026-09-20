import { supabase } from '../db/client';

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
  if (searchQuery && searchQuery.trim()) {
    const term = searchQuery.trim();
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .or(`name.ilike.%${term}%,phone.ilike.%${term}%,car_name.ilike.%${term}%,plate_number.ilike.%${term}%`)
      .order('name', { ascending: true })
      .limit(50);
    if (error) {
      console.error('Error fetching search customers:', error);
      return [];
    }
    return data || [];
  }
  return fetchAllRows<Customer>('customers');
}

export async function addCustomer(payload: Omit<Customer, 'id' | 'created_at'>): Promise<Customer | null> {
  const { data, error } = await supabase.from('customers').insert([payload]).select().single();
  if (error) {
    console.error('Error adding customer:', error);
    return null;
  }
  return data;
}

export async function updateCustomer(id: number, payload: Partial<Customer>): Promise<boolean> {
  const { error } = await supabase.from('customers').update(payload).eq('id', id);
  if (error) {
    console.error('Error updating customer:', error);
    return false;
  }
  return true;
}

export async function deleteCustomer(id: number): Promise<boolean> {
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
export async function getParts(branchId?: string): Promise<Part[]> {
  let query = supabase.from('parts').select('*').order('name', { ascending: true });
  if (branchId) query = query.eq('branch_id', branchId);
  const { data, error } = await query;
  if (error) {
    console.error('Error fetching parts:', error);
    return [];
  }
  return data || [];
}

export async function addPart(payload: Omit<Part, 'id'>): Promise<Part | null> {
  const { data, error } = await supabase.from('parts').insert([payload]).select().single();
  if (error) {
    console.error('Error adding part:', error.message);
    if (error.message && (error.message.includes('cost_price') || error.code === 'PGRST204')) {
      const { cost_price, ...fallbackPayload } = payload;
      const { data: fbData, error: fbError } = await supabase.from('parts').insert([fallbackPayload]).select().single();
      if (fbError) {
        console.error('Fallback add part failed:', fbError.message);
        return null;
      }
      return fbData;
    }
    return null;
  }
  return data;
}

export async function updatePart(id: number, payload: Partial<Part>): Promise<boolean> {
  const { error } = await supabase.from('parts').update(payload).eq('id', id);
  if (error) {
    console.error('Error updating part:', error.message);
    if (error.message && (error.message.includes('cost_price') || error.code === 'PGRST204')) {
      const { cost_price, ...fallbackPayload } = payload;
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
export async function fetchAllRows<T = any>(table: string, selectCols: string = '*', branchId?: string): Promise<T[]> {
  let allData: T[] = [];
  let page = 0;
  const pageSize = 1000;
  while (true) {
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

// ─── Expenses ─────────────────────────────────────────────────────────────────
export async function getExpenses(branchId?: string, startDate?: string, endDate?: string): Promise<Expense[]> {
  let query = supabase.from('expenses').select('*').order('date', { ascending: false }).order('id', { ascending: false });
  if (branchId) query = query.eq('branch_id', branchId);
  if (startDate) query = query.gte('date', startDate);
  if (endDate) query = query.lte('date', endDate);
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

// ─── Ohda Records ─────────────────────────────────────────────────────────────
export async function getOhdaRecords(branchId: string = 'body-shop', startDate?: string, endDate?: string): Promise<OhdaRecord[]> {
  let query = supabase
    .from('ohda_records')
    .select('*')
    .eq('branch_id', branchId)
    .order('date', { ascending: false });
  if (startDate) query = query.gte('date', startDate);
  if (endDate) query = query.lte('date', endDate);
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
  if (endDate) query = query.lte('date', endDate);
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
  const { error } = await supabase.from('employees').delete().eq('id', id);
  if (error) {
    console.error('Error deleting employee:', error);
    return false;
  }
  return true;
}

export async function deleteExpense(id: number): Promise<boolean> {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) {
    console.error('Error deleting expense:', error);
    return false;
  }
  return true;
}

export async function deletePart(id: number): Promise<boolean> {
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
  if (endDate) query = query.lte('date', endDate);
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
  const { error } = await supabase.from('car_expenses').delete().eq('id', id);
  if (error) {
    console.error('Error deleting car expense:', error);
    return false;
  }
  return true;
}

export async function deleteOhdaRecord(id: number): Promise<boolean> {
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

  let items: any[] = [];
  if (bill.line_items_json) {
    try {
      items = JSON.parse(bill.line_items_json);
    } catch (e) {
      console.error('Failed to parse line_items_json:', e);
    }
  }

  // Create real repair
  const repairPayload = {
    customer_id: bill.customer_id,
    car_id: bill.car_id,
    description: bill.description,
    date: new Date().toISOString().split('T')[0],
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

  let list: any[] = [];
  if (emp.pending_adjustments) {
    try {
      list = typeof emp.pending_adjustments === 'string' ? JSON.parse(emp.pending_adjustments) : emp.pending_adjustments;
    } catch (e) {
      list = [];
    }
  }

  list.push({
    id: Date.now(),
    type: adjustment.type,
    amount: adjustment.amount,
    note: adjustment.note || '',
    date: adjustment.date || new Date().toISOString().split('T')[0]
  });

  const { error } = await supabase
    .from('employees')
    .update({ pending_adjustments: JSON.stringify(list) })
    .eq('id', empId);

  return !error;
}

export async function deleteEmployeeAdjustment(empId: number, adjId: number): Promise<boolean> {
  const { data: emp } = await supabase.from('employees').select('pending_adjustments').eq('id', empId).single();
  if (!emp || !emp.pending_adjustments) return false;

  let list: any[] = [];
  try {
    list = typeof emp.pending_adjustments === 'string' ? JSON.parse(emp.pending_adjustments) : emp.pending_adjustments;
  } catch (e) {
    return false;
  }

  list = list.filter((item: any) => item.id !== adjId);

  const { error } = await supabase
    .from('employees')
    .update({ pending_adjustments: JSON.stringify(list) })
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


