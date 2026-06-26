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

    // ---------- Supplier Table ----------
    function loadSuppliers() {
        suppliersTableBody.innerHTML = '';
        const suppliers = db.getSuppliers();

        const totalPending = suppliers.reduce((sum, s) => sum + (s.pending_amount || 0), 0);
        const totalSupplierPendingEl = document.getElementById('totalSupplierPendingEl');
        if (totalSupplierPendingEl) {
            totalSupplierPendingEl.textContent = `$${totalPending.toFixed(2)}`;
        }

        if (suppliers.length === 0) {
            suppliersTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#94a3b8;">No suppliers yet</td></tr>`;
            return;
        }

        suppliers.forEach(s => {
            const tr = document.createElement('tr');
            const pendingAmount = s.pending_amount || 0;
            const hasPending = pendingAmount > 0;

            const safeName = s.name.replace(/'/g, "\\'");

            const badgeHtml = hasPending
                ? `<span class="badge" style="background:#fee2e2; color:#ef4444; border:1px solid #ef4444; padding:0.25rem 0.6rem; border-radius:12px; font-size:0.8rem; cursor:pointer;" title="Click to record payment" onclick="openPaymentModal(${s.id}, ${pendingAmount}, '${safeName}')">⚠ $${pendingAmount.toFixed(2)}</span>`
                : `<span class="badge" style="background:#dcfce7; color:#10b981; border:1px solid #10b981; padding:0.25rem 0.6rem; border-radius:12px; font-size:0.8rem; cursor:pointer;" title="Click to record payment" onclick="openPaymentModal(${s.id}, 0, '${safeName}')">✓ Settled</span>`;

            if (hasPending) {
                tr.style.borderLeft = '4px solid #ef4444';
            }

            tr.innerHTML = `
                <td class="font-bold" style="cursor:pointer; color:#0d9488;" title="View History" onclick="viewHistory(${s.id}, '${safeName}', ${pendingAmount})">${s.name}</td>
                <td>${s.contact_number || '-'}</td>
                <td>${s.supplies_what || '-'}</td>
                <td>${badgeHtml}</td>
                <td>${s.notes || '-'}</td>
                <td>
                    <button class="btn btn-outline" style="padding:0.25rem 0.5rem; font-size:0.75rem; color:#0d9488; border-color:#0d9488; margin-right:4px;" onclick="viewHistory(${s.id}, '${safeName}', ${pendingAmount})">📋 History</button>
                    <button class="btn btn-outline btn-delete" data-id="${s.id}" style="padding:0.25rem 0.5rem; font-size:0.75rem; color: #ef4444; border-color: #fee2e2;">Delete</button>
                </td>
            `;
            suppliersTableBody.appendChild(tr);
        });
    }

    // ---------- Payment Modal ----------
    const paymentModal = document.getElementById('paymentModal');
    const closePaymentModalBtn = document.getElementById('closePaymentModalBtn');
    const savePaymentBtn = document.getElementById('savePaymentBtn');
    const modalAmountInput = document.getElementById('modalAmount');
    const modalNoteInput = document.getElementById('modalNote');
    const paymentModalTitle = document.getElementById('paymentModalTitle');
    const paymentCurrentBalance = document.getElementById('paymentCurrentBalance');

    let activeSupplierId = null;
    let activeSupplierCurrentAmount = 0;
    let activeSupplierName = '';

    window.openPaymentModal = function(id, currentAmount, supplierName) {
        activeSupplierId = id;
        activeSupplierCurrentAmount = currentAmount;
        activeSupplierName = supplierName;

        modalAmountInput.value = '';
        if (modalNoteInput) modalNoteInput.value = '';

        paymentModalTitle.textContent = `Record Payment — ${supplierName}`;
        if (paymentCurrentBalance) {
            paymentCurrentBalance.textContent = currentAmount > 0
                ? `Current balance owed: $${currentAmount.toFixed(2)}`
                : 'Current balance: Settled ($0.00)';
        }

        paymentModal.classList.add('active');
        setTimeout(() => modalAmountInput.focus(), 100);
    };

    // Keep old name working too
    window.editPending = window.openPaymentModal;

    if (closePaymentModalBtn) {
        closePaymentModalBtn.addEventListener('click', () => {
            paymentModal.classList.remove('active');
        });
    }

    if (savePaymentBtn) {
        savePaymentBtn.addEventListener('click', () => {
            const amount = parseFloat(modalAmountInput.value);
            const note = modalNoteInput ? modalNoteInput.value.trim() : '';
            const lang = getCurrentLanguage();

            if (isNaN(amount) || amount <= 0) {
                alert(lang === 'ar' ? 'الرجاء إدخال مبلغ أكبر من صفر' : 'Please enter an amount greater than 0');
                return;
            }

            const newPending = Math.max(0, activeSupplierCurrentAmount - amount);
            db.updateSupplierPending(activeSupplierId, newPending);

            const now = new Date();
            const today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

            // Log to daily expenses
            const expDesc = note
                ? `Payment to Supplier: ${activeSupplierName} — ${note}`
                : `Payment to Supplier: ${activeSupplierName}`;
            db.addExpense({ description: expDesc, amount, category: 'Parts', date: today });

            // Log to supplier transaction history
            if (db.addSupplierTransaction) {
                db.addSupplierTransaction(activeSupplierId, 'payment', amount, newPending, note, today);
            }

            paymentModal.classList.remove('active');
            loadSuppliers();
        });
    }

    // ---------- History Modal ----------
    const historyModal = document.getElementById('supplierHistoryModal');
    const closeHistoryBtn = document.getElementById('closeHistoryModalBtn');
    const historyModalTitle = document.getElementById('historyModalTitle');
    const historyCurrentBalance = document.getElementById('historyCurrentBalance');
    const historyContent = document.getElementById('supplierHistoryContent');

    window.viewHistory = function(id, supplierName, currentBalance) {
        historyModalTitle.textContent = `History — ${supplierName}`;

        if (historyCurrentBalance) {
            const bal = parseFloat(currentBalance) || 0;
            historyCurrentBalance.innerHTML = bal > 0
                ? `<span style="color:#ef4444; font-weight:600;">Current Balance Owed: $${bal.toFixed(2)}</span>`
                : `<span style="color:#10b981; font-weight:600;">Current Balance: Settled ✓</span>`;
        }

        const transactions = db.getSupplierTransactions ? db.getSupplierTransactions(id) : [];

        if (transactions.length === 0) {
            historyContent.innerHTML = `
                <div style="text-align:center; padding:2rem; color:#94a3b8;">
                    <p style="font-size:2rem; margin-bottom:0.5rem;">📋</p>
                    <p>No payment history yet for this supplier.</p>
                    <p style="font-size:0.85rem;">Payments recorded will appear here.</p>
                </div>`;
        } else {
            historyContent.innerHTML = `
                <table style="width:100%; border-collapse:collapse;">
                    <thead>
                        <tr style="background:#f8fafc; border-bottom:2px solid #e2e8f0;">
                            <th style="padding:0.6rem 0.75rem; text-align:left; font-size:0.85rem; color:#64748b;">Date</th>
                            <th style="padding:0.6rem 0.75rem; text-align:left; font-size:0.85rem; color:#64748b;">Type</th>
                            <th style="padding:0.6rem 0.75rem; text-align:right; font-size:0.85rem; color:#64748b;">Amount</th>
                            <th style="padding:0.6rem 0.75rem; text-align:right; font-size:0.85rem; color:#64748b;">Balance After</th>
                            <th style="padding:0.6rem 0.75rem; text-align:left; font-size:0.85rem; color:#64748b;">Note</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${transactions.map(tx => `
                            <tr style="border-bottom:1px solid #f1f5f9;">
                                <td style="padding:0.6rem 0.75rem; font-size:0.9rem;">${tx.date}</td>
                                <td style="padding:0.6rem 0.75rem;">
                                    <span style="background:#dcfce7; color:#10b981; border-radius:8px; padding:0.2rem 0.5rem; font-size:0.8rem; font-weight:600;">
                                        💸 Payment
                                    </span>
                                </td>
                                <td style="padding:0.6rem 0.75rem; text-align:right; font-weight:700; color:#10b981;">-$${parseFloat(tx.amount).toFixed(2)}</td>
                                <td style="padding:0.6rem 0.75rem; text-align:right; font-weight:600; color:${tx.balance_after > 0 ? '#ef4444' : '#10b981'};">$${parseFloat(tx.balance_after).toFixed(2)}</td>
                                <td style="padding:0.6rem 0.75rem; font-size:0.85rem; color:#64748b;">${tx.note || '<span style="color:#cbd5e1;">—</span>'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>`;
        }

        historyModal.classList.add('active');
    };

    if (closeHistoryBtn) {
        closeHistoryBtn.addEventListener('click', () => {
            historyModal.classList.remove('active');
        });
    }

    // ---------- Save Supplier ----------
    saveSupplierBtn.addEventListener('click', () => {
        const name = document.getElementById('supName').value.trim();
        const contact_number = document.getElementById('supPhone').value.trim();
        const supplies_what = document.getElementById('supSupplies').value.trim();
        const notes = document.getElementById('supNotes').value.trim();
        const pendingInput = document.getElementById('supPending');
        const pending_amount = pendingInput ? parseFloat(pendingInput.value) || 0 : 0;

        if (!name) {
            alert('Supplier Name is required');
            return;
        }

        const id = db.addSupplier({ name, contact_number, supplies_what, notes, pending_amount });

        // Log initial balance as a transaction if it's > 0
        if (pending_amount > 0 && db.addSupplierTransaction) {
            const now = new Date();
            const today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
            db.addSupplierTransaction(id, 'initial_balance', pending_amount, pending_amount, 'Initial balance set when supplier was added', today);
        }

        document.getElementById('supName').value = '';
        document.getElementById('supPhone').value = '';
        document.getElementById('supSupplies').value = '';
        document.getElementById('supNotes').value = '';
        if (pendingInput) pendingInput.value = '0';

        loadSuppliers();
    });

    // ---------- Delete Supplier ----------
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
