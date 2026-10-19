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
                    <button class="btn btn-outline" style="padding:0.25rem 0.5rem; font-size:0.75rem; color:#7c3aed; border-color:#7c3aed; margin-right:4px; margin-bottom:4px;" onclick="openSupplierBilling(${s.id}, '${safeName}')">📦 Bill</button>
                    <button class="btn btn-outline" style="padding:0.25rem 0.5rem; font-size:0.75rem; color:#0d9488; border-color:#0d9488; margin-right:4px; margin-bottom:4px;" onclick="viewHistory(${s.id}, '${safeName}', ${pendingAmount})">📋 History</button>
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
    const modalActionType = document.getElementById('modalActionType');
    const modalAmountLabel = document.getElementById('modalAmountLabel');

    let activeSupplierId = null;
    let activeSupplierCurrentAmount = 0;
    let activeSupplierName = '';

    if (modalActionType) {
        modalActionType.addEventListener('change', () => {
            const val = modalActionType.value;
            const lang = getCurrentLanguage();
            if (val === 'payment') {
                modalAmountLabel.textContent = lang === 'ar' ? 'المبلغ المدفوع ($)' : 'Amount Paid ($)';
                modalAmountInput.placeholder = 'e.g. 2000';
            } else if (val === 'purchase') {
                modalAmountLabel.textContent = lang === 'ar' ? 'مبلغ الإضافة ($)' : 'Amount to Add ($)';
                modalAmountInput.placeholder = 'e.g. 1500';
            } else if (val === 'override') {
                modalAmountLabel.textContent = lang === 'ar' ? 'الرصيد المستحق الجديد ($)' : 'New Owed Balance ($)';
                modalAmountInput.placeholder = 'e.g. 5000';
            }
        });
    }

    window.openPaymentModal = function(id, currentAmount, supplierName) {
        activeSupplierId = id;
        activeSupplierCurrentAmount = currentAmount;
        activeSupplierName = supplierName;

        modalAmountInput.value = '';
        if (modalNoteInput) modalNoteInput.value = '';

        if (modalActionType) {
            modalActionType.value = 'payment';
        }

        const lang = getCurrentLanguage();
        
        const optPay = modalActionType ? modalActionType.querySelector('option[value="payment"]') : null;
        const optPur = modalActionType ? modalActionType.querySelector('option[value="purchase"]') : null;
        const optOvr = modalActionType ? modalActionType.querySelector('option[value="override"]') : null;
        if (optPay) optPay.textContent = lang === 'ar' ? '💸 تسجيل دفعة (تقليل الرصيد المستحق)' : '💸 Record Payment (Reduces Balance)';
        if (optPur) optPur.textContent = lang === 'ar' ? '📦 شراء بالآجل (زيادة الرصيد المستحق)' : '📦 Purchase on Credit (Increases Balance)';
        if (optOvr) optOvr.textContent = lang === 'ar' ? '✏️ تعديل الرصيد يدوياً (تحديد القيمة)' : '✏️ Manually Override Balance (Sets Balance)';

        const lblType = document.getElementById('lblModalActionType');
        if (lblType) lblType.textContent = lang === 'ar' ? 'نوع المعاملة' : 'Action Type';

        const lblNote = document.getElementById('modalNoteLabel');
        if (lblNote) lblNote.innerHTML = lang === 'ar' ? 'ملاحظات <span style="color:#94a3b8; font-weight:400;">(اختياري)</span>' : 'Note / Reason <span style="color:#94a3b8; font-weight:400;">(optional)</span>';

        paymentModalTitle.textContent = lang === 'ar' ? `تعديل رصيد المورد — ${supplierName}` : `Adjust Supplier Balance — ${supplierName}`;
        modalAmountLabel.textContent = lang === 'ar' ? 'المبلغ المدفوع ($)' : 'Amount Paid ($)';
        modalAmountInput.placeholder = 'e.g. 2000';

        if (paymentCurrentBalance) {
            paymentCurrentBalance.textContent = currentAmount > 0
                ? (lang === 'ar' ? `الرصيد المستحق الحالي: $${currentAmount.toFixed(2)}` : `Current balance owed: $${currentAmount.toFixed(2)}`)
                : (lang === 'ar' ? 'الرصيد الحالي: تم التسوية ($0.00)' : 'Current balance: Settled ($0.00)');
        }

        paymentModal.classList.add('active');
        setTimeout(() => modalAmountInput.focus(), 100);
    };

    window.editPending = window.openPaymentModal;

    if (closePaymentModalBtn) {
        closePaymentModalBtn.addEventListener('click', () => {
            paymentModal.classList.remove('active');
        });
    }

    if (savePaymentBtn) {
        savePaymentBtn.addEventListener('click', () => {
            const action = modalActionType ? modalActionType.value : 'payment';
            const amount = parseFloat(modalAmountInput.value);
            const note = modalNoteInput ? modalNoteInput.value.trim() : '';
            const lang = getCurrentLanguage();

            if (isNaN(amount) || amount < 0) {
                alert(lang === 'ar' ? 'الرجاء إدخال مبلغ صحيح' : 'Please enter a valid amount');
                return;
            }

            let newPending = activeSupplierCurrentAmount;
            let type = 'payment';

            if (action === 'payment') {
                newPending = Math.max(0, activeSupplierCurrentAmount - amount);
                type = 'payment';
            } else if (action === 'purchase') {
                newPending = activeSupplierCurrentAmount + amount;
                type = 'purchase';
            } else if (action === 'override') {
                newPending = amount;
                type = 'override';
            }

            db.updateSupplierPending(activeSupplierId, newPending);

            const now = new Date();
            const today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

            if (action === 'payment' && amount > 0) {
                const expDesc = note
                    ? `Payment to Supplier: ${activeSupplierName} — ${note}`
                    : `Payment to Supplier: ${activeSupplierName}`;
                db.addExpense({ description: expDesc, amount, category: 'Parts', date: today });
            }

            if (db.addSupplierTransaction) {
                db.addSupplierTransaction(activeSupplierId, type, amount, newPending, note, today);
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

    let activeHistorySupplier = {};
    window.viewHistory = function(id, supplierName, currentBalance) {
        activeHistorySupplier = { id, name: supplierName, balance: currentBalance };
        const lang = getCurrentLanguage();
        historyModalTitle.textContent = lang === 'ar' ? `سجل المورد — ${supplierName}` : `History — ${supplierName}`;

        if (historyCurrentBalance) {
            const bal = parseFloat(currentBalance) || 0;
            historyCurrentBalance.innerHTML = bal > 0
                ? `<span style="color:#ef4444; font-weight:600;">${lang === 'ar' ? 'الرصيد الحالي المستحق للمورد: ' : 'Current Balance Owed: '}$${bal.toFixed(2)}</span>`
                : `<span style="color:#10b981; font-weight:600;">${lang === 'ar' ? 'الرصيد الحالي: تم التسوية ✓' : 'Current Balance: Settled ✓'}</span>`;
        }

        const transactions = db.getSupplierTransactions ? db.getSupplierTransactions(id) : [];

        if (transactions.length === 0) {
            historyContent.innerHTML = `
                <div style="text-align:center; padding:2rem; color:#94a3b8;">
                    <p style="font-size:2rem; margin-bottom:0.5rem;">📋</p>
                    <p>${lang === 'ar' ? 'لا يوجد سجل معاملات لهذا المورد بعد.' : 'No payment history yet for this supplier.'}</p>
                    <p style="font-size:0.85rem;">${lang === 'ar' ? 'المعاملات التي يتم تسجيلها ستظهر هنا.' : 'Payments recorded will appear here.'}</p>
                </div>`;
        } else {
            historyContent.innerHTML = `
                <table style="width:100%; border-collapse:collapse;">
                    <thead>
                        <tr style="background:#f8fafc; border-bottom:2px solid #e2e8f0;">
                            <th style="padding:0.6rem 0.75rem; text-align:right; font-size:0.85rem; color:#64748b;">${lang === 'ar' ? 'التاريخ' : 'Date'}</th>
                            <th style="padding:0.6rem 0.75rem; text-align:right; font-size:0.85rem; color:#64748b;">${lang === 'ar' ? 'النوع' : 'Type'}</th>
                            <th style="padding:0.6rem 0.75rem; text-align:left; font-size:0.85rem; color:#64748b;">${lang === 'ar' ? 'المبلغ' : 'Amount'}</th>
                            <th style="padding:0.6rem 0.75rem; text-align:left; font-size:0.85rem; color:#64748b;">${lang === 'ar' ? 'الرصيد بعد المعاملة' : 'Balance After'}</th>
                            <th style="padding:0.6rem 0.75rem; text-align:right; font-size:0.85rem; color:#64748b;">${lang === 'ar' ? 'ملاحظات' : 'Note'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${transactions.map(tx => {
                            const isPayment = tx.type === 'payment';
                            const isPurchase = tx.type === 'purchase';
                            const isInitial = tx.type === 'initial_balance';
                            
                            let typeBadge = '';
                            let amountHtml = '';
                            
                            if (isPayment) {
                                typeBadge = `<span style="background:#dcfce7; color:#10b981; border-radius:8px; padding:0.2rem 0.5rem; font-size:0.8rem; font-weight:600;">💸 ${lang === 'ar' ? 'سداد' : 'Payment'}</span>`;
                                amountHtml = `<td style="padding:0.6rem 0.75rem; text-align:left; font-weight:700; color:#10b981;">-$${parseFloat(tx.amount).toFixed(2)}</td>`;
                            } else if (isPurchase) {
                                typeBadge = `<span style="background:#fee2e2; color:#ef4444; border-radius:8px; padding:0.2rem 0.5rem; font-size:0.8rem; font-weight:600;">📦 ${lang === 'ar' ? 'شراء بالآجل' : 'Purchase'}</span>`;
                                amountHtml = `<td style="padding:0.6rem 0.75rem; text-align:left; font-weight:700; color:#ef4444;">+$${parseFloat(tx.amount).toFixed(2)}</td>`;
                            } else if (isInitial) {
                                typeBadge = `<span style="background:#f1f5f9; color:#64748b; border-radius:8px; padding:0.2rem 0.5rem; font-size:0.8rem; font-weight:600;">⚙️ ${lang === 'ar' ? 'رصيد افتتاحي' : 'Initial'}</span>`;
                                amountHtml = `<td style="padding:0.6rem 0.75rem; text-align:left; font-weight:700; color:#64748b;">$${parseFloat(tx.amount).toFixed(2)}</td>`;
                            } else {
                                typeBadge = `<span style="background:#e0f2fe; color:#0284c7; border-radius:8px; padding:0.2rem 0.5rem; font-size:0.8rem; font-weight:600;">✏️ ${lang === 'ar' ? 'تعديل يدوياً' : 'Adjustment'}</span>`;
                                amountHtml = `<td style="padding:0.6rem 0.75rem; text-align:left; font-weight:700; color:#0284c7;">$${parseFloat(tx.amount).toFixed(2)}</td>`;
                            }

                            return `
                                <tr style="border-bottom:1px solid #f1f5f9;">
                                    <td style="padding:0.6rem 0.75rem; font-size:0.9rem;">${tx.date}</td>
                                    <td style="padding:0.6rem 0.75rem;">${typeBadge}</td>
                                    ${amountHtml}
                                    <td style="padding:0.6rem 0.75rem; text-align:left; font-weight:600; color:${tx.balance_after > 0 ? '#ef4444' : '#10b981'};">$${parseFloat(tx.balance_after).toFixed(2)}</td>
                                    <td style="padding:0.6rem 0.75rem; font-size:0.85rem; color:#64748b;">${tx.note || '<span style="color:#cbd5e1;">—</span>'}</td>
                                </tr>
                            `;
                        }).join('')}
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
    // ===================================================
    // SUPPLIER BILLING MODAL
    // ===================================================
    const supplierBillingModal = document.getElementById('supplierBillingModal');
    const closeBillingModalBtn  = document.getElementById('closeBillingModalBtn');
    const closeBillingModalBtn2 = document.getElementById('closeBillingModalBtn2');
    const confirmBillingBtn     = document.getElementById('confirmBillingBtn');
    const billPartSearch        = document.getElementById('billPartSearch');
    const billPartSearchResults = document.getElementById('billPartSearchResults');
    const billAddNewPartBtn     = document.getElementById('billAddNewPartBtn');
    const billLineItemsBody     = document.getElementById('billLineItemsBody');
    const billGrandTotalEl      = document.getElementById('billGrandTotal');
    const billCreditAmountEl    = document.getElementById('billCreditAmount');
    const billAmountPaidEl      = document.getElementById('billAmountPaid');
    const billNoteEl            = document.getElementById('billNote');

    let activeBillingSupplierId      = null;
    let activeBillingSupplierName    = '';
    let activeBillingSupplierPending = 0;

    window.openSupplierBilling = function(id, name) {
        activeBillingSupplierId = id;
        activeBillingSupplierName = name;
        const supplier = db.getSuppliers().find(s => s.id === id);
        activeBillingSupplierPending = supplier ? (supplier.pending_amount || 0) : 0;
        document.getElementById('billingModalTitle').textContent = 'Record Bill - ' + name;
        document.getElementById('billingModalSupplierName').textContent =
            'Current credit balance owed: ' + activeBillingSupplierPending.toFixed(2);
        billLineItemsBody.innerHTML = '';
        billPartSearch.value = '';
        billPartSearchResults.style.display = 'none';
        billAmountPaidEl.value = '0';
        billNoteEl.value = '';
        updateBillTotals();
        supplierBillingModal.classList.add('active');
        setTimeout(() => billPartSearch.focus(), 150);
    };

    function closeBilling() {
        supplierBillingModal.classList.remove('active');
        activeBillingSupplierId = null;
    }
    if (closeBillingModalBtn) closeBillingModalBtn.addEventListener('click', closeBilling);
    if (closeBillingModalBtn2) closeBillingModalBtn2.addEventListener('click', closeBilling);

    if (billPartSearch) {
        billPartSearch.addEventListener('input', () => {
            const term = billPartSearch.value.trim();
            if (!term) { billPartSearchResults.style.display = 'none'; return; }
            const allParts = db.getParts();
            const results = allParts.filter(p => p.name.toLowerCase().includes(term.toLowerCase()));
            if (results.length === 0) {
                billPartSearchResults.innerHTML = '<div style="padding:0.75rem; color:#94a3b8; font-size:0.9rem;">No parts found.</div>';
            } else {
                billPartSearchResults.innerHTML = results.map(p =>
                    '<div class="bill-part-option" data-id="' + p.id + '" data-name="' + p.name.replace(/"/g,'&quot;') + '" data-price="' + p.unit_price + '"' +
                    ' style="padding:0.6rem 0.9rem; cursor:pointer; border-bottom:1px solid #f1f5f9; font-size:0.9rem;"' +
                    ' onmouseover="this.style.background=\'#f0fdf4\'" onmouseout="this.style.background=\'\'">' +
                    '<span style="font-weight:600; color:#0d9488;">' + p.name + '</span>' +
                    '<span style="color:#94a3b8; margin-left:0.5rem; font-size:0.8rem;">Stock: ' + p.quantity_in_stock + '</span>' +
                    '<span style="float:right; font-weight:600;">' + parseFloat(p.unit_price).toFixed(2) + '</span>' +
                    '</div>'
                ).join('');
            }
            billPartSearchResults.style.display = 'block';
        });
    }

    if (billPartSearchResults) {
        billPartSearchResults.addEventListener('click', (e) => {
            const opt = e.target.closest('.bill-part-option');
            if (!opt) return;
            addBillLineItem(opt.dataset.id, opt.dataset.name, parseFloat(opt.dataset.price) || 0, 1);
            billPartSearch.value = '';
            billPartSearchResults.style.display = 'none';
        });
    }

    document.addEventListener('click', (e) => {
        if (billPartSearch && !billPartSearch.contains(e.target) && billPartSearchResults && !billPartSearchResults.contains(e.target)) {
            billPartSearchResults.style.display = 'none';
        }
    });

    if (billAddNewPartBtn) billAddNewPartBtn.addEventListener('click', () => addBillLineItem(null, '', 0, 1));

    function addBillLineItem(partId, name, price, qty) {
        const tr = document.createElement('tr');
        tr.dataset.partId = partId || '';
        tr.dataset.isNew  = partId ? 'false' : 'true';
        const sub = (qty * price).toFixed(2);
        tr.innerHTML =
            '<td><input type="text" class="form-control bill-item-name" value="' + name + '" placeholder="Part name" style="min-width:120px;"></td>' +
            '<td><input type="number" class="form-control bill-item-qty" value="' + qty + '" min="1" step="1" style="width:70px;"></td>' +
            '<td><input type="number" class="form-control bill-item-price" value="' + price + '" min="0" step="0.01" style="width:100px;"></td>' +
            '<td class="bill-item-subtotal font-bold" style="color:#0d9488;">' + sub + '</td>' +
            '<td><button class="btn btn-outline bill-remove-btn" style="padding:0.2rem 0.5rem; color:#ef4444; border-color:#fee2e2;">x</button></td>';
        tr.querySelector('.bill-item-qty').addEventListener('input', () => recalcRow(tr));
        tr.querySelector('.bill-item-price').addEventListener('input', () => recalcRow(tr));
        tr.querySelector('.bill-remove-btn').addEventListener('click', () => { tr.remove(); updateBillTotals(); });
        billLineItemsBody.appendChild(tr);
        updateBillTotals();
        if (!partId) setTimeout(() => tr.querySelector('.bill-item-name').focus(), 50);
    }

    function recalcRow(tr) {
        const qty   = parseFloat(tr.querySelector('.bill-item-qty').value)   || 0;
        const price = parseFloat(tr.querySelector('.bill-item-price').value) || 0;
        tr.querySelector('.bill-item-subtotal').textContent = (qty * price).toFixed(2);
        updateBillTotals();
    }

    function updateBillTotals() {
        let grand = 0;
        if (billLineItemsBody) {
            billLineItemsBody.querySelectorAll('tr').forEach(tr => {
                const sub = tr.querySelector('.bill-item-subtotal');
                if (sub) grand += parseFloat(sub.textContent) || 0;
            });
        }
        if (billGrandTotalEl) billGrandTotalEl.textContent = grand.toFixed(2);
        const paid   = billAmountPaidEl ? (parseFloat(billAmountPaidEl.value) || 0) : 0;
        const credit = Math.max(0, grand - paid);
        if (billCreditAmountEl) {
            billCreditAmountEl.textContent = credit.toFixed(2);
            billCreditAmountEl.style.color = credit > 0 ? '#ef4444' : '#10b981';
        }
    }

    if (billAmountPaidEl) billAmountPaidEl.addEventListener('input', updateBillTotals);

    if (confirmBillingBtn) {
        confirmBillingBtn.addEventListener('click', () => {
            if (!activeBillingSupplierId) return;
            const rows = billLineItemsBody ? billLineItemsBody.querySelectorAll('tr') : [];
            if (rows.length === 0) { alert('Please add at least one item.'); return; }
            const items = [];
            let valid = true;
            rows.forEach(tr => {
                const name  = tr.querySelector('.bill-item-name').value.trim();
                const qty   = parseFloat(tr.querySelector('.bill-item-qty').value) || 0;
                const price = parseFloat(tr.querySelector('.bill-item-price').value) || 0;
                if (!name) { valid = false; return; }
                items.push({ partId: tr.dataset.partId || null, isNew: tr.dataset.isNew === 'true', name, qty, price });
            });
            if (!valid) { alert('Please fill in a name for every item.'); return; }
            const grandTotal  = items.reduce((s, i) => s + i.qty * i.price, 0);
            const paidNow     = Math.min(parseFloat(billAmountPaidEl.value) || 0, grandTotal);
            const addedCredit = grandTotal - paidNow;
            const note        = billNoteEl ? billNoteEl.value.trim() : '';
            const now = new Date();
            const today = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');
            items.forEach(item => {
                if (item.partId) {
                    db.addPartStock(parseInt(item.partId), item.qty, item.price);
                } else {
                    db.addPart({ name: item.name, category: '', quantity_in_stock: item.qty, unit_price: item.price, supplier_id: activeBillingSupplierId });
                }
            });
            const newPending = activeBillingSupplierPending + addedCredit;
            db.updateSupplierPending(activeBillingSupplierId, newPending);
            const txNote = note ? 'Supplier Bill - ' + note : 'Supplier Bill: ' + items.map(i => i.qty + 'x ' + i.name).join(', ');
            db.addSupplierTransaction(activeBillingSupplierId, 'purchase', grandTotal, newPending, txNote, today);
            if (paidNow > 0) {
                const expDesc = note ? 'Payment to ' + activeBillingSupplierName + ' - ' + note : 'Payment to ' + activeBillingSupplierName;
                db.addExpense({ description: expDesc, amount: paidNow, category: 'Parts', date: today, from_cash: 1 });
                db.addSupplierTransaction(activeBillingSupplierId, 'payment', paidNow, newPending, 'Paid at delivery - ' + txNote, today);
            }
            const msg = paidNow > 0
                ? 'Bill saved!\nPaid now: ' + paidNow.toFixed(2) + '\nOn credit: ' + addedCredit.toFixed(2) + '\nTotal owed: ' + newPending.toFixed(2)
                : 'Bill saved!\nFull amount ' + grandTotal.toFixed(2) + ' on credit.\nTotal owed: ' + newPending.toFixed(2);
            alert(msg);
            closeBilling();
            loadSuppliers();
        });
    }
});

window.printSupplierHistory = function() {
    if (!activeHistorySupplier || !activeHistorySupplier.id) return;

    const transactions = db.getSupplierTransactions ? db.getSupplierTransactions(activeHistorySupplier.id) : [];
    const lang = getCurrentLanguage();
    const shopName = lang === 'ar' ? '\u0627\u0644\u0623\u0646\u0635\u0627\u0631\u064a' : 'El Ansary Service Shop';
    const now = new Date();
    const dateStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');

    let rowsHtml = '';

    if (transactions.length === 0) {
        rowsHtml = '<tr><td colspan="5" style="text-align:center;">' +
            (lang === 'ar' ? '\u0644\u0627 \u064a\u0648\u062c\u062f \u0633\u062c\u0644 \u0645\u0639\u0627\u0645\u0644\u0627\u062a \u0644\u0647\u0630\u0627 \u0627\u0644\u0645\u0648\u0631\u062f \u0628\u0639\u062f.' : 'No payment history yet for this supplier.') +
            '</td></tr>';
    } else {
        rowsHtml = transactions.map(function(tx) {
            var typeLabel = tx.type;
            var amountLabel = parseFloat(tx.amount).toFixed(2);

            if (tx.type === 'payment') {
                typeLabel = lang === 'ar' ? '\u0633\u062f\u0627\u062f' : 'Payment';
                amountLabel = '-' + amountLabel;
            } else if (tx.type === 'purchase') {
                typeLabel = lang === 'ar' ? '\u0634\u0631\u0627\u0621 \u0628\u0627\u0644\u0622\u062c\u0644' : 'Purchase';
                amountLabel = '+' + amountLabel;
            } else if (tx.type === 'initial_balance') {
                typeLabel = lang === 'ar' ? '\u0631\u0635\u064a\u062f \u0627\u0641\u062a\u062a\u0627\u062d\u064a' : 'Initial Balance';
            } else if (tx.type === 'override') {
                typeLabel = lang === 'ar' ? '\u062a\u0639\u062f\u064a\u0644 \u064a\u062f\u0648\u064a' : 'Manual Override';
            }

            return '<tr style="border-bottom:1px solid #e2e8f0;">' +
                '<td style="padding:0.5rem;">' + (tx.date_created || tx.timestamp || '-') + '</td>' +
                '<td style="padding:0.5rem;">' + typeLabel + '</td>' +
                '<td style="padding:0.5rem;">' + amountLabel + '</td>' +
                '<td style="padding:0.5rem;">' + parseFloat(tx.balance_after).toFixed(2) + '</td>' +
                '<td style="padding:0.5rem;">' + (tx.notes || '-') + '</td>' +
                '</tr>';
        }).join('');
    }

    var textAlign = lang === 'ar' ? 'right' : 'left';
    var dir = lang === 'ar' ? 'rtl' : 'ltr';

    var html = '<html dir="' + dir + '"><head><meta charset="UTF-8">' +
        '<style>' +
        'body{font-family:Arial,sans-serif;font-size:12px;margin:20px;color:#1e293b;}' +
        'h1{font-size:1.2rem;margin-bottom:0.25rem;text-align:center;}' +
        '.header-info{text-align:center;margin-bottom:1rem;color:#64748b;font-size:0.85rem;}' +
        'table{width:100%;border-collapse:collapse;margin-top:1rem;}' +
        'th{background:#f1f5f9;padding:0.5rem;text-align:' + textAlign + ';font-size:0.85rem;}' +
        'td{padding:0.5rem;font-size:0.85rem;text-align:' + textAlign + ';}' +
        '@media print{body{margin:10px;}}' +
        '</style></head><body>' +
        '<h1>' + shopName + (lang === 'ar' ? ' \u2014 \u0643\u0634\u0641 \u062d\u0633\u0627\u0628 \u0645\u0648\u0631\u062f' : ' \u2014 Supplier Statement') + '</h1>' +
        '<div class="header-info">' +
        '<div>' + (lang === 'ar' ? '\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0637\u0628\u0627\u0639\u0629:' : 'Print Date:') + ' ' + dateStr + '</div>' +
        '<div style="margin-top:5px;font-weight:bold;color:#000;">' + (lang === 'ar' ? '\u0627\u0633\u0645 \u0627\u0644\u0645\u0648\u0631\u062f:' : 'Supplier Name:') + ' ' + activeHistorySupplier.name + '</div>' +
        '<div style="margin-top:5px;font-weight:bold;color:#ef4444;">' + (lang === 'ar' ? '\u0627\u0644\u0631\u0635\u064a\u062f \u0627\u0644\u0645\u0633\u062a\u062d\u0642 \u0627\u0644\u0622\u0646:' : 'Current Pending Balance:') + ' ' + parseFloat(activeHistorySupplier.balance).toFixed(2) + '</div>' +
        '</div>' +
        '<table><thead><tr>' +
        '<th>' + (lang === 'ar' ? '\u0627\u0644\u062a\u0627\u0631\u064a\u062e' : 'Date') + '</th>' +
        '<th>' + (lang === 'ar' ? '\u0627\u0644\u0646\u0648\u0639' : 'Type') + '</th>' +
        '<th>' + (lang === 'ar' ? '\u0627\u0644\u0645\u0628\u0644\u063a' : 'Amount') + '</th>' +
        '<th>' + (lang === 'ar' ? '\u0627\u0644\u0631\u0635\u064a\u062f \u0628\u0639\u062f' : 'Balance After') + '</th>' +
        '<th>' + (lang === 'ar' ? '\u0645\u0644\u0627\u062d\u0638\u0627\u062a' : 'Notes') + '</th>' +
        '</tr></thead><tbody>' + rowsHtml + '</tbody></table>' +
        '</body></html>';

    var win = window.open('', '_blank', 'width=750,height=600');
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(function() { win.print(); }, 500);
};