let db;
try { db = require('../database/db.js'); }
catch (e) { console.error('DB load error:', e); alert('Database Error: ' + e.message); }

document.addEventListener('DOMContentLoaded', () => {
    translatePage();

    const filterStartDateInput = document.getElementById('filterStartDate');
    const filterEndDateInput = document.getElementById('filterEndDate');
    const loadReportBtn = document.getElementById('loadReportBtn');
    const printReportBtn = document.getElementById('printReportBtn');

    // Default dates to Today
    const today = new Date().toISOString().split('T')[0];
    if (filterStartDateInput) filterStartDateInput.value = today;
    if (filterEndDateInput) filterEndDateInput.value = today;

    if (loadReportBtn) loadReportBtn.onclick = updateReport;
    if (filterStartDateInput) filterStartDateInput.onchange = updateReport;
    if (filterEndDateInput) filterEndDateInput.onchange = updateReport;
    if (printReportBtn) printReportBtn.onclick = printReport;

    updateReport();
});

const parseDateOnly = (dStr) => {
    if (!dStr) return '';
    return String(dStr).trim().split(' ')[0].split('T')[0];
};

function updateReport() {
    const startDate = document.getElementById('filterStartDate') ? document.getElementById('filterStartDate').value : '';
    const endDate = document.getElementById('filterEndDate') ? document.getElementById('filterEndDate').value : '';

    const displayDateEl = document.getElementById('displayDate');
    if (displayDateEl) {
        displayDateEl.textContent = (startDate === endDate) ? (startDate || '—') : `${startDate} to ${endDate}`;
    }

    const allRepairs = db.getRepairs ? db.getRepairs() : [];
    const allExpenses = db.getExpenses ? db.getExpenses() : [];
    const allOhdaRecords = db.getOhdaRecords ? db.getOhdaRecords() : [];

    const income = allRepairs.filter(r => {
        const rDate = parseDateOnly(r.date);
        let match = true;
        if (startDate && rDate < startDate) match = false;
        if (endDate && rDate > endDate) match = false;
        return match;
    });

    const expenses = allExpenses.filter(e => {
        const eDate = parseDateOnly(e.date);
        let match = true;
        if (startDate && eDate < startDate) match = false;
        if (endDate && eDate > endDate) match = false;
        return match;
    });

    const ohdaRecords = allOhdaRecords.filter(r => {
        const oDate = parseDateOnly(r.date);
        let match = true;
        if (startDate && oDate < startDate) match = false;
        if (endDate && oDate > endDate) match = false;
        return match;
    });

    renderReport(income, expenses, ohdaRecords);
}

function renderReport(income, expenses, ohdaRecords) {
    const getPaid = (inv) => {
        if (inv.payment_method === 'PayByParts') return (parseFloat(inv.paid_amount) || 0);
        return (parseFloat(inv.total_amount) || 0);
    };

    // Filter active income (excluding deleted)
    const activeIncome = income.filter(i => i.payment_method !== 'Deleted');

    const totalIncome = activeIncome.reduce((sum, i) => sum + getPaid(i), 0);
    
    // Total general expenses ONLY (car expenses are kept separate in Car Expenses section)
    const totalExpenses = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

    const net = totalIncome - totalExpenses;

    document.getElementById('dayIncome').textContent = totalIncome.toFixed(2);
    document.getElementById('dayExpenses').textContent = totalExpenses.toFixed(2);
    
    const dayNetEl = document.getElementById('dayNet');
    if (dayNetEl) {
        dayNetEl.textContent = net.toFixed(2);
        dayNetEl.style.color = net >= 0 ? '#16a34a' : '#dc2626';
    }

    // Payment Methods Breakdown (active only)
    let cash = 0, instapay = 0, alahly = 0, masr = 0, vodafoneCash = 0, card = 0, payByParts = 0;

    const addAmountToMethod = (method, amount) => {
        if (method === 'Cash') cash += amount;
        else if (method === 'Instapay') instapay += amount;
        else if (method === 'Bank Alahly') alahly += amount;
        else if (method === 'Bank Masr') masr += amount;
        else if (method === 'Vodafone Cash') vodafoneCash += amount;
        else if (method === 'ATM / Card' || method === 'Card') card += amount;
        else if (method === 'PayByParts') payByParts += amount;
        else cash += amount; // default to cash
    };

    const groupedIncome = {};
    activeIncome.forEach(i => {
        const pm = i.payment_method || 'Cash';
        const actualPaid = getPaid(i);

        if (i.notes && i.notes.includes('__SPLIT__:')) {
            try {
                const splitStr = i.notes.split('__SPLIT__:')[1];
                const splitData = JSON.parse(splitStr);
                addAmountToMethod(splitData.method1, parseFloat(splitData.amount1) || 0);
                addAmountToMethod(splitData.method2, parseFloat(splitData.amount2) || 0);
            } catch (e) {
                addAmountToMethod(pm, actualPaid);
            }
        } else {
            addAmountToMethod(pm, actualPaid);
        }

        if (!groupedIncome[pm]) groupedIncome[pm] = [];
        groupedIncome[pm].push(i);
    });

    document.getElementById('dayCash').textContent = cash.toFixed(2);

    // Calculate Cash Expenses
    const cashExpenses = expenses.reduce((sum, e) => {
        return (e.from_cash === 1 || e.from_cash === undefined) ? sum + (parseFloat(e.amount) || 0) : sum;
    }, 0);

    const dayTotalCashEl = document.getElementById('dayTotalCash');
    if (dayTotalCashEl) dayTotalCashEl.textContent = (cash - cashExpenses).toFixed(2);

    document.getElementById('dayInstapay').textContent = instapay.toFixed(2);
    document.getElementById('dayAlahly').textContent = alahly.toFixed(2);
    document.getElementById('dayMasr').textContent = masr.toFixed(2);
    document.getElementById('dayVodafoneCash').textContent = vodafoneCash.toFixed(2);

    // Render Ohda Stats
    const totalOhda = ohdaRecords.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
    const ohdaExpenses = expenses.filter(e => e.from_ohda === 1);
    const totalOhdaSpent = ohdaExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    const ohdaRemaining = totalOhda - totalOhdaSpent;

    const dayOhdaTotalEl = document.getElementById('dayOhdaTotal');
    const dayOhdaSpentEl = document.getElementById('dayOhdaSpent');
    const dayOhdaRemainingEl = document.getElementById('dayOhdaRemaining');

    if (dayOhdaTotalEl) dayOhdaTotalEl.textContent = totalOhda.toFixed(2);
    if (dayOhdaSpentEl) dayOhdaSpentEl.textContent = totalOhdaSpent.toFixed(2);
    if (dayOhdaRemainingEl) {
        dayOhdaRemainingEl.textContent = ohdaRemaining.toFixed(2);
        dayOhdaRemainingEl.style.color = ohdaRemaining >= 0 ? '#16a34a' : '#dc2626';
    }

    // Render Income Table
    const reportIncomeBody = document.getElementById('reportIncomeBody');
    let incomeHtml = '';
    
    if (Object.keys(groupedIncome).length === 0) {
        incomeHtml = `<tr><td colspan="4" style="text-align:center;color:#94a3b8;">${t('noData')}</td></tr>`;
    } else {
        for (const [pm, items] of Object.entries(groupedIncome)) {
            const methodTotal = items.reduce((sum, i) => sum + getPaid(i), 0);

            incomeHtml += `
                <tr style="background:#f1f5f9;font-weight:700;">
                    <td colspan="3" style="color:#0d9488;">${getTranslatedPaymentMethod(pm)} (${t('total') || 'Total'})</td>
                    <td style="color:#0d9488;">${methodTotal.toFixed(2)}</td>
                </tr>
            `;

            items.forEach(i => {
                const actualPaid = getPaid(i);
                incomeHtml += `
                    <tr>
                        <td class="font-bold">${i.customer_name || '—'}</td>
                        <td>${i.car_name || '—'}</td>
                        <td>${getPaymentBadge(i.payment_method)}</td>
                        <td class="font-bold text-teal">${actualPaid.toFixed(2)}</td>
                    </tr>
                `;
            });
        }
    }
    if (reportIncomeBody) reportIncomeBody.innerHTML = incomeHtml;

    // Render Expenses Table (General Expenses ONLY)
    const reportExpensesBody = document.getElementById('reportExpensesBody');
    let expHtml = '';
    
    if (expenses.length === 0) {
        expHtml = `<tr><td colspan="3" style="text-align:center;color:#94a3b8;">${t('noData')}</td></tr>`;
    } else {
        expenses.forEach(e => {
            expHtml += `
                <tr>
                    <td class="font-bold">${e.description}</td>
                    <td>${t('cat' + (e.category || '').replace(/\s+/g, '')) || e.category}</td>
                    <td class="font-bold text-red">${(parseFloat(e.amount) || 0).toFixed(2)}</td>
                </tr>
            `;
        });
    }
    if (reportExpensesBody) reportExpensesBody.innerHTML = expHtml;

    // Render Dedicated Ohda Expenses Table
    const reportOhdaBody = document.getElementById('reportOhdaBody');
    let ohdaHtml = '';
    if (ohdaExpenses.length === 0) {
        ohdaHtml = `<tr><td colspan="4" style="text-align:center;color:#94a3b8;">لا توجد مصروفات مخصومة من العهدة لهذه الفترة</td></tr>`;
    } else {
        ohdaExpenses.forEach(e => {
            ohdaHtml += `
                <tr>
                    <td>${e.date}</td>
                    <td class="font-bold">${e.description}</td>
                    <td>${t('cat' + (e.category || '').replace(/\s+/g, '')) || e.category}</td>
                    <td class="font-bold text-red">${(parseFloat(e.amount) || 0).toFixed(2)}</td>
                </tr>
            `;
        });
    }
    if (reportOhdaBody) reportOhdaBody.innerHTML = ohdaHtml;
}

function printReport() {
    const printContainer = document.getElementById('printContainer');
    const reportArea = document.getElementById('reportArea');
    if (printContainer && reportArea) {
        printContainer.innerHTML = reportArea.innerHTML;
        printContainer.style.direction = (document.documentElement.getAttribute('dir') === 'rtl') ? 'rtl' : 'ltr';
        window.print();
    }
}

function getPaymentBadge(method) {
    if (!method) return '—';
    if (method === 'Cash') return `<span class="badge badge-cash">${t('cash') || 'كاش'}</span>`;
    return `<span class="badge badge-card">${getTranslatedPaymentMethod(method)}</span>`;
}
