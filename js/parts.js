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
    const savePartBtn = document.getElementById('savePartBtn');
    const partSupplierSelect = document.getElementById('partSupplier');

    // Print Elements
    const printPartsBtn = document.getElementById('printPartsBtn');
    const printModal = document.getElementById('printModal');
    const printArea = document.getElementById('printArea');
    const closePrintBtn = document.getElementById('closePrintBtn');
    const confirmPrintBtn = document.getElementById('confirmPrintBtn');

    function loadSuppliers() {
        const suppliers = db.getSuppliers();
        partSupplierSelect.innerHTML = '<option value="">No Supplier</option>';
        suppliers.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = s.name;
            partSupplierSelect.appendChild(opt);
        });
    }

    function loadParts() {
        partsTableBody.innerHTML = '';
        const parts = db.getParts();
        
        if (parts.length === 0) {
            const lang = getCurrentLanguage();
            const t = translations[lang];
            partsTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">${t.noParts}</td></tr>`;
            return;
        }

        parts.forEach(p => {
            const tr = document.createElement('tr');
            
            // Highlight low stock
            if (p.quantity_in_stock < 5) {
                tr.style.backgroundColor = '#fef2f2';
            }

            const pJson = encodeURIComponent(JSON.stringify(p));

            tr.innerHTML = `
                <td class="font-bold text-teal">${p.name}</td>
                <td>${p.category}</td>
                <td>${p.supplier_name || '-'}</td>
                <td>
                    <input type="number" class="form-control edit-qty" data-id="${p.id}" value="${p.quantity_in_stock}" min="0" style="width: 70px; padding: 0.25rem;">
                </td>
                <td>
                    <input type="number" class="form-control edit-price" data-id="${p.id}" value="${p.unit_price}" min="0" step="0.01" style="width: 90px; padding: 0.25rem;">
                </td>
                <td>
                    <div style="display: flex; gap: 0.4rem; justify-content: flex-end;">
                        <button class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="editPart('${pJson}')">
                            ${getCurrentLanguage() === 'ar' ? 'تعديل' : 'Edit'}
                        </button>
                        <button class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; color: #ef4444; border-color: #fee2e2;" onclick="deletePart(${p.id})">
                            ${getCurrentLanguage() === 'ar' ? 'حذف' : 'Delete'}
                        </button>
                    </div>
                </td>
            `;
            partsTableBody.appendChild(tr);
        });

        // Attach event listeners for inline editing
        document.querySelectorAll('.edit-qty').forEach(input => {
            input.addEventListener('change', handleInlineEdit);
        });
        document.querySelectorAll('.edit-price').forEach(input => {
            input.addEventListener('change', handleInlineEdit);
        });
    }

    function handleInlineEdit(e) {
        const tr = e.target.closest('tr');
        const id = e.target.getAttribute('data-id');
        const qtyInput = tr.querySelector('.edit-qty');
        const priceInput = tr.querySelector('.edit-price');
        
        const newQty = parseInt(qtyInput.value) || 0;
        const newPrice = parseFloat(priceInput.value) || 0;

        // Use updatePartInline — only updates qty & price, avoids NOT NULL error on name
        db.updatePartInline(id, newQty, newPrice);
        
        // Update low stock warning visually
        if (newQty < 5) {
            tr.style.backgroundColor = '#fef2f2';
        } else {
            tr.style.backgroundColor = '';
        }
    }

    let editingPartId = null;
    const cancelPartBtn = document.getElementById('cancelPartBtn');

    window.editPart = function(jsonStr) {
        const p = (typeof jsonStr === 'string') ? JSON.parse(decodeURIComponent(jsonStr)) : jsonStr;
        editingPartId = p.id;
        document.getElementById('partName').value = p.name;
        document.getElementById('partCategory').value = p.category;
        document.getElementById('partSupplier').value = p.supplier_id || '';
        document.getElementById('partQty').value = p.quantity_in_stock;
        document.getElementById('partPrice').value = p.unit_price;
        
        savePartBtn.textContent = getCurrentLanguage() === 'en' ? 'Update Part' : 'تحديث القطعة';
        if (cancelPartBtn) cancelPartBtn.style.display = 'inline-block';
    };

    window.deletePart = function(id) {
        const lang = getCurrentLanguage();
        const msg = lang === 'ar' ? 'هل أنت متأكد من حذف هذه القطعة؟' : 'Are you sure you want to delete this part?';
        if (confirm(msg)) {
            db.deletePart(id);
            if (editingPartId == id) resetPartForm();
            loadParts();
        }
    };

    function resetPartForm() {
        editingPartId = null;
        document.getElementById('partName').value = '';
        document.getElementById('partQty').value = '0';
        document.getElementById('partPrice').value = '0';
        document.getElementById('partSupplier').value = '';
        savePartBtn.textContent = getCurrentLanguage() === 'en' ? 'Save Part' : 'حفظ القطعة';
        if (cancelPartBtn) cancelPartBtn.style.display = 'none';
    }

    if (cancelPartBtn) cancelPartBtn.addEventListener('click', resetPartForm);

    // Save/Update Part
    savePartBtn.addEventListener('click', () => {
        const name = document.getElementById('partName').value.trim();
        const category = document.getElementById('partCategory').value;
        const supplier_id = document.getElementById('partSupplier').value || null;
        const quantity_in_stock = parseInt(document.getElementById('partQty').value) || 0;
        const unit_price = parseFloat(document.getElementById('partPrice').value) || 0;

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
        loadParts();
    });

    // Print Inventory Logic
    if (printPartsBtn) {
        printPartsBtn.addEventListener('click', () => {
            const lang = getCurrentLanguage();
            const t = translations[lang];
            const date = new Date().toLocaleDateString();
            const parts = db.getParts();

            printArea.innerHTML = `
                <div style="text-align: center; border-bottom: 2px solid #eee; padding-bottom: 1rem; margin-bottom: 1rem;">
                    <h1 style="color: #0d9488;">${t.appName}</h1>
                    <h2>${t.printInventory}</h2>
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
                                <td style="padding: 0.5rem;">${p.category}</td>
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

    if (closePrintBtn) closePrintBtn.onclick = () => printModal.classList.remove('active');
    if (confirmPrintBtn) confirmPrintBtn.onclick = () => window.print();

    loadSuppliers();
    loadParts();
});
