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
                tr.style.backgroundColor = '#fef2f2'; // light red background for warning
            }

            tr.innerHTML = `
                <td class="font-bold text-teal" style="cursor: pointer;" onclick="editPart(${JSON.stringify(p).replace(/"/g, '&quot;')})">${p.name}</td>
                <td>${p.category}</td>
                <td>${p.supplier_name || '-'}</td>
                <td>
                    <input type="number" class="form-control edit-qty" data-id="${p.id}" value="${p.quantity_in_stock}" min="0" style="width: 70px; padding: 0.25rem;">
                </td>
                <td>
                    <input type="number" class="form-control edit-price" data-id="${p.id}" value="${p.unit_price}" min="0" step="0.01" style="width: 90px; padding: 0.25rem;">
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

        db.updatePart(id, newQty, newPrice);
        
        // Update low stock warning visually
        if (newQty < 5) {
            tr.style.backgroundColor = '#fef2f2';
        } else {
            tr.style.backgroundColor = '';
        }
    }

    let editingPartId = null;

    window.editPart = function(p) {
        editingPartId = p.id;
        document.getElementById('partName').value = p.name;
        document.getElementById('partCategory').value = p.category;
        document.getElementById('partSupplier').value = p.supplier_id || '';
        document.getElementById('partQty').value = p.quantity_in_stock;
        document.getElementById('partPrice').value = p.unit_price;
        
        savePartBtn.textContent = getCurrentLanguage() === 'en' ? 'Update Part' : 'تحديث القطعة';
    };

    // Save/Update Part
    savePartBtn.addEventListener('click', () => {
        const name = document.getElementById('partName').value;
        const category = document.getElementById('partCategory').value;
        const supplier_id = document.getElementById('partSupplier').value || null;
        const quantity_in_stock = parseInt(document.getElementById('partQty').value) || 0;
        const unit_price = parseFloat(document.getElementById('partPrice').value) || 0;

        if (!name) {
            alert('Part Name is required');
            return;
        }

        if (editingPartId) {
            // Update existing (extended update in db.js needed or use updatePart)
            // For now, let's just re-add or implement a full updatePart
            db.updatePart(editingPartId, quantity_in_stock, unit_price, name, category, supplier_id);
            editingPartId = null;
            savePartBtn.textContent = getCurrentLanguage() === 'en' ? 'Save Part' : 'حفظ القطعة';
        } else {
            db.addPart({ name, category, supplier_id, quantity_in_stock, unit_price });
        }
        
        document.getElementById('partName').value = '';
        document.getElementById('partQty').value = '0';
        document.getElementById('partPrice').value = '0';
        document.getElementById('partSupplier').value = '';
        
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
