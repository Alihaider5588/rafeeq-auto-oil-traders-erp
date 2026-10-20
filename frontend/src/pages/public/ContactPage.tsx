import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  MessageSquare
} from 'lucide-react';

export const ContactPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    subject: '',
    message: '',
  });

  const [company, setCompany] = useState<any>({
    address: '54-Stop Near MCB Bank, Dipalpur Road, Okara, Punjab, Pakistan',
    phone: '0306-9258573 / 0327-7497457',
    whatsapp: '0306-9258573',
    email: 'rafiqtreders003@gmail.com',
    proprietorNames: 'M. Shafiq & Haji Muhammad Rafiq',
    operationalAreas: 'Okara, Sahiwal, Kasur',
  });

  React.useEffect(() => {
    api.get('/public/company')
      .then(res => {
        if (res.data?.success && res.data.company) {
          setCompany(res.data.company);
        }
      })
      .catch(() => {});
  }, []);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleanWa = (company.whatsapp || '03069258573').replace(/[^0-9]/g, '');
  const waContactUrl = `https://wa.me/92${cleanWa.startsWith('0') ? cleanWa.slice(1) : cleanWa}?text=Salam%20Rafiq%20Auto.%20I%20need%20wholesale%20rates%20for%20engine%20oils.`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.post('/public/contact', formData);
      if (res.data?.success) {
        setSuccess(true);
        setFormData({ name: '', phone: '', email: '', subject: '', message: '' });
      } else {
        setError(res.data?.message || 'Failed to submit message.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Network error submitting inquiry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '36px 20px' }}>
      {/* Breadcrumb Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#64748b', marginBottom: '8px' }}>
          <Link to="/website" style={{ color: '#64748b', textDecoration: 'none' }}>Home</Link>
          <ChevronRight size={14} />
          <span style={{ color: '#0f172a', fontWeight: 600 }}>Contact Us</span>
        </div>
        <h1 style={{ fontSize: '2.4rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
          Contact Our Depot & Sales Desk
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem', margin: '6px 0 0 0' }}>
          Get in touch for wholesale rate sheets, bulk carton orders, or van route supply schedule.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '40px' }}>
        {/* Left: Contact Information Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '30px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 20px 0' }}>
              Depot Information
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div style={{ backgroundColor: '#fef3c7', padding: '10px', borderRadius: '10px', color: '#d97706', flexShrink: 0 }}>
                  <MapPin size={22} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>Depot & Counter Location</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px', lineHeight: 1.5 }}>
                    {company.address}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#d97706', fontWeight: 600, marginTop: '2px' }}>
                    {company.operationalAreas} Sectors Distribution
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div style={{ backgroundColor: '#e0f2fe', padding: '10px', borderRadius: '10px', color: '#0284c7', flexShrink: 0 }}>
                  <Phone size={22} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>Phone & Mobile Numbers</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
                    <a href={`tel:${cleanWa}`} style={{ color: '#0284c7', textDecoration: 'none', fontWeight: 600 }}>{company.phone}</a>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                    Proprietors: <strong>{company.proprietorNames}</strong>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div style={{ backgroundColor: '#dcfce7', padding: '10px', borderRadius: '10px', color: '#16a34a', flexShrink: 0 }}>
                  <Mail size={22} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>Official Email Address</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
                    <a href={`mailto:${company.email}`} style={{ color: '#0284c7', textDecoration: 'none', fontWeight: 600 }}>
                      {company.email}
                    </a>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div style={{ backgroundColor: '#f1f5f9', padding: '10px', borderRadius: '10px', color: '#16a34a', flexShrink: 0 }}>
                  <Clock size={22} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>Service Schedule & Operations</div>
                  <div style={{ fontSize: '0.85rem', color: '#15803d', marginTop: '2px', fontWeight: 800 }}>
                    {company.operatingSchedule || '24/7 Operations (Round the Clock Support)'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                    Open 24 Hours • Wholesale Dispatch across {company.operationalAreas || 'Okara, Sahiwal, Kasur'}
                  </div>
                </div>
              </div>

              {/* Social Channels on Contact Page */}
              {(company.facebookUrl || company.tiktokUrl) && (
                <div style={{ paddingTop: '10px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>Follow Us Online:</span>
                  {company.facebookUrl && (
                    <a
                      href={company.facebookUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        backgroundColor: '#1877f2',
                        color: '#ffffff',
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      📘 Facebook Page
                    </a>
                  )}
                  {company.tiktokUrl && (
                    <a
                      href={company.tiktokUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        backgroundColor: '#000000',
                        color: '#00f2fe',
                        border: '1px solid #ff0050',
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      🎵 TikTok Channel
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quick WhatsApp Action Box */}
          <div style={{ backgroundColor: '#090d16', color: '#ffffff', borderRadius: '14px', padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#f8fafc' }}>Need Immediate Wholesale Pricing?</div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>Connect with our sales officer on WhatsApp: <strong>{company.whatsapp || '0306-9258573'}</strong></div>
            </div>
            <a
              href={waContactUrl}
              target="_blank"
              rel="noreferrer"
              className="wa-card-btn"
              style={{
                padding: '11px 20px',
                borderRadius: '10px',
                fontWeight: 800,
                fontSize: '0.88rem',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
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
              <span>WhatsApp Chat</span>
            </a>
          </div>
        </div>

        {/* Right: Interactive Message & Quote Form */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '32px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
            Send Inquiry / Request Price Quote
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 24px 0' }}>
            Fill out the details below and our dispatch team will contact you with wholesale terms.
          </p>

          {success && (
            <div style={{
              backgroundColor: '#dcfce7',
              border: '1px solid #86efac',
              color: '#166534',
              padding: '14px 18px',
              borderRadius: '8px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '0.9rem',
            }}>
              <CheckCircle2 size={20} color="#16a34a" />
              Thank you! Your inquiry has been received. Our sales team will get back to you shortly.
            </div>
          )}

          {error && (
            <div style={{
              backgroundColor: '#fee2e2',
              border: '1px solid #fca5a5',
              color: '#991b1b',
              padding: '14px 18px',
              borderRadius: '8px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '0.9rem',
            }}>
              <AlertCircle size={20} color="#dc2626" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Your Name / Workshop Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Haji Rashid / Bismillah Autos"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Mobile / Phone Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="0300-1234567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  placeholder="contact@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Subject / Required Products
              </label>
              <input
                type="text"
                placeholder="e.g. Bulk quote for Total 5W-40 & Guard Filters"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Message & Order Details *
              </label>
              <textarea
                required
                rows={4}
                placeholder="Specify carton quantities, delivery location, or questions..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: '#d97706',
                color: '#ffffff',
                border: 'none',
                padding: '13px 24px',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.92rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '6px',
                boxShadow: '0 2px 8px rgba(217,119,6,0.3)',
              }}
            >
              <Send size={16} />
              {loading ? 'Submitting Inquiry...' : 'Submit Message'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
