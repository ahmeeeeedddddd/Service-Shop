let db;
try {
    db = require('../database/db.js');
} catch (e) {
    console.error('Failed to load database:', e);
    alert('Database Error: ' + e.message + '\n\n' + e.stack);
}

let editingEmployeeId = null;

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
    const weeklyAmount = dailyRate * 6;
    const today = new Date().toISOString().split('T')[0];

    db.addExpense({
        description: `Weekly Salary: ${name} (${role})`,
        amount: weeklyAmount,
        category: 'Salaries',
        date: today
    });

    const successMsg = getCurrentLanguage() === 'en' 
        ? `Successfully added weekly salary ($${weeklyAmount.toFixed(2)}) for ${name} to expenses!`
        : `تم إضافة الراتب الأسبوعي (${weeklyAmount.toFixed(2)} ج.م) للموظف ${name} إلى المصاريف بنجاح!`;

    alert(successMsg);
};
