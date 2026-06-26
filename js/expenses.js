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
    const filterDateInput = document.getElementById('filterDate');
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
    filterDateInput.value = today;
    
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
        const id = editingExpenseId.value;

        if (!description || isNaN(amount)) return;

        if (id) {
            db.updateExpense(parseInt(id), { description, amount, category, date });
        } else {
            db.addExpense({ description, amount, category, date });
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
        editingExpenseId.value = exp.id;
        
        cancelEditBtn.style.display = 'inline-block';
        
        const lang = getCurrentLanguage();
        saveExpenseBtn.textContent = translations[lang].updateExpense || 'Update Expense';
        saveExpenseBtn.setAttribute('data-i18n', 'updateExpense');
    };

    window.deleteExpense = function(id) {
        const lang = getCurrentLanguage();
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
        const filterDate = filterDateInput.value;

        const filtered = allExpenses.filter(exp => {
            const matchesDate = !filterDate || exp.date === filterDate;
            return matchesDate;
        });

        renderExpenses(filtered);
    }

    filterDateInput.addEventListener('input', applyFilters);

    // Initial Load
    loadExpenses();
});
