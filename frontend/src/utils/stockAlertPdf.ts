import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Product } from '../types';

export const exportStockAlertsPDF = (products: Product[], title = 'CRITICAL MINIMUM STOCK & REORDER REPORT') => {
  if (!products || products.length === 0) {
    alert('Koi low stock product mojood nahi hai.');
    return;
  }

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });
  const pageWidth = doc.internal.pageSize.getWidth();

  // 1. Header Banner (Urgent Red Theme)
  doc.setFillColor(185, 28, 28); // Crimson red
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(254, 240, 138); // Yellow accent
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('RAFIQ AUTO & OIL TRADERS - OKARA', 14, 11);

  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.text('54-Stop Near MCB Bank, Dipalpur Road, Okara | Phone: 0300-6950228 / 0300-4100410', 14, 17);

  doc.setFontSize(10);
  doc.setTextColor(254, 226, 226);
  doc.setFont('helvetica', 'bold');
  doc.text(`${title} (URGENT REORDER LIST)`, 14, 23);

  // Date and item count
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  doc.text(`Generated: ${dateStr} ${timeStr}`, pageWidth - 70, 15);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Alert Items: ${products.length}`, pageWidth - 70, 22);

  // 2. Table Headers
  const headerRow = [
    '#',
    'SKU',
    'Product Name',
    'Category / Brand',
    'Packaging Ratio',
    'Current Stock',
    'Min Threshold',
    'Shortage',
    'Status',
  ];

  // 3. Table Rows
  const bodyData = products.map((p, idx) => {
    const stock = Number(p.currentStock || 0);
    const min = Number(p.minimumStockLevel || 0);
    const conv = Number(p.conversionFactor) || 1;
    const hasPkg = (!!p.primaryUnit || !!p.primaryUnitId) && conv > 1;
    const pSym = p.primaryUnit?.symbol || 'Ctn';
    const sSym = p.unit?.symbol || 'Pcs';

    const stockCartons = Math.floor(stock / conv);
    const remStock = Math.round((stock % conv) * 100) / 100;
    const minCartons = Math.floor(min / conv);
    const remMin = Math.round((min % conv) * 100) / 100;

    const packSpec = hasPkg ? `1 ${pSym} = ${conv} ${sSym}` : `${sSym}`;

    const stockDisplay = hasPkg
      ? `${stockCartons} ${pSym}${remStock > 0 ? ` + ${remStock} ${sSym}` : ''}\n(Total: ${stock} ${sSym})`
      : `${stock} ${sSym}`;

    const minDisplay = hasPkg
      ? `${minCartons} ${pSym}${remMin > 0 ? ` + ${remMin} ${sSym}` : ''}\n(Total: ${min} ${sSym})`
      : `${min} ${sSym}`;

    const diff = Math.round((min - stock) * 100) / 100;
    const shortageDisplay = diff > 0
      ? (hasPkg ? `${Math.ceil(diff / conv)} ${pSym} (${diff} ${sSym})` : `${diff} ${sSym}`)
      : '0';

    const status = stock <= 0 ? 'OUT OF STOCK' : 'LOW STOCK';

    return [
      (idx + 1).toString(),
      p.sku || '-',
      p.name || '-',
      `${p.category?.name || 'General'}\n${p.brand || ''}`.trim(),
      packSpec,
      stockDisplay,
      minDisplay,
      shortageDisplay,
      status,
    ];
  });

  autoTable(doc, {
    head: [headerRow],
    body: bodyData,
    startY: 32,
    margin: { left: 14, right: 14, bottom: 16 },
    theme: 'grid',
    headStyles: {
      fillColor: [185, 28, 28],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 20, fontStyle: 'bold' },
      2: { cellWidth: 55, fontStyle: 'bold' },
      3: { cellWidth: 35 },
      4: { cellWidth: 28, halign: 'center' },
      5: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
      6: { cellWidth: 35, halign: 'right' },
      7: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
      8: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [15, 23, 42],
    },
    alternateRowStyles: {
      fillColor: [254, 242, 242],
    },
    didDrawPage: (data) => {
      const pageCount = (doc as any).internal.getNumberOfPages();
      const curPage = data.pageNumber;
      const pageHeight = doc.internal.pageSize.getHeight();

      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Rafiq Auto & Oil Traders Okara | Critical Reorder Report | Page ${curPage} of ${pageCount}`,
        14,
        pageHeight - 6
      );
    },
  });

  doc.save(`Rafiq_Oil_Critical_Stock_Alerts_${new Date().toISOString().slice(0, 10)}.pdf`);
};
