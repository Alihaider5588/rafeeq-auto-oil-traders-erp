import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  FileText,
  Download,
  Printer,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  XCircle,
  Building2,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  Droplet,
  Layers,
  Settings,
  CheckSquare,
  Square,
  BadgePercent,
  Sliders
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  sku: string;
  brand: string;
  category?: { id: string; name: string } | null;
  unit: { name: string; symbol: string };
  primaryUnit?: { name: string; symbol: string } | null;
  conversionFactor: number;
  purchasePrice?: number | string;
  salePrice: number | string;
  wholesalePrice?: number | string;
  currentStock?: number | string;
  description?: string | null;
  specifications?: string | null;
  imageUrl?: string | null;
  showInCatalog: boolean;
  isActive: boolean;
}

export interface CatalogueColumns {
  sku: boolean;
  name: boolean;
  brand: boolean;
  category: boolean;
  packSpec: boolean;
  stock: boolean;
  purchasePrice: boolean;
  salePrice: boolean;
  specifications: boolean;
}

export type PresetType = 'WHOLESALE' | 'PURCHASE_COST' | 'STOCK_INVENTORY' | 'SPEC_ONLY' | 'CUSTOM';

export const CataloguePage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Catalog configuration options
  const [companyName, setCompanyName] = useState('RAFIQ AUTO & OIL TRADERS');
  const [tagline, setTagline] = useState('رفیق آٹو اینڈ آئل ٹریڈرز - اوکاڑہ');
  const [contactPhone, setContactPhone] = useState('0306-9258573 / 0327-7497457');
  const [depotAddress, setDepotAddress] = useState('54-Stop Near MCB Bank, Dipalpur Road, Okara');
  const [footerNote, setFooterNote] = useState('Authorized Wholesale Lubricants & Filter Distributors. Prices subject to change without prior notice.');

  // Configurable Catalogue Options & Columns
  const [selectedPreset, setSelectedPreset] = useState<PresetType>('WHOLESALE');
  const [showOptionsPanel, setShowOptionsPanel] = useState<boolean>(true);
  const [columns, setColumns] = useState<CatalogueColumns>({
    sku: true,
    name: true,
    brand: true,
    category: true,
    packSpec: true,
    stock: false,
    purchasePrice: false,
    salePrice: true,
    specifications: false,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes, setRes] = await Promise.all([
        api.get('/products?limit=1500'),
        api.get('/products/meta/categories'),
        api.get('/settings'),
      ]);

      if (prodRes.data?.success) setProducts(prodRes.data.data);
      if (catRes.data?.success) setCategories(catRes.data.categories);
      if (setRes.data?.settings) {
        setCompanyName(setRes.data.settings.companyName || companyName);
        setContactPhone(setRes.data.settings.phone || contactPhone);
        setDepotAddress(setRes.data.settings.address || depotAddress);
      }
    } catch (err) {
      console.error('Failed to load catalogue products', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPreset = (preset: PresetType) => {
    setSelectedPreset(preset);
    if (preset === 'WHOLESALE') {
      setColumns({
        sku: true,
        name: true,
        brand: true,
        category: true,
        packSpec: true,
        stock: false,
        purchasePrice: false,
        salePrice: true,
        specifications: false,
      });
    } else if (preset === 'PURCHASE_COST') {
      setColumns({
        sku: true,
        name: true,
        brand: true,
        category: true,
        packSpec: true,
        stock: false,
        purchasePrice: true,
        salePrice: true,
        specifications: false,
      });
    } else if (preset === 'STOCK_INVENTORY') {
      setColumns({
        sku: true,
        name: true,
        brand: true,
        category: true,
        packSpec: true,
        stock: true,
        purchasePrice: true,
        salePrice: true,
        specifications: false,
      });
    } else if (preset === 'SPEC_ONLY') {
      setColumns({
        sku: true,
        name: true,
        brand: true,
        category: true,
        packSpec: true,
        stock: false,
        purchasePrice: false,
        salePrice: false,
        specifications: true,
      });
    }
  };

  const toggleColumn = (key: keyof CatalogueColumns) => {
    setSelectedPreset('CUSTOM');
    setColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleToggleCatalog = async (id: string, currentStatus: boolean) => {
    try {
      const res = await api.put(`/products/${id}`, { showInCatalog: !currentStatus });
      if (res.data?.success) {
        setProducts(products.map((p) => (p.id === id ? { ...p, showInCatalog: !currentStatus } : p)));
      }
    } catch (err) {
      alert('Failed to update catalog status');
    }
  };

  const handleSelectAllForCatalog = async (markAs: boolean) => {
    const affected = filteredProducts.filter((p) => p.showInCatalog !== markAs);
    if (affected.length === 0) return;

    if (!confirm(`Are you sure you want to ${markAs ? 'include' : 'exclude'} all ${affected.length} filtered items in the catalogue?`)) {
      return;
    }

    // Optimistically update
    const affectedIds = new Set(affected.map((p) => p.id));
    setProducts((prev) =>
      prev.map((p) => (affectedIds.has(p.id) ? { ...p, showInCatalog: markAs } : p))
    );

    // Persist each in background
    for (const p of affected) {
      try {
        await api.put(`/products/${p.id}`, { showInCatalog: markAs });
      } catch (e) {
        console.error('Failed to update catalog status for', p.id, e);
      }
    }
  };

  const filteredProducts = products.filter((p) => {
    if (!p.isActive) return false;
    if (selectedCategory && p.category?.id !== selectedCategory) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.category?.name && p.category.name.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const catalogProducts = filteredProducts.filter((p) => p.showInCatalog);

  // Generate Professional Multi-page PDF based on dynamic column selection
  const generatePDF = (customCols?: CatalogueColumns, customTitle?: string) => {
    const cols = customCols || columns;
    const isWide = (cols.purchasePrice && cols.salePrice && cols.stock) || (cols.purchasePrice && cols.specifications);
    const doc = new jsPDF({
      orientation: isWide ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    const pageWidth = doc.internal.pageSize.getWidth();

    // 1. Header Banner
    doc.setFillColor(15, 23, 42); // Dark slate header
    doc.rect(0, 0, pageWidth, 32, 'F');

    doc.setTextColor(245, 158, 11); // Amber
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(companyName, 14, 13);

    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'normal');
    doc.text(`${depotAddress} | Phone: ${contactPhone}`, 14, 21);

    const subTitle =
      customTitle ||
      (cols.purchasePrice && cols.salePrice
        ? 'OFFICIAL INTERNAL VALUATION & COST CATALOGUE (PURCHASE & SELLING RATES)'
        : cols.purchasePrice
        ? 'OFFICIAL COST & PURCHASE RATE CATALOGUE (خرید ریٹ)'
        : cols.salePrice
        ? 'OFFICIAL WHOLESALE PRODUCT CATALOGUE (WITH RATES)'
        : 'OFFICIAL PRODUCT SPECIFICATION CATALOGUE (NO PRICES)');
    doc.text(subTitle, 14, 27);

    // Date stamp
    doc.setFontSize(9);
    doc.setTextColor(203, 213, 225);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, pageWidth - 45, 13);

    // 2. Prepare Dynamic Headers
    const headerRow: string[] = ['#'];
    if (cols.sku) headerRow.push('SKU');
    if (cols.name) headerRow.push('Product Name');
    if (cols.brand) headerRow.push('Brand');
    if (cols.category) headerRow.push('Category');
    if (cols.packSpec) headerRow.push('Packaging Spec');
    if (cols.stock) headerRow.push('In Stock');
    if (cols.purchasePrice) headerRow.push('Purchase (PKR)');
    if (cols.salePrice) headerRow.push('Selling (PKR)');
    if (cols.specifications) headerRow.push('Technical Specs');

    // 3. Prepare Body Data
    const bodyData = catalogProducts.map((p, idx) => {
      const packSpec =
        p.primaryUnit && Number(p.conversionFactor) > 1
          ? `1 ${p.primaryUnit.name} = ${p.conversionFactor} ${p.unit?.symbol || 'Pcs'}`
          : `${p.unit?.name || 'Unit'}`;

      const row: string[] = [(idx + 1).toString()];
      if (cols.sku) row.push(p.sku || '-');
      if (cols.name) row.push(p.name || '-');
      if (cols.brand) row.push(p.brand || '-');
      if (cols.category) row.push(p.category?.name || 'General');
      if (cols.packSpec) row.push(packSpec);
      if (cols.stock) row.push(`${Number(p.currentStock || 0)} ${p.unit?.symbol || ''}`);
      if (cols.purchasePrice) row.push(`Rs. ${Number(p.purchasePrice || 0).toLocaleString()}`);
      if (cols.salePrice) row.push(`Rs. ${Number(p.salePrice || 0).toLocaleString()}`);
      if (cols.specifications) row.push(p.specifications || p.description || 'Standard lubricant');

      return row;
    });

    // 4. AutoTable rendering
    autoTable(doc, {
      head: [headerRow],
      body: bodyData,
      startY: 36,
      margin: { left: 14, right: 14, bottom: 20 },
      theme: 'grid',
      headStyles: {
        fillColor: cols.purchasePrice ? [15, 23, 42] : [217, 119, 6], // Slate for internal cost, amber for retail
        textColor: [255, 255, 255],
        fontSize: 8.5,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [15, 23, 42],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      didDrawPage: (data) => {
        const pageCount = (doc as any).internal.getNumberOfPages();
        const curPage = data.pageNumber;
        const pageHeight = doc.internal.pageSize.getHeight();

        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `${footerNote} | Page ${curPage} of ${pageCount}`,
          14,
          pageHeight - 8
        );
      },
    });

    // Output PDF with descriptive filename
    const filePrefix = cols.purchasePrice
      ? 'Rafiq_Oil_Cost_Catalogue_With_Purchase_Rates'
      : cols.salePrice
      ? 'Rafiq_Oil_Wholesale_Catalogue'
      : 'Rafiq_Oil_Specification_Catalogue';

    doc.save(`${filePrefix}_${Date.now()}.pdf`);
  };

  return (
    <div>
      {/* Module Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
            Product Catalogue & PDF Publishing
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
            Curate products for retail and wholesale catalogues, customize export columns (including purchase rates), and download publication-ready PDFs.
          </p>
        </div>

        {/* Quick Export Actions */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              const wholesaleCols = {
                sku: true,
                name: true,
                brand: true,
                category: true,
                packSpec: true,
                stock: false,
                purchasePrice: false,
                salePrice: true,
                specifications: false,
              };
              generatePDF(wholesaleCols, 'OFFICIAL WHOLESALE PRODUCT CATALOGUE (WITH RATES)');
            }}
            disabled={catalogProducts.length === 0}
            style={{
              backgroundColor: '#d97706',
              color: '#ffffff',
              border: 'none',
              padding: '9px 14px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: catalogProducts.length === 0 ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(217,119,6,0.3)',
            }}
            title="Download PDF with selling wholesale rates"
          >
            <Download size={15} /> Export Selling Rates PDF
          </button>

          <button
            onClick={() => {
              const purchaseCols = {
                sku: true,
                name: true,
                brand: true,
                category: true,
                packSpec: true,
                stock: false,
                purchasePrice: true,
                salePrice: true,
                specifications: false,
              };
              generatePDF(purchaseCols, 'OFFICIAL INTERNAL VALUATION & COST CATALOGUE (PURCHASE & SELLING RATES)');
            }}
            disabled={catalogProducts.length === 0}
            style={{
              backgroundColor: '#059669',
              color: '#ffffff',
              border: 'none',
              padding: '9px 14px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: catalogProducts.length === 0 ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(5,150,105,0.3)',
            }}
            title="Download PDF including Purchase Rates (خرید ریٹ)"
          >
            <BadgePercent size={15} /> Export With Purchase Rate (خرید ریٹ)
          </button>

          <button
            onClick={() => {
              const specCols = {
                sku: true,
                name: true,
                brand: true,
                category: true,
                packSpec: true,
                stock: false,
                purchasePrice: false,
                salePrice: false,
                specifications: true,
              };
              generatePDF(specCols, 'OFFICIAL PRODUCT SPECIFICATION CATALOGUE (NO PRICES)');
            }}
            disabled={catalogProducts.length === 0}
            style={{
              backgroundColor: '#0f172a',
              color: '#ffffff',
              border: 'none',
              padding: '9px 14px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: catalogProducts.length === 0 ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
            title="Download PDF without prices"
          >
            <Printer size={15} /> Spec Only (No Rates)
          </button>
        </div>
      </div>

      {/* CATALOGUE CUSTOMIZER PANEL (Columns & Categories selection) */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1.5px solid #cbd5e1',
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800
            }}>
              <Sliders size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>
                Catalogue PDF Options & Column Customizer (کیٹلاگ میں مطلوبہ کالم منتخب کریں)
              </h3>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Choose preset or tick specific columns (Purchase Rate, Stock, Sale Price) to include in your downloaded PDF
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowOptionsPanel(!showOptionsPanel)}
            style={{
              background: 'none',
              border: '1px solid #cbd5e1',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: '#475569',
              cursor: 'pointer'
            }}
          >
            {showOptionsPanel ? '▲ Hide Options' : '▼ Show Options'}
          </button>
        </div>

        {showOptionsPanel && (
          <div>
            {/* Presets Row */}
            <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>Quick Presets:</span>
              <button
                type="button"
                onClick={() => handleApplyPreset('WHOLESALE')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: selectedPreset === 'WHOLESALE' ? '2px solid #d97706' : '1px solid #cbd5e1',
                  backgroundColor: selectedPreset === 'WHOLESALE' ? '#fffbeb' : '#f8fafc',
                  color: selectedPreset === 'WHOLESALE' ? '#b45309' : '#475569',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                }}
              >
                🏷️ Wholesale (Sale Price Only)
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset('PURCHASE_COST')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: selectedPreset === 'PURCHASE_COST' ? '2px solid #059669' : '1px solid #cbd5e1',
                  backgroundColor: selectedPreset === 'PURCHASE_COST' ? '#ecfdf5' : '#f8fafc',
                  color: selectedPreset === 'PURCHASE_COST' ? '#047857' : '#475569',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                }}
              >
                💼 With Purchase Rate (خرید ریٹ)
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset('STOCK_INVENTORY')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: selectedPreset === 'STOCK_INVENTORY' ? '2px solid #0284c7' : '1px solid #cbd5e1',
                  backgroundColor: selectedPreset === 'STOCK_INVENTORY' ? '#f0f9ff' : '#f8fafc',
                  color: selectedPreset === 'STOCK_INVENTORY' ? '#0369a1' : '#475569',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                }}
              >
                📊 Stock & Valuation (اسٹاک + خرید + فروخت)
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset('SPEC_ONLY')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: selectedPreset === 'SPEC_ONLY' ? '2px solid #0f172a' : '1px solid #cbd5e1',
                  backgroundColor: selectedPreset === 'SPEC_ONLY' ? '#f1f5f9' : '#f8fafc',
                  color: selectedPreset === 'SPEC_ONLY' ? '#0f172a' : '#475569',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                }}
              >
                📋 Spec Sheet (No Prices)
              </button>
            </div>

            {/* Checkboxes Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '10px',
              backgroundColor: '#f8fafc',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              marginBottom: '14px'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', cursor: 'pointer' }}>
                <input type="checkbox" checked={columns.sku} onChange={() => toggleColumn('sku')} />
                SKU / Code
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', cursor: 'pointer' }}>
                <input type="checkbox" checked={columns.name} onChange={() => toggleColumn('name')} />
                Product Name
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', cursor: 'pointer' }}>
                <input type="checkbox" checked={columns.brand} onChange={() => toggleColumn('brand')} />
                Brand / Company
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', cursor: 'pointer' }}>
                <input type="checkbox" checked={columns.category} onChange={() => toggleColumn('category')} />
                Category
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', cursor: 'pointer' }}>
                <input type="checkbox" checked={columns.packSpec} onChange={() => toggleColumn('packSpec')} />
                Packaging Spec (Unit / Ctn)
              </label>

              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: columns.purchasePrice ? '#047857' : '#1e293b',
                cursor: 'pointer',
                backgroundColor: columns.purchasePrice ? '#dcfce7' : 'transparent',
                padding: '2px 6px',
                borderRadius: '4px'
              }}>
                <input type="checkbox" checked={columns.purchasePrice} onChange={() => toggleColumn('purchasePrice')} />
                Purchase Rate (خرید ریٹ)
              </label>

              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: columns.salePrice ? '#b45309' : '#1e293b',
                cursor: 'pointer',
                backgroundColor: columns.salePrice ? '#fef3c7' : 'transparent',
                padding: '2px 6px',
                borderRadius: '4px'
              }}>
                <input type="checkbox" checked={columns.salePrice} onChange={() => toggleColumn('salePrice')} />
                Selling Rate (فروخت ریٹ)
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', cursor: 'pointer' }}>
                <input type="checkbox" checked={columns.stock} onChange={() => toggleColumn('stock')} />
                In Stock Quantity (اسٹاک)
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', cursor: 'pointer' }}>
                <input type="checkbox" checked={columns.specifications} onChange={() => toggleColumn('specifications')} />
                Specs / Details
              </label>
            </div>

            {/* Custom Download Action */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => generatePDF(columns)}
                disabled={catalogProducts.length === 0}
                style={{
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: catalogProducts.length === 0 ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Download size={14} /> Download PDF with Selected Columns
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stats and Filter Header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <div className="stat-card">
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Active in Catalogue</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#d97706', marginTop: '4px' }}>
            {catalogProducts.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '4px' }}>
            Eligible for PDF export
          </div>
        </div>

        <div className="stat-card">
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Total Inventory Products</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>
            {products.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            All warehouse SKUs loaded
          </div>
        </div>

        <div className="stat-card">
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Catalogue Categories</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0284c7', marginTop: '4px' }}>
            {categories.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            Segments configured
          </div>
        </div>
      </div>

      {/* Filter and Search Bar with Batch Inclusions */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: '16px',
        marginBottom: '20px',
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', gap: '12px', flex: '1 1 340px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 220px' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search product name, brand, code (e.g. ST Power, Total, 157)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              padding: '9px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
              outline: 'none',
              backgroundColor: '#fff',
            }}
          >
            <option value="">All Categories ({categories.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Batch inclusion buttons & count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
            <b>{catalogProducts.length}</b> of <b>{filteredProducts.length}</b> items in PDF
          </div>

          <button
            type="button"
            onClick={() => handleSelectAllForCatalog(true)}
            style={{
              backgroundColor: '#f0fdf4',
              color: '#15803d',
              border: '1px solid #86efac',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
            title="Mark all filtered products as Included in catalogue"
          >
            ✓ Select All ({filteredProducts.length})
          </button>

          <button
            type="button"
            onClick={() => handleSelectAllForCatalog(false)}
            style={{
              backgroundColor: '#fef2f2',
              color: '#b91c1c',
              border: '1px solid #fca5a5',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
            title="Exclude all filtered products from catalogue"
          >
            ✕ Deselect All
          </button>
        </div>
      </div>

      {/* Catalogue Table */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                <th style={{ padding: '12px 16px' }}>In Catalogue</th>
                <th style={{ padding: '12px 16px' }}>SKU</th>
                <th style={{ padding: '12px 16px' }}>Product Name</th>
                <th style={{ padding: '12px 16px' }}>Brand</th>
                <th style={{ padding: '12px 16px' }}>Category</th>
                <th style={{ padding: '12px 16px' }}>Packaging & Units</th>
                {columns.stock && (
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>In Stock</th>
                )}
                {columns.purchasePrice && (
                  <th style={{ padding: '12px 16px', textAlign: 'right', backgroundColor: '#1e293b' }}>
                    Purchase Rate (خرید)
                  </th>
                )}
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Selling Price (فروخت)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.purchasePrice && columns.stock ? 9 : columns.purchasePrice || columns.stock ? 8 : 7} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    Loading products for catalogue...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={columns.purchasePrice && columns.stock ? 9 : columns.purchasePrice || columns.stock ? 8 : 7} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    No matching products found. (Try searching brand, code, or name).
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: p.showInCatalog ? '#ffffff' : '#f8fafc',
                      opacity: p.showInCatalog ? 1 : 0.65,
                    }}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        onClick={() => handleToggleCatalog(p.id, p.showInCatalog)}
                        style={{
                          backgroundColor: p.showInCatalog ? '#dcfce7' : '#f1f5f9',
                          color: p.showInCatalog ? '#16a34a' : '#64748b',
                          border: p.showInCatalog ? '1px solid #86efac' : '1px solid #cbd5e1',
                          borderRadius: '20px',
                          padding: '4px 12px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        {p.showInCatalog ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                        {p.showInCatalog ? 'Included' : 'Excluded'}
                      </button>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#475569' }}>
                      {p.sku}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 800, color: '#0f172a' }}>
                      {p.name}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#334155', fontWeight: 600 }}>
                      {p.brand}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ backgroundColor: '#f1f5f9', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>
                        {p.category?.name || 'General'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>
                      {p.primaryUnit && Number(p.conversionFactor) > 1 ? (
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>
                          1 {p.primaryUnit.name} = {p.conversionFactor} {p.unit?.symbol || 'Pcs'}
                        </span>
                      ) : (
                        <span>{p.unit?.name || 'Unit'} ({p.unit?.symbol || ''})</span>
                      )}
                    </td>
                    {columns.stock && (
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>
                        {Number(p.currentStock || 0)} <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.unit?.symbol || ''}</span>
                      </td>
                    )}
                    {columns.purchasePrice && (
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: '#059669', backgroundColor: '#f0fdf4' }}>
                        Rs. {Number(p.purchasePrice || 0).toLocaleString()}
                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 400 }}> /{p.unit?.symbol || ''}</span>
                      </td>
                    )}
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: '#d97706' }}>
                      Rs. {Number(p.salePrice || 0).toLocaleString()}
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 400 }}> /{p.unit?.symbol || ''}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
