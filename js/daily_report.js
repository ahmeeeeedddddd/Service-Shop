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
    const filterDateInput = document.getElementById('filterDate');
    const displayDate = document.getElementById('displayDate');
    const printReportBtn = document.getElementById('printReportBtn');
    const previewModal = document.getElementById('previewModal');
    const previewArea = document.getElementById('previewArea');
    const closePreviewBtn = document.getElementById('closePreviewBtn');
    const confirmPrintReportBtn = document.getElementById('confirmPrintReportBtn');

    const dayIncomeEl = document.getElementById('dayIncome');
    const dayExpensesEl = document.getElementById('dayExpenses');
    const dayNetEl = document.getElementById('dayNet');

    const dayCashEl = document.getElementById('dayCash');
    const dayInstapayEl = document.getElementById('dayInstapay');
    const dayAlahlyEl = document.getElementById('dayAlahly');
    const dayMasrEl = document.getElementById('dayMasr');

    const reportIncomeBody = document.getElementById('reportIncomeBody');
    const reportExpensesBody = document.getElementById('reportExpensesBody');

    // Set default date to today
    const now = new Date();
    const today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    filterDateInput.value = today;
    displayDate.textContent = today;

    // Language Toggle
    langToggle.addEventListener('click', () => {
        const newLang = getCurrentLanguage() === 'en' ? 'ar' : 'en';
        setLanguage(newLang);
    });

    // Load Data
    async function updateReport() {
        const date = filterDateInput.value;
        if (!date) return;
        displayDate.textContent = date;

        const income = db.getRepairsByDate(date);
        const expenses = db.getExpensesByDate(date);

        renderReport(income, expenses);
    }

    function renderReport(income, expenses) {
        const getPaid = (inv) => (inv.paid_amount !== null && inv.paid_amount !== undefined) ? inv.paid_amount : (inv.total_amount - (inv.discount || 0));

        const totalIncome = income.reduce((sum, i) => sum + getPaid(i), 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
        const net = totalIncome - totalExpenses;

        dayIncomeEl.textContent = `$${totalIncome.toFixed(2)}`;
        dayExpensesEl.textContent = `$${totalExpenses.toFixed(2)}`;
        dayNetEl.textContent = `$${net.toFixed(2)}`;
        dayNetEl.style.color = net >= 0 ? '#0d9488' : '#ef4444';

        // Income Breakdown
        let cash = 0;
        let instapay = 0;
        let alahly = 0;
        let masr = 0;

        const groupedIncome = {};
        income.forEach(i => {
            const pm = i.payment_method || 'Cash';
            const actualPaid = getPaid(i);

            if (pm === 'Cash') cash += actualPaid;
            else if (pm === 'Instapay') instapay += actualPaid;
            else if (pm === 'Bank Alahly') alahly += actualPaid;
            else if (pm === 'Bank Masr') masr += actualPaid;
            // Handle PayByParts if they paid something with it initially, usually it goes to Cash. We'll default to Cash for now if not matching banks.
            else if (pm === 'PayByParts') cash += actualPaid;

            if(!groupedIncome[pm]) groupedIncome[pm] = [];
            groupedIncome[pm].push(i);
        });

        if (dayCashEl) dayCashEl.textContent = `$${cash.toFixed(2)}`;
        
        // Calculate Cash Expenses
        const cashExpenses = expenses.reduce((sum, e) => {
            return (e.from_cash === 1 || e.from_cash === undefined) ? sum + e.amount : sum;
        }, 0);
        
        const dayTotalCashEl = document.getElementById('dayTotalCash');
        if (dayTotalCashEl) dayTotalCashEl.textContent = `$${(cash - cashExpenses).toFixed(2)}`;

        if (dayInstapayEl) dayInstapayEl.textContent = `$${instapay.toFixed(2)}`;
        if (dayAlahlyEl) dayAlahlyEl.textContent = `$${alahly.toFixed(2)}`;
        if (dayMasrEl) dayMasrEl.textContent = `$${masr.toFixed(2)}`;

        let incomeHtml = '';
        if (Object.keys(groupedIncome).length === 0) {
            incomeHtml = '<tr><td colspan="4" style="text-align:center; color:#94a3b8;">No records</td></tr>';
        } else {
            for (const [pm, items] of Object.entries(groupedIncome)) {
                const methodTotal = items.reduce((sum, i) => sum + getPaid(i), 0);
                
                // Add a header row for the payment method
                incomeHtml += `
                    <tr style="background: #f1f5f9;">
                        <td colspan="3" class="font-bold" style="color: #334155;">${window.getTranslatedPaymentMethod(pm)} (Total)</td>
                        <td class="font-bold" style="color: #0d9488;">$${methodTotal.toFixed(2)}</td>
                    </tr>
                `;
                
                // Add detail rows
                items.forEach(i => {
                    const actualPaid = getPaid(i);
                    incomeHtml += `
                        <tr>
                            <td style="padding-left: 20px;">${i.customer_name}</td>
                            <td>${i.car_name || '-'}</td>
                            <td>${window.getTranslatedPaymentMethod(i.payment_method)}</td>
                            <td>$${actualPaid.toFixed(2)}</td>
                        </tr>
                    `;
                });
            }
        }
        reportIncomeBody.innerHTML = incomeHtml;

        // Expenses Breakdown
        reportExpensesBody.innerHTML = expenses.map(e => `
            <tr>
                <td>${e.description}</td>
                <td class="font-bold">$${e.amount.toFixed(2)}</td>
            </tr>
        `).join('') || '<tr><td colspan="2" style="text-align:center; color:#94a3b8;">No records</td></tr>';
    }

    filterDateInput.addEventListener('input', updateReport);
    
    printReportBtn.addEventListener('click', () => {
        const printContainer = document.getElementById('printContainer');
        printContainer.innerHTML = document.getElementById('reportArea').innerHTML;
        printContainer.style.direction = getCurrentLanguage() === 'ar' ? 'rtl' : 'ltr';
        window.print();
    });

    // Initialize
    updateReport();
});
