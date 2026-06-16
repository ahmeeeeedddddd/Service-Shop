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

            tr.innerHTML = `
                <td>${exp.date}</td>
                <td>${exp.description}</td>
                <td><span class="badge" style="background: #e2e8f0; color: #475569;">${categoryText}</span></td>
                <td class="font-bold text-red-500">$${parseFloat(exp.amount).toFixed(2)}</td>
            `;
            expensesTableBody.appendChild(tr);
            total += exp.amount;
        });
        totalExpensesEl.textContent = `$${total.toFixed(2)}`;
    }

    // Save Expense
    expenseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const description = document.getElementById('expDesc').value;
        const amount = parseFloat(document.getElementById('expAmount').value);
        const category = document.getElementById('expCategory').value;
        const date = document.getElementById('expDate').value;

        if (!description || isNaN(amount)) return;

        db.addExpense({ description, amount, category, date });
        
        expenseForm.reset();
        expDateInput.value = today;
        loadExpenses();
    });

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
