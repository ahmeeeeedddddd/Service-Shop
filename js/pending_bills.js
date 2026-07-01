let db;
try {
    db = require('../database/db.js');
} catch (e) {
    console.error('Failed to load database:', e);
    alert('Database Error: Could not connect to the database.');
}

document.addEventListener('DOMContentLoaded', () => {
    // Translate the page initial structure
    translatePage();

    const langToggle = document.getElementById('langToggle');
    if (langToggle) {
        langToggle.addEventListener('click', () => {
            const newLang = getCurrentLanguage() === 'en' ? 'ar' : 'en';
            setLanguage(newLang);
            loadBills(); // Reload to refresh table rows translations
        });
    }

    const pendingBillsBody = document.getElementById('pendingBillsBody');
    const pendingCountEl = document.getElementById('pendingCount');
    const pendingTotalEl = document.getElementById('pendingTotal');
    const todayPendingEl = document.getElementById('todayPending');
    const searchInput = document.getElementById('searchInput');
    const detailModal = document.getElementById('detailModal');
    const detailTitle = document.getElementById('detailTitle');
    const detailContent = document.getElementById('detailContent');
    const closeDetailBtn = document.getElementById('closeDetailBtn');
    const deleteFromModalBtn = document.getElementById('deleteFromModalBtn');
    const openProcessModalBtn = document.getElementById('openProcessModalBtn');
    const printFromModalBtn = document.getElementById('printFromModalBtn');
    const editFromModalBtn = document.getElementById('editFromModalBtn');

    // Process Modal
    const processModal = document.getElementById('processModal');
    const processPaymentMethod = document.getElementById('processPaymentMethod');
    const processPayByPartsSection = document.getElementById('processPayByPartsSection');
    const processAmountPaid = document.getElementById('processAmountPaid');
    const closeProcessBtn = document.getElementById('closeProcessBtn');
    const confirmProcessBtn = document.getElementById('confirmProcessBtn');

    // Receipt Modal
    const receiptModal = document.getElementById('receiptModal');
    const receiptContent = document.getElementById('receiptContent');
    const closeReceiptBtn = document.getElementById('closeReceiptBtn');
    const printReceiptBtn = document.getElementById('printReceiptBtn');

    let allBills = [];
    let currentBillId = null;

    const now = new Date();
    const today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

    function loadBills() {
        allBills = db.getPendingBills();
        applyFilter();
    }

    function applyFilter() {
        const term = searchInput.value.toLowerCase();
        const filtered = term
            ? allBills.filter(b => b.customer_name.toLowerCase().includes(term))
            : allBills;

        const total = filtered.reduce((s, b) => s + b.total_amount, 0);
        const todayCount = filtered.filter(b => b.date_created === today).length;

        pendingCountEl.textContent = filtered.length;
        pendingTotalEl.textContent = `$${total.toFixed(2)}`;
        todayPendingEl.textContent = todayCount;

        pendingBillsBody.innerHTML = '';
        const lang = getCurrentLanguage();
        const t = translations[lang] || translations['en'];

        if (filtered.length === 0) {
            pendingBillsBody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:#94a3b8;">${t.noPendingBills}</td></tr>`;
            return;
        }

        filtered.forEach(bill => {
            const tr = document.createElement('tr');
            tr.style.cursor = 'pointer';
            tr.innerHTML = `
                <td>${bill.date_created}</td>
                <td><span class="font-bold text-teal">${bill.customer_name}</span><br><small style="color:#94a3b8;">${bill.customer_phone}</small></td>
                <td>${bill.car_name}${bill.plate_number ? ' | ' + bill.plate_number : ''}</td>
                <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${bill.description}">${bill.description}</td>
                <td><span class="badge badge-cash">${window.getTranslatedPaymentMethod(bill.payment_method)}</span></td>
                <td class="font-bold">$${(parseFloat(bill.total_amount) - (parseFloat(bill.discount) || 0)).toFixed(2)}</td>
                <td>
                    <div class="flex gap-2">
                        <button class="btn btn-outline btn-sm" onclick="openDetail(${bill.id})" style="padding:0.25rem 0.5rem;font-size:0.75rem;">${t.view || 'View'}</button>
                        <button class="btn btn-primary btn-sm" onclick="openProcess(${bill.id})" style="padding:0.25rem 0.5rem;font-size:0.75rem;">${t.processBill || 'Process'}</button>
                        <button class="btn btn-outline btn-sm" onclick="deleteBill(${bill.id})" style="padding:0.25rem 0.5rem;font-size:0.75rem;color:#ef4444;border-color:#fee2e2;">${t.delete || 'Delete'}</button>
                    </div>
                </td>
            `;
            pendingBillsBody.appendChild(tr);
        });
    }

    window.openDetail = (id) => {
        currentBillId = id;
        const bill = allBills.find(b => b.id === id);
        if (!bill) return;

        const lines = JSON.parse(bill.line_items_json || '[]');
        const lang = getCurrentLanguage();
        const t = translations[lang] || translations['en'];

        detailTitle.textContent = (lang === 'ar' ? 'تفاصيل الفاتورة المعلقة — ' : 'Pending Bill — ') + bill.customer_name;
        detailContent.innerHTML = `
            <div style="display:flex;gap:2rem;margin-bottom:1.5rem;">
                <div>
                    <p><strong>${t.customer}:</strong> ${bill.customer_name}</p>
                    <p><strong>${t.phone}:</strong> ${bill.customer_phone}</p>
                    <p><strong>${t.car || 'Car'}:</strong> ${bill.car_name}</p>
                    ${bill.plate_number ? `<p><strong>${t.plateNumber}:</strong> ${bill.plate_number}</p>` : ''}
                </div>
                <div>
                    <p><strong>${t.dateCreated}:</strong> ${bill.date_created}</p>
                    <p><strong>${t.payment}:</strong> ${window.getTranslatedPaymentMethod(bill.payment_method)}</p>
                    ${bill.odometer ? `<p><strong>${t.odometer}:</strong> ${bill.odometer}</p>` : ''}
                </div>
            </div>
            <table style="width:100%;border-collapse:collapse;">
                <thead>
                    <tr style="background:#f8fafc;border-bottom:2px solid #eee;">
                        <th style="padding:0.5rem;text-align:left;">${t.serviceName}</th>
                        <th style="padding:0.5rem;text-align:center;">${t.qty}</th>
                        <th style="padding:0.5rem;text-align:right;">${t.price}</th>
                        <th style="padding:0.5rem;text-align:right;">${t.subtotal}</th>
                    </tr>
                </thead>
                <tbody>
                    ${lines.map(l => `
                        <tr style="border-bottom:1px solid #eee;">
                            <td style="padding:0.5rem;">${l.name}</td>
                            <td style="padding:0.5rem;text-align:center;">${l.qty}</td>
                            <td style="padding:0.5rem;text-align:right;">$${parseFloat(l.price).toFixed(2)}</td>
                            <td style="padding:0.5rem;text-align:right;">$${parseFloat(l.total).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div style="text-align:right;margin-top:1rem;font-size:1.1rem;font-weight:700;">
                ${t.total}: $${parseFloat(bill.total_amount).toFixed(2)}
            </div>
            ${bill.discount > 0 ? `
            <div style="text-align:right;font-size:1.1rem;font-weight:700;color:#ef4444;">
                ${t.discount || 'Discount'}: -$${parseFloat(bill.discount).toFixed(2)}
            </div>
            <div style="text-align:right;margin-top:0.5rem;padding-top:0.5rem;border-top:1px solid #eee;font-size:1.25rem;font-weight:700;color:#10b981;">
                ${t.netTotal || 'Net Total'}: $${(parseFloat(bill.total_amount) - parseFloat(bill.discount)).toFixed(2)}
            </div>
            ` : `
            <div style="text-align:right;margin-top:0.5rem;font-size:1.25rem;font-weight:700;color:#eab308;">
                ${t.total}: $${parseFloat(bill.total_amount).toFixed(2)}
            </div>
            `}
            ${bill.notes ? `<div style="margin-top:1rem;padding:0.75rem;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;"><strong>${t.notes}:</strong><br>${bill.notes}</div>` : ''}
        `;

        if (lang === 'ar') {
            detailContent.style.direction = 'rtl';
            detailContent.querySelectorAll('th').forEach(th => th.style.textAlign = 'right');
        } else {
            detailContent.style.direction = 'ltr';
            detailContent.querySelectorAll('th').forEach(th => th.style.textAlign = 'left');
        }

        detailModal.classList.add('active');
    };

    window.openProcess = (id) => {
        currentBillId = id;
        const bill = allBills.find(b => b.id === id);
        if (!bill) return;
        
        processPaymentMethod.value = bill.payment_method;
        processPayByPartsSection.style.display = bill.payment_method === 'PayByParts' ? 'block' : 'none';
        
        const netTotal = Math.max(0, parseFloat(bill.total_amount) - (parseFloat(bill.discount) || 0));
        processAmountPaid.value = netTotal;

        detailModal.classList.remove('active');
        processModal.classList.add('active');
    };

    processPaymentMethod.addEventListener('change', () => {
        if (processPaymentMethod.value === 'PayByParts') {
            processPayByPartsSection.style.display = 'block';
        } else {
            processPayByPartsSection.style.display = 'none';
        }
    });

    closeProcessBtn.addEventListener('click', () => processModal.classList.remove('active'));

    confirmProcessBtn.addEventListener('click', () => {
        if (!currentBillId) return;
        const bill = db.getPendingBillById(currentBillId);
        if (!bill) return;
        
        const lines = JSON.parse(bill.line_items_json || '[]');
        const now = new Date();
        const dateStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

        const netTotal = Math.max(0, parseFloat(bill.total_amount) - (parseFloat(bill.discount) || 0));
        const paymentMethod = processPaymentMethod.value;
        let paidAmt = netTotal;
        let pendingAmt = 0;
        
        if (paymentMethod === 'PayByParts') {
            paidAmt = parseFloat(processAmountPaid.value) || 0;
            pendingAmt = Math.max(0, netTotal - paidAmt);
        }

        const repairId = db.addRepair({
            customer_id: bill.customer_id,
            description: bill.description,
            date: dateStr,
            total_amount: bill.total_amount,
            paid_amount: paidAmt,
            pending_amount: pendingAmt,
            discount: bill.discount || 0,
            payment_method: paymentMethod,
            odometer: bill.odometer,
            notes: bill.notes
        });

        lines.forEach(l => {
            db.addRepairItem({
                repair_id: repairId,
                item_name: l.name,
                quantity: l.qty,
                unit_price: l.price
            });
        });

        db.deletePendingBill(currentBillId);
        processModal.classList.remove('active');
        currentBillId = null;

        const lang = getCurrentLanguage();
        const successMsg = lang === 'ar'
            ? 'تمت معالجة الفاتورة بنجاح! تظهر الآن في سجل الفواتير والدخل.'
            : 'Bill processed successfully! It now appears in Bills History and Income.';
        alert(successMsg);
        loadBills();
    });

    window.deleteBill = (id) => {
        const lang = getCurrentLanguage();
        const confirmMsg = lang === 'ar'
            ? 'هل أنت متأكد من حذف هذه الفاتورة المعلقة؟ سيتم تسجيلها كمصروف.'
            : 'Are you sure you want to delete this pending bill? It will be recorded as an expense.';

        if (!confirm(confirmMsg)) return;

        db.deletePendingBill(id);
        loadBills();
    };

    closeDetailBtn.addEventListener('click', () => detailModal.classList.remove('active'));

    deleteFromModalBtn.addEventListener('click', () => {
        if (currentBillId) {
            window.deleteBill(currentBillId);
            detailModal.classList.remove('active');
        }
    });

    openProcessModalBtn.addEventListener('click', () => {
        if (currentBillId) window.openProcess(currentBillId);
    });

    // --- Edit Modal ---
    const editModal = document.getElementById('editModal');
    const editPaymentMethod = document.getElementById('editPaymentMethod');
    const editOdometer = document.getElementById('editOdometer');
    const editDiscount = document.getElementById('editDiscount');
    const editNotes = document.getElementById('editNotes');
    const editLineItemsBody = document.getElementById('editLineItemsBody');
    const addEditLineBtn = document.getElementById('addEditLineBtn');
    const closeEditBtn = document.getElementById('closeEditBtn');
    const saveEditBtn = document.getElementById('saveEditBtn');

    function addEditLineRow(name = '', qty = 1, price = 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="padding:0.25rem;"><input type="text" class="form-control" value="${name}" placeholder="Service / Part name"></td>
            <td style="padding:0.25rem;"><input type="number" class="form-control" value="${qty}" min="1" style="width:70px;"></td>
            <td style="padding:0.25rem;"><input type="number" class="form-control" value="${price}" min="0" step="0.01" style="width:100px;"></td>
            <td style="padding:0.25rem;"><button class="btn btn-outline" style="color:#ef4444;padding:0.2rem 0.5rem;" onclick="this.closest('tr').remove()">×</button></td>
        `;
        editLineItemsBody.appendChild(tr);
    }

    if (editFromModalBtn) {
        editFromModalBtn.addEventListener('click', () => {
            const bill = allBills.find(b => b.id === currentBillId);
            if (!bill) return;

            // Populate fields
            editPaymentMethod.value = bill.payment_method;
            editOdometer.value = bill.odometer || '';
            editDiscount.value = bill.discount || 0;
            editNotes.value = bill.notes || '';
            editLineItemsBody.innerHTML = '';

            const lines = JSON.parse(bill.line_items_json || '[]');
            lines.forEach(l => addEditLineRow(l.name, l.qty, l.price));
            if (lines.length === 0) addEditLineRow();

            detailModal.classList.remove('active');
            editModal.classList.add('active');
        });
    }

    addEditLineBtn.addEventListener('click', () => addEditLineRow());
    closeEditBtn.addEventListener('click', () => editModal.classList.remove('active'));

    saveEditBtn.addEventListener('click', () => {
        const lang = getCurrentLanguage();
        const rows = editLineItemsBody.querySelectorAll('tr');
        const lines = [];
        rows.forEach(row => {
            const inputs = row.querySelectorAll('input');
            const name = inputs[0].value.trim();
            const qty = parseFloat(inputs[1].value) || 1;
            const price = parseFloat(inputs[2].value) || 0;
            if (name) lines.push({ name, qty, price, total: qty * price });
        });

        if (lines.length === 0) {
            const msg = lang === 'ar' ? 'يرجى إضافة بند واحد على الأقل.' : 'Please add at least one line item.';
            alert(msg);
            return;
        }

        const total = lines.reduce((s, l) => s + l.total, 0);
        const description = lines.map(l => l.name).join(', ');

        db.updatePendingBill(currentBillId, {
            description,
            total_amount: total,
            payment_method: editPaymentMethod.value,
            odometer: editOdometer.value,
            discount: parseFloat(editDiscount.value) || 0,
            notes: editNotes.value,
            line_items_json: JSON.stringify(lines)
        });

        editModal.classList.remove('active');
        currentBillId = null;
        loadBills();
        
        const successMsg = lang === 'ar' ? 'تم تحديث الفاتورة المعلقة!' : 'Pending bill updated!';
        alert(successMsg);
    });

    searchInput.addEventListener('input', applyFilter);

    // --- Print Receipt Logic ---
    function generateReceipt(bill) {
        const lang = getCurrentLanguage();
        const t = translations[lang];
        const date = bill.date_created;
        const total = `$${parseFloat(bill.total_amount).toFixed(2)}`;
        const lines = JSON.parse(bill.line_items_json || '[]');

        // Dynamic scaling to fit one page
        let baseFontSize = '1rem';
        let logoMaxHeight = '140px';
        let tablePadding = '0.5rem';
        let sectionMargin = '1rem';
        let footerMargin = '4rem';

        const itemCount = lines.length;
        if (itemCount > 15) {
            baseFontSize = '0.65rem';
            logoMaxHeight = '70px';
            tablePadding = '0.2rem';
            sectionMargin = '0.3rem';
            footerMargin = '1.5rem';
        } else if (itemCount > 10) {
            baseFontSize = '0.75rem';
            logoMaxHeight = '90px';
            tablePadding = '0.3rem';
            sectionMargin = '0.5rem';
            footerMargin = '2rem';
        } else if (itemCount > 5) {
            baseFontSize = '0.85rem';
            logoMaxHeight = '110px';
            tablePadding = '0.4rem';
            sectionMargin = '0.75rem';
            footerMargin = '3rem';
        }

        receiptContent.style.fontSize = baseFontSize;

        receiptContent.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #eee; padding-bottom: ${sectionMargin}; margin-bottom: ${sectionMargin}; direction: ltr;">
                <div style="flex: 1; text-align: left; font-weight: bold; color: #475569; font-size: 0.85rem; line-height: 1.6; padding-top: 10px; direction: rtl;">
                    سمكرة - دهان - عفشة<br>
                    ميكانيكا - كهرباء - تكييف
                </div>
                <div style="flex: 1; text-align: center;">
                    <img src="../assets/logo.png" style="max-height: ${logoMaxHeight}; max-width: 100%; object-fit: contain;" alt="El Ansary" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
                    <div style="font-size: 1.3rem; font-weight: bold; color: #1e293b; margin-top: 5px; text-align: center;">بيان الخدمه (معلقة)</div>
                    <h1 style="display:none; color: #eab308; margin:0;">${t.appName}</h1>
                </div>
                <div style="flex: 1; text-align: right; font-weight: bold; color: #475569; font-size: 1.1rem; padding-top: 10px; direction: rtl;">
                    مركز الانصاري لصيانه السيارات
                </div>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: ${sectionMargin};">
                <div>
                    <p style="margin: 0.25rem 0;"><strong>${t.customer}:</strong> ${bill.customer_name}</p>
                    <p style="margin: 0.25rem 0;"><strong>${t.phone}:</strong> ${bill.customer_phone}</p>
                    <p style="margin: 0.25rem 0;"><strong>${t.carModel}:</strong> ${bill.car_name}</p>
                    <p style="margin: 0.25rem 0;"><strong>${t.plateNumber || 'Plate'}:</strong> ${bill.plate_number}</p>
                </div>
                <div style="text-align: right;">
                    <p style="margin: 0.25rem 0;"><strong>${t.date}:</strong> ${date}</p>
                    <p style="margin: 0.25rem 0;"><strong>${t.payment}:</strong> ${window.getTranslatedPaymentMethod(bill.payment_method)}</p>
                    ${bill.odometer ? `<p style="margin: 0.25rem 0;"><strong>${t.odometer}:</strong> ${bill.odometer}</p>` : ''}
                </div>
            </div>
            <table style="width: 100%; border-collapse: collapse; margin-top: ${sectionMargin};">
                <thead>
                    <tr style="background: #f8fafc; border-bottom: 2px solid #eee;">
                        <th style="padding: ${tablePadding}; text-align: left;">${t.serviceName}</th>
                        <th style="padding: ${tablePadding}; text-align: center;">${t.qty}</th>
                        <th style="padding: ${tablePadding}; text-align: right;">${t.price}</th>
                        <th style="padding: ${tablePadding}; text-align: right;">${t.subtotal}</th>
                    </tr>
                </thead>
                <tbody>
                    ${lines.map(l => `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: ${tablePadding};">${l.name}</td>
                            <td style="padding: ${tablePadding}; text-align: center;">${l.qty}</td>
                            <td style="padding: ${tablePadding}; text-align: right;">$${parseFloat(l.price).toFixed(2)}</td>
                            <td style="padding: ${tablePadding}; text-align: right;">$${l.total ? l.total.toFixed(2) : (l.qty * l.price).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div style="margin-top: ${sectionMargin}; width: 300px; margin-left: auto; margin-right: 0;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 1.1rem;">
                    <span>${t.total}:</span>
                    <span>${total}</span>
                </div>
                ${bill.discount > 0 ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 1.1rem; color: #ef4444;">
                    <span>${t.discount || 'Discount'}:</span>
                    <span>-$${parseFloat(bill.discount).toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 1.2rem; font-weight: bold; color: #10b981; border-top: 1px solid #eee; padding-top: 0.5rem;">
                    <span>${t.netTotal || 'Net Total'}:</span>
                    <span>$${(parseFloat(bill.total_amount) - parseFloat(bill.discount)).toFixed(2)}</span>
                </div>
                ` : ''}
            </div>

            ${bill.notes ? `
            <div style="margin-top: ${sectionMargin}; padding: 1rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
                <p style="margin: 0; font-weight: 700; color: #1e293b;">${t.notes}:</p>
                <p style="margin: 0.5rem 0 0 0; color: #475569; white-space: pre-wrap;">${bill.notes}</p>
            </div>
            ` : ''}

            <!-- Footer Section -->
            <div style="margin-top: ${footerMargin}; display: flex; justify-content: space-between; border-top: 1px solid #eee; padding-top: 1rem;">
                <div style="font-size: 0.9rem; color: #64748b;">
                    <p><strong>Contact Us:</strong></p>
                    <p>01010103777</p>
                    <p>01010606016</p>
                </div>
                <div style="text-align: right; font-size: 0.9rem; color: #64748b;">
                    <p><strong>Engineer's Signature:</strong></p>
                    <div style="margin-top: 2rem; border-bottom: 1px solid #94a3b8; width: 150px; display: inline-block;"></div>
                </div>
            </div>
        `;

        if (lang === 'ar') {
            receiptContent.style.direction = 'rtl';
            receiptContent.querySelectorAll('th').forEach(th => th.style.textAlign = 'right');
        } else {
            receiptContent.style.direction = 'ltr';
        }
    }

    printFromModalBtn.addEventListener('click', () => {
        if (!currentBillId) return;
        const bill = db.getPendingBillById(currentBillId);
        if (!bill) return;

        generateReceipt(bill);
        detailModal.classList.remove('active');
        receiptModal.classList.add('active');
    });

    closeReceiptBtn.addEventListener('click', () => receiptModal.classList.remove('active'));

    printReceiptBtn.addEventListener('click', async () => {
        if (!currentBillId) return;
        const bill = db.getPendingBillById(currentBillId);
        if (!bill) return;

        const { ipcRenderer } = require('electron');
        const dateStr = bill.date_created;
        const customerNameStr = bill.customer_name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const fileName = `pending_${dateStr}_${customerNameStr}.pdf`;

        const result = await ipcRenderer.invoke('print-to-pdf', {
            folder: 'bills',
            name: fileName
        });

        if (result.success) {
            console.log('Bill saved to:', result.path);
            // Don't close modal here — print dialog renders the page async, modal must stay visible
        } else {
            alert('Printing/Saving failed: ' + result.error);
        }
    });

    loadBills();
});
