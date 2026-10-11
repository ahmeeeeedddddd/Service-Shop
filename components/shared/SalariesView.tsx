'use client';

import React, { useState, useEffect } from 'react';
import {
  Employee,
  getEmployees,
  addEmployee,
  updateEmployee,
  deleteEmployee,
  addEmployeeAdjustment,
  deleteEmployeeAdjustment,
  clearEmployeeAdjustments,
  clearAllEmployeeAdjustments,
  addExpense,
  addWeeklyExpense,
  getMondayToSaturdayWeek,
} from '@/lib/shared/queries';
import { Modal } from './Modal';
import { useTranslation } from '@/lib/i18n/context';
import { printContent } from '@/lib/utils/print';
import {
  Users,
  Plus,
  DollarSign,
  Trash2,
  Edit,
  History,
  Printer,
  RefreshCw,
  Gift,
  MinusCircle,
  CreditCard,
  CheckCircle,
  ArrowUpRight,
  Send,
  Calendar,
} from 'lucide-react';



interface SalariesViewProps {
  branchId: string;
  branchTitle: string;
}

export function SalariesView({ branchId, branchTitle }: SalariesViewProps) {
  const { t, language } = useTranslation();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State: Add / Edit Employee
  const [editingEmpId, setEditingEmpId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [dailyRate, setDailyRate] = useState<number>(0);

  // Modal States
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
  const [isDeductionModalOpen, setIsDeductionModalOpen] = useState(false);
  const [isBorrowModalOpen, setIsBorrowModalOpen] = useState(false);
  const [isBonusModalOpen, setIsBonusModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Modal Inputs
  const [salaryDays, setSalaryDays] = useState<number>(6);
  const [salaryExtraBonus, setSalaryExtraBonus] = useState<number>(0);

  const [deductionAmount, setDeductionAmount] = useState<number>(0);
  const [deductionReason, setDeductionReason] = useState<string>('');

  const [borrowAmount, setBorrowAmount] = useState<number>(0);
  const [borrowNote, setBorrowNote] = useState<string>('');

  const [bonusAmount, setBonusAmount] = useState<number>(0);
  const [bonusNote, setBonusNote] = useState<string>('');

  // Push All Salaries to Weekly Modal State
  const [isPushWeeklyModalOpen, setIsPushWeeklyModalOpen] = useState(false);
  const [pushResetAdjustments, setPushResetAdjustments] = useState(true);
  const [pushingWeekly, setPushingWeekly] = useState(false);

  // Single Salary Payout Destination ('weekly' or 'daily')
  const [singleSalaryDestination, setSingleSalaryDestination] = useState<'weekly' | 'daily'>(
    branchId === 'main-shop' ? 'weekly' : 'daily'
  );

  useEffect(() => {
    loadData();
  }, [branchId]);


  async function loadData() {
    setLoading(true);
    const data = await getEmployees(branchId);
    setEmployees(data);
    setLoading(false);
  }

  // Parse adjustments JSON for an employee
  const getEmpAdjustments = (emp: Employee) => {
    let adjs: any[] = [];
    if (emp.pending_adjustments) {
      try {
        adjs = typeof emp.pending_adjustments === 'string' ? JSON.parse(emp.pending_adjustments) : emp.pending_adjustments;
      } catch (e) {
        adjs = [];
      }
    }
    let borrows = 0;
    let deductions = 0;
    let bonuses = 0;

    adjs.forEach((a) => {
      const type = (a.adj_type || a.type || '').toLowerCase();
      const amt = Number(a.amount || 0);
      if (type === 'borrow') borrows += amt;
      else if (type === 'deduction') deductions += amt;
      else if (type === 'bonus') bonuses += amt;
    });

    return { borrows, deductions, bonuses, adjs };
  };

  // Add / Edit Employee submit
  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingEmpId) {
      await updateEmployee(editingEmpId, {
        name,
        role,
        daily_rate: dailyRate,
      });
    } else {
      await addEmployee({
        name,
        role,
        daily_rate: dailyRate,
        branch_id: branchId,
      });
    }

    resetForm();
    loadData();
  };

  const resetForm = () => {
    setEditingEmpId(null);
    setName('');
    setRole('');
    setDailyRate(0);
  };

  const handleEditEmp = (emp: Employee) => {
    setEditingEmpId(emp.id);
    setName(emp.name);
    setRole(emp.role || '');
    setDailyRate(emp.daily_rate || 0);
  };

  const handleDeleteEmp = async (id: number) => {
    if (confirm(t('confirmDelete'))) {
      await deleteEmployee(id);
      loadData();
    }
  };

  const handleResetAllAdjustments = async () => {
    if (confirm(language === 'ar' ? 'هل أنت تأكد من تصفير جميع الخصومات والسلف والحوافز لكل العاملين؟' : 'Are you sure you want to reset all employee adjustments?')) {
      await clearAllEmployeeAdjustments(branchId);
      loadData();
    }
  };

  // Confirm Record Salary Modal
  const handleConfirmSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) return;

    const { borrows, deductions, bonuses } = getEmpAdjustments(selectedEmp);
    const basePay = (selectedEmp.daily_rate || 0) * salaryDays;
    const totalBonus = bonuses + salaryExtraBonus;
    const netSalary = basePay - deductions - borrows + totalBonus;

    const todayStr = new Date().toISOString().split('T')[0];

    // Record expense based on chosen destination
    if (singleSalaryDestination === 'weekly') {
      const weekRange = getMondayToSaturdayWeek(todayStr);
      await addWeeklyExpense({
        branch_id: branchId,
        type: 'salary',
        category: 'مرتبات',
        description: `راتب: ${selectedEmp.name} (${salaryDays} أيام عمل)`,
        amount: netSalary,
        date: todayStr,
        week_start: weekRange.weekStart,
        week_end: weekRange.weekEnd,
        reference_id: selectedEmp.id,
        notes: `أساسي: $${basePay} | سلف: $${borrows} | خصم: $${deductions} | مكافآت: $${totalBonus}`,
      });
    } else {
      await addExpense({
        description: `راتب: ${selectedEmp.name} (${salaryDays} أيام عمل)`,
        amount: netSalary,
        category: 'مرتبات',
        date: todayStr,
        from_cash: true,
        branch_id: branchId,
      });
    }

    // Clear employee's pending adjustments
    await clearEmployeeAdjustments(selectedEmp.id);
    setIsSalaryModalOpen(false);
    loadData();
  };

  // Push All Salaries to Weekly Operating Expenses
  const handlePushAllSalariesToWeekly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (employees.length === 0 || pushingWeekly) return;

    setPushingWeekly(true);
    const todayStr = new Date().toISOString().split('T')[0];
    const weekRange = getMondayToSaturdayWeek(todayStr);

    let pushedCount = 0;
    let pushedTotal = 0;

    for (const emp of employees) {
      const { borrows, deductions, bonuses } = getEmpAdjustments(emp);
      const basePay = (emp.daily_rate || 0) * 6;
      const netSalary = basePay - deductions - borrows + bonuses;

      if (netSalary > 0) {
        await addWeeklyExpense({
          branch_id: branchId,
          type: 'salary',
          category: 'مرتبات',
          description: `راتب: ${emp.name} (أسبوع 6 أيام)`,
          amount: netSalary,
          date: todayStr,
          week_start: weekRange.weekStart,
          week_end: weekRange.weekEnd,
          reference_id: emp.id,
          notes: `أساسي: $${basePay} | سلف: $${borrows} | خصومات: $${deductions} | مكافآت: $${bonuses}`,
        });
        pushedCount++;
        pushedTotal += netSalary;
      }
    }

    if (pushResetAdjustments) {
      await clearAllEmployeeAdjustments(branchId);
    }

    setPushingWeekly(false);
    setIsPushWeeklyModalOpen(false);
    await loadData();
    alert(
      language === 'ar'
        ? `✅ تم ترحيل رواتب ${pushedCount} موظف بإجمالي $${pushedTotal.toLocaleString()} بنجاح إلى مصاريف التشغيل الأسبوعية (دون التأثير على المصروفات اليومية)!`
        : `✅ Successfully pushed salaries for ${pushedCount} employees ($${pushedTotal.toLocaleString()}) to Weekly Operating Expenses!`
    );
  };


  // Confirm Deduction
  const handleConfirmDeduction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp || deductionAmount <= 0) return;

    await addEmployeeAdjustment(selectedEmp.id, {
      type: 'deduction',
      amount: deductionAmount,
      note: deductionReason,
    });

    setIsDeductionModalOpen(false);
    loadData();
  };

  // Confirm Borrow (Solfah)
  const handleConfirmBorrow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp || borrowAmount <= 0) return;

    const todayStr = new Date().toISOString().split('T')[0];

    // Add adjustment
    await addEmployeeAdjustment(selectedEmp.id, {
      type: 'borrow',
      amount: borrowAmount,
      note: borrowNote,
    });

    // Also log cash expense for borrow payment out of cash drawer
    await addExpense({
      description: `سلفة عامل: ${selectedEmp.name} (${borrowNote || 'بدون ملاحظات'})`,
      amount: borrowAmount,
      category: 'مرتبات',
      date: todayStr,
      from_cash: true,
      branch_id: branchId,
    });

    setIsBorrowModalOpen(false);
    loadData();
  };

  // Confirm Bonus
  const handleConfirmBonus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp || bonusAmount <= 0) return;

    await addEmployeeAdjustment(selectedEmp.id, {
      type: 'bonus',
      amount: bonusAmount,
      note: bonusNote,
    });

    setIsBonusModalOpen(false);
    loadData();
  };

  // Delete individual adjustment from history
  const handleDeleteAdjItem = async (adjId: number) => {
    if (!selectedEmp) return;
    await deleteEmployeeAdjustment(selectedEmp.id, adjId);
    // Reload selectedEmp
    const updatedEmps = await getEmployees(branchId);
    setEmployees(updatedEmps);
    const refreshed = updatedEmps.find((e) => e.id === selectedEmp.id);
    if (refreshed) setSelectedEmp(refreshed);
  };

  // Totals Calculation for Branch
  const totalGrossPayroll = employees.reduce((acc, emp) => {
    return acc + (emp.daily_rate || 0) * 6;
  }, 0);

  const totalWeeklySalaries = employees.reduce((acc, emp) => {
    const { borrows, deductions, bonuses } = getEmpAdjustments(emp);
    const base = (emp.daily_rate || 0) * 6;
    return acc + (base - borrows - deductions + bonuses);
  }, 0);

  const handlePrintPayroll = () => {
    const todayStr = new Date().toLocaleDateString('ar-EG');
    const html = `
      <div style="direction: rtl; font-family: system-ui, sans-serif; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="font-size: 20px; font-weight: bold; margin: 0;">${branchTitle}</h2>
          <h3 style="font-size: 16px; margin: 5px 0;">كشف الرواتب الأسبوعي للموظفين</h3>
          <p style="font-size: 12px; color: #666; margin: 0;">تاريخ الإصدار: ${todayStr}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-top: 15px; text-align: right; font-size: 13px;">
          <thead>
            <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
              <th style="padding: 10px; border: 1px solid #cbd5e1;">الاسم</th>
              <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: center;">اليومية ($)</th>
              <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: center;">الراتب (6d)</th>
              <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: center; background:#eff6ff; color:#1d4ed8;">الإجمالي قبل التعديلات ($)</th>
              <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: center;">السلف ($)</th>
              <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: center;">الخصومات ($)</th>
              <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: center;">المكافآت ($)</th>
              <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: center;">الصافي ($)</th>
            </tr>
          </thead>
          <tbody>
            ${employees
              .map((emp) => {
                const { borrows, deductions, bonuses } = getEmpAdjustments(emp);
                const base = (emp.daily_rate || 0) * 6;
                const gross = base + bonuses; // base + bonuses before deductions/borrows
                const net = base - borrows - deductions + bonuses;
                return `
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">${emp.name}</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: center;">$${(emp.daily_rate || 0).toFixed(2)}</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: center;">$${base.toFixed(2)}</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: center; color:#1d4ed8; font-weight:bold;">$${gross.toFixed(2)}</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: center; color: #dc2626;">$${borrows.toFixed(2)}</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: center; color: #dc2626;">$${deductions.toFixed(2)}</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: center; color: #16a34a;">$${bonuses.toFixed(2)}</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold;">$${net.toFixed(2)}</td>
                </tr>
              `;
              })
              .join('')}
            <tr style="background-color:#eff6ff; font-weight: bold; border-top: 2px solid #2563eb;">
              <td colspan="3" style="padding: 12px; border: 1px solid #cbd5e1; text-align: right;">إجمالي الرواتب الأساسية (قبل أي تعديلات):</td>
              <td style="padding: 12px; border: 1px solid #cbd5e1; text-align: center; font-size: 15px; color:#1d4ed8;">$${totalGrossPayroll.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td colspan="3" style="border: 1px solid #cbd5e1;"></td>
              <td style="border: 1px solid #cbd5e1;"></td>
            </tr>
            <tr style="background-color: #fef08a; font-weight: bold; border-top: 2px solid #ca8a04;">
              <td colspan="7" style="padding: 12px; border: 1px solid #cbd5e1; text-align: right;">إجمالي الرواتب المستحقة للصرف (بعد التعديلات):</td>
              <td style="padding: 12px; border: 1px solid #cbd5e1; text-align: center; font-size: 15px; color: #000;">$${totalWeeklySalaries.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; color: #475569;">
          <div>تواصل: 01010103777 / 01010606016</div>
          <div>توقيع المحاسب: _______________________</div>
        </div>
      </div>
    `;
    printContent(html, 'rtl');
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Top Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-yellow-500" />
            <span>{t('employeeSalaries')}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-yellow-400 text-black font-bold border border-yellow-500/40">
              {branchTitle}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'ar' ? 'إدارة مرتبات العاملين، السلف، الخصومات والمكافآت (أسبوع 6 أيام افتراضي)' : 'Manage employee payroll, advances, deductions, and bonuses (6-day default week)'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {branchId === 'main-shop' && (
            <button
              type="button"
              onClick={() => setIsPushWeeklyModalOpen(true)}
              className="px-4 py-2.5 rounded-xl font-black text-xs text-black bg-yellow-400 hover:bg-yellow-500 transition-all flex items-center gap-1.5 shadow-md shadow-yellow-400/20"
            >
              <Send className="w-4 h-4 text-black" />
              <span>{language === 'ar' ? 'ترحيل جميع الرواتب للمصاريف الأسبوعية' : 'Push All Salaries to Weekly'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleResetAllAdjustments}
            className="px-4 py-2.5 rounded-xl font-bold text-xs text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{language === 'ar' ? 'تصفير كل التسويات' : 'Reset All Adjustments'}</span>
          </button>
          <button
            type="button"
            onClick={handlePrintPayroll}
            className="px-4 py-2.5 rounded-xl font-bold text-xs text-zinc-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>{language === 'ar' ? 'طباعة كشف المرتبات' : 'Print Payroll'}</span>
          </button>
        </div>
      </div>


      {/* Add / Edit Employee Form Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
          <Plus className="w-4 h-4 text-yellow-500" />
          <span>{editingEmpId ? t('edit') : t('addNew')}</span>
        </h2>

        <form onSubmit={handleSaveEmployee} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end text-xs">
          <div>
            <label className="block font-bold text-zinc-700 mb-1">{t('employeeName')} *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. محمد أحمد"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-zinc-900 font-bold focus:outline-none focus:border-yellow-400"
            />
          </div>

          <div>
            <label className="block font-bold text-zinc-700 mb-1">{t('roleSpecialty')}</label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. فني ميكانيكا"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-zinc-900 focus:outline-none focus:border-yellow-400"
            />
          </div>

          <div>
            <label className="block font-bold text-zinc-700 mb-1">{t('dailyRate')} ($) *</label>
            <input
              type="number"
              min="0"
              required
              value={dailyRate}
              onChange={(e) => setDailyRate(Number(e.target.value))}
              placeholder="0"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-zinc-900 focus:outline-none focus:border-yellow-400"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="w-full py-2.5 bg-yellow-400 hover:bg-yellow-500 text-zinc-900 font-bold rounded-xl shadow-sm transition-all text-xs"
            >
              {editingEmpId ? t('save') : t('addNew')}
            </button>
            {editingEmpId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-zinc-700 font-bold rounded-xl text-xs"
              >
                {t('cancel')}
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">{language === 'ar' ? 'إجمالي الرواتب الأساسية (قبل التعديلات)' : 'Total Gross Payroll (Before Adjustments)'}</p>
            <p className="text-3xl font-black text-blue-600 mt-1">${totalGrossPayroll.toLocaleString()}</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-blue-50 text-blue-600">
            <DollarSign className="w-7 h-7" />
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">{language === 'ar' ? 'إجمالي المرتبات الأسبوعية المستحقة (بعد التعديلات)' : 'Total Net Weekly Payroll'}</p>
            <p className="text-3xl font-black text-emerald-600 mt-1">${totalWeeklySalaries.toLocaleString()}</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-zinc-900 text-yellow-400">
            <DollarSign className="w-7 h-7" />
          </div>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900 text-white font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3.5">{t('employeeName')}</th>
                <th className="p-3.5">{t('roleSpecialty')}</th>
                <th className="p-3.5 text-right">{t('dailyRate')}</th>
                <th className="p-3.5 text-right">{language === 'ar' ? 'الراتب الأسبوعي (6 أيام)' : 'Weekly Rate (6d)'}</th>
                <th className="p-3.5 text-right text-blue-300">{language === 'ar' ? 'الإجمالي قبل التعديلات' : 'Gross (Before Adj.)'}</th>
                <th className="p-3.5 text-right text-rose-400 cursor-pointer" title={language === 'ar' ? 'اضغط لإضافة سلفة' : 'Click to add borrow'}>
                  {language === 'ar' ? 'السُلف (-)' : 'Borrows (-)'}
                </th>
                <th className="p-3.5 text-right text-rose-400 cursor-pointer" title={language === 'ar' ? 'اضغط لإضافة خصم' : 'Click to add deduction'}>
                  {language === 'ar' ? 'الخصومات (-)' : 'Deductions (-)'}
                </th>
                <th className="p-3.5 text-right text-emerald-400 cursor-pointer" title={language === 'ar' ? 'اضغط لإضافة حافز' : 'Click to add bonus'}>
                  {language === 'ar' ? 'الحوافز (+)' : 'Bonuses (+)'}
                </th>
                <th className="p-3.5 text-right font-black text-yellow-400">{language === 'ar' ? 'الصافي المستحق' : 'Net Salary'}</th>
                <th className="p-3.5 text-center">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white font-medium text-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500 font-medium">
                    {t('loading')}
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500 font-medium">
                    {t('noRecordsFound')}
                  </td>
                </tr>
              ) : (
                employees.map((emp) => {
                  const { borrows, deductions, bonuses } = getEmpAdjustments(emp);
                  const weeklyRate = (emp.daily_rate || 0) * 6;
                  const grossBeforeAdj = weeklyRate + bonuses;
                  const netPayable = weeklyRate - borrows - deductions + bonuses;

                  return (
                    <tr key={emp.id} className="hover:bg-yellow-50/40 transition-colors">
                      <td className="p-3.5 font-bold text-zinc-900">{emp.name}</td>
                      <td className="p-3.5 text-slate-500">{emp.role || '—'}</td>
                      <td className="p-3.5 text-right font-semibold">${Number(emp.daily_rate || 0).toFixed(2)}</td>
                      <td className="p-3.5 text-right font-bold text-zinc-900">${weeklyRate.toFixed(2)}</td>
                      <td className="p-3.5 text-right font-black text-blue-600 bg-blue-50/40">${grossBeforeAdj.toFixed(2)}</td>
                      {/* Clickable adjustment columns */}
                      <td
                        onClick={() => {
                          setSelectedEmp(emp);
                          setBorrowAmount(0);
                          setBorrowNote('');
                          setIsBorrowModalOpen(true);
                        }}
                        className="p-3.5 text-right font-bold text-rose-600 hover:bg-rose-50 cursor-pointer rounded-lg transition-colors"
                      >
                        ${borrows.toFixed(2)}
                      </td>

                      <td
                        onClick={() => {
                          setSelectedEmp(emp);
                          setDeductionAmount(0);
                          setDeductionReason('');
                          setIsDeductionModalOpen(true);
                        }}
                        className="p-3.5 text-right font-bold text-rose-600 hover:bg-rose-50 cursor-pointer rounded-lg transition-colors"
                      >
                        ${deductions.toFixed(2)}
                      </td>

                      <td
                        onClick={() => {
                          setSelectedEmp(emp);
                          setBonusAmount(0);
                          setBonusNote('');
                          setIsBonusModalOpen(true);
                        }}
                        className="p-3.5 text-right font-bold text-emerald-600 hover:bg-emerald-50 cursor-pointer rounded-lg transition-colors"
                      >
                        ${bonuses.toFixed(2)}
                      </td>

                      <td className="p-3.5 text-right font-black text-base text-zinc-900">${netPayable.toFixed(2)}</td>

                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center space-x-1.5 rtl:space-x-reverse">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedEmp(emp);
                              setSalaryDays(6);
                              setSalaryExtraBonus(0);
                              setIsSalaryModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-sm flex items-center gap-1"
                            title={language === 'ar' ? 'صرف الراتب' : 'Pay Salary'}
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>{language === 'ar' ? 'صرف' : 'Pay'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedEmp(emp);
                              setIsHistoryModalOpen(true);
                            }}
                            className="p-1.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            title={language === 'ar' ? 'سجل التسويات' : 'History'}
                          >
                            <History className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleEditEmp(emp)}
                            className="p-1.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            title={t('edit')}
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteEmp(emp.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title={t('delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: RECORD SALARY (صرف الراتب) */}
      {isSalaryModalOpen && selectedEmp && (
        <Modal isOpen={isSalaryModalOpen} onClose={() => setIsSalaryModalOpen(false)} title={`${language === 'ar' ? 'صرف راتب العامل' : 'Record Salary'} - ${selectedEmp.name}`} maxWidth="lg">
          <form onSubmit={handleConfirmSalary} className="space-y-4 text-xs">
            {(() => {
              const { borrows, deductions, bonuses } = getEmpAdjustments(selectedEmp);
              const base = (selectedEmp.daily_rate || 0) * salaryDays;
              const totBonus = bonuses + salaryExtraBonus;
              const net = base - deductions - borrows + totBonus;

              return (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-zinc-800 mb-1">{language === 'ar' ? 'عدد أيام العمل المستحقة' : 'Days Worked'} *</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        required
                        value={salaryDays}
                        onChange={(e) => setSalaryDays(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-zinc-900"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-zinc-800 mb-1">{language === 'ar' ? 'مكافأة إضافية فورية ($)' : 'Extra Bonus ($)'}</label>
                      <input
                        type="number"
                        min="0"
                        value={salaryExtraBonus}
                        onChange={(e) => setSalaryExtraBonus(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-emerald-600"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                    <div className="flex justify-between text-zinc-700">
                      <span>{language === 'ar' ? 'الراتب الأساسي (اليومية × الأيام):' : 'Base Pay:'}</span>
                      <span className="font-bold text-zinc-900">${base.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-rose-600 font-semibold">
                      <span>{language === 'ar' ? 'إجمالي الخصومات:' : 'Deductions:'}</span>
                      <span>-${deductions.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-rose-600 font-semibold">
                      <span>{language === 'ar' ? 'إجمالي السُلف المسحوبة:' : 'Borrows:'}</span>
                      <span>-${borrows.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>{language === 'ar' ? 'إجمالي الحوافز:' : 'Total Bonuses:'}</span>
                      <span>+${totBonus.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-black text-zinc-900 border-t border-slate-300 pt-2">
                      <span>{language === 'ar' ? 'صافي الراتب المستحوذ للصرف:' : 'Net Payable:'}</span>
                      <span className="text-emerald-600 text-base">${net.toFixed(2)}</span>
                    </div>
                  </div>

                  {branchId === 'main-shop' && (
                    <div className="p-3 bg-amber-50/80 rounded-2xl border border-amber-200 space-y-2">
                      <p className="font-bold text-amber-950">
                        {language === 'ar' ? 'جهة تسجيل الراتب:' : 'Expense Destination:'}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          singleSalaryDestination === 'weekly' ? 'bg-white border-amber-400 shadow-sm' : 'bg-transparent border-amber-200'
                        }`}>
                          <input
                            type="radio"
                            name="singleSalaryDest"
                            value="weekly"
                            checked={singleSalaryDestination === 'weekly'}
                            onChange={() => setSingleSalaryDestination('weekly')}
                            className="text-amber-500 focus:ring-0"
                          />
                          <div>
                            <p className="font-bold text-zinc-900">
                              {language === 'ar' ? 'مصاريف تشغيل أسبوعية' : 'Weekly Operating Expenses'}
                            </p>
                            <p className="text-[10px] text-zinc-500">
                              {language === 'ar' ? 'تُخصم من الأسبوع فقط ولا تؤثر على اليومية' : 'Deducted from week only'}
                            </p>
                          </div>
                        </label>
                        <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          singleSalaryDestination === 'daily' ? 'bg-white border-amber-400 shadow-sm' : 'bg-transparent border-amber-200'
                        }`}>
                          <input
                            type="radio"
                            name="singleSalaryDest"
                            value="daily"
                            checked={singleSalaryDestination === 'daily'}
                            onChange={() => setSingleSalaryDestination('daily')}
                            className="text-amber-500 focus:ring-0"
                          />
                          <div>
                            <p className="font-bold text-zinc-900">
                              {language === 'ar' ? 'المصروفات اليومية' : 'Daily Expenses'}
                            </p>
                            <p className="text-[10px] text-zinc-500">
                              {language === 'ar' ? 'تظهر في تقرير اليوم والدرج' : 'Included in today drawer'}
                            </p>
                          </div>
                        </label>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setIsSalaryModalOpen(false)} className="px-4 py-2 font-semibold text-slate-500">
                      {t('cancel')}
                    </button>
                    <button type="submit" className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 font-bold text-white rounded-xl shadow-md">
                      {language === 'ar' ? 'تأكيد وصرف الراتب' : 'Confirm & Pay Salary'}
                    </button>
                  </div>
                </>
              );
            })()}
          </form>
        </Modal>
      )}

      {/* MODAL: PUSH ALL SALARIES TO WEEKLY OPERATING EXPENSES */}
      {isPushWeeklyModalOpen && (
        <Modal
          isOpen={isPushWeeklyModalOpen}
          onClose={() => setIsPushWeeklyModalOpen(false)}
          title={language === 'ar' ? 'ترحيل جميع الرواتب إلى مصاريف التشغيل الأسبوعية' : 'Push All Salaries to Weekly Operating Expenses'}
          maxWidth="2xl"
        >
          <form onSubmit={handlePushAllSalariesToWeekly} className="space-y-4 text-xs">
            {(() => {
              const weekRange = getMondayToSaturdayWeek();
              return (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-900 space-y-1">
                    <p className="font-black text-sm flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-amber-600" />
                      <span>
                        {language === 'ar'
                          ? `دورة الأسبوع الحالي (من الاثنين ${weekRange.weekStart} إلى السبت ${weekRange.weekEnd})`
                          : `Current Week (Monday ${weekRange.weekStart} to Saturday ${weekRange.weekEnd})`}
                      </span>
                    </p>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      {language === 'ar'
                        ? 'سيتم ترحيل رواتب جميع العاملين دفعة واحدة إلى قسم "مصاريف تشغيل أسبوعية". هذه المصروفات ستُخصم من إجمالي أرباح الأسبوع فقط، ولن تؤثر إطلاقاً على مصروفات اليوم أو تقرير اليومية.'
                        : 'All employee net salaries will be recorded under Weekly Operating Expenses for this week. Daily expenses remain untouched.'}
                    </p>
                  </div>

                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="max-h-60 overflow-y-auto">
                      <table className="w-full text-left rtl:text-right text-[11px]">
                        <thead className="bg-zinc-900 text-white font-bold sticky top-0">
                          <tr>
                            <th className="p-2.5">{language === 'ar' ? 'الموظف' : 'Employee'}</th>
                            <th className="p-2.5 text-center">{language === 'ar' ? 'اليومية' : 'Rate'}</th>
                            <th className="p-2.5 text-center">{language === 'ar' ? 'الأساسي (6 أيام)' : 'Base (6d)'}</th>
                            <th className="p-2.5 text-center">{language === 'ar' ? 'السلف والخصومات' : 'Deductions/Borrows'}</th>
                            <th className="p-2.5 text-center">{language === 'ar' ? 'المكافآت' : 'Bonuses'}</th>
                            <th className="p-2.5 text-right rtl:text-left">{language === 'ar' ? 'صافي الراتب' : 'Net Salary'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {employees.map((emp) => {
                            const { borrows, deductions, bonuses } = getEmpAdjustments(emp);
                            const base = (emp.daily_rate || 0) * 6;
                            const net = base - borrows - deductions + bonuses;
                            return (
                              <tr key={emp.id} className="hover:bg-slate-50">
                                <td className="p-2.5 font-bold text-zinc-900">{emp.name}</td>
                                <td className="p-2.5 text-center">${(emp.daily_rate || 0).toFixed(2)}</td>
                                <td className="p-2.5 text-center">${base.toFixed(2)}</td>
                                <td className="p-2.5 text-center text-rose-600 font-bold">-${(borrows + deductions).toFixed(2)}</td>
                                <td className="p-2.5 text-center text-emerald-600 font-bold">+${bonuses.toFixed(2)}</td>
                                <td className="p-2.5 text-right rtl:text-left font-black text-emerald-700">${net.toFixed(2)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="p-4 bg-yellow-50 rounded-2xl border border-yellow-300 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-yellow-900">
                        {language === 'ar' ? 'إجمالي الرواتب الصافية التي سيتم ترحيلها:' : 'Total Net Payroll to Push:'}
                      </p>
                      <p className="text-[11px] text-yellow-800">
                        {employees.length} {language === 'ar' ? 'موظف' : 'employees'}
                      </p>
                    </div>
                    <p className="text-2xl font-black text-zinc-900">
                      ${totalWeeklySalaries.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="pushResetAdjustments"
                      checked={pushResetAdjustments}
                      onChange={(e) => setPushResetAdjustments(e.target.checked)}
                      className="rounded border-slate-300 text-yellow-500 focus:ring-0"
                    />
                    <label htmlFor="pushResetAdjustments" className="text-xs font-bold text-zinc-800 cursor-pointer">
                      {language === 'ar'
                        ? 'تصفير جميع السلف والخصومات والمكافآت لكل العاملين بعد إتمام الترحيل'
                        : 'Reset all employee advances, deductions, and bonuses after pushing'}
                    </label>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={pushingWeekly}
                      onClick={() => setIsPushWeeklyModalOpen(false)}
                      className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                    >
                      {t('cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={pushingWeekly || employees.length === 0}
                      className="px-6 py-2.5 bg-yellow-400 hover:bg-yellow-500 font-black text-black rounded-xl shadow-md transition-all flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      <span>
                        {pushingWeekly
                          ? language === 'ar' ? 'جارٍ الترحيل...' : 'Pushing...'
                          : language === 'ar' ? 'تأكيد ترحيل الرواتب للأسبوع' : 'Confirm Push to Weekly'}
                      </span>
                    </button>
                  </div>
                </>
              );
            })()}
          </form>
        </Modal>
      )}


      {/* MODAL: BORROW (سلفة) */}
      {isBorrowModalOpen && selectedEmp && (
        <Modal isOpen={isBorrowModalOpen} onClose={() => setIsBorrowModalOpen(false)} title={`${language === 'ar' ? 'تسجيل سلفة مالية' : 'Add Borrow Advance'} - ${selectedEmp.name}`} maxWidth="md">
          <form onSubmit={handleConfirmBorrow} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-zinc-800 mb-1">{language === 'ar' ? 'مبلغ السلفة ($)' : 'Borrow Amount ($)'} *</label>
              <input
                type="number"
                min="1"
                required
                value={borrowAmount}
                onChange={(e) => setBorrowAmount(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 font-bold text-rose-600 text-base"
              />
            </div>
            <div>
              <label className="block font-bold text-zinc-800 mb-1">{t('notes')}</label>
              <input
                type="text"
                value={borrowNote}
                onChange={(e) => setBorrowNote(e.target.value)}
                placeholder={language === 'ar' ? 'سبب السلفة...' : 'Reason / Notes...'}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setIsBorrowModalOpen(false)} className="px-4 py-2 font-semibold text-slate-500">
                {t('cancel')}
              </button>
              <button type="submit" className="px-5 py-2 bg-yellow-400 hover:bg-yellow-500 font-bold text-zinc-900 rounded-xl shadow-sm">
                {t('save')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: DEDUCTION (خصم) */}
      {isDeductionModalOpen && selectedEmp && (
        <Modal isOpen={isDeductionModalOpen} onClose={() => setIsDeductionModalOpen(false)} title={`${language === 'ar' ? 'تسجيل خصم على العامل' : 'Add Deduction'} - ${selectedEmp.name}`} maxWidth="md">
          <form onSubmit={handleConfirmDeduction} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-zinc-800 mb-1">{language === 'ar' ? 'مبلغ الخصم ($)' : 'Deduction Amount ($)'} *</label>
              <input
                type="number"
                min="1"
                required
                value={deductionAmount}
                onChange={(e) => setDeductionAmount(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 font-bold text-rose-600 text-base"
              />
            </div>
            <div>
              <label className="block font-bold text-zinc-800 mb-1">{language === 'ar' ? 'سبب الخصم' : 'Reason'}</label>
              <input
                type="text"
                value={deductionReason}
                onChange={(e) => setDeductionReason(e.target.value)}
                placeholder={language === 'ar' ? 'تأخير، تلفيات، إلخ...' : 'Late arrival, damage, etc...'}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setIsDeductionModalOpen(false)} className="px-4 py-2 font-semibold text-slate-500">
                {t('cancel')}
              </button>
              <button type="submit" className="px-5 py-2 bg-yellow-400 hover:bg-yellow-500 font-bold text-zinc-900 rounded-xl shadow-sm">
                {t('save')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: BONUS (مكافأة) */}
      {isBonusModalOpen && selectedEmp && (
        <Modal isOpen={isBonusModalOpen} onClose={() => setIsBonusModalOpen(false)} title={`${language === 'ar' ? 'تسجيل مكافأة / حافز' : 'Add Bonus'} - ${selectedEmp.name}`} maxWidth="md">
          <form onSubmit={handleConfirmBonus} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-zinc-800 mb-1">{language === 'ar' ? 'مبلغ المكافأة ($)' : 'Bonus Amount ($)'} *</label>
              <input
                type="number"
                min="1"
                required
                value={bonusAmount}
                onChange={(e) => setBonusAmount(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 font-bold text-emerald-600 text-base"
              />
            </div>
            <div>
              <label className="block font-bold text-zinc-800 mb-1">{t('notes')}</label>
              <input
                type="text"
                value={bonusNote}
                onChange={(e) => setBonusNote(e.target.value)}
                placeholder={language === 'ar' ? 'سبب المكافأة...' : 'Reason for bonus...'}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setIsBonusModalOpen(false)} className="px-4 py-2 font-semibold text-slate-500">
                {t('cancel')}
              </button>
              <button type="submit" className="px-5 py-2 bg-yellow-400 hover:bg-yellow-500 font-bold text-zinc-900 rounded-xl shadow-sm">
                {t('save')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: ADJUSTMENT HISTORY */}
      {isHistoryModalOpen && selectedEmp && (
        <Modal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} title={`${language === 'ar' ? 'سجل التسويات' : 'Adjustment History'} - ${selectedEmp.name}`} maxWidth="xl">
          <div className="space-y-4 text-xs">
            {(() => {
              const { adjs } = getEmpAdjustments(selectedEmp);

              return adjs.length === 0 ? (
                <p className="text-center py-8 text-slate-500">{t('noRecordsFound')}</p>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left">
                    <thead className="bg-zinc-900 text-white font-bold">
                      <tr>
                        <th className="p-3">{t('date')}</th>
                        <th className="p-3">{language === 'ar' ? 'النوع' : 'Type'}</th>
                        <th className="p-3 text-right">{t('amount')}</th>
                        <th className="p-3">{t('notes')}</th>
                        <th className="p-3 text-center">{t('actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {adjs.map((a: any) => {
                        const typeStr = (a.adj_type || a.type || '').toLowerCase();
                        let badgeClass = 'text-emerald-600 bg-emerald-50';
                        if (typeStr === 'borrow' || typeStr === 'deduction') badgeClass = 'text-rose-600 bg-rose-50';

                        return (
                          <tr key={a.id} className="hover:bg-slate-50">
                            <td className="p-3 font-semibold text-slate-600">{a.date || 'N/A'}</td>
                            <td className="p-3 font-bold">
                              <span className={`px-2 py-0.5 rounded-full border border-current text-[11px] ${badgeClass}`}>
                                {a.adj_type || a.type}
                              </span>
                            </td>
                            <td className="p-3 text-right font-black text-zinc-900">${Number(a.amount || 0).toFixed(2)}</td>
                            <td className="p-3 text-slate-600 max-w-xs truncate">{a.note || a.notes || '-'}</td>
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteAdjItem(a.id)}
                                className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors font-bold text-base"
                              >
                                &times;
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </Modal>
      )}
    </div>
  );
}
