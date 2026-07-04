let db;
try {
    db = require('../database/db.js');
} catch (e) {
    console.error('Failed to load database:', e);
    alert('Database Error: ' + e.message + '\n\n' + e.stack);
}

let editingEmployeeId = null;
let currentEmp = null; // { id, name, role, dailyRate }

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

    const saveEmpBtn = document.getElementById('saveEmpBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const formTitle = document.getElementById('formTitle');

    loadEmployees();

    // ── Save / Update Employee ──────────────────────────────────────────────
    saveEmpBtn.addEventListener('click', () => {
        const name        = document.getElementById('empName').value.trim();
        const employee_id = document.getElementById('empId').value.trim();
        const role        = document.getElementById('empRole').value.trim();
        const daily_rate  = parseFloat(document.getElementById('empDailyRate').value) || 0;

        if (!name || !employee_id || !role) {
            alert(getCurrentLanguage() === 'en' ? 'All fields are required!' : 'جميع الحقول مطلوبة!');
            return;
        }

        if (editingEmployeeId) {
            db.updateEmployee(editingEmployeeId, { name, employee_id, role, daily_rate });
            editingEmployeeId = null;
            saveEmpBtn.textContent   = getCurrentLanguage() === 'en' ? 'Save Employee'   : 'حفظ الموظف';
            formTitle.textContent    = getCurrentLanguage() === 'en' ? 'Add Employee'    : 'إضافة موظف';
            cancelEditBtn.style.display = 'none';
        } else {
            db.addEmployee({ name, employee_id, role, daily_rate });
        }

        clearForm();
        loadEmployees();
    });

    cancelEditBtn.addEventListener('click', () => {
        editingEmployeeId = null;
        saveEmpBtn.textContent   = getCurrentLanguage() === 'en' ? 'Save Employee' : 'حفظ الموظف';
        formTitle.textContent    = getCurrentLanguage() === 'en' ? 'Add Employee'  : 'إضافة موظف';
        cancelEditBtn.style.display = 'none';
        clearForm();
    });

    // ══════════════════════════════════════════════════════════════════════════
    // SALARY MODAL
    // ══════════════════════════════════════════════════════════════════════════
    const salaryModal     = document.getElementById('salaryModal');
    const modalDaysWorked = document.getElementById('modalDaysWorked');
    const modalRaise      = document.getElementById('modalRaise');
    const modalNetSalary  = document.getElementById('modalNetSalary');
    const modalConfirmBtn = document.getElementById('modalConfirmBtn');
    const modalCancelBtn  = document.getElementById('modalCancelBtn');

    function calcNetSalary() {
        if (!currentEmp) return;
        const days  = parseFloat(modalDaysWorked.value) || 0;
        const raise = parseFloat(modalRaise.value) || 0;
        const net   = (currentEmp.dailyRate * days) + raise - currentEmp.deductions;
        modalNetSalary.textContent = `$${Math.max(0, net).toFixed(2)}`;
    }

    modalDaysWorked.addEventListener('input', calcNetSalary);
    modalRaise.addEventListener('input', calcNetSalary);

    modalConfirmBtn.addEventListener('click', () => {
        if (!currentEmp) return;
        const days  = parseFloat(modalDaysWorked.value) || 0;
        const raise = parseFloat(modalRaise.value) || 0;
        const net   = Math.max(0, (currentEmp.dailyRate * days) + raise - currentEmp.deductions);
        const today = new Date().toISOString().split('T')[0];

        let description = `Salary: ${currentEmp.name} (${currentEmp.role}) — ${days} days`;
        if (raise > 0) description += ` + Bonus $${raise.toFixed(2)}`;
        if (currentEmp.deductions > 0) description += ` - Deductions $${currentEmp.deductions.toFixed(2)}`;

        db.addExpense({ description, amount: net, category: 'Salaries', date: today });
        if (currentEmp.deductions > 0) {
            db.clearEmployeeAdjustments(currentEmp.id);
        }

        const msg = getCurrentLanguage() === 'en'
            ? `Salary of $${net.toFixed(2)} recorded for ${currentEmp.name}.`
            : `تم تسجيل راتب ${currentEmp.name} بقيمة $${net.toFixed(2)}.`;
        alert(msg);
        salaryModal.classList.remove('active');
        currentEmp = null;
        loadEmployees();
    });

    modalCancelBtn.addEventListener('click', () => {
        salaryModal.classList.remove('active');
        currentEmp = null;
    });

    // ══════════════════════════════════════════════════════════════════════════
    // DEDUCTION MODAL
    // ══════════════════════════════════════════════════════════════════════════
    const deductionModal      = document.getElementById('deductionModal');
    const deductionAmount     = document.getElementById('deductionAmount');
    const deductionReason     = document.getElementById('deductionReason');
    const deductionConfirmBtn = document.getElementById('deductionConfirmBtn');
    const deductionCancelBtn  = document.getElementById('deductionCancelBtn');

    deductionConfirmBtn.addEventListener('click', () => {
        if (!currentEmp) return;
        const amount = parseFloat(deductionAmount.value) || 0;
        if (amount <= 0) {
            alert('Please enter a valid deduction amount.');
            return;
        }

        const reason = deductionReason.value.trim();
        const today  = new Date().toISOString().split('T')[0];

        db.addEmployeeAdjustment(currentEmp.id, { type: 'Deduction', amount, reason, date: today });

        const msg = getCurrentLanguage() === 'en'
            ? `Deduction of $${amount.toFixed(2)} added to ${currentEmp.name}'s balance.`
            : `تم إضافة خصم بقيمة $${amount.toFixed(2)} على ${currentEmp.name}.`;
        alert(msg);
        deductionModal.classList.remove('active');
        currentEmp = null;
        loadEmployees();
    });

    deductionCancelBtn.addEventListener('click', () => {
        deductionModal.classList.remove('active');
        currentEmp = null;
    });

    // ══════════════════════════════════════════════════════════════════════════
    // BORROW MONEY MODAL
    // ══════════════════════════════════════════════════════════════════════════
    const borrowModal      = document.getElementById('borrowModal');
    const borrowAmount     = document.getElementById('borrowAmount');
    const borrowNote       = document.getElementById('borrowNote');
    const borrowConfirmBtn = document.getElementById('borrowConfirmBtn');
    const borrowCancelBtn  = document.getElementById('borrowCancelBtn');

    borrowConfirmBtn.addEventListener('click', () => {
        if (!currentEmp) return;
        const amount = parseFloat(borrowAmount.value) || 0;
        if (amount <= 0) {
            alert('Please enter a valid amount.');
            return;
        }
        const note  = borrowNote.value.trim();
        const today = new Date().toISOString().split('T')[0];

        // Record borrow as an expense
        const description = `Advance/Borrow: ${currentEmp.name} (${currentEmp.role})${note ? ' — ' + note : ''}`;
        db.addExpense({ description, amount, category: 'Salaries', date: today });
        
        // Also add to their pending adjustments
        db.addEmployeeAdjustment(currentEmp.id, { type: 'Borrow', amount, reason: note, date: today });

        const msg = getCurrentLanguage() === 'en'
            ? `Advance of $${amount.toFixed(2)} recorded as an expense and subtracted from ${currentEmp.name}'s salary.`
            : `تم تسجيل سلفة ${currentEmp.name} بقيمة $${amount.toFixed(2)} في المصاريف والخصومات.`;
        alert(msg);
        borrowModal.classList.remove('active');
        currentEmp = null;
        loadEmployees();
    });

    borrowCancelBtn.addEventListener('click', () => {
        borrowModal.classList.remove('active');
        currentEmp = null;
    });
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function clearForm() {
    document.getElementById('empName').value      = '';
    document.getElementById('empId').value        = '';
    document.getElementById('empRole').value      = '';
    document.getElementById('empDailyRate').value = '';
}

function loadEmployees() {
    const list  = db.getEmployees();
    const tbody = document.getElementById('employeesTableBody');
    tbody.innerHTML = '';
    const lang = getCurrentLanguage();

    list.forEach(emp => {
        const tr     = document.createElement('tr');
        const weekly = (emp.daily_rate * 6).toFixed(2);
        
        let adjs = [];
        try {
            if (emp.pending_adjustments) {
                adjs = JSON.parse(emp.pending_adjustments);
            }
        } catch(e) {}
        
        let deductions = 0;
        adjs.forEach(a => deductions += parseFloat(a.amount));

        // Store json string safely to pass to onclick
        const adjsStr = encodeURIComponent(JSON.stringify(adjs));

        tr.innerHTML = `
            <td>${emp.name}</td>
            <td>${emp.employee_id}</td>
            <td>${emp.role}</td>
            <td class="font-bold">$${parseFloat(emp.daily_rate).toFixed(2)}</td>
            <td class="font-bold">$${weekly}</td>
            <td class="font-bold text-red-500" style="cursor:pointer; text-decoration:underline;" onclick="openHistoryModal('${adjsStr}')">
                -$${deductions.toFixed(2)}
            </td>
            <td>
                <div class="flex gap-2" style="flex-wrap:wrap;">
                    <button class="btn btn-outline btn-sm"
                        onclick="openSalaryModal(${emp.id}, '${emp.name}', '${emp.role}', ${emp.daily_rate}, ${deductions})"
                        style="color:#0d9488; border-color:#0d9488;">
                        💵 ${lang === 'en' ? 'Record Salary' : 'تسجيل الراتب'}
                    </button>
                    <button class="btn btn-outline btn-sm"
                        onclick="openDeductionModal(${emp.id}, '${emp.name}', '${emp.role}', ${emp.daily_rate})"
                        style="color:#ef4444; border-color:#fca5a5;">
                        ➖ ${lang === 'en' ? 'Deduction' : 'خصم'}
                    </button>
                    <button class="btn btn-outline btn-sm"
                        onclick="openBorrowModal(${emp.id}, '${emp.name}', '${emp.role}', ${emp.daily_rate})"
                        style="color:#f59e0b; border-color:#fcd34d;">
                        💸 ${lang === 'en' ? 'Borrow' : 'سلفة'}
                    </button>
                    <button class="btn btn-outline btn-sm"
                        onclick="editEmployee(${emp.id}, '${emp.name}', '${emp.employee_id}', '${emp.role}', ${emp.daily_rate})">
                        ${lang === 'en' ? 'Edit' : 'تعديل'}
                    </button>
                    <button class="btn btn-outline btn-sm" style="color:red; border-color:#fee2e2;"
                        onclick="deleteEmployee(${emp.id})">
                        ${lang === 'en' ? 'Delete' : 'حذف'}
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ── Modal openers (global) ─────────────────────────────────────────────────
window.openSalaryModal = function(id, name, role, dailyRate, deductions) {
    currentEmp = { id, name, role, dailyRate, deductions: deductions || 0 };

    document.getElementById('salaryModalTitle').textContent =
        getCurrentLanguage() === 'en' ? `Record Salary — ${name}` : `تسجيل راتب — ${name}`;

    document.getElementById('modalDaysWorked').value = 6;
    document.getElementById('modalRaise').value      = 0;
    
    let net = (dailyRate * 6) - (deductions || 0);
    document.getElementById('modalNetSalary').textContent = `$${Math.max(0, net).toFixed(2)}`;

    document.getElementById('salaryModal').classList.add('active');
};

window.openHistoryModal = function(adjsStrEncoded) {
    const tbody = document.getElementById('historyTableBody');
    tbody.innerHTML = '';
    
    let adjs = [];
    try {
        adjs = JSON.parse(decodeURIComponent(adjsStrEncoded));
    } catch(e) {}
    
    if (adjs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:1rem; color:#64748b;">No pending deductions or borrows.</td></tr>';
    } else {
        adjs.forEach(adj => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding:0.5rem; border-bottom:1px solid #f1f5f9;">${adj.date || '-'}</td>
                <td style="padding:0.5rem; border-bottom:1px solid #f1f5f9; font-weight:bold; color:${adj.type==='Borrow'?'#f59e0b':'#ef4444'};">${adj.type}</td>
                <td style="padding:0.5rem; border-bottom:1px solid #f1f5f9;">${adj.reason || '-'}</td>
                <td style="padding:0.5rem; border-bottom:1px solid #f1f5f9; font-weight:bold;">$${parseFloat(adj.amount).toFixed(2)}</td>
            `;
            tbody.appendChild(tr);
        });
    }
    
    document.getElementById('historyModal').classList.add('active');
};

document.getElementById('historyCloseBtn').addEventListener('click', () => {
    document.getElementById('historyModal').classList.remove('active');
});

window.openDeductionModal = function(id, name, role, dailyRate) {
    currentEmp = { id, name, role, dailyRate };

    document.getElementById('deductionModalTitle').textContent =
        getCurrentLanguage() === 'en' ? `Add Deduction — ${name}` : `إضافة خصم — ${name}`;

    document.getElementById('deductionAmount').value = 0;
    document.getElementById('deductionReason').value = '';

    document.getElementById('deductionModal').classList.add('active');
};

window.openBorrowModal = function(id, name, role, dailyRate) {
    currentEmp = { id, name, role, dailyRate };

    document.getElementById('borrowModalTitle').textContent =
        getCurrentLanguage() === 'en' ? `Record Advance — ${name}` : `تسجيل سلفة — ${name}`;

    document.getElementById('borrowAmount').value = 0;
    document.getElementById('borrowNote').value   = '';

    document.getElementById('borrowModal').classList.add('active');
};

window.editEmployee = function(id, name, empId, role, dailyRate) {
    editingEmployeeId = id;
    document.getElementById('empName').value      = name;
    document.getElementById('empId').value        = empId;
    document.getElementById('empRole').value      = role;
    document.getElementById('empDailyRate').value = dailyRate;

    const saveEmpBtn    = document.getElementById('saveEmpBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const formTitle     = document.getElementById('formTitle');

    saveEmpBtn.textContent    = getCurrentLanguage() === 'en' ? 'Update Employee' : 'تحديث الموظف';
    formTitle.textContent     = getCurrentLanguage() === 'en' ? 'Edit Employee'   : 'تعديل موظف';
    cancelEditBtn.style.display = 'block';

    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteEmployee = function(id) {
    const msg = getCurrentLanguage() === 'en' ? 'Are you sure you want to delete this employee?' : 'هل أنت متأكد من حذف هذا الموظف؟';
    if (confirm(msg)) {
        db.deleteEmployee(id);
        loadEmployees();
    }
};
