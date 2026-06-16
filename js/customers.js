const db = require('../database/db.js');

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
    const viewAddCustomer = document.getElementById('viewAddCustomer');
    const viewSearchCustomer = document.getElementById('viewSearchCustomer');

    tabAddCustomer.addEventListener('click', () => {
        tabAddCustomer.classList.add('btn-primary');
        tabAddCustomer.classList.remove('btn-outline');
        tabSearchCustomer.classList.add('btn-outline');
        tabSearchCustomer.classList.remove('btn-primary');
        
        viewAddCustomer.style.display = 'block';
        viewSearchCustomer.style.display = 'none';
    });

    tabSearchCustomer.addEventListener('click', () => {
        tabSearchCustomer.classList.add('btn-primary');
        tabSearchCustomer.classList.remove('btn-outline');
        tabAddCustomer.classList.add('btn-outline');
        tabAddCustomer.classList.remove('btn-primary');
        
        viewAddCustomer.style.display = 'none';
        viewSearchCustomer.style.display = 'block';
    });

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

        db.addCustomer({ name, phone, car_name, plate_number });
        
        document.getElementById('addName').value = '';
        document.getElementById('addPhone').value = '';
        document.getElementById('addCarName').value = '';
        document.getElementById('addPlate').value = '';
        
        alert('Customer added successfully');
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
                <span class="result-name">${c.name}</span>
                <span class="result-phone">${c.phone || ''}</span>
                <span class="result-car">${c.car_name || ''} | ${c.plate_number || ''}</span>
            `;
            div.onclick = () => selectCustomer(c);
            searchResults.appendChild(div);
        });

        searchResults.classList.add('active');
    }

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

    document.addEventListener('click', (e) => {
        if (!customerSearch.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.remove('active');
        }
    });
});
