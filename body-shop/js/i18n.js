const translations = {
    en: {
        // App & Sidebar
        appName: "El Ansary Body Shop",
        appSubtitle: "BODY & PAINT",
        customers: "Customers",
        billing: "Billing",
        billHistory: "Bill History",
        billHistorySubtitle: "All confirmed and pending bills",
        totalBills: "Total Bills",
        totalRevenue: "Total Revenue",
        confirmed: "Confirmed",
        income: "Income",
        expenses: "Expenses",
        dailyReport: "Daily Report",
        suppliers: "Suppliers",
        parts: "Parts & Stock",
        salaries: "Salaries",
        carExpenses: "Car Expenses",
        reports: "Reports",
        langToggle: "العربية",
        version: "Body Shop v1.0 — Offline",

        // General
        save: "Save",
        edit: "Edit",
        delete: "Delete",
        cancel: "Cancel",
        close: "Close",
        print: "Print",
        search: "Search",
        view: "View",
        actions: "Actions",
        date: "Date",
        description: "Description",
        amount: "Amount",
        notes: "Notes",
        phone: "Phone",
        name: "Name",
        total: "Total",
        subtotal: "Subtotal",
        netTotal: "Net Total",
        discount: "Discount",
        price: "Price (EGP)",
        category: "Category",
        today: "Today",
        allTime: "All Time",
        selectDate: "Select Date",
        filterByDate: "Filter by Date",
        noData: "No records found.",
        confirm: "Confirm",

        // Customers
        customersTitle: "Customers",
        customersSubtitle: "Manage customer records and vehicle history",
        addCustomer: "Add Customer",
        saveCustomer: "Save Customer",
        updateCustomer: "Update Customer",
        customerNameLabel: "Customer Name",
        egJohnSmith: "e.g. Ahmed Mohamed",
        allCustomers: "All Customers",
        searchCustomer: "Search by name or phone...",
        customerHistory: "Customer History",
        confirmDeleteCustomer: "Are you sure you want to delete this customer and all their cars?",
        duplicateCustomerError: "A customer with this phone number already exists!",
        customerAdded: "Customer saved successfully!",
        searchPlaceholder: "Search customer by name or phone",
        serviceHistory: "Repair History",
        registeredCars: "Registered Cars",
        addCar: "+ Add Another Car",
        selectCar: "Select Car",
        carsRegistered: "cars registered",
        carRegistered: "car registered",
        unknownCar: "Unknown Car",
        noPlate: "No Plate",
        carName: "Car Name / Model",
        licensePlate: "License Plate",
        printHistory: "Print History",
        backToList: "← Back",

        // Billing
        billingTitle: "Billing",
        billingSubtitle: "Create a new invoice for a customer",
        selectCustomer: "Select customer...",
        carModel: "Car Model",
        plateNumber: "Plate Number",
        odometer: "Odometer",
        odometerOptional: "Odometer (Optional)",
        lineItems: "Line Items",
        addItem: "Add Item",
        addFromStock: "Add from Stock",
        serviceName: "Service / Part Name",
        qty: "Qty",
        price: "Price",
        paymentMethod: "Payment Method",
        cash: "Cash",
        cashIncome: "Cash Income",
        totalCash: "Total Cash",
        card: "ATM / Card",
        instapay: "Instapay",
        bankAlahly: "Bank Alahly",
        bankMasr: "Bank Masr",
        vodafoneCash: "Vodafone Cash",
        payByParts: "Pay By Parts",
        amountPaidNow: "Amount Paid Now",
        pendingAmount: "Pending Amount",
        confirmPrint: "Confirm & Print",
        saveAsPending: "Save as Pending",
        engineerSignature: "Engineer",
        accountantSignature: "Accountant",
        receiptTitle: "Tax Invoice",
        confirmPayment: "Confirm Payment",
        billProcessed: "Bill processed successfully!",
        selectPart: "Select Part from Stock",

        // Pending Bills
        pendingBillsTitle: "Pending Bills",
        pendingBillsSubtitle: "Bills waiting to be finalized",
        pendingCount: "Pending Count",
        totalValue: "Total Value",
        todayPending: "Today's Pending",
        allPendingBills: "All Pending Bills",
        dateCreated: "Date Created",
        processBill: "Finalize Bill",
        noPendingBills: "No pending bills",
        editPending: "Edit Pending",

        // Income
        incomeTitle: "Income",
        incomeSubtitle: "Summary of all confirmed invoices",
        thisMonth: "This Month",
        invoices: "Invoices",
        allInvoices: "All Invoices",
        payment: "Payment",
        customer: "Customer",
        car: "Car",
        printIncome: "Print Income List",
        deletedBill: "Deleted Bill",

        // Expenses
        expensesTitle: "Expenses",
        expensesSubtitle: "Log and track all shop expenses",
        logExpense: "Log Expense",
        saveExpense: "Save Expense",
        updateExpense: "Update Expense",
        totalLogged: "Total Expenses",
        confirmDeleteExpense: "Are you sure you want to delete this expense?",
        deductFromCash: "Deduct from Cash",
        // Expense Categories
        catOperating: "Operating",
        catSalaries: "Salaries",
        catSupplier: "Supplier Payment",
        catOther: "Other",

        // Daily Report
        dailyReportTitle: "Daily Report",
        dailyReportSubtitle: "Summary of income and expenses for a selected date range",
        summaryFor: "Summary for",
        startDate: "Start Date",
        endDate: "End Date",
        dateRangeReport: "Date Range Report",
        netProfit: "Net Profit",
        totalIncome: "Total Income",
        totalExpenses: "Total Expenses",
        printReport: "Print Report",
        byPaymentMethod: "Income by Payment Method",
        byCategory: "Expenses by Category",
        noTransactions: "No transactions found for this date range.",
        cashIncome: "Cash Income",
        totalCash: "Net Cash",
        instapay: "Instapay",
        bankAlahly: "Bank Alahly",
        bankMasr: "Bank Masr",
        vodafoneCash: "Vodafone Cash",
        card: "ATM / Card",
        payByParts: "Pay By Parts",

        // Suppliers
        suppliersTitle: "Suppliers",
        suppliersSubtitle: "Manage suppliers and track pending payments",
        addSupplier: "Add Supplier",
        saveSupplier: "Save Supplier",
        contactNumber: "Contact Number",
        suppliesWhat: "Supplies What",
        pendingBalance: "Pending Balance",
        settled: "Settled ✓",
        allSuppliers: "All Suppliers",
        noSuppliers: "No suppliers found.",
        confirmDeleteSupplier: "Delete this supplier?",
        recordPayment: "Record Payment",
        supplierHistory: "Transaction History",
        egPaint: "e.g. Paint, Putty, Fiber",
        totalSupplierPending: "Total Pending to Suppliers",
        confirmPaymentSupplier: "Confirm Payment to Supplier",
        supplier: "Supplier",

        // Parts
        partsTitle: "Parts & Stock",
        partsSubtitle: "Manage inventory items, prices and stock levels",
        inventory: "Inventory",
        partName: "Part Name",
        qtyInStock: "Stock Qty",
        unitPrice: "Unit Price",
        addPart: "Add New Part",
        savePart: "Save Part",
        noParts: "No parts in inventory.",
        printInventory: "Print Inventory",
        confirmDeletePart: "Delete this part from inventory?",

        // Salaries
        salariesTitle: "Salaries",
        salariesSubtitle: "Manage employee payroll, borrows, deductions and bonuses",
        addEmployee: "Add Employee",
        employeeName: "Name",
        employeeRole: "Role",
        dailyRate: "Daily Rate",
        weeklyTotal: "Weekly (6d)",
        borrows: "Borrows",
        deductions: "Deductions",
        bonus: "Bonus",
        netPay: "Net Pay",
        printPayroll: "Print Payroll",
        resetAllDeductions: "Reset All Deductions",
        employeesList: "Employees List",
        recordSalary: "Record Salary",
        recordDeduction: "Deduction",
        recordBorrow: "Borrow (سلفة)",
        recordBonus: "Bonus (مكافأة)",
        daysWorked: "Days Worked",
        bonusAmount: "Bonus / Raise",
        deductionAmount: "Deduction Amount",
        deductionReason: "Reason",
        borrowAmount: "Borrow Amount",
        save2: "Save",
        confirmResetAll: "This will clear ALL borrows, deductions, and bonuses for all employees. Continue?",

        // Car Expenses
        carExpensesTitle: "Car Expenses",
        carExpensesSubtitle: "Record material costs per car paint & repair job",
        addCarExpense: "New Car Expense",
        saveCarExpense: "Save Record",
        updateCarExpense: "Update Record",
        carType: "Car Type / Model",
        bodyWorkLabor: "Body Work Labor (مصنعيات سمكرة)",
        puttyStock: "Putty Stock (ستوك)",
        fiber: "Fiber (فيبر)",
        filler: "Filler (فيلر)",
        sandpaper: "Sandpaper (ورق جرايد)",
        paint: "Paint (بويا)",
        varnish: "Varnish (ورنيش)",
        paintBooth: "Paint Booth (كبينة)",
        otherPurchases: "Other Purchases (مشتريات أخرى)",
        addOtherPurchase: "➕ Add Other Purchase",
        amountUsed: "Amount Used",
        cost: "Cost (EGP)",
        totalCost: "Total Cost",
        allCarExpenses: "All Car Expense Records",
        viewBreakdown: "View Breakdown",
        printBreakdown: "Print Breakdown",
        confirmDeleteCarExpense: "Delete this car expense record?",
        noCarExpenses: "No car expense records yet.",
        itemName: "Item Name",

        // Multi-car
        carRegisteredLabel: "car registered",
        carsRegisteredLabel: "cars registered",
    },

    ar: {
        // App & Sidebar
        appName: "الأنصاري لإصلاح الهياكل",
        appSubtitle: "سمكرة ودهانات",
        customers: "العملاء",
        billing: "الفواتير",
        pendingBills: "الفواتير المعلقة",
        billHistory: "سجل الفواتير",
        billHistorySubtitle: "جميع الفواتير المؤكدة والمعلقة",
        totalBills: "إجمالي الفواتير",
        totalRevenue: "إجمالي الإيرادات",
        confirmed: "مؤكدة",
        income: "الدخل",
        expenses: "المصاريف",
        dailyReport: "التقرير اليومي",
        suppliers: "الموردين",
        parts: "القطع والمخزون",
        salaries: "الرواتب",
        carExpenses: "مصاريف السيارات",
        reports: "التقارير",
        langToggle: "English",
        version: "البودي شوب v1.0 — بدون إنترنت",

        // General
        save: "حفظ",
        edit: "تعديل",
        delete: "حذف",
        cancel: "إلغاء",
        close: "إغلاق",
        print: "طباعة",
        search: "بحث",
        view: "عرض",
        actions: "إجراءات",
        date: "التاريخ",
        description: "الوصف",
        amount: "المبلغ",
        notes: "ملاحظات",
        phone: "الهاتف",
        name: "الاسم",
        total: "الإجمالي",
        subtotal: "مجموع فرعي",
        netTotal: "الصافي",
        discount: "خصم",
        price: "السعر (ج.م)",
        category: "الفئة",
        today: "اليوم",
        allTime: "الكل",
        selectDate: "اختر تاريخ",
        filterByDate: "تصفية بالتاريخ",
        noData: "لا توجد بيانات.",
        confirm: "تأكيد",

        // Customers
        customersTitle: "العملاء",
        customersSubtitle: "إدارة سجلات العملاء وتاريخ إصلاح السيارات",
        addCustomer: "إضافة عميل",
        saveCustomer: "حفظ العميل",
        updateCustomer: "تحديث العميل",
        customerNameLabel: "اسم العميل",
        egJohnSmith: "مثال: أحمد محمد",
        allCustomers: "كل العملاء",
        searchCustomer: "ابحث بالاسم أو الهاتف...",
        customerHistory: "تاريخ العميل",
        confirmDeleteCustomer: "هل أنت متأكد من حذف هذا العميل وجميع سياراته؟",
        duplicateCustomerError: "يوجد عميل بنفس رقم الهاتف!",
        customerAdded: "تم حفظ العميل بنجاح!",
        searchPlaceholder: "ابحث عن عميل بالاسم أو الرقم",
        serviceHistory: "سجل الإصلاحات",
        registeredCars: "السيارات المسجلة",
        addCar: "+ إضافة سيارة أخرى",
        selectCar: "اختر سيارة",
        carsRegistered: "سيارات مسجلة",
        carRegistered: "سيارة مسجلة",
        unknownCar: "سيارة غير معروفة",
        noPlate: "بدون لوحة",
        carName: "اسم / موديل السيارة",
        licensePlate: "رقم اللوحة",
        printHistory: "طباعة السجل",
        backToList: "← رجوع",

        // Billing
        billingTitle: "الفواتير",
        billingSubtitle: "إنشاء فاتورة جديدة للعميل",
        selectCustomer: "اختر العميل...",
        carModel: "موديل السيارة",
        plateNumber: "رقم اللوحة",
        odometer: "عداد المسافة",
        odometerOptional: "عداد المسافات (اختياري)",
        lineItems: "بنود الفاتورة",
        addItem: "إضافة بند",
        addFromStock: "إضافة من المخزون",
        serviceName: "الخدمة / اسم القطعة",
        qty: "الكمية",
        price: "السعر",
        paymentMethod: "طريقة الدفع",
        cash: "نقدي",
        cashIncome: "دخل الكاش",
        totalCash: "إجمالي الكاش",
        card: "بطاقة / صراف",
        instapay: "إنستاباي",
        bankAlahly: "البنك الأهلي",
        bankMasr: "بنك مصر",
        vodafoneCash: "فودافون كاش",
        payByParts: "دفع على أجزاء",
        amountPaidNow: "المبلغ المدفوع الآن",
        pendingAmount: "المبلغ المتبقي",
        confirmPrint: "تأكيد وطباعة",
        saveAsPending: "حفظ كمعلق",
        engineerSignature: "المهندس",
        accountantSignature: "المحاسب",
        receiptTitle: "فاتورة ضريبية",
        confirmPayment: "تأكيد الدفع",
        billProcessed: "تمت معالجة الفاتورة بنجاح!",
        selectPart: "اختر قطعة من المخزون",

        // Pending Bills
        pendingBillsTitle: "الفواتير المعلقة",
        pendingBillsSubtitle: "الفواتير في انتظار التأكيد النهائي",
        pendingCount: "عدد المعلقة",
        totalValue: "القيمة الإجمالية",
        todayPending: "معلقات اليوم",
        allPendingBills: "جميع الفواتير المعلقة",
        dateCreated: "تاريخ الإنشاء",
        processBill: "تأكيد الفاتورة",
        noPendingBills: "لا توجد فواتير معلقة",
        editPending: "تعديل المعلقة",

        // Income
        incomeTitle: "الدخل",
        incomeSubtitle: "ملخص جميع الفواتير المؤكدة",
        thisMonth: "هذا الشهر",
        invoices: "الفواتير",
        allInvoices: "كل الفواتير",
        payment: "الدفع",
        customer: "العميل",
        car: "السيارة",
        printIncome: "طباعة قائمة الدخل",
        deletedBill: "فاتورة محذوفة",

        // Expenses
        expensesTitle: "المصاريف",
        expensesSubtitle: "تسجيل ومتابعة مصاريف المركز",
        logExpense: "تسجيل مصروف",
        saveExpense: "حفظ المصروف",
        updateExpense: "تعديل المصروف",
        totalLogged: "إجمالي المصاريف",
        confirmDeleteExpense: "هل أنت متأكد من حذف هذا المصروف؟",
        deductFromCash: "خصم من الكاش",
        catOperating: "تشغيلية",
        catSalaries: "رواتب",
        catSupplier: "دفع مورد",
        catOther: "أخرى",

        // Daily Report
        dailyReportTitle: "التقرير اليومي",
        dailyReportSubtitle: "ملخص الدخل والمصاريف لفترة محددة",
        summaryFor: "ملخص تاريخ",
        startDate: "تاريخ البداية",
        endDate: "تاريخ النهاية",
        dateRangeReport: "تقرير الفترة",
        netProfit: "صافي الربح",
        totalIncome: "إجمالي الدخل",
        totalExpenses: "إجمالي المصاريف",
        printReport: "طباعة التقرير",
        byPaymentMethod: "الدخل حسب طريقة الدفع",
        byCategory: "المصاريف حسب الفئة",
        noTransactions: "لا توجد معاملات في هذه الفترة.",
        cashIncome: "دخل الكاش",
        totalCash: "صافي الكاش",
        instapay: "إنستاباي",
        bankAlahly: "البنك الأهلي",
        bankMasr: "بنك مصر",
        vodafoneCash: "فودافون كاش",
        card: "بطاقة / صراف",
        payByParts: "دفعة أجزاء",

        // Suppliers
        suppliersTitle: "الموردين",
        suppliersSubtitle: "إدارة الموردين ومتابعة المدفوعات",
        addSupplier: "إضافة مورد",
        saveSupplier: "حفظ المورد",
        contactNumber: "رقم التواصل",
        suppliesWhat: "ماذا يورّد",
        pendingBalance: "الرصيد المستحق",
        settled: "تم السداد ✓",
        allSuppliers: "كل الموردين",
        noSuppliers: "لا يوجد موردين.",
        confirmDeleteSupplier: "حذف هذا المورد؟",
        recordPayment: "تسجيل دفعة",
        supplierHistory: "سجل المعاملات",
        egPaint: "مثال: بويا، فيلر، فيبر",
        totalSupplierPending: "إجمالي المستحق للموردين",
        confirmPaymentSupplier: "تأكيد الدفع للمورد",
        supplier: "المورد",

        // Parts
        partsTitle: "القطع والمخزون",
        partsSubtitle: "إدارة المخزون والأسعار والكميات",
        inventory: "المخزون",
        partName: "اسم القطعة",
        qtyInStock: "الكمية",
        unitPrice: "سعر الوحدة",
        addPart: "إضافة قطعة جديدة",
        savePart: "حفظ القطعة",
        noParts: "لا توجد قطع في المخزون.",
        printInventory: "طباعة المخزون",
        confirmDeletePart: "حذف هذه القطعة من المخزون؟",

        // Salaries
        salariesTitle: "الرواتب",
        salariesSubtitle: "إدارة رواتب الموظفين والسلف والخصومات",
        addEmployee: "إضافة موظف",
        employeeName: "الاسم",
        employeeRole: "الوظيفة",
        dailyRate: "الأجر اليومي",
        weeklyTotal: "الأسبوعي (6أيام)",
        borrows: "السلف",
        deductions: "الخصومات",
        bonus: "المكافآت",
        netPay: "صافي الراتب",
        printPayroll: "طباعة كشف الرواتب",
        resetAllDeductions: "تصفير كل الخصومات",
        employeesList: "قائمة الموظفين",
        recordSalary: "تسجيل راتب",
        recordDeduction: "خصم",
        recordBorrow: "سلفة",
        recordBonus: "مكافأة",
        daysWorked: "أيام العمل",
        bonusAmount: "مكافأة / زيادة",
        deductionAmount: "مبلغ الخصم",
        deductionReason: "السبب",
        borrowAmount: "مبلغ السلفة",
        save2: "حفظ",
        confirmResetAll: "سيتم حذف جميع السلف والخصومات والمكافآت لكل الموظفين. هل تريد المتابعة؟",

        // Car Expenses
        carExpensesTitle: "مصاريف السيارات",
        carExpensesSubtitle: "تسجيل تكاليف مواد كل وظيفة سمكرة ودهان",
        addCarExpense: "إدخال مصاريف سيارة",
        saveCarExpense: "حفظ السجل",
        updateCarExpense: "تحديث السجل",
        carType: "نوع السيارة",
        bodyWorkLabor: "مصنعيات سمكرة",
        puttyStock: "ستوك",
        fiber: "فيبر",
        filler: "فيلر",
        sandpaper: "ورق جرايد",
        paint: "بويا",
        varnish: "ورنيش",
        paintBooth: "كبينة",
        otherPurchases: "مشتريات أخرى",
        addOtherPurchase: "➕ إضافة مشتريات",
        amountUsed: "الكمية المستخدمة",
        cost: "التكلفة (ج.م)",
        totalCost: "إجمالي التكلفة",
        allCarExpenses: "جميع سجلات مصاريف السيارات",
        viewBreakdown: "عرض التفاصيل",
        printBreakdown: "طباعة التفصيل",
        confirmDeleteCarExpense: "حذف هذا السجل؟",
        noCarExpenses: "لا توجد سجلات بعد.",
        itemName: "اسم الصنف",

        // Multi-car
        carRegisteredLabel: "سيارة مسجلة",
        carsRegisteredLabel: "سيارات مسجلة",
    }
};

function getCurrentLanguage() {
    return localStorage.getItem('appLang') || 'ar';
}

function setLanguage(lang) {
    localStorage.setItem('appLang', lang);
    document.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    translatePage();
}

function t(key) {
    const lang = getCurrentLanguage();
    const tr = translations[lang] || translations['en'];
    return tr[key] || translations['en'][key] || key;
}

function translatePage() {
    const lang = getCurrentLanguage();
    const tr = translations[lang] || translations['en'];

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (tr[key] !== undefined) {
            if (el.tagName === 'INPUT' && el.getAttribute('type') !== 'submit') {
                // don't overwrite value inputs
            } else {
                el.textContent = tr[key];
            }
        }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (tr[key]) el.placeholder = tr[key];
    });

    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        if (tr[key]) el.title = tr[key];
    });

    document.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
}

window.getTranslatedPaymentMethod = function(method) {
    if (!method) return '';
    const key = method.toLowerCase().replace(/[\s\/]/g, '');
    const map = {
        'cash': 'cash',
        'atm/card': 'card', 'atmcard': 'card', 'card': 'card',
        'paybyparts': 'payByParts',
        'instapay': 'instapay',
        'bankalahly': 'bankAlahly',
        'bankmasr': 'bankMasr',
        'vodafonecash': 'vodafoneCash',
        'deleted': 'deletedBill'
    };
    const tKey = map[key];
    return tKey ? t(tKey) : method;
};

// Global error handler
window.onerror = function(message, source, lineno, colno, error) {
    console.error(`Error: ${message}\nAt: ${source}:${lineno}`);
    return false;
};

// Reports sidebar dropdown toggle
document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('reportsToggle');
    const items  = document.getElementById('reportsItems');
    if (toggle && items) {
        toggle.addEventListener('click', () => {
            toggle.classList.toggle('open');
            items.classList.toggle('open');
        });
    }

    // Init language
    const lang = getCurrentLanguage();
    document.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    translatePage();

    // Lang toggle button
    const langBtn = document.getElementById('langToggle');
    if (langBtn) {
        langBtn.addEventListener('click', () => {
            const newLang = getCurrentLanguage() === 'en' ? 'ar' : 'en';
            setLanguage(newLang);
        });
    }
});

// Global Print Preview
window.showPrintPreview = function(prepareFn) {
    if (typeof prepareFn === 'function') prepareFn();

    const printArea = document.getElementById('printArea');
    if (!printArea) { window.print(); return; }

    const existing = document.getElementById('printPreviewOverlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'printPreviewOverlay';
    overlay.className = 'print-preview-overlay active';

    const lang = getCurrentLanguage();
    overlay.innerHTML = `
        <div class="print-preview-bar">
            <h3>📄 ${lang === 'ar' ? 'معاينة الطباعة' : 'Print Preview'}</h3>
            <div class="preview-actions">
                <button id="previewPrintBtn" class="btn btn-primary" style="background:#16a34a;border-color:#16a34a;">
                    🖨️ ${lang === 'ar' ? 'طباعة' : 'Print'}
                </button>
                <button id="previewCloseBtn" class="btn btn-outline" style="color:white;border-color:#64748b;">
                    ✕ ${lang === 'ar' ? 'إغلاق' : 'Close'}
                </button>
            </div>
        </div>
        <div class="print-preview-frame" id="printPreviewFrame"></div>
    `;

    document.body.appendChild(overlay);

    const frame = document.getElementById('printPreviewFrame');
    frame.innerHTML = printArea.innerHTML;
    frame.style.fontFamily = 'Arial, sans-serif';
    frame.style.direction = 'rtl';

    document.getElementById('previewPrintBtn').addEventListener('click', () => {
        overlay.remove();
        setTimeout(() => window.print(), 100);
    });

    document.getElementById('previewCloseBtn').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
};

if (typeof module !== 'undefined') {
    module.exports = { translations, getCurrentLanguage, setLanguage, translatePage, t };
}
