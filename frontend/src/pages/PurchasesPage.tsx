import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Supplier, Product } from '../types';
import { ShoppingBag, Plus, Calendar, Trash2, AlertCircle, CheckCircle, Building2, Eye, Printer, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const PurchasesPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const canDeletePurchase = isAdmin || Boolean(user?.permissions?.includes('action:delete_purchase'));
  const [purchases, setPurchases] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<any | null>(null);

  // New purchase state
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [items, setItems] = useState<Array<{
    productId: string;
    quantity: number;
    unitCost: number;
    unitType: 'PRIMARY' | 'SECONDARY';
  }>>([
    { productId: '', quantity: 1, unitCost: 0, unitType: 'PRIMARY' },
  ]);
  const [paidAmount, setPaidAmount] = useState('0');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [operationError, setOperationError] = useState('');
  const [operationSuccess, setOperationSuccess] = useState('');

  const [categories, setCategories] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [creatingSupplier, setCreatingSupplier] = useState(false);
  const [quickSuppForm, setQuickSuppForm] = useState({
    companyName: '',
    contactPerson: '',
    phone: '',
    address: '',
  });

  // Quick Add Product Modal
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [targetItemIndex, setTargetItemIndex] = useState<number>(0);
  const [quickProductForm, setQuickProductForm] = useState({
    name: '',
    sku: '',
    categoryId: '',
    brand: '',
    unitId: '',
    purchasePrice: '',
    salePrice: '',
    wholesalePrice: '',
    minimumStockLevel: '5',
  });

  useEffect(() => {
    loadPurchases();
    loadMeta();
  }, []);

  const loadPurchases = async () => {
    try {
      setLoading(true);
      const res = await api.get('/purchases');
      setPurchases(res.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadMeta = async () => {
    try {
      const now = Date.now();
      const CACHE_TTL = 15 * 60 * 1000;
      let cachedProds: any[] | null = null;
      const cachedProdStr = sessionStorage.getItem('rot_cached_products');
      if (cachedProdStr) {
        try {
          const parsed = JSON.parse(cachedProdStr);
          if (now - parsed.timestamp < CACHE_TTL && Array.isArray(parsed.data) && parsed.data.length > 0) {
            cachedProds = parsed.data;
            setProducts(parsed.data);
          }
        } catch (e) {}
      }

      const [sRes, pRes, cRes, uRes] = await Promise.allSettled([
        api.get('/partners/suppliers'),
        cachedProds ? Promise.resolve(null) : api.get('/products?limit=1000'),
        api.get('/products/categories'),
        api.get('/products/units'),
      ]);
      if (sRes.status === 'fulfilled' && sRes.value?.data) {
        setSuppliers(sRes.value.data.suppliers || sRes.value.data.data || []);
      }
      if (pRes.status === 'fulfilled' && pRes.value?.data) {
        const pData = pRes.value.data.data || pRes.value.data.products || [];
        setProducts(pData);
        try {
          sessionStorage.setItem('rot_cached_products', JSON.stringify({ data: pData, timestamp: now }));
        } catch (e) {}
      }
      if (cRes.status === 'fulfilled' && cRes.value?.data) {
        setCategories(cRes.value.data.categories || cRes.value.data.data || []);
      }
      if (uRes.status === 'fulfilled' && uRes.value?.data) {
        setUnits(uRes.value.data.units || uRes.value.data.data || []);
      }
    } catch (e) {
      console.error('loadMeta error:', e);
    }
  };

  const handleQuickCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingSupplier(true);
    setOperationError('');
    try {
      const res = await api.post('/partners/suppliers', {
        ...quickSuppForm,
        openingBalance: 0,
      });
      if (res.data?.success && res.data.supplier) {
        const created = res.data.supplier;
        setSuppliers((prev) => [created, ...prev]);
        setSupplierId(created.id);
        setShowAddSupplierModal(false);
        setQuickSuppForm({ companyName: '', contactPerson: '', phone: '', address: '' });
        setOperationSuccess(`Supplier "${created.companyName}" kamyabi se shamil ho gaya aur automatically select ho chuka hai!`);
      }
    } catch (err: any) {
      setOperationError(err.response?.data?.message || 'Supplier shamil nahi ho saka.');
    } finally {
      setCreatingSupplier(false);
    }
  };

  const handleQuickCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickProductForm.name.trim() || !quickProductForm.categoryId || !quickProductForm.unitId) {
      setOperationError('Product Name, Category, aur Base Unit select karna lazmi hai.');
      return;
    }

    setCreatingProduct(true);
    setOperationError('');
    try {
      const generatedSku = quickProductForm.sku.trim() || `PRD-${Date.now().toString().slice(-6)}`;
      const pCost = parseFloat(quickProductForm.purchasePrice || '0');
      const pSale = parseFloat(quickProductForm.salePrice || quickProductForm.purchasePrice || '0');
      const pWholesale = parseFloat(quickProductForm.wholesalePrice || '0');

      const res = await api.post('/products', {
        name: quickProductForm.name.trim(),
        sku: generatedSku,
        categoryId: quickProductForm.categoryId,
        brand: quickProductForm.brand.trim() || 'General',
        unitId: quickProductForm.unitId,
        purchasePrice: pCost,
        salePrice: pSale,
        wholesalePrice: pWholesale,
        minimumStockLevel: parseFloat(quickProductForm.minimumStockLevel || '5'),
        openingStock: 0,
        showOnWebsite: true,
        showInCatalog: true,
        showPublicPrice: true,
        isActive: true,
      });

      if (res.data?.success && res.data.product) {
        const createdProd = res.data.product;
        setProducts((prev) => [createdProd, ...prev]);

        // Auto-select in current purchase row
        const updated = [...items];
        const pConv = Number(createdProd.conversionFactor) || 1;
        const pHasPrimary = (!!createdProd.primaryUnit || !!createdProd.primaryUnitId) && pConv > 1;
        const defaultUT: 'PRIMARY' | 'SECONDARY' = pHasPrimary ? 'PRIMARY' : 'SECONDARY';
        const defaultCost = defaultUT === 'PRIMARY' ? pCost * pConv : pCost;
        if (updated[targetItemIndex]) {
          updated[targetItemIndex].productId = createdProd.id;
          updated[targetItemIndex].unitCost = defaultCost;
          updated[targetItemIndex].unitType = defaultUT;
        } else {
          updated.push({ productId: createdProd.id, quantity: 1, unitCost: defaultCost, unitType: defaultUT });
        }
        setItems(updated);

        setShowAddProductModal(false);
        setQuickProductForm({
          name: '',
          sku: '',
          categoryId: categories[0]?.id || '',
          brand: '',
          unitId: units[0]?.id || '',
          purchasePrice: '',
          salePrice: '',
          wholesalePrice: '',
          minimumStockLevel: '5',
        });
        setOperationSuccess(`Naya Product "${createdProd.name}" kamyabi se shamil ho gaya aur automatically purchase row mein select ho chuka hai!`);
      }
    } catch (err: any) {
      setOperationError(err.response?.data?.message || 'Product shamil nahi ho saka.');
    } finally {
      setCreatingProduct(false);
    }
  };

  const addItemRow = () => {
    setItems([...items, { productId: '', quantity: 1, unitCost: 0, unitType: 'PRIMARY' }]);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...items];
    if (field === 'productId') {
      const prod = products.find((p) => p.id === value);
      updated[index].productId = value;
      if (prod) {
        const conv = Number(prod.conversionFactor) || 1;
        const hasPrimary = (!!prod.primaryUnit || !!prod.primaryUnitId) && conv > 1;
        if (hasPrimary) {
          updated[index].unitType = 'PRIMARY';
          updated[index].unitCost = Math.round(Number(prod.purchasePrice) * conv * 100) / 100;
        } else {
          updated[index].unitType = 'SECONDARY';
          updated[index].unitCost = Number(prod.purchasePrice || 0);
        }
      }
    } else if (field === 'unitType') {
      const prod = products.find((p) => p.id === updated[index].productId);
      const conv = Number(prod?.conversionFactor) || 1;
      const oldUnitType = updated[index].unitType;
      updated[index].unitType = value;
      if (prod && conv > 1) {
        if (value === 'PRIMARY' && oldUnitType === 'SECONDARY') {
          updated[index].unitCost = Math.round(Number(updated[index].unitCost) * conv * 100) / 100;
        } else if (value === 'SECONDARY' && oldUnitType === 'PRIMARY') {
          updated[index].unitCost = Math.round((Number(updated[index].unitCost) / conv) * 100) / 100;
        }
      }
    } else {
      (updated[index] as any)[field] = value;
    }
    setItems(updated);
  };

  const removeItemRow = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const totalBill = items.reduce((sum, it) => sum + (it.quantity * it.unitCost || 0), 0);

  const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || !invoiceNumber) {
      setOperationError('Supplier aur Invoice Number select karna lazmi hai.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        supplierId,
        invoiceNumber,
        items: items.map((it) => ({
          productId: it.productId,
          quantity: Number(it.quantity),
          unitCost: Number(it.unitCost),
          unitType: it.unitType || 'PRIMARY',
        })),
        paidAmount: parseFloat(paidAmount || '0'),
        notes,
      };

      const res = await api.post('/purchases', payload);
      if (res.data.success) {
        setShowModal(false);
        setInvoiceNumber('');
        setItems([{ productId: '', quantity: 1, unitCost: 0, unitType: 'PRIMARY' }]);
        setPaidAmount('0');
        setOperationSuccess(`Purchase invoice #${invoiceNumber} successfully record ho gayi aur stock barh gaya.`);
        setOperationError('');
        loadPurchases();
      }
    } catch (err: any) {
      setOperationError(err.response?.data?.message || 'Failed to save purchase');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePurchase = async (purchaseId: string, invNumber: string) => {
    const confirmed = window.confirm(
      `⚠️ KYA AAP IS PURCHASE INVOICE KO DATABASE AUR POS SE PERMANENTLY DELETE KARNA CHAHTE HAIN?\n\nBill: #${invNumber}\n\nIs se purchase ka stock wapis kam ho jaye ga aur supplier ledger se entry hamesha ke liye delete ho jaye gi.`
    );
    if (!confirmed) return;

    try {
      setLoading(true);
      const res = await api.delete(`/purchases/${purchaseId}`);
      setOperationSuccess(res.data.message || `Invoice #${invNumber} permanently delete ho gayi aur stock/ledgers restore ho gaye.`);
      setOperationError('');
      loadPurchases();
    } catch (err: any) {
      setOperationError(err.response?.data?.message || 'Failed to delete purchase');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Purchase & Inward Goods (Maal Inward)</h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Record oil shipments received from refineries & distributors (automatically increases stock)
          </p>
        </div>
        <button
          onClick={() => {
            if (suppliers.length === 0 || products.length === 0) {
              loadMeta();
            }
            setShowModal(true);
          }}
          className="btn btn-primary"
        >
          <Plus size={18} /> New Purchase Entry
        </button>
      </div>

      {/* Operation Feedback Alerts */}
      {operationError && (
        <div style={{
          backgroundColor: '#fee2e2',
          border: '2px solid #ef4444',
          borderRadius: '10px',
          padding: '14px 18px',
          marginBottom: '20px',
          color: '#991b1b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 800 }}>
            <AlertCircle size={22} color="#dc2626" />
            <span>⚠️ Operation Nakaam Raha: {operationError}</span>
          </div>
          <button onClick={() => setOperationError('')} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#991b1b' }}>×</button>
        </div>
      )}

      {operationSuccess && (
        <div style={{
          backgroundColor: '#dcfce7',
          border: '1.5px solid #86efac',
          borderRadius: '10px',
          padding: '14px 18px',
          marginBottom: '20px',
          color: '#15803d',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700 }}>
            <CheckCircle size={20} color="#16a34a" />
            <span>✓ {operationSuccess}</span>
          </div>
          <button onClick={() => setOperationSuccess('')} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#15803d' }}>×</button>
        </div>
      )}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Date</th>
              <th>Supplier / Company</th>
              <th style={{ textAlign: 'right' }}>Total Cost</th>
              <th style={{ textAlign: 'right' }}>Paid</th>
              <th style={{ textAlign: 'right' }}>Payable Balance</th>
              <th>Recorded By</th>
              <th style={{ textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  Loading purchases...
                </td>
              </tr>
            ) : purchases.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                  No purchases recorded yet.
                </td>
              </tr>
            ) : (
              purchases.map((p) => (
                <tr key={p.id}>
                  <td className="font-mono" style={{ fontWeight: 700 }}>
                    <button
                      type="button"
                      onClick={() => setSelectedPurchase(p)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        color: '#d97706',
                        fontWeight: 800,
                        textDecoration: 'underline',
                        fontFamily: 'inherit',
                        fontSize: '0.95rem'
                      }}
                      title="Click to view full purchase voucher & items / تفصیل دیکھیں"
                    >
                      {p.invoiceNumber}
                    </button>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{new Date(p.purchaseDate).toLocaleDateString()}</div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                      {new Date(p.purchaseDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </div>
                  </td>
                  <td style={{ fontWeight: 600 }}>{p.supplier?.companyName}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>
                    Rs. {Number(p.netAmount).toLocaleString()}
                  </td>
                  <td style={{ textAlign: 'right', color: '#059669', fontWeight: 700 }}>
                    Rs. {Number(p.paidAmount).toLocaleString()}
                  </td>
                  <td style={{ textAlign: 'right', color: '#dc2626', fontWeight: 700 }}>
                    Rs. {Number(p.remainingAmount).toLocaleString()}
                  </td>
                  <td>{p.createdBy?.fullName}</td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedPurchase(p)}
                        className="btn btn-sm btn-outline"
                        style={{
                          padding: '4px 8px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: '#0284c7',
                          borderColor: '#bae6fd',
                          backgroundColor: '#f0f9ff'
                        }}
                        title="View Full Purchase Invoice / مال کی تفصیل"
                      >
                        <Eye size={13} /> View
                      </button>
                      {canDeletePurchase && (
                        <button
                          onClick={() => handleDeletePurchase(p.id, p.invoiceNumber)}
                          className="btn btn-sm"
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#fee2e2',
                            color: '#b91c1c',
                            border: '1px solid #fca5a5',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title="Permanently Delete Purchase from DB & POS"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* New Purchase Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '860px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                  Record Supplier Purchase / Maal Inward (مال کی وصولی)
                </h2>
                <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  Enter company invoice in Cartons or Loose Pieces. Stock and average purchase cost will auto-synchronize.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#64748b' }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreatePurchase}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Supplier Company *</label>
                    <button
                      type="button"
                      onClick={() => setShowAddSupplierModal(true)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#d97706',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Plus size={14} /> + New Supplier
                    </button>
                  </div>
                  <select
                    className="form-control"
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    required
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.companyName}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Company Invoice Number *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. SHL-INV-9923"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Items List */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="form-label" style={{ marginBottom: 0, fontWeight: 700, color: '#0f172a' }}>
                    Products Received (Maal Inward) *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetItemIndex(items.length - 1 >= 0 ? items.length - 1 : 0);
                      setQuickProductForm(prev => ({
                        ...prev,
                        categoryId: prev.categoryId || categories[0]?.id || '',
                        unitId: prev.unitId || units[0]?.id || '',
                      }));
                      setShowAddProductModal(true);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563eb',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Plus size={14} /> + Naya Product / Item Add Karein
                  </button>
                </div>
                {items.map((it, idx) => {
                  const prod = products.find((p) => p.id === it.productId);
                  const conv = Number(prod?.conversionFactor) || 1;
                  const hasPrimary = (!!prod?.primaryUnit || !!prod?.primaryUnitId) && conv > 1;
                  const isPrimary = it.unitType === 'PRIMARY' && hasPrimary;
                  const primarySymbol = prod?.primaryUnit?.symbol || 'Ctn';
                  const secSymbol = prod?.unit?.symbol || 'Pcs';
                  const totalPieces = isPrimary ? (Number(it.quantity) || 0) * conv : (Number(it.quantity) || 0);
                  const pieceRate = isPrimary ? (conv > 0 ? (Number(it.unitCost) || 0) / conv : 0) : (Number(it.unitCost) || 0);
                  const rowTotal = (Number(it.quantity) || 0) * (Number(it.unitCost) || 0);

                  return (
                    <div
                      key={idx}
                      style={{
                        backgroundColor: '#f8fafc',
                        border: '1.5px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '12px',
                        marginBottom: '10px'
                      }}
                    >
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(200px, 2.5fr) minmax(130px, 1.3fr) minmax(90px, 0.9fr) minmax(110px, 1.1fr) auto',
                        gap: '10px',
                        alignItems: 'center'
                      }}>
                        {/* 1. Product Select */}
                        <div>
                          <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '3px' }}>
                            Product (پروڈکٹ)
                          </label>
                          <select
                            className="form-control"
                            value={it.productId}
                            onChange={(e) => updateItem(idx, 'productId', e.target.value)}
                            required
                            style={{ fontSize: '0.84rem', fontWeight: 700 }}
                          >
                            <option value="">Select Product</option>
                            {products.map((p) => {
                              const pConv = Number(p.conversionFactor) || 1;
                              const pHasPrimary = (!!p.primaryUnit || !!p.primaryUnitId) && pConv > 1;
                              return (
                                <option key={p.id} value={p.id}>
                                  {p.name} {p.sku ? `(${p.sku})` : ''} {pHasPrimary ? `— [1 ${p.primaryUnit?.symbol || 'Ctn'} = ${pConv} ${p.unit?.symbol || 'Pcs'}]` : ''}
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        {/* 2. Unit / Packaging Selector */}
                        <div>
                          <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '3px' }}>
                            Packaging / پیکنگ
                          </label>
                          {hasPrimary ? (
                            <select
                              className="form-control"
                              value={it.unitType}
                              onChange={(e) => updateItem(idx, 'unitType', e.target.value)}
                              style={{
                                fontSize: '0.82rem',
                                fontWeight: 800,
                                backgroundColor: it.unitType === 'PRIMARY' ? '#fef3c7' : '#ffffff',
                                borderColor: it.unitType === 'PRIMARY' ? '#d97706' : '#cbd5e1',
                                color: it.unitType === 'PRIMARY' ? '#92400e' : '#1e293b'
                              }}
                            >
                              <option value="PRIMARY">📦 {primarySymbol} (کارٹن = {conv} {secSymbol})</option>
                              <option value="SECONDARY">🧴 {secSymbol} (کھلے پیس)</option>
                            </select>
                          ) : (
                            <div style={{
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              padding: '7px 10px',
                              backgroundColor: '#ffffff',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              color: '#475569'
                            }}>
                              {secSymbol} (Base Unit)
                            </div>
                          )}
                        </div>

                        {/* 3. Quantity */}
                        <div>
                          <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '3px' }}>
                            Qty ({isPrimary ? primarySymbol : secSymbol})
                          </label>
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            className="form-control"
                            placeholder="Qty"
                            value={it.quantity === 0 ? '' : it.quantity}
                            onChange={(e) => updateItem(idx, 'quantity', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                            required
                            style={{ fontWeight: 800, textAlign: 'center' }}
                          />
                        </div>

                        {/* 4. Cost Price */}
                        <div>
                          <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '3px' }}>
                            Rate / {isPrimary ? primarySymbol : secSymbol} (Rs.)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            className="form-control"
                            placeholder="Cost"
                            value={it.unitCost === 0 ? '' : it.unitCost}
                            onChange={(e) => updateItem(idx, 'unitCost', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                            required
                            style={{ fontWeight: 800, color: '#059669', textAlign: 'right' }}
                          />
                        </div>

                        {/* 5. Delete Action */}
                        <div style={{ paddingTop: '16px' }}>
                          <button
                            type="button"
                            onClick={() => removeItemRow(idx)}
                            className="btn btn-outline"
                            style={{ padding: '6px 10px', color: '#ef4444', borderColor: '#fca5a5' }}
                            title="Remove Item"
                          >
                            ×
                          </button>
                        </div>
                      </div>

                      {/* Helper conversion info */}
                      {prod && (
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginTop: '6px',
                          paddingTop: '6px',
                          borderTop: '1px dashed #e2e8f0',
                          fontSize: '0.76rem',
                          color: '#64748b'
                        }}>
                          <div>
                            {isPrimary ? (
                              <span>
                                📦 <b>{it.quantity || 0} {primarySymbol}</b> = <b style={{ color: '#0284c7' }}>{totalPieces} Total {secSymbol}</b> stock mein jama honge{' '}
                                <span style={{ color: '#16a34a', fontWeight: 700 }}>
                                  (@ Rs. {(Math.round(pieceRate * 100) / 100).toLocaleString()} / {secSymbol})
                                </span>
                              </span>
                            ) : (
                              <span>
                                🧴 <b>{it.quantity || 0} {secSymbol}</b> stock mein jama honge
                                {hasPrimary && conv > 0 && (
                                  <span> (= {(Math.round(((it.quantity || 0) / conv) * 100) / 100)} {primarySymbol})</span>
                                )}
                              </span>
                            )}
                          </div>
                          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.84rem' }}>
                            Subtotal: Rs. {rowTotal.toLocaleString()}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                <button type="button" onClick={addItemRow} className="btn btn-outline btn-sm" style={{ marginTop: '6px' }}>
                  + Add Another Product
                </button>
              </div>

              {/* Bill & Payment Section */}
              <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '10px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.1rem', marginBottom: '12px' }}>
                  <span>Total Purchase Bill:</span>
                  <span style={{ color: '#0f172a' }}>Rs. {totalBill.toLocaleString()}</span>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Amount Paid to Supplier Now (Rs.)</label>
                  <input
                    type="number"
                    step="any"
                    className="form-control"
                    placeholder="0"
                    value={paidAmount === '0' ? '' : paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                  />
                  <small style={{ color: '#64748b' }}>
                    Unpaid remainder (Rs. {(totalBill - parseFloat(paidAmount || '0')).toLocaleString()}) will automatically be credited to the supplier's payable ledger.
                  </small>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Saving...' : 'Post Purchase & Update Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Supplier Modal */}
      {showAddSupplierModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '500px',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ backgroundColor: '#fef3c7', color: '#d97706', padding: '8px', borderRadius: '10px' }}>
                  <Building2 size={20} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                  Add New Oil Supplier / Mill
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddSupplierModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleQuickCreateSupplier}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Company Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Shell Pakistan / Total Parco"
                  value={quickSuppForm.companyName}
                  onChange={(e) => setQuickSuppForm({ ...quickSuppForm, companyName: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Contact Person</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Tariq Mahmood"
                    value={quickSuppForm.contactPerson}
                    onChange={(e) => setQuickSuppForm({ ...quickSuppForm, contactPerson: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Phone Number</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="03001234567"
                    value={quickSuppForm.phone}
                    onChange={(e) => setQuickSuppForm({ ...quickSuppForm, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Address / Depot Location</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Oil Terminal, Karachi / Multan Road Lahore"
                  value={quickSuppForm.address}
                  onChange={(e) => setQuickSuppForm({ ...quickSuppForm, address: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddSupplierModal(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingSupplier}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}
                >
                  <Plus size={16} /> {creatingSupplier ? 'Saving...' : 'Add & Select Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Product Modal */}
      {showAddProductModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 110,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '560px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShoppingBag size={20} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                  + Naya Product / Item Catalog Mein Shamil Karein
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddProductModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleQuickCreateProduct}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Product Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Havoline 20W-50 (4L) / Silicon Tube"
                  value={quickProductForm.name}
                  onChange={(e) => setQuickProductForm({ ...quickProductForm, name: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Category *</label>
                  <select
                    className="form-control"
                    value={quickProductForm.categoryId}
                    onChange={(e) => setQuickProductForm({ ...quickProductForm, categoryId: e.target.value })}
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Brand / Company *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Caltex / Total / Shell"
                    value={quickProductForm.brand}
                    onChange={(e) => setQuickProductForm({ ...quickProductForm, brand: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Base Unit (Pcs/Ltr/Can) *</label>
                  <select
                    className="form-control"
                    value={quickProductForm.unitId}
                    onChange={(e) => setQuickProductForm({ ...quickProductForm, unitId: e.target.value })}
                    required
                  >
                    <option value="">Select Base Unit</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">SKU / Item Code</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. HAV-20W50-4L (Auto if blank)"
                    value={quickProductForm.sku}
                    onChange={(e) => setQuickProductForm({ ...quickProductForm, sku: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Purchase / Cost Price (Rs.) *</label>
                  <input
                    type="number"
                    step="any"
                    className="form-control"
                    placeholder="e.g. 4200"
                    value={quickProductForm.purchasePrice}
                    onChange={(e) => setQuickProductForm({ ...quickProductForm, purchasePrice: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Sale Retail Price (Rs.) *</label>
                  <input
                    type="number"
                    step="any"
                    className="form-control"
                    placeholder="e.g. 4800"
                    value={quickProductForm.salePrice}
                    onChange={(e) => setQuickProductForm({ ...quickProductForm, salePrice: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingProduct}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}
                >
                  <Plus size={16} /> {creatingProduct ? 'Saving...' : 'Add & Select In Purchase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* View & Print Purchase Invoice / Goods Received Note Modal */}
      {selectedPurchase && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 110,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '820px',
            maxHeight: '92vh',
            overflowY: 'auto',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            {/* Top Bar (Screen only, hidden on print) */}
            <div className="no-print" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #e2e8f0',
              paddingBottom: '14px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: '#fef3c7',
                  color: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <FileText size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                    Purchase Voucher / Goods Received Note
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    رسید انورڈ مال و تفصیل خریداری
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                >
                  <Printer size={15} /> Print Voucher / پرنٹ
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPurchase(null)}
                  className="btn btn-outline btn-sm"
                  style={{ fontWeight: 700 }}
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {/* Printable Document Container */}
            <div className="printable-area a4-report" style={{
              backgroundColor: '#ffffff',
              padding: '10px',
              color: '#0f172a',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}>
              {/* Header Letterhead */}
              <div style={{
                textAlign: 'center',
                borderBottom: '2px solid #0f172a',
                paddingBottom: '12px',
                marginBottom: '16px'
              }}>
                <div style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '0.5px', color: '#0f172a' }}>
                  RAFIQ AUTO & OIL TRADERS
                </div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#d97706', marginTop: '2px' }}>
                  رفیق آٹو اینڈ آئل ٹریڈرز
                </div>
                <div style={{ fontSize: '11px', color: '#475569', marginTop: '3px' }}>
                  54-Stop Near MCB Bank, Dipalpur Road, Okara &bull; Ph: 0306-9258573 | 0327-7497457
                </div>
                <div style={{
                  display: 'inline-block',
                  marginTop: '8px',
                  padding: '3px 14px',
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  color: '#1e293b'
                }}>
                  GOODS RECEIVED NOTE &bull; انورڈ مال رسید
                </div>
              </div>

              {/* Information Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1.2fr 1fr',
                gap: '12px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '12px 14px',
                fontSize: '12px',
                marginBottom: '16px'
              }}>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', marginBottom: '4px' }}>
                    Supplier / Vendor Details (سپلائر)
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                    {selectedPurchase.supplier?.companyName || 'Unknown Supplier'}
                  </div>
                  {selectedPurchase.supplier?.contactPerson && (
                    <div style={{ color: '#475569', marginTop: '2px' }}>
                      Contact: <b>{selectedPurchase.supplier.contactPerson}</b>
                    </div>
                  )}
                  {selectedPurchase.supplier?.phone && (
                    <div style={{ color: '#475569', marginTop: '2px' }}>
                      Phone: <b>{selectedPurchase.supplier.phone}</b>
                    </div>
                  )}
                  {selectedPurchase.supplier?.address && (
                    <div style={{ color: '#64748b', fontSize: '11px', marginTop: '2px' }}>
                      {selectedPurchase.supplier.address}
                    </div>
                  )}
                </div>

                <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span style={{ color: '#64748b' }}>Supplier Invoice #:</span>
                    <span style={{ fontWeight: 800, color: '#d97706', fontFamily: 'monospace', fontSize: '13px' }}>
                      {selectedPurchase.invoiceNumber}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span style={{ color: '#64748b' }}>Received Date:</span>
                    <span style={{ fontWeight: 600 }}>
                      {new Date(selectedPurchase.purchaseDate).toLocaleDateString()} {new Date(selectedPurchase.purchaseDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span style={{ color: '#64748b' }}>Payment Mode:</span>
                    <span style={{ fontWeight: 700, color: '#0284c7' }}>
                      {selectedPurchase.paymentMethod}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Recorded By:</span>
                    <span style={{ fontWeight: 600 }}>
                      {selectedPurchase.createdBy?.fullName || 'Admin'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items Received Table */}
              <div style={{ marginBottom: '16px' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '11.5px',
                  border: '1px solid #cbd5e1'
                }}>
                  <thead>
                    <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                      <th style={{ padding: '7px 8px', textAlign: 'center', width: '35px', borderRight: '1px solid #334155' }}>#</th>
                      <th style={{ padding: '7px 10px', textAlign: 'left', borderRight: '1px solid #334155' }}>Product / Description (آئٹم نام)</th>
                      <th style={{ padding: '7px 8px', textAlign: 'center', width: '90px', borderRight: '1px solid #334155' }}>Unit / پیکنگ</th>
                      <th style={{ padding: '7px 8px', textAlign: 'center', width: '80px', borderRight: '1px solid #334155' }}>Qty Recv (تعداد)</th>
                      <th style={{ padding: '7px 10px', textAlign: 'right', width: '100px', borderRight: '1px solid #334155' }}>Unit Rate</th>
                      <th style={{ padding: '7px 10px', textAlign: 'right', width: '110px' }}>Total Cost (Rs.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPurchase.items && selectedPurchase.items.length > 0 ? (
                      selectedPurchase.items.map((it: any, idx: number) => {
                        const conv = Number(it.product?.conversionFactor) || 1;
                        const isPrimary = it.unitType === 'PRIMARY';
                        const primarySymbol = it.product?.primaryUnit?.symbol || 'Ctn';
                        const secSymbol = it.product?.unit?.symbol || 'Pcs';
                        const baseQty = Number(it.baseQuantity) || (isPrimary ? Number(it.quantity) * conv : Number(it.quantity));

                        return (
                          <tr key={it.id || idx} style={{
                            borderBottom: '1px solid #e2e8f0',
                            backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc'
                          }}>
                            <td style={{ padding: '7px 8px', textAlign: 'center', color: '#64748b', borderRight: '1px solid #e2e8f0' }}>
                              {idx + 1}
                            </td>
                            <td style={{ padding: '7px 10px', borderRight: '1px solid #e2e8f0' }}>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>
                                {it.product?.name || 'Product'}
                              </div>
                              <div style={{ fontSize: '10px', color: '#64748b' }}>
                                {it.product?.brand ? `Brand: ${it.product.brand}` : ''}
                                {it.product?.sku ? ` | SKU: ${it.product.sku}` : ''}
                              </div>
                            </td>
                            <td style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 600, color: '#475569', borderRight: '1px solid #e2e8f0' }}>
                              <span style={{
                                backgroundColor: isPrimary ? '#fef3c7' : '#f1f5f9',
                                color: isPrimary ? '#92400e' : '#475569',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 700,
                                border: isPrimary ? '1px solid #fde68a' : '1px solid #cbd5e1'
                              }}>
                                {isPrimary ? `📦 ${primarySymbol} (${conv} ${secSymbol})` : `🧴 ${secSymbol}`}
                              </span>
                            </td>
                            <td style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 800, color: '#0f172a', fontSize: '12px', borderRight: '1px solid #e2e8f0' }}>
                              <div>{Number(it.quantity).toLocaleString()} {isPrimary ? primarySymbol : secSymbol}</div>
                              {isPrimary && conv > 1 && (
                                <div style={{ fontSize: '10px', color: '#0284c7', fontWeight: 600 }}>
                                  ({baseQty} Total {secSymbol})
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600, borderRight: '1px solid #e2e8f0' }}>
                              <div>Rs. {Number(it.unitCost).toLocaleString()}</div>
                              {isPrimary && conv > 1 && (
                                <div style={{ fontSize: '10px', color: '#64748b' }}>
                                  (= Rs. {Math.round((Number(it.unitCost) / conv) * 100) / 100} / {secSymbol})
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                              Rs. {Number(it.totalCost || (it.quantity * it.unitCost)).toLocaleString()}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} style={{ padding: '16px', textAlign: 'center', color: '#94a3b8' }}>
                          No item details recorded for this purchase invoice.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {selectedPurchase.items && selectedPurchase.items.length > 0 && (
                    <tfoot>
                      <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 800, borderTop: '2px solid #cbd5e1' }}>
                        <td colSpan={3} style={{ padding: '7px 10px', textAlign: 'right', borderRight: '1px solid #e2e8f0' }}>
                          Total Items / کل موصول شدہ تعداد:
                        </td>
                        <td style={{ padding: '7px 8px', textAlign: 'center', color: '#0284c7', fontSize: '13px', borderRight: '1px solid #e2e8f0' }}>
                          {selectedPurchase.items.reduce((sum: number, it: any) => sum + (Number(it.quantity) || 0), 0)}
                        </td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', borderRight: '1px solid #e2e8f0' }}>
                          Gross Total:
                        </td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', color: '#0f172a', fontSize: '12px' }}>
                          Rs. {Number(selectedPurchase.totalAmount || selectedPurchase.netAmount).toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* Financial Breakdown & Notes */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px', alignItems: 'start', marginBottom: '24px' }}>
                <div>
                  {selectedPurchase.notes ? (
                    <div style={{
                      backgroundColor: '#fffbeb',
                      border: '1px dashed #f59e0b',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      fontSize: '11px'
                    }}>
                      <div style={{ fontWeight: 800, color: '#b45309', marginBottom: '2px' }}>
                        Notes / کمنٹس:
                      </div>
                      <div style={{ color: '#78350f', whiteSpace: 'pre-wrap' }}>
                        {selectedPurchase.notes}
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      backgroundColor: '#f8fafc',
                      border: '1px dashed #cbd5e1',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      fontSize: '11px',
                      color: '#64748b'
                    }}>
                      ✓ Stock automatically updated in warehouse inventory upon receipt.
                    </div>
                  )}
                </div>

                <div style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  fontSize: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: '#64748b' }}>Total Bill / کل بل:</span>
                    <span style={{ fontWeight: 700 }}>
                      Rs. {Number(selectedPurchase.netAmount).toLocaleString()}
                    </span>
                  </div>
                  {Number(selectedPurchase.discount) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#16a34a' }}>
                      <span>Discount (رعایت):</span>
                      <span>- Rs. {Number(selectedPurchase.discount).toLocaleString()}</span>
                    </div>
                  )}
                  {Number(selectedPurchase.tax) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: '#64748b' }}>Tax:</span>
                      <span>+ Rs. {Number(selectedPurchase.tax).toLocaleString()}</span>
                    </div>
                  )}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    borderTop: '1px dashed #cbd5e1',
                    paddingTop: '6px',
                    marginBottom: '4px'
                  }}>
                    <span style={{ fontWeight: 700, color: '#15803d' }}>Paid Amount (ادا شدہ):</span>
                    <span style={{ fontWeight: 800, color: '#15803d' }}>
                      Rs. {Number(selectedPurchase.paidAmount).toLocaleString()}
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    borderTop: '1px solid #cbd5e1',
                    paddingTop: '6px',
                    fontSize: '13px'
                  }}>
                    <span style={{ fontWeight: 800, color: Number(selectedPurchase.remainingAmount) > 0 ? '#dc2626' : '#15803d' }}>
                      Payable Balance (بقایا):
                    </span>
                    <span style={{ fontWeight: 900, color: Number(selectedPurchase.remainingAmount) > 0 ? '#dc2626' : '#15803d' }}>
                      Rs. {Number(selectedPurchase.remainingAmount).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Signatures & Verification */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '40px',
                paddingTop: '20px',
                borderTop: '1px dashed #cbd5e1',
                fontSize: '11px',
                textAlign: 'center'
              }}>
                <div>
                  <div style={{ borderBottom: '1px solid #64748b', height: '35px', marginBottom: '6px' }}></div>
                  <div style={{ fontWeight: 700, color: '#334155' }}>Stock Received & Inspected By</div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>مال موصول کنندہ دستخط</div>
                </div>
                <div>
                  <div style={{ borderBottom: '1px solid #64748b', height: '35px', marginBottom: '6px' }}></div>
                  <div style={{ fontWeight: 700, color: '#334155' }}>Authorized Signature & Stamp</div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>مجاز دستخط و مہر</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
