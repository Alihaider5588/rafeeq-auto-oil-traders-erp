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
  Droplet
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  sku: string;
  brand: string;
  category: { id: string; name: string };
  unit: { name: string; symbol: string };
  primaryUnit?: { name: string; symbol: string } | null;
  conversionFactor: number;
  salePrice: number;
  description?: string | null;
  specifications?: string | null;
  imageUrl?: string | null;
  showInCatalog: boolean;
  isActive: boolean;
}

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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes, setRes] = await Promise.all([
        api.get('/products?limit=200'),
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

  const filteredProducts = products.filter((p) => {
    if (!p.isActive) return false;
    if (selectedCategory && p.category.id !== selectedCategory) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const catalogProducts = filteredProducts.filter((p) => p.showInCatalog);

  // Generate Professional Multi-page PDF
  const generatePDF = (withPrices: boolean) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
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
    doc.text(
      withPrices
        ? 'OFFICIAL WHOLESALE PRODUCT CATALOGUE (WITH RATES)'
        : 'OFFICIAL PRODUCT SPECIFICATION CATALOGUE (NO PRICES)',
      14,
      27
    );

    // Date stamp
    doc.setFontSize(9);
    doc.setTextColor(203, 213, 225);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, pageWidth - 45, 13);

    // 2. Prepare Table Data
    const headers = withPrices
      ? [['#', 'SKU', 'Product Name', 'Brand', 'Category', 'Packaging Spec', 'Selling Rate (PKR)']]
      : [['#', 'SKU', 'Product Name', 'Brand', 'Category', 'Packaging Spec', 'Technical Specs']];

    const bodyData = catalogProducts.map((p, idx) => {
      const packSpec =
        p.primaryUnit && Number(p.conversionFactor) > 1
          ? `1 ${p.primaryUnit.name} = ${p.conversionFactor} ${p.unit.symbol}`
          : `${p.unit.name}`;

      if (withPrices) {
        return [
          (idx + 1).toString(),
          p.sku,
          p.name,
          p.brand,
          p.category.name,
          packSpec,
          `Rs. ${Number(p.salePrice).toLocaleString()}/${p.unit.symbol}`,
        ];
      } else {
        return [
          (idx + 1).toString(),
          p.sku,
          p.name,
          p.brand,
          p.category.name,
          packSpec,
          p.specifications || p.description || 'Standard automotive lubricant',
        ];
      }
    });

    // 3. AutoTable rendering
    autoTable(doc, {
      head: headers,
      body: bodyData,
      startY: 36,
      margin: { left: 14, right: 14, bottom: 20 },
      theme: 'grid',
      headStyles: {
        fillColor: [217, 119, 6], // Amber brand header
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: [15, 23, 42],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      didDrawPage: (data) => {
        // Footer on each page
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

    // Output PDF
    const filename = withPrices
      ? `Rafiq_Oil_Traders_Catalogue_With_Rates_${Date.now()}.pdf`
      : `Rafiq_Oil_Traders_Catalogue_No_Prices_${Date.now()}.pdf`;

    doc.save(filename);
  };

  return (
    <div>
      {/* Module Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
            Product Catalogue & PDF Publishing
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
            Curate products for retail catalogues, configure branding, and export publication-ready multi-page PDFs.
          </p>
        </div>

        {/* Dual Export Actions */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => generatePDF(true)}
            disabled={catalogProducts.length === 0}
            style={{
              backgroundColor: '#d97706',
              color: '#ffffff',
              border: 'none',
              padding: '10px 18px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: catalogProducts.length === 0 ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 6px rgba(217,119,6,0.3)',
            }}
          >
            <Download size={16} /> Export PDF WITH Selling Prices
          </button>

          <button
            onClick={() => generatePDF(false)}
            disabled={catalogProducts.length === 0}
            style={{
              backgroundColor: '#0f172a',
              color: '#ffffff',
              border: 'none',
              padding: '10px 18px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: catalogProducts.length === 0 ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Printer size={16} /> Export PDF WITHOUT Prices (Spec Only)
          </button>
        </div>
      </div>

      {/* Stats and Filter Header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
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
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Total Warehouse Products</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>
            {products.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            Active inventory SKU count
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

      {/* Filter and Search Bar */}
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
        <div style={{ display: 'flex', gap: '12px', flex: '1 1 300px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 200px' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search product name or SKU..."
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

        <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
          {catalogProducts.length} of {filteredProducts.length} items marked for PDF inclusion
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
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
              <th style={{ padding: '12px 16px' }}>In Catalogue</th>
              <th style={{ padding: '12px 16px' }}>SKU</th>
              <th style={{ padding: '12px 16px' }}>Product Name</th>
              <th style={{ padding: '12px 16px' }}>Brand</th>
              <th style={{ padding: '12px 16px' }}>Category</th>
              <th style={{ padding: '12px 16px' }}>Packaging & Units</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Selling Price</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  Loading products for catalogue...
                </td>
              </tr>
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  No matching products found.
                </td>
              </tr>
            ) : (
              filteredProducts.map((p, idx) => (
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
                      {p.category.name}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#64748b' }}>
                    {p.primaryUnit && Number(p.conversionFactor) > 1 ? (
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>
                        1 {p.primaryUnit.name} = {p.conversionFactor} {p.unit.symbol}
                      </span>
                    ) : (
                      <span>{p.unit.name} ({p.unit.symbol})</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: '#d97706' }}>
                    Rs. {Number(p.salePrice).toLocaleString()}
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 400 }}> /{p.unit.symbol}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
