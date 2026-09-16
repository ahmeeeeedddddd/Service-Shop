'use client';

import React, { useState, useEffect } from 'react';
import { OhdaRecord, getOhdaRecords, addOhdaRecord, updateOhdaRecord, deleteOhdaRecord, Expense, getExpenses } from '@/lib/shared/queries';
import { Plus, Trash2, Edit, Wallet, TrendingUp, TrendingDown, Clock, FileText } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';
import { Modal } from '@/components/shared/Modal';

export default function BodyShopOhdaPage() {
  const { t, language } = useTranslation();
  const [ohdaRecords, setOhdaRecords] = useState<OhdaRecord[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State: Record New Ohda
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form State: Edit Ohda Modal
  const [selectedOhda, setSelectedOhda] = useState<OhdaRecord | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Filter for history
  const [viewFilter, setViewFilter] = useState<'today' | 'all'>('today');

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [oData, eData] = await Promise.all([
      getOhdaRecords('body-shop'),
      getExpenses('body-shop'),
    ]);
    setOhdaRecords(oData);
    setExpenses(eData.filter((e) => e.from_ohda !== false));
    setLoading(false);
  };

  const handleCreateOhda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    setSubmitting(true);
    await addOhdaRecord({
      amount: Number(amount),
      date: date || todayStr,
      notes: notes || null,
      branch_id: 'body-shop',
    });
    setSubmitting(false);
    setAmount('');
    setNotes('');
    loadData();
  };

  const handleOpenEdit = (o: OhdaRecord) => {
    setSelectedOhda(o);
    setEditAmount(String(o.amount));
    setEditDate(o.date);
    setEditNotes(o.notes || '');
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOhda || !editAmount || Number(editAmount) <= 0) return;
    await updateOhdaRecord(selectedOhda.id, {
      amount: Number(editAmount),
      date: editDate,
      notes: editNotes || null,
    });
    setIsEditModalOpen(false);
    loadData();
  };

  const handleDeleteOhda = async (id: number) => {
    if (confirm(t('confirmDelete'))) {
      await deleteOhdaRecord(id);
      loadData();
    }
  };

  // Today's KPIs
  const todayOhdaReceived = ohdaRecords
    .filter((o) => o.date === todayStr)
    .reduce((acc, o) => acc + (Number(o.amount) || 0), 0);

  const todayOhdaSpent = expenses
    .filter((e) => e.date === todayStr)
    .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

  const todayRemaining = todayOhdaReceived - todayOhdaSpent;

  // Expenses map per date
  const expensesByDateMap: { [date: string]: number } = {};
  expenses.forEach((e) => {
    const d = e.date || todayStr;
    expensesByDateMap[d] = (expensesByDateMap[d] || 0) + (Number(e.amount) || 0);
  });

  // Filtered views
  const filteredOhdaRecords = ohdaRecords.filter((o) => {
    if (viewFilter === 'today') return o.date === todayStr;
    return true;
  });

  const filteredExpenses = expenses.filter((e) => {
    if (viewFilter === 'today') return e.date === todayStr;
    return true;
  });

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
            <Wallet className="w-7 h-7 text-yellow-500" />
            <span>{language === 'ar' ? 'إدارة العُهدة المالية' : 'Ohda Cash Advances'}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-yellow-400 text-black font-bold border border-yellow-500/40">
              {t('bodyShop')}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'ar' ? 'تسجيل ومتابعة مبالغ العُهدة والمصروفات منها ورصيد المتبقي' : 'Record cash advances, track spent expenses, and monitor remaining balance'}
          </p>
        </div>
      </div>

      {/* TODAY'S SUMMARY KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">{language === 'ar' ? 'عُهدة اليوم المقبوضة' : "Today's Ohda Received"}</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">${todayOhdaReceived.toLocaleString()}</p>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">{language === 'ar' ? 'المصروف من العُهدة اليوم' : "Spent from Ohda Today"}</p>
            <p className="text-2xl font-black text-rose-600 mt-1">${todayOhdaSpent.toLocaleString()}</p>
          </div>
          <div className="p-3 rounded-2xl bg-rose-50 text-rose-600">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">{language === 'ar' ? 'المتبقي في عُهدة اليوم' : "Remaining Today"}</p>
            <p className={`text-2xl font-black mt-1 ${todayRemaining < 0 ? 'text-rose-600' : 'text-zinc-900'}`}>
              ${todayRemaining.toLocaleString()}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-yellow-400 text-zinc-900">
            <Wallet className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* SECTION 1: RECORD NEW OHDA FORM */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
          <Plus className="w-4 h-4 text-yellow-500" />
          <span>{language === 'ar' ? 'تسجيل مبلغ عُهدة جديد' : 'Record Cash Advance (Ohda)'}</span>
        </h2>

        <form onSubmit={handleCreateOhda} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end text-xs">
          <div>
            <label className="block font-bold text-zinc-700 mb-1">{t('date')} *</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-zinc-900 focus:outline-none focus:border-yellow-400"
            />
          </div>

          <div>
            <label className="block font-bold text-zinc-700 mb-1">{language === 'ar' ? 'مبلغ العُهدة ($)' : 'Ohda Amount ($)'} *</label>
            <input
              type="number"
              min="1"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 5000"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-emerald-600 text-sm focus:outline-none focus:border-yellow-400"
            />
          </div>

          <div>
            <label className="block font-bold text-zinc-700 mb-1">{t('notes')}</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={language === 'ar' ? 'ملاحظات حول العُهدة...' : 'Notes...'}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-zinc-900 focus:outline-none focus:border-yellow-400"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-yellow-400 hover:bg-yellow-500 text-zinc-900 font-bold rounded-xl shadow-sm transition-all text-xs"
          >
            {submitting ? '...' : language === 'ar' ? 'حفظ العُهدة' : 'Save Advance'}
          </button>
        </form>
      </div>

      {/* FILTER CONTROL FOR TABLES */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 text-xs">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-yellow-500" />
          <span className="font-bold text-zinc-800">{language === 'ar' ? 'عرض السجلات:' : 'View Records:'}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewFilter('today')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all ${
              viewFilter === 'today' ? 'bg-zinc-900 text-white' : 'bg-slate-100 text-zinc-700 hover:bg-slate-200'
            }`}
          >
            {t('today')}
          </button>
          <button
            onClick={() => setViewFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all ${
              viewFilter === 'all' ? 'bg-zinc-900 text-white' : 'bg-slate-100 text-zinc-700 hover:bg-slate-200'
            }`}
          >
            {t('allTime')}
          </button>
        </div>
      </div>

      {/* SECTION 2: OHDA RECORDS HISTORY TABLE */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-yellow-500" />
          <span>{language === 'ar' ? 'سجل المبالغ المقبوضة كعُهدة' : 'Ohda Advances Received'}</span>
        </h2>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900 text-white font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3.5">{t('date')}</th>
                <th className="p-3.5 text-right">{language === 'ar' ? 'مبلغ العُهدة' : 'Received'}</th>
                <th className="p-3.5 text-right">{language === 'ar' ? 'المصروف' : 'Spent'}</th>
                <th className="p-3.5 text-right">{language === 'ar' ? 'المتبقي' : 'Remaining'}</th>
                <th className="p-3.5">{t('notes')}</th>
                <th className="p-3.5 text-center">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white font-medium text-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    {t('loading')}
                  </td>
                </tr>
              ) : filteredOhdaRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    {t('noRecordsFound')}
                  </td>
                </tr>
              ) : (
                filteredOhdaRecords.map((o) => {
                  const spent = expensesByDateMap[o.date] || 0;
                  const rem = Number(o.amount || 0) - spent;
                  const isToday = o.date === todayStr;

                  return (
                    <tr key={o.id} className={`hover:bg-yellow-50/40 transition-colors ${isToday ? 'bg-yellow-50/30 font-bold' : ''}`}>
                      <td className="p-3.5 font-bold text-zinc-900">{o.date || 'N/A'}</td>
                      <td className="p-3.5 text-right font-black text-emerald-600">${Number(o.amount || 0).toLocaleString()}</td>
                      <td className="p-3.5 text-right font-bold text-rose-600">${spent.toLocaleString()}</td>
                      <td className="p-3.5 text-right font-black text-zinc-900">
                        <span className={rem < 0 ? 'text-rose-600' : 'text-zinc-900'}>${rem.toLocaleString()}</span>
                      </td>
                      <td className="p-3.5 text-slate-500">{o.notes || '-'}</td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(o)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title={language === 'ar' ? 'تعديل العُهدة' : 'Edit Ohda'}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteOhda(o.id)}
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

      {/* SECTION 3: OHDA EXPENSES TABLE */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-yellow-500" />
            <span>{language === 'ar' ? 'سجل المصروفات المستخرجة من العُهدة' : 'Expenses Drawn from Ohda'}</span>
          </h2>
          <span className="text-xs font-bold text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
            {language === 'ar' ? 'إجمالي المصروفات:' : 'Total Spent:'} ${filteredExpenses.reduce((a, b) => a + (Number(b.amount) || 0), 0).toLocaleString()}
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900 text-white font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3.5">{t('date')}</th>
                <th className="p-3.5">{t('description')}</th>
                <th className="p-3.5">{t('category')}</th>
                <th className="p-3.5 text-right">{t('amount')} ($)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white font-medium text-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">
                    {t('loading')}
                  </td>
                </tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">
                    {language === 'ar' ? 'لا توجد مصروفات مسجلة من العُهدة لهذا اليوم' : 'No Ohda expenses recorded for this period'}
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="p-3.5 font-semibold text-slate-500">{e.date || 'N/A'}</td>
                    <td className="p-3.5 font-bold text-zinc-900">{e.description || '-'}</td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-bold text-[11px]">
                        {e.category || 'General'}
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-black text-rose-600">${Number(e.amount || 0).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT OHDA MODAL */}
      {isEditModalOpen && selectedOhda && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={language === 'ar' ? `تعديل سجل العُهدة رقم #${selectedOhda.id}` : `Edit Ohda Record #${selectedOhda.id}`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-zinc-700 mb-1">{t('date')} *</label>
              <input
                type="date"
                required
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-zinc-900 focus:outline-none focus:border-yellow-400"
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-700 mb-1">{language === 'ar' ? 'مبلغ العُهدة ($)' : 'Ohda Amount ($)'} *</label>
              <input
                type="number"
                min="1"
                required
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-emerald-600 text-sm focus:outline-none focus:border-yellow-400"
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-700 mb-1">{t('notes')}</label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-zinc-900 focus:outline-none focus:border-yellow-400"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-yellow-400 hover:bg-yellow-500 font-bold text-zinc-900 rounded-xl shadow-sm transition-all"
              >
                {t('save')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
