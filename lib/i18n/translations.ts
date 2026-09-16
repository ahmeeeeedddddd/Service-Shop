export type Language = 'en' | 'ar';

export const translations = {
  en: {
    // App & Header
    appName: "Elansary",
    appSubtitle: "Service & Body Shop Management System",
    mainShop: "Main Shop",
    bodyShop: "Body & Paint Shop",
    ownerOverview: "Owner Overview",
    operatorMain: "Main Operator",
    operatorBody: "Body Operator",
    owner: "Owner (Read-Only)",
    switchRole: "Switch Role Context",
    logout: "Log out",

    // Dashboard & Metrics
    ownerDashboardTitle: "Owner Financial Overview",
    ownerDashboardSubtitle: "Combined real-time analytics across Main Shop & Body & Paint Shop",
    readOnlyTag: "Read-Only Overview",
    totalCombinedRevenue: "Total Combined Revenue",
    totalPendingIncomes: "Total Pending Receivables",
    combinedNetProfit: "Combined Net Profit",
    supplierDebtBalance: "Supplier Debt Balance",
    totalRevenue: "Total Revenue",
    pendingAmount: "Pending Amount",
    totalExpenses: "Total Expenses",
    totalJobRepairs: "Total Job Repairs",
    viewBranch: "View Branch",

    // Navigation Modules
    repairsAndInvoices: "Repairs & Invoices",
    pendingBills: "Pending Bills",
    customerDirectory: "Customer Directory",
    partsInventory: "Parts Inventory",
    suppliersAccount: "Suppliers Account",
    dailyExpenses: "Daily Expenses",
    expensesSubtitle: "Log and filter operating shop expenses",
    logExpense: "Log Expense",
    carExpensesAndJobs: "Car Expenses / Jobs",
    ohdaRecords: "Ohda Records (العُهد)",
    employeeSalaries: "Employee Salaries",

    // Quick Stats Cards
    totalPaidInvoices: "Total Paid Invoices",
    totalInvoicesCreated: "Total Invoices Created",
    totalCustomers: "Total Customers",
    totalSuppliers: "Total Suppliers",
    carJobsLogged: "Total Car Jobs Logged",
    remainingOhdaBalance: "Remaining Ohda Balance",

    // Date Filters
    filterByDate: "Filter by Date",
    allTime: "All Time",
    today: "Today",
    thisMonth: "This Month",
    customRange: "Custom Range",
    startDate: "Start Date",
    endDate: "End Date",
    applyFilter: "Apply Filter",
    clearFilter: "Clear Filter",

    // Tables & Actions
    id: "ID",
    customer: "Customer",
    description: "Description",
    amount: "Amount",
    paid: "Paid",
    pending: "Pending",
    date: "Date",
    actions: "Actions",
    searchPlaceholder: "Search...",
    addNew: "Add New",
    edit: "Edit",
    delete: "Delete",
    save: "Save",
    cancel: "Cancel",
    confirmDelete: "Are you sure you want to delete this record?",
    viewDetails: "View Details",
    recordPayment: "Record Payment",
    notes: "Notes",

    // Main Shop Specifics
    newRepairInvoice: "New Repair Invoice",
    recentInvoices: "Recent Main Shop Invoices",
    walkInCustomer: "Walk-in Customer",

    // Body Shop Specifics
    carInfo: "Car Info / Vehicle",
    totalCost: "Total Cost",
    ohdaAdvance: "Ohda Cash Advance",
    ohdaReceived: "Total Ohda Received (+)",
    ohdaSpent: "Total Ohda Expenses (-)",
    netOhdaBalance: "Net Remaining Cash",
    recordCashAdvance: "Record Cash Advance",

    // Suppliers & Inventory
    supplierName: "Supplier Name",
    contactNumber: "Contact Number",
    suppliesCategory: "Supplies Category",
    pendingDebt: "Pending Debt",
    ledgerAndLog: "Ledger & Log",
    partName: "Part Name",
    category: "Category",
    quantityInStock: "Quantity In Stock",
    unitPrice: "Unit Price",

    // Salaries
    employeeName: "Employee Name",
    roleSpecialty: "Role / Specialty",
    dailyRate: "Daily Rate",
    accumulatedDeductions: "Accumulated Deductions",

    // Payment Methods & Billing
    paymentMethod: "Payment Method",
    cash: "Cash",
    instapay: "Instapay",
    bankAlahly: "National Bank of Egypt (Ahly)",
    bankMasr: "Banque Misr",
    vodafoneCash: "Vodafone Cash",
    payByParts: "Pay By Parts (Partial/Credit)",
    splitPayment: "Split Payment",
    amountPaidNow: "Amount Paid Now",
    odometer: "Odometer (km)",
    addFromStock: "Add From Stock",
    saveAsPending: "Save as Pending",
    previewAndSave: "Preview Receipt & Save",
    confirmAndSave: "Confirm & Save Invoice",
    printReceipt: "Print Receipt",
    billProcessed: "Invoice saved successfully!",
    billAlreadyProcessed: "This invoice has already been saved.",
    receiptTitle: "Service Receipt",
    centerName: "El Ansary Car Service Center",
    centerSpecialties: "Bodywork - Paint - Suspension\nMechanics - Electricity - AC",
    accountantSignature: "Accountant Signature",
    engineerSignature: "Engineer Signature",

    // Common
    noRecordsFound: "No records found.",
    loading: "Loading data...",

    // Footer
    footerText: "Elansary",
  },
  ar: {
    // App & Header
    appName: "الأنصاري",
    appSubtitle: "نظام إدارة المركز الرئيسي وورشة السمكرة والدهان",
    mainShop: "المركز الرئيسي",
    bodyShop: "ورشة السمكرة والدهان",
    ownerOverview: "نظرة المالك العامة",
    operatorMain: "مشغل المركز الرئيسي",
    operatorBody: "مشغل ورشة السمكرة",
    owner: "المالك (قراءة فقط)",
    switchRole: "تبديل الصلاحية",
    logout: "تسجيل الخروج",

    // Dashboard & Metrics
    ownerDashboardTitle: "الملخص المالي العام للمالك",
    ownerDashboardSubtitle: "تحليلات فورية مجمعة بين المركز الرئيسي وورشة السمكرة والدهان",
    readOnlyTag: "قراءة فقط",
    totalCombinedRevenue: "إجمالي الإيرادات المجمعة",
    totalPendingIncomes: "إجمالي المبالغ المتبقية لدى العملاء",
    combinedNetProfit: "صافي الأرباح المجمعة",
    supplierDebtBalance: "إجمالي الديون للموردين",
    totalRevenue: "إجمالي الإيرادات",
    pendingAmount: "المبلغ المتبقي",
    totalExpenses: "إجمالي المصروفات",
    totalJobRepairs: "إجمالي فواتير الصيانة",
    viewBranch: "عرض الفرع",

    // Navigation Modules
    repairsAndInvoices: "الصيانة والفواتير",
    pendingBills: "الفواتير المتبقية",
    customerDirectory: "دليل العملاء",
    partsInventory: "مخزن قطع الغيار",
    suppliersAccount: "حسابات الموردين",
    dailyExpenses: "المصروفات اليومية",
    expensesSubtitle: "تسجيل ومراجعة مصروفات الفرع اليومية",
    logExpense: "تسجيل مصروف جديد",
    carExpensesAndJobs: "مصروفات السيارات والأعمال",
    ohdaRecords: "سجل العُهد المالية",
    employeeSalaries: "مرتبات العاملين",

    // Quick Stats Cards
    totalPaidInvoices: "إجمالي الفواتير المسددة",
    totalInvoicesCreated: "إجمالي الفواتير الصادرة",
    totalCustomers: "إجمالي العملاء",
    totalSuppliers: "إجمالي الموردين",
    carJobsLogged: "إجمالي سيارات ورشة السمكرة",
    remainingOhdaBalance: "متبقي العُهدة المالية",

    // Date Filters
    filterByDate: "فلترة حسب التاريخ",
    allTime: "جميع الأوقات",
    today: "اليوم",
    thisMonth: "هذا الشهر",
    customRange: "فترة مخصصة",
    startDate: "تاريخ البداية",
    endDate: "تاريخ النهاية",
    applyFilter: "تطبيق الفلتر",
    clearFilter: "إلغاء الفلتر",

    // Tables & Actions
    id: "الرقم",
    customer: "العميل",
    description: "البيان / الوصف",
    amount: "المبلغ",
    paid: "المدفوع",
    pending: "المتبقي",
    date: "التاريخ",
    actions: "الإجراءات",
    searchPlaceholder: "بحث...",
    addNew: "إضافة جديد",
    edit: "تعديل",
    delete: "حذف",
    save: "حفظ",
    cancel: "إلغاء",
    confirmDelete: "هل أنت تأكد من رغبتك في حذف هذا السجل؟",
    viewDetails: "عرض التفاصيل",
    recordPayment: "تسجيل دفعة",
    notes: "ملاحظات",

    // Main Shop Specifics
    newRepairInvoice: "فاتورة صيانة جديدة",
    recentInvoices: "أحدث فواتير المركز الرئيسي",
    walkInCustomer: "عميل نقدي (بدون اسم)",

    // Body Shop Specifics
    carInfo: "بيانات السيارة",
    totalCost: "التكلفة الإجمالية",
    ohdaAdvance: "دفعة عُهدة مالية",
    ohdaReceived: "إجمالي العُهد المقبوضة (+)",
    ohdaSpent: "إجمالي مصروفات العُهدة (-)",
    netOhdaBalance: "صافي متبقي العُهدة",
    recordCashAdvance: "تسجيل عُهدة جديدة",

    // Suppliers & Inventory
    supplierName: "اسم المورد",
    contactNumber: "رقم التواصل",
    suppliesCategory: "نوع التوريدات",
    pendingDebt: "الديون المستحقة",
    ledgerAndLog: "كشف حساب وكشف المعاملات",
    partName: "اسم قطعة الغيار / المادة",
    category: "التصنيف",
    quantityInStock: "الكمية بالمخزن",
    unitPrice: "سعر الوحدة",

    // Salaries
    employeeName: "اسم العامل",
    roleSpecialty: "المهنة / التخصص",
    dailyRate: "اليومية (الراتب اليومي)",
    accumulatedDeductions: "الخصومات والسلف المجمعة",

    // Payment Methods & Billing
    paymentMethod: "طريقة الدفع",
    cash: "كاش",
    instapay: "إنستا باي",
    bankAlahly: "البنك الأهلي المصري",
    bankMasr: "بنك مصر",
    vodafoneCash: "فودافون كاش",
    payByParts: "دفع جزئي / آجل",
    splitPayment: "دفع مجزأ",
    amountPaidNow: "المبلغ المدفوع الان",
    odometer: "عداد الكيلومترات",
    addFromStock: "إضافة من المخزن",
    saveAsPending: "حفظ كمعلقة",
    previewAndSave: "معاينة الفاتورة وحفظ",
    confirmAndSave: "تأكيد وحفظ الفاتورة",
    printReceipt: "طباعة الفاتورة",
    billProcessed: "تم حفظ الفاتورة بنجاح!",
    billAlreadyProcessed: "تم حفظ هذه الفاتورة بالفعل.",
    receiptTitle: "بيان الخدمه",
    centerName: "مركز الانصاري لصيانه السيارات",
    centerSpecialties: "سمكرة - دهان - عفشة\nميكانيكا - كهرباء - تكييف",
    accountantSignature: "توقيع المحاسب",
    engineerSignature: "توقيع المهندس",

    // Common
    noRecordsFound: "لا توجد سجلات مطابقة.",
    loading: "جاري تحميل البيانات...",

    // Footer
    footerText: "الأنصاري",
  },
};

