'use client';

import React, { useState, useEffect } from 'react';
import {
  WeeklyExpense,
  getWeeklyExpenses,
  addWeeklyExpense,
  updateWeeklyExpense,
  deleteWeeklyExpense,
  getMondayToSaturdayWeek,
  getRepairs,
  getExpenses,
  Repair,
  Expense,
} from '@/lib/shared/queries';
import { Modal } from '@/components/shared/Modal';
import { useTranslation } from '@/lib/i18n/context';
import { printContent } from '@/lib/utils/print';
import {
  DollarSign,
  Plus,
  Trash2,
  Pencil,
  Calendar,
  Printer,
  TrendingUp,
  TrendingDown,
  Wallet,
  Users,
  ShoppingBag,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  FileText,
} from 'lucide-react';


export default function WeeklyExpensesPage() {
  const { t, language } = useTranslation();
  const isAr = language === 'ar';

  // Week range: default to current week (Monday to Saturday)
  const defaultWeek = getMondayToSaturdayWeek();
  const [startDate, setStartDate] = useState(defaultWeek.weekStart);
  const [endDate, setEndDate] = useState(defaultWeek.weekEnd);

  // Data states
  const [weeklyExpenses, setWeeklyExpenses] = useState<WeeklyExpense[]>([]);
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [dailyExpenses, setDailyExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTypeFilter, setActiveTypeFilter] = useState<'all' | 'salary' | 'supplier_payment' | 'other'>('all');

  // Add Weekly Expense Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('عام');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit Weekly Expense Modal State
  const [editingExpense, setEditingExpense] = useState<WeeklyExpense | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('عام');
  const [editDate, setEditDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  const openEditModal = (expense: WeeklyExpense) => {
    setEditingExpense(expense);
    setEditDesc(expense.description || '');
    setEditAmount(String(expense.amount || ''));
    setEditCategory(expense.category || 'عام');
    setEditDate(expense.date || new Date().toISOString().split('T')[0]);
    setEditNotes(expense.notes || '');
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;
    if (!editAmount || Number(editAmount) <= 0) return;
    setEditSubmitting(true);
    await updateWeeklyExpense(editingExpense.id, {
      description: editDesc || (isAr ? 'مصروف تشغيلي' : 'Operating Expense'),
      amount: Number(editAmount),
      category: editCategory || 'عام',
      date: editDate || editingExpense.date,
      notes: editNotes || null,
    });
    setEditSubmitting(false);
    setEditingExpense(null);
    loadData();
  };

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  async function loadData() {
    setLoading(true);
    const [wData, rData, dData] = await Promise.all([
      getWeeklyExpenses('main-shop', startDate, endDate),
      getRepairs('main-shop', startDate, endDate),
      getExpenses('main-shop', startDate, endDate),
    ]);

    setWeeklyExpenses(wData);
    setRepairs(rData.filter((r) => r.payment_method !== 'Deleted'));
    setDailyExpenses(dData);
    setLoading(false);
  }

  // Week Navigation Helpers
  const shiftWeek = (offsetDays: number) => {
    const curStart = new Date(startDate);
    curStart.setDate(curStart.getDate() + offsetDays);
    const newRange = getMondayToSaturdayWeek(curStart);
    setStartDate(newRange.weekStart);
    setEndDate(newRange.weekEnd);
  };

  const jumpToCurrentWeek = () => {
    const range = getMondayToSaturdayWeek();
    setStartDate(range.weekStart);
    setEndDate(range.weekEnd);
  };

  // Calculations
  const totalWeeklyOperatingExpenses = weeklyExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  const totalDailyExpensesForWeek = dailyExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  const totalWeeklyRevenue = repairs.reduce((acc, r) => acc + (Number(r.paid_amount) || 0), 0);

  // Breakdown of weekly operating expenses
  const salariesTotal = weeklyExpenses
    .filter((e) => e.type === 'salary')
    .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

  const supplierPaymentsTotal = weeklyExpenses
    .filter((e) => e.type === 'supplier_payment')
    .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

  const otherOperatingTotal = weeklyExpenses
    .filter((e) => e.type !== 'salary' && e.type !== 'supplier_payment')
    .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

  // Net Profit for Week = Total Revenue - Weekly Operating Expenses - Daily Expenses
  const netWeeklyProfit = totalWeeklyRevenue - totalWeeklyOperatingExpenses - totalDailyExpensesForWeek;

  // Breakdown by payment methods for repairs
  let cashIncome = 0;
  let instapayIncome = 0;
  let bankAlahlyIncome = 0;
  let bankMasrIncome = 0;
  let vodafoneIncome = 0;
  let payByPartsPaid = 0;
  let splitIncome = 0;

  repairs.forEach((r) => {
    const method = r.payment_method || 'Cash';
    const paid = Number(r.paid_amount) || 0;

    if (method === 'Cash') cashIncome += paid;
    else if (method === 'Instapay') instapayIncome += paid;
    else if (method === 'Bank Alahly') bankAlahlyIncome += paid;
    else if (method === 'Bank Masr') bankMasrIncome += paid;
    else if (method === 'Vodafone Cash') vodafoneIncome += paid;
    else if (method === 'PayByParts') payByPartsPaid += paid;
    else if (method === 'SplitPayment') {
      splitIncome += paid;
      if (r.notes && r.notes.includes('__SPLIT__:')) {
        try {
          const splitObj = JSON.parse(r.notes.substring(r.notes.indexOf('__SPLIT__:') + 10));
          if (splitObj.method1 === 'Cash') cashIncome += Number(splitObj.amount1) || 0;
          if (splitObj.method2 === 'Cash') cashIncome += Number(splitObj.amount2) || 0;
        } catch (e) {}
      }
    }
  });

  const cashDailyExpenses = dailyExpenses
    .filter((e) => e.from_cash !== false)
    .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  const netCashInDrawer = cashIncome - cashDailyExpenses;

  // Filtered weekly expenses
  const filteredWeeklyExpenses = weeklyExpenses.filter((e) => {
    if (activeTypeFilter === 'salary') return e.type === 'salary';
    if (activeTypeFilter === 'supplier_payment') return e.type === 'supplier_payment';
    if (activeTypeFilter === 'other') return e.type !== 'salary' && e.type !== 'supplier_payment';
    return true;
  });

  const handleCreateWeeklyExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;

    setSubmitting(true);
    await addWeeklyExpense({
      branch_id: 'main-shop',
      type: 'manual',
      category: category || 'عام',
      description: desc || (isAr ? 'مصروف تشغيلي' : 'Operating Expense'),
      amount: Number(amount),
      date: date || new Date().toISOString().split('T')[0],
      week_start: startDate,
      week_end: endDate,
      notes: notes || null,
    });

    setSubmitting(false);
    setDesc('');
    setAmount('');
    setCategory('عام');
    setNotes('');
    setIsAddModalOpen(false);
    loadData();
  };

  const handleDeleteItem = async (id: number) => {
    if (confirm(isAr ? 'هل أنت متأكد من حذف هذا المصروف الأسبوعي؟' : 'Are you sure you want to delete this weekly expense?')) {
      await deleteWeeklyExpense(id);
      loadData();
    }
  };

  const handlePrintWeeklyReport = () => {
    const todayStr = new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US');

    const expensesRowsHtml = weeklyExpenses.length === 0
      ? '<tr><td colspan="5" style="text-align:center; padding: 12px; color:#94a3b8;">لا توجد مصاريف تشغيل أسبوعية مسجلة لهذا الأسبوع</td></tr>'
      : weeklyExpenses
          .map((e) => {
            const typeLabel =
              e.type === 'salary'
                ? 'راتب موظف'
                : e.type === 'supplier_payment'
                ? 'دفعة مورد'
                : 'مصروف تشغيلي';

            return `
              <tr>
                <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">#${e.id}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">${e.description || '-'}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;"><span style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 11px;">${typeLabel}</span></td>
                <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; color: #475569;">${e.date}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: left; font-weight: bold; color: #dc2626;">$${Number(e.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            `;
          })
          .join('');

    const html = `
      <div style="direction: rtl; font-family: system-ui, -apple-system, sans-serif; color: #09090b; padding: 20px;">
        <!-- Header -->
        <div style="text-align: center; border-bottom: 2px solid #ca8a04; padding-bottom: 15px; margin-bottom: 20px;">
          <h2 style="font-size: 24px; font-weight: 900; margin: 0; color: #09090b;">مركز الأنصاري لصيانة وإصلاح السيارات</h2>
          <h3 style="font-size: 16px; margin: 6px 0; color: #ca8a04;">تقرير مصاريف التشغيل والأرباح الأسبوعية</h3>
          <p style="font-size: 13px; color: #64748b; margin: 0;">دورة الأسبوع (من الاثنين إلى السبت): من ${startDate} إلى ${endDate}</p>
        </div>

        <!-- Summary KPIs -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px;">
          <div style="padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; text-align: center; background: #f0fdf4;">
            <div style="font-size: 11px; color: #15803d; font-weight: bold;">إجمالي إيرادات الأسبوع</div>
            <div style="font-size: 18px; font-weight: 900; color: #16a34a; margin-top: 4px;">$${totalWeeklyRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div style="font-size: 10px; color: #64748b; margin-top: 2px;">${repairs.length} فاتورة</div>
          </div>

          <div style="padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; text-align: center; background: #fff1f2;">
            <div style="font-size: 11px; color: #be123c; font-weight: bold;">مصاريف التشغيل الأسبوعية</div>
            <div style="font-size: 18px; font-weight: 900; color: #e11d48; margin-top: 4px;">$${totalWeeklyOperatingExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div style="font-size: 10px; color: #64748b; margin-top: 2px;">(رواتب + موردين + تشغيل)</div>
          </div>

          <div style="padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; text-align: center; background: #fefce8;">
            <div style="font-size: 11px; color: #854d0e; font-weight: bold;">المصروفات اليومية للأسبوع</div>
            <div style="font-size: 18px; font-weight: 900; color: #ca8a04; margin-top: 4px;">$${totalDailyExpensesForWeek.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div style="font-size: 10px; color: #64748b; margin-top: 2px;">(جدول المصروفات اليومية)</div>
          </div>

          <div style="padding: 12px; border: 2px solid #ca8a04; border-radius: 8px; text-align: center; background: #fef08a;">
            <div style="font-size: 11px; color: #854d0e; font-weight: 900;">صافي أرباح الأسبوع</div>
            <div style="font-size: 20px; font-weight: 900; color: #000; margin-top: 4px;">$${netWeeklyProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div style="font-size: 10px; color: #854d0e; margin-top: 2px;">الإيراد - المصاريف</div>
          </div>
        </div>

        <!-- Weekly Operating Expenses Details -->
        <h4 style="font-size: 14px; font-weight: bold; margin-bottom: 8px; color: #0f172a;">تفاصيل مصاريف التشغيل الأسبوعية (${weeklyExpenses.length} بند):</h4>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; text-align: right; font-size: 12px;">
          <thead>
            <tr style="background: #0f172a; color: white;">
              <th style="padding: 8px; border: 1px solid #0f172a; text-align: center;">#</th>
              <th style="padding: 8px; border: 1px solid #0f172a;">البيان / الوصف</th>
              <th style="padding: 8px; border: 1px solid #0f172a; text-align: center;">التصنيف</th>
              <th style="padding: 8px; border: 1px solid #0f172a; text-align: center;">التاريخ</th>
              <th style="padding: 8px; border: 1px solid #0f172a; text-align: left;">المبلغ ($)</th>
            </tr>
          </thead>
          <tbody>
            ${expensesRowsHtml}
          </tbody>
        </table>

        <!-- Summary Totals Section -->
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; margin-bottom: 30px; font-size: 12px; line-height: 1.8;">
          <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #cbd5e1; padding-bottom: 6px;">
            <span>إجمالي الرواتب المحولة للأسبوع:</span>
            <span style="font-weight: bold; color: #e11d48;">$${salariesTotal.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #cbd5e1; padding-bottom: 6px; padding-top: 6px;">
            <span>إجمالي دفعات الموردين المحولة للأسبوع:</span>
            <span style="font-weight: bold; color: #e11d48;">$${supplierPaymentsTotal.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #cbd5e1; padding-bottom: 6px; padding-top: 6px;">
            <span>مصاريف تشغيلية أخرى:</span>
            <span style="font-weight: bold; color: #e11d48;">$${otherOperatingTotal.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-weight: 900; font-size: 14px; padding-top: 8px; color: #0f172a;">
            <span>صافي ربح الأسبوع النهائي:</span>
            <span style="color: #16a34a;">$${netWeeklyProfit.toFixed(2)}</span>
          </div>
        </div>

        <!-- Footer -->
        <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; color: #64748b; border-top: 1px solid #cbd5e1; padding-top: 15px;">
          <div>تاريخ الطباعة: ${todayStr}</div>
          <div>تواصل: 01010103777 / 01010606016</div>
          <div>توقيع المدير / المحاسب: _______________________</div>
        </div>
      </div>
    `;
    printContent(html, 'rtl');
  };

  const isCurrentWeek = startDate === defaultWeek.weekStart && endDate === defaultWeek.weekEnd;

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Page Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-yellow-500" />
            <span>{isAr ? 'مصاريف تشغيل أسبوعية' : 'Weekly Operating Expenses'}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-yellow-400 text-black font-bold border border-yellow-500/40">
              {isAr ? 'الفرع الرئيسي' : 'Main Shop'}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isAr
              ? 'دورة الأسبوع (من الاثنين إلى السبت شاملين) - حساب صافي أرباح الأسبوع، الرواتب، ودفعات الموردين دون التأثير على اليومية'
              : 'Weekly operating cycle (Monday to Saturday) - Net profit calculation, salaries, and supplier payments excluded from daily drawer'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 rounded-xl font-bold text-xs text-black bg-yellow-400 hover:bg-yellow-500 transition-all flex items-center gap-1.5 shadow-md shadow-yellow-400/20"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? 'تسجيل مصروف تشغيلي' : 'Add Operating Expense'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrintWeeklyReport}
            className="px-4 py-2.5 rounded-xl font-bold text-xs text-zinc-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>{isAr ? 'طباعة تقرير الأسبوع' : 'Print Weekly Report'}</span>
          </button>
        </div>
      </div>

      {/* Week Navigator Bar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => shiftWeek(-7)}
            className="px-3 py-2 rounded-xl font-bold bg-slate-100 hover:bg-slate-200 text-zinc-800 transition-all flex items-center gap-1"
            title={isAr ? 'الأسبوع السابق' : 'Previous Week'}
          >
            <ChevronRight className="w-4 h-4 rtl:rotate-0 rotate-180" />
            <span>{isAr ? 'الأسبوع السابق' : 'Prev Week'}</span>
          </button>

          <button
            type="button"
            onClick={jumpToCurrentWeek}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all ${
              isCurrentWeek ? 'bg-zinc-900 text-white shadow-sm' : 'bg-slate-100 text-zinc-700 hover:bg-slate-200'
            }`}
          >
            {isAr ? 'الأسبوع الحالي' : 'Current Week'}
          </button>

          <button
            type="button"
            onClick={() => shiftWeek(7)}
            className="px-3 py-2 rounded-xl font-bold bg-slate-100 hover:bg-slate-200 text-zinc-800 transition-all flex items-center gap-1"
            title={isAr ? 'الأسبوع التالي' : 'Next Week'}
          >
            <span>{isAr ? 'الأسبوع التالي' : 'Next Week'}</span>
            <ChevronLeft className="w-4 h-4 rtl:rotate-0 rotate-180" />
          </button>
        </div>

        {/* Date Inputs */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-zinc-500 font-bold">{isAr ? 'دورة الأسبوع: من الاثنين' : 'Week: From Mon'}</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-zinc-900 font-bold focus:outline-none focus:border-yellow-400"
          />
          <span className="text-zinc-500 font-bold">{isAr ? 'إلى السبت' : 'To Sat'}</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-zinc-900 font-bold focus:outline-none focus:border-yellow-400"
          />
        </div>
      </div>

      {/* 5 Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Weekly Income */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">{isAr ? 'إجمالي دخل الأسبوع' : 'Weekly Income'}</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">${totalWeeklyRevenue.toLocaleString()}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{repairs.length} {isAr ? 'فاتورة صيانة' : 'invoices'}</p>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 shadow-sm">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Weekly Operating Expenses */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">{isAr ? 'مصاريف التشغيل الأسبوعية' : 'Weekly Expenses'}</p>
            <p className="text-2xl font-black text-rose-600 mt-1">${totalWeeklyOperatingExpenses.toLocaleString()}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{weeklyExpenses.length} {isAr ? 'بند مصروف' : 'items'}</p>
          </div>
          <div className="p-3 rounded-2xl bg-rose-50 text-rose-600 shadow-sm">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        {/* Daily Expenses for Week */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">{isAr ? 'المصروفات اليومية للأسبوع' : 'Daily Expenses (Wk)'}</p>
            <p className="text-2xl font-black text-amber-600 mt-1">${totalDailyExpensesForWeek.toLocaleString()}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{dailyExpenses.length} {isAr ? 'مصروف يومي' : 'items'}</p>
          </div>
          <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 shadow-sm">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        {/* Weekly Net Profit */}
        <div className="bg-white rounded-2xl p-5 border-2 border-yellow-400 shadow-md flex items-center justify-between bg-yellow-50/30">
          <div>
            <p className="text-xs font-black text-zinc-900 uppercase">{isAr ? 'صافي أرباح الأسبوع' : 'Net Weekly Profit'}</p>
            <p className="text-2xl font-black text-zinc-950 mt-1">${netWeeklyProfit.toLocaleString()}</p>
            <p className="text-[10px] text-amber-800 font-bold mt-0.5">{isAr ? 'الدخل - التشغيل - اليومية' : 'Income - Expenses'}</p>
          </div>
          <div className="p-3 rounded-2xl bg-yellow-400 text-zinc-900 shadow-sm">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        {/* Net Cash in Drawer */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">{isAr ? 'صافي كاش الخزينة' : 'Net Cash Till'}</p>
            <p className="text-2xl font-black text-zinc-900 mt-1">${netCashInDrawer.toLocaleString()}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{isAr ? 'المقبوض كاش - مدفوع كاش' : 'Cash in - Cash out'}</p>
          </div>
          <div className="p-3 rounded-2xl bg-zinc-900 text-yellow-400 shadow-sm">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Income Breakdown by Payment Method */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-yellow-500" />
          <span>{isAr ? 'توزيع مقبوضات الأسبوع حسب طريقة الدفع' : 'Weekly Income by Payment Method'}</span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <p className="text-slate-500 font-semibold mb-1">{t('cash')}</p>
            <p className="text-base font-black text-zinc-900">${cashIncome.toLocaleString()}</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <p className="text-slate-500 font-semibold mb-1">{t('instapay')}</p>
            <p className="text-base font-black text-indigo-600">${instapayIncome.toLocaleString()}</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <p className="text-slate-500 font-semibold mb-1">{t('bankAlahly')}</p>
            <p className="text-base font-black text-emerald-600">${bankAlahlyIncome.toLocaleString()}</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <p className="text-slate-500 font-semibold mb-1">{t('bankMasr')}</p>
            <p className="text-base font-black text-blue-600">${bankMasrIncome.toLocaleString()}</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <p className="text-slate-500 font-semibold mb-1">{t('vodafoneCash')}</p>
            <p className="text-base font-black text-rose-600">${vodafoneIncome.toLocaleString()}</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <p className="text-slate-500 font-semibold mb-1">{t('payByParts')}</p>
            <p className="text-base font-black text-amber-600">${(payByPartsPaid + splitIncome).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Weekly Operating Expenses Breakdown Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-zinc-900">{isAr ? 'رواتب الموظفين المحولة للأسبوع' : 'Weekly Salaries Pushed'}</p>
              <p className="text-slate-500 text-[11px]">{weeklyExpenses.filter((e) => e.type === 'salary').length} {isAr ? 'موظف' : 'items'}</p>
            </div>
          </div>
          <p className="text-lg font-black text-indigo-600">${salariesTotal.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 font-bold">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-zinc-900">{isAr ? 'دفعات الموردين المحولة للأسبوع' : 'Supplier Payments Pushed'}</p>
              <p className="text-slate-500 text-[11px]">{weeklyExpenses.filter((e) => e.type === 'supplier_payment').length} {isAr ? 'دفعة' : 'payments'}</p>
            </div>
          </div>
          <p className="text-lg font-black text-amber-600">${supplierPaymentsTotal.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-zinc-900">{isAr ? 'مصاريف تشغيلية أخرى للأسبوع' : 'Other Operating Expenses'}</p>
              <p className="text-slate-500 text-[11px]">{weeklyExpenses.filter((e) => e.type !== 'salary' && e.type !== 'supplier_payment').length} {isAr ? 'بند' : 'items'}</p>
            </div>
          </div>
          <p className="text-lg font-black text-rose-600">${otherOperatingTotal.toLocaleString()}</p>
        </div>
      </div>

      {/* Weekly Expenses Table Section */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-yellow-500" />
            <span>{isAr ? 'جدول مصاريف التشغيل الأسبوعية' : 'Weekly Expenses Log'} ({filteredWeeklyExpenses.length})</span>
          </h2>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setActiveTypeFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                activeTypeFilter === 'all' ? 'bg-zinc-900 text-white shadow-sm' : 'bg-slate-100 text-zinc-600 hover:bg-slate-200'
              }`}
            >
              {isAr ? 'الكل' : 'All'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTypeFilter('salary')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                activeTypeFilter === 'salary' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-zinc-600 hover:bg-slate-200'
              }`}
            >
              {isAr ? 'الرواتب' : 'Salaries'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTypeFilter('supplier_payment')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                activeTypeFilter === 'supplier_payment' ? 'bg-amber-600 text-white shadow-sm' : 'bg-slate-100 text-zinc-600 hover:bg-slate-200'
              }`}
            >
              {isAr ? 'دفعات الموردين' : 'Suppliers'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTypeFilter('other')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                activeTypeFilter === 'other' ? 'bg-rose-600 text-white shadow-sm' : 'bg-slate-100 text-zinc-600 hover:bg-slate-200'
              }`}
            >
              {isAr ? 'أخرى' : 'Other'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-400"></div>
          </div>
        ) : filteredWeeklyExpenses.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs font-medium space-y-2">
            <p>{isAr ? 'لا توجد مصاريف تشغيل أسبوعية مسجلة لهذه الفترة.' : 'No weekly operating expenses recorded for this period.'}</p>
            <p className="text-[11px] text-slate-400">
              {isAr
                ? 'يمكنك الضغط على زر "ترحيل جميع الرواتب" من تبويب المرتبات، أو تسجيل دفعة مورد، أو الضغط على "تسجيل مصروف تشغيلي" أعلاه.'
                : 'You can push salaries from Salaries tab, record a supplier payment, or click "Add Operating Expense" above.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left rtl:text-right text-xs">
              <thead className="bg-zinc-900 text-white font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">#</th>
                  <th className="p-3.5">{isAr ? 'البيان / الوصف' : 'Description'}</th>
                  <th className="p-3.5 text-center">{isAr ? 'النوع والتصنيف' : 'Type / Category'}</th>
                  <th className="p-3.5 text-center">{isAr ? 'التاريخ' : 'Date'}</th>
                  <th className="p-3.5 text-right rtl:text-left">{isAr ? 'المبلغ' : 'Amount'} ($)</th>
                  <th className="p-3.5">{isAr ? 'ملاحظات' : 'Notes'}</th>
                  <th className="p-3.5 text-center">{isAr ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredWeeklyExpenses.map((e) => {
                  const isSalary = e.type === 'salary';
                  const isSupplier = e.type === 'supplier_payment';

                  return (
                    <tr key={e.id} className="hover:bg-yellow-50/40 transition-colors">
                      <td className="p-3.5 font-bold text-zinc-900">#{e.id}</td>
                      <td className="p-3.5 font-bold text-zinc-900">{e.description || '-'}</td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black ${
                            isSalary
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : isSupplier
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {isSalary
                            ? isAr ? 'راتب موظف' : 'Salary'
                            : isSupplier
                            ? isAr ? 'دفعة مورد' : 'Supplier Payment'
                            : e.category || (isAr ? 'تشغيلي' : 'Operating')}
                        </span>
                      </td>
                      <td className="p-3.5 text-center text-slate-500 font-medium">{e.date}</td>
                      <td className="p-3.5 text-right rtl:text-left font-black text-rose-600 text-sm">
                        ${Number(e.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 text-slate-500 text-[11px] max-w-xs truncate">{e.notes || '-'}</td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(e)}
                            className="p-1.5 text-slate-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                            title={isAr ? 'تعديل' : 'Edit'}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(e.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title={isAr ? 'حذف' : 'Delete'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: ADD MANUAL WEEKLY EXPENSE */}
      {isAddModalOpen && (
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title={isAr ? 'تسجيل مصروف تشغيلي أسبوعي' : 'Add Weekly Operating Expense'}
          maxWidth="md"
        >
          <form onSubmit={handleCreateWeeklyExpense} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-zinc-800 mb-1">{isAr ? 'البيان / الوصف' : 'Description'} *</label>
              <input
                type="text"
                required
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder={isAr ? 'مثال: صيانة معدات، فواتير تشغيل، إيجار أسبوعي...' : 'e.g. Equipment maintenance, rent...'}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-zinc-900 font-medium focus:bg-white focus:outline-none focus:border-yellow-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-zinc-800 mb-1">{isAr ? 'المبلغ ($)' : 'Amount ($)'} *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-zinc-900 font-bold focus:bg-white focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-800 mb-1">{isAr ? 'التصنيف' : 'Category'}</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-zinc-900 font-bold focus:bg-white focus:outline-none focus:border-yellow-400"
                >
                  <option value="عام">{isAr ? 'عام' : 'General'}</option>
                  <option value="صيانة">{isAr ? 'صيانة وتشغيل' : 'Maintenance'}</option>
                  <option value="مستلزمات">{isAr ? 'مستلزمات ورشة' : 'Supplies'}</option>
                  <option value="فواتير">{isAr ? 'فواتير ومرافق' : 'Utilities'}</option>
                  <option value="إيجار">{isAr ? 'إيجار' : 'Rent'}</option>
                  <option value="أخرى">{isAr ? 'أخرى' : 'Other'}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-zinc-800 mb-1">{isAr ? 'التاريخ' : 'Date'}</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-zinc-900 font-bold focus:bg-white focus:outline-none focus:border-yellow-400"
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-800 mb-1">{isAr ? 'ملاحظات إضافية' : 'Notes'}</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={isAr ? 'أي تفاصيل اختيارية...' : 'Optional details...'}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-zinc-900 font-medium focus:bg-white focus:outline-none focus:border-yellow-400"
              />
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
              {isAr
                ? '💡 هذا المصروف سيُخصم من أرباح الأسبوع فقط، ولن يظهر في تقرير اليومية ولن يؤثر على درج الكاش اليومي.'
                : '💡 This expense is deducted from the weekly net profit only and will not affect today daily report.'}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-yellow-400 hover:bg-yellow-500 font-bold text-black rounded-xl shadow-md"
              >
                {submitting ? (isAr ? 'جارٍ الحفظ...' : 'Saving...') : (isAr ? 'حفظ المصروف' : 'Save Expense')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: EDIT WEEKLY EXPENSE */}
      {editingExpense && (
        <Modal
          isOpen={!!editingExpense}
          onClose={() => setEditingExpense(null)}
          title={isAr ? 'تعديل مصروف تشغيلي أسبوعي' : 'Edit Weekly Operating Expense'}
          maxWidth="md"
        >
          <form onSubmit={handleEditSave} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-zinc-800 mb-1">{isAr ? 'البيان / الوصف' : 'Description'} *</label>
              <input
                type="text"
                required
                value={editDesc}
                onChange={(ev) => setEditDesc(ev.target.value)}
                placeholder={isAr ? 'مثال: صيانة معدات، فواتير تشغيل...' : 'e.g. Equipment maintenance, rent...'}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-zinc-900 font-medium focus:bg-white focus:outline-none focus:border-yellow-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-zinc-800 mb-1">{isAr ? 'المبلغ ($)' : 'Amount ($)'} *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editAmount}
                  onChange={(ev) => setEditAmount(ev.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-zinc-900 font-bold focus:bg-white focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-800 mb-1">{isAr ? 'التصنيف' : 'Category'}</label>
                <select
                  value={editCategory}
                  onChange={(ev) => setEditCategory(ev.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-zinc-900 font-bold focus:bg-white focus:outline-none focus:border-yellow-400"
                >
                  <option value="عام">{isAr ? 'عام' : 'General'}</option>
                  <option value="صيانة">{isAr ? 'صيانة وتشغيل' : 'Maintenance'}</option>
                  <option value="مستلزمات">{isAr ? 'مستلزمات ورشة' : 'Supplies'}</option>
                  <option value="فواتير">{isAr ? 'فواتير ومرافق' : 'Utilities'}</option>
                  <option value="إيجار">{isAr ? 'إيجار' : 'Rent'}</option>
                  <option value="أخرى">{isAr ? 'أخرى' : 'Other'}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-zinc-800 mb-1">{isAr ? 'التاريخ' : 'Date'}</label>
              <input
                type="date"
                value={editDate}
                onChange={(ev) => setEditDate(ev.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-zinc-900 font-bold focus:bg-white focus:outline-none focus:border-yellow-400"
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-800 mb-1">{isAr ? 'ملاحظات إضافية' : 'Notes'}</label>
              <input
                type="text"
                value={editNotes}
                onChange={(ev) => setEditNotes(ev.target.value)}
                placeholder={isAr ? 'أي تفاصيل اختيارية...' : 'Optional details...'}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-zinc-900 font-medium focus:bg-white focus:outline-none focus:border-yellow-400"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingExpense(null)}
                className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={editSubmitting}
                className="px-6 py-2.5 bg-yellow-400 hover:bg-yellow-500 font-bold text-black rounded-xl shadow-md"
              >
                {editSubmitting ? (isAr ? 'جارٍ الحفظ...' : 'Saving...') : (isAr ? 'حفظ التعديلات' : 'Save Changes')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
