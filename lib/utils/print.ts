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
