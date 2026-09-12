let db;
try { db = require('../database/db.js'); }
catch (e) { console.error('DB load error:', e); alert('Database Error: ' + e.message); }

let editingEmpId = null;
let currentModalEmpId = null;

document.addEventListener('DOMContentLoaded', () => {
    translatePage();
    const langToggle = document.getElementById('langToggle');
    if (langToggle) {
        langToggle.addEventListener('click', () => {
            const newLang = getCurrentLanguage() === 'en' ? 'ar' : 'en';
            setLanguage(newLang);
            loadEmployees();
        });
    }

    loadEmployees();
    
    document.getElementById('saveEmpBtn').onclick = saveEmployee;
    document.getElementById('cancelEmpBtn').onclick = resetForm;
    document.getElementById('resetAllBtn').onclick = resetAllEmployees;
    document.getElementById('printPayrollBtn').onclick = printPayroll;
    
    // Modal buttons
    document.getElementById('cancelSalaryBtn').onclick = () => document.getElementById('salaryModal').classList.remove('active');
    document.getElementById('cancelDeductionBtn').onclick = () => document.getElementById('deductionModal').classList.remove('active');
    document.getElementById('cancelBorrowBtn').onclick = () => document.getElementById('borrowModal').classList.remove('active');
    document.getElementById('cancelBonusBtn').onclick = () => document.getElementById('bonusModal').classList.remove('active');
    document.getElementById('closeAdjHistoryBtn').onclick = () => document.getElementById('adjHistoryModal').classList.remove('active');
    
    // Modals auto-recalc
    document.getElementById('salaryDays').addEventListener('input', recalcSalaryPreview);
    document.getElementById('salaryBonus').addEventListener('input', recalcSalaryPreview);
    
    // Confirms
    document.getElementById('confirmSalaryBtn').onclick = confirmSalary;
    document.getElementById('confirmDeductionBtn').onclick = confirmDeduction;
    document.getElementById('confirmBorrowBtn').onclick = confirmBorrow;
    document.getElementById('confirmBonusBtn').onclick = confirmBonus;
});

function getEmpAdjustments(emp) {
    let adjs = [];
    try { if (emp.pending_adjustments) adjs = JSON.parse(emp.pending_adjustments); } catch(e){}
    let borrows = 0, deductions = 0, bonus = 0;
    adjs.forEach(a => {
        const type = a.adj_type || a.type;
        const amt = parseFloat(a.amount) || 0;
        if (type === 'Borrow') borrows += amt;
        else if (type === 'Deduction') deductions += amt;
        else if (type === 'Bonus') bonus += amt;
    });
    return { borrows, deductions, bonus, adjs };
}

function loadEmployees() {
    const emps = db.getEmployees();
    const tbody = document.getElementById('empTableBody');
    tbody.innerHTML = '';
    
    emps.forEach(emp => {
        const { borrows, deductions, bonus } = getEmpAdjustments(emp);
        const weekly = (emp.daily_rate || 0) * 6;
        const net = weekly - borrows - deductions + bonus;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="font-bold">${emp.name}</td>
            <td>${emp.role || '—'}</td>
            <td>${(emp.daily_rate || 0).toFixed(2)}</td>
            <td class="font-bold text-teal">${weekly.toFixed(2)}</td>
            <td class="clickable text-red" onclick="openBorrow(${emp.id})">${borrows.toFixed(2)}</td>
            <td class="clickable text-red" onclick="openDeduction(${emp.id})">${deductions.toFixed(2)}</td>
            <td class="clickable text-green" onclick="openBonus(${emp.id})">${bonus.toFixed(2)}</td>
            <td class="font-bold text-teal">${net.toFixed(2)}</td>
            <td>
                <div class="flex gap-2">
                    <button class="btn btn-primary btn-sm" onclick="openSalary(${emp.id})" title="Record Salary">💰</button>
                    <button class="btn btn-outline btn-sm" onclick="openAdjHistory(${emp.id})" title="History">📜</button>
                    <button class="btn btn-outline btn-sm" onclick="editEmployee(${emp.id})">✏️</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteEmployee(${emp.id})">🗑️</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    if (emps.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:#64748b;">${t('noData')}</td></tr>`;
    }
}

function saveEmployee() {
    const name = document.getElementById('empName').value.trim();
    if (!name) return alert(t('employeeName') + ' required.');
    
    const role = document.getElementById('empRole').value.trim();
    const rate = parseFloat(document.getElementById('empDailyRate').value) || 0;
    
    if (editingEmpId) {
        db.updateEmployee(editingEmpId, { name, role, daily_rate: rate });
    } else {
        db.addEmployee({ name, role, daily_rate: rate });
    }
    
    resetForm();
    loadEmployees();
}

function resetForm() {
    editingEmpId = null;
    document.getElementById('empName').value = '';
    document.getElementById('empRole').value = '';
    document.getElementById('empDailyRate').value = '0';
    document.getElementById('empFormTitle').textContent = t('addEmployee');
    document.getElementById('saveEmpBtn').innerHTML = t('save');
    document.getElementById('cancelEmpBtn').style.display = 'none';
}

window.editEmployee = function(id) {
    const emp = db.getEmployees().find(e => e.id === id);
    if (!emp) return;
    
    editingEmpId = id;
    document.getElementById('empName').value = emp.name;
    document.getElementById('empRole').value = emp.role || '';
    document.getElementById('empDailyRate').value = emp.daily_rate || 0;
    
    document.getElementById('empFormTitle').textContent = t('edit');
    document.getElementById('saveEmpBtn').innerHTML = t('save');
    document.getElementById('cancelEmpBtn').style.display = 'inline-flex';
};

window.deleteEmployee = function(id) {
    if (!confirm('Delete this employee?')) return;
    db.deleteEmployee(id);
    loadEmployees();
};

function resetAllEmployees() {
    if (!confirm(t('confirmResetAll'))) return;
    db.clearAllEmployeeAdjustments();
    loadEmployees();
}

// ─── Modals ────────────────────────────────────────────────────────────────────
window.openSalary = function(id) {
    currentModalEmpId = id;
    document.getElementById('salaryDays').value = '6';
    document.getElementById('salaryBonus').value = '0';
    recalcSalaryPreview();
    document.getElementById('salaryModal').classList.add('active');
};

function recalcSalaryPreview() {
    if (!currentModalEmpId) return;
    const emp = db.getEmployees().find(e => e.id === currentModalEmpId);
    if (!emp) return;
    
    const { borrows, deductions, bonus } = getEmpAdjustments(emp);
    const days = parseFloat(document.getElementById('salaryDays').value) || 0;
    const extraBonus = parseFloat(document.getElementById('salaryBonus').value) || 0;
    
    const base = (emp.daily_rate || 0) * days;
    const totalBonus = bonus + extraBonus;
    const net = base - deductions - borrows + totalBonus;
    
    document.getElementById('salaryWeeklyPreview').textContent = base.toFixed(2);
    document.getElementById('salaryDeducPreview').textContent = deductions.toFixed(2);
    document.getElementById('salaryBorrowPreview').textContent = borrows.toFixed(2);
    document.getElementById('salaryBonusPreview').textContent = totalBonus.toFixed(2);
    document.getElementById('salaryNetPreview').textContent = net.toFixed(2);
}

function confirmSalary() {
    const emp = db.getEmployees().find(e => e.id === currentModalEmpId);
    if (!emp) return;
    
    const { borrows, deductions, bonus } = getEmpAdjustments(emp);
    const days = parseFloat(document.getElementById('salaryDays').value) || 0;
    const extraBonus = parseFloat(document.getElementById('salaryBonus').value) || 0;
    
    const base = (emp.daily_rate || 0) * days;
    const totalBonus = bonus + extraBonus;
    const net = base - deductions - borrows + totalBonus;
    
    const date = new Date().toISOString().split('T')[0];
    db.addExpense({
        description: `Salary: ${emp.name} (${days} days)`,
        amount: net,
        category: 'Salaries',
        date: date
    });
    
    db.clearEmployeeAdjustments(emp.id);
    document.getElementById('salaryModal').classList.remove('active');
    loadEmployees();
}

window.openDeduction = function(id) {
    currentModalEmpId = id;
    document.getElementById('deductionAmount').value = '0';
    document.getElementById('deductionReason').value = '';
    document.getElementById('deductionModal').classList.add('active');
};

function confirmDeduction() {
    const amt = parseFloat(document.getElementById('deductionAmount').value) || 0;
    const reason = document.getElementById('deductionReason').value.trim();
    if (amt <= 0) return;
    
    const date = new Date().toISOString().split('T')[0];
    db.addEmployeeAdjustment(currentModalEmpId, { adj_type: 'Deduction', type: 'Deduction', amount: amt, notes: reason, date });
    document.getElementById('deductionModal').classList.remove('active');
    loadEmployees();
}

window.openBorrow = function(id) {
    currentModalEmpId = id;
    document.getElementById('borrowAmount').value = '0';
    document.getElementById('borrowNote').value = '';
    document.getElementById('borrowModal').classList.add('active');
};

function confirmBorrow() {
    const amt = parseFloat(document.getElementById('borrowAmount').value) || 0;
    const note = document.getElementById('borrowNote').value.trim();
    if (amt <= 0) return;
    
    const emp = db.getEmployees().find(e => e.id === currentModalEmpId);
    const date = new Date().toISOString().split('T')[0];
    
    db.addEmployeeAdjustment(currentModalEmpId, { adj_type: 'Borrow', type: 'Borrow', amount: amt, notes: note, date });
    db.addExpense({
        description: `Borrow (سلفة): ${emp ? emp.name : ''}`,
        amount: amt,
        category: 'Salaries',
        date: date
    });
    
    document.getElementById('borrowModal').classList.remove('active');
    loadEmployees();
}

window.openBonus = function(id) {
    currentModalEmpId = id;
    document.getElementById('bonusAmount').value = '0';
    document.getElementById('bonusNote').value = '';
    document.getElementById('bonusModal').classList.add('active');
};

function confirmBonus() {
    const amt = parseFloat(document.getElementById('bonusAmount').value) || 0;
    const note = document.getElementById('bonusNote').value.trim();
    if (amt <= 0) return;
    
    const date = new Date().toISOString().split('T')[0];
    db.addEmployeeAdjustment(currentModalEmpId, { adj_type: 'Bonus', type: 'Bonus', amount: amt, notes: note, date });
    document.getElementById('bonusModal').classList.remove('active');
    loadEmployees();
}

window.openAdjHistory = function(id) {
    const emp = db.getEmployees().find(e => e.id === id);
    if (!emp) return;
    document.getElementById('adjHistoryTitle').textContent = emp.name + ' - History';
    
    const { adjs } = getEmpAdjustments(emp);
    const tbody = document.getElementById('adjHistoryBody');
    tbody.innerHTML = '';
    
    adjs.forEach((a, idx) => {
        const type = a.adj_type || a.type;
        let color = '';
        if (type === 'Borrow' || type === 'Deduction') color = 'text-red';
        if (type === 'Bonus') color = 'text-green';
        
        tbody.innerHTML += `
            <tr>
                <td>${a.date || ''}</td>
                <td class="font-bold ${color}">${type}</td>
                <td class="${color} font-bold">${(a.amount || 0).toFixed(2)}</td>
                <td>${a.notes || a.note || a.reason || ''}</td>
                <td><button class="btn btn-danger btn-sm" onclick="deleteAdj(${idx}, ${id})">×</button></td>
            </tr>
        `;
    });
    
    document.getElementById('adjHistoryModal').classList.add('active');
};

window.deleteAdj = function(index, empId) {
    const emp = db.getEmployees().find(e => e.id === empId);
    if (!emp) return;
    const { adjs } = getEmpAdjustments(emp);
    adjs.splice(index, 1);
    db.updateEmployeeAdjustments(empId, adjs);
    openAdjHistory(empId);
    loadEmployees();
};

function printPayroll() {
    const emps = db.getEmployees();
    let totalNet = 0;
    
    const rows = emps.map(e => {
        const { borrows, deductions, bonus } = getEmpAdjustments(e);
        const weekly = (e.daily_rate || 0) * 6;
        const net = weekly - borrows - deductions + bonus;
        totalNet += net;
        return `
            <tr>
                <td style="border:1px solid #ddd;padding:6px;">${e.name}</td>
                <td style="border:1px solid #ddd;padding:6px;text-align:center;">${(e.daily_rate || 0).toFixed(2)}</td>
                <td style="border:1px solid #ddd;padding:6px;text-align:center;">${borrows.toFixed(2)}</td>
                <td style="border:1px solid #ddd;padding:6px;text-align:center;">${deductions.toFixed(2)}</td>
                <td style="border:1px solid #ddd;padding:6px;text-align:center;">${bonus.toFixed(2)}</td>
                <td style="border:1px solid #ddd;padding:6px;text-align:center;font-weight:bold;">${net.toFixed(2)}</td>
            </tr>
        `;
    }).join('');
    
    document.getElementById('printArea').innerHTML = `
        <div style="font-family:'Cairo',Arial,sans-serif;direction:rtl;color:#000;padding:20px;">
            <div style="text-align:center;border-bottom:2px solid #eab308;padding-bottom:10px;margin-bottom:15px;">
                <h1 style="margin:0;font-size:24px;">مركز الأنصاري لصيانة السيارات</h1>
                <h3 style="margin:5px 0;color:#0d9488;">كشف الرواتب الأسبوعي للموظفين</h3>
                <p style="margin:0;font-weight:bold;">تاريخ الإصدار: ${new Date().toLocaleDateString('ar-EG')}</p>
            </div>
            
            <table style="width:100%;border-collapse:collapse;margin-top:16px;">
                <thead>
                    <tr style="background:#fef08a;border-bottom:2px solid #ca8a04;color:#713f12;">
                        <th style="border:1px solid #ddd;padding:8px;">اسم الموظف</th>
                        <th style="border:1px solid #ddd;padding:8px;">اليومية</th>
                        <th style="border:1px solid #ddd;padding:8px;">السلف</th>
                        <th style="border:1px solid #ddd;padding:8px;">الخصومات</th>
                        <th style="border:1px solid #ddd;padding:8px;">المكافآت</th>
                        <th style="border:1px solid #ddd;padding:8px;">الصافي (أسبوع)</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
                <tfoot>
                    <tr style="background:#0d9488;color:white;">
                        <td colspan="5" style="border:1px solid #ddd;padding:10px;font-weight:bold;text-align:right;font-size:1.1rem;">إجمالي الرواتب المستحقة</td>
                        <td style="border:1px solid #ddd;padding:10px;font-weight:bold;text-align:center;font-size:1.1rem;">${totalNet.toFixed(2)} ج.م</td>
                    </tr>
                </tfoot>
            </table>
            
            <div style="margin-top:3rem;display:flex;justify-content:space-between;border-top:1px solid #ddd;padding-top:1rem;">
                <div style="font-size:0.85rem;color:#64748b;">
                    <p style="margin:0 0 4px 0;"><strong>للتواصل:</strong></p>
                    <p style="margin:0;">01010103777</p>
                    <p style="margin:0;">01010606016</p>
                </div>
                <div style="text-align:center;">
                    <p style="margin:0;font-weight:bold;">توقيع المحاسب</p>
                    <div style="margin-top:2rem;border-bottom:1px solid #94a3b8;width:140px;display:inline-block;"></div>
                </div>
            </div>
        </div>
    `;
    window.print();
}
