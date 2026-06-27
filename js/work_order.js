document.addEventListener('DOMContentLoaded', () => {
    // Check language, but work order is primarily in Arabic/English mix as requested
    translatePage();
    const langToggle = document.getElementById('langToggle');
    if (langToggle) {
        langToggle.addEventListener('click', () => {
            const newLang = getCurrentLanguage() === 'en' ? 'ar' : 'en';
            setLanguage(newLang);
        });
    }

    // Default rows
    for (let i = 0; i < 3; i++) {
        addWoRow();
    }
});

let opCount = 0;

function addWoRow() {
    opCount++;
    const tbody = document.getElementById('woRowsBody');
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="text" class="form-control text-center op-no" value="${opCount}" style="width: 60px;"></td>
        <td><input type="text" class="form-control req-repair" placeholder="الإصلاح المطلوب"></td>
        <td><input type="text" class="form-control complaint" placeholder="شكوى العميل"></td>
        <td class="text-center"><button class="btn btn-outline" style="color:red;padding:0.25rem 0.5rem;" onclick="this.closest('tr').remove()">×</button></td>
    `;
    tbody.appendChild(tr);
}

function clearWorkOrder() {
    document.getElementById('wo_customer_name').value = '';
    document.getElementById('wo_customer_phone').value = '';
    document.getElementById('wo_vehicle_brand').value = '';
    document.getElementById('wo_odometer').value = '';
    document.getElementById('wo_plate').value = '';
    document.getElementById('wo_vin').value = '';
    document.getElementById('wo_engine').value = '';
    document.getElementById('wo_time_in').value = '';
    document.getElementById('wo_time_out').value = '';
    document.getElementById('woRowsBody').innerHTML = '';
    opCount = 0;
    for (let i = 0; i < 3; i++) {
        addWoRow();
    }
}

function printWorkOrder() {
    showPrintPreview(() => {
        // Populate print fields
        document.getElementById('p_customer_name').innerText = document.getElementById('wo_customer_name').value;
        document.getElementById('p_customer_name2').innerText = document.getElementById('wo_customer_name').value;
        document.getElementById('p_customer_phone').innerText = document.getElementById('wo_customer_phone').value;
        document.getElementById('p_customer_phone2').innerText = document.getElementById('wo_customer_phone').value;
        document.getElementById('p_vehicle_brand').innerText = document.getElementById('wo_vehicle_brand').value;
        document.getElementById('p_vehicle_brand2').innerText = document.getElementById('wo_vehicle_brand').value;
        document.getElementById('p_odometer').innerText = document.getElementById('wo_odometer').value;
        document.getElementById('p_odometer2').innerText = document.getElementById('wo_odometer').value;
        document.getElementById('p_plate').innerText = document.getElementById('wo_plate').value;
        document.getElementById('p_plate2').innerText = document.getElementById('wo_plate').value;
        document.getElementById('p_vin').innerText = document.getElementById('wo_vin').value;
        document.getElementById('p_vin2').innerText = document.getElementById('wo_vin').value;
        document.getElementById('p_engine').innerText = document.getElementById('wo_engine').value;
        document.getElementById('p_engine2').innerText = document.getElementById('wo_engine').value;
        document.getElementById('p_time_in').innerText = document.getElementById('wo_time_in').value;
        document.getElementById('p_time_in2').innerText = document.getElementById('wo_time_in').value;
        document.getElementById('p_time_out').innerText = document.getElementById('wo_time_out').value;
        document.getElementById('p_time_out2').innerText = document.getElementById('wo_time_out').value;

        const printTbody = document.getElementById('p_woRows');
        printTbody.innerHTML = '';

        const rows = document.querySelectorAll('#woRowsBody tr');
        rows.forEach(row => {
            const op = row.querySelector('.op-no').value;
            const repair = row.querySelector('.req-repair').value;
            const complaint = row.querySelector('.complaint').value;

            if (op || repair || complaint) {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${op}</td>
                    <td style="text-align:right;">${repair}</td>
                    <td style="text-align:right;">${complaint}</td>
                `;
                printTbody.appendChild(tr);
            }
        });

        // Ensure at least a few rows for spacing
        while (printTbody.children.length < 3) {
            const tr = document.createElement('tr');
            tr.innerHTML = '<td>&nbsp;</td><td></td><td></td>';
            printTbody.appendChild(tr);
        }
    });
}
