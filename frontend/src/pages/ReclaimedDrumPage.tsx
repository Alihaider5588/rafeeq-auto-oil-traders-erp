import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  Droplet,
  Plus,
  RefreshCw,
  ShoppingCart,
  Edit2,
  CheckCircle,
  AlertTriangle,
  ArrowDownRight,
  TrendingUp,
  FileText
} from 'lucide-react';

export const ReclaimedDrumPage: React.FC = () => {
  const navigate = useNavigate();

  const [drum, setDrum] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Rate Edit Form
  const [retailRate, setRetailRate] = useState<string>('');
  const [wholesaleRate, setWholesaleRate] = useState<string>('');
  const [savingRates, setSavingRates] = useState<boolean>(false);

  // Manual Dump Modal
  const [showDumpModal, setShowDumpModal] = useState<boolean>(false);
  const [dumpLiters, setDumpLiters] = useState<string>('');
  const [dumpNotes, setDumpNotes] = useState<string>('');
  const [dumping, setDumping] = useState<boolean>(false);

  const fetchDrumStatus = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await api.get('/sales/reclaimed-drum');
      if (res.data?.success && res.data.drum) {
        const d = res.data.drum;
        setDrum(d);
        setRetailRate(String(d.salePrice ?? ''));
        setWholesaleRate(String(d.wholesalePrice ?? ''));
      }
    } catch (e: any) {
      console.error('Failed to load drum details:', e);
      setErrorMsg(e.response?.data?.message || 'Failed to load drum details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrumStatus();
  }, []);

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleSaveRates = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingRates(true);
      setErrorMsg('');
      const res = await api.post('/sales/reclaimed-drum/rate', {
        salePrice: parseFloat(retailRate) || 0,
        wholesalePrice: parseFloat(wholesaleRate) || 0,
      });
      if (res.data?.success) {
        triggerSuccess('Drum selling rates updated successfully!');
        fetchDrumStatus();
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.response?.data?.message || 'Failed to update rates');
    } finally {
      setSavingRates(false);
    }
  };

  const handleManualDump = async (e: React.FormEvent) => {
    e.preventDefault();
    const ltrs = parseFloat(dumpLiters);
    if (!ltrs || ltrs <= 0) {
      setErrorMsg('Please enter a valid liter quantity');
      return;
    }

    try {
      setDumping(true);
      setErrorMsg('');
      const res = await api.post('/sales/reclaimed-drum/dump', {
        liters: ltrs,
        notes: dumpNotes.trim() || 'Manual loose oil added to drum',
      });
      if (res.data?.success) {
        triggerSuccess(res.data.message || `${ltrs} Liters added to drum!`);
        setShowDumpModal(false);
        setDumpLiters('');
        setDumpNotes('');
        fetchDrumStatus();
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.response?.data?.message || 'Failed to dump oil into drum');
    } finally {
      setDumping(false);
    }
  };

  const currentStock = Number(drum?.currentStock || 0);
  const saleRateNum = Number(drum?.salePrice || 0);
  const wholesaleRateNum = Number(drum?.wholesalePrice || 0);
  const totalStockValue = currentStock * saleRateNum;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '10px 0 40px 0' }}>
      {/* Notifications */}
      {successMsg && (
        <div style={{
          backgroundColor: '#dcfce7',
          color: '#15803d',
          border: '1px solid #bbf7d0',
          padding: '12px 18px',
          borderRadius: '10px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: 700,
          boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
        }}>
          <CheckCircle size={20} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div style={{
          backgroundColor: '#fee2e2',
          color: '#b91c1c',
          border: '1px solid #fecaca',
          padding: '12px 18px',
          borderRadius: '10px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: 700
        }}>
          <AlertTriangle size={20} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            backgroundColor: '#fef3c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#d97706',
            boxShadow: '0 2px 6px rgba(217, 119, 6, 0.2)'
          }}>
            <Droplet size={30} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              Reclaimed Loose Oil Drum
              <span className="urdu-text" style={{ fontSize: '1.1rem', color: '#d97706', fontWeight: 700 }}>
                (ڈرم کا کھلا آئل)
              </span>
            </h1>
            <p style={{ fontSize: '0.86rem', color: '#64748b', margin: '3px 0 0 0' }}>
              Management of reclaimed mixed engine oil, liters volume, selling rates, and instant POS billing
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={fetchDrumStatus}
            disabled={loading}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Refresh Drum Status"
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => setShowDumpModal(true)}
            className="btn btn-warning"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#d97706',
              color: '#ffffff',
              borderColor: '#b45309',
              fontWeight: 700
            }}
          >
            <Plus size={16} />
            + Add Oil to Drum (تیل ڈالیں)
          </button>

          <button
            type="button"
            onClick={() => navigate('/salesman')}
            className="btn btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#0284c7',
              borderColor: '#0284c7',
              fontWeight: 700
            }}
          >
            <ShoppingCart size={16} />
            Loose Oil POS Bill (فوری بل بنائیں)
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {/* Card 1: Available Liters */}
        <div className="card" style={{ padding: '20px', borderRadius: '14px', borderLeft: '5px solid #d97706', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Available Volume in Drum
            </span>
            <span style={{ fontSize: '1.2rem' }}>🛢️</span>
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#0f172a', marginTop: '6px' }}>
            {loading ? '...' : currentStock.toLocaleString()}{' '}
            <span style={{ fontSize: '1rem', fontWeight: 700, color: '#d97706' }}>Liters (لیٹر)</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
            SKU Code: <b>{drum?.sku || 'KHULA-RECLAIMED-DRUM'}</b>
          </div>
        </div>

        {/* Card 2: Retail Sale Rate */}
        <div className="card" style={{ padding: '20px', borderRadius: '14px', borderLeft: '5px solid #0284c7', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Retail Selling Rate
            </span>
            <span style={{ fontSize: '1.2rem' }}>💰</span>
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#0284c7', marginTop: '6px' }}>
            Rs. {loading ? '...' : saleRateNum.toLocaleString()}{' '}
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>/ Liter</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#0284c7', marginTop: '4px', fontWeight: 600 }}>
            POS Counter Rate (کاؤنٹر پر فروخت کی قیمت)
          </div>
        </div>

        {/* Card 3: Wholesale Rate */}
        <div className="card" style={{ padding: '20px', borderRadius: '14px', borderLeft: '5px solid #7c3aed', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Wholesale Rate
            </span>
            <span style={{ fontSize: '1.2rem' }}>🏬</span>
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#7c3aed', marginTop: '6px' }}>
            Rs. {loading ? '...' : (wholesaleRateNum || saleRateNum).toLocaleString()}{' '}
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>/ Liter</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#7c3aed', marginTop: '4px', fontWeight: 600 }}>
            Bulk / Van Wholesale Price (ہول سیل ریٹ)
          </div>
        </div>

        {/* Card 4: Total Stock Valuation */}
        <div className="card" style={{ padding: '20px', borderRadius: '14px', borderLeft: '5px solid #059669', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Total Drum Stock Value
            </span>
            <span style={{ fontSize: '1.2rem' }}>📈</span>
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#059669', marginTop: '6px' }}>
            Rs. {loading ? '...' : Math.round(totalStockValue).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#059669', marginTop: '4px', fontWeight: 600 }}>
            {currentStock.toFixed(1)} Ltr × Rs. {saleRateNum.toFixed(0)}
          </div>
        </div>
      </div>

      {/* Main Grid: Rate Configuration & Fast POS Instructions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Rate Update Box */}
        <div className="card" style={{ padding: '22px', borderRadius: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Edit2 size={18} color="#d97706" />
            <h3 style={{ fontSize: '1.08rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              Update Loose Oil Selling Rates (قیمت فروخت تبدیل کریں)
            </h3>
          </div>

          <form onSubmit={handleSaveRates}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
              <div>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.84rem' }}>
                  Retail Rate / Liter (Rs.):
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="any"
                    className="form-control"
                    value={retailRate}
                    onChange={(e) => setRetailRate(e.target.value)}
                    placeholder="e.g. 450"
                    required
                    style={{ fontSize: '1rem', fontWeight: 700, paddingLeft: '32px' }}
                  />
                  <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: '#64748b' }}>
                    Rs.
                  </span>
                </div>
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.84rem' }}>
                  Wholesale Rate / Liter (Rs.):
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="any"
                    className="form-control"
                    value={wholesaleRate}
                    onChange={(e) => setWholesaleRate(e.target.value)}
                    placeholder="e.g. 420"
                    style={{ fontSize: '1rem', fontWeight: 700, paddingLeft: '32px' }}
                  />
                  <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: '#64748b' }}>
                    Rs.
                  </span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={savingRates || loading}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '10px',
                fontWeight: 800,
                backgroundColor: '#d97706',
                borderColor: '#b45309'
              }}
            >
              {savingRates ? 'Saving Rates...' : '💾 Save Rates / ریٹ محفوظ کریں'}
            </button>
          </form>
        </div>

        {/* Informational Guidance Box */}
        <div className="card" style={{ padding: '22px', borderRadius: '14px', backgroundColor: '#f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Droplet size={18} color="#0284c7" />
            <h3 style={{ fontSize: '1.08rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              How Loose Oil Selling Works (کاؤنٹر و موبائل پر فروخت)
            </h3>
          </div>

          <div style={{ fontSize: '0.86rem', color: '#475569', lineHeight: 1.6 }}>
            <p style={{ margin: '0 0 10px 0' }}>
              ✅ <b>Top of POS Catalog:</b> Yeh Reclaimed Drum POS billing screen par sab se upar golden banner me show hota hai jahan se counter cashier ya salesman 1-click se khula oil bill me add kar sakta hai.
            </p>
            <p style={{ margin: '0 0 10px 0' }}>
              ✅ <b>Instant Stock Deduction:</b> Jab bhi khula engine oil kisi bill me add ho kar invoice banti hai to drum ka stock foran liters me minus ho jata hai.
            </p>
            <p style={{ margin: '0' }}>
              ✅ <b>Warranty Claims Salvage:</b> Agar koi customer claim ya return le kar aye jiska oil kharab ho to Warranty Claims page se use 1-click se is drum me shamil kiya ja sakta hai.
            </p>
          </div>
        </div>
      </div>

      {/* MANUAL DUMP MODAL */}
      {showDumpModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '480px',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Droplet size={22} color="#d97706" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  Add / Dump Oil into Drum
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDumpModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.84rem', color: '#64748b', marginBottom: '16px' }}>
              Dukan me mojood koi b khula engine oil ya return ka oil is drum me dalne ke liye liters darj karein. Yeh volume foran drum ke stock me jama ho jaye ga.
            </p>

            <form onSubmit={handleManualDump}>
              <div style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontWeight: 800, fontSize: '0.86rem' }}>
                  Liters to Add (کتنے لیٹر ڈرم میں ڈالے؟): *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="any"
                    className="form-control"
                    value={dumpLiters}
                    onChange={(e) => setDumpLiters(e.target.value)}
                    placeholder="e.g. 50"
                    required
                    autoFocus
                    style={{ fontSize: '1.1rem', fontWeight: 700 }}
                  />
                  <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: '#94a3b8' }}>
                    Ltr
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.84rem' }}>
                  Notes / Source (کس مد یا واپسی سے تیل آیا؟):
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={dumpNotes}
                  onChange={(e) => setDumpNotes(e.target.value)}
                  placeholder="e.g. Workshop loose oil, opening drum remnant..."
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowDumpModal(false)}
                  className="btn btn-secondary"
                  disabled={dumping}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={dumping}
                  className="btn btn-warning"
                  style={{
                    backgroundColor: '#d97706',
                    color: '#ffffff',
                    borderColor: '#b45309',
                    fontWeight: 800,
                    padding: '8px 20px'
                  }}
                >
                  {dumping ? 'Dumping...' : '🛢️ Confirm Add to Drum'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
