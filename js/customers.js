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
            const existing = db.getCustomerByPhone(phone);
            if (existing) {
                const lang = getCurrentLanguage();
                alert(translations[lang].duplicateCustomerError);
                return;
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

        results.forEach(c => {
            const div = document.createElement('div');
            div.className = 'result-item';
            div.innerHTML = `
                <div style="flex: 1;">
                    <span class="result-name">${c.name}</span>
                    <span class="result-phone">${c.phone || ''}</span>
                    <span class="result-car">${c.car_name || ''} | ${c.plate_number || ''}</span>
                </div>
                <button class="btn btn-outline" style="color: #ef4444; border-color: #fee2e2; padding: 0.4rem;" onclick="event.stopPropagation(); deleteCustomer(${c.id})">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
            `;
            div.onclick = () => selectCustomer(c);
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

    function selectCustomer(customer) {
        customerSearch.value = '';
        searchResults.classList.remove('active');

        // Show customer info card
        customerInfoCard.style.display = 'block';
        document.getElementById('infoName').textContent = customer.name;
        document.getElementById('infoPhone').textContent = customer.phone || '-';
        document.getElementById('infoCar').textContent = customer.car_name || '-';
        document.getElementById('infoPlate').textContent = customer.plate_number || '-';

        // Load repair history
        const repairs = db.getRepairsByCustomer(customer.id);
        repairsTableBody.innerHTML = '';
        
        if (repairs.length > 0) {
            repairsHistorySection.style.display = 'block';
            repairs.forEach(r => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${r.date}</td>
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
                                    <span class="font-bold">$${(i.quantity * i.unit_price).toFixed(2)}</span>
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
                            <button class="btn btn-outline btn-sm" onclick="toggleDetails(${index})" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">
                                Details
                            </button>
                        </div>
                        ${detailsHtml}
                    </td>
                    <td style="vertical-align: top;" class="font-bold">$${parseFloat(r.total_amount).toFixed(2)}</td>
                    <td style="vertical-align: top;"><span class="badge ${badgeClass}">${r.payment_method}</span></td>
                `;
                historyRepairsTableBody.appendChild(tr);
            });
        }

        historyCustomerList.style.display = 'none';
        historyDetails.style.display = 'block';
    }

    window.toggleDetails = (index) => {
        const el = document.getElementById(`details-${index}`);
        if (el) {
            el.style.display = el.style.display === 'none' ? 'block' : 'none';
        }
    };

    historySearch.addEventListener('input', loadHistoryCustomers);
    backToHistoryList.onclick = () => loadHistoryCustomers();

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
