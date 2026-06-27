const extItemsRight = [
    "اكصدام أمامي وخلفي",
    "كبوت",
    "سقف",
    "رفارف",
    "أبواب",
    "شنطة",
    "عتب",
    "دهانات",
    "فوانيس أمامي وخلفي وإشارة"
];

const extItemsLeft = [
    "مرايات جانبية",
    "زجاج أمامي وخلفي",
    "زجاج أبواب",
    "سنتر لوك وإنذار",
    "إطار أمامي شمال",
    "إطار أمامي يمين",
    "إطار خلفي شمال",
    "إطار خلفي يمين",
    "إطار استبن"
];

const intItemsRight = [
    "فرش",
    "تابلوه",
    "لوحة عدادات",
    "كاسيت وسماعات"
];

const intItemsLeft = [
    "إضاءة داخلية",
    "تكييف",
    "ولاعة",
    "فرش السقف"
];

const mechItemsRight = [
    "زيوت وسوائل",
    "بوجيهات",
    "سيور",
    "فلتر هواء وتكييف"
];

const mechItemsLeft = [
    "شكمان",
    "تيل وديسك",
    "عفشة",
    "شاسيه"
];

const compItems = [
    "كشف الكمبيوتر",
    "اختبار كبس المحرك",
    "اختبار الرشاشات",
    "اختبار المارش والدينامو",
    "اختبار البطارية"
];

document.addEventListener('DOMContentLoaded', () => {
    translatePage();
    const langToggle = document.getElementById('langToggle');
    if (langToggle) {
        langToggle.addEventListener('click', () => {
            const newLang = getCurrentLanguage() === 'en' ? 'ar' : 'en';
            setLanguage(newLang);
        });
    }

    // Set today's date automatically
    const now = new Date();
    document.getElementById('ins_date').value = now.toLocaleDateString('ar-EG');
    document.getElementById('ins_no').value = "000" + Math.floor(1000 + Math.random() * 9000);

    // Populate tables
    buildTable('extTableRight', extItemsRight, 'ext_r');
    buildTable('extTableLeft', extItemsLeft, 'ext_l');
    buildTable('intTableRight', intItemsRight, 'int_r');
    buildTable('intTableLeft', intItemsLeft, 'int_l');
    buildTable('mechTableRight', mechItemsRight, 'mech_r');
    buildTable('mechTableLeft', mechItemsLeft, 'mech_l');
    buildCompTable();
});

function buildTable(tableId, items, prefix) {
    const tbody = document.querySelector(`#${tableId} tbody`);
    tbody.innerHTML = '';
    items.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="left-align">${item}</td>
            <td><input type="checkbox" class="${prefix}-ok" data-index="${index}"></td>
            <td><input type="checkbox" class="${prefix}-nok" data-index="${index}"></td>
            <td><input type="text" class="form-control ${prefix}-note" data-index="${index}"></td>
        `;
        // Make checkboxes mutual exclusive
        const okCheck = tr.querySelector(`.${prefix}-ok`);
        const nokCheck = tr.querySelector(`.${prefix}-nok`);
        okCheck.addEventListener('change', () => { if(okCheck.checked) nokCheck.checked = false; });
        nokCheck.addEventListener('change', () => { if(nokCheck.checked) okCheck.checked = false; });

        tbody.appendChild(tr);
    });
}

function buildCompTable() {
    const tbody = document.querySelector('#compTable tbody');
    tbody.innerHTML = '';
    compItems.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="left-align">${item}</td>
            <td><input type="text" class="form-control comp-note" data-index="${index}"></td>
            <td><input type="text" class="form-control comp-opt" data-index="${index}"></td>
        `;
        tbody.appendChild(tr);
    });
}

function resetInspection() {
    document.querySelectorAll('.insp-form input').forEach(inp => inp.value = '');
    document.querySelectorAll('.insp-table input[type="checkbox"]').forEach(chk => chk.checked = false);
    document.querySelectorAll('.insp-table input[type="text"]').forEach(txt => txt.value = '');
    
    const now = new Date();
    document.getElementById('ins_date').value = now.toLocaleDateString('ar-EG');
    document.getElementById('ins_no').value = "000" + Math.floor(1000 + Math.random() * 9000);
}

function printInspection() {
    showPrintPreview(() => {
        // Info fields
        document.getElementById('p_ins_no').innerText = document.getElementById('ins_no').value;
        document.getElementById('p_ins_no_2').innerText = document.getElementById('ins_no').value;
        document.getElementById('p_ins_date').innerText = document.getElementById('ins_date').value;
        document.getElementById('p_ins_customer').innerText = document.getElementById('ins_customer').value;
        document.getElementById('p_ins_phone').innerText = document.getElementById('ins_phone').value;
        document.getElementById('p_ins_car_type').innerText = document.getElementById('ins_car_type').value;
        document.getElementById('p_ins_model').innerText = document.getElementById('ins_model').value;
        document.getElementById('p_ins_cc').innerText = document.getElementById('ins_cc').value;
        document.getElementById('p_ins_trans').innerText = document.getElementById('ins_trans').value;
        document.getElementById('p_ins_plate').innerText = document.getElementById('ins_plate').value;
        document.getElementById('p_ins_kms').innerText = document.getElementById('ins_kms').value;
        document.getElementById('p_ins_color').innerText = document.getElementById('ins_color').value;

        // Render print sections
        renderPrintTable('p_extTableRight', extItemsRight, 'ext_r');
        renderPrintTable('p_extTableLeft', extItemsLeft, 'ext_l');
        renderPrintTable('p_intTableRight', intItemsRight, 'int_r');
        renderPrintTable('p_intTableLeft', intItemsLeft, 'int_l');
        renderPrintTable('p_mechTableRight', mechItemsRight, 'mech_r');
        renderPrintTable('p_mechTableLeft', mechItemsLeft, 'mech_l');
        renderPrintCompTable();
    });
}

function renderPrintTable(tableId, items, prefix) {
    const table = document.getElementById(tableId);
    table.innerHTML = `
        <thead>
            <tr>
                <th style="width:40%;">البند</th>
                <th style="width:15%;">سليم</th>
                <th style="width:15%;">غير سليم</th>
                <th style="width:30%;">ملاحظات</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;
    const tbody = table.querySelector('tbody');
    const screenRows = document.querySelectorAll(`#${tableId.replace('p_', '')} tbody tr`);
    
    items.forEach((item, index) => {
        const row = screenRows[index];
        const isOk = row.querySelector(`.${prefix}-ok`).checked ? '✓' : '';
        const isNok = row.querySelector(`.${prefix}-nok`).checked ? '✗' : '';
        const note = row.querySelector(`.${prefix}-note`).value;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="item-name">${item}</td>
            <td style="font-weight:bold;color:green;">${isOk}</td>
            <td style="font-weight:bold;color:red;">${isNok}</td>
            <td style="text-align:right;">${note}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderPrintCompTable() {
    const table = document.getElementById('p_compTable');
    table.innerHTML = `
        <thead>
            <tr>
                <th style="width:35%;">البند</th>
                <th style="width:35%;">ملاحظات</th>
                <th style="width:30%;">اختياري بتكلفة إضافية</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;
    const tbody = table.querySelector('tbody');
    const screenRows = document.querySelectorAll('#compTable tbody tr');
    
    compItems.forEach((item, index) => {
        const row = screenRows[index];
        const note = row.querySelector('.comp-note').value;
        const opt = row.querySelector('.comp-opt').value;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="item-name">${item}</td>
            <td style="text-align:right;">${note}</td>
            <td style="text-align:right;">${opt}</td>
        `;
        tbody.appendChild(tr);
    });
}
