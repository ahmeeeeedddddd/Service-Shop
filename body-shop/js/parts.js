let db;
try { db = require('../database/db.js'); }
catch (e) { console.error('DB load error:', e); alert('Database Error: ' + e.message); }

let editingPartId = null;

document.addEventListener('DOMContentLoaded', () => {
    translatePage();
    loadSuppliersDropdown();
    loadParts();
    
    document.getElementById('savePartBtn').onclick = savePart;
    document.getElementById('cancelPartBtn').onclick = resetForm;
    document.getElementById('printInventoryBtn').onclick = printInventory;
    
    document.getElementById('partsSearch').addEventListener('input', () => loadParts(document.getElementById('partsSearch').value));
});

function loadSuppliersDropdown() {
    const sel = document.getElementById('partSupplier');
    sel.innerHTML = '<option value="">— None —</option>';
    const suppliers = db.getSuppliers();
    suppliers.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.name;
        sel.appendChild(opt);
    });
}

function loadParts(searchStr = '') {
    let parts = db.getParts();
    if (searchStr) {
        const term = searchStr.toLowerCase();
        parts = parts.filter(p => p.name.toLowerCase().includes(term));
    }
    
    const suppliers = db.getSuppliers();
    const tbody = document.getElementById('partsTableBody');
    tbody.innerHTML = '';
    
    parts.forEach(p => {
        const qty = p.quantity_in_stock !== undefined ? p.quantity_in_stock : 0;
        const price = p.unit_price !== undefined ? p.unit_price : 0;
        
        const tr = document.createElement('tr');
        
        let supplierOptions = `<option value="">—</option>`;
        suppliers.forEach(s => {
            supplierOptions += `<option value="${s.id}" ${p.supplier_id === s.id ? 'selected' : ''}>${s.name}</option>`;
        });
        
        tr.innerHTML = `
            <td class="font-bold">${p.name}</td>
            <td>
                <input type="number" class="inline-input ${qty <= 2 ? 'text-red font-bold' : ''}" value="${qty}" min="0" step="0.5" onchange="updatePartStockInline(${p.id}, this.value)">
            </td>
            <td>
                <input type="number" class="inline-input text-teal font-bold" value="${price}" min="0" step="0.01" onchange="updatePartPriceInline(${p.id}, this.value)">
            </td>
            <td>
                <select class="inline-select" onchange="updatePartSupplierInline(${p.id}, this.value)">
                    ${supplierOptions}
                </select>
            </td>
            <td>
                <div class="flex gap-2">
                    <button class="btn btn-outline btn-sm" onclick="editPart(${p.id})">${t('edit')}</button>
                    <button class="btn btn-danger btn-sm" onclick="deletePart(${p.id})">${t('delete')}</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    if (parts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#64748b;">${t('noData')}</td></tr>`;
    }
}

function savePart() {
    const name = document.getElementById('partName').value.trim();
    if (!name) { alert(t('partName') + ' required.'); return; }
    
    const qty = parseFloat(document.getElementById('partQty').value) || 0;
    const price = parseFloat(document.getElementById('partPrice').value) || 0;
    const supplierId = document.getElementById('partSupplier').value ? parseInt(document.getElementById('partSupplier').value) : null;
    
    const data = { name, quantity_in_stock: qty, unit_price: price, supplier_id: supplierId };
    
    if (editingPartId) {
        db.updatePart(editingPartId, data);
    } else {
        db.addPart(data);
    }
    
    resetForm();
    loadParts();
}

function resetForm() {
    editingPartId = null;
    document.getElementById('partName').value = '';
    document.getElementById('partQty').value = '0';
    document.getElementById('partPrice').value = '0';
    document.getElementById('partSupplier').value = '';
    
    document.getElementById('partFormTitle').textContent = t('addPart');
    document.getElementById('savePartBtn').innerHTML = t('savePart');
    document.getElementById('cancelPartBtn').style.display = 'none';
}

window.editPart = function(id) {
    const part = db.getParts().find(p => p.id === id);
    if (!part) return;
    
    editingPartId = id;
    document.getElementById('partName').value = part.name;
    document.getElementById('partQty').value = part.quantity_in_stock !== undefined ? part.quantity_in_stock : 0;
    document.getElementById('partPrice').value = part.unit_price !== undefined ? part.unit_price : 0;
    document.getElementById('partSupplier').value = part.supplier_id || '';
    
    document.getElementById('partFormTitle').textContent = t('edit');
    document.getElementById('savePartBtn').innerHTML = t('save');
    document.getElementById('cancelPartBtn').style.display = 'inline-flex';
};

window.deletePart = function(id) {
    if (!confirm(t('confirmDeletePart'))) return;
    db.deletePart(id);
    loadParts();
};

window.updatePartStockInline = function(id, val) {
    const part = db.getParts().find(p => p.id === id);
    if (part) {
        db.updatePart(id, { name: part.name, quantity_in_stock: parseFloat(val) || 0, unit_price: part.unit_price || 0, supplier_id: part.supplier_id });
        loadParts(document.getElementById('partsSearch').value);
    }
};

window.updatePartPriceInline = function(id, val) {
    const part = db.getParts().find(p => p.id === id);
    if (part) {
        db.updatePart(id, { name: part.name, quantity_in_stock: part.quantity_in_stock || 0, unit_price: parseFloat(val) || 0, supplier_id: part.supplier_id });
    }
};

window.updatePartSupplierInline = function(id, val) {
    const part = db.getParts().find(p => p.id === id);
    if (part) {
        db.updatePart(id, { name: part.name, quantity_in_stock: part.quantity_in_stock || 0, unit_price: part.unit_price || 0, supplier_id: val ? parseInt(val) : null });
    }
};

function printInventory() {
    const parts = db.getParts();
    const suppliers = db.getSuppliers();
    const supplierMap = {};
    suppliers.forEach(s => supplierMap[s.id] = s.name);
    
    let totalValue = 0;
    
    const rows = parts.map(p => {
        const qty = p.quantity_in_stock !== undefined ? p.quantity_in_stock : 0;
        const price = p.unit_price !== undefined ? p.unit_price : 0;
        const val = qty * price;
        totalValue += val;
        return `
            <tr>
                <td style="border:1px solid #ddd;padding:6px;">${p.name}</td>
                <td style="border:1px solid #ddd;padding:6px;text-align:center;">${qty}</td>
                <td style="border:1px solid #ddd;padding:6px;text-align:center;">${price.toFixed(2)}</td>
                <td style="border:1px solid #ddd;padding:6px;">${p.supplier_id ? supplierMap[p.supplier_id] : '—'}</td>
                <td style="border:1px solid #ddd;padding:6px;text-align:center;">${val.toFixed(2)}</td>
            </tr>
        `;
    }).join('');
    
    document.getElementById('printArea').innerHTML = `
        <div style="font-family:Arial,sans-serif;direction:rtl;color:#000;">
            <h2 style="text-align:center;color:#0d9488;">الأنصاري لإصلاح الهياكل — جرد المخزون</h2>
            <p style="text-align:center;margin:4px 0;">طبع: ${new Date().toLocaleDateString('ar-EG')}</p>
            <table style="width:100%;border-collapse:collapse;margin-top:16px;">
                <thead>
                    <tr style="background:#f1f5f9;">
                        <th style="border:1px solid #ddd;padding:8px;">الصنف</th>
                        <th style="border:1px solid #ddd;padding:8px;">الكمية</th>
                        <th style="border:1px solid #ddd;padding:8px;">السعر</th>
                        <th style="border:1px solid #ddd;padding:8px;">المورد</th>
                        <th style="border:1px solid #ddd;padding:8px;">إجمالي القيمة</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
                <tfoot>
                    <tr style="background:#0d9488;color:white;">
                        <td colspan="4" style="border:1px solid #ddd;padding:8px;font-weight:bold;text-align:right;">قيمة المخزون الإجمالية</td>
                        <td style="border:1px solid #ddd;padding:8px;font-weight:bold;text-align:center;">${totalValue.toFixed(2)} ج.م</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    `;
    window.print();
}
