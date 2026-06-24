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

    const suppliersTableBody = document.getElementById('suppliersTableBody');
    const saveSupplierBtn = document.getElementById('saveSupplierBtn');

    function loadSuppliers() {
        suppliersTableBody.innerHTML = '';
        const suppliers = db.getSuppliers();
        
        const totalPending = suppliers.reduce((sum, s) => sum + (s.pending_amount || 0), 0);
        const totalSupplierPendingEl = document.getElementById('totalSupplierPendingEl');
        if (totalSupplierPendingEl) {
            totalSupplierPendingEl.textContent = `$${totalPending.toFixed(2)}`;
        }
        
        if (suppliers.length === 0) {
            const lang = getCurrentLanguage();
            const t = translations[lang];
            suppliersTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">${t.noSuppliers}</td></tr>`;
            return;
        }

        suppliers.forEach(s => {
            const tr = document.createElement('tr');
            const pendingAmount = s.pending_amount || 0;
            const hasPending = pendingAmount > 0;
            
            const badgeHtml = hasPending
                ? `<span class="badge" style="background:#fee2e2; color:#ef4444; border:1px solid #ef4444; padding:0.25rem 0.5rem; border-radius:12px; font-size:0.8rem; cursor:pointer;" title="Click to edit" onclick="editPending(${s.id}, ${pendingAmount})">⚠ $${pendingAmount.toFixed(2)}</span>`
                : `<span class="badge" style="background:#dcfce7; color:#10b981; border:1px solid #10b981; padding:0.25rem 0.5rem; border-radius:12px; font-size:0.8rem; cursor:pointer;" title="Click to edit" onclick="editPending(${s.id}, 0)">✓ Settled</span>`;
                
            if (hasPending) {
                tr.style.borderLeft = '4px solid #ef4444';
            }

            tr.innerHTML = `
                <td class="font-bold">${s.name}</td>
                <td>${s.contact_number || '-'}</td>
                <td>${s.supplies_what || '-'}</td>
                <td>${badgeHtml}</td>
                <td>${s.notes || '-'}</td>
                <td><button class="btn btn-outline btn-delete" data-id="${s.id}" style="color: #ef4444; border-color: #fee2e2;">Delete</button></td>
            `;
            suppliersTableBody.appendChild(tr);
        });
    }

    window.editPending = function(id, currentAmount) {
        const lang = getCurrentLanguage();
        const msg = lang === 'ar' ? 'أدخل الرصيد المستحق الجديد:' : 'Enter new pending balance:';
        const newAmt = prompt(msg, currentAmount);
        if (newAmt !== null && !isNaN(newAmt)) {
            db.updateSupplierPending(id, parseFloat(newAmt) || 0);
            loadSuppliers();
        }
    };

    // Save Supplier
    saveSupplierBtn.addEventListener('click', () => {
        const name = document.getElementById('supName').value;
        const contact_number = document.getElementById('supPhone').value;
        const supplies_what = document.getElementById('supSupplies').value;
        const notes = document.getElementById('supNotes').value;
        const pendingInput = document.getElementById('supPending');
        const pending_amount = pendingInput ? parseFloat(pendingInput.value) || 0 : 0;

        if (!name) {
            alert('Supplier Name is required');
            return;
        }

        db.addSupplier({ name, contact_number, supplies_what, notes, pending_amount });
        
        document.getElementById('supName').value = '';
        document.getElementById('supPhone').value = '';
        document.getElementById('supSupplies').value = '';
        document.getElementById('supNotes').value = '';
        if (pendingInput) pendingInput.value = '0';
        
        loadSuppliers();
    });

    // Delete Supplier
    suppliersTableBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-delete')) {
            if (confirm('Are you sure you want to delete this supplier?')) {
                const id = e.target.getAttribute('data-id');
                db.deleteSupplier(id);
                loadSuppliers();
            }
        }
    });

    loadSuppliers();
});
