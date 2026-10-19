let db;
try { db = require('../database/db.js'); }
catch (e) { console.error('DB load error:', e); alert('Database Error: ' + e.message); }

let editingCustomerId = null;
let selectedCustomerIdForSearch = null;

document.addEventListener('DOMContentLoaded', () => {
    translatePage();
    initTabs();
    initAddCustomerForm();
    initSearchTab();
    initAllCustomersTab();
    initHistoryTab();
    initAddCarModal();

    // Set today as default
    document.getElementById('addCarRowBtn').click(); // add first car row
});

// ─── Tab Management ────────────────────────────────────────────────────────────
const tabs = ['tabAddCustomer','tabSearchCustomer','tabAllCustomers','tabCustomerHistory'];
const views = ['viewAddCustomer','viewSearchCustomer','viewAllCustomers','viewCustomerHistory'];

function initTabs() {
    tabs.forEach((tabId, i) => {
        const btn = document.getElementById(tabId);
        if (btn) btn.onclick = () => switchTab(i);
    });
    switchTab(0);
}

function switchTab(idx) {
    tabs.forEach((tabId, i) => {
        const btn = document.getElementById(tabId);
        if (!btn) return;
        btn.classList.toggle('btn-primary', i === idx);
        btn.classList.toggle('btn-outline', i !== idx);
    });
    views.forEach((viewId, i) => {
        const el = document.getElementById(viewId);
        if (el) el.style.display = i === idx ? 'block' : 'none';
    });
    if (idx === 2) loadAllCustomersTable();
    if (idx === 3) loadHistoryCustomers();
}

// ─── Car Rows (Add Customer Form) ─────────────────────────────────────────────
let carRows = [];

function addCarRow(carName = '', plate = '') {
    const container = document.getElementById('carRowsContainer');
    const rowId = Date.now() + Math.random();
    carRows.push(rowId);

    const div = document.createElement('div');
    div.id = `carRow_${rowId}`;
    div.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 36px;gap:0.5rem;margin-bottom:0.5rem;';
    div.innerHTML = `
        <input type="text" class="form-control car-name-input" placeholder="Toyota Camry 2022" value="${carName}">
        <input type="text" class="form-control car-plate-input" placeholder="ABC 1234" value="${plate}">
        <button class="btn btn-danger btn-sm" onclick="document.getElementById('carRow_${rowId}').remove()">×</button>
    `;
    container.appendChild(div);
}

document.getElementById('addCarRowBtn').onclick = () => addCarRow();

// ─── Add / Edit Customer ───────────────────────────────────────────────────────
function initAddCustomerForm() {
    const saveBtn = document.getElementById('saveCustomerBtn');
    const cancelBtn = document.getElementById('cancelEditBtn');

    saveBtn.onclick = () => {
        const name = document.getElementById('addName').value.trim();
        const phone = document.getElementById('addPhone').value.trim();
        if (!name) { alert(t('customerNameLabel') + ' required'); return; }

        // Collect cars from rows
        const carInputs = document.querySelectorAll('#carRowsContainer > div');

        if (editingCustomerId) {
            db.updateCustomer(editingCustomerId, { name, phone });
            // Update/add cars — simplified: delete old and re-add
            const existingCars = db.getCarsByCustomer(editingCustomerId);
            // Just update cars — for simplicity, we keep existing and handle additions
            carInputs.forEach(row => {
                const carName = row.querySelector('.car-name-input').value.trim();
                const plate = row.querySelector('.car-plate-input').value.trim();
                if (carName) {
                    const rowCarId = row.dataset.carId;
                    if (rowCarId) {
                        db.updateCar(parseInt(rowCarId), carName, plate);
                    } else {
                        db.addCar(editingCustomerId, carName, plate);
                    }
                }
            });
            alert(t('customerAdded').replace('saved', 'updated'));
            resetAddForm();
        } else {
            if (phone && db.getCustomerByPhone(phone)) {
                alert(t('duplicateCustomerError')); return;
            }
            const customerId = db.addCustomer({ name, phone });
            carInputs.forEach(row => {
                const carName = row.querySelector('.car-name-input').value.trim();
                const plate = row.querySelector('.car-plate-input').value.trim();
                if (carName) db.addCar(customerId, carName, plate);
            });
            alert(t('customerAdded'));
            resetAddForm();
        }
    };

    if (cancelBtn) {
        cancelBtn.onclick = () => {
            editingCustomerId = null;
            resetAddForm();
        };
    }
}

function resetAddForm() {
    editingCustomerId = null;
    document.getElementById('addName').value = '';
    document.getElementById('addPhone').value = '';
    document.getElementById('carRowsContainer').innerHTML = '';
    document.getElementById('cancelEditBtn').style.display = 'none';
    document.getElementById('saveCustomerBtn').setAttribute('data-i18n', 'saveCustomer');
    translatePage();
    addCarRow();
}

function editCustomer(id) {
    const cust = db.getCustomers().find(c => c.id === id);
    if (!cust) return;
    editingCustomerId = id;
    document.getElementById('addName').value = cust.name;
    document.getElementById('addPhone').value = cust.phone || '';
    document.getElementById('carRowsContainer').innerHTML = '';

    const cars = db.getCarsByCustomer(id);
    cars.forEach(car => {
        const container = document.getElementById('carRowsContainer');
        const rowId = Date.now() + Math.random();
        const div = document.createElement('div');
        div.id = `carRow_${rowId}`;
        div.dataset.carId = car.id;
        div.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 36px;gap:0.5rem;margin-bottom:0.5rem;';
        div.innerHTML = `
            <input type="text" class="form-control car-name-input" value="${car.car_name || ''}">
            <input type="text" class="form-control car-plate-input" value="${car.plate_number || ''}">
            <button class="btn btn-danger btn-sm" onclick="document.getElementById('carRow_${rowId}').remove()">×</button>
        `;
        container.appendChild(div);
    });
    if (cars.length === 0) addCarRow();

    document.getElementById('cancelEditBtn').style.display = 'inline-flex';
    document.getElementById('saveCustomerBtn').setAttribute('data-i18n', 'updateCustomer');
    translatePage();
    switchTab(0);
}

// ─── Search Tab ────────────────────────────────────────────────────────────────
function initSearchTab() {
    const searchInput = document.getElementById('customerSearch');
    const resultsDiv = document.getElementById('searchResults');

    searchInput.addEventListener('input', () => {
        const term = searchInput.value.trim();
        if (!term) { resultsDiv.classList.remove('active'); return; }
        const results = db.searchCustomers(term);
        resultsDiv.innerHTML = '';
        if (results.length === 0) {
            resultsDiv.innerHTML = `<div class="result-item" style="color:#64748b;">${t('noData')}</div>`;
        } else {
            results.forEach(c => {
                const cars = db.getCarsByCustomer(c.id);
                const div = document.createElement('div');
                div.className = 'result-item';
                div.innerHTML = `
                    <span class="result-name">${c.name}</span>
                    <span class="result-phone">${c.phone || ''}</span>
                    <span class="result-car">${cars.map(car => `${car.car_name || ''}${car.plate_number ? ' · ' + car.plate_number : ''}`).join(' | ')}</span>
                `;
                div.onclick = () => selectCustomerForSearch(c.id);
                resultsDiv.appendChild(div);
            });
        }
        resultsDiv.classList.add('active');
    });

    document.addEventListener('click', e => {
        if (!searchInput.contains(e.target) && !resultsDiv.contains(e.target)) {
            resultsDiv.classList.remove('active');
        }
    });
}

function selectCustomerForSearch(id) {
    selectedCustomerIdForSearch = id;
    const cust = db.getCustomers().find(c => c.id === id);
    if (!cust) return;

    document.getElementById('searchResults').classList.remove('active');
    document.getElementById('customerSearch').value = cust.name;

    document.getElementById('infoName').textContent = cust.name;
    document.getElementById('infoPhone').textContent = cust.phone || '';
    document.getElementById('customerInfoCard').style.display = 'block';

    const carsList = document.getElementById('infoCarsList');
    carsList.innerHTML = '';
    const cars = db.getCarsByCustomer(id);
    cars.forEach(car => {
        const p = document.createElement('div');
        p.style.cssText = 'padding:0.4rem 0.75rem;background:#f1f5f9;border-radius:6px;font-size:0.85rem;display:flex;justify-content:space-between;align-items:center;';
        p.innerHTML = `
            <span>🚗 <strong>${car.car_name || t('unknownCar')}</strong>${car.plate_number ? ' — ' + car.plate_number : ''}</span>
            <button class="btn btn-danger btn-sm" onclick="deleteCar(${car.id}, ${id})">×</button>
        `;
        carsList.appendChild(p);
    });

    // Show repairs
    const repairs = db.getRepairsByCustomer(id);
    document.getElementById('repairsHistorySection').style.display = repairs.length > 0 ? 'block' : 'none';
    const tbody = document.getElementById('repairsTableBody');
    tbody.innerHTML = '';
    repairs.forEach(r => {
        const tr = document.createElement('tr');
        const isDeleted = r.payment_method === 'Deleted';
        tr.innerHTML = `
            <td>${r.date || ''}</td>
            <td>${r.car_name || '—'}</td>
            <td>${isDeleted ? `<span class="badge badge-deleted">${t('deletedBill')}</span>` : (r.description || '—')}</td>
            <td class="${isDeleted ? 'text-red' : 'font-bold text-teal'}">${formatMoney(r.total_amount)}</td>
            <td>${getPaymentBadge(r.payment_method)}</td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('addAnotherCarBtn').onclick = () => {
        document.getElementById('modalCarName').value = '';
        document.getElementById('modalCarPlate').value = '';
        document.getElementById('addCarModal').classList.add('active');
    };

    document.getElementById('editCustomerFromSearchBtn').onclick = () => editCustomer(id);
}

window.deleteCar = function(carId, customerId) {
    if (!confirm(t('confirmDeleteCustomer').replace(' and all their cars', ''))) return;
    db.deleteCar(carId);
    selectCustomerForSearch(customerId);
};

// ─── All Customers Table ───────────────────────────────────────────────────────
function initAllCustomersTab() {}

function loadAllCustomersTable() {
    const customers = db.getCustomers();
    const tbody = document.getElementById('allCustomersTableBody');
    tbody.innerHTML = '';
    customers.forEach(c => {
        const cars = db.getCarsByCustomer(c.id);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="font-bold">${c.name}</td>
            <td>${c.phone || '—'}</td>
            <td>${cars.length} ${cars.length === 1 ? t('carRegisteredLabel') : t('carsRegisteredLabel')}</td>
            <td>
                <div class="flex gap-2">
                    <button class="btn btn-outline btn-sm" onclick="editCustomer(${c.id})">${t('edit')}</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteCustomer(${c.id})">${t('delete')}</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    if (customers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#64748b;">${t('noData')}</td></tr>`;
    }
}

window.deleteCustomer = function(id) {
    if (!confirm(t('confirmDeleteCustomer'))) return;
    db.deleteCustomer(id);
    loadAllCustomersTable();
};

// ─── Customer History Tab ──────────────────────────────────────────────────────
let historyCurrentCustomerId = null;

function initHistoryTab() {
    const historySearch = document.getElementById('historySearch');
    historySearch.addEventListener('input', () => loadHistoryCustomers(historySearch.value));

    document.getElementById('backToHistoryList').onclick = () => {
        document.getElementById('historyDetails').style.display = 'none';
        loadHistoryCustomers();
    };

    const carFilter = document.getElementById('historyCarFilter');
    carFilter.addEventListener('change', () => loadCustomerRepairsHistory(historyCurrentCustomerId));
}

function loadHistoryCustomers(term = '') {
    document.getElementById('historyDetails').style.display = 'none';
    const customers = term ? db.searchCustomers(term) : db.getCustomers();
    const listDiv = document.getElementById('historyCustomerList');
    listDiv.innerHTML = '';
    customers.forEach(c => {
        const repairs = db.getRepairsByCustomer(c.id);
        const cars = db.getCarsByCustomer(c.id);
        const div = document.createElement('div');
        div.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:0.75rem 1rem;border-radius:8px;cursor:pointer;border:1px solid #e2e8f0;margin-bottom:0.5rem;transition:background 0.15s;';
        div.onmouseover = () => div.style.background = '#f8fafc';
        div.onmouseout = () => div.style.background = 'white';
        div.innerHTML = `
            <div>
                <div style="font-weight:700;">${c.name}</div>
                <div style="font-size:0.8rem;color:#64748b;">${c.phone || ''} · ${cars.length} ${t('carsRegistered')}</div>
            </div>
            <div style="font-size:0.85rem;color:#0d9488;font-weight:600;">${repairs.length} repairs →</div>
        `;
        div.onclick = () => {
            historyCurrentCustomerId = c.id;
            document.getElementById('historyCustomerName').textContent = c.name;
            // Populate car filter
            const filter = document.getElementById('historyCarFilter');
            filter.innerHTML = `<option value="">${t('allCustomers')}</option>`;
            cars.forEach(car => {
                const opt = document.createElement('option');
                opt.value = car.id;
                opt.textContent = `${car.car_name || t('unknownCar')} ${car.plate_number ? '· ' + car.plate_number : ''}`;
                filter.appendChild(opt);
            });
            loadCustomerRepairsHistory(c.id);
            document.getElementById('historyDetails').style.display = 'block';
            listDiv.innerHTML = '';
        };
        listDiv.appendChild(div);
    });
}

function loadCustomerRepairsHistory(customerId) {
    let repairs = db.getRepairsByCustomer(customerId);
    const carFilter = document.getElementById('historyCarFilter');
    const selectedCarId = carFilter.value ? parseInt(carFilter.value) : null;
    if (selectedCarId) repairs = repairs.filter(r => r.car_id === selectedCarId);

    const tbody = document.getElementById('historyRepairsTableBody');
    tbody.innerHTML = '';
    repairs.forEach(r => {
        const isDeleted = r.payment_method === 'Deleted';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${r.date || ''}</td>
            <td>${r.car_name || '—'}</td>
            <td>${isDeleted ? `<span class="badge badge-deleted">${t('deletedBill')}</span>` : (r.description || '—')}</td>
            <td class="${isDeleted ? 'text-red' : 'font-bold text-teal'}">${formatMoney(r.total_amount)}</td>
            <td>${getPaymentBadge(r.payment_method)}</td>
        `;
        tbody.appendChild(tr);
    });
    if (repairs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#64748b;">${t('noData')}</td></tr>`;
    }
}

window.printCustomerHistory = function() {
    if (!historyCurrentCustomerId) return;
    const cust = db.getCustomers().find(c => c.id === historyCurrentCustomerId);
    let repairs = db.getRepairsByCustomer(historyCurrentCustomerId);
    const carFilter = document.getElementById('historyCarFilter');
    if (carFilter.value) repairs = repairs.filter(r => r.car_id === parseInt(carFilter.value));

    const rows = repairs.map(r => `
        <tr>
            <td style="border:1px solid #ddd;padding:6px;">${r.date || ''}</td>
            <td style="border:1px solid #ddd;padding:6px;">${r.car_name || '—'}</td>
            <td style="border:1px solid #ddd;padding:6px;">${r.description || '—'}</td>
            <td style="border:1px solid #ddd;padding:6px;text-align:center;">${formatMoney(r.total_amount)}</td>
            <td style="border:1px solid #ddd;padding:6px;text-align:center;">${getTranslatedPaymentMethod(r.payment_method)}</td>
        </tr>
    `).join('');

    const total = repairs.reduce((s, r) => s + (r.total_amount || 0), 0);

    document.getElementById('printArea').innerHTML = `
        <div style="font-family:Arial,sans-serif;direction:rtl;color:#000;">
            <h2 style="text-align:center;color:#0d9488;">الأنصاري لإصلاح الهياكل — سجل العميل</h2>
            <p style="text-align:center;margin:4px 0;">${cust ? cust.name : ''} | ${cust ? cust.phone || '' : ''}</p>
            <p style="text-align:center;font-size:0.85rem;color:#64748b;">طبع: ${new Date().toLocaleDateString('ar-EG')}</p>
            <table style="width:100%;border-collapse:collapse;margin-top:16px;">
                <thead>
                    <tr style="background:#f1f5f9;">
                        <th style="border:1px solid #ddd;padding:8px;">التاريخ</th>
                        <th style="border:1px solid #ddd;padding:8px;">السيارة</th>
                        <th style="border:1px solid #ddd;padding:8px;">الوصف</th>
                        <th style="border:1px solid #ddd;padding:8px;">المبلغ</th>
                        <th style="border:1px solid #ddd;padding:8px;">الدفع</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
                <tfoot>
                    <tr style="background:#0d9488;color:white;">
                        <td colspan="3" style="border:1px solid #ddd;padding:8px;font-weight:bold;text-align:right;">الإجمالي</td>
                        <td style="border:1px solid #ddd;padding:8px;font-weight:bold;text-align:center;">${formatMoney(total)} ج.م</td>
                        <td style="border:1px solid #ddd;padding:8px;"></td>
                    </tr>
                </tfoot>
            </table>
        </div>
    `;
    window.print();
};

// ─── Add Car Modal (from search tab) ──────────────────────────────────────────
function initAddCarModal() {
    document.getElementById('saveAddCarBtn').onclick = () => {
        const carName = document.getElementById('modalCarName').value.trim();
        const plate = document.getElementById('modalCarPlate').value.trim();
        if (!carName) return;
        if (!selectedCustomerIdForSearch) return;
        db.addCar(selectedCustomerIdForSearch, carName, plate);
        document.getElementById('addCarModal').classList.remove('active');
        selectCustomerForSearch(selectedCustomerIdForSearch);
    };
    document.getElementById('cancelAddCarBtn').onclick = () => document.getElementById('addCarModal').classList.remove('active');
    document.getElementById('addCarModal').addEventListener('click', e => {
        if (e.target === document.getElementById('addCarModal')) document.getElementById('addCarModal').classList.remove('active');
    });
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatMoney(v) { return (parseFloat(v) || 0).toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function getPaymentBadge(method) {
    if (!method) return '—';
    if (method === 'Deleted') return `<span class="badge badge-deleted">${t('deletedBill')}</span>`;
    if (method === 'Cash') return `<span class="badge badge-cash">${t('cash')}</span>`;
    return `<span class="badge badge-card">${getTranslatedPaymentMethod(method)}</span>`;
}
