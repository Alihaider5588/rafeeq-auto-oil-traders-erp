import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, getMediaUrl } from '../../services/api';
import {
  Droplet,
  ShieldCheck,
  Truck,
  CheckCircle2,
  ArrowRight,
  Search,
  Phone,
  Sparkles,
  Layers,
  Wrench,
  Gauge,
  Tag,
  ShoppingBag,
  Award,
  Clock,
  MapPin,
  Send,
  Star
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { OnlineOrderModal } from '../../components/public/OnlineOrderModal';

interface PublicProduct {
  id: string;
  name: string;
  sku: string;
  brand: string;
  category: string;
  unit: string;
  unitSymbol: string;
  primaryUnit: string | null;
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
  description: string;
  productCount: number;
}

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [categories, setCategories] = useState<PublicCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductForOrder, setSelectedProductForOrder] = useState<PublicProduct | null>(null);

  const [company, setCompany] = useState<any>({
    phone: '0306-9258573 / 0327-7497457',
    whatsapp: '0306-9258573',
    proprietorNames: 'M. Shafiq & Haji Muhammad Rafiq',
    operationalAreas: 'Okara, Sahiwal, Kasur',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, catRes, compRes] = await Promise.all([
          api.get('/public/products?limit=8'),
          api.get('/public/categories'),
          api.get('/public/company').catch(() => ({ data: { company: null } })),
        ]);
        if (prodRes.data?.success) setProducts(prodRes.data.data);
        if (catRes.data?.success) setCategories(catRes.data.categories);
        if (compRes.data?.success && compRes.data.company) {
          setCompany(compRes.data.company);
        }
      } catch (err) {
        console.error('Failed to load public home data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/website/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const categoryIcons: Record<string, any> = {
    Lubricant: Droplet,
    'Car Care': Sparkles,
    'Bike Care': Gauge,
    'All Filter': Layers,
    'Spare Part': Wrench,
    Other: Tag,
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="hero-section" style={{
        background: 'linear-gradient(135deg, rgba(9, 13, 22, 0.95) 0%, rgba(15, 23, 42, 0.92) 100%), url("/hero-warehouse.jpg") center/cover no-repeat',
        backgroundBlendMode: 'multiply',
        color: '#ffffff',
        padding: '80px 20px',
        position: 'relative',
        overflow: 'hidden',
        borderBottom: '1px solid rgba(217, 119, 6, 0.3)',
      }}>
        {/* Glow accent */}
        <div style={{
          position: 'absolute',
          top: '-15%',
          right: '-5%',
          width: '550px',
          height: '550px',
          background: 'radial-gradient(circle, rgba(217,119,6,0.25) 0%, rgba(0,0,0,0) 70%)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }} />

        <div className="hero-grid" style={{ maxWidth: '1280px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '48px', alignItems: 'center' }}>
          <div>
            <div className="hero-badge" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'rgba(217, 119, 6, 0.2)',
              border: '1px solid rgba(245, 158, 11, 0.5)',
              backdropFilter: 'blur(8px)',
              color: '#f59e0b',
              padding: '7px 16px',
              borderRadius: '30px',
              fontSize: '0.82rem',
              fontWeight: 800,
              marginBottom: '22px',
              letterSpacing: '0.02em',
              boxShadow: '0 4px 12px rgba(217,119,6,0.15)',
            }}>
              <ShieldCheck size={16} /> Wholesale Engine Oil & Lubricant Depot • Okara
            </div>

            <h1 className="hero-title" style={{ fontSize: '2.9rem', fontWeight: 900, lineHeight: 1.15, margin: '0 0 18px 0', letterSpacing: '-0.03em' }}>
              Premium Automotive <span style={{ color: '#f59e0b', textShadow: '0 2px 14px rgba(245,158,11,0.3)' }}>Lubricants & Oils</span> at Wholesale Rates
            </h1>

            <p className="hero-desc" style={{ fontSize: '1.05rem', color: '#cbd5e1', lineHeight: 1.7, margin: '0 0 30px 0', maxWidth: '580px' }}>
              Welcome to <strong>Rafiq Auto & Oil Traders</strong>. We supply 100% genuine passenger car motor oils, commercial diesel lubricants, motorcycle 4T oils, and genuine filter cartridges across <strong>Okara, Sahiwal, Kasur</strong> and Punjab workshops.
            </p>

            {/* Hero Search Bar */}
            <form onSubmit={handleSearch} className="hero-search-form" style={{ display: 'flex', gap: '8px', maxWidth: '520px', marginBottom: '26px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search brand, grade (e.g. Total 5W-40, Havoline, Shell)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '14px 14px 14px 44px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    backgroundColor: 'rgba(15, 23, 42, 0.85)',
                    backdropFilter: 'blur(10px)',
                    color: '#ffffff',
                    fontSize: '0.92rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <button
                type="submit"
                className="hero-search-btn"
                style={{
                  backgroundColor: '#d97706',
                  color: '#ffffff',
                  border: 'none',
                  padding: '14px 24px',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 16px rgba(217,119,6,0.4)',
                  transition: 'background-color 0.2s',
                }}
              >
                Search
              </button>
            </form>

            <div className="hero-cta-buttons" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <Link
                to="/website/products"
                style={{
                  backgroundColor: '#f59e0b',
                  color: '#0f172a',
                  padding: '13px 26px',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(245,158,11,0.3)',
                }}
              >
                View Full Catalog <ArrowRight size={16} />
              </Link>
              <Link
                to="/website/contact"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)',
                  padding: '13px 24px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                Request Bulk Rate
              </Link>
            </div>
          </div>

          {/* Hero Visual Card with Aesthetic Pouring Oil Showcase */}
          <div style={{
            position: 'relative',
            borderRadius: '20px',
            overflow: 'hidden',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
          }}>
            <img
              src="/hero-pouring.jpg"
              alt="Premium Engine Oil Lubrication"
              style={{
                width: '100%',
                height: '240px',
                objectFit: 'cover',
                display: 'block',
              }}
            />
            <div style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              borderRadius: '20px',
              padding: '4px 12px',
              fontSize: '0.75rem',
              fontWeight: 800,
              color: '#f59e0b',
            }}>
              High Viscosity • Anti-Wear
            </div>

            <div style={{ padding: '26px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 16px 0', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 color="#22c55e" size={22} /> Wholesale Distribution Guarantees
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ backgroundColor: 'rgba(217,119,6,0.2)', padding: '8px', borderRadius: '8px', color: '#f59e0b' }}>
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.9rem' }}>100% Guaranteed Genuine Brands</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Direct dealership stock: TotalEnergies, Shell, Caltex, Castrol, Guard Filters.</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ backgroundColor: 'rgba(56,189,248,0.15)', padding: '8px', borderRadius: '8px', color: '#38bdf8' }}>
                    <Truck size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.9rem' }}>Dedicated Van Route Delivery</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Daily delivery vehicle supplying workshops, retailers, and petrol pump bays.</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ backgroundColor: 'rgba(34,197,94,0.15)', padding: '8px', borderRadius: '8px', color: '#22c55e' }}>
                    <Tag size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.9rem' }}>Carton & Wholesale Pack Rates</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Volume discounts for dealers, fleet owners, and commercial automotive garages.</div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Urgent Order Hotline</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f59e0b' }}>0306-9258573</div>
                </div>
                <a
                  href="tel:03069258573"
                  style={{
                    backgroundColor: '#d97706',
                    color: '#fff',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Phone size={14} /> Call Now
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Product Categories Section */}
      <section style={{ maxWidth: '1280px', margin: '50px auto', padding: '0 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ color: '#d97706', fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Browse By Category
            </div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', margin: '4px 0 0 0' }}>
              Core Wholesale Product Lines
            </h2>
          </div>
          <Link to="/website/categories" style={{ color: '#d97706', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            All Categories <ArrowRight size={15} />
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
          {categories.slice(0, 6).map((c) => {
            const Icon = categoryIcons[c.name] || Droplet;
            return (
              <Link
                key={c.id}
                to={`/website/products?category=${encodeURIComponent(c.name)}`}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '24px 18px',
                  textAlign: 'center',
                  textDecoration: 'none',
                  color: '#0f172a',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                }}
              >
                <div style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '14px',
                  backgroundColor: '#fef3c7',
                  color: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Icon size={28} />
                </div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>
                  {c.name}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  {c.productCount} {c.productCount === 1 ? 'Product' : 'Products'} Listed
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Featured Public Products Showcase */}
      <section style={{ backgroundColor: '#ffffff', padding: '60px 20px', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ color: '#d97706', fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Featured Wholesale Products
              </div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', margin: '4px 0 0 0' }}>
                In-Stock Engine Oils & Car Care
              </h2>
            </div>
            <Link
              to="/website/products"
              style={{
                backgroundColor: '#0f172a',
                color: '#ffffff',
                padding: '9px 18px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.85rem',
                textDecoration: 'none',
              }}
            >
              Browse All Products
            </Link>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              Loading products catalog...
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '24px' }}>
              {products.map((p) => (
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
                  {/* Product Image or Rich Placeholder */}
                  <div style={{
                    height: '190px',
                    backgroundColor: '#f1f5f9',
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
                        style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '12px' }}
                      />
                    ) : (
                      <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                        <Droplet size={54} color="#d97706" style={{ marginBottom: '8px', opacity: 0.8 }} />
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>{p.brand}</div>
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
                      backgroundColor: 'rgba(15, 23, 42, 0.8)',
                      color: '#f8fafc',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '6px',
                    }}>
                      {p.category}
                    </div>
                  </div>

                  {/* Product Details Content */}
                  <div style={{ padding: '18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
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
                            padding: '7px 11px',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.2s',
                          }}
                          title="Instant 1-Click Buy Now"
                        >
                          ⚡ Buy Now
                        </button>
                        <button
                          onClick={() => addToCart(p, 1)}
                          style={{
                            backgroundColor: '#d97706',
                            color: '#ffffff',
                            border: 'none',
                            padding: '7px 11px',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 6px rgba(217,119,6,0.25)'
                          }}
                          title="Add to Multi-Product Cart"
                        >
                          <ShoppingBag size={13} /> + Cart
                        </button>
                        <Link
                          to={`/website/products/${p.id}`}
                          style={{
                            backgroundColor: '#f1f5f9',
                            color: '#475569',
                            border: '1px solid #cbd5e1',
                            padding: '6px 9px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
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
          )}

          {selectedProductForOrder && (
            <OnlineOrderModal
              product={selectedProductForOrder}
              onClose={() => setSelectedProductForOrder(null)}
            />
          )}
        </div>
      </section>

      {/* Fleet Delivery & Warehouse Logistics Showcase */}
      <section style={{ maxWidth: '1280px', margin: '60px auto', padding: '0 20px' }}>
        <div style={{
          background: 'linear-gradient(135deg, #090d16 0%, #1e293b 100%)',
          borderRadius: '20px',
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          alignItems: 'center',
          boxShadow: '0 16px 36px rgba(0,0,0,0.15)',
          border: '1px solid #334155',
        }}>
          <div style={{ padding: '44px 36px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid #0284c7',
              color: '#38bdf8',
              padding: '5px 12px',
              borderRadius: '20px',
              fontSize: '0.78rem',
              fontWeight: 800,
              marginBottom: '16px',
            }}>
              <Truck size={14} /> Okara, Kasur & Sahiwal Distribution Hub
            </div>
            <h2 style={{ fontSize: '1.9rem', fontWeight: 900, color: '#ffffff', margin: '0 0 14px 0', lineHeight: 1.25 }}>
              Dedicated Van Routes in Okara, Kasur & Sahiwal
            </h2>
            <p style={{ fontSize: '0.92rem', color: '#94a3b8', lineHeight: 1.6, margin: '0 0 24px 0' }}>
              We operate daily delivery vehicles stocking workshop chains, retail counters, and lube facilities across Okara, Kasur, and Sahiwal. Order cartons with confidence — prompt dispatches, authentic refinery packaging, and computerized invoices straight to your doorstep.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '28px' }}>
              <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ color: '#f59e0b', fontWeight: 800, fontSize: '1.2rem' }}>Same Day</div>
                <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>Okara, Kasur & Sahiwal Dispatches</div>
              </div>
              <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ color: '#22c55e', fontWeight: 800, fontSize: '1.2rem' }}>Zero Transit</div>
                <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>Breakage / Leakage Policy</div>
              </div>
            </div>
            <Link
              to="/website/contact"
              style={{
                backgroundColor: '#d97706',
                color: '#ffffff',
                padding: '12px 24px',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.88rem',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(217,119,6,0.3)',
              }}
            >
              Book Delivery Schedule <ArrowRight size={16} />
            </Link>
          </div>
          <div style={{ height: '100%', minHeight: '340px' }}>
            <img
              src="/hero-fleet.jpg"
              alt="Rafiq Auto Fleet & Warehousing"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          </div>
        </div>
      </section>

      {/* Wholesale & Fleet Supply Notice Banner */}
      <section style={{ backgroundColor: '#fef3c7', borderTop: '1px solid #fde68a', borderBottom: '1px solid #fde68a', padding: '50px 20px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#78350f', margin: '0 0 14px 0' }}>
            Are You An Auto Workshop, Lube Counter or Fleet Owner?
          </h2>
          <p style={{ fontSize: '1.05rem', color: '#92400e', lineHeight: 1.6, margin: '0 0 24px 0' }}>
            We provide verified carton rates, double-entry credit ledgers (Udhar khata), and direct delivery van service in Okara, Sahiwal, Kasur, and surrounding commercial sectors.
          </p>
          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href={`https://wa.me/92${(company.whatsapp || '03069258573').replace(/[^0-9]/g, '').replace(/^0/, '')}?text=Salam%20Rafiq%20Auto.%20I%20want%20wholesale%20rates%20for%20engine%20oil.`}
              target="_blank"
              rel="noreferrer"
              style={{
                backgroundColor: '#16a34a',
                color: '#ffffff',
                padding: '13px 26px',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.92rem',
                textDecoration: 'none',
              }}
            >
              💬 WhatsApp Wholesale Inquiry
            </a>
            <Link
              to="/website/contact"
              style={{
                backgroundColor: '#0f172a',
                color: '#ffffff',
                padding: '13px 26px',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.92rem',
                textDecoration: 'none',
              }}
            >
              Get Depot Quotation
            </Link>
          </div>
        </div>
      </section>

      {/* Aesthetic Car Care & Bike Care Gallery Showcase Banner */}
      <section style={{ backgroundColor: '#0f172a', padding: '60px 20px', borderTop: '2px solid #ffb91f', borderBottom: '1px solid #1e293b' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '40px', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(255, 185, 31, 0.15)', border: '1px solid #ffb91f', color: '#ffb91f', padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 800, marginBottom: '16px' }}>
              <Sparkles size={16} /> Complete Vehicle Care & Bike Lubricants
            </div>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#ffffff', margin: '0 0 16px 0', lineHeight: 1.2 }}>
              High-Performance Care & Lubrication Solutions
            </h2>
            <p style={{ fontSize: '0.95rem', color: '#cbd5e1', lineHeight: 1.7, margin: '0 0 24px 0' }}>
              Beyond heavy diesel and passenger car motor oils, Rafiq Auto provides premium motorcycle 4T oils, radiator coolants, glass cleaners, multi-purpose grease, and car detailing fluids directly to commercial workshops across Okara and Punjab.
            </p>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <Link
                to="/website/products?category=Car%20Care"
                style={{
                  backgroundColor: '#ffb91f',
                  color: '#0f172a',
                  padding: '12px 22px',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  textDecoration: 'none',
                }}
              >
                Explore Car Care Range
              </Link>
              <Link
                to="/website/products?category=Bike%20Care"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.2)',
                  padding: '12px 22px',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  textDecoration: 'none',
                }}
              >
                Bike 4T Oils
              </Link>
            </div>
          </div>

          <div style={{ borderRadius: '16px', overflow: 'hidden', boxShadow: '0 12px 30px rgba(0,0,0,0.5)', border: '1px solid #334155' }}>
            <img
              src="/car-care-bike-care.jpg"
              alt="Aesthetic Vehicle Care & Bike Lubricants"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>
        </div>
      </section>

      {/* WHY CHOOSE US (Why Us) Section */}
      <section style={{ backgroundColor: '#ffffff', padding: '70px 20px', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '46px' }}>
            <div style={{ color: '#d97706', fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Trust & Reliability
            </div>
            <h2 style={{ fontSize: '2.3rem', fontWeight: 900, color: '#0f172a', margin: '6px 0 0 0' }}>
              Why Choose Rafiq Auto & Oil Traders?
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.98rem', margin: '8px auto 0 auto', maxWidth: '640px' }}>
              We are dedicated to protecting your engine health and maximizing workshop profits with 100% authentic refinery products.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '26px' }}>
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '30px', transition: 'all 0.2s' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '12px', backgroundColor: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px' }}>
                <ShieldCheck size={28} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 10px 0' }}>
                100% Genuine Refinery Stock
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                Every single carton and drum is sourced directly through certified national supply chains with verified tamper-proof seals. Zero risk of counterfeits.
              </p>
            </div>

            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '30px', transition: 'all 0.2s' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '12px', backgroundColor: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px' }}>
                <Tag size={28} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 10px 0' }}>
                Direct Wholesale Dealer Rates
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                Enjoy wholesale tiered pricing for auto workshops, commercial fleets, and lube shops. Maximize your business margins with bulk volume deals.
              </p>
            </div>

            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '30px', transition: 'all 0.2s' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '12px', backgroundColor: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px' }}>
                <Truck size={28} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 10px 0' }}>
                Rapid Route Delivery Van
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                Our dedicated distribution vans supply Okara city, Dipalpur Road, Renala Khurd, and suburban retail counters with prompt doorstep drop-offs.
              </p>
            </div>

            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '30px', transition: 'all 0.2s' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '12px', backgroundColor: '#fae8ff', color: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px' }}>
                <Award size={28} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 10px 0' }}>
                Expert Lubricant Guidance
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                Not sure about viscosity (0W-20 vs 5W-30 vs 20W-50) or API ratings? Our technical team recommends the ideal formulation for every engine.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions (FAQs) Section */}
      <section style={{ backgroundColor: '#f8fafc', padding: '70px 20px', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{ color: '#d97706', fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Got Questions?
            </div>
            <h2 style={{ fontSize: '2.3rem', fontWeight: 900, color: '#0f172a', margin: '6px 0 0 0' }}>
              Frequently Asked Questions (FAQs)
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.95rem', margin: '8px auto 0 auto' }}>
              Common queries from our retail clients, workshop managers, and vehicle owners.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <details style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 22px', boxShadow: '0 2px 6px rgba(0,0,0,0.03)', cursor: 'pointer' }}>
              <summary style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.05rem', outline: 'none' }}>
                Are all engine oils and lubricants 100% genuine?
              </summary>
              <p style={{ color: '#64748b', fontSize: '0.92rem', lineHeight: 1.7, margin: '12px 0 0 0', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                Yes, absolutely. We source directly from official corporate distributors and refineries. Each pack features intact security seals, batch codes, and authentic verification QR/barcodes.
              </p>
            </details>

            <details style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 22px', boxShadow: '0 2px 6px rgba(0,0,0,0.03)', cursor: 'pointer' }}>
              <summary style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.05rem', outline: 'none' }}>
                What are your depot working hours and operational schedule?
              </summary>
              <p style={{ color: '#64748b', fontSize: '0.92rem', lineHeight: 1.7, margin: '12px 0 0 0', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                We operate on a <strong>24/7 Operations model (Round the clock support & dispatch)</strong>. Our wholesale supply counter and delivery fleets serve Okara, Sahiwal, Kasur, and surrounding belts non-stop without weekly closures.
              </p>
            </details>

            <details style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 22px', boxShadow: '0 2px 6px rgba(0,0,0,0.03)', cursor: 'pointer' }}>
              <summary style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.05rem', outline: 'none' }}>
                Do you offer delivery van supply in Okara, Kasur & Sahiwal?
              </summary>
              <p style={{ color: '#64748b', fontSize: '0.92rem', lineHeight: 1.7, margin: '12px 0 0 0', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                Yes, our delivery van routes actively cover <strong>Okara, Kasur, and Sahiwal</strong> (including Dipalpur, Renala Khurd, Pattoki, Chunian, Chichawatni, and nearby agricultural lube dealers). Contact our dispatch desk on <strong>0306-9258573</strong> to confirm your recurring weekly route day.
              </p>
            </details>

            <details style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 22px', boxShadow: '0 2px 6px rgba(0,0,0,0.03)', cursor: 'pointer' }}>
              <summary style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.05rem', outline: 'none' }}>
                Can I order single bottles or is it strictly wholesale cartons?
              </summary>
              <p style={{ color: '#64748b', fontSize: '0.92rem', lineHeight: 1.7, margin: '12px 0 0 0', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                We serve both walk-in retail customers looking for single bottle oil changes as well as commercial garages buying cartons or drum volumes at special tiered rates.
              </p>
            </details>

            <details style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 22px', boxShadow: '0 2px 6px rgba(0,0,0,0.03)', cursor: 'pointer' }}>
              <summary style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.05rem', outline: 'none' }}>
                How do I place an online booking or request a price quote?
              </summary>
              <p style={{ color: '#64748b', fontSize: '0.92rem', lineHeight: 1.7, margin: '12px 0 0 0', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                You can click the <strong>⚡ Buy Now</strong> button on any product for single items, add multiple items to your <strong>Cart</strong>, or chat directly with us on WhatsApp at <strong>0306-9258573</strong> for instant pricing.
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* Embedded About Us Section on Homepage */}
      <section style={{ backgroundColor: '#ffffff', padding: '70px 20px', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '48px', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#d97706', fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              <Award size={16} /> About Rafiq Auto & Oil Traders
            </div>
            <h2 style={{ fontSize: '2.1rem', fontWeight: 900, color: '#0f172a', margin: '0 0 16px 0', lineHeight: 1.25 }}>
              Central Punjab's Direct Wholesale Lubricant Depot
            </h2>
            <p style={{ fontSize: '0.95rem', color: '#475569', lineHeight: 1.7, margin: '0 0 16px 0' }}>
              Headquartered at <strong>54-Stop Near MCB Bank, Dipalpur Road, Okara</strong>, <strong>Rafiq Auto & Oil Traders</strong> (رفیق آٹو اینڈ آئل ٹریڈرز) is Punjab's certified distributor for leading automotive, diesel engine and motorcycle lubricant brands.
            </p>
            <p style={{ fontSize: '0.95rem', color: '#475569', lineHeight: 1.7, margin: '0 0 24px 0' }}>
              We eliminate counterfeit product risks with 100% genuine refinery supply, guaranteed seal integrity, computerized invoices, and wholesale dealer discounts for commercial workshops.
            </p>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <Link
                to="/website/about"
                style={{
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                Read Full Story <ArrowRight size={16} />
              </Link>
              <Link
                to="/website/products"
                style={{
                  backgroundColor: '#f8fafc',
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  textDecoration: 'none',
                }}
              >
                Explore Product Lines
              </Link>
            </div>
          </div>

          <div style={{
            backgroundColor: '#090d16',
            borderRadius: '20px',
            padding: '36px',
            color: '#ffffff',
            boxShadow: '0 20px 40px -10px rgba(15,23,42,0.3)',
            border: '1px solid #1e293b'
          }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 20px 0', color: '#f8fafc' }}>
              Why Workshops Choose Rafiq Auto:
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <CheckCircle2 size={20} color="#22c55e" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ display: 'block', fontSize: '0.95rem', color: '#f8fafc' }}>100% Genuine Refinery Stock</strong>
                  <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Direct dealership batches with verified seals and batch documentation.</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <CheckCircle2 size={20} color="#22c55e" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ display: 'block', fontSize: '0.95rem', color: '#f8fafc' }}>Transparent Wholesale Margins</strong>
                  <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Special carton rate structures and dealer schemes for retail counters.</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <CheckCircle2 size={20} color="#22c55e" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ display: 'block', fontSize: '0.95rem', color: '#f8fafc' }}>Dedicated Route Delivery</strong>
                  <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Van deliveries across Okara city, bypass terminals, Dipalpur & Renala.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Embedded Contact Us Section on Homepage */}
      <section style={{ backgroundColor: '#f8fafc', padding: '70px 20px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{ color: '#d97706', fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Get In Touch With Okara Depot
            </div>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#0f172a', margin: '6px 0 0 0' }}>
              Contact Our Sales & Logistics Desk
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.95rem', margin: '8px auto 0 auto', maxWidth: '600px' }}>
              Have questions regarding oil grades, bulk carton orders, or van deliveries? Our dispatch team is ready to assist.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '28px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ width: '46px', height: '46px', borderRadius: '10px', backgroundColor: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <MapPin size={22} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0' }}>
                Main Warehouse Address
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                {company.address}
              </p>
              <div style={{ color: '#d97706', fontSize: '0.8rem', fontWeight: 700, marginTop: '4px' }}>
                Operational Areas: {company.operationalAreas}
              </div>
            </div>

            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '28px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ width: '46px', height: '46px', borderRadius: '10px', backgroundColor: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <Phone size={22} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0' }}>
                Sales & Orders Hotlines
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.9rem' }}>
                <div style={{ color: '#0f172a', fontWeight: 700 }}>{company.phone}</div>
                <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Proprietors: {company.proprietorNames}</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#16a34a', fontWeight: 800, fontSize: '0.88rem', marginTop: '3px' }}>
                  <span>🟢 Open 24/7 (24 گھنٹے سروس دستیاب ہے)</span>
                </div>
                <span style={{ color: '#059669', fontSize: '0.8rem', fontWeight: 700 }}>
                  ✓ Friday Open (جمعہ تعطیل منسوخ — ہفتے کے 7 دن چوبیس گھنٹے کھلا ہے)
                </span>
              </div>
            </div>

            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '28px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', boxShadow: '0 2px 8px rgba(22,163,74,0.15)' }}>
                  <Send size={22} />
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0' }}>
                  Instant WhatsApp Booking
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: 1.6, margin: '0 0 20px 0' }}>
                  Connect directly with our sales coordinator ({company.whatsapp || '0306-9258573'}) for live carton rates, urgent orders & same-day dispatch.
                </p>
              </div>
              <a
                href={`https://wa.me/92${(company.whatsapp || '03069258573').replace(/[^0-9]/g, '').replace(/^0/, '')}?text=Salam%20Rafiq%20Auto.%20I%20want%20to%20place%20an%20order%20or%20inquire%20rates.`}
                target="_blank"
                rel="noreferrer"
                className="wa-card-btn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '11px 20px',
                  borderRadius: '10px',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  textDecoration: 'none',
                  letterSpacing: '0.01em',
                  width: 'fit-content'
                }}
              >
                {/* Authentic WhatsApp SVG */}
                <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                  <path
                    d="M16 2.667C8.636 2.667 2.667 8.636 2.667 16c0 2.507.693 4.853 1.907 6.867L2.667 29.333l6.666-1.853A13.267 13.267 0 0016 29.333c7.364 0 13.333-5.969 13.333-13.333S23.364 2.667 16 2.667z"
                    fill="#ffffff"
                    fillOpacity="0.25"
                  />
                  <path
                    d="M22.253 18.987c-.347-.174-2.053-1.013-2.373-1.133-.32-.12-.547-.174-.787.174-.24.346-.92 1.133-1.133 1.373-.213.24-.413.267-.76.093-.347-.173-1.467-.54-2.787-1.72-1.026-.92-1.72-2.053-1.92-2.4-.2-.347-.027-.534.147-.707.16-.16.347-.413.52-.613.173-.2.24-.347.36-.587.12-.24.067-.453-.027-.627-.093-.173-.787-1.906-1.08-2.6-.28-.68-.573-.587-.787-.6-.2-.013-.44-.013-.68-.013-.24 0-.627.093-.96.453-.333.36-1.28 1.253-1.28 3.053 0 1.8 1.307 3.547 1.493 3.787.187.24 2.573 3.933 6.24 5.52.867.373 1.547.6 2.08.773.88.28 1.68.24 2.307.147.707-.107 2.053-.84 2.347-1.653.293-.814.293-1.52.2-1.667-.08-.133-.307-.227-.64-.4z"
                    fill="#ffffff"
                  />
                </svg>
                <span>Chat on WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
