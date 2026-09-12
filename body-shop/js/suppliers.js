let db;
try { db = require('../database/db.js'); }
catch (e) { console.error('DB load error:', e); alert('Database Error: ' + e.message); }

let editingSupplierId = null;
let historySupplierId = null;

document.addEventListener('DOMContentLoaded', () => {
    translatePage();
    loadSuppliers();
    
    document.getElementById('saveSupplierBtn').onclick = saveSupplier;
    document.getElementById('cancelSupplierBtn').onclick = resetForm;
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('paymentDateInput').value = today;
    document.getElementById('debtDateInput').value = today;
    
    document.getElementById('closeHistoryModalBtn').onclick = () => document.getElementById('supplierHistoryModal').classList.remove('active');
    
    document.getElementById('confirmPaymentToSupplier').onclick = recordSupplierPayment;
    document.getElementById('confirmAddDebt').onclick = addSupplierDebt;
});

function loadSuppliers() {
    const suppliers = db.getSuppliers();
    const tbody = document.getElementById('suppliersTableBody');
    tbody.innerHTML = '';
    
    let totalPending = 0;
    let settledCount = 0;
    
    suppliers.forEach(s => {
        const tr = document.createElement('tr');
        const pendingAmt = s.pending_amount || 0;
        
        if (pendingAmt > 0) {
            totalPending += pendingAmt;
        } else {
            settledCount++;
        }
        
        const balClass = pendingAmt > 0 ? 'text-red font-bold' : 'text-green';
        
        tr.innerHTML = `
            <td class="font-bold">${s.name}<br><span style="font-size:0.75rem;color:#64748b;font-weight:normal;">${s.contact_number || ''}</span></td>
            <td>${s.supplies_what || '—'}</td>
            <td class="${balClass}">${pendingAmt.toFixed(2)}</td>
            <td>
                <div class="flex gap-2">
                    <button class="btn btn-primary btn-sm" onclick="openSupplierHistory(${s.id})">💰 ${t('recordPayment')}</button>
                    <button class="btn btn-outline btn-sm" onclick="editSupplier(${s.id})">${t('edit')}</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteSupplier(${s.id})">${t('delete')}</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    if (suppliers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#64748b;">${t('noData')}</td></tr>`;
    }
    
    document.getElementById('statTotalPending').textContent = totalPending.toFixed(2);
    document.getElementById('statSupplierCount').textContent = suppliers.length;
    document.getElementById('statSettled').textContent = settledCount;
}

function saveSupplier() {
    const name = document.getElementById('supplierName').value.trim();
    if (!name) { alert(t('name') + ' required.'); return; }
    
    const data = {
        name: name,
        contact_number: document.getElementById('supplierContact').value.trim(),
        supplies_what: document.getElementById('supplierWhat').value.trim(),
        notes: document.getElementById('supplierNotes').value.trim()
    };
    
    if (editingSupplierId) {
        db.updateSupplier(editingSupplierId, data);
    } else {
        db.addSupplier(data);
    }
    
    resetForm();
    loadSuppliers();
}

function resetForm() {
    editingSupplierId = null;
    document.getElementById('supplierName').value = '';
    document.getElementById('supplierContact').value = '';
    document.getElementById('supplierWhat').value = '';
    document.getElementById('supplierNotes').value = '';
    
    document.getElementById('supplierFormTitle').textContent = t('addSupplier');
    document.getElementById('saveSupplierBtn').innerHTML = t('saveSupplier');
    document.getElementById('cancelSupplierBtn').style.display = 'none';
}

window.editSupplier = function(id) {
    const sup = db.getSuppliers().find(s => s.id === id);
    if (!sup) return;
    
    editingSupplierId = id;
    document.getElementById('supplierName').value = sup.name;
    document.getElementById('supplierContact').value = sup.contact_number || '';
    document.getElementById('supplierWhat').value = sup.supplies_what || '';
    document.getElementById('supplierNotes').value = sup.notes || '';
    
    document.getElementById('supplierFormTitle').textContent = t('edit');
    document.getElementById('saveSupplierBtn').innerHTML = t('save');
    document.getElementById('cancelSupplierBtn').style.display = 'inline-flex';
};

window.deleteSupplier = function(id) {
    if (!confirm(t('confirmDeleteSupplier'))) return;
    db.deleteSupplier(id);
    loadSuppliers();
};

window.openSupplierHistory = function(id) {
    historySupplierId = id;
    const sup = db.getSuppliers().find(s => s.id === id);
    if (!sup) return;
    
    const pendingAmt = sup.pending_amount || 0;
    document.getElementById('historyModalTitle').textContent = sup.name + ' — ' + t('pendingBalance') + ': ' + pendingAmt.toFixed(2);
    
    document.getElementById('paymentAmountInput').value = '0';
    document.getElementById('paymentNoteInput').value = '';
    document.getElementById('debtAmountInput').value = '0';
    document.getElementById('debtNoteInput').value = '';
    
    loadSupplierTransactions(id);
    document.getElementById('supplierHistoryModal').classList.add('active');
};

function loadSupplierTransactions(id) {
    const txs = db.getSupplierTransactions(id);
    const tbody = document.getElementById('supplierTransactionsBody');
    tbody.innerHTML = '';
    
    txs.forEach(tx => {
        const isPay = tx.type === 'Payment';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${tx.date || ''}</td>
            <td><span class="badge ${isPay ? 'badge-cash' : 'badge-pending'}">${isPay ? 'Payment' : 'Debt/Purchase'}</span></td>
            <td class="font-bold ${isPay ? 'text-green' : 'text-red'}">${isPay ? '-' : '+'}${(tx.amount || 0).toFixed(2)}</td>
            <td class="font-bold">${(tx.balance_after || 0).toFixed(2)}</td>
            <td>${tx.note || '—'}</td>
        `;
        tbody.appendChild(tr);
    });
    if (txs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#64748b;">${t('noData')}</td></tr>`;
    }
}

function recordSupplierPayment() {
    const amt = parseFloat(document.getElementById('paymentAmountInput').value);
    if (!amt || amt <= 0) return;
    const date = document.getElementById('paymentDateInput').value;
    const note = document.getElementById('paymentNoteInput').value.trim();
    
    const sup = db.getSuppliers().find(s => s.id === historySupplierId);
    const currentPending = sup ? (sup.pending_amount || 0) : 0;
    const newPending = Math.max(0, currentPending - amt);
    
    db.updateSupplierPending(historySupplierId, newPending);
    db.addSupplierTransaction(historySupplierId, 'Payment', amt, newPending, note, date);
    
    db.addExpense({
        description: 'Supplier Payment: ' + (sup ? sup.name : '') + (note ? ' - ' + note : ''),
        amount: amt,
        category: 'Supplier Payment',
        date: date
    });
    
    alert('Payment recorded and logged in Expenses.');
    loadSuppliers();
    openSupplierHistory(historySupplierId);
}

function addSupplierDebt() {
    const amt = parseFloat(document.getElementById('debtAmountInput').value);
    if (!amt || amt <= 0) return;
    const date = document.getElementById('debtDateInput').value;
    const note = document.getElementById('debtNoteInput').value.trim();
    
    const sup = db.getSuppliers().find(s => s.id === historySupplierId);
    const currentPending = sup ? (sup.pending_amount || 0) : 0;
    const newPending = currentPending + amt;
    
    db.updateSupplierPending(historySupplierId, newPending);
    db.addSupplierTransaction(historySupplierId, 'Debt', amt, newPending, note, date);
    
    alert('Debt recorded.');
    loadSuppliers();
    openSupplierHistory(historySupplierId);
}
