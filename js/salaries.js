let db;
try {
    db = require('../database/db.js');
} catch (e) {
    console.error('Failed to load database:', e);
    alert('Database Error: ' + e.message + '\n\n' + e.stack);
}

let editingEmployeeId = null;
let currentRecordEmp = null;

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

    saveEmpBtn.addEventListener('click', () => {
        const name = document.getElementById('empName').value.trim();
        const employee_id = document.getElementById('empId').value.trim();
        const role = document.getElementById('empRole').value.trim();
        const daily_rate = parseFloat(document.getElementById('empDailyRate').value) || 0;

        if (!name || !employee_id || !role) {
            alert(getCurrentLanguage() === 'en' ? 'All fields are required!' : 'جميع الحقول مطلوبة!');
            return;
        }

        if (editingEmployeeId) {
            db.updateEmployee(editingEmployeeId, { name, employee_id, role, daily_rate });
            editingEmployeeId = null;
            saveEmpBtn.textContent = getCurrentLanguage() === 'en' ? 'Save Employee' : 'حفظ الموظف';
            formTitle.textContent = getCurrentLanguage() === 'en' ? 'Add Employee' : 'إضافة موظف';
            cancelEditBtn.style.display = 'none';
        } else {
            db.addEmployee({ name, employee_id, role, daily_rate });
        }

        clearForm();
        loadEmployees();
    });

    cancelEditBtn.addEventListener('click', () => {
        editingEmployeeId = null;
        saveEmpBtn.textContent = getCurrentLanguage() === 'en' ? 'Save Employee' : 'حفظ الموظف';
        formTitle.textContent = getCurrentLanguage() === 'en' ? 'Add Employee' : 'إضافة موظف';
        cancelEditBtn.style.display = 'none';
        clearForm();
    });

    // Record Salary Modal interaction
    const salaryModal = document.getElementById('salaryModal');
    const modalDaysWorked = document.getElementById('modalDaysWorked');
    const modalDeductions = document.getElementById('modalDeductions');
    const modalDeductionReason = document.getElementById('modalDeductionReason');
    const modalNetSalary = document.getElementById('modalNetSalary');
    const modalConfirmBtn = document.getElementById('modalConfirmBtn');
    const modalCancelBtn = document.getElementById('modalCancelBtn');

    function calculateNetSalary() {
        if (!currentRecordEmp) return;
        const days = parseFloat(modalDaysWorked.value) || 0;
        const deductions = parseFloat(modalDeductions.value) || 0;
        const net = (currentRecordEmp.dailyRate * days) - deductions;
        modalNetSalary.textContent = `$${Math.max(0, net).toFixed(2)}`;
    }

    if (modalDaysWorked) modalDaysWorked.addEventListener('input', calculateNetSalary);
    if (modalDeductions) modalDeductions.addEventListener('input', calculateNetSalary);

    if (modalConfirmBtn) {
        modalConfirmBtn.addEventListener('click', () => {
            if (!currentRecordEmp) return;
            const days = parseFloat(modalDaysWorked.value) || 0;
            const deductions = parseFloat(modalDeductions.value) || 0;
            const reason = modalDeductionReason.value.trim();
            const net = Math.max(0, (currentRecordEmp.dailyRate * days) - deductions);
            
            const today = new Date().toISOString().split('T')[0];
            let description = `Salary: ${currentRecordEmp.name} (${currentRecordEmp.role}) - ${days} days worked`;
            if (deductions > 0) {
                description += ` (Deduction: $${deductions.toFixed(2)}${reason ? ' - ' + reason : ''})`;
            }

            db.addExpense({
                description: description,
                amount: net,
                category: 'Salaries',
                date: today
            });

            const successMsg = getCurrentLanguage() === 'en' 
                ? `Successfully recorded salary ($${net.toFixed(2)}) for ${currentRecordEmp.name}!`
                : `تم تسجيل راتب الموظف ${currentRecordEmp.name} بقيمة (${net.toFixed(2)} ج.م) بنجاح!`;

            alert(successMsg);
            if (salaryModal) salaryModal.style.display = 'none';
            currentRecordEmp = null;
        });
    }

    if (modalCancelBtn) {
        modalCancelBtn.addEventListener('click', () => {
            if (salaryModal) salaryModal.style.display = 'none';
            currentRecordEmp = null;
        });
    }
});

function clearForm() {
    document.getElementById('empName').value = '';
    document.getElementById('empId').value = '';
    document.getElementById('empRole').value = '';
    document.getElementById('empDailyRate').value = '';
}

function loadEmployees() {
    const list = db.getEmployees();
    const tbody = document.getElementById('employeesTableBody');
    tbody.innerHTML = '';

    const lang = getCurrentLanguage();

    list.forEach(emp => {
        const tr = document.createElement('tr');
        const weekly = (emp.daily_rate * 6).toFixed(2);
        
        tr.innerHTML = `
            <td>${emp.name}</td>
            <td>${emp.employee_id}</td>
            <td>${emp.role}</td>
            <td class="font-bold">$${parseFloat(emp.daily_rate).toFixed(2)}</td>
            <td class="font-bold">$${weekly}</td>
            <td>
                <div class="flex gap-2">
                    <button class="btn btn-outline btn-sm" onclick="addWeeklySalaryToExpenses(${emp.id}, '${emp.name}', '${emp.role}', ${emp.daily_rate})">
                        ${lang === 'en' ? '✓ Record Salary' : '✓ تسجيل الراتب'}
                    </button>
                    <button class="btn btn-outline btn-sm" onclick="editEmployee(${emp.id}, '${emp.name}', '${emp.employee_id}', '${emp.role}', ${emp.daily_rate})">
                        ${lang === 'en' ? 'Edit' : 'تعديل'}
                    </button>
                    <button class="btn btn-outline btn-sm" style="color:red;border-color:#fee2e2;" onclick="deleteEmployee(${emp.id})">
                        ${lang === 'en' ? 'Delete' : 'حذف'}
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.editEmployee = function(id, name, empId, role, dailyRate) {
    editingEmployeeId = id;
    document.getElementById('empName').value = name;
    document.getElementById('empId').value = empId;
    document.getElementById('empRole').value = role;
    document.getElementById('empDailyRate').value = dailyRate;

    const saveEmpBtn = document.getElementById('saveEmpBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const formTitle = document.getElementById('formTitle');

    saveEmpBtn.textContent = getCurrentLanguage() === 'en' ? 'Update Employee' : 'تحديث الموظف';
    formTitle.textContent = getCurrentLanguage() === 'en' ? 'Edit Employee' : 'تعديل موظف';
    cancelEditBtn.style.display = 'block';
};

window.deleteEmployee = function(id) {
    const confirmMsg = getCurrentLanguage() === 'en' ? 'Are you sure?' : 'هل أنت متأكد؟';
    if (confirm(confirmMsg)) {
        db.deleteEmployee(id);
        loadEmployees();
    }
};

window.addWeeklySalaryToExpenses = function(id, name, role, dailyRate) {
    currentRecordEmp = { id, name, role, dailyRate };
    
    const lang = getCurrentLanguage();
    
    const modalEmpTitle = document.getElementById('modalEmpTitle');
    const lblDaysWorked = document.getElementById('lblDaysWorked');
    const lblDeductions = document.getElementById('lblDeductions');
    const lblDeductionReason = document.getElementById('lblDeductionReason');
    const lblNetSalary = document.getElementById('lblNetSalary');
    const modalConfirmBtn = document.getElementById('modalConfirmBtn');
    const modalCancelBtn = document.getElementById('modalCancelBtn');

    if (modalEmpTitle) {
        modalEmpTitle.textContent = lang === 'en' 
            ? `Record Salary for ${name}` 
            : `تسجيل راتب الموظف ${name}`;
    }
    if (lblDaysWorked) lblDaysWorked.textContent = lang === 'en' ? 'Days Worked' : 'الأيام الفعلية للعمل';
    if (lblDeductions) lblDeductions.textContent = lang === 'en' ? 'Deductions' : 'الاستقطاعات / الخصومات';
    if (lblDeductionReason) lblDeductionReason.textContent = lang === 'en' ? 'Deduction Reason (Optional)' : 'سبب الخصم (اختياري)';
    if (lblNetSalary) lblNetSalary.textContent = lang === 'en' ? 'Net Salary:' : 'صافي الراتب:';
    if (modalConfirmBtn) modalConfirmBtn.textContent = lang === 'en' ? 'Record Expense' : 'تسجيل في المصروفات';
    if (modalCancelBtn) modalCancelBtn.textContent = lang === 'en' ? 'Cancel' : 'إلغاء';
    
    const modalDaysWorked = document.getElementById('modalDaysWorked');
    const modalDeductions = document.getElementById('modalDeductions');
    const modalDeductionReason = document.getElementById('modalDeductionReason');
    const modalNetSalary = document.getElementById('modalNetSalary');

    if (modalDaysWorked) modalDaysWorked.value = 6;
    if (modalDeductions) modalDeductions.value = 0;
    if (modalDeductionReason) modalDeductionReason.value = '';
    if (modalNetSalary) modalNetSalary.textContent = `$${(dailyRate * 6).toFixed(2)}`;
    
    const salaryModal = document.getElementById('salaryModal');
    if (salaryModal) salaryModal.style.display = 'flex';
};
