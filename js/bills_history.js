let db;
try {
    db = require('../database/db.js');
} catch (e) {
    console.error('Failed to load database:', e);
    alert('Database Error: Could not connect to the database.');
}

document.addEventListener('DOMContentLoaded', () => {
    // Initialize i18n
    translatePage();

    // Elements
    const langToggle = document.getElementById('langToggle');
    const historyTableBody = document.getElementById('historyTableBody');
    const filterDateInput = document.getElementById('filterDate');
    const searchInput = document.getElementById('searchInput');
    const billModal = document.getElementById('billModal');
    const billDetailContent = document.getElementById('billDetailContent');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const printBillBtn = document.getElementById('printBillBtn');

    let allBills = [];

    // Set default date to today
    const now = new Date();
    const today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    filterDateInput.value = today;

    // Language Toggle
    langToggle.addEventListener('click', () => {
        const newLang = getCurrentLanguage() === 'en' ? 'ar' : 'en';
        setLanguage(newLang);
    });

    // Database Fetch
    async function loadBills() {
        allBills = db.getRepairs();
        applyFilters();
    }

    function renderBills(data) {
        historyTableBody.innerHTML = '';
        data.forEach(bill => {
            const tr = document.createElement('tr');
            tr.className = 'clickable-row';
            const badgeClass = bill.payment_method.toLowerCase() === 'cash' ? 'badge-cash' : 'badge-card';
            const paymentText = window.getTranslatedPaymentMethod(bill.payment_method);

            tr.innerHTML = `
                <td>${bill.date}</td>
                <td>${bill.customer_name}</td>
                <td><span class="badge ${badgeClass}">${paymentText}</span></td>
                <td class="font-bold">$${parseFloat(bill.total_amount).toFixed(2)}</td>
            `;
            tr.onclick = () => showBillDetails(bill);
            historyTableBody.appendChild(tr);
        });
    }

    async function showBillDetails(bill) {
        const lang = getCurrentLanguage();
        const t = translations[lang];

        // Fetch items from DB
        const items = db.getRepairItems(bill.id);

        billDetailContent.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #eee; padding-bottom: 1rem; margin-bottom: 1rem; direction: ltr;">
                <div style="flex: 1; text-align: left; font-weight: bold; color: #475569; font-size: 0.85rem; line-height: 1.6; padding-top: 10px; direction: rtl;">
                    سمكرة - دهان - عفشة - دوكو<br>
                    ميكانيكة - كهرباء - تكيف
                </div>
                <div style="flex: 1; text-align: center;">
                    <img src="../assets/logo.png" style="max-height: 140px; max-width: 100%; object-fit: contain;" alt="El Ansary" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
                    <h1 style="display:none; color: #eab308; margin:0;">${t.appName}</h1>
                </div>
                <div style="flex: 1; text-align: right; font-weight: bold; color: #475569; font-size: 1.1rem; padding-top: 10px; direction: rtl;">
                    مركز صيانة متكامل
                </div>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
                <div>
                    <p><strong>${t.customer}:</strong> ${bill.customer_name}</p>
                    <p><strong>${t.phone}:</strong> ${bill.customer_phone || '-'}</p>
                    <p><strong>${t.carModel}:</strong> ${bill.car_name || '-'}</p>
                    <p><strong>${t.plateNumber || 'Plate'}:</strong> ${bill.plate_number || '-'}</p>
                </div>
                <div style="text-align: right;">
                    <p><strong>${t.date}:</strong> ${bill.date}</p>
                    <p><strong>${t.payment}:</strong> ${window.getTranslatedPaymentMethod(bill.payment_method)}</p>
                    ${bill.odometer ? `<p><strong>${t.odometer}:</strong> ${bill.odometer}</p>` : ''}
                </div>
            </div>
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: #f8fafc; border-bottom: 1px solid #eee;">
                        <th style="padding: 0.5rem; text-align: left;">${t.serviceName}</th>
                        <th style="padding: 0.5rem; text-align: center;">${t.qty}</th>
                        <th style="padding: 0.5rem; text-align: right;">${t.price}</th>
                        <th style="padding: 0.5rem; text-align: right;">${t.subtotal}</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(item => `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 0.5rem;">${item.item_name}</td>
                            <td style="padding: 0.5rem; text-align: center;">${item.quantity}</td>
                            <td style="padding: 0.5rem; text-align: right;">$${parseFloat(item.unit_price).toFixed(2)}</td>
                            <td style="padding: 0.5rem; text-align: right;">$${(item.quantity * item.unit_price).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div style="margin-top: 1rem; width: 300px; margin-left: auto; margin-right: 0;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 1.1rem;">
                    <span>${t.total}:</span>
                    <span>$${parseFloat(bill.total_amount).toFixed(2)}</span>
                </div>
                ${bill.discount > 0 ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 1.1rem; color: #ef4444;">
                    <span>${t.discount || 'Discount'}:</span>
                    <span>-$${parseFloat(bill.discount).toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 1.2rem; font-weight: bold; color: #10b981; border-top: 1px solid #eee; padding-top: 0.5rem;">
                    <span>${t.netTotal || 'Net Total'}:</span>
                    <span>$${(bill.total_amount - bill.discount).toFixed(2)}</span>
                </div>
                ` : ''}
                
                ${bill.payment_method === 'PayByParts' || bill.pending_amount > 0 ? `
                <div style="display: flex; justify-content: space-between; margin-top: 0.5rem; font-size: 1.1rem; color: #3b82f6;">
                    <span>${t.amountPaidNow || 'Amount Paid'}:</span>
                    <span>$${parseFloat(bill.paid_amount || 0).toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 0.5rem; font-size: 1.1rem; color: #ef4444;">
                    <span>${t.pendingAmount || 'Pending'}:</span>
                    <span>$${parseFloat(bill.pending_amount || 0).toFixed(2)}</span>
                </div>
                ` : ''}
            </div>

            ${bill.notes ? `
            <div style="margin-top: 1.5rem; padding: 1rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
                <p style="margin: 0; font-weight: 700; color: #1e293b;">${t.notes}:</p>
                <p style="margin: 0.5rem 0 0 0; color: #475569; white-space: pre-wrap;">${bill.notes}</p>
            </div>
            ` : ''}

            <!-- Footer Section -->
            <div style="margin-top: 4rem; display: flex; justify-content: space-between; border-top: 1px solid #eee; padding-top: 1rem;">
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
            billDetailContent.style.direction = 'rtl';
            billDetailContent.querySelectorAll('th').forEach(th => th.style.textAlign = 'right');
        } else {
            billDetailContent.style.direction = 'ltr';
        }

        billModal.classList.add('active');
    }

    function applyFilters() {
        const filterDate = filterDateInput.value;
        const searchTerm = searchInput.value.toLowerCase();

        const filtered = allBills.filter(bill => {
            const matchesDate = !filterDate || bill.date === filterDate;
            const matchesSearch = bill.customer_name.toLowerCase().includes(searchTerm);
            return matchesDate && matchesSearch;
        });

        renderBills(filtered);
    }

    [filterDateInput, searchInput].forEach(input => {
        input.addEventListener('input', applyFilters);
    });

    closeModalBtn.addEventListener('click', () => billModal.classList.remove('active'));
    printBillBtn.addEventListener('click', () => window.print());

    // Initialize
    loadBills();
});
