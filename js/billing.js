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
    const customerSearch = document.getElementById('customerSearch');
    const searchResults = document.getElementById('searchResults');
    
    // Auto-fill fields
    const customerName = document.getElementById('customerName');
    const customerPhone = document.getElementById('customerPhone');
    const carModelInput = document.getElementById('carModel');
    const plateNumberInput = document.getElementById('plateNumber');
    
    const addItemBtn = document.getElementById('addItemBtn');
    const lineItemsBody = document.getElementById('lineItemsBody');
    const grandTotalEl = document.getElementById('grandTotal');
    const payCashBtn = document.getElementById('payCash');
    const payCardBtn = document.getElementById('payCard');
    const confirmPrintBtn = document.getElementById('confirmPrintBtn');
    const confirmPaymentBtn = document.getElementById('confirmPaymentBtn');
    const receiptModal = document.getElementById('receiptModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const printReceiptBtn = document.getElementById('printReceiptBtn');
    const receiptContent = document.getElementById('receiptContent');
    const selectedCustomerDisplay = document.getElementById('selectedCustomerDisplay');

    let paymentMethod = 'Cash';
    let selectedCustomer = null;
    let isCurrentBillProcessed = false;
    let currentBillData = null;

    // Language Toggle
    langToggle.addEventListener('click', () => {
        const newLang = getCurrentLanguage() === 'en' ? 'ar' : 'en';
        setLanguage(newLang);
    });

    // Dynamic Search using Real DB
    customerSearch.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        if (term.length < 2) {
            searchResults.classList.remove('active');
            return;
        }

        const filtered = db.searchCustomers(term);
        renderSearchResults(filtered);
    });

    function renderSearchResults(results) {
        searchResults.innerHTML = '';
        if (results.length === 0) {
            searchResults.classList.remove('active');
            return;
        }

        results.forEach(c => {
            const div = document.createElement('div');
            div.className = 'result-item';
            div.innerHTML = `
                <span class="result-name">${c.name}</span>
                <span class="result-phone">${c.phone}</span>
                <span class="result-car">${c.car_name} | ${c.plate_number}</span>
            `;
            div.onclick = () => selectCustomer(c);
            searchResults.appendChild(div);
        });

        searchResults.classList.add('active');
    }

    function selectCustomer(customer) {
        selectedCustomer = customer;
        customerSearch.value = '';
        searchResults.classList.remove('active');

        // Auto-fill fields
        customerName.value = customer.name;
        customerPhone.value = customer.phone;
        carModelInput.value = customer.car_name;
        plateNumberInput.value = customer.plate_number;
    }

    // Close search results when clicking outside
    document.addEventListener('click', (e) => {
        if (!customerSearch.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.remove('active');
        }
    });

    // Add Line Item
    addItemBtn.addEventListener('click', () => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" class="form-control" placeholder="e.g. Brake Pads"></td>
            <td><input type="number" class="form-control qty-input" value="1" min="1"></td>
            <td><input type="number" class="form-control price-input" value="0" min="0"></td>
            <td class="font-bold text-teal line-subtotal">$0.00</td>
            <td><button class="btn btn-outline remove-item-btn" style="color: #ef4444; border-color: #fee2e2;">×</button></td>
        `;
        lineItemsBody.appendChild(tr);
        attachRowListeners(tr);
        updateGrandTotal();
    });

    // Remove Item
    lineItemsBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-item-btn')) {
            e.target.closest('tr').remove();
            updateGrandTotal();
        }
    });

    function attachRowListeners(row) {
        const qtyInput = row.querySelector('.qty-input');
        const priceInput = row.querySelector('.price-input');
        
        [qtyInput, priceInput].forEach(input => {
            input.addEventListener('input', () => {
                const qty = parseFloat(qtyInput.value) || 0;
                const price = parseFloat(priceInput.value) || 0;
                const subtotal = qty * price;
                row.querySelector('.line-subtotal').textContent = `$${subtotal.toFixed(2)}`;
                updateGrandTotal();
            });
        });
    }

    attachRowListeners(lineItemsBody.querySelector('tr'));

    function updateGrandTotal() {
        let total = 0;
        document.querySelectorAll('.line-subtotal').forEach(el => {
            total += parseFloat(el.textContent.replace('$', '')) || 0;
        });
        grandTotalEl.textContent = `$${total.toFixed(2)}`;
    }

    // Payment Toggle
    payCashBtn.addEventListener('click', () => {
        paymentMethod = 'Cash';
        payCashBtn.classList.add('btn-primary');
        payCashBtn.classList.remove('btn-outline');
        payCardBtn.classList.add('btn-outline');
        payCardBtn.classList.remove('btn-primary');
    });

    payCardBtn.addEventListener('click', () => {
        paymentMethod = 'ATM / Card';
        payCardBtn.classList.add('btn-primary');
        payCardBtn.classList.remove('btn-outline');
        payCashBtn.classList.add('btn-outline');
        payCashBtn.classList.remove('btn-primary');
    });

    // Confirm & Print
    confirmPrintBtn.addEventListener('click', () => {
        if (!selectedCustomer) {
            alert('Please select a customer');
            return;
        }

        const lines = [];
        document.querySelectorAll('#lineItemsBody tr').forEach(row => {
            const inputs = row.querySelectorAll('input');
            if (inputs[0].value) {
                lines.push({
                    name: inputs[0].value,
                    qty: parseFloat(inputs[1].value) || 1,
                    price: parseFloat(inputs[2].value) || 0,
                    total: (parseFloat(inputs[1].value) || 1) * (parseFloat(inputs[2].value) || 0)
                });
            }
        });

        if (lines.length === 0) {
            alert('Please add at least one item');
            return;
        }

        const now = new Date();
        const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
        const grandTotal = lines.reduce((sum, l) => sum + l.total, 0);

        currentBillData = {
            customer_id: selectedCustomer.id,
            lines: lines,
            total_amount: grandTotal,
            payment_method: paymentMethod,
            date: todayStr,
            odometer: document.getElementById('odometer').value,
            notes: document.getElementById('notes').value
        };

        isCurrentBillProcessed = false;
        confirmPaymentBtn.style.opacity = '1';
        confirmPaymentBtn.disabled = false;

        generateReceipt(lines);
        receiptModal.classList.add('active');
    });

    confirmPaymentBtn.addEventListener('click', () => {
        if (isCurrentBillProcessed) {
            const lang = getCurrentLanguage();
            alert(translations[lang].billAlreadyProcessed);
            return;
        }

        if (!currentBillData) return;

        // Save to Database
        const repairId = db.addRepair({
            customer_id: currentBillData.customer_id,
            description: currentBillData.lines.map(l => l.name).join(', '),
            date: currentBillData.date,
            total_amount: currentBillData.total_amount,
            payment_method: currentBillData.payment_method,
            odometer: currentBillData.odometer,
            notes: currentBillData.notes
        });

        currentBillData.lines.forEach(l => {
            db.addRepairItem({
                repair_id: repairId,
                item_name: l.name,
                quantity: l.qty,
                unit_price: l.price
            });
        });

        isCurrentBillProcessed = true;
        confirmPaymentBtn.style.opacity = '0.5';
        
        const lang = getCurrentLanguage();
        alert(translations[lang].billProcessed);
        
        // Reset form after saving
        resetForm();
    });

    function resetForm() {
        customerSearch.value = '';
        selectedCustomer = null;
        if (selectedCustomerDisplay) {
            selectedCustomerDisplay.innerHTML = '';
            selectedCustomerDisplay.style.display = 'none';
        }
        
        customerName.value = '';
        customerPhone.value = '';
        carModelInput.value = '';
        plateNumberInput.value = '';

        lineItemsBody.innerHTML = `
            <tr>
                <td><input type="text" class="form-control" placeholder="e.g. Engine Oil Change"></td>
                <td><input type="number" class="form-control qty-input" value="1" min="1"></td>
                <td><input type="number" class="form-control price-input" value="0" min="0" step="0.01"></td>
                <td class="font-bold text-teal line-subtotal">$0.00</td>
                <td><button class="btn btn-outline remove-item-btn" style="color: #ef4444; border-color: #fee2e2;">×</button></td>
            </tr>
        `;
        attachRowListeners(lineItemsBody.querySelector('tr'));
        updateGrandTotal();
        
        isCurrentBillProcessed = false;
        currentBillData = null;
        receiptModal.classList.remove('active');
    }

    function generateReceipt(lines) {
        const lang = getCurrentLanguage();
        const t = translations[lang];
        const now = new Date();
        const date = now.toLocaleDateString();
        const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
        const total = grandTotalEl.textContent;

        receiptContent.innerHTML = `
            <div style="text-align: center; border-bottom: 2px solid #eee; padding-bottom: 1rem; margin-bottom: 1rem;">
                <h1 style="color: #0d9488;">${t.appName}</h1>
                <p>${t.receiptTitle}</p>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
                <div>
                    <p><strong>${t.customer}:</strong> ${selectedCustomer.name}</p>
                    <p><strong>${t.phone}:</strong> ${selectedCustomer.phone}</p>
                    <p><strong>${t.carModel}:</strong> ${selectedCustomer.car_name}</p>
                    <p><strong>${t.plateNumber || 'Plate'}:</strong> ${selectedCustomer.plate_number}</p>
                </div>
                <div style="text-align: right;">
                    <p><strong>${t.date}:</strong> ${date}</p>
                    <p><strong>${t.payment}:</strong> ${paymentMethod}</p>
                    ${currentBillData && currentBillData.odometer ? `<p><strong>${t.odometer}:</strong> ${currentBillData.odometer}</p>` : ''}
                </div>
            </div>
            <table style="width: 100%; border-collapse: collapse; margin-top: 1rem;">
                <thead>
                    <tr style="background: #f8fafc; border-bottom: 2px solid #eee;">
                        <th style="padding: 0.5rem; text-align: left;">${t.serviceName}</th>
                        <th style="padding: 0.5rem; text-align: center;">${t.qty}</th>
                        <th style="padding: 0.5rem; text-align: right;">${t.price}</th>
                        <th style="padding: 0.5rem; text-align: right;">${t.subtotal}</th>
                    </tr>
                </thead>
                <tbody>
                    ${lines.map(l => `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 0.5rem;">${l.name}</td>
                            <td style="padding: 0.5rem; text-align: center;">${l.qty}</td>
                            <td style="padding: 0.5rem; text-align: right;">$${parseFloat(l.price).toFixed(2)}</td>
                            <td style="padding: 0.5rem; text-align: right;">$${l.total.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div style="text-align: right; margin-top: 2rem; font-size: 1.5rem; font-weight: 700; color: #0d9488;">
                ${t.total}: ${total}
            </div>

            ${currentBillData && currentBillData.notes ? `
            <div style="margin-top: 1.5rem; padding: 1rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
                <p style="margin: 0; font-weight: 700; color: #1e293b;">${t.notes}:</p>
                <p style="margin: 0.5rem 0 0 0; color: #475569; white-space: pre-wrap;">${currentBillData.notes}</p>
            </div>
            ` : ''}

            <!-- Footer Section -->
            <div style="margin-top: 4rem; display: flex; justify-content: space-between; border-top: 1px solid #eee; padding-top: 1rem;">
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
            receiptContent.style.direction = 'rtl';
            receiptContent.querySelectorAll('th').forEach(th => th.style.textAlign = 'right');
        } else {
            receiptContent.style.direction = 'ltr';
        }
    }

    closeModalBtn.addEventListener('click', () => receiptModal.classList.remove('active'));
    printReceiptBtn.addEventListener('click', async () => {
        const { ipcRenderer } = require('electron');
        const dateStr = currentBillData ? currentBillData.date : new Date().toISOString().split('T')[0];
        const customerNameStr = (selectedCustomer ? selectedCustomer.name : 'Unknown').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const fileName = `${dateStr}_${customerNameStr}.pdf`;

        const result = await ipcRenderer.invoke('print-to-pdf', {
            folder: 'bills',
            name: fileName
        });

        if (result.success) {
            console.log('Bill saved to:', result.path);
        } else {
            alert('Printing/Saving failed: ' + result.error);
        }
    });

});
