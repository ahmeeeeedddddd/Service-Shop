'use client';

import React, { useState, useEffect } from 'react';
import {
  PendingBill,
  getPendingBills,
  updatePendingBill,
  deletePendingBill,
  processPendingBill,
} from '@/lib/shared/queries';
import { Modal } from './Modal';
import {
  DollarSign,
  Trash2,
  Eye,
  Edit,
  CheckCircle,
  Printer,
  Clock,
  Plus,
  AlertCircle,
  Search,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';

interface PendingBillsViewProps {
  branchId: string;
  branchTitle: string;
}

export function PendingBillsView({ branchId, branchTitle }: PendingBillsViewProps) {
  const { t, language } = useTranslation();
  const [bills, setBills] = useState<PendingBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals state
  const [selectedBill, setSelectedBill] = useState<PendingBill | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);

  // Edit Modal State
  const [editLines, setEditLines] = useState<{ name: string; qty: number; price: number; part_id?: number }[]>([]);
  const [editDiscount, setEditDiscount] = useState<number>(0);
  const [editOdometer, setEditOdometer] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');

  // Process Modal State
  const [processMethod, setProcessMethod] = useState<string>('Cash');
  const [processPaid, setProcessPaid] = useState<number>(0);
  const [processDiscount, setProcessDiscount] = useState<number>(0);
  const [processNotes, setProcessNotes] = useState<string>('');

  // Split payment state for processing
  const [splitMethod1, setSplitMethod1] = useState<string>('Cash');
  const [splitAmount1, setSplitAmount1] = useState<number>(0);
  const [splitMethod2, setSplitMethod2] = useState<string>('Instapay');
  const [splitAmount2, setSplitAmount2] = useState<number>(0);

  const loadData = async () => {
    setLoading(true);
    const data = await getPendingBills(branchId);
    setBills(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [branchId]);

  // Open Edit Modal
  const handleOpenEdit = (b: PendingBill) => {
    setSelectedBill(b);
    let items: any[] = [];
    if (b.line_items_json) {
      try {
        items = JSON.parse(b.line_items_json);
      } catch (e) {}
    }
    setEditLines(
      items.map((it) => ({
        name: it.name || it.item_name || '',
        qty: Number(it.qty || it.quantity || 1),
        price: Number(it.price || it.unit_price || 0),
        part_id: it.part_id,
      }))
    );
    setEditDiscount(b.discount || 0);
    setEditOdometer(b.odometer || '');
    setEditNotes(b.notes || '');
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBill) return;

    const subtotal = editLines.reduce((acc, it) => acc + it.qty * it.price, 0);
    const netTotal = Math.max(0, subtotal - editDiscount);

    await updatePendingBill(selectedBill.id, {
      description: editLines.map((l) => l.name).join(', '),
      total_amount: netTotal,
      paid_amount: 0,
      pending_amount: netTotal,
      discount: editDiscount,
      odometer: editOdometer,
      notes: editNotes,
      line_items_json: JSON.stringify(editLines),
    });

    setIsEditModalOpen(false);
    loadData();
  };

  // Open Process Modal
  const handleOpenProcess = (b: PendingBill) => {
    setSelectedBill(b);
    setProcessMethod(b.payment_method || 'Cash');
    setProcessDiscount(b.discount || 0);
    const net = Number(b.total_amount || 0);
    setProcessPaid(net);
    setProcessNotes(b.notes || '');
    setIsProcessModalOpen(true);
  };

  const handleConfirmProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBill) return;

    const net = Number(selectedBill.total_amount || 0);
    let paidAmt = net;
    let pendingAmt = 0;

    if (processMethod === 'PayByParts') {
      paidAmt = processPaid;
      pendingAmt = Math.max(0, net - paidAmt);
    } else if (processMethod === 'SplitPayment') {
      paidAmt = splitAmount1 + splitAmount2;
      pendingAmt = Math.max(0, net - paidAmt);
    }

    let finalNotes = processNotes;
    if (processMethod === 'SplitPayment') {
      const splitObj = { method1: splitMethod1, amount1: splitAmount1, method2: splitMethod2, amount2: splitAmount2 };
      finalNotes = (finalNotes ? finalNotes + '\n' : '') + '__SPLIT__:' + JSON.stringify(splitObj);
    }

    const res = await processPendingBill(
      selectedBill.id,
      processMethod,
      paidAmt,
      pendingAmt,
      processDiscount,
      finalNotes
    );

    if (res) {
      alert(language === 'ar' ? 'تم تحويل الفاتورة إلى فاتورة صيانة مفعّلة بنجاح!' : 'Bill processed into repair invoice successfully!');
      setIsProcessModalOpen(false);
      loadData();
    }
  };

  const handleDeleteBill = async (id: number) => {
    if (confirm(t('confirmDelete'))) {
      await deletePendingBill(id);
      loadData();
    }
  };

  const totalPendingBalance = bills.reduce((acc, b) => acc + (Number(b.total_amount) || 0), 0);
  const todayStr = new Date().toISOString().split('T')[0];
  const todayCount = bills.filter((b) => b.date_created && b.date_created.startsWith(todayStr)).length;

  const filteredBills = bills.filter((b) => {
    const custName = b.customers?.name || '';
    const desc = b.description || '';
    return custName.toLowerCase().includes(search.toLowerCase()) || desc.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
            <Clock className="w-7 h-7 text-yellow-500" />
            <span>{t('pendingBills')}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-yellow-400 text-black font-bold border border-yellow-500/40">
              {branchTitle}
            </span>
          </h1>
          <p className="text-xs text-zinc-500 mt-1">{language === 'ar' ? 'مراجعة وتعديل وتحويل الفواتير المعلقة' : 'Manage and process pending shop bills'}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">{language === 'ar' ? 'عدد الفواتير المعلقة' : 'Total Pending Bills'}</p>
            <p className="text-2xl font-black text-zinc-900 mt-1">{bills.length}</p>
          </div>
          <div className="p-3 rounded-2xl bg-yellow-400 text-zinc-900">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">{t('totalPendingIncomes')}</p>
            <p className="text-2xl font-black text-rose-600 mt-1">${totalPendingBalance.toLocaleString()}</p>
          </div>
          <div className="p-3 rounded-2xl bg-zinc-900 text-yellow-400">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">{language === 'ar' ? 'معلق اليوم' : 'Created Today'}</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{todayCount}</p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-100 text-zinc-900">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-zinc-900 placeholder-slate-400 focus:outline-none focus:border-yellow-400"
        />
      </div>

      {/* Pending Bills Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-400"></div>
          </div>
        ) : filteredBills.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs font-medium">
            {t('noRecordsFound')}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left rtl:text-right text-xs text-zinc-800">
              <thead className="bg-zinc-900 text-white font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">{t('id')}</th>
                  <th className="p-3.5">{t('customer')}</th>
                  <th className="p-3.5">{t('description')}</th>
                  <th className="p-3.5 text-right">{t('amount')}</th>
                  <th className="p-3.5">{t('date')}</th>
                  <th className="p-3.5 text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white font-medium">
                {filteredBills.map((b) => (
                  <tr key={b.id} className="hover:bg-yellow-50/50 transition-colors">
                    <td className="p-3.5 font-black text-yellow-600">#{b.id}</td>
                    <td className="p-3.5">
                      <p className="font-bold text-zinc-900">{b.customers?.name || t('walkInCustomer')}</p>
                      <p className="text-[11px] text-slate-500">{b.customers?.phone || 'N/A'}</p>
                    </td>
                    <td className="p-3.5 text-zinc-700 max-w-xs truncate">{b.description || 'Pending Service'}</td>
                    <td className="p-3.5 text-right font-black text-zinc-900">${Number(b.total_amount || 0).toLocaleString()}</td>
                    <td className="p-3.5 text-slate-500">{b.date_created || 'N/A'}</td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end space-x-1.5 rtl:space-x-reverse">
                        <button
                          onClick={() => {
                            setSelectedBill(b);
                            setIsViewModalOpen(true);
                          }}
                          className="p-1.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                          title={t('viewDetails')}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(b)}
                          className="p-1.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                          title={t('edit')}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenProcess(b)}
                          className="px-3 py-1.5 rounded-xl bg-yellow-400 text-zinc-900 font-bold text-xs hover:bg-yellow-500 shadow-sm flex items-center gap-1"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>{language === 'ar' ? 'تأكيد ودفع' : 'Process Bill'}</span>
                        </button>
                        <button
                          onClick={() => handleDeleteBill(b.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title={t('delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* VIEW DETAILS MODAL */}
      {isViewModalOpen && selectedBill && (
        <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title={`${t('viewDetails')} #${selectedBill.id}`} maxWidth="2xl">
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <p><strong className="text-zinc-700">{t('customer')}:</strong> {selectedBill.customers?.name || t('walkInCustomer')}</p>
              <p><strong className="text-zinc-700">{t('contactNumber')}:</strong> {selectedBill.customers?.phone || 'N/A'}</p>
              <p><strong className="text-zinc-700">{t('date')}:</strong> {selectedBill.date_created}</p>
              {selectedBill.odometer && <p><strong className="text-zinc-700">{t('odometer')}:</strong> {selectedBill.odometer}</p>}
              {selectedBill.notes && <p><strong className="text-zinc-700">{t('notes')}:</strong> {selectedBill.notes}</p>}
            </div>

            {selectedBill.line_items_json && (
              <div>
                <p className="font-bold text-zinc-900 mb-2 uppercase tracking-wider text-[11px]">{language === 'ar' ? 'بنود الفاتورة المعلقة' : 'Line Items'}</p>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left">
                    <thead className="bg-zinc-900 text-white font-bold">
                      <tr>
                        <th className="p-2.5">{language === 'ar' ? 'الخدمة' : 'Item'}</th>
                        <th className="p-2.5 text-center">{t('quantityInStock')}</th>
                        <th className="p-2.5 text-right">{t('unitPrice')}</th>
                        <th className="p-2.5 text-right">{language === 'ar' ? 'الإجمالي' : 'Subtotal'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {JSON.parse(selectedBill.line_items_json).map((it: any, idx: number) => (
                        <tr key={idx}>
                          <td className="p-2.5 font-bold text-zinc-900">{it.name || it.item_name}</td>
                          <td className="p-2.5 text-center font-bold">{it.qty || it.quantity || 1}</td>
                          <td className="p-2.5 text-right">${Number(it.price || it.unit_price || 0).toFixed(2)}</td>
                          <td className="p-2.5 text-right font-black">${((it.qty || 1) * (it.price || 0)).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="p-4 bg-yellow-50 rounded-2xl border border-yellow-200 flex justify-between items-center text-xs font-black text-zinc-900">
              <span>{language === 'ar' ? 'إجمالي المبلغ المعلق:' : 'Total Amount:'}</span>
              <span className="text-emerald-600 text-base">${Number(selectedBill.total_amount).toFixed(2)}</span>
            </div>
          </div>
        </Modal>
      )}

      {/* EDIT PENDING BILL MODAL */}
      {isEditModalOpen && selectedBill && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={language === 'ar' ? `تعديل الفاتورة المعلقة رقم #${selectedBill.id}` : `Edit Pending Bill #${selectedBill.id}`}
          maxWidth="2xl"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="font-bold text-zinc-900 uppercase">
                  {language === 'ar' ? 'بنود الفاتورة' : 'Line Items'}
                </label>
                <button
                  type="button"
                  onClick={() => setEditLines([...editLines, { name: '', qty: 1, price: 0 }])}
                  className="px-3 py-1 bg-zinc-900 hover:bg-black text-white font-bold rounded-lg text-xs flex items-center gap-1 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'إضافة بند' : '+ Add Item'}</span>
                </button>
              </div>

              {editLines.length === 0 ? (
                <p className="text-center p-4 text-slate-400 bg-slate-50 rounded-xl">
                  {language === 'ar' ? 'لا توجد بنود، اضغط على إضافة بند' : 'No items. Click + Add Item'}
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {editLines.map((line, idx) => (
                    <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-200">
                      <input
                        type="text"
                        placeholder={language === 'ar' ? 'اسم البند / الخدمة' : 'Item description'}
                        value={line.name}
                        onChange={(e) => {
                          const updated = [...editLines];
                          updated[idx].name = e.target.value;
                          setEditLines(updated);
                        }}
                        className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-zinc-900 font-bold"
                      />
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-500 font-bold">{language === 'ar' ? 'الكمية' : 'Qty'}</span>
                        <input
                          type="number"
                          min="1"
                          value={line.qty}
                          onChange={(e) => {
                            const updated = [...editLines];
                            updated[idx].qty = Number(e.target.value);
                            setEditLines(updated);
                          }}
                          className="w-16 bg-white border border-slate-300 rounded-xl px-2 py-1.5 text-center font-bold"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-500 font-bold">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.price}
                          onChange={(e) => {
                            const updated = [...editLines];
                            updated[idx].price = Number(e.target.value);
                            setEditLines(updated);
                          }}
                          className="w-24 bg-white border border-slate-300 rounded-xl px-2 py-1.5 text-right font-bold"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = editLines.filter((_, i) => i !== idx);
                          setEditLines(updated);
                        }}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        title={language === 'ar' ? 'حذف البند' : 'Remove line'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="font-bold text-zinc-700 block mb-1">{t('odometer')}</label>
                <input
                  type="text"
                  value={editOdometer}
                  onChange={(e) => setEditOdometer(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-zinc-700 block mb-1">{language === 'ar' ? 'الخصم ($)' : 'Discount ($)'}</label>
                <input
                  type="number"
                  min="0"
                  value={editDiscount}
                  onChange={(e) => setEditDiscount(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-rose-600"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-zinc-700 block mb-1">{t('notes')}</label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={2}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs"
              />
            </div>

            {/* Total summary breakdown */}
            {(() => {
              const subtotal = editLines.reduce((acc, it) => acc + (it.qty || 1) * (it.price || 0), 0);
              const netTotal = Math.max(0, subtotal - editDiscount);
              return (
                <div className="p-3 bg-zinc-900 text-white rounded-2xl flex justify-between items-center font-bold">
                  <div className="space-x-3 rtl:space-x-reverse text-xs">
                    <span>{language === 'ar' ? 'المجموع الفرعي:' : 'Subtotal:'} ${subtotal.toFixed(2)}</span>
                    <span className="text-yellow-400">{language === 'ar' ? 'الخصم:' : 'Discount:'} -${editDiscount.toFixed(2)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">{language === 'ar' ? 'الصافي المعلق' : 'Net Pending Total'}</span>
                    <span className="text-emerald-400 text-base font-black">${netTotal.toFixed(2)}</span>
                  </div>
                </div>
              );
            })()}

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

      {/* PROCESS PENDING BILL MODAL */}
      {isProcessModalOpen && selectedBill && (
        <Modal isOpen={isProcessModalOpen} onClose={() => setIsProcessModalOpen(false)} title={`${language === 'ar' ? 'تأكيد وتحويل الفاتورة' : 'Process Bill'} #${selectedBill.id}`} maxWidth="lg">
          <form onSubmit={handleConfirmProcess} className="space-y-4 text-xs">
            <div className="p-4 bg-yellow-50 rounded-2xl border border-yellow-200 space-y-1">
              <p><strong className="text-zinc-700">{t('customer')}:</strong> {selectedBill.customers?.name || t('walkInCustomer')}</p>
              <p><strong className="text-zinc-700">{language === 'ar' ? 'إجمالي الفاتورة:' : 'Total Amount:'}</strong> ${Number(selectedBill.total_amount).toFixed(2)}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-900 uppercase mb-1">{t('paymentMethod')}</label>
              <select
                value={processMethod}
                onChange={(e) => setProcessMethod(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 font-bold text-zinc-900"
              >
                <option value="Cash">{t('cash')}</option>
                <option value="Instapay">{t('instapay')}</option>
                <option value="Bank Alahly">{t('bankAlahly')}</option>
                <option value="Bank Masr">{t('bankMasr')}</option>
                <option value="Vodafone Cash">{t('vodafoneCash')}</option>
                <option value="PayByParts">{t('payByParts')}</option>
                <option value="SplitPayment">{t('splitPayment')}</option>
              </select>
            </div>

            {processMethod === 'PayByParts' && (
              <div className="p-3 bg-yellow-50 rounded-xl border border-yellow-200 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-zinc-800">{t('amountPaidNow')}:</label>
                  <input
                    type="number"
                    value={processPaid}
                    onChange={(e) => setProcessPaid(Number(e.target.value))}
                    className="w-32 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-right font-bold text-zinc-900"
                  />
                </div>
              </div>
            )}

            {processMethod === 'SplitPayment' && (
              <div className="p-3 bg-yellow-50 rounded-xl border border-yellow-200 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">طريقة 1</label>
                    <select value={splitMethod1} onChange={(e) => setSplitMethod1(e.target.value)} className="w-full bg-white border rounded-xl px-2 py-1 font-semibold">
                      <option value="Cash">{t('cash')}</option>
                      <option value="Instapay">{t('instapay')}</option>
                      <option value="Vodafone Cash">{t('vodafoneCash')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">مبلغ 1</label>
                    <input type="number" value={splitAmount1} onChange={(e) => setSplitAmount1(Number(e.target.value))} className="w-full bg-white border rounded-xl px-2 py-1 text-right font-bold" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">طريقة 2</label>
                    <select value={splitMethod2} onChange={(e) => setSplitMethod2(e.target.value)} className="w-full bg-white border rounded-xl px-2 py-1 font-semibold">
                      <option value="Instapay">{t('instapay')}</option>
                      <option value="Cash">{t('cash')}</option>
                      <option value="Vodafone Cash">{t('vodafoneCash')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">مبلغ 2</label>
                    <input type="number" value={splitAmount2} onChange={(e) => setSplitAmount2(Number(e.target.value))} className="w-full bg-white border rounded-xl px-2 py-1 text-right font-bold" />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
              <button type="button" onClick={() => setIsProcessModalOpen(false)} className="px-4 py-2 font-semibold text-slate-500">
                {t('cancel')}
              </button>
              <button type="submit" className="px-6 py-2.5 bg-yellow-400 hover:bg-yellow-500 font-bold text-zinc-900 rounded-xl shadow-md">
                {t('confirmAndSave')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
