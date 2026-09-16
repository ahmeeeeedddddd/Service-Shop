'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Wrench,
  Car,
  LayoutDashboard,
  LogOut,
  UserCheck,
  Shield,
  ChevronDown,
  Globe,
  FileText,
  Clock,
  Users,
  Package,
  ShoppingBag,
  DollarSign,
  Briefcase,
  FileSpreadsheet,
} from 'lucide-react';
import { UserRole, getCurrentUserRole, setSessionRole } from '@/lib/auth';
import { useLanguage } from '@/lib/i18n/context';

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { language, toggleLanguage, t } = useLanguage();
  const [role, setRole] = useState<UserRole>('owner');

  useEffect(() => {
    getCurrentUserRole().then((r) => setRole(r));
  }, [pathname]);

  const handleLogout = async () => {
    const { signOutUser } = await import('@/lib/auth');
    await signOutUser();
    router.push('/');
  };

  // Hide header on login page ("/")
  if (pathname === '/') return null;

  const isMainShop = pathname.startsWith('/main-shop');
  const isBodyShop = pathname.startsWith('/body-shop');
  const isDashboard = pathname.startsWith('/dashboard');

  const mainShopLinks = [
    { label: language === 'ar' ? 'الرئيسية' : 'Overview', href: '/main-shop' },
    { label: t('repairsAndInvoices'), href: '/main-shop/repairs' },
    { label: t('pendingBills'), href: '/main-shop/pending-bills' },
    { label: language === 'ar' ? 'تقرير الدخل' : 'Income Report', href: '/main-shop/income-report' },
    { label: language === 'ar' ? 'تقرير الموردين' : 'Supplier Report', href: '/main-shop/supplier-report' },
    { label: t('customerDirectory'), href: '/main-shop/customers' },
    { label: t('partsInventory'), href: '/main-shop/inventory' },
    { label: t('suppliersAccount'), href: '/main-shop/suppliers' },
    { label: t('dailyExpenses'), href: '/main-shop/expenses' },
    { label: t('employeeSalaries'), href: '/main-shop/salaries' },
  ];

  const bodyShopLinks = [
    { label: language === 'ar' ? 'الرئيسية' : 'Overview', href: '/body-shop' },
    { label: t('carExpensesAndJobs'), href: '/body-shop/car-expenses' },
    { label: t('ohdaRecords'), href: '/body-shop/ohda' },
    { label: t('pendingBills'), href: '/body-shop/pending-bills' },
    { label: t('customerDirectory'), href: '/body-shop/customers' },
    { label: t('partsInventory'), href: '/body-shop/inventory' },
    { label: t('suppliersAccount'), href: '/body-shop/suppliers' },
    { label: t('dailyExpenses'), href: '/body-shop/expenses' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-zinc-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3 flex items-center justify-between">
        {/* Logo / Branch Header */}
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <div className="p-2.5 rounded-xl font-bold flex items-center justify-center text-black bg-yellow-400 shadow-yellow-400/20 shadow-md">
            {isMainShop ? (
              <Wrench className="w-5 h-5 text-black" />
            ) : isBodyShop ? (
              <Car className="w-5 h-5 text-black" />
            ) : (
              <LayoutDashboard className="w-5 h-5 text-black" />
            )}
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-zinc-900 flex items-center gap-2">
              {t('appName')}
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-yellow-400 text-black border border-yellow-500/40">
                {isMainShop ? t('mainShop') : isBodyShop ? t('bodyShop') : t('ownerOverview')}
              </span>
            </h1>
            <p className="text-xs text-zinc-500 hidden sm:block">{t('appSubtitle')}</p>
          </div>
        </div>

        {/* Branch Context Navigation - ONLY shown to owner */}
        {/* Branch Context Navigation for Owner (Desktop) */}
        {role === 'owner' && (
          <nav className="hidden md:flex items-center space-x-1 rtl:space-x-reverse bg-zinc-100 p-1 rounded-xl border border-zinc-200">
            <Link
              href="/main-shop"
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isMainShop ? 'bg-yellow-400 text-black shadow-sm' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/80'
              }`}
            >
              {t('mainShop')}
            </Link>
            <Link
              href="/body-shop"
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isBodyShop ? 'bg-yellow-400 text-black shadow-sm' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/80'
              }`}
            >
              {t('bodyShop')}
            </Link>
            <Link
              href="/dashboard"
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isDashboard ? 'bg-yellow-400 text-black shadow-sm' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/80'
              }`}
            >
              {t('ownerOverview')}
            </Link>
          </nav>
        )}

        {/* Right Section: Language Toggle & User Session Info / Logout */}
        <div className="flex items-center space-x-1.5 sm:space-x-2.5 rtl:space-x-reverse">
          {/* Language Switcher Button */}
          <button
            onClick={toggleLanguage}
            className="flex items-center space-x-1 sm:space-x-1.5 rtl:space-x-reverse bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold text-zinc-900 transition-all shadow-sm"
            title="Toggle Arabic / English"
          >
            <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600" />
            <span>{language === 'en' ? 'العربية' : 'English'}</span>
          </button>

          {/* User Role Tag */}
          <div className="hidden sm:flex items-center space-x-1.5 rtl:space-x-reverse bg-zinc-100 border border-zinc-300 px-3 py-2 rounded-xl text-xs font-bold text-zinc-900">
            <Shield className="w-4 h-4 text-amber-600" />
            <span>
              {role === 'operator_main'
                ? t('operatorMain')
                : role === 'operator_body'
                ? t('operatorBody')
                : t('owner')}
            </span>
          </div>

          {/* Log Out Button */}
          <button
            onClick={handleLogout}
            className="flex items-center space-x-1 sm:space-x-1.5 rtl:space-x-reverse bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all shadow-sm"
            title={t('logout')}
          >
            <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">{t('logout')}</span>
          </button>
        </div>
      </div>

      {/* Mobile Branch Switcher for Owner */}
      {role === 'owner' && (
        <div className="md:hidden bg-zinc-900 border-t border-zinc-800 px-3 py-1.5 flex items-center justify-around text-[11px] font-bold">
          <Link
            href="/main-shop"
            className={`px-3 py-1 rounded-lg transition-all ${
              isMainShop ? 'bg-yellow-400 text-black shadow-sm font-black' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {t('mainShop')}
          </Link>
          <Link
            href="/body-shop"
            className={`px-3 py-1 rounded-lg transition-all ${
              isBodyShop ? 'bg-yellow-400 text-black shadow-sm font-black' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {t('bodyShop')}
          </Link>
          <Link
            href="/dashboard"
            className={`px-3 py-1 rounded-lg transition-all ${
              isDashboard ? 'bg-yellow-400 text-black shadow-sm font-black' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {t('ownerOverview')}
          </Link>
        </div>
      )}

      {/* Secondary Sub-navigation Bar for Active Branch Modules */}
      {(isMainShop || isBodyShop) && (
        <div className="bg-slate-100 border-t border-slate-200 overflow-x-auto scrollbar-none">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-2 flex items-center space-x-1.5 sm:space-x-2 rtl:space-x-reverse min-w-max text-[11px] sm:text-xs font-bold">
            {(isMainShop ? mainShopLinks : bodyShopLinks).map((link, idx) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={idx}
                  href={link.href}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-xl transition-all ${
                    isActive
                      ? 'bg-zinc-900 text-white shadow-sm font-black'
                      : 'text-zinc-700 hover:bg-slate-200 hover:text-zinc-900'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
