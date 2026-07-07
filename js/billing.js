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

    const paymentMethodSelect = document.getElementById('paymentMethodSelect');
    const savePendingBtn = document.getElementById('savePendingBtn');
    const discountInput = document.getElementById('discountInput');
    const netTotalEl = document.getElementById('netTotal');
    const payByPartsSection = document.getElementById('payByPartsSection');
    const amountPaidInput = document.getElementById('amountPaidInput');
    const pendingDisplay = document.getElementById('pendingDisplay');
    const splitPaymentSection = document.getElementById('splitPaymentSection');
    const splitMethod1 = document.getElementById('splitMethod1');
    const splitAmount1 = document.getElementById('splitAmount1');
    const splitMethod2 = document.getElementById('splitMethod2');
    const splitAmount2 = document.getElementById('splitAmount2');
    const splitRemaining = document.getElementById('splitRemaining');

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

        const grouped = {};
        results.forEach(c => {
            const key = c.phone || c.name;
            if (!grouped[key]) {
                grouped[key] = {
                    name: c.name,
                    phone: c.phone,
                    cars: []
                };
            }
            grouped[key].cars.push(c);
        });

        Object.values(grouped).forEach(g => {
            const t = translations[getCurrentLanguage()];
            const carLabel = g.cars.length === 1 ? (t.carRegistered || 'car registered') : (t.carsRegistered || 'cars registered');
            const div = document.createElement('div');
            div.className = 'result-item';
            div.innerHTML = `
                <span class="result-name">${g.name}</span>
                <span class="result-phone">${g.phone}</span>
                <span class="result-car" style="color: #64748b; font-size: 0.85rem;">${g.cars.length} ${carLabel}</span>
            `;
            div.onclick = () => selectCustomerGroup(g);
            searchResults.appendChild(div);
        });

        searchResults.classList.add('active');
    }

    function selectCustomerGroup(group) {
        customerSearch.value = '';
        searchResults.classList.remove('active');

        // Auto-fill person fields
        customerName.value = group.name;
        customerPhone.value = group.phone;
        
        const carSelectGroup = document.getElementById('carSelectGroup');
        const carSelect = document.getElementById('carSelect');

        if (group.cars.length > 1 && carSelectGroup && carSelect) {
            carSelectGroup.style.display = 'block';
            carSelect.innerHTML = '';
            group.cars.forEach((car, index) => {
                const opt = document.createElement('option');
                opt.value = index;
                const t = translations[getCurrentLanguage()];
                const carNameStr = car.car_name || (t.unknownCar || 'Unknown Car');
                const plateStr = car.plate_number || (t.noPlate || 'No Plate');
                opt.textContent = `${carNameStr} | ${plateStr}`;
                carSelect.appendChild(opt);
            });
            
            carSelect.onchange = () => {
                selectedCustomer = group.cars[carSelect.value];
                carModelInput.value = selectedCustomer.car_name || '';
                plateNumberInput.value = selectedCustomer.plate_number || '';
            };
            
            // Select first by default
            carSelect.value = 0;
            carSelect.onchange();
        } else {
            if (carSelectGroup) carSelectGroup.style.display = 'none';
            selectedCustomer = group.cars[0];
            carModelInput.value = selectedCustomer.car_name || '';
            plateNumberInput.value = selectedCustomer.plate_number || '';
        }
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
        const nameInput = row.querySelector('input[type="text"]');
        const qtyInput = row.querySelector('.qty-input');
        const priceInput = row.querySelector('.price-input');

        const tryAutoAdd = () => {
            const rows = Array.from(lineItemsBody.querySelectorAll('tr'));
            const isLast = rows[rows.length - 1] === row;
            if (isLast && !row.dataset.autoAdded) {
                const nameVal = nameInput ? nameInput.value.trim() : "";
                if (nameVal !== "") {
                    row.dataset.autoAdded = "true";
                    addItemBtn.click();
                }
            }
        };

        if (nameInput) {
            nameInput.addEventListener('input', tryAutoAdd);
            nameInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (qtyInput) qtyInput.focus();
                }
            });
        }

        if (qtyInput) {
            qtyInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (priceInput) priceInput.focus();
                }
            });
        }

        if (priceInput) {
            priceInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === 'Tab') {
                    const rows = Array.from(lineItemsBody.querySelectorAll('tr'));
                    const isLast = rows[rows.length - 1] === row;
                    const nameVal = nameInput ? nameInput.value.trim() : "";
                    if (isLast && nameVal !== "") {
                        if (!row.dataset.autoAdded) {
                            row.dataset.autoAdded = "true";
                            addItemBtn.click();
                        }
                        // Focus next row's name input
                        setTimeout(() => {
                            const newRows = lineItemsBody.querySelectorAll('tr');
                            const newLastRow = newRows[newRows.length - 1];
                            if (newLastRow) {
                                const nextName = newLastRow.querySelector('input[type="text"]');
                                if (nextName) nextName.focus();
                            }
                        }, 50);
                        if (e.key === 'Enter') e.preventDefault();
                    } else if (e.key === 'Enter') {
                        // Move focus to next row if it exists
                        const nextRow = row.nextElementSibling;
                        if (nextRow) {
                            const nextName = nextRow.querySelector('input[type="text"]');
                            if (nextName) nextName.focus();
                        }
                        e.preventDefault();
                    }
                }
            });
        }

        [qtyInput, priceInput].forEach(input => {
            if (input) {
                input.addEventListener('input', () => {
                    const qty = parseFloat(qtyInput.value) || 0;
                    const price = parseFloat(priceInput.value) || 0;
                    const subtotal = qty * price;
                    row.querySelector('.line-subtotal').textContent = `$${subtotal.toFixed(2)}`;
                    updateGrandTotal();
                    if (input === priceInput && price > 0) {
                        tryAutoAdd();
                    }
                });
            }
        });
    }

    attachRowListeners(lineItemsBody.querySelector('tr'));

    function updateGrandTotal() {
        let total = 0;
        document.querySelectorAll('.line-subtotal').forEach(el => {
            total += parseFloat(el.textContent.replace('$', '')) || 0;
        });
        if(grandTotalEl) grandTotalEl.textContent = `$${total.toFixed(2)}`;
        
        let discount = 0;
        if(discountInput) discount = parseFloat(discountInput.value) || 0;
        const netTotal = Math.max(0, total - discount);
        if(netTotalEl) netTotalEl.textContent = `$${netTotal.toFixed(2)}`;

        if(amountPaidInput && pendingDisplay) {
            const amountPaid = parseFloat(amountPaidInput.value) || 0;
            const pending = Math.max(0, netTotal - amountPaid);
            pendingDisplay.textContent = pending.toFixed(2);
        }

        if (splitRemaining) {
            const s1 = parseFloat(splitAmount1.value) || 0;
            const s2 = parseFloat(splitAmount2.value) || 0;
            const remaining = Math.max(0, netTotal - s1 - s2);
            splitRemaining.textContent = remaining.toFixed(2);
            splitRemaining.style.color = remaining > 0.009 ? '#ef4444' : '#059669';
        }
    }

    if(discountInput) discountInput.addEventListener('input', updateGrandTotal);
    if(amountPaidInput) amountPaidInput.addEventListener('input', updateGrandTotal);
    if(splitAmount1) splitAmount1.addEventListener('input', updateGrandTotal);
    if(splitAmount2) splitAmount2.addEventListener('input', updateGrandTotal);

    // Payment Method Select
    paymentMethodSelect.addEventListener('change', () => {
        paymentMethod = paymentMethodSelect.value;
        if (paymentMethod === 'PayByParts') {
            payByPartsSection.style.display = 'block';
            splitPaymentSection.style.display = 'none';
        } else if (paymentMethod === 'SplitPayment') {
            payByPartsSection.style.display = 'none';
            splitPaymentSection.style.display = 'block';
            updateGrandTotal();
        } else {
            payByPartsSection.style.display = 'none';
            splitPaymentSection.style.display = 'none';
        }
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
            if (inputs[0] && inputs[0].value) {
                lines.push({
                    name: inputs[0].value,
                    qty: parseFloat(inputs[1].value) || 1,
                    price: parseFloat(inputs[2].value) || 0,
                    total: (parseFloat(inputs[1].value) || 1) * (parseFloat(inputs[2].value) || 0),
                    part_id: row.dataset.partId || null
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
        const discount = parseFloat(discountInput.value) || 0;
        const netTotal = Math.max(0, grandTotal - discount);
        let paidAmt = netTotal;
        let pendingAmt = 0;
        
        if (paymentMethodSelect.value === 'PayByParts') {
            paidAmt = parseFloat(amountPaidInput.value) || 0;
            pendingAmt = Math.max(0, netTotal - paidAmt);
        }

        const isSplit = paymentMethodSelect.value === 'SplitPayment';
        let splitData = null;
        if (isSplit) {
            const s1 = parseFloat(splitAmount1.value) || 0;
            const s2 = parseFloat(splitAmount2.value) || 0;
            splitData = {
                method1: splitMethod1.value,
                amount1: s1,
                method2: splitMethod2.value,
                amount2: s2
            };
        }

        currentBillData = {
            customer_id: selectedCustomer.id,
            lines: lines,
            total_amount: grandTotal,
            paid_amount: isSplit ? ((parseFloat(splitAmount1.value)||0) + (parseFloat(splitAmount2.value)||0)) : paidAmt,
            pending_amount: pendingAmt,
            discount: discount,
            payment_method: paymentMethodSelect.value,
            split_data: splitData,
            date: todayStr,
            odometer: document.getElementById('odometer').value,
            notes: document.getElementById('notes').value
        };
        paymentMethod = paymentMethodSelect.value;

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
        const notesWithSplit = currentBillData.split_data
            ? (currentBillData.notes ? currentBillData.notes + '\n' : '') + '__SPLIT__:' + JSON.stringify(currentBillData.split_data)
            : currentBillData.notes;

        const repairId = db.addRepair({
            customer_id: currentBillData.customer_id,
            description: currentBillData.lines.map(l => l.name).join(', '),
            date: currentBillData.date,
            total_amount: currentBillData.total_amount,
            paid_amount: currentBillData.paid_amount,
            pending_amount: currentBillData.pending_amount,
            discount: currentBillData.discount,
            payment_method: currentBillData.payment_method,
            odometer: currentBillData.odometer,
            notes: notesWithSplit
        });

        currentBillData.lines.forEach(l => {
            db.addRepairItem({
                repair_id: repairId,
                item_name: l.name,
                quantity: l.qty,
                unit_price: l.price
            });
            if (l.part_id) {
                db.deductPartStock(l.part_id, l.qty);
            }
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
        
        const carSelectGroup = document.getElementById('carSelectGroup');
        if (carSelectGroup) carSelectGroup.style.display = 'none';

        lineItemsBody.innerHTML = `
            <tr>
                <td><input type="text" class="form-control" placeholder="e.g. Engine Oil Change"></td>
                <td><input type="number" class="form-control qty-input" value="1" min="1"></td>
                <td><input type="number" class="form-control price-input" value="0" min="0" step="0.01"></td>
                <td class="font-bold text-teal line-subtotal">$0.00</td>
                <td><button class="btn btn-outline remove-item-btn" style="color: #ef4444; border-color: #fee2e2;">×</button></td>
            </tr>
        `;
        if (discountInput) discountInput.value = '0';
        if (amountPaidInput) amountPaidInput.value = '0';
        if (paymentMethodSelect) paymentMethodSelect.value = 'Cash';
        if (payByPartsSection) payByPartsSection.style.display = 'none';
        
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

        // Fixed sizing, relying on CSS pagination for long lists
        let baseFontSize = '0.95rem';
        let logoMaxHeight = '140px';
        let tablePadding = '0.5rem';
        let sectionMargin = '1rem';
        let footerMargin = '4rem';

        receiptContent.style.fontSize = baseFontSize;

        receiptContent.innerHTML = `
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
                    <p style="margin: 0.25rem 0;"><strong>${t.customer}:</strong> ${selectedCustomer.name}</p>
                    <p style="margin: 0.25rem 0;"><strong>${t.phone}:</strong> ${selectedCustomer.phone}</p>
                    <p style="margin: 0.25rem 0;"><strong>${t.carModel}:</strong> ${selectedCustomer.car_name}</p>
                    <p style="margin: 0.25rem 0;"><strong>${t.plateNumber || 'Plate'}:</strong> ${selectedCustomer.plate_number}</p>
                </div>
                <div style="text-align: right;">
                    <p style="margin: 0.25rem 0;"><strong>${t.date}:</strong> ${date}</p>
                    ${currentBillData && currentBillData.split_data
                        ? `<p style="margin: 0.25rem 0;"><strong>${t.payment}:</strong> Split</p>
                           <p style="margin: 0.1rem 0; font-size:0.85rem; color:#059669;">${currentBillData.split_data.method1}: $${currentBillData.split_data.amount1.toFixed(2)}</p>
                           <p style="margin: 0.1rem 0; font-size:0.85rem; color:#059669;">${currentBillData.split_data.method2}: $${currentBillData.split_data.amount2.toFixed(2)}</p>`
                        : `<p style="margin: 0.25rem 0;"><strong>${t.payment}:</strong> ${window.getTranslatedPaymentMethod(paymentMethod)}</p>`
                    }
                    ${currentBillData && currentBillData.odometer ? `<p style="margin: 0.25rem 0;"><strong>${t.odometer}:</strong> ${currentBillData.odometer}</p>` : ''}
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
                    ${lines.map(l => `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: ${tablePadding};">${l.name}</td>
                            <td style="padding: ${tablePadding}; text-align: center;">${l.qty}</td>
                            <td style="padding: ${tablePadding}; text-align: right;">$${parseFloat(l.price).toFixed(2)}</td>
                            <td style="padding: ${tablePadding}; text-align: right;">$${l.total.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div style="margin-top: ${sectionMargin}; width: 300px; margin-left: auto; margin-right: 0;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 1.1rem;">
                    <span>${t.total}:</span>
                    <span>${total}</span>
                </div>
                ${currentBillData && currentBillData.discount > 0 ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 1.1rem; color: #ef4444;">
                    <span>${t.discount || 'Discount'}:</span>
                    <span>-$${currentBillData.discount.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 1.2rem; font-weight: bold; color: #10b981; border-top: 1px solid #eee; padding-top: 0.5rem;">
                    <span>${t.netTotal || 'Net Total'}:</span>
                    <span>$${(currentBillData.total_amount - currentBillData.discount).toFixed(2)}</span>
                </div>
                ` : ''}
                
                ${currentBillData && currentBillData.payment_method === 'PayByParts' ? `
                <div style="display: flex; justify-content: space-between; margin-top: 0.5rem; font-size: 1.1rem; color: #3b82f6;">
                    <span>${t.amountPaidNow || 'Amount Paid'}:</span>
                    <span>$${currentBillData.paid_amount.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 0.5rem; font-size: 1.1rem; color: #ef4444;">
                    <span>${t.pendingAmount || 'Pending'}:</span>
                    <span>$${currentBillData.pending_amount.toFixed(2)}</span>
                </div>
                ` : ''}
                ${currentBillData && currentBillData.split_data ? `
                <div style="border-top: 1px solid #eee; margin-top:0.5rem; padding-top:0.5rem;">
                    <p style="font-size:0.85rem; font-weight:600; color:#059669; margin-bottom:0.25rem;">Payment Breakdown</p>
                    <div style="display: flex; justify-content: space-between; font-size: 1rem; color: #1e293b;">
                        <span>${currentBillData.split_data.method1}:</span>
                        <span>$${currentBillData.split_data.amount1.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 1rem; color: #1e293b;">
                        <span>${currentBillData.split_data.method2}:</span>
                        <span>$${currentBillData.split_data.amount2.toFixed(2)}</span>
                    </div>
                </div>
                ` : ''}
            </div>

            ${currentBillData && currentBillData.notes ? `
            <div style="margin-top: ${sectionMargin}; padding: 1rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
                <p style="margin: 0; font-weight: 700; color: #1e293b;">${t.notes}:</p>
                <p style="margin: 0.5rem 0 0 0; color: #475569; white-space: pre-wrap;">${currentBillData.notes}</p>
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
            receiptContent.style.direction = 'rtl';
            receiptContent.querySelectorAll('th').forEach(th => th.style.textAlign = 'right');
        } else {
            receiptContent.style.direction = 'ltr';
        }
    }

    closeModalBtn.addEventListener('click', () => receiptModal.classList.remove('active'));
    printReceiptBtn.addEventListener('click', () => {
        const printContainer = document.getElementById('printContainer');
        printContainer.innerHTML = receiptContent.innerHTML;
        if (getCurrentLanguage() === 'ar') {
            printContainer.style.direction = 'rtl';
        } else {
            printContainer.style.direction = 'ltr';
        }
        receiptModal.classList.remove('active');
        window.print();
        receiptModal.classList.add('active');
    });

    savePendingBtn.addEventListener('click', () => {
        if (!selectedCustomer) {
            alert('Please select a customer first');
            return;
        }

        const lines = [];
        document.querySelectorAll('#lineItemsBody tr').forEach(row => {
            const inputs = row.querySelectorAll('input');
            if (inputs[0] && inputs[0].value) {
                lines.push({
                    name: inputs[0].value,
                    qty: parseFloat(inputs[1].value) || 1,
                    price: parseFloat(inputs[2].value) || 0,
                    total: (parseFloat(inputs[1].value) || 1) * (parseFloat(inputs[2].value) || 0),
                    part_id: row.dataset.partId || null
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

        db.addPendingBill({
            customer_id: selectedCustomer.id,
            description: lines.map(l => l.name).join(', '),
            date_created: todayStr,
            total_amount: grandTotal,
            discount: parseFloat(discountInput.value) || 0,
            payment_method: paymentMethodSelect.value,
            odometer: document.getElementById('odometer').value,
            notes: document.getElementById('notes').value,
            line_items_json: JSON.stringify(lines)
        });

        alert('Bill saved as pending successfully!');
        resetForm();
    });

    // --- Parts Search Logic ---
    const addFromStockBtn = document.getElementById('addFromStockBtn');
    const partsSearchModal = document.getElementById('partsSearchModal');
    const closePartsModalBtn = document.getElementById('closePartsModalBtn');
    const partSearchInputModal = document.getElementById('partSearchInputModal');
    const partsSearchBody = document.getElementById('partsSearchBody');

    if (addFromStockBtn) {
        addFromStockBtn.addEventListener('click', () => {
            partsSearchModal.classList.add('active');
            loadPartsModal('');
            if (partSearchInputModal) {
                partSearchInputModal.value = '';
                setTimeout(() => partSearchInputModal.focus(), 100);
            }
        });
    }

    if (closePartsModalBtn) {
        closePartsModalBtn.addEventListener('click', () => {
            partsSearchModal.classList.remove('active');
        });
    }

    if (partSearchInputModal) {
        partSearchInputModal.addEventListener('input', (e) => {
            loadPartsModal(e.target.value.trim());
        });
    }

    function loadPartsModal(term) {
        if (!partsSearchBody) return;
        partsSearchBody.innerHTML = '';
        const parts = term ? db.searchParts(term) : db.getParts();
        
        if (parts.length === 0) {
            partsSearchBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 1rem;">No parts found</td></tr>`;
            return;
        }

        parts.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="font-bold text-teal">${p.name}</td>
                <td>${p.quantity_in_stock}</td>
                <td>$${parseFloat(p.unit_price).toFixed(2)}</td>
                <td>
                    <button class="btn btn-primary" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" ${p.quantity_in_stock <= 0 ? 'disabled' : ''}>
                        Add
                    </button>
                </td>
            `;
            const addBtn = tr.querySelector('button');
            if (addBtn && !addBtn.disabled) {
                addBtn.addEventListener('click', () => {
                    addPartToLineItems(p);
                    partsSearchModal.classList.remove('active');
                });
            }
            partsSearchBody.appendChild(tr);
        });
    }

    function addPartToLineItems(part) {
        const tr = document.createElement('tr');
        tr.dataset.partId = part.id;
        tr.innerHTML = `
            <td><input type="text" class="form-control" value="${part.name}" placeholder="e.g. Brake Pads"></td>
            <td><input type="number" class="form-control qty-input" value="1" min="1" max="${part.quantity_in_stock}"></td>
            <td><input type="number" class="form-control price-input" value="${part.unit_price}" min="0" step="0.01"></td>
            <td class="font-bold text-teal line-subtotal">$${parseFloat(part.unit_price).toFixed(2)}</td>
            <td><button class="btn btn-outline remove-item-btn" style="color: #ef4444; border-color: #fee2e2;">×</button></td>
        `;
        lineItemsBody.appendChild(tr);
        attachRowListeners(tr);
        updateGrandTotal();
    }

});
