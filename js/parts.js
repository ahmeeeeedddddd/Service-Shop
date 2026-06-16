const db = require('../database/db.js');

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
            partsTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No parts in inventory.</td></tr>';
            return;
        }

        parts.forEach(p => {
            const tr = document.createElement('tr');
            
            // Highlight low stock
            if (p.quantity_in_stock < 5) {
                tr.style.backgroundColor = '#fef2f2'; // light red background for warning
            }

            tr.innerHTML = `
                <td class="font-bold">${p.name}</td>
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

    // Save Part
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

        db.addPart({ name, category, supplier_id, quantity_in_stock, unit_price });
        
        document.getElementById('partName').value = '';
        document.getElementById('partQty').value = '0';
        document.getElementById('partPrice').value = '0';
        document.getElementById('partSupplier').value = '';
        
        loadParts();
    });

    loadSuppliers();
    loadParts();
});
