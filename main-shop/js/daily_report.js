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
    const filterStartDateInput = document.getElementById('filterStartDate');
    const filterEndDateInput = document.getElementById('filterEndDate');
    const displayDate = document.getElementById('displayDate');
    const printReportBtn = document.getElementById('printReportBtn');

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
    if (filterStartDateInput) filterStartDateInput.value = today;
    if (filterEndDateInput) filterEndDateInput.value = today;
    if (displayDate) displayDate.textContent = today;

    // Language Toggle
    langToggle.addEventListener('click', () => {
        const newLang = getCurrentLanguage() === 'en' ? 'ar' : 'en';
        setLanguage(newLang);
    });

    // Load Data
    async function updateReport() {
        const startDate = filterStartDateInput ? filterStartDateInput.value : '';
        const endDate = filterEndDateInput ? filterEndDateInput.value : '';

        let dateRangeStr = 'All Time';
        if (startDate && endDate && startDate === endDate) dateRangeStr = startDate;
        else if (startDate && endDate) dateRangeStr = startDate + ' to ' + endDate;
        else if (startDate) dateRangeStr = 'From ' + startDate;
        else if (endDate) dateRangeStr = 'Until ' + endDate;

        if (displayDate) displayDate.textContent = dateRangeStr;

        const allRepairs = db.getRepairs ? db.getRepairs() : [];
        const allExpenses = db.getExpenses ? db.getExpenses() : [];

        const income = allRepairs.filter(r => {
            let match = true;
            if (startDate && r.date < startDate) match = false;
            if (endDate && r.date > endDate) match = false;
            return match;
        });

        const expenses = allExpenses.filter(e => {
            let match = true;
            if (startDate && e.date < startDate) match = false;
            if (endDate && e.date > endDate) match = false;
            return match;
        });

        renderReport(income, expenses);
    }

    function renderReport(income, expenses) {
        const getPaid = (inv) => (inv.paid_amount !== null && inv.paid_amount !== undefined) ? inv.paid_amount : (inv.total_amount - (inv.discount || 0));

        // Exclude deleted bills from totals
        const activeIncome = income.filter(i => i.payment_method !== 'Deleted');

        const totalIncome = activeIncome.reduce((sum, i) => sum + getPaid(i), 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
        const net = totalIncome - totalExpenses;

        if (dayIncomeEl) dayIncomeEl.textContent = `${totalIncome.toFixed(2)}`;
        if (dayExpensesEl) dayExpensesEl.textContent = `${totalExpenses.toFixed(2)}`;
        if (dayNetEl) {
            dayNetEl.textContent = `${net.toFixed(2)}`;
            dayNetEl.style.color = net >= 0 ? '#0d9488' : '#ef4444';
        }

        // Payment Method Breakdown (active only)
        let cash = 0, instapay = 0, alahly = 0, masr = 0, vodafoneCash = 0;

        const addAmountToMethod = (method, amount) => {
            if (method === 'Cash' || method === 'PayByParts') cash += amount;
            else if (method === 'Instapay') instapay += amount;
            else if (method === 'Bank Alahly') alahly += amount;
            else if (method === 'Bank Masr') masr += amount;
            else if (method === 'Vodafone Cash') vodafoneCash += amount;
        };

        // Group ALL income (including deleted) for the table display
        const groupedIncome = {};
        income.forEach(i => {
            const pm = i.payment_method || 'Cash';
            const actualPaid = getPaid(i);

            if (pm !== 'Deleted') {
                if (pm === 'SplitPayment' && i.notes && i.notes.includes('__SPLIT__:')) {
                    try {
                        const splitStr = i.notes.split('__SPLIT__:')[1];
                        const splitData = JSON.parse(splitStr);
                        addAmountToMethod(splitData.method1, parseFloat(splitData.amount1) || 0);
                        addAmountToMethod(splitData.method2, parseFloat(splitData.amount2) || 0);
                    } catch (e) {
                        console.error('Error parsing split payment', e);
                    }
                } else {
                    addAmountToMethod(pm, actualPaid);
                }
            }

            if (!groupedIncome[pm]) groupedIncome[pm] = [];
            groupedIncome[pm].push(i);
        });

        if (dayCashEl) dayCashEl.textContent = `${cash.toFixed(2)}`;

        // Calculate Cash Expenses
        const cashExpenses = expenses.reduce((sum, e) => {
            return (e.from_cash === 1 || e.from_cash === undefined) ? sum + e.amount : sum;
        }, 0);

        const dayTotalCashEl = document.getElementById('dayTotalCash');
        if (dayTotalCashEl) dayTotalCashEl.textContent = `${(cash - cashExpenses).toFixed(2)}`;

        if (dayInstapayEl) dayInstapayEl.textContent = `${instapay.toFixed(2)}`;
        if (dayAlahlyEl) dayAlahlyEl.textContent = `${alahly.toFixed(2)}`;
        if (dayMasrEl) dayMasrEl.textContent = `${masr.toFixed(2)}`;

        const dayVodafoneCashEl = document.getElementById('dayVodafoneCash');
        if (dayVodafoneCashEl) dayVodafoneCashEl.textContent = `${vodafoneCash.toFixed(2)}`;

        // Income Table
        let incomeHtml = '';
        if (Object.keys(groupedIncome).length === 0) {
            incomeHtml = '<tr><td colspan="4" style="text-align:center; color:#94a3b8;">No records</td></tr>';
        } else {
            for (const [pm, items] of Object.entries(groupedIncome)) {
                const methodTotal = items.reduce((sum, i) => sum + getPaid(i), 0);

                incomeHtml += `
                    <tr style="background: #f1f5f9;">
                        <td colspan="3" class="font-bold" style="color: #334155;">${window.getTranslatedPaymentMethod(pm)} (Total)</td>
                        <td class="font-bold" style="color: #0d9488;">${methodTotal.toFixed(2)}</td>
                    </tr>
                `;

                items.forEach(i => {
                    const actualPaid = getPaid(i);
                    const isDeleted = i.payment_method === 'Deleted';
                    incomeHtml += `
                        <tr style="${isDeleted ? 'opacity: 0.6;' : ''}">
                            <td style="padding-left: 20px;">${i.customer_name}</td>
                            <td>${i.description || '-'}</td>
                            <td>
                                <span style="${isDeleted ? 'background: #ef4444; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;' : ''}">
                                    ${window.getTranslatedPaymentMethod(i.payment_method)}
                                </span>
                            </td>
                            <td>${actualPaid.toFixed(2)}</td>
                        </tr>
                    `;
                });
            }
        }
        if (reportIncomeBody) reportIncomeBody.innerHTML = incomeHtml;

        // Expenses Table
        if (reportExpensesBody) {
            reportExpensesBody.innerHTML = expenses.map(e => {
                const isDeletedBill = e.category === 'Deleted Bill';
                return `
                <tr style="${isDeletedBill ? 'opacity: 0.65;' : ''}">
                    <td style="${isDeletedBill ? 'color:#ef4444;' : ''}">${e.description || e.category}</td>
                    <td>${e.amount.toFixed(2)}</td>
                </tr>`;
            }).join('') || '<tr><td colspan="2" style="text-align:center; color:#94a3b8;">No records</td></tr>';
        }
    }

    if (filterStartDateInput) filterStartDateInput.addEventListener('change', updateReport);
    if (filterEndDateInput) filterEndDateInput.addEventListener('change', updateReport);

    printReportBtn.addEventListener('click', () => {
        const printContainer = document.getElementById('printContainer');
        printContainer.innerHTML = document.getElementById('reportArea').innerHTML;
        printContainer.style.direction = getCurrentLanguage() === 'ar' ? 'rtl' : 'ltr';
        window.print();
    });

    // Initialize
    updateReport();
});
