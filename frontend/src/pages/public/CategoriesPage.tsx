import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import {
  Droplet,
  Sparkles,
  Layers,
  Wrench,
  Gauge,
  Tag,
  ArrowRight,
  ChevronRight
} from 'lucide-react';

interface PublicCategory {
  id: string;
  name: string;
  description: string;
  productCount: number;
}

export const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<PublicCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await api.get('/public/categories');
        if (res.data?.success) setCategories(res.data.categories);
      } catch (err) {
        console.error('Failed to load categories', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCats();
  }, []);

  const categoryIcons: Record<string, any> = {
    Lubricant: Droplet,
    'Car Care': Sparkles,
    'Bike Care': Gauge,
    'All Filter': Layers,
    'Spare Part': Wrench,
    Other: Tag,
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '36px 20px' }}>
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#64748b', marginBottom: '8px' }}>
          <Link to="/website" style={{ color: '#64748b', textDecoration: 'none' }}>Home</Link>
          <ChevronRight size={14} />
          <span style={{ color: '#0f172a', fontWeight: 600 }}>Product Categories</span>
        </div>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
          Product Lines & Categories
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem', margin: '6px 0 0 0' }}>
          Explore our complete inventory segments — from high-viscosity commercial diesel oils to passenger car lubricants and filters.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
          Loading categories...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          {categories.map((c) => {
            const Icon = categoryIcons[c.name] || Droplet;
            return (
              <div
                key={c.id}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '28px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#d97706';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(217,119,6,0.12)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '14px',
                      backgroundColor: '#fef3c7',
                      color: '#d97706',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Icon size={30} />
                    </div>
                    <span style={{
                      backgroundColor: '#f1f5f9',
                      color: '#475569',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                    }}>
                      {c.productCount} {c.productCount === 1 ? 'Item' : 'Items'} Available
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: '0 0 10px 0' }}>
                    {c.name}
                  </h3>

                  <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.6, margin: '0 0 20px 0' }}>
                    {c.description || `High-performance ${c.name} products supplied directly from verified national distributors.`}
                  </p>
                </div>

                <Link
                  to={`/website/products?category=${encodeURIComponent(c.name)}`}
                  style={{
                    backgroundColor: '#0f172a',
                    color: '#ffffff',
                    padding: '11px 18px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'background-color 0.2s',
                  }}
                >
                  View Products in {c.name} <ArrowRight size={16} />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
