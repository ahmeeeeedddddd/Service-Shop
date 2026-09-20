'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { StatCard } from '@/components/shared/StatCard';
import { SalariesView } from '@/components/shared/SalariesView';
import { getOwnerDashboardMetrics } from '@/lib/shared/queries';
import { supabase } from '@/lib/db/client';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  Wrench,
  Car,
  Package,
  FileText,
  Layers,
  Scale,
  Shield,
  Eye,
  RefreshCw,
  Search,
  Users,
  ChevronDown,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';

const PART_CATEGORIES = [
  'All',
  'Mechanical',
  'Electrical',
  'Body parts',
  'Fluids and filters',
  'Other',
];

export default function OwnerDashboardPage() {
  const { t, language } = useTranslation();
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'daily' | 'ohda' | 'carExpenses' | 'parts' | 'salaries'>('daily');
  const [partsSearch, setPartsSearch] = useState('');
  const [partsCategory, setPartsCategory] = useState('All');
  const todayStr = new Date().toISOString().split('T')[0];
  const getFirstDayOfMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  };

  const [filterPreset, setFilterPreset] = useState<'today' | 'month' | 'custom' | 'all'>('today');
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [activeSalaryBranch, setActiveSalaryBranch] = useState<'main-shop' | 'body-shop'>('main-shop');

  const datesRef = React.useRef({ startDate, endDate });

  useEffect(() => {
    datesRef.current = { startDate, endDate };
  }, [startDate, endDate]);

  const loadData = async (start = datesRef.current.startDate, end = datesRef.current.endDate, isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const data = await getOwnerDashboardMetrics(start, end);
      setMetrics(data);
    } catch (err) {
      console.error('Error fetching dashboard metrics:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData(startDate, endDate, false);

    // Supabase Realtime subscription for live sync across all logged-in sessions
    const channel = supabase
      .channel('owner_dashboard_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'repairs' }, () => loadData(datesRef.current.startDate, datesRef.current.endDate, true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => loadData(datesRef.current.startDate, datesRef.current.endDate, true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ohda_records' }, () => loadData(datesRef.current.startDate, datesRef.current.endDate, true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'car_expenses' }, () => loadData(datesRef.current.startDate, datesRef.current.endDate, true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parts' }, () => loadData(datesRef.current.startDate, datesRef.current.endDate, true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'salaries' }, () => loadData(datesRef.current.startDate, datesRef.current.endDate, true))
      .subscribe();

    // 5-second polling interval for guaranteed automatic background sync
    const intervalId = setInterval(() => {
      loadData(datesRef.current.startDate, datesRef.current.endDate, true);
    }, 5000);

    // Re-sync when tab regains focus
    const handleFocus = () => loadData(datesRef.current.startDate, datesRef.current.endDate, true);
    window.addEventListener('focus', handleFocus);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, [startDate, endDate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  const partsList = metrics?.parts || [];

  // Filter by category
  const categoryFiltered = partsCategory === 'All'
    ? partsList
    : partsList.filter((p: any) => (p.category || 'Other') === partsCategory);

  // Then filter by search text
  const filteredParts = categoryFiltered.filter((p: any) =>
    (p.name || '').toLowerCase().includes(partsSearch.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(partsSearch.toLowerCase())
  );

  // Group parts by category for grouped view
  const groupedParts: { [cat: string]: any[] } = {};
  filteredParts.forEach((p: any) => {
    const cat = p.category || 'Other';
    if (!groupedParts[cat]) groupedParts[cat] = [];
    groupedParts[cat].push(p);
  });

  const renderPartsRows = () => {
    if (partsCategory !== 'All') {
      return filteredParts.map((p: any) => {
        const qty = Number(p.quantity_in_stock || 0);
        const price = Number(p.unit_price || 0);
        const stockVal = qty * price;
        return (
          <tr key={p.id} className="hover:bg-slate-50">
            <td className="p-3.5 font-bold text-zinc-900">#{p.id}</td>
            <td className="p-3.5 font-bold text-zinc-900">{p.name}</td>
            <td className="p-3.5"><span className="px-2.5 py-0.5 rounded-md bg-slate-100 font-bold text-[11px]">{p.category || 'Other'}</span></td>
            <td className="p-3.5 font-bold text-emerald-700">{qty} units</td>
            <td className="p-3.5 text-right font-bold text-zinc-900">${price.toFixed(2)}</td>
            <td className="p-3.5 text-right font-black text-emerald-600">${stockVal.toFixed(2)}</td>
          </tr>
        );
      });
    }
    // Grouped view
    const rows: React.ReactNode[] = [];
    Object.keys(groupedParts).sort().forEach((cat) => {
      rows.push(
        <tr key={`cat-header-${cat}`} className="bg-zinc-900">
          <td colSpan={6} className="px-3.5 py-2 text-xs font-black text-yellow-400 uppercase tracking-wider">
            {cat} ({groupedParts[cat].length})
          </td>
        </tr>
      );
      groupedParts[cat].forEach((p: any) => {
        const qty = Number(p.quantity_in_stock || 0);
        const price = Number(p.unit_price || 0);
        const stockVal = qty * price;
        rows.push(
          <tr key={p.id} className="hover:bg-slate-50">
            <td className="p-3.5 font-bold text-zinc-900">#{p.id}</td>
            <td className="p-3.5 font-bold text-zinc-900">{p.name}</td>
            <td className="p-3.5"><span className="px-2.5 py-0.5 rounded-md bg-slate-100 font-bold text-[11px]">{p.category || 'Other'}</span></td>
            <td className="p-3.5 font-bold text-emerald-700">{qty} units</td>
            <td className="p-3.5 text-right font-bold text-zinc-900">${price.toFixed(2)}</td>
            <td className="p-3.5 text-right font-black text-emerald-600">${stockVal.toFixed(2)}</td>
          </tr>
        );
      });
    });
    return rows;
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Page Header */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight flex flex-wrap items-center gap-2">
            <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-yellow-500" />
            <span>{t('ownerDashboardTitle')}</span>
            <span className="text-[11px] sm:text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              {language === 'ar' ? 'تزامن مباشر' : 'Live Sync'}
            </span>
          </h1>
          <p className="text-[11px] sm:text-xs text-zinc-500 mt-1">{t('ownerDashboardSubtitle')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab !== 'salaries' && (
            <div className="flex flex-wrap items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200 text-xs gap-1">
              <button
                type="button"
                onClick={() => {
                  setFilterPreset('today');
                  setStartDate(todayStr);
                  setEndDate(todayStr);
                }}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all text-xs ${
                  filterPreset === 'today' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-700 hover:bg-slate-200'
                }`}
              >
                {language === 'ar' ? 'اليوم' : 'Today'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const firstDay = getFirstDayOfMonth();
                  setFilterPreset('month');
                  setStartDate(firstDay);
                  setEndDate(todayStr);
                }}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all text-xs ${
                  filterPreset === 'month' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-700 hover:bg-slate-200'
                }`}
              >
                {language === 'ar' ? 'هذا الشهر' : 'This Month'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterPreset('all');
                  setStartDate('');
                  setEndDate('');
                }}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all text-xs ${
                  filterPreset === 'all' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-700 hover:bg-slate-200'
                }`}
              >
                {language === 'ar' ? 'جميع الأوقات' : 'All Time'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterPreset('custom');
                }}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all text-xs ${
                  filterPreset === 'custom' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-700 hover:bg-slate-200'
                }`}
              >
                {language === 'ar' ? 'مخصص' : 'Custom'}
              </button>

              {(filterPreset === 'custom' || (startDate && endDate && filterPreset !== 'today' && filterPreset !== 'month' && filterPreset !== 'all')) && (
                <div className="flex items-center gap-1.5 ml-1 rtl:mr-1">
                  <span className="text-zinc-500 font-bold text-[11px]">{language === 'ar' ? 'من:' : 'From:'}</span>
                  <input
                    type="date"
                    value={startDate}
                    title={language === 'ar' ? 'تاريخ البداية (من)' : 'Start Date (From)'}
                    onChange={(e) => {
                      setFilterPreset('custom');
                      setStartDate(e.target.value);
                    }}
                    className="bg-white border border-slate-300 rounded-xl px-2 py-1 text-zinc-900 font-semibold focus:outline-none focus:border-yellow-400 text-xs"
                  />
                  <span className="text-zinc-500 font-bold text-[11px]">{language === 'ar' ? 'إلى:' : 'To:'}</span>
                  <input
                    type="date"
                    value={endDate}
                    title={language === 'ar' ? 'تاريخ النهاية (إلى)' : 'End Date (To)'}
                    onChange={(e) => {
                      setFilterPreset('custom');
                      setEndDate(e.target.value);
                    }}
                    className="bg-white border border-slate-300 rounded-xl px-2 py-1 text-zinc-900 font-semibold focus:outline-none focus:border-yellow-400 text-xs"
                  />
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => loadData(startDate, endDate, false)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-zinc-800 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors ml-auto sm:ml-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'تحديث' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* TOP 4 MAIN KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase">{language === 'ar' ? 'إيرادات المركز الرئيسي' : 'Main Shop Income'}</p>
            <p className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">${metrics?.mainShop?.totalIncome?.toLocaleString() || '0'}</p>
            <p className="text-[11px] font-bold text-slate-400 mt-0.5">{metrics?.mainShop?.repairCount || 0} {language === 'ar' ? 'فواتير مقبوضة' : 'Paid Invoices'}</p>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
            <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase">{language === 'ar' ? 'مصروفات المركز الرئيسي' : 'Main Shop Expenses'}</p>
            <p className="text-xl sm:text-2xl font-black text-rose-600 mt-1">${metrics?.mainShop?.totalExpenses?.toLocaleString() || '0'}</p>
            <p className="text-[11px] font-bold text-slate-400 mt-0.5">{language === 'ar' ? 'إجمالي الخصميات والمشتريات' : 'Total Operational Outflow'}</p>
          </div>
          <div className="p-3 rounded-2xl bg-rose-50 text-rose-600">
            <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase">{language === 'ar' ? 'مقبوض عُهدة ورشة السمكرة' : 'Body Shop Ohda Received'}</p>
            <p className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">${metrics?.ohda?.totalReceived?.toLocaleString() || '0'}</p>
            <p className="text-[11px] font-bold text-slate-400 mt-0.5">{language === 'ar' ? 'إجمالي السُلف المقبوضة' : 'Total Advances Received'}</p>
          </div>
          <div className="p-3 rounded-2xl bg-amber-50 text-amber-600">
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase">{language === 'ar' ? 'المصروف من عُهدة السمكرة' : 'Body Shop Ohda Spent'}</p>
            <p className="text-xl sm:text-2xl font-black text-rose-600 mt-1">${metrics?.ohda?.totalSpent?.toLocaleString() || '0'}</p>
            <p className="text-[11px] font-bold text-slate-400 mt-0.5">
              {language === 'ar' ? 'المتبقي:' : 'Net Balance:'} ${metrics?.ohda?.netBalance?.toLocaleString() || '0'}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-yellow-400 text-zinc-950">
            <Wallet className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>
      </div>

      {/* SECTION TABS FOR OWNER DETAILS (Horizontal scrollable on mobile) */}
      <div className="flex overflow-x-auto gap-2 border-b border-slate-200 pb-2 scrollbar-none whitespace-nowrap -mx-2 px-2 sm:mx-0 sm:px-0">
        <button
          onClick={() => setActiveTab('daily')}
          className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'daily'
              ? 'bg-zinc-900 text-white shadow-md'
              : 'bg-white text-zinc-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Layers className="w-4 h-4 text-yellow-400" />
          <span>{language === 'ar' ? 'تقرير المالية اليومي للفروع' : 'Branch Daily Reports'}</span>
        </button>

        <button
          onClick={() => setActiveTab('ohda')}
          className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'ohda'
              ? 'bg-zinc-900 text-white shadow-md'
              : 'bg-white text-zinc-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Wallet className="w-4 h-4 text-yellow-400" />
          <span>{language === 'ar' ? 'تفاصيل العُهدة والمصروفات' : 'Ohda & Expenses Breakdown'}</span>
        </button>

        <button
          onClick={() => setActiveTab('carExpenses')}
          className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'carExpenses'
              ? 'bg-zinc-900 text-white shadow-md'
              : 'bg-white text-zinc-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Car className="w-4 h-4 text-yellow-400" />
          <span>{language === 'ar' ? 'سجل سيارات السمكرة والدهان' : 'Body Shop Car Jobs'}</span>
        </button>

        <button
          onClick={() => setActiveTab('salaries')}
          className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'salaries'
              ? 'bg-zinc-900 text-white shadow-md'
              : 'bg-white text-zinc-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4 text-yellow-400" />
          <span>{language === 'ar' ? 'تقرير المرتبات' : 'Salaries Report'}</span>
        </button>

        <button
          onClick={() => setActiveTab('parts')}
          className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'parts'
              ? 'bg-zinc-900 text-white shadow-md'
              : 'bg-white text-zinc-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Package className="w-4 h-4 text-yellow-400" />
          <span>{language === 'ar' ? 'قيمة قطع الغيار والمخزون' : 'Stock & Parts Inventory'}</span>
        </button>
      </div>

      {/* TAB 1: DAILY FINANCIAL REPORTS OF BOTH SHOPS */}
      {activeTab === 'daily' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Main Shop Daily Report Box */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-yellow-500" />
                <span>{language === 'ar' ? 'التقرير اليومي - المركز الرئيسي' : 'Main Shop Daily Overview'}</span>
              </h2>
              <Link href="/main-shop" className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
                <span>{t('viewBranch')}</span>
                <Eye className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <p className="text-[11px] font-bold text-slate-500">{t('totalRevenue')}</p>
                <p className="text-base font-black text-emerald-600 mt-1">${metrics?.mainShop?.totalIncome?.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <p className="text-[11px] font-bold text-slate-500">{t('totalExpenses')}</p>
                <p className="text-base font-black text-rose-600 mt-1">${metrics?.mainShop?.totalExpenses?.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-2xl border border-yellow-200">
                <p className="text-[11px] font-bold text-amber-800">{language === 'ar' ? 'صافي الربح' : 'Net Profit'}</p>
                <p className="text-base font-black text-zinc-900 mt-1">${metrics?.mainShop?.netProfit?.toFixed(2)}</p>
              </div>
            </div>

            <div>
              <p className="font-bold text-xs text-zinc-800 mb-2">{language === 'ar' ? 'أحدث الفواتير المسجلة:' : 'Recent Paid Repairs:'}</p>
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900 text-white font-bold">
                    <tr>
                      <th className="p-2.5">#</th>
                      <th className="p-2.5">{t('customer')}</th>
                      <th className="p-2.5">{language === 'ar' ? 'طريقة الدفع' : 'Payment'}</th>
                      <th className="p-2.5 text-right">{t('amount')} ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white font-medium">
                    {metrics?.mainShop?.repairs?.slice(0, 5).map((r: any) => (
                      <tr key={r.id}>
                        <td className="p-2.5 font-bold">#{r.id}</td>
                        <td className="p-2.5">{r.customers?.name || 'عميل نقدي'}</td>
                        <td className="p-2.5"><span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-[10px]">{r.payment_method || 'Cash'}</span></td>
                        <td className="p-2.5 text-right font-black text-emerald-600">${Number(r.paid_amount || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Body Shop Daily Report Box */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                <Car className="w-5 h-5 text-yellow-500" />
                <span>{language === 'ar' ? 'التقرير اليومي - ورشة السمكرة والدهان' : 'Body Shop Daily Overview'}</span>
              </h2>
              <Link href="/body-shop" className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
                <span>{t('viewBranch')}</span>
                <Eye className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <p className="text-[11px] font-bold text-slate-500">{language === 'ar' ? 'عُهدة مقبوضة' : 'Ohda Received'}</p>
                <p className="text-base font-black text-emerald-600 mt-1">${metrics?.ohda?.totalReceived?.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <p className="text-[11px] font-bold text-slate-500">{language === 'ar' ? 'عُهدة مصروفة' : 'Ohda Spent'}</p>
                <p className="text-base font-black text-rose-600 mt-1">${metrics?.ohda?.totalSpent?.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-2xl border border-yellow-200">
                <p className="text-[11px] font-bold text-amber-800">{language === 'ar' ? 'متبقي العُهدة' : 'Remaining Balance'}</p>
                <p className="text-base font-black text-zinc-900 mt-1">${metrics?.ohda?.netBalance?.toFixed(2)}</p>
              </div>
            </div>

            <div>
              <p className="font-bold text-xs text-zinc-800 mb-2">{language === 'ar' ? 'أحدث أعمال السيارات والدهان:' : 'Recent Car Jobs:'}</p>
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900 text-white font-bold">
                    <tr>
                      <th className="p-2.5">#</th>
                      <th className="p-2.5">{t('customer')}</th>
                      <th className="p-2.5">{t('carInfo')}</th>
                      <th className="p-2.5 text-right">{t('totalCost')} ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white font-medium">
                    {metrics?.carExpenses?.slice(0, 5).map((ce: any) => (
                      <tr key={ce.id}>
                        <td className="p-2.5 font-bold">#{ce.id}</td>
                        <td className="p-2.5">{ce.customers?.name || 'عميل'}</td>
                        <td className="p-2.5 text-slate-600">{ce.car_info || '-'}</td>
                        <td className="p-2.5 text-right font-black text-emerald-600">${Number(ce.total_cost || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: OHDA DETAILS AND EXPENSES BREAKDOWN */}
      {activeTab === 'ohda' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Ohda Advances Received */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-yellow-500" />
                <span>{language === 'ar' ? 'سجل المبالغ المقبوضة كعُهدة (مقبوضات)' : 'Ohda Advances Received History'}</span>
              </h3>
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900 text-white font-bold">
                    <tr>
                      <th className="p-2.5">{t('date')}</th>
                      <th className="p-2.5 text-right">{t('amount')} ($)</th>
                      <th className="p-2.5">{t('notes')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white font-medium">
                    {metrics?.ohda?.records?.map((o: any) => (
                      <tr key={o.id}>
                        <td className="p-2.5 font-bold text-zinc-900">{o.date || 'N/A'}</td>
                        <td className="p-2.5 text-right font-black text-emerald-600">${Number(o.amount || 0).toFixed(2)}</td>
                        <td className="p-2.5 text-slate-500">{o.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Ohda Expenses Drawn */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-rose-500" />
                <span>{language === 'ar' ? 'تفاصيل المصروفات المستخرجة من العُهدة' : 'Expenses Drawn from Ohda'}</span>
              </h3>
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900 text-white font-bold">
                    <tr>
                      <th className="p-2.5">{t('date')}</th>
                      <th className="p-2.5">{t('description')}</th>
                      <th className="p-2.5">{t('category')}</th>
                      <th className="p-2.5 text-right">{t('amount')} ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white font-medium">
                    {metrics?.ohda?.ohdaExpenses?.map((e: any) => (
                      <tr key={e.id}>
                        <td className="p-2.5 text-slate-500 font-semibold">{e.date || 'N/A'}</td>
                        <td className="p-2.5 font-bold text-zinc-900">{e.description || '-'}</td>
                        <td className="p-2.5"><span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-[10px]">{e.category || 'General'}</span></td>
                        <td className="p-2.5 text-right font-black text-rose-600">${Number(e.amount || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CAR EXPENSES & JOBS LOG (BODY SHOP) */}
      {activeTab === 'carExpenses' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <Car className="w-5 h-5 text-yellow-500" />
              <span>{language === 'ar' ? 'سجل تقارير سيارات وأعمال ورشة السمكرة' : 'Body Shop Car Repairs Log'}</span>
            </h3>
            <span className="text-xs font-bold text-zinc-600 bg-slate-100 px-3 py-1 rounded-full">
              إجمالي السيارات: {metrics?.carExpenses?.length || 0}
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900 text-white font-bold uppercase">
                <tr>
                  <th className="p-3.5">#</th>
                  <th className="p-3.5">{t('date')}</th>
                  <th className="p-3.5">{t('customer')}</th>
                  <th className="p-3.5">{t('carInfo')}</th>
                  <th className="p-3.5 text-right">{t('totalCost')} ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white font-medium">
                {metrics?.carExpenses?.map((ce: any) => (
                  <tr key={ce.id} className="hover:bg-slate-50">
                    <td className="p-3.5 font-bold text-zinc-900">#{ce.id}</td>
                    <td className="p-3.5 font-semibold text-slate-500">{ce.date || 'N/A'}</td>
                    <td className="p-3.5 font-bold text-zinc-900">{ce.customers?.name || 'عميل'}</td>
                    <td className="p-3.5 text-slate-700">{ce.car_info || '-'}</td>
                    <td className="p-3.5 text-right font-black text-emerald-600">${Number(ce.total_cost || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: PARTS & STOCK INVENTORY (VIEW ONLY WITH TOTAL MONEY VALUE BOX) */}
      {activeTab === 'parts' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-yellow-500" />
                <span>{language === 'ar' ? 'سجل قطع الغيار والمخزون (عرض للمالك فقط)' : 'Parts Inventory (Read-Only Owner View)'}</span>
              </h3>
            </div>

            {/* Total Money Value of Stock Box */}
            <div className="p-3 bg-yellow-50 rounded-2xl border border-yellow-200 flex items-center gap-2 text-xs font-bold text-zinc-900">
              <span>{language === 'ar' ? 'إجمالي قيمة المخزون وقطع الغيار:' : 'Total Money Value of Stock:'}</span>
              <span className="text-emerald-600 text-base font-black">${metrics?.totalPartsValue?.toFixed(2) || '0.00'}</span>
            </div>
          </div>

          {/* Filter row: Category dropdown + Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative w-full sm:w-auto">
              <select
                value={partsCategory}
                onChange={(e) => setPartsCategory(e.target.value)}
                className="w-full sm:w-auto appearance-none bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 pr-9 text-xs font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option value="All">{language === 'ar' ? 'جميع التصنيفات' : 'All Categories'}</option>
                {PART_CATEGORIES.filter(c => c !== 'All').map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-3 rtl:right-auto rtl:left-3 top-2.5 text-slate-400 pointer-events-none" />
            </div>

            <div className="relative flex-1 w-full max-w-full sm:max-w-sm">
              <Search className="w-4 h-4 absolute left-3.5 rtl:right-3.5 rtl:left-auto top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={partsSearch}
                onChange={(e) => setPartsSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 rtl:pr-10 rtl:pl-4 py-2 text-xs font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900 text-white font-bold uppercase">
                <tr>
                  <th className="p-3.5">#</th>
                  <th className="p-3.5">{t('partName')}</th>
                  <th className="p-3.5">{t('category')}</th>
                  <th className="p-3.5">{t('quantityInStock')}</th>
                  <th className="p-3.5 text-right">{t('unitPrice')} ($)</th>
                  <th className="p-3.5 text-right">{language === 'ar' ? 'قيمة المخزون' : 'Stock Value'} ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white font-medium">
                {renderPartsRows()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: SALARIES REPORT (EDITABLE — MAIN SHOP ONLY) */}
      {activeTab === 'salaries' && (
        <SalariesView
          branchId="main-shop"
          branchTitle={language === 'ar' ? 'المركز الرئيسي' : 'Main Shop'}
        />
      )}
    </div>
  );
}
