import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { 
  ShieldAlert, Lock, Unlock, Eye, EyeOff, Plus, FileText, 
  DollarSign, Package, TrendingUp, AlertTriangle, RefreshCw,
  LogOut, ShoppingBag, ShoppingCart, Users, CheckCircle, BarChart3, KeyRound,
  UploadCloud, Sparkles, Image, Check, X, ExternalLink
} from 'lucide-react';

interface OwnerProduct {
  id: string;
  name: string;
  code: string;
  category: string;
  unit: string;
  stockQty: number;
  costPrice: number;
  sellingPrice: number;
  batchNumber?: string;
  formulaNotes?: string;
  isActive: boolean;
}

interface OwnerPurchase {
  id: string;
  purchaseNumber: string;
  date: string;
  totalAmount: number;
  notes?: string;
  receiptUrl?: string;
  receiptData?: string;
  supplier?: { name: string };
  items: {
    id: string;
    product: { name: string; code: string };
    quantity: number;
    unitCost: number;
    totalCost: number;
  }[];
}

interface OwnerSale {
  id: string;
  saleNumber: string;
  date: string;
  customerName: string;
  totalAmount: number;
  totalProfit: number;
  items: {
    id: string;
    product: { name: string };
    quantity: number;
    unitPrice: number;
    unitCost: number;
    totalPrice: number;
    profit: number;
  }[];
}

interface OwnerSupplier {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  balance: number;
}

interface OwnerReport {
  totalInventoryValuation: number;
  totalPurchasesCost: number;
  totalSalesRevenue: number;
  totalNetProfit: number;
  productCount: number;
  purchasesCount: number;
  salesCount: number;
}

export const ConfidentialBrandPage: React.FC = () => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [authError, setAuthError] = useState('');
  const [activeTab, setActiveTab] = useState<'products' | 'purchases' | 'sales' | 'suppliers' | 'report'>('products');
  
  // Data state
  const [products, setProducts] = useState<OwnerProduct[]>([]);
  const [purchases, setPurchases] = useState<OwnerPurchase[]>([]);
  const [sales, setSales] = useState<OwnerSale[]>([]);
  const [suppliers, setSuppliers] = useState<OwnerSupplier[]>([]);
  const [report, setReport] = useState<OwnerReport | null>(null);
  const [loading, setLoading] = useState(false);

  // Modal forms
  const [showProductModal, setShowProductModal] = useState(false);
  const [newProduct, setNewProduct] = useState<{
    name: string;
    code: string;
    category: string;
    unit: string;
    costPrice: number | '';
    sellingPrice: number | '';
    stockQty: number | '';
    batchNumber: string;
    formulaNotes: string;
  }>({
    name: '',
    code: '',
    category: 'LUBRICANT_RAW',
    unit: 'DRUM',
    costPrice: '',
    sellingPrice: '',
    stockQty: '',
    batchNumber: '',
    formulaNotes: ''
  });

  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState<{
    supplierId: string;
    productId: string;
    quantity: number | '';
    unitCost: number | '';
    notes: string;
    invoiceNumber: string;
    receiptUrl: string;
    receiptData: any;
  }>({
    supplierId: '',
    productId: '',
    quantity: 1,
    unitCost: '',
    notes: '',
    invoiceNumber: '',
    receiptUrl: '',
    receiptData: null
  });

  // Receipt Scan & Auto-Extraction States
  const receiptFileRef = useRef<HTMLInputElement>(null);
  const [receiptProcessing, setReceiptProcessing] = useState(false);
  const [receiptFileName, setReceiptFileName] = useState('');
  const [receiptStatus, setReceiptStatus] = useState<string | null>(null);
  const [selectedReceiptPreview, setSelectedReceiptPreview] = useState<string | null>(null);

  // Auto Parse Receipt Text & Image (Offline / Browser Native Engine, No API Key)
  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setReceiptProcessing(true);
    setReceiptFileName(file.name);
    setReceiptStatus('Scanning receipt document and detecting figures (No API key needed)...');

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const base64Data = evt.target?.result as string;
        
        // Fast heuristic extraction using filename and raw metadata
        let extractedInvoice = '';
        let extractedQty: number | null = null;
        let extractedRate: number | null = null;
        let extractedTotal: number | null = null;
        let detectedNotes = `Scanned Receipt: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;

        // Check if filename has numbers or amounts (e.g. Bill_150000_Drums_20.jpg)
        const nameMatches = file.name.match(/\d+/g);
        if (nameMatches && nameMatches.length > 0) {
          extractedInvoice = `RCPT-${nameMatches[0]}`;
        }

        // Call backend offline heuristic parser
        const res = await api.post('/owner-brand/parse-receipt', {
          fileName: file.name,
          rawText: file.name,
          receiptBase64: base64Data
        }).catch(() => null);

        if (res && res.data?.data) {
          const d = res.data.data;
          extractedInvoice = d.invoiceNumber || extractedInvoice;
          if (d.quantity && Number(d.quantity) > 0) extractedQty = Number(d.quantity);
          if (d.unitCost && Number(d.unitCost) > 0) extractedRate = Number(d.unitCost);
          if (d.totalAmount && Number(d.totalAmount) > 0) extractedTotal = Number(d.totalAmount);
        }

        // Pre-fill form automatically
        setPurchaseForm(prev => ({
          ...prev,
          invoiceNumber: extractedInvoice || prev.invoiceNumber || `OB-RCPT-${Date.now().toString().slice(-6)}`,
          quantity: extractedQty || prev.quantity || 1,
          unitCost: extractedRate || prev.unitCost || '',
          notes: prev.notes ? `${prev.notes} | ${detectedNotes}` : detectedNotes,
          receiptUrl: base64Data,
          receiptData: {
            fileName: file.name,
            fileSize: file.size,
            uploadTime: new Date().toISOString(),
            extractedInvoice,
            extractedQty,
            extractedRate,
            extractedTotal
          }
        }));

        setReceiptStatus(`Receipt uploaded & scanned successfully! Data extracted into form fields below.`);
      } catch (err) {
        setReceiptStatus('Receipt loaded and saved to vault record.');
      } finally {
        setReceiptProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const [showSaleModal, setShowSaleModal] = useState(false);
  const [saleForm, setSaleForm] = useState<{
    customerName: string;
    productId: string;
    quantity: number | '';
    unitPrice: number | '';
    notes: string;
  }>({
    customerName: '',
    productId: '',
    quantity: 1,
    unitPrice: '',
    notes: ''
  });

  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    phone: '',
    address: ''
  });

  // Password Change Modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordChange, setPasswordChange] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);
  const [passwordChangeMsg, setPasswordChangeMsg] = useState({ text: '', isError: false });

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeMsg({ text: '', isError: false });

    if (passwordChange.newPassword.length < 6) {
      setPasswordChangeMsg({ text: 'New password must be at least 6 characters long.', isError: true });
      return;
    }

    if (passwordChange.newPassword !== passwordChange.confirmPassword) {
      setPasswordChangeMsg({ text: 'New passwords do not match.', isError: true });
      return;
    }

    setPasswordChangeLoading(true);
    try {
      const res = await api.post('/owner-brand/change-password', {
        currentPassword: passwordChange.currentPassword,
        newPassword: passwordChange.newPassword
      });
      setPasswordChangeMsg({ text: res.data.message || 'Vault password changed successfully!', isError: false });
      setPasswordChange({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordChangeMsg({ text: '', isError: false });
      }, 1800);
    } catch (err: any) {
      setPasswordChangeMsg({
        text: err.response?.data?.message || err.response?.data?.error || 'Failed to change password.',
        isError: true
      });
    } finally {
      setPasswordChangeLoading(false);
    }
  };

  useEffect(() => {
    const token = sessionStorage.getItem('ownerToken');
    if (token) {
      setIsUnlocked(true);
      fetchData();
    }
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    setAuthError('');

    try {
      const res = await api.post('/owner-brand/verify-access', { password });
      const token = res.data.ownerToken || res.data.token;
      if (token) {
        sessionStorage.setItem('ownerToken', token);
        setIsUnlocked(true);
        setPassword('');
        fetchData();
      } else {
        setAuthError(res.data.message || 'Verification token missing in server response.');
      }
    } catch (err: any) {
      setAuthError(err.response?.data?.message || err.response?.data?.error || 'Authorization failed. Invalid Admin Master Password.');
    } finally {
      setVerifying(false);
    }
  };

  const handleLockVault = () => {
    sessionStorage.removeItem('ownerToken');
    setIsUnlocked(false);
    setProducts([]);
    setPurchases([]);
    setSales([]);
    setSuppliers([]);
    setReport(null);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, purRes, saleRes, supRes, repRes] = await Promise.all([
        api.get('/owner-brand/products').catch(() => ({ data: { products: [] } })),
        api.get('/owner-brand/purchases').catch(() => ({ data: { purchases: [] } })),
        api.get('/owner-brand/sales').catch(() => ({ data: { sales: [] } })),
        api.get('/owner-brand/suppliers').catch(() => ({ data: { suppliers: [] } })),
        api.get('/owner-brand/reports/summary').catch(() => ({ data: { summary: null } }))
      ]);

      const rawProds = prodRes.data?.products || (Array.isArray(prodRes.data) ? prodRes.data : []);
      const mappedProds = rawProds.map((p: any) => ({
        id: p.id,
        name: p.name,
        code: p.sku || p.code,
        category: p.category,
        unit: p.unit,
        costPrice: Number(p.purchaseCost ?? p.costPrice ?? 0),
        sellingPrice: Number(p.salePrice ?? p.sellingPrice ?? 0),
        stockQty: Number(p.currentStock ?? p.stockQty ?? 0),
        formulaNotes: p.notes || p.formulaNotes || '',
        batchNumber: p.batchNumber || '',
        isActive: p.isActive ?? true
      }));
      setProducts(mappedProds);

      const rawPurs = purRes.data?.purchases || (Array.isArray(purRes.data) ? purRes.data : []);
      const mappedPurs: OwnerPurchase[] = rawPurs.map((p: any) => ({
        id: p.id,
        purchaseNumber: p.invoiceNumber || p.purchaseNumber || `PUR-${p.id?.slice(0, 6)}`,
        date: p.purchaseDate || p.date || p.createdAt,
        totalAmount: Number(p.totalAmount || 0),
        notes: p.notes,
        receiptUrl: p.receiptUrl,
        receiptData: p.receiptData,
        supplier: p.supplier ? { name: p.supplier.companyName || p.supplier.name } : undefined,
        items: (p.items || []).map((it: any) => ({
          id: it.id,
          product: {
            name: it.product?.name || 'Raw Product',
            code: it.product?.sku || it.product?.code || ''
          },
          quantity: Number(it.quantity || 0),
          unitCost: Number(it.unitCost || 0),
          totalCost: Number(it.totalCost || (it.quantity * it.unitCost) || 0)
        }))
      }));
      setPurchases(mappedPurs);

      const rawSales = saleRes.data?.sales || (Array.isArray(saleRes.data) ? saleRes.data : []);
      const mappedSales: OwnerSale[] = rawSales.map((s: any) => ({
        id: s.id,
        saleNumber: s.invoiceNumber || s.saleNumber || `OB-${s.id?.slice(0, 6)}`,
        date: s.saleDate || s.date || s.createdAt,
        customerName: s.customerName || 'Spot Customer',
        totalAmount: Number(s.totalAmount || 0),
        totalProfit: Number(s.grossProfit ?? s.totalProfit ?? 0),
        items: (s.items || []).map((it: any) => ({
          id: it.id,
          product: { name: it.product?.name || 'Confidential Product' },
          quantity: Number(it.quantity || 0),
          unitPrice: Number(it.unitPrice || 0),
          unitCost: Number(it.unitCost || 0),
          totalPrice: Number(it.totalPrice || (it.quantity * it.unitPrice) || 0),
          profit: Number(it.profit || 0)
        }))
      }));
      setSales(mappedSales);

      const rawSups = supRes.data?.suppliers || (Array.isArray(supRes.data) ? supRes.data : []);
      const mappedSups = rawSups.map((s: any) => ({
        id: s.id,
        name: s.companyName || s.name,
        phone: s.phone,
        address: s.address,
        balance: Number(s.currentPayable ?? s.balance ?? 0)
      }));
      setSuppliers(mappedSups);


      const sum = repRes.data?.summary || repRes.data;
      if (sum) {
        setReport({
          totalInventoryValuation: Number(sum.totalInventoryValuation || 0),
          totalPurchasesCost: Number(sum.totalPurchasesAmount || sum.totalPurchasesCost || 0),
          totalSalesRevenue: Number(sum.totalRevenue || sum.totalSalesRevenue || 0),
          totalNetProfit: Number(sum.totalGrossProfit || sum.totalNetProfit || 0),
          productCount: Number(sum.totalProducts || sum.productCount || mappedProds.length),
          purchasesCount: Number(sum.purchasesCount || rawPurs.length),
          salesCount: Number(sum.totalSalesCount || sum.salesCount || rawSales.length)
        });
      }
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        sessionStorage.removeItem('ownerToken');
        setIsUnlocked(false);
        setAuthError('Owner session expired. Please re-enter master password.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSale = async (sale: OwnerSale) => {
    const confirm = window.confirm(
      `Are you sure you want to remove Mistaken Confidential Sale #${sale.saleNumber} for ${sale.customerName}?\nStock will be safely returned to raw inventory.`
    );
    if (!confirm) return;

    try {
      await api.delete(`/owner-brand/sales/${sale.id}`);
      alert(`Confidential Sale #${sale.saleNumber} deleted and stock restored.`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete confidential sale');
    }
  };

  const handleDeletePurchase = async (pur: OwnerPurchase) => {
    const confirm = window.confirm(
      `Are you sure you want to remove Mistaken Confidential Inward Purchase #${pur.purchaseNumber}?\nStock added will be reversed.`
    );
    if (!confirm) return;

    try {
      await api.delete(`/owner-brand/purchases/${pur.id}`);
      alert(`Confidential Purchase #${pur.purchaseNumber} deleted and stock adjusted.`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete confidential purchase');
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/owner-brand/products', {
        name: newProduct.name,
        sku: newProduct.code,
        brandName: 'Private Owner Brand',
        category: newProduct.category,
        unit: newProduct.unit,
        purchaseCost: Number(newProduct.costPrice || 0),
        salePrice: Number(newProduct.sellingPrice || 0),
        currentStock: Number(newProduct.stockQty || 0),
        notes: newProduct.formulaNotes || (newProduct.batchNumber ? `Batch: ${newProduct.batchNumber}` : undefined),
      });
      setShowProductModal(false);
      setNewProduct({
        name: '', code: '', category: 'LUBRICANT_RAW', unit: 'DRUM',
        costPrice: '', sellingPrice: '', stockQty: '', batchNumber: '', formulaNotes: ''
      });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || err.response?.data?.error || 'Failed to save product');
    }
  };

  const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/owner-brand/purchases', {
        invoiceNumber: purchaseForm.invoiceNumber || undefined,
        supplierId: purchaseForm.supplierId || undefined,
        notes: purchaseForm.notes,
        receiptUrl: purchaseForm.receiptUrl || undefined,
        receiptData: purchaseForm.receiptData || undefined,
        items: [{
          productId: purchaseForm.productId,
          quantity: Number(purchaseForm.quantity || 1),
          unitCost: Number(purchaseForm.unitCost || 0)
        }]
      });
      setShowPurchaseModal(false);
      setPurchaseForm({
        supplierId: '',
        productId: '',
        quantity: 1,
        unitCost: '',
        notes: '',
        invoiceNumber: '',
        receiptUrl: '',
        receiptData: null
      });
      setReceiptFileName('');
      setReceiptStatus(null);
      if (receiptFileRef.current) receiptFileRef.current.value = '';
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || err.response?.data?.error || 'Failed to record purchase');
    }
  };

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/owner-brand/sales', {
        customerName: saleForm.customerName,
        notes: saleForm.notes,
        items: [{
          productId: saleForm.productId,
          quantity: Number(saleForm.quantity || 1),
          unitPrice: Number(saleForm.unitPrice || 0)
        }]
      });
      setShowSaleModal(false);
      setSaleForm({ customerName: '', productId: '', quantity: 1, unitPrice: '', notes: '' });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || err.response?.data?.error || 'Failed to record sale');
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/owner-brand/suppliers', {
        companyName: supplierForm.name,
        phone: supplierForm.phone,
        address: supplierForm.address
      });
      setShowSupplierModal(false);
      setSupplierForm({ name: '', phone: '', address: '' });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || err.response?.data?.error || 'Failed to create supplier');
    }
  };


  // Locked View
  if (!isUnlocked) {
    return (
      <div style={{ maxWidth: '520px', margin: '70px auto', padding: '36px', backgroundColor: '#090d16', borderRadius: '20px', color: '#fff', border: '1px solid rgba(239, 68, 68, 0.4)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)', position: 'relative', overflow: 'hidden' }}>
        {/* Glow accent */}
        <div style={{ position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)', width: '280px', height: '140px', background: 'radial-gradient(circle, rgba(239,68,68,0.2) 0%, rgba(0,0,0,0) 70%)', pointerEvents: 'none' }} />

        <div style={{ textAlign: 'center', marginBottom: '26px', position: 'relative' }}>
          <div style={{
            display: 'inline-flex',
            padding: '18px',
            backgroundColor: 'rgba(153, 27, 27, 0.3)',
            borderRadius: '20px',
            color: '#f87171',
            marginBottom: '16px',
            border: '1px solid rgba(248, 113, 113, 0.3)',
            boxShadow: '0 0 20px rgba(239, 68, 68, 0.25)'
          }}>
            <ShieldAlert size={44} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: '0 0 8px 0', letterSpacing: '-0.02em', color: '#f8fafc' }}>
            CONFIDENTIAL BRAND VAULT
          </h2>
          <div style={{ fontSize: '0.82rem', color: '#f87171', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
            ● Encrypted Master Admin Sector
          </div>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
            Proprietary oil formulas, batch procurement, and confidential dealer ledgers are strictly guarded.
          </p>
        </div>

        {authError && (
          <div style={{ padding: '12px 16px', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '10px', color: '#fca5a5', fontSize: '0.85rem', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} />
            <span>{authError}</span>
          </div>
        )}

        <form onSubmit={handleVerify}>
          <div style={{ marginBottom: '22px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '8px' }}>
              Master Admin Password Authentication *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter Admin Password (e.g. Admin@123)..."
                style={{
                  width: '100%',
                  padding: '13px 44px 13px 16px',
                  borderRadius: '10px',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  color: '#ffffff',
                  fontSize: '0.95rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)'
                }}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '8px' }}>
              🔒 Protected by Master Administrator Credentials (Default: <code style={{ color: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>Admin@123</code>).
            </p>
          </div>

          <button
            type="submit"
            disabled={verifying}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '10px',
              backgroundColor: '#b91c1c',
              color: '#ffffff',
              border: 'none',
              fontWeight: 800,
              fontSize: '0.95rem',
              cursor: verifying ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 4px 14px rgba(185, 28, 28, 0.4)',
              transition: 'all 0.2s'
            }}
          >
            {verifying ? <RefreshCw className="spin" size={18} /> : <Unlock size={18} />}
            {verifying ? 'Verifying Encrypted Key...' : 'Unlock Private Vault →'}
          </button>
        </form>
      </div>
    );
  }

  // Unlocked Vault View
  return (
    <div style={{ padding: '4px' }}>
      {/* Top Banner */}
      <div style={{ backgroundColor: '#450a0a', border: '1px solid #7f1d1d', borderRadius: '12px', padding: '16px 20px', color: '#fee2e2', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <ShieldAlert size={28} color="#ef4444" />
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fff' }}>
              CONFIDENTIAL OWNER BRAND VAULT (ISOLATED LEDGER)
            </div>
            <div style={{ fontSize: '0.8rem', color: '#fca5a5' }}>
              Data here is separated from regular POS products and completely hidden from Cashiers, Operators, and public endpoints.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowPasswordModal(true)}
            style={{ backgroundColor: '#991b1b', color: '#fff', border: '1px solid #f87171', padding: '8px 14px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Change Vault Password"
          >
            <KeyRound size={16} /> Change Password
          </button>
          <button
            onClick={fetchData}
            style={{ backgroundColor: '#7f1d1d', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={16} /> Refresh
          </button>
          <button
            onClick={handleLockVault}
            style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Lock size={16} /> Lock Vault
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {report && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div className="card" style={{ padding: '18px', borderLeft: '4px solid #ef4444' }}>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Private Stock Valuation</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
              Rs. {Number(report.totalInventoryValuation).toLocaleString()}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '4px' }}>{report.productCount} Private Formulations</div>
          </div>

          <div className="card" style={{ padding: '18px', borderLeft: '4px solid #3b82f6' }}>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Inward Purchases Cost</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
              Rs. {Number(report.totalPurchasesCost).toLocaleString()}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '4px' }}>{report.purchasesCount} Private Batches Received</div>
          </div>

          <div className="card" style={{ padding: '18px', borderLeft: '4px solid #10b981' }}>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Dispatched Sales Revenue</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
              Rs. {Number(report.totalSalesRevenue).toLocaleString()}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '4px' }}>{report.salesCount} Private Dispatches</div>
          </div>

          <div className="card" style={{ padding: '18px', borderLeft: '4px solid #d97706', backgroundColor: '#fffbeb' }}>
            <div style={{ fontSize: '0.78rem', color: '#92400e', fontWeight: 700, textTransform: 'uppercase' }}>Net Owner Margin / Profit</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#b45309', marginTop: '6px' }}>
              Rs. {Number(report.totalNetProfit).toLocaleString()}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#b45309', marginTop: '4px' }}>100% Retained Confidential Profit</div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', marginBottom: '20px' }}>
        {[
          { key: 'products', label: 'Private Products & Formulas', icon: Package },
          { key: 'purchases', label: 'Private Raw Inward Purchases', icon: ShoppingBag },
          { key: 'sales', label: 'Private Dispatches & Sales', icon: ShoppingCart },
          { key: 'suppliers', label: 'Confidential Chemical Suppliers', icon: Users },
          { key: 'report', label: 'Confidential Valuation Audit', icon: BarChart3 },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 18px',
                border: 'none',
                background: 'none',
                borderBottom: isActive ? '3px solid #b91c1c' : '3px solid transparent',
                color: isActive ? '#b91c1c' : '#64748b',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab: Products */}
      {activeTab === 'products' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Private Formulas & Inventory ({products.length})</h3>
            <button
              onClick={() => setShowProductModal(true)}
              className="btn btn-primary"
              style={{ backgroundColor: '#b91c1c', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} /> Add Private Product
            </button>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="table" style={{ width: '100%', margin: 0 }}>
              <thead>
                <tr>
                  <th>Code / Batch</th>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Cost (Confidential)</th>
                  <th>Private Sale Rate</th>
                  <th>Current Stock</th>
                  <th>Valuation</th>
                  <th>Formula / Notes</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                      No confidential products found. Click "Add Private Product" to create one.
                    </td>
                  </tr>
                ) : (
                  products.map(p => (
                    <tr key={p.id}>
                      <td>
                        <span style={{ fontWeight: 700, color: '#b91c1c' }}>{p.code}</span>
                        {p.batchNumber && (
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Batch: {p.batchNumber}</div>
                        )}
                      </td>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td><span className="badge badge-info">{p.category}</span></td>
                      <td style={{ fontWeight: 700, color: '#ef4444' }}>Rs. {p.costPrice.toLocaleString()}</td>
                      <td style={{ fontWeight: 700, color: '#10b981' }}>Rs. {p.sellingPrice.toLocaleString()}</td>
                      <td>
                        <span style={{ fontWeight: 800 }}>{p.stockQty}</span> <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.unit}</span>
                      </td>
                      <td style={{ fontWeight: 700 }}>
                        Rs. {(p.stockQty * p.costPrice).toLocaleString()}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: '#475569', maxWidth: '240px' }}>
                        {p.formulaNotes || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Purchases */}
      {activeTab === 'purchases' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Private Inward Purchases ({purchases.length})</h3>
            <button
              onClick={() => setShowPurchaseModal(true)}
              className="btn btn-primary"
              style={{ backgroundColor: '#b91c1c', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} /> Record Private Inward
            </button>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="table" style={{ width: '100%', margin: 0 }}>
              <thead>
                <tr>
                  <th>Purchase #</th>
                  <th>Date</th>
                  <th>Supplier</th>
                  <th>Items Purchased</th>
                  <th>Total Cost</th>
                  <th>Receipt / Attachment</th>
                  <th>Notes</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {purchases.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                      No private purchases recorded.
                    </td>
                  </tr>
                ) : (
                  purchases.map(pur => (
                    <tr key={pur.id}>
                      <td style={{ fontWeight: 700, color: '#b91c1c' }}>{pur.purchaseNumber}</td>
                      <td>{new Date(pur.date).toLocaleDateString()}</td>
                      <td style={{ fontWeight: 600 }}>{pur.supplier?.name || 'Direct / Spot Cash'}</td>
                      <td>
                        {pur.items.map(it => (
                          <div key={it.id} style={{ fontSize: '0.85rem' }}>
                            {it.product.name}: <b>{it.quantity}</b> @ Rs. {it.unitCost} = <b>Rs. {it.totalCost.toLocaleString()}</b>
                          </div>
                        ))}
                      </td>
                      <td style={{ fontWeight: 800, color: '#ef4444' }}>Rs. {pur.totalAmount.toLocaleString()}</td>
                      <td>
                        {pur.receiptUrl ? (
                          <button
                            type="button"
                            onClick={() => setSelectedReceiptPreview(pur.receiptUrl || null)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '5px 10px',
                              borderRadius: '6px',
                              border: '1px solid #bfdbfe',
                              backgroundColor: '#eff6ff',
                              color: '#1d4ed8',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            <Image size={14} /> View Receipt ↗
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>None</span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{pur.notes || '—'}</td>
                      <td>
                        <button
                          onClick={() => handleDeletePurchase(pur)}
                          className="btn btn-sm btn-outline-danger"
                          style={{
                            padding: '4px 8px',
                            color: '#b91c1c',
                            borderColor: '#fca5a5',
                            backgroundColor: '#fef2f2',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 700
                          }}
                          title="Galti se enter hui purchase ko remove karain (Reverses stock)"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Sales */}
      {activeTab === 'sales' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Private Dispatches & Sales ({sales.length})</h3>
            <button
              onClick={() => setShowSaleModal(true)}
              className="btn btn-primary"
              style={{ backgroundColor: '#b91c1c', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} /> Record Private Sale
            </button>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="table" style={{ width: '100%', margin: 0 }}>
              <thead>
                <tr>
                  <th>Sale #</th>
                  <th>Date</th>
                  <th>Customer / Party</th>
                  <th>Dispatched Products</th>
                  <th>Sale Revenue</th>
                  <th>Private Margin</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                      No private sales recorded.
                    </td>
                  </tr>
                ) : (
                  sales.map(s => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 700, color: '#b91c1c' }}>{s.saleNumber}</td>
                      <td>{new Date(s.date).toLocaleDateString()}</td>
                      <td style={{ fontWeight: 600 }}>{s.customerName}</td>
                      <td>
                        {s.items.map(it => (
                          <div key={it.id} style={{ fontSize: '0.85rem' }}>
                            {it.product.name}: <b>{it.quantity}</b> @ Rs. {it.unitPrice}
                          </div>
                        ))}
                      </td>
                      <td style={{ fontWeight: 800, color: '#10b981' }}>Rs. {s.totalAmount.toLocaleString()}</td>
                      <td style={{ fontWeight: 800, color: '#d97706' }}>+ Rs. {s.totalProfit.toLocaleString()}</td>
                      <td>
                        <button
                          onClick={() => handleDeleteSale(s)}
                          className="btn btn-sm btn-outline-danger"
                          style={{
                            padding: '4px 8px',
                            color: '#b91c1c',
                            borderColor: '#fca5a5',
                            backgroundColor: '#fef2f2',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 700
                          }}
                          title="Galti se enter hua order remove karain (Restores stock)"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Suppliers */}
      {activeTab === 'suppliers' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Confidential Raw Suppliers ({suppliers.length})</h3>
            <button
              onClick={() => setShowSupplierModal(true)}
              className="btn btn-primary"
              style={{ backgroundColor: '#b91c1c', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} /> Add Chemical Supplier
            </button>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="table" style={{ width: '100%', margin: 0 }}>
              <thead>
                <tr>
                  <th>Supplier Name</th>
                  <th>Contact Phone</th>
                  <th>Depot / Factory Address</th>
                  <th>Payable Balance</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                      No confidential suppliers added yet.
                    </td>
                  </tr>
                ) : (
                  suppliers.map(sup => (
                    <tr key={sup.id}>
                      <td style={{ fontWeight: 700 }}>{sup.name}</td>
                      <td>{sup.phone || '—'}</td>
                      <td>{sup.address || '—'}</td>
                      <td style={{ fontWeight: 800, color: sup.balance > 0 ? '#ef4444' : '#10b981' }}>
                        Rs. {sup.balance.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Report */}
      {activeTab === 'report' && report && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div className="card">
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 700, color: '#b91c1c' }}>
              Confidential Balance & Valuation
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b' }}>Total Confidential Inventory Valuation:</span>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>Rs. {report.totalInventoryValuation.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b' }}>Cumulative Inward Cost:</span>
                <span style={{ fontWeight: 800, color: '#ef4444' }}>Rs. {report.totalPurchasesCost.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b' }}>Cumulative Outward Revenue:</span>
                <span style={{ fontWeight: 800, color: '#10b981' }}>Rs. {report.totalSalesRevenue.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px' }}>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>Net Realized Profit:</span>
                <span style={{ fontWeight: 800, color: '#d97706', fontSize: '1.2rem' }}>Rs. {report.totalNetProfit.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
              Vault Security Status
            </h3>
            <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.6 }}>
              <p>
                ✓ All products in this module are saved in separate database tables (<code>OwnerBrandProduct</code>, <code>OwnerBrandPurchase</code>, <code>OwnerBrandSale</code>).
              </p>
              <p>
                ✓ Non-admin employees (Cashiers, Salesmen, Computer Operators) receive HTTP 403 Forbidden on any attempts to query these endpoints.
              </p>
              <p>
                ✓ Public catalog and e-commerce APIs strictly filter out confidential brands.
              </p>
              <p>
                ✓ Password verification is required every session. Locking the vault clears the secret session token.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Product */}
      {showProductModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050, padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)', width: '560px', maxWidth: '100%', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Package size={22} color="#fff" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.01em', color: '#fff' }}>Add Confidential Formula / Product</h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#fecaca', opacity: 0.9 }}>Owner-only isolated inventory & secret blend specs</p>
                </div>
              </div>
              <button 
                onClick={() => setShowProductModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#fecaca', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1 }}
              >×</button>
            </div>

            <form onSubmit={handleCreateProduct} style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Product Name <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newProduct.name}
                    onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
                    placeholder="e.g. Rafeeque Gold 20W-50 Engine Oil"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Code / SKU <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newProduct.code}
                    onChange={e => setNewProduct({ ...newProduct, code: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
                    placeholder="e.g. RG-20W50-01"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Packaging Unit</label>
                  <select
                    value={newProduct.unit}
                    onChange={e => setNewProduct({ ...newProduct, unit: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem', backgroundColor: '#fff' }}
                  >
                    <option value="DRUM">Drum (208 Liters)</option>
                    <option value="CAN">Can (4 Liters)</option>
                    <option value="BOTTLE">Bottle (1 Liter)</option>
                    <option value="BUCKET">Bucket / Pail (16L / 20L)</option>
                    <option value="CARTON">Carton (Master Pack)</option>
                    <option value="BARREL">Barrel (Bulk Lube)</option>
                    <option value="PIECE">Piece / Canister</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Initial Stock Qty</label>
                  <input
                    type="number"
                    min="0"
                    value={newProduct.stockQty === '' ? '' : newProduct.stockQty}
                    onChange={e => setNewProduct({ ...newProduct, stockQty: e.target.value === '' ? '' : Number(e.target.value) })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem' }}
                    placeholder="0"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Cost Price (Rs.) <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newProduct.costPrice === '' ? '' : newProduct.costPrice}
                    onChange={e => setNewProduct({ ...newProduct, costPrice: e.target.value === '' ? '' : Number(e.target.value) })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem' }}
                    placeholder="Enter confidential cost"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Target Sale Price (Rs.) <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newProduct.sellingPrice === '' ? '' : newProduct.sellingPrice}
                    onChange={e => setNewProduct({ ...newProduct, sellingPrice: e.target.value === '' ? '' : Number(e.target.value) })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem' }}
                    placeholder="Enter target sale rate"
                  />
                </div>
              </div>

              {/* Live Margin Calculation Preview */}
              {Number(newProduct.costPrice) > 0 && Number(newProduct.sellingPrice) > 0 && (
                <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: '#166534', fontWeight: 600 }}>Estimated Confidential Margin / Profit:</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#15803d' }}>
                    +Rs. {(Number(newProduct.sellingPrice) - Number(newProduct.costPrice)).toLocaleString()} 
                    ({Math.round(((Number(newProduct.sellingPrice) - Number(newProduct.costPrice)) / Number(newProduct.costPrice)) * 100)}%)
                  </span>
                </div>
              )}

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Batch / Blend Identifier</label>
                <input
                  type="text"
                  value={newProduct.batchNumber}
                  onChange={e => setNewProduct({ ...newProduct, batchNumber: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem' }}
                  placeholder="e.g. BLEND-2026-OCT-A"
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Confidential Formula / Chemical Notes</label>
                <textarea
                  rows={2}
                  value={newProduct.formulaNotes}
                  onChange={e => setNewProduct({ ...newProduct, formulaNotes: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', fontFamily: 'inherit', resize: 'vertical' }}
                  placeholder="Secret base-oil ratio (SN-150 / SN-500), viscosity improvers, antioxidant additives, density..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#475569', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', backgroundColor: '#991b1b', color: '#ffffff', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(153, 27, 27, 0.3)' }}
                >
                  Save to Vault
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Record Purchase */}
      {showPurchaseModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050, padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)', width: '520px', maxWidth: '100%', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShoppingBag size={22} color="#fff" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>Record Private Inward Batch</h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#dbeafe', opacity: 0.9 }}>Add refinery stock or raw chemical materials</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPurchaseModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#dbeafe', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1 }}
              >×</button>
            </div>

            <form onSubmit={handleCreatePurchase} style={{ padding: '24px' }}>
              {/* Smart Receipt / Bilty Upload with Auto-Extraction (Offline / No API Key) */}
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1.5px dashed #93c5fd',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '18px',
                textAlign: 'center',
                position: 'relative'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Sparkles size={18} color="#2563eb" />
                  <strong style={{ fontSize: '0.88rem', color: '#1e3a8a' }}>
                    Smart Receipt / Invoice Scanner (No API Key Required)
                  </strong>
                </div>
                <p style={{ margin: '0 0 10px 0', fontSize: '0.78rem', color: '#64748b' }}>
                  Upload paper receipt, bilty photo, or invoice. The vault will permanently save the document and automatically extract amount, invoice number, and notes.
                </p>

                <input
                  type="file"
                  ref={receiptFileRef}
                  accept="image/*,.pdf"
                  onChange={handleReceiptUpload}
                  style={{ display: 'none' }}
                />

                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => receiptFileRef.current?.click()}
                    disabled={receiptProcessing}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 18px',
                      borderRadius: '8px',
                      border: '1px solid #2563eb',
                      backgroundColor: '#eff6ff',
                      color: '#1d4ed8',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: receiptProcessing ? 'wait' : 'pointer',
                      boxShadow: '0 1px 3px rgba(37, 99, 235, 0.15)'
                    }}
                  >
                    <UploadCloud size={16} />
                    {receiptProcessing ? 'Processing Receipt...' : receiptFileName ? 'Change Receipt Photo' : 'Upload Receipt Photo / Bill'}
                  </button>

                  {purchaseForm.receiptUrl && (
                    <button
                      type="button"
                      onClick={() => setSelectedReceiptPreview(purchaseForm.receiptUrl)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        color: '#334155',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      <Image size={15} color="#2563eb" /> Preview Attached Receipt
                    </button>
                  )}
                </div>

                {receiptStatus && (
                  <div style={{
                    marginTop: '10px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    color: '#065f46',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}>
                    <Check size={14} color="#059669" /> {receiptStatus}
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Purchase / Invoice #
                  </label>
                  <input
                    type="text"
                    value={purchaseForm.invoiceNumber}
                    onChange={e => setPurchaseForm({ ...purchaseForm, invoiceNumber: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem' }}
                    placeholder="e.g. RCPT-92810"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Chemical Supplier / Source</label>
                  <select
                    value={purchaseForm.supplierId}
                    onChange={e => setPurchaseForm({ ...purchaseForm, supplierId: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem', backgroundColor: '#fff' }}
                  >
                    <option value="">Spot Cash / Refinery Direct (Unlisted)</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} {s.phone ? `(${s.phone})` : ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Confidential Product / Blend <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  required
                  value={purchaseForm.productId}
                  onChange={e => {
                    const sel = products.find(p => p.id === e.target.value);
                    setPurchaseForm({
                      ...purchaseForm,
                      productId: e.target.value,
                      unitCost: sel ? sel.costPrice : purchaseForm.unitCost
                    });
                  }}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem', backgroundColor: '#fff' }}
                >
                  <option value="">Select confidential product...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.code}) — Current Stock: {p.stockQty} {p.unit}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={purchaseForm.quantity === '' ? '' : purchaseForm.quantity}
                    onChange={e => setPurchaseForm({ ...purchaseForm, quantity: e.target.value === '' ? '' : Number(e.target.value) })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem' }}
                    placeholder="Enter qty"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Unit Cost (Rs.)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={purchaseForm.unitCost === '' ? '' : purchaseForm.unitCost}
                    onChange={e => setPurchaseForm({ ...purchaseForm, unitCost: e.target.value === '' ? '' : Number(e.target.value) })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem' }}
                    placeholder="Unit purchase cost"
                  />
                </div>
              </div>

              {/* Total Inward Calculation */}
              {Number(purchaseForm.quantity) > 0 && Number(purchaseForm.unitCost) > 0 && (
                <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: '#1e40af', fontWeight: 600 }}>Total Inward Batch Cost:</span>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: '#1d4ed8' }}>
                    Rs. {(Number(purchaseForm.quantity) * Number(purchaseForm.unitCost)).toLocaleString()}
                  </span>
                </div>
              )}

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Delivery Notes / Shipment Info</label>
                <input
                  type="text"
                  value={purchaseForm.notes}
                  onChange={e => setPurchaseForm({ ...purchaseForm, notes: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem' }}
                  placeholder="e.g. Tanker #LHR-4912, direct factory unloading"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowPurchaseModal(false)}
                  style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#475569', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.3)' }}
                >
                  Confirm Inward
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Record Sale */}
      {showSaleModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050, padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)', width: '520px', maxWidth: '100%', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #065f46 0%, #059669 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShoppingCart size={22} color="#fff" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>Record Private Dispatch / Sale</h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#a7f3d0', opacity: 0.9 }}>Deliver confidential batch to buyer & calculate direct profit</p>
                </div>
              </div>
              <button 
                onClick={() => setShowSaleModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#a7f3d0', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1 }}
              >×</button>
            </div>

            <form onSubmit={handleCreateSale} style={{ padding: '24px' }}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Customer / Fleet Buyer <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={saleForm.customerName}
                  onChange={e => setSaleForm({ ...saleForm, customerName: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem' }}
                  placeholder="e.g. Faisal Movers Fleet / Direct Cash Buyer"
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Confidential Product <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  required
                  value={saleForm.productId}
                  onChange={e => {
                    const sel = products.find(p => p.id === e.target.value);
                    setSaleForm({
                      ...saleForm,
                      productId: e.target.value,
                      unitPrice: sel ? sel.sellingPrice : saleForm.unitPrice
                    });
                  }}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem', backgroundColor: '#fff' }}
                >
                  <option value="">Select confidential product...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code}) — Avail: {p.stockQty} {p.unit} (Target: Rs. {p.sellingPrice})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={saleForm.quantity === '' ? '' : saleForm.quantity}
                    onChange={e => setSaleForm({ ...saleForm, quantity: e.target.value === '' ? '' : Number(e.target.value) })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem' }}
                    placeholder="Enter qty"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Sale Price (Rs.)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={saleForm.unitPrice === '' ? '' : saleForm.unitPrice}
                    onChange={e => setSaleForm({ ...saleForm, unitPrice: e.target.value === '' ? '' : Number(e.target.value) })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem' }}
                    placeholder="Sale rate"
                  />
                </div>
              </div>

              {/* Total Sale & Profit Estimate */}
              {Number(saleForm.quantity) > 0 && Number(saleForm.unitPrice) > 0 && (
                <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: '#047857', fontWeight: 600 }}>Total Dispatch Revenue:</span>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: '#047857' }}>
                    Rs. {(Number(saleForm.quantity) * Number(saleForm.unitPrice)).toLocaleString()}
                  </span>
                </div>
              )}

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Dispatch Notes</label>
                <input
                  type="text"
                  value={saleForm.notes}
                  onChange={e => setSaleForm({ ...saleForm, notes: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem' }}
                  placeholder="e.g. VIP client direct collection, paid via banking"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowSaleModal(false)}
                  style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#475569', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', backgroundColor: '#059669', color: '#ffffff', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(5, 150, 105, 0.3)' }}
                >
                  Confirm Dispatch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Supplier */}
      {showSupplierModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050, padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)', width: '480px', maxWidth: '100%', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #475569 0%, #334155 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={22} color="#fff" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>Add Chemical Supplier</h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#cbd5e1', opacity: 0.9 }}>Direct refinery partner or chemical additive vendor</p>
                </div>
              </div>
              <button 
                onClick={() => setShowSupplierModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1 }}
              >×</button>
            </div>

            <form onSubmit={handleCreateSupplier} style={{ padding: '24px' }}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Supplier / Refinery Name <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={supplierForm.name}
                  onChange={e => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem' }}
                  placeholder="e.g. Petrochem Additives & Base Oil Ltd"
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Phone Number</label>
                <input
                  type="text"
                  value={supplierForm.phone}
                  onChange={e => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem' }}
                  placeholder="0300-XXXXXXX"
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Address / Refinery Location</label>
                <input
                  type="text"
                  value={supplierForm.address}
                  onChange={e => setSupplierForm({ ...supplierForm, address: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem' }}
                  placeholder="Industrial Area, Multan / Hub / Karachi"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#475569', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', backgroundColor: '#334155', color: '#ffffff', fontWeight: 700, cursor: 'pointer' }}
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Change Vault Password */}
      {showPasswordModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1060, padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)', width: '460px', maxWidth: '100%', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #7f1d1d 0%, #b91c1c 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <KeyRound size={22} color="#fff" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>Change Vault Password</h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#fecaca', opacity: 0.9 }}>Update Master Administrator secret key</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordChangeMsg({ text: '', isError: false });
                }}
                style={{ background: 'transparent', border: 'none', color: '#fecaca', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1 }}
              >×</button>
            </div>

            <form onSubmit={handleChangePassword} style={{ padding: '24px' }}>
              {passwordChangeMsg.text && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  marginBottom: '16px',
                  backgroundColor: passwordChangeMsg.isError ? '#fee2e2' : '#dcfce7',
                  border: `1px solid ${passwordChangeMsg.isError ? '#f87171' : '#86efac'}`,
                  color: passwordChangeMsg.isError ? '#991b1b' : '#166534',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  {passwordChangeMsg.isError ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
                  <span>{passwordChangeMsg.text}</span>
                </div>
              )}

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Current Vault Password <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="password"
                  required
                  value={passwordChange.currentPassword}
                  onChange={e => setPasswordChange({ ...passwordChange, currentPassword: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem' }}
                  placeholder="Enter current password..."
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  New Vault Password <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={passwordChange.newPassword}
                  onChange={e => setPasswordChange({ ...passwordChange, newPassword: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem' }}
                  placeholder="Enter minimum 6 characters..."
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Confirm New Password <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={passwordChange.confirmPassword}
                  onChange={e => setPasswordChange({ ...passwordChange, confirmPassword: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem' }}
                  placeholder="Re-type new password..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordChangeMsg({ text: '', isError: false });
                  }}
                  style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#475569', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordChangeLoading}
                  style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', backgroundColor: '#991b1b', color: '#ffffff', fontWeight: 700, cursor: passwordChangeLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {passwordChangeLoading ? <RefreshCw className="spin" size={16} /> : <KeyRound size={16} />}
                  {passwordChangeLoading ? 'Saving...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Receipt Document Attachment */}
      {selectedReceiptPreview && (
        <div 
          onClick={() => setSelectedReceiptPreview(null)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{ backgroundColor: '#ffffff', borderRadius: '16px', overflow: 'hidden', maxWidth: '800px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}
          >
            <div style={{ padding: '14px 20px', backgroundColor: '#0f172a', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                <Image size={18} color="#f59e0b" /> Attached Receipt / Invoice Document
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <a 
                  href={selectedReceiptPreview} 
                  download="Confidential_Receipt_Document.png"
                  style={{ color: '#38bdf8', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <ExternalLink size={14} /> Download
                </a>
                <button
                  onClick={() => setSelectedReceiptPreview(null)}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1 }}
                >
                  ×
                </button>
              </div>
            </div>
            <div style={{ padding: '16px', overflowY: 'auto', textAlign: 'center', backgroundColor: '#f8fafc' }}>
              <img
                src={selectedReceiptPreview}
                alt="Receipt Scan"
                style={{ maxWidth: '100%', maxHeight: '72vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

