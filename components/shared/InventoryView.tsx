'use client';

import React, { useState, useEffect } from 'react';
import { Part, getParts, addPart, updatePart, deletePart, Supplier, getSuppliers } from '@/lib/shared/queries';
import { Modal } from './Modal';
import { Package, Plus, Search, Edit, Trash2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';

interface InventoryViewProps {
  branchTitle: string;
}

export function InventoryView({ branchTitle }: InventoryViewProps) {
  const { t, language } = useTranslation();
  const [parts, setParts] = useState<Part[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState('0');
  const [unitPrice, setUnitPrice] = useState('0');
  const [supplierId, setSupplierId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [partsData, suppsData] = await Promise.all([getParts(), getSuppliers()]);
    setParts(partsData);
    setSuppliers(suppsData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const CATEGORIES = [
    { key: 'Mechanical', ar: 'ميكانيكا', en: 'Mechanical' },
    { key: 'Electrical', ar: 'كهرباء', en: 'Electrical' },
    { key: 'Body parts', ar: 'عفشة وهيكل', en: 'Body parts' },
    { key: 'Fluids and filters', ar: 'سوائل وزيوت', en: 'Fluids and filters' },
    { key: 'Other', ar: 'أخرى', en: 'Other' },
  ];

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  const filteredParts = parts.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory =
      selectedCategoryFilter === 'all' ||
      (p.category && p.category.toLowerCase() === selectedCategoryFilter.toLowerCase());

    return matchesSearch && matchesCategory;
  });

  // Group parts by category
  const groupedPartsMap: { [cat: string]: Part[] } = {};
  filteredParts.forEach((p) => {
    const cat = p.category || 'Other';
    if (!groupedPartsMap[cat]) groupedPartsMap[cat] = [];
    groupedPartsMap[cat].push(p);
  });

  const handleCreatePart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    await addPart({
      name,
      category: category || 'Other',
      quantity_in_stock: Number(quantity) || 0,
      unit_price: Number(unitPrice) || 0,
      supplier_id: supplierId ? Number(supplierId) : null,
    });
    setSubmitting(false);
    resetForm();
    setIsAddModalOpen(false);
    loadData();
  };

  const handleEditPart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPart || !name.trim()) return;
    setSubmitting(true);
    await updatePart(selectedPart.id, {
      name,
      category: category || 'Other',
      quantity_in_stock: Number(quantity) || 0,
      unit_price: Number(unitPrice) || 0,
      supplier_id: supplierId ? Number(supplierId) : null,
    });
    setSubmitting(false);
    resetForm();
    setIsEditModalOpen(false);
    loadData();
  };

  const handleDeletePart = async (id: number) => {
    if (confirm(t('confirmDelete'))) {
      await deletePart(id);
      loadData();
    }
  };

  const resetForm = () => {
    setName('');
    setCategory('');
    setQuantity('0');
    setUnitPrice('0');
    setSupplierId('');
    setSelectedPart(null);
  };

  const openEditModal = (part: Part) => {
    setSelectedPart(part);
    setName(part.name || '');
    setCategory(part.category || '');
    setQuantity(String(part.quantity_in_stock || 0));
    setUnitPrice(String(part.unit_price || 0));
    setSupplierId(part.supplier_id ? String(part.supplier_id) : '');
    setIsEditModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
            {t('partsInventory')}
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-yellow-400 text-black font-bold border border-yellow-500/40">
              {branchTitle}
            </span>
          </h1>
          <p className="text-xs text-zinc-500 mt-1">{t('appSubtitle')}</p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setIsAddModalOpen(true);
          }}
          className="inline-flex items-center space-x-2 rtl:space-x-reverse px-4 py-2.5 rounded-xl font-bold text-xs text-black bg-yellow-400 hover:bg-yellow-500 shadow-md shadow-yellow-400/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{t('addNew')}</span>
        </button>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm text-xs">
        <div className="flex flex-col sm:flex-row gap-3 items-center w-full md:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3.5 rtl:right-3.5 rtl:left-auto top-2.5 text-zinc-400" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-300 rounded-xl pl-10 pr-4 rtl:pr-10 rtl:pl-4 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:bg-white focus:outline-none focus:border-yellow-500 font-medium"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <span className="font-bold text-zinc-700 whitespace-nowrap">{t('category')}:</span>
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="w-full sm:w-auto bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 font-bold text-zinc-900 focus:outline-none focus:border-yellow-500"
            >
              <option value="all">جميع التصنيفات (All)</option>
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.ar} ({c.en})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-bold whitespace-nowrap">
          <div className="bg-yellow-50 text-zinc-900 px-3 py-1.5 rounded-xl border border-yellow-200 flex items-center gap-1.5">
            <span className="text-zinc-600">{language === 'ar' ? 'إجمالي قيمة المخزون والقطع:' : 'Total Money Value of Stock:'}</span>
            <span className="text-emerald-600 font-black text-sm">
              ${parts.reduce((acc, p) => acc + (Number(p.quantity_in_stock || 0) * Number(p.unit_price || 0)), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div>
            {t('partsInventory')}: <span className="text-zinc-900 font-extrabold">{filteredParts.length}</span>
          </div>
        </div>
      </div>

      {/* Grouped Inventory Table */}
      <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-sm space-y-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-400"></div>
          </div>
        ) : filteredParts.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 text-xs font-medium">
            {t('noRecordsFound')}
          </div>
        ) : (
          Object.keys(groupedPartsMap).map((catName) => {
            const catParts = groupedPartsMap[catName];
            const catObj = CATEGORIES.find((c) => c.key.toLowerCase() === catName.toLowerCase());
            const displayCatName = catObj ? `${catObj.ar} (${catObj.en})` : catName;

            return (
              <div key={catName} className="space-y-2">
                <div className="flex items-center justify-between bg-zinc-100 px-4 py-2 rounded-xl border border-zinc-200">
                  <h3 className="font-black text-zinc-900 text-xs flex items-center gap-2">
                    <Package className="w-4 h-4 text-yellow-500" />
                    <span>{displayCatName}</span>
                  </h3>
                  <span className="text-[11px] font-bold text-zinc-600 bg-white px-2.5 py-0.5 rounded-full border border-zinc-200">
                    {catParts.length} {catParts.length === 1 ? 'عنصر' : 'عناصر'}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left rtl:text-right text-xs text-zinc-800">
                    <thead className="bg-zinc-900 text-white font-bold uppercase tracking-wider">
                      <tr>
                        <th className="p-3">{t('id')}</th>
                        <th className="p-3">{t('partName')}</th>
                        <th className="p-3">{t('quantityInStock')}</th>
                        <th className="p-3">{t('unitPrice')} ($)</th>
                        <th className="p-3">{t('supplierName')}</th>
                        <th className="p-3 text-right rtl:text-left">{t('actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {catParts.map((p) => {
                        const supplier = suppliers.find((s) => s.id === p.supplier_id);
                        const lowStock = Number(p.quantity_in_stock) <= 2;
                        return (
                          <tr key={p.id} className="hover:bg-yellow-50/50 transition-colors">
                            <td className="p-3 font-bold text-zinc-900">#{p.id}</td>
                            <td className="p-3 text-zinc-900 font-bold flex items-center space-x-2 rtl:space-x-reverse">
                              <span>{p.name}</span>
                            </td>
                            <td className="p-3">
                              <span
                                className={`font-bold px-2.5 py-0.5 rounded-full ${
                                  lowStock ? 'bg-rose-100 text-rose-700 border border-rose-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                }`}
                              >
                                {Number(p.quantity_in_stock).toLocaleString()} units
                              </span>
                            </td>
                            <td className="p-3 font-extrabold text-zinc-900">
                              ${Number(p.unit_price || 0).toLocaleString()}
                            </td>
                            <td className="p-3 text-zinc-600 font-medium">{supplier?.name || 'Unassigned'}</td>
                            <td className="p-3 text-right rtl:text-left">
                              <div className="flex items-center justify-end rtl:justify-start space-x-2 rtl:space-x-reverse">
                                <button
                                  onClick={() => openEditModal(p)}
                                  className="p-1.5 hover:bg-yellow-100 rounded-lg text-zinc-600 hover:text-zinc-900 transition-colors"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeletePart(p.id)}
                                  className="p-1.5 hover:bg-rose-50 rounded-lg text-zinc-400 hover:text-rose-600 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title={t('addNew')}>
        <form onSubmit={handleCreatePart} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">{t('partName')} *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Brake Pads, Oil Filter, Primer Paint"
              className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3.5 py-2 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-yellow-500 font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">{t('category')}</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3.5 py-2 text-xs text-zinc-900 font-bold focus:bg-white focus:outline-none focus:border-yellow-500"
            >
              <option value="">اختر التصنيف...</option>
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.ar} ({c.en})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">{t('quantityInStock')}</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3.5 py-2 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-yellow-500 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">{t('unitPrice')} ($)</label>
              <input
                type="number"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3.5 py-2 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-yellow-500 font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">{t('supplierName')}</label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3.5 py-2 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-yellow-500 font-bold"
            >
              <option value="">No Supplier Selected</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
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
        <form onSubmit={handleEditPart} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">{t('partName')} *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3.5 py-2 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-yellow-500 font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">{t('category')}</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3.5 py-2 text-xs text-zinc-900 font-bold focus:bg-white focus:outline-none focus:border-yellow-500"
            >
              <option value="">اختر التصنيف...</option>
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.ar} ({c.en})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">{t('quantityInStock')}</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3.5 py-2 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-yellow-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">{t('unitPrice')} ($)</label>
              <input
                type="number"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3.5 py-2 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-yellow-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">{t('supplierName')}</label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3.5 py-2 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-yellow-500"
            >
              <option value="">No Supplier Selected</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
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
              {submitting ? 'Saving...' : t('save')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
