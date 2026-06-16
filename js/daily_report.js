// daily_report.js
document.addEventListener('DOMContentLoaded', () => {
    // Initialize i18n
    translatePage();

    // Elements
    const langToggle = document.getElementById('langToggle');
    const filterDateInput = document.getElementById('filterDate');
    const displayDate = document.getElementById('displayDate');
    const printReportBtn = document.getElementById('printReportBtn');

    const dayIncomeEl = document.getElementById('dayIncome');
    const dayExpensesEl = document.getElementById('dayExpenses');
    const dayNetEl = document.getElementById('dayNet');

    const reportBillsBody = document.getElementById('reportBillsBody');
    const reportIncomeBody = document.getElementById('reportIncomeBody');
    const reportExpensesBody = document.getElementById('reportExpensesBody');

    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
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
        displayDate.textContent = date;

        // Mock data fetch filtered by date
        // In real app: [income, expenses, bills] = await Promise.all([db.getIncome(date), db.getExpenses(date), db.getBills(date)]);
        
        const mockIncome = [
            { id: 1, date: '2026-06-16', customer: 'Ahmed Mahmoud', payment: 'Cash', amount: 195.00 },
            { id: 2, date: '2026-06-16', customer: 'Sara Allen', payment: 'ATM / Card', amount: 380.00 }
        ].filter(i => i.date === date);

        const mockExpenses = [
            { id: 1, date: '2026-06-16', description: 'Shop rent', amount: 3500.00 },
            { id: 2, date: '2026-06-16', description: 'Electricity', amount: 420.00 }
        ].filter(e => e.date === date);

        renderReport(mockIncome, mockExpenses);
    }

    function renderReport(income, expenses) {
        const totalIncome = income.reduce((sum, i) => sum + i.amount, 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
        const net = totalIncome - totalExpenses;

        dayIncomeEl.textContent = `$${totalIncome.toFixed(2)}`;
        dayExpensesEl.textContent = `$${totalExpenses.toFixed(2)}`;
        dayNetEl.textContent = `$${net.toFixed(2)}`;
        dayNetEl.style.color = net >= 0 ? '#0d9488' : '#ef4444';

        // Bills (Customer name and amount only)
        reportBillsBody.innerHTML = income.map(i => `
            <tr>
                <td>${i.customer}</td>
                <td class="font-bold">$${i.amount.toFixed(2)}</td>
            </tr>
        `).join('') || '<tr><td colspan="2" style="text-align:center; color:#94a3b8;">No records</td></tr>';

        // Income
        reportIncomeBody.innerHTML = income.map(i => `
            <tr>
                <td>${i.payment}</td>
                <td class="font-bold">$${i.amount.toFixed(2)}</td>
            </tr>
        `).join('') || '<tr><td colspan="2" style="text-align:center; color:#94a3b8;">No records</td></tr>';

        // Expenses
        reportExpensesBody.innerHTML = expenses.map(e => `
            <tr>
                <td>${e.description}</td>
                <td class="font-bold">$${e.amount.toFixed(2)}</td>
            </tr>
        `).join('') || '<tr><td colspan="2" style="text-align:center; color:#94a3b8;">No records</td></tr>';
    }

    filterDateInput.addEventListener('input', updateReport);
    printReportBtn.addEventListener('click', () => window.print());

    // Initialize
    updateReport();
});
