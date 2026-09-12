const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, '..', 'pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.html') && f !== 'supplier_report.html');

const supplierReportNavItem = `                    <a href="supplier_report.html" class="nav-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>\n                        <span data-i18n="supplierReport">Supplier Report</span></a>\n`;

files.forEach(file => {
    const filePath = path.join(pagesDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    if (content.includes('supplier_report.html')) {
        console.log(`Skipping ${file}: already contains supplier_report.html`);
        return;
    }

    // Insert after income_report.html nav-item
    const targetStr1 = `<span>Income Report</span></a>`;
    const targetStr2 = `<span data-i18n="incomeReport">Income Report</span></a>`;

    if (content.includes(targetStr1)) {
        content = content.replace(targetStr1, `${targetStr1}\n${supplierReportNavItem.trim()}`);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${file}`);
    } else if (content.includes(targetStr2)) {
        content = content.replace(targetStr2, `${targetStr2}\n${supplierReportNavItem.trim()}`);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${file}`);
    } else {
        console.warn(`Could not find insertion target in ${file}`);
    }
});
