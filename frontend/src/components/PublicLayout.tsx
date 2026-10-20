import React, { useState, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Phone,
  MapPin,
  Clock,
  ShieldCheck,
  Menu,
  X,
  Droplet,
  ShoppingBag,
  ArrowUp,
  MessageCircle,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { CartDrawer } from './public/CartDrawer';
import api from '../services/api';

export const PublicLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { totalItems, setIsCartOpen } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<{
    name: string;
    address: string;
    phone: string;
    whatsapp: string;
    email: string;
    proprietorNames: string;
    operationalAreas: string;
    facebookUrl: string;
    tiktokUrl: string;
    operatingSchedule: string;
  }>({
    name: 'RAFIQ AUTO & OIL TRADERS',
    address: '54-Stop Near MCB Bank, Dipalpur Road, Okara',
    phone: '0306-9258573 / 0327-7497457',
    whatsapp: '0306-9258573',
    email: 'rafiqtreders003@gmail.com',
    proprietorNames: 'M. Shafiq & Haji Muhammad Rafiq',
    operationalAreas: 'Okara, Sahiwal, Kasur',
    facebookUrl: '',
    tiktokUrl: '',
    operatingSchedule: '24/7 Operations (Round the Clock Support)',
  });

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const res = await api.get('/public/company');
        if (res.data?.success && res.data.company) {
          setCompanyInfo(prev => ({ ...prev, ...res.data.company }));
        }
      } catch (e) {
        // use fallback defaults
      }
    };
    fetchCompany();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const normalizeSocialUrl = (url?: string) => {
    if (!url || !url.trim()) return '';
    const clean = url.trim();
    if (!/^https?:\/\//i.test(clean)) {
      return `https://${clean}`;
    }
    return clean;
  };

  const cleanWhatsapp = (companyInfo.whatsapp || '03069258573').replace(/[^0-9]/g, '');
  const waUrl = `https://wa.me/92${cleanWhatsapp.startsWith('0') ? cleanWhatsapp.slice(1) : cleanWhatsapp}?text=Salam%20Rafiq%20Auto.%20I%20want%20to%20inquire%20about%20engine%20oils.`;
  const cleanFbUrl = normalizeSocialUrl(companyInfo.facebookUrl);
  const cleanTiktokUrl = normalizeSocialUrl(companyInfo.tiktokUrl);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#0b0f19', color: '#0f172a', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Top Banner Notice - Ultra Clean Corporate Bar */}
      <div className="public-topbar" style={{ backgroundColor: '#090d16', color: '#cbd5e1', fontSize: '0.8rem', padding: '7px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div className="public-topbar-notice" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ backgroundColor: 'rgba(255, 185, 31, 0.15)', color: '#ffb91f', border: '1px solid rgba(255, 185, 31, 0.35)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Official Wholesale Depot
            </span>
            <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
              100% Genuine Certified Stock • <strong style={{ color: '#4ade80' }}>{companyInfo.operatingSchedule || '24/7 Operations & Dispatch'}</strong>
            </span>
          </div>
          <div className="public-topbar-details" style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '0.78rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
              <MapPin size={13} color="#ffb91f" />
              <span>{companyInfo.address}</span>
            </div>
            <a href={`tel:${(companyInfo.whatsapp || '03069258573').replace(/[^0-9]/g, '')}`} style={{ color: '#ffb91f', textDecoration: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Phone size={13} color="#ffb91f" /> {companyInfo.whatsapp || '0306-9258573'}
            </a>
          </div>
        </div>
      </div>

      {/* Main Public Navigation Bar - Sleek Modern Dark Aesthetic */}
      <header style={{ backgroundColor: '#0d111c', borderBottom: '1px solid rgba(255, 185, 31, 0.25)', position: 'sticky', top: 0, zIndex: 50, backdropFilter: 'blur(16px)' }}>
        <div className="public-header-inner" style={{ maxWidth: '1280px', margin: '0 auto', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          {/* Brand Logo & Title */}
          <Link to="/website" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', minWidth: 0 }}>
            <img
              src="/logo.png"
              alt="Rafiq Auto & Oil Traders"
              className="public-brand-logo"
              style={{ width: '44px', height: '44px', objectFit: 'contain', borderRadius: '10px', boxShadow: '0 4px 14px rgba(0,0,0,0.5)', flexShrink: 0, backgroundColor: '#ffffff', padding: '3px', border: '1px solid rgba(255, 185, 31, 0.4)' }}
            />
            <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <div className="public-brand-title" style={{ fontSize: '1.2rem', fontWeight: 900, color: '#ffffff', letterSpacing: '0.02em', lineHeight: 1.2 }}>
                RAFIQ AUTO & OIL <span style={{ color: '#ffb91f' }}>TRADERS</span>
              </div>
              <div 
                className="urdu-text public-brand-subtitle"
                style={{ 
                  fontSize: '0.86rem', 
                  color: '#e2e8f0', 
                  fontWeight: 600, 
                  marginTop: '1px',
                  letterSpacing: '0.01em',
                  opacity: 0.9
                }}
              >
                رفیق آٹو اینڈ آئل ٹریڈرز - اوکاڑہ
              </div>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav style={{ display: 'none', alignItems: 'center', gap: '26px' }} className="desktop-nav">
            <NavLink
              to="/website"
              end
              style={({ isActive }) => ({
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '0.88rem',
                letterSpacing: '0.03em',
                color: isActive ? '#ffb91f' : '#cbd5e1',
                borderBottom: isActive ? '2px solid #ffb91f' : '2px solid transparent',
                paddingBottom: '4px',
                transition: 'all 0.2s',
              })}
            >
              HOME
            </NavLink>
            <NavLink
              to="/website/products"
              style={({ isActive }) => ({
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '0.88rem',
                letterSpacing: '0.03em',
                color: isActive ? '#ffb91f' : '#cbd5e1',
                borderBottom: isActive ? '2px solid #ffb91f' : '2px solid transparent',
                paddingBottom: '4px',
                transition: 'all 0.2s',
              })}
            >
              PRODUCTS
            </NavLink>
            <NavLink
              to="/website/categories"
              style={({ isActive }) => ({
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '0.88rem',
                letterSpacing: '0.03em',
                color: isActive ? '#ffb91f' : '#cbd5e1',
                borderBottom: isActive ? '2px solid #ffb91f' : '2px solid transparent',
                paddingBottom: '4px',
                transition: 'all 0.2s',
              })}
            >
              CATEGORIES
            </NavLink>
            <NavLink
              to="/website/about"
              style={({ isActive }) => ({
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '0.88rem',
                letterSpacing: '0.03em',
                color: isActive ? '#ffb91f' : '#cbd5e1',
                borderBottom: isActive ? '2px solid #ffb91f' : '2px solid transparent',
                paddingBottom: '4px',
                transition: 'all 0.2s',
              })}
            >
              ABOUT US
            </NavLink>
            <NavLink
              to="/website/contact"
              style={({ isActive }) => ({
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '0.88rem',
                letterSpacing: '0.03em',
                color: isActive ? '#ffb91f' : '#cbd5e1',
                borderBottom: isActive ? '2px solid #ffb91f' : '2px solid transparent',
                paddingBottom: '4px',
                transition: 'all 0.2s',
              })}
            >
              CONTACT US
            </NavLink>
          </nav>

          {/* Right Header: Sleek Social Icons + Professional Hotline + Modern Cart */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
            {/* Social Media Header Icons (Facebook & TikTok) */}
            {(cleanFbUrl || cleanTiktokUrl) && (
              <div className="public-header-socials" style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingRight: '12px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
                {cleanFbUrl ? (
                  <a
                    href={cleanFbUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      backgroundColor: 'rgba(24, 119, 242, 0.12)',
                      color: '#1877f2',
                      border: '1px solid rgba(24, 119, 242, 0.35)',
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textDecoration: 'none',
                      transition: 'all 0.2s',
                    }}
                    title="Official Facebook Page"
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </a>
                ) : null}

                {cleanTiktokUrl ? (
                  <a
                    href={cleanTiktokUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.06)',
                      color: '#ffffff',
                      border: '1px solid rgba(255, 255, 255, 0.18)',
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textDecoration: 'none',
                      transition: 'all 0.2s',
                    }}
                    title="Official TikTok Channel"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.81 4.48 6.26 6.26 0 0 0 1.99-4.57V8.58a8.28 8.28 0 0 0 4.84 1.56V6.69h-.05z"/>
                    </svg>
                  </a>
                ) : null}
              </div>
            )}

            {/* Helpline Badge */}
            <a
              href={`tel:${(companyInfo.whatsapp || '03069258573').replace(/[^0-9]/g, '')}`}
              style={{
                display: 'none',
                alignItems: 'center',
                gap: '10px',
                color: '#ffffff',
                textDecoration: 'none',
              }}
              className="desktop-nav"
            >
              <div style={{ backgroundColor: 'rgba(255,185,31,0.12)', border: '1px solid rgba(255,185,31,0.3)', padding: '7px', borderRadius: '8px', color: '#ffb91f', display: 'flex' }}>
                <Phone size={15} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>24/7 Helpline</span>
                <span style={{ color: '#ffffff', fontWeight: 800, fontSize: '0.86rem' }}>0306-9258573</span>
              </div>
            </a>

            {/* Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: totalItems > 0 ? '#ffb91f' : 'rgba(255,255,255,0.06)',
                color: totalItems > 0 ? '#0f172a' : '#ffffff',
                border: totalItems > 0 ? 'none' : '1px solid rgba(255,255,255,0.14)',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
                position: 'relative',
                transition: 'all 0.2s',
              }}
              title="View Shopping Cart & Checkout"
            >
              <ShoppingBag size={17} />
              <span>Cart</span>
              {totalItems > 0 && (
                <span style={{
                  backgroundColor: '#0f172a',
                  color: '#ffb91f',
                  borderRadius: '12px',
                  padding: '2px 8px',
                  fontSize: '0.74rem',
                  fontWeight: 900,
                }}>
                  {totalItems}
                </span>
              )}
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#1e293b',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '8px',
                padding: '8px',
                cursor: 'pointer',
                color: '#ffffff'
              }}
              className="mobile-nav-toggle"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={20} color="#ffb91f" /> : <Menu size={20} color="#ffb91f" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Drawer */}
        {mobileMenuOpen && (
          <div style={{ backgroundColor: '#0b0f19', borderTop: '1px solid #1e293b', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <Link to="/website" onClick={() => setMobileMenuOpen(false)} style={{ textDecoration: 'none', color: '#ffffff', fontWeight: 700, padding: '8px 0', borderBottom: '1px solid #1e293b' }}>Home</Link>
            <Link to="/website/products" onClick={() => setMobileMenuOpen(false)} style={{ textDecoration: 'none', color: '#ffffff', fontWeight: 700, padding: '8px 0', borderBottom: '1px solid #1e293b' }}>Shop Products</Link>
            <Link to="/website/categories" onClick={() => setMobileMenuOpen(false)} style={{ textDecoration: 'none', color: '#ffffff', fontWeight: 700, padding: '8px 0', borderBottom: '1px solid #1e293b' }}>Product Categories</Link>
            <Link to="/website/about" onClick={() => setMobileMenuOpen(false)} style={{ textDecoration: 'none', color: '#ffffff', fontWeight: 700, padding: '8px 0', borderBottom: '1px solid #1e293b' }}>About Us</Link>
            <Link to="/website/contact" onClick={() => setMobileMenuOpen(false)} style={{ textDecoration: 'none', color: '#ffffff', fontWeight: 700, padding: '8px 0' }}>Contact Us</Link>
            
            <div style={{ marginTop: '10px', paddingTop: '12px', borderTop: '1px solid #1e293b', fontSize: '0.8rem', color: '#94a3b8' }}>
              <div>📍 54-Stop Near MCB Bank, Dipalpur Road, Okara</div>
              <div style={{ marginTop: '4px', color: '#ffb91f', fontWeight: 700 }}>📞 0306-9258573 / 0327-7497457</div>
              <div style={{ marginTop: '4px', color: '#ef4444', fontWeight: 600 }}>⏰ Saturday - Thursday: 8AM - 9PM (Friday Closed)</div>
            </div>
          </div>
        )}
      </header>

      {/* Main Page Content Body */}
      <main style={{ flex: 1, backgroundColor: '#ffffff' }}>
        {children}
      </main>

      {/* Public Footer - Rich Dark & Gold Styling matching reference screenshot */}
      <footer style={{ backgroundColor: '#0a0d14', color: '#cbd5e1', borderTop: '3px solid #ffb91f', paddingTop: '60px', paddingBottom: '30px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '44px' }}>
          
          {/* Col 1: Brand & Bio */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
              <img src="/logo.png" alt="Logo" style={{ width: '44px', height: '44px', objectFit: 'contain', borderRadius: '10px', backgroundColor: '#ffffff', padding: '3px', boxShadow: '0 2px 10px rgba(255,185,31,0.2)' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ color: '#ffffff', fontWeight: 900, fontSize: '1.2rem', letterSpacing: '0.03em', lineHeight: 1.2 }}>
                  RAFIQ AUTO & OIL <span style={{ color: '#ffb91f' }}>TRADERS</span>
                </div>
                <div className="urdu-text" style={{ color: '#ffb91f', fontSize: '0.92rem', fontWeight: 700, marginTop: '2px', lineHeight: 1.4 }}>
                  رفیق آٹو اینڈ آئل ٹریڈرز - اوکاڑہ
                </div>
              </div>
            </div>
            
            <p style={{ fontSize: '0.88rem', lineHeight: 1.7, color: '#94a3b8', margin: '0 0 20px 0' }}>
              Okara's trusted automotive lubricants and engine oil wholesale depot. Providing guaranteed genuine passenger car oils, commercial lubricants, filters, and motorcycle care products across Punjab.
            </p>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '0.75rem', backgroundColor: 'rgba(255, 185, 31, 0.1)', color: '#ffb91f', border: '1px solid rgba(255,185,31,0.3)', padding: '5px 12px', borderRadius: '20px', fontWeight: 700 }}>
                • 100% Genuine Oils
              </span>
              <span style={{ fontSize: '0.75rem', backgroundColor: 'rgba(255, 185, 31, 0.1)', color: '#ffb91f', border: '1px solid rgba(255,185,31,0.3)', padding: '5px 12px', borderRadius: '20px', fontWeight: 700 }}>
                • Wholesale Rates
              </span>
              <span style={{ fontSize: '0.75rem', backgroundColor: 'rgba(255, 185, 31, 0.1)', color: '#ffb91f', border: '1px solid rgba(255,185,31,0.3)', padding: '5px 12px', borderRadius: '20px', fontWeight: 700 }}>
                • Okara Van Route
              </span>
            </div>
          </div>

          {/* Col 2: Shop Navigation */}
          <div>
            <h4 style={{ color: '#ffb91f', fontSize: '0.95rem', fontWeight: 800, marginBottom: '20px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Shop
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem' }}>
              <li><Link to="/website/products" style={{ color: '#cbd5e1', textDecoration: 'none', transition: 'color 0.2s' }}>All products</Link></li>
              <li><Link to="/website/products?category=Lubricant" style={{ color: '#cbd5e1', textDecoration: 'none', transition: 'color 0.2s' }}>Engine oils</Link></li>
              <li><Link to="/website/products?category=All%20Filter" style={{ color: '#cbd5e1', textDecoration: 'none', transition: 'color 0.2s' }}>Filters and parts</Link></li>
              <li><Link to="/website/products?category=Car%20Care" style={{ color: '#cbd5e1', textDecoration: 'none', transition: 'color 0.2s' }}>Car care</Link></li>
              <li><Link to="/website/products?category=Bike%20Care" style={{ color: '#cbd5e1', textDecoration: 'none', transition: 'color 0.2s' }}>Bike care & 4T oils</Link></li>
            </ul>
          </div>

          {/* Col 3: Customer Care */}
          <div>
            <h4 style={{ color: '#ffb91f', fontSize: '0.95rem', fontWeight: 800, marginBottom: '20px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Customer Care & Guides
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem' }}>
              <li><Link to="/website/about" style={{ color: '#cbd5e1', textDecoration: 'none' }}>About us</Link></li>
              <li><Link to="/website/contact" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Contact us & Inquiries</Link></li>
              <li><Link to="/website" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Why Choose Rafiq Auto</Link></li>
              <li>
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: '#4ade80', textDecoration: 'none', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  Ask on WhatsApp
                </a>
              </li>
              {companyInfo.facebookUrl && (
                <li>
                  <a
                    href={companyInfo.facebookUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <span>📘 Follow on Facebook</span>
                  </a>
                </li>
              )}
              {companyInfo.tiktokUrl && (
                <li>
                  <a
                    href={companyInfo.tiktokUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#f43f5e', textDecoration: 'none', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <span>🎵 Watch on TikTok</span>
                  </a>
                </li>
              )}
            </ul>
          </div>

          {/* Col 4: Depot & Contact Information - Dynamic from Admin Settings */}
          <div>
            <h4 style={{ color: '#ffb91f', fontSize: '0.95rem', fontWeight: 800, marginBottom: '20px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              About & Depot
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.88rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <MapPin size={18} color="#ffb91f" style={{ marginTop: '3px', flexShrink: 0 }} />
                <span style={{ lineHeight: 1.5 }}>
                  {companyInfo.address}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Phone size={18} color="#ffb91f" style={{ flexShrink: 0 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <a href={`tel:${cleanWhatsapp}`} style={{ color: '#ffffff', textDecoration: 'none', fontWeight: 700 }}>
                    {companyInfo.phone}
                  </a>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    Proprietors: {companyInfo.proprietorNames}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <Clock size={18} color="#ffb91f" style={{ marginTop: '3px', flexShrink: 0 }} />
                <div>
                  <div style={{ color: '#ffffff', fontWeight: 700 }}>
                    {companyInfo.operatingSchedule || '24/7 Operations (Round the Clock Support)'}
                  </div>
                  <div style={{ color: '#4ade80', fontWeight: 800, fontSize: '0.82rem', marginTop: '2px' }}>
                    Open 24/7 (Non-Stop Service & Dispatch)
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#ffb91f', marginTop: '4px' }}>
                    Delivery Hubs: {companyInfo.operationalAreas}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div style={{ maxWidth: '1280px', margin: '40px auto 0 auto', padding: '24px 24px 0 24px', borderTop: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', fontSize: '0.82rem', color: '#64748b' }}>
          <div>
            © {new Date().getFullYear()} <strong style={{ color: '#cbd5e1' }}>Rafiq Auto & Oil Traders</strong> ({companyInfo.proprietorNames}). All rights reserved.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <span>{companyInfo.operationalAreas} Hubs</span>
            <span style={{ color: '#334155' }}>|</span>
            <span style={{ color: '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              Developed by <strong style={{ color: '#ffb91f', letterSpacing: '0.03em' }}>Nexura Digital</strong>
            </span>
          </div>
        </div>
      </footer>

      {/* Floating Action Buttons matching reference screenshot */}
      <div className="floating-actions-container" style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        zIndex: 9999,
      }}>
        {/* Scroll To Top Button (Aesthetic Rich Gold Circle with inner border & shadow) */}
        {showScrollTop && (
          <button
            onClick={scrollToTop}
            aria-label="Scroll to top"
            className="scroll-top-btn"
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #ffb91f 0%, #e09b00 100%)',
              color: '#0f172a',
              border: '2px solid rgba(255, 255, 255, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 6px 16px rgba(0,0,0,0.35)',
            }}
          >
            <ArrowUp size={22} strokeWidth={3} />
          </button>
        )}

        {/* Floating Facebook Action Button */}
        {cleanFbUrl ? (
          <a
            href={cleanFbUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Visit Facebook Page"
            className="fb-floating-btn"
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #1877f2 0%, #0d5cb6 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
              border: '2px solid rgba(255, 255, 255, 0.4)',
              boxShadow: '0 8px 20px rgba(24, 119, 242, 0.45)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            title="Official Facebook Page"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </a>
        ) : null}

        {/* Floating TikTok Action Button */}
        {cleanTiktokUrl ? (
          <a
            href={cleanTiktokUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Visit TikTok Channel"
            className="tiktok-floating-btn"
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #010101 0%, #161823 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
              border: '2px solid #00f2fe',
              boxShadow: '0 8px 20px rgba(255, 0, 80, 0.4), 0 0 10px rgba(0, 242, 254, 0.3)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            title="Official TikTok Channel"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.81 4.48 6.26 6.26 0 0 0 1.99-4.57V8.58a8.28 8.28 0 0 0 4.84 1.56V6.69h-.05z"/>
            </svg>
          </a>
        ) : null}

        {/* WhatsApp Floating Button */}
        <a
          href={waUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="Chat on WhatsApp"
          className="wa-floating-btn"
          style={{
            width: '58px',
            height: '58px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #2fe574 0%, #1da851 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textDecoration: 'none',
            border: '2px solid rgba(255, 255, 255, 0.35)',
            boxShadow: '0 8px 24px rgba(37, 211, 102, 0.5)',
          }}
          title="Direct WhatsApp Chat"
        >
          {/* Official WhatsApp SVG with crisp phone handset & bubble tail */}
          <svg width="34" height="34" viewBox="0 0 32 32" fill="none">
            <path
              d="M16 2.667C8.636 2.667 2.667 8.636 2.667 16c0 2.507.693 4.853 1.907 6.867L2.667 29.333l6.666-1.853A13.267 13.267 0 0016 29.333c7.364 0 13.333-5.969 13.333-13.333S23.364 2.667 16 2.667z"
              fill="#25D366"
            />
            <path
              d="M16 4C9.373 4 4 9.373 4 16c0 2.307.653 4.467 1.787 6.307l-.374 1.373-1.093 4 4.093-1.08.147-.04A11.933 11.933 0 0016 28c6.627 0 12-5.373 12-12S22.627 4 16 4z"
              fill="#25D366"
            />
            <path
              d="M22.253 18.987c-.347-.174-2.053-1.013-2.373-1.133-.32-.12-.547-.174-.787.174-.24.346-.92 1.133-1.133 1.373-.213.24-.413.267-.76.093-.347-.173-1.467-.54-2.787-1.72-1.026-.92-1.72-2.053-1.92-2.4-.2-.347-.027-.534.147-.707.16-.16.347-.413.52-.613.173-.2.24-.347.36-.587.12-.24.067-.453-.027-.627-.093-.173-.787-1.906-1.08-2.6-.28-.68-.573-.587-.787-.6-.2-.013-.44-.013-.68-.013-.24 0-.627.093-.96.453-.333.36-1.28 1.253-1.28 3.053 0 1.8 1.307 3.547 1.493 3.787.187.24 2.573 3.933 6.24 5.52.867.373 1.547.6 2.08.773.88.28 1.68.24 2.307.147.707-.107 2.053-.84 2.347-1.653.293-.814.293-1.52.2-1.667-.08-.133-.307-.227-.64-.4z"
              fill="#ffffff"
            />
          </svg>
        </a>
      </div>

      {/* Cart Drawer */}
      <CartDrawer />
    </div>
  );
};
