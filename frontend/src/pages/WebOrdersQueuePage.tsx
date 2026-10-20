import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Inbox,
  CheckCircle2,
  XCircle,
  Clock,
  Phone,
  MapPin,
  Calendar,
  AlertCircle,
  ShoppingBag,
  ArrowRight,
  PackageCheck,
  Search,
  Filter,
  RefreshCw,
  Loader2
} from 'lucide-react';

interface WebOrderItem {
  id: string;
  productId: string;
  quantity: number;
  unitType: 'PRIMARY' | 'SECONDARY';
  unitPrice: number;
  totalPrice: number;
  product?: {
    id: string;
    name: string;
    sku: string;
    brand: string;
    currentStock: number;
    unit?: { name: string; symbol: string };
    primaryUnit?: { name: string; symbol: string };
    conversionFactor: number;
  };
}

interface WebOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  shopName: string | null;
  cityArea: string | null;
  deliveryAddress: string | null;
  totalAmount: number;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED';
  notes: string | null;
  convertedSaleId: string | null;
  confirmedById: string | null;
  confirmedAt: string | null;
  createdAt: string;
  items: WebOrderItem[];
}

export const WebOrdersQueuePage: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<WebOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'CONFIRMED' | 'REJECTED'>('PENDING');
  const [search, setSearch] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get('/sales/web-orders');
      if (res.data?.success) {
        setOrders(res.data.orders);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Failed to fetch website orders queue.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleConfirmOrder = async (order: WebOrder) => {
    if (!window.confirm(`Are you sure you want to confirm Online Order #${order.orderNumber} for "${order.customerName}" and create a POS Sale Invoice? Stock will be deducted automatically.`)) {
      return;
    }

    setActionLoadingId(order.id);
    setFeedback(null);
    try {
      const res = await api.post(`/sales/web-orders/${order.id}/confirm`, {});
      if (res.data?.success) {
        setFeedback({
          type: 'success',
          message: res.data.message || `Order #${order.orderNumber} confirmed and converted to sale invoice!`,
        });
        await fetchOrders();
      } else {
        setFeedback({ type: 'error', message: res.data?.message || 'Failed to confirm order.' });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.response?.data?.message || 'Server error while confirming web order.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectOrder = async (order: WebOrder) => {
    const reason = window.prompt(`Enter reason for rejecting Order #${order.orderNumber} (optional):`, 'Out of stock / Customer cancelled');
    if (reason === null) return; // user cancelled prompt

    setActionLoadingId(order.id);
    setFeedback(null);
    try {
      const res = await api.post(`/sales/web-orders/${order.id}/reject`, { reason });
      if (res.data?.success) {
        setFeedback({ type: 'success', message: `Order #${order.orderNumber} marked as rejected.` });
        await fetchOrders();
      } else {
        setFeedback({ type: 'error', message: res.data?.message || 'Failed to reject order.' });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.response?.data?.message || 'Server error while rejecting web order.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesFilter = filterStatus === 'ALL' || o.status === filterStatus;
    const term = search.toLowerCase();
    const matchesSearch =
      !term ||
      o.orderNumber.toLowerCase().includes(term) ||
      o.customerName.toLowerCase().includes(term) ||
      o.phone.toLowerCase().includes(term) ||
      (o.shopName && o.shopName.toLowerCase().includes(term)) ||
      (o.cityArea && o.cityArea.toLowerCase().includes(term));
    return matchesFilter && matchesSearch;
  });

  const pendingCount = orders.filter((o) => o.status === 'PENDING').length;

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px 20px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
              Online Web Orders Queue
            </h1>
            {pendingCount > 0 && (
              <span style={{
                backgroundColor: '#ef4444',
                color: '#ffffff',
                fontSize: '0.8rem',
                fontWeight: 800,
                padding: '3px 10px',
                borderRadius: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}>
                <Clock size={12} /> {pendingCount} Pending
              </span>
            )}
          </div>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
            Review incoming orders from public website visitors. Confirming an order creates a POS invoice and deducts stock.
          </p>
        </div>

        <button
          onClick={fetchOrders}
          disabled={loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '9px 16px',
            fontSize: '0.88rem',
            fontWeight: 700,
            color: '#334155',
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh Queue
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div style={{
          padding: '12px 18px',
          borderRadius: '10px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          backgroundColor: feedback.type === 'success' ? '#dcfce7' : '#fee2e2',
          border: feedback.type === 'success' ? '1px solid #86efac' : '1px solid #fca5a5',
          color: feedback.type === 'success' ? '#15803d' : '#b91c1c',
          fontSize: '0.9rem',
          fontWeight: 600,
        }}>
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        {/* Status Tabs */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(['PENDING', 'ALL', 'CONFIRMED', 'REJECTED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              style={{
                padding: '7px 16px',
                borderRadius: '8px',
                border: filterStatus === st ? '2px solid #d97706' : '1px solid #e2e8f0',
                backgroundColor: filterStatus === st ? '#fef3c7' : '#f8fafc',
                color: filterStatus === st ? '#92400e' : '#475569',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {st === 'PENDING' ? `Pending Queue (${pendingCount})` : st}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '11px' }} />
          <input
            type="text"
            placeholder="Search by order #, phone, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
          <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px auto', color: '#d97706' }} />
          Loading online orders...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '60px 20px',
          textAlign: 'center',
        }}>
          <Inbox size={48} color="#cbd5e1" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
            No Orders in this Queue
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.88rem', margin: 0 }}>
            {filterStatus === 'PENDING'
              ? 'All incoming website orders have been reviewed and processed!'
              : 'No orders matched the current filter criteria.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredOrders.map((ord) => {
            const isPending = ord.status === 'PENDING';
            const isConfirmed = ord.status === 'CONFIRMED';
            const isRejected = ord.status === 'REJECTED';

            return (
              <div
                key={ord.id}
                style={{
                  backgroundColor: '#ffffff',
                  border: isPending ? '1.5px solid #f59e0b' : '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: isPending ? '0 4px 12px rgba(245,158,11,0.08)' : '0 2px 6px rgba(0,0,0,0.02)',
                }}
              >
                {/* Order Top Meta */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px', paddingBottom: '14px', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>
                      #{ord.orderNumber}
                    </span>
                    <span style={{
                      backgroundColor: isPending ? '#fef3c7' : isConfirmed ? '#dcfce7' : '#fee2e2',
                      color: isPending ? '#92400e' : isConfirmed ? '#15803d' : '#b91c1c',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      padding: '3px 10px',
                      borderRadius: '12px',
                    }}>
                      {ord.status}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={13} /> {new Date(ord.createdAt).toLocaleString('en-PK')}
                    </span>
                  </div>

                  {/* Actions for Pending Orders */}
                  {isPending && (user?.role === 'ADMIN' || user?.role === 'OPERATOR') && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={() => handleRejectOrder(ord)}
                        disabled={actionLoadingId === ord.id}
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #ef4444',
                          color: '#ef4444',
                          padding: '7px 14px',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <XCircle size={15} /> Reject
                      </button>

                      <button
                        onClick={() => handleConfirmOrder(ord)}
                        disabled={actionLoadingId === ord.id}
                        style={{
                          backgroundColor: '#16a34a',
                          border: 'none',
                          color: '#ffffff',
                          padding: '8px 18px',
                          borderRadius: '8px',
                          fontSize: '0.88rem',
                          fontWeight: 800,
                          cursor: actionLoadingId === ord.id ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 2px 6px rgba(22,163,74,0.3)',
                        }}
                      >
                        {actionLoadingId === ord.id ? (
                          <>
                            <Loader2 size={16} className="animate-spin" /> Processing...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={16} /> Confirm & Create Sale Invoice
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {isConfirmed && ord.confirmedAt && (
                    <div style={{ fontSize: '0.82rem', color: '#16a34a', fontWeight: 600 }}>
                      ✓ Confirmed on {new Date(ord.confirmedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>

                {/* Customer & Delivery Information Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '16px', backgroundColor: '#f8fafc', padding: '14px 16px', borderRadius: '8px' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Customer Name</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                      {ord.customerName}
                    </div>
                    {ord.shopName && (
                      <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                        Shop: <strong>{ord.shopName}</strong>
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Contact Number</div>
                    <div style={{ marginTop: '2px' }}>
                      <a
                        href={`tel:${ord.phone}`}
                        style={{ fontSize: '0.95rem', fontWeight: 800, color: '#d97706', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Phone size={14} /> {ord.phone}
                      </a>
                    </div>
                    <div>
                      <a
                        href={`https://wa.me/92${ord.phone.replace(/^0+/, '').replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 700, textDecoration: 'none' }}
                      >
                        💬 Open WhatsApp Chat
                      </a>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Delivery Area & Address</div>
                    <div style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 600, marginTop: '2px' }}>
                      {ord.cityArea || 'Area not specified'}
                    </div>
                    {ord.deliveryAddress && (
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {ord.deliveryAddress}
                      </div>
                    )}
                  </div>

                  {ord.notes && (
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Order Note / Remark</div>
                      <div style={{ fontSize: '0.82rem', color: '#334155', fontStyle: 'italic', marginTop: '2px' }}>
                        "{ord.notes}"
                      </div>
                    </div>
                  )}
                </div>

                {/* Ordered Items Table */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Product</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Packaging / Unit</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>Qty Ordered</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#475569' }}>Unit Price</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#475569' }}>Line Total</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>ERP Current Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ord.items.map((it) => {
                        const unitLabel = it.unitType === 'PRIMARY' && it.product?.primaryUnit
                          ? it.product.primaryUnit.name
                          : it.product?.unit?.symbol || 'Unit';
                        const currentStock = Number(it.product?.currentStock || 0);

                        return (
                          <tr key={it.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '10px 12px' }}>
                              <div style={{ fontWeight: 800, color: '#0f172a' }}>{it.product?.name || 'Product'}</div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                {it.product?.brand} • SKU: {it.product?.sku}
                              </div>
                            </td>
                            <td style={{ padding: '10px 12px', color: '#475569', fontWeight: 600 }}>
                              {it.unitType === 'PRIMARY' ? '📦 Pack / Carton' : 'Loose Single'} ({unitLabel})
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 800, color: '#0f172a' }}>
                              {Number(it.quantity)} {unitLabel}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: '#475569' }}>
                              Rs. {Number(it.unitPrice).toLocaleString()}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                              Rs. {Number(it.totalPrice).toLocaleString()}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '10px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                backgroundColor: currentStock > 0 ? '#dcfce7' : '#fee2e2',
                                color: currentStock > 0 ? '#15803d' : '#b91c1c',
                              }}>
                                {currentStock} in stock
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={4} style={{ padding: '12px', textAlign: 'right', fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                          Total Web Order Amount:
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: 900, fontSize: '1.1rem', color: '#d97706' }}>
                          Rs. {Number(ord.totalAmount).toLocaleString()}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
