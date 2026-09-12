let db;
try { db = require('../database/db.js'); }
catch (e) { console.error('DB load error:', e); alert('Database Error: ' + e.message); }

let editingOhdaId = null;
const today = new Date().toISOString().split('T')[0];

document.addEventListener('DOMContentLoaded', () => {
    translatePage();
    document.getElementById('ohdaDate').value = today;

    document.getElementById('saveOhdaBtn').onclick = saveOhda;
    document.getElementById('cancelOhdaEditBtn').onclick = resetOhdaForm;
    document.getElementById('ohdaTodayBtn').onclick = () => loadOhdaHistory(today);
    document.getElementById('ohdaAllBtn').onclick = () => loadOhdaHistory(null);

    loadTodayBanner();
    loadTodayOhdaExpenses();
    loadOhdaHistory(today);
    loadAllOhdaExpenses();
});

function loadTodayBanner() {
    const ohda = db.getOhdaByDate(today);
    const ohdaAmount = ohda ? (parseFloat(ohda.amount) || 0) : 0;

    // Get today's ohda expenses
    const allExpenses = db.getExpenses ? db.getExpenses() : [];
    const todayOhda = allExpenses.filter(e => e.date === today && e.from_ohda === 1);
    const spent = todayOhda.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    const remaining = ohdaAmount - spent;

    document.getElementById('bannerOhdaAmount').textContent = ohdaAmount.toFixed(2);
    document.getElementById('bannerSpent').textContent = spent.toFixed(2);
    const remEl = document.getElementById('bannerRemaining');
    remEl.textContent = remaining.toFixed(2);
    remEl.style.color = remaining >= 0 ? '#a7f3d0' : '#fca5a5';
}

function loadTodayOhdaExpenses() {
    const allExpenses = db.getExpenses ? db.getExpenses() : [];
    const todayOhda = allExpenses.filter(e => e.date === today && e.from_ohda === 1);
    const tbody = document.getElementById('todayOhdaExpensesBody');

    if (todayOhda.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;color:#94a3b8;">لا توجد مصروفات من العهدة اليوم</td></tr>`;
        return;
    }
    tbody.innerHTML = todayOhda.map(e => `
        <tr>
            <td class="font-bold">${e.description}</td>
            <td>${e.category || '—'}</td>
            <td class="font-bold text-red">${(parseFloat(e.amount) || 0).toFixed(2)}</td>
        </tr>
    `).join('');
}

function loadOhdaHistory(filterDate) {
    let records = db.getOhdaRecords ? db.getOhdaRecords() : [];
    if (filterDate) records = records.filter(r => r.date === filterDate);

    const allExpenses = db.getExpenses ? db.getExpenses() : [];
    const tbody = document.getElementById('ohdaHistoryBody');

    if (records.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#94a3b8;">لا توجد عهدات مسجلة</td></tr>`;
        return;
    }

    tbody.innerHTML = records.map(rec => {
        const dayExpenses = allExpenses.filter(e => e.date === rec.date && e.from_ohda === 1);
        const spent = dayExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
        const remaining = (parseFloat(rec.amount) || 0) - spent;
        const isToday = rec.date === today;
        const remClass = remaining >= 0 ? 'remaining-positive' : 'remaining-negative';
        return `
            <tr class="${isToday ? 'today-highlight' : ''}">
                <td class="font-bold">${rec.date}${isToday ? ' <span style="background:#0d9488;color:white;font-size:0.65rem;padding:1px 5px;border-radius:999px;">اليوم</span>' : ''}</td>
                <td class="font-bold text-teal">${(parseFloat(rec.amount) || 0).toFixed(2)}</td>
                <td class="text-red font-bold">${spent.toFixed(2)}</td>
                <td class="${remClass}">${remaining.toFixed(2)}</td>
                <td style="color:#64748b;font-size:0.85rem;">${rec.notes || '—'}</td>
                <td>
                    <div class="flex gap-2">
                        <button class="btn btn-outline btn-sm" onclick="editOhda(${rec.id})" style="color:#3b82f6;border-color:#3b82f6;">تعديل</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteOhda(${rec.id})">حذف</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function loadAllOhdaExpenses() {
    const allOhdaExp = db.getOhdaExpenses ? db.getOhdaExpenses() : [];
    const total = allOhdaExp.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    document.getElementById('totalOhdaSpent').textContent = total.toFixed(2) + ' ج.م';

    const tbody = document.getElementById('allOhdaExpensesBody');
    if (allOhdaExp.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#94a3b8;">لا توجد مصروفات من العهدة</td></tr>`;
        return;
    }
    tbody.innerHTML = allOhdaExp.map(e => `
        <tr class="${e.date === today ? 'today-highlight' : ''}">
            <td>${e.date}</td>
            <td class="font-bold">${e.description}</td>
            <td>${e.category || '—'}</td>
            <td class="font-bold text-red">${(parseFloat(e.amount) || 0).toFixed(2)}</td>
        </tr>
    `).join('');
}

function saveOhda() {
    const date = document.getElementById('ohdaDate').value;
    const amount = parseFloat(document.getElementById('ohdaAmount').value) || 0;
    const notes = document.getElementById('ohdaNotes').value.trim();

    if (!date || amount <= 0) {
        alert('يرجى إدخال التاريخ والمبلغ.');
        return;
    }

    if (editingOhdaId) {
        db.updateOhdaRecord(editingOhdaId, { date, amount, notes });
    } else {
        db.addOhdaRecord({ date, amount, notes });
    }

    resetOhdaForm();
    loadTodayBanner();
    loadTodayOhdaExpenses();
    loadOhdaHistory(today);
    loadAllOhdaExpenses();
}

function resetOhdaForm() {
    editingOhdaId = null;
    document.getElementById('editingOhdaId').value = '';
    document.getElementById('ohdaDate').value = today;
    document.getElementById('ohdaAmount').value = '0';
    document.getElementById('ohdaNotes').value = '';
    document.getElementById('ohdaFormTitle').textContent = '🏅 تسجيل عهدة';
    document.getElementById('cancelOhdaEditBtn').style.display = 'none';
    document.getElementById('saveOhdaBtn').textContent = '💾 حفظ العهدة';
}

window.editOhda = function(id) {
    const rec = db.getOhdaRecords().find(r => r.id === id);
    if (!rec) return;
    editingOhdaId = id;
    document.getElementById('editingOhdaId').value = id;
    document.getElementById('ohdaDate').value = rec.date;
    document.getElementById('ohdaAmount').value = rec.amount;
    document.getElementById('ohdaNotes').value = rec.notes || '';
    document.getElementById('ohdaFormTitle').textContent = '✏️ تعديل العهدة';
    document.getElementById('cancelOhdaEditBtn').style.display = 'inline-flex';
    document.getElementById('saveOhdaBtn').textContent = '💾 تحديث';
};

window.deleteOhda = function(id) {
    if (!confirm('هل تريد حذف هذه العهدة؟')) return;
    db.deleteOhdaRecord(id);
    loadTodayBanner();
    loadOhdaHistory(today);
};
