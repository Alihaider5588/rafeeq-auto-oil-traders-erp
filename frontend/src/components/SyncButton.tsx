import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { RefreshCw, Database, DownloadCloud, Sparkles, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface SyncStatusData {
  isLocalMode: boolean;
  neonConfigured?: boolean;
  lastSyncTime?: string | null;
  lastSyncStatus?: string | null;
  pendingLocalCount?: number;
  message?: string;
}

interface VersionData {
  updateAvailable: boolean;
  currentVersion?: string;
  latestVersion?: string;
  commitMessage?: string;
  commitDate?: string;
  authorName?: string;
  offline?: boolean;
}

export const SyncButton: React.FC = () => {
  const [status, setStatus] = useState<SyncStatusData | null>(null);
  const [versionInfo, setVersionInfo] = useState<VersionData | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchSyncStatus = async () => {
    try {
      const res = await api.get('/sync/status');
      if (res.data?.success) {
        setStatus(res.data);
      }
    } catch {
      // Offline mode without server
    }
  };

  const fetchVersionCheck = async () => {
    try {
      const res = await api.get('/sync/version-check');
      if (res.data?.success) {
        setVersionInfo(res.data);
      }
    } catch {
      // Offline
    }
  };

  useEffect(() => {
    fetchSyncStatus();
    fetchVersionCheck();

    // Check status every 45s, version check every 3 minutes
    const statusInterval = setInterval(fetchSyncStatus, 45000);
    const versionInterval = setInterval(fetchVersionCheck, 180000);

    return () => {
      clearInterval(statusInterval);
      clearInterval(versionInterval);
    };
  }, []);

  const handleTriggerSync = async () => {
    if (syncing) return;
    try {
      setSyncing(true);
      setNotification(null);
      const res = await api.post('/sync/run');
      if (res.data?.success) {
        const pushed = res.data.pushed;
        const pulled = res.data.pulled;
        const pushedDetails = pushed
          ? `${pushed.sales || 0} Sales, ${pushed.purchases || 0} Pur, ${pushed.customers || 0} Cust`
          : '';
        const pulledDetails = pulled
          ? `${pulled.products || 0} Prods, ${pulled.salesmanOrders || 0} Orders`
          : '';

        setNotification({
          type: 'success',
          text: `✅ سنک مکمل! کلاؤڈ پر بھیجا گیا (${pushedDetails})، کلاؤڈ سے حاصل ہوا (${pulledDetails})`,
        });
        fetchSyncStatus();
      } else {
        setNotification({
          type: 'error',
          text: res.data?.message || 'Sync fail ho gaya.',
        });
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        text: err.response?.data?.message || 'انٹرنیٹ کنیکٹ نہیں ہو سکا۔ برائے مہربانی اپنا کنکشن چیک کریں۔',
      });
    } finally {
      setSyncing(false);
      setTimeout(() => setNotification(null), 8000);
    }
  };

  const handleInstallUpdate = async () => {
    if (updating) return;
    try {
      setUpdating(true);
      const res = await api.post('/sync/install-update');
      if (res.data?.success) {
        setNotification({
          type: 'success',
          text: '✅ نیا ورژن کامیابی سے انسٹال ہو گیا! چند سیکنڈ میں پیج ری لوڈ ہو رہا ہے...',
        });
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        alert(res.data?.message || 'Update failed');
        setUpdating(false);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'اپڈیٹ کے دوران خرابی پیش آئی۔ برائے مہربانی انٹرنیٹ چیک کریں۔');
      setUpdating(false);
    }
  };

  if (!status) return null;

  // Cloud Direct Mode (Vercel Production): Hide sync button on online Vercel
  if (!status.isLocalMode) {
    return null;
  }

  const pending = status.pendingLocalCount || 0;

  // Format last sync time (e.g. "12:45 PM" or "5 mins ago")
  const formatLastSync = (isoString?: string | null) => {
    if (!isoString) return 'کبھی نہیں (Never)';
    try {
      const d = new Date(isoString);
      const diffMinutes = Math.floor((Date.now() - d.getTime()) / 60000);
      if (diffMinutes < 1) return 'ابھی ابھی (Just now)';
      if (diffMinutes < 60) return `${diffMinutes}m پہلے`;
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
      {/* 1. New Version Available Alert Badge (Pops up automatically when git commit exists) */}
      {versionInfo?.updateAvailable && (
        <button
          type="button"
          onClick={() => setShowUpdateModal(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#ef4444',
            color: '#ffffff',
            border: 'none',
            borderRadius: '20px',
            padding: '4px 10px',
            fontSize: '0.74rem',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 0 12px rgba(239, 68, 68, 0.6)',
            animation: 'pulse 1.8s infinite',
          }}
          title="نیا ورژن دستیاب ہے! کلک کر کے فوری اپڈیٹ کریں۔"
        >
          <Sparkles size={13} />
          <span>🚀 نیا ورژن دستیاب ہے (Update)</span>
        </button>
      )}

      {/* 2. Pending / Synced Status Badge */}
      <span
        style={{
          fontSize: '0.74rem',
          fontWeight: 700,
          color: pending > 0 ? '#b45309' : '#047857',
          backgroundColor: pending > 0 ? '#fef3c7' : '#ecfdf5',
          border: pending > 0 ? '1px solid #fde68a' : '1px solid #a7f3d0',
          padding: '3px 8px',
          borderRadius: '16px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
        }}
        title={`آخری سنک: ${formatLastSync(status.lastSyncTime)}`}
      >
        <Database size={12} />
        {pending > 0 ? `${pending} زیر التواء (Pending)` : 'لوکل سنک (Synced)'}
      </span>

      {/* 3. Prominent Manual "Sync Now" Button */}
      <button
        type="button"
        onClick={handleTriggerSync}
        disabled={syncing}
        style={{
          backgroundColor: '#0284c7',
          color: '#ffffff',
          border: '1px solid #0369a1',
          fontSize: '0.74rem',
          fontWeight: 800,
          padding: '4px 12px',
          borderRadius: '7px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          cursor: syncing ? 'wait' : 'pointer',
          boxShadow: '0 1px 3px rgba(2, 132, 199, 0.3)',
          transition: 'all 0.2s ease',
        }}
        title={`کلاؤڈ سے تازہ ترین ڈیٹا حاصل کریں اور لوکل بلز آن لائن بھیجیں۔ آخری سنک: ${formatLastSync(status.lastSyncTime)}`}
      >
        <RefreshCw size={12} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
        <span>{syncing ? 'سنک ہو رہا ہے...' : '🔄 Sync Now (ابھی سنک کریں)'}</span>
      </button>

      {/* 4. Notification Toast */}
      {notification && (
        <div
          style={{
            position: 'absolute',
            top: '38px',
            right: '0',
            zIndex: 99999,
            minWidth: '320px',
            backgroundColor: notification.type === 'success' ? '#065f46' : '#991b1b',
            color: '#ffffff',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '0.78rem',
            fontWeight: 700,
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            lineHeight: 1.4,
          }}
        >
          {notification.text}
        </div>
      )}

      {/* 5. One-Click System Update Modal */}
      {showUpdateModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100000,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '520px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              textAlign: 'center',
              position: 'relative',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
              }}
            >
              <DownloadCloud size={30} />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0' }}>
              🚀 نیا سافٹ ویئر ورژن دستیاب ہے!
            </h3>
            <p style={{ fontSize: '0.86rem', color: '#64748b', margin: '0 0 16px 0', lineHeight: 1.5 }}>
              نئی خصوصیات، بہتریاں اور تبدیلیاں ڈاؤن لوڈ کے لیے تیار ہیں۔ آپ 1-کلک میں اپنے سسٹم کو تازہ ترین ورژن میں اپڈیٹ کر سکتے ہیں۔
            </p>

            {versionInfo && (
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontSize: '0.8rem',
                  color: '#334155',
                  marginBottom: '20px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: '#64748b' }}>موجودہ ورژن (Current):</span>
                  <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>v_{versionInfo.currentVersion}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: '#64748b' }}>نیا ورژن (Latest):</span>
                  <span style={{ fontWeight: 700, color: '#16a34a', fontFamily: 'monospace' }}>
                    v_{versionInfo.latestVersion}
                  </span>
                </div>
                {versionInfo.commitMessage && (
                  <div style={{ marginTop: '8px', borderTop: '1px dashed #cbd5e1', paddingTop: '8px' }}>
                    <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>اپڈیٹ کی تفصیلات (Details):</span>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>{versionInfo.commitMessage}</span>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setShowUpdateModal(false)}
                disabled={updating}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f8fafc',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: updating ? 'not-allowed' : 'pointer',
                }}
              >
                بعد میں کریں (Later)
              </button>

              <button
                type="button"
                onClick={handleInstallUpdate}
                disabled={updating}
                style={{
                  padding: '9px 22px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: updating ? 'wait' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)',
                }}
              >
                {updating ? (
                  <>
                    <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>اپڈیٹ ہو رہا ہے... انتظار فرمائیں</span>
                  </>
                ) : (
                  <>
                    <DownloadCloud size={15} />
                    <span>⬇️ ابھی اپڈیٹ اور سنک کریں (Update Now)</span>
                  </>
                )}
              </button>
            </div>

            {updating && (
              <p style={{ marginTop: '14px', fontSize: '0.78rem', color: '#b45309', fontWeight: 600 }}>
                ⚠️ براہ کرم ونڈو یا انٹرنیٹ بند نہ کریں، اپڈیٹ مکمل ہونے پر سسٹم خود بخود ریفریش ہو جائے گا۔
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
