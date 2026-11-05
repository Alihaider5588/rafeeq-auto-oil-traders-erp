import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { RefreshCw, CloudCheck, CloudUpload, AlertCircle, Database } from 'lucide-react';

interface SyncStatusData {
  isLocalMode: boolean;
  neonConfigured?: boolean;
  lastSyncTime?: string | null;
  lastSyncStatus?: string | null;
  pendingLocalCount?: number;
  message?: string;
}

export const SyncButton: React.FC = () => {
  const [status, setStatus] = useState<SyncStatusData | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchSyncStatus = async () => {
    try {
      const res = await api.get('/sync/status');
      if (res.data?.success) {
        setStatus(res.data);
      }
    } catch (e) {
      // In offline mode without server or on public page, fail silently
    }
  };

  useEffect(() => {
    fetchSyncStatus();
    const interval = setInterval(fetchSyncStatus, 45000); // Check status every 45s
    return () => clearInterval(interval);
  }, []);

  const handleTriggerSync = async () => {
    if (syncing) return;
    try {
      setSyncing(true);
      setNotification(null);
      const res = await api.post('/sync/run');
      if (res.data?.success) {
        const pushed = res.data.pushed;
        const pushedDetails = pushed
          ? `${pushed.sales || 0} Sales, ${pushed.purchases || 0} Purchases, ${pushed.customers || 0} Customers`
          : '';
        setNotification({
          type: 'success',
          text: `✅ Cloud Sync Kamyabi se mukammal! ${pushedDetails ? `(${pushedDetails} upload ho gaye)` : ''}`,
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
        text: err.response?.data?.message || 'Internet connect nahi ho saka. Barah-e-karam connection check karein.',
      });
    } finally {
      setSyncing(false);
      setTimeout(() => setNotification(null), 8000);
    }
  };

  if (!status) return null;

  // Cloud Direct Mode (Vercel Production)
  if (!status.isLocalMode) {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          fontSize: '0.74rem',
          color: '#059669',
          backgroundColor: '#ecfdf5',
          border: '1px solid #a7f3d0',
          padding: '3px 9px',
          borderRadius: '16px',
          fontWeight: 700,
        }}
        title="Operating in Direct Cloud Mode (Neon PostgreSQL Live)"
      >
        <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
        Cloud Live
      </div>
    );
  }

  // Local Offline-First Mode
  const pending = status.pendingLocalCount || 0;

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
      {/* Pending status badge */}
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
        title={pending > 0 ? `${pending} local entries waiting to sync with Neon Cloud` : 'All local data is synced'}
      >
        <Database size={12} />
        {pending > 0 ? `${pending} Pending Sync` : 'Local Synced'}
      </span>

      {/* Manual Sync Button */}
      <button
        type="button"
        onClick={handleTriggerSync}
        disabled={syncing}
        className="btn btn-sm"
        style={{
          backgroundColor: pending > 0 ? '#0284c7' : '#f8fafc',
          color: pending > 0 ? '#ffffff' : '#475569',
          border: pending > 0 ? '1px solid #0284c7' : '1px solid #cbd5e1',
          fontSize: '0.74rem',
          fontWeight: 800,
          padding: '4px 10px',
          borderRadius: '6px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          cursor: syncing ? 'wait' : 'pointer',
        }}
        title="Sync offline records to Neon Cloud now"
      >
        <RefreshCw size={12} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
        {syncing ? 'Syncing...' : '🔄 Cloud Sync'}
      </button>

      {/* Notification Toast */}
      {notification && (
        <div
          style={{
            position: 'absolute',
            top: '36px',
            right: '0',
            zIndex: 99999,
            minWidth: '280px',
            backgroundColor: notification.type === 'success' ? '#065f46' : '#991b1b',
            color: '#ffffff',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '0.78rem',
            fontWeight: 700,
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          }}
        >
          {notification.text}
        </div>
      )}
    </div>
  );
};
