let db;
try {
    db = require('../database/db.js');
} catch (e) {
    console.error('Failed to load database:', e);
    alert('Database Error: ' + e.message + '\n\n' + e.stack);
}

document.addEventListener('DOMContentLoaded', () => {
    translatePage();

    const langToggle = document.getElementById('langToggle');
    if (langToggle) {
        langToggle.addEventListener('click', () => {
            const newLang = getCurrentLanguage() === 'en' ? 'ar' : 'en';
            setLanguage(newLang);
        });
    }

    // Tabs
    const tabAddCustomer = document.getElementById('tabAddCustomer');
    const tabSearchCustomer = document.getElementById('tabSearchCustomer');
    const tabAllCustomers = document.getElementById('tabAllCustomers');
    const tabCustomerHistory = document.getElementById('tabCustomerHistory');

    const viewAddCustomer = document.getElementById('viewAddCustomer');
    const viewSearchCustomer = document.getElementById('viewSearchCustomer');
    const viewAllCustomers = document.getElementById('viewAllCustomers');
    const viewCustomerHistory = document.getElementById('viewCustomerHistory');

    // Customer History Elements
    const historySearch = document.getElementById('historySearch');
    const historyCustomerList = document.getElementById('historyCustomerList');
    const historyDetails = document.getElementById('historyDetails');
    const historyCustomerName = document.getElementById('historyCustomerName');
    const historyRepairsTableBody = document.getElementById('historyRepairsTableBody');
    const backToHistoryList = document.getElementById('backToHistoryList');

    function switchTab(tabId) {
        // Reset buttons
        [tabAddCustomer, tabSearchCustomer, tabAllCustomers, tabCustomerHistory].forEach(btn => {
            if (btn) {
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-outline');
            }
        });
        const activeBtn = document.getElementById(tabId);
        if (activeBtn) {
            activeBtn.classList.add('btn-primary');
            activeBtn.classList.remove('btn-outline');
        }

        // Reset views
        [viewAddCustomer, viewSearchCustomer, viewAllCustomers, viewCustomerHistory].forEach(v => {
            if (v) v.style.display = 'none';
        });

        if (tabId === 'tabAddCustomer') {
            viewAddCustomer.style.display = 'block';
        } else if (tabId === 'tabSearchCustomer') {
            viewSearchCustomer.style.display = 'block';
            loadAllCustomers();
        } else if (tabId === 'tabAllCustomers') {
            viewAllCustomers.style.display = 'block';
            loadAllCustomersTable();
        } else if (tabId === 'tabCustomerHistory') {
            viewCustomerHistory.style.display = 'block';
            loadHistoryCustomers();
        }
    }

    if (tabAddCustomer) {
        tabAddCustomer.onclick = () => {
            editingCustomerId = null;
            saveCustomerBtn.textContent = getCurrentLanguage() === 'en' ? 'Save Customer' : 'حفظ العميل';
            switchTab('tabAddCustomer');
        };
    }
    if (tabSearchCustomer) tabSearchCustomer.onclick = () => switchTab('tabSearchCustomer');
    if (tabAllCustomers) tabAllCustomers.onclick = () => switchTab('tabAllCustomers');
    if (tabCustomerHistory) tabCustomerHistory.onclick = () => switchTab('tabCustomerHistory');

    // Add Customer View
    const saveCustomerBtn = document.getElementById('saveCustomerBtn');
    saveCustomerBtn.addEventListener('click', () => {
        const name = document.getElementById('addName').value;
        const phone = document.getElementById('addPhone').value;
        const car_name = document.getElementById('addCarName').value;
        const plate_number = document.getElementById('addPlate').value;

        if (!name) {
            alert('Name is required');
            return;
        }

        if (editingCustomerId) {
            db.updateCustomer(editingCustomerId, { name, phone, car_name, plate_number });
            editingCustomerId = null;
            saveCustomerBtn.textContent = getCurrentLanguage() === 'en' ? 'Save Customer' : 'حفظ العميل';
            alert(getCurrentLanguage() === 'en' ? 'Customer updated successfully' : 'تم تحديث العميل بنجاح');
        } else {
            const existings = db.getCustomersByPhone(phone);
            if (existings && existings.length > 0) {
                // Allow same phone if car is different, block if exact same name & car
                const duplicate = existings.find(c => c.name === name && c.car_name === car_name && c.plate_number === plate_number);
                if (duplicate) {
                    const lang = getCurrentLanguage();
                    alert(translations[lang].duplicateCustomerError);
                    return;
                }
            }

            db.addCustomer({ name, phone, car_name, plate_number });
            alert(translations[getCurrentLanguage()].customerAdded);
        }
        
        document.getElementById('addName').value = '';
        document.getElementById('addPhone').value = '';
        document.getElementById('addCarName').value = '';
        document.getElementById('addPlate').value = '';
    });

    // Search Customer View
    const customerSearch = document.getElementById('customerSearch');
    const searchResults = document.getElementById('searchResults');
    const customerInfoCard = document.getElementById('customerInfoCard');
    const repairsHistorySection = document.getElementById('repairsHistorySection');
    const repairsTableBody = document.getElementById('repairsTableBody');

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

        // Group by phone (or name if no phone)
        const grouped = {};
        results.forEach(c => {
            const key = c.phone || c.name;
            if (!grouped[key]) {
                grouped[key] = {
                    id: c.id, // primary id for repairs lookup (fallback)
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
                <div style="flex: 1;">
                    <span class="result-name">${g.name}</span>
                    <span class="result-phone">${g.phone || ''}</span>
                    <span class="result-car" style="color: #64748b; font-size: 0.85rem;">${g.cars.length} ${carLabel}</span>
                </div>
            `;
            div.onclick = () => selectCustomer(g);
            searchResults.appendChild(div);
        });

        searchResults.classList.add('active');
    }

    window.deleteCustomer = function(id) {
        const lang = getCurrentLanguage();
        if (confirm(translations[lang].confirmDeleteCustomer)) {
            db.deleteCustomer(id);
            // Refresh
            if (viewAllCustomers.style.display === 'block') {
                loadAllCustomersTable();
            } else {
                const term = customerSearch.value.toLowerCase();
                if (term.length >= 2) {
                    renderSearchResults(db.searchCustomers(term));
                } else {
                    renderSearchResults(db.getCustomers());
                }
            }
        }
    }

    function loadAllCustomersTable() {
        const tableBody = document.getElementById('allCustomersTableBody');
        const customers = db.getCustomers();
        tableBody.innerHTML = '';

        customers.forEach(c => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${c.name}</td>
                <td>${c.phone || ''}</td>
                <td>${c.car_name || ''}</td>
                <td>${c.plate_number || ''}</td>
                <td>
                    <div class="flex gap-2">
                        <button class="btn btn-outline" style="padding: 0.25rem 0.5rem;" onclick="editCustomer(${JSON.stringify(c).replace(/"/g, '&quot;')})">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button class="btn btn-outline" style="color: #ef4444; border-color: #fee2e2; padding: 0.25rem 0.5rem;" onclick="deleteCustomer(${c.id})">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                    </div>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    }

    let editingCustomerId = null;
    window.editCustomer = function(c) {
        editingCustomerId = c.id;
        document.getElementById('addName').value = c.name;
        document.getElementById('addPhone').value = c.phone || '';
        document.getElementById('addCarName').value = c.car_name || '';
        document.getElementById('addPlate').value = c.plate_number || '';
        
        const saveBtn = document.getElementById('saveCustomerBtn');
        saveBtn.textContent = getCurrentLanguage() === 'en' ? 'Update Customer' : 'تحديث العميل';
        switchTab('add');
    };

    function selectCustomer(customerGroup) {
        customerSearch.value = '';
        searchResults.classList.remove('active');

        // Show customer info card
        customerInfoCard.style.display = 'block';
        document.getElementById('infoName').textContent = customerGroup.name;
        document.getElementById('infoPhone').textContent = customerGroup.phone || '-';
        
        const carsList = document.getElementById('infoCarsList');
        carsList.innerHTML = '';
        customerGroup.cars.forEach(car => {
            const el = document.createElement('div');
            el.style.background = '#fff';
            el.style.padding = '0.5rem';
            el.style.borderRadius = '4px';
            el.style.border = '1px solid #e2e8f0';
            el.style.display = 'flex';
            el.style.justifyContent = 'space-between';
            el.innerHTML = `
                <div>
                    <div class="font-bold text-teal">${car.car_name || '-'}</div>
                    <div style="font-size: 0.8rem; color: #64748b;">Plate: ${car.plate_number || '-'}</div>
                </div>
                <button class="btn btn-outline" style="color: #ef4444; border-color: #fee2e2; padding: 0.25rem; height: 30px;" onclick="deleteCustomer(${car.id})">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
            `;
            carsList.appendChild(el);
        });

        // Set up Add Another Car button
        const addAnotherBtn = document.getElementById('addAnotherCarBtn');
        if (addAnotherBtn) {
            addAnotherBtn.onclick = () => {
                document.getElementById('addName').value = customerGroup.name;
                document.getElementById('addPhone').value = customerGroup.phone || '';
                document.getElementById('addCarName').value = '';
                document.getElementById('addPlate').value = '';
                editingCustomerId = null;
                saveCustomerBtn.textContent = getCurrentLanguage() === 'en' ? 'Save Customer' : 'حفظ العميل';
                switchTab('tabAddCustomer');
            };
        }

        // Load repair history for ALL cars of this customer
        let allRepairs = [];
        customerGroup.cars.forEach(car => {
            const carRepairs = db.getRepairsByCustomer(car.id);
            // Append car info to repairs so we know which car it is
            carRepairs.forEach(r => {
                r.car_name = car.car_name;
                r.plate_number = car.plate_number;
            });
            allRepairs = allRepairs.concat(carRepairs);
        });
        
        // Sort by date descending
        allRepairs.sort((a, b) => new Date(b.date) - new Date(a.date));

        repairsTableBody.innerHTML = '';
        
        if (allRepairs.length > 0) {
            repairsHistorySection.style.display = 'block';
            allRepairs.forEach(r => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${r.date}<br><small style="color:#64748b;">${r.car_name}</small></td>
                    <td>${r.description || 'General Service'}</td>
                    <td class="font-bold text-teal">$${parseFloat(r.total_amount).toFixed(2)}</td>
                    <td>${r.payment_method}</td>
                `;
                repairsTableBody.appendChild(tr);
            });
        } else {
            repairsHistorySection.style.display = 'none';
        }
    }

    // Final Cleanup & Initialization
    document.addEventListener('click', (e) => {
        if (customerSearch && !customerSearch.contains(e.target) && searchResults && !searchResults.contains(e.target)) {
            searchResults.classList.remove('active');
        }
    });

    // Customer History Logic
    function loadHistoryCustomers() {
        const term = historySearch.value.toLowerCase();
        const customers = db.getCustomers().filter(c => 
            c.name.toLowerCase().includes(term) || (c.phone && c.phone.includes(term))
        );

        historyCustomerList.innerHTML = '';
        historyCustomerList.style.display = 'block';
        historyDetails.style.display = 'none';

        if (customers.length === 0) {
            historyCustomerList.innerHTML = '<p class="text-center p-4 text-gray-500">No customers found</p>';
            return;
        }

        const grid = document.createElement('div');
        grid.className = 'stat-grid';
        grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(250px, 1fr))';
        
        customers.forEach(c => {
            const card = document.createElement('div');
            card.className = 'stat-card';
            card.style.cursor = 'pointer';
            card.innerHTML = `
                <div class="font-bold text-teal">${c.name}</div>
                <div style="font-size: 0.8rem; color: #64748b;">${c.phone || '-'}</div>
                <div style="font-size: 0.8rem; color: #64748b;">${c.car_name || '-'}</div>
            `;
            card.onclick = () => showCustomerHistory(c);
            grid.appendChild(card);
        });
        historyCustomerList.appendChild(grid);
    }

    function showCustomerHistory(customer) {
        historyCustomerName.textContent = customer.name;
        const repairs = db.getRepairsByCustomer(customer.id);
        
        historyRepairsTableBody.innerHTML = '';
        if (repairs.length === 0) {
            historyRepairsTableBody.innerHTML = '<tr><td colspan="4" class="text-center p-4">No history found</td></tr>';
        } else {
            repairs.forEach((r, index) => {
                const items = db.getRepairItems(r.id);
                const tr = document.createElement('tr');
                const badgeClass = r.payment_method === 'Cash' ? 'badge-cash' : 'badge-card';
                
                let detailsHtml = '';
                if (items && items.length > 0) {
                    detailsHtml = `
                        <div class="collapsible-details" id="details-${index}" style="display: none; margin-top: 1rem; padding: 1rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
                            <ul style="list-style: none; padding: 0; margin: 0;">
                                ${items.map(i => `<li style="display: flex; justify-content: space-between; margin-bottom: 6px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 4px;">
                                    <span>• ${i.item_name} (x${i.quantity})</span>
                                    <span class="font-bold">${(i.quantity * i.unit_price).toFixed(2)}</span>
                                </li>`).join('')}
                            </ul>
                            <div style="margin-top: 0.75rem; border-top: 1px solid #e2e8f0; pt-2;">
                                ${r.odometer ? `<div style="font-size: 0.8rem; margin-top: 4px;"><strong>Odometer:</strong> ${r.odometer}</div>` : ''}
                                ${r.notes ? `<div style="font-size: 0.8rem; margin-top: 4px;"><strong>Notes:</strong> ${r.notes}</div>` : ''}
                            </div>
                        </div>
                    `;
                } else {
                    detailsHtml = `
                        <div class="collapsible-details" id="details-${index}" style="display: none; margin-top: 1rem; padding: 1rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
                            <ul style="list-style: none; padding: 0; margin: 0;">
                                <li style="display: flex; justify-content: space-between; margin-bottom: 6px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 4px;">
                                    <span>• ${r.description || 'No description'}</span>
                                </li>
                            </ul>
                            <div style="margin-top: 0.75rem; border-top: 1px solid #e2e8f0; pt-2;">
                                ${r.odometer ? `<div style="font-size: 0.8rem; margin-top: 4px;"><strong>Odometer:</strong> ${r.odometer}</div>` : ''}
                                ${r.notes ? `<div style="font-size: 0.8rem; margin-top: 4px;"><strong>Notes:</strong> ${r.notes}</div>` : ''}
                            </div>
                        </div>
                    `;
                }

                tr.innerHTML = `
                    <td style="vertical-align: top;">${r.date}</td>
                    <td>
                        <div class="flex justify-between items-center">
                            <div class="font-bold text-teal">${r.description || 'Service'}</div>
                            <div class="flex gap-1">
                                <button class="btn btn-outline btn-sm" onclick="printSingleRepair(${r.id})" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; color:#0d9488; border-color:#0d9488;">
                                    &#128424;&#65039;
                                </button>
                                <button class="btn btn-outline btn-sm" onclick="toggleDetails(${index})" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">
                                    Details
                                </button>
                            </div>
                        </div>
                        ${detailsHtml}
                    </td>
                    <td style="vertical-align: top;" class="font-bold">${parseFloat(r.total_amount).toFixed(2)}</td>
                    <td style="vertical-align: top;"><span class="badge ${badgeClass}">${r.payment_method}</span></td>
                `;
                historyRepairsTableBody.appendChild(tr);
            });
        }

        historyCustomerList.style.display = 'none';
        historyDetails.style.display = 'block';

        // Store current customer for printing
        historyDetails.dataset.customerId   = customer.id;
        historyDetails.dataset.customerName = customer.name;
    }

    window.toggleDetails = (index) => {
        const el = document.getElementById(`details-${index}`);
        if (el) {
            el.style.display = el.style.display === 'none' ? 'block' : 'none';
        }
    };

    historySearch.addEventListener('input', loadHistoryCustomers);
    backToHistoryList.onclick = () => loadHistoryCustomers();

    // Print Single Repair
    window.printSingleRepair = function(repairId) {
        const lang = getCurrentLanguage();
        const shopName = lang === 'ar' ? '\u0627\u0644\u0623\u0646\u0635\u0627\u0631\u064a' : 'El Ansary Service Shop';
        
        // Find the repair object
        let repair = null;
        let customer = null;
        
        // We know the customer ID from the historyDetails dataset
        const customerId = parseInt(historyDetails.dataset.customerId);
        if (!customerId) return;
        
        const repairs = db.getRepairsByCustomer(customerId);
        repair = repairs.find(r => r.id === repairId);
        if (!repair) return;

        const allCustomers = db.getCustomers();
        customer = allCustomers.find(c => c.id === customerId);
        if (!customer) return;

        const items = db.getRepairItems(repair.id);
        const amount = parseFloat(repair.total_amount) || 0;
        const discount = parseFloat(repair.discount) || 0;
        const net = amount - discount;
        const paid = repair.paid_amount !== null ? parseFloat(repair.paid_amount) : net;

        let itemsHtml = '';
        if (items.length > 0) {
            itemsHtml = items.map(function(it) {
                return '<tr>' +
                    '<td>' + it.item_name + '</td>' +
                    '<td style="text-align:center;">' + it.quantity + '</td>' +
                    '<td style="text-align:right;">' + parseFloat(it.unit_price).toFixed(2) + '</td>' +
                    '<td style="text-align:right;">' + (it.quantity * it.unit_price).toFixed(2) + '</td>' +
                    '</tr>';
            }).join('');
        } else {
            itemsHtml = '<tr><td colspan="4">' + (repair.description || (lang === 'ar' ? 'صيانة عامة' : 'General Service')) + '</td></tr>';
        }

        var textAlign = lang === 'ar' ? 'right' : 'left';
        var dir = lang === 'ar' ? 'rtl' : 'ltr';

        const html = '<html dir="' + dir + '"><head><meta charset="UTF-8">' +
        '<style>' +
        'body{font-family:Arial,sans-serif;font-size:14px;margin:30px;color:#1e293b; line-height:1.5;}' +
        '.header{text-align:center; margin-bottom:20px; padding-bottom:10px; border-bottom:2px solid #0d9488;}' +
        '.header h1{font-size:1.8rem; margin:0 0 5px 0; color:#0d9488;}' +
        '.info-section{display:flex; justify-content:space-between; margin-bottom:20px;}' +
        '.info-box{background:#f8fafc; border:1px solid #e2e8f0; padding:15px; border-radius:8px; width:48%; box-sizing:border-box;}' +
        '.info-box h3{margin:0 0 10px 0; font-size:1rem; border-bottom:1px solid #cbd5e1; padding-bottom:5px;}' +
        'table{width:100%; border-collapse:collapse; margin-bottom:20px;}' +
        'th{background:#f1f5f9; padding:10px; text-align:' + textAlign + '; font-size:0.9rem; border-bottom:2px solid #cbd5e1;}' +
        'td{padding:10px; font-size:0.9rem; border-bottom:1px solid #e2e8f0;}' +
        '.totals{width:50%; margin-left:auto; margin-right: ' + (lang === "ar" ? "auto" : "0") + '; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden;}' +
        '.totals-row{display:flex; justify-content:space-between; padding:8px 15px; border-bottom:1px solid #e2e8f0;}' +
        '.totals-row.final{background:#f8fafc; font-weight:bold; font-size:1.1rem; border-bottom:none; color:#0d9488;}' +
        '@media print { body { margin: 15px; } .info-section { display:block; } .info-box { width:100%; margin-bottom:10px; } .totals { width: 100%; margin: 0; } }' +
        '</style></head><body>' +
        
        '<div class="header">' +
            '<h1>' + shopName + '</h1>' +
            '<div>' + (lang === 'ar' ? 'فاتورة صيانة' : 'Service Invoice') + ' #' + repair.id + '</div>' +
        '</div>' +

        '<div class="info-section">' +
            '<div class="info-box">' +
                '<h3>' + (lang === 'ar' ? 'معلومات العميل' : 'Customer Info') + '</h3>' +
                '<div><strong>' + (lang === 'ar' ? 'الاسم:' : 'Name:') + '</strong> ' + customer.name + '</div>' +
                '<div><strong>' + (lang === 'ar' ? 'رقم الهاتف:' : 'Phone:') + '</strong> ' + (customer.phone || '-') + '</div>' +
                '<div><strong>' + (lang === 'ar' ? 'السيارة:' : 'Vehicle:') + '</strong> ' + (customer.car_name || '-') + '</div>' +
                '<div><strong>' + (lang === 'ar' ? 'رقم اللوحة:' : 'Plate Number:') + '</strong> ' + (customer.plate_number || '-') + '</div>' +
            '</div>' +
            '<div class="info-box">' +
                '<h3>' + (lang === 'ar' ? 'تفاصيل الصيانة' : 'Service Details') + '</h3>' +
                '<div><strong>' + (lang === 'ar' ? 'التاريخ:' : 'Date:') + '</strong> ' + repair.date + '</div>' +
                '<div><strong>' + (lang === 'ar' ? 'عداد المسافة (كم):' : 'Odometer (km):') + '</strong> ' + (repair.odometer || '-') + '</div>' +
            '</div>' +
        '</div>' +

        (repair.notes ? '<div style="margin-bottom:20px;"><strong>' + (lang === 'ar' ? 'ملاحظات:' : 'Notes:') + '</strong><br>' + repair.notes + '</div>' : '') +

        '<table>' +
            '<thead>' +
                '<tr>' +
                    '<th>' + (lang === 'ar' ? 'الوصف / القطع' : 'Description / Item') + '</th>' +
                    '<th style="text-align:center;">' + (lang === 'ar' ? 'الكمية' : 'Qty') + '</th>' +
                    '<th style="text-align:right;">' + (lang === 'ar' ? 'السعر' : 'Unit Price') + '</th>' +
                    '<th style="text-align:right;">' + (lang === 'ar' ? 'الإجمالي' : 'Total') + '</th>' +
                '</tr>' +
            '</thead>' +
            '<tbody>' + itemsHtml + '</tbody>' +
        '</table>' +

        '<div class="totals" style="' + (lang === 'ar' ? 'margin-left:0; margin-right:auto;' : '') + '">' +
            '<div class="totals-row">' +
                '<span>' + (lang === 'ar' ? 'الإجمالي:' : 'Subtotal:') + '</span>' +
                '<span>' + amount.toFixed(2) + '</span>' +
            '</div>' +
            (discount > 0 ? 
            '<div class="totals-row" style="color:#ef4444;">' +
                '<span>' + (lang === 'ar' ? 'الخصم:' : 'Discount:') + '</span>' +
                '<span>-' + discount.toFixed(2) + '</span>' +
            '</div>' : '') +
            '<div class="totals-row final">' +
                '<span>' + (lang === 'ar' ? 'الصافي (المطلوب):' : 'Net Total:') + '</span>' +
                '<span>' + net.toFixed(2) + '</span>' +
            '</div>' +
            '<div class="totals-row">' +
                '<span>' + (lang === 'ar' ? 'المدفوع:' : 'Paid:') + '</span>' +
                '<span>' + paid.toFixed(2) + '</span>' +
            '</div>' +
            '<div class="totals-row" style="color:' + ((net - paid) > 0 ? '#ef4444' : '#64748b') + ';">' +
                '<span>' + (lang === 'ar' ? 'المتبقي:' : 'Remaining Balance:') + '</span>' +
                '<span>' + (net - paid).toFixed(2) + '</span>' +
            '</div>' +
        '</div>' +

        '<div style="margin-top: 4rem; display: flex; justify-content: space-between; border-top: 1px solid #eee; padding-top: 1rem;">' +
            '<div style="font-size: 0.9rem; color: #64748b;">' +
                '<p><strong>' + (lang === 'ar' ? 'اتصل بنا:' : 'Contact Us:') + '</strong></p>' +
                '<p>01010103777</p>' +
                '<p>01010606016</p>' +
            '</div>' +
            '<div style="font-size: 0.9rem; color: #64748b; display: flex; gap: 3rem; justify-content: flex-end;">' +
                '<div style="text-align: center;">' +
                    '<p><strong>توقيع المحاسب</strong></p>' +
                    '<div style="margin-top: 2rem; border-bottom: 1px solid #94a3b8; width: 150px; display: inline-block;"></div>' +
                '</div>' +
                '<div style="text-align: center;">' +
                    '<p><strong>توقيع المهندس</strong></p>' +
                    '<div style="margin-top: 2rem; border-bottom: 1px solid #94a3b8; width: 150px; display: inline-block;"></div>' +
                '</div>' +
            '</div>' +
        '</div>' +

        '</body></html>';

        var win = window.open('', '_blank', 'width=800,height=800');
        win.document.write(html);
        win.document.close();
        win.focus();
        setTimeout(function() { win.print(); }, 500);
    };

    // Print Customer History
    window.printCustomerHistory = function() {
        const customerId   = parseInt(historyDetails.dataset.customerId);
        const customerName = historyDetails.dataset.customerName || 'Customer';
        if (!customerId) return;

        const repairs = db.getRepairsByCustomer(customerId);
        const allCustomers = db.getCustomers();
        const customer = allCustomers.find(c => c.id === customerId);

        const lang = getCurrentLanguage();
        const shopName = lang === 'ar' ? '\u0627\u0644\u0623\u0646\u0635\u0627\u0631\u064a' : 'El Ansary Service Shop';
        const now = new Date();
        const dateStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');

        let totalPaid = 0;
        const rows = repairs.map(function(r) {
            const items = db.getRepairItems(r.id);
            const amount = parseFloat(r.total_amount) || 0;
            totalPaid += amount;
            
            let detailsList = '';
            if (items.length > 0) {
                detailsList = items.map(function(it) {
                    return '<div>\u2022 ' + it.item_name + ' (x' + it.quantity + ') &mdash; ' + (it.quantity * it.unit_price).toFixed(2) + '</div>';
                }).join('');
            } else {
                detailsList = '<div>\u2022 ' + (r.description || 'Service') + '</div>';
            }

            if (r.odometer) {
                detailsList += '<div style="margin-top:4px; font-size:0.8rem; color:#475569;"><strong>' + (lang === 'ar' ? 'العداد:' : 'Odometer:') + '</strong> ' + r.odometer + '</div>';
            }
            if (r.notes) {
                detailsList += '<div style="margin-top:2px; font-size:0.8rem; color:#475569;"><strong>' + (lang === 'ar' ? 'ملاحظات:' : 'Notes:') + '</strong> ' + r.notes + '</div>';
            }

            return '<tr style="border-bottom:1px solid #e2e8f0;">' +
                '<td style="padding:10px; vertical-align:top;">' + r.date + '</td>' +
                '<td style="padding:10px; vertical-align:top;">' + detailsList + '</td>' +
                '<td style="padding:10px; font-weight:700; text-align:right; vertical-align:top;">' + amount.toFixed(2) + '</td>' +
                '<td style="padding:10px; text-align:center; vertical-align:top;">' + (r.payment_method || '-') + '</td>' +
                '</tr>';
        }).join('');

        var textAlign = lang === 'ar' ? 'right' : 'left';
        var dir = lang === 'ar' ? 'rtl' : 'ltr';

        const html = '<html dir="' + dir + '"><head><meta charset="UTF-8">' +
        '<style>' +
        'body{font-family:Arial,sans-serif;font-size:12px;margin:30px;color:#1e293b;}' +
        '.header{text-align:center; margin-bottom:20px; border-bottom:2px solid #0d9488; padding-bottom:15px;}' +
        '.header h1{font-size:1.8rem; margin:0 0 5px 0; color:#0d9488;}' +
        '.header-details{display:flex; justify-content:space-between; margin-top:15px; text-align:' + textAlign + '; font-size:0.9rem;}' +
        'table{width:100%; border-collapse:collapse; margin-top:1rem;}' +
        'th{background:#f8fafc; padding:10px; text-align:' + textAlign + '; font-size:0.9rem; border-bottom:2px solid #cbd5e1;}' +
        '.total-row{background:#f8fafc; font-weight:bold; font-size:1.1rem;}' +
        '@media print { body { margin: 15px; } .header-details { display:block; text-align:center; } }' +
        '</style></head><body>' +
        '<div class="header">' +
            '<h1>' + shopName + '</h1>' +
            '<div style="font-size:1.2rem; font-weight:bold; color:#334155;">' + (lang === 'ar' ? 'سجل الصيانة الشامل' : 'Complete Service History') + '</div>' +
            '<div class="header-details">' +
                '<div>' +
                    '<strong>' + (lang === 'ar' ? 'العميل:' : 'Customer:') + '</strong> ' + customerName + '<br>' +
                    '<strong>' + (lang === 'ar' ? 'السيارة:' : 'Vehicle:') + '</strong> ' + (customer ? customer.car_name : '-') + ' / ' + (customer ? customer.plate_number : '-') +
                '</div>' +
                '<div>' +
                    '<strong>' + (lang === 'ar' ? 'تاريخ الطباعة:' : 'Print Date:') + '</strong> ' + dateStr +
                '</div>' +
            '</div>' +
        '</div>' +
        '<table>' +
            '<thead><tr>' +
                '<th>' + (lang === 'ar' ? 'التاريخ' : 'Date') + '</th>' +
                '<th>' + (lang === 'ar' ? 'التفاصيل / الملاحظات' : 'Details / Notes') + '</th>' +
                '<th style="text-align:right;">' + (lang === 'ar' ? 'الإجمالي' : 'Amount') + '</th>' +
                '<th style="text-align:center;">' + (lang === 'ar' ? 'الدفع' : 'Payment') + '</th>' +
            '</tr></thead>' +
            '<tbody>' + rows + '</tbody>' +
            '<tfoot><tr class="total-row">' +
                '<td colspan="2" style="padding:10px; text-align:' + textAlign + ';">' + (lang === 'ar' ? 'إجمالي المدفوعات' : 'Total Spent') + '</td>' +
                '<td style="padding:10px; text-align:right; color:#0d9488;">' + totalPaid.toFixed(2) + '</td>' +
                '<td></td>' +
            '</tr></tfoot>' +
        '</table>' +
        '</body></html>';

        var win = window.open('', '_blank', 'width=750,height=600');
        win.document.write(html);
        win.document.close();
        win.focus();
        setTimeout(function() { win.print(); }, 500);
    };

    function loadAllCustomers() {
        const customers = db.getCustomers();
        if (customers.length > 0) {
            renderSearchResults(customers);
            if (searchResults) searchResults.classList.add('active');
        }
    }

    // Initial Load - Show list on first load
    loadAllCustomers();
});
