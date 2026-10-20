import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { DollarSign, Clock, Users, ArrowDownLeft, FileText, CheckCircle } from 'lucide-react';

export const CashierDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.get('/reports/dashboard-stats');
      setStats(res.data.stats);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const { today, overall, recentSales } = stats || {};

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Cashier Daily Counter & Cash Register</h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Daily cash drawer reconciliation, POS counter receipts and field collection management
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <a href="/sales" className="btn btn-primary">
            New Counter Sale Receipt
          </a>
          <a href="/ledgers" className="btn btn-secondary">
            Post Customer Payment
          </a>
        </div>
      </div>

      {/* Cashier Specific KPI Cards */}
      <div className="stat-grid">
        <div className="stat-card emerald">
          <div className="stat-label">Total Cash In Drawer Today</div>
          <div className="stat-value">Rs. {Number(today?.cashReceived || 0).toLocaleString()}</div>
          <div className="stat-sub">Counter cash + collections received</div>
        </div>

        <div className="stat-card blue">
          <div className="stat-label">Today's Sales Count</div>
          <div className="stat-value">{today?.salesCount || 0} Invoices</div>
          <div className="stat-sub">Total billed: Rs. {Number(today?.totalSales || 0).toLocaleString()}</div>
        </div>

        <div className="stat-card crimson">
          <div className="stat-label">Total Pending Market Udhar</div>
          <div className="stat-value">Rs. {Number(overall?.customerReceivables || 0).toLocaleString()}</div>
          <div className="stat-sub">Across all registered shops</div>
        </div>
      </div>

      {/* Cashier Quick Actions & Recent Cash Invoices */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Clock size={18} color="#2563eb" /> Recent Cashier Settlements & Invoices
          </h3>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Live counter transactions</span>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Time / Date</th>
                <th>Shop / Customer</th>
                <th style={{ textAlign: 'right' }}>Total Bill</th>
                <th style={{ textAlign: 'right' }}>Cash Received</th>
                <th style={{ textAlign: 'right' }}>Pending Balance</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {recentSales && recentSales.length > 0 ? (
                recentSales.map((s: any) => (
                  <tr key={s.id}>
                    <td className="font-mono" style={{ fontWeight: 700, color: '#d97706' }}>
                      {s.invoiceNumber}
                    </td>
                    <td>{new Date(s.saleDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td style={{ fontWeight: 600 }}>{s.customer?.shopName}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>
                      Rs. {Number(s.netAmount).toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right', color: '#059669', fontWeight: 700 }}>
                      Rs. {Number(s.receivedAmount).toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right', color: Number(s.remainingBalance) > 0 ? '#dc2626' : '#059669', fontWeight: 700 }}>
                      Rs. {Number(s.remainingBalance).toLocaleString()}
                    </td>
                    <td>
                      <a href="/sales" className="btn btn-outline btn-sm">
                        Print Slip
                      </a>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                    No counter transactions yet today.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
