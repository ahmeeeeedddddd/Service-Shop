'use client';

import React, { useState, useEffect } from 'react';
import { Customer, getCustomers, addCustomer, updateCustomer, deleteCustomer, CustomerCar, getCustomerCars, addCustomerCar, Repair, getRepairsByCustomerId } from '@/lib/shared/queries';
import { Modal } from './Modal';
import { Users, Search, Plus, Car, Phone, Trash2, Edit, FileText, Clock } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';

interface CustomersViewProps {
  branchTitle: string;
}

export function CustomersView({ branchTitle }: CustomersViewProps) {
  const { t } = useTranslation();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [carName, setCarName] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Cars Modal State
  const [customerCars, setCustomerCars] = useState<CustomerCar[]>([]);
  const [isCarsModalOpen, setIsCarsModalOpen] = useState(false);
  const [newCarName, setNewCarName] = useState('');
  const [newPlateNumber, setNewPlateNumber] = useState('');

  // History Modal State
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [customerRepairs, setCustomerRepairs] = useState<Repair[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const openHistoryModal = async (cust: Customer) => {
    setSelectedCustomer(cust);
    setLoadingHistory(true);
    setIsHistoryModalOpen(true);
    const repairs = await getRepairsByCustomerId(cust.id);
    setCustomerRepairs(repairs);
    setLoadingHistory(false);
  };

  const loadData = async (queryTerm: string = debouncedSearch) => {
    setLoading(true);
    const data = await getCustomers(queryTerm);
    setCustomers(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData(debouncedSearch);
  }, [debouncedSearch]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    const created = await addCustomer({
      name,
      phone: phone || null,
      car_name: carName || null,
      plate_number: plateNumber || null,
    });
    setSubmitting(false);
    if (created) {
      if (carName || plateNumber) {
        await addCustomerCar({
          customer_id: created.id,
          car_name: carName || null,
          plate_number: plateNumber || null,
        });
      }
      setName('');
      setPhone('');
      setCarName('');
      setPlateNumber('');
      setIsAddModalOpen(false);
      loadData();
    }
  };

  const handleEditCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !name.trim()) return;
    setSubmitting(true);
    const success = await updateCustomer(selectedCustomer.id, {
      name,
      phone: phone || null,
      car_name: carName || null,
      plate_number: plateNumber || null,
    });
    setSubmitting(false);
    if (success) {
      setIsEditModalOpen(false);
      setSelectedCustomer(null);
      loadData();
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm(t('confirmDelete'))) {
      await deleteCustomer(id);
      loadData();
    }
  };

  const openCarsModal = async (cust: Customer) => {
    setSelectedCustomer(cust);
    const cars = await getCustomerCars(cust.id);
    setCustomerCars(cars);
    setIsCarsModalOpen(true);
  };

  const handleAddCar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    if (!newCarName && !newPlateNumber) return;
    await addCustomerCar({
      customer_id: selectedCustomer.id,
      car_name: newCarName || null,
      plate_number: newPlateNumber || null,
    });
    setNewCarName('');
    setNewPlateNumber('');
    const updatedCars = await getCustomerCars(selectedCustomer.id);
    setCustomerCars(updatedCars);
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
            {t('customerDirectory')}
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-yellow-400 text-black font-bold border border-yellow-500/40">
              {branchTitle}
            </span>
          </h1>
          <p className="text-xs text-zinc-500 mt-1">{t('appSubtitle')}</p>
        </div>

        <button
          onClick={() => {
            setName('');
            setPhone('');
            setCarName('');
            setPlateNumber('');
            setIsAddModalOpen(true);
          }}
          className="inline-flex items-center space-x-2 rtl:space-x-reverse px-4 py-2.5 rounded-xl font-bold text-xs text-black bg-yellow-400 hover:bg-yellow-500 shadow-md shadow-yellow-400/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{t('addNew')}</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3.5 rtl:right-3.5 rtl:left-auto top-3 text-zinc-400" />
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-50 border border-zinc-300 rounded-xl pl-10 pr-4 rtl:pr-10 rtl:pl-4 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:bg-white focus:outline-none focus:border-yellow-500"
          />
        </div>
        <div className="text-right rtl:text-left">
          <div className="text-xs text-zinc-600 font-bold">
            {t('totalCustomers')}: <span className="text-zinc-900 font-extrabold">{customers.length}</span>
          </div>
          {!search && (
            <p className="text-[11px] text-zinc-400 mt-0.5">
              عرض أحدث 50 عميل فقط — ابحث للعثور على أي عميل في قاعدة البيانات
            </p>
          )}
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-sm">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-400"></div>
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 text-xs font-medium">
            {t('noRecordsFound')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right text-xs text-zinc-800">
              <thead className="bg-zinc-900 text-white font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-xl rtl:rounded-r-xl rtl:rounded-l-none">{t('id')}</th>
                  <th className="p-3">{t('customer')}</th>
                  <th className="p-3">{t('contactNumber')}</th>
                  <th className="p-3">{t('carInfo')}</th>
                  <th className="p-3">Plate</th>
                  <th className="p-3">Vehicles</th>
                  <th className="p-3 text-right rtl:text-left rounded-r-xl rtl:rounded-l-xl rtl:rounded-r-none">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-yellow-50/50 transition-colors">
                    <td className="p-3 font-bold text-zinc-900">#{c.id}</td>
                    <td className="p-3 text-zinc-900 font-bold flex items-center space-x-2 rtl:space-x-reverse">
                      <Users className="w-4 h-4 text-zinc-500" />
                      <span>{c.name}</span>
                    </td>
                    <td className="p-3 text-zinc-700 font-medium">
                      {c.phone ? (
                        <span className="inline-flex items-center space-x-1 rtl:space-x-reverse">
                          <Phone className="w-3 h-3 text-zinc-400" />
                          <span>{c.phone}</span>
                        </span>
                      ) : (
                        <span className="text-zinc-400">N/A</span>
                      )}
                    </td>
                    <td className="p-3 text-zinc-700 font-bold">{c.car_name || 'N/A'}</td>
                    <td className="p-3 text-zinc-500">{c.plate_number || 'N/A'}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openCarsModal(c)}
                          className="inline-flex items-center space-x-1 rtl:space-x-reverse px-2 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-bold text-xs border border-zinc-300 shadow-sm"
                        >
                          <Car className="w-3.5 h-3.5 text-amber-600" />
                          <span>Cars</span>
                        </button>
                        <button
                          onClick={() => openHistoryModal(c)}
                          className="inline-flex items-center space-x-1 rtl:space-x-reverse px-2 py-1 rounded-lg bg-yellow-400 hover:bg-yellow-500 text-zinc-900 font-bold text-xs shadow-sm"
                          title="View Customer Repair History"
                        >
                          <FileText className="w-3.5 h-3.5 text-black" />
                          <span>History</span>
                        </button>
                      </div>
                    </td>
                    <td className="p-3 text-right rtl:text-left">
                      <div className="flex items-center justify-end rtl:justify-start space-x-2 rtl:space-x-reverse">
                        <button
                          onClick={() => {
                            setSelectedCustomer(c);
                            setName(c.name || '');
                            setPhone(c.phone || '');
                            setCarName(c.car_name || '');
                            setPlateNumber(c.plate_number || '');
                            setIsEditModalOpen(true);
                          }}
                          className="p-1.5 hover:bg-yellow-100 rounded-lg text-zinc-600 hover:text-zinc-900 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-1.5 hover:bg-rose-50 rounded-lg text-zinc-400 hover:text-rose-600 transition-colors"
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

      {/* Add Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title={t('addNew')}>
        <form onSubmit={handleCreateCustomer} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">{t('customer')} *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ahmed Hassan"
              className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3.5 py-2 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-yellow-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">{t('contactNumber')}</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 01012345678"
              className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3.5 py-2 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-yellow-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">{t('carInfo')}</label>
              <input
                type="text"
                value={carName}
                onChange={(e) => setCarName(e.target.value)}
                placeholder="e.g. Toyota Corolla"
                className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3.5 py-2 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-yellow-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">Plate Number</label>
              <input
                type="text"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value)}
                placeholder="e.g. ABC 1234"
                className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3.5 py-2 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-yellow-500"
              />
            </div>
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

      {/* Edit Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={t('edit')}>
        <form onSubmit={handleEditCustomer} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">{t('customer')} *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3.5 py-2 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-yellow-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">{t('contactNumber')}</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3.5 py-2 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-yellow-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">{t('carInfo')}</label>
              <input
                type="text"
                value={carName}
                onChange={(e) => setCarName(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3.5 py-2 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-yellow-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">Plate Number</label>
              <input
                type="text"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3.5 py-2 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-yellow-500"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 rtl:space-x-reverse pt-4 border-t border-zinc-100">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs text-zinc-600 hover:bg-zinc-100 font-bold"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-black bg-yellow-400 hover:bg-yellow-500 shadow-md"
            >
              {submitting ? 'Updating...' : t('save')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Customer Cars Management Modal */}
      <Modal isOpen={isCarsModalOpen} onClose={() => setIsCarsModalOpen(false)} title={`Registered Cars - ${selectedCustomer?.name}`}>
        <div className="space-y-4 text-xs">
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {customerCars.length === 0 ? (
              <p className="text-xs text-zinc-500 py-2">No additional cars registered for this customer.</p>
            ) : (
              customerCars.map((car) => (
                <div key={car.id} className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-zinc-900">{car.car_name || 'Vehicle'}</p>
                    <p className="text-zinc-500">Plate: {car.plate_number || 'N/A'}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleAddCar} className="pt-4 border-t border-zinc-100 space-y-3">
            <p className="text-xs font-bold text-zinc-700">Add New Vehicle</p>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Car Name/Model"
                value={newCarName}
                onChange={(e) => setNewCarName(e.target.value)}
                className="bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-1.5 text-xs text-zinc-900 focus:bg-white"
              />
              <input
                type="text"
                placeholder="Plate Number"
                value={newPlateNumber}
                onChange={(e) => setNewPlateNumber(e.target.value)}
                className="bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-1.5 text-xs text-zinc-900 focus:bg-white"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 rounded-xl text-xs font-bold text-black bg-yellow-400 hover:bg-yellow-500 shadow-md"
            >
              Add Vehicle
            </button>
          </form>
        </div>
      </Modal>

      {/* CUSTOMER REPAIR HISTORY MODAL */}
      {isHistoryModalOpen && selectedCustomer && (
        <Modal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          title={`سجل صيانة العميل / Repair History — ${selectedCustomer.name}`}
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs">
            {/* Customer summary bar */}
            <div className="p-3 bg-zinc-100 rounded-2xl border border-zinc-200 flex flex-wrap gap-3 justify-between items-center font-bold text-zinc-800">
              <div className="flex flex-wrap gap-4">
                <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-zinc-500" />{selectedCustomer.phone || 'N/A'}</span>
                <span className="flex items-center gap-1"><Car className="w-3.5 h-3.5 text-zinc-500" />{selectedCustomer.car_name || 'N/A'} — {selectedCustomer.plate_number || 'N/A'}</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-yellow-400 text-black text-[11px]">
                {customerRepairs.length} فواتير مسجلة
              </span>
            </div>

            {loadingHistory ? (
              <div className="flex justify-center items-center py-10 gap-2 text-zinc-500 font-bold">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-yellow-400"></div>
                جاري تحميل سجل الصيانة...
              </div>
            ) : customerRepairs.length === 0 ? (
              <div className="text-center py-10 text-zinc-400 bg-slate-50 rounded-2xl font-bold">
                لا توجد فواتير صيانة سابقة لـ {selectedCustomer.name}
              </div>
            ) : (
              <div className="space-y-3 max-h-[28rem] overflow-y-auto pr-1">
                {customerRepairs.map((r) => {
                  const total   = Number(r.total_amount  || 0);
                  const paid    = Number(r.paid_amount   || 0);
                  const pending = Number(r.pending_amount || 0);
                  const isPending = pending > 0;

                  return (
                    <div
                      key={r.id}
                      className={`rounded-2xl border ${isPending ? 'border-rose-200 bg-rose-50/40' : 'border-emerald-200 bg-emerald-50/30'} p-4 space-y-3`}
                    >
                      {/* Top row: invoice # + date + status badge */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-zinc-900 text-sm">#{r.id}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isPending ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>
                            {isPending ? 'آجل / Pending' : 'مدفوع / Paid'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-zinc-400" />
                          <span className="text-zinc-500 font-semibold">{r.date || 'N/A'}</span>
                        </div>
                      </div>

                      {/* Description */}
                      {r.description && (
                        <div className="p-2.5 bg-white rounded-xl border border-zinc-200">
                          <p className="text-[10px] font-bold text-zinc-500 uppercase mb-1">الخدمات / Services</p>
                          <p className="font-bold text-zinc-900 leading-relaxed">{r.description}</p>
                        </div>
                      )}

                      {/* Meta row: payment method + odometer */}
                      <div className="flex flex-wrap gap-2">
                        {r.payment_method && (
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 font-bold text-[11px] text-zinc-700">
                            💳 {r.payment_method}
                          </span>
                        )}
                        {r.odometer && (
                          <span className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 font-bold text-[11px] text-blue-700">
                            🛣 عداد: {r.odometer} كم
                          </span>
                        )}
                      </div>

                      {/* Notes */}
                      {r.notes && !r.notes.startsWith('__SPLIT__') && (
                        <div className="p-2.5 bg-yellow-50 rounded-xl border border-yellow-200">
                          <p className="text-[10px] font-bold text-yellow-700 uppercase mb-0.5">ملاحظات / Notes</p>
                          <p className="text-zinc-800 font-semibold leading-relaxed">{r.notes}</p>
                        </div>
                      )}

                      {/* Financials */}
                      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-zinc-200">
                        <div className="text-center">
                          <p className="text-[10px] text-zinc-400 font-bold uppercase">الإجمالي</p>
                          <p className="font-black text-zinc-900">${total.toFixed(2)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-emerald-500 font-bold uppercase">المدفوع</p>
                          <p className="font-black text-emerald-600">${paid.toFixed(2)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-rose-400 font-bold uppercase">المتبقي</p>
                          <p className={`font-black ${pending > 0 ? 'text-rose-600' : 'text-zinc-400'}`}>
                            ${pending.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Modal>
      )}

    </div>
  );
}
