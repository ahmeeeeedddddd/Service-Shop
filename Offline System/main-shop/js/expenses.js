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
    const expenseForm = document.getElementById('expenseForm');
    const expensesTableBody = document.getElementById('expensesTableBody');
    const totalExpensesEl = document.getElementById('totalExpenses');
    const filterStartDateInput = document.getElementById('filterStartDate');
    const filterEndDateInput = document.getElementById('filterEndDate');
    const resetFiltersBtn = document.getElementById('resetFiltersBtn');
    const printExpensesReportBtn = document.getElementById('printExpensesReportBtn');
    const expDateInput = document.getElementById('expDate');
    const monthFilter = document.getElementById('monthFilter');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const editingExpenseId = document.getElementById('editingExpenseId');
    const saveExpenseBtn = document.getElementById('saveExpenseBtn');

    let allExpenses = [];

    // Set default dates
    const now = new Date();
    const today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    expDateInput.value = today;
    if(filterStartDateInput) filterStartDateInput.value = today;
    if(filterEndDateInput) filterEndDateInput.value = today;
    
    const currentMonth = new Date().toISOString().split('-').slice(0, 2).join('-');
    monthFilter.value = currentMonth;

    // Language Toggle
    langToggle.addEventListener('click', () => {
        const newLang = getCurrentLanguage() === 'en' ? 'ar' : 'en';
        setLanguage(newLang);
        // Refresh submit button translation text
        if (editingExpenseId.value) {
            saveExpenseBtn.textContent = translations[newLang].updateExpense || 'Update Expense';
        } else {
            saveExpenseBtn.textContent = translations[newLang].saveExpense || 'Save Expense';
        }
    });

    // Load Data
    async function loadExpenses() {
        allExpenses = db.getExpenses();
        applyFilters();
    }

    function renderExpenses(data) {
        expensesTableBody.innerHTML = '';
        let total = 0;
        data.forEach(exp => {
            const tr = document.createElement('tr');
            const lang = getCurrentLanguage();
            const t = translations[lang];
            const categoryText = t[exp.category.toLowerCase()] || exp.category;
            const expDataEscaped = encodeURIComponent(JSON.stringify(exp));

            tr.innerHTML = `
                <td>${exp.date}</td>
                <td>${exp.description}</td>
                <td><span class="badge" style="background: #e2e8f0; color: #475569;">${categoryText}</span></td>
                <td class="font-bold text-red-500">$${parseFloat(exp.amount).toFixed(2)}</td>
                <td>
                    <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                        <button class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="editExpense('${expDataEscaped}')">
                            ${t.edit || 'Edit'}
                        </button>
                        <button class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; color: #ef4444; border-color: #fee2e2;" onclick="deleteExpense(${exp.id})">
                            ${t.delete || 'Delete'}
                        </button>
                    </div>
                </td>
            `;
            expensesTableBody.appendChild(tr);
            total += exp.amount;
        });
        totalExpensesEl.textContent = `$${total.toFixed(2)}`;
    }

    // Save/Update Expense
    expenseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const description = document.getElementById('expDesc').value;
        const amount = parseFloat(document.getElementById('expAmount').value);
        const category = document.getElementById('expCategory').value;
        const date = document.getElementById('expDate').value;
        const fromCash = document.getElementById('expFromCash') ? (document.getElementById('expFromCash').checked ? 1 : 0) : 1;
        const id = editingExpenseId.value;

        if (!description || isNaN(amount)) return;

        if (id) {
            db.updateExpense(parseInt(id), { description, amount, category, date, from_cash: fromCash });
        } else {
            db.addExpense({ description, amount, category, date, from_cash: fromCash });
        }
        
        resetForm();
        loadExpenses();
    });

    window.editExpense = function(expJsonStr) {
        const exp = JSON.parse(decodeURIComponent(expJsonStr));
        document.getElementById('expDesc').value = exp.description;
        document.getElementById('expAmount').value = exp.amount;
        document.getElementById('expCategory').value = exp.category;
        document.getElementById('expDate').value = exp.date;
        if (document.getElementById('expFromCash')) {
            document.getElementById('expFromCash').checked = (exp.from_cash === undefined || exp.from_cash === 1);
        }
        editingExpenseId.value = exp.id;
        
        cancelEditBtn.style.display = 'inline-block';
        
        const lang = getCurrentLanguage();
        saveExpenseBtn.textContent = translations[lang].updateExpense || 'Update Expense';
        saveExpenseBtn.setAttribute('data-i18n', 'updateExpense');
    };

    window.deleteExpense = function(id) {
        const expense = allExpenses.find(e => e.id == id);
        const lang = getCurrentLanguage();
        if (expense && expense.category === 'Deleted Bill') {
            alert(lang === 'en' ? 'Deleted bills cannot be removed from expenses.' : 'لا يمكن حذف الفواتير المحذوفة من المصروفات.');
            return;
        }
        
        const msg = translations[lang].confirmDeleteExpense || 'Are you sure you want to delete this expense?';
        if (confirm(msg)) {
            db.deleteExpense(id);
            loadExpenses();
            if (editingExpenseId.value == id) {
                resetForm();
            }
        }
    };

    function resetForm() {
        expenseForm.reset();
        expDateInput.value = today;
        editingExpenseId.value = '';
        cancelEditBtn.style.display = 'none';
        
        const lang = getCurrentLanguage();
        saveExpenseBtn.textContent = translations[lang].saveExpense || 'Save Expense';
        saveExpenseBtn.setAttribute('data-i18n', 'saveExpense');
    }

    cancelEditBtn.addEventListener('click', resetForm);

    // Filter Logic
    function applyFilters() {
        const startDate = filterStartDateInput ? filterStartDateInput.value : '';
        const endDate = filterEndDateInput ? filterEndDateInput.value : '';

        const filtered = allExpenses.filter(exp => {
            let matchesDate = true;
            if (startDate && exp.date < startDate) matchesDate = false;
            if (endDate && exp.date > endDate) matchesDate = false;
            return matchesDate;
        });

        renderExpenses(filtered);
    }

    if(filterStartDateInput) filterStartDateInput.addEventListener('input', applyFilters);
    if(filterEndDateInput) filterEndDateInput.addEventListener('input', applyFilters);
    if(resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', () => {
            if(filterStartDateInput) filterStartDateInput.value = '';
            if(filterEndDateInput) filterEndDateInput.value = '';
            applyFilters();
        });
    }

    if(printExpensesReportBtn) {
        printExpensesReportBtn.addEventListener('click', () => {
            const lang = getCurrentLanguage();
            const shopName = lang === 'ar' ? 'الأنصاري' : 'El Ansary Service Shop';
            const now = new Date();
            const dateStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');
            
            const startDate = filterStartDateInput ? filterStartDateInput.value : '';
            const endDate = filterEndDateInput ? filterEndDateInput.value : '';
            let dateRangeStr = lang === 'ar' ? 'كل الأوقات' : 'All Time';
            if (startDate && endDate) dateRangeStr = startDate + ' to ' + endDate;
            else if (startDate) dateRangeStr = 'From ' + startDate;
            else if (endDate) dateRangeStr = 'Until ' + endDate;
            
            const tableHtml = document.querySelector('.table-container table').outerHTML.replace(/<th style="width: 140px;"><\/th>/g, '').replace(/<td>\s*<div[^>]*>[\s\S]*?<\/div>\s*<\/td>/g, '');
            const totalHtml = document.querySelector('.stat-card.accent').outerHTML.replace(/<input[^>]*>/, '');

            var textAlign = lang === 'ar' ? 'right' : 'left';
            var dir = lang === 'ar' ? 'rtl' : 'ltr';
            const html = '<html dir="' + dir + '"><head><meta charset="UTF-8">' +
            '<style>' +
            'body{font-family:Arial,sans-serif;font-size:12px;margin:20px;color:#1e293b;}' +
            'h1{font-size:1.2rem;margin-bottom:0.25rem;text-align:center;color:#0d9488;}' +
            'h2{font-size:1.1rem;text-align:center;margin-bottom:1rem;}' +
            '.header-info{text-align:center;margin-bottom:1rem;color:#64748b;font-size:0.85rem;}' +
            'table{width:100%;border-collapse:collapse;margin-top:1rem;}' +
            'th{background:#f1f5f9;padding:0.5rem;text-align:' + textAlign + ';font-size:0.85rem;border:1px solid #e2e8f0;}' +
            'td{padding:0.5rem;font-size:0.85rem;text-align:' + textAlign + ';border:1px solid #e2e8f0;}' +
            '.stat-card{border:1px solid #e2e8f0;padding:1rem;border-radius:8px;margin-bottom:1rem;}' +
            '@media print{body{margin:10px;}}' +
            '</style></head><body>' +
            '<h1>' + shopName + '</h1>' +
            '<h2>' + (lang === 'ar' ? 'تقرير المصروفات' : 'Expenses Report') + '</h2>' +
            '<div class="header-info">' +
            '<div>' + (lang === 'ar' ? 'تاريخ الطباعة:' : 'Print Date:') + ' ' + dateStr + '</div>' +
            '<div>' + (lang === 'ar' ? 'الفترة:' : 'Period:') + ' ' + dateRangeStr + '</div>' +
            '</div>' +
            totalHtml +
            tableHtml +
            '</body></html>';
            
            const win = window.open('', '_blank', 'width=750,height=600');
            win.document.write(html);
            win.document.close();
            win.focus();
            setTimeout(() => { win.print(); }, 500);
        });
    }

    // Initial Load
    loadExpenses();
});
