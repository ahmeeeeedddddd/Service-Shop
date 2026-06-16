// expenses.js
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

    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    expDateInput.value = today;

    let allExpenses = []; // To be filled from DB

    // Language Toggle
    langToggle.addEventListener('click', () => {
        const newLang = getCurrentLanguage() === 'en' ? 'ar' : 'en';
        setLanguage(newLang);
    });

    // Mock Database Fetch
    async function loadExpenses() {
        // Mock data
        allExpenses = [
            { id: 1, date: '2026-06-16', description: 'Shop rent', category: 'Rent', amount: 3500.00 },
            { id: 2, date: '2026-06-16', description: 'Electricity bill', category: 'Utilities', amount: 420.00 },
            { id: 3, date: '2026-06-10', description: 'Brake pads stock', category: 'Parts', amount: 1200.00 }
        ];

        applyFilters();
    }

    function renderExpenses(data) {
        expensesTableBody.innerHTML = '';
        data.forEach(exp => {
            const tr = document.createElement('tr');
            const lang = getCurrentLanguage();
            const t = translations[lang];
            const categoryText = t[exp.category.toLowerCase()] || exp.category;

            tr.innerHTML = `
                <td>${exp.date}</td>
                <td>${exp.description}</td>
                <td><span class="badge" style="background: #f1f5f9; color: #475569;">${categoryText}</span></td>
                <td class="font-bold">$${exp.amount.toFixed(2)}</td>
                <td><button class="btn btn-outline small remove-exp-btn" style="color: #ef4444; border-color: #fee2e2; padding: 2px 8px;">×</button></td>
            `;
            expensesTableBody.appendChild(tr);
        });
        
        const total = data.reduce((sum, exp) => sum + exp.amount, 0);
        totalExpensesEl.textContent = `$${total.toFixed(2)}`;
    }

    // Form Submission
    expenseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newExp = {
            id: Date.now(),
            date: document.getElementById('expDate').value,
            description: document.getElementById('expDesc').value,
            category: document.getElementById('expCategory').value,
            amount: parseFloat(document.getElementById('expAmount').value)
        };

        allExpenses.push(newExp);
        // In real app: await db.saveExpense(newExp);
        
        expenseForm.reset();
        expDateInput.value = today;
        applyFilters();
    });

    // Remove Expense
    expensesTableBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-exp-btn')) {
            const row = e.target.closest('tr');
            const index = Array.from(expensesTableBody.children).indexOf(row);
            // This is naive indexing, in real app use ID
            allExpenses.splice(index, 1);
            applyFilters();
        }
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

    [filterDateInput].forEach(input => {
        input.addEventListener('input', applyFilters);
    });

    // Initialize
    loadExpenses();
});
