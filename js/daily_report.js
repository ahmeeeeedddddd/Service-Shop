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
        reportIncomeBody.innerHTML = income.map(i => {
            const actualPaid = getPaid(i);
            return `
                <tr>
                    <td>${i.customer_name}</td>
                    <td>${i.car_name || '-'}</td>
                    <td>${window.getTranslatedPaymentMethod(i.payment_method)}</td>
                    <td class="font-bold">$${actualPaid.toFixed(2)}</td>
                </tr>
            `;
        }).join('') || '<tr><td colspan="4" style="text-align:center; color:#94a3b8;">No records</td></tr>';

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
        previewArea.innerHTML = document.getElementById('reportArea').innerHTML;
        previewModal.classList.add('active');
    });

    closePreviewBtn.addEventListener('click', () => previewModal.classList.remove('active'));
    confirmPrintReportBtn.addEventListener('click', async () => {
        const { ipcRenderer } = require('electron');
        const dateStr = filterDateInput.value || new Date().toISOString().split('T')[0];
        const fileName = `DailyReport_${dateStr}.pdf`;

        const result = await ipcRenderer.invoke('print-to-pdf', {
            folder: 'reports',
            name: fileName
        });

        if (result.success) {
            alert('Report saved to: ' + result.path);
        } else {
            alert('Saving failed: ' + result.error);
        }
    });

    // Initialize
    updateReport();
});
