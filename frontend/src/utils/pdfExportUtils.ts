import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Customer, Supplier, Product, Sale } from '../types';

// Company Details Constants
export const COMPANY_HEADER = {
  name: 'RAFIQ AUTO & OIL TRADERS',
  nameUrdu: 'Rafiq Auto & Oil Traders - Okara',
  address: '54-Stop Near MCB Bank, Dipalpur Road, Okara',
  phones: '0306-9258573 / 0327-7497457 / 0300-6950228',
  proprietors: 'M. Shafiq & Haji Muhammad Rafiq',
};

const drawCompanyBanner = (doc: jsPDF, title: string, subtitle?: string) => {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Dark slate navy header
  doc.setFillColor(15, 23, 42); // #0f172a
  doc.rect(0, 0, pageWidth, 26, 'F');

  // Accent gold line
  doc.setFillColor(217, 119, 6); // #d97706
  doc.rect(0, 26, pageWidth, 1.5, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(COMPANY_HEADER.name, 14, 10);

  // Address & Phone
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225); // #cbd5e1
  doc.text(`${COMPANY_HEADER.address} | Tel: ${COMPANY_HEADER.phones}`, 14, 16);

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(254, 240, 138); // Amber gold
  doc.text(title.toUpperCase(), 14, 22);

  // Date and Time on right
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(226, 232, 240);
  doc.text(`Printed: ${dateStr} ${timeStr}`, pageWidth - 14, 12, { align: 'right' });
  if (subtitle) {
    doc.text(subtitle, pageWidth - 14, 18, { align: 'right' });
  }
};

const drawFooter = (doc: jsPDF) => {
  const pageCount = (doc as any).internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, pageHeight - 10, pageWidth - 14, pageHeight - 10);

    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.text(`Rafiq Auto & Oil Traders POS Engine | Confidential Document`, 14, pageHeight - 6);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, pageHeight - 6, { align: 'right' });
  }
};

// ============================================================================
// 1. PRODUCTS & STOCK INVENTORY PDF
// ============================================================================
export const exportProductsPDF = (products: Product[], categoryName: string = 'All Categories') => {
  if (!products || products.length === 0) {
    alert('Koi product data mojood nahi hai download karne ke liye.');
    return;
  }

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  drawCompanyBanner(doc, 'Products & Stock Inventory Report', `Category: ${categoryName} | Total Items: ${products.length}`);

  const tableData = products.map((p, idx) => {
    const stock = Number(p.currentStock || 0);
    const conv = Number(p.conversionFactor) || 1;
    const hasPkg = (!!p.primaryUnit || !!p.primaryUnitId) && conv > 1;
    const pSym = p.primaryUnit?.symbol || 'Ctn';
    const sSym = p.unit?.symbol || 'Pcs';

    const stockCartons = Math.floor(stock / conv);
    const remStock = Math.round((stock % conv) * 100) / 100;
    const packSpec = hasPkg ? `1 ${pSym} = ${conv} ${sSym}` : `${sSym}`;
    const stockText = hasPkg
      ? `${stockCartons} ${pSym} ${remStock > 0 ? `+ ${remStock} ${sSym}` : ''}`
      : `${stock} ${sSym}`;

    const costVal = Number((p as any).purchasePrice ?? (p as any).costPrice ?? 0);
    const saleVal = Number(p.salePrice || 0);
    const stockWorth = stock * costVal;

    return [
      idx + 1,
      p.sku || '---',
      p.name,
      p.brand || '---',
      p.category?.name || '---',
      packSpec,
      costVal > 0 ? `Rs. ${costVal.toLocaleString()}` : '---',
      saleVal > 0 ? `Rs. ${saleVal.toLocaleString()}` : '---',
      stockText,
      `Rs. ${Math.round(stockWorth).toLocaleString()}`,
    ];
  });

  autoTable(doc, {
    startY: 32,
    head: [['#', 'SKU', 'Product Name', 'Brand', 'Category', 'Packaging', 'Cost Price', 'Sale Price', 'Stock Level', 'Stock Worth (Cost)']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2, font: 'helvetica' },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 20 },
      2: { cellWidth: 50 },
      6: { halign: 'right' },
      7: { halign: 'right' },
      8: { halign: 'center' },
      9: { halign: 'right', fontStyle: 'bold' },
    },
  });

  drawFooter(doc);
  doc.save(`Products_Inventory_${new Date().toISOString().slice(0, 10)}.pdf`);
};

// ============================================================================
// 2. SALES REGISTER PDF
// ============================================================================
export const exportSalesPDF = (sales: Sale[], subtitle: string = 'All Sales') => {
  if (!sales || sales.length === 0) {
    alert('Koi sales data mojood nahi hai download karne ke liye.');
    return;
  }

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  drawCompanyBanner(doc, 'Sales Invoices & Billing Register', subtitle);

  let totalBill = 0;
  let totalRec = 0;
  let totalBal = 0;

  const tableData = sales.map((s, idx) => {
    const bill = Number(s.netAmount || 0);
    const rec = Number(s.receivedAmount || 0);
    const bal = Number(s.remainingBalance || 0);

    totalBill += bill;
    totalRec += rec;
    totalBal += bal;

    return [
      idx + 1,
      s.invoiceNumber,
      new Date(s.saleDate).toLocaleDateString('en-GB'),
      s.customer?.shopName || 'Walk-in Customer',
      s.salesman?.fullName || 'Counter',
      s.saleType || 'VAN',
      `Rs. ${bill.toLocaleString()}`,
      `Rs. ${rec.toLocaleString()}`,
      `Rs. ${bal.toLocaleString()}`,
      s.status,
    ];
  });

  // Summary Row
  tableData.push([
    '',
    'TOTAL',
    '',
    `${sales.length} Invoices`,
    '',
    '',
    `Rs. ${Math.round(totalBill).toLocaleString()}`,
    `Rs. ${Math.round(totalRec).toLocaleString()}`,
    `Rs. ${Math.round(totalBal).toLocaleString()}`,
    '',
  ]);

  autoTable(doc, {
    startY: 32,
    head: [['#', 'Invoice #', 'Date', 'Customer / Shop', 'Salesman', 'Type', 'Total Bill', 'Received', 'Balance', 'Status']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2.2, font: 'helvetica' },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 26, fontStyle: 'bold' },
      2: { cellWidth: 22 },
      3: { cellWidth: 45 },
      6: { halign: 'right', fontStyle: 'bold' },
      7: { halign: 'right', textColor: [5, 150, 105] },
      8: { halign: 'right', textColor: [220, 38, 38], fontStyle: 'bold' },
      9: { halign: 'center' },
    },
    didParseCell: (data) => {
      if (data.row.index === tableData.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249];
      }
    },
  });

  drawFooter(doc);
  doc.save(`Sales_Register_${new Date().toISOString().slice(0, 10)}.pdf`);
};

// ============================================================================
// 3. PURCHASES REGISTER PDF
// ============================================================================
export const exportPurchasesPDF = (purchases: any[], subtitle: string = 'All Purchases') => {
  if (!purchases || purchases.length === 0) {
    alert('Koi purchase record mojood nahi hai download karne ke liye.');
    return;
  }

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  drawCompanyBanner(doc, 'Inward Stock Purchase Register', subtitle);

  let totalAmt = 0;
  let totalPaid = 0;
  let totalBal = 0;

  const tableData = purchases.map((p, idx) => {
    const net = Number(p.netAmount || 0);
    const paid = Number(p.paidAmount || 0);
    const bal = Number(p.remainingAmount || 0);

    totalAmt += net;
    totalPaid += paid;
    totalBal += bal;

    const itemCount = p.items?.length || 0;

    return [
      idx + 1,
      p.invoiceNumber,
      new Date(p.purchaseDate).toLocaleDateString('en-GB'),
      p.supplier?.companyName || '---',
      p.supplier?.ownerName || '---',
      `${itemCount} Products`,
      `Rs. ${net.toLocaleString()}`,
      `Rs. ${paid.toLocaleString()}`,
      `Rs. ${bal.toLocaleString()}`,
      p.paymentMethod || 'CASH',
    ];
  });

  tableData.push([
    '',
    'TOTAL',
    '',
    `${purchases.length} Purchase Bills`,
    '',
    '',
    `Rs. ${Math.round(totalAmt).toLocaleString()}`,
    `Rs. ${Math.round(totalPaid).toLocaleString()}`,
    `Rs. ${Math.round(totalBal).toLocaleString()}`,
    '',
  ]);

  autoTable(doc, {
    startY: 32,
    head: [['#', 'Purchase Inv #', 'Date', 'Supplier / Mill', 'Contact Person', 'Items', 'Net Amount', 'Paid Amount', 'Payable Balance', 'Method']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2.2, font: 'helvetica' },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 28, fontStyle: 'bold' },
      2: { cellWidth: 22 },
      3: { cellWidth: 45 },
      6: { halign: 'right', fontStyle: 'bold' },
      7: { halign: 'right', textColor: [5, 150, 105] },
      8: { halign: 'right', textColor: [220, 38, 38], fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.row.index === tableData.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249];
      }
    },
  });

  drawFooter(doc);
  doc.save(`Purchases_Register_${new Date().toISOString().slice(0, 10)}.pdf`);
};

// ============================================================================
// 4. CONSOLIDATED ALL-PARTY LEDGER (POINT 3: CUSTOMERS + SUPPLIERS IN 1 PDF)
// ============================================================================
export const exportConsolidatedAllPartyBalancesPDF = (customers: Customer[], suppliers: Supplier[]) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  drawCompanyBanner(
    doc,
    'Grand Consolidated All-Party Balance Summary',
    'Total Market Receivables & Supplier Payables'
  );

  let totalCustomerReceivable = 0;
  let customersWithBalCount = 0;

  const customerRows = (customers || []).map((c, idx) => {
    const bal = Number(c.currentReceivable || 0);
    if (bal > 0) customersWithBalCount++;
    totalCustomerReceivable += bal;
    return [
      idx + 1,
      c.shopName,
      c.ownerName || '---',
      c.phone || '---',
      c.area || '---',
      `Rs. ${Math.round(bal).toLocaleString()}`,
    ];
  });

  let totalSupplierPayable = 0;
  let suppliersWithBalCount = 0;

  const supplierRows = (suppliers || []).map((s, idx) => {
    const bal = Number(s.currentPayable || 0);
    if (bal > 0) suppliersWithBalCount++;
    totalSupplierPayable += bal;
    return [
      idx + 1,
      s.companyName,
      s.contactPerson || '---',
      s.phone || '---',
      s.address || '---',
      `Rs. ${Math.round(bal).toLocaleString()}`,
    ];
  });

  const netMarketPosition = totalCustomerReceivable - totalSupplierPayable;

  // Overview Summary Cards on Page 1 (3 Equal Spaced Clean Boxes)
  let yPos = 32;
  const cardGap = 5;
  const colWidth = (pageWidth - 28 - (cardGap * 2)) / 3;

  // Card 1: Receivables (Green)
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(14, yPos, colWidth, 20, 2, 2, 'F');
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(14, yPos, colWidth, 20, 2, 2, 'D');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(21, 128, 61);
  doc.text('RECEIVABLES (Lena Hai):', 18, yPos + 6);
  doc.setFontSize(10.5);
  doc.setTextColor(5, 150, 105);
  doc.text(`Rs. ${Math.round(totalCustomerReceivable).toLocaleString()}`, 18, yPos + 14);

  // Card 2: Payables (Red)
  const col2X = 14 + colWidth + cardGap;
  doc.setFillColor(254, 242, 242);
  doc.roundedRect(col2X, yPos, colWidth, 20, 2, 2, 'F');
  doc.setDrawColor(254, 202, 202);
  doc.roundedRect(col2X, yPos, colWidth, 20, 2, 2, 'D');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(185, 28, 28);
  doc.text('PAYABLES (Dena Hai):', col2X + 4, yPos + 6);
  doc.setFontSize(10.5);
  doc.setTextColor(220, 38, 38);
  doc.text(`Rs. ${Math.round(totalSupplierPayable).toLocaleString()}`, col2X + 4, yPos + 14);

  // Card 3: Net Equity Position
  const col3X = col2X + colWidth + cardGap;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(col3X, yPos, colWidth, 20, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(col3X, yPos, colWidth, 20, 2, 2, 'D');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('NET MARKET POSITION:', col3X + 4, yPos + 6);
  doc.setFontSize(10);
  doc.setTextColor(netMarketPosition >= 0 ? 5 : 220, netMarketPosition >= 0 ? 150 : 38, netMarketPosition >= 0 ? 105 : 38);
  doc.text(`Rs. ${Math.round(netMarketPosition).toLocaleString()} ${netMarketPosition >= 0 ? '(SURPLUS)' : '(DEFICIT)'}`, col3X + 4, yPos + 14);

  yPos += 24;

  // Section 1: Customers Table
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`1. CUSTOMER KHATA RECEIVABLES (${customers.length} Shops, ${customersWithBalCount} with Balance)`, 14, yPos);

  autoTable(doc, {
    startY: yPos + 3,
    head: [['#', 'Customer / Shop Name', 'Owner', 'Phone', 'Area / Route', 'Receivable Balance (Rs)']],
    body: [
      ...customerRows,
      ['', 'TOTAL RECEIVABLE', '', '', `${customers.length} Customers`, `Rs. ${Math.round(totalCustomerReceivable).toLocaleString()}`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    styles: { fontSize: 7, cellPadding: 1.8, font: 'helvetica' },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 48, fontStyle: 'bold' },
      5: { halign: 'right', fontStyle: 'bold', textColor: [5, 150, 105] },
    },
    didParseCell: (data) => {
      if (data.row.index === customerRows.length) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249];
      }
    },
  });

  // Section 2: Suppliers Table
  let finalY = (doc as any).lastAutoTable.finalY + 10;
  if (finalY > doc.internal.pageSize.getHeight() - 40) {
    doc.addPage();
    finalY = 20;
  }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`2. SUPPLIER KHATA PAYABLES (${suppliers.length} Companies / Mills, ${suppliersWithBalCount} with Balance)`, 14, finalY);

  autoTable(doc, {
    startY: finalY + 3,
    head: [['#', 'Company / Supplier Name', 'Contact Person', 'Phone', 'Address', 'Payable Balance (Rs)']],
    body: [
      ...supplierRows,
      ['', 'TOTAL PAYABLE', '', '', `${suppliers.length} Suppliers`, `Rs. ${Math.round(totalSupplierPayable).toLocaleString()}`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    styles: { fontSize: 7, cellPadding: 1.8, font: 'helvetica' },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 48, fontStyle: 'bold' },
      5: { halign: 'right', fontStyle: 'bold', textColor: [220, 38, 38] },
    },
    didParseCell: (data) => {
      if (data.row.index === supplierRows.length) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249];
      }
    },
  });

  drawFooter(doc);
  doc.save(`All_Parties_Ledger_Balance_${new Date().toISOString().slice(0, 10)}.pdf`);
};

// ============================================================================
// 5. SINGLE PARTY LEDGER STATEMENT PDF
// ============================================================================
export const exportSingleLedgerStatementPDF = (
  partyName: string,
  partyType: 'CUSTOMER' | 'SUPPLIER' | 'DUAL_PARTNER',
  partyPhone: string,
  partyAddress: string,
  entries: any[],
  currentBalance: number
) => {
  if (!entries || entries.length === 0) {
    alert('Koi ledger entry mojood nahi hai download karne ke liye.');
    return;
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const title = partyType === 'CUSTOMER' 
    ? 'Customer Account Ledger Statement' 
    : partyType === 'SUPPLIER' 
      ? 'Supplier Account Ledger Statement' 
      : 'Dual Partner Mutual Account Statement';
  drawCompanyBanner(doc, title, `Party: ${partyName} | Current Balance: Rs. ${Math.round(currentBalance).toLocaleString()}`);

  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 32;

  // Party Profile Header
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, yPos, pageWidth - 28, 16, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, yPos, pageWidth - 28, 16, 2, 2, 'D');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Party Name: ${partyName}`, 18, yPos + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(`Phone: ${partyPhone || '---'}  |  Address/Area: ${partyAddress || '---'}`, 18, yPos + 12);

  doc.setFont('helvetica', 'bold');
  doc.text(`Current Outstanding: Rs. ${Math.round(currentBalance).toLocaleString()}`, pageWidth - 18, yPos + 10, { align: 'right' });

  let totalDebit = 0;
  let totalCredit = 0;

  const tableData = entries.map((e, idx) => {
    const dr = Number(e.debit || 0);
    const cr = Number(e.credit || 0);
    totalDebit += dr;
    totalCredit += cr;

    return [
      idx + 1,
      new Date(e.date).toLocaleDateString('en-GB') + ' ' + new Date(e.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      e.transactionType || 'ENTRY',
      e.description || e.notes || '---',
      dr > 0 ? `Rs. ${dr.toLocaleString()}` : '---',
      cr > 0 ? `Rs. ${cr.toLocaleString()}` : '---',
      `Rs. ${Number(e.runningBalance || 0).toLocaleString()}`,
    ];
  });

  tableData.push([
    '',
    'TOTAL',
    '',
    `${entries.length} Ledger Transactions`,
    `Rs. ${Math.round(totalDebit).toLocaleString()}`,
    `Rs. ${Math.round(totalCredit).toLocaleString()}`,
    `Rs. ${Math.round(currentBalance).toLocaleString()}`,
  ]);

  autoTable(doc, {
    startY: yPos + 20,
    head: [['#', 'Date & Time', 'Type', 'Description / Details', 'Debit (Lena / Dr)', 'Credit (Dena / Cr)', 'Balance (Baqaya)']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    styles: { fontSize: 7, cellPadding: 2, font: 'helvetica' },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 28 },
      2: { cellWidth: 24, fontStyle: 'bold' },
      3: { cellWidth: 60 },
      4: { halign: 'right', textColor: [220, 38, 38] },
      5: { halign: 'right', textColor: [5, 150, 105] },
      6: { halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.row.index === tableData.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249];
      }
    },
  });

  drawFooter(doc);
  doc.save(`${partyName.replace(/\s+/g, '_')}_Ledger_${new Date().toISOString().slice(0, 10)}.pdf`);
};

// ============================================================================
// 6. EXPENSES REGISTER PDF
// ============================================================================
export const exportExpensesPDF = (expenses: any[], subtitle: string = 'Daily Expenses') => {
  if (!expenses || expenses.length === 0) {
    alert('Koi expense data mojood nahi hai download karne ke liye.');
    return;
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  drawCompanyBanner(doc, 'Daily Business Expenses Register', subtitle);

  let totalExp = 0;
  const tableData = expenses.map((e, idx) => {
    const amt = Number(e.amount || 0);
    totalExp += amt;
    const expDate = e.expenseDate || e.date || e.createdAt || new Date();
    return [
      idx + 1,
      new Date(expDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      e.category || 'GENERAL',
      e.description || '---',
      e.paymentMethod || 'CASH',
      e.recordedBy?.fullName || e.createdBy?.fullName || 'Admin',
      `Rs. ${amt.toLocaleString()}`,
    ];
  });

  tableData.push([
    '',
    'TOTAL',
    '',
    `${expenses.length} Vouchers`,
    '',
    '',
    `Rs. ${Math.round(totalExp).toLocaleString()}`,
  ]);

  autoTable(doc, {
    startY: 32,
    head: [['#', 'Date', 'Category', 'Description / Reason', 'Method', 'Recorded By', 'Amount (Rs)']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2.2, font: 'helvetica' },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 24 },
      2: { cellWidth: 28, fontStyle: 'bold' },
      3: { cellWidth: 55 },
      6: { halign: 'right', fontStyle: 'bold', textColor: [220, 38, 38] },
    },
    didParseCell: (data) => {
      if (data.row.index === tableData.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249];
      }
    },
  });

  drawFooter(doc);
  doc.save(`Expenses_${new Date().toISOString().slice(0, 10)}.pdf`);
};

// ============================================================================
// 7. EMPLOYEES & PAYROLL PDF
// ============================================================================
export const exportPayrollPDF = (payrolls: any[], month: number, year: number) => {
  if (!payrolls || payrolls.length === 0) {
    alert('Koi payroll data mojood nahi hai.');
    return;
  }

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  drawCompanyBanner(doc, 'Staff Monthly Payroll & Salary Register', `Month: ${month}/${year} | Total Staff: ${payrolls.length}`);

  let totalNet = 0;
  let totalPaid = 0;
  let totalDue = 0;

  const tableData = payrolls.map((p, idx) => {
    const net = Number(p.netPayable || 0);
    const paid = Number(p.paidAmount || 0);
    const due = Number(p.balanceDue || 0);

    totalNet += net;
    totalPaid += paid;
    totalDue += due;

    return [
      idx + 1,
      p.employee?.employeeCode || '---',
      p.employee?.fullName || '---',
      p.employee?.designation || 'Staff',
      `Rs. ${Number(p.basicSalary || 0).toLocaleString()}`,
      p.presentDays || 0,
      p.absentDays || 0,
      p.halfDays || 0,
      `Rs. ${net.toLocaleString()}`,
      `Rs. ${paid.toLocaleString()}`,
      `Rs. ${due.toLocaleString()}`,
      p.status,
    ];
  });

  tableData.push([
    '',
    'TOTAL',
    '',
    `${payrolls.length} Staff`,
    '',
    '',
    '',
    '',
    `Rs. ${Math.round(totalNet).toLocaleString()}`,
    `Rs. ${Math.round(totalPaid).toLocaleString()}`,
    `Rs. ${Math.round(totalDue).toLocaleString()}`,
    '',
  ]);

  autoTable(doc, {
    startY: 32,
    head: [['#', 'Code', 'Employee Name', 'Designation', 'Basic Salary', 'Present', 'Absent', 'Half Day', 'Net Payable', 'Paid', 'Balance Due', 'Status']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2.2, font: 'helvetica' },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      4: { halign: 'right' },
      8: { halign: 'right', fontStyle: 'bold' },
      9: { halign: 'right', textColor: [5, 150, 105] },
      10: { halign: 'right', textColor: [220, 38, 38], fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.row.index === tableData.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249];
      }
    },
  });

  drawFooter(doc);
  doc.save(`Payroll_${month}_${year}.pdf`);
};

// ============================================================================
// 8. CUSTOMERS DIRECTORY PDF
// ============================================================================
export const exportCustomersPDF = (customers: Customer[], subtitle: string = 'Customer Khata Directory') => {
  if (!customers || customers.length === 0) {
    alert('Koi customer data mojood nahi hai.');
    return;
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  drawCompanyBanner(doc, 'Customer Khata & Balance Directory', subtitle);

  let totalRec = 0;
  const tableData = customers.map((c, idx) => {
    const bal = Number(c.currentReceivable || 0);
    totalRec += bal;
    return [
      idx + 1,
      c.shopName,
      c.ownerName || '---',
      c.phone || '---',
      c.area || '---',
      c.salesman?.fullName || '---',
      `Rs. ${Math.round(bal).toLocaleString()}`,
    ];
  });

  tableData.push([
    '',
    'TOTAL RECEIVABLES',
    '',
    '',
    `${customers.length} Shops`,
    '',
    `Rs. ${Math.round(totalRec).toLocaleString()}`,
  ]);

  autoTable(doc, {
    startY: 32,
    head: [['#', 'Shop Name', 'Owner', 'Phone', 'Area / Route', 'Salesman', 'Receivable (Rs)']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    styles: { fontSize: 7, cellPadding: 2, font: 'helvetica' },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 45, fontStyle: 'bold' },
      6: { halign: 'right', fontStyle: 'bold', textColor: [5, 150, 105] },
    },
    didParseCell: (data) => {
      if (data.row.index === tableData.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249];
      }
    },
  });

  drawFooter(doc);
  doc.save(`Customers_Ledger_${new Date().toISOString().slice(0, 10)}.pdf`);
};

// ============================================================================
// 9. SUPPLIERS DIRECTORY PDF
// ============================================================================
export const exportSuppliersPDF = (suppliers: Supplier[], subtitle: string = 'Oil Supplier Mills & Companies') => {
  if (!suppliers || suppliers.length === 0) {
    alert('Koi supplier data mojood nahi hai.');
    return;
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  drawCompanyBanner(doc, 'Oil Suppliers & Companies Payables', subtitle);

  let totalPay = 0;
  const tableData = suppliers.map((s, idx) => {
    const bal = Number(s.currentPayable || 0);
    totalPay += bal;
    return [
      idx + 1,
      s.companyName,
      s.contactPerson || '---',
      s.phone || '---',
      s.address || '---',
      `Rs. ${Math.round(bal).toLocaleString()}`,
    ];
  });

  tableData.push([
    '',
    'TOTAL PAYABLES',
    '',
    '',
    `${suppliers.length} Suppliers`,
    `Rs. ${Math.round(totalPay).toLocaleString()}`,
  ]);

  autoTable(doc, {
    startY: 32,
    head: [['#', 'Company Name', 'Contact Person', 'Phone', 'Address / Depot', 'Payable Due (Rs)']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    styles: { fontSize: 7, cellPadding: 2, font: 'helvetica' },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 50, fontStyle: 'bold' },
      5: { halign: 'right', fontStyle: 'bold', textColor: [220, 38, 38] },
    },
    didParseCell: (data) => {
      if (data.row.index === tableData.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249];
      }
    },
  });

  drawFooter(doc);
  doc.save(`Suppliers_Ledger_${new Date().toISOString().slice(0, 10)}.pdf`);
};

// ============================================================================
// 10. EMPLOYEES DIRECTORY PDF
// ============================================================================
export const exportEmployeesPDF = (employees: any[], subtitle: string = 'Staff Directory') => {
  if (!employees || employees.length === 0) {
    alert('Koi employee data mojood nahi hai.');
    return;
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  drawCompanyBanner(doc, 'Employees & Staff Directory', subtitle);

  let totalSal = 0;
  const tableData = employees.map((emp, idx) => {
    const sal = Number(emp.basicSalary || 0);
    totalSal += sal;
    return [
      idx + 1,
      emp.employeeCode || '---',
      emp.fullName || '---',
      emp.phone || '---',
      emp.designation || 'Staff',
      emp.salaryType || 'MONTHLY',
      `Rs. ${sal.toLocaleString()}`,
      emp.status || 'ACTIVE',
    ];
  });

  tableData.push([
    '',
    'TOTAL',
    `${employees.length} Staff Members`,
    '',
    '',
    '',
    `Rs. ${totalSal.toLocaleString()}`,
    '',
  ]);

  autoTable(doc, {
    startY: 32,
    head: [['#', 'Code', 'Staff Full Name', 'Phone', 'Designation', 'Type', 'Basic Wage (Rs)', 'Status']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2, font: 'helvetica' },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 20, fontStyle: 'bold' },
      6: { halign: 'right', fontStyle: 'bold' },
      7: { halign: 'center' },
    },
    didParseCell: (data) => {
      if (data.row.index === tableData.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249];
      }
    },
  });

  drawFooter(doc);
  doc.save(`Staff_Directory_${new Date().toISOString().slice(0, 10)}.pdf`);
};

// ============================================================================
// 11. WARRANTY CLAIMS & DEFECTIVE STORE PDF
// ============================================================================
export const exportWarrantyClaimsPDF = (claims: any[], subtitle: string = 'Warranty Claims Register') => {
  if (!claims || claims.length === 0) {
    alert('Koi warranty claim data mojood nahi hai.');
    return;
  }

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  drawCompanyBanner(doc, 'Warranty Claims & Defective Store Register', subtitle);

  let totalLoss = 0;
  const tableData = claims.map((c, idx) => {
    const loss = Number(c.lossAmount || 0);
    totalLoss += loss;
    const itemsStr = c.items?.map((it: any) => `${it.productName} (${it.quantity} ${it.unitSymbol || ''})`).join(', ') || '-';
    return [
      idx + 1,
      c.returnNumber || '---',
      new Date(c.returnDate).toLocaleDateString(),
      c.customer?.shopName || 'Customer',
      c.originalInvoice || '-',
      itemsStr,
      c.claimCategory || 'NON_OIL',
      c.resolution || 'REPLACEMENT',
      c.claimStatus || 'IN_QUARANTINE',
      loss > 0 ? `Rs. ${loss.toLocaleString()}` : 'Rs. 0',
    ];
  });

  tableData.push([
    '',
    'TOTAL',
    `${claims.length} Claims`,
    '',
    '',
    '',
    '',
    '',
    'Total Loss:',
    `Rs. ${totalLoss.toLocaleString()}`,
  ]);

  autoTable(doc, {
    startY: 32,
    head: [['#', 'Claim #', 'Date', 'Customer / Shop', 'Original Inv', 'Claimed Item & Qty', 'Category', 'Resolution', 'Status', 'Loss (Rs)']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [124, 58, 237], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2, font: 'helvetica' },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 26, fontStyle: 'bold' },
      9: { halign: 'right', fontStyle: 'bold', textColor: [220, 38, 38] },
    },
    didParseCell: (data) => {
      if (data.row.index === tableData.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [243, 232, 255];
      }
    },
  });

  drawFooter(doc);
  doc.save(`Warranty_Claims_${new Date().toISOString().slice(0, 10)}.pdf`);
};

