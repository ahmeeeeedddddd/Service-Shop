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

    // Elements
    const fromDate     = document.getElementById('fromDate');
    const toDate       = document.getElementById('toDate');
    const quickRange   = document.getElementById('quickRange');
    const searchInput  = document.getElementById('searchCustomer');
    const applyBtn     = document.getElementById('applyFilterBtn');
    const printBtn     = document.getElementById('printReportBtn');
    const reportBody   = document.getElementById('reportBody');

    // Summary elements
    const sumCount    = document.getElementById('sumCount');
    const sumTotal    = document.getElementById('sumTotal');
    const sumCash     = document.getElementById('sumCash');
    const sumInstapay = document.getElementById('sumInstapay');
    const sumBankA    = document.getElementById('sumBankA');
    const sumBankM    = document.getElementById('sumBankM');
    const sumVodafone = document.getElementById('sumVodafone');

    // Payment method tag selection
    const methodTags = document.querySelectorAll('.method-tag');
    let selectedMethods = new Set(['all', 'Cash', 'Instapay', 'Bank Alahly', 'Bank Masr', 'Vodafone Cash', 'SplitPayment', 'PayByParts']);

    methodTags.forEach(tag => {
        tag.addEventListener('click', () => {
            const m = tag.dataset.method;
            if (m === 'all') {
                // Toggle all on/off
                const allActive = [...methodTags].every(t => t.classList.contains('active'));
                if (allActive) {
                    selectedMethods.clear();
                    methodTags.forEach(t => t.classList.remove('active'));
                } else {
                    methodTags.forEach(t => {
                        t.classList.add('active');
                        selectedMethods.add(t.dataset.method);
                    });
                }
            } else {
                if (selectedMethods.has(m)) {
                    selectedMethods.delete(m);
                    tag.classList.remove('active');
                    // deactivate "all" tag
                    const allTag = document.querySelector('.method-tag[data-method="all"]');
                    if (allTag) allTag.classList.remove('active');
                    selectedMethods.delete('all');
                } else {
                    selectedMethods.add(m);
                    tag.classList.add('active');
                }
            }
        });
    });

    // Quick range presets
    quickRange.addEventListener('change', () => {
        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        const fmt = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
        const today = fmt(now);

        if (quickRange.value === 'today') {
            fromDate.value = today;
            toDate.value   = today;
        } else if (quickRange.value === 'week') {
            const day = now.getDay();
            const start = new Date(now); start.setDate(now.getDate() - day);
            const end   = new Date(now); end.setDate(now.getDate() + (6 - day));
            fromDate.value = fmt(start);
            toDate.value   = fmt(end);
        } else if (quickRange.value === 'month') {
            fromDate.value = `${now.getFullYear()}-${pad(now.getMonth()+1)}-01`;
            toDate.value   = today;
        } else if (quickRange.value === 'all') {
            fromDate.value = '';
            toDate.value   = '';
        }
    });

    function getPaymentBadgeClass(method) {
        if (!method || method === 'Deleted') return 'badge-Deleted';
        if (method === 'Cash') return 'badge-Cash';
        if (method === 'Instapay') return 'badge-Instapay';
        if (method === 'Bank Alahly' || method === 'Bank Masr') return 'badge-Bank';
        if (method === 'Vodafone Cash') return 'badge-Vodafone';
        if (method === 'SplitPayment') return 'badge-Split';
        if (method === 'PayByParts') return 'badge-PayByParts';
        return 'badge-Cash';
    }

    function getPaymentLabel(method) {
        if (!method) return '-';
        if (method === 'SplitPayment') return 'Split';
        if (method === 'PayByParts') return 'Pay By Parts';
        return method;
    }

    function applyFilters() {
        const from   = fromDate.value;
        const to     = toDate.value;
        const search = searchInput.value.trim().toLowerCase();

        let repairs = db.getRepairs();

        // Filter by date range
        if (from) repairs = repairs.filter(r => r.date >= from);
        if (to)   repairs = repairs.filter(r => r.date <= to);

        // Filter by payment method
        if (!selectedMethods.has('all') || selectedMethods.size === 0) {
            repairs = repairs.filter(r => {
                const m = r.payment_method || '';
                return selectedMethods.has(m);
            });
        }

        // Filter by customer search
        if (search) {
            repairs = repairs.filter(r =>
                (r.customer_name || '').toLowerCase().includes(search)
            );
        }

        // Compute summaries
        let totIncome = 0, totCash = 0, totInstapay = 0, totBankA = 0, totBankM = 0, totVodafone = 0;
        repairs.forEach(r => {
            const paid = parseFloat(r.paid_amount) || 0;
            totIncome += paid;
            const m = r.payment_method || '';
            if (m === 'Cash')           totCash     += paid;
            if (m === 'Instapay')       totInstapay += paid;
            if (m === 'Bank Alahly')    totBankA    += paid;
            if (m === 'Bank Masr')      totBankM    += paid;
            if (m === 'Vodafone Cash')  totVodafone += paid;
        });

        sumCount.textContent    = repairs.length;
        sumTotal.textContent    = totIncome.toFixed(2);
        sumCash.textContent     = totCash.toFixed(2);
        sumInstapay.textContent = totInstapay.toFixed(2);
        sumBankA.textContent    = totBankA.toFixed(2);
        sumBankM.textContent    = totBankM.toFixed(2);
        sumVodafone.textContent = totVodafone.toFixed(2);

        if (repairs.length === 0) {
            reportBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 3rem; color: #64748b;">No records found</td></tr>';
            return;
        }

        const isDeleted = r => r.payment_method === 'Deleted';

        reportBody.innerHTML = repairs.map(r => {
            const deleted = isDeleted(r);
            const paid    = parseFloat(r.paid_amount) || 0;
            const pending = parseFloat(r.pending_amount) || 0;
            const total   = parseFloat(r.total_amount) || 0;
            const discount = parseFloat(r.discount) || 0;
            const net     = Math.max(0, total - discount);

            return `
            <tr style="${deleted ? 'opacity:0.55;' : ''}">
                <td style="color: #94a3b8; font-size: 0.82rem;">${r.date}</td>
                <td>
                    <span class="font-bold" style="color: ${deleted ? '#94a3b8' : '#0d9488'};">${r.customer_name}</span>
                    ${r.plate_number ? `<br><span style="font-size:0.75rem; color:#475569;">${r.plate_number}</span>` : ''}
                </td>
                <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:0.82rem; color:#94a3b8;" title="${r.description || ''}">
                    ${deleted ? '<span style="color:#ef4444; font-weight:600;">🗑 Deleted Bill</span>' : (r.description || '-')}
                </td>
                <td>
                    <span class="badge-sm ${getPaymentBadgeClass(r.payment_method)}">
                        ${deleted ? 'Deleted' : getPaymentLabel(r.payment_method)}
                    </span>
                </td>
                <td style="text-align:right; font-weight:700; color:${deleted ? '#64748b' : '#22c55e'};">${paid.toFixed(2)}</td>
                <td style="text-align:right; color:${pending > 0 ? '#ef4444' : '#64748b'};">${pending.toFixed(2)}</td>
                <td style="text-align:right; font-weight:700; color:${deleted ? '#64748b' : '#e2e8f0'};">${net.toFixed(2)}</td>
            </tr>`;
        }).join('');
    }

    applyBtn.addEventListener('click', applyFilters);
    searchInput.addEventListener('input', applyFilters);

    // Print
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            const rows = db.getRepairs();
            const from   = fromDate.value;
            const to     = toDate.value;
            const search = searchInput.value.trim().toLowerCase();

            let repairs = rows;
            if (from) repairs = repairs.filter(r => r.date >= from);
            if (to)   repairs = repairs.filter(r => r.date <= to);
            if (!selectedMethods.has('all') || selectedMethods.size === 0) {
                repairs = repairs.filter(r => selectedMethods.has(r.payment_method || ''));
            }
            if (search) {
                repairs = repairs.filter(r => (r.customer_name || '').toLowerCase().includes(search));
            }

            const dateRange = (from || to) ? `${from || '—'} → ${to || '—'}` : 'All Dates';

            let totIncome = 0, totCash = 0, totInstapay = 0, totBankA = 0, totBankM = 0, totVodafone = 0;
            repairs.forEach(r => {
                const paid = parseFloat(r.paid_amount) || 0;
                totIncome += paid;
                const m = r.payment_method || '';
                if (m === 'Cash') totCash += paid;
                if (m === 'Instapay') totInstapay += paid;
                if (m === 'Bank Alahly') totBankA += paid;
                if (m === 'Bank Masr') totBankM += paid;
                if (m === 'Vodafone Cash') totVodafone += paid;
            });

            const container = document.getElementById('printContainer');
            container.innerHTML = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 900px; margin: 0 auto;">
                <div style="text-align: center; border-bottom: 2px solid #eee; padding-bottom: 1rem; margin-bottom: 1.5rem;">
                    <img src="../assets/logo.png" style="max-height: 80px; max-width: 100%; object-fit: contain;" alt="El Ansary" onerror="this.style.display='none'">
                    <h2 style="margin: 0.5rem 0 0.25rem; color: #0d9488;">Income Report / تقرير الدخل</h2>
                    <p style="color: #64748b; margin: 0; font-size: 0.9rem;">
                        ${dateRange} &nbsp;|&nbsp; Printed: ${new Date().toLocaleDateString()}
                    </p>
                </div>

                <!-- Summary boxes -->
                <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1.5rem;">
                    <div style="flex:1; min-width: 110px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.75rem; text-align: center;">
                        <div style="font-size: 0.7rem; color: #94a3b8; font-weight: 700; text-transform: uppercase;">Records</div>
                        <div style="font-size: 1.4rem; font-weight: 800; color: #0d9488;">${repairs.length}</div>
                    </div>
                    <div style="flex:1; min-width: 110px; border: 2px solid #0d9488; border-radius: 8px; padding: 0.75rem; text-align: center; background: #f0fdfa;">
                        <div style="font-size: 0.7rem; color: #0d9488; font-weight: 700; text-transform: uppercase;">Total Income</div>
                        <div style="font-size: 1.4rem; font-weight: 800; color: #0d9488;">${totIncome.toFixed(2)}</div>
                    </div>
                    <div style="flex:1; min-width: 110px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.75rem; text-align: center;">
                        <div style="font-size: 0.7rem; color: #94a3b8; font-weight: 700; text-transform: uppercase;">Cash</div>
                        <div style="font-size: 1.1rem; font-weight: 700; color: #16a34a;">${totCash.toFixed(2)}</div>
                    </div>
                    <div style="flex:1; min-width: 110px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.75rem; text-align: center;">
                        <div style="font-size: 0.7rem; color: #94a3b8; font-weight: 700; text-transform: uppercase;">Instapay</div>
                        <div style="font-size: 1.1rem; font-weight: 700; color: #ea580c;">${totInstapay.toFixed(2)}</div>
                    </div>
                    <div style="flex:1; min-width: 110px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.75rem; text-align: center;">
                        <div style="font-size: 0.7rem; color: #94a3b8; font-weight: 700; text-transform: uppercase;">Bank Alahly</div>
                        <div style="font-size: 1.1rem; font-weight: 700; color: #1d4ed8;">${totBankA.toFixed(2)}</div>
                    </div>
                    <div style="flex:1; min-width: 110px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.75rem; text-align: center;">
                        <div style="font-size: 0.7rem; color: #94a3b8; font-weight: 700; text-transform: uppercase;">Bank Masr</div>
                        <div style="font-size: 1.1rem; font-weight: 700; color: #1d4ed8;">${totBankM.toFixed(2)}</div>
                    </div>
                    <div style="flex:1; min-width: 110px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.75rem; text-align: center;">
                        <div style="font-size: 0.7rem; color: #94a3b8; font-weight: 700; text-transform: uppercase;">Vodafone Cash</div>
                        <div style="font-size: 1.1rem; font-weight: 700; color: #dc2626;">${totVodafone.toFixed(2)}</div>
                    </div>
                </div>

                <!-- Table -->
                <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                    <thead>
                        <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                            <th style="padding: 0.6rem 0.75rem; text-align: left; font-weight: 700; color: #475569;">#</th>
                            <th style="padding: 0.6rem 0.75rem; text-align: left; font-weight: 700; color: #475569;">Date</th>
                            <th style="padding: 0.6rem 0.75rem; text-align: left; font-weight: 700; color: #475569;">Customer</th>
                            <th style="padding: 0.6rem 0.75rem; text-align: left; font-weight: 700; color: #475569;">Car</th>
                            <th style="padding: 0.6rem 0.75rem; text-align: left; font-weight: 700; color: #475569;">Payment</th>
                            <th style="padding: 0.6rem 0.75rem; text-align: right; font-weight: 700; color: #475569;">Paid</th>
                            <th style="padding: 0.6rem 0.75rem; text-align: right; font-weight: 700; color: #475569;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${repairs.map((r, i) => {
                            const deleted = r.payment_method === 'Deleted';
                            const paid  = parseFloat(r.paid_amount) || 0;
                            const total = Math.max(0, (parseFloat(r.total_amount) || 0) - (parseFloat(r.discount) || 0));
                            return `<tr style="border-bottom: 1px solid #f1f5f9; ${deleted ? 'opacity:0.5;' : ''}">
                                <td style="padding: 0.5rem 0.75rem; color: #94a3b8;">${i+1}</td>
                                <td style="padding: 0.5rem 0.75rem; color: #475569;">${r.date}</td>
                                <td style="padding: 0.5rem 0.75rem; font-weight: 600;">${r.customer_name}</td>
                                <td style="padding: 0.5rem 0.75rem; color: #475569;">${r.car_name || '-'}</td>
                                <td style="padding: 0.5rem 0.75rem;">${deleted ? '🗑 Deleted' : (r.payment_method || '-')}</td>
                                <td style="padding: 0.5rem 0.75rem; text-align: right; font-weight: 700; color: ${deleted ? '#94a3b8' : '#16a34a'};">${paid.toFixed(2)}</td>
                                <td style="padding: 0.5rem 0.75rem; text-align: right; font-weight: 700;">${total.toFixed(2)}</td>
                            </tr>`;
                        }).join('')}
                        <tr style="border-top: 2px solid #0d9488; background: #f0fdfa;">
                            <td colspan="5" style="padding: 0.75rem; font-weight: 700; color: #0d9488;">TOTAL / الإجمالي</td>
                            <td style="padding: 0.75rem; text-align: right; font-weight: 800; font-size: 1.1rem; color: #0d9488;">${totIncome.toFixed(2)}</td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>
            </div>`;

            window.print();
        });
    }

    // Set default date range to current month
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    fromDate.value = `${now.getFullYear()}-${pad(now.getMonth()+1)}-01`;
    toDate.value   = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;

    // Auto-apply on load
    applyFilters();
});
