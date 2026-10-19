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
            populateSupplierSelect();
            loadReport();
        });
    }

    const fromDateInput = document.getElementById('fromDate');
    const toDateInput = document.getElementById('toDate');
    const supplierSelect = document.getElementById('supplierSelect');
    const applyFilterBtn = document.getElementById('applyFilterBtn');
    const printReportBtn = document.getElementById('printReportBtn');
    const presetBtns = document.querySelectorAll('.preset-btn');

    // Default to 'thisWeek'
    setPresetRange('thisWeek');
    populateSupplierSelect();
    loadReport();

    // Event Listeners for Preset Buttons
    presetBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            presetBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const preset = btn.dataset.preset;
            setPresetRange(preset);
            loadReport();
        });
    });

    if (applyFilterBtn) {
        applyFilterBtn.addEventListener('click', () => {
            presetBtns.forEach(b => b.classList.remove('active'));
            loadReport();
        });
    }

    if (supplierSelect) {
        supplierSelect.addEventListener('change', () => {
            loadReport();
        });
    }

    if (printReportBtn) {
        printReportBtn.addEventListener('click', () => {
            if (typeof window.showPrintPreview === 'function') {
                window.showPrintPreview(preparePrintArea);
            } else {
                preparePrintArea();
                window.print();
            }
        });
    }

    function formatDateStr(date) {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    function setPresetRange(preset) {
        const today = new Date();
        if (preset === 'thisWeek') {
            // Monday of current week to today/Sunday
            const currentDay = today.getDay(); // 0 is Sun, 1 is Mon...
            const distanceToMon = (currentDay + 6) % 7;
            const monday = new Date(today);
            monday.setDate(today.getDate() - distanceToMon);
            fromDateInput.value = formatDateStr(monday);
            toDateInput.value = formatDateStr(today);
        } else if (preset === 'lastWeek') {
            const currentDay = today.getDay();
            const distanceToMon = (currentDay + 6) % 7;
            const lastMon = new Date(today);
            lastMon.setDate(today.getDate() - distanceToMon - 7);
            const lastSun = new Date(lastMon);
            lastSun.setDate(lastMon.getDate() + 6);
            fromDateInput.value = formatDateStr(lastMon);
            toDateInput.value = formatDateStr(lastSun);
        } else if (preset === 'thisMonth') {
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            fromDateInput.value = formatDateStr(firstDay);
            toDateInput.value = formatDateStr(today);
        } else if (preset === 'allTime') {
            fromDateInput.value = '';
            toDateInput.value = '';
        }
    }

    function populateSupplierSelect() {
        if (!supplierSelect || !db) return;
        const currentVal = supplierSelect.value || 'all';
        supplierSelect.innerHTML = '';
        
        const lang = getCurrentLanguage();
        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = lang === 'ar' ? 'جميع الموردين' : 'All Suppliers';
        supplierSelect.appendChild(allOption);

        const suppliers = db.getSuppliers();
        suppliers.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = s.name;
            supplierSelect.appendChild(opt);
        });

        supplierSelect.value = currentVal;
    }

    function loadReport() {
        if (!db) return;

        const fromDate = fromDateInput.value;
        const toDate = toDateInput.value;
        const selectedSupplierId = supplierSelect ? supplierSelect.value : 'all';

        const reportData = db.getSupplierReportData ? db.getSupplierReportData(fromDate, toDate) : { suppliers: db.getSuppliers(), transactions: [] };
        
        let suppliers = reportData.suppliers || [];
        let transactions = reportData.transactions || [];

        // Filter by supplier if specific one selected
        if (selectedSupplierId !== 'all') {
            const supIdNum = parseInt(selectedSupplierId);
            suppliers = suppliers.filter(s => s.id === supIdNum);
            transactions = transactions.filter(t => t.supplier_id === supIdNum);
        }

        // Compute paid & purchases per supplier in period
        const paidMap = {};
        const purchasedMap = {};
        const paidSuppliersSet = new Set();

        transactions.forEach(tx => {
            const supId = tx.supplier_id;
            if (tx.type === 'payment') {
                paidMap[supId] = (paidMap[supId] || 0) + tx.amount;
                if (tx.amount > 0) paidSuppliersSet.add(supId);
            } else if (tx.type === 'purchase') {
                purchasedMap[supId] = (purchasedMap[supId] || 0) + tx.amount;
            }
        });

        let totalPaidInPeriod = 0;
        let totalPurchasedInPeriod = 0;
        let totalRemainingOwed = 0;

        suppliers.forEach(s => {
            totalRemainingOwed += (s.pending_amount || 0);
        });

        transactions.forEach(tx => {
            if (tx.type === 'payment') totalPaidInPeriod += tx.amount;
            if (tx.type === 'purchase') totalPurchasedInPeriod += tx.amount;
        });

        // Update Summary Chips
        document.getElementById('sumTotalPaid').textContent = `$${totalPaidInPeriod.toFixed(2)}`;
        document.getElementById('sumTotalPurchased').textContent = `$${totalPurchasedInPeriod.toFixed(2)}`;
        document.getElementById('sumTotalRemaining').textContent = `$${totalRemainingOwed.toFixed(2)}`;
        document.getElementById('sumPaidCount').textContent = paidSuppliersSet.size;

        // Render Section 1: Suppliers Summary Table
        const summaryBody = document.getElementById('suppliersSummaryBody');
        summaryBody.innerHTML = '';

        if (suppliers.length === 0) {
            const lang = getCurrentLanguage();
            summaryBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#94a3b8; padding:2rem;">${lang === 'ar' ? 'لا يوجد موردين' : 'No suppliers found'}</td></tr>`;
        } else {
            suppliers.forEach(s => {
                const tr = document.createElement('tr');
                const paidPeriod = paidMap[s.id] || 0;
                const purchasedPeriod = purchasedMap[s.id] || 0;
                const pending = s.pending_amount || 0;

                const hasPending = pending > 0;
                const badgeHtml = hasPending
                    ? `<span class="badge" style="background:#fee2e2; color:#ef4444; border:1px solid #ef4444; padding:0.2rem 0.6rem; border-radius:12px; font-size:0.75rem;">⚠ $${pending.toFixed(2)}</span>`
                    : `<span class="badge" style="background:#dcfce7; color:#10b981; border:1px solid #10b981; padding:0.2rem 0.6rem; border-radius:12px; font-size:0.75rem;">✓ Settled</span>`;

                tr.innerHTML = `
                    <td class="font-bold" style="color:#0d9488;">${s.name}</td>
                    <td>${s.contact_number || '-'}</td>
                    <td>${s.supplies_what || '-'}</td>
                    <td style="color:#10b981; font-weight:700;">$${paidPeriod.toFixed(2)}</td>
                    <td style="color:#38bdf8; font-weight:600;">$${purchasedPeriod.toFixed(2)}</td>
                    <td style="color:${hasPending ? '#ef4444' : '#10b981'}; font-weight:700;">$${pending.toFixed(2)}</td>
                    <td>${badgeHtml}</td>
                `;
                summaryBody.appendChild(tr);
            });
        }

        // Render Section 2: Detailed Payment Log Table
        const paymentLogBody = document.getElementById('paymentLogBody');
        paymentLogBody.innerHTML = '';

        const paymentTxs = transactions.filter(t => t.type === 'payment');

        if (paymentTxs.length === 0) {
            const lang = getCurrentLanguage();
            paymentLogBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:2rem;">${lang === 'ar' ? 'لا توجد دفعات مسجلة للموردين خلال هذه الفترة' : 'No supplier payments recorded in this period'}</td></tr>`;
        } else {
            paymentTxs.forEach(tx => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="font-family:monospace; color:#64748b;">${tx.date || '-'}</td>
                    <td class="font-bold" style="color:#0f172a;">${tx.supplier_name || 'Supplier #' + tx.supplier_id}</td>
                    <td style="color:#10b981; font-weight:700;">$${parseFloat(tx.amount || 0).toFixed(2)}</td>
                    <td style="color:#0f172a; font-weight:600;">$${parseFloat(tx.balance_after || 0).toFixed(2)}</td>
                    <td style="color:#64748b; font-size:0.85rem;">${tx.note || '-'}</td>
                `;
                paymentLogBody.appendChild(tr);
            });
        }
    }

    function preparePrintArea() {
        const printArea = document.getElementById('printArea');
        if (!printArea) return;

        const lang = getCurrentLanguage();
        const fromDate = fromDateInput.value || (lang === 'ar' ? 'البداية' : 'Start');
        const toDate = toDateInput.value || (lang === 'ar' ? 'النهاية' : 'End');

        const totalPaid = document.getElementById('sumTotalPaid').textContent;
        const totalPurchased = document.getElementById('sumTotalPurchased').textContent;
        const totalRemaining = document.getElementById('sumTotalRemaining').textContent;
        const paidCount = document.getElementById('sumPaidCount').textContent;

        const summaryRows = document.getElementById('suppliersSummaryBody').innerHTML;
        const logRows = document.getElementById('paymentLogBody').innerHTML;

        printArea.innerHTML = `
            <div style="font-family: Arial, sans-serif; direction: ${lang === 'ar' ? 'rtl' : 'ltr'}; padding: 1.5rem; color: #1e293b;">
                <!-- Header -->
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0d9488; padding-bottom: 1rem; margin-bottom: 1.5rem;">
                    <div>
                        <h1 style="margin: 0; font-size: 1.6rem; color: #0f172a;">${lang === 'ar' ? 'مركز الأنصاري لصيانة السيارات' : 'El Ansary Service Center'}</h1>
                        <h3 style="margin: 0.25rem 0 0 0; color: #0d9488; font-size: 1.1rem;">${lang === 'ar' ? 'تقرير مدفوعات الموردين الأسبوعي / الدوري' : 'Supplier Payment Report'}</h3>
                    </div>
                    <div style="text-align: ${lang === 'ar' ? 'left' : 'right'}; font-size: 0.85rem; color: #64748b;">
                        <div><strong>${lang === 'ar' ? 'الفترة:' : 'Period:'}</strong> ${fromDate} &nbsp;&rarr;&nbsp; ${toDate}</div>
                        <div><strong>${lang === 'ar' ? 'تاريخ الطباعة:' : 'Printed On:'}</strong> ${new Date().toLocaleDateString()}</div>
                    </div>
                </div>

                <!-- KPI Cards -->
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
                    <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 0.75rem; text-align: center; background: #f8fafc;">
                        <div style="font-size: 0.75rem; color: #64748b; font-weight: bold; text-transform: uppercase;">${lang === 'ar' ? 'إجمالي المدفوع' : 'Total Paid'}</div>
                        <div style="font-size: 1.25rem; font-weight: bold; color: #16a34a; margin-top: 0.25rem;">${totalPaid}</div>
                    </div>
                    <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 0.75rem; text-align: center; background: #f8fafc;">
                        <div style="font-size: 0.75rem; color: #64748b; font-weight: bold; text-transform: uppercase;">${lang === 'ar' ? 'إجمالي المشتريات بالآجل' : 'Added Purchases'}</div>
                        <div style="font-size: 1.25rem; font-weight: bold; color: #0284c7; margin-top: 0.25rem;">${totalPurchased}</div>
                    </div>
                    <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 0.75rem; text-align: center; background: #fef2f2;">
                        <div style="font-size: 0.75rem; color: #991b1b; font-weight: bold; text-transform: uppercase;">${lang === 'ar' ? 'المتبقي للموردين' : 'Remaining Owed'}</div>
                        <div style="font-size: 1.25rem; font-weight: bold; color: #dc2626; margin-top: 0.25rem;">${totalRemaining}</div>
                    </div>
                    <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 0.75rem; text-align: center; background: #f8fafc;">
                        <div style="font-size: 0.75rem; color: #64748b; font-weight: bold; text-transform: uppercase;">${lang === 'ar' ? 'عدد الموردين المدفوع لهم' : 'Suppliers Paid'}</div>
                        <div style="font-size: 1.25rem; font-weight: bold; color: #7c3aed; margin-top: 0.25rem;">${paidCount}</div>
                    </div>
                </div>

                <!-- Section 1 Table -->
                <h4 style="margin: 0 0 0.5rem 0; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 0.4rem;">
                    ${lang === 'ar' ? '📋 ملخص الموردين' : '📋 Suppliers Summary'}
                </h4>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; font-size: 0.85rem;">
                    <thead>
                        <tr style="background: #f1f5f9; text-align: ${lang === 'ar' ? 'right' : 'left'}; border-bottom: 2px solid #cbd5e1;">
                            <th style="padding: 0.5rem;">${lang === 'ar' ? 'اسم المورد' : 'Supplier Name'}</th>
                            <th style="padding: 0.5rem;">${lang === 'ar' ? 'رقم الاتصال' : 'Contact'}</th>
                            <th style="padding: 0.5rem;">${lang === 'ar' ? 'البضائع' : 'Supplies'}</th>
                            <th style="padding: 0.5rem;">${lang === 'ar' ? 'المدفوع في الفترة' : 'Amount Paid'}</th>
                            <th style="padding: 0.5rem;">${lang === 'ar' ? 'مشتريات الفترة' : 'Added Purchases'}</th>
                            <th style="padding: 0.5rem;">${lang === 'ar' ? 'المتبقي سداده' : 'Remaining Owed'}</th>
                            <th style="padding: 0.5rem;">${lang === 'ar' ? 'الحالة' : 'Status'}</th>
                        </tr>
                    </thead>
                    <tbody style="color:#0f172a;">
                        ${summaryRows}
                    </tbody>
                </table>

                <!-- Section 2 Table -->
                <h4 style="margin: 0 0 0.5rem 0; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 0.4rem;">
                    ${lang === 'ar' ? '💸 سجل الدفعات التفصيلي' : '💸 Detailed Payments Log'}
                </h4>
                <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                    <thead>
                        <tr style="background: #f1f5f9; text-align: ${lang === 'ar' ? 'right' : 'left'}; border-bottom: 2px solid #cbd5e1;">
                            <th style="padding: 0.5rem;">${lang === 'ar' ? 'التاريخ' : 'Date'}</th>
                            <th style="padding: 0.5rem;">${lang === 'ar' ? 'اسم المورد' : 'Supplier Name'}</th>
                            <th style="padding: 0.5rem;">${lang === 'ar' ? 'المبلغ المدفوع' : 'Amount Paid'}</th>
                            <th style="padding: 0.5rem;">${lang === 'ar' ? 'الرصيد بعد الدفعة' : 'Balance After'}</th>
                            <th style="padding: 0.5rem;">${lang === 'ar' ? 'الملاحظات' : 'Notes'}</th>
                        </tr>
                    </thead>
                    <tbody style="color:#0f172a;">
                        ${logRows}
                    </tbody>
                </table>
            </div>
        `;
    }
});
