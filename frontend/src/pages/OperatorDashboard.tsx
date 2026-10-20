import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Sale } from '../types';
import { CheckCircle2, Clock, PackageCheck, ShoppingCart, ArrowRight } from 'lucide-react';

export const OperatorDashboard: React.FC = () => {
  const [pendingOrders, setPendingOrders] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingOrders();
  }, []);

  const fetchPendingOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get('/sales', {
        params: { status: 'PENDING_APPROVAL' },
      });
      setPendingOrders(res.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const res = await api.post(`/sales/${id}/approve`);
      if (res.data.success) {
        alert('Salesman order approved! Inventory deducted and customer ledger updated.');
        fetchPendingOrders();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Approval failed');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Computer Operator Operations Desk</h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Inward inventory entry, retail sales billing, and salesman mobile order verification
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <a href="/purchases" className="btn btn-secondary">
            + Purchase Maal Inward
          </a>
          <a href="/salesman" className="btn btn-primary">
            + Quick POS Billing
          </a>
        </div>
      </div>

      {/* Operator Workflow Cards */}
      <div className="stat-grid">
        <div className="stat-card amber">
          <div className="stat-label">Pending Salesman Orders</div>
          <div className="stat-value">{pendingOrders.length}</div>
          <div className="stat-sub">Awaiting operator confirmation & stock lock</div>
        </div>

        <div className="stat-card blue">
          <div className="stat-label">Quick Actions</div>
          <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
            <a href="/products" className="btn btn-outline btn-sm">Catalog</a>
            <a href="/customers" className="btn btn-outline btn-sm">Customers</a>
            <a href="/delivery" className="btn btn-outline btn-sm">Van Dispatch</a>
          </div>
        </div>
      </div>

      {/* Salesman Pending/Submitted Orders Section */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Clock size={18} color="#d97706" /> Salesman Pending / Submitted Orders
          </h3>
          <button onClick={fetchPendingOrders} className="btn btn-outline btn-sm">
            Refresh Orders
          </button>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Time</th>
                <th>Salesman</th>
                <th>Customer / Shop</th>
                <th style={{ textAlign: 'right' }}>Total Order</th>
                <th style={{ textAlign: 'right' }}>Collected</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                    Loading pending orders...
                  </td>
                </tr>
              ) : pendingOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#059669', fontWeight: 600 }}>
                    <CheckCircle2 size={24} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
                    No orders awaiting approval. All field sales synced!
                  </td>
                </tr>
              ) : (
                pendingOrders.map((ord) => (
                  <tr key={ord.id}>
                    <td className="font-mono" style={{ fontWeight: 700, color: '#d97706' }}>
                      {ord.invoiceNumber}
                    </td>
                    <td>{new Date(ord.saleDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td style={{ fontWeight: 600 }}>{ord.salesman?.fullName}</td>
                    <td>{ord.customer?.shopName}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>
                      Rs. {Number(ord.netAmount).toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right', color: '#059669', fontWeight: 700 }}>
                      Rs. {Number(ord.receivedAmount).toLocaleString()}
                    </td>
                    <td>
                      <button
                        onClick={() => handleApprove(ord.id)}
                        className="btn btn-success btn-sm"
                      >
                        <CheckCircle2 size={14} /> Approve & Dispatch
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
