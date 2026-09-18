'use client';

import React, { useEffect, useState } from 'react';
import { getRepairs, Repair } from '@/lib/shared/queries';
import { useTranslation } from '@/lib/i18n/context';
import { printContent, generateReceiptHtml } from '@/lib/utils/print';
import {
  FileSpreadsheet,
  Printer,
  Search,
  Calendar,
  Filter,
  TrendingUp,
  DollarSign,
  CreditCard,
} from 'lucide-react';

export default function MainShopIncomeReportPage() {
  const { t, language } = useTranslation();

  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [quickRange, setQuickRange] = useState('all');
  const [customerSearch, setCustomerSearch] = useState('');

  const handlePrintRepairReceipt = (r: Repair) => {
    let lines: any[] = [];
    if (r.repair_items && r.repair_items.length > 0) {
      lines = r.repair_items.map((it) => ({
        name: it.item_name || 'خدمة صيانة',
        qty: Number(it.quantity || 1),
        price: Number(it.unit_price || 0),
      }));
    } else if (r.description) {
      lines = [{ name: r.description, qty: 1, price: Number(r.total_amount || 0) }];
    }

    let splitData: any = null;
    if (r.notes && r.notes.includes('__SPLIT__:')) {
      try {
        splitData = JSON.parse(r.notes.substring(r.notes.indexOf('__SPLIT__:') + 10));
      } catch (e) {}
    }

    const html = generateReceiptHtml(
      {
        id: r.id,
        date: r.date,
        customer: {
          name: r.customers?.name || (language === 'ar' ? 'عميل بدون اسم' : 'Walk-in Customer'),
          phone: r.customers?.phone,
          car_name: r.customers?.car_name,
          plate_number: r.customers?.plate_number,
        },
        payment_method: r.payment_method || 'Cash',
        odometer: r.odometer,
        notes: r.notes,
        lines: lines,
        total_amount: Number(r.total_amount || 0),
        discount: Number(r.discount || 0),
        paid_amount: Number(r.paid_amount || 0),
        pending_amount: Number(r.pending_amount || 0),
        split_data: splitData,
      },
      language as any
    );

    printContent(html, 'rtl');
  };

  // Selected payment methods (Set of methods)
  const [selectedMethods, setSelectedMethods] = useState<string[]>([
    'Cash',
    'Instapay',
    'Bank Alahly',
    'Bank Masr',
    'Vodafone Cash',
    'PayByParts',
    'SplitPayment',
  ]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const data = await getRepairs('main-shop');
    setRepairs(data);
    setLoading(false);
  }

  // Quick range helper
  const handleQuickRangeChange = (val: string) => {
    setQuickRange(val);
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const today = fmt(now);

    if (val === 'today') {
      setFromDate(today);
      setToDate(today);
    } else if (val === 'week') {
      const day = now.getDay();
      const start = new Date(now);
      start.setDate(now.getDate() - day);
      const end = new Date(now);
      end.setDate(now.getDate() + (6 - day));
      setFromDate(fmt(start));
      setToDate(fmt(end));
    } else if (val === 'month') {
      setFromDate(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`);
      setToDate(today);
    } else if (val === 'all') {
      setFromDate('');
      setToDate('');
    }
  };

  const toggleMethodTag = (method: string) => {
    if (method === 'all') {
      if (selectedMethods.length === 7) {
        setSelectedMethods([]);
      } else {
        setSelectedMethods(['Cash', 'Instapay', 'Bank Alahly', 'Bank Masr', 'Vodafone Cash', 'PayByParts', 'SplitPayment']);
      }
    } else {
      if (selectedMethods.includes(method)) {
        setSelectedMethods(selectedMethods.filter((m) => m !== method));
      } else {
        setSelectedMethods([...selectedMethods, method]);
      }
    }
  };

  // Filtered rows
  const filteredRepairs = repairs.filter((r) => {
    if (fromDate && r.date && r.date < fromDate) return false;
    if (toDate && r.date && r.date > toDate) return false;

    if (selectedMethods.length > 0 && selectedMethods.length < 7) {
      const m = r.payment_method || 'Cash';
      if (!selectedMethods.includes(m)) return false;
    }

    if (customerSearch) {
      const name = r.customers?.name || '';
      if (!name.toLowerCase().includes(customerSearch.toLowerCase())) return false;
    }

    return true;
  });

  // Summary Metrics
  let totIncome = 0;
  let totCash = 0;
  let totInstapay = 0;
  let totBankA = 0;
  let totBankM = 0;
  let totVodafone = 0;

  filteredRepairs.forEach((r) => {
    if (r.payment_method === 'Deleted') return;
    const paid = Number(r.paid_amount) || 0;
    totIncome += paid;
    const m = r.payment_method || 'Cash';

    if (m === 'Cash') totCash += paid;
    else if (m === 'Instapay') totInstapay += paid;
    else if (m === 'Bank Alahly') totBankA += paid;
    else if (m === 'Bank Masr') totBankM += paid;
    else if (m === 'Vodafone Cash') totVodafone += paid;
    else if (m === 'SplitPayment' && r.notes && r.notes.includes('__SPLIT__:')) {
      try {
        const splitObj = JSON.parse(r.notes.substring(r.notes.indexOf('__SPLIT__:') + 10));
        if (splitObj.method1 === 'Cash') totCash += Number(splitObj.amount1) || 0;
        if (splitObj.method2 === 'Cash') totCash += Number(splitObj.amount2) || 0;
      } catch (e) {}
    }
  });

  const allMethodsList = ['Cash', 'Instapay', 'Bank Alahly', 'Bank Masr', 'Vodafone Cash', 'PayByParts', 'SplitPayment'];

  const handlePrintIncomeReport = () => {
    const html = `
      <div style="direction: rtl; font-family: system-ui, sans-serif; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="font-size: 22px; font-weight: bold; margin: 0;">مركز الأنصاري لصيانة السيارات</h2>
          <h3 style="font-size: 16px; margin: 5px 0; color: #475569;">تقرير الدخل المالي التفصيلي</h3>
          <p style="font-size: 13px; color: #64748b; margin: 0;">تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')} | الفترة: ${fromDate || 'الكل'} إلى ${toDate || 'الكل'}</p>
        </div>

        <div style="display: flex; justify-content: space-between; margin-bottom: 20px; gap: 8px;">
          <div style="flex: 1; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; text-align: center; background: #0f172a; color: #fff;">
            <div style="font-size: 10px; color: #facc15; font-weight: bold;">عدد الفواتير</div>
            <div style="font-size: 16px; font-weight: bold; margin-top: 2px;">${filteredRepairs.length}</div>
          </div>
          <div style="flex: 1; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; text-align: center; background: #dcfce7; color: #14532d;">
            <div style="font-size: 10px; font-weight: bold;">إجمالي المقبوض</div>
            <div style="font-size: 16px; font-weight: bold; margin-top: 2px;">$${totIncome.toLocaleString()}</div>
          </div>
          <div style="flex: 1; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; text-align: center; background: #f8fafc;">
            <div style="font-size: 10px; color: #64748b; font-weight: bold;">كاش</div>
            <div style="font-size: 14px; font-weight: bold; margin-top: 2px;">$${totCash.toLocaleString()}</div>
          </div>
          <div style="flex: 1; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; text-align: center; background: #f8fafc;">
            <div style="font-size: 10px; color: #64748b; font-weight: bold;">إنستا باي</div>
            <div style="font-size: 14px; font-weight: bold; margin-top: 2px;">$${totInstapay.toLocaleString()}</div>
          </div>
          <div style="flex: 1; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; text-align: center; background: #f8fafc;">
            <div style="font-size: 10px; color: #64748b; font-weight: bold;">البنك الأهلي</div>
            <div style="font-size: 14px; font-weight: bold; margin-top: 2px;">$${totBankA.toLocaleString()}</div>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-top: 15px; text-align: right; font-size: 12px;">
          <thead>
            <tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
              <th style="padding: 8px; border: 1px solid #cbd5e1;">التاريخ</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1;">العميل</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1;">البيان</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1;">طريقة الدفع</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: left;">المدفوع</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: left;">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${filteredRepairs
              .map(
                (r) => `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px; border: 1px solid #e2e8f0;">${r.date || 'N/A'}</td>
                <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">${r.customers?.name || 'عميل نقدي'}</td>
                <td style="padding: 8px; border: 1px solid #e2e8f0;">${r.description || '-'}</td>
                <td style="padding: 8px; border: 1px solid #e2e8f0;">${r.payment_method || 'Cash'}</td>
                <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: left; font-weight: bold; color: #16a34a;">$${Number(r.paid_amount || 0).toFixed(2)}</td>
                <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: left; font-weight: bold;">$${Number(r.total_amount || 0).toFixed(2)}</td>
              </tr>
            `
              )
              .join('')}
            <tr style="background-color: #fef08a; font-weight: bold;">
              <td colspan="4" style="padding: 10px; border: 1px solid #cbd5e1; text-align: right;">إجمالي المقبوض لجميع الفواتير المعروضة:</td>
              <td colspan="2" style="padding: 10px; border: 1px solid #cbd5e1; text-align: left; font-size: 14px; color: #16a34a;">$${totIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top: 30px; display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; color: #475569;">
          <div>تواصل: 01010103777 / 01010606016</div>
          <div>توقيع المحاسب: _______________________</div>
        </div>
      </div>
    `;
    printContent(html, 'rtl');
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-7 h-7 text-yellow-500" />
            <span>{language === 'ar' ? 'تقرير الإيرادات الشامل' : 'Income Report'}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'ar' ? 'فلترة متقدمة وتفصيل المقبوضات حسب طُرق الدفع والفترات الزمنيّة' : 'Advanced income filtering by date range, customer, and payment method tags'}
          </p>
        </div>

        <button
          type="button"
          onClick={handlePrintIncomeReport}
          className="px-5 py-2.5 rounded-xl font-bold text-xs text-zinc-900 bg-yellow-400 hover:bg-yellow-500 shadow-md shadow-yellow-400/20 transition-all flex items-center gap-2 self-start md:self-auto"
        >
          <Printer className="w-4 h-4" />
          <span>{language === 'ar' ? 'طباعة تقرير الدخل' : 'Print Income Report'}</span>
        </button>
      </div>

      {/* Filter Control Box */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-zinc-800">
              <Calendar className="w-4 h-4 text-yellow-500" />
              <span>{t('filterByDate')}:</span>
            </div>

            <select
              value={quickRange}
              onChange={(e) => handleQuickRangeChange(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 font-bold text-zinc-900 focus:outline-none focus:border-yellow-400"
            >
              <option value="all">{t('allTime')}</option>
              <option value="today">{t('today')}</option>
              <option value="week">{language === 'ar' ? 'هذا الأسبوع' : 'This Week'}</option>
              <option value="month">{t('thisMonth')}</option>
            </select>

            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1 text-zinc-900 font-semibold focus:outline-none"
            />
            <span className="text-slate-400 font-bold">-</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1 text-zinc-900 font-semibold focus:outline-none"
            />
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-900 placeholder-slate-400 focus:outline-none focus:border-yellow-400 font-medium"
            />
          </div>
        </div>

        {/* Payment Method Filter Tags */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-yellow-500" />
            <span>{language === 'ar' ? 'طريقة الدفع (تصفية بالأوسام):' : 'Payment Method Tags:'}</span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => toggleMethodTag('all')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all border ${
                selectedMethods.length === 7
                  ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
                  : 'bg-slate-100 text-zinc-600 border-slate-200 hover:bg-slate-200'
              }`}
            >
              {language === 'ar' ? 'الكل' : 'All Methods'}
            </button>

            {allMethodsList.map((m) => {
              const active = selectedMethods.includes(m);
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleMethodTag(m)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all border ${
                    active
                      ? 'bg-yellow-400 text-zinc-900 border-yellow-500 shadow-sm'
                      : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
        <div className="p-4 rounded-2xl bg-zinc-900 text-white border border-zinc-800 shadow-sm">
          <p className="text-[11px] font-bold text-yellow-400 uppercase">{language === 'ar' ? 'عدد الفواتير' : 'Total Invoices'}</p>
          <p className="text-2xl font-black mt-1">{filteredRepairs.length}</p>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-900 border border-emerald-200 shadow-sm">
          <p className="text-[11px] font-bold text-emerald-700 uppercase">{t('totalRevenue')}</p>
          <p className="text-2xl font-black mt-1">${totIncome.toLocaleString()}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <p className="text-[11px] font-bold text-slate-500 uppercase">{t('cash')}</p>
          <p className="text-lg font-black text-zinc-900 mt-1">${totCash.toLocaleString()}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <p className="text-[11px] font-bold text-slate-500 uppercase">{t('instapay')}</p>
          <p className="text-lg font-black text-indigo-600 mt-1">${totInstapay.toLocaleString()}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <p className="text-[11px] font-bold text-slate-500 uppercase">{t('bankAlahly')}</p>
          <p className="text-lg font-black text-emerald-600 mt-1">${totBankA.toLocaleString()}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <p className="text-[11px] font-bold text-slate-500 uppercase">{t('bankMasr')}</p>
          <p className="text-lg font-black text-blue-600 mt-1">${totBankM.toLocaleString()}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm col-span-2 sm:col-span-1">
          <p className="text-[11px] font-bold text-slate-500 uppercase">{t('vodafoneCash')}</p>
          <p className="text-lg font-black text-rose-600 mt-1">${totVodafone.toLocaleString()}</p>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900 text-white font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3.5">{t('date')}</th>
                <th className="p-3.5">{t('customer')}</th>
                <th className="p-3.5">{t('description')}</th>
                <th className="p-3.5">{t('paymentMethod')}</th>
                <th className="p-3.5 text-right">{t('paid')}</th>
                <th className="p-3.5 text-right">{t('pending')}</th>
                <th className="p-3.5 text-right">{t('totalRevenue')}</th>
                <th className="p-3.5 text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white font-medium text-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500 font-medium">
                    {t('loading')}
                  </td>
                </tr>
              ) : filteredRepairs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500 font-medium">
                    {t('noRecordsFound')}
                  </td>
                </tr>
              ) : (
                filteredRepairs.map((r) => {
                  const isDeleted = r.payment_method === 'Deleted';
                  const paid = Number(r.paid_amount) || 0;
                  const pending = Number(r.pending_amount) || 0;
                  const total = Number(r.total_amount) || 0;

                  return (
                    <tr key={r.id} className={`hover:bg-yellow-50/40 ${isDeleted ? 'opacity-50 line-through' : ''}`}>
                      <td className="p-3.5 font-semibold text-slate-500">{r.date || 'N/A'}</td>
                      <td className="p-3.5">
                        <p className="font-bold text-zinc-900">{r.customers?.name || t('walkInCustomer')}</p>
                        <p className="text-[11px] text-slate-500">{r.customers?.phone || 'N/A'}</p>
                      </td>
                      <td className="p-3.5 max-w-xs truncate text-slate-600">
                        {isDeleted ? (
                          <span className="text-rose-600 font-bold">{language === 'ar' ? 'فاتورة ملغاة' : 'Deleted Bill'}</span>
                        ) : (
                          r.description || '-'
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 font-bold text-[11px] text-zinc-900">
                          {r.payment_method || 'Cash'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-black text-emerald-600">${paid.toFixed(2)}</td>
                      <td className="p-3.5 text-right font-bold text-rose-600">{pending > 0 ? `$${pending.toFixed(2)}` : '-'}</td>
                      <td className="p-3.5 text-right font-black text-zinc-900">${total.toFixed(2)}</td>
                      <td className="p-3.5 text-right">
                        {!isDeleted && (
                          <button
                            type="button"
                            onClick={() => handlePrintRepairReceipt(r)}
                            className="p-1.5 text-zinc-900 bg-slate-100 hover:bg-yellow-400 rounded-lg transition-colors font-bold inline-flex items-center gap-1"
                            title={t('printReceipt')}
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
