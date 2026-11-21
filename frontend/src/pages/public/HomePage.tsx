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
  Star,
  ChevronDown,
  Car,
  Fuel,
  Check,
  Zap,
  HelpCircle,
  FileText
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

  // Interactive Vehicle Lube Finder Tab State
  const [activeVehicleTab, setActiveVehicleTab] = useState<'small_car' | 'sedan' | 'diesel' | 'tractor' | 'bike'>('small_car');

  const [company, setCompany] = useState<any>({
    phone: '0306-9258573 / 0327-7497457',
    whatsapp: '0306-9258573',
    proprietorNames: 'M. Shafiq & Haji Muhammad Rafiq',
    operationalAreas: 'Okara, Sahiwal, Kasur',
    address: '54-Stop Near MCB Bank, Dipalpur Road, Okara',
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

  const handleBrandClick = (brandName: string) => {
    navigate(`/website/products?brand=${encodeURIComponent(brandName)}`);
  };

  const categoryIcons: Record<string, any> = {
    Lubricant: Droplet,
    'Car Care': Sparkles,
    'Bike Care': Gauge,
    'All Filter': Layers,
    'Spare Part': Wrench,
    Other: Tag,
  };

  // Top Authentic Lubricant Brands in Punjab Trade
  const brandList = [
    { name: 'TotalEnergies', sub: 'Quartz & Rubia', color: '#ef4444' },
    { name: 'Shell', sub: 'Helix & Rimula', color: '#eab308' },
    { name: 'ZIC', sub: 'SK Lubricants', color: '#3b82f6' },
    { name: 'Castrol', sub: 'GTX & Magnatec', color: '#10b981' },
    { name: 'Caltex', sub: 'Havoline & Delo', color: '#f97316' },
    { name: 'Mobil', sub: '1 & Delvac', color: '#dc2626' },
    { name: 'Guard', sub: 'Filters & Lubricants', color: '#8b5cf6' },
    { name: 'Kixx', sub: 'GS Caltex Korea', color: '#06b6d4' },
  ];

  // Vehicle Finder Data Specs
  const vehicleGuides = {
    small_car: {
      title: 'چھوٹی جاپانی و لوکل پیٹرول کاریں (660cc - 1000cc)',
      vehicles: 'Suzuki Alto, WagonR, Cultus, Mira, Move, Vitz, Picanto',
      recommendedGrade: '0W-20 یا 5W-30 Full Synthetic',
      apiRating: 'API SP / SN Plus / ILSAC GF-6',
      drainInterval: '5,000 تا 7,000 کلومیٹر',
      desc: 'چھوٹے جدید انجنوں میں ایندھن کی بچت اور کولڈ اسٹارٹ پروٹیکشن کے لیے پتلا اور تیز بہاؤ والا مکمل سنتھیٹک آئل لازمی ہے۔ زیادہ گاڑھا آئل ڈالنے سے پٹرول ایوریج گر جاتی ہے اور کیٹلیٹک کنورٹر چوک ہوتا ہے۔',
      topPicks: ['Total Quartz 9000 0W-20 / 5W-30', 'Shell Helix Ultra 5W-30', 'ZIC X7 / X9 5W-30', 'Guard Oil Filter'],
      searchTag: '5W-30',
    },
    sedan: {
      title: 'سیڈان، فیملی کاریں و کراس اوور (1300cc - 1800cc)',
      vehicles: 'Toyota Corolla, Yaris, Honda Civic, City, Changan Alsvin, Swift',
      recommendedGrade: '5W-30 یا 10W-40 Synthetic Blend',
      apiRating: 'API SP / SN / ACEA A3/B4',
      drainInterval: '4,000 تا 6,000 کلومیٹر',
      desc: 'ہائی اسپیڈ موٹروے ڈرائیونگ اور پنجاب کی گرمیوں میں انجن کے درجہ حرارت کو کنٹرول میں رکھنے کے لیے ہائی تھرمل اسٹیبلٹی والا آئل درکار ہوتا ہے۔',
      topPicks: ['Total Quartz 7000 10W-40', 'Shell Helix HX7 10W-40', 'Castrol GTX Magnatec', 'ZIC X7 10W-40'],
      searchTag: '10W-40',
    },
    diesel: {
      title: 'کمرشل ڈیزل گاڑیاں، پک اپ و وینز (Turbo Diesel)',
      vehicles: 'Toyota Hilux, Revo, Isuzu D-Max, Shehzore, Hiace, Master, Bedford',
      recommendedGrade: '15W-40 یا 20W-50 Heavy Duty Diesel',
      apiRating: 'API CI-4 / CK-4 / CH-4',
      drainInterval: '3,000 تا 5,000 کلومیٹر',
      desc: 'ڈیزل ٹربو انجنز میں کاربن سُوٹ (Soot) بنتا ہے۔ ہماری پیش کردہ رینج سُوٹ کو انجن والوز اور پسٹن کے ساتھ چپکنے نہیں دیتی اور کیمشافٹ کو گھسنے سے بچاتی ہے۔',
      topPicks: ['Total Rubia TIR 7400 15W-40', 'Shell Rimula R4 X 15W-40', 'Caltex Delo 400 15W-40', 'Mobil Delvac Super'],
      searchTag: '15W-40',
    },
    tractor: {
      title: 'ٹریکٹرز، تھریشر و زرعی مشینری (Agriculture Punjab)',
      vehicles: 'Millat / Massey Ferguson (MF 240, 375, 385), Fiat / Al-Ghazi, New Holland, Harvesters',
      recommendedGrade: '20W-50 Turbo Diesel + AW-68 Hydraulic Oil + Gear 90/140',
      apiRating: 'API CF-4 / CD & ISO VG 68',
      drainInterval: '150 تا 250 ورکنگ گھنٹے',
      desc: 'زمینوں کی سخت گرمی اور گرد و غبار میں ٹریکٹر انجن کو مسلسل لوڈ پر چلانے کے لیے خصوصی اینٹی ویئر زنک ایڈیٹوز والا آئل اور معیاری فلٹرز درکار ہوتے ہیں۔',
      topPicks: ['Shell Rimula R3 20W-50', 'Total Rubia 20W-50', 'Guard Tractor Oil & Fuel Filters', 'Hydraulic Oil AW-68'],
      searchTag: '20W-50',
    },
    bike: {
      title: 'موٹر سائیکلز (70cc, 125cc, 150cc) اور 3-وہیلر لوڈر رکشہ',
      vehicles: 'Honda CD70, CG125, Pridor, Yamaha YBR, Suzuki GS150, لوڈر رکشہ',
      recommendedGrade: '4T 20W-50 یا 10W-40 4-Stroke Motorcycle Oil',
      apiRating: 'JASO MA2 / API SL / SN',
      drainInterval: '1,000 تا 1,500 کلومیٹر',
      desc: 'موٹر سائیکل میں وہی آئل کلچ پلیٹس، گیئر باکس اور انجن تینوں کو لبریکیٹ کرتا ہے۔ اس لیے کار کا آئل موٹر سائیکل میں کبھی نہ ڈالیں ورنہ کلچ سلپ ہو جائے گا۔ ہمیشہ JASO MA2 مصدقہ 4T آئل استعمال کریں۔',
      topPicks: ['Total Hi-Perf 4T 20W-50', 'Shell Advance 4T AX5 / Ultra', 'Castrol Activ 4T', 'ZIC M7 4T'],
      searchTag: '4T',
    },
  };

  const activeGuide = vehicleGuides[activeVehicleTab];

  return (
    <div style={{ backgroundColor: '#090d16', color: '#f8fafc' }}>
      
      {/* =========================================================================
          HERO SECTION: Authentic, High-Conversion Petroleum Wholesale Styling
          ========================================================================= */}
      <section className="hero-section" style={{
        background: 'linear-gradient(135deg, rgba(9, 13, 22, 0.96) 0%, rgba(15, 23, 42, 0.94) 100%), url("/hero-warehouse.jpg") center/cover no-repeat',
        backgroundBlendMode: 'multiply',
        color: '#ffffff',
        padding: '75px 20px 65px 20px',
        position: 'relative',
        overflow: 'hidden',
        borderBottom: '1px solid rgba(245, 158, 11, 0.25)',
      }}>
        {/* Subtle radial ambient glow */}
        <div style={{
          position: 'absolute',
          top: '-15%',
          right: '-5%',
          width: '550px',
          height: '550px',
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.18) 0%, rgba(0,0,0,0) 70%)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }} />

        <div className="hero-grid" style={{ maxWidth: '1280px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '48px', alignItems: 'center' }}>
          <div>
            {/* Live Status Badge with Pulse Radar */}
            <div className="hero-badge shimmer-badge" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              border: '1px solid rgba(245, 158, 11, 0.45)',
              color: '#f59e0b',
              padding: '7px 18px',
              borderRadius: '30px',
              fontSize: '0.82rem',
              fontWeight: 800,
              marginBottom: '20px',
              letterSpacing: '0.02em',
              boxShadow: '0 4px 16px rgba(245, 158, 11, 0.15)',
            }}>
              <span className="radar-live-badge" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }} />
              <span>مستند ہول سیل ڈپو • 54-سٹاپ، دیپالپور روڈ، اوکاڑہ</span>
            </div>

            <h1 className="hero-title" style={{ fontSize: '2.8rem', fontWeight: 900, lineHeight: 1.18, margin: '0 0 16px 0', letterSpacing: '-0.02em' }}>
              اصل برانڈڈ انجن آئل اور لیوبریکنٹس{' '}
              <span className="gold-gradient-text">ہول سیل ریٹس اور وین ڈلیوری</span> کے ساتھ
            </h1>

            <div style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: 600, marginBottom: '14px', letterSpacing: '0.01em' }}>
              Official Wholesale Lubricants Depot — Serving Okara, Kasur, Sahiwal, Dipalpur & Punjab Workshops
            </div>

            <p className="hero-desc" style={{ fontSize: '1rem', color: '#cbd5e1', lineHeight: 1.75, margin: '0 0 28px 0', maxWidth: '620px' }}>
              دو نمبر اور ناقص آئل سے گاڑی کے انجن کو محفوظ رکھیں۔ <strong>رفیق آٹو اینڈ آئل ٹریڈرز</strong> (پروپرائیٹرز: <strong>حاجی محمد رفیق و محمد شفیق</strong>) اوکاڑہ، ساہیوال، قصور اور دیپالپور کے ورکشاپس، رکشہ ڈیلرز، کار الیکٹریشنز اور ٹریکٹر مکینکوں کو 100 فیصد اصل، مہر بند کمپنی برانڈز ہول سیل کاٹن ریٹس پر فراہم کرتا ہے۔
            </p>

            {/* Quick Hero Search Bar */}
            <form onSubmit={handleSearch} className="hero-search-form" style={{ display: 'flex', gap: '8px', maxWidth: '540px', marginBottom: '22px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="آئل تلاش کریں (مثلاً Total 5W-30, Rimula, ZIC, Guard)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '13px 14px 13px 44px',
                    borderRadius: '10px',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
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
                  padding: '13px 24px',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 16px rgba(217, 119, 6, 0.45)',
                  transition: 'background-color 0.2s',
                }}
              >
                تلاش کریں
              </button>
            </form>

            {/* Action Buttons */}
            <div className="hero-cta-buttons" style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '24px' }}>
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
                  boxShadow: '0 6px 18px rgba(245, 158, 11, 0.35)',
                }}
              >
                مکمل پروڈکٹ کیٹلاگ دیکھیں <ArrowRight size={16} />
              </Link>
              <a
                href={`https://wa.me/92${(company.whatsapp || '03069258573').replace(/[^0-9]/g, '').replace(/^0/, '')}?text=Salam%20Rafiq%20Auto.%20I%20want%20wholesale%20rates%20for%20engine%20oil.`}
                target="_blank"
                rel="noreferrer"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)',
                  padding: '13px 22px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Phone size={15} color="#22c55e" /> کاٹن ہول سیل ریٹ معلوم کریں
              </a>
            </div>

            {/* 4 Trade Pillars (Micro trust points) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.78rem', color: '#cbd5e1' }}>
                <CheckCircle2 size={15} color="#22c55e" style={{ flexShrink: 0 }} />
                <span>100% اصل کمپنی مہر</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.78rem', color: '#cbd5e1' }}>
                <CheckCircle2 size={15} color="#22c55e" style={{ flexShrink: 0 }} />
                <span>روزانہ سپلائی وین سروس</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.78rem', color: '#cbd5e1' }}>
                <CheckCircle2 size={15} color="#22c55e" style={{ flexShrink: 0 }} />
                <span>کاٹن پر ہول سیل رعایت</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.78rem', color: '#cbd5e1' }}>
                <CheckCircle2 size={15} color="#22c55e" style={{ flexShrink: 0 }} />
                <span>کمپیوٹرائزڈ پکا کھاتہ</span>
              </div>
            </div>
          </div>

          {/* Right Visual Card with Verified Depot Credentials */}
          <div className="premium-hover-card-dark" style={{
            position: 'relative',
            borderRadius: '20px',
            overflow: 'hidden',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            boxShadow: '0 20px 45px rgba(0,0,0,0.6)',
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
          }}>
            <img
              src="/hero-pouring.jpg"
              alt="Authentic Engine Oil Pouring & Seal Integrity"
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
              backgroundColor: 'rgba(15, 23, 42, 0.9)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(245, 158, 11, 0.5)',
              borderRadius: '20px',
              padding: '4px 14px',
              fontSize: '0.76rem',
              fontWeight: 800,
              color: '#f59e0b',
            }}>
              ★ مستند و مصدقہ اسٹاک
            </div>

            <div style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: '0 0 16px 0', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Award color="#f59e0b" size={22} /> رفیق آٹو اینڈ آئل ٹریڈرز — ڈیلرشپ کی ضمانت
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ backgroundColor: 'rgba(217,119,6,0.2)', padding: '8px', borderRadius: '8px', color: '#f59e0b', flexShrink: 0 }}>
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, color: '#f8fafc', fontSize: '0.9rem' }}>دو نمبر آئل کی مکمل ممانعت</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5 }}>کمپنی بارکوڈ اور سالم سیل بند پیکنگ۔ رفیق آٹو صرف منظور شدہ آفیشل چینل سے اسٹاک لیتا ہے۔</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ backgroundColor: 'rgba(56,189,248,0.15)', padding: '8px', borderRadius: '8px', color: '#38bdf8', flexShrink: 0 }}>
                    <Truck size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, color: '#f8fafc', fontSize: '0.9rem' }}>اوکاڑہ، ساہیوال، قصور ڈلیوری وین</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5 }}>ہر ہفتے مقررہ روٹ پر آپ کی دکان یا ورکشاپ پر مال پہنچانے کی سہولت۔</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ backgroundColor: 'rgba(34,197,94,0.15)', padding: '8px', borderRadius: '8px', color: '#22c55e', flexShrink: 0 }}>
                    <Tag size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, color: '#f8fafc', fontSize: '0.9rem' }}>کھلا ڈرم، پیٹی و کاٹن ہول سیل</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5 }}>ورکشاپس اور ریٹیل کاؤنٹرز کے لیے مارجن دوست ڈسکاؤنٹ اسٹرکچر۔</div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>ایمرجنسی و فوری رابطہ نمبر</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#f59e0b' }}>0306-9258573</div>
                </div>
                <a
                  href="tel:03069258573"
                  style={{
                    backgroundColor: '#d97706',
                    color: '#fff',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Phone size={14} /> فون ملائیں
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* =========================================================================
          AUTHENTIC BRAND SHOWCASE STRIP (مستند و منظور شدہ برانڈز)
          ========================================================================= */}
      <section style={{ backgroundColor: '#0d131f', padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              ✓ مستند آئل و فلٹر برانڈز (Official Product Brands):
            </span>
            <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 700 }}>
              کلک کر کے مطلوبہ برانڈ کے پروڈکٹس دیکھیں
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
            {brandList.map((b, idx) => (
              <div
                key={idx}
                onClick={() => handleBrandClick(b.name)}
                className="brand-showcase-pill"
                style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '0.98rem', fontWeight: 900, color: '#ffffff' }}>
                  {b.name}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                  {b.sub}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* =========================================================================
          INTERACTIVE ENGINE OIL SELECTOR & LUBRICANT GUIDE (انجن آئل سلیکٹر)
          A high-end practical automotive tool that completely removes "AI template" feel
          ========================================================================= */}
      <section style={{ maxWidth: '1280px', margin: '60px auto 40px auto', padding: '0 20px' }}>
        <div style={{
          backgroundColor: '#0f172a',
          borderRadius: '20px',
          border: '1.5px solid rgba(245, 158, 11, 0.3)',
          padding: '36px 30px',
          boxShadow: '0 12px 36px rgba(0,0,0,0.4)',
        }}>
          <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto 28px auto' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '4px 14px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 800, marginBottom: '10px' }}>
              <Wrench size={14} /> ٹیکنیکل آئل گائیڈ (Lube Recommendation Tool)
            </div>
            <h2 style={{ fontSize: '2.1rem', fontWeight: 900, color: '#ffffff', margin: '0 0 10px 0' }}>
              اپنی گاڑی یا مشینری کے مطابق <span className="gold-gradient-text">درست آئل</span> چنیں
            </h2>
            <p style={{ fontSize: '0.92rem', color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
              انجن کے ماڈل، سی سی اور موسم کے مطابق غلط گریڈ کا آئل ڈالنے سے گاڑی کا فیول ایوریج گر جاتا ہے اور انجن جلدی گھستا ہے۔ نیچے اپنی گاڑی کی کیٹیگری منتخب کریں:
            </p>
          </div>

          {/* Selector Navigation Tabs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px', marginBottom: '28px' }}>
            {[
              { key: 'small_car', label: '🚗 چھوٹی کاریں (660-1000cc)', icon: Car },
              { key: 'sedan', label: '🚙 سیڈان و فیملی کاریں', icon: Car },
              { key: 'diesel', label: '🚚 کمرشل ڈیزل و پک اپ', icon: Truck },
              { key: 'tractor', label: '🚜 ٹریکٹرز و زرعی مشینری', icon: Gauge },
              { key: 'bike', label: '🏍️ موٹر سائیکل و 3-وہیلر', icon: Gauge },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeVehicleTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveVehicleTab(tab.key as any)}
                  className={`oil-selector-tab ${isActive ? 'active' : ''}`}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1px solid',
                    borderColor: isActive ? '#f59e0b' : 'rgba(255,255,255,0.12)',
                    backgroundColor: isActive ? '#d97706' : 'rgba(255,255,255,0.03)',
                    color: isActive ? '#ffffff' : '#cbd5e1',
                    fontSize: '0.84rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    textAlign: 'center'
                  }}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active Guide Content Display Card */}
          <div style={{
            backgroundColor: '#090d16',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.08)',
            padding: '28px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '30px',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ color: '#f59e0b', fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px' }}>
                گاڑیوں کی مثالیں: {activeGuide.vehicles}
              </div>
              <h3 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#ffffff', margin: '0 0 12px 0' }}>
                {activeGuide.title}
              </h3>
              <p style={{ fontSize: '0.92rem', color: '#cbd5e1', lineHeight: 1.7, margin: '0 0 20px 0' }}>
                {activeGuide.desc}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '22px' }}>
                <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '10px 14px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 700 }}>موزوں آئل گریڈ (Grade):</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#ffffff', marginTop: '2px' }}>{activeGuide.recommendedGrade}</div>
                </div>
                <div style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', padding: '10px 14px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#22c55e', fontWeight: 700 }}>تبدیل کرنے کا وقت:</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#ffffff', marginTop: '2px' }}>{activeGuide.drainInterval}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate(`/website/products?search=${encodeURIComponent(activeGuide.searchTag)}`)}
                style={{
                  backgroundColor: '#f59e0b',
                  color: '#0f172a',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(245, 158, 11, 0.3)'
                }}
              >
                اس گریڈ ({activeGuide.searchTag}) کے آئل دیکھیں <ArrowRight size={16} />
              </button>
            </div>

            {/* Top Recommended Picks in Depot */}
            <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '22px' }}>
              <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#f59e0b', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={16} color="#f59e0b" /> ڈپو پر دستیاب مستند چوائسز (Available Picks):
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {activeGuide.topPicks.map((pick, pIdx) => (
                  <div
                    key={pIdx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc' }}>{pick}</span>
                    <span style={{ fontSize: '0.74rem', color: '#22c55e', fontWeight: 800 }}>100% Genuine</span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '14px', textAlign: 'center' }}>
                * کاٹن کے ہول سیل ریٹس کے لیے ہمارے سیلز نمائندے سے رابطہ کریں۔
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* =========================================================================
          FEATURED PRODUCTS SHOWCASE
          ========================================================================= */}
      <section style={{ backgroundColor: '#ffffff', color: '#0f172a', padding: '65px 20px', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '36px', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <div style={{ color: '#d97706', fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                مستند آئل و فلٹرز کی رینج
              </div>
              <h2 style={{ fontSize: '2.1rem', fontWeight: 900, color: '#0f172a', margin: '4px 0 0 0' }}>
                ڈپو پر دستیاب نمایاں پروڈکٹس (In-Stock Lubricants)
              </h2>
            </div>
            <Link
              to="/website/products"
              style={{
                backgroundColor: '#0f172a',
                color: '#ffffff',
                padding: '11px 22px',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.88rem',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              تمام پروڈکٹس دیکھیں <ArrowRight size={15} />
            </Link>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px', color: '#64748b', fontSize: '1.1rem' }}>
              پروڈکٹس لوڈ ہو رہی ہیں...
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '26px' }}>
              {products.map((p) => (
                <div
                  key={p.id}
                  className="premium-hover-card"
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
                  }}
                >
                  {/* Product Image Area */}
                  <div style={{
                    height: '210px',
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
                        alt={`${p.name} - Wholesale Engine Oil Okara`}
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                        style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '14px' }}
                      />
                    ) : (
                      <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                        <Droplet size={58} color="#d97706" style={{ marginBottom: '8px', opacity: 0.85 }} />
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#475569' }}>{p.brand}</div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Certified Lubricant</div>
                      </div>
                    )}

                    {/* Stock Status Badge */}
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      backgroundColor: p.inStock ? '#16a34a' : '#ef4444',
                      color: '#ffffff',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '4px 10px',
                      borderRadius: '14px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                    }}>
                      {p.inStock ? '● اسٹاک دستیاب ہے' : 'اسٹاک ختم'}
                    </div>

                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      backgroundColor: '#0f172a',
                      color: '#f8fafc',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '4px 10px',
                      borderRadius: '6px',
                    }}>
                      {p.category}
                    </div>
                  </div>

                  {/* Product Details Content */}
                  <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {p.brand} • کوڈ: {p.sku}
                    </div>

                    <h3 style={{ fontSize: '1.08rem', fontWeight: 900, color: '#0f172a', margin: '6px 0 10px 0', lineHeight: 1.35 }}>
                      {p.name}
                    </h3>

                    {p.specifications && (
                      <div style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '14px', backgroundColor: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #f1f5f9', lineHeight: 1.5 }}>
                        {p.specifications}
                      </div>
                    )}

                    <div style={{ marginTop: 'auto', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#15803d' }}>
                          Rs. {Number(p.publicPrice || 0).toLocaleString()}
                          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginLeft: '4px' }}>/ {p.unitSymbol || p.unit || 'پیس'}</span>
                        </div>
                        <span style={{ fontSize: '0.72rem', color: '#b45309', fontWeight: 800, backgroundColor: '#fef3c7', padding: '2px 6px', borderRadius: '4px' }}>
                          کاٹن ہول سیل دستیاب
                        </span>
                      </div>

                      {p.primaryUnit && p.conversionFactor > 1 && (
                        <div style={{ fontSize: '0.74rem', color: '#64748b', marginBottom: '12px', fontWeight: 600 }}>
                          📦 1 {p.primaryUnit} = {p.conversionFactor} {p.unitSymbol}
                        </div>
                      )}

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px', marginTop: '10px' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedProductForOrder(p)}
                          style={{
                            backgroundColor: '#0f172a',
                            color: '#ffffff',
                            border: 'none',
                            padding: '9px 12px',
                            borderRadius: '8px',
                            fontSize: '0.82rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            transition: 'all 0.2s',
                          }}
                          title="Instant 1-Click Order"
                        >
                          ⚡ ابھی خریدیں
                        </button>
                        <button
                          type="button"
                          onClick={() => addToCart(p, 1)}
                          style={{
                            backgroundColor: '#d97706',
                            color: '#ffffff',
                            border: 'none',
                            padding: '9px 12px',
                            borderRadius: '8px',
                            fontSize: '0.82rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            boxShadow: '0 2px 8px rgba(217,119,6,0.3)',
                            transition: 'all 0.2s',
                          }}
                          title="Add to Cart"
                        >
                          <ShoppingBag size={14} /> + کارٹ
                        </button>
                        <Link
                          to={`/website/products/${p.id}`}
                          style={{
                            backgroundColor: '#f1f5f9',
                            color: '#334155',
                            border: '1px solid #cbd5e1',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          تفصیل
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


      {/* =========================================================================
          LOGISTICS & DELIVERY VAN SERVICE (اوکاڑہ، ساہیوال، قصور ڈلیوری وین)
          ========================================================================= */}
      <section style={{ maxWidth: '1280px', margin: '65px auto', padding: '0 20px' }}>
        <div style={{
          background: 'linear-gradient(135deg, #090d16 0%, #1e293b 100%)',
          borderRadius: '24px',
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          alignItems: 'center',
          boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
        }}>
          <div style={{ padding: '48px 40px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid #0284c7',
              color: '#38bdf8',
              padding: '5px 14px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 800,
              marginBottom: '16px',
            }}>
              <Truck size={15} /> روزانہ سپلائی وین نیٹ ورک (Daily Supply Vans)
            </div>
            <h2 style={{ fontSize: '2.1rem', fontWeight: 900, color: '#ffffff', margin: '0 0 16px 0', lineHeight: 1.25 }}>
              اوکاڑہ، ساہیوال، قصور اور دیپالپور میں باقاعدہ وین سروس
            </h2>
            <p style={{ fontSize: '0.96rem', color: '#94a3b8', lineHeight: 1.75, margin: '0 0 24px 0' }}>
              ہماری سپلائی وینز روزانہ کی بنیاد پر آٹو ورکشاپس، پیٹرول پمپ سروس اسٹیشنز اور اسپیئر پارٹس کی دکانوں کو مال فراہم کرتی ہیں۔ آپ کو دکان چھوڑ کر مارکیٹ آنے کی ضرورت نہیں۔ فون یا واٹس ایپ پر آرڈر دیں اور کاٹن ریٹ پر مال براہِ راست اپنی دکان پر وصول کریں۔
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '28px' }}>
              <div style={{ backgroundColor: 'rgba(255,255,255,0.04)', padding: '14px 18px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ color: '#f59e0b', fontWeight: 900, fontSize: '1.25rem' }}>ہفتہ وار شیڈول</div>
                <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '2px' }}>ہر روٹ کے لیے مقررہ سپلائی دن</div>
              </div>
              <div style={{ backgroundColor: 'rgba(255,255,255,0.04)', padding: '14px 18px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ color: '#22c55e', fontWeight: 900, fontSize: '1.25rem' }}>لیکج و ڈیمج فری</div>
                <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '2px' }}>محفوظ ترسیل اور فوری واپسی سہولت</div>
              </div>
            </div>
            <a
              href={`https://wa.me/92${(company.whatsapp || '03069258573').replace(/[^0-9]/g, '').replace(/^0/, '')}?text=Salam%20Rafiq%20Auto.%20Please%20share%20delivery%20van%20schedule%20for%20my%20area.`}
              target="_blank"
              rel="noreferrer"
              style={{
                backgroundColor: '#d97706',
                color: '#ffffff',
                padding: '13px 26px',
                borderRadius: '10px',
                fontWeight: 800,
                fontSize: '0.9rem',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 16px rgba(217, 119, 6, 0.4)',
              }}
            >
              اپنے علاقے کا روٹ معلوم کریں <ArrowRight size={16} />
            </a>
          </div>
          <div style={{ height: '100%', minHeight: '380px' }}>
            <img
              src="/hero-fleet.jpg"
              alt="Rafiq Auto & Oil Traders Van Supply Fleet"
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


      {/* =========================================================================
          WORKSHOP & FLEET BENEFIT BANNER (ورکشاپس اور ٹرانسپورٹرز کے لیے سہولیات)
          ========================================================================= */}
      <section style={{ backgroundColor: '#fef3c7', color: '#78350f', borderTop: '1px solid #fde68a', borderBottom: '1px solid #fde68a', padding: '55px 20px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '2.1rem', fontWeight: 900, color: '#78350f', margin: '0 0 14px 0' }}>
            کیا آپ آٹو ورکشاپ، لبریکینٹ شاپ یا ٹرانسپورٹ فلیٹ کے مالک ہیں؟
          </h2>
          <p style={{ fontSize: '1.05rem', color: '#92400e', lineHeight: 1.7, margin: '0 0 26px 0', maxWidth: '820px', marginLeft: 'auto', marginRight: 'auto' }}>
            رفیق آٹو اینڈ آئل ٹریڈرز اپنے باقاعدہ کاروباری کسٹمرز کو کاٹن ڈسکاؤنٹ ریٹس، ادھار کھاتہ (ڈبل انٹری سسٹم)، ماہانہ ریسیٹس اور براہ راست وین ڈلیوری کی مکمل سہولت فراہم کرتا ہے۔
          </p>
          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href={`https://wa.me/92${(company.whatsapp || '03069258573').replace(/[^0-9]/g, '').replace(/^0/, '')}?text=Salam%20Rafiq%20Auto.%20I%20want%20wholesale%20rates%20for%20engine%20oil.`}
              target="_blank"
              rel="noreferrer"
              style={{
                backgroundColor: '#16a34a',
                color: '#ffffff',
                padding: '13px 28px',
                borderRadius: '10px',
                fontWeight: 800,
                fontSize: '0.94rem',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(22,163,74,0.3)'
              }}
            >
              💬 واٹس ایپ پر ہول سیل ریٹ لسٹ مانگیں
            </a>
            <Link
              to="/website/contact"
              style={{
                backgroundColor: '#0f172a',
                color: '#ffffff',
                padding: '13px 28px',
                borderRadius: '10px',
                fontWeight: 800,
                fontSize: '0.94rem',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              ڈپو پر تشریف لائیں / رابطہ کریں
            </Link>
          </div>
        </div>
      </section>


      {/* =========================================================================
          ANIMATED FREQUENTLY ASKED QUESTIONS (عام پوچھے جانے والے سوالات)
          ========================================================================= */}
      <section style={{ backgroundColor: '#090d16', padding: '75px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ maxWidth: '920px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '44px' }}>
            <div style={{ color: '#f59e0b', fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              معلومات و رہنمائی (Frequently Asked Questions)
            </div>
            <h2 style={{ fontSize: '2.3rem', fontWeight: 900, color: '#ffffff', margin: '6px 0 0 0' }}>
              اکثر پوچھے جانے والے سوالات
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: '8px auto 0 auto' }}>
              ورکشاپ مالکان، ڈرائیورز اور ریٹیل گاہکوں کے عام سوالات کے مستند جوابات
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <details className="animated-faq" style={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '20px 24px', cursor: 'pointer' }}>
              <summary style={{ fontWeight: 800, color: '#ffffff', fontSize: '1.05rem', outline: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>کیا آپ کے پاس موجود تمام انجن آئل 100 فیصد اصل ہیں؟ (Original Guarantee)</span>
                <ChevronDown size={20} color="#f59e0b" className="faq-chevron" />
              </summary>
              <div style={{ color: '#cbd5e1', fontSize: '0.92rem', lineHeight: 1.75, margin: '14px 0 0 0', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '14px' }}>
                جی بالکل 100 فیصد اصل اور تصدیق شدہ ہیں۔ رفیق آٹو اینڈ آئل ٹریڈرز کا سارا اسٹاک براہِ راست کمپنی کے مجاز ڈیلرز اور ریفائنری چینلز سے آتا ہے۔ ہر بوتل پر کمپنی مہر، بارکوڈ اور بیج نمبر موجود ہوتا ہے۔ ہم دو نمبر آئل کی خرید و فروخت پر سخت ترین پالیسی رکھتے ہیں۔
              </div>
            </details>

            <details className="animated-faq" style={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '20px 24px', cursor: 'pointer' }}>
              <summary style={{ fontWeight: 800, color: '#ffffff', fontSize: '1.05rem', outline: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>ڈپو کے اوقاتِ کار کیا ہیں؟ کیا جمعہ کے دن بھی کھلا ہوتا ہے؟ (Timings & Friday Open)</span>
                <ChevronDown size={20} color="#f59e0b" className="faq-chevron" />
              </summary>
              <div style={{ color: '#cbd5e1', fontSize: '0.92rem', lineHeight: 1.75, margin: '14px 0 0 0', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '14px' }}>
                ہمارا ڈپو <strong>24/7 (ہفتے کے 7 دن چوبیس گھنٹے)</strong> سروس فراہم کرتا ہے۔ جمعہ کے دن بھی کاؤنٹر کھلا رہتا ہے اور ہول سیل ڈسپیچ و واٹس ایپ بکنگ ہر وقت دستیاب رہتی ہے۔
              </div>
            </details>

            <details className="animated-faq" style={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '20px 24px', cursor: 'pointer' }}>
              <summary style={{ fontWeight: 800, color: '#ffffff', fontSize: '1.05rem', outline: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>ڈلیوری وین کن کن شہروں اور علاقوں میں آتی ہے؟ (Delivery Van Routes)</span>
                <ChevronDown size={20} color="#f59e0b" className="faq-chevron" />
              </summary>
              <div style={{ color: '#cbd5e1', fontSize: '0.92rem', lineHeight: 1.75, margin: '14px 0 0 0', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '14px' }}>
                ہماری سپلائی وین <strong>اوکاڑہ شہر، دیپالپور روڈ، بائی پاس، رینالہ خورد، ساہیوال، چیچہ وطنی، قصور، چونیاں اور پتوکی</strong> کے مضافاتی تجارتی راستوں کو کور کرتی ہے۔ اپنے روٹ کا شیڈول جاننے کے لیے <strong>0306-9258573</strong> پر رابطہ کریں۔
              </div>
            </details>

            <details className="animated-faq" style={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '20px 24px', cursor: 'pointer' }}>
              <summary style={{ fontWeight: 800, color: '#ffffff', fontSize: '1.05rem', outline: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>کیا ایک بوتل بھی مل جائے گی یا صرف پورا کاٹن ہی لینا ہوگا؟</span>
                <ChevronDown size={20} color="#f59e0b" className="faq-chevron" />
              </summary>
              <div style={{ color: '#cbd5e1', fontSize: '0.92rem', lineHeight: 1.75, margin: '14px 0 0 0', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '14px' }}>
                ہم واک اِن کسٹمرز کو اپنی گاڑی کے لیے سنگل بوتل بھی کاؤنٹر ریٹ پر فراہم کرتے ہیں، اور ورکشاپس یا اسپیئر پارٹس ڈیلرز کو کاٹن اور ڈرم ہول سیل خصوصی رعایتی ریٹس پر دیتے ہیں۔
              </div>
            </details>

            <details className="animated-faq" style={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '20px 24px', cursor: 'pointer' }}>
              <summary style={{ fontWeight: 800, color: '#ffffff', fontSize: '1.05rem', outline: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>ورکشاپ کا ادھار کھاتہ (Udhar Ledger) کیسے بنوایا جا سکتا ہے؟</span>
                <ChevronDown size={20} color="#f59e0b" className="faq-chevron" />
              </summary>
              <div style={{ color: '#cbd5e1', fontSize: '0.92rem', lineHeight: 1.75, margin: '14px 0 0 0', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '14px' }}>
                ہمارے ڈپو پر آ کر یا اپنے علاقے کے وین سیلز مین کے ذریعے اپنا نام اور ورکشاپ رجسٹر کروائیں۔ ہمارا کمپیوٹرائزڈ اکاؤنٹنگ سسٹم ہر رسید، ادائیگی اور سابقہ بقایا کا مکمل شفاف ریکارڈ رکھتا ہے جس کی رسید آپ کو موقع پر پرنٹ ہو کر ملتی ہے۔
              </div>
            </details>
          </div>
        </div>
      </section>


      {/* =========================================================================
          EMBEDDED DEPOT LOCATION & CONTACT DETAILS
          ========================================================================= */}
      <section style={{ backgroundColor: '#0d111c', padding: '65px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '38px' }}>
            <div style={{ color: '#f59e0b', fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              اوکاڑہ مرکزی ڈپو و سیلز کاؤنٹر
            </div>
            <h2 style={{ fontSize: '2.1rem', fontWeight: 900, color: '#ffffff', margin: '6px 0 0 0' }}>
              ڈپو لوکیشن اور براہِ راست رابطے کے ذرائع
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '22px' }}>
            <div style={{ backgroundColor: '#131927', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '28px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <MapPin size={24} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', margin: '0 0 8px 0' }}>
                مرکزی ڈپو ایڈریس (Location)
              </h3>
              <p style={{ color: '#cbd5e1', fontSize: '0.92rem', lineHeight: 1.6, margin: 0 }}>
                {company.address}
              </p>
              <div style={{ color: '#f59e0b', fontSize: '0.82rem', fontWeight: 800, marginTop: '8px' }}>
                ڈسٹری بیوشن زونز: {company.operationalAreas}
              </div>
            </div>

            <div style={{ backgroundColor: '#131927', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '28px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <Phone size={24} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', margin: '0 0 8px 0' }}>
                فون و موبائل نمبرز (Hotlines)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.92rem' }}>
                <div style={{ color: '#ffffff', fontWeight: 800 }}>{company.phone}</div>
                <div style={{ color: '#94a3b8', fontSize: '0.82rem' }}>پروپرائیٹرز: {company.proprietorNames}</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#22c55e', fontWeight: 800, fontSize: '0.88rem', marginTop: '4px' }}>
                  <span>🟢 24/7 کھلا ہے (جمعہ تعطیل منسوخ)</span>
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: '#131927', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '28px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                  <Send size={24} />
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', margin: '0 0 8px 0' }}>
                  فوری واٹس ایپ بکنگ (WhatsApp)
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '0.88rem', lineHeight: 1.6, margin: '0 0 16px 0' }}>
                  ہول سیل کاٹن ریٹس اور وین سپلائی کے لیے براہِ راست سیلز کوآرڈینیٹر سے رابطہ کریں۔
                </p>
              </div>
              <a
                href={`https://wa.me/92${(company.whatsapp || '03069258573').replace(/[^0-9]/g, '').replace(/^0/, '')}?text=Salam%20Rafiq%20Auto.%20I%20want%20to%20order%20engine%20oil.`}
                target="_blank"
                rel="noreferrer"
                className="wa-floating-btn"
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
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  width: 'fit-content'
                }}
              >
                <span>واٹس ایپ پر میسج بھیجیں</span>
                <ArrowRight size={16} />
              </a>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};
