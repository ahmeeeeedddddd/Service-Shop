/**
 * Prints HTML content in an isolated #print-root container, hiding the rest of the page.
 */
export function printContent(html: string, direction: 'rtl' | 'ltr' = 'rtl') {
  if (typeof window === 'undefined') return;

  let printRoot = document.getElementById('print-root');
  if (!printRoot) {
    printRoot = document.createElement('div');
    printRoot.id = 'print-root';
    document.body.appendChild(printRoot);
  }

  printRoot.innerHTML = `
    <div style="direction: ${direction}; font-family: system-ui, -apple-system, sans-serif; color: #000; width: 100%; box-sizing: border-box; padding: 15mm;">
      ${html}
    </div>
  `;

  // Trigger print
  window.print();

  // Clear print root after dialog closes
  const cleanup = () => {
    if (printRoot) printRoot.innerHTML = '';
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
}

export interface ReceiptData {
  id: number | string;
  date?: string | null;
  customer?: {
    name?: string | null;
    phone?: string | null;
    car_name?: string | null;
    plate_number?: string | null;
  } | null;
  payment_method?: string | null;
  odometer?: string | null;
  notes?: string | null;
  lines: Array<{
    name: string;
    qty: number;
    price: number;
  }>;
  total_amount: number;
  discount?: number;
  paid_amount?: number;
  pending_amount?: number;
  split_data?: {
    method1: string;
    amount1: number;
    method2: string;
    amount2: number;
  } | null;
}

export function generateReceiptHtml(data: ReceiptData, language: 'ar' | 'en' = 'ar'): string {
  const isAr = language === 'ar';
  const subtotal = data.lines.reduce((acc, l) => acc + (l.qty * l.price), 0);
  const netTotal = Math.max(0, (data.total_amount || subtotal) - (data.discount || 0));

  const itemsHtml = data.lines.map(l => `
    <tr>
      <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #e2e8f0; text-align: ${isAr ? 'right' : 'left'};">${l.name}</td>
      <td style="padding: 10px; text-align: center; font-weight: bold; border-bottom: 1px solid #e2e8f0;">${l.qty}</td>
      <td style="padding: 10px; text-align: right; font-weight: 600; border-bottom: 1px solid #e2e8f0;">$${Number(l.price).toFixed(2)}</td>
      <td style="padding: 10px; text-align: right; font-weight: 900; border-bottom: 1px solid #e2e8f0;">$${(l.qty * l.price).toFixed(2)}</td>
    </tr>
  `).join('');

  return `
    <div style="direction: ${isAr ? 'rtl' : 'ltr'}; font-family: system-ui, -apple-system, sans-serif; color: #18181b; background: #fff; border: 1px solid #e4e4e7; border-radius: 16px; padding: 24px; font-size: 12px; box-sizing: border-box;">
      <!-- Header banner -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e4e4e7; padding-bottom: 16px; margin-bottom: 20px;">
        <div style="flex: 1; text-align: ${isAr ? 'right' : 'left'}; font-weight: bold; color: #475569; font-size: 11px; line-height: 1.6;">
          سمكرة - دهان - عفشة<br />ميكانيكا - كهرباء - تكييف
        </div>
        <div style="flex: 1; text-align: center;">
          <img src="/assets/logo.png" alt="Logo" style="max-height: 65px; margin: 0 auto; display: block;" onerror="this.style.display='none'" />
          <div style="font-size: 16px; font-weight: 900; color: #09090b; margin-top: 4px;">${isAr ? 'بيان الخدمه' : 'Service Receipt'}</div>
        </div>
        <div style="flex: 1; text-align: ${isAr ? 'left' : 'right'}; font-weight: bold; color: #09090b; font-size: 14px;">
          ${isAr ? 'مركز الانصاري لصيانه السيارات' : 'El Ansary Car Service Center'}
        </div>
      </div>

      <!-- Customer Box -->
      <div style="padding: 16px; background-color: #fefce8; border: 2px solid #fde047; border-radius: 16px; margin-bottom: 20px; font-weight: 600; display: flex; justify-content: space-between;">
        <div>
          <p style="margin: 3px 0;"><strong style="color: #3f3f46;">${isAr ? 'العميل' : 'Customer'}:</strong> ${data.customer?.name || (isAr ? 'عميل بدون اسم' : 'Walk-in Customer')}</p>
          <p style="margin: 3px 0;"><strong style="color: #3f3f46;">${isAr ? 'رقم التواصل' : 'Phone'}:</strong> ${data.customer?.phone || 'N/A'}</p>
          <p style="margin: 3px 0;"><strong style="color: #3f3f46;">${isAr ? 'السيارة' : 'Car'}:</strong> ${data.customer?.car_name || 'N/A'}</p>
          <p style="margin: 3px 0;"><strong style="color: #3f3f46;">${isAr ? 'رقم اللوحة' : 'Plate'}:</strong> ${data.customer?.plate_number || 'N/A'}</p>
        </div>
        <div style="text-align: ${isAr ? 'left' : 'right'};">
          <p style="margin: 3px 0;"><strong style="color: #3f3f46;">${isAr ? 'التاريخ' : 'Date'}:</strong> ${data.date || ''}</p>
          <p style="margin: 3px 0;"><strong style="color: #3f3f46;">${isAr ? 'طريقة الدفع' : 'Payment Method'}:</strong> ${data.payment_method || 'كاش'}</p>
          ${data.odometer ? `<p style="margin: 3px 0;"><strong style="color: #3f3f46;">${isAr ? 'عداد الكيلومترات' : 'Odometer'}:</strong> ${data.odometer}</p>` : ''}
          <p style="margin: 3px 0;"><strong style="color: #3f3f46;">${isAr ? 'رقم الفاتورة' : 'Invoice #'}:</strong> #${data.id}</p>
        </div>
      </div>

      <!-- Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background-color: #f1f5f9; border-bottom: 2px solid #e2e8f0; font-weight: bold; text-align: ${isAr ? 'right' : 'left'};">
            <th style="padding: 10px;">${isAr ? 'البيان / الخدمة' : 'Service / Item'}</th>
            <th style="padding: 10px; text-align: center;">${isAr ? 'الكمية' : 'Qty'}</th>
            <th style="padding: 10px; text-align: right;">${isAr ? 'سعر الوحدة' : 'Unit Price'}</th>
            <th style="padding: 10px; text-align: right;">${isAr ? 'الإجمالي' : 'Subtotal'}</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml.length > 0 ? itemsHtml : `<tr><td colspan="4" style="padding: 15px; text-align: center; color: #71717a;">${data.notes || (isAr ? 'خدمة صيانة' : 'Service')}</td></tr>`}
        </tbody>
      </table>

      <!-- Totals -->
      <div style="max-width: 280px; ${isAr ? 'margin-right: auto;' : 'margin-left: auto;'} margin-bottom: 20px; font-size: 12px; line-height: 1.8;">
        <div style="display: flex; justify-content: space-between; font-weight: 600;">
          <span>${isAr ? 'المجموع:' : 'Total:'}</span>
          <span>$${(data.total_amount || subtotal).toFixed(2)}</span>
        </div>
        ${(data.discount && data.discount > 0) ? `
          <div style="display: flex; justify-content: space-between; font-weight: bold; color: #e11d48;">
            <span>${isAr ? 'الخصم:' : 'Discount:'}</span>
            <span>-$${data.discount.toFixed(2)}</span>
          </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; font-weight: 900; font-size: 14px; border-top: 1px solid #e4e4e7; padding-top: 6px;">
          <span>${isAr ? 'الصافي النهائي:' : 'Net Total:'}</span>
          <span style="color: #059669;">$${netTotal.toFixed(2)}</span>
        </div>
        ${(data.paid_amount !== undefined && data.pending_amount !== undefined && data.pending_amount > 0) ? `
          <div style="display: flex; justify-content: space-between; font-weight: bold; color: #4f46e5; padding-top: 4px;">
            <span>${isAr ? 'المبلغ المدفوع الان:' : 'Paid Now:'}</span>
            <span>$${data.paid_amount.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-weight: bold; color: #e11d48;">
            <span>${isAr ? 'المبلغ المتبقي (آجل):' : 'Pending Amount:'}</span>
            <span>$${data.pending_amount.toFixed(2)}</span>
          </div>
        ` : ''}
        ${data.split_data ? `
          <div style="padding-top: 6px; border-top: 1px solid #e2e8f0; margin-top: 4px;">
            <p style="font-weight: bold; color: #3f3f46; margin: 2px 0;">${isAr ? 'تفاصيل الدفع المجزأ:' : 'Split Payment Details:'}</p>
            <div style="display: flex; justify-content: space-between; font-weight: 500;">
              <span>${data.split_data.method1}:</span>
              <span>$${data.split_data.amount1.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-weight: 500;">
              <span>${data.split_data.method2}:</span>
              <span>$${data.split_data.amount2.toFixed(2)}</span>
            </div>
          </div>
        ` : ''}
      </div>

      <!-- Signatures & Footer -->
      <div style="border-top: 1px solid #e2e8f0; padding-top: 24px; margin-top: 24px; display: flex; justify-content: flex-end; font-weight: bold; font-size: 11px; color: #475569;">
        <div>${isAr ? 'توقيع المهندس' : 'Engineer Signature'}: __________________</div>
      </div>
      <div style="text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 12px; margin-top: 16px;">
        تواصل: 01010103777 / 01010606016 - ${isAr ? 'مركز الانصاري لصيانه السيارات' : 'El Ansary Car Service Center'}
      </div>
    </div>
  `;
}
