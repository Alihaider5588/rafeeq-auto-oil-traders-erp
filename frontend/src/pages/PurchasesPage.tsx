import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Supplier, Product } from '../types';
import { ShoppingBag, Plus, Calendar, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const PurchasesPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [purchases, setPurchases] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // New purchase state
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [items, setItems] = useState<Array<{ productId: string; quantity: number; unitCost: number }>>([
    { productId: '', quantity: 1, unitCost: 0 },
  ]);
  const [paidAmount, setPaidAmount] = useState('0');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [operationError, setOperationError] = useState('');
  const [operationSuccess, setOperationSuccess] = useState('');

  useEffect(() => {
    loadPurchases();
    loadMeta();
  }, []);

  const loadPurchases = async () => {
    try {
      setLoading(true);
      const res = await api.get('/purchases');
      setPurchases(res.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadMeta = async () => {
    try {
      const [sRes, pRes] = await Promise.all([
        api.get('/partners/suppliers'),
        api.get('/products'),
      ]);
      setSuppliers(sRes.data.suppliers || []);
      setProducts(pRes.data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const addItemRow = () => {
    setItems([...items, { productId: '', quantity: 1, unitCost: 0 }]);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...items];
    if (field === 'productId') {
      const prod = products.find((p) => p.id === value);
      updated[index].productId = value;
      if (prod) updated[index].unitCost = Number(prod.purchasePrice);
    } else {
      (updated[index] as any)[field] = value;
    }
    setItems(updated);
  };

  const removeItemRow = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const totalBill = items.reduce((sum, it) => sum + (it.quantity * it.unitCost || 0), 0);

  const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || !invoiceNumber) {
      setOperationError('Supplier aur Invoice Number select karna lazmi hai.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        supplierId,
        invoiceNumber,
        items: items.map((it) => ({
          productId: it.productId,
          quantity: Number(it.quantity),
          unitCost: Number(it.unitCost),
        })),
        paidAmount: parseFloat(paidAmount || '0'),
        notes,
      };

      const res = await api.post('/purchases', payload);
      if (res.data.success) {
        setShowModal(false);
        setInvoiceNumber('');
        setItems([{ productId: '', quantity: 1, unitCost: 0 }]);
        setPaidAmount('0');
        setOperationSuccess(`Purchase invoice #${invoiceNumber} successfully record ho gayi aur stock barh gaya.`);
        setOperationError('');
        loadPurchases();
      }
    } catch (err: any) {
      setOperationError(err.response?.data?.message || 'Failed to save purchase');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePurchase = async (purchaseId: string, invNumber: string) => {
    const confirmed = window.confirm(
      `⚠️ KYA AAP IS PURCHASE INVOICE KO DATABASE AUR POS SE PERMANENTLY DELETE KARNA CHAHTE HAIN?\n\nBill: #${invNumber}\n\nIs se purchase ka stock wapis kam ho jaye ga aur supplier ledger se entry hamesha ke liye delete ho jaye gi.`
    );
    if (!confirmed) return;

    try {
      setLoading(true);
      const res = await api.delete(`/purchases/${purchaseId}`);
      setOperationSuccess(res.data.message || `Invoice #${invNumber} permanently delete ho gayi aur stock/ledgers restore ho gaye.`);
      setOperationError('');
      loadPurchases();
    } catch (err: any) {
      setOperationError(err.response?.data?.message || 'Failed to delete purchase');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Purchase & Inward Goods (Maal Inward)</h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Record oil shipments received from refineries & distributors (automatically increases stock)
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <Plus size={18} /> New Purchase Entry
        </button>
      </div>

      {/* Operation Feedback Alerts */}
      {operationError && (
        <div style={{
          backgroundColor: '#fee2e2',
          border: '2px solid #ef4444',
          borderRadius: '10px',
          padding: '14px 18px',
          marginBottom: '20px',
          color: '#991b1b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 800 }}>
            <AlertCircle size={22} color="#dc2626" />
            <span>⚠️ Operation Nakaam Raha: {operationError}</span>
          </div>
          <button onClick={() => setOperationError('')} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#991b1b' }}>×</button>
        </div>
      )}

      {operationSuccess && (
        <div style={{
          backgroundColor: '#dcfce7',
          border: '1.5px solid #86efac',
          borderRadius: '10px',
          padding: '14px 18px',
          marginBottom: '20px',
          color: '#15803d',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700 }}>
            <CheckCircle size={20} color="#16a34a" />
            <span>✓ {operationSuccess}</span>
          </div>
          <button onClick={() => setOperationSuccess('')} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#15803d' }}>×</button>
        </div>
      )}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Date</th>
              <th>Supplier / Company</th>
              <th style={{ textAlign: 'right' }}>Total Cost</th>
              <th style={{ textAlign: 'right' }}>Paid</th>
              <th style={{ textAlign: 'right' }}>Payable Balance</th>
              <th>Recorded By</th>
              <th style={{ textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  Loading purchases...
                </td>
              </tr>
            ) : purchases.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                  No purchases recorded yet.
                </td>
              </tr>
            ) : (
              purchases.map((p) => (
                <tr key={p.id}>
                  <td className="font-mono" style={{ fontWeight: 700, color: '#d97706' }}>
                    {p.invoiceNumber}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{new Date(p.purchaseDate).toLocaleDateString()}</div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                      {new Date(p.purchaseDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </div>
                  </td>
                  <td style={{ fontWeight: 600 }}>{p.supplier?.companyName}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>
                    Rs. {Number(p.netAmount).toLocaleString()}
                  </td>
                  <td style={{ textAlign: 'right', color: '#059669', fontWeight: 700 }}>
                    Rs. {Number(p.paidAmount).toLocaleString()}
                  </td>
                  <td style={{ textAlign: 'right', color: '#dc2626', fontWeight: 700 }}>
                    Rs. {Number(p.remainingAmount).toLocaleString()}
                  </td>
                  <td>{p.createdBy?.fullName}</td>
                  <td style={{ textAlign: 'center' }}>
                    {isAdmin ? (
                      <button
                        onClick={() => handleDeletePurchase(p.id, p.invoiceNumber)}
                        className="btn btn-sm"
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#fee2e2',
                          color: '#b91c1c',
                          border: '1px solid #fca5a5',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title="Permanently Delete Purchase from DB & POS"
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* New Purchase Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '750px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '16px' }}>
              Record Supplier Purchase / Maal Inward
            </h2>

            <form onSubmit={handleCreatePurchase}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Supplier Company *</label>
                  <select
                    className="form-control"
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    required
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.companyName}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Company Invoice Number *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. SHL-INV-9923"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Items List */}
              <div style={{ marginBottom: '16px' }}>
                <label className="form-label">Products Received *</label>
                {items.map((it, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr auto', gap: '10px', marginBottom: '8px' }}>
                    <select
                      className="form-control"
                      value={it.productId}
                      onChange={(e) => updateItem(idx, 'productId', e.target.value)}
                      required
                    >
                      <option value="">Select Product</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                      ))}
                    </select>

                    <input
                      type="number"
                      min="1"
                      className="form-control"
                      placeholder="Qty"
                      value={it.quantity === 0 ? '' : it.quantity}
                      onChange={(e) => updateItem(idx, 'quantity', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                      required
                    />

                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      placeholder="Unit Cost"
                      value={it.unitCost === 0 ? '' : it.unitCost}
                      onChange={(e) => updateItem(idx, 'unitCost', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                      required
                    />

                    <button
                      type="button"
                      onClick={() => removeItemRow(idx)}
                      className="btn btn-outline"
                      style={{ padding: '8px 12px' }}
                    >
                      ×
                    </button>
                  </div>
                ))}

                <button type="button" onClick={addItemRow} className="btn btn-outline btn-sm" style={{ marginTop: '6px' }}>
                  + Add Another Product
                </button>
              </div>

              {/* Bill & Payment Section */}
              <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '10px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.1rem', marginBottom: '12px' }}>
                  <span>Total Purchase Bill:</span>
                  <span style={{ color: '#0f172a' }}>Rs. {totalBill.toLocaleString()}</span>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Amount Paid to Supplier Now (Rs.)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    placeholder="0"
                    value={paidAmount === '0' ? '' : paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                  />
                  <small style={{ color: '#64748b' }}>
                    Unpaid remainder (Rs. {(totalBill - parseFloat(paidAmount || '0')).toLocaleString()}) will automatically be credited to the supplier's payable ledger.
                  </small>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Saving...' : 'Post Purchase & Update Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
