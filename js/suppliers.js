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
        
        if (suppliers.length === 0) {
            const lang = getCurrentLanguage();
            const t = translations[lang];
            suppliersTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">${t.noSuppliers}</td></tr>`;
            return;
        }

        suppliers.forEach(s => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="font-bold">${s.name}</td>
                <td>${s.contact_number || '-'}</td>
                <td>${s.supplies_what || '-'}</td>
                <td>${s.notes || '-'}</td>
                <td><button class="btn btn-outline btn-delete" data-id="${s.id}" style="color: #ef4444; border-color: #fee2e2;">Delete</button></td>
            `;
            suppliersTableBody.appendChild(tr);
        });
    }

    // Save Supplier
    saveSupplierBtn.addEventListener('click', () => {
        const name = document.getElementById('supName').value;
        const contact_number = document.getElementById('supPhone').value;
        const supplies_what = document.getElementById('supSupplies').value;
        const notes = document.getElementById('supNotes').value;

        if (!name) {
            alert('Supplier Name is required');
            return;
        }

        db.addSupplier({ name, contact_number, supplies_what, notes });
        
        document.getElementById('supName').value = '';
        document.getElementById('supPhone').value = '';
        document.getElementById('supSupplies').value = '';
        document.getElementById('supNotes').value = '';
        
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
