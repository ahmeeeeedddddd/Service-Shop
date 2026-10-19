let db;
try { db = require('../database/db.js'); }
catch (e) { console.error('DB load error:', e); alert('Database Error: ' + e.message); }

let editingExpenseId = null;

document.addEventListener('DOMContentLoaded', () => {
    translatePage();
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('expenseDate').value = today;
    
    // Default: show today only
    document.getElementById('expFilterFrom').value = today;
    document.getElementById('expFilterTo').value = today;
    
    loadExpenses();
    updateOhdaHint();
    
    document.getElementById('saveExpenseBtn').onclick = saveExpense;
    document.getElementById('cancelExpenseEditBtn').onclick = resetExpenseForm;
    document.getElementById('applyExpFilter').onclick = loadExpenses;
    document.getElementById('expenseDate').onchange = updateOhdaHint;
    
    document.getElementById('todayExpFilter').onclick = () => {
        const t = new Date().toISOString().split('T')[0];
        document.getElementById('expFilterFrom').value = t;
        document.getElementById('expFilterTo').value = t;
        loadExpenses();
    };
    document.getElementById('clearExpFilter').onclick = () => {
        document.getElementById('expFilterFrom').value = '';
        document.getElementById('expFilterTo').value = '';
        loadExpenses();
    };
});

function updateOhdaHint() {
    const d = document.getElementById('expenseDate').value || new Date().toISOString().split('T')[0];
    const ohda = db.getOhdaByDate ? db.getOhdaByDate(d) : null;
    const hintEl = document.getElementById('ohdaBalanceHint');
    if (!hintEl) return;
    
    if (ohda) {
        const allExpenses = db.getExpenses ? db.getExpenses() : [];
        const spent = allExpenses.filter(e => e.date === d && e.from_ohda === 1).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
        const rem = (parseFloat(ohda.amount) || 0) - spent;
        hintEl.innerHTML = `عهدة هذا اليوم: <strong>${parseFloat(ohda.amount).toFixed(2)}</strong> | المصروف منها: <strong>${spent.toFixed(2)}</strong> | المتبقي: <strong style="color:${rem >= 0 ? '#16a34a' : '#dc2626'}">${rem.toFixed(2)} ج.م</strong>`;
    } else {
        hintEl.innerHTML = `⚠️ لم يتم تسجيل عهدة لهذا اليوم (${d}). يمكن تسجليها من تبويب "عهده".`;
    }
}

function loadExpenses() {
    const fromDate = document.getElementById('expFilterFrom').value;
    const toDate = document.getElementById('expFilterTo').value;
    
    let expenses = db.getExpenses();
    
    if (fromDate) expenses = expenses.filter(e => e.date >= fromDate);
    if (toDate) expenses = expenses.filter(e => e.date <= toDate);
    
    expenses.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
    
    const tbody = document.getElementById('expensesTableBody');
    tbody.innerHTML = '';
    
    let total = 0;
    
    expenses.forEach(e => {
        total += e.amount;
        const isOhda = e.from_ohda !== 0;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${e.date}</td>
            <td class="font-bold">${e.description}</td>
            <td>${t('cat' + e.category.replace(/\s+/g, '')) || e.category}</td>
            <td class="font-bold text-red">${e.amount.toFixed(2)}</td>
            <td>
                ${isOhda 
                    ? `<span style="background:#fef08a;color:#854d0e;border:1px solid #fde047;padding:2px 8px;border-radius:999px;font-size:0.75rem;font-weight:700;">🏅 عهدة</span>` 
                    : `<span style="background:#f1f5f9;color:#475569;padding:2px 8px;border-radius:999px;font-size:0.75rem;font-weight:600;">💵 عادي</span>`}
            </td>
            <td>
                <div class="flex gap-2">
                    <button class="btn btn-outline btn-sm" onclick="editExpense(${e.id})">${t('edit')}</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteExpense(${e.id})">${t('delete')}</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    if (expenses.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#64748b;">${t('noData')}</td></tr>`;
    }
    
    document.getElementById('totalExpensesDisplay').textContent = total.toFixed(2) + ' EGP';
}

function saveExpense() {
    const desc = document.getElementById('expenseDesc').value.trim();
    const amount = parseFloat(document.getElementById('expenseAmount').value) || 0;
    const category = document.getElementById('expenseCategory').value;
    const date = document.getElementById('expenseDate').value;
    const from_ohda = document.getElementById('fromOhdaCheckbox').checked ? 1 : 0;
    
    if (!desc || amount <= 0 || !date) {
        alert(t('description') + ' & ' + t('amount') + ' & ' + t('date') + ' required.');
        return;
    }
    
    if (editingExpenseId) {
        db.updateExpense(editingExpenseId, { description: desc, amount, category, date, from_ohda });
    } else {
        db.addExpense({ description: desc, amount, category, date, from_ohda });
    }
    
    resetExpenseForm();
    loadExpenses();
    updateOhdaHint();
}

function resetExpenseForm() {
    editingExpenseId = null;
    document.getElementById('expenseDesc').value = '';
    document.getElementById('expenseAmount').value = '0';
    document.getElementById('expenseCategory').value = 'Operating';
    document.getElementById('expenseDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('fromOhdaCheckbox').checked = true;
    
    document.getElementById('expenseFormTitle').textContent = t('logExpense');
    document.getElementById('saveExpenseBtn').innerHTML = t('saveExpense');
    document.getElementById('cancelExpenseEditBtn').style.display = 'none';
}

window.editExpense = function(id) {
    const expense = db.getExpenses().find(e => e.id === id);
    if (!expense) return;
    
    editingExpenseId = id;
    document.getElementById('expenseDesc').value = expense.description;
    document.getElementById('expenseAmount').value = expense.amount;
    document.getElementById('expenseCategory').value = expense.category;
    document.getElementById('expenseDate').value = expense.date;
    document.getElementById('fromOhdaCheckbox').checked = expense.from_ohda !== 0;
    
    document.getElementById('expenseFormTitle').textContent = t('updateExpense');
    document.getElementById('saveExpenseBtn').innerHTML = t('updateExpense');
    document.getElementById('cancelExpenseEditBtn').style.display = 'inline-flex';
};

window.deleteExpense = function(id) {
    if (!confirm(t('confirmDeleteExpense'))) return;
    db.deleteExpense(id);
    loadExpenses();
    updateOhdaHint();
};
