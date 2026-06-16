// bills_history.js
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

    let allBills = []; // To be filled from DB

    // Language Toggle
    langToggle.addEventListener('click', () => {
        const newLang = getCurrentLanguage() === 'en' ? 'ar' : 'en';
        setLanguage(newLang);
    });

    // Mock Database Fetch
    async function loadBills() {
        // Mock data with items
        allBills = [
            { 
                id: 1, date: '2026-06-16', customer: 'Ahmed Mahmoud', payment: 'Cash', amount: 195.00,
                carModel: 'Toyota Camry', odometer: '55000', notes: 'Oil change',
                items: [
                    { name: 'Engine Oil', qty: 1, price: 150, total: 150 },
                    { name: 'Oil Filter', qty: 1, price: 45, total: 45 }
                ]
            },
            { 
                id: 2, date: '2026-06-16', customer: 'Sara Allen', payment: 'ATM / Card', amount: 380.00,
                carModel: 'Honda Civic', odometer: '22000', notes: 'Brake check',
                items: [
                    { name: 'Brake Pads', qty: 1, price: 300, total: 300 },
                    { name: 'Labor', qty: 1, price: 80, total: 80 }
                ]
            }
        ];

        applyFilters();
    }

    function renderBills(data) {
        historyTableBody.innerHTML = '';
        data.forEach(bill => {
            const tr = document.createElement('tr');
            tr.className = 'clickable-row';
            const badgeClass = bill.payment === 'Cash' ? 'badge-cash' : 'badge-card';
            const lang = getCurrentLanguage();
            const t = translations[lang];
            const paymentText = bill.payment === 'Cash' ? t.cash : t.card;

            tr.innerHTML = `
                <td>${bill.date}</td>
                <td>${bill.customer}</td>
                <td><span class="badge ${badgeClass}">${paymentText}</span></td>
                <td class="font-bold">$${bill.amount.toFixed(2)}</td>
            `;
            tr.onclick = () => showBillDetails(bill);
            historyTableBody.appendChild(tr);
        });
    }

    function showBillDetails(bill) {
        const lang = getCurrentLanguage();
        const t = translations[lang];

        billDetailContent.innerHTML = `
            <div style="border-bottom: 2px solid #eee; padding-bottom: 1rem; margin-bottom: 1rem;">
                <div style="display: flex; justify-content: space-between;">
                    <div>
                        <p><strong>${t.customer}:</strong> ${bill.customer}</p>
                        <p><strong>${t.carModel}:</strong> ${bill.carModel}</p>
                        <p><strong>${t.odometer}:</strong> ${bill.odometer}</p>
                    </div>
                    <div style="text-align: right;">
                        <p><strong>${t.date}:</strong> ${bill.date}</p>
                        <p><strong>${t.payment}:</strong> ${bill.payment}</p>
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
                    ${bill.items.map(item => `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 0.5rem;">${item.name}</td>
                            <td style="padding: 0.5rem; text-align: center;">${item.qty}</td>
                            <td style="padding: 0.5rem; text-align: right;">$${item.price.toFixed(2)}</td>
                            <td style="padding: 0.5rem; text-align: right;">$${item.total.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div style="text-align: right; margin-top: 1.5rem; font-size: 1.25rem; font-weight: 700; color: #0d9488;">
                ${t.total}: $${bill.amount.toFixed(2)}
            </div>
            <div style="margin-top: 1rem; color: #64748b; font-size: 0.9rem;">
                <strong>${t.notes}:</strong> ${bill.notes || '---'}
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
            const matchesSearch = bill.customer.toLowerCase().includes(searchTerm);
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
