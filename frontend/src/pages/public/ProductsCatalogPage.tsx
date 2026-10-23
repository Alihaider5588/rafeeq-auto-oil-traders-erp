import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, getMediaUrl } from '../../services/api';
import { OnlineOrderModal } from '../../components/public/OnlineOrderModal';
import { useCart } from '../../context/CartContext';
import {
  Search,
  Filter,
  Droplet,
  Tag,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  SlidersHorizontal,
  ChevronRight,
  ShoppingBag,
  Plus
} from 'lucide-react';

interface PublicProduct {
  id: string;
  name: string;
  sku: string;
  brand: string;
  category: string;
  categoryId: string;
  unit: string;
  unitSymbol: string;
  primaryUnit: string | null;
  primaryUnitSymbol: string | null;
  conversionFactor: number;
  description: string;
  specifications: string;
  imageUrl: string | null;
  inStock: boolean;
  publicPrice: number | null;
  showPublicPrice: boolean;
}

interface PublicCategory {
  id: string;
  name: string;
  productCount: number;
}

export const ProductsCatalogPage: React.FC = () => {
  const { addToCart, setIsCartOpen } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') || '';
  const initialSearch = searchParams.get('search') || '';

  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [categories, setCategories] = useState<PublicCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState(initialSearch);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialCategory ? [initialCategory] : []);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [selectedProductForOrder, setSelectedProductForOrder] = useState<PublicProduct | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [selectedCategories, selectedBrand, searchParams]);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/public/categories');
      if (res.data?.success) setCategories(res.data.categories);
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (selectedCategories.length > 0) {
        params.append('categoryId', selectedCategories.join(','));
      }
      if (selectedBrand) params.append('brand', selectedBrand);

      const res = await api.get(`/public/products?${params.toString()}`);
      if (res.data?.success) {
        setProducts(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load products', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts();
  };

  const handleCategoryToggle = (catId: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(catId)) {
        return prev.filter((id) => id !== catId);
      } else {
        return [...prev, catId];
      }
    });
  };

  const handleClearCategories = () => {
    setSelectedCategories([]);
  };

  const filteredProducts = products.filter((p) => {
    if (inStockOnly && !p.inStock) return false;
    return true;
  });

  const uniqueBrands = Array.from(new Set(products.map((p) => p.brand))).filter(Boolean);

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '36px 20px' }}>
      {/* Breadcrumb Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#64748b', marginBottom: '8px' }}>
          <Link to="/website" style={{ color: '#64748b', textDecoration: 'none' }}>Home</Link>
          <ChevronRight size={14} />
          <span style={{ color: '#0f172a', fontWeight: 600 }}>Products Catalog</span>
        </div>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
          Wholesale Products & Lubricants Catalog
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem', margin: '6px 0 0 0' }}>
          Genuine Engine Oils, Transmission Fluids, Coolants, Air & Oil Filters available for direct retail and wholesale supply in Okara.
        </p>
      </div>

      {/* Filter and Search Controls Bar */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '32px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <div style={{ position: 'relative', flex: '1 1 300px' }}>
            <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search product name, SKU or brand..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '11px 14px 11px 42px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.9rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {uniqueBrands.length > 0 && (
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              style={{
                padding: '11px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.9rem',
                backgroundColor: '#ffffff',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="">All Brands ({uniqueBrands.length})</option>
              {uniqueBrands.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          )}

          <button
            type="submit"
            style={{
              backgroundColor: '#d97706',
              color: '#ffffff',
              border: 'none',
              padding: '11px 22px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            Apply Filters
          </button>
        </form>

        {/* Category Pills & In-Stock Switch */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', marginRight: '4px' }}>Categories (Multi-select):</span>
            <button
              onClick={handleClearCategories}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: selectedCategories.length === 0 ? '1px solid #d97706' : '1px solid #cbd5e1',
                backgroundColor: selectedCategories.length === 0 ? '#d97706' : '#f8fafc',
                color: selectedCategories.length === 0 ? '#ffffff' : '#334155',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              All Categories
            </button>
            {categories.map((c) => {
              const isSelected = selectedCategories.includes(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => handleCategoryToggle(c.id)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    border: isSelected ? '1px solid #d97706' : '1px solid #cbd5e1',
                    backgroundColor: isSelected ? '#d97706' : '#f8fafc',
                    color: isSelected ? '#ffffff' : '#334155',
                    fontSize: '0.8rem',
                    fontWeight: isSelected ? 800 : 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {isSelected && <span>✓</span>}
                  {c.name} ({c.productCount})
                </button>
              );
            })}
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => setInStockOnly(e.target.checked)}
              style={{ accentColor: '#d97706', width: '16px', height: '16px' }}
            />
            Show In-Stock Only
          </label>
        </div>
      </div>

      {/* Product List Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
          Fetching catalog items...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '60px 20px',
          textAlign: 'center',
        }}>
          <Droplet size={48} color="#cbd5e1" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
            No Public Products Found
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 0 20px 0' }}>
            Try adjusting your search criteria or selecting a different category.
          </p>
          <button
            onClick={() => {
              setSearch('');
              setSelectedCategories([]);
              setSelectedBrand('');
              setInStockOnly(false);
            }}
            style={{
              backgroundColor: '#0f172a',
              color: '#ffffff',
              padding: '10px 20px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.85rem',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <>
          <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px', fontWeight: 600 }}>
            Showing {filteredProducts.length} verified products available for order
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
            {filteredProducts.map((p) => (
              <div
                key={p.id}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#d97706';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(217,119,6,0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                }}
              >
                {/* Image / Placeholder Header */}
                <div style={{
                  height: '200px',
                  backgroundColor: '#f8fafc',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderBottom: '1px solid #f1f5f9'
                }}>
                  {p.imageUrl ? (
                    <img
                      src={getMediaUrl(p.imageUrl)}
                      alt={p.name}
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                      style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '14px' }}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                      <Droplet size={56} color="#d97706" style={{ marginBottom: '8px', opacity: 0.8 }} />
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b' }}>{p.brand}</div>
                    </div>
                  )}

                  {/* Stock Status Badge */}
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    backgroundColor: p.inStock ? '#22c55e' : '#ef4444',
                    color: '#ffffff',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: '12px',
                  }}>
                    {p.inStock ? '● In Stock' : 'Out of Stock'}
                  </div>

                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    backgroundColor: 'rgba(15, 23, 42, 0.85)',
                    color: '#f8fafc',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '6px',
                  }}>
                    {p.category}
                  </div>
                </div>

                {/* Details Content */}
                <div style={{ padding: '18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                    {p.brand} • SKU: {p.sku}
                  </div>

                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: '6px 0 10px 0', lineHeight: 1.3 }}>
                    {p.name}
                  </h3>

                  {p.specifications && (
                    <div style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '14px', backgroundColor: '#f8fafc', padding: '8px 10px', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                      {p.specifications}
                    </div>
                  )}

                  <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#16a34a', display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                        <span>Rs. {Number(p.publicPrice || 0).toLocaleString()}</span>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>/ {p.unitSymbol || p.unit || 'Pc'}</span>
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#d97706', fontWeight: 700 }}>
                        ★ Retail Rate (Bulk Carton Avail)
                      </div>
                      {p.primaryUnit && p.conversionFactor > 1 && (
                        <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                          📦 1 {p.primaryUnit} = {p.conversionFactor} {p.unitSymbol}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <button
                        onClick={() => setSelectedProductForOrder(p)}
                        style={{
                          backgroundColor: '#0f172a',
                          color: '#ffffff',
                          border: 'none',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          boxShadow: '0 2px 6px rgba(15,23,42,0.2)'
                        }}
                        title="Instant Single Product Checkout (1-click Buy Now)"
                      >
                        ⚡ Buy Now
                      </button>
                      <button
                        onClick={() => addToCart(p, 1)}
                        style={{
                          backgroundColor: '#d97706',
                          color: '#ffffff',
                          border: 'none',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.2s',
                          boxShadow: '0 2px 6px rgba(217,119,6,0.25)'
                        }}
                        title="Add this product to Multi-Item Cart"
                      >
                        <ShoppingBag size={14} /> + Cart
                      </button>
                      <Link
                        to={`/website/products/${p.id}`}
                        style={{
                          backgroundColor: '#f1f5f9',
                          color: '#334155',
                          border: '1px solid #cbd5e1',
                          padding: '7px 10px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          textDecoration: 'none',
                          transition: 'all 0.2s',
                        }}
                      >
                        Specs
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {selectedProductForOrder && (
            <OnlineOrderModal
              product={selectedProductForOrder}
              onClose={() => setSelectedProductForOrder(null)}
            />
          )}
        </>
      )}
    </div>
  );
};
