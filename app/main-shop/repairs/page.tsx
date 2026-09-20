'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  getRepairs,
  addRepair,
  getCustomers,
  getCustomerCars,
  getParts,
  addPendingBill,
  deleteRepair,
  deductPartStock,
  Customer,
  CustomerCar,
  Part,
  Repair,
} from '@/lib/shared/queries';
import { Modal } from '@/components/shared/Modal';
import { useTranslation } from '@/lib/i18n/context';
import { printContent, generateReceiptHtml } from '@/lib/utils/print';
import {
  Wrench,
  Plus,
  Search,
  Printer,
  FileText,
  Trash2,
  Package,
  Clock,
  CheckCircle,
  Eye,
} from 'lucide-react';

interface LineItem {
  name: string;
  qty: number;
  price: number;
  part_id?: number | null;
}

export default function MainShopRepairsPage() {
  const { t, language } = useTranslation();

  // Data state
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters for History Table
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Form State: Customer selection
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState<{ name: string; phone: string; cars: Customer[] }[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerCars, setCustomerCars] = useState<CustomerCar[]>([]);
  const [selectedCarIndex, setSelectedCarIndex] = useState<number>(0);

  // Form State: Invoice Header & Details
  const [customerNameInput, setCustomerNameInput] = useState('');
  const [customerPhoneInput, setCustomerPhoneInput] = useState('');
  const [carModelInput, setCarModelInput] = useState('');
  const [plateNumberInput, setPlateNumberInput] = useState('');
  const [odometer, setOdometer] = useState('');
  const [notes, setNotes] = useState('');

  // Form State: Line Items
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { name: '', qty: 1, price: 0 }
  ]);

  // Form State: Payment Details
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [discount, setDiscount] = useState<number>(0);
  const [amountPaidNow, setAmountPaidNow] = useState<number>(0);

  // Split payment state
  const [splitMethod1, setSplitMethod1] = useState<string>('Cash');
  const [splitAmount1, setSplitAmount1] = useState<number>(0);
  const [splitMethod2, setSplitMethod2] = useState<string>('Instapay');
  const [splitAmount2, setSplitAmount2] = useState<number>(0);

  // Modals state
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockSearch, setStockSearch] = useState('');
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [currentBillData, setCurrentBillData] = useState<any | null>(null);
  const [isBillProcessed, setIsBillProcessed] = useState(false);
  const [viewRepairModal, setViewRepairModal] = useState<Repair | null>(null);

  // Table row input references for auto-focusing
  const rowNameRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [rData, cData, pData] = await Promise.all([
      getRepairs('main-shop'),
      getCustomers(),
      getParts(),
    ]);
    setRepairs(rData);
    setCustomers(cData);
    setParts(pData);
    setLoading(false);
  }

  // Handle Customer Live Search
  const handleCustomerSearchChange = async (q: string) => {
    setCustomerSearchQuery(q);
    if (!q || q.trim().length < 2) {
      setCustomerSearchResults([]);
      setShowCustomerDropdown(false);
      return;
    }

    const term = q.trim();
    const matchingCustomers = await getCustomers(term);

    // Group by phone/name
    const groupedMap: { [key: string]: { name: string; phone: string; cars: Customer[] } } = {};
    matchingCustomers.forEach((c) => {
      const key = (c.phone && c.phone.trim()) || (c.name && c.name.trim());
      if (!groupedMap[key]) {
        groupedMap[key] = { name: c.name, phone: c.phone || '', cars: [] };
      }
      groupedMap[key].cars.push(c);
    });

    setCustomerSearchResults(Object.values(groupedMap));
    setShowCustomerDropdown(true);
  };

  const handleSelectCustomerGroup = async (group: { name: string; phone: string; cars: Customer[] }) => {
    const firstCarCustomer = group.cars[0];
    setSelectedCustomer(firstCarCustomer);
    setCustomerNameInput(group.name);
    setCustomerPhoneInput(group.phone);
    setCarModelInput(firstCarCustomer.car_name || '');
    setPlateNumberInput(firstCarCustomer.plate_number || '');

    // Fetch extra cars if available
    const cars = await getCustomerCars(firstCarCustomer.id);
    if (cars && cars.length > 0) {
      setCustomerCars(cars);
      setSelectedCarIndex(0);
    } else {
      setCustomerCars([]);
    }

    setShowCustomerDropdown(false);
    setCustomerSearchQuery('');
  };

  const handleCarSelectChange = (idx: number) => {
    setSelectedCarIndex(idx);
    if (customerCars[idx]) {
      setCarModelInput(customerCars[idx].car_name || '');
      setPlateNumberInput(customerCars[idx].plate_number || '');
    }
  };

  // Line items calculations
  const calculateSubtotal = () => {
    return lineItems.reduce((acc, item) => acc + (item.qty || 0) * (item.price || 0), 0);
  };

  const calculateNetTotal = () => {
    const sub = calculateSubtotal();
    return Math.max(0, sub - (discount || 0));
  };

  const calculatePendingAmount = () => {
    const net = calculateNetTotal();
    if (paymentMethod === 'PayByParts') {
      return Math.max(0, net - (amountPaidNow || 0));
    }
    return 0;
  };

  const calculatePaidAmount = () => {
    const net = calculateNetTotal();
    if (paymentMethod === 'PayByParts') {
      return amountPaidNow || 0;
    }
    if (paymentMethod === 'SplitPayment') {
      return (splitAmount1 || 0) + (splitAmount2 || 0);
    }
    return net;
  };

  // Line item manipulation & Enter navigation
  const handleAddItem = () => {
    setLineItems([...lineItems, { name: '', qty: 1, price: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    } else {
      setLineItems([{ name: '', qty: 1, price: 0 }]);
    }
  };

  const handleLineItemChange = (index: number, field: keyof LineItem, val: any) => {
    const updated = [...lineItems];
    (updated[index] as any)[field] = val;
    setLineItems(updated);
  };

  const handleAddPartFromStock = (part: Part) => {
    setLineItems([
      ...lineItems.filter((it) => it.name.trim() !== ''),
      { name: part.name, qty: 1, price: part.unit_price, part_id: part.id },
    ]);
    setIsStockModalOpen(false);
  };

  // Keyboard navigation inside line item rows
  const handleKeyDown = (e: React.KeyboardEvent, index: number, field: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (field === 'name') {
        const qtyEl = document.getElementById(`line-qty-${index}`);
        qtyEl?.focus();
      } else if (field === 'qty') {
        const priceEl = document.getElementById(`line-price-${index}`);
        priceEl?.focus();
      } else if (field === 'price') {
        if (index === lineItems.length - 1) {
          if (lineItems[index].name.trim() !== '') {
            setLineItems([...lineItems, { name: '', qty: 1, price: 0 }]);
            setTimeout(() => {
              rowNameRefs.current[index + 1]?.focus();
            }, 50);
          }
        } else {
          rowNameRefs.current[index + 1]?.focus();
        }
      }
    }
  };

  // Actions
  const handleSaveAsPending = async () => {
    const validLines = lineItems.filter((it) => it.name.trim() !== '');
    if (validLines.length === 0) {
      alert(language === 'ar' ? 'الرجاء إضافة عنصر واحد على الأقل' : 'Please add at least one line item');
      return;
    }

    const net = calculateNetTotal();
    const payload = {
      customer_id: selectedCustomer ? selectedCustomer.id : null,
      description: validLines.map((l) => l.name).join(', '),
      total_amount: net,
      paid_amount: calculatePaidAmount(),
      pending_amount: calculatePendingAmount(),
      discount: discount || 0,
      payment_method: paymentMethod,
      odometer,
      notes,
      line_items_json: JSON.stringify(validLines),
      branch_id: 'main-shop',
    };

    const res = await addPendingBill(payload);
    if (res) {
      alert(language === 'ar' ? 'تم حفظ الفاتورة كمعلقة بنجاح' : 'Saved as pending bill successfully');
      resetForm();
      loadData();
    }
  };

  const handlePreviewReceipt = () => {
    const validLines = lineItems.filter((it) => it.name.trim() !== '');
    if (validLines.length === 0) {
      alert(language === 'ar' ? 'الرجاء إضافة عنصر واحد على الأقل' : 'Please add at least one line item');
      return;
    }

    const grandTotal = calculateSubtotal();
    const net = calculateNetTotal();
    const paid = calculatePaidAmount();
    const pending = calculatePendingAmount();

    let splitData = null;
    if (paymentMethod === 'SplitPayment') {
      splitData = {
        method1: splitMethod1,
        amount1: splitAmount1,
        method2: splitMethod2,
        amount2: splitAmount2,
      };
    }

    setCurrentBillData({
      customer: selectedCustomer || {
        id: null,
        name: customerNameInput || (language === 'ar' ? 'عميل نقدي' : 'Walk-in Customer'),
        phone: customerPhoneInput || 'N/A',
        car_name: carModelInput || 'N/A',
        plate_number: plateNumberInput || 'N/A',
      },
      lines: validLines,
      total_amount: grandTotal,
      discount: discount || 0,
      net_total: net,
      paid_amount: paid,
      pending_amount: pending,
      payment_method: paymentMethod,
      split_data: splitData,
      date: new Date().toISOString().split('T')[0],
      odometer,
      notes,
    });

    setIsBillProcessed(false);
    setIsReceiptModalOpen(true);
  };

  const handleConfirmAndSaveRepair = async () => {
    if (isBillProcessed) {
      alert(t('billAlreadyProcessed'));
      return;
    }
    if (!currentBillData) return;

    let finalNotes = currentBillData.notes || '';
    if (currentBillData.split_data) {
      finalNotes = (finalNotes ? finalNotes + '\n' : '') + '__SPLIT__:' + JSON.stringify(currentBillData.split_data);
    }

    const repairPayload = {
      customer_id: currentBillData.customer.id || null,
      description: currentBillData.lines.map((l: any) => l.name).join(', '),
      date: currentBillData.date,
      total_amount: currentBillData.net_total,
      paid_amount: currentBillData.paid_amount,
      pending_amount: currentBillData.pending_amount,
      discount: currentBillData.discount,
      payment_method: currentBillData.payment_method,
      odometer: currentBillData.odometer,
      notes: finalNotes,
      branch_id: 'main-shop',
    };

    const itemsPayload = currentBillData.lines.map((l: any) => ({
      item_name: l.name,
      quantity: l.qty,
      unit_price: l.price,
    }));

    const result = await addRepair(repairPayload, itemsPayload);
    if (result) {
      // Deduct stock for parts
      for (const line of currentBillData.lines) {
        if (line.part_id) {
          await deductPartStock(line.part_id, line.qty);
        }
      }

      setIsBillProcessed(true);
      alert(t('billProcessed'));
      resetForm();
      loadData();
    }
  };

  const resetForm = () => {
    setSelectedCustomer(null);
    setCustomerNameInput('');
    setCustomerPhoneInput('');
    setCarModelInput('');
    setPlateNumberInput('');
    setOdometer('');
    setNotes('');
    setLineItems([{ name: '', qty: 1, price: 0 }]);
    setPaymentMethod('Cash');
    setDiscount(0);
    setAmountPaidNow(0);
    setSplitMethod1('Cash');
    setSplitAmount1(0);
    setSplitMethod2('Instapay');
    setSplitAmount2(0);
    setIsReceiptModalOpen(false);
    setCurrentBillData(null);
    setIsBillProcessed(false);
  };

  const handleDeleteRepair = async (id: number) => {
    if (confirm(t('confirmDelete'))) {
      const res = await deleteRepair(id);
      if (res) {
        loadData();
      }
    }
  };

  const filteredRepairs = repairs.filter((r) => {
    const isDeleted = r.payment_method === 'Deleted';
    if (isDeleted) return false;

    const name = r.customers?.name || '';
    const desc = r.description || '';
    const matchesSearch =
      name.toLowerCase().includes(search.toLowerCase()) ||
      desc.toLowerCase().includes(search.toLowerCase());

    const targetEnd = endDate && endDate.length === 10 ? `${endDate} 23:59:59` : endDate;
    const matchesStart = !startDate || (r.date && r.date >= startDate);
    const matchesEnd = !endDate || (r.date && r.date <= targetEnd);

    return matchesSearch && matchesStart && matchesEnd;
  });

  const filteredParts = parts.filter((p) =>
    p.name.toLowerCase().includes(stockSearch.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Top Title Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
            <Wrench className="w-7 h-7 text-yellow-500" />
            <span>{t('repairsAndInvoices')}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">{t('recentInvoices')}</p>
        </div>
      </div>

      {/* CREATE NEW BILL SECTION */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
        <h2 className="text-lg font-bold text-zinc-900 border-b border-slate-100 pb-3 flex items-center gap-2">
          <Plus className="w-5 h-5 text-yellow-500" />
          <span>{t('newRepairInvoice')}</span>
        </h2>

        {/* Customer Auto-complete Search Box */}
        <div className="relative">
          <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
            {language === 'ar' ? 'بحث عن عميل مسجل (بالاسم أو الهاتف)' : 'Search Registered Customer (Name or Phone)'}
          </label>
          <div className="relative max-w-xl">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={customerSearchQuery}
              onChange={(e) => handleCustomerSearchChange(e.target.value)}
              placeholder={language === 'ar' ? 'اكتب اسم العميل أو رقم التليفون...' : 'Type customer name or phone number...'}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-all font-medium"
            />
          </div>

          {/* Autocomplete Dropdown List */}
          {showCustomerDropdown && customerSearchResults.length > 0 && (
            <div className="absolute z-30 mt-1 max-w-xl w-full bg-white border border-slate-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100">
              {customerSearchResults.map((group, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectCustomerGroup(group)}
                  className="p-3 hover:bg-yellow-50/60 cursor-pointer transition-colors flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-bold text-zinc-900">{group.name}</p>
                    <p className="text-[11px] text-slate-500">{group.phone}</p>
                  </div>
                  <span className="text-[11px] font-semibold text-yellow-700 bg-yellow-100 px-2.5 py-0.5 rounded-full border border-yellow-200">
                    {group.cars.length} {language === 'ar' ? 'سيارات مسجلة' : 'cars registered'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Customer Details Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">{t('customer')}</label>
            <input
              type="text"
              value={customerNameInput}
              onChange={(e) => setCustomerNameInput(e.target.value)}
              placeholder={t('walkInCustomer')}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-bold text-zinc-900 focus:outline-none focus:border-yellow-400"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">{t('contactNumber')}</label>
            <input
              type="text"
              value={customerPhoneInput}
              onChange={(e) => setCustomerPhoneInput(e.target.value)}
              placeholder="01xxxxxxxxx"
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-zinc-900 focus:outline-none focus:border-yellow-400"
            />
          </div>

          {/* Multiple cars dropdown if customer has multiple cars */}
          {customerCars.length > 1 ? (
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                {language === 'ar' ? 'اختر السيارة المسجلة' : 'Select Registered Car'}
              </label>
              <select
                value={selectedCarIndex}
                onChange={(e) => handleCarSelectChange(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-zinc-900 focus:outline-none focus:border-yellow-400 font-semibold"
              >
                {customerCars.map((car, idx) => (
                  <option key={idx} value={idx}>
                    {car.car_name || 'Car'} | {car.plate_number || 'No Plate'}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">{t('carInfo')}</label>
              <input
                type="text"
                value={carModelInput}
                onChange={(e) => setCarModelInput(e.target.value)}
                placeholder="e.g. Toyota Corolla"
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-zinc-900 focus:outline-none focus:border-yellow-400"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              {language === 'ar' ? 'رقم اللوحة' : 'Plate Number'}
            </label>
            <input
              type="text"
              value={plateNumberInput}
              onChange={(e) => setPlateNumberInput(e.target.value)}
              placeholder="e.g. أ ب ج 1234"
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-zinc-900 focus:outline-none focus:border-yellow-400 font-bold"
            />
          </div>
        </div>

        {/* Line Items Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
              {language === 'ar' ? 'بنود الصيانة والخدمات' : 'Service & Line Items'}
            </h3>
            <button
              type="button"
              onClick={() => setIsStockModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-900 bg-yellow-400 hover:bg-yellow-500 transition-all shadow-sm"
            >
              <Package className="w-4 h-4" />
              <span>{t('addFromStock')}</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900 text-white font-bold uppercase">
                <tr>
                  <th className="p-3 w-1/2">{language === 'ar' ? 'اسم الخدمة / قطعة الغيار' : 'Item Description'}</th>
                  <th className="p-3 w-24 text-center">{t('quantityInStock')}</th>
                  <th className="p-3 w-32 text-right">{t('unitPrice')} ($)</th>
                  <th className="p-3 w-32 text-right">{language === 'ar' ? 'الإجمالي' : 'Subtotal'}</th>
                  <th className="p-3 w-12 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {lineItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="p-2">
                      <input
                        ref={(el) => {
                          rowNameRefs.current[idx] = el;
                        }}
                        type="text"
                        value={item.name}

                        onChange={(e) => handleLineItemChange(idx, 'name', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, idx, 'name')}
                        placeholder={language === 'ar' ? 'مثال: تغيير تيل فرامل أمامي' : 'e.g. Front brake pads replacement'}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-zinc-900 font-medium focus:outline-none focus:border-yellow-400"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <input
                        id={`line-qty-${idx}`}
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) => handleLineItemChange(idx, 'qty', Math.max(1, Number(e.target.value)))}
                        onKeyDown={(e) => handleKeyDown(e, idx, 'qty')}
                        className="w-20 bg-white border border-slate-300 rounded-xl px-2 py-1.5 text-center text-xs text-zinc-900 font-bold focus:outline-none focus:border-yellow-400"
                      />
                    </td>
                    <td className="p-2 text-right">
                      <input
                        id={`line-price-${idx}`}
                        type="number"
                        min="0"
                        value={item.price}
                        onChange={(e) => handleLineItemChange(idx, 'price', Number(e.target.value))}
                        onKeyDown={(e) => handleKeyDown(e, idx, 'price')}
                        className="w-28 bg-white border border-slate-300 rounded-xl px-2 py-1.5 text-right text-xs text-zinc-900 font-bold focus:outline-none focus:border-yellow-400"
                      />
                    </td>
                    <td className="p-3 text-right font-black text-zinc-900">
                      ${((item.qty || 0) * (item.price || 0)).toFixed(2)}
                    </td>
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors font-bold text-base"
                      >
                        &times;
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={handleAddItem}
            className="text-xs font-bold text-zinc-900 hover:text-yellow-600 flex items-center gap-1.5 mt-2 transition-colors"
          >
            <Plus className="w-4 h-4 text-yellow-500" />
            <span>{language === 'ar' ? 'إضافة بند آخر' : 'Add Another Item'}</span>
          </button>
        </div>

        {/* Payment & Totals Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
          {/* Left Column: Notes & Odometer */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">{t('odometer')}</label>
              <input
                type="text"
                value={odometer}
                onChange={(e) => setOdometer(e.target.value)}
                placeholder="e.g. 125,400 KM"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-zinc-900 focus:outline-none focus:border-yellow-400"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">{t('notes')}</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder={language === 'ar' ? 'ملاحظات إضافية على الفاتورة...' : 'Additional billing notes...'}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-yellow-400"
              />
            </div>
          </div>

          {/* Right Column: Payment Methods & Calculations */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4 text-xs">
            <div>
              <label className="block text-xs font-bold text-zinc-900 uppercase mb-1">{t('paymentMethod')}</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 font-bold text-zinc-900 focus:outline-none focus:border-yellow-400"
              >
                <option value="Cash">{t('cash')}</option>
                <option value="Instapay">{t('instapay')}</option>
                <option value="Bank Alahly">{t('bankAlahly')}</option>
                <option value="Bank Masr">{t('bankMasr')}</option>
                <option value="Vodafone Cash">{t('vodafoneCash')}</option>
                <option value="PayByParts">{t('payByParts')}</option>
                <option value="SplitPayment">{t('splitPayment')}</option>
              </select>
            </div>

            {/* Pay By Parts (Partial payment) options */}
            {paymentMethod === 'PayByParts' && (
              <div className="p-3.5 bg-yellow-50 rounded-xl border border-yellow-200 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-zinc-800">{t('amountPaidNow')}:</label>
                  <input
                    type="number"
                    value={amountPaidNow}
                    onChange={(e) => setAmountPaidNow(Number(e.target.value))}
                    className="w-32 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-right font-bold text-zinc-900 focus:outline-none"
                  />
                </div>
                <div className="flex justify-between text-rose-600 font-bold pt-1 border-t border-yellow-200">
                  <span>{t('pendingAmount')}:</span>
                  <span>${calculatePendingAmount().toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Split Payment options */}
            {paymentMethod === 'SplitPayment' && (
              <div className="p-3.5 bg-yellow-50 rounded-xl border border-yellow-200 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {language === 'ar' ? 'طريقة 1' : 'Method 1'}
                    </label>
                    <select
                      value={splitMethod1}
                      onChange={(e) => setSplitMethod1(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-2 py-1 text-xs font-semibold"
                    >
                      <option value="Cash">{t('cash')}</option>
                      <option value="Instapay">{t('instapay')}</option>
                      <option value="Bank Masr">{t('bankMasr')}</option>
                      <option value="Bank Alahly">{t('bankAlahly')}</option>
                      <option value="Vodafone Cash">{t('vodafoneCash')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {language === 'ar' ? 'مبلغ 1' : 'Amount 1'}
                    </label>
                    <input
                      type="number"
                      value={splitAmount1}
                      onChange={(e) => setSplitAmount1(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-xl px-2 py-1 text-right font-bold text-zinc-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {language === 'ar' ? 'طريقة 2' : 'Method 2'}
                    </label>
                    <select
                      value={splitMethod2}
                      onChange={(e) => setSplitMethod2(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-2 py-1 text-xs font-semibold"
                    >
                      <option value="Instapay">{t('instapay')}</option>
                      <option value="Cash">{t('cash')}</option>
                      <option value="Bank Masr">{t('bankMasr')}</option>
                      <option value="Bank Alahly">{t('bankAlahly')}</option>
                      <option value="Vodafone Cash">{t('vodafoneCash')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {language === 'ar' ? 'مبلغ 2' : 'Amount 2'}
                    </label>
                    <input
                      type="number"
                      value={splitAmount2}
                      onChange={(e) => setSplitAmount2(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-xl px-2 py-1 text-right font-bold text-zinc-900"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-yellow-200 font-bold">
                  <span>{language === 'ar' ? 'المتبقي للتغطية:' : 'Remaining:'}</span>
                  <span
                    className={
                      calculateNetTotal() - (splitAmount1 + splitAmount2) > 0.01
                        ? 'text-rose-600 font-extrabold'
                        : 'text-emerald-600 font-extrabold'
                    }
                  >
                    ${Math.max(0, calculateNetTotal() - (splitAmount1 + splitAmount2)).toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Discount & Totals Row */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <div className="flex justify-between items-center text-slate-600">
                <span>{language === 'ar' ? 'المجموع الفرعي:' : 'Subtotal:'}</span>
                <span className="font-bold text-zinc-900">${calculateSubtotal().toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center text-rose-600 font-bold">
                <span>{language === 'ar' ? 'الخصم ($):' : 'Discount ($):'}</span>
                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="w-24 bg-white border border-slate-300 rounded-xl px-2 py-1 text-right text-rose-600 font-bold focus:outline-none"
                />
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-300 text-base font-black text-zinc-900">
                <span>{language === 'ar' ? 'الصافي النهائي:' : 'Net Total:'}</span>
                <span className="text-emerald-600 font-black">${calculateNetTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-end items-center gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleSaveAsPending}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl font-bold text-xs text-zinc-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-all flex items-center justify-center gap-2"
          >
            <Clock className="w-4 h-4 text-slate-600" />
            <span>{t('saveAsPending')}</span>
          </button>
          <button
            type="button"
            onClick={handlePreviewReceipt}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl font-bold text-xs text-zinc-900 bg-yellow-400 hover:bg-yellow-500 transition-all shadow-md shadow-yellow-400/20 flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>{t('previewAndSave')}</span>
          </button>
        </div>
      </div>

      {/* REPAIRS HISTORY TABLE */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-yellow-500" />
            <span>{t('recentInvoices')}</span>
          </h2>

          {/* Date Range & Search Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-900 placeholder-slate-400 focus:outline-none focus:border-yellow-400"
              />
            </div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs text-zinc-900 focus:outline-none"
            />
            <span className="text-slate-400">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs text-zinc-900 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900 text-white font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3.5">{t('id')}</th>
                <th className="p-3.5">{t('customer')}</th>
                <th className="p-3.5">{t('description')}</th>
                <th className="p-3.5 text-right">{t('amount')}</th>
                <th className="p-3.5 text-right">{t('paid')}</th>
                <th className="p-3.5 text-right">{t('pending')}</th>
                <th className="p-3.5">{t('paymentMethod')}</th>
                <th className="p-3.5">{t('date')}</th>
                <th className="p-3.5 text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white text-zinc-800 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500 font-medium">
                    {t('loading')}
                  </td>
                </tr>
              ) : filteredRepairs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500 font-medium">
                    {t('noRecordsFound')}
                  </td>
                </tr>
              ) : (
                filteredRepairs.map((r) => (
                  <tr key={r.id} className="hover:bg-yellow-50/40 transition-colors">
                    <td className="p-3.5 font-black text-yellow-600">#{r.id}</td>
                    <td className="p-3.5">
                      <p className="font-bold text-zinc-900">{r.customers?.name || t('walkInCustomer')}</p>
                      <p className="text-[11px] text-slate-500">{r.customers?.phone || 'N/A'}</p>
                    </td>
                    <td className="p-3.5 max-w-xs truncate text-slate-700">{r.description || '-'}</td>
                    <td className="p-3.5 text-right font-bold text-zinc-900">${Number(r.total_amount || 0).toLocaleString()}</td>
                    <td className="p-3.5 text-right font-bold text-emerald-600">${Number(r.paid_amount || 0).toLocaleString()}</td>
                    <td className="p-3.5 text-right font-bold text-rose-600">
                      {Number(r.pending_amount || 0) > 0 ? `$${Number(r.pending_amount).toLocaleString()}` : '-'}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 text-zinc-900 border border-slate-200 font-bold text-[11px]">
                        {r.payment_method || 'Cash'}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-500 font-medium">{r.date || 'N/A'}</td>
                    <td className="p-3.5 text-right space-x-1.5">
                      <button
                        onClick={() => setViewRepairModal(r)}
                        className="p-1.5 text-slate-700 hover:text-zinc-900 hover:bg-slate-100 rounded-lg transition-colors"
                        title={t('viewDetails')}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteRepair(r.id)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title={t('delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* STOCK PARTS PICKER MODAL */}
      <Modal isOpen={isStockModalOpen} onClose={() => setIsStockModalOpen(false)} title={t('addFromStock')} maxWidth="2xl">
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={stockSearch}
              onChange={(e) => setStockSearch(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-zinc-900 focus:outline-none focus:border-yellow-400"
            />
          </div>

          <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900 text-white font-bold sticky top-0">
                <tr>
                  <th className="p-3">{t('partName')}</th>
                  <th className="p-3">{t('category')}</th>
                  <th className="p-3 text-center">{t('quantityInStock')}</th>
                  <th className="p-3 text-right">{t('unitPrice')} ($)</th>
                  <th className="p-3 text-center">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredParts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-500">
                      {t('noRecordsFound')}
                    </td>
                  </tr>
                ) : (
                  filteredParts.map((p) => (
                    <tr key={p.id} className="hover:bg-yellow-50/50">
                      <td className="p-3 font-bold text-zinc-900">{p.name}</td>
                      <td className="p-3 text-slate-500">{p.category || 'General'}</td>
                      <td className="p-3 text-center font-bold">
                        <span
                          className={
                            p.quantity_in_stock < 3
                              ? 'text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full'
                              : 'text-zinc-900'
                          }
                        >
                          {p.quantity_in_stock}
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-600">${p.unit_price}</td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleAddPartFromStock(p)}
                          className="px-3 py-1 bg-yellow-400 hover:bg-yellow-500 text-zinc-900 font-bold rounded-lg transition-colors text-xs"
                        >
                          {language === 'ar' ? 'إضافة' : 'Select'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      {/* PREVIEW & PRINT OFFICIAL RECEIPT MODAL */}
      {isReceiptModalOpen && currentBillData && (
        <Modal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          title={t('previewAndSave')}
          maxWidth="4xl"
        >
          <div className="space-y-6">
            {/* Printable Container matching old billing receipt styling */}
            <div id="receipt-print-area" className="p-6 bg-white text-zinc-900 rounded-2xl border border-slate-200 space-y-6 text-xs">
              {/* Header: 3-column banner */}
              <div className="flex justify-between items-center border-b-2 border-slate-200 pb-4 direction-ltr">
                <div className="flex-1 text-left font-bold text-slate-600 text-[11px] leading-relaxed rtl:text-right">
                  سمكرة - دهان - عفشة<br />
                  ميكانيكا - كهرباء - تكييف
                </div>

                <div className="flex-1 text-center">
                  <img
                    src="/assets/logo.png"
                    alt="Logo"
                    className="max-h-20 mx-auto object-contain"
                    onError={(e: any) => {
                      e.target.style.display = 'none';
                    }}
                  />
                  <div className="text-base font-black text-zinc-900 mt-1">{t('receiptTitle')}</div>
                </div>

                <div className="flex-1 text-right font-bold text-zinc-900 text-sm leading-relaxed rtl:text-right">
                  {t('centerName')}
                </div>
              </div>

              {/* Customer Box (Yellow highlight) */}
              <div className="p-4 bg-yellow-50/80 rounded-2xl border-2 border-yellow-300 grid grid-cols-2 gap-4 text-xs font-semibold">
                <div>
                  <p className="py-0.5">
                    <strong className="text-zinc-700">{t('customer')}:</strong> {currentBillData.customer.name}
                  </p>
                  <p className="py-0.5">
                    <strong className="text-zinc-700">{t('contactNumber')}:</strong> {currentBillData.customer.phone}
                  </p>
                  <p className="py-0.5">
                    <strong className="text-zinc-700">{t('carInfo')}:</strong> {currentBillData.customer.car_name}
                  </p>
                  <p className="py-0.5">
                    <strong className="text-zinc-700">{language === 'ar' ? 'رقم اللوحة' : 'Plate'}:</strong>{' '}
                    {currentBillData.customer.plate_number}
                  </p>
                </div>
                <div className="text-right">
                  <p className="py-0.5">
                    <strong className="text-zinc-700">{t('date')}:</strong> {currentBillData.date}
                  </p>
                  <p className="py-0.5">
                    <strong className="text-zinc-700">{t('paymentMethod')}:</strong> {currentBillData.payment_method}
                  </p>
                  {currentBillData.odometer && (
                    <p className="py-0.5">
                      <strong className="text-zinc-700">{t('odometer')}:</strong> {currentBillData.odometer}
                    </p>
                  )}
                </div>
              </div>

              {/* Items Breakdown Table */}
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-200 font-bold text-zinc-900">
                    <th className="p-2.5">{language === 'ar' ? 'البيان / الخدمة' : 'Service / Item'}</th>
                    <th className="p-2.5 text-center">{t('quantityInStock')}</th>
                    <th className="p-2.5 text-right">{t('unitPrice')}</th>
                    <th className="p-2.5 text-right">{language === 'ar' ? 'الإجمالي' : 'Subtotal'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentBillData.lines.map((l: any, i: number) => (
                    <tr key={i}>
                      <td className="p-2.5 font-bold text-zinc-900">{l.name}</td>
                      <td className="p-2.5 text-center font-bold">{l.qty}</td>
                      <td className="p-2.5 text-right font-semibold">${Number(l.price).toFixed(2)}</td>
                      <td className="p-2.5 text-right font-black text-zinc-900">${(l.qty * l.price).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Financial Totals */}
              <div className="max-w-xs ml-auto space-y-1.5 border-t border-slate-200 pt-3 text-xs">
                <div className="flex justify-between font-semibold">
                  <span>{language === 'ar' ? 'المجموع:' : 'Total:'}</span>
                  <span>${currentBillData.total_amount.toFixed(2)}</span>
                </div>

                {currentBillData.discount > 0 && (
                  <div className="flex justify-between font-bold text-rose-600">
                    <span>{language === 'ar' ? 'الخصم:' : 'Discount:'}</span>
                    <span>-${currentBillData.discount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between font-black text-sm text-zinc-900 border-t border-slate-300 pt-1.5">
                  <span>{language === 'ar' ? 'الصافي النهائي:' : 'Net Total:'}</span>
                  <span className="text-emerald-600">${currentBillData.net_total.toFixed(2)}</span>
                </div>

                {currentBillData.payment_method === 'PayByParts' && (
                  <>
                    <div className="flex justify-between font-bold text-indigo-600 pt-1">
                      <span>{t('amountPaidNow')}:</span>
                      <span>${currentBillData.paid_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-rose-600">
                      <span>{t('pendingAmount')}:</span>
                      <span>${currentBillData.pending_amount.toFixed(2)}</span>
                    </div>
                  </>
                )}

                {currentBillData.split_data && (
                  <div className="pt-2 border-t border-slate-200">
                    <p className="font-bold text-zinc-700 mb-1">تفاصيل الدفع المجزأ:</p>
                    <div className="flex justify-between font-medium">
                      <span>{currentBillData.split_data.method1}:</span>
                      <span>${currentBillData.split_data.amount1.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>{currentBillData.split_data.method2}:</span>
                      <span>${currentBillData.split_data.amount2.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Signatures & Footer */}
              <div className="border-t border-slate-200 pt-8 mt-6 flex justify-end items-center text-slate-600 font-bold text-[11px]">
                <div>{t('engineerSignature')}: __________________</div>
              </div>

              <div className="text-center text-[10px] text-slate-400 border-t border-slate-100 pt-3">
                تواصل: 01010103777 / 01010606016 - {t('centerName')}
              </div>
            </div>

            {/* Modal Buttons */}
            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => {
                  const html = document.getElementById('receipt-print-area')?.innerHTML || '';
                  printContent(html, 'rtl');
                }}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-zinc-900 font-bold rounded-xl text-xs transition-colors flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>{t('printReceipt')}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsReceiptModalOpen(false)}
                  className="px-4 py-2.5 text-slate-500 font-semibold text-xs hover:text-zinc-900"
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAndSaveRepair}
                  disabled={isBillProcessed}
                  className={`px-6 py-2.5 rounded-xl font-bold text-xs text-zinc-900 transition-all flex items-center gap-2 ${
                    isBillProcessed
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-yellow-400 hover:bg-yellow-500 shadow-md shadow-yellow-400/20'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{isBillProcessed ? t('billAlreadyProcessed') : t('confirmAndSave')}</span>
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* VIEW EXISTING REPAIR RECEIPT MODAL */}
      {viewRepairModal && (
        <Modal
          isOpen={!!viewRepairModal}
          onClose={() => setViewRepairModal(null)}
          title={`${t('viewDetails')} - #${viewRepairModal.id}`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between font-bold text-zinc-900">
                <span>{viewRepairModal.customers?.name || t('walkInCustomer')}</span>
                <span className="text-yellow-600">#{viewRepairModal.id}</span>
              </div>
              <p className="text-slate-500">{t('contactNumber')}: {viewRepairModal.customers?.phone || 'N/A'}</p>
              <p className="text-slate-500">{t('date')}: {viewRepairModal.date}</p>
              <p className="text-slate-500">{t('paymentMethod')}: {viewRepairModal.payment_method}</p>
              {viewRepairModal.odometer && <p className="text-slate-500">{t('odometer')}: {viewRepairModal.odometer}</p>}
            </div>

            {viewRepairModal.repair_items && viewRepairModal.repair_items.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900 text-white font-bold">
                    <tr>
                      <th className="p-2.5">{language === 'ar' ? 'البند' : 'Item'}</th>
                      <th className="p-2.5 text-center">{t('quantityInStock')}</th>
                      <th className="p-2.5 text-right">{t('unitPrice')}</th>
                      <th className="p-2.5 text-right">{language === 'ar' ? 'الإجمالي' : 'Subtotal'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {viewRepairModal.repair_items.map((it: any) => (
                      <tr key={it.id}>
                        <td className="p-2.5 font-bold text-zinc-900">{it.item_name}</td>
                        <td className="p-2.5 text-center font-bold">{it.quantity}</td>
                        <td className="p-2.5 text-right">${Number(it.unit_price).toFixed(2)}</td>
                        <td className="p-2.5 text-right font-bold">${(it.quantity * it.unit_price).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200 flex justify-between items-center text-xs font-black text-zinc-900">
              <span>{language === 'ar' ? 'إجمالي الفاتورة:' : 'Total Amount:'}</span>
              <span className="text-emerald-600 text-sm">${Number(viewRepairModal.total_amount).toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => {
                  let lines: any[] = [];
                  if (viewRepairModal.repair_items && viewRepairModal.repair_items.length > 0) {
                    lines = viewRepairModal.repair_items.map((it) => ({
                      name: it.item_name || 'خدمة صيانة',
                      qty: Number(it.quantity || 1),
                      price: Number(it.unit_price || 0),
                    }));
                  } else if (viewRepairModal.description) {
                    lines = [{ name: viewRepairModal.description, qty: 1, price: Number(viewRepairModal.total_amount || 0) }];
                  }

                  let splitData: any = null;
                  if (viewRepairModal.notes && viewRepairModal.notes.includes('__SPLIT__:')) {
                    try {
                      splitData = JSON.parse(viewRepairModal.notes.substring(viewRepairModal.notes.indexOf('__SPLIT__:') + 10));
                    } catch (e) {}
                  }

                  const html = generateReceiptHtml(
                    {
                      id: viewRepairModal.id,
                      date: viewRepairModal.date,
                      customer: {
                        name: viewRepairModal.customers?.name || (language === 'ar' ? 'عميل بدون اسم' : 'Walk-in Customer'),
                        phone: viewRepairModal.customers?.phone,
                        car_name: viewRepairModal.customers?.car_name,
                        plate_number: viewRepairModal.customers?.plate_number,
                      },
                      payment_method: viewRepairModal.payment_method || 'Cash',
                      odometer: viewRepairModal.odometer,
                      notes: viewRepairModal.notes,
                      lines: lines,
                      total_amount: Number(viewRepairModal.total_amount || 0),
                      discount: Number(viewRepairModal.discount || 0),
                      paid_amount: Number(viewRepairModal.paid_amount || 0),
                      pending_amount: Number(viewRepairModal.pending_amount || 0),
                      split_data: splitData,
                    },
                    language as any
                  );

                  printContent(html, 'rtl');
                }}
                className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-zinc-900 font-bold rounded-xl text-xs transition-colors flex items-center gap-2 shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>{t('printReceipt')}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewRepairModal(null)}
                className="px-5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-xl text-xs"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
