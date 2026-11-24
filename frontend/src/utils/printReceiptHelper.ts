import { playPrintSound } from './soundEffects';

/**
 * High-precision thermal receipt print helper:
 * Solves the multi-page (e.g. 12 sheets) paper wastage bug where thermal printers
 * spool yards of blank paper due to hidden background table rows in the main window.
 *
 * It renders ONLY the targeted receipt element into an isolated zero-margin iframe,
 * guaranteeing the browser prints exactly 1 sheet of paper and cuts immediately.
 */
export const printReceiptElement = (elementId: string): void => {
  const sourceElement = document.getElementById(elementId);
  if (!sourceElement) {
    try {
      playPrintSound();
    } catch {}
    window.print();
    return;
  }

  try {
    playPrintSound();
  } catch {}

  // Remove any previously created print iframe
  const existingFrame = document.getElementById('pos-print-isolated-iframe');
  if (existingFrame) {
    existingFrame.remove();
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'pos-print-isolated-iframe';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  iframe.style.pointerEvents = 'none';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!iframeDoc) {
    window.print();
    return;
  }

  // Clone external style sheets and font links from parent head to preserve Urdu Nastaliq or other web fonts
  const fontAndStyleLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .filter(el => {
      // Don't copy media="print" styles from parent that might contain visibility: hidden
      const media = el.getAttribute('media');
      return !media || media !== 'print';
    })
    .map(el => el.outerHTML)
    .join('\n');

  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html lang="ur">
      <head>
        <meta charset="utf-8" />
        <title>Receipt</title>
        ${fontAndStyleLinks}
        <style>
          @page {
            size: auto;
            margin: 0mm !important;
          }
          * {
            box-sizing: border-box;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0mm !important;
            padding: 0mm !important;
            width: 100% !important;
            max-width: 78mm !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-family: 'Courier New', Courier, monospace, 'Noto Nastaliq Urdu', system-ui;
            font-size: 11px;
            line-height: 1.35;
            height: auto !important;
            overflow: visible !important;
          }
          #${elementId}, .thermal-receipt {
            width: 100% !important;
            max-width: 78mm !important;
            margin: 0 !important;
            padding: 0mm 1mm 1mm 1mm !important;
            background: #ffffff !important;
            border: none !important;
            box-shadow: none !important;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          a {
            color: #000000 !important;
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
        ${sourceElement.outerHTML}
      </body>
    </html>
  `);
  iframeDoc.close();

  // Allow styles and DOM to settle cleanly before triggering print dialog
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.error('Isolated iframe print failed, falling back to window.print():', err);
      window.print();
    }
  }, 250);
};
