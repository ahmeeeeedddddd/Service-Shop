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
    const printIncomeReportBtn = document.getElementById('printIncomeReportBtn');
    
    let currentEditingBillId = null;

    window.viewBillDetails = function(id) {
        const items = db.getRepairItems(id);
        const detailsModal = document.getElementById('detailsModal');
        const detailsContent = document.getElementById('detailsContent');
        
        detailsContent.innerHTML = `
            <table class="w-full" style="border-collapse: collapse;">
                <thead>
                    <tr style="border-bottom: 2px solid #eee;">
                        <th style="text-align: left; padding: 0.5rem;">Item</th>
                        <th style="text-align: center; padding: 0.5rem;">Qty</th>
                        <th style="text-align: right; padding: 0.5rem;">Price</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(i => `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 0.5rem;">${i.item_name}</td>
                            <td style="padding: 0.5rem; text-align: center;">${i.quantity}</td>
                            <td style="padding: 0.5rem; text-align: right;">$${i.unit_price.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        modalTitle.textContent = "Bill Details";
        addEditItemBtn.style.display = 'none';
        saveBillEditBtn.style.display = 'none';
        detailsModal.classList.add('active');
    };

    window.editBill = function(bill) {
        currentEditingBillId = bill.id;
        const items = db.getRepairItems(bill.id);
        
        modalTitle.textContent = "Edit Bill - " + bill.customer_name;
        addEditItemBtn.style.display = 'block';
        saveBillEditBtn.style.display = 'block';
        
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
