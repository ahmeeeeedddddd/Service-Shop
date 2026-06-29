document.addEventListener('DOMContentLoaded', () => {
    translatePage();
    const langToggle = document.getElementById('langToggle');
    if (langToggle) {
        langToggle.addEventListener('click', () => {
            const newLang = getCurrentLanguage() === 'en' ? 'ar' : 'en';
            setLanguage(newLang);
        });
    }

    document.getElementById('est_no').value = "000" + Math.floor(100 + Math.random() * 900);

    // Start with 3 rows for each table
    const repairsTbody = document.querySelector('#repairsTable tbody');
    const partsTbody = document.querySelector('#partsTable tbody');
    repairsTbody.innerHTML = '';
    partsTbody.innerHTML = '';

    addRepairRow();
    addRepairRow();
    addRepairRow();
    addPartRow();
    addPartRow();
    addPartRow();
});

// ─── Repairs Table ─────────────────────────────────────────────────────────

function addRepairRow() {
    const tbody = document.querySelector('#repairsTable tbody');
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><button class="est-row-del" onclick="deleteRow(this)" title="حذف">✕</button></td>
        <td><input type="text" class="form-control repair-desc" placeholder="وصف الإصلاح" oninput="onRepairDescInput(this)"></td>
        <td><input type="number" class="form-control repair-val" placeholder="0" min="0" step="0.01" oninput="renumberRows()"></td>
    `;
    tbody.appendChild(tr);
    renumberRows();
    return tr;
}

function onRepairDescInput(input) {
    const tbody = document.querySelector('#repairsTable tbody');
    const rows = tbody.querySelectorAll('tr');
    const lastRow = rows[rows.length - 1];
    const thisRow = input.closest('tr');
    if (thisRow === lastRow && input.value.trim() !== '') {
        addRepairRow();
    }
}

// ─── Parts Table ─────────────────────────────────────────────────────────────

function addPartRow() {
    const tbody = document.querySelector('#partsTable tbody');
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><button class="est-row-del" onclick="deleteRow(this)" title="حذف">✕</button></td>
        <td><input type="text" class="form-control part-desc" placeholder="وصف القطعة" oninput="onPartDescInput(this)"></td>
        <td><input type="number" class="form-control part-val" placeholder="0" min="0" step="0.01" oninput="renumberRows()"></td>
    `;
    tbody.appendChild(tr);
    renumberRows();
    return tr;
}

function onPartDescInput(input) {
    const tbody = document.querySelector('#partsTable tbody');
    const rows = tbody.querySelectorAll('tr');
    const lastRow = rows[rows.length - 1];
    const thisRow = input.closest('tr');
    if (thisRow === lastRow && input.value.trim() !== '') {
        addPartRow();
    }
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function deleteRow(btn) {
    const tr = btn.closest('tr');
    const tbody = tr.parentElement;
    // Keep at least 1 row
    if (tbody.querySelectorAll('tr').length > 1) {
        tr.remove();
    } else {
        // Just clear the row
        tr.querySelectorAll('input').forEach(i => i.value = '');
    }
    renumberRows();
}

function renumberRows() {
    // Renumber is handled visually by the <td> delete button — skip row numbering if there's a delete btn
    // We rely on the print JS to number sequentially. No visible numbers in input rows needed here.
}

function resetEstimate() {
    document.querySelectorAll('.est-form input').forEach(inp => inp.value = '');

    const repairsTbody = document.querySelector('#repairsTable tbody');
    const partsTbody = document.querySelector('#partsTable tbody');
    repairsTbody.innerHTML = '';
    partsTbody.innerHTML = '';
    addRepairRow();
    addRepairRow();
    addRepairRow();
    addPartRow();
    addPartRow();
    addPartRow();

    document.getElementById('est_no').value = "000" + Math.floor(100 + Math.random() * 900);
}

// ─── Print ────────────────────────────────────────────────────────────────────

function printEstimate() {
    showPrintPreview(() => {
        document.getElementById('p_est_no').innerText = document.getElementById('est_no').value;
        document.getElementById('p_est_customer').innerText = document.getElementById('est_customer').value;
        document.getElementById('p_est_plate').innerText = document.getElementById('est_plate').value;
        document.getElementById('p_est_address').innerText = document.getElementById('est_address').value;
        document.getElementById('p_est_vin').innerText = document.getElementById('est_vin').value;
        document.getElementById('p_est_model').innerText = document.getElementById('est_model').value;
        document.getElementById('p_est_engine').innerText = document.getElementById('est_engine').value;
        document.getElementById('p_est_insurance').innerText = document.getElementById('est_insurance').value;
        document.getElementById('p_est_color').innerText = document.getElementById('est_color').value;

        // ── Repairs ──
        const repPrintTbody = document.querySelector('#p_repairsTable tbody');
        repPrintTbody.innerHTML = '';
        const repairRows = document.querySelectorAll('#repairsTable tbody tr');
        let repairTotal = 0;
        let repairPrintIdx = 0;

        repairRows.forEach(row => {
            const desc = row.querySelector('.repair-desc').value.trim();
            const valStr = row.querySelector('.repair-val').value;
            const val = parseFloat(valStr) || 0;

            // Skip completely empty rows
            if (!desc && !valStr) return;

            repairTotal += val;
            repairPrintIdx++;

            const parts = val.toFixed(2).split('.');
            const gp = valStr ? parts[0] : '';
            const pt = valStr ? parts[1] : '';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${repairPrintIdx}</td>
                <td class="left-text">${desc}</td>
                <td>${pt}</td>
                <td>${gp}</td>
            `;
            repPrintTbody.appendChild(tr);
        });

        const repTotalParts = repairTotal.toFixed(2).split('.');
        document.getElementById('p_rep_total_gp').innerText = repTotalParts[0];
        document.getElementById('p_rep_total_pt').innerText = repTotalParts[1];

        // ── Parts ──
        const partPrintTbody = document.querySelector('#p_partsTable tbody');
        partPrintTbody.innerHTML = '';
        const partRows = document.querySelectorAll('#partsTable tbody tr');
        let partsTotal = 0;
        let partPrintIdx = 0;

        partRows.forEach(row => {
            const desc = row.querySelector('.part-desc').value.trim();
            const valStr = row.querySelector('.part-val').value;
            const val = parseFloat(valStr) || 0;

            // Skip completely empty rows
            if (!desc && !valStr) return;

            partsTotal += val;
            partPrintIdx++;

            const parts = val.toFixed(2).split('.');
            const gp = valStr ? parts[0] : '';
            const pt = valStr ? parts[1] : '';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${partPrintIdx}</td>
                <td class="left-text">${desc}</td>
                <td>${pt}</td>
                <td>${gp}</td>
            `;
            partPrintTbody.appendChild(tr);
        });

        const partsTotalParts = partsTotal.toFixed(2).split('.');
        document.getElementById('p_parts_total_gp').innerText = partsTotalParts[0];
        document.getElementById('p_parts_total_pt').innerText = partsTotalParts[1];
    });
}
