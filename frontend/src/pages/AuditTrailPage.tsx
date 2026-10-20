import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { FileText, ShieldAlert } from 'lucide-react';

export const AuditTrailPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/settings/audit-logs');
      setLogs(res.data.logs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Security Audit Trail & Compliance Log</h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Immutable chronological record of logins, transactions, stock adjustments, and staff operations
          </p>
        </div>
        <button onClick={loadLogs} className="btn btn-outline btn-sm">
          Refresh Log
        </button>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Role</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Audit Payload / Details</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  Loading immutable audit entries...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                  No audit logs recorded yet.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td style={{ fontWeight: 600 }}>{log.user?.fullName || 'System'}</td>
                  <td>
                    <span className="badge badge-neutral">{log.user?.role || 'SYSTEM'}</span>
                  </td>
                  <td>
                    <span className="badge badge-info font-mono">{log.action}</span>
                  </td>
                  <td>{log.entityType}</td>
                  <td className="font-mono" style={{ fontSize: '0.78rem', color: '#475569' }}>
                    {log.details ? log.details : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
