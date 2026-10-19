let db;
try { db = require('../database/db.js'); }
catch (e) { console.error('DB load error:', e); alert('Database Error: ' + e.message); }

let selectedCustomerId = null;
let currentCarId = null;
let editingPendingId = null;

document.addEventListener('DOMContentLoaded', () => {
    translatePage();
    initCustomerSearch();
    initLineItems();
    initCalculations();
    initPaymentMethod();
    initPartsSearch();
    initSubmitButtons();
    
    // Check if editing pending bill
    const urlParams = new URLSearchParams(window.location.search);
    const pendingId = urlParams.get('edit_pending');
    if (pendingId) {
        loadPendingBill(parseInt(pendingId));
    }
});

// ─── Customer Search ─────────────────────────────────────────────────────────
function initCustomerSearch() {
    const searchInput = document.getElementById('customerSearch');
    const resultsDiv = document.getElementById('searchResults');

    searchInput.addEventListener('input', () => {
        const term = searchInput.value.trim();
        if (!term) { resultsDiv.classList.remove('active'); return; }
        
        const results = db.searchCustomers(term);
        resultsDiv.innerHTML = '';
        if (results.length === 0) {
            resultsDiv.innerHTML = `<div class="result-item" style="color:#64748b;">${t('noData')}</div>`;
        } else {
            results.forEach(c => {
                const cars = db.getCarsByCustomer(c.id);
                const div = document.createElement('div');
                div.className = 'result-item';
                div.innerHTML = `
                    <span class="result-name">${c.name}</span>
                    <span class="result-phone">${c.phone || ''}</span>
                    <span class="result-car">${cars.length} ${t('carsRegistered')}</span>
                `;
                div.onclick = () => selectCustomer(c.id, c.name, c.phone);
                resultsDiv.appendChild(div);
            });
        }
        resultsDiv.classList.add('active');
    });

    document.addEventListener('click', e => {
        if (!searchInput.contains(e.target) && !resultsDiv.contains(e.target)) {
            resultsDiv.classList.remove('active');
        }
    });
}

function selectCustomer(id, name, phone) {
    selectedCustomerId = id;
    document.getElementById('searchResults').classList.remove('active');
    document.getElementById('customerSearch').value = '';
    
    document.getElementById('customerName').value = name;
    document.getElementById('customerPhone').value = phone || '';
    
    const cars = db.getCarsByCustomer(id);
    const carSelectGroup = document.getElementById('carSelectGroup');
    const carSelect = document.getElementById('carSelect');
    carSelect.innerHTML = '';
    
    if (cars.length > 0) {
        carSelectGroup.style.display = 'block';
        cars.forEach((car) => {
            const opt = document.createElement('option');
            opt.value = car.id;
            opt.textContent = `${car.car_name || t('unknownCar')} ${car.plate_number ? '· ' + car.plate_number : ''}`;
            opt.dataset.carName = car.car_name || '';
            opt.dataset.plate = car.plate_number || '';
            carSelect.appendChild(opt);
        });
        
        carSelect.selectedIndex = 0;
        updateCarFieldsFromSelect();
        carSelect.onchange = updateCarFieldsFromSelect;
    } else {
        carSelectGroup.style.display = 'none';
        document.getElementById('carModel').value = '';
        document.getElementById('plateNumber').value = '';
        currentCarId = null;
    }
}

function updateCarFieldsFromSelect() {
    const sel = document.getElementById('carSelect');
    if (!sel || sel.selectedIndex === -1) return;
    const opt = sel.options[sel.selectedIndex];
    currentCarId = parseInt(opt.value);
    document.getElementById('carModel').value = opt.dataset.carName || '';
    document.getElementById('plateNumber').value = opt.dataset.plate || '';
}

// ─── Line Items ──────────────────────────────────────────────────────────────
function initLineItems() {
    document.getElementById('addItemBtn').onclick = () => {
        const tbody = document.getElementById('lineItemsBody');
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" class="form-control item-desc" placeholder="${t('egPaint')}"></td>
            <td><input type="number" class="form-control qty-input" value="1" min="1" step="0.5"></td>
            <td><input type="number" class="form-control price-input" value="0" min="0" step="0.01"></td>
            <td class="font-bold text-teal line-subtotal">0.00</td>
            <td><button class="btn btn-danger btn-sm remove-item-btn">×</button></td>
        `;
        tbody.appendChild(tr);
        bindRowEvents(tr);
    };

    document.querySelectorAll('#lineItemsBody tr').forEach(bindRowEvents);
}

function bindRowEvents(tr) {
    const qty = tr.querySelector('.qty-input');
    const price = tr.querySelector('.price-input');
    const rmBtn = tr.querySelector('.remove-item-btn');
    
    const recalc = () => {
        const q = parseFloat(qty.value) || 0;
        const p = parseFloat(price.value) || 0;
        const subEl = tr.querySelector('.line-subtotal');
        if (subEl) subEl.textContent = (q * p).toFixed(2);
        calculateTotal();
    };

    if (qty) qty.addEventListener('input', recalc);
    if (price) price.addEventListener('input', recalc);
    if (rmBtn) rmBtn.onclick = () => {
        tr.remove();
        calculateTotal();
    };
}

// ─── Parts Search ─────────────────────────────────────────────────────────────
function initPartsSearch() {
    const modal = document.getElementById('partsSearchModal');
    const input = document.getElementById('partSearchInputModal');
    const tbody = document.getElementById('partsSearchBody');
    
    document.getElementById('addFromStockBtn').onclick = () => {
        modal.classList.add('active');
        input.value = '';
        input.focus();
        loadPartsModal('');
    };
    
    document.getElementById('closePartsModalBtn').onclick = () => modal.classList.remove('active');
    input.addEventListener('input', () => loadPartsModal(input.value.trim()));
    
    function loadPartsModal(term) {
        tbody.innerHTML = '';
        let parts = db.getParts();
        if (term) {
            const lower = term.toLowerCase();
            parts = parts.filter(p => p.name.toLowerCase().includes(lower));
        }
        
        parts.forEach(p => {
            const qty = p.quantity_in_stock !== undefined ? p.quantity_in_stock : 0;
            const price = p.unit_price !== undefined ? p.unit_price : 0;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="font-bold">${p.name}</td>
                <td><span class="${qty <= 2 ? 'text-red font-bold' : ''}">${qty}</span></td>
                <td class="text-teal">${price.toFixed(2)}</td>
                <td><button class="btn btn-primary btn-sm add-part-btn">${t('add')}</button></td>
            `;
            tr.querySelector('.add-part-btn').onclick = () => {
                if (qty <= 0) { alert('Part out of stock!'); return; }
                addPartRow(p);
                modal.classList.remove('active');
            };
            tbody.appendChild(tr);
        });
    }
}

function addPartRow(part) {
    const tbody = document.getElementById('lineItemsBody');
    if (tbody.children.length === 1) {
        const firstRow = tbody.children[0];
        const descEl = firstRow.querySelector('.item-desc');
        const priceEl = firstRow.querySelector('.price-input');
        if (descEl && !descEl.value && priceEl && priceEl.value == 0) {
            firstRow.remove();
        }
    }

    const qty = part.quantity_in_stock !== undefined ? part.quantity_in_stock : 0;
    const price = part.unit_price !== undefined ? part.unit_price : 0;

    const tr = document.createElement('tr');
    tr.dataset.partId = part.id;
    tr.innerHTML = `
        <td><input type="text" class="form-control item-desc" value="${part.name}" readonly></td>
        <td><input type="number" class="form-control qty-input" value="1" min="1" max="${qty}" step="0.5"></td>
        <td><input type="number" class="form-control price-input" value="${price}" min="0" step="0.01"></td>
        <td class="font-bold text-teal line-subtotal">${price.toFixed(2)}</td>
        <td><button class="btn btn-danger btn-sm remove-item-btn">×</button></td>
    `;
    tbody.appendChild(tr);
    bindRowEvents(tr);
    calculateTotal();
}

// ─── Calculations ────────────────────────────────────────────────────────────
function initCalculations() {
    document.getElementById('discountInput').addEventListener('input', calculateTotal);
    document.getElementById('amountPaidInput').addEventListener('input', calculateTotal);
}

function calculateTotal() {
    let grand = 0;
    document.querySelectorAll('#lineItemsBody tr').forEach(tr => {
        const subEl = tr.querySelector('.line-subtotal');
        if (subEl) grand += parseFloat(subEl.textContent) || 0;
    });
    
    document.getElementById('grandTotal').textContent = grand.toFixed(2);
    
    const discount = parseFloat(document.getElementById('discountInput').value) || 0;
    const net = Math.max(0, grand - discount);
    document.getElementById('netTotal').textContent = net.toFixed(2);
    
    if (document.getElementById('paymentMethodSelect').value === 'PayByParts') {
        const paidNow = parseFloat(document.getElementById('amountPaidInput').value) || 0;
        const pending = Math.max(0, net - paidNow);
        document.getElementById('pendingDisplay').textContent = pending.toFixed(2);
    }
}

function initPaymentMethod() {
    const sel = document.getElementById('paymentMethodSelect');
    const partsSec = document.getElementById('payByPartsSection');
    
    sel.addEventListener('change', () => {
        if (sel.value === 'PayByParts') {
            partsSec.style.display = 'block';
            document.getElementById('amountPaidInput').value = document.getElementById('netTotal').textContent;
            calculateTotal();
        } else {
            partsSec.style.display = 'none';
        }
    });
}

// ─── Submit Actions ──────────────────────────────────────────────────────────
function initSubmitButtons() {
    document.getElementById('confirmPrintBtn').onclick = () => submitBill(false);
    document.getElementById('savePendingBtn').onclick = () => submitBill(true);
    
    document.getElementById('closeModalBtn').onclick = () => {
        document.getElementById('receiptModal').classList.remove('active');
        window.location.reload();
    };
}

function submitBill(isPending) {
    if (!selectedCustomerId) { alert(t('selectCustomer') + ' required'); return; }
    
    const rows = document.querySelectorAll('#lineItemsBody tr');
    let items = [];
    
    rows.forEach(tr => {
        const descInput = tr.querySelector('.item-desc');
        const desc = descInput ? descInput.value.trim() : '';
        const qty = parseFloat(tr.querySelector('.qty-input')?.value) || 0;
        const price = parseFloat(tr.querySelector('.price-input')?.value) || 0;
        if (desc || price > 0) {
            items.push({ 
                description: desc || 'Service', 
                qty: qty, 
                unit_price: price, 
                subtotal: qty * price,
                part_id: tr.dataset.partId ? parseInt(tr.dataset.partId) : null
            });
        }
    });
    
    if (items.length === 0) { alert('Please enter at least one item description or price.'); return; }
    
    const carModelInput = document.getElementById('carModel').value.trim();
    const plateInput = document.getElementById('plateNumber').value.trim();
    if (!currentCarId && carModelInput) {
        currentCarId = db.addCar(selectedCustomerId, carModelInput, plateInput);
    }
    
    const total = parseFloat(document.getElementById('grandTotal').textContent) || 0;
    const discount = parseFloat(document.getElementById('discountInput').value) || 0;
    const net = parseFloat(document.getElementById('netTotal').textContent) || 0;
    const method = document.getElementById('paymentMethodSelect').value;
    const date = new Date().toISOString().split('T')[0];
    
    let paidNow = net;
    let pendingAmt = 0;
    if (method === 'PayByParts') {
        paidNow = parseFloat(document.getElementById('amountPaidInput').value) || 0;
        pendingAmt = Math.max(0, net - paidNow);
    }
    
    const actionText = isPending ? t('saveAsPending') : t('confirmPrint');
    if (!confirm(actionText + '?')) return;

    if (isPending) {
        db.addPendingBill({
            customer_id: selectedCustomerId,
            car_id: currentCarId,
            description: items.map(i => i.description).join(', '),
            date_created: date,
            total_amount: net,
            paid_amount: paidNow,
            pending_amount: pendingAmt,
            discount: discount,
            payment_method: method,
            odometer: document.getElementById('odometer').value.trim(),
            notes: document.getElementById('notes').value.trim(),
            line_items_json: JSON.stringify(items)
        });
        
        if (editingPendingId) db.deletePendingBill(editingPendingId);
        
        alert('Saved as Pending');
        window.location.href = 'pending_bills.html';
    } else {
        // Confirmed repair invoice
        const repairId = db.addRepair({
            customer_id: selectedCustomerId,
            car_id: currentCarId,
            description: items.map(i => i.description).join(', '),
            date: date,
            total_amount: net,
            paid_amount: paidNow,
            pending_amount: pendingAmt,
            discount: discount,
            payment_method: method,
            odometer: document.getElementById('odometer').value.trim(),
            notes: document.getElementById('notes').value.trim()
        });

        items.forEach(item => {
            db.addRepairItem({
                repair_id: repairId,
                item_name: item.description,
                quantity: item.qty,
                unit_price: item.unit_price
            });
        });

        if (editingPendingId) db.deletePendingBill(editingPendingId);

        showReceipt(repairId, items, net, discount, method, paidNow);
    }
}

// ─── Receipt Modal & Print ───────────────────────────────────────────────────
function showReceipt(repairId, items, net, discount, method, paidNow) {
    const custName = document.getElementById('customerName').value;
    const custPhone = document.getElementById('customerPhone').value;
    const carModel = document.getElementById('carModel').value;
    const plateNumber = document.getElementById('plateNumber').value;
    const odometer = document.getElementById('odometer').value;
    const notes = document.getElementById('notes').value.trim();
    const date = new Date().toISOString().split('T')[0];
    
    let html = generateOldSystemReceiptHTML({
        date: date,
        customerName: custName,
        customerPhone: custPhone,
        carModel: carModel,
        plateNumber: plateNumber,
        odometer: odometer,
        paymentMethod: method,
        items: items,
        total: net + discount,
        discount: discount,
        netTotal: net,
        paidNow: paidNow,
        notes: notes
    });
    
    document.getElementById('receiptContent').innerHTML = html;
    document.getElementById('printContainer').innerHTML = html;
    
    const modal = document.getElementById('receiptModal');
    modal.classList.add('active');
    
    document.getElementById('printReceiptBtn').onclick = () => window.print();
}

function generateOldSystemReceiptHTML(data) {
    return `
        <div style="font-family:'Cairo',Arial,sans-serif; direction:rtl; color:#1e293b; padding:10px;">
            <!-- Header without invoice number -->
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

            <!-- Customer Details Grid -->
            <div style="display: flex; justify-content: space-between; margin-bottom: 1rem; background:#fefce8; padding: 0.85rem 1.25rem; border-radius: 8px; border: 1.5px solid #fde047; font-size: 0.95rem;">
                <div>
                    <p style="margin: 0.25rem 0;"><strong>اسم العميل:</strong> ${data.customerName || '—'}</p>
                    <p style="margin: 0.25rem 0;"><strong>الهاتف:</strong> ${data.customerPhone || '—'}</p>
                    <p style="margin: 0.25rem 0;"><strong>موديل السيارة:</strong> ${data.carModel || '—'}</p>
                    <p style="margin: 0.25rem 0;"><strong>رقم اللوحة:</strong> ${data.plateNumber || '—'}</p>
                </div>
                <div style="text-align: left; direction: ltr;">
                    <p style="margin: 0.25rem 0;"><strong>${data.date} :التاريخ</strong></p>
                    <p style="margin: 0.25rem 0;"><strong>${getTranslatedPaymentMethod(data.paymentMethod)} :طريقة الدفع</strong></p>
                    ${data.odometer ? `<p style="margin: 0.25rem 0;"><strong>${data.odometer} :عداد المسافات</strong></p>` : ''}
                </div>
            </div>

            <!-- Line Items Table -->
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

            <!-- Summary Box -->
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
                ${data.paymentMethod === 'PayByParts' ? `
                <div style="display: flex; justify-content: space-between; margin-top: 0.4rem; font-size: 1.05rem; color: #2563eb;">
                    <span>المدفوع الان:</span>
                    <span>${data.paidNow.toFixed(2)} ج.م</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 0.4rem; font-size: 1.05rem; color: #dc2626; font-weight: bold;">
                    <span>المبلغ المتبقي:</span>
                    <span>${(data.netTotal - data.paidNow).toFixed(2)} ج.م</span>
                </div>
                ` : ''}
            </div>

            ${data.notes ? `
            <div style="margin-top: 1rem; padding: 0.75rem 1rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
                <p style="margin: 0; font-weight: 700; color: #1e293b;">ملاحظات:</p>
                <p style="margin: 0.25rem 0 0 0; color: #475569; white-space: pre-wrap;">${data.notes}</p>
            </div>
            ` : ''}

            <!-- Footer Section -->
            <div style="margin-top: 3.5rem; display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 1rem;">
                <div style="font-size: 0.85rem; color: #64748b;">
                    <p style="margin:0 0 4px 0;"><strong>للتواصل:</strong></p>
                    <p style="margin:0;">01010103777</p>
                    <p style="margin:0;">01010606016</p>
                </div>
                <div style="display: flex; gap: 3rem; justify-content: flex-end;">
                    <div style="text-align: center;">
                        <p style="margin:0; font-weight:bold;">توقيع المهندس</p>
                        <div style="margin-top: 2rem; border-bottom: 1px solid #94a3b8; width: 140px; display: inline-block;"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ─── Pending Bill Editor ─────────────────────────────────────────────────────
function loadPendingBill(id) {
    editingPendingId = id;
    const bill = db.getPendingBillById(id);
    if (!bill) { alert('Pending bill not found'); return; }
    
    const cust = db.getCustomers().find(c => c.id === bill.customer_id);
    if (cust) selectCustomer(cust.id, cust.name, cust.phone);
    
    if (bill.car_id) {
        setTimeout(() => {
            const sel = document.getElementById('carSelect');
            if (sel) {
                sel.value = bill.car_id;
                updateCarFieldsFromSelect();
            }
        }, 100);
    }
    
    document.getElementById('discountInput').value = bill.discount;
    document.getElementById('notes').value = bill.notes || '';
    document.getElementById('odometer').value = bill.odometer || '';
    document.getElementById('paymentMethodSelect').value = bill.payment_method;
    if (bill.payment_method === 'PayByParts') {
        document.getElementById('payByPartsSection').style.display = 'block';
        document.getElementById('amountPaidInput').value = bill.paid_amount || 0;
    }
    
    let items = [];
    try { items = JSON.parse(bill.line_items_json); } catch(e){}
    
    const tbody = document.getElementById('lineItemsBody');
    tbody.innerHTML = '';
    
    items.forEach(item => {
        const tr = document.createElement('tr');
        if (item.part_id) tr.dataset.partId = item.part_id;
        tr.innerHTML = `
            <td><input type="text" class="form-control item-desc" value="${item.description}"></td>
            <td><input type="number" class="form-control qty-input" value="${item.qty}" min="1" step="0.5"></td>
            <td><input type="number" class="form-control price-input" value="${item.unit_price}" min="0" step="0.01"></td>
            <td class="font-bold text-teal line-subtotal">${(item.subtotal || item.qty * item.unit_price).toFixed(2)}</td>
            <td><button class="btn btn-danger btn-sm remove-item-btn">×</button></td>
        `;
        tbody.appendChild(tr);
        bindRowEvents(tr);
    });
    
    if (items.length === 0) document.getElementById('addItemBtn').click();
    setTimeout(calculateTotal, 200);
}

// Export for other pages if needed
window.generateOldSystemReceiptHTML = generateOldSystemReceiptHTML;
