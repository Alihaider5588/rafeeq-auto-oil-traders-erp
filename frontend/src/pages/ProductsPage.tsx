import React, { useEffect, useState } from 'react';
import api, { getMediaUrl } from '../services/api';
import { Product, Category, Unit } from '../types';
import { 
  Package, Plus, Search, AlertCircle, Check, Edit2, Sliders, 
  FolderPlus, Upload, Globe, BookOpen, Layers, ArrowRight, Eye, RefreshCw
} from 'lucide-react';

export const ProductsPage: React.FC = () => {
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
  const [imageUploading, setImageUploading] = useState(false);

  // Stock Adjust Form
  const [stockAdjustData, setStockAdjustData] = useState({
    type: 'ADD', // 'SET' or 'ADD'
    quantity: '',
    notes: ''
  });

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
        params: { search, categoryId: selectedCategory || undefined },
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

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');

    try {
      const payload: any = {
        name: formData.name,
        sku: formData.sku,
        categoryId: formData.categoryId,
        brand: formData.brand,
        unitId: formData.unitId,
        primaryUnitId: formData.primaryUnitId || undefined,
        conversionFactor: Number(formData.conversionFactor) || 1,
        purchasePrice: parseFloat(formData.purchasePrice),
        salePrice: parseFloat(formData.salePrice),
        wholesalePrice: formData.wholesalePrice ? parseFloat(formData.wholesalePrice) : undefined,
        minimumStockLevel: parseFloat(formData.minimumStockLevel) || 5,
        description: formData.description,
        specifications: formData.specifications,
        imageUrl: formData.imageUrl,
        showOnWebsite: formData.showOnWebsite,
        showInCatalog: formData.showInCatalog,
        showPublicPrice: formData.showPublicPrice,
        isActive: formData.isActive,
      };

      if (isEditing && editingId) {
        payload.currentStock = parseFloat(formData.openingStock) || 0;
        await api.put(`/products/${editingId}`, payload);
      } else {
        payload.openingStock = parseFloat(formData.openingStock) || 0;
        await api.post('/products', payload);
      }

      setShowAddEditModal(false);
      loadProducts();
    } catch (err: any) {
      setModalError(err.response?.data?.message || err.response?.data?.error || 'Failed to save product');
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
      loadProducts();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to adjust stock');
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
      loadMetadata();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create category');
    }
  };

  return (
    <div>
      {/* Page Title & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>Engine Oil, Lubricant & Filter Catalog</h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0' }}>
            Multi-category product catalog, primary/secondary unit packaging (Cartons/Bottles), and public catalog sync.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setShowCategoryModal(true)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FolderPlus size={16} /> Manage Categories
          </button>
          <button onClick={handleOpenAdd} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={18} /> Add New Product
          </button>
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
              <th style={{ textAlign: 'center' }}>Visibility</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  Loading product catalog...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
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
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="form-label">SKU / Code *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. TOT-9000-4L"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label className="form-label">Brand / Company *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Total Energies, Shell, Guard"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Category *</label>
                  <select
                    className="form-control"
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Unit & Packaging Section */}
              {/* Unit & Packaging Section - Modeled after user screenshot */}
              <div style={{ backgroundColor: '#f0f9ff', padding: '16px', borderRadius: '12px', border: '1px solid #bae6fd', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Layers size={17} color="#0284c7" /> Packaging & Unit Conversion (Primary & Secondary Units)
                  </div>
                  {formData.primaryUnitId && (
                    <span style={{ fontSize: '0.78rem', backgroundColor: '#e0f2fe', color: '#0369a1', fontWeight: 800, padding: '3px 10px', borderRadius: '20px', border: '1px solid #7dd3fc' }}>
                      1 {units.find(u => u.id === formData.primaryUnitId)?.name || 'PRIMARY'} = {formData.conversionFactor || 1} {units.find(u => u.id === formData.unitId)?.name || 'SECONDARY'}
                    </span>
                  )}
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
                      onChange={(e) => setFormData({ ...formData, unitId: e.target.value })}
                      required
                      style={{ backgroundColor: '#ffffff', borderColor: '#7dd3fc' }}
                    >
                      <option value="">Select Base Unit</option>
                      {units.map((u) => (
                        <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>
                      ))}
                    </select>
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
                        style={{ width: '130px', fontWeight: 800, fontSize: '1rem', color: '#0369a1', borderColor: '#0284c7' }}
                        value={formData.conversionFactor === '0' ? '' : formData.conversionFactor}
                        onChange={(e) => {
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
                  </div>
                )}
              </div>

              {/* Pricing Section */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label className="form-label">Purchase / Cost Price (Rs.) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    placeholder="e.g. 6200"
                    value={formData.purchasePrice === '0' ? '' : formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Retail Sale Rate (Rs.) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    placeholder="e.g. 7500"
                    value={formData.salePrice === '0' ? '' : formData.salePrice}
                    onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Wholesale Rate (Rs.)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    placeholder="e.g. 6800"
                    value={formData.wholesalePrice === '0' ? '' : formData.wholesalePrice}
                    onChange={(e) => setFormData({ ...formData, wholesalePrice: e.target.value })}
                  />
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
    </div>
  );
};
