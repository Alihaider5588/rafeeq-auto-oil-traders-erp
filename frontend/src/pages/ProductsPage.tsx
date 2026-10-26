import React, { useEffect, useState } from 'react';
import api, { getMediaUrl } from '../services/api';
import { Product, Category, Unit } from '../types';
import { 
  Package, Plus, Search, AlertCircle, Check, Edit2, Sliders, 
  FolderPlus, Upload, Globe, BookOpen, Layers, ArrowRight, Eye, RefreshCw, Trash2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ProductsPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdjustStockModal, setShowAdjustStockModal] = useState(false);
  const [selectedProductForStock, setSelectedProductForStock] = useState<Product | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitSymbol, setNewUnitSymbol] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    categoryId: '',
    brand: '',
    unitId: '', // Secondary / Base unit
    primaryUnitId: '', // Bulk / Packaging unit (e.g., Carton)
    conversionFactor: '1',
    purchasePrice: '',
    salePrice: '',
    wholesalePrice: '',
    minimumStockLevel: '5',
    openingStock: '0',
    description: '',
    specifications: '',
    imageUrl: '',
    showOnWebsite: true,
    showInCatalog: true,
    showPublicPrice: true,
    isActive: true,
  });

  const [modalError, setModalError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [imageUploading, setImageUploading] = useState(false);

  // Stock Adjust Form
  const [stockAdjustData, setStockAdjustData] = useState({
    type: 'ADD', // 'SET' or 'ADD'
    quantity: '',
    notes: ''
  });

  // Top Page Operation Notification Banners
  const [operationError, setOperationError] = useState('');
  const [operationSuccess, setOperationSuccess] = useState('');

  const triggerOperationError = (msg: string) => {
    setOperationError(msg);
    setOperationSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const triggerOperationSuccess = (msg: string) => {
    setOperationSuccess(msg);
    setOperationError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Category Manage Form
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  useEffect(() => {
    loadProducts();
    loadMetadata();
  }, [selectedCategory]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/products', {
        params: { search, categoryId: selectedCategory || undefined, limit: 2000 },
      });
      setProducts(res.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const DEFAULT_FALLBACK_UNITS: Unit[] = [
    // Primary / Bulk Units
    { id: 'carton-default', name: 'CARTONS', symbol: 'Ctn' },
    { id: 'box-default', name: 'BOX', symbol: 'Box' },
    { id: 'drum-default', name: 'DRUM (208L)', symbol: 'Drum' },
    { id: 'barrel-default', name: 'BARREL', symbol: 'Brl' },
    { id: 'crate-default', name: 'CRATE', symbol: 'Crt' },
    { id: 'pail-default', name: 'PAIL (Buckets)', symbol: 'Pail' },
    { id: 'pack-default', name: 'PACK (Bundle)', symbol: 'Pack' },
    { id: 'bag-default', name: 'BAG', symbol: 'Bag' },
    { id: 'bale-default', name: 'BALE', symbol: 'Bale' },

    // Secondary / Retail / Sub-units
    { id: 'dozen-default', name: 'DOZENS', symbol: 'Dzn' },
    { id: 'bottle-default', name: 'BOTTLE', symbol: 'Btl' },
    { id: 'can-default', name: 'CAN', symbol: 'Can' },
    { id: 'piece-default', name: 'PIECES', symbol: 'Pcs' },
    { id: 'liter-default', name: 'LITERS', symbol: 'Ltr' },
    { id: 'milliliter-default', name: 'MILLILITERS', symbol: 'ml' },
    { id: 'kilogram-default', name: 'KILOGRAM', symbol: 'Kg' },
    { id: 'gram-default', name: 'GRAM', symbol: 'Gm' },
    { id: 'tin-default', name: 'TIN', symbol: 'Tin' },
    { id: 'jar-default', name: 'JAR', symbol: 'Jar' },
    { id: 'tube-default', name: 'TUBE', symbol: 'Tube' },
    { id: 'gallon-default', name: 'GALLON', symbol: 'Gal' },
    { id: 'meter-default', name: 'METER', symbol: 'Mtr' },
    { id: 'set-default', name: 'SET', symbol: 'Set' },
    { id: 'roll-default', name: 'ROLL', symbol: 'Roll' }
  ];


  const loadMetadata = async () => {
    try {
      const [cRes, uRes] = await Promise.all([
        api.get('/products/meta/categories').catch(() => ({ data: { categories: [] } })),
        api.get('/products/meta/units').catch(() => ({ data: { units: [] } })),
      ]);
      const fetchedCats = cRes.data?.categories || [];
      const fetchedUnits = uRes.data?.units || [];

      setCategories(fetchedCats);
      if (fetchedUnits.length > 0) {
        setUnits(fetchedUnits);
      } else {
        setUnits(DEFAULT_FALLBACK_UNITS);
      }
    } catch (e) {
      console.error('Failed to load metadata', e);
      setUnits(DEFAULT_FALLBACK_UNITS);
    }
  };

  const handleOpenAdd = () => {
    loadMetadata();
    setIsEditing(false);
    setEditingId(null);
    const activeUnits = units.length > 0 ? units : DEFAULT_FALLBACK_UNITS;
    setFormData({
      name: '',
      sku: '',
      categoryId: categories[0]?.id || '',
      brand: '',
      unitId: activeUnits[0]?.id || '',
      primaryUnitId: '',
      conversionFactor: '1',
      purchasePrice: '',
      salePrice: '',
      wholesalePrice: '',
      minimumStockLevel: '5',
      openingStock: '0',
      description: '',
      specifications: '',
      imageUrl: '',
      showOnWebsite: true,
      showInCatalog: true,
      showPublicPrice: true,
      isActive: true,
    });
    setModalError('');
    setFieldErrors({});
    setShowAddEditModal(true);
  };


  const handleOpenEdit = (prod: Product) => {
    setIsEditing(true);
    setEditingId(prod.id);
    setFormData({
      name: prod.name,
      sku: prod.sku,
      categoryId: prod.categoryId,
      brand: prod.brand,
      unitId: prod.unitId,
      primaryUnitId: prod.primaryUnitId || '',
      conversionFactor: String(prod.conversionFactor || 1),
      purchasePrice: String(prod.purchasePrice),
      salePrice: String(prod.salePrice),
      wholesalePrice: prod.wholesalePrice ? String(prod.wholesalePrice) : '',
      minimumStockLevel: String(prod.minimumStockLevel),
      openingStock: String(prod.currentStock),
      description: prod.description || '',
      specifications: prod.specifications || '',
      imageUrl: prod.imageUrl || '',
      showOnWebsite: prod.showOnWebsite ?? true,
      showInCatalog: prod.showInCatalog ?? true,
      showPublicPrice: prod.showPublicPrice ?? true,
      isActive: prod.isActive ?? true,
    });
    setModalError('');
    setFieldErrors({});
    setShowAddEditModal(true);
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const data = new FormData();
    data.append('image', file);

    try {
      setImageUploading(true);
      const res = await api.post('/products/upload-image', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.imageUrl) {
        setFormData(prev => ({ ...prev, imageUrl: res.data.imageUrl }));
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to upload image. Allowed formats: PNG, JPG, WebP under 5MB.');
    } finally {
      setImageUploading(false);
    }
  };

  const handleDeleteProduct = async (prod: Product) => {
    const confirmed = window.confirm(
      `⚠️ KYA AAP IS PRODUCT KO DATABASE AUR POS SE PERMANENTLY DELETE KARNA CHAHTE HAIN?\n\n"${prod.name}" (${prod.sku})\n\nIs product ka tamam stock aur catalog record mukammal delete ho jaye ga.`
    );
    if (!confirmed) return;

    try {
      setLoading(true);
      const res = await api.delete(`/products/${prod.id}`);
      triggerOperationSuccess(res.data.message || `Product "${prod.name}" database aur POS se permanently delete ho chuka hai!`);
      loadProducts();
    } catch (err: any) {
      triggerOperationError(err.response?.data?.message || 'Product delete nahi ho saka. Barah-e-karam dobara koshish karein.');
    } finally {
      setLoading(false);
    }
  };

  const renderFieldErrorTag = (fieldName: string) => {
    if (!fieldErrors[fieldName]) return null;
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        backgroundColor: '#fee2e2',
        color: '#b91c1c',
        padding: '3px 8px',
        borderRadius: '6px',
        fontSize: '0.74rem',
        fontWeight: 700,
        marginTop: '4px',
        border: '1px solid #fca5a5'
      }}>
        <span>⚠️ yaha par mistake ho rai ha:</span> {fieldErrors[fieldName]}
      </div>
    );
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    setFieldErrors({});

    try {
      const pPrice = parseFloat(formData.purchasePrice);
      const sPrice = parseFloat(formData.salePrice);
      const wPrice = formData.wholesalePrice ? parseFloat(formData.wholesalePrice) : undefined;
      const minStock = parseFloat(formData.minimumStockLevel);
      const opStock = parseFloat(formData.openingStock);

      const errors: Record<string, string> = {};
      if (!formData.name.trim()) {
        errors.name = 'Product name lazmi hai, khali nahi chora ja sakta';
      }
      if (!formData.sku.trim()) {
        errors.sku = 'SKU / Code lazmi hai';
      }
      if (!formData.brand.trim()) {
        errors.brand = 'Brand / Company name lazmi hai';
      }
      if (!formData.categoryId) {
        errors.categoryId = 'Category select karna lazmi hai';
      }
      if (!formData.unitId) {
        errors.unitId = 'Base unit select karna lazmi hai';
      }
      if (isNaN(pPrice) || pPrice < 0) {
        errors.purchasePrice = 'Purchase price durust enter karein (0 ya is se barhi raqam)';
      }
      if (isNaN(sPrice) || sPrice < 0) {
        errors.salePrice = 'Retail sale rate durust enter karein (0 ya is se barhi raqam)';
      }
      if (formData.primaryUnitId && (Number(formData.conversionFactor) < 1 || isNaN(Number(formData.conversionFactor)))) {
        errors.conversionFactor = 'Conversion rate 1 ya is se barha hona chahiye';
      }

      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        setModalError('Form me mistakes hain! Har mistake wale box ke upar tag check karein.');
        return;
      }

      const payload: any = {
        name: formData.name.trim(),
        sku: formData.sku.trim(),
        categoryId: formData.categoryId,
        brand: formData.brand.trim(),
        unitId: formData.unitId,
        primaryUnitId: formData.primaryUnitId || undefined,
        conversionFactor: Number(formData.conversionFactor) || 1,
        purchasePrice: pPrice,
        salePrice: sPrice,
        wholesalePrice: wPrice !== undefined && !isNaN(wPrice) ? wPrice : undefined,
        minimumStockLevel: !isNaN(minStock) ? minStock : 5,
        description: formData.description?.trim() || '',
        specifications: formData.specifications?.trim() || '',
        imageUrl: formData.imageUrl?.trim() || '',
        showOnWebsite: formData.showOnWebsite,
        showInCatalog: formData.showInCatalog,
        showPublicPrice: formData.showPublicPrice,
        isActive: formData.isActive,
      };

      if (isEditing && editingId) {
        payload.currentStock = !isNaN(opStock) ? opStock : 0;
        await api.put(`/products/${editingId}`, payload);
      } else {
        payload.openingStock = !isNaN(opStock) ? opStock : 0;
        await api.post('/products', payload);
      }

      setShowAddEditModal(false);
      triggerOperationSuccess(isEditing ? `Product "${formData.name}" kamyabi se update ho gaya!` : `Naya Product "${formData.name}" kamyabi se add ho gaya!`);
      loadProducts();
    } catch (err: any) {
      const resp = err.response?.data;
      let msg = resp?.message || resp?.error;
      const serverFieldErrors: Record<string, string> = {};

      if (resp?.errors?.fieldErrors) {
        Object.entries(resp.errors.fieldErrors).forEach(([f, list]: [string, any]) => {
          serverFieldErrors[f] = list?.[0] || 'Invalid value';
        });
      }
      if (msg && msg.toLowerCase().includes('sku')) {
        serverFieldErrors.sku = 'Yeh SKU pehle se registered hai! Koi doosra unique code enter karein.';
      }
      if (Object.keys(serverFieldErrors).length > 0) {
        setFieldErrors(serverFieldErrors);
      }
      setModalError(msg || 'Failed to save product');
      triggerOperationError(msg || 'Product save nahi ho saka. Barah-e-karam details check karein.');
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForStock || !stockAdjustData.quantity) return;

    try {
      const qty = parseFloat(stockAdjustData.quantity);
      let newStock = Number(selectedProductForStock.currentStock);

      if (stockAdjustData.type === 'SET') {
        newStock = qty;
      } else if (stockAdjustData.type === 'ADD') {
        newStock += qty;
      } else if (stockAdjustData.type === 'SUBTRACT') {
        newStock -= qty;
      }

      await api.post(`/products/${selectedProductForStock.id}/adjust-stock`, {
        newStock,
        notes: stockAdjustData.notes || `Stock audit adjustment (${stockAdjustData.type})`
      });

      setShowAdjustStockModal(false);
      setSelectedProductForStock(null);
      setStockAdjustData({ type: 'ADD', quantity: '', notes: '' });
      triggerOperationSuccess(`"${selectedProductForStock.name}" ka stock kamyabi se update ho gaya! (Naya Stock: ${newStock})`);
      loadProducts();
    } catch (err: any) {
      triggerOperationError(err.response?.data?.message || 'Stock adjust nahi ho saka. Barah-e-karam dobara koshish karein.');
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      await api.post('/products/categories', {
        name: newCatName.trim(),
        description: newCatDesc.trim() || undefined
      });
      setNewCatName('');
      setNewCatDesc('');
      triggerOperationSuccess(`Nayi Category "${newCatName.trim()}" kamyabi se shamil ho gayi!`);
      loadMetadata();
    } catch (err: any) {
      triggerOperationError(err.response?.data?.message || 'Category shamil nahi ho saki.');
    }
  };

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitName.trim() || !newUnitSymbol.trim()) return;

    try {
      const res = await api.post('/products/units', {
        name: newUnitName.trim(),
        symbol: newUnitSymbol.trim()
      });
      if (res.data?.success && res.data.unit) {
        setUnits((prev) => [...prev, res.data.unit]);
      }
      setNewUnitName('');
      setNewUnitSymbol('');
      setShowUnitModal(false);
      triggerOperationSuccess(`Naya Packaging / Measurement Unit "${newUnitName.trim()}" shamil ho gaya!`);
      loadMetadata();
    } catch (err: any) {
      triggerOperationError(err.response?.data?.message || 'Unit shamil nahi ho saka.');
    }
  };

  const totalCatalogCost = products.reduce((acc, p) => acc + (Number(p.currentStock || 0) * Number(p.purchasePrice || 0)), 0);
  const totalCatalogUnits = products.reduce((acc, p) => acc + Number(p.currentStock || 0), 0);
  const lowStockCount = products.filter((p) => Number(p.currentStock || 0) <= Number(p.minimumStockLevel || 0)).length;

  return (
    <div>
      {/* Top Operation Failure / Success Banners */}
      {operationError && (
        <div style={{
          backgroundColor: '#fee2e2',
          border: '2px solid #ef4444',
          borderRadius: '10px',
          padding: '14px 18px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#991b1b',
          fontWeight: 700,
          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>⚠️</span>
            <div>
              <div style={{ fontSize: '0.95rem' }}>Operation Nakaam Raha:</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#b91c1c' }}>{operationError}</div>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => setOperationError('')}
            style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#991b1b', fontWeight: 900 }}
          >
            ✕
          </button>
        </div>
      )}

      {operationSuccess && (
        <div style={{
          backgroundColor: '#ecfdf5',
          border: '2px solid #10b981',
          borderRadius: '10px',
          padding: '14px 18px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#065f46',
          fontWeight: 700,
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>✅</span>
            <div>
              <div style={{ fontSize: '0.95rem' }}>Kamyabi (Operation Successful):</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#047857' }}>{operationSuccess}</div>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => setOperationSuccess('')}
            style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#065f46', fontWeight: 900 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Page Title & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>Engine Oil, Lubricant & Filter Catalog</h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0' }}>
            Multi-category product catalog, primary/secondary unit packaging (Cartons/Bottles), and public catalog sync.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setShowUnitModal(true)} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={16} /> Packaging Units
          </button>
          <button onClick={() => setShowCategoryModal(true)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FolderPlus size={16} /> Manage Categories
          </button>
          <button onClick={handleOpenAdd} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={18} /> Add New Product
          </button>
        </div>
      </div>

      {/* Real-time Inventory Valuation & Catalog KPI Banner */}
      <div className="stat-grid" style={{ marginBottom: '20px' }}>
        <div className="stat-card blue">
          <div className="stat-label">Total Catalog Products</div>
          <div className="stat-value">{products.length} Items</div>
          <div className="stat-sub">Registered oil & spare part items</div>
        </div>

        <div className="stat-card emerald">
          <div className="stat-label">Total Current Stock</div>
          <div className="stat-value">{totalCatalogUnits.toLocaleString()} Units</div>
          <div className="stat-sub">Total physical bottles/cans/pieces in shop</div>
        </div>

        <div className="stat-card purple" style={{ borderLeft: '4px solid #8b5cf6' }}>
          <div className="stat-label">Total Stock Worth (کل مال کی لاگت)</div>
          <div className="stat-value" style={{ color: '#7c3aed' }}>
            Rs. {Math.round(totalCatalogCost).toLocaleString()}
          </div>
          <div className="stat-sub">Live valuation at purchase cost price</div>
        </div>

        <div className="stat-card amber" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div className="stat-label">Low Stock / Reorder Needed</div>
          <div className="stat-value" style={{ color: lowStockCount > 0 ? '#d97706' : '#059669' }}>
            {lowStockCount} Items
          </div>
          <div className="stat-sub">
            {lowStockCount > 0 ? 'Urgent purchase inward required' : 'All stock levels healthy'}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '14px', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Search by product name, SKU or brand..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadProducts()}
            />
          </div>

          <select
            className="form-control"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <button onClick={loadProducts} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
            <Search size={16} /> Filter
          </button>

          <button onClick={() => { setSearch(''); setSelectedCategory(''); }} className="btn btn-outline" title="Reset Filters">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '60px' }}>Image</th>
              <th>SKU / Code</th>
              <th>Product Name</th>
              <th>Category & Brand</th>
              <th>Packaging / Units</th>
              <th style={{ textAlign: 'right' }}>Cost Price</th>
              <th style={{ textAlign: 'right' }}>Sale Price</th>
              <th style={{ textAlign: 'right' }}>Current Stock</th>
              <th style={{ textAlign: 'right' }}>Stock Worth (Cost)</th>
              <th style={{ textAlign: 'center' }}>Visibility</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={11} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  Loading product catalog...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                  No products found. Add products to get started.
                </td>
              </tr>
            ) : (
              products.map((p) => {
                const cost = Number(p.purchasePrice);
                const price = Number(p.salePrice);
                const stock = Number(p.currentStock);
                const minStock = Number(p.minimumStockLevel);
                const conv = Number(p.conversionFactor) || 1;
                const cartons = conv > 1 ? Math.floor(stock / conv) : 0;
                const remBottles = conv > 1 ? stock % conv : stock;

                return (
                  <tr key={p.id}>
                    <td>
                      {p.imageUrl ? (
                        <img 
                          src={getMediaUrl(p.imageUrl)} 
                          alt={p.name} 
                          onError={(e) => {
                            // fallback if broken image
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                          style={{ width: '42px', height: '42px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: '#fff' }} 
                        />
                      ) : (
                        <div style={{ width: '42px', height: '42px', borderRadius: '6px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                          <Package size={20} />
                        </div>
                      )}
                    </td>
                    <td className="font-mono" style={{ fontWeight: 700, color: '#d97706' }}>
                      {p.sku}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{p.name}</div>
                      {p.specifications && (
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{p.specifications}</div>
                      )}
                    </td>
                    <td>
                      <div><span className="badge badge-info">{p.category?.name}</span></div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{p.brand}</div>
                    </td>
                    <td>
                      {conv > 1 && p.primaryUnit ? (
                        <div>
                          <span style={{ fontWeight: 700, color: '#1e293b' }}>
                            1 {p.primaryUnit.name} = {conv} {p.unit?.symbol || 'Pcs'}
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          Standard ({p.unit?.name || 'Unit'})
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', color: '#475569' }}>
                      Rs. {cost.toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                      Rs. {price.toLocaleString()}
                      {p.wholesalePrice ? (
                        <div style={{ fontSize: '0.7rem', color: '#d97706' }}>
                          WS: Rs. {Number(p.wholesalePrice).toLocaleString()}
                        </div>
                      ) : null}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800 }}>
                      <div style={{ color: stock <= 0 ? '#dc2626' : stock <= minStock ? '#d97706' : '#059669' }}>
                        {stock} {p.unit?.symbol || ''}
                      </div>
                      {conv > 1 && p.primaryUnit && stock > 0 && (
                        <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>
                          ({cartons} {p.primaryUnit.symbol} {remBottles > 0 ? `+ ${remBottles} ${p.unit?.symbol}` : ''})
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800 }}>
                      <div style={{ color: stock * cost > 0 ? '#1d4ed8' : '#94a3b8', fontSize: '0.92rem' }}>
                        Rs. {Math.round(stock * cost).toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500 }}>
                        {stock} {p.unit?.symbol || 'Pcs'} × Rs. {cost.toLocaleString()}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                        {p.showOnWebsite ? (
                          <span title="Visible on Public Website" style={{ color: '#059669', fontSize: '0.75rem' }}>
                            <Globe size={15} />
                          </span>
                        ) : null}
                        {p.showInCatalog ? (
                          <span title="Included in PDF Catalogue" style={{ color: '#d97706', fontSize: '0.75rem' }}>
                            <BookOpen size={15} />
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="btn btn-outline"
                          style={{ padding: '5px 8px' }}
                          title="Edit Product"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedProductForStock(p);
                            setStockAdjustData({ type: 'ADD', quantity: '', notes: '' });
                            setShowAdjustStockModal(true);
                          }}
                          className="btn btn-outline"
                          style={{ padding: '5px 8px' }}
                          title="Audit Stock Adjustment"
                        >
                          <Sliders size={14} />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteProduct(p)}
                            className="btn btn-outline"
                            style={{ padding: '5px 8px', color: '#ef4444', borderColor: '#fca5a5' }}
                            title="Permanently Delete Product from POS & DB (Admin only)"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Add / Edit Product */}
      {showAddEditModal && (
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
            maxWidth: '750px',
            padding: '28px',
            maxHeight: '92vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                {isEditing ? 'Edit Lubricant / Product' : 'Add New Product to Catalog'}
              </h2>
              <button
                onClick={() => setShowAddEditModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            {modalError && (
              <div style={{
                backgroundColor: '#fee2e2',
                color: '#991b1b',
                padding: '10px 14px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '0.85rem'
              }}>
                {modalError}
              </div>
            )}

            <form onSubmit={handleSaveProduct}>
              {/* Product Basic Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label className="form-label">Product Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Total Quartz 9000 5W-40 (4L)"
                    style={{ ...(fieldErrors.name ? { border: '2px solid #ef4444', backgroundColor: '#fef2f2' } : {}) }}
                    value={formData.name}
                    onChange={(e) => {
                      if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: '' }));
                      setFormData({ ...formData, name: e.target.value });
                    }}
                    required
                  />
                  {renderFieldErrorTag('name')}
                </div>

                <div>
                  <label className="form-label">SKU / Code *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. TOT-9000-4L"
                    style={{ ...(fieldErrors.sku ? { border: '2px solid #ef4444', backgroundColor: '#fef2f2' } : {}) }}
                    value={formData.sku}
                    onChange={(e) => {
                      if (fieldErrors.sku) setFieldErrors(prev => ({ ...prev, sku: '' }));
                      setFormData({ ...formData, sku: e.target.value });
                    }}
                    required
                  />
                  {renderFieldErrorTag('sku')}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label className="form-label">Brand / Company *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Total Energies, Shell, Guard"
                    style={{ ...(fieldErrors.brand ? { border: '2px solid #ef4444', backgroundColor: '#fef2f2' } : {}) }}
                    value={formData.brand}
                    onChange={(e) => {
                      if (fieldErrors.brand) setFieldErrors(prev => ({ ...prev, brand: '' }));
                      setFormData({ ...formData, brand: e.target.value });
                    }}
                    required
                  />
                  {renderFieldErrorTag('brand')}
                </div>

                <div>
                  <label className="form-label">Category *</label>
                  <select
                    className="form-control"
                    style={{ ...(fieldErrors.categoryId ? { border: '2px solid #ef4444', backgroundColor: '#fef2f2' } : {}) }}
                    value={formData.categoryId}
                    onChange={(e) => {
                      if (fieldErrors.categoryId) setFieldErrors(prev => ({ ...prev, categoryId: '' }));
                      setFormData({ ...formData, categoryId: e.target.value });
                    }}
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {renderFieldErrorTag('categoryId')}
                </div>
              </div>

              {/* Unit & Packaging Section */}
              {/* Unit & Packaging Section - Modeled after user screenshot */}
              <div style={{ backgroundColor: '#f0f9ff', padding: '16px', borderRadius: '12px', border: '1px solid #bae6fd', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Layers size={17} color="#0284c7" /> Packaging & Unit Conversion (Primary & Secondary Units)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setShowUnitModal(true)}
                      style={{
                        background: '#e0f2fe',
                        border: '1px solid #7dd3fc',
                        color: '#0284c7',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      + Add Custom Unit
                    </button>
                    {formData.primaryUnitId && (
                      <span style={{ fontSize: '0.78rem', backgroundColor: '#e0f2fe', color: '#0369a1', fontWeight: 800, padding: '3px 10px', borderRadius: '20px', border: '1px solid #7dd3fc' }}>
                        1 {units.find(u => u.id === formData.primaryUnitId)?.name || 'PRIMARY'} = {formData.conversionFactor || 1} {units.find(u => u.id === formData.unitId)?.name || 'SECONDARY'}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '12px' }}>
                  {/* Primary Unit First (e.g. CARTONS) */}
                  <div>
                    <label className="form-label" style={{ fontWeight: 700, color: '#0c4a6e' }}>
                      Primary Unit (Carton / Box / Drum)
                    </label>
                    <select
                      className="form-control"
                      value={formData.primaryUnitId}
                      onChange={(e) => setFormData({ ...formData, primaryUnitId: e.target.value })}
                      style={{ backgroundColor: '#ffffff', borderColor: '#7dd3fc' }}
                    >
                      <option value="">None (Single Base Unit Only)</option>
                      {units.map((u) => (
                        <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>
                      ))}
                    </select>
                    <small style={{ color: '#0284c7', fontSize: '0.72rem' }}>e.g. CARTONS (Ctn), BOX (Box), DRUM (Drm)</small>
                  </div>

                  {/* Secondary Unit Second (e.g. DOZENS / BOTTLES / PIECES) */}
                  <div>
                    <label className="form-label" style={{ fontWeight: 700, color: '#0c4a6e' }}>
                      Secondary / Base Unit (Bottles / Pcs / Litres) *
                    </label>
                    <select
                      className="form-control"
                      value={formData.unitId}
                      onChange={(e) => {
                        if (fieldErrors.unitId) setFieldErrors(prev => ({ ...prev, unitId: '' }));
                        setFormData({ ...formData, unitId: e.target.value });
                      }}
                      required
                      style={{
                        backgroundColor: '#ffffff',
                        borderColor: fieldErrors.unitId ? '#ef4444' : '#7dd3fc',
                        ...(fieldErrors.unitId ? { border: '2px solid #ef4444', backgroundColor: '#fef2f2' } : {})
                      }}
                    >
                      <option value="">Select Base Unit</option>
                      {units.map((u) => (
                        <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>
                      ))}
                    </select>
                    {renderFieldErrorTag('unitId')}
                    <small style={{ color: '#0284c7', fontSize: '0.72rem' }}>e.g. DOZENS (Dzn), BOTTLE (Btl), PIECE (Pc)</small>
                  </div>
                </div>

                {/* Conversion Rate Setup (1 to 500) */}
                {formData.primaryUnitId && (
                  <div style={{ backgroundColor: '#ffffff', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e0f2fe' }}>
                    <label className="form-label" style={{ fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                      Select Conversion Rate (1 to 500)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                        1 {units.find(u => u.id === formData.primaryUnitId)?.symbol || 'PRIMARY'} =
                      </span>
                      <input
                        type="number"
                        min="1"
                        max="500"
                        className="form-control"
                        placeholder="e.g. 25"
                        style={{
                          width: '130px',
                          fontWeight: 800,
                          fontSize: '1rem',
                          color: '#0369a1',
                          borderColor: fieldErrors.conversionFactor ? '#ef4444' : '#0284c7',
                          ...(fieldErrors.conversionFactor ? { border: '2px solid #ef4444', backgroundColor: '#fef2f2' } : {})
                        }}
                        value={formData.conversionFactor === '0' ? '' : formData.conversionFactor}
                        onChange={(e) => {
                          if (fieldErrors.conversionFactor) setFieldErrors(prev => ({ ...prev, conversionFactor: '' }));
                          const val = e.target.value;
                          setFormData({ ...formData, conversionFactor: val });
                        }}
                      />
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                        {units.find(u => u.id === formData.unitId)?.symbol || 'SECONDARY'}
                      </span>
                      <small style={{ color: '#64748b', fontSize: '0.75rem', marginLeft: 'auto' }}>
                        (Enter 1 to 500 items per carton/box)
                      </small>
                    </div>
                    {renderFieldErrorTag('conversionFactor')}
                  </div>
                )}
              </div>

              {/* Pricing Section */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Purchase / Cost Price (Rs.) * <span style={{ color: '#dc2626', fontSize: '0.72rem' }}>(🔒 Private)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    placeholder="e.g. 6200"
                    style={{ ...(fieldErrors.purchasePrice ? { border: '2px solid #ef4444', backgroundColor: '#fef2f2' } : {}) }}
                    value={formData.purchasePrice === '0' ? '' : formData.purchasePrice}
                    onChange={(e) => {
                      if (fieldErrors.purchasePrice) setFieldErrors(prev => ({ ...prev, purchasePrice: '' }));
                      setFormData({ ...formData, purchasePrice: e.target.value });
                    }}
                    required
                  />
                  {renderFieldErrorTag('purchasePrice')}
                  <small style={{ color: '#64748b', fontSize: '0.72rem', display: 'block', marginTop: '3px' }}>
                    Sirf internal cost k liye hai, public ko nahi dikhayi jati.
                  </small>
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Retail Sale Rate (Rs.) * <span style={{ color: '#16a34a', fontSize: '0.72rem' }}>(🌐 Public)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    placeholder="e.g. 7500"
                    style={{ ...(fieldErrors.salePrice ? { border: '2px solid #ef4444', backgroundColor: '#fef2f2' } : {}) }}
                    value={formData.salePrice === '0' ? '' : formData.salePrice}
                    onChange={(e) => {
                      if (fieldErrors.salePrice) setFieldErrors(prev => ({ ...prev, salePrice: '' }));
                      setFormData({ ...formData, salePrice: e.target.value });
                    }}
                    required
                  />
                  {renderFieldErrorTag('salePrice')}
                  <small style={{ color: '#059669', fontSize: '0.72rem', display: 'block', marginTop: '3px' }}>
                    Yeh counter aur public website par display honi wali price hai.
                  </small>
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Wholesale Rate (Rs.) <span style={{ color: '#d97706', fontSize: '0.72rem' }}>(🔒 Private - B2B)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    placeholder="e.g. 6800"
                    style={{ ...(fieldErrors.wholesalePrice ? { border: '2px solid #ef4444', backgroundColor: '#fef2f2' } : {}) }}
                    value={formData.wholesalePrice === '0' ? '' : formData.wholesalePrice}
                    onChange={(e) => {
                      if (fieldErrors.wholesalePrice) setFieldErrors(prev => ({ ...prev, wholesalePrice: '' }));
                      setFormData({ ...formData, wholesalePrice: e.target.value });
                    }}
                  />
                  {renderFieldErrorTag('wholesalePrice')}
                  <small style={{ color: '#64748b', fontSize: '0.72rem', display: 'block', marginTop: '3px' }}>
                    Wholesale rate public website par show nahi hota.
                  </small>
                </div>
              </div>

              {/* Stock Alerts & Available Stock */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label className="form-label">Minimum Stock Alert</label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.minimumStockLevel}
                    onChange={(e) => setFormData({ ...formData, minimumStockLevel: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ color: '#0284c7', fontWeight: 700 }}>
                    {isEditing ? 'Available Physical Stock (Current)' : 'Opening / Available Stock *'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    placeholder="e.g. 50"
                    style={{ borderColor: '#38bdf8', backgroundColor: '#f0f9ff', fontWeight: 700 }}
                    value={formData.openingStock}
                    onChange={(e) => setFormData({ ...formData, openingStock: e.target.value })}
                  />
                  <small style={{ color: '#64748b', fontSize: '0.75rem' }}>
                    Current inventory in {units.find(u => u.id === formData.unitId)?.symbol || 'Base Units'}
                  </small>
                </div>
              </div>

              {/* Specs & Description */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label className="form-label">Specifications (Viscosity / Standards)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. SAE 5W-40, API SP, 4 Litres Can"
                    value={formData.specifications}
                    onChange={(e) => setFormData({ ...formData, specifications: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label">Product Description</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Brief description for catalog..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>

              {/* Image Upload */}
              <div style={{ marginBottom: '14px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Upload size={16} /> Product Image (Local / Object Persistent Storage)
                </label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    style={{ fontSize: '0.85rem' }}
                  />
                  {imageUploading && <span style={{ fontSize: '0.8rem', color: '#d97706' }}>Uploading...</span>}
                  {formData.imageUrl && (
                    <img 
                      src={getMediaUrl(formData.imageUrl)} 
                      alt="Preview" 
                      style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #cbd5e1' }} 
                    />
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Or enter image URL directly"
                  className="form-control"
                  style={{ marginTop: '8px', fontSize: '0.8rem' }}
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                />
              </div>

              {/* Visibility Switches */}
              <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.showOnWebsite}
                    onChange={(e) => setFormData({ ...formData, showOnWebsite: e.target.checked })}
                  />
                  Show on Public Website
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.showInCatalog}
                    onChange={(e) => setFormData({ ...formData, showInCatalog: e.target.checked })}
                  />
                  Show in PDF Catalogue
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.showPublicPrice}
                    onChange={(e) => setFormData({ ...formData, showPublicPrice: e.target.checked })}
                  />
                  Display Price to Public
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddEditModal(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {isEditing ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Adjust Stock */}
      {showAdjustStockModal && selectedProductForStock && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100, padding: '20px'
        }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '14px', width: '420px', maxWidth: '90%', padding: '24px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1.2rem', fontWeight: 800 }}>
              Adjust Inventory Count
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: '#64748b' }}>
              Product: <b>{selectedProductForStock.name}</b><br />
              Current Count: <b>{selectedProductForStock.currentStock} {selectedProductForStock.unit?.symbol}</b>
            </p>

            <form onSubmit={handleAdjustStock}>
              <div style={{ marginBottom: '14px' }}>
                <label className="form-label">Adjustment Mode</label>
                <select
                  className="form-control"
                  value={stockAdjustData.type}
                  onChange={(e) => setStockAdjustData({ ...stockAdjustData, type: e.target.value })}
                >
                  <option value="ADD">Add Found Stock (+)</option>
                  <option value="SUBTRACT">Deduct Damaged / Leakage (-)</option>
                  <option value="SET">Set Exact Physical Count (=)</option>
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label className="form-label">Quantity</label>
                <input
                  type="number"
                  step="1"
                  required
                  className="form-control"
                  placeholder="Quantity in base units"
                  value={stockAdjustData.quantity}
                  onChange={(e) => setStockAdjustData({ ...stockAdjustData, quantity: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label className="form-label">Reason / Notes</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Physical godown recount / damaged bottle"
                  value={stockAdjustData.notes}
                  onChange={(e) => setStockAdjustData({ ...stockAdjustData, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAdjustStockModal(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Apply Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Manage Categories */}
      {showCategoryModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100, padding: '20px'
        }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '14px', width: '500px', maxWidth: '90%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Manage Categories</h3>
              <button
                onClick={() => setShowCategoryModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateCategory} style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '8px' }}>Add Custom Category</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <input
                  type="text"
                  required
                  placeholder="Category Name"
                  className="form-control"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Description (optional)"
                  className="form-control"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                + Add Category
              </button>
            </form>

            <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#64748b', marginBottom: '8px' }}>
                Existing Categories ({categories.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {categories.map((c) => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: 600 }}>{c.name}</span>
                    <span style={{ color: '#64748b', fontSize: '0.75rem' }}>{c.description || 'Active'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unit Management Modal */}
      {showUnitModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 110, padding: '20px'
        }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '14px', width: '500px', maxWidth: '90%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Manage Packaging / Units</h3>
              <button
                onClick={() => setShowUnitModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateUnit} style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '8px', color: '#0369a1' }}>
                + Add Custom Unit (e.g. Dozen, Bundle, Balti, Pouch)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <input
                  type="text"
                  required
                  placeholder="Unit Name (e.g. Dozen)"
                  className="form-control"
                  value={newUnitName}
                  onChange={(e) => setNewUnitName(e.target.value)}
                />
                <input
                  type="text"
                  required
                  placeholder="Symbol (e.g. Dzn)"
                  className="form-control"
                  value={newUnitSymbol}
                  onChange={(e) => setNewUnitSymbol(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                + Save Unit
              </button>
            </form>

            <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#64748b', marginBottom: '8px' }}>
                Existing Units ({units.length})
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {units.map((u) => (
                  <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.8rem' }}>
                    <span style={{ fontWeight: 600 }}>{u.name}</span>
                    <span style={{ color: '#0284c7', fontWeight: 700 }}>({u.symbol})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
