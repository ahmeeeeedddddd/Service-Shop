'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { StatCard } from '@/components/shared/StatCard';
import {
  getCarExpenses,
  getExpenses,
  getOhdaRecords,
  CarExpense,
  Expense,
  OhdaRecord,
} from '@/lib/shared/queries';
import {
  Car,
  Wallet,
  FileText,
  Users,
  PlusCircle,
  ArrowRight,
  Printer,
  Calendar,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';
import { printContent } from '@/lib/utils/print';

export default function BodyShopDashboardPage() {
  const { t, language } = useTranslation();

  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  const [carExpenses, setCarExpenses] = useState<CarExpense[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [ohdaRecords, setOhdaRecords] = useState<OhdaRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  async function loadData() {
    setLoading(true);
    const [ceData, eData, oData] = await Promise.all([
      getCarExpenses('body-shop', startDate, endDate),
      getExpenses('body-shop', startDate, endDate),
      getOhdaRecords('body-shop', startDate, endDate),
    ]);
    setCarExpenses(ceData);
    setExpenses(eData);
    setOhdaRecords(oData);
    setLoading(false);
  }

  // Calculations
  const totalCarJobsCost = carExpenses.reduce((acc, c) => acc + (Number(c.total_cost) || 0), 0);
  const totalOhdaReceived = ohdaRecords.reduce((acc, o) => acc + (Number(o.amount) || 0), 0);
  const totalOhdaSpent = expenses.filter((e) => e.from_ohda !== false).reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  const netOhdaBalance = totalOhdaReceived - totalOhdaSpent;

  const handlePrintDailyReport = () => {
    let carExpensesRowsHtml = '';
    if (carExpenses.length === 0) {
      carExpensesRowsHtml = '<tr><td colSpan="4" style="text-align:center; padding: 12px; color:#94a3b8;">لا توجد سجلات سيارات</td></tr>';
    } else {
      carExpensesRowsHtml = carExpenses
        .map(
          (ce) => `
        <tr>
          <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">#${ce.id}</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0;">${ce.customers?.name || 'عميل'}</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0;">${ce.car_info || '-'}</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: left; font-weight: bold; color: #16a34a;">$${Number(ce.total_cost || 0).toFixed(2)}</td>
        </tr>
      `
        )
        .join('');
    }

    const html = `
      <div style="direction: rtl; font-family: system-ui, sans-serif; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #0d9488; padding-bottom: 15px;">
          <h2 style="font-size: 24px; font-weight: bold; margin: 0; color: #0d9488;">مركز الأنصاري - ورشة السمكرة والدهان</h2>
          <h3 style="font-size: 16px; margin: 5px 0; color: #475569;">التقرير اليومي وملخص العُهدة</h3>
          <p style="font-size: 13px; color: #64748b; margin: 0;">الفترة: من ${startDate} إلى ${endDate}</p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px;">
          <div style="padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; text-align: center; background: #f8fafc;">
            <div style="font-size: 11px; color: #64748b; font-weight: bold;">إجمالي المقبوض في العُهدة</div>
            <div style="font-size: 18px; font-weight: bold; color: #16a34a; margin-top: 4px;">$${totalOhdaReceived.toFixed(2)}</div>
          </div>
          <div style="padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; text-align: center; background: #f8fafc;">
            <div style="font-size: 11px; color: #64748b; font-weight: bold;">المصروف من العُهدة</div>
            <div style="font-size: 18px; font-weight: bold; color: #dc2626; margin-top: 4px;">$${totalOhdaSpent.toFixed(2)}</div>
          </div>
          <div style="padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; text-align: center; background: #fef08a;">
            <div style="font-size: 11px; color: #854d0e; font-weight: bold;">المتبقي في العُهدة</div>
            <div style="font-size: 18px; font-weight: bold; color: #000; margin-top: 4px;">$${netOhdaBalance.toFixed(2)}</div>
          </div>
          <div style="padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; text-align: center; background: #f8fafc;">
            <div style="font-size: 11px; color: #64748b; font-weight: bold;">عدد سيارات العمل</div>
            <div style="font-size: 18px; font-weight: bold; color: #0f172a; margin-top: 4px;">${carExpenses.length}</div>
          </div>
        </div>

        <h4 style="font-size: 14px; font-weight: bold; margin-bottom: 8px; color: #0d9488;">سجل مصروفات السيارات والدهان:</h4>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; text-align: right; font-size: 12px;">
          <thead>
            <tr style="background: #0f172a; color: white;">
              <th style="padding: 8px; border: 1px solid #0f172a;">#</th>
              <th style="padding: 8px; border: 1px solid #0f172a;">العميل</th>
              <th style="padding: 8px; border: 1px solid #0f172a;">بيانات السيارة</th>
              <th style="padding: 8px; border: 1px solid #0f172a; text-align: left;">التكلفة الإجمالية ($)</th>
            </tr>
          </thead>
          <tbody>
            ${carExpensesRowsHtml}
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
            {t('bodyShop')}
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-yellow-400 text-black font-bold border border-yellow-500/40">
              {language === 'ar' ? 'تقرير ورشة السمكرة والدهان' : 'Body & Paint Overview'}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'ar' ? 'متابعة أعمال السيارات والعُهدة المالية للورشة' : 'Track vehicle paint/body jobs and cash advances'}
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
            href="/body-shop/car-expenses"
            className="inline-flex items-center space-x-2 rtl:space-x-reverse px-4 py-2.5 rounded-xl font-bold text-xs text-zinc-900 bg-yellow-400 hover:bg-yellow-500 shadow-md shadow-yellow-400/20 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t('carExpensesAndJobs')}</span>
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
            <p className="text-xs font-bold text-slate-500 uppercase">{t('ohdaReceived')}</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">${totalOhdaReceived.toLocaleString()}</p>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">{t('ohdaSpent')}</p>
            <p className="text-2xl font-black text-rose-600 mt-1">${totalOhdaSpent.toLocaleString()}</p>
          </div>
          <div className="p-3 rounded-2xl bg-rose-50 text-rose-600">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">{t('remainingOhdaBalance')}</p>
            <p className="text-2xl font-black text-zinc-900 mt-1">${netOhdaBalance.toLocaleString()}</p>
          </div>
          <div className="p-3 rounded-2xl bg-yellow-400 text-zinc-900">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">{t('carJobsLogged')}</p>
            <p className="text-2xl font-black text-zinc-900 mt-1">{carExpenses.length}</p>
          </div>
          <div className="p-3 rounded-2xl bg-zinc-900 text-yellow-400">
            <Car className="w-6 h-6" />
          </div>
        </div>
      </div>



      {/* Recent Car Expenses Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
            <Car className="w-5 h-5 text-yellow-500" />
            <span>{t('carExpensesAndJobs')} ({carExpenses.length})</span>
          </h2>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900 text-white font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3.5">{t('id')}</th>
                <th className="p-3.5">{t('customer')}</th>
                <th className="p-3.5">{t('carInfo')}</th>
                <th className="p-3.5 text-right">{t('totalCost')} ($)</th>
                <th className="p-3.5">{t('date')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white font-medium text-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    {t('loading')}
                  </td>
                </tr>
              ) : carExpenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    {t('noRecordsFound')}
                  </td>
                </tr>
              ) : (
                carExpenses.map((ce) => (
                  <tr key={ce.id} className="hover:bg-yellow-50/40 transition-colors">
                    <td className="p-3.5 font-bold text-yellow-600">#{ce.id}</td>
                    <td className="p-3.5 font-bold text-zinc-900">{ce.customers?.name || t('walkInCustomer')}</td>
                    <td className="p-3.5 text-slate-600 font-semibold">{ce.car_info || 'Vehicle'}</td>
                    <td className="p-3.5 text-right font-black text-zinc-900">${Number(ce.total_cost || 0).toLocaleString()}</td>
                    <td className="p-3.5 text-slate-500">{ce.date || 'N/A'}</td>
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
