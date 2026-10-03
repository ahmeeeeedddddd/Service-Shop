'use client';

import React, { useState, useEffect } from 'react';
import { Expense, getExpenses, addExpense, deleteExpense } from '@/lib/shared/queries';
import { Modal } from './Modal';
import { DollarSign, Plus, Trash2, Calendar, Filter, X, Printer } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';
import { printContent } from '@/lib/utils/print';

interface ExpensesViewProps {
  branchId: string;
  branchTitle: string;
}

export function ExpensesView({ branchId, branchTitle }: ExpensesViewProps) {
  const { t, language } = useTranslation();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Date Filter State
  const [filterPreset, setFilterPreset] = useState<'all' | 'today' | 'month' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [fromCash, setFromCash] = useState(true);
  const [fromOhda, setFromOhda] = useState(branchId === 'body-shop');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async (start?: string, end?: string) => {
    setLoading(true);
    const data = await getExpenses(branchId, start, end);
    setExpenses(data);
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
  }, [branchId, filterPreset, startDate, endDate]);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    setSubmitting(true);
    await addExpense({
      description: description || null,
      amount: Number(amount),
      category: category || 'General',
      date: date || new Date().toISOString().split('T')[0],
      from_cash: fromCash,
      from_ohda: fromOhda,
      branch_id: branchId,
    });
    setSubmitting(false);
    setDescription('');
    setAmount('');
    setCategory('');
    setIsAddModalOpen(false);
    loadData();
  };

  const handleDeleteExpense = async (id: number) => {
    if (confirm(t('confirmDelete'))) {
      await deleteExpense(id);
      loadData();
    }
  };

  const totalExpenseSum = expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

  const handlePrintExpenses = () => {
    const isAr = language === 'ar';
    const todayStr = new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US');

    let dateRangeText = isAr ? 'جميع الفترات' : 'All Time';
    if (filterPreset === 'today') {
      dateRangeText = isAr ? `تاريخ اليوم (${new Date().toISOString().split('T')[0]})` : `Today (${new Date().toISOString().split('T')[0]})`;
    } else if (filterPreset === 'month') {
      dateRangeText = isAr ? 'الشهر الحالي' : 'This Month';
    } else if (filterPreset === 'custom') {
      dateRangeText = `${startDate || (isAr ? 'البداية' : 'Start')} ${isAr ? 'إلى' : 'to'} ${endDate || (isAr ? 'الآن' : 'Now')}`;
    }

    const rowsHtml = expenses
      .map((e) => {
        const sourceText = e.from_ohda
          ? isAr ? 'من العُهدة' : 'Ohda'
          : e.from_cash
          ? isAr ? 'من الخزينة' : 'Cash Till'
          : isAr ? 'أخرى' : 'Other';

        return `
          <tr style="border-bottom: 1px solid #e2e8f0; font-size: 12px;">
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; font-weight: bold; text-align: center;">#${e.id}</td>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; font-weight: bold;">${e.description || (isAr ? 'مصروف عام' : 'General Expense')}</td>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: center;">${e.category || (isAr ? 'عام' : 'General')}</td>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: #475569;">${sourceText}</td>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: center; color: #64748b;">${e.date || 'N/A'}</td>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: right; font-weight: 900; color: #e11d48;">$${Number(e.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
        `;
      })
      .join('');

    const html = `
      <div style="direction: ${isAr ? 'rtl' : 'ltr'}; font-family: system-ui, -apple-system, sans-serif; color: #09090b; padding: 10px;">
        <!-- Header Banner -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ca8a04; padding-bottom: 12px; margin-bottom: 16px;">
          <div style="text-align: ${isAr ? 'right' : 'left'}; font-size: 11px; font-weight: bold; color: #64748b; line-height: 1.5;">
            ${isAr ? 'مركز الأنصاري لصيانة وإصلاح السيارات' : 'El Ansary Car Service Center'}<br />
            ${branchTitle}
          </div>
          <div style="text-align: center;">
            <h2 style="font-size: 20px; font-weight: 900; margin: 0; color: #09090b;">${isAr ? 'تقرير المصروفات التشغيلية' : 'Operating Expenses Report'}</h2>
            <div style="font-size: 13px; font-weight: bold; color: #ca8a04; margin-top: 4px;">${isAr ? 'الفترة' : 'Period'}: ${dateRangeText}</div>
          </div>
          <div style="text-align: ${isAr ? 'left' : 'right'}; font-size: 11px; color: #64748b; font-weight: bold;">
            ${isAr ? 'تاريخ الطباعة' : 'Print Date'}:<br />${todayStr}
          </div>
        </div>

        <!-- Summary Stats Card -->
        <div style="display: flex; justify-content: space-between; align-items: center; background-color: #fefce8; border: 2px solid #fde047; border-radius: 12px; padding: 12px 16px; margin-bottom: 16px;">
          <div>
            <span style="font-size: 12px; font-weight: bold; color: #854d0e;">${isAr ? 'إجمالي عدد المصروفات المسجلة:' : 'Total Logged Expense Items:'}</span>
            <span style="font-size: 14px; font-weight: 900; color: #09090b; margin-${isAr ? 'right' : 'left'}: 6px;">${expenses.length}</span>
          </div>
          <div>
            <span style="font-size: 13px; font-weight: bold; color: #854d0e;">${isAr ? 'إجمالي قيمة المصروفات:' : 'Total Expense Amount:'}</span>
            <span style="font-size: 18px; font-weight: 900; color: #e11d48; margin-${isAr ? 'right' : 'left'}: 8px;">$${totalExpenseSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        <!-- Expenses Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #0f172a; color: #ffffff; font-weight: bold; font-size: 12px; text-align: ${isAr ? 'right' : 'left'};">
              <th style="padding: 10px; border: 1px solid #0f172a; text-align: center;">#</th>
              <th style="padding: 10px; border: 1px solid #0f172a;">${isAr ? 'البيان / الوصف' : 'Description'}</th>
              <th style="padding: 10px; border: 1px solid #0f172a; text-align: center;">${isAr ? 'التصنيف' : 'Category'}</th>
              <th style="padding: 10px; border: 1px solid #0f172a; text-align: center;">${isAr ? 'المصدر' : 'Source'}</th>
              <th style="padding: 10px; border: 1px solid #0f172a; text-align: center;">${isAr ? 'التاريخ' : 'Date'}</th>
              <th style="padding: 10px; border: 1px solid #0f172a; text-align: right;">${isAr ? 'المبلغ ($)' : 'Amount ($)'}</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml.length > 0 ? rowsHtml : `
              <tr>
                <td colspan="6" style="padding: 20px; text-align: center; color: #64748b; font-weight: bold;">
                  ${isAr ? 'لا توجد مصروفات مسجلة في هذه الفترة' : 'No expenses logged for this period'}
                </td>
              </tr>
            `}
            <tr style="background-color: #fef08a; font-weight: bold; border-top: 2px solid #ca8a04;">
              <td colspan="5" style="padding: 10px; border: 1px solid #cbd5e1; text-align: ${isAr ? 'left' : 'right'}; font-size: 13px;">${isAr ? 'المجموع الإجمالي للمصروفات:' : 'Total Expenses Sum:'}</td>
              <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: right; font-size: 15px; color: #e11d48; font-weight: 900;">$${totalExpenseSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>

        <!-- Signatures & Footer -->
        <div style="margin-top: 30px; display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; color: #475569; border-top: 1px solid #e2e8f0; padding-top: 16px;">
          <div>${isAr ? 'توقيع المحاسب المسئول' : 'Accountant Signature'}: __________________</div>
          <div>${isAr ? 'اعتماد مدير الفرع / المالك' : 'Manager / Owner Approval'}: __________________</div>
        </div>

        <div style="text-align: center; font-size: 10px; color: #94a3b8; margin-top: 20px; border-top: 1px solid #f1f5f9; padding-top: 10px;">
          تواصل: 01010103777 / 01010606016 - ${isAr ? 'مركز الأنصاري لصيانة السيارات' : 'El Ansary Car Service Center'}
        </div>
      </div>
    `;

    printContent(html, isAr ? 'rtl' : 'ltr');
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
            {t('dailyExpenses')}
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-yellow-400 text-black font-bold border border-yellow-500/40">
              {branchTitle}
            </span>
          </h1>
          <p className="text-xs text-zinc-500 mt-1">{t('expensesSubtitle') || 'Log and filter operating shop expenses'}</p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={handlePrintExpenses}
            className="inline-flex items-center space-x-2 rtl:space-x-reverse px-4 py-2.5 rounded-xl font-bold text-xs text-zinc-900 bg-white hover:bg-zinc-100 border border-zinc-300 shadow-sm transition-all"
            title={language === 'ar' ? 'طباعة تقرير المصروفات' : 'Print Expenses Report'}
          >
            <Printer className="w-4 h-4 text-amber-600" />
            <span>{language === 'ar' ? 'طباعة التقرير' : 'Print Report'}</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center space-x-2 rtl:space-x-reverse px-4 py-2.5 rounded-xl font-bold text-xs text-black bg-yellow-400 hover:bg-yellow-500 shadow-md shadow-yellow-400/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{t('logExpense') || t('addNew')}</span>
          </button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold text-zinc-600 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-amber-600" />
            {t('filterByDate')}:
          </span>
          <button
            onClick={() => setFilterPreset('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              filterPreset === 'all' ? 'bg-yellow-400 text-black shadow-sm' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            {t('allTime')}
          </button>
          <button
            onClick={() => setFilterPreset('today')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              filterPreset === 'today' ? 'bg-yellow-400 text-black shadow-sm' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            {t('today')}
          </button>
          <button
            onClick={() => setFilterPreset('month')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              filterPreset === 'month' ? 'bg-yellow-400 text-black shadow-sm' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            {t('thisMonth')}
          </button>
          <button
            onClick={() => setFilterPreset('custom')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              filterPreset === 'custom' ? 'bg-yellow-400 text-black shadow-sm' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
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
              className="bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-1.5 text-zinc-900 font-medium focus:bg-white focus:border-yellow-500"
            />
            <span className="text-zinc-400 font-bold">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-1.5 text-zinc-900 font-medium focus:bg-white focus:border-yellow-500"
            />
          </div>
        )}
      </div>

      {/* Summary White Primary Card */}
      <div className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-zinc-500 uppercase">{t('totalExpenses')}</p>
          <p className="text-3xl font-black text-rose-600 mt-1">${totalExpenseSum.toLocaleString()}</p>
        </div>
        <div className="p-3.5 rounded-2xl bg-black text-yellow-400 shadow-md">
          <DollarSign className="w-7 h-7" />
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-sm">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-400"></div>
          </div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 text-xs font-medium">
            {t('noRecordsFound')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right text-xs text-zinc-800">
              <thead className="bg-zinc-900 text-white font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-xl rtl:rounded-r-xl rtl:rounded-l-none">{t('id')}</th>
                  <th className="p-3">{t('description')}</th>
                  <th className="p-3">{t('category')}</th>
                  <th className="p-3">{t('amount')} ($)</th>
                  <th className="p-3">Source</th>
                  <th className="p-3">{t('date')}</th>
                  <th className="p-3 text-right rtl:text-left rounded-r-xl rtl:rounded-l-xl rtl:rounded-r-none">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-yellow-50/50 transition-colors">
                    <td className="p-3 font-bold text-zinc-900">#{e.id}</td>
                    <td className="p-3 text-zinc-900 font-bold">{e.description || 'General Expense'}</td>
                    <td className="p-3 text-zinc-700">
                      <span className="px-2.5 py-0.5 rounded-md bg-zinc-100 border border-zinc-200 font-bold">
                        {e.category || 'General'}
                      </span>
                    </td>
                    <td className="p-3 font-extrabold text-rose-600">
                      ${Number(e.amount || 0).toLocaleString()}
                    </td>
                    <td className="p-3 text-zinc-600 font-bold">
                      {e.from_ohda ? (
                        <span className="text-amber-700 font-bold">Drawn from Ohda</span>
                      ) : e.from_cash ? (
                        <span className="text-emerald-700 font-bold">Cash Till</span>
                      ) : (
                        'Other'
                      )}
                    </td>
                    <td className="p-3 text-zinc-500">{e.date || 'N/A'}</td>
                    <td className="p-3 text-right rtl:text-left">
                      <button
                        onClick={() => handleDeleteExpense(e.id)}
                        className="p-1.5 hover:bg-rose-50 rounded-lg text-zinc-400 hover:text-rose-600 transition-colors"
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

      {/* Add Expense Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title={t('logExpense') || 'Log Expense'}>
        <form onSubmit={handleCreateExpense} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">{t('description')} *</label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Electricity bill, Sandpaper supply"
              className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3.5 py-2 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-yellow-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">{t('amount')} ($) *</label>
              <input
                type="number"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3.5 py-2 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-yellow-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">{t('category')}</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3.5 py-2 text-xs text-zinc-900 font-bold focus:bg-white focus:outline-none focus:border-yellow-500"
              >
                <option value="عام">عام (General)</option>
                <option value="مرتبات">مرتبات (Salaries)</option>
                <option value="صيانة">صيانة (Maintenance)</option>
                <option value="مستلزمات">مستلزمات (Supplies)</option>
                <option value="مرافق">مرافق / فواتير (Utilities)</option>
                <option value="أخرى">أخرى (Other)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">{t('date')}</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3.5 py-2 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-yellow-500"
            />
          </div>

          {branchId === 'body-shop' && (
            <div className="flex items-center space-x-2 rtl:space-x-reverse pt-2">
              <input
                type="checkbox"
                id="fromOhda"
                checked={fromOhda}
                onChange={(e) => setFromOhda(e.target.checked)}
                className="rounded border-zinc-300 text-yellow-500 focus:ring-0"
              />
              <label htmlFor="fromOhda" className="text-xs text-zinc-700 font-bold">
                Expense drawn directly from Ohda balance (العُهدة)
              </label>
            </div>
          )}

          <div className="flex justify-end space-x-3 rtl:space-x-reverse pt-4 border-t border-zinc-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs text-zinc-600 hover:bg-zinc-100 font-bold"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-black bg-yellow-400 hover:bg-yellow-500 shadow-md"
            >
              {submitting ? 'Saving...' : t('save')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
