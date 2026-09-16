'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { StatCard } from '@/components/shared/StatCard';
import { getRepairs, getExpenses, Repair, Expense } from '@/lib/shared/queries';
import {
  FileText,
  DollarSign,
  PlusCircle,
  ArrowRight,
  Printer,
  Calendar,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Wallet,
  CheckCircle,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';
import { printContent } from '@/lib/utils/print';

export default function MainShopDashboardPage() {
  const { t, language } = useTranslation();

  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  async function loadData() {
    setLoading(true);
    const [rData, eData] = await Promise.all([
      getRepairs('main-shop', startDate, endDate),
      getExpenses('main-shop', startDate, endDate),
    ]);
    setRepairs(rData.filter((r) => r.payment_method !== 'Deleted'));
    setExpenses(eData);
    setLoading(false);
  }

  // Financial Calculations
  const totalIncome = repairs.reduce((acc, r) => acc + (Number(r.paid_amount) || 0), 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

  // Breakdown by payment method
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
      // Parse split payment details if stored in notes
      if (r.notes && r.notes.includes('__SPLIT__:')) {
        try {
          const splitObj = JSON.parse(r.notes.substring(r.notes.indexOf('__SPLIT__:') + 10));
          if (splitObj.method1 === 'Cash') cashIncome += Number(splitObj.amount1) || 0;
          if (splitObj.method2 === 'Cash') cashIncome += Number(splitObj.amount2) || 0;
        } catch (e) {}
      }
    }
  });

  // Calculate Net Cash Drawer = Cash In - Cash Out Expenses
  const cashExpenses = expenses.filter((e) => e.from_cash !== false).reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  const netCashInDrawer = cashIncome - cashExpenses;

  const handlePrintDailyReport = () => {
    // Group repairs by payment method
    const groupedIncome: { [key: string]: typeof repairs } = {};
    repairs.forEach((r) => {
      const pm = r.payment_method || 'Cash';
      if (!groupedIncome[pm]) groupedIncome[pm] = [];
      groupedIncome[pm].push(r);
    });

    let incomeRowsHtml = '';
    if (Object.keys(groupedIncome).length === 0) {
      incomeRowsHtml = '<tr><td colSpan="4" style="text-align:center; padding: 12px; color:#94a3b8;">لا توجد سجلات إيرادات</td></tr>';
    } else {
      for (const [pm, items] of Object.entries(groupedIncome)) {
        const methodTotal = items.reduce((sum, i) => sum + (Number(i.paid_amount) || 0), 0);
        const translatedMethod =
          pm === 'Cash'
            ? 'كاش'
            : pm === 'Instapay'
            ? 'إنستا باي'
            : pm === 'Bank Alahly'
            ? 'البنك الأهلي'
            : pm === 'Bank Masr'
            ? 'بنك مصر'
            : pm === 'Vodafone Cash'
            ? 'فودافون كاش'
            : pm === 'PayByParts'
            ? 'دفع مجزأ'
            : pm === 'SplitPayment'
            ? 'دفع متعدد'
            : pm;

        incomeRowsHtml += `
          <tr style="background: #f1f5f9; font-weight: bold;">
            <td colspan="3" style="padding: 8px; border: 1px solid #cbd5e1; color: #334155;">${translatedMethod} (المجموع)</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: left; color: #0d9488;">$${methodTotal.toFixed(2)}</td>
          </tr>
        `;

        items.forEach((i) => {
          const paid = Number(i.paid_amount) || 0;
          incomeRowsHtml += `
            <tr>
              <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">${i.customers?.name || 'عميل نقدي'}</td>
              <td style="padding: 8px; border: 1px solid #e2e8f0;">${i.description || '-'}</td>
              <td style="padding: 8px; border: 1px solid #e2e8f0;">
                <span style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-size: 11px;">${translatedMethod}</span>
              </td>
              <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: left; font-weight: bold; color: #16a34a;">$${paid.toFixed(2)}</td>
            </tr>
          `;
        });
      }
    }

    let expensesRowsHtml = '';
    if (expenses.length === 0) {
      expensesRowsHtml = '<tr><td colSpan="2" style="text-align:center; padding: 12px; color:#94a3b8;">لا توجد سجلات مصروفات</td></tr>';
    } else {
      expensesRowsHtml = expenses
        .map(
          (e) => `
        <tr>
          <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">${e.description || '-'}</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: left; font-weight: bold; color: #dc2626;">$${Number(e.amount || 0).toFixed(2)}</td>
        </tr>
      `
        )
        .join('');
    }

    const html = `
      <div style="direction: rtl; font-family: system-ui, sans-serif; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #0d9488; padding-bottom: 15px;">
          <h2 style="font-size: 24px; font-weight: bold; margin: 0; color: #0d9488;">مركز الأنصاري لصيانة السيارات</h2>
          <h3 style="font-size: 16px; margin: 5px 0; color: #475569;">تقرير المالية اليومي</h3>
          <p style="font-size: 13px; color: #64748b; margin: 0;">الفترة: من ${startDate} إلى ${endDate}</p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px;">
          <div style="padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; text-align: center; background: #f8fafc;">
            <div style="font-size: 11px; color: #64748b; font-weight: bold;">إجمالي الإيرادات</div>
            <div style="font-size: 18px; font-weight: bold; color: #16a34a; margin-top: 4px;">$${totalIncome.toFixed(2)}</div>
          </div>
          <div style="padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; text-align: center; background: #f8fafc;">
            <div style="font-size: 11px; color: #64748b; font-weight: bold;">إجمالي المصروفات</div>
            <div style="font-size: 18px; font-weight: bold; color: #dc2626; margin-top: 4px;">$${totalExpenses.toFixed(2)}</div>
          </div>
          <div style="padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; text-align: center; background: #fef08a;">
            <div style="font-size: 11px; color: #854d0e; font-weight: bold;">صافي الصندوق (كاش)</div>
            <div style="font-size: 18px; font-weight: bold; color: #000; margin-top: 4px;">$${netCashInDrawer.toFixed(2)}</div>
          </div>
        </div>

        <h4 style="font-size: 14px; font-weight: bold; margin-bottom: 8px;">توزيع المقبوضات حسب طرق الدفع:</h4>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; text-align: center; font-size: 12px;">
          <thead>
            <tr style="background: #f1f5f9;">
              <th style="padding: 8px; border: 1px solid #cbd5e1;">كاش</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1;">إنستا باي</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1;">البنك الأهلي</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1;">بنك مصر</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1;">فودافون كاش</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1;">دفع مجزأ / بالتقسيط</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">$${cashIncome.toFixed(2)}</td>
              <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">$${instapayIncome.toFixed(2)}</td>
              <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">$${bankAlahlyIncome.toFixed(2)}</td>
              <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">$${bankMasrIncome.toFixed(2)}</td>
              <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">$${vodafoneIncome.toFixed(2)}</td>
              <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">$${(payByPartsPaid + splitIncome).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <h4 style="font-size: 14px; font-weight: bold; margin-bottom: 8px; color: #0d9488;">تفاصيل الإيرادات:</h4>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; text-align: right; font-size: 12px;">
          <thead>
            <tr style="background: #0f172a; color: white;">
              <th style="padding: 8px; border: 1px solid #0f172a;">العميل</th>
              <th style="padding: 8px; border: 1px solid #0f172a;">الوصف</th>
              <th style="padding: 8px; border: 1px solid #0f172a;">طريقة الدفع</th>
              <th style="padding: 8px; border: 1px solid #0f172a; text-align: left;">المبلغ المدفوع</th>
            </tr>
          </thead>
          <tbody>
            ${incomeRowsHtml}
          </tbody>
        </table>

        <h4 style="font-size: 14px; font-weight: bold; margin-bottom: 8px; color: #dc2626;">تفاصيل المصروفات:</h4>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; text-align: right; font-size: 12px;">
          <thead>
            <tr style="background: #0f172a; color: white;">
              <th style="padding: 8px; border: 1px solid #0f172a;">البيان / الوصف</th>
              <th style="padding: 8px; border: 1px solid #0f172a; text-align: left;">المبلغ ($)</th>
            </tr>
          </thead>
          <tbody>
            ${expensesRowsHtml}
          </tbody>
        </table>

        <div style="margin-top: 30px; text-align: center; font-size: 12px; font-weight: bold; color: #475569; border-top: 1px solid #e2e8f0; padding-top: 12px;">
          تواصل: 01010103777 / 01010606016
        </div>
      </div>
    `;
    printContent(html, 'rtl');
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Page Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
            {t('mainShop')}
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-yellow-400 text-black font-bold border border-yellow-500/40">
              {language === 'ar' ? 'تقرير اليومية والتحليلات' : 'Daily Report & Overview'}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'ar' ? 'تقرير الإيرادات والمصروفات وصافي الصندوق لليومية' : 'Daily income, expenses, and cash drawer summary'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handlePrintDailyReport}
            className="px-4 py-2.5 rounded-xl font-bold text-xs text-zinc-900 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>{language === 'ar' ? 'طباعة التقرير اليومي' : 'Print Daily Report'}</span>
          </button>

          <Link
            href="/main-shop/repairs"
            className="inline-flex items-center space-x-2 rtl:space-x-reverse px-4 py-2.5 rounded-xl font-bold text-xs text-zinc-900 bg-yellow-400 hover:bg-yellow-500 shadow-md shadow-yellow-400/20 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t('newRepairInvoice')}</span>
          </Link>
        </div>
      </div>

      {/* Date Filter Controls */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2 font-bold text-zinc-800">
          <Calendar className="w-4 h-4 text-yellow-500" />
          <span>{t('filterByDate')}:</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setStartDate(todayStr);
              setEndDate(todayStr);
            }}
            className={`px-3 py-1.5 rounded-xl font-bold ${
              startDate === todayStr && endDate === todayStr
                ? 'bg-zinc-900 text-white'
                : 'bg-slate-100 text-zinc-700 hover:bg-slate-200'
            }`}
          >
            {t('today')}
          </button>

          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1 text-zinc-900 font-semibold focus:outline-none focus:border-yellow-400"
          />
          <span className="text-slate-400 font-bold">-</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1 text-zinc-900 font-semibold focus:outline-none focus:border-yellow-400"
          />
        </div>
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">{t('totalRevenue')}</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">${totalIncome.toLocaleString()}</p>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">{t('totalExpenses')}</p>
            <p className="text-2xl font-black text-rose-600 mt-1">${totalExpenses.toLocaleString()}</p>
          </div>
          <div className="p-3 rounded-2xl bg-rose-50 text-rose-600">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">{language === 'ar' ? 'صافي الدرج (كاش)' : 'Net Cash in Drawer'}</p>
            <p className="text-2xl font-black text-zinc-900 mt-1">${netCashInDrawer.toLocaleString()}</p>
          </div>
          <div className="p-3 rounded-2xl bg-yellow-400 text-zinc-900">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">{t('totalInvoicesCreated')}</p>
            <p className="text-2xl font-black text-zinc-900 mt-1">{repairs.length}</p>
          </div>
          <div className="p-3 rounded-2xl bg-zinc-900 text-yellow-400">
            <FileText className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Payment Method Breakdown Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-yellow-500" />
          <span>{language === 'ar' ? 'توزيع المقبوضات حسب طريقة الدفع' : 'Income Breakdown by Payment Method'}</span>
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
            <p className="text-base font-black text-amber-600">${payByPartsPaid.toLocaleString()}</p>
          </div>
        </div>
      </div>


      {/* Invoices List for Selected Range */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-yellow-500" />
            <span>{language === 'ar' ? 'فواتير الفترة المحددة' : 'Invoices in Period'} ({repairs.length})</span>
          </h2>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900 text-white font-bold uppercase">
              <tr>
                <th className="p-3.5">{t('id')}</th>
                <th className="p-3.5">{t('customer')}</th>
                <th className="p-3.5">{t('description')}</th>
                <th className="p-3.5 text-right">{t('totalRevenue')}</th>
                <th className="p-3.5 text-right">{t('paid')}</th>
                <th className="p-3.5">{t('paymentMethod')}</th>
                <th className="p-3.5">{t('date')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white font-medium text-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    {t('loading')}
                  </td>
                </tr>
              ) : repairs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    {t('noRecordsFound')}
                  </td>
                </tr>
              ) : (
                repairs.map((r) => (
                  <tr key={r.id} className="hover:bg-yellow-50/40">
                    <td className="p-3.5 font-bold text-yellow-600">#{r.id}</td>
                    <td className="p-3.5 font-bold text-zinc-900">{r.customers?.name || t('walkInCustomer')}</td>
                    <td className="p-3.5 text-slate-600 max-w-xs truncate">{r.description || '-'}</td>
                    <td className="p-3.5 text-right font-bold text-zinc-900">${Number(r.total_amount || 0).toLocaleString()}</td>
                    <td className="p-3.5 text-right font-black text-emerald-600">${Number(r.paid_amount || 0).toLocaleString()}</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 font-bold text-[11px]">
                        {r.payment_method || 'Cash'}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-500">{r.date || 'N/A'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
