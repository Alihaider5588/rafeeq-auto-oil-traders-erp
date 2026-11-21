import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  ShieldCheck,
  Truck,
  Building2,
  Award,
  Users,
  MapPin,
  CheckCircle2,
  Phone,
  ChevronRight,
  ArrowRight,
  Clock,
  Sparkles,
  FileText
} from 'lucide-react';

export const AboutPage: React.FC = () => {
  const [company, setCompany] = useState<any>({
    address: '54-Stop Near MCB Bank, Dipalpur Road, Okara',
    proprietorNames: 'M. Shafiq & Haji Muhammad Rafiq',
    operationalAreas: 'Okara, Sahiwal, Kasur',
    email: 'rafiqtreders003@gmail.com',
    phone: '0306-9258573 / 0327-7497457',
    whatsapp: '0306-9258573',
  });

  useEffect(() => {
    api.get('/public/company')
      .then(res => {
        if (res.data?.success && res.data.company) {
          setCompany(res.data.company);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '36px 20px' }}>
      {/* Breadcrumb Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#64748b', marginBottom: '8px' }}>
          <Link to="/website" style={{ color: '#64748b', textDecoration: 'none' }}>Home</Link>
          <ChevronRight size={14} />
          <span style={{ color: '#0f172a', fontWeight: 600 }}>About Us</span>
        </div>
        <h1 style={{ fontSize: '2.4rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
          ہمارا تعارف و کاروباری منشور (About Rafiq Auto)
        </h1>
        <div style={{ fontSize: '1.05rem', color: '#d97706', fontWeight: 800, marginTop: '4px' }}>
          رفیق آٹو اینڈ آئل ٹریڈرز — 54-سٹاپ، نزد ایم سی بی بینک، دیپالپور روڈ، اوکاڑہ
        </div>
      </div>

      {/* Hero Story Banner */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '20px',
        padding: '40px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
        marginBottom: '40px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '40px',
        alignItems: 'center',
      }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#fef3c7', color: '#b45309', padding: '4px 12px', borderRadius: '16px', fontSize: '0.8rem', fontWeight: 800, marginBottom: '14px' }}>
            <Award size={15} /> 20 سالہ اعتماد و دیانت کا سفر
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', margin: '0 0 16px 0', lineHeight: 1.3 }}>
            اوکاڑہ اور پنجاب میں 100 فیصد اصل انجن آئل اور مستند ہول سیل سپلائی
          </h2>
          <p style={{ fontSize: '0.96rem', color: '#475569', lineHeight: 1.75, margin: '0 0 16px 0' }}>
            <strong>رفیق آٹو اینڈ آئل ٹریڈرز</strong> (پروپرائیٹرز: <strong>{company.proprietorNames}</strong>) پنجاب کی آٹوموٹو، ٹرانسپورٹ اور ایگریکلچر کمیونٹی کے لیے ایک مستند اور قابلِ اعتماد ہول سیل لبریکینٹ مرکز ہے۔
          </p>
          <p style={{ fontSize: '0.96rem', color: '#475569', lineHeight: 1.75, margin: '0 0 24px 0' }}>
            ہم اچھی طرح جانتے ہیں کہ مارکیٹ میں گھٹیا اور ری فل شدہ دو نمبر آئل گاڑیوں کے قیمتی انجن تباہ کر دیتا ہے اور ورکشاپ کے مکینک کا نام خراب ہوتا ہے۔ اسی لیے ہمارا اصول ہے: <em>"کم منافع، لیکن مال صرف اور صرف 100 فیصد اصل کمپنی سے مہر بند۔"</em>
          </p>

          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <Link
              to="/website/products"
              style={{
                backgroundColor: '#d97706',
                color: '#ffffff',
                padding: '12px 24px',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.9rem',
                textDecoration: 'none',
                boxShadow: '0 4px 12px rgba(217, 119, 6, 0.3)',
              }}
            >
              پروڈکٹس دیکھیں
            </Link>
            <a
              href={`https://wa.me/92${(company.whatsapp || '03069258573').replace(/[^0-9]/g, '').replace(/^0/, '')}?text=Salam%20Rafiq%20Auto.%20I%20want%20to%20connect%20regarding%20wholesale%20orders.`}
              target="_blank"
              rel="noreferrer"
              style={{
                backgroundColor: '#0f172a',
                color: '#ffffff',
                padding: '12px 24px',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.9rem',
                textDecoration: 'none',
              }}
            >
              واٹس ایپ رابطہ
            </a>
          </div>
        </div>

        {/* Highlight Stats Card with Warehouse background */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(9, 13, 22, 0.95) 0%, rgba(15, 23, 42, 0.94) 100%), url("/hero-warehouse.jpg") center/cover no-repeat',
          backgroundBlendMode: 'multiply',
          color: '#ffffff',
          borderRadius: '18px',
          padding: '36px',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          boxShadow: '0 12px 30px rgba(0,0,0,0.3)',
        }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#f59e0b', margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={22} color="#f59e0b" /> ڈپو کی نمایاں خصوصیات (Key Highlights)
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '22px' }}>
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '14px' }}>
              <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#38bdf8' }}>100%</div>
              <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '2px', fontWeight: 700 }}>اصل کمپنی برانڈز</div>
            </div>

            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '14px' }}>
              <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#22c55e' }}>20+</div>
              <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '2px', fontWeight: 700 }}>سالہ تجارتی تجربہ</div>
            </div>

            <div>
              <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#f59e0b' }}>Daily</div>
              <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '2px', fontWeight: 700 }}>سپلائی وین ڈلیوری</div>
            </div>

            <div>
              <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#a855f7' }}>500+</div>
              <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '2px', fontWeight: 700 }}>ورکشاپس و ڈیلرز نیٹ ورک</div>
            </div>
          </div>
        </div>
      </div>

      {/* Core Values Section */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.7rem', fontWeight: 900, color: '#0f172a', marginBottom: '24px' }}>
          ہمارے 3 بنیادی کاروباری اصول
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          <div className="premium-hover-card" style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '26px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '12px', backgroundColor: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <ShieldCheck size={28} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', margin: '0 0 8px 0' }}>
              1. اصل مال اور سالم سیل کی گارنٹی
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.7, margin: 0 }}>
              تمام لبریکنٹس (Total, Shell, ZIC, Mobil, Castrol, Caltex, Guard) صرف آفیشل کمپنی چینل سے آتے ہیں۔ سیل ٹوٹی ہوئی یا شک والی کوئی بوتل ہمارے ڈپو میں داخل نہیں ہو سکتی۔
            </p>
          </div>

          <div className="premium-hover-card" style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '26px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '12px', backgroundColor: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <Truck size={28} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', margin: '0 0 8px 0' }}>
              2. دکان و ورکشاپ پر بروقت ترسیل
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.7, margin: 0 }}>
              ہماری سپلائی وین اوکاڑہ، ساہیوال، قصور، دیپالپور اور رینالہ خورد کے راستوں پر چلتی ہے، تاکہ مکینک حضرات کو کام چھوڑ کر مال لینے شہر نہ بھاگنا پڑے۔
            </p>
          </div>

          <div className="premium-hover-card" style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '26px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '12px', backgroundColor: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <Award size={28} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', margin: '0 0 8px 0' }}>
              3. ہول سیل ریٹس اور شفاف کھاتہ
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.7, margin: 0 }}>
              کاٹن پر خصوصی رعایت، کمپیوٹرائزڈ رسیدیں، اور باقاعدہ ڈیلرز کے لیے ادھار کھاتہ (Udhar Ledger) کی مکمل شفاف سہولت فراہم کی جاتی ہے۔
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
