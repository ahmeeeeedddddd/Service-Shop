let db;
try {
    db = require('../database/db.js');
} catch (e) {
    console.error('Failed to load database:', e);
    alert('Database Error: Could not connect to the database.');
}

document.addEventListener('DOMContentLoaded', () => {
    const pendingBillsBody = document.getElementById('pendingBillsBody');
    const pendingCountEl = document.getElementById('pendingCount');
    const pendingTotalEl = document.getElementById('pendingTotal');
    const todayPendingEl = document.getElementById('todayPending');
    const searchInput = document.getElementById('searchInput');
    const detailModal = document.getElementById('detailModal');
    const detailTitle = document.getElementById('detailTitle');
    const detailContent = document.getElementById('detailContent');
    const closeDetailBtn = document.getElementById('closeDetailBtn');
    const deleteFromModalBtn = document.getElementById('deleteFromModalBtn');
    const processFromModalBtn = document.getElementById('processFromModalBtn');

    let allBills = [];
    let currentBillId = null;

    const now = new Date();
    const today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

    function loadBills() {
        allBills = db.getPendingBills();
        applyFilter();
    }

    function applyFilter() {
        const term = searchInput.value.toLowerCase();
        const filtered = term
            ? allBills.filter(b => b.customer_name.toLowerCase().includes(term))
            : allBills;

        const total = filtered.reduce((s, b) => s + b.total_amount, 0);
        const todayCount = filtered.filter(b => b.date_created === today).length;

        pendingCountEl.textContent = filtered.length;
        pendingTotalEl.textContent = `$${total.toFixed(2)}`;
        todayPendingEl.textContent = todayCount;

        pendingBillsBody.innerHTML = '';
        if (filtered.length === 0) {
            pendingBillsBody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:#94a3b8;">No pending bills</td></tr>';
            return;
        }

        filtered.forEach(bill => {
            const tr = document.createElement('tr');
            tr.style.cursor = 'pointer';
            tr.innerHTML = `
                <td>${bill.date_created}</td>
                <td><span class="font-bold text-teal">${bill.customer_name}</span><br><small style="color:#94a3b8;">${bill.customer_phone}</small></td>
                <td>${bill.car_name}${bill.plate_number ? ' | ' + bill.plate_number : ''}</td>
                <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${bill.description}">${bill.description}</td>
                <td><span class="badge badge-cash">${bill.payment_method}</span></td>
                <td class="font-bold">$${parseFloat(bill.total_amount).toFixed(2)}</td>
                <td>
                    <div class="flex gap-2">
                        <button class="btn btn-outline btn-sm" onclick="openDetail(${bill.id})" style="padding:0.25rem 0.5rem;font-size:0.75rem;">View</button>
                        <button class="btn btn-primary btn-sm" onclick="processBill(${bill.id})" style="padding:0.25rem 0.5rem;font-size:0.75rem;">Process</button>
                        <button class="btn btn-outline btn-sm" onclick="deleteBill(${bill.id})" style="padding:0.25rem 0.5rem;font-size:0.75rem;color:#ef4444;border-color:#fee2e2;">Delete</button>
                    </div>
                </td>
            `;
            pendingBillsBody.appendChild(tr);
        });
    }

    window.openDetail = (id) => {
        currentBillId = id;
        const bill = allBills.find(b => b.id === id);
        if (!bill) return;

        const lines = JSON.parse(bill.line_items_json || '[]');

        detailTitle.textContent = `Pending Bill — ${bill.customer_name}`;
        detailContent.innerHTML = `
            <div style="display:flex;gap:2rem;margin-bottom:1.5rem;">
                <div>
                    <p><strong>Customer:</strong> ${bill.customer_name}</p>
                    <p><strong>Phone:</strong> ${bill.customer_phone}</p>
                    <p><strong>Car:</strong> ${bill.car_name}</p>
                    ${bill.plate_number ? `<p><strong>Plate:</strong> ${bill.plate_number}</p>` : ''}
                </div>
                <div>
                    <p><strong>Date Created:</strong> ${bill.date_created}</p>
                    <p><strong>Payment:</strong> ${bill.payment_method}</p>
                    ${bill.odometer ? `<p><strong>Odometer:</strong> ${bill.odometer}</p>` : ''}
                </div>
            </div>
            <table style="width:100%;border-collapse:collapse;">
                <thead>
                    <tr style="background:#f8fafc;border-bottom:2px solid #eee;">
                        <th style="padding:0.5rem;text-align:left;">Service / Part</th>
                        <th style="padding:0.5rem;text-align:center;">Qty</th>
                        <th style="padding:0.5rem;text-align:right;">Price</th>
                        <th style="padding:0.5rem;text-align:right;">Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    ${lines.map(l => `
                        <tr style="border-bottom:1px solid #eee;">
                            <td style="padding:0.5rem;">${l.name}</td>
                            <td style="padding:0.5rem;text-align:center;">${l.qty}</td>
                            <td style="padding:0.5rem;text-align:right;">$${parseFloat(l.price).toFixed(2)}</td>
                            <td style="padding:0.5rem;text-align:right;">$${parseFloat(l.total).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div style="text-align:right;margin-top:1rem;font-size:1.25rem;font-weight:700;color:#eab308;">
                Total: $${parseFloat(bill.total_amount).toFixed(2)}
            </div>
            ${bill.notes ? `<div style="margin-top:1rem;padding:0.75rem;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;"><strong>Notes:</strong><br>${bill.notes}</div>` : ''}
        `;

        detailModal.classList.add('active');
    };

    window.processBill = (id) => {
        const bill = db.getPendingBillById(id);
        if (!bill) return;
        if (!confirm(`Process bill for ${bill.customer_name}? This will move it to confirmed bills.`)) return;

        const lines = JSON.parse(bill.line_items_json || '[]');
        const now = new Date();
        const dateStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

        const repairId = db.addRepair({
            customer_id: bill.customer_id,
            description: bill.description,
            date: dateStr,
            total_amount: bill.total_amount,
            payment_method: bill.payment_method,
            odometer: bill.odometer,
            notes: bill.notes
        });

        lines.forEach(l => {
            db.addRepairItem({
                repair_id: repairId,
                item_name: l.name,
                quantity: l.qty,
                unit_price: l.price
            });
        });

        db.deletePendingBill(id);
        detailModal.classList.remove('active');
        currentBillId = null;
        alert('Bill processed successfully! It now appears in Bills History and Income.');
        loadBills();
    };

    window.deleteBill = (id) => {
        if (!confirm('Are you sure you want to delete this pending bill?')) return;
        db.deletePendingBill(id);
        loadBills();
    };

    closeDetailBtn.addEventListener('click', () => detailModal.classList.remove('active'));

    deleteFromModalBtn.addEventListener('click', () => {
        if (currentBillId) {
            window.deleteBill(currentBillId);
            detailModal.classList.remove('active');
        }
    });

    processFromModalBtn.addEventListener('click', () => {
        if (currentBillId) window.processBill(currentBillId);
    });

    // --- Edit Modal ---
    const editModal = document.getElementById('editModal');
    const editPaymentMethod = document.getElementById('editPaymentMethod');
    const editOdometer = document.getElementById('editOdometer');
    const editNotes = document.getElementById('editNotes');
    const editLineItemsBody = document.getElementById('editLineItemsBody');
    const addEditLineBtn = document.getElementById('addEditLineBtn');
    const closeEditBtn = document.getElementById('closeEditBtn');
    const saveEditBtn = document.getElementById('saveEditBtn');
    const editFromModalBtn = document.getElementById('editFromModalBtn');

    function addEditLineRow(name = '', qty = 1, price = 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="padding:0.25rem;"><input type="text" class="form-control" value="${name}" placeholder="Service / Part name"></td>
            <td style="padding:0.25rem;"><input type="number" class="form-control" value="${qty}" min="1" style="width:70px;"></td>
            <td style="padding:0.25rem;"><input type="number" class="form-control" value="${price}" min="0" step="0.01" style="width:100px;"></td>
            <td style="padding:0.25rem;"><button class="btn btn-outline" style="color:#ef4444;padding:0.2rem 0.5rem;" onclick="this.closest('tr').remove()">×</button></td>
        `;
        editLineItemsBody.appendChild(tr);
    }

    editFromModalBtn.addEventListener('click', () => {
        const bill = allBills.find(b => b.id === currentBillId);
        if (!bill) return;

        // Populate fields
        editPaymentMethod.value = bill.payment_method;
        editOdometer.value = bill.odometer || '';
        editNotes.value = bill.notes || '';
        editLineItemsBody.innerHTML = '';

        const lines = JSON.parse(bill.line_items_json || '[]');
        lines.forEach(l => addEditLineRow(l.name, l.qty, l.price));
        if (lines.length === 0) addEditLineRow();

        detailModal.classList.remove('active');
        editModal.classList.add('active');
    });

    addEditLineBtn.addEventListener('click', () => addEditLineRow());
    closeEditBtn.addEventListener('click', () => editModal.classList.remove('active'));

    saveEditBtn.addEventListener('click', () => {
        const rows = editLineItemsBody.querySelectorAll('tr');
        const lines = [];
        rows.forEach(row => {
            const inputs = row.querySelectorAll('input');
            const name = inputs[0].value.trim();
            const qty = parseFloat(inputs[1].value) || 1;
            const price = parseFloat(inputs[2].value) || 0;
            if (name) lines.push({ name, qty, price, total: qty * price });
        });

        if (lines.length === 0) {
            alert('Please add at least one line item.');
            return;
        }

        const total = lines.reduce((s, l) => s + l.total, 0);
        const description = lines.map(l => l.name).join(', ');

        db.updatePendingBill(currentBillId, {
            description,
            total_amount: total,
            payment_method: editPaymentMethod.value,
            odometer: editOdometer.value,
            notes: editNotes.value,
            line_items_json: JSON.stringify(lines)
        });

        editModal.classList.remove('active');
        currentBillId = null;
        loadBills();
        alert('Pending bill updated!');
    });

    searchInput.addEventListener('input', applyFilter);

    loadBills();
});
