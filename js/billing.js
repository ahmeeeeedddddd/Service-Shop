// billing.js
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
    const receiptModal = document.getElementById('receiptModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const printReceiptBtn = document.getElementById('printReceiptBtn');
    const receiptContent = document.getElementById('receiptContent');

    let paymentMethod = 'Cash';
    let customersData = []; 
    let selectedCustomer = null;

    // Language Toggle
    langToggle.addEventListener('click', () => {
        const newLang = getCurrentLanguage() === 'en' ? 'ar' : 'en';
        setLanguage(newLang);
    });

    // Mock Database Fetch
    async function loadCustomers() {
        // Enriched mock data
        customersData = [
            { id: 1, name: 'Ahmed Mahmoud', phone: '0501234567', car_name: 'Toyota Camry', plate_number: 'ABC-123' },
            { id: 2, name: 'Sara Allen', phone: '0559876543', car_name: 'Honda Civic', plate_number: 'XYZ-789' },
            { id: 3, name: 'John Smith', phone: '0561112223', car_name: 'Ford F-150', plate_number: 'TUX-456' },
            { id: 4, name: 'Ahmed Ali', phone: '0564445556', car_name: 'Tesla Model 3', plate_number: 'EV-101' }
        ];
    }

    // Dynamic Search
    customerSearch.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        if (term.length < 2) {
            searchResults.classList.remove('active');
            return;
        }

        const filtered = customersData.filter(c => 
            c.name.toLowerCase().includes(term) || 
            c.phone.includes(term)
        );

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
                    qty: inputs[1].value,
                    price: inputs[2].value,
                    total: parseFloat(inputs[1].value) * parseFloat(inputs[2].value)
                });
            }
        });

        if (lines.length === 0) {
            alert('Please add at least one item');
            return;
        }

        generateReceipt(lines);
        receiptModal.classList.add('active');
    });

    function generateReceipt(lines) {
        const lang = getCurrentLanguage();
        const t = translations[lang];
        const date = new Date().toLocaleDateString();
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
        `;

        if (lang === 'ar') {
            receiptContent.style.direction = 'rtl';
            receiptContent.querySelectorAll('th').forEach(th => th.style.textAlign = 'right');
        } else {
            receiptContent.style.direction = 'ltr';
        }
    }

    closeModalBtn.addEventListener('click', () => receiptModal.classList.remove('active'));
    printReceiptBtn.addEventListener('click', () => window.print());

    // Initialize
    loadCustomers();
});
