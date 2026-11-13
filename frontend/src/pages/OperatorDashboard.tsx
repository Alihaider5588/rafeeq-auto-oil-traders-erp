import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Sale, Product } from '../types';
import { CheckCircle2, Clock, AlertTriangle, Package, ShoppingBag, RefreshCw, ShoppingCart, FileDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { exportStockAlertsPDF } from '../utils/stockAlertPdf';

export const OperatorDashboard: React.FC = () => {
  const [pendingOrders, setPendingOrders] = useState<Sale[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [pendingDeliveries, setPendingDeliveries] = useState<any[]>([]);
  const [deliveringId, setDeliveringId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAlerts, setLoadingAlerts] = useState(true);

  useEffect(() => {
    fetchPendingOrders();
    fetchStockAlerts();
    fetchPendingDeliveries();
  }, []);

  const fetchPendingDeliveries = async () => {
    try {
      const res = await api.get('/sales/pending-deliveries');
      if (res.data?.success) {
        setPendingDeliveries(res.data.data || []);
      }
    } catch (e) {
      console.error('Failed to load pending deliveries', e);
    }
  };

  const handleDeliverNow = async (saleId: string) => {
    if (!window.confirm('Kya yeh baqaya saman customer ko deliver kar diya gaya hai?')) return;
    try {
      setDeliveringId(saleId);
      await api.post(`/sales/${saleId}/update-delivery`, { markAllDelivered: true });
      setPendingDeliveries((prev) => prev.filter((d) => d.saleId !== saleId));
      alert('✓ Delivery status updated to Delivered! Reminder alert cleared.');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update delivery');
    } finally {
      setDeliveringId(null);
    }
  };

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

  const fetchStockAlerts = async () => {
    try {
      setLoadingAlerts(true);
      const res = await api.get('/products', {
        params: { lowStock: 'true', limit: 5000 },
      });
      setLowStockProducts(res.data.data || []);
    } catch (e) {
      console.error('Failed to load stock alerts', e);
    } finally {
      setLoadingAlerts(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const res = await api.post(`/sales/${id}/approve`);
      if (res.data.success) {
        alert('Salesman order approved! Inventory deducted and customer ledger updated.');
        fetchPendingOrders();
        fetchStockAlerts();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Approval failed');
    }
  };

  const outOfStockCount = lowStockProducts.filter((p) => Number(p.currentStock) <= 0).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Computer Operator Operations Desk</h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Inward inventory entry, retail sales billing, minimum stock alerts, and salesman mobile order verification
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link to="/purchases" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShoppingBag size={16} /> + Purchase Maal Inward
          </Link>
          <Link to="/salesman" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShoppingCart size={16} /> + Quick POS Billing
          </Link>
        </div>
      </div>

      {/* Operator Workflow & Critical Stock Alert Cards */}
      <div className="stat-grid" style={{ marginBottom: '20px' }}>
        <div className="stat-card amber">
          <div className="stat-label">Pending Salesman Orders</div>
          <div className="stat-value">{pendingOrders.length}</div>
          <div className="stat-sub">
            <Clock size={14} color="#d97706" /> Awaiting operator confirmation & stock lock
          </div>
        </div>

        {/* Minimum Stock Alert KPI Card */}
        <div 
          className="stat-card crimson" 
          style={{ 
            borderLeft: '4px solid #ef4444',
            backgroundColor: lowStockProducts.length > 0 ? '#fff5f5' : '#ffffff' 
          }}
        >
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#b91c1c', fontWeight: 700 }}>
            <AlertTriangle size={16} color="#ef4444" /> Minimum Stock Alert (کم سٹاک الرٹ)
          </div>
          <div className="stat-value" style={{ color: '#dc2626' }}>
            {lowStockProducts.length} Items
          </div>
          <div className="stat-sub" style={{ color: '#7f1d1d', fontWeight: 600 }}>
            {outOfStockCount > 0 ? (
              <span style={{ color: '#dc2626', fontWeight: 800 }}>⚠️ {outOfStockCount} Out of Stock</span>
            ) : (
              'At or below minimum threshold'
            )}
          </div>
        </div>

        <div className="stat-card blue">
          <div className="stat-label">Quick Actions</div>
          <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Link to="/products" className="btn btn-outline btn-sm">Catalog</Link>
            <Link to="/customers" className="btn btn-outline btn-sm">Customers</Link>
            <Link to="/purchases" className="btn btn-outline btn-sm">Purchases</Link>
            <Link to="/delivery" className="btn btn-outline btn-sm">Van Dispatch</Link>
          </div>
        </div>
      </div>

      {/* 📦 PENDING DELIVERY & AMANAT REMINDER SECTION (گاہکوں کا پینڈنگ سامان) */}
      {pendingDeliveries.length > 0 && (
        <div style={{
          backgroundColor: '#eff6ff',
          border: '1.5px solid #93c5fd',
          borderRadius: '12px',
          padding: '16px 18px',
          marginBottom: '24px',
          boxShadow: '0 2px 10px rgba(37, 99, 235, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#dbeafe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1d4ed8'
              }}>
                <Clock size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 800, color: '#1e3a8a', fontSize: '0.96rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Customer Pending Deliveries Reminder (گاہکوں کا پینڈنگ سامان / امانت الرٹ)</span>
                  <span style={{ backgroundColor: '#2563eb', color: '#fff', fontSize: '0.72rem', padding: '1px 8px', borderRadius: '10px' }}>
                    {pendingDeliveries.length} Pending
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#1e40af' }}>
                  In invoices ka saman godown me pada hai aur customer ko dena baqi hai. Saman hawale karne par "Deliver Now" dabayein.
                </div>
              </div>
            </div>
            <Link to="/sales" className="btn btn-sm btn-outline" style={{ borderColor: '#93c5fd', color: '#1d4ed8', fontWeight: 700 }}>
              Sales Register →
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '10px', maxHeight: '280px', overflowY: 'auto' }}>
            {pendingDeliveries.map((pd) => (
              <div
                key={pd.saleId}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <div>
                      <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.88rem' }}>
                        {pd.customer?.shopName || 'Customer'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        📞 {pd.customer?.phone || 'No Phone'} {pd.customer?.area ? `• ${pd.customer.area}` : ''}
                      </div>
                    </div>
                    <span style={{
                      fontFamily: 'monospace',
                      fontWeight: 800,
                      fontSize: '0.72rem',
                      color: '#d97706',
                      backgroundColor: '#fef3c7',
                      padding: '2px 5px',
                      borderRadius: '4px'
                    }}>
                      #{pd.invoiceNumber}
                    </span>
                  </div>

                  <div style={{
                    backgroundColor: '#f8fafc',
                    borderRadius: '6px',
                    padding: '6px 8px',
                    margin: '6px 0',
                    border: '1px dashed #cbd5e1',
                    fontSize: '0.75rem'
                  }}>
                    <div style={{ fontWeight: 700, color: '#475569', marginBottom: '3px', fontSize: '0.72rem' }}>
                      ⏳ Pending Items:
                    </div>
                    {pd.pendingItems.map((pi: any, piIdx: number) => (
                      <div key={piIdx} style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a' }}>
                        <span>• {pi.productName}</span>
                        <span style={{ fontWeight: 700, color: '#d97706' }}>
                          {pi.quantity} {pi.unitType === 'PRIMARY' ? 'Ctn' : 'Pc'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', paddingTop: '4px', borderTop: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                    {new Date(pd.saleDate).toLocaleDateString()}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeliverNow(pd.saleId)}
                    disabled={deliveringId === pd.saleId}
                    style={{
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '5px',
                      padding: '3px 8px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    ✓ {deliveringId === pd.saleId ? 'Saving...' : 'Deliver Now (سامان دے دیا)'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MINIMUM STOCK ALERT TABLE SECTION */}
      {lowStockProducts.length > 0 && (
        <div className="card" style={{ marginBottom: '24px', border: '1px solid #fecaca', boxShadow: '0 4px 14px rgba(239, 68, 68, 0.08)' }}>
          <div className="card-header" style={{ backgroundColor: '#fef2f2', borderBottom: '1px solid #fee2e2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={18} />
              </div>
              <div>
                <h3 className="card-title" style={{ color: '#991b1b', margin: 0, fontSize: '0.98rem' }}>
                  Critical Minimum Stock & Reorder Alerts (فوری نیا مال منگوانے کی لسٹ)
                </h3>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#b91c1c' }}>
                  Following products have fallen below minimum safety stock levels. Inform owner or record inward purchase.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => exportStockAlertsPDF(lowStockProducts, 'OPERATOR CRITICAL REORDER ALERTS')}
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                title="Download / Print PDF list of products at or below minimum threshold"
              >
                <FileDown size={14} /> Download PDF
              </button>
              <Link to="/purchases" className="btn btn-primary btn-sm" style={{ fontWeight: 700, backgroundColor: '#dc2626', borderColor: '#dc2626' }}>
                + Inward Maal Purchase
              </Link>
              <button onClick={fetchStockAlerts} className="btn btn-outline btn-sm" title="Refresh Stock Alerts">
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>SKU / Code</th>
                  <th>Product Name</th>
                  <th>Category & Brand</th>
                  <th style={{ textAlign: 'right' }}>Current Stock (موجودہ اسٹاک)</th>
                  <th style={{ textAlign: 'right' }}>Min Threshold (کم سے کم حد)</th>
                  <th style={{ textAlign: 'center' }}>Urgency Level</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loadingAlerts ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                      Checking stock levels...
                    </td>
                  </tr>
                ) : (
                  lowStockProducts.map((p) => {
                    const stock = Number(p.currentStock);
                    const min = Number(p.minimumStockLevel);
                    const isZero = stock <= 0;

                    const conv = Number(p.conversionFactor) || 1;
                    const hasPackaging = (!!p.primaryUnit || !!p.primaryUnitId) && conv > 1;
                    const primarySymbol = p.primaryUnit?.symbol || 'Ctn';
                    const secSymbol = p.unit?.symbol || 'Pcs';

                    const stockCartons = Math.floor(stock / conv);
                    const remStock = stock % conv;

                    const minCartons = Math.floor(min / conv);
                    const remMin = min % conv;

                    return (
                      <tr key={p.id} style={{ backgroundColor: isZero ? '#fff1f2' : '#fffbeb' }}>
                        <td className="font-mono" style={{ fontWeight: 700, color: '#d97706' }}>
                          {p.sku}
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{p.name}</div>
                          {p.specifications && (
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{p.specifications}</div>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>{p.category?.name || 'General'}</span>
                            {hasPackaging && (
                              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#0284c7', backgroundColor: '#e0f2fe', padding: '1px 6px', borderRadius: '4px' }}>
                                1 {primarySymbol} = {conv} {secSymbol}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{p.brand}</div>
                        </td>
                        <td style={{ textAlign: 'right', padding: '8px 12px' }}>
                          {hasPackaging ? (
                            <>
                              <div style={{ fontWeight: 800, color: isZero ? '#dc2626' : '#d97706', fontSize: '0.96rem' }}>
                                {stockCartons} {primarySymbol}{remStock > 0 ? ` + ${remStock} ${secSymbol}` : ''}
                              </div>
                              <div style={{ fontSize: '0.74rem', color: isZero ? '#dc2626' : '#64748b', fontWeight: 600, marginTop: '2px' }}>
                                Total: {stock} {secSymbol}
                              </div>
                            </>
                          ) : (
                            <div style={{ fontWeight: 800, color: isZero ? '#dc2626' : '#d97706', fontSize: '0.95rem' }}>
                              {stock} {p.unit?.symbol || 'Pcs'}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', padding: '8px 12px' }}>
                          {hasPackaging ? (
                            <>
                              <div style={{ fontWeight: 700, color: '#334155', fontSize: '0.92rem' }}>
                                {minCartons} {primarySymbol}{remMin > 0 ? ` + ${remMin} ${secSymbol}` : ''}
                              </div>
                              <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                                Total: {min} {secSymbol}
                              </div>
                            </>
                          ) : (
                            <div style={{ fontWeight: 600, color: '#64748b' }}>
                              {min} {p.unit?.symbol || 'Pcs'}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {isZero ? (
                            <span style={{
                              backgroundColor: '#fee2e2',
                              color: '#991b1b',
                              padding: '3px 8px',
                              borderRadius: '12px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              border: '1px solid #f87171',
                              display: 'inline-block'
                            }}>
                              ⛔ OUT OF STOCK
                            </span>
                          ) : (
                            <span style={{
                              backgroundColor: '#fef3c7',
                              color: '#92400e',
                              padding: '3px 8px',
                              borderRadius: '12px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              border: '1px solid #fcd34d',
                              display: 'inline-block'
                            }}>
                              ⚠️ LOW STOCK (REORDER)
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <Link 
                            to="/purchases" 
                            className="btn btn-outline btn-sm"
                            style={{ fontSize: '0.75rem', padding: '4px 8px', fontWeight: 700 }}
                          >
                            + Order Inward
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
