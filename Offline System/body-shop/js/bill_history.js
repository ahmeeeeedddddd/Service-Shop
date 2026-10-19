let db;
try { db = require('../database/db.js'); }
catch (e) { console.error('DB load error:', e); alert('Database Error: ' + e.message); }

let currentModalBill = null;

document.addEventListener('DOMContentLoaded', () => {
    translatePage();
    
    // Default filter: Today only
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('bhFrom').value = today;
    document.getElementById('bhTo').value = today;
    
    loadBillHistory();
    
    document.getElementById('bhApply').onclick = loadBillHistory;
    document.getElementById('bhToday').onclick = () => {
        const t = new Date().toISOString().split('T')[0];
        document.getElementById('bhFrom').value = t;
        document.getElementById('bhTo').value = t;
        loadBillHistory();
    };
    document.getElementById('bhClear').onclick = () => {
        document.getElementById('bhSearch').value = '';
        document.getElementById('bhFrom').value = '';
        document.getElementById('bhTo').value = '';
        document.getElementById('bhType').value = 'all';
        loadBillHistory();
    };
    document.getElementById('bhSearch').addEventListener('input', loadBillHistory);
    document.getElementById('bhType').addEventListener('change', loadBillHistory);
    document.getElementById('printHistoryBtn').onclick = printBillHistoryTable;
    document.getElementById('closeBhDetailBtn').onclick = () => document.getElementById('bhDetailModal').classList.remove('active');
    document.getElementById('printBhDetailBtn').onclick = printBillDetail;
});

function loadBillHistory() {
    const search = document.getElementById('bhSearch').value.trim().toLowerCase();
    const fromDate = document.getElementById('bhFrom').value;
    const toDate = document.getElementById('bhTo').value;
    const typeFilter = document.getElementById('bhType').value;
    
    const repairs = db.getRepairs().map(r => ({
        id: r.id,
        source: 'confirmed',
        date: r.date || '',
        customer_name: r.customer_name || '—',
        customer_phone: r.customer_phone || '',
        car_name: r.car_name || '—',
        description: r.description || '',
        total_amount: r.total_amount || 0,
        paid_amount: r.paid_amount || 0,
        pending_amount: r.pending_amount || 0,
        payment_method: r.payment_method || '',
        is_deleted: r.payment_method === 'Deleted',
        raw: r
    }));
    
    const pending = db.getPendingBills().map(pb => ({
        id: pb.id,
        source: 'pending',
        date: pb.date_created || '',
        customer_name: pb.customer_name || '—',
        customer_phone: pb.customer_phone || '',
        car_name: pb.car_name || '—',
        description: pb.description || '',
        total_amount: pb.total_amount || 0,
        paid_amount: pb.paid_amount || 0,
        pending_amount: pb.pending_amount || 0,
        payment_method: pb.payment_method || 'Pending',
        is_deleted: false,
        raw: pb
    }));
    
    let allBills = [];
    if (typeFilter === 'confirmed') allBills = repairs;
    else if (typeFilter === 'pending') allBills = pending;
    else allBills = [...repairs, ...pending];
    
    // Filter
    if (fromDate) allBills = allBills.filter(b => b.date >= fromDate);
    if (toDate) allBills = allBills.filter(b => b.date <= toDate);
    if (search) {
        allBills = allBills.filter(b => 
            b.customer_name.toLowerCase().includes(search) ||
            b.customer_phone.toLowerCase().includes(search) ||
            b.car_name.toLowerCase().includes(search) ||
            b.description.toLowerCase().includes(search)
        );
    }
    
    // Sort by date DESC
    allBills.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
    
    // Update Stats
    let totalRev = 0;
    let confirmedCount = 0;
    let pendingCount = 0;
    
    allBills.forEach(b => {
        if (!b.is_deleted) {
            totalRev += b.paid_amount || b.total_amount;
        }
        if (b.source === 'confirmed' && !b.is_deleted) confirmedCount++;
        if (b.source === 'pending') pendingCount++;
    });
    
    document.getElementById('statTotal').textContent = allBills.length;
    document.getElementById('statConfirmed').textContent = confirmedCount;
    document.getElementById('statPending').textContent = pendingCount;
    document.getElementById('statRevenue').textContent = totalRev.toFixed(2) + ' EGP';
    
    // Render Table
    const tbody = document.getElementById('bhTableBody');
    tbody.innerHTML = '';
    
    allBills.forEach(b => {
        const tr = document.createElement('tr');
        if (b.source === 'pending') tr.className = 'row-pending';
        
        let statusBadge = `<span class="badge-confirmed">${t('confirmed') || 'مؤكدة'}</span>`;
        if (b.is_deleted) statusBadge = `<span class="badge-deleted">${t('deleted') || 'ملغاة'}</span>`;
        else if (b.source === 'pending') statusBadge = `<span class="badge-pending">${t('pendingBills') || 'معلقة'}</span>`;
        
        tr.innerHTML = `
            <td>${b.date}</td>
            <td class="font-bold">${b.customer_name} ${b.customer_phone ? `<span style="font-size:0.8rem;color:#64748b;font-weight:normal;">(${b.customer_phone})</span>` : ''}</td>
            <td>${b.car_name}</td>
            <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${b.description || '—'}</td>
            <td class="font-bold text-teal">${(b.total_amount || 0).toFixed(2)}</td>
            <td>${getPaymentBadge(b.payment_method)}</td>
            <td>${statusBadge}</td>
            <td class="no-print">
                <button class="btn btn-outline btn-sm" onclick="viewBillDetail('${b.source}', ${b.id})">👁️ ${t('viewBreakdown') || 'عرض'}</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    if (allBills.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#64748b;">${t('noData') || 'لا توجد بيانات'}</td></tr>`;
    }
}

function getPaymentBadge(method) {
    if (!method) return '—';
    if (method === 'Cash') return `<span class="badge badge-cash">${t('cash') || 'كاش'}</span>`;
    if (method === 'PayByParts') return `<span class="badge badge-card">${t('payByParts') || 'أجزاء'}</span>`;
    if (method === 'Deleted') return `<span class="badge badge-deleted">${t('deleted') || 'ملغاة'}</span>`;
    return `<span class="badge badge-card">${getTranslatedPaymentMethod(method)}</span>`;
}

window.viewBillDetail = function(source, id) {
    let bill, items = [];
    if (source === 'confirmed') {
        bill = db.getRepairById(id);
        items = db.getRepairItems(id);
    } else {
        bill = db.getPendingBillById(id);
        if (bill && bill.line_items_json) {
            try { items = JSON.parse(bill.line_items_json); } catch(e){}
        }
    }
    
    if (!bill) return;
    currentModalBill = { bill, items, source };
    
    let itemsHtml = '';
    items.forEach((item, idx) => {
        const qty = item.quantity || item.qty || 1;
        const price = item.unit_price || item.price || 0;
        const total = qty * price;
        itemsHtml += `
            <tr>
                <td>${idx + 1}</td>
                <td>${item.item_name || item.name || '—'}</td>
                <td>${qty}</td>
                <td>${price.toFixed(2)}</td>
                <td>${total.toFixed(2)}</td>
            </tr>
        `;
    });
    
    document.getElementById('bhDetailContent').innerHTML = `
        <h3 style="color:#0d9488;margin-bottom:8px;">تفاصيل الفاتورة</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:15px;background:#f8fafc;padding:12px;border-radius:6px;font-size:0.9rem;">
            <div><strong>تاريخ:</strong> ${bill.date || bill.date_created || ''}</div>
            <div><strong>العميل:</strong> ${bill.customer_name || '—'} ${bill.customer_phone ? '(' + bill.customer_phone + ')' : ''}</div>
            <div><strong>السيارة:</strong> ${bill.car_name || '—'}</div>
            <div><strong>طريقة الدفع:</strong> ${getPaymentBadge(bill.payment_method)}</div>
        </div>
        ${items.length > 0 ? `
            <table class="table" style="width:100%;margin-bottom:15px;">
                <thead><tr><th>#</th><th>الصنف/الخدمة</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead>
                <tbody>${itemsHtml}</tbody>
            </table>
        ` : ''}
        <div style="text-align:left;font-size:1.1rem;font-weight:bold;color:#0d9488;">
            الإجمالي: ${(bill.total_amount || 0).toFixed(2)} ج.م
        </div>
    `;
    
    document.getElementById('bhDetailModal').classList.add('active');
};

function printBillDetail() {
    if (!currentModalBill) return;
    const content = document.getElementById('bhDetailContent').innerHTML;
    document.getElementById('printArea').innerHTML = `
        <div style="font-family:Arial,sans-serif;direction:rtl;padding:20px;">
            <h2 style="text-align:center;color:#0d9488;">الأنصاري لإصلاح الهياكل</h2>
            ${content}
        </div>
    `;
    window.print();
}

function printBillHistoryTable() {
    const tbodyHtml = document.getElementById('bhTableBody').innerHTML;
    document.getElementById('printArea').innerHTML = `
        <div style="font-family:Arial,sans-serif;direction:rtl;padding:10px;">
            <h2 style="text-align:center;color:#0d9488;">سجل الفواتير — الأنصاري</h2>
            <table style="width:100%;border-collapse:collapse;margin-top:15px;font-size:0.85rem;">
                <thead>
                    <tr style="background:#0d9488;color:#fff;">
                        <th style="padding:6px;border:1px solid #ccc;">التاريخ</th>
                        <th style="padding:6px;border:1px solid #ccc;">العميل</th>
                        <th style="padding:6px;border:1px solid #ccc;">السيارة</th>
                        <th style="padding:6px;border:1px solid #ccc;">الوصف</th>
                        <th style="padding:6px;border:1px solid #ccc;">المبلغ</th>
                        <th style="padding:6px;border:1px solid #ccc;">الدفع</th>
                        <th style="padding:6px;border:1px solid #ccc;">الحالة</th>
                    </tr>
                </thead>
                <tbody>${tbodyHtml}</tbody>
            </table>
        </div>
    `;
    window.print();
}
