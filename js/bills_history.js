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
            const paymentText = bill.payment_method;

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
            <div style="border-bottom: 2px solid #eee; padding-bottom: 1rem; margin-bottom: 1rem;">
                <div style="display: flex; justify-content: space-between;">
                    <div>
                        <p><strong>${t.customer}:</strong> ${bill.customer_name}</p>
                    </div>
                    <div style="text-align: right;">
                        <p><strong>${t.date}:</strong> ${bill.date}</p>
                        <p><strong>${t.payment}:</strong> ${bill.payment_method}</p>
                    </div>
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
            <div style="text-align: right; margin-top: 1.5rem; font-size: 1.25rem; font-weight: 700; color: #eab308;">
                ${t.total}: $${parseFloat(bill.total_amount).toFixed(2)}
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
