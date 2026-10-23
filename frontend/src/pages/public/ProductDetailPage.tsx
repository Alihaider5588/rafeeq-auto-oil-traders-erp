import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, getMediaUrl } from '../../services/api';
import { OnlineOrderModal } from '../../components/public/OnlineOrderModal';
import {
  Droplet,
  ShieldCheck,
  Truck,
  Phone,
  CheckCircle2,
  ChevronRight,
  Package,
  Layers,
  ArrowLeft,
  Share2
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
  salePrice?: number | null;
  showPublicPrice: boolean;
}

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<PublicProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderModalOpen, setOrderModalOpen] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/public/products/${id}`);
        if (res.data?.success) {
          setProduct(res.data.product);
        } else {
          setError('Product not found or currently unavailable.');
        }
      } catch (err) {
        setError('Unable to load product information.');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchProduct();
  }, [id]);

  if (loading) {
    return (
      <div style={{ maxWidth: '1000px', margin: '60px auto', textAlign: 'center', color: '#64748b' }}>
        Loading product specifications...
      </div>
    );
  }

  if (error || !product) {
    return (
      <div style={{ maxWidth: '800px', margin: '60px auto', textAlign: 'center', padding: '40px 20px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '10px' }}>
          {error || 'Product Not Found'}
        </h2>
        <p style={{ color: '#64748b', marginBottom: '24px' }}>
          The requested product may be inactive or restricted from public catalog display.
        </p>
        <Link
          to="/website/products"
          style={{
            backgroundColor: '#d97706',
            color: '#ffffff',
            padding: '10px 20px',
            borderRadius: '8px',
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          Return to Products Catalog
        </Link>
      </div>
    );
  }

  const whatsappMessage = encodeURIComponent(
    `Salam Rafiq Auto Traders, I am interested in ordering: ${product.name} (SKU: ${product.sku}). Please share current wholesale rate and delivery status.`
  );

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '36px 20px' }}>
      {/* Breadcrumb Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#64748b', marginBottom: '24px' }}>
        <Link to="/website" style={{ color: '#64748b', textDecoration: 'none' }}>Home</Link>
        <ChevronRight size={14} />
        <Link to="/website/products" style={{ color: '#64748b', textDecoration: 'none' }}>Products</Link>
        <ChevronRight size={14} />
        <span style={{ color: '#0f172a', fontWeight: 600 }}>{product.name}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '48px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '36px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
        {/* Left: Product Image / Visual Showcase */}
        <div>
          <div style={{
            height: '380px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {product.imageUrl ? (
              <img
                src={getMediaUrl(product.imageUrl)}
                alt={product.name}
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
                style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '20px' }}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                <Droplet size={84} color="#d97706" style={{ marginBottom: '14px', opacity: 0.85 }} />
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#475569' }}>{product.brand}</div>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>Official Certified Lubricant</div>
              </div>
            )}

            <div style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              backgroundColor: product.inStock ? '#22c55e' : '#ef4444',
              color: '#ffffff',
              fontSize: '0.8rem',
              fontWeight: 800,
              padding: '4px 12px',
              borderRadius: '20px',
            }}>
              {product.inStock ? '● In Stock at Okara Depot' : 'Currently Out of Stock'}
            </div>
          </div>

          {/* Wholesale Notice below Image */}
          <div style={{
            marginTop: '20px',
            backgroundColor: '#fef3c7',
            border: '1px solid #fde68a',
            borderRadius: '10px',
            padding: '16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}>
            <Truck size={22} color="#b45309" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.85rem', color: '#92400e', lineHeight: 1.5 }}>
              <strong>Bulk Van Route Delivery Available:</strong> Order full cartons or mixed boxes for retail counter supply across <strong>Okara, Kasur, and Sahiwal</strong> (including Dipalpur, Renala Khurd, Pattoki, Chunian, Chichawatni, and surrounding workshops).
            </div>
          </div>
        </div>

        {/* Right: Technical Specs & Inquiry */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ backgroundColor: '#0f172a', color: '#ffffff', fontSize: '0.75rem', fontWeight: 700, padding: '4px 10px', borderRadius: '4px' }}>
              {product.category}
            </span>
            <span style={{ color: '#d97706', fontWeight: 800, fontSize: '0.85rem' }}>
              {product.brand}
            </span>
          </div>

          <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', margin: '4px 0 12px 0', lineHeight: 1.25 }}>
            {product.name}
          </h1>

          <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '20px' }}>
            Product Code (SKU): <strong style={{ color: '#0f172a' }}>{product.sku}</strong>
          </div>

          {/* Pricing Banner */}
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '18px',
            marginBottom: '24px',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '1.75rem', fontWeight: 900, color: '#16a34a' }}>
                  Rs. {Number(product.publicPrice || product.salePrice || 0).toLocaleString()}
                </span>
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                  / {product.unitSymbol || product.unit || 'Pc'} (Retail Rate)
                </span>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#d97706', fontWeight: 700, marginTop: '4px' }}>
                ★ Special Tiered Discounts on Wholesale Full-Carton Bookings
              </div>
            </div>

            {product.primaryUnit && product.conversionFactor > 1 && (
              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#334155' }}>
                📦 <strong>Packaging Spec:</strong> 1 {product.primaryUnit} contains <strong>{product.conversionFactor} {product.unit}s</strong>.
              </div>
            )}
          </div>

          {/* Description */}
          {product.description && (
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>Product Overview</h3>
              <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.6, margin: 0 }}>
                {product.description}
              </p>
            </div>
          )}

          {/* Specifications Table */}
          {product.specifications && (
            <div style={{ marginBottom: '28px' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>Technical Specifications</h3>
              <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', fontSize: '0.88rem', color: '#334155', lineHeight: 1.6 }}>
                {product.specifications}
              </div>
            </div>
          )}

          {/* Order Actions CTA */}
          <div style={{ marginTop: 'auto', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setOrderModalOpen(true)}
              style={{
                backgroundColor: '#d97706',
                color: '#ffffff',
                padding: '13px 26px',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.95rem',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(217,119,6,0.3)',
                transition: 'all 0.2s',
              }}
            >
              <Package size={18} /> Place Online Order (Queue)
            </button>

            <a
              href={`https://wa.me/923069258573?text=${whatsappMessage}`}
              target="_blank"
              rel="noreferrer"
              style={{
                backgroundColor: '#16a34a',
                color: '#ffffff',
                padding: '13px 22px',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.92rem',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 8px rgba(22,163,74,0.3)',
              }}
            >
              💬 WhatsApp
            </a>

            <a
              href="tel:03069258573"
              style={{
                backgroundColor: '#0f172a',
                color: '#ffffff',
                padding: '13px 20px',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.92rem',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Phone size={16} /> Call Desk
            </a>
          </div>
        </div>
      </div>

      {orderModalOpen && product && (
        <OnlineOrderModal
          product={product}
          onClose={() => setOrderModalOpen(false)}
        />
      )}
    </div>
  );
};
