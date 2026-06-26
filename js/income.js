let db;
try {
    db = require('../database/db.js');
} catch (e) {
    console.error('Failed to load database:', e);
    alert('Database Error: Could not connect to the database.');
}

document.addEventListener('DOMContentLoaded', () => {
    // Initialize i18n
    translatePage();

    // Elements
    const langToggle = document.getElementById('langToggle');
    const incomeTableBody = document.getElementById('incomeTableBody');
    const totalIncomeEl = document.getElementById('totalIncome');
    const cashIncomeEl = document.getElementById('cashIncome');
    const instapayIncomeEl = document.getElementById('instapayIncome');
    const alahlyIncomeEl = document.getElementById('alahlyIncome');
    const masrIncomeEl = document.getElementById('masrIncome');
    const invoiceCountEl = document.getElementById('invoiceCount');
    
    const searchInput = document.getElementById('searchInput');
    const filterDateInput = document.getElementById('filterDate');
    const paymentFilter = document.getElementById('paymentFilter');
    const resetFiltersBtn = document.getElementById('resetFiltersBtn');

    let allInvoices = [];

    const now = new Date();
    const today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    filterDateInput.value = today;
    
    const detailsModal = document.getElementById('detailsModal');
    const detailsContent = document.getElementById('detailsContent');
    const modalTitle = document.getElementById('modalTitle');
    const addEditItemBtn = document.getElementById('addEditItemBtn');
    const saveBillEditBtn = document.getElementById('saveBillEditBtn');
    const printBillBtn = document.getElementById('printBillBtn');
    const printIncomeReportBtn = document.getElementById('printIncomeReportBtn');
    
    let currentEditingBillId = null;

    if (printBillBtn) {
        printBillBtn.addEventListener('click', () => window.print());
    }

    window.viewBillDetails = function(id) {
        const bill = db.getRepairById(id);
        const items = db.getRepairItems(id);
        const lang = getCurrentLanguage();
        const t = translations[lang];

        // Dynamic scaling to fit one page
        let baseFontSize = '1rem';
        let logoMaxHeight = '140px';
        let tablePadding = '0.5rem';
        let sectionMargin = '1rem';
        let footerMargin = '4rem';

        const itemCount = items.length;
        if (itemCount > 15) {
            baseFontSize = '0.65rem';
            logoMaxHeight = '70px';
            tablePadding = '0.2rem';
            sectionMargin = '0.3rem';
            footerMargin = '1.5rem';
        } else if (itemCount > 10) {
            baseFontSize = '0.75rem';
            logoMaxHeight = '90px';
            tablePadding = '0.3rem';
            sectionMargin = '0.5rem';
            footerMargin = '2rem';
        } else if (itemCount > 5) {
            baseFontSize = '0.85rem';
            logoMaxHeight = '110px';
            tablePadding = '0.4rem';
            sectionMargin = '0.75rem';
            footerMargin = '3rem';
        }

        detailsContent.style.fontSize = baseFontSize;
        
        detailsContent.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #eee; padding-bottom: ${sectionMargin}; margin-bottom: ${sectionMargin}; direction: ltr;">
                <div style="flex: 1; text-align: left; font-weight: bold; color: #475569; font-size: 0.85rem; line-height: 1.6; padding-top: 10px; direction: rtl;">
                    سمكرة - دهان - عفشة<br>
                    ميكانيكا - كهرباء - تكييف
                </div>
                <div style="flex: 1; text-align: center;">
                    <img src="../assets/logo.png" style="max-height: ${logoMaxHeight}; max-width: 100%; object-fit: contain;" alt="El Ansary" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
                    <div style="font-size: 1.3rem; font-weight: bold; color: #1e293b; margin-top: 5px; text-align: center;">بيان الخدمه</div>
                    <h1 style="display:none; color: #eab308; margin:0;">${t.appName}</h1>
                </div>
                <div style="flex: 1; text-align: right; font-weight: bold; color: #475569; font-size: 1.1rem; padding-top: 10px; direction: rtl;">
                    مركز الانصاري لصيانه السيارات
                </div>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: ${sectionMargin};">
                <div>
                    <p style="margin: 0.25rem 0;"><strong>${t.customer}:</strong> ${bill.customer_name}</p>
                    <p style="margin: 0.25rem 0;"><strong>${t.phone}:</strong> ${bill.customer_phone || '-'}</p>
                    <p style="margin: 0.25rem 0;"><strong>${t.carModel}:</strong> ${bill.car_name || '-'}</p>
                    <p style="margin: 0.25rem 0;"><strong>${t.plateNumber || 'Plate'}:</strong> ${bill.plate_number || '-'}</p>
                </div>
                <div style="text-align: right;">
                    <p style="margin: 0.25rem 0;"><strong>${t.date}:</strong> ${bill.date}</p>
                    <p style="margin: 0.25rem 0;"><strong>${t.payment}:</strong> ${window.getTranslatedPaymentMethod(bill.payment_method)}</p>
                    ${bill.odometer ? `<p style="margin: 0.25rem 0;"><strong>${t.odometer}:</strong> ${bill.odometer}</p>` : ''}
                </div>
            </div>
            <table style="width: 100%; border-collapse: collapse; margin-top: ${sectionMargin};">
                <thead>
                    <tr style="background: #f8fafc; border-bottom: 2px solid #eee;">
                        <th style="padding: ${tablePadding}; text-align: left;">${t.serviceName}</th>
                        <th style="padding: ${tablePadding}; text-align: center;">${t.qty}</th>
                        <th style="padding: ${tablePadding}; text-align: right;">${t.price}</th>
                        <th style="padding: ${tablePadding}; text-align: right;">${t.subtotal}</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(item => `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: ${tablePadding};">${item.item_name}</td>
                            <td style="padding: ${tablePadding}; text-align: center;">${item.quantity}</td>
                            <td style="padding: ${tablePadding}; text-align: right;">$${parseFloat(item.unit_price).toFixed(2)}</td>
                            <td style="padding: ${tablePadding}; text-align: right;">$${(item.quantity * item.unit_price).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div style="margin-top: ${sectionMargin}; width: 300px; margin-left: auto; margin-right: 0;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 1.1rem;">
                    <span>${t.total}:</span>
                    <span>$${parseFloat(bill.total_amount).toFixed(2)}</span>
                </div>
                ${bill.discount > 0 ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 1.1rem; color: #ef4444;">
                    <span>${t.discount || 'Discount'}:</span>
                    <span>-$${parseFloat(bill.discount).toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 1.2rem; font-weight: bold; color: #10b981; border-top: 1px solid #eee; padding-top: 0.5rem;">
                    <span>${t.netTotal || 'Net Total'}:</span>
                    <span>$${(bill.total_amount - bill.discount).toFixed(2)}</span>
                </div>
                ` : ''}
                
                ${bill.payment_method === 'PayByParts' || bill.pending_amount > 0 ? `
                <div style="display: flex; justify-content: space-between; margin-top: 0.5rem; font-size: 1.1rem; color: #3b82f6;">
                    <span>${t.amountPaidNow || 'Amount Paid'}:</span>
                    <span>$${parseFloat(bill.paid_amount || 0).toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 0.5rem; font-size: 1.1rem; color: #ef4444;">
                    <span>${t.pendingAmount || 'Pending'}:</span>
                    <span>$${parseFloat(bill.pending_amount || 0).toFixed(2)}</span>
                </div>
                ` : ''}
            </div>

            ${bill.notes ? `
            <div style="margin-top: ${sectionMargin}; padding: 1rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
                <p style="margin: 0; font-weight: 700; color: #1e293b;">${t.notes}:</p>
                <p style="margin: 0.5rem 0 0 0; color: #475569; white-space: pre-wrap;">${bill.notes}</p>
            </div>
            ` : ''}

            <!-- Footer Section -->
            <div style="margin-top: ${footerMargin}; display: flex; justify-content: space-between; border-top: 1px solid #eee; padding-top: 1rem;">
                <div style="font-size: 0.9rem; color: #64748b;">
                    <p><strong>Contact Us:</strong></p>
                    <p>01010103777</p>
                    <p>01010606016</p>
                </div>
                <div style="text-align: right; font-size: 0.9rem; color: #64748b;">
                    <p><strong>Engineer's Signature:</strong></p>
                    <div style="margin-top: 2rem; border-bottom: 1px solid #94a3b8; width: 150px; display: inline-block;"></div>
                </div>
            </div>
        `;
        
        if (lang === 'ar') {
            detailsContent.style.direction = 'rtl';
            detailsContent.querySelectorAll('th').forEach(th => th.style.textAlign = 'right');
        } else {
            detailsContent.style.direction = 'ltr';
        }

        modalTitle.textContent = "Bill Details";
        addEditItemBtn.style.display = 'none';
        saveBillEditBtn.style.display = 'none';
        printBillBtn.style.display = 'block';
        detailsModal.classList.add('active');
    };

    window.editBill = function(bill) {
        currentEditingBillId = bill.id;
        const items = db.getRepairItems(bill.id);
        
        modalTitle.textContent = "Edit Bill - " + bill.customer_name;
        addEditItemBtn.style.display = 'block';
        saveBillEditBtn.style.display = 'block';
        if (printBillBtn) printBillBtn.style.display = 'none';
        
        renderEditItems(items);
        detailsModal.classList.add('active');
    };

    function renderEditItems(items) {
        detailsContent.innerHTML = `
            <table class="w-full" id="editItemsTable">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="editItemsBody">
                    ${items.map(i => `
                        <tr>
                            <td><input type="text" class="form-control" value="${i.item_name}"></td>
                            <td><input type="number" class="form-control" value="${i.quantity}" style="width: 70px;"></td>
                            <td><input type="number" class="form-control" value="${i.unit_price}" style="width: 100px;" step="0.01"></td>
                            <td><button class="btn btn-outline" style="color:red;" onclick="this.closest('tr').remove()">×</button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    addEditItemBtn.onclick = () => {
        const tbody = document.getElementById('editItemsBody');
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" class="form-control" placeholder="New Item"></td>
            <td><input type="number" class="form-control" value="1" style="width: 70px;"></td>
            <td><input type="number" class="form-control" value="0" style="width: 100px;" step="0.01"></td>
            <td><button class="btn btn-outline" style="color:red;" onclick="this.closest('tr').remove()">×</button></td>
        `;
        tbody.appendChild(tr);
    };

    saveBillEditBtn.onclick = () => {
        if (!currentEditingBillId) return;
        
        const rows = document.querySelectorAll('#editItemsBody tr');
        const newItems = [];
        let newTotal = 0;
        
        rows.forEach(row => {
            const inputs = row.querySelectorAll('input');
            const name = inputs[0].value;
            const qty = parseInt(inputs[1].value) || 0;
            const price = parseFloat(inputs[2].value) || 0;
            
            if (name && qty > 0) {
                newItems.push({ name, qty, price });
                newTotal += qty * price;
            }
        });
        
        if (newItems.length === 0) {
            alert("Bill must have at least one valid item");
            return;
        }

        // Update database
        db.deleteRepairItems(currentEditingBillId);
        newItems.forEach(item => {
            db.addRepairItem({
                repair_id: currentEditingBillId,
                item_name: item.name,
                quantity: item.qty,
                unit_price: item.price
            });
        });
        
        // Update repair total and description
        const desc = newItems.map(i => i.name).join(', ');
        db.updateRepairFull(currentEditingBillId, newTotal, desc);
        
        detailsModal.classList.remove('active');
        loadInvoices();
        alert("Bill updated successfully");
    };

    document.getElementById('closeDetailsBtn').addEventListener('click', () => {
        document.getElementById('detailsModal').classList.remove('active');
    });

    printIncomeReportBtn.onclick = () => {
        const t = translations[getCurrentLanguage()];
        const tableHtml = document.querySelector('.table-container table').outerHTML;
        const totalHtml = document.querySelector('.stat-grid').innerHTML;
        
        detailsContent.innerHTML = `
            <div style="text-align: center; margin-bottom: 2rem; border-bottom: 2px solid #0d9488; padding-bottom: 1rem;">
                <h1 style="color: #0d9488;">${t.appName}</h1>
                <h2>${t.incomeTitle} Report</h2>
            </div>
            <div class="stat-grid" style="margin-bottom: 2rem; display: flex; gap: 1rem;">
                ${totalHtml}
            </div>
            ${tableHtml.replace('Actions', '').replace(/<button.*<\/button>/g, '')}
        `;
        
        modalTitle.textContent = t.incomeTitle + " Report Preview";
        addEditItemBtn.style.display = 'none';
        saveBillEditBtn.style.display = 'none';
        if (printBillBtn) printBillBtn.style.display = 'none';
        
        // Add a print button specifically for the report inside the modal? 
        // No, I'll just change saveBillEditBtn to Print if it's report mode.
        saveBillEditBtn.textContent = t.print;
        saveBillEditBtn.style.display = 'block';
        saveBillEditBtn.onclick = async () => {
            const { ipcRenderer } = require('electron');
            const dateStr = filterDateInput.value || new Date().toISOString().split('T')[0];
            const fileName = `IncomeReport_${dateStr}.pdf`;

            const result = await ipcRenderer.invoke('print-to-pdf', {
                folder: 'reports',
                name: fileName
            });

            if (result.success) {
                alert('Report saved to: ' + result.path);
            } else {
                alert('Saving failed: ' + result.error);
            }
        };
        
        detailsModal.classList.add('active');
    };

    // Language Toggle
    langToggle.addEventListener('click', () => {
        const newLang = getCurrentLanguage() === 'en' ? 'ar' : 'en';
        setLanguage(newLang);
    });

    // Load Data from DB
    async function loadInvoices() {
        allInvoices = db.getRepairs();
        applyFilters();
    }

    function renderInvoices(data) {
        incomeTableBody.innerHTML = '';
        data.forEach(inv => {
            const tr = document.createElement('tr');
            const lang = getCurrentLanguage();
            const paymentText = window.getTranslatedPaymentMethod(inv.payment_method);
            const badgeClass = inv.payment_method.toLowerCase() === 'cash' ? 'badge-cash' : 'badge-card';
            
            const actualPaid = (inv.paid_amount !== null && inv.paid_amount !== undefined) ? inv.paid_amount : (inv.total_amount - (inv.discount || 0));

            tr.innerHTML = `
                <td>${inv.date}</td>
                <td><span class="font-bold text-teal" style="cursor: pointer;" onclick="viewBillDetails(${inv.id})">${inv.customer_name}</span></td>
                <td><span class="badge ${badgeClass}">${paymentText}</span></td>
                <td class="font-bold">$${parseFloat(actualPaid).toFixed(2)}</td>
                <td>
                    ${inv.date === today ? `
                        <button class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="editBill(${JSON.stringify(inv).replace(/"/g, '&quot;')})">
                            <span data-i18n="edit">Edit</span>
                        </button>
                    ` : ''}
                </td>
            `;
            incomeTableBody.appendChild(tr);
        });
    }

    function updateStats(data) {
        const getPaid = (inv) => (inv.paid_amount !== null && inv.paid_amount !== undefined) ? inv.paid_amount : (inv.total_amount - (inv.discount || 0));
        
        const total = data.reduce((sum, inv) => sum + getPaid(inv), 0);
        const cash = data.filter(i => i.payment_method.toLowerCase() === 'cash').reduce((sum, inv) => sum + getPaid(inv), 0);
        const instapay = data.filter(i => i.payment_method.toLowerCase() === 'instapay').reduce((sum, inv) => sum + getPaid(inv), 0);
        const alahly = data.filter(i => i.payment_method.toLowerCase() === 'bank alahly').reduce((sum, inv) => sum + getPaid(inv), 0);
        const masr = data.filter(i => i.payment_method.toLowerCase() === 'bank masr').reduce((sum, inv) => sum + getPaid(inv), 0);

        totalIncomeEl.textContent = `$${total.toFixed(2)}`;
        cashIncomeEl.textContent = `$${cash.toFixed(2)}`;
        if (instapayIncomeEl) instapayIncomeEl.textContent = `$${instapay.toFixed(2)}`;
        if (alahlyIncomeEl) alahlyIncomeEl.textContent = `$${alahly.toFixed(2)}`;
        if (masrIncomeEl) masrIncomeEl.textContent = `$${masr.toFixed(2)}`;
        if (invoiceCountEl) invoiceCountEl.textContent = data.length;
    }

    // Filter Logic
    function applyFilters() {
        const searchTerm = searchInput.value.toLowerCase();
        const filterDate = filterDateInput.value;
        const payment = paymentFilter.value;

        const filtered = allInvoices.filter(inv => {
            const matchesSearch = inv.customer_name.toLowerCase().includes(searchTerm);
            const matchesPayment = payment === 'all' || inv.payment_method === payment;
            const matchesDate = !filterDate || inv.date === filterDate;
            
            return matchesSearch && matchesPayment && matchesDate;
        });

        renderInvoices(filtered);
        updateStats(filtered);
    }

    [searchInput, filterDateInput, paymentFilter].forEach(input => {
        input.addEventListener('input', applyFilters);
    });

    resetFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        filterDateInput.value = '';
        paymentFilter.value = 'all';
        applyFilters();
    });

    // Initial Load
    loadInvoices();
});
