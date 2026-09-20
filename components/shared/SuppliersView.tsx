'use client';

import React, { useState, useEffect } from 'react';
import { Supplier, getSuppliers, addSupplier, SupplierTransaction, getSupplierTransactions, addSupplierTransaction } from '@/lib/shared/queries';
import { Modal } from './Modal';
import { ShoppingBag, Plus, Phone, History, AlertCircle, Printer } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';
import { printContent } from '@/lib/utils/print';

interface SuppliersViewProps {
  branchTitle: string;
}

export function SuppliersView({ branchTitle }: SuppliersViewProps) {
  const { t, language } = useTranslation();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Supplier Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [suppliesWhat, setSuppliesWhat] = useState('');
  const [notes, setNotes] = useState('');
  const [initialPending, setInitialPending] = useState('0');
  const [submitting, setSubmitting] = useState(false);

  // Transaction History Drawer State
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [transactions, setTransactions] = useState<SupplierTransaction[]>([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // New Transaction Form State
  const [txType, setTxType] = useState<'PURCHASE' | 'PAYMENT'>('PURCHASE');
  const [txAmount, setTxAmount] = useState('');
  const [txNote, setTxNote] = useState('');

  const loadData = async () => {
    setLoading(true);
    const data = await getSuppliers();
    setSuppliers(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    await addSupplier({
      name,
      contact_number: contactNumber || null,
      supplies_what: suppliesWhat || null,
      notes: notes || null,
      pending_amount: Number(initialPending) || 0,
    });
    setSubmitting(false);
    setName('');
    setContactNumber('');
    setSuppliesWhat('');
    setNotes('');
    setInitialPending('0');
    setIsAddModalOpen(false);
    loadData();
  };

  const sortTransactions = (list: SupplierTransaction[]): SupplierTransaction[] => {
    return [...list].sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      if (dateB !== dateA) return dateB.localeCompare(dateA);
      const createdA = a.created_at || '';
      const createdB = b.created_at || '';
      if (createdB !== createdA) return createdB.localeCompare(createdA);
      return (b.id || 0) - (a.id || 0);
    });
  };

  const openHistory = async (supp: Supplier) => {
    setSelectedSupplier(supp);
    const txs = await getSupplierTransactions(supp.id);
    setTransactions(sortTransactions(txs));
    setIsHistoryModalOpen(true);
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier || !txAmount || Number(txAmount) <= 0) return;

    const amountNum = Number(txAmount);
    const currentBalance = Number(selectedSupplier.pending_amount || 0);
    const newBalance = txType === 'PURCHASE' ? currentBalance + amountNum : currentBalance - amountNum;

    await addSupplierTransaction({
      supplier_id: selectedSupplier.id,
      date: new Date().toISOString().split('T')[0],
      type: txType,
      amount: amountNum,
      balance_after: newBalance,
      note: txNote || null,
    });

    setTxAmount('');
    setTxNote('');
    
    const updatedSupps = await getSuppliers();
    setSuppliers(updatedSupps);
    const updatedCurrent = updatedSupps.find((s) => s.id === selectedSupplier.id);
    if (updatedCurrent) setSelectedSupplier(updatedCurrent);
    
    const txs = await getSupplierTransactions(selectedSupplier.id);
    setTransactions(sortTransactions(txs));
  };

  const totalSupplierDebt = suppliers.reduce((acc, s) => acc + (Number(s.pending_amount) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
            {t('suppliersAccount')}
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-yellow-400 text-black font-bold border border-yellow-500/40">
              {branchTitle}
            </span>
          </h1>
          <p className="text-xs text-zinc-500 mt-1">{t('appSubtitle')}</p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center space-x-2 rtl:space-x-reverse px-4 py-2.5 rounded-xl font-bold text-xs text-black bg-yellow-400 hover:bg-yellow-500 shadow-md shadow-yellow-400/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{t('addNew')}</span>
        </button>
      </div>

      {/* Summary Debt Header Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-zinc-500 uppercase">{t('totalSuppliers')}</p>
            <p className="text-3xl font-black text-zinc-900 mt-1">{suppliers.length}</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-black text-yellow-400 shadow-md">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-zinc-500 uppercase">{t('supplierDebtBalance')}</p>
            <p className="text-3xl font-black text-rose-600 mt-1">${totalSupplierDebt.toLocaleString()}</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-black text-rose-500 shadow-md">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-sm">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-400"></div>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 text-xs font-medium">
            {t('noRecordsFound')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right text-xs text-zinc-800">
              <thead className="bg-zinc-900 text-white font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-xl rtl:rounded-r-xl rtl:rounded-l-none">{t('id')}</th>
                  <th className="p-3">{t('supplierName')}</th>
                  <th className="p-3">{t('contactNumber')}</th>
                  <th className="p-3">{t('suppliesCategory')}</th>
                  <th className="p-3">{t('pendingDebt')}</th>
                  <th className="p-3">{t('notes')}</th>
                  <th className="p-3 text-right rtl:text-left rounded-r-xl rtl:rounded-l-xl rtl:rounded-r-none">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-yellow-50/50 transition-colors">
                    <td className="p-3 font-bold text-zinc-900">#{s.id}</td>
                    <td className="p-3 text-zinc-900 font-bold flex items-center space-x-2 rtl:space-x-reverse">
                      <ShoppingBag className="w-4 h-4 text-zinc-500" />
                      <span>{s.name}</span>
                    </td>
                    <td className="p-3 text-zinc-700 font-medium">
                      {s.contact_number ? (
                        <span className="inline-flex items-center space-x-1 rtl:space-x-reverse">
                          <Phone className="w-3 h-3 text-zinc-400" />
                          <span>{s.contact_number}</span>
                        </span>
                      ) : (
                        <span className="text-zinc-400">N/A</span>
                      )}
                    </td>
                    <td className="p-3 text-zinc-700 font-bold">{s.supplies_what || 'General Parts'}</td>
                    <td className="p-3 font-extrabold text-rose-600">
                      ${Number(s.pending_amount || 0).toLocaleString()}
                    </td>
                    <td className="p-3 text-zinc-500 max-w-xs truncate">{s.notes || 'N/A'}</td>
                    <td className="p-3 text-right rtl:text-left">
                      <button
                        onClick={() => openHistory(s)}
                        className="inline-flex items-center space-x-1.5 rtl:space-x-reverse px-3 py-1 rounded-lg bg-yellow-100 text-zinc-900 hover:bg-yellow-200 text-xs font-bold border border-yellow-300 shadow-sm"
                      >
                        <History className="w-3.5 h-3.5 text-amber-700" />
                        <span>{t('ledgerAndLog')}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Supplier Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title={t('addNew')}>
        <form onSubmit={handleCreateSupplier} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">{t('supplierName')} *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Al-Madina Spare Parts"
              className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3.5 py-2 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-yellow-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">{t('contactNumber')}</label>
            <input
              type="text"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              placeholder="e.g. 01223344556"
              className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3.5 py-2 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-yellow-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">{t('suppliesCategory')}</label>
            <input
              type="text"
              value={suppliesWhat}
              onChange={(e) => setSuppliesWhat(e.target.value)}
              placeholder="e.g. Oils, Filters, Paint, Body Parts"
              className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3.5 py-2 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-yellow-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">{t('pendingDebt')} ($)</label>
            <input
              type="number"
              value={initialPending}
              onChange={(e) => setInitialPending(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3.5 py-2 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-yellow-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">{t('notes')}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Address, terms, or special details"
              className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3.5 py-2 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-yellow-500"
              rows={2}
            />
          </div>

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

      {/* Supplier Transaction Ledger Modal */}
      <Modal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} title={`${t('ledgerAndLog')}: ${selectedSupplier?.name}`}>
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 flex justify-between items-center">
            <div>
              <span className="text-zinc-600 font-bold">{t('pendingDebt')}: </span>
              <span className="font-black text-rose-600 text-sm">
                ${Number(selectedSupplier?.pending_amount || 0).toLocaleString()}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!selectedSupplier) return;
                const html = `
                  <div style="direction: rtl; font-family: system-ui, sans-serif; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                      <h2 style="font-size: 20px; font-weight: bold; margin: 0;">كشف حساب المورد: ${selectedSupplier.name}</h2>
                      <p style="font-size: 13px; color: #64748b; margin: 5px 0;">الهاتف: ${selectedSupplier.contact_number || 'غير مدون'} | نوع التوريد: ${selectedSupplier.supplies_what || '-'}</p>
                      <p style="font-size: 13px; color: #dc2626; font-weight: bold; margin: 0;">الرصيد المتبقي المستحق: $${Number(selectedSupplier.pending_amount || 0).toLocaleString()}</p>
                    </div>

                    <table style="width: 100%; border-collapse: collapse; margin-top: 15px; text-align: right; font-size: 12px;">
                      <thead>
                        <tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
                          <th style="padding: 8px; border: 1px solid #cbd5e1;">التاريخ</th>
                          <th style="padding: 8px; border: 1px solid #cbd5e1;">النوع</th>
                          <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">المبلغ ($)</th>
                          <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">الرصيد بعد الحركة</th>
                          <th style="padding: 8px; border: 1px solid #cbd5e1;">ملاحظات / بيان</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${transactions
                          .map(
                            (tx) => `
                          <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 8px; border: 1px solid #e2e8f0;">${tx.date || '-'}</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold; color: ${tx.type === 'PURCHASE' ? '#dc2626' : '#16a34a'};">
                              ${tx.type === 'PURCHASE' ? 'شراء آجل (+)' : 'سداد دفعة (-)'}
                            </td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold;">$${Number(tx.amount).toFixed(2)}</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold;">$${Number(tx.balance_after).toFixed(2)}</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0;">${tx.note || '-'}</td>
                          </tr>
                        `
                          )
                          .join('')}
                      </tbody>
                    </table>

                    <div style="margin-top: 30px; display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; color: #475569;">
                      <div>توقيع المورد: __________________</div>
                      <div>توقيع المحاسب: __________________</div>
                    </div>
                  </div>
                `;
                printContent(html, 'rtl');
              }}
              className="px-3 py-1.5 bg-yellow-400 hover:bg-yellow-500 font-bold text-zinc-900 rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'طباعة كشف الحساب' : 'Print History'}</span>
            </button>
          </div>

          <form onSubmit={handleAddTransaction} className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-3">
            <p className="text-xs font-bold text-zinc-900">Log Purchase or Payment</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <select
                value={txType}
                onChange={(e) => setTxType(e.target.value as any)}
                className="bg-white border border-zinc-300 rounded-xl px-3 py-1.5 text-zinc-900 font-bold"
              >
                <option value="PURCHASE">New Purchase (+) Debt</option>
                <option value="PAYMENT">Payment Made (-) Debt</option>
              </select>

              <input
                type="number"
                placeholder="Amount ($)"
                required
                value={txAmount}
                onChange={(e) => setTxAmount(e.target.value)}
                className="bg-white border border-zinc-300 rounded-xl px-3 py-1.5 text-zinc-900 font-bold"
              />
            </div>

            <input
              type="text"
              placeholder="Notes / Invoice Ref..."
              value={txNote}
              onChange={(e) => setTxNote(e.target.value)}
              className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-1.5 text-xs text-zinc-900"
            />

            <button
              type="submit"
              className="w-full py-2 rounded-xl text-xs font-bold text-black bg-yellow-400 hover:bg-yellow-500 shadow-md"
            >
              Record Transaction
            </button>
          </form>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            <p className="text-xs font-bold text-zinc-700">Transaction History</p>
            {transactions.length === 0 ? (
              <p className="text-xs text-zinc-500 py-2">No transaction history recorded yet.</p>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 flex justify-between items-center">
                  <div>
                    <span className={`font-bold ${tx.type === 'PURCHASE' ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {tx.type} (${Number(tx.amount).toLocaleString()})
                    </span>
                    <p className="text-zinc-500 text-[11px]">{tx.date} - {tx.note || 'No description'}</p>
                  </div>
                  <div className="text-right rtl:text-left">
                    <p className="text-zinc-400 text-[10px]">Balance After</p>
                    <p className="font-bold text-zinc-900">${Number(tx.balance_after).toLocaleString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
