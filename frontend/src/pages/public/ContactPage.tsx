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
  MessageSquare,
  Navigation,
  ShieldCheck
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
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=54-Stop+Near+MCB+Bank+Dipalpur+Road+Okara`;

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
          رابطہ و ڈپو لوکیشن (Contact & Location)
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.98rem', margin: '6px 0 0 0' }}>
          ہول سیل کاٹن ریٹ لسٹ، وین ڈلیوری شیڈول یا فوری آرڈر کے لیے ہم سے رابطہ کریں۔
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '40px' }}>
        {/* Left: Contact Information Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', margin: '0 0 20px 0' }}>
              مرکزی ڈپو کی معلومات (Depot Details)
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div style={{ backgroundColor: '#fef3c7', padding: '12px', borderRadius: '12px', color: '#d97706', flexShrink: 0 }}>
                  <MapPin size={24} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>ڈپو و کاؤنٹر کا پتہ</div>
                  <div style={{ fontSize: '0.9rem', color: '#475569', marginTop: '3px', lineHeight: 1.5 }}>
                    {company.address}
                  </div>
                  <div style={{ marginTop: '8px' }}>
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        color: '#d97706',
                        textDecoration: 'none',
                        backgroundColor: '#fffbeb',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: '1px solid #fde68a'
                      }}
                    >
                      <Navigation size={13} /> گوگل میپس پر راستہ دیکھیں
                    </a>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div style={{ backgroundColor: '#e0f2fe', padding: '12px', borderRadius: '12px', color: '#0284c7', flexShrink: 0 }}>
                  <Phone size={24} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>فون و ہیلپ لائن نمبرز</div>
                  <div style={{ fontSize: '0.92rem', color: '#0284c7', marginTop: '3px', fontWeight: 700 }}>
                    <a href={`tel:${cleanWa}`} style={{ color: '#0284c7', textDecoration: 'none' }}>{company.phone}</a>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '2px' }}>
                    پروپرائیٹرز: <strong>{company.proprietorNames}</strong>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div style={{ backgroundColor: '#dcfce7', padding: '12px', borderRadius: '12px', color: '#16a34a', flexShrink: 0 }}>
                  <Clock size={24} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>اوقاتِ کار (Timings)</div>
                  <div style={{ fontSize: '0.9rem', color: '#15803d', marginTop: '2px', fontWeight: 800 }}>
                    🟢 24/7 کھلا ہے (چوبیس گھنٹے سروس دستیاب ہے)
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                    جمعہ تعطیل منسوخ — ہفتے کے ساتوں دن بلاتعطل فراہمی
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div style={{ backgroundColor: '#f1f5f9', padding: '12px', borderRadius: '12px', color: '#475569', flexShrink: 0 }}>
                  <Mail size={24} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>ای میل پتہ</div>
                  <div style={{ fontSize: '0.88rem', color: '#64748b', marginTop: '2px' }}>
                    <a href={`mailto:${company.email}`} style={{ color: '#0284c7', textDecoration: 'none', fontWeight: 600 }}>
                      {company.email}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick WhatsApp Rate Request Box */}
          <div style={{
            background: 'linear-gradient(135deg, #090d16 0%, #1e293b 100%)',
            color: '#ffffff',
            borderRadius: '16px',
            padding: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#ffffff' }}>فوری ہول سیل ریٹ لسٹ درکار ہے؟</div>
              <div style={{ fontSize: '0.84rem', color: '#94a3b8', marginTop: '4px' }}>
                سیلز آفیسر سے واٹس ایپ پر براہِ راست بات کریں: <strong>{company.whatsapp || '0306-9258573'}</strong>
              </div>
            </div>
            <a
              href={waContactUrl}
              target="_blank"
              rel="noreferrer"
              className="wa-floating-btn"
              style={{
                backgroundColor: '#16a34a',
                color: '#ffffff',
                padding: '12px 24px',
                borderRadius: '10px',
                fontWeight: 800,
                fontSize: '0.9rem',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>واٹس ایپ چیٹ شروع کریں</span>
            </a>
          </div>
        </div>

        {/* Right: Message / Quote Request Form */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '36px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', margin: '0 0 6px 0' }}>
            پیغام یا ریٹ کوٹیشن کی درخواست بھیجیں
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0 0 24px 0' }}>
            نیچے دیا گیا فارم پُر کریں، ہمارا نمائندہ جلد آپ سے رابطہ کرے گا۔
          </p>

          {success ? (
            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
              <CheckCircle2 size={42} color="#16a34a" style={{ margin: '0 auto 12px auto' }} />
              <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#166534', margin: '0 0 6px 0' }}>
                آپ کا پیغام موصول ہو گیا ہے!
              </h4>
              <p style={{ color: '#15803d', fontSize: '0.88rem', margin: '0 0 16px 0' }}>
                ہمارا سیلز نمائندہ آپ کے فراہم کردہ فون نمبر پر جلد رابطہ کرے گا۔
              </p>
              <button
                type="button"
                onClick={() => setSuccess(false)}
                className="btn btn-outline-primary btn-sm"
              >
                نیا پیغام بھیجیں
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {error && (
                <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', padding: '10px 14px', borderRadius: '8px', color: '#991b1b', fontSize: '0.85rem' }}>
                  {error}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  آپ کا نام / دکان کا نام *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً: علی رضا / رضا آٹو ورکشاپ"
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

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  موبائل / واٹس ایپ نمبر *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="03001234567"
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
                  موضوع / آرڈر کی قسم
                </label>
                <input
                  type="text"
                  placeholder="مثلاً: کاٹن ہول سیل ریٹس یا وین ڈلیوری شیڈول"
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
                  پیغام یا مطلوبہ آئل گریڈز کی تفصیل
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="مطلوبہ برانڈز اور کاٹن کی تعداد درج کریں..."
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
                    resize: 'vertical'
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
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(217, 119, 6, 0.35)',
                  marginTop: '8px'
                }}
              >
                <Send size={16} />
                <span>{loading ? 'پیغام بھیجا جا رہا ہے...' : 'پیغام روانہ کریں'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
