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
    const ohdaExpensesList = expenses.filter((e) => e.from_ohda !== false);
    const cashExpensesList = expenses.filter((e) => e.from_ohda === false);

    const totalOhdaSpentSum = ohdaExpensesList.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const totalCashExpensesSum = cashExpensesList.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

    // ─── Row builders ────────────────────────────────────────────────────────
    const ohdaReceivedRowsHtml =
      ohdaRecords.length === 0
        ? `<tr><td colspan="3" style="text-align:center;padding:14px;color:#94a3b8;font-style:italic;">لا توجد إيداعات عُهدة في هذه الفترة</td></tr>`
        : ohdaRecords
            .map(
              (o, i) =>
                `<tr style="background:${i % 2 === 1 ? '#f0fdf4' : '#fff'}">
                  <td style="padding:9px 10px;border:1px solid #e2e8f0;">${o.date || '-'}</td>
                  <td style="padding:9px 10px;border:1px solid #e2e8f0;">${o.notes || 'إيداع عُهدة'}</td>
                  <td style="padding:9px 10px;border:1px solid #e2e8f0;font-weight:bold;color:#16a34a;text-align:left;">$${Number(o.amount || 0).toFixed(2)}</td>
                </tr>`
            )
            .join('');

    const ohdaExpensesRowsHtml =
      ohdaExpensesList.length === 0
        ? `<tr><td colspan="4" style="text-align:center;padding:14px;color:#94a3b8;font-style:italic;">لا توجد مصروفات عُهدة</td></tr>`
        : ohdaExpensesList
            .map(
              (e, i) =>
                `<tr style="background:${i % 2 === 1 ? '#fff5f5' : '#fff'}">
                  <td style="padding:9px 10px;border:1px solid #e2e8f0;">${e.date || '-'}</td>
                  <td style="padding:9px 10px;border:1px solid #e2e8f0;font-weight:bold;">${e.description || '-'}</td>
                  <td style="padding:9px 10px;border:1px solid #e2e8f0;">${e.category || 'عام'}</td>
                  <td style="padding:9px 10px;border:1px solid #e2e8f0;font-weight:bold;color:#dc2626;text-align:left;">$${Number(e.amount || 0).toFixed(2)}</td>
                </tr>`
            )
            .join('');

    const cashExpensesRowsHtml =
      cashExpensesList.length === 0
        ? `<tr><td colspan="4" style="text-align:center;padding:14px;color:#94a3b8;font-style:italic;">لا توجد مصروفات خزينة خارجية</td></tr>`
        : cashExpensesList
            .map(
              (e, i) =>
                `<tr style="background:${i % 2 === 1 ? '#f8fafc' : '#fff'}">
                  <td style="padding:9px 10px;border:1px solid #e2e8f0;">${e.date || '-'}</td>
                  <td style="padding:9px 10px;border:1px solid #e2e8f0;font-weight:bold;">${e.description || '-'}</td>
                  <td style="padding:9px 10px;border:1px solid #e2e8f0;">${e.category || 'عام'}</td>
                  <td style="padding:9px 10px;border:1px solid #e2e8f0;font-weight:bold;color:#dc2626;text-align:left;">$${Number(e.amount || 0).toFixed(2)}</td>
                </tr>`
            )
            .join('');

    const carExpensesRowsHtml =
      carExpenses.length === 0
        ? `<tr><td colspan="5" style="text-align:center;padding:14px;color:#94a3b8;font-style:italic;">لا توجد مقايسات أو أعمال سيارات في هذه الفترة</td></tr>`
        : carExpenses
            .map((ce, i) => {
              let itemsBreakdown = '-';
              if (ce.details_json) {
                try {
                  const d = JSON.parse(ce.details_json);
                  const partsStr: string[] = [];
                  if (d.body_work > 0) partsStr.push(`سمكرة: $${d.body_work}`);
                  if (d.putty?.cost > 0) partsStr.push(`معجون (${d.putty.qty || 1}): $${d.putty.cost}`);
                  if (d.fiber?.cost > 0) partsStr.push(`فيبر (${d.fiber.qty || 1}): $${d.fiber.cost}`);
                  if (d.filler?.cost > 0) partsStr.push(`فيلر (${d.filler.qty || 1}): $${d.filler.cost}`);
                  if (d.paint?.cost > 0) partsStr.push(`بوهية: $${d.paint.cost}`);
                  if (d.varnish?.cost > 0) partsStr.push(`ورنيش (${d.varnish.qty || 1}): $${d.varnish.cost}`);
                  if (d.hardener?.cost > 0) partsStr.push(`مصلب ورنيش (${d.hardener.qty || 1}): $${d.hardener.cost}`);
                  if (d.thinner?.cost > 0) partsStr.push(`تنر (${d.thinner.qty || 1}): $${d.thinner.cost}`);
                  if (d.paint_booth > 0) partsStr.push(`فرن: $${d.paint_booth}`);
                  if (d.other_purchases && Array.isArray(d.other_purchases)) {
                    d.other_purchases.forEach((op: any) => {
                      if (op.cost > 0) partsStr.push(`${op.name || 'مشتريات'}: $${op.cost}`);
                    });
                  }
                  if (partsStr.length > 0) itemsBreakdown = partsStr.join(' · ');
                } catch {
                  itemsBreakdown = '-';
                }
              }
              return `<tr style="background:${i % 2 === 1 ? '#f0fdfe' : '#fff'}">
                <td style="padding:9px 10px;border:1px solid #e2e8f0;font-weight:bold;color:#0d9488;">#${ce.id}</td>
                <td style="padding:9px 10px;border:1px solid #e2e8f0;font-weight:bold;">${ce.customers?.name || 'عميل'}</td>
                <td style="padding:9px 10px;border:1px solid #e2e8f0;">${ce.car_info || '-'}</td>
                <td style="padding:9px 10px;border:1px solid #e2e8f0;font-size:11px;color:#475569;line-height:1.6;">${itemsBreakdown}</td>
                <td style="padding:9px 10px;border:1px solid #e2e8f0;text-align:left;font-weight:bold;color:#16a34a;">$${Number(ce.total_cost || 0).toFixed(2)}</td>
              </tr>`;
            })
            .join('');

    // ─── Section banner helper ───────────────────────────────────────────────
    const banner = (num: string, title: string, accent: string, light: string) =>
      `<div style="display:flex;align-items:stretch;border-radius:10px 10px 0 0;overflow:hidden;margin-top:32px;">
        <div style="background:${accent};color:#fff;font-size:16px;font-weight:900;padding:11px 20px;display:flex;align-items:center;justify-content:center;min-width:50px;">${num}</div>
        <div style="background:${light};color:${accent};font-size:14px;font-weight:800;padding:11px 18px;flex:1;display:flex;align-items:center;border-right:3px solid ${accent};">${title}</div>
      </div>`;

    const th = (accent: string) =>
      `padding:10px 10px;border:1px solid ${accent};background:${accent};color:#fff;font-weight:bold;font-size:12px;`;

    const totalRow = (cols: number, amount: string, color: string, bg: string) =>
      `<tr style="background:${bg};font-weight:bold;">
        <td colspan="${cols}" style="padding:9px 10px;border:1px solid #e2e8f0;font-size:13px;">الإجمالي</td>
        <td style="padding:9px 10px;border:1px solid #e2e8f0;text-align:left;color:${color};font-size:14px;font-weight:900;">${amount}</td>
      </tr>`;

    const tblStyle = `width:100%;border-collapse:collapse;text-align:right;font-size:12px;border-radius:0 0 10px 10px;overflow:hidden;`;

    const html = `
      <div style="direction:rtl;padding:28px 32px;color:#1e293b;max-width:920px;margin:0 auto;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">

        <!-- ═══ HEADER ═══ -->
        <div style="text-align:center;margin-bottom:24px;padding-bottom:18px;border-bottom:3px solid #0d9488;">
          <div style="font-size:11px;color:#64748b;font-weight:bold;letter-spacing:1.5px;margin-bottom:6px;">ورشة السمكرة والدهان</div>
          <div style="font-size:28px;font-weight:900;color:#0f172a;">الأنصاري لإصلاح الهياكل</div>
          <div style="font-size:14px;color:#0d9488;margin-top:4px;font-weight:700;">التقرير التفصيلي الشامل</div>
          <div style="display:inline-block;margin-top:10px;padding:5px 16px;background:#f1f5f9;border-radius:20px;font-size:12px;color:#475569;font-weight:bold;border:1px solid #e2e8f0;">
            الفترة: ${startDate || 'البداية'} &nbsp;←&nbsp; ${endDate || 'اليوم'}
          </div>
        </div>

        <!-- ═══ KPI ROW 1 ═══ -->
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:14px;">
          <div style="padding:18px 14px;border-radius:14px;border:2px solid #bbf7d0;background:#f0fdf4;text-align:center;">
            <div style="font-size:11px;color:#166534;font-weight:700;margin-bottom:8px;">إجمالي الدخل (إيداعات العُهدة)</div>
            <div style="font-size:26px;font-weight:900;color:#16a34a;">$${totalOhdaReceived.toFixed(2)}</div>
          </div>
          <div style="padding:18px 14px;border-radius:14px;border:2px solid #fecaca;background:#fef2f2;text-align:center;">
            <div style="font-size:11px;color:#991b1b;font-weight:700;margin-bottom:8px;">إجمالي المصاريف</div>
            <div style="font-size:26px;font-weight:900;color:#dc2626;">$${totalOhdaSpentSum.toFixed(2)}</div>
          </div>
          <div style="padding:18px 14px;border-radius:14px;border:2px solid #fde68a;background:#fefce8;text-align:center;">
            <div style="font-size:11px;color:#854d0e;font-weight:700;margin-bottom:8px;">صافي الربح (رصيد العُهدة)</div>
            <div style="font-size:26px;font-weight:900;color:#92400e;">$${netOhdaBalance.toFixed(2)}</div>
          </div>
        </div>

        <!-- ═══ KPI ROW 2 ═══ -->
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin-bottom:6px;">
          <div style="padding:16px;border-radius:12px;border:2px solid #a5f3fc;background:#f0fdfe;text-align:center;">
            <div style="font-size:11px;color:#0e7490;font-weight:700;margin-bottom:6px;">إجمالي مقايسات وتكاليف السيارات</div>
            <div style="font-size:22px;font-weight:900;color:#0d9488;">$${totalCarJobsCost.toFixed(2)}</div>
          </div>
          <div style="padding:16px;border-radius:12px;border:2px solid #e2e8f0;background:#f8fafc;text-align:center;">
            <div style="font-size:11px;color:#475569;font-weight:700;margin-bottom:6px;">مصروفات الخزينة المباشرة</div>
            <div style="font-size:22px;font-weight:900;color:#475569;">$${totalCashExpensesSum.toFixed(2)}</div>
          </div>
        </div>

        <!-- ═══ SECTION 1: OHDA DEPOSITS ═══ -->
        ${banner('1', 'إيداعات ومقبوضات العُهدة', '#10b981', '#ecfdf5')}
        <table style="${tblStyle}">
          <thead>
            <tr>
              <th style="${th('#10b981')}">التاريخ</th>
              <th style="${th('#10b981')}">الملاحظات / البيان</th>
              <th style="${th('#10b981')};text-align:left;">المبلغ المقبوض ($)</th>
            </tr>
          </thead>
          <tbody>
            ${ohdaReceivedRowsHtml}
            ${ohdaRecords.length > 0 ? totalRow(2, `$${totalOhdaReceived.toFixed(2)}`, '#16a34a', '#dcfce7') : ''}
          </tbody>
        </table>

        <!-- ═══ SECTION 2: OHDA EXPENSES ═══ -->
        ${banner('2', 'المصروفات المخصومة من العُهدة', '#ef4444', '#fef2f2')}
        <table style="${tblStyle}">
          <thead>
            <tr>
              <th style="${th('#ef4444')}">التاريخ</th>
              <th style="${th('#ef4444')}">وصف المصروف</th>
              <th style="${th('#ef4444')}">التصنيف</th>
              <th style="${th('#ef4444')};text-align:left;">المبلغ ($)</th>
            </tr>
          </thead>
          <tbody>
            ${ohdaExpensesRowsHtml}
            ${ohdaExpensesList.length > 0 ? totalRow(3, `$${totalOhdaSpentSum.toFixed(2)}`, '#dc2626', '#fee2e2') : ''}
          </tbody>
        </table>

        <!-- ═══ SECTION 3: CASH EXPENSES ═══ -->
        ${banner('3', 'مصروفات الخزينة والمباشرة', '#6b7280', '#f9fafb')}
        <table style="${tblStyle}">
          <thead>
            <tr>
              <th style="${th('#6b7280')}">التاريخ</th>
              <th style="${th('#6b7280')}">وصف المصروف</th>
              <th style="${th('#6b7280')}">التصنيف</th>
              <th style="${th('#6b7280')};text-align:left;">المبلغ ($)</th>
            </tr>
          </thead>
          <tbody>
            ${cashExpensesRowsHtml}
            ${cashExpensesList.length > 0 ? totalRow(3, `$${totalCashExpensesSum.toFixed(2)}`, '#374151', '#f1f5f9') : ''}
          </tbody>
        </table>

        <!-- ═══ SECTION 4: CAR JOBS ═══ -->
        ${banner('4', 'تفاصيل مقايسات وخامات أعمال السيارات', '#0d9488', '#f0fdfe')}
        <table style="${tblStyle}">
          <thead>
            <tr>
              <th style="${th('#0d9488')}">#</th>
              <th style="${th('#0d9488')}">العميل</th>
              <th style="${th('#0d9488')}">بيانات السيارة</th>
              <th style="${th('#0d9488')}">تفاصيل الخامات والمصنعيات</th>
              <th style="${th('#0d9488')};text-align:left;">التكلفة ($)</th>
            </tr>
          </thead>
          <tbody>
            ${carExpensesRowsHtml}
            ${carExpenses.length > 0 ? totalRow(4, `$${totalCarJobsCost.toFixed(2)}`, '#0d9488', '#ccfbf1') : ''}
          </tbody>
        </table>

        <!-- ═══ FOOTER ═══ -->
        <div style="margin-top:40px;padding-top:16px;border-top:2px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;">
          <div style="font-size:11px;color:#64748b;line-height:1.7;">
            <div style="font-weight:800;color:#0d9488;font-size:12px;">مركز الأنصاري - ورشة السمكرة والدهان</div>
            <div>📞 01010103777 &nbsp;/&nbsp; 01010606016</div>
          </div>
          <div style="font-size:11px;color:#94a3b8;text-align:left;">
            تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}
          </div>
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

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setStartDate(todayStr);
              setEndDate(todayStr);
            }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              startDate === todayStr && endDate === todayStr
                ? 'bg-zinc-900 text-white'
                : 'bg-slate-100 text-zinc-700 hover:bg-slate-200'
            }`}
          >
            {language === 'ar' ? 'اليوم' : 'Today'}
          </button>

          <button
            onClick={() => {
              const d = new Date();
              const firstDay = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
              setStartDate(firstDay);
              setEndDate(todayStr);
            }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              startDate && endDate === todayStr && startDate.endsWith('-01')
                ? 'bg-zinc-900 text-white'
                : 'bg-slate-100 text-zinc-700 hover:bg-slate-200'
            }`}
          >
            {language === 'ar' ? 'هذا الشهر' : 'This Month'}
          </button>

          <button
            onClick={() => {
              setStartDate('');
              setEndDate('');
            }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              startDate === '' && endDate === ''
                ? 'bg-zinc-900 text-white'
                : 'bg-slate-100 text-zinc-700 hover:bg-slate-200'
            }`}
          >
            {language === 'ar' ? 'جميع الأوقات' : 'All Time'}
          </button>

          <span className="text-zinc-500 font-bold text-xs">{language === 'ar' ? 'من:' : 'From:'}</span>
          <input
            type="date"
            value={startDate}
            title={language === 'ar' ? 'تاريخ البداية (من)' : 'Start Date (From)'}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1 text-zinc-900 font-semibold focus:outline-none focus:border-yellow-400"
          />
          <span className="text-zinc-500 font-bold text-xs">{language === 'ar' ? 'إلى:' : 'To:'}</span>
          <input
            type="date"
            value={endDate}
            title={language === 'ar' ? 'تاريخ النهاية (إلى)' : 'End Date (To)'}
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
