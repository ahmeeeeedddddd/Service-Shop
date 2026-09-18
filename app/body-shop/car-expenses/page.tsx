'use client';

import React, { useState, useEffect } from 'react';
import {
  CarExpense,
  getCarExpenses,
  addCarExpense,
  deleteCarExpense,
  Customer,
  getCustomers,
  getCustomerCars,
  CustomerCar,
  getParts,
  Part,
} from '@/lib/shared/queries';
import { Modal } from '@/components/shared/Modal';
import {
  Plus,
  Trash2,
  Search,
  Users,
  Eye,
  Filter,
  Car,
  Printer,
  Calculator,
  CheckCircle,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';
import { printContent } from '@/lib/utils/print';

interface OtherPurchase {
  name: string;
  cost: number;
}

export default function BodyShopCarExpensesPage() {
  const { t, language } = useTranslation();

  const [carExpenses, setCarExpenses] = useState<CarExpense[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Date Filter State
  const [filterPreset, setFilterPreset] = useState<'all' | 'today' | 'month' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Add / Edit Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Customer Autocomplete state
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState<{ name: string; phone: string; cars: Customer[] }[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerCars, setCustomerCars] = useState<CustomerCar[]>([]);
  const [selectedCarIndex, setSelectedCarIndex] = useState<number>(0);

  const [customerNameInput, setCustomerNameInput] = useState('');
  const [customerPhoneInput, setCustomerPhoneInput] = useState('');
  const [carInfoInput, setCarInfoInput] = useState('');

  // Cost Fields State
  const [matBodyWork, setMatBodyWork] = useState<number>(0);

  const [matPuttyAmt, setMatPuttyAmt] = useState<number>(0);
  const [matPuttyCost, setMatPuttyCost] = useState<number>(0);

  const [matFiberAmt, setMatFiberAmt] = useState<number>(0);
  const [matFiberCost, setMatFiberCost] = useState<number>(0);

  const [matFillerAmt, setMatFillerAmt] = useState<number>(0);
  const [matFillerCost, setMatFillerCost] = useState<number>(0);

  const [matPaintCost, setMatPaintCost] = useState<number>(0);

  const [matVarnishAmt, setMatVarnishAmt] = useState<number>(0);
  const [matVarnishCost, setMatVarnishCost] = useState<number>(0);

  const [matBooth, setMatBooth] = useState<number>(0);

  const [otherPurchases, setOtherPurchases] = useState<OtherPurchase[]>([]);

  // View Details Modal State
  const [selectedExpense, setSelectedExpense] = useState<CarExpense | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const loadData = async (start?: string, end?: string) => {
    setLoading(true);
    const [ceData, custData, partData] = await Promise.all([
      getCarExpenses('body-shop', start, end),
      getCustomers(),
      getParts(),
    ]);
    setCarExpenses(ceData);
    setCustomers(custData);
    setParts(partData);
    setLoading(false);
  };

  useEffect(() => {
    let sDate = '';
    let eDate = '';
    const todayStr = new Date().toISOString().split('T')[0];

    if (filterPreset === 'today') {
      sDate = todayStr;
      eDate = todayStr;
    } else if (filterPreset === 'month') {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      sDate = firstDay;
      eDate = todayStr;
    } else if (filterPreset === 'custom') {
      sDate = startDate;
      eDate = endDate;
    }

    loadData(sDate || undefined, eDate || undefined);
  }, [filterPreset, startDate, endDate]);

  // Handle Customer Search
  const handleCustomerSearchChange = async (q: string) => {
    setCustomerSearchQuery(q);
    if (!q || q.trim().length < 2) {
      setCustomerSearchResults([]);
      setShowCustomerDropdown(false);
      return;
    }

    const term = q.trim();
    const matchingCustomers = await getCustomers(term);

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
    setCarInfoInput(`${firstCarCustomer.car_name || ''} ${firstCarCustomer.plate_number ? '· ' + firstCarCustomer.plate_number : ''}`.trim());

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

  // Stock Unit Price Lookup Helper
  const findPartPrice = (keywords: string[]) => {
    const matched = parts.find((p) => {
      const nameLower = p.name.toLowerCase();
      return keywords.some((k) => nameLower.includes(k.toLowerCase()));
    });
    return matched ? matched.unit_price || 0 : 0;
  };

  // Auto calculate material costs when quantities change
  const handlePuttyQtyChange = (qty: number) => {
    setMatPuttyAmt(qty);
    const unitPrice = findPartPrice(['ستوك', 'معجون', 'putty']);
    if (unitPrice > 0) {
      setMatPuttyCost(qty * unitPrice);
    }
  };

  const handleFiberQtyChange = (qty: number) => {
    setMatFiberAmt(qty);
    const unitPrice = findPartPrice(['فيبر', 'fiber']);
    if (unitPrice > 0) {
      setMatFiberCost(qty * unitPrice);
    }
  };

  const handleFillerQtyChange = (qty: number) => {
    setMatFillerAmt(qty);
    const unitPrice = findPartPrice(['فيلر', 'filler']);
    if (unitPrice > 0) {
      setMatFillerCost(qty * unitPrice);
    }
  };

  const handleVarnishQtyChange = (qty: number) => {
    setMatVarnishAmt(qty);
    const unitPrice = findPartPrice(['ورنيش', 'varnish']);
    if (unitPrice > 0) {
      setMatVarnishCost(qty * unitPrice);
    }
  };

  // Calculate Total Cost Sum
  const calculateTotalCost = () => {
    let sum = matBodyWork + matPuttyCost + matFiberCost + matFillerCost + matPaintCost + matVarnishCost + matBooth;
    otherPurchases.forEach((op) => {
      sum += Number(op.cost || 0);
    });
    return sum;
  };

  // Other purchases handlers
  const handleAddOtherPurchase = () => {
    setOtherPurchases([...otherPurchases, { name: '', cost: 0 }]);
  };

  const handleRemoveOtherPurchase = (idx: number) => {
    setOtherPurchases(otherPurchases.filter((_, i) => i !== idx));
  };

  const handleOtherPurchaseChange = (idx: number, field: 'name' | 'cost', val: any) => {
    const updated = [...otherPurchases];
    (updated[idx] as any)[field] = val;
    setOtherPurchases(updated);
  };

  const handleSaveCarExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const total = calculateTotalCost();

    const detailsObj = {
      body_work: matBodyWork,
      putty: { qty: matPuttyAmt, cost: matPuttyCost },
      fiber: { qty: matFiberAmt, cost: matFiberCost },
      filler: { qty: matFillerAmt, cost: matFillerCost },
      paint: { cost: matPaintCost },
      varnish: { qty: matVarnishAmt, cost: matVarnishCost },
      paint_booth: matBooth,
      other_purchases: otherPurchases,
    };

    await addCarExpense({
      customer_id: selectedCustomer ? selectedCustomer.id : null,
      car_info: carInfoInput || (language === 'ar' ? 'سيارة ورشة سمكرة' : 'Body Repair Vehicle'),
      total_cost: total,
      date: date || new Date().toISOString().split('T')[0],
      details_json: JSON.stringify(detailsObj),
      branch_id: 'body-shop',
    });

    resetAddForm();
    setIsAddModalOpen(false);
    loadData();
  };

  const resetAddForm = () => {
    setSelectedCustomer(null);
    setCustomerNameInput('');
    setCustomerPhoneInput('');
    setCarInfoInput('');
    setMatBodyWork(0);
    setMatPuttyAmt(0);
    setMatPuttyCost(0);
    setMatFiberAmt(0);
    setMatFiberCost(0);
    setMatFillerAmt(0);
    setMatFillerCost(0);
    setMatPaintCost(0);
    setMatVarnishAmt(0);
    setMatVarnishCost(0);
    setMatBooth(0);
    setOtherPurchases([]);
  };

  const handleDelete = async (id: number) => {
    if (confirm(t('confirmDelete'))) {
      await deleteCarExpense(id);
      loadData();
    }
  };

  const filteredExpenses = carExpenses.filter(
    (ce) =>
      (ce.car_info && ce.car_info.toLowerCase().includes(search.toLowerCase())) ||
      (ce.customers?.name && ce.customers.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
            <Car className="w-7 h-7 text-yellow-500" />
            <span>{t('carExpensesAndJobs')}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-yellow-400 text-black font-bold border border-yellow-500/40">
              {t('bodyShop')}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'ar' ? 'حاسبة تكاليف ومصروفات المواد والأعمال لكل سيارة' : 'Calculate vehicle paint/body repair material & labor costs'}
          </p>
        </div>

        <button
          onClick={() => {
            resetAddForm();
            setIsAddModalOpen(true);
          }}
          className="inline-flex items-center space-x-2 rtl:space-x-reverse px-5 py-3 rounded-2xl font-bold text-xs text-zinc-900 bg-yellow-400 hover:bg-yellow-500 shadow-md shadow-yellow-400/20 transition-all self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{language === 'ar' ? 'إضافة مقايسة / عمل جديد' : 'New Car Job Expense'}</span>
        </button>
      </div>

      {/* Date Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold text-slate-500 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-yellow-500" />
            {t('filterByDate')}:
          </span>
          <button
            onClick={() => setFilterPreset('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              filterPreset === 'all' ? 'bg-zinc-900 text-white' : 'bg-slate-100 text-zinc-700 hover:bg-slate-200'
            }`}
          >
            {t('allTime')}
          </button>
          <button
            onClick={() => setFilterPreset('today')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              filterPreset === 'today' ? 'bg-zinc-900 text-white' : 'bg-slate-100 text-zinc-700 hover:bg-slate-200'
            }`}
          >
            {t('today')}
          </button>
          <button
            onClick={() => setFilterPreset('month')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              filterPreset === 'month' ? 'bg-zinc-900 text-white' : 'bg-slate-100 text-zinc-700 hover:bg-slate-200'
            }`}
          >
            {t('thisMonth')}
          </button>
          <button
            onClick={() => setFilterPreset('custom')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              filterPreset === 'custom' ? 'bg-zinc-900 text-white' : 'bg-slate-100 text-zinc-700 hover:bg-slate-200'
            }`}
          >
            {t('customRange')}
          </button>
        </div>

        {filterPreset === 'custom' && (
          <div className="flex items-center space-x-2 rtl:space-x-reverse text-xs">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-zinc-900"
            />
            <span className="text-slate-400 font-bold">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-zinc-900"
            />
          </div>
        )}

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-xs text-zinc-900 placeholder-slate-400 focus:outline-none focus:border-yellow-400 font-medium"
          />
        </div>
      </div>

      {/* Car Expenses Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-400"></div>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs font-medium">
            {t('noRecordsFound')}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900 text-white font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">{t('id')}</th>
                  <th className="p-3.5">{t('customer')}</th>
                  <th className="p-3.5">{t('carInfo')}</th>
                  <th className="p-3.5 text-right">{t('totalCost')} ($)</th>
                  <th className="p-3.5">{t('date')}</th>
                  <th className="p-3.5 text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white font-medium text-zinc-800">
                {filteredExpenses.map((ce) => (
                  <tr key={ce.id} className="hover:bg-yellow-50/40 transition-colors">
                    <td className="p-3.5 font-black text-yellow-600">#{ce.id}</td>
                    <td className="p-3.5 font-bold text-zinc-900">
                      {ce.customers?.name || t('walkInCustomer')}
                    </td>
                    <td className="p-3.5 text-slate-600 font-semibold">{ce.car_info || 'Vehicle'}</td>
                    <td className="p-3.5 text-right font-black text-emerald-600">${Number(ce.total_cost || 0).toLocaleString()}</td>
                    <td className="p-3.5 text-slate-500">{ce.date || 'N/A'}</td>
                    <td className="p-3.5 text-right space-x-1.5">
                      <button
                        onClick={() => {
                          setSelectedExpense(ce);
                          setIsViewModalOpen(true);
                        }}
                        className="p-1.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        title={language === 'ar' ? 'عرض تفاصيل التكلفة' : 'View Cost Breakdown'}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(ce.id)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title={t('delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* NEW CAR JOB EXPENSE MODAL */}
      {isAddModalOpen && (
        <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title={language === 'ar' ? 'حاسبة ومصروفات عمل السيارة' : 'Car Job Cost Calculator'} maxWidth="4xl">
          <form onSubmit={handleSaveCarExpense} className="space-y-6 text-xs">
            {/* Customer Search Autocomplete */}
            <div className="relative">
              <label className="block font-bold text-zinc-800 uppercase mb-1">{language === 'ar' ? 'بحث عن عميل مسجل' : 'Search Customer'}</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={customerSearchQuery}
                  onChange={(e) => handleCustomerSearchChange(e.target.value)}
                  placeholder={language === 'ar' ? 'اكتب اسم العميل أو الهاتف...' : 'Type customer name...'}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 font-bold text-zinc-900 focus:outline-none focus:border-yellow-400"
                />
              </div>

              {showCustomerDropdown && customerSearchResults.length > 0 && (
                <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-2xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
                  {customerSearchResults.map((group, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectCustomerGroup(group)}
                      className="p-3 hover:bg-yellow-50 cursor-pointer flex justify-between items-center"
                    >
                      <div>
                        <p className="font-bold text-zinc-900">{group.name}</p>
                        <p className="text-[11px] text-slate-500">{group.phone}</p>
                      </div>
                      <span className="text-[11px] font-bold text-yellow-700 bg-yellow-100 px-2.5 py-0.5 rounded-full">
                        {group.cars.length} {language === 'ar' ? 'سيارة' : 'cars'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Customer & Car Info Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">{t('customer')}</label>
                <input
                  type="text"
                  value={customerNameInput}
                  onChange={(e) => setCustomerNameInput(e.target.value)}
                  placeholder={t('walkInCustomer')}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-bold text-zinc-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">{t('carInfo')} *</label>
                <input
                  type="text"
                  required
                  value={carInfoInput}
                  onChange={(e) => setCarInfoInput(e.target.value)}
                  placeholder="e.g. تويوتا كورولا - أحمر"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-bold text-zinc-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">{t('date')}</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-bold text-zinc-900"
                />
              </div>
            </div>

            {/* Detailed Materials Cost Calculator Grid */}
            <div className="space-y-3">
              <h3 className="font-bold text-zinc-900 uppercase tracking-wider text-xs border-b border-slate-100 pb-2">
                {language === 'ar' ? 'تكاليف الخامات والمصنعيات' : 'Materials & Labor Costs'}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Labor / Body Work */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="block font-bold text-zinc-800 mb-1">{language === 'ar' ? 'مصنعية سمكرة / مصنعية اليد ($)' : 'Body Work / Labor Cost ($)'}</label>
                  <input
                    type="number"
                    min="0"
                    value={matBodyWork}
                    onChange={(e) => setMatBodyWork(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 font-bold text-zinc-900"
                  />
                </div>

                {/* Paint Booth */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="block font-bold text-zinc-800 mb-1">{language === 'ar' ? 'إيجار فرن الدهان ($)' : 'Paint Booth Cost ($)'}</label>
                  <input
                    type="number"
                    min="0"
                    value={matBooth}
                    onChange={(e) => setMatBooth(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 font-bold text-zinc-900"
                  />
                </div>
              </div>

              {/* Quantities & Costs Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Putty */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="font-bold text-zinc-900">{language === 'ar' ? 'معجون (ستوك)' : 'Putty'}</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-slate-500 font-bold block">{language === 'ar' ? 'الكمية' : 'Qty'}</label>
                      <input
                        type="number"
                        min="0"
                        value={matPuttyAmt}
                        onChange={(e) => handlePuttyQtyChange(Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1 font-bold text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 font-bold block">{language === 'ar' ? 'التكلفة ($)' : 'Cost ($)'}</label>
                      <input
                        type="number"
                        min="0"
                        value={matPuttyCost}
                        onChange={(e) => setMatPuttyCost(Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1 font-bold text-right text-emerald-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Fiber */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="font-bold text-zinc-900">{language === 'ar' ? 'فيبرجلاس' : 'Fiber'}</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-slate-500 font-bold block">{language === 'ar' ? 'الكمية' : 'Qty'}</label>
                      <input
                        type="number"
                        min="0"
                        value={matFiberAmt}
                        onChange={(e) => handleFiberQtyChange(Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1 font-bold text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 font-bold block">{language === 'ar' ? 'التكلفة ($)' : 'Cost ($)'}</label>
                      <input
                        type="number"
                        min="0"
                        value={matFiberCost}
                        onChange={(e) => setMatFiberCost(Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1 font-bold text-right text-emerald-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Filler */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="font-bold text-zinc-900">{language === 'ar' ? 'فيلر' : 'Filler'}</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-slate-500 font-bold block">{language === 'ar' ? 'الكمية' : 'Qty'}</label>
                      <input
                        type="number"
                        min="0"
                        value={matFillerAmt}
                        onChange={(e) => handleFillerQtyChange(Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1 font-bold text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 font-bold block">{language === 'ar' ? 'التكلفة ($)' : 'Cost ($)'}</label>
                      <input
                        type="number"
                        min="0"
                        value={matFillerCost}
                        onChange={(e) => setMatFillerCost(Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1 font-bold text-right text-emerald-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Varnish */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="font-bold text-zinc-900">{language === 'ar' ? 'ورنيش' : 'Varnish'}</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-slate-500 font-bold block">{language === 'ar' ? 'الكمية' : 'Qty'}</label>
                      <input
                        type="number"
                        min="0"
                        value={matVarnishAmt}
                        onChange={(e) => handleVarnishQtyChange(Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1 font-bold text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 font-bold block">{language === 'ar' ? 'التكلفة ($)' : 'Cost ($)'}</label>
                      <input
                        type="number"
                        min="0"
                        value={matVarnishCost}
                        onChange={(e) => setMatVarnishCost(Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1 font-bold text-right text-emerald-600"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Paint Cost */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <label className="block font-bold text-zinc-800 mb-1">{language === 'ar' ? 'تكلفة البوهية / الدهانات ($)' : 'Paint Cost ($)'}</label>
                <input
                  type="number"
                  min="0"
                  value={matPaintCost}
                  onChange={(e) => setMatPaintCost(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 font-bold text-zinc-900"
                />
              </div>

              {/* Other Purchases Dynamic Rows */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-zinc-900 uppercase">{language === 'ar' ? 'مشتريات خامات إضافية' : 'Other Material Purchases'}</label>
                  <button
                    type="button"
                    onClick={handleAddOtherPurchase}
                    className="text-xs text-yellow-600 font-bold flex items-center gap-1 hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'إضافة شراء آخر' : 'Add Other Purchase'}</span>
                  </button>
                </div>

                {otherPurchases.map((op, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder={language === 'ar' ? 'اسم المشتريات (مثال: صنفارة)' : 'Purchase item name'}
                      value={op.name}
                      onChange={(e) => handleOtherPurchaseChange(idx, 'name', e.target.value)}
                      className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-1.5 font-bold"
                    />
                    <input
                      type="number"
                      placeholder="Cost"
                      value={op.cost}
                      onChange={(e) => handleOtherPurchaseChange(idx, 'cost', Number(e.target.value))}
                      className="w-28 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 font-bold text-right"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveOtherPurchase(idx)}
                      className="p-1 text-rose-500 font-bold text-base"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Cost Display Card */}
            <div className="p-4 bg-yellow-50 rounded-2xl border-2 border-yellow-300 flex justify-between items-center text-sm font-black text-zinc-900">
              <span>{language === 'ar' ? 'التكلفة الإجمالية للسيارة:' : 'Total Car Job Cost:'}</span>
              <span className="text-emerald-600 text-xl font-black">${calculateTotalCost().toFixed(2)}</span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 font-semibold text-slate-500">
                {t('cancel')}
              </button>
              <button type="submit" className="px-6 py-2.5 bg-yellow-400 hover:bg-yellow-500 font-bold text-zinc-900 rounded-xl shadow-md">
                {t('save')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* VIEW BREAKDOWN DETAILS MODAL */}
      {isViewModalOpen && selectedExpense && (
        <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title={`${language === 'ar' ? 'تفاصيل مقايسة السيارة' : 'Cost Breakdown'} #${selectedExpense.id}`} maxWidth="2xl">
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <p><strong className="text-zinc-700">{t('customer')}:</strong> {selectedExpense.customers?.name || t('walkInCustomer')}</p>
              <p><strong className="text-zinc-700">{t('carInfo')}:</strong> {selectedExpense.car_info}</p>
              <p><strong className="text-zinc-700">{t('date')}:</strong> {selectedExpense.date}</p>
            </div>

            {selectedExpense.details_json && (
              <div>
                <p className="font-bold text-zinc-900 mb-2 uppercase">{language === 'ar' ? 'بيان الخامات والمصنعيات' : 'Itemized Expenses'}</p>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left">
                    <thead className="bg-zinc-900 text-white font-bold">
                      <tr>
                        <th className="p-2.5">{language === 'ar' ? 'البند / الخامة' : 'Material / Labor'}</th>
                        <th className="p-2.5 text-right">{t('amount')} ($)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {(() => {
                        try {
                          const details = JSON.parse(selectedExpense.details_json);
                          const rows = [];
                          if (details.body_work > 0) rows.push({ name: language === 'ar' ? 'مصنعية سمكرة' : 'Body Work', cost: details.body_work });
                          if (details.putty?.cost > 0) rows.push({ name: `${language === 'ar' ? 'معجون' : 'Putty'} (${details.putty.qty || 1} qty)`, cost: details.putty.cost });
                          if (details.fiber?.cost > 0) rows.push({ name: `${language === 'ar' ? 'فيبرجلاس' : 'Fiber'} (${details.fiber.qty || 1} qty)`, cost: details.fiber.cost });
                          if (details.filler?.cost > 0) rows.push({ name: `${language === 'ar' ? 'فيلر' : 'Filler'} (${details.filler.qty || 1} qty)`, cost: details.filler.cost });
                          if (details.paint?.cost > 0) rows.push({ name: language === 'ar' ? 'بوهية / دهانات' : 'Paint', cost: details.paint.cost });
                          if (details.varnish?.cost > 0) rows.push({ name: `${language === 'ar' ? 'ورنيش' : 'Varnish'} (${details.varnish.qty || 1} qty)`, cost: details.varnish.cost });
                          if (details.paint_booth > 0) rows.push({ name: language === 'ar' ? 'فرن الدهان' : 'Paint Booth', cost: details.paint_booth });

                          if (details.other_purchases && Array.isArray(details.other_purchases)) {
                            details.other_purchases.forEach((op: any) => {
                              if (op.cost > 0) rows.push({ name: op.name || 'Other', cost: op.cost });
                            });
                          }

                          return rows.map((r, i) => (
                            <tr key={i}>
                              <td className="p-2.5 font-bold text-zinc-900">{r.name}</td>
                              <td className="p-2.5 text-right font-black text-emerald-600">${Number(r.cost).toFixed(2)}</td>
                            </tr>
                          ));
                        } catch (e) {
                          return (
                            <tr>
                              <td colSpan={2} className="p-4 text-center text-slate-500">
                                Raw Data: {selectedExpense.details_json}
                              </td>
                            </tr>
                          );
                        }
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="p-4 bg-yellow-50 rounded-2xl border border-yellow-200 flex justify-between items-center text-xs font-black text-zinc-900">
              <span>{t('totalCost')}:</span>
              <span className="text-emerald-600 text-base">${Number(selectedExpense.total_cost).toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => {
                  let rowsHtml = '';
                  try {
                    const details = JSON.parse(selectedExpense.details_json || '{}');
                    if (details.body_work > 0) rowsHtml += `<tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">مصنعية سمكرة</td><td style="padding: 8px; border: 1px solid #e2e8f0; text-align: left; font-weight: bold; color: #16a34a;">$${details.body_work}</td></tr>`;
                    if (details.putty?.cost > 0) rowsHtml += `<tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">معجون (${details.putty.qty || 1})</td><td style="padding: 8px; border: 1px solid #e2e8f0; text-align: left; font-weight: bold; color: #16a34a;">$${details.putty.cost}</td></tr>`;
                    if (details.fiber?.cost > 0) rowsHtml += `<tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">فيبرجلاس (${details.fiber.qty || 1})</td><td style="padding: 8px; border: 1px solid #e2e8f0; text-align: left; font-weight: bold; color: #16a34a;">$${details.fiber.cost}</td></tr>`;
                    if (details.filler?.cost > 0) rowsHtml += `<tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">فيلر (${details.filler.qty || 1})</td><td style="padding: 8px; border: 1px solid #e2e8f0; text-align: left; font-weight: bold; color: #16a34a;">$${details.filler.cost}</td></tr>`;
                    if (details.paint?.cost > 0) rowsHtml += `<tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">بوهية / دهانات</td><td style="padding: 8px; border: 1px solid #e2e8f0; text-align: left; font-weight: bold; color: #16a34a;">$${details.paint.cost}</td></tr>`;
                    if (details.varnish?.cost > 0) rowsHtml += `<tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">ورنيش (${details.varnish.qty || 1})</td><td style="padding: 8px; border: 1px solid #e2e8f0; text-align: left; font-weight: bold; color: #16a34a;">$${details.varnish.cost}</td></tr>`;
                    if (details.paint_booth > 0) rowsHtml += `<tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">فرن الدهان</td><td style="padding: 8px; border: 1px solid #e2e8f0; text-align: left; font-weight: bold; color: #16a34a;">$${details.paint_booth}</td></tr>`;
                    if (details.other_purchases && Array.isArray(details.other_purchases)) {
                      details.other_purchases.forEach((op: any) => {
                        if (op.cost > 0) rowsHtml += `<tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">${op.name || 'خامة إضافية'}</td><td style="padding: 8px; border: 1px solid #e2e8f0; text-align: left; font-weight: bold; color: #16a34a;">$${op.cost}</td></tr>`;
                      });
                    }
                  } catch (e) {}

                  const html = `
                    <div style="direction: rtl; font-family: system-ui, sans-serif; padding: 20px;">
                      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #cbd5e1; padding-bottom: 15px; margin-bottom: 20px;">
                        <div style="font-size: 11px; color: #64748b; font-weight: bold;">ورشة السمكرة والدهان</div>
                        <div style="text-align: center;">
                          <h2 style="font-size: 20px; font-weight: bold; margin: 0;">الأنصاري لإصلاح الهياكل</h2>
                          <h3 style="font-size: 14px; margin: 5px 0; color: #ca8a04;">مقايسة تكاليف ومصروفات السيارة</h3>
                        </div>
                        <div style="font-size: 11px; color: #64748b; font-weight: bold;">التاريخ: ${selectedExpense.date}</div>
                      </div>

                      <div style="background: #fef9c3; padding: 12px; border: 1px solid #fde047; border-radius: 8px; margin-bottom: 20px; font-size: 13px;">
                        <p style="margin: 3px 0;"><strong>العميل:</strong> ${selectedExpense.customers?.name || 'عميل نقدي'}</p>
                        <p style="margin: 3px 0;"><strong>بيانات السيارة:</strong> ${selectedExpense.car_info}</p>
                      </div>

                      <table style="width: 100%; border-collapse: collapse; text-align: right; font-size: 13px; margin-bottom: 20px;">
                        <thead>
                          <tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
                            <th style="padding: 10px; border: 1px solid #cbd5e1;">البند / الخامة</th>
                            <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: left;">التكلفة ($)</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${rowsHtml}
                          <tr style="background: #fef08a; font-weight: bold;">
                            <td style="padding: 10px; border: 1px solid #cbd5e1;">التكلفة الإجمالية:</td>
                            <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: left; font-size: 15px; color: #16a34a;">$${Number(selectedExpense.total_cost).toFixed(2)}</td>
                          </tr>
                        </tbody>
                      </table>

                      <div style="margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; color: #475569;">
                        <div>توقيع الفني / المهندس: __________________</div>
                        <div>توقيع المحاسب: __________________</div>
                      </div>
                    </div>
                  `;
                  printContent(html, 'rtl');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-zinc-900 font-bold rounded-xl text-xs flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>{language === 'ar' ? 'طباعة المقايسة' : 'Print Breakdown'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsViewModalOpen(false)}
                className="px-5 py-2 bg-zinc-900 text-white font-bold rounded-xl text-xs"
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
