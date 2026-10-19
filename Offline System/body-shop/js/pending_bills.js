let db;
try { db = require('../database/db.js'); }
catch (e) { console.error('DB load error:', e); alert('Database Error: ' + e.message); }

document.addEventListener('DOMContentLoaded', () => {
    translatePage();
    loadPendingBills();
    initEditModal();
});

function loadPendingBills() {
    const bills = db.getPendingBills();
    const tbody = document.getElementById('pendingTableBody');
    tbody.innerHTML = '';
    
    let totalValue = 0;
    let todayCount = 0;
    const today = new Date().toISOString().split('T')[0];
    
    bills.forEach(bill => {
        const cust = db.getCustomers().find(c => c.id === bill.customer_id);
        const car = bill.car_id ? db.getCarById(bill.car_id) : null;
        let items = [];
        try { items = JSON.parse(bill.line_items_json); } catch(e){}
        const desc = items.map(i => i.description).join(', ') || bill.description || '—';
        
        totalValue += bill.total_amount;
        if (bill.date_created === today) todayCount++;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${bill.date_created || ''}</td>
            <td class="font-bold">${cust ? cust.name : '—'}</td>
            <td>${car ? car.car_name || '—' : '—'}</td>
            <td style="max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${desc}">${desc}</td>
            <td class="font-bold text-teal">${(bill.total_amount || 0).toFixed(2)}</td>
            <td>${getPaymentBadge(bill.payment_method)}</td>
            <td>
                <div class="flex gap-2">
                    <button class="btn btn-outline btn-sm" onclick="openEditModal(${bill.id})" style="color:#3b82f6;border-color:#3b82f6;">${t('edit')}</button>
                    <button class="btn btn-outline btn-sm" onclick="printPendingBill(${bill.id})" style="color:#0d9488;border-color:#0d9488;">🖨️ ${t('print')}</button>
                    <button class="btn btn-primary btn-sm" onclick="processBillDirectly(${bill.id})">✅ ${t('processBill')}</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    if (bills.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#64748b;">${t('noPendingBills')}</td></tr>`;
    }
    
    document.getElementById('statCount').textContent = bills.length;
    document.getElementById('statTotal').textContent = totalValue.toFixed(2);
    document.getElementById('statToday').textContent = todayCount;
}

// ─── Process Bill Modal (Select Payment Method) ─────────────────────────────
let currentProcBill = null;

function initProcessModal() {
    const closeBtn = document.getElementById('closeProcessModalBtn');
    const cancelBtn = document.getElementById('cancelProcessModalBtn');
    const paySelect = document.getElementById('procPaymentMethod');
    const amtPaidInput = document.getElementById('procAmountPaid');
    const confirmBtn = document.getElementById('confirmFinalizeBillBtn');
    
    if (closeBtn) closeBtn.onclick = closeProcessModal;
    if (cancelBtn) cancelBtn.onclick = closeProcessModal;
    
    if (paySelect) {
        paySelect.onchange = () => {
            const isPayByParts = paySelect.value === 'PayByParts';
            const sec = document.getElementById('procPayByPartsSection');
            if (sec) sec.style.display = isPayByParts ? 'block' : 'none';
            recalcProcPending();
        };
    }
    
    if (amtPaidInput) {
        amtPaidInput.oninput = recalcProcPending;
    }
    
    if (confirmBtn) {
        confirmBtn.onclick = finalizeProcessBill;
    }
}

window.closeProcessModal = function() {
    const modal = document.getElementById('processBillModal');
    if (modal) modal.classList.remove('active');
    currentProcBill = null;
};

function recalcProcPending() {
    if (!currentProcBill) return;
    const total = parseFloat(currentProcBill.total_amount) || 0;
    const method = document.getElementById('procPaymentMethod').value;
    const paidInput = parseFloat(document.getElementById('procAmountPaid').value) || 0;
    
    const remaining = Math.max(0, total - paidInput);
    const pendingDisp = document.getElementById('procPendingDisplay');
    if (pendingDisp) pendingDisp.textContent = remaining.toFixed(2) + ' EGP';
}

window.processBillDirectly = function(id) {
    const bill = db.getPendingBillById(id);
    if (!bill) return;
    currentProcBill = bill;
    
    document.getElementById('processBillId').value = id;
    const cust = db.getCustomers().find(c => c.id === bill.customer_id);
    const car = bill.car_id ? db.getCarById(bill.car_id) : null;
    
    document.getElementById('procCustName').textContent = cust ? cust.name : '—';
    document.getElementById('procCarName').textContent = car ? (car.car_name || '—') + (car.plate_number ? ' - ' + car.plate_number : '') : '—';
    document.getElementById('procTotalAmount').textContent = (bill.total_amount || 0).toFixed(2) + ' EGP';
    
    const paySelect = document.getElementById('procPaymentMethod');
    paySelect.value = bill.payment_method || 'Cash';
    
    const isPayByParts = paySelect.value === 'PayByParts';
    document.getElementById('procPayByPartsSection').style.display = isPayByParts ? 'block' : 'none';
    document.getElementById('procAmountPaid').value = bill.paid_amount || 0;
    
    recalcProcPending();
    document.getElementById('processBillModal').classList.add('active');
};

window.finalizeProcessBill = function() {
    try {
        const idInput = document.getElementById('processBillId');
        if (!idInput || !idInput.value) return;
        const id = parseInt(idInput.value);
        const bill = db.getPendingBillById(id);
        if (!bill) return;
        
        const selectedMethod = document.getElementById('procPaymentMethod').value;
        const total = parseFloat(bill.total_amount) || 0;
        const paidInput = parseFloat(document.getElementById('procAmountPaid').value) || 0;
        const actualPaid = selectedMethod === 'PayByParts' ? paidInput : total;
        const pendingAmt = Math.max(0, total - actualPaid);
        
        let items = [];
        try { items = JSON.parse(bill.line_items_json); } catch(e){ items = []; }
        if (!Array.isArray(items)) items = [];
        
        const date = new Date().toISOString().split('T')[0];
        
        // Add to repairs table with chosen payment method & paid amount
        const repairId = db.addRepair({
            customer_id: bill.customer_id,
            car_id: bill.car_id,
            description: bill.description || (items.map(i => i.description || i.item_name).join(', ')) || 'Service',
            date: date,
            total_amount: total,
            paid_amount: actualPaid,
            pending_amount: pendingAmt,
            discount: bill.discount || 0,
            payment_method: selectedMethod,
            odometer: bill.odometer || '',
            notes: bill.notes || ''
        });

        items.forEach(item => {
            const itemName = item.description || item.item_name || bill.description || 'Service';
            const qty = parseFloat(item.qty || item.quantity) || 1;
            const price = parseFloat(item.unit_price || item.price) || 0;
            
            db.addRepairItem({
                repair_id: repairId,
                item_name: itemName,
                quantity: qty,
                unit_price: price
            });
        });
        
        db.deletePendingBill(id);
        window.closeProcessModal();
        alert(t('billProcessed') || 'Bill Finalized Successfully!');
        loadPendingBills();
    } catch(err) {
        console.error('Error finalizing bill:', err);
        alert('Error finalizing bill: ' + err.message);
    }
};

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function initEditModal() {
    document.getElementById('cancelEditModalBtn').onclick = () => document.getElementById('pendingEditModal').classList.remove('active');
    
    const payMethod = document.getElementById('editPaymentMethod');
    payMethod.addEventListener('change', () => {
        document.getElementById('editPayByPartsSection').style.display = payMethod.value === 'PayByParts' ? 'block' : 'none';
        recalcEditTotal();
    });
    
    document.getElementById('editDiscount').addEventListener('input', recalcEditTotal);
    document.getElementById('editAmountPaid').addEventListener('input', recalcEditTotal);
    document.getElementById('editAddItemBtn').onclick = () => addEditLineItem();
    
    const printEditBtn = document.getElementById('printEditedPendingBtn');
    if (printEditBtn) {
        printEditBtn.onclick = () => {
            const id = parseInt(document.getElementById('editBillId').value);
            if (id) window.printPendingBill(id);
        };
    }
    
    document.getElementById('saveEditPendingBtn').onclick = () => saveEditedBill(true);
    document.getElementById('processEditedBillBtn').onclick = () => saveEditedBill(false);
}

window.openEditModal = function(id) {
    const bill = db.getPendingBillById(id);
    if (!bill) return;
    
    document.getElementById('editBillId').value = id;
    const cust = db.getCustomers().find(c => c.id === bill.customer_id);
    const car = bill.car_id ? db.getCarById(bill.car_id) : null;
    
    document.getElementById('editCustomerName').value = cust ? cust.name : '';
    document.getElementById('editCarName').value = car ? (car.car_name || '') + (car.plate_number ? ' - ' + car.plate_number : '') : '';
    
    document.getElementById('editPaymentMethod').value = bill.payment_method;
    document.getElementById('editDiscount').value = bill.discount;
    document.getElementById('editOdometer').value = bill.odometer || '';
    document.getElementById('editNotes').value = bill.notes || '';
    
    if (bill.payment_method === 'PayByParts') {
        document.getElementById('editPayByPartsSection').style.display = 'block';
        document.getElementById('editAmountPaid').value = bill.paid_amount || 0;
    } else {
        document.getElementById('editPayByPartsSection').style.display = 'none';
        document.getElementById('editAmountPaid').value = 0;
    }
    
    let items = [];
    try { items = JSON.parse(bill.line_items_json); } catch(e){}
    
    const tbody = document.getElementById('editLineItemsBody');
    tbody.innerHTML = '';
    
    items.forEach(item => addEditLineItem(item));
    if (items.length === 0) addEditLineItem();
    
    recalcEditTotal();
    document.getElementById('pendingEditModal').classList.add('active');
};

function addEditLineItem(item = {description:'', qty:1, unit_price:0, part_id:null}) {
    const tbody = document.getElementById('editLineItemsBody');
    const tr = document.createElement('tr');
    if (item.part_id) tr.dataset.partId = item.part_id;
    
    const qtyVal = (item.qty !== undefined && item.qty !== null) ? item.qty : 1;
    tr.innerHTML = `
        <td><input type="text" class="form-control item-desc" value="${item.description || ''}"></td>
        <td class="col-qty"><input type="number" class="form-control qty-input" value="${qtyVal}" min="1" step="0.5"></td>
        <td><input type="number" class="form-control price-input" value="${item.unit_price || 0}" min="0" step="0.01"></td>
        <td class="font-bold text-teal line-subtotal">0.00</td>
        <td><button class="btn btn-danger btn-sm remove-btn">×</button></td>
    `;
    
    const recalc = () => {
        const q = parseFloat(tr.querySelector('.qty-input').value) || 0;
        const p = parseFloat(tr.querySelector('.price-input').value) || 0;
        tr.querySelector('.line-subtotal').textContent = (q * p).toFixed(2);
        recalcEditTotal();
    };
    
    tr.querySelector('.qty-input').addEventListener('input', recalc);
    tr.querySelector('.price-input').addEventListener('input', recalc);
    tr.querySelector('.remove-btn').onclick = () => { tr.remove(); recalcEditTotal(); };
    
    tbody.appendChild(tr);
    recalc();
}

// ─── Print Pending Bill ────────────────────────────────────────────────────────
window.printPendingBill = function(id) {
    const bill = db.getPendingBillById(id);
    if (!bill) return;
    
    const cust = bill.customer_id ? db.getCustomers().find(c => c.id === bill.customer_id) : null;
    const car = bill.car_id ? db.getCarById(bill.car_id) : null;
    
    let items = [];
    try { items = JSON.parse(bill.line_items_json); } catch(e){}
    
    const custName = cust ? cust.name : (bill.customer_name || '—');
    const custPhone = cust ? (cust.phone || '') : (bill.customer_phone || '');
    const carModel = car ? (car.car_name || '') : (bill.car_name || '—');
    const plateNumber = car ? (car.plate_number || '') : (bill.plate_number || '');
    
    const data = {
        date: bill.date_created || new Date().toISOString().split('T')[0],
        customerName: custName,
        customerPhone: custPhone,
        carModel: carModel,
        plateNumber: plateNumber,
        odometer: bill.odometer || '',
        paymentMethod: bill.payment_method || 'Pending',
        items: items.map(i => ({
            description: i.description || i.item_name || '—',
            qty: parseFloat(i.qty || i.quantity) || 1,
            unit_price: parseFloat(i.unit_price || i.price) || 0,
            subtotal: parseFloat(i.subtotal) || ((parseFloat(i.qty || i.quantity) || 1) * (parseFloat(i.unit_price || i.price) || 0))
        })),
        total: (parseFloat(bill.total_amount) || 0) + (parseFloat(bill.discount) || 0),
        discount: parseFloat(bill.discount) || 0,
        netTotal: parseFloat(bill.total_amount) || 0,
        paidNow: parseFloat(bill.paid_amount) || 0,
        notes: bill.notes || ''
    };
    
    const html = `
        <div style="font-family:'Cairo',Arial,sans-serif; direction:rtl; color:#1e293b; padding:10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #eab308; padding-bottom: 1rem; margin-bottom: 1rem; direction: ltr;">
                <div style="flex: 1; text-align: left; font-weight: bold; color: #475569; font-size: 0.85rem; line-height: 1.6; direction: rtl;">
                    سمكرة - دهانات - كبينة<br>
                    إصلاح وتجديد السيارات
                </div>
                <div style="flex: 1; text-align: center;">
                    <img src="../assets/logo.png" style="max-height: 110px; max-width: 100%; object-fit: contain;" alt="El Ansary" onerror="this.style.display='none';">
                    <div style="font-size: 1.3rem; font-weight: 800; color: #1e293b; margin-top: 5px;">بيان الخدمه</div>
                </div>
                <div style="flex: 1; text-align: right; font-weight: bold; color: #475569; font-size: 1.1rem; direction: rtl;">
                    مركز الأنصاري لإصلاح الهياكل
                </div>
            </div>

            <div style="display: flex; justify-content: space-between; margin-bottom: 1rem; background:#fefce8; padding: 0.85rem 1.25rem; border-radius: 8px; border: 1.5px solid #fde047; font-size: 0.95rem;">
                <div>
                    <p style="margin: 0.25rem 0;"><strong>اسم العميل:</strong> ${data.customerName}</p>
                    <p style="margin: 0.25rem 0;"><strong>الهاتف:</strong> ${data.customerPhone || '—'}</p>
                    <p style="margin: 0.25rem 0;"><strong>موديل السيارة:</strong> ${data.carModel}</p>
                    <p style="margin: 0.25rem 0;"><strong>رقم اللوحة:</strong> ${data.plateNumber || '—'}</p>
                </div>
                <div style="text-align: left; direction: ltr;">
                    <p style="margin: 0.25rem 0;"><strong>${data.date} :التاريخ</strong></p>
                    <p style="margin: 0.25rem 0;"><strong>${getTranslatedPaymentMethod(data.paymentMethod)} :طريقة الدفع</strong></p>
                    ${data.odometer ? `<p style="margin: 0.25rem 0;"><strong>${data.odometer} :عداد المسافات</strong></p>` : ''}
                </div>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-top: 1rem;">
                <thead>
                    <tr style="background: #fef08a; border-bottom: 2px solid #ca8a04; color: #713f12;">
                        <th style="padding: 0.65rem; text-align: right; font-weight: 700;">اسم الخدمة / قطعة الغيار</th>
                        <th style="padding: 0.65rem; text-align: center; font-weight: 700; width: 80px;">الكمية</th>
                        <th style="padding: 0.65rem; text-align: center; font-weight: 700; width: 110px;">السعر</th>
                        <th style="padding: 0.65rem; text-align: center; font-weight: 700; width: 110px;">الإجمالي</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.items.map(i => `
                        <tr style="border-bottom: 1px solid #f3f4f6;">
                            <td style="padding: 0.65rem;">${i.description}</td>
                            <td style="padding: 0.65rem; text-align: center;">${i.qty}</td>
                            <td style="padding: 0.65rem; text-align: center;">${i.unit_price.toFixed(2)}</td>
                            <td style="padding: 0.65rem; text-align: center; font-weight: bold;">${i.subtotal.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div style="margin-top: 1rem; width: 320px; margin-left: auto; margin-right: 0;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.4rem; font-size: 1.05rem;">
                    <span>الإجمالي:</span>
                    <span>${data.total.toFixed(2)} ج.م</span>
                </div>
                ${data.discount > 0 ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.4rem; font-size: 1.05rem; color: #dc2626;">
                    <span>الخصم:</span>
                    <span>-${data.discount.toFixed(2)} ج.م</span>
                </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.4rem; font-size: 1.25rem; font-weight: bold; color: #0d9488; border-top: 2px solid #ca8a04; padding-top: 0.5rem;">
                    <span>الصافي:</span>
                    <span>${data.netTotal.toFixed(2)} ج.م</span>
                </div>
            </div>
            ${data.notes ? `
            <div style="margin-top: 1rem; background: #f8fafc; padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 0.85rem;">
                <strong>ملاحظات:</strong> ${data.notes}
            </div>` : ''}
        </div>
    `;
    
    document.getElementById('printContainer').innerHTML = html;
    window.print();
};

function recalcEditTotal() {
    let grand = 0;
    document.querySelectorAll('#editLineItemsBody tr').forEach(tr => {
        grand += parseFloat(tr.querySelector('.line-subtotal').textContent) || 0;
    });
    
    const disc = parseFloat(document.getElementById('editDiscount').value) || 0;
    const net = Math.max(0, grand - disc);
    
    document.getElementById('editTotalDisplay').textContent = net.toFixed(2);
    
    if (document.getElementById('editPaymentMethod').value === 'PayByParts') {
        const paid = parseFloat(document.getElementById('editAmountPaid').value) || 0;
        document.getElementById('editPendingDisplay').textContent = Math.max(0, net - paid).toFixed(2);
    }
}

function saveEditedBill(keepPending) {
    const id = parseInt(document.getElementById('editBillId').value);
    const bill = db.getPendingBillById(id);
    if (!bill) return;
    
    const rows = document.querySelectorAll('#editLineItemsBody tr');
    let items = [];
    let grand = 0;
    rows.forEach(tr => {
        const desc = tr.querySelector('.item-desc').value.trim();
        const qty = parseFloat(tr.querySelector('.qty-input').value) || 0;
        const price = parseFloat(tr.querySelector('.price-input').value) || 0;
        if (desc || price > 0) {
            const sub = qty * price;
            grand += sub;
            items.push({
                description: desc,
                qty: qty,
                unit_price: price,
                subtotal: sub,
                part_id: tr.dataset.partId ? parseInt(tr.dataset.partId) : null
            });
        }
    });
    
    const disc = parseFloat(document.getElementById('editDiscount').value) || 0;
    const net = Math.max(0, grand - disc);
    const method = document.getElementById('editPaymentMethod').value;
    const paid = method === 'PayByParts' ? (parseFloat(document.getElementById('editAmountPaid').value) || 0) : net;
    
    if (keepPending) {
        db.updatePendingBill(id, {
            description: items.map(i => i.description).join(', '),
            total_amount: net,
            paid_amount: paid,
            pending_amount: Math.max(0, net - paid),
            discount: disc,
            payment_method: method,
            odometer: document.getElementById('editOdometer').value.trim(),
            notes: document.getElementById('editNotes').value.trim(),
            line_items_json: JSON.stringify(items)
        });
    } else {
        if (!confirm(t('processBill') + '?')) return;
        const date = new Date().toISOString().split('T')[0];
        
        const repairId = db.addRepair({
            customer_id: bill.customer_id,
            car_id: bill.car_id,
            description: items.map(i => i.description).join(', '),
            date: date,
            total_amount: net,
            paid_amount: paid,
            pending_amount: Math.max(0, net - paid),
            discount: disc,
            payment_method: method,
            odometer: document.getElementById('editOdometer').value.trim(),
            notes: document.getElementById('editNotes').value.trim()
        });

        items.forEach(item => {
            db.addRepairItem({
                repair_id: repairId,
                item_name: item.description,
                quantity: item.qty,
                unit_price: item.unit_price
            });
        });
        
        db.deletePendingBill(id);
        alert(t('billProcessed'));
    }
    
    document.getElementById('pendingEditModal').classList.remove('active');
    loadPendingBills();
}

function getPaymentBadge(method) {
    if (!method) return '—';
    if (method === 'Cash') return `<span class="badge badge-cash">${t('cash')}</span>`;
    return `<span class="badge badge-card">${getTranslatedPaymentMethod(method)}</span>`;
}
