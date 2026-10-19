let db;
try { db = require('../database/db.js'); }
catch (e) { console.error('DB load error:', e); alert('Database Error: ' + e.message); }

let currentBills = [];

document.addEventListener('DOMContentLoaded', () => {
    translatePage();
    
    // Default filter to current month
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    
    document.getElementById('filterDateFrom').value = firstDay;
    document.getElementById('filterDateTo').value = lastDay;
    
    loadIncome();
    
    document.getElementById('applyFilterBtn').onclick = loadIncome;
    document.getElementById('clearFilterBtn').onclick = () => {
        document.getElementById('filterDateFrom').value = '';
        document.getElementById('filterDateTo').value = '';
        document.getElementById('searchCustomerIncome').value = '';
        loadIncome();
    };
    
    document.getElementById('searchCustomerIncome').addEventListener('input', () => {
        const term = document.getElementById('searchCustomerIncome').value.toLowerCase();
        const rows = document.querySelectorAll('#incomeTableBody tr');
        rows.forEach(row => {
            const txt = row.textContent.toLowerCase();
            row.style.display = txt.includes(term) ? '' : 'none';
        });
    });
    
    document.getElementById('closeBillDetailBtn').onclick = () => document.getElementById('billDetailModal').classList.remove('active');
    document.getElementById('printIncomeBtn').onclick = printIncomeList;
});

function loadIncome() {
    const fromDate = document.getElementById('filterDateFrom').value;
    const toDate = document.getElementById('filterDateTo').value;
    
    let bills = db.getRepairs();
    
    if (fromDate) bills = bills.filter(b => b.date >= fromDate);
    if (toDate) bills = bills.filter(b => b.date <= toDate);
    
    currentBills = bills;
    
    const tbody = document.getElementById('incomeTableBody');
    tbody.innerHTML = '';
    
    let totalIncome = 0;
    let cashIncome = 0;
    let totalPending = 0;
    
    bills.forEach(bill => {
        const isDeleted = bill.payment_method === 'Deleted';
        const cust = db.getCustomers().find(c => c.id === bill.customer_id);
        const car = bill.car_id ? db.getCarById(bill.car_id) : null;
        const items = db.getRepairItems(bill.id);
        const desc = items.map(i => i.item_name).join(', ') || bill.description || '—';
        
        if (!isDeleted) {
            totalIncome += bill.total_amount;
            if (bill.payment_method === 'Cash') cashIncome += bill.paid_amount || bill.total_amount;
            if (bill.payment_method === 'PayByParts') {
                cashIncome += (bill.paid_amount || 0);
                totalPending += (bill.pending_amount || (bill.total_amount - (bill.paid_amount || 0)));
            }
        }
        
        const tr = document.createElement('tr');
        if (isDeleted) tr.style.opacity = '0.6';
        
        tr.innerHTML = `
            <td>${bill.date}</td>
            <td class="font-bold">${cust ? cust.name : bill.customer_name || '—'}</td>
            <td>${car ? (car.car_name || '—') : (bill.car_name || '—')}</td>
            <td style="max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${desc}">${isDeleted ? `<span class="badge badge-deleted">${t('deletedBill')}</span>` : desc}</td>
            <td class="${isDeleted ? 'text-red' : 'font-bold text-teal'}">${(bill.total_amount || 0).toFixed(2)}</td>
            <td>${getPaymentBadge(bill.payment_method)}</td>
            <td class="no-print">
                <button class="btn btn-outline btn-sm" onclick="viewBillDetails(${bill.id})">${t('view')}</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    if (bills.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#64748b;">${t('noData')}</td></tr>`;
    }
    
    document.getElementById('statThisMonth').textContent = totalIncome.toFixed(2);
    document.getElementById('statInvoices').textContent = bills.filter(b => b.payment_method !== 'Deleted').length;
    document.getElementById('statCash').textContent = cashIncome.toFixed(2);
    document.getElementById('statPending').textContent = totalPending.toFixed(2);
}

window.viewBillDetails = function(id) {
    const bill = db.getRepairById(id);
    if (!bill) return;
    
    const items = db.getRepairItems(id);
    const isDeleted = bill.payment_method === 'Deleted';
    
    let html = `
        <h3 class="card-title text-teal mb-4">تفاصيل الخدمة ${isDeleted ? `<span class="badge badge-deleted ml-2">${t('deletedBill')}</span>` : ''}</h3>
        <div class="stat-grid" style="grid-template-columns:1fr 1fr; margin-bottom:1rem;">
            <div><strong style="color:#64748b;font-size:0.8rem;display:block;">${t('date')}</strong>${bill.date}</div>
            <div><strong style="color:#64748b;font-size:0.8rem;display:block;">${t('paymentMethod')}</strong>${getPaymentBadge(bill.payment_method)}</div>
            <div><strong style="color:#64748b;font-size:0.8rem;display:block;">${t('customer')}</strong>${bill.customer_name || '—'} ${bill.customer_phone ? '(' + bill.customer_phone + ')' : ''}</div>
            <div><strong style="color:#64748b;font-size:0.8rem;display:block;">${t('car')}</strong>${(bill.car_name || '') + (bill.plate_number ? ' | ' + bill.plate_number : '') || '—'}</div>
        </div>
        ${bill.odometer ? `<div class="mb-4"><strong style="color:#64748b;font-size:0.8rem;display:block;">${t('odometer')}</strong>${bill.odometer}</div>` : ''}
        ${bill.notes ? `<div class="mb-4"><strong style="color:#64748b;font-size:0.8rem;display:block;">${t('notes')}</strong>${bill.notes}</div>` : ''}
        
        <table style="width:100%;margin-bottom:1rem;border-collapse:collapse;">
            <thead><tr style="background:#fef08a;border-bottom:2px solid #ca8a04;color:#713f12;"><th style="padding:8px;text-align:right;">الخدمة / البند</th><th style="padding:8px;text-align:center;">الكمية</th><th style="padding:8px;text-align:center;">السعر</th><th style="padding:8px;text-align:center;">الإجمالي</th></tr></thead>
            <tbody>
                ${items.map(i => `<tr><td style="padding:8px;border-bottom:1px solid #f1f5f9;">${i.item_name}</td><td style="padding:8px;text-align:center;border-bottom:1px solid #f1f5f9;">${i.quantity}</td><td style="padding:8px;text-align:center;border-bottom:1px solid #f1f5f9;">${i.unit_price.toFixed(2)}</td><td style="padding:8px;text-align:center;border-bottom:1px solid #f1f5f9;font-weight:bold;">${(i.quantity * i.unit_price).toFixed(2)}</td></tr>`).join('')}
            </tbody>
        </table>
        
        <div style="background:#f8fafc;padding:1rem;border-radius:8px;font-size:0.95rem;">
            <div class="flex justify-between mb-2"><span>${t('subtotal')}:</span><span>${(bill.total_amount + bill.discount).toFixed(2)} EGP</span></div>
            <div class="flex justify-between mb-2"><span>${t('discount')}:</span><span>${bill.discount.toFixed(2)} EGP</span></div>
            <div class="flex justify-between font-bold" style="border-top:1px solid #e2e8f0;padding-top:0.5rem;"><span>${t('netTotal')}:</span><span class="text-teal">${bill.total_amount.toFixed(2)} EGP</span></div>
            ${bill.payment_method === 'PayByParts' ? `
                <div class="flex justify-between mt-2"><span>المدفوع:</span><span>${(bill.paid_amount || 0).toFixed(2)} EGP</span></div>
                <div class="flex justify-between text-red font-bold"><span>المتبقي:</span><span>${(bill.pending_amount || 0).toFixed(2)} EGP</span></div>
            ` : ''}
        </div>
    `;
    
    document.getElementById('billDetailContent').innerHTML = html;
    
    const delBtn = document.getElementById('deleteBillBtn');
    if (isDeleted) {
        delBtn.style.display = 'none';
    } else {
        delBtn.style.display = 'block';
        delBtn.onclick = () => {
            if (!confirm('Delete this bill?')) return;
            db.markRepairAsDeleted(id);
            document.getElementById('billDetailModal').classList.remove('active');
            loadIncome();
        };
    }
    
    // Bind Print button inside modal
    const printBtn = document.getElementById('printBillDetailBtn');
    if (printBtn) {
        printBtn.onclick = () => {
            const formattedReceipt = generateOldSystemReceiptHTML({
                date: bill.date,
                customerName: bill.customer_name,
                customerPhone: bill.customer_phone,
                carModel: bill.car_name,
                plateNumber: bill.plate_number,
                odometer: bill.odometer,
                paymentMethod: bill.payment_method,
                items: items.map(i => ({ description: i.item_name, qty: i.quantity, unit_price: i.unit_price, subtotal: i.quantity * i.unit_price })),
                total: bill.total_amount + bill.discount,
                discount: bill.discount,
                netTotal: bill.total_amount,
                paidNow: bill.paid_amount || bill.total_amount,
                notes: bill.notes
            });
            
            document.getElementById('printArea').innerHTML = formattedReceipt;
            window.print();
        };
    }
    
    document.getElementById('billDetailModal').classList.add('active');
};

function printIncomeList() {
    const fromDate = document.getElementById('filterDateFrom').value;
    const toDate = document.getElementById('filterDateTo').value;
    const titleDate = (fromDate || toDate) ? `(${fromDate || '*'} ➝ ${toDate || '*'})` : t('allTime');
    
    const rows = currentBills.map(b => {
        const isDel = b.payment_method === 'Deleted';
        return `
            <tr>
                <td style="border:1px solid #ddd;padding:8px;">${b.date}</td>
                <td style="border:1px solid #ddd;padding:8px;font-weight:bold;">${b.customer_name || ''}</td>
                <td style="border:1px solid #ddd;padding:8px;">${(b.car_name || '') + (b.plate_number ? ' | ' + b.plate_number : '')}</td>
                <td style="border:1px solid #ddd;padding:8px;">${isDel ? 'محذوف' : getTranslatedPaymentMethod(b.payment_method)}</td>
                <td style="border:1px solid #ddd;padding:8px;text-align:center;font-weight:bold;">${b.total_amount.toFixed(2)}</td>
            </tr>
        `;
    }).join('');
    
    const total = currentBills.filter(b => b.payment_method !== 'Deleted').reduce((s, b) => s + b.total_amount, 0);
    
    document.getElementById('printArea').innerHTML = `
        <div style="font-family:'Cairo',Arial,sans-serif;direction:rtl;color:#000;padding:20px;">
            <div style="text-align:center;border-bottom:2px solid #eab308;padding-bottom:10px;margin-bottom:15px;">
                <h1 style="margin:0;font-size:24px;">الأنصاري لإصلاح الهياكل</h1>
                <h3 style="margin:5px 0;color:#0d9488;">كشف الدخل بالفواتير المؤكدة</h3>
                <p style="margin:0;font-weight:bold;">تاريخ الفترة: ${titleDate}</p>
            </div>
            
            <table style="width:100%;border-collapse:collapse;margin-top:16px;">
                <thead>
                    <tr style="background:#fef08a;border-bottom:2px solid #ca8a04;color:#713f12;">
                        <th style="border:1px solid #ddd;padding:8px;">التاريخ</th>
                        <th style="border:1px solid #ddd;padding:8px;">العميل</th>
                        <th style="border:1px solid #ddd;padding:8px;">السيارة</th>
                        <th style="border:1px solid #ddd;padding:8px;">طريقة الدفع</th>
                        <th style="border:1px solid #ddd;padding:8px;">المبلغ</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
                <tfoot>
                    <tr style="background:#0d9488;color:white;">
                        <td colspan="4" style="border:1px solid #ddd;padding:10px;font-weight:bold;text-align:right;font-size:1.1rem;">إجمالي الدخل للفترة</td>
                        <td style="border:1px solid #ddd;padding:10px;font-weight:bold;text-align:center;font-size:1.1rem;">${total.toFixed(2)} ج.م</td>
                    </tr>
                </tfoot>
            </table>
            
            <div style="margin-top:3rem;display:flex;justify-content:space-between;border-top:1px solid #ddd;padding-top:1rem;">
                <div style="font-size:0.85rem;color:#64748b;">
                    <p style="margin:0 0 4px 0;"><strong>للتواصل:</strong></p>
                    <p style="margin:0;">01010103777</p>
                    <p style="margin:0;">01010606016</p>
                </div>
            </div>
        </div>
    `;
    window.print();
}

function generateOldSystemReceiptHTML(data) {
    return `
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

function getPaymentBadge(method) {
    if (!method) return '—';
    if (method === 'Deleted') return `<span class="badge badge-deleted">${t('deletedBill')}</span>`;
    if (method === 'Cash') return `<span class="badge badge-cash">${t('cash')}</span>`;
    return `<span class="badge badge-card">${getTranslatedPaymentMethod(method)}</span>`;
}
