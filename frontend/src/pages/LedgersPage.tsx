import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Customer, Supplier, LedgerEntry } from '../types';
import { BookOpen, DollarSign, PlusCircle, CheckCircle, Search, RefreshCw } from 'lucide-react';

export const LedgersPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'CUSTOMERS' | 'SUPPLIERS'>('CUSTOMERS');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [entitySummary, setEntitySummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Payment voucher form modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('CASH');
  const [payReference, setPayReference] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [payMsg, setPayMsg] = useState('');

  useEffect(() => {
    loadEntities();
  }, [activeTab]);

  useEffect(() => {
    if (selectedEntityId) {
      loadLedger(selectedEntityId);
    } else {
      setLedgerEntries([]);
      setEntitySummary(null);
    }
  }, [selectedEntityId]);

  const loadEntities = async () => {
    try {
      if (activeTab === 'CUSTOMERS') {
        const res = await api.get('/partners/customers');
        const list = res.data.customers || [];
        setCustomers(list);
        setSelectedEntityId(list.length > 0 ? list[0].id : '');
      } else {
        const res = await api.get('/partners/suppliers');
        const list = res.data.suppliers || [];
        setSuppliers(list);
        setSelectedEntityId(list.length > 0 ? list[0].id : '');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadLedger = async (id: string) => {
    try {
      setLoading(true);
      const url =
        activeTab === 'CUSTOMERS'
          ? `/ledgers/customer/${id}`
          : `/ledgers/supplier/${id}`;
      const res = await api.get(url);
      setLedgerEntries(res.data.entries || []);
      setEntitySummary(res.data.summary || {});
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaySubmitting(true);
    setPayMsg('');
    try {
      const payload: any = {
        amount: parseFloat(payAmount),
        paymentMethod: payMethod,
        reference: payReference,
        notes: payNotes,
      };

      if (activeTab === 'CUSTOMERS') {
        payload.customerId = selectedEntityId;
      } else {
        payload.supplierId = selectedEntityId;
      }

      const res = await api.post('/ledgers/payment', payload);
      if (res.data.success) {
        setPayMsg('Payment voucher successfully posted to ledger!');
        setPayAmount('');
        setPayNotes('');
        setPayReference('');
        setShowPaymentModal(false);
        loadLedger(selectedEntityId);
        loadEntities(); // refresh balance
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Payment failed');
    } finally {
      setPaySubmitting(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Account Ledgers & Collections</h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Audit-grade double-entry ledger transactions with running balances
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => {
              loadEntities();
              if (selectedEntityId) loadLedger(selectedEntityId);
            }}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Refresh Ledger"
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh
          </button>
          {selectedEntityId && (
            <button
              type="button"
              onClick={() => setShowPaymentModal(true)}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <DollarSign size={18} /> Record Payment / Receipt
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => {
            setActiveTab('CUSTOMERS');
          }}
          className={`btn ${activeTab === 'CUSTOMERS' ? 'btn-primary' : 'btn-outline'}`}
          style={{ fontWeight: 700 }}
        >
          Customer Ledgers (Udhar / Receivables)
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('SUPPLIERS');
          }}
          className={`btn ${activeTab === 'SUPPLIERS' ? 'btn-primary' : 'btn-outline'}`}
          style={{ fontWeight: 700 }}
        >
          Supplier Ledgers (Company Payables)
        </button>
      </div>

      {/* Select Entity Card */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">
            Select {activeTab === 'CUSTOMERS' ? 'Customer / Shop' : 'Supplier Company'}
          </label>
          <select
            className="form-control"
            value={selectedEntityId}
            onChange={(e) => setSelectedEntityId(e.target.value)}
          >
            <option value="">-- Choose Account to inspect ledger --</option>
            {activeTab === 'CUSTOMERS'
              ? customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.shopName} ({c.ownerName}) - Outstanding: Rs. {Number(c.currentReceivable).toLocaleString()}
                  </option>
                ))
              : suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.companyName} - Outstanding Payable: Rs. {Number(s.currentPayable).toLocaleString()}
                  </option>
                ))}
          </select>
        </div>
      </div>

      {/* Account Balance Summary Cards */}
      {entitySummary && (
        <div className="stat-grid" style={{ marginBottom: '20px' }}>
          <div className="stat-card blue">
            <div className="stat-label">Total Invoiced (Debits)</div>
            <div className="stat-value">Rs. {Number(entitySummary.totalDebit || 0).toLocaleString()}</div>
          </div>
          <div className="stat-card emerald">
            <div className="stat-label">Total Paid (Credits)</div>
            <div className="stat-value">Rs. {Number(entitySummary.totalCredit || 0).toLocaleString()}</div>
          </div>
          <div className="stat-card crimson">
            <div className="stat-label">
              {activeTab === 'CUSTOMERS' ? 'Current Outstanding Receivable' : 'Current Payable to Supplier'}
            </div>
            <div className="stat-value">
              Rs. {Number(
                activeTab === 'CUSTOMERS'
                  ? entitySummary.currentReceivable
                  : entitySummary.currentPayable
              ).toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Ledger Transactions Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Transaction Type</th>
              <th>Reference #</th>
              <th>Description</th>
              <th style={{ textAlign: 'right' }}>Debit (Rs.)</th>
              <th style={{ textAlign: 'right' }}>Credit (Rs.)</th>
              <th style={{ textAlign: 'right' }}>Running Balance</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  Loading ledger transactions...
                </td>
              </tr>
            ) : ledgerEntries.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                  No ledger entries recorded yet.
                </td>
              </tr>
            ) : (
              ledgerEntries.map((entry) => (
                <tr key={entry.id}>
                  <td>{new Date(entry.date).toLocaleDateString()}</td>
                  <td>
                    <span className="badge badge-neutral font-mono">{entry.transactionType}</span>
                  </td>
                  <td className="font-mono" style={{ fontSize: '0.8rem', color: '#d97706' }}>
                    {entry.referenceId || '-'}
                  </td>
                  <td>{entry.description}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: Number(entry.debit) > 0 ? '#dc2626' : '#64748b' }}>
                    {Number(entry.debit) > 0 ? `Rs. ${Number(entry.debit).toLocaleString()}` : '-'}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: Number(entry.credit) > 0 ? '#059669' : '#64748b' }}>
                    {Number(entry.credit) > 0 ? `Rs. ${Number(entry.credit).toLocaleString()}` : '-'}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 800 }}>
                    Rs. {Number(entry.runningBalance).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Payment Voucher Modal */}
      {showPaymentModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
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
            maxWidth: '500px',
            padding: '24px'
          }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '16px' }}>
              Record {activeTab === 'CUSTOMERS' ? 'Customer Payment Receipt' : 'Supplier Disbursement'}
            </h2>

            <form onSubmit={handleRecordPayment}>
              <div className="form-group">
                <label className="form-label">Payment Amount (Rs.) *</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  placeholder="e.g. 50000"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select
                  className="form-control"
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                >
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer / Online</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Cheque / Bank Reference #</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Optional bank ref or cheque #"
                  value={payReference}
                  onChange={(e) => setPayReference(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Notes</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Partial recovery for previous invoice"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button type="submit" disabled={paySubmitting} className="btn btn-primary">
                  {paySubmitting ? 'Posting...' : 'Post Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
