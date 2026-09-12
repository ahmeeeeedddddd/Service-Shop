let db;
try {
    db = require('../database/db.js');
} catch (e) {
    console.error('Failed to load database:', e);
    alert('Database Error: Could not connect to the database.');
}

document.addEventListener('DOMContentLoaded', () => {
    translatePage();

    const langToggle = document.getElementById('langToggle');
    if (langToggle) {
        langToggle.addEventListener('click', () => {
            const newLang = getCurrentLanguage() === 'en' ? 'ar' : 'en';
            setLanguage(newLang);
        });
    }

    const partsTableBody = document.getElementById('partsTableBody');
    const savePartBtn    = document.getElementById('savePartBtn');
    const partSupplierSelect = document.getElementById('partSupplier');

    // Print Elements
    const printPartsBtn  = document.getElementById('printPartsBtn');
    const printModal     = document.getElementById('printModal');
    const printArea      = document.getElementById('printArea');
    const closePrintBtn  = document.getElementById('closePrintBtn');
    const confirmPrintBtn = document.getElementById('confirmPrintBtn');
    const printCategoryFilter = document.getElementById('printCategoryFilter');

    let allSuppliers = [];

    /* ─── Category helpers ─── */
    const CATEGORIES = [
        { value: 'Mechanical',        label: 'Mechanical / ميكانيكا' },
        { value: 'Electrical',        label: 'Electrical / كهربا' },
        { value: 'Body parts',        label: 'Body parts / عفشه' },
        { value: 'Fluids and filters',label: 'Fluids & filters / سوائل و زيوت' },
        { value: 'Other',             label: 'Other / أخرى' },
    ];

    /** Normalise any legacy or new category value to one of the 5 canonical values */
    function normalizeCategory(cat) {
        if (!cat) return 'Other';
        const c = cat.toLowerCase();
        if (c === 'mechanical' || c === 'engine') return 'Mechanical';
        if (c === 'electrical') return 'Electrical';
        if (c === 'body parts' || c === 'brakes' || c === 'suspension') return 'Body parts';
        if (c === 'fluids and filters' || c === 'fluids' || c === 'oil' || c === 'filter' || c === 'filters') return 'Fluids and filters';
        // If it's already one of the canonical values, pass through
        if (CATEGORIES.find(x => x.value === cat)) return cat;
        return 'Other';
    }

    function getTranslatedCategory(cat, lang) {
        const norm = normalizeCategory(cat);
        const map = {
            'Mechanical':         lang === 'ar' ? 'ميكانيكا'        : 'Mechanical',
            'Electrical':         lang === 'ar' ? 'كهربا'           : 'Electrical',
            'Body parts':         lang === 'ar' ? 'عفشه'            : 'Body parts',
            'Fluids and filters': lang === 'ar' ? 'سوائل و زيوت'   : 'Fluids & filters',
            'Other':              lang === 'ar' ? 'أخرى'            : 'Other',
        };
        return map[norm] || (cat || '-');
    }

    function makeCategoryOptions(currentCat) {
        const norm = normalizeCategory(currentCat);
        return CATEGORIES.map(c =>
            `<option value="${c.value}" ${norm === c.value ? 'selected' : ''}>${c.label}</option>`
        ).join('');
    }

    function makeSupplierOptions(currentSupplierId) {
        let opts = '<option value="">No Supplier</option>';
        allSuppliers.forEach(s => {
            opts += `<option value="${s.id}" ${s.id == currentSupplierId ? 'selected' : ''}>${s.name}</option>`;
        });
        return opts;
    }

    /* ─── Load suppliers ─── */
    function loadSuppliers() {
        allSuppliers = db.getSuppliers();
        partSupplierSelect.innerHTML = '<option value="">No Supplier</option>';
        allSuppliers.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = s.name;
            partSupplierSelect.appendChild(opt);
        });
    }

    /* ─── Load / render parts table ─── */
    function loadParts(term, categoryFilter) {
        partsTableBody.innerHTML = '';
        let parts = term ? db.searchParts(term) : db.getParts();

        // Filter by category if one is selected
        if (categoryFilter && categoryFilter !== 'all') {
            parts = parts.filter(p => normalizeCategory(p.category) === categoryFilter);
        }

        if (parts.length === 0) {
            const lang = getCurrentLanguage();
            const t = translations[lang];
            partsTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:2rem; color:#94a3b8;">${t.noParts || 'No parts found'}</td></tr>`;
            return;
        }

        const lang = getCurrentLanguage();

        parts.forEach(p => {
            const tr = document.createElement('tr');

            if (p.quantity_in_stock < 5) {
                tr.style.backgroundColor = '#fef2f2';
            }

            tr.innerHTML = `
                <td class="font-bold text-teal">${p.name}</td>
                <td style="padding: 0.35rem 0.5rem;">
                    <select class="form-control inline-cat-select"
                        data-id="${p.id}"
                        data-name="${encodeURIComponent(p.name)}"
                        data-qty="${p.quantity_in_stock}"
                        data-price="${p.unit_price}"
                        data-supplier-id="${p.supplier_id || ''}"
                        style="font-size:0.8rem; padding:0.2rem 0.4rem; min-width:150px;">
                        ${makeCategoryOptions(p.category)}
                    </select>
                </td>
                <td style="padding: 0.35rem 0.5rem;">
                    <select class="form-control inline-sup-select"
                        data-id="${p.id}"
                        data-name="${encodeURIComponent(p.name)}"
                        data-qty="${p.quantity_in_stock}"
                        data-price="${p.unit_price}"
                        style="font-size:0.8rem; padding:0.2rem 0.4rem; min-width:130px;">
                        ${makeSupplierOptions(p.supplier_id)}
                    </select>
                </td>
                <td>
                    <input type="number" class="form-control edit-qty" data-id="${p.id}" value="${p.quantity_in_stock}" min="0" style="width: 70px; padding: 0.25rem;">
                </td>
                <td>
                    <input type="number" class="form-control edit-price" data-id="${p.id}" value="${p.unit_price}" min="0" step="0.01" style="width: 90px; padding: 0.25rem;">
                </td>
                <td>
                    <div style="display: flex; gap: 0.4rem; justify-content: flex-end;">
                        <button class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="editPart(${p.id})">
                            ${lang === 'ar' ? 'تعديل' : 'Edit'}
                        </button>
                        <button class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; color: #ef4444; border-color: #fee2e2;" onclick="deletePart(${p.id})">
                            ${lang === 'ar' ? 'حذف' : 'Delete'}
                        </button>
                    </div>
                </td>
            `;
            partsTableBody.appendChild(tr);
        });

        // Inline qty/price edit
        document.querySelectorAll('.edit-qty').forEach(input => input.addEventListener('change', handleInlineEdit));
        document.querySelectorAll('.edit-price').forEach(input => input.addEventListener('change', handleInlineEdit));

        // Inline category change — save immediately
        document.querySelectorAll('.inline-cat-select').forEach(sel => {
            sel.addEventListener('change', function () {
                const id          = this.dataset.id;
                const name        = decodeURIComponent(this.dataset.name);
                const qty         = parseInt(this.dataset.qty) || 0;
                const price       = parseFloat(this.dataset.price) || 0;
                const supplierId  = this.dataset.supplierId || null;
                db.updatePart(id, qty, price, name, this.value, supplierId || null);
            });
        });

        // Inline supplier change — save immediately
        document.querySelectorAll('.inline-sup-select').forEach(sel => {
            sel.addEventListener('change', function () {
                const id     = this.dataset.id;
                const name   = decodeURIComponent(this.dataset.name);
                const qty    = parseInt(this.dataset.qty) || 0;
                const price  = parseFloat(this.dataset.price) || 0;
                const catSel = this.closest('tr').querySelector('.inline-cat-select');
                const cat    = catSel ? catSel.value : 'Other';
                db.updatePart(id, qty, price, name, cat, this.value || null);
            });
        });

        updateTotalStockValue(parts);
    }

    function updateTotalStockValue(partsList) {
        const el = document.getElementById('totalStockValue');
        if (!el) return;
        let total = 0;
        const items = partsList || db.getParts();
        items.forEach(p => { total += (p.quantity_in_stock || 0) * (p.unit_price || 0); });
        el.textContent = `$${total.toFixed(2)}`;
    }

    function handleInlineEdit(e) {
        const tr       = e.target.closest('tr');
        const id       = e.target.getAttribute('data-id');
        const qtyInput = tr.querySelector('.edit-qty');
        const priceInput = tr.querySelector('.edit-price');
        const newQty   = parseInt(qtyInput.value) || 0;
        const newPrice = parseFloat(priceInput.value) || 0;
        db.updatePartInline(id, newQty, newPrice);
        tr.style.backgroundColor = newQty < 5 ? '#fef2f2' : '';
        updateTotalStockValue();
    }

    /* ─── Edit Part (fills the right-panel form) ─── */
    let editingPartId = null;
    const cancelPartBtn = document.getElementById('cancelPartBtn');

    window.editPart = function (partId) {
        const allParts = db.getParts();
        const p = allParts.find(x => x.id === partId);
        if (!p) return;
        editingPartId = p.id;
        document.getElementById('partName').value     = p.name;
        document.getElementById('partCategory').value = normalizeCategory(p.category);
        document.getElementById('partSupplier').value = p.supplier_id || '';
        document.getElementById('partQty').value      = p.quantity_in_stock;
        document.getElementById('partPrice').value    = p.unit_price;
        savePartBtn.textContent = getCurrentLanguage() === 'en' ? 'Update Part' : 'تحديث القطعة';
        if (cancelPartBtn) cancelPartBtn.style.display = 'inline-block';
    };

    window.deletePart = function (id) {
        const lang = getCurrentLanguage();
        const msg  = lang === 'ar' ? 'هل أنت متأكد من حذف هذه القطعة؟' : 'Are you sure you want to delete this part?';
        if (confirm(msg)) {
            db.deletePart(id);
            if (editingPartId == id) resetPartForm();
            loadParts(partsSearchInput ? partsSearchInput.value.trim() : '', printCategoryFilter ? printCategoryFilter.value : 'all');
        }
    };

    function resetPartForm() {
        editingPartId = null;
        document.getElementById('partName').value     = '';
        document.getElementById('partQty').value      = '0';
        document.getElementById('partPrice').value    = '0';
        document.getElementById('partSupplier').value = '';
        savePartBtn.textContent = getCurrentLanguage() === 'en' ? 'Save Part' : 'حفظ القطعة';
        if (cancelPartBtn) cancelPartBtn.style.display = 'none';
    }

    if (cancelPartBtn) cancelPartBtn.addEventListener('click', resetPartForm);

    /* ─── Save / Update Part ─── */
    savePartBtn.addEventListener('click', () => {
        const name              = document.getElementById('partName').value.trim();
        const category          = document.getElementById('partCategory').value;
        const supplier_id       = document.getElementById('partSupplier').value || null;
        const quantity_in_stock = parseInt(document.getElementById('partQty').value) || 0;
        const unit_price        = parseFloat(document.getElementById('partPrice').value) || 0;

        if (!name) {
            alert(getCurrentLanguage() === 'ar' ? 'اسم القطعة مطلوب' : 'Part Name is required');
            return;
        }

        if (editingPartId) {
            db.updatePart(editingPartId, quantity_in_stock, unit_price, name, category, supplier_id);
        } else {
            db.addPart({ name, category, supplier_id, quantity_in_stock, unit_price });
        }

        resetPartForm();
        loadParts(partsSearchInput ? partsSearchInput.value.trim() : '', printCategoryFilter ? printCategoryFilter.value : 'all');
    });

    /* ─── Category filter dropdown (also filters table) ─── */
    if (printCategoryFilter) {
        printCategoryFilter.addEventListener('change', () => {
            const term = partsSearchInput ? partsSearchInput.value.trim() : '';
            loadParts(term, printCategoryFilter.value);
        });
    }

    /* ─── Print Inventory ─── */
    if (printPartsBtn) {
        printPartsBtn.addEventListener('click', () => {
            const lang        = getCurrentLanguage();
            const t           = translations[lang];
            const date        = new Date().toLocaleDateString();
            const selectedCat = printCategoryFilter ? printCategoryFilter.value : 'all';

            let parts = db.getParts();
            if (selectedCat !== 'all') {
                parts = parts.filter(p => normalizeCategory(p.category) === selectedCat);
            }

            const catLabel = selectedCat !== 'all' ? `(${getTranslatedCategory(selectedCat, lang)})` : '';

            printArea.innerHTML = `
                <div style="text-align: center; border-bottom: 2px solid #eee; padding-bottom: 1rem; margin-bottom: 1rem;">
                    <h1 style="color: #0d9488;">${t.appName}</h1>
                    <h2>${t.printInventory} ${catLabel}</h2>
                    <p>${t.date}: ${date}</p>
                </div>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f8fafc; border-bottom: 2px solid #eee;">
                            <th style="padding: 0.5rem; text-align: left;">${t.partName}</th>
                            <th style="padding: 0.5rem; text-align: left;">${t.category}</th>
                            <th style="padding: 0.5rem; text-align: left;">${t.supplier}</th>
                            <th style="padding: 0.5rem; text-align: center;">${t.qtyInStock}</th>
                            <th style="padding: 0.5rem; text-align: right;">${t.unitPrice}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${parts.map(p => `
                            <tr style="border-bottom: 1px solid #eee;">
                                <td style="padding: 0.5rem;">${p.name}</td>
                                <td style="padding: 0.5rem;">${getTranslatedCategory(p.category, lang)}</td>
                                <td style="padding: 0.5rem;">${p.supplier_name || '-'}</td>
                                <td style="padding: 0.5rem; text-align: center;">${p.quantity_in_stock}</td>
                                <td style="padding: 0.5rem; text-align: right;">$${parseFloat(p.unit_price).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;

            if (lang === 'ar') {
                printArea.style.direction = 'rtl';
                printArea.querySelectorAll('th').forEach(th => th.style.textAlign = 'right');
            } else {
                printArea.style.direction = 'ltr';
            }

            printModal.classList.add('active');
        });
    }

    if (closePrintBtn)   closePrintBtn.onclick   = () => printModal.classList.remove('active');
    if (confirmPrintBtn) confirmPrintBtn.onclick = () => window.print();

    /* ─── Search ─── */
    const partsSearchInput = document.getElementById('partsSearchInput');
    if (partsSearchInput) {
        partsSearchInput.addEventListener('input', () => {
            loadParts(partsSearchInput.value.trim(), printCategoryFilter ? printCategoryFilter.value : 'all');
        });
    }

    loadSuppliers();
    loadParts();
});
