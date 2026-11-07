import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { 
  Settings as SettingsIcon, Save, CheckCircle, Search, 
  Receipt, Printer, Percent, MessageSquare, Users, Package, 
  Bell, Coins, Building, ArrowRight, ShieldCheck, Sparkles, RefreshCw,
  Globe, Share2
} from 'lucide-react';

type SettingTab = 
  | 'GENERAL'
  | 'PUBLIC_PROFILE'
  | 'TRANSACTION' 
  | 'PRINT' 
  | 'TAXES' 
  | 'TRANSACTION_MESSAGE' 
  | 'PARTY' 
  | 'ITEM' 
  | 'SERVICE_REMINDERS' 
  | 'MULTI_CURRENCY';

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingTab>('GENERAL');
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const [settings, setSettings] = useState<any>({
    companyName: 'RAFIQ AUTO & OIL TRADERS',
    address: '54-Stop Near MCB Bank, Dipalpur Road, Okara',
    phone: '0306-9258573 / 0327-7497457',
    whatsappNumber: '0306-9258573',
    email: 'rafiqtreders003@gmail.com',
    proprietorNames: 'M. Shafiq & Haji Muhammad Rafiq',
    operationalAreas: 'Okara, Sahiwal, Kasur',
    facebookUrl: '',
    tiktokUrl: '',
    operatingSchedule: '24/7 Operations (Round the Clock Support)',
    invoicePrefix: 'RAFIQ-INV-',
    purchasePrefix: 'RAFIQ-PUR-',
    currency: 'PKR',
    taxRatePercent: 0,
    allowNegativeStock: false,
    requireOrderApproval: false,

    // Vyapaar Extended Settings
    roundOffTotal: true,
    defaultDueDateDays: 15,
    enableBarcodeScanner: true,
    enableSalesmanTracking: true,

    printFormat: 'THERMAL_80MM',
    showCompanyLogoOnPrint: true,
    showTermsOnInvoice: true,
    invoiceFooterNote: 'Goods once sold will only be replaced within 3 days with original bill.',

    taxEnabled: false,
    taxName: 'GST / PRA',
    taxNumber: 'NTN: 829104-1',

    enableSmsWhatsAppAlerts: true,
    smsTemplateSaleInvoice: 'Dear {CUSTOMER}, your invoice #{INVOICE} of Rs.{AMOUNT} is generated. Balance: Rs.{BALANCE}. Rafiq Auto Okara: 03069258573',
    smsTemplatePaymentReceipt: 'Dear {CUSTOMER}, payment received Rs.{AMOUNT} against receipt #{RECEIPT}. Remaining: Rs.{BALANCE}. Rafiq Auto: 03069258573',

    enableCreditLimitCheck: true,
    enablePartyRateHistory: true,
    defaultPaymentTermsDays: 15,

    enableLowStockWarning: true,
    enableDualUnits: true,
    defaultUnitName: 'Bottle',

    oilChangeServiceKm: 3000,
    oilChangeReminderDays: 90,

    secondaryCurrency: 'USD',
    exchangeRate: 280.0,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await api.get('/settings');
      if (res.data?.settings) {
        setSettings((prev: any) => ({ ...prev, ...res.data.settings }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const formatUrl = (url?: string) => {
    if (!url || !url.trim()) return '';
    let trimmed = url.trim();
    if (!/^https?:\/\//i.test(trimmed)) {
      trimmed = 'https://' + trimmed;
    }
    return trimmed;
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      const payload = {
        ...settings,
        taxRatePercent: parseFloat(String(settings.taxRatePercent)) || 0,
        exchangeRate: parseFloat(String(settings.exchangeRate)) || 1,
        facebookUrl: formatUrl(settings.facebookUrl),
        tiktokUrl: formatUrl(settings.tiktokUrl),
      };
      const res = await api.put('/settings', payload);
      if (res.data.success) {
        setSettings((prev: any) => ({ ...prev, ...res.data.settings }));
        setMsg('Settings updated and synced successfully across POS & Invoices!');
        setTimeout(() => setMsg(''), 4000);
      }
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const tabs: Array<{ id: SettingTab; label: string; icon: any; desc: string }> = [
    { id: 'GENERAL', label: 'GENERAL', icon: Building, desc: 'Enterprise profile, company address, phone & default branding' },
    { id: 'PUBLIC_PROFILE', label: 'WEBSITE & CONTACT INFO', icon: Globe, desc: 'Proprietor names, WhatsApp, email, Facebook, TikTok links & operational cities' },
    { id: 'TRANSACTION', label: 'TRANSACTION', icon: Receipt, desc: 'Billing rounding, barcodes, salesman tracking & negative stock' },
    { id: 'PRINT', label: 'PRINT', icon: Printer, desc: 'Thermal 80mm/58mm, A4 format, receipt header, terms & QR code' },
    { id: 'TAXES', label: 'TAXES', icon: Percent, desc: 'GST / PRA tax rates, NTN number and tax invoice configuration' },
    { id: 'TRANSACTION_MESSAGE', label: 'TRANSACTION MESSAGE', icon: MessageSquare, desc: 'Automated SMS & WhatsApp bill alerts & customer receipt messages' },
    { id: 'PARTY', label: 'PARTY', icon: Users, desc: 'Customer & Supplier credit limits, auto-rates memory & credit terms' },
    { id: 'ITEM', label: 'ITEM', icon: Package, desc: 'Dual packaging units (Carton/Can), stock thresholds & category defaults' },
    { id: 'SERVICE_REMINDERS', label: 'SERVICE REMINDERS', icon: Bell, desc: 'Engine oil change mileage (KM) & follow-up service alerts for workshops' },
    { id: 'MULTI_CURRENCY', label: 'MULTI CURRENCY', icon: Coins, desc: 'Base PKR and import exchange rates (USD / AED) for wholesale oil shipments' },
  ];

  const filteredTabs = tabs.filter(t => 
    t.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.desc.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ backgroundColor: '#1e293b', color: '#f59e0b', padding: '6px', borderRadius: '8px' }}>
              <SettingsIcon size={22} />
            </div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              Business Control & Settings
            </h1>
            <span className="badge badge-warning" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
              Vyapaar Architecture
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0' }}>
            Enterprise POS configuration, printing, customer credit, WhatsApp alerts, and inventory rules.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            type="button" 
            onClick={() => handleSave()} 
            disabled={saving} 
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, padding: '10px 20px' }}
          >
            <Save size={18} /> {saving ? 'Saving Changes...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {msg && (
        <div style={{
          backgroundColor: '#ecfdf5',
          border: '1px solid #a7f3d0',
          color: '#065f46',
          padding: '12px 18px',
          borderRadius: '10px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: 600
        }}>
          <CheckCircle size={18} color="#059669" /> {msg}
        </div>
      )}

      {/* Vyapaar Style Split Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '280px 1fr',
        gap: '24px',
        alignItems: 'start'
      }}>
        
        {/* Left Sidebar: Vyapaar Dark Panel with Search */}
        <div style={{
          backgroundColor: '#171d2b',
          borderRadius: '14px',
          overflow: 'hidden',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.35)',
          border: '1px solid #242e42'
        }}>
          {/* Top Panel Title with Search Input */}
          <div style={{ padding: '16px 18px', borderBottom: '1px solid #242e42' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.5px' }}>
                Settings
              </span>
              <Search size={18} style={{ color: '#94a3b8' }} />
            </div>

            <div style={{ position: 'relative' }}>
              <input 
                type="text"
                placeholder="Search settings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: '#0d131f',
                  border: '1px solid #2a364f',
                  borderRadius: '8px',
                  padding: '7px 12px',
                  color: '#f8fafc',
                  fontSize: '0.8rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Navigation Items (Exact Vyapaar categories) */}
          <div style={{ padding: '8px 0' }}>
            {filteredTabs.map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    backgroundColor: isSelected ? '#ffffff' : 'transparent',
                    color: isSelected ? '#0f172a' : '#cbd5e1',
                    border: 'none',
                    padding: '12px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: isSelected ? 800 : 700,
                    letterSpacing: '0.7px',
                    transition: 'all 0.15s ease',
                    borderLeft: isSelected ? '4px solid #f59e0b' : '4px solid transparent'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Icon size={16} color={isSelected ? '#d97706' : '#94a3b8'} />
                    <span>{tab.label}</span>
                  </div>
                  {isSelected && <ArrowRight size={14} color="#0f172a" />}
                </button>
              );
            })}
          </div>

          {/* Help Footer */}
          <div style={{ padding: '14px 18px', borderTop: '1px solid #242e42', backgroundColor: '#0f1522', fontSize: '0.75rem', color: '#64748b' }}>
            Vyapaar Settings v3.2 &bull; 100% Real DB Sync
          </div>
        </div>

        {/* Right Content Panel: Dedicated Config Forms */}
        <div className="card" style={{ padding: '28px', backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          
          {/* TAB 1: GENERAL */}
          {activeTab === 'GENERAL' && (
            <div>
              <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '14px', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>General Business Profile</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Central identity appearing on bills, website receipts, and supplier vouchers.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Firm / Enterprise Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={settings.companyName}
                    onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>Contact Phone (Helpline / WhatsApp)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={settings.phone}
                      onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>Official Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={settings.email || ''}
                      onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Main Depot & Showroom Address</label>
                  <input
                    type="text"
                    className="form-control"
                    value={settings.address}
                    onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>Base Currency</label>
                    <input
                      type="text"
                      className="form-control"
                      value={settings.currency}
                      onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>Sales Invoice Prefix</label>
                    <input
                      type="text"
                      className="form-control"
                      value={settings.invoicePrefix}
                      onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: PUBLIC & WEBSITE PROFILE (Dynamically synced across POS & Public Website) */}
          {activeTab === 'PUBLIC_PROFILE' && (
            <div>
              <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '14px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                    Website & Business Contact Hub
                  </h3>
                  <span className="badge badge-success" style={{ fontSize: '0.72rem', fontWeight: 800 }}>
                    ⚡ Real-time Sync with Public Website
                  </span>
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Yahan par tabdeeli karnay say POS, Bills, aur Public Website (About, Contact, Footer, WhatsApp floating button) sab par fori update ho jaye ga.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '18px' }}>
                
                {/* Proprietor Names */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Proprietor Names (مالکان کے نام) *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="M. Shafiq & Haji Muhammad Rafiq"
                    value={settings.proprietorNames || ''}
                    onChange={(e) => setSettings({ ...settings, proprietorNames: e.target.value })}
                    required
                  />
                  <small style={{ color: '#64748b', fontSize: '0.78rem' }}>
                    Website kay About, Contact aur Company info section main yeh naam show hon gay.
                  </small>
                </div>

                {/* Email & WhatsApp Numbers */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>
                      Official Email Address (ای میل پتہ) *
                    </label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="rafiqtreders003@gmail.com"
                      value={settings.email || ''}
                      onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>
                      WhatsApp Direct Order Number (واٹس ایپ نمبر) *
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="0306-9258573"
                      value={settings.whatsappNumber || ''}
                      onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
                    />
                    <small style={{ color: '#64748b', fontSize: '0.75rem' }}>
                      Website par click kartay hi is number ki WhatsApp chat open ho gi.
                    </small>
                  </div>
                </div>

                {/* Phone & Operational Cities */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>
                      Phone & Helpline Numbers (فون نمبرز)
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="0306-9258573 / 0327-7497457"
                      value={settings.phone || ''}
                      onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>
                      Operational Cities & Delivery Sectors (کام کے اضلاع) *
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Okara, Sahiwal, Kasur"
                      value={settings.operationalAreas || ''}
                      onChange={(e) => setSettings({ ...settings, operationalAreas: e.target.value })}
                    />
                    <small style={{ color: '#64748b', fontSize: '0.75rem' }}>
                      Delivery van schedule aur website distribution list main yeh show hoga.
                    </small>
                  </div>
                </div>

                {/* Operating / Depot Schedule */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Operating Timing & Service Schedule (اوقات کار و سروس شیڈول) *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="24/7 Operations (Round the Clock Support)"
                    value={settings.operatingSchedule || ''}
                    onChange={(e) => setSettings({ ...settings, operatingSchedule: e.target.value })}
                    required
                  />
                  <small style={{ color: '#64748b', fontSize: '0.78rem' }}>
                    Website kay Top Banner, Contact Page aur Footer main yeh schedule khud-ba-khud show hoga. (Jaise: 24/7 Operations).
                  </small>
                </div>

                {/* Shop / Depot Address */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Depot & Warehouse Address (دکان و ڈپو ایڈریس)
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="54-Stop Near MCB Bank, Dipalpur Road, Okara"
                    value={settings.address || ''}
                    onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  />
                </div>

                {/* Social Media Links Section */}
                <div style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '20px',
                  marginTop: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <Share2 size={18} color="#d97706" />
                    <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>
                      Social Media Channels (Facebook & TikTok Links)
                    </h4>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0 0 16px 0' }}>
                    Jab bhi aap apni Facebook ya TikTok id banayein, sirf unka link yahan paste kar dein. Website par aane walay sarfeen foran aap kay official page par pohanch jayen gay.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>📘 Facebook Page Link</span>
                      </label>
                      <input
                        type="url"
                        className="form-control"
                        placeholder="https://facebook.com/your-page-id"
                        value={settings.facebookUrl || ''}
                        onChange={(e) => setSettings({ ...settings, facebookUrl: e.target.value })}
                      />
                      <small style={{ color: '#64748b', fontSize: '0.75rem' }}>
                        Optional: Khali chor dein agar abhi id nahi bani.
                      </small>
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>🎵 TikTok Profile Link</span>
                      </label>
                      <input
                        type="url"
                        className="form-control"
                        placeholder="https://tiktok.com/@your-profile"
                        value={settings.tiktokUrl || ''}
                        onChange={(e) => setSettings({ ...settings, tiktokUrl: e.target.value })}
                      />
                      <small style={{ color: '#64748b', fontSize: '0.75rem' }}>
                        Optional: Khali chor dein agar abhi id nahi bani.
                      </small>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: TRANSACTION */}
          {activeTab === 'TRANSACTION' && (
            <div>
              <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '14px', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Transaction & POS Rules</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Vyapaar POS workflow, billing auto-round, barcode scanner, and order approvals.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={settings.roundOffTotal}
                      onChange={(e) => setSettings({ ...settings, roundOffTotal: e.target.checked })}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Auto Round-off Invoice Total</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Automatically round off paisas/decimals to the nearest rupee.</div>
                    </div>
                  </label>
                </div>

                <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={settings.enableBarcodeScanner}
                      onChange={(e) => setSettings({ ...settings, enableBarcodeScanner: e.target.checked })}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Fast POS Barcode & SKU Scanner</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Auto-add items to active bill immediately when scanned with USB/Bluetooth scanner.</div>
                    </div>
                  </label>
                </div>

                <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={settings.enableSalesmanTracking}
                      onChange={(e) => setSettings({ ...settings, enableSalesmanTracking: e.target.checked })}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Route Salesman Order Assignment</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Attribute each invoice to route delivery salesman for commission and delivery logs.</div>
                    </div>
                  </label>
                </div>

                <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={settings.allowNegativeStock}
                      onChange={(e) => setSettings({ ...settings, allowNegativeStock: e.target.checked })}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Allow Negative Stock Invoicing</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Permit cashier to bill items even if system stock shows zero (for urgent dispatches).</div>
                    </div>
                  </label>
                </div>

                <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={settings.requireOrderApproval}
                      onChange={(e) => setSettings({ ...settings, requireOrderApproval: e.target.checked })}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Require Operator Approval for Salesman Mobile Bookings</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Salesman bookings will remain in PENDING status until confirmed by admin/cashier.</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PRINT */}
          {activeTab === 'PRINT' && (
            <div>
              <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '14px', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Thermal & Paper Receipt Configuration</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Fine-tune POS bill design for 80mm/58mm thermal printers and full A4 sheets.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Default Bill Print Format</label>
                  <select
                    className="form-control"
                    value={settings.printFormat}
                    onChange={(e) => setSettings({ ...settings, printFormat: e.target.value })}
                  >
                    <option value="THERMAL_80MM">Thermal 80mm Roll (Restaurant / Mall Style)</option>
                    <option value="THERMAL_58MM">Thermal 58mm Mini Roll</option>
                    <option value="A4">Standard A4 Full Sheet</option>
                    <option value="A5">A5 Half Sheet</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Purchase Order Prefix</label>
                  <input
                    type="text"
                    className="form-control"
                    value={settings.purchasePrefix}
                    onChange={(e) => setSettings({ ...settings, purchasePrefix: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.showCompanyLogoOnPrint}
                    onChange={(e) => setSettings({ ...settings, showCompanyLogoOnPrint: e.target.checked })}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Print Rafiq Auto Monogram / Logo on top of Receipt</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.showTermsOnInvoice}
                    onChange={(e) => setSettings({ ...settings, showTermsOnInvoice: e.target.checked })}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Show Return & Replacement Policy at Bottom</span>
                </label>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Custom Receipt Footer Message</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={settings.invoiceFooterNote || ''}
                  onChange={(e) => setSettings({ ...settings, invoiceFooterNote: e.target.value })}
                  placeholder="Enter policy note printed at the bottom of customer receipts..."
                />
              </div>
            </div>
          )}

          {/* TAB 4: TAXES */}
          {activeTab === 'TAXES' && (
            <div>
              <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '14px', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Taxes & FBR / PRA Configuration</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Sales tax rates, NTN numbers, and wholesale tax compliance.
                </p>
              </div>

              <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '18px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.taxEnabled}
                    onChange={(e) => setSettings({ ...settings, taxEnabled: e.target.checked })}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Enable Sales Tax Calculations on Invoices</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>If enabled, tax percentage will be calculated on taxable lubricant lines.</div>
                  </div>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Tax System Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={settings.taxName}
                    onChange={(e) => setSettings({ ...settings, taxName: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Default Tax Rate (%)</label>
                  <input
                    type="number"
                    className="form-control"
                    min="0"
                    step="any"
                    value={settings.taxRatePercent}
                    onChange={(e) => setSettings({ ...settings, taxRatePercent: e.target.value as any })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>NTN / STRN Number</label>
                  <input
                    type="text"
                    className="form-control"
                    value={settings.taxNumber || ''}
                    onChange={(e) => setSettings({ ...settings, taxNumber: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: TRANSACTION MESSAGE */}
          {activeTab === 'TRANSACTION_MESSAGE' && (
            <div>
              <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '14px', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Transaction Message & WhatsApp Alerts</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Automate invoice updates, bill amounts, and payment confirmations to customers.
                </p>
              </div>

              <div style={{ padding: '16px', backgroundColor: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0', marginBottom: '18px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.enableSmsWhatsAppAlerts}
                    onChange={(e) => setSettings({ ...settings, enableSmsWhatsAppAlerts: e.target.checked })}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#166534' }}>Enable One-Click WhatsApp & SMS Billing Dispatch</div>
                    <div style={{ fontSize: '0.8rem', color: '#15803d' }}>
                      Generates direct WhatsApp links on invoice creation with pre-formatted bill details.
                    </div>
                  </div>
                </label>
              </div>

              <div className="form-group" style={{ marginBottom: '18px' }}>
                <label className="form-label" style={{ fontWeight: 700 }}>New Sale Invoice SMS / WhatsApp Template</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={settings.smsTemplateSaleInvoice || ''}
                  onChange={(e) => setSettings({ ...settings, smsTemplateSaleInvoice: e.target.value })}
                />
                <small style={{ color: '#64748b', fontSize: '0.75rem' }}>
                  Variables: &#123;CUSTOMER&#125;, &#123;INVOICE&#125;, &#123;AMOUNT&#125;, &#123;BALANCE&#125;
                </small>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Payment Receipt Confirmation Template</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={settings.smsTemplatePaymentReceipt || ''}
                  onChange={(e) => setSettings({ ...settings, smsTemplatePaymentReceipt: e.target.value })}
                />
                <small style={{ color: '#64748b', fontSize: '0.75rem' }}>
                  Variables: &#123;CUSTOMER&#125;, &#123;RECEIPT&#125;, &#123;AMOUNT&#125;, &#123;BALANCE&#125;
                </small>
              </div>
            </div>
          )}

          {/* TAB 6: PARTY */}
          {activeTab === 'PARTY' && (
            <div>
              <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '14px', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Party & Customer Settings</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Manage credit boundaries, default payment days, and party-wise rate memory.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
                <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={settings.enableCreditLimitCheck}
                      onChange={(e) => setSettings({ ...settings, enableCreditLimitCheck: e.target.checked })}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Enforce Customer Credit Limit Alerts</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        Warn cashier/salesman if customer balance exceeds their approved credit ceiling.
                      </div>
                    </div>
                  </label>
                </div>

                <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={settings.enablePartyRateHistory}
                      onChange={(e) => setSettings({ ...settings, enablePartyRateHistory: e.target.checked })}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Automatic Negotiated Rate Memory</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        Memorizes the exact rate sold to each party previously and auto-suggests it on subsequent bills.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="form-group" style={{ maxWidth: '300px' }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Default Payment Terms (Credit Days)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="number"
                    className="form-control"
                    min="0"
                    value={settings.defaultPaymentTermsDays}
                    onChange={(e) => setSettings({ ...settings, defaultPaymentTermsDays: Number(e.target.value) || 0 })}
                  />
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#64748b' }}>Days</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: ITEM */}
          {activeTab === 'ITEM' && (
            <div>
              <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '14px', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Item & Inventory Settings</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Packaging units, conversion factor handling, and low stock threshold alerts.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
                <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={settings.enableDualUnits}
                      onChange={(e) => setSettings({ ...settings, enableDualUnits: e.target.checked })}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Enable Dual Packaging Units (Cartons & Bottles)</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        Allows selling in full master cartons with auto-conversion into individual bottle units.
                      </div>
                    </div>
                  </label>
                </div>

                <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={settings.enableLowStockWarning}
                      onChange={(e) => setSettings({ ...settings, enableLowStockWarning: e.target.checked })}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Low Stock Warning on Dashboard & POS</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        Flags products falling below defined minimum buffer levels in red.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="form-group" style={{ maxWidth: '300px' }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Default Secondary Unit Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={settings.defaultUnitName}
                  onChange={(e) => setSettings({ ...settings, defaultUnitName: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* TAB 8: SERVICE REMINDERS */}
          {activeTab === 'SERVICE_REMINDERS' && (
            <div>
              <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '14px', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Vehicle & Oil Change Service Reminders</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Vyapaar automotive service reminder interval for fleet owners & vehicle oil replacement.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Engine Oil Change Mileage (KM)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="number"
                      className="form-control"
                      value={settings.oilChangeServiceKm}
                      onChange={(e) => setSettings({ ...settings, oilChangeServiceKm: Number(e.target.value) || 0 })}
                    />
                    <span style={{ fontWeight: 700, color: '#64748b' }}>KM</span>
                  </div>
                  <small style={{ color: '#64748b', fontSize: '0.75rem' }}>
                    Standard mineral/synthetic recommended drain interval.
                  </small>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Follow-up Reminder Period (Days)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="number"
                      className="form-control"
                      value={settings.oilChangeReminderDays}
                      onChange={(e) => setSettings({ ...settings, oilChangeReminderDays: Number(e.target.value) || 0 })}
                    />
                    <span style={{ fontWeight: 700, color: '#64748b' }}>Days</span>
                  </div>
                  <small style={{ color: '#64748b', fontSize: '0.75rem' }}>
                    Estimated duration for customers/workshops to repeat oil maintenance.
                  </small>
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: MULTI CURRENCY */}
          {activeTab === 'MULTI_CURRENCY' && (
            <div>
              <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '14px', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Multi-Currency & Import Valuation</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Import valuation for crude & base oil consignments quoted in foreign currency.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Secondary Trading Currency</label>
                  <input
                    type="text"
                    className="form-control"
                    value={settings.secondaryCurrency}
                    onChange={(e) => setSettings({ ...settings, secondaryCurrency: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Exchange Conversion Rate (to PKR)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="number"
                      className="form-control"
                      step="any"
                      value={settings.exchangeRate}
                      onChange={(e) => setSettings({ ...settings, exchangeRate: e.target.value as any })}
                    />
                    <span style={{ fontWeight: 700, color: '#64748b' }}>PKR</span>
                  </div>
                  <small style={{ color: '#64748b', fontSize: '0.75rem' }}>
                    E.g. 1 USD = 280.0 PKR
                  </small>
                </div>
              </div>
            </div>
          )}

          {/* Save Action Bar */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '30px', borderTop: '1px solid #e2e8f0', paddingTop: '18px' }}>
            <button
              type="button"
              onClick={() => handleSave()}
              disabled={saving}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', fontWeight: 700 }}
            >
              <Save size={18} /> {saving ? 'Saving...' : `Save ${tabs.find(t => t.id === activeTab)?.label} Settings`}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
