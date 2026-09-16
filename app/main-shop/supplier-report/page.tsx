'use client';

import React, { useEffect, useState } from 'react';
import { getSuppliers, getSupplierTransactions, Supplier, SupplierTransaction } from '@/lib/shared/queries';
import { useTranslation } from '@/lib/i18n/context';
import { printContent } from '@/lib/utils/print';
import {
  ShoppingBag,
  Printer,
  Calendar,
  DollarSign,
  TrendingUp,
  CreditCard,
  UserCheck,
  AlertTriangle,
} from 'lucide-react';

export default function SupplierReportPage() {
  const { t, language } = useTranslation();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [allTransactions, setAllTransactions] = useState<SupplierTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<'thisWeek' | 'lastWeek' | 'thisMonth' | 'allTime'>('thisWeek');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('all');

  useEffect(() => {
    // Set default range to 'thisWeek'
    handlePresetChange('thisWeek');
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const sups = await getSuppliers();
    setSuppliers(sups);

    // Fetch transactions for all suppliers
    let txs: SupplierTransaction[] = [];
    for (const s of sups) {
      const list = await getSupplierTransactions(s.id);
      txs = txs.concat(list);
    }
    setAllTransactions(txs);
    setLoading(false);
  }

  const formatDateStr = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const handlePresetChange = (preset: 'thisWeek' | 'lastWeek' | 'thisMonth' | 'allTime') => {
    setSelectedPreset(preset);
    const today = new Date();

    if (preset === 'thisWeek') {
      const currentDay = today.getDay();
      const distanceToMon = (currentDay + 6) % 7;
      const monday = new Date(today);
      monday.setDate(today.getDate() - distanceToMon);
      setFromDate(formatDateStr(monday));
      setToDate(formatDateStr(today));
    } else if (preset === 'lastWeek') {
      const currentDay = today.getDay();
      const distanceToMon = (currentDay + 6) % 7;
      const lastMon = new Date(today);
      lastMon.setDate(today.getDate() - distanceToMon - 7);
      const lastSun = new Date(lastMon);
      lastSun.setDate(lastMon.getDate() + 6);
      setFromDate(formatDateStr(lastMon));
      setToDate(formatDateStr(lastSun));
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setFromDate(formatDateStr(firstDay));
      setToDate(formatDateStr(today));
    } else if (preset === 'allTime') {
      setFromDate('');
      setToDate('');
    }
  };

  // Filter logic
  let filteredSuppliers = suppliers;
  if (selectedSupplierId !== 'all') {
    const idNum = Number(selectedSupplierId);
    filteredSuppliers = suppliers.filter((s) => s.id === idNum);
  }

  let filteredTxs = allTransactions.filter((tx) => {
    if (selectedSupplierId !== 'all' && tx.supplier_id !== Number(selectedSupplierId)) return false;

    if (fromDate && tx.date && tx.date < fromDate) return false;
    if (toDate && tx.date && tx.date > toDate) return false;

    return true;
  });

  // Calculate Period Metrics
  const paidMap: { [key: number]: number } = {};
  const purchasedMap: { [key: number]: number } = {};
  const paidSuppliersSet = new Set<number>();

  filteredTxs.forEach((tx) => {
    const supId = tx.supplier_id;
    if (tx.type === 'payment') {
      paidMap[supId] = (paidMap[supId] || 0) + (tx.amount || 0);
      if (tx.amount > 0) paidSuppliersSet.add(supId);
    } else if (tx.type === 'purchase') {
      purchasedMap[supId] = (purchasedMap[supId] || 0) + (tx.amount || 0);
    }
  });

  let totalPaidInPeriod = 0;
  let totalPurchasedInPeriod = 0;
  let totalRemainingOwed = 0;

  filteredSuppliers.forEach((s) => {
    totalRemainingOwed += Number(s.pending_amount || 0);
  });

  filteredTxs.forEach((tx) => {
    if (tx.type === 'payment') totalPaidInPeriod += Number(tx.amount || 0);
    if (tx.type === 'purchase') totalPurchasedInPeriod += Number(tx.amount || 0);
  });

  const handlePrintSupplierReport = () => {
    const html = `
      <div style="direction: rtl; font-family: system-ui, sans-serif; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="font-size: 22px; font-weight: bold; margin: 0;">مركز الأنصاري لصيانة السيارات</h2>
          <h3 style="font-size: 16px; margin: 5px 0; color: #475569;">تقرير حسابات ومدفوعات الموردين</h3>
          <p style="font-size: 13px; color: #64748b; margin: 0;">تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')} | الفترة: ${fromDate || 'الكل'} إلى ${toDate || 'الكل'}</p>
        </div>

        <div style="display: flex; justify-content: space-between; margin-bottom: 20px; gap: 8px;">
          <div style="flex: 1; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; text-align: center; background: #dcfce7; color: #14532d;">
            <div style="font-size: 10px; font-weight: bold;">إجمالي المدفوع للموردين</div>
            <div style="font-size: 16px; font-weight: bold; margin-top: 2px;">$${totalPaidInPeriod.toLocaleString()}</div>
          </div>
          <div style="flex: 1; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; text-align: center; background: #e0e7ff; color: #3730a3;">
            <div style="font-size: 10px; font-weight: bold;">مشتريات آجل جديدة</div>
            <div style="font-size: 16px; font-weight: bold; margin-top: 2px;">$${totalPurchasedInPeriod.toLocaleString()}</div>
          </div>
          <div style="flex: 1; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; text-align: center; background: #ffe4e6; color: #9f1239;">
            <div style="font-size: 10px; font-weight: bold;">إجمالي الديون المتبقية</div>
            <div style="font-size: 16px; font-weight: bold; margin-top: 2px;">$${totalRemainingOwed.toLocaleString()}</div>
          </div>
          <div style="flex: 1; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; text-align: center; background: #0f172a; color: #fff;">
            <div style="font-size: 10px; color: #facc15; font-weight: bold;">عدد الموردين المسدد لهم</div>
            <div style="font-size: 16px; font-weight: bold; margin-top: 2px;">${paidSuppliersSet.size}</div>
          </div>
        </div>

        <h4 style="font-size: 14px; font-weight: bold; margin-bottom: 8px;">ملخص الموردين:</h4>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; text-align: right; font-size: 12px;">
          <thead>
            <tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
              <th style="padding: 8px; border: 1px solid #cbd5e1;">المورد</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1;">الهاتف</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1;">نوع التوريد</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">المدفوع</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">المشتريات</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">المتبقي</th>
            </tr>
          </thead>
          <tbody>
            ${filteredSuppliers
              .map((s) => {
                const paid = paidMap[s.id] || 0;
                const purchased = purchasedMap[s.id] || 0;
                const pending = Number(s.pending_amount || 0);
                return `
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">${s.name}</td>
                  <td style="padding: 8px; border: 1px solid #e2e8f0;">${s.contact_number || '-'}</td>
                  <td style="padding: 8px; border: 1px solid #e2e8f0;">${s.supplies_what || '-'}</td>
                  <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center; color: #16a34a; font-weight: bold;">$${paid.toFixed(2)}</td>
                  <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center; color: #4f46e5; font-weight: bold;">$${purchased.toFixed(2)}</td>
                  <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center; color: #dc2626; font-weight: bold;">$${pending.toFixed(2)}</td>
                </tr>
              `;
              })
              .join('')}
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
            <ShoppingBag className="w-7 h-7 text-yellow-500" />
            <span>{language === 'ar' ? 'تقرير مدفوعات ومشتريات الموردين' : 'Supplier Payment Report'}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'ar' ? 'تقرير تفصيلي بمدفوعات الموردين ومشتريات الآجل والديون المستحقة' : 'Detailed summary of payments, purchases, and remaining debt per supplier'}
          </p>
        </div>

        <button
          type="button"
          onClick={handlePrintSupplierReport}
          className="px-5 py-2.5 rounded-xl font-bold text-xs text-zinc-900 bg-yellow-400 hover:bg-yellow-500 shadow-md shadow-yellow-400/20 transition-all flex items-center gap-2 self-start md:self-auto"
        >
          <Printer className="w-4 h-4" />
          <span>{language === 'ar' ? 'طباعة كشف الموردين' : 'Print Report'}</span>
        </button>
      </div>

      {/* Filter Control Box: Presets + Supplier Select */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* EXACT PRESET BUTTONS (Not a dropdown as requested) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-yellow-500" />
              <span>{language === 'ar' ? 'فترة التقرير:' : 'Time Preset:'}</span>
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handlePresetChange('thisWeek')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  selectedPreset === 'thisWeek'
                    ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
                    : 'bg-slate-100 text-zinc-700 border-slate-200 hover:bg-slate-200'
                }`}
              >
                {language === 'ar' ? 'هذا الأسبوع' : 'This Week'}
              </button>

              <button
                type="button"
                onClick={() => handlePresetChange('lastWeek')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  selectedPreset === 'lastWeek'
                    ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
                    : 'bg-slate-100 text-zinc-700 border-slate-200 hover:bg-slate-200'
                }`}
              >
                {language === 'ar' ? 'الأسبوع الماضي' : 'Last Week'}
              </button>

              <button
                type="button"
                onClick={() => handlePresetChange('thisMonth')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  selectedPreset === 'thisMonth'
                    ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
                    : 'bg-slate-100 text-zinc-700 border-slate-200 hover:bg-slate-200'
                }`}
              >
                {language === 'ar' ? 'هذا الشهر' : 'This Month'}
              </button>

              <button
                type="button"
                onClick={() => handlePresetChange('allTime')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  selectedPreset === 'allTime'
                    ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
                    : 'bg-slate-100 text-zinc-700 border-slate-200 hover:bg-slate-200'
                }`}
              >
                {t('allTime')}
              </button>
            </div>
          </div>

          {/* Supplier Dropdown Filter */}
          <div className="space-y-1.5 max-w-xs w-full">
            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider">
              {language === 'ar' ? 'اختر المورد:' : 'Supplier:'}
            </label>
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-zinc-900 focus:outline-none focus:border-yellow-400"
            >
              <option value="all">{language === 'ar' ? 'جميع الموردين' : 'All Suppliers'}</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Inputs */}
        <div className="flex items-center gap-2 text-xs pt-2 border-t border-slate-100">
          <span className="font-bold text-slate-500">{t('startDate')}:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setSelectedPreset('allTime');
            }}
            className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1 text-zinc-900 font-semibold focus:outline-none"
          />
          <span className="font-bold text-slate-400">-</span>
          <span className="font-bold text-slate-500">{t('endDate')}:</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setSelectedPreset('allTime');
            }}
            className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1 text-zinc-900 font-semibold focus:outline-none"
          />
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">{language === 'ar' ? 'إجمالي المدفوع للموردين' : 'Total Paid in Period'}</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">${totalPaidInPeriod.toLocaleString()}</p>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">{language === 'ar' ? 'مشتريات الفترة بالآجل' : 'Purchased in Period'}</p>
            <p className="text-2xl font-black text-indigo-600 mt-1">${totalPurchasedInPeriod.toLocaleString()}</p>
          </div>
          <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">{language === 'ar' ? 'إجمالي ديون الموردين المتبقية' : 'Total Remaining Owed'}</p>
            <p className="text-2xl font-black text-rose-600 mt-1">${totalRemainingOwed.toLocaleString()}</p>
          </div>
          <div className="p-3 rounded-2xl bg-rose-50 text-rose-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">{language === 'ar' ? 'عدد الموردين المسدد لهم' : 'Suppliers Paid'}</p>
            <p className="text-2xl font-black text-zinc-900 mt-1">{paidSuppliersSet.size}</p>
          </div>
          <div className="p-3 rounded-2xl bg-zinc-900 text-yellow-400">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Table 1: Suppliers Summary Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
          <span>{language === 'ar' ? 'ملخص حسابات الموردين' : 'Suppliers Summary'}</span>
        </h2>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900 text-white font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3.5">{t('supplierName')}</th>
                <th className="p-3.5">{t('contactNumber')}</th>
                <th className="p-3.5">{t('suppliesCategory')}</th>
                <th className="p-3.5 text-right">{language === 'ar' ? 'المدفوع في الفترة' : 'Paid in Period'}</th>
                <th className="p-3.5 text-right">{language === 'ar' ? 'مشتريات الفترة' : 'Purchased'}</th>
                <th className="p-3.5 text-right">{language === 'ar' ? 'المتبقي سداده' : 'Remaining Owed'}</th>
                <th className="p-3.5 text-center">{language === 'ar' ? 'الحالة' : 'Status'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white font-medium text-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    {t('loading')}
                  </td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    {t('noRecordsFound')}
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((s) => {
                  const paid = paidMap[s.id] || 0;
                  const purchased = purchasedMap[s.id] || 0;
                  const pending = Number(s.pending_amount || 0);
                  const hasPending = pending > 0;

                  return (
                    <tr key={s.id} className="hover:bg-yellow-50/40">
                      <td className="p-3.5 font-bold text-zinc-900">{s.name}</td>
                      <td className="p-3.5 text-slate-500">{s.contact_number || '-'}</td>
                      <td className="p-3.5 text-slate-500">{s.supplies_what || '-'}</td>
                      <td className="p-3.5 text-right font-black text-emerald-600">${paid.toFixed(2)}</td>
                      <td className="p-3.5 text-right font-bold text-indigo-600">${purchased.toFixed(2)}</td>
                      <td className="p-3.5 text-right font-black text-rose-600">${pending.toFixed(2)}</td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            hasPending
                              ? 'bg-rose-50 text-rose-600 border border-rose-200'
                              : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                          }`}
                        >
                          {hasPending ? `⚠ $${pending.toFixed(2)}` : '✓ Settled'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Table 2: Payment Log Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-zinc-900">
          {language === 'ar' ? 'سجل مدفوعات الموردين في الفترة' : 'Detailed Payment Log'}
        </h2>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900 text-white font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3.5">{t('date')}</th>
                <th className="p-3.5">{t('supplierName')}</th>
                <th className="p-3.5 text-right">{language === 'ar' ? 'المبلغ المدفوع' : 'Amount Paid'}</th>
                <th className="p-3.5 text-right">{language === 'ar' ? 'الرصيد المتبقي بعد الدفع' : 'Balance After'}</th>
                <th className="p-3.5">{t('notes')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white font-medium text-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    {t('loading')}
                  </td>
                </tr>
              ) : filteredTxs.filter((t) => t.type === 'payment').length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    {language === 'ar' ? 'لا توجد دفعات مسجلة للموردين خلال هذه الفترة' : 'No supplier payments recorded in this period'}
                  </td>
                </tr>
              ) : (
                filteredTxs
                  .filter((t) => t.type === 'payment')
                  .map((tx) => {
                    const supName = suppliers.find((s) => s.id === tx.supplier_id)?.name || `Supplier #${tx.supplier_id}`;
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50">
                        <td className="p-3.5 text-slate-500 font-semibold">{tx.date || '-'}</td>
                        <td className="p-3.5 font-bold text-zinc-900">{supName}</td>
                        <td className="p-3.5 text-right font-black text-emerald-600">${Number(tx.amount).toFixed(2)}</td>
                        <td className="p-3.5 text-right font-bold text-zinc-900">${Number(tx.balance_after).toFixed(2)}</td>
                        <td className="p-3.5 text-slate-500">{tx.note || '-'}</td>
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
