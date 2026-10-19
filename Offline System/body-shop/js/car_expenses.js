let db;
try { db = require('../database/db.js'); }
catch (e) { console.error('DB load error:', e); alert('Database Error: ' + e.message); }

let editingCarExpId = null;
let selectedCustomerId = null;
let selectedCarId = null;
let otherPurchasesCount = 0;
let currentBreakdownId = null;

document.addEventListener('DOMContentLoaded', () => {
    translatePage();
    loadCarExpenses();
    
    document.getElementById('newCarExpenseBtn').onclick = openAddModal;
    document.getElementById('closeCarExpModal').onclick = closeAddModal;
    document.getElementById('cancelCarExpBtn').onclick = closeAddModal;
    document.getElementById('saveCarExpenseBtn').onclick = saveCarExpense;
    
    document.getElementById('addOtherPurchaseBtn').onclick = addOtherPurchaseRow;
    
    document.getElementById('closeBreakdownBtn').onclick = () => document.getElementById('breakdownModal').classList.remove('active');
    document.getElementById('printBreakdownBtn').onclick = printBreakdown;
    
    initCustomerSearch();
    
    // Auto calculate totals on input
    const inputs = document.querySelectorAll('#carExpenseModal input[type="number"]');
    inputs.forEach(inp => inp.addEventListener('input', calculateTotal));
    
    setupStockAutoPrices();
});

const STOCK_MAT_MAP = [
    { amtId: 'matPuttyAmt',   costId: 'matPuttyCost',   key: 'putty',     keys: ['ستوك', 'معجون', 'putty', 'puttystock', 'putty stock'] },
    { amtId: 'matFiberAmt',   costId: 'matFiberCost',   key: 'fiber',     keys: ['فيبر', 'فيبرجلاس', 'فيبر جلاس', 'fiber', 'fibre'] },
    { amtId: 'matFillerAmt',  costId: 'matFillerCost',  key: 'filler',    keys: ['فيلر', 'فيلر 1ك', 'فيلر 2ك', 'filler'] },
    { amtId: 'matVarnishAmt', costId: 'matVarnishCost', key: 'varnish',   keys: ['ورنيش', 'ورنيش شفاف', 'varnish'] }
];

function findPartByKeys(allParts, keys) {
    if (!allParts || !Array.isArray(allParts)) return null;
    return allParts.find(p => {
        if (!p || !p.name) return false;
        const nameLower = p.name.toLowerCase().trim();
        return keys.some(k => {
            const keyLower = k.toLowerCase().trim();
            return nameLower === keyLower || nameLower.includes(keyLower) || keyLower.includes(nameLower);
        });
    });
}

function setupStockAutoPrices() {
    const allParts = db.getParts();
    STOCK_MAT_MAP.forEach(item => {
        const amtInput = document.getElementById(item.amtId);
        const costInput = document.getElementById(item.costId);
        const hintEl = document.getElementById('hint_' + item.amtId);
        
        if (!amtInput || !costInput) return;
        
        const part = findPartByKeys(allParts, item.keys);
        const unitPrice = part ? (part.unit_price || 0) : 0;
        
        const updateHintAndCost = () => {
            const qty = parseFloat(amtInput.value) || 0;
            const itemTotal = qty * unitPrice;
            costInput.value = itemTotal.toFixed(2);
            
            if (hintEl) {
                if (unitPrice > 0) {
                    hintEl.innerHTML = `(${unitPrice.toFixed(2)} ج.م/وحدة)` + (qty > 0 ? ` <span style="color:#16a34a;font-weight:700;">= ${itemTotal.toFixed(2)} ج.م</span>` : '');
                } else {
                    hintEl.innerHTML = '<span style="color:#ef4444;font-weight:normal;">(غير مسجل بالمخزون)</span>';
                }
            }
        };
        
        amtInput.oninput = () => {
            updateHintAndCost();
            calculateTotal();
        };
        
        updateHintAndCost();
    });
}

function loadCarExpenses() {
    const exps = db.getCarExpenses();
    const tbody = document.getElementById('carExpensesTableBody');
    tbody.innerHTML = '';
    
    exps.forEach(e => {
        const cust = e.customer_id ? db.getCustomers().find(c => c.id === e.customer_id) : null;
        const carInfoText = e.car_info || e.car_type || '—';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${e.date || ''}</td>
            <td class="font-bold">${cust ? cust.name : '—'} ${cust && cust.phone ? `<span style="font-size:0.8rem;color:#64748b;font-weight:normal;">(${cust.phone})</span>` : ''}</td>
            <td>${carInfoText}</td>
            <td class="font-bold text-teal">${(e.total_cost || 0).toFixed(2)} EGP</td>
            <td>
                <div class="flex gap-2">
                    <button class="btn btn-outline btn-sm" onclick="viewBreakdown(${e.id})">👁️ ${t('viewBreakdown')}</button>
                    <button class="btn btn-outline btn-sm" onclick="editCarExpense(${e.id})">✏️ ${t('edit')}</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteCarExpense(${e.id})">🗑️</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    if (exps.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#64748b;">${t('noData')}</td></tr>`;
    }
}

function initCustomerSearch() {
    const searchInput = document.getElementById('ceCustomerSearch');
    const resultsDiv = document.getElementById('ceSearchResults');

    searchInput.addEventListener('input', () => {
        const term = searchInput.value.trim();
        if (!term) { 
            resultsDiv.classList.remove('active'); 
            selectedCustomerId = null; 
            document.getElementById('ceCarSelectGroup').style.display = 'none';
            return; 
        }
        
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
                    <span class="result-car">${cars.length} ${t('carsRegistered')}</span>
                `;
                div.onclick = () => selectCustomerForCarExp(c);
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

function selectCustomerForCarExp(customer) {
    selectedCustomerId = customer.id;
    document.getElementById('ceCustomerSearch').value = `${customer.name} ${customer.phone ? '(' + customer.phone + ')' : ''}`;
    document.getElementById('ceSearchResults').classList.remove('active');
    
    const cars = db.getCarsByCustomer(customer.id);
    const carSelectGroup = document.getElementById('ceCarSelectGroup');
    const carSelect = document.getElementById('ceCarSelect');
    carSelect.innerHTML = '';
    
    if (cars.length > 0) {
        carSelectGroup.style.display = 'block';
        cars.forEach((car) => {
            const opt = document.createElement('option');
            opt.value = car.id;
            const carText = `${car.car_name || t('unknownCar')} ${car.plate_number ? '· ' + car.plate_number : ''}`;
            opt.textContent = carText;
            opt.dataset.carInfo = carText;
            carSelect.appendChild(opt);
        });
        
        const firstCarText = `${cars[0].car_name || ''} ${cars[0].plate_number ? '· ' + cars[0].plate_number : ''}`.trim();
        document.getElementById('ceCarType').value = firstCarText;
        selectedCarId = cars[0].id;
        
        carSelect.onchange = () => {
            const selOpt = carSelect.options[carSelect.selectedIndex];
            document.getElementById('ceCarType').value = selOpt.dataset.carInfo;
            selectedCarId = parseInt(selOpt.value);
        };
    } else {
        carSelectGroup.style.display = 'none';
        selectedCarId = null;
    }
}

function openAddModal() {
    editingCarExpId = null;
    selectedCustomerId = null;
    selectedCarId = null;
    
    document.getElementById('carExpModalTitle').textContent = t('addCarExpense');
    document.getElementById('ceDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('ceCustomerSearch').value = '';
    document.getElementById('ceCarType').value = '';
    document.getElementById('ceCarSelectGroup').style.display = 'none';
    
    document.querySelectorAll('#carExpenseModal input[type="number"]').forEach(inp => inp.value = '0');
    document.getElementById('otherPurchasesContainer').innerHTML = '';
    otherPurchasesCount = 0;
    
    calculateTotal();
    setupStockAutoPrices();
    document.getElementById('carExpenseModal').classList.add('active');
}

function closeAddModal() {
    document.getElementById('carExpenseModal').classList.remove('active');
}

function addOtherPurchaseRow(name = '', cost = 0) {
    const container = document.getElementById('otherPurchasesContainer');
    const id = `op_${otherPurchasesCount++}`;
    
    const div = document.createElement('div');
    div.className = 'other-purchase-row';
    div.id = id;
    
    div.innerHTML = `
        <input type="text" class="form-control op-name" placeholder="${t('itemName')}" value="${name}">
        <div></div>
        <input type="number" class="form-control op-cost" placeholder="EGP" value="${cost}" min="0" step="0.01">
        <button class="btn btn-danger btn-sm" onclick="document.getElementById('${id}').remove(); calculateTotal();">×</button>
    `;
    
    div.querySelector('.op-cost').addEventListener('input', calculateTotal);
    container.appendChild(div);
}

function calculateTotal() {
    let total = 0;
    
    const ids = [
        'matBodyWork', 'matPuttyCost', 'matFiberCost', 'matFillerCost', 
        'matPaintCost', 'matVarnishCost', 'matBooth'
    ];
    
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const val = parseFloat(el.value) || 0;
            total += val;
        }
    });
    
    document.querySelectorAll('.op-cost').forEach(inp => {
        total += (parseFloat(inp.value) || 0);
    });
    
    document.getElementById('ceTotalDisplay').textContent = total.toFixed(2) + ' EGP';
    return total;
}

function saveCarExpense() {
    const total = calculateTotal();
    const carType = document.getElementById('ceCarType').value.trim();
    if (!carType) return alert(t('carType') + ' required.');
    
    const materialsJson = {
        body_work: parseFloat(document.getElementById('matBodyWork').value) || 0,
        putty: {
            qty: parseFloat(document.getElementById('matPuttyAmt').value) || 0,
            cost: parseFloat(document.getElementById('matPuttyCost').value) || 0
        },
        fiber: {
            qty: parseFloat(document.getElementById('matFiberAmt').value) || 0,
            cost: parseFloat(document.getElementById('matFiberCost').value) || 0
        },
        filler: {
            qty: parseFloat(document.getElementById('matFillerAmt').value) || 0,
            cost: parseFloat(document.getElementById('matFillerCost').value) || 0
        },
        paint: {
            qty: 0,
            cost: parseFloat(document.getElementById('matPaintCost').value) || 0
        },
        varnish: {
            qty: parseFloat(document.getElementById('matVarnishAmt').value) || 0,
            cost: parseFloat(document.getElementById('matVarnishCost').value) || 0
        },
        paint_booth: parseFloat(document.getElementById('matBooth').value) || 0,
        other_purchases: []
    };
    
    document.querySelectorAll('.other-purchase-row').forEach(row => {
        const name = row.querySelector('.op-name').value.trim();
        const cost = parseFloat(row.querySelector('.op-cost').value) || 0;
        if (name || cost > 0) {
            materialsJson.other_purchases.push({ name, cost });
        }
    });
    
    const data = {
        customer_id: selectedCustomerId,
        car_id: selectedCarId,
        car_info: carType,
        date: document.getElementById('ceDate').value,
        total_cost: total,
        details_json: JSON.stringify(materialsJson)
    };
    
    if (editingCarExpId) {
        db.updateCarExpense(editingCarExpId, data);
    } else {
        db.addCarExpense(data);
    }
    
    // Deduct stock for materials recorded in car expenses
    deductMaterialsFromStock(materialsJson);
    
    closeAddModal();
    loadCarExpenses();
}

function deductMaterialsFromStock(mats) {
    const allParts = db.getParts();
    const deducted = [];
    
    STOCK_MAT_MAP.forEach(item => {
        const matData = mats[item.key];
        const qty = matData ? (matData.qty || 0) : 0;
        if (qty <= 0) return;
        
        const part = findPartByKeys(allParts, item.keys);
        if (part) {
            db.deductPartStock(part.id, qty);
            deducted.push(`${part.name}: -${qty}`);
        }
    });

    if (mats.other_purchases && Array.isArray(mats.other_purchases)) {
        mats.other_purchases.forEach(op => {
            if (!op.name) return;
            const part = findPartByKeys(allParts, [op.name]);
            if (part) {
                db.deductPartStock(part.id, 1);
                deducted.push(`${part.name}: -1`);
            }
        });
    }
    
    if (deducted.length > 0) {
        console.log('Stock deducted:', deducted.join(', '));
    }
}

window.editCarExpense = function(id) {
    const exp = db.getCarExpenses().find(e => e.id === id);
    if (!exp) return;
    
    editingCarExpId = id;
    selectedCustomerId = exp.customer_id;
    selectedCarId = exp.car_id;
    
    document.getElementById('carExpModalTitle').textContent = t('updateCarExpense');
    document.getElementById('ceDate').value = exp.date;
    document.getElementById('ceCarType').value = exp.car_info || exp.car_type || '';
    
    if (exp.customer_id) {
        const cust = db.getCustomers().find(c => c.id === exp.customer_id);
        document.getElementById('ceCustomerSearch').value = cust ? `${cust.name} ${cust.phone ? '(' + cust.phone + ')' : ''}` : '';
    } else {
        document.getElementById('ceCustomerSearch').value = '';
    }
    
    let mats = {};
    const rawJson = exp.details_json || exp.materials_json || '{}';
    try { mats = JSON.parse(rawJson); } catch(e){}
    
    document.getElementById('matBodyWork').value = mats.body_work || 0;
    
    const setMat = (key, prefix) => {
        if (mats[key]) {
            document.getElementById(prefix + 'Amt').value = mats[key].qty || 0;
            document.getElementById(prefix + 'Cost').value = mats[key].cost || 0;
        } else {
            document.getElementById(prefix + 'Amt').value = '0';
            document.getElementById(prefix + 'Cost').value = '0';
        }
    };
    
    setMat('putty', 'matPutty');
    setMat('fiber', 'matFiber');
    setMat('filler', 'matFiller');
    document.getElementById('matPaintCost').value = (mats.paint ? mats.paint.cost : 0) || 0;
    setMat('varnish', 'matVarnish');
    
    document.getElementById('matBooth').value = mats.paint_booth || 0;
    
    document.getElementById('otherPurchasesContainer').innerHTML = '';
    otherPurchasesCount = 0;
    if (mats.other_purchases && Array.isArray(mats.other_purchases)) {
        mats.other_purchases.forEach(op => addOtherPurchaseRow(op.name, op.cost));
    }
    
    calculateTotal();
    setupStockAutoPrices();
    document.getElementById('carExpenseModal').classList.add('active');
};

window.deleteCarExpense = function(id) {
    if (!confirm(t('confirmDeleteCarExpense'))) return;
    db.deleteCarExpense(id);
    loadCarExpenses();
};

window.viewBreakdown = function(id) {
    currentBreakdownId = id;
    const exp = db.getCarExpenses().find(e => e.id === id);
    if (!exp) return;
    
    const cust = exp.customer_id ? db.getCustomers().find(c => c.id === exp.customer_id) : null;
    const carInfoText = exp.car_info || exp.car_type || '—';
    
    document.getElementById('breakdownTitle').textContent = t('carExpensesTitle') + ' — ' + carInfoText;
    
    let mats = {};
    const rawJson = exp.details_json || exp.materials_json || '{}';
    try { mats = JSON.parse(rawJson); } catch(e){}
    
    let html = `
        <div style="font-family:'Cairo',Arial,sans-serif; direction:rtl; color:#1e293b;">
            <!-- Main Header without expense ID number -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #eab308; padding-bottom: 1rem; margin-bottom: 1rem; direction: ltr;">
                <div style="flex: 1; text-align: left; font-weight: bold; color: #475569; font-size: 0.85rem; line-height: 1.6; direction: rtl;">
                    مصاريف وخامات سمكرة ودهان<br>
                    تقرير تكاليف السيارة
                </div>
                <div style="flex: 1; text-align: center;">
                    <img src="../assets/logo.png" style="max-height: 100px; max-width: 100%; object-fit: contain;" alt="El Ansary" onerror="this.style.display='none';">
                    <div style="font-size: 1.2rem; font-weight: 800; color: #1e293b; margin-top: 5px;">تقرير مصاريف خامات سيارة</div>
                </div>
                <div style="flex: 1; text-align: right; font-weight: bold; color: #475569; font-size: 1.1rem; direction: rtl;">
                    مركز الأنصاري لإصلاح الهياكل
                </div>
            </div>

            <!-- Customer & Car Yellow Info Box -->
            <div style="display: flex; justify-content: space-between; margin-bottom: 1.25rem; background: #fefce8; padding: 0.85rem 1.25rem; border-radius: 8px; border: 1.5px solid #fde047; font-size: 0.95rem;">
                <div>
                    <p style="margin: 0.25rem 0;"><strong>اسم العميل:</strong> ${cust ? cust.name : '—'}</p>
                    <p style="margin: 0.25rem 0;"><strong>الهاتف:</strong> ${cust && cust.phone ? cust.phone : '—'}</p>
                </div>
                <div style="text-align: left; direction: ltr;">
                    <p style="margin: 0.25rem 0;"><strong>${exp.date || ''} :التاريخ</strong></p>
                    <p style="margin: 0.25rem 0;"><strong>${carInfoText} :السيارة / الموديل</strong></p>
                </div>
            </div>
            
            <!-- Main Subjects Breakdown Table with Yellow Header -->
            <table style="width:100%; border-collapse:collapse; margin-bottom: 1rem;">
                <thead>
                    <tr style="background: #fef08a; border-bottom: 2px solid #ca8a04; color: #713f12;">
                        <th style="padding: 0.65rem 0.85rem; text-align: right; font-weight: 800; font-size: 0.95rem;">البند الرئيسي / خامة الإصلاح</th>
                        <th style="padding: 0.65rem 0.85rem; text-align: center; font-weight: 800; font-size: 0.95rem; width: 130px;">الكمية المستخدمة</th>
                        <th style="padding: 0.65rem 0.85rem; text-align: center; font-weight: 800; font-size: 0.95rem; width: 140px;">التكلفة (ج.م)</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    const addSubjectRow = (label, qty, cost, isHighlighted=false) => {
        if (!cost && !qty) return;
        html += `
            <tr style="border-bottom: 1px solid #f3f4f6; ${isHighlighted ? 'background:#fefce8;' : ''}">
                <td style="padding: 0.65rem 0.85rem; font-weight: 700; color: ${isHighlighted ? '#854d0e' : '#1e293b'};">
                    <span style="display:inline-block; width:10px; height:10px; background:#eab308; border-radius:50%; margin-left:8px;"></span>
                    ${label}
                </td>
                <td style="padding: 0.65rem 0.85rem; text-align: center; font-weight: 600;">${qty || '—'}</td>
                <td style="padding: 0.65rem 0.85rem; text-align: center; font-weight: 800; color: #ca8a04;">${parseFloat(cost).toFixed(2)}</td>
            </tr>
        `;
    };
    
    if (mats.body_work) addSubjectRow('🛠️ مصنعية السمكرة (Body Work Labor)', null, mats.body_work, true);
    if (mats.putty && (mats.putty.cost || mats.putty.qty)) addSubjectRow('🟡 ستوك / معجون (Putty Stock)', mats.putty.qty, mats.putty.cost);
    if (mats.fiber && (mats.fiber.cost || mats.fiber.qty)) addSubjectRow('🟡 فيبر (Fiber)', mats.fiber.qty, mats.fiber.cost);
    if (mats.filler && (mats.filler.cost || mats.filler.qty)) addSubjectRow('🟡 فيلر (Filler)', mats.filler.qty, mats.filler.cost);
    if (mats.paint && mats.paint.cost) addSubjectRow('🟡 بويا (Paint)', null, mats.paint.cost);
    if (mats.varnish && (mats.varnish.cost || mats.varnish.qty)) addSubjectRow('🟡 ورنيش (Varnish)', mats.varnish.qty, mats.varnish.cost);
    if (mats.paint_booth) addSubjectRow('🚪 كبينة الدهان (Paint Booth)', null, mats.paint_booth, true);
    
    if (mats.other_purchases && mats.other_purchases.length > 0) {
        mats.other_purchases.forEach(op => addSubjectRow('📦 ' + (op.name || 'مشتريات خامات أخرى'), null, op.cost));
    }
    
    html += `
                </tbody>
            </table>
            
            <!-- Total Gold Summary Box -->
            <div style="background: linear-gradient(135deg, #eab308, #ca8a04); color: white; border-radius: 8px; padding: 0.85rem 1.25rem; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 12px rgba(234, 179, 8, 0.3);">
                <span style="font-weight: 800; font-size: 1.1rem;">إجمالي تكلفة الخامات والمصنعية</span>
                <span style="font-size: 1.4rem; font-weight: 900;">${(exp.total_cost || 0).toFixed(2)} ج.م</span>
            </div>

            <!-- Footer Section -->
            <div style="margin-top: 3rem; display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 1rem;">
                <div style="font-size: 0.85rem; color: #64748b;">
                    <p style="margin:0 0 4px 0;"><strong>للتواصل:</strong></p>
                    <p style="margin:0;">01010103777</p>
                    <p style="margin:0;">01010606016</p>
                </div>
                <div style="display: flex; gap: 3rem; justify-content: flex-end;">
                    <div style="text-align: center;">
                        <p style="margin:0; font-weight:bold;">توقيع المحاسب</p>
                        <div style="margin-top: 2rem; border-bottom: 1px solid #94a3b8; width: 140px; display: inline-block;"></div>
                    </div>
                    <div style="text-align: center;">
                        <p style="margin:0; font-weight:bold;">توقيع الفني / المهندس</p>
                        <div style="margin-top: 2rem; border-bottom: 1px solid #94a3b8; width: 140px; display: inline-block;"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('breakdownContent').innerHTML = html;
    document.getElementById('breakdownModal').classList.add('active');
};

function printBreakdown() {
    const content = document.getElementById('breakdownContent').innerHTML;
    document.getElementById('printArea').innerHTML = `
        <div style="font-family:'Cairo',Arial,sans-serif; direction:rtl; color:#000; padding:20px;">
            ${content}
        </div>
    `;
    window.print();
}
