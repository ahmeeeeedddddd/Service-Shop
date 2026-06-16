// income.js
document.addEventListener('DOMContentLoaded', () => {
    // Initialize i18n
    translatePage();

    // Elements
    const langToggle = document.getElementById('langToggle');
    const incomeTableBody = document.getElementById('incomeTableBody');
    const totalIncomeEl = document.getElementById('totalIncome');
    const invoiceCountEl = document.getElementById('invoiceCount');
    const cashIncomeEl = document.getElementById('cashIncome');
    const cardIncomeEl = document.getElementById('cardIncome');
    
    const searchInput = document.getElementById('searchInput');
    const filterDateInput = document.getElementById('filterDate');
    const paymentFilter = document.getElementById('paymentFilter');
    const resetFiltersBtn = document.getElementById('resetFilters');

    let allInvoices = []; // To be filled from DB

    // Language Toggle
    langToggle.addEventListener('click', () => {
        const newLang = getCurrentLanguage() === 'en' ? 'ar' : 'en';
        setLanguage(newLang);
    });

    // Mock Database Fetch
    async function loadInvoices() {
        // Mock data
        allInvoices = [
            { id: 1, date: '2026-06-13', customer: 'Ahmed Mahmoud', payment: 'Cash', amount: 195.00 },
            { id: 2, date: '2026-06-08', customer: 'Sara Allen', payment: 'ATM / Card', amount: 380.00 },
            { id: 3, date: '2026-06-15', customer: 'Ahmed Mahmoud', payment: 'Cash', amount: 50.00 },
            { id: 4, date: '2026-05-20', customer: 'John Doe', payment: 'ATM / Card', amount: 1200.00 }
        ];

        renderInvoices(allInvoices);
        updateStats(allInvoices);
    }

    function renderInvoices(data) {
        incomeTableBody.innerHTML = '';
        data.forEach(inv => {
            const tr = document.createElement('tr');
            const badgeClass = inv.payment === 'Cash' ? 'badge-cash' : 'badge-card';
            const lang = getCurrentLanguage();
            const t = translations[lang];
            const paymentText = inv.payment === 'Cash' ? t.cash : t.card;

            tr.innerHTML = `
                <td>${inv.date}</td>
                <td>${inv.customer}</td>
                <td><span class="badge ${badgeClass}">${paymentText}</span></td>
                <td class="font-bold">$${inv.amount.toFixed(2)}</td>
            `;
            incomeTableBody.appendChild(tr);
        });
    }

    function updateStats(data) {
        const total = data.reduce((sum, inv) => sum + inv.amount, 0);
        const cash = data.filter(inv => inv.payment === 'Cash').reduce((sum, inv) => sum + inv.amount, 0);
        const card = data.filter(inv => inv.payment === 'ATM / Card').reduce((sum, inv) => sum + inv.amount, 0);

        totalIncomeEl.textContent = `$${total.toFixed(2)}`;
        invoiceCountEl.textContent = data.length;
        cashIncomeEl.textContent = `$${cash.toFixed(2)}`;
        cardIncomeEl.textContent = `$${card.toFixed(2)}`;
    }

    // Filter Logic
    function applyFilters() {
        const searchTerm = searchInput.value.toLowerCase();
        const filterDate = filterDateInput.value;
        const payment = paymentFilter.value;

        const filtered = allInvoices.filter(inv => {
            const matchesSearch = inv.customer.toLowerCase().includes(searchTerm);
            const matchesPayment = payment === 'all' || inv.payment === payment;
            const matchesDate = !filterDate || inv.date === filterDate;
            
            return matchesSearch && matchesPayment && matchesDate;
        });

        renderInvoices(filtered);
        updateStats(filtered);
    }

    [searchInput, filterDateInput, paymentFilter].forEach(input => {
        input.addEventListener('input', applyFilters);
    });

    resetFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        filterDateInput.value = '';
        paymentFilter.value = 'all';
        renderInvoices(allInvoices);
        updateStats(allInvoices);
    });

    // Initialize
    loadInvoices();
});
