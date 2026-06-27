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

    // Build 10 rows for repairs and parts
    const repairsTbody = document.querySelector('#repairsTable tbody');
    const partsTbody = document.querySelector('#partsTable tbody');
    repairsTbody.innerHTML = '';
    partsTbody.innerHTML = '';

    for (let i = 1; i <= 10; i++) {
        const trRep = document.createElement('tr');
        trRep.innerHTML = `
            <td>${i}</td>
            <td><input type="text" class="form-control repair-desc" placeholder="وصف الإصلاح"></td>
            <td><input type="number" class="form-control repair-val" placeholder="0" min="0" step="0.01"></td>
        `;
        repairsTbody.appendChild(trRep);

        const trPart = document.createElement('tr');
        trPart.innerHTML = `
            <td>${i}</td>
            <td><input type="text" class="form-control part-desc" placeholder="وصف القطعة"></td>
            <td><input type="number" class="form-control part-val" placeholder="0" min="0" step="0.01"></td>
        `;
        partsTbody.appendChild(trPart);
    }
});

function resetEstimate() {
    document.querySelectorAll('.est-form input').forEach(inp => inp.value = '');
    document.querySelectorAll('.est-table input').forEach(inp => inp.value = '');
    document.getElementById('est_no').value = "000" + Math.floor(100 + Math.random() * 900);
}

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

        const repPrintTbody = document.querySelector('#p_repairsTable tbody');
        repPrintTbody.innerHTML = '';
        const repairRows = document.querySelectorAll('#repairsTable tbody tr');
        let repairTotal = 0;

        repairRows.forEach((row, idx) => {
            const desc = row.querySelector('.repair-desc').value;
            const valStr = row.querySelector('.repair-val').value;
            const val = parseFloat(valStr) || 0;
            repairTotal += val;

            const parts = val.toFixed(2).split('.');
            const gp = valStr ? parts[0] : '';
            const pt = valStr ? parts[1] : '';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${idx + 1}</td>
                <td class="left-text">${desc}</td>
                <td>${pt}</td>
                <td>${gp}</td>
            `;
            repPrintTbody.appendChild(tr);
        });

        const totalParts = repairTotal.toFixed(2).split('.');
        document.getElementById('p_rep_total_gp').innerText = totalParts[0];
        document.getElementById('p_rep_total_pt').innerText = totalParts[1];

        const partPrintTbody = document.querySelector('#p_partsTable tbody');
        partPrintTbody.innerHTML = '';
        const partRows = document.querySelectorAll('#partsTable tbody tr');

        partRows.forEach((row, idx) => {
            const desc = row.querySelector('.part-desc').value;
            const valStr = row.querySelector('.part-val').value;
            const val = parseFloat(valStr) || 0;

            const parts = val.toFixed(2).split('.');
            const gp = valStr ? parts[0] : '';
            const pt = valStr ? parts[1] : '';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${idx + 1}</td>
                <td class="left-text">${desc}</td>
                <td>${pt}</td>
                <td>${gp}</td>
            `;
            partPrintTbody.appendChild(tr);
        });
    });
}
