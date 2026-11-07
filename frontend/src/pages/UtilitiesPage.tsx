import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import api from '../services/api';
import {
  Wrench,
  Upload,
  Barcode,
  Layers,
  Users,
  FileCode,
  Download,
  ShieldCheck,
  CalendarCheck,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Printer,
  Save,
  ArrowRight,
  FileSpreadsheet,
  FileText,
  Table
} from 'lucide-react';

export const UtilitiesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'IMPORT_ITEMS' | 'BARCODE' | 'BULK_UPDATE' | 'IMPORT_PARTIES' | 'TALLY' | 'EXPORT_ITEMS' | 'VERIFY_DATA' | 'CLOSE_YEAR'
  >('IMPORT_ITEMS');

  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // File Upload and Preview States
  const productFileRef = useRef<HTMLInputElement>(null);
  const partyFileRef = useRef<HTMLInputElement>(null);

  const [parsedItems, setParsedItems] = useState<any[]>([]);
  const [productFileName, setProductFileName] = useState('');

  const [partyType, setPartyType] = useState<'CUSTOMER' | 'SUPPLIER'>('CUSTOMER');
  const [parsedParties, setParsedParties] = useState<any[]>([]);
  const [partyFileName, setPartyFileName] = useState('');

  // Barcode Generator State
  const [barcodePrefix, setBarcodePrefix] = useState('ROT-OIL-');
  const [barcodeCount, setBarcodeCount] = useState(6);
  const [generatedBarcodes, setGeneratedBarcodes] = useState<string[]>([]);

  // Bulk Update State
  const [rateAdjustmentPercent, setRateAdjustmentPercent] = useState<number | string>(0);

  // Verify Data State
  const [verifyResult, setVerifyResult] = useState<any>(null);

  // Close Financial Year State
  const [fiscalYearTitle, setFiscalYearTitle] = useState(`FY-${new Date().getFullYear()}-${new Date().getFullYear() + 1}`);

  // -------------------------------------------------------------
  // EXCEL TEMPLATE DOWNLOAD HANDLERS
  // -------------------------------------------------------------
  const downloadProductTemplate = () => {
    const templateData = [
      {
        'SKU / Code *': 'TOTAL-9000-5W30-4L',
        'Product Name *': 'Total Quartz 9000 Future 5W-30 (4L Can)',
        'Brand *': 'TotalEnergies',
        'Purchase Price (Rs.) *': 7800,
        'Selling Price (Rs.) *': 8900,
        'Current Stock (Qty)': 50,
        'Minimum Alert Level': 5
      },
      {
        'SKU / Code *': 'SHELL-RIMULA-R4-15W40-4L',
        'Product Name *': 'Shell Rimula R4 X 15W-40 Heavy Duty (4L)',
        'Brand *': 'Shell',
        'Purchase Price (Rs.) *': 4200,
        'Selling Price (Rs.) *': 4900,
        'Current Stock (Qty)': 80,
        'Minimum Alert Level': 10
      },
      {
        'SKU / Code *': 'HAVOLINE-20W50-0.7L',
        'Product Name *': 'Caltex Havoline Super 4T 20W-50 Bike Oil (0.7L)',
        'Brand *': 'Caltex Havoline',
        'Purchase Price (Rs.) *': 950,
        'Selling Price (Rs.) *': 1150,
        'Current Stock (Qty)': 120,
        'Minimum Alert Level': 20
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    worksheet['!cols'] = [
      { wch: 26 }, // SKU
      { wch: 44 }, // Name
      { wch: 18 }, // Brand
      { wch: 22 }, // Purchase Price
      { wch: 20 }, // Selling Price
      { wch: 20 }, // Stock
      { wch: 20 }, // Min Alert
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products_Import_Template');
    XLSX.writeFile(workbook, 'Rafiq_Auto_Products_Import_Template.xlsx');
  };

  const downloadPartyTemplate = (type: 'CUSTOMER' | 'SUPPLIER') => {
    const isCust = type === 'CUSTOMER';
    const templateData = isCust
      ? [
          {
            'Shop / Business Name *': 'Al-Madina Autos & Lube Bay',
            'Owner / Contact Person': 'Haji Muhammad Aslam',
            'Phone Number *': '0300-1234567',
            'Address / Location': 'Main Depalpur Road, Okara',
            'Opening Udhar Balance (Rs.)': 45000,
            'Credit Limit (Rs.)': 150000
          },
          {
            'Shop / Business Name *': 'Bismillah Auto Repair Workshop',
            'Owner / Contact Person': 'Ustad Tariq Mehmood',
            'Phone Number *': '0321-7654321',
            'Address / Location': 'Faisalabad Road Bypass, Okara',
            'Opening Udhar Balance (Rs.)': 18500,
            'Credit Limit (Rs.)': 75000
          }
        ]
      : [
          {
            'Company / Refinery Name *': 'Petrochem Oil Distributors Multan',
            'Contact Person': 'Shahid Iqbal (Sales Manager)',
            'Phone Number *': '0301-9876543',
            'Address / Location': 'Industrial Area Phase 2, Multan',
            'Opening Payable Balance (Rs.)': 125000
          },
          {
            'Company / Refinery Name *': 'National Base Oil Importers Lahore',
            'Contact Person': 'Zubair Butt',
            'Phone Number *': '0333-5554443',
            'Address / Location': 'Badami Bagh, Lahore',
            'Opening Payable Balance (Rs.)': 80000
          }
        ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    worksheet['!cols'] = [
      { wch: 34 },
      { wch: 28 },
      { wch: 18 },
      { wch: 32 },
      { wch: 28 },
      { wch: 22 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, isCust ? 'Customers_Template' : 'Suppliers_Template');
    XLSX.writeFile(workbook, `Rafiq_Auto_${isCust ? 'Customers' : 'Suppliers'}_Import_Template.xlsx`);
  };

  // -------------------------------------------------------------
  // EXCEL PARSING HANDLERS
  // -------------------------------------------------------------
  const handleProductFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProductFileName(file.name);
    setStatusMsg(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          setStatusMsg({ type: 'error', text: 'Excel sheet is empty. Please enter product rows.' });
          return;
        }

        // Map column variations safely
        const normalized = rawJson.map((row) => {
          const sku = (row['SKU / Code *'] || row['SKU'] || row['Code'] || row['sku'] || '').toString().trim();
          const name = (row['Product Name *'] || row['Product Name'] || row['Name'] || row['name'] || '').toString().trim();
          const brand = (row['Brand *'] || row['Brand'] || row['Company'] || row['brand'] || 'General').toString().trim();
          const purchasePrice = Number(row['Purchase Price (Rs.) *'] || row['Purchase Price'] || row['Cost Price'] || row['purchasePrice'] || 0);
          const salePrice = Number(row['Selling Price (Rs.) *'] || row['Selling Price'] || row['Sale Price'] || row['salePrice'] || 0);
          const currentStock = Number(row['Current Stock (Qty)'] || row['Current Stock'] || row['Stock'] || row['currentStock'] || 0);

          return { sku, name, brand, purchasePrice, salePrice, currentStock };
        }).filter(item => item.name || item.sku);

        setParsedItems(normalized);
        setStatusMsg({ type: 'success', text: `Loaded ${normalized.length} products from ${file.name}. Click "Import Products to POS" to save.` });
      } catch (err: any) {
        setStatusMsg({ type: 'error', text: 'Failed to read Excel file. Please use a valid .xlsx or .xls file.' });
      }
    };
    reader.readAsBinaryString(file);
  };

  const handlePartyFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPartyFileName(file.name);
    setStatusMsg(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          setStatusMsg({ type: 'error', text: 'Excel sheet is empty. Please enter party rows.' });
          return;
        }

        // Map column variations safely
        const normalized = rawJson.map((row) => {
          const name = (row['Shop / Business Name *'] || row['Company / Refinery Name *'] || row['Name'] || row['Shop Name'] || row['Company Name'] || '').toString().trim();
          const contactPerson = (row['Owner / Contact Person'] || row['Contact Person'] || row['Owner'] || '').toString().trim();
          const phone = (row['Phone Number *'] || row['Phone Number'] || row['Phone'] || row['Mobile'] || '').toString().trim();
          const address = (row['Address / Location'] || row['Address'] || row['City'] || '').toString().trim();
          const balance = Number(row['Opening Udhar Balance (Rs.)'] || row['Opening Payable Balance (Rs.)'] || row['Balance'] || row['balance'] || 0);
          const creditLimit = Number(row['Credit Limit (Rs.)'] || row['Credit Limit'] || 100000);

          return {
            shopName: name,
            companyName: name,
            ownerName: contactPerson || name,
            contactPerson,
            phone,
            address,
            balance,
            creditLimit
          };
        }).filter(p => p.shopName || p.phone);

        setParsedParties(normalized);
        setStatusMsg({ type: 'success', text: `Loaded ${normalized.length} ${partyType.toLowerCase()} parties from ${file.name}. Click "Import Parties to POS" to save.` });
      } catch (err: any) {
        setStatusMsg({ type: 'error', text: 'Failed to read Excel file. Please use a valid .xlsx or .xls file.' });
      }
    };
    reader.readAsBinaryString(file);
  };

  // 1. Handle Bulk Import Products into Backend
  const handleImportItems = async () => {
    if (!parsedItems || parsedItems.length === 0) {
      alert('Please upload an Excel (.xlsx) file first with product data.');
      return;
    }

    try {
      setLoading(true);
      setStatusMsg(null);
      const res = await api.post('/settings/utilities/import-items', { items: parsedItems });
      setStatusMsg({ type: 'success', text: res.data.message });
      setParsedItems([]);
      setProductFileName('');
      if (productFileRef.current) productFileRef.current.value = '';
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: e.response?.data?.message || 'Failed to import products to database.' });
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle Bulk Import Parties into Backend
  const handleImportParties = async () => {
    if (!parsedParties || parsedParties.length === 0) {
      alert('Please upload an Excel (.xlsx) file first with party data.');
      return;
    }

    try {
      setLoading(true);
      setStatusMsg(null);
      const res = await api.post('/settings/utilities/import-parties', { parties: parsedParties, partyType });
      setStatusMsg({ type: 'success', text: res.data.message });
      setParsedParties([]);
      setPartyFileName('');
      if (partyFileRef.current) partyFileRef.current.value = '';
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: e.response?.data?.message || 'Failed to import parties to database.' });
    } finally {
      setLoading(false);
    }
  };

  // 3. Export Active Stock directly as Excel (.xlsx)
  const handleExportStockExcel = async () => {
    try {
      setLoading(true);
      const res = await api.get('/products?limit=500');
      const items = res.data?.data || res.data?.products || [];

      if (!items || items.length === 0) {
        alert('No products found in inventory to export.');
        return;
      }

      const rows = items.map((p: any) => ({
        'SKU': p.sku,
        'Product Name': p.name,
        'Brand': p.brand,
        'Category': p.category?.name || 'Lube',
        'Unit': p.unit?.name || 'Liter',
        'Cost / Purchase Price (Rs.)': Number(p.purchasePrice || 0),
        'Sale Rate (Rs.)': Number(p.salePrice || 0),
        'Current Stock': Number(p.currentStock || 0),
        'Stock Valuation (Rs.)': Number(p.currentStock || 0) * Number(p.purchasePrice || 0)
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      worksheet['!cols'] = [
        { wch: 22 },
        { wch: 40 },
        { wch: 18 },
        { wch: 16 },
        { wch: 12 },
        { wch: 24 },
        { wch: 18 },
        { wch: 16 },
        { wch: 22 },
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Current_Stock_Inventory');
      XLSX.writeFile(workbook, `Rafiq_Oil_Traders_Stock_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err: any) {
      alert('Failed to export stock to Excel.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Handle Generate Barcodes
  const handleGenerateBarcodes = () => {
    const list: string[] = [];
    const count = Math.min(Math.max(barcodeCount, 1), 50);
    const prefix = barcodePrefix || 'ROT-';
    for (let i = 1; i <= count; i++) {
      const randomSuffix = Math.floor(100000 + Math.random() * 900000);
      list.push(`${prefix}${randomSuffix}`);
    }
    setGeneratedBarcodes(list);
    setStatusMsg({ type: 'success', text: `Generated ${list.length} barcode serials. Ready to print labels.` });
  };

  // 6. Handle Verify Data Integrity
  const handleVerifyData = async () => {
    try {
      setLoading(true);
      setStatusMsg(null);
      const res = await api.get('/settings/utilities/verify-data');
      setVerifyResult(res.data);
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: e.response?.data?.message || 'Verification failed' });
    } finally {
      setLoading(false);
    }
  };

  // 7. Handle Close Financial Year
  const handleCloseYear = async () => {
    const confirm = window.confirm(
      `WARNING: Are you sure you want to close financial year '${fiscalYearTitle}'?\nAll current ledger balances will be locked and rolled over as opening balances for the new fiscal year.`
    );
    if (!confirm) return;

    try {
      setLoading(true);
      setStatusMsg(null);
      const res = await api.post('/settings/utilities/close-financial-year', { fiscalYearTitle });
      setStatusMsg({ type: 'success', text: res.data.message });
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: e.response?.data?.message || 'Failed to close financial year' });
    } finally {
      setLoading(false);
    }
  };

  // Utilities Sidebar Menu Items (Exact Vyapaar Utilities)
  const utilityItems = [
    { id: 'IMPORT_ITEMS', label: 'Import Items', icon: Upload, desc: 'Bulk import products & lubricants via JSON/Excel' },
    { id: 'BARCODE', label: 'Barcode Generator', icon: Barcode, desc: 'Generate printable barcode labels for oil cans & cartons' },
    { id: 'BULK_UPDATE', label: 'Update Items In Bulk', icon: Layers, desc: 'Batch update prices & stock thresholds by %' },
    { id: 'IMPORT_PARTIES', label: 'Import Parties', icon: Users, desc: 'Import customer workshops & suppliers in bulk' },
    { id: 'TALLY', label: 'Exports To Tally', icon: FileCode, desc: 'Generate standardized Tally XML ledger file' },
    { id: 'EXPORT_ITEMS', label: 'Export Items', icon: Download, desc: 'Download entire stock catalog to CSV / JSON' },
    { id: 'VERIFY_DATA', label: 'Verify My Data', icon: ShieldCheck, desc: 'Automated database consistency & ledger audit' },
    { id: 'CLOSE_YEAR', label: 'Close Financial Year', icon: CalendarCheck, desc: 'Rollover balances into next fiscal year' },
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ backgroundColor: '#1e293b', color: '#38bdf8', padding: '6px', borderRadius: '8px' }}>
            <Wrench size={22} />
          </div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
            Utilities
          </h1>
          <span className="badge badge-info" style={{ fontWeight: 700, fontSize: '0.75rem' }}>
            Enterprise Tools
          </span>
        </div>
        <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0' }}>
          Bulk data migration, barcode printing, Tally exports, database integrity diagnostics, and financial year rollover.
        </p>
      </div>

      {statusMsg && (
        <div style={{
          backgroundColor: statusMsg.type === 'success' ? '#ecfdf5' : '#fef2f2',
          border: `1px solid ${statusMsg.type === 'success' ? '#a7f3d0' : '#fca5a5'}`,
          color: statusMsg.type === 'success' ? '#065f46' : '#991b1b',
          padding: '12px 18px',
          borderRadius: '10px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: 600
        }}>
          {statusMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {statusMsg.text}
        </div>
      )}

      {/* Vyapaar Split Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '290px 1fr',
        gap: '24px',
        alignItems: 'start'
      }}>
        {/* Left Dark Sidebar Panel */}
        <div style={{
          backgroundColor: '#171d2b',
          borderRadius: '14px',
          overflow: 'hidden',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.35)',
          border: '1px solid #242e42'
        }}>
          <div style={{ padding: '16px 18px', borderBottom: '1px solid #242e42', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Wrench size={18} color="#f59e0b" />
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.5px' }}>
              Utilities
            </span>
          </div>

          <div style={{ padding: '8px 0' }}>
            {utilityItems.map((item) => {
              const Icon = item.icon;
              const isSelected = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id as any); setStatusMsg(null); }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    backgroundColor: isSelected ? '#ffffff' : 'transparent',
                    color: isSelected ? '#0f172a' : '#cbd5e1',
                    border: 'none',
                    padding: '13px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    fontSize: '0.84rem',
                    fontWeight: isSelected ? 800 : 700,
                    letterSpacing: '0.6px',
                    borderLeft: isSelected ? '4px solid #38bdf8' : '4px solid transparent',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Icon size={16} color={isSelected ? '#0284c7' : '#94a3b8'} />
                    <span>{item.label}</span>
                  </div>
                  {isSelected && <ArrowRight size={14} color="#0f172a" />}
                </button>
              );
            })}
          </div>

          <div style={{ padding: '12px 18px', borderTop: '1px solid #242e42', backgroundColor: '#0f1522', fontSize: '0.72rem', color: '#64748b' }}>
            Vyapaar ERP Sync &bull; Automated Data Engine
          </div>
        </div>

        {/* Right Active Panel */}
        <div className="card" style={{ padding: '28px', backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          
          {/* 1. IMPORT ITEMS VIA EXCEL */}
          {activeTab === 'IMPORT_ITEMS' && (
            <div>
              <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '14px', marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileSpreadsheet color="#16a34a" size={24} /> Import Products & Lubricants (Excel / .xlsx)
                  </h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                    Download the official Excel template, fill in your product rates and stock, and upload.
                  </p>
                </div>
                <button
                  onClick={downloadProductTemplate}
                  className="btn btn-outline"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, borderColor: '#16a34a', color: '#16a34a' }}
                >
                  <Download size={16} /> Download Excel Template
                </button>
              </div>

              {/* Upload Box */}
              <div style={{
                border: '2px dashed #cbd5e1',
                borderRadius: '12px',
                padding: '28px',
                textAlign: 'center',
                backgroundColor: '#f8fafc',
                marginBottom: '20px'
              }}>
                <input
                  type="file"
                  ref={productFileRef}
                  accept=".xlsx, .xls"
                  onChange={handleProductFileChange}
                  style={{ display: 'none' }}
                />
                <FileSpreadsheet size={42} color="#16a34a" style={{ margin: '0 auto 10px auto', display: 'block' }} />
                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a', marginBottom: '4px' }}>
                  {productFileName ? `Selected: ${productFileName}` : 'Select your Excel Product Sheet (.xlsx)'}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '14px' }}>
                  Supports Microsoft Excel (.xlsx / .xls) with SKU, Name, Brand, Cost & Sale rates
                </div>
                <button
                  type="button"
                  onClick={() => productFileRef.current?.click()}
                  className="btn btn-outline"
                  style={{ fontWeight: 700, padding: '8px 18px' }}
                >
                  Choose Excel File
                </button>
              </div>

              {/* Preview Loaded Products */}
              {parsedItems.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>
                      Ready to Import: {parsedItems.length} Products Loaded
                    </div>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Previewing first 5 rows</span>
                  </div>
                  <div className="table-container" style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    <table className="data-table" style={{ fontSize: '0.82rem' }}>
                      <thead>
                        <tr>
                          <th>SKU</th>
                          <th>Product Name</th>
                          <th>Brand</th>
                          <th style={{ textAlign: 'right' }}>Cost Price</th>
                          <th style={{ textAlign: 'right' }}>Sale Price</th>
                          <th style={{ textAlign: 'right' }}>Initial Stock</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedItems.slice(0, 5).map((it, idx) => (
                          <tr key={idx}>
                            <td className="font-mono" style={{ fontWeight: 700, color: '#d97706' }}>{it.sku}</td>
                            <td style={{ fontWeight: 600 }}>{it.name}</td>
                            <td>{it.brand}</td>
                            <td style={{ textAlign: 'right' }}>Rs. {Number(it.purchasePrice).toLocaleString()}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700 }}>Rs. {Number(it.salePrice).toLocaleString()}</td>
                            <td style={{ textAlign: 'right' }}>{it.currentStock}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <button
                onClick={handleImportItems}
                disabled={loading || parsedItems.length === 0}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, padding: '12px 24px', backgroundColor: '#16a34a', borderColor: '#16a34a' }}
              >
                <Upload size={18} /> {loading ? 'Importing Products to POS Database...' : `Save & Import ${parsedItems.length} Products to Inventory`}
              </button>
            </div>
          )}

          {/* 2. BARCODE GENERATOR */}
          {activeTab === 'BARCODE' && (
            <div>
              <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '14px', marginBottom: '18px' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Barcode Label Generator</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Generate and print Code-128 sticker barcode labels for loose oil cans, bottles, and repackaged drums.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Barcode Prefix</label>
                  <input
                    type="text"
                    className="form-control"
                    value={barcodePrefix}
                    onChange={(e) => setBarcodePrefix(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Number of Labels</label>
                  <input
                    type="number"
                    className="form-control"
                    min="1"
                    max="50"
                    value={barcodeCount}
                    onChange={(e) => setBarcodeCount(Number(e.target.value) || 1)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
                <button
                  onClick={handleGenerateBarcodes}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                >
                  <Barcode size={16} /> Generate Barcodes
                </button>
                {generatedBarcodes.length > 0 && (
                  <button
                    onClick={() => window.print()}
                    className="btn btn-outline"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                  >
                    <Printer size={16} /> Print Barcode Sheet
                  </button>
                )}
              </div>

              {generatedBarcodes.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                  {generatedBarcodes.map((code, idx) => (
                    <div key={idx} style={{
                      border: '2px dashed #cbd5e1',
                      borderRadius: '10px',
                      padding: '14px',
                      textAlign: 'center',
                      backgroundColor: '#f8fafc'
                    }}>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                        Rafiq Auto & Oil
                      </div>
                      <div style={{
                        fontFamily: 'monospace',
                        letterSpacing: '3px',
                        fontSize: '1.25rem',
                        fontWeight: 900,
                        margin: '10px 0',
                        color: '#0f172a'
                      }}>
                        ||| | |||| | |||
                      </div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#d97706' }}>
                        {code}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. BULK UPDATE */}
          {activeTab === 'BULK_UPDATE' && (
            <div>
              <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '14px', marginBottom: '18px' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Update Items in Bulk</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Quickly apply uniform price changes across entire lubricant catalog due to refinery or import price changes.
                </p>
              </div>

              <div style={{ padding: '18px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Adjust All Selling Rates by Percentage (%):
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <input
                    type="number"
                    step="any"
                    className="form-control"
                    placeholder="e.g. 5 for +5% increase or -3 for decrease"
                    value={rateAdjustmentPercent}
                    onChange={(e) => setRateAdjustmentPercent(e.target.value)}
                    style={{ maxWidth: '240px' }}
                  />
                  <button
                    onClick={() => {
                      const numAdjust = parseFloat(String(rateAdjustmentPercent)) || 0;
                      if (!numAdjust || numAdjust === 0) {
                        alert('Please enter a valid percentage adjustment (e.g. +5 or -2)');
                        return;
                      }
                      const confirm = window.confirm(
                        `Are you sure you want to adjust ALL product selling prices by ${numAdjust > 0 ? `+${numAdjust}` : numAdjust}%?`
                      );
                      if (!confirm) return;
                      setLoading(true);
                      setStatusMsg(null);
                      api.post('/settings/utilities/bulk-update-items', { percentageAdjustment: numAdjust })
                        .then(res => setStatusMsg({ type: 'success', text: res.data.message }))
                        .catch(e => setStatusMsg({ type: 'error', text: e.response?.data?.message || 'Failed to bulk update product rates' }))
                        .finally(() => setLoading(false));
                    }}
                    disabled={loading}
                    className="btn btn-primary"
                    style={{ fontWeight: 700 }}
                  >
                    {loading ? 'Adjusting Rates...' : 'Apply Price Adjustment'}
                  </button>
                </div>
                <small style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '6px', display: 'block' }}>
                  Example: If fuel or wholesale prices rise by 5%, typing 5 will update all catalog items immediately.
                </small>
              </div>
            </div>
          )}

          {/* 4. IMPORT PARTIES VIA EXCEL */}
          {activeTab === 'IMPORT_PARTIES' && (
            <div>
              <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '14px', marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users color="#2563eb" size={24} /> Import Parties (Customers & Suppliers)
                  </h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                    Easily import workshops, auto shops, or lubricant suppliers from an Excel spreadsheet with opening balances.
                  </p>
                </div>
                <button
                  onClick={() => downloadPartyTemplate(partyType)}
                  className="btn btn-outline"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, borderColor: '#2563eb', color: '#2563eb' }}
                >
                  <Download size={16} /> Download {partyType === 'CUSTOMER' ? 'Customer' : 'Supplier'} Template (.xlsx)
                </button>
              </div>

              <div style={{ marginBottom: '16px', backgroundColor: '#f1f5f9', padding: '12px 16px', borderRadius: '10px' }}>
                <label className="form-label" style={{ fontWeight: 800, marginBottom: '6px' }}>Party Classification:</label>
                <div style={{ display: 'flex', gap: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 700, color: partyType === 'CUSTOMER' ? '#2563eb' : '#475569' }}>
                    <input
                      type="radio"
                      name="partyType"
                      checked={partyType === 'CUSTOMER'}
                      onChange={() => {
                        setPartyType('CUSTOMER');
                        setParsedParties([]);
                        setPartyFileName('');
                      }}
                    />
                    Customers / Auto Workshops (Debtors)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 700, color: partyType === 'SUPPLIER' ? '#2563eb' : '#475569' }}>
                    <input
                      type="radio"
                      name="partyType"
                      checked={partyType === 'SUPPLIER'}
                      onChange={() => {
                        setPartyType('SUPPLIER');
                        setParsedParties([]);
                        setPartyFileName('');
                      }}
                    />
                    Suppliers / Oil Refineries (Creditors)
                  </label>
                </div>
              </div>

              {/* Upload Box */}
              <div style={{
                border: '2px dashed #cbd5e1',
                borderRadius: '12px',
                padding: '28px',
                textAlign: 'center',
                backgroundColor: '#f8fafc',
                marginBottom: '20px'
              }}>
                <input
                  type="file"
                  ref={partyFileRef}
                  accept=".xlsx, .xls"
                  onChange={handlePartyFileChange}
                  style={{ display: 'none' }}
                />
                <FileSpreadsheet size={42} color="#2563eb" style={{ margin: '0 auto 10px auto', display: 'block' }} />
                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a', marginBottom: '4px' }}>
                  {partyFileName ? `Selected: ${partyFileName}` : `Select your ${partyType === 'CUSTOMER' ? 'Customer' : 'Supplier'} Excel Sheet (.xlsx)`}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '14px' }}>
                  Reads Shop/Company Name, Contact Person, Phone, Address, and Opening Balance directly from Excel
                </div>
                <button
                  type="button"
                  onClick={() => partyFileRef.current?.click()}
                  className="btn btn-outline"
                  style={{ fontWeight: 700, padding: '8px 18px' }}
                >
                  Choose Excel File
                </button>
              </div>

              {/* Preview Loaded Parties */}
              {parsedParties.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>
                      Ready to Import: {parsedParties.length} {partyType.toLowerCase()}s Loaded
                    </div>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Previewing first 5 rows</span>
                  </div>
                  <div className="table-container" style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    <table className="data-table" style={{ fontSize: '0.82rem' }}>
                      <thead>
                        <tr>
                          <th>Shop / Company Name</th>
                          <th>Contact Person</th>
                          <th>Phone</th>
                          <th>Address</th>
                          <th style={{ textAlign: 'right' }}>Opening Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedParties.slice(0, 5).map((p, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 700, color: '#0f172a' }}>{p.shopName || p.companyName}</td>
                            <td>{p.contactPerson || p.ownerName}</td>
                            <td className="font-mono">{p.phone}</td>
                            <td>{p.address}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>Rs. {Number(p.balance || 0).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <button
                onClick={handleImportParties}
                disabled={loading || parsedParties.length === 0}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, padding: '12px 24px', backgroundColor: '#2563eb', borderColor: '#2563eb' }}
              >
                <Users size={18} /> {loading ? 'Saving Parties to POS Database...' : `Save & Import ${parsedParties.length} ${partyType === 'CUSTOMER' ? 'Customers' : 'Suppliers'}`}
              </button>
            </div>
          )}

          {/* 5. TALLY EXPORT */}
          {activeTab === 'TALLY' && (
            <div>
              <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '14px', marginBottom: '18px' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Exports to Tally (XML Envelope)</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Generate certified XML export file compatible with Tally ERP 9 / TallyPrime for your external accountant.
                </p>
              </div>

              <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  <FileCode size={36} color="#d97706" />
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>TallyPrime Ledger & Voucher Sync</h4>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 14px 0', lineHeight: 1.5 }}>
                      Includes all Sundry Debtors ledgers, opening balances, and sales vouchers ready for direct import into Tally.
                    </p>
                    <button
                      onClick={() => window.open(`${api.defaults.baseURL}/settings/utilities/export-tally`, '_blank')}
                      className="btn btn-primary"
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}
                    >
                      <Download size={16} /> Download Tally XML File
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 6. EXPORT ITEMS (EXCEL & PDF) */}
          {activeTab === 'EXPORT_ITEMS' && (
            <div>
              <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '14px', marginBottom: '18px' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileSpreadsheet color="#16a34a" size={24} /> Export Inventory & Stock (Excel .xlsx & PDF)
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Download your active inventory with real-time stock balances, purchase rates, and retail prices in user-friendly Excel sheets.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                <button
                  onClick={handleExportStockExcel}
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, backgroundColor: '#16a34a', borderColor: '#16a34a' }}
                >
                  <FileSpreadsheet size={18} /> {loading ? 'Generating Excel...' : 'Download Inventory in Excel (.xlsx)'}
                </button>
                <button
                  onClick={() => window.open('/catalogue', '_blank')}
                  className="btn btn-outline"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}
                >
                  <Printer size={18} /> Generate PDF Stock Catalog
                </button>
              </div>
            </div>
          )}

          {/* 7. VERIFY DATA */}
          {activeTab === 'VERIFY_DATA' && (
            <div>
              <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '14px', marginBottom: '18px' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Verify My Data (Database Integrity Check)</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Vyapaar diagnostics tool that audits stock discrepancies, negative balances, and orphaned ledgers.
                </p>
              </div>

              <button
                onClick={handleVerifyData}
                disabled={loading}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, marginBottom: '20px' }}
              >
                <ShieldCheck size={18} /> {loading ? 'Scanning Database...' : 'Run Integrity Diagnostic Scan'}
              </button>

              {verifyResult && (
                <div style={{
                  padding: '20px',
                  backgroundColor: verifyResult.status === 'HEALTHY' ? '#ecfdf5' : '#fffbeb',
                  border: `1px solid ${verifyResult.status === 'HEALTHY' ? '#a7f3d0' : '#fde68a'}`,
                  borderRadius: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: verifyResult.status === 'HEALTHY' ? '#065f46' : '#92400e' }}>
                      Diagnostic Result: {verifyResult.healthScore}
                    </div>
                    <span className={`badge ${verifyResult.status === 'HEALTHY' ? 'badge-success' : 'badge-warning'}`}>
                      {verifyResult.status}
                    </span>
                  </div>

                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.875rem', color: '#334155', lineHeight: 1.6 }}>
                    {verifyResult.details.map((msg: string, i: number) => (
                      <li key={i}>{msg}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* 8. CLOSE FINANCIAL YEAR */}
          {activeTab === 'CLOSE_YEAR' && (
            <div>
              <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '14px', marginBottom: '18px' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Close Financial Year</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Fiscal year rollover tool that archives current fiscal period and establishes new opening balances.
                </p>
              </div>

              <div style={{ padding: '20px', backgroundColor: '#fef2f2', borderRadius: '12px', border: '1px solid #fecaca', marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', fontWeight: 800, color: '#991b1b' }}>
                  Caution: Fiscal Rollover Policy
                </h4>
                <p style={{ margin: '0 0 14px 0', fontSize: '0.85rem', color: '#7f1d1d', lineHeight: 1.5 }}>
                  This will convert all current outstanding customer receivables and supplier payables into official <b>Opening Balances</b> for the new year.
                </p>

                <div className="form-group" style={{ maxWidth: '300px', marginBottom: '14px' }}>
                  <label className="form-label" style={{ fontWeight: 700, color: '#7f1d1d' }}>Financial Year Title:</label>
                  <input
                    type="text"
                    className="form-control"
                    value={fiscalYearTitle}
                    onChange={(e) => setFiscalYearTitle(e.target.value)}
                  />
                </div>

                <button
                  onClick={handleCloseYear}
                  disabled={loading}
                  className="btn btn-danger"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}
                >
                  <CalendarCheck size={18} /> {loading ? 'Closing Year...' : 'Confirm & Close Financial Year'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
