import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Customer, Supplier, LedgerEntry } from '../types';
import { BookOpen, DollarSign, PlusCircle, CheckCircle, Search, RefreshCw, Printer, AlertCircle, Phone } from 'lucide-react';

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
  const [showPrintStatement, setShowPrintStatement] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('CASH');
  const [payReference, setPayReference] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [payMsg, setPayMsg] = useState('');
  const [operationError, setOperationError] = useState('');
  const [operationSuccess, setOperationSuccess] = useState('');

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
        setOperationSuccess('Payment voucher successfully posted to ledger!');
        setOperationError('');
        setPayAmount('');
        setPayNotes('');
        setPayReference('');
        setShowPaymentModal(false);
        loadLedger(selectedEntityId);
        loadEntities(); // refresh balance
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Payment voucher could not be recorded';
      setOperationError(errMsg);
    } finally {
      setPaySubmitting(false);
    }
  };

  const selectedCustomer = activeTab === 'CUSTOMERS' ? customers.find((c) => c.id === selectedEntityId) : null;
  const selectedSupplier = activeTab === 'SUPPLIERS' ? suppliers.find((s) => s.id === selectedEntityId) : null;

  const handleShareWhatsApp = () => {
    if (!selectedCustomer) return;
    const phone = selectedCustomer.phone.replace(/^0+/, '').replace(/\D/g, '');
    const balance = Number(entitySummary?.currentReceivable || 0);
    const balanceText = balance <= 0
      ? 'Aap ka tamam pichla khata mukammal CLEAR (Rs. 0) hai.'
      : `Aap ka kul wajib-ul-ada baqaya udhar: Rs. ${balance.toLocaleString()}`;
    const text = encodeURIComponent(
      `*RAFIQ AUTO & OIL TRADERS — OKARA*\n\n` +
      `Mohtaram *${selectedCustomer.shopName}* (${selectedCustomer.ownerName}),\n` +
      `Aap ke khate ki taza tareen soorat-e-haal:\n\n` +
      `• Kul Mal (Debits): Rs. ${Number(entitySummary?.totalDebit || 0).toLocaleString()}\n` +
      `• Kul Wasooli (Credits): Rs. ${Number(entitySummary?.totalCredit || 0).toLocaleString()}\n` +
      `• *${balanceText}*\n\n` +
      `Shukriya!\n*Rafiq Auto & Oil Traders, 54-Stop Okara*\nPh: 0306-9258573`
    );
    window.open(`https://wa.me/92${phone}?text=${text}`, '_blank');
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
            <>
              <button
                type="button"
                onClick={() => setShowPrintStatement(true)}
                className="btn btn-outline"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                title="Print or Save PDF Statement for Customer"
              >
                <Printer size={16} /> Print / Save PDF
              </button>
              <button
                type="button"
                onClick={() => setShowPaymentModal(true)}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <DollarSign size={18} /> Record Payment / Receipt
              </button>
            </>
          )}
        </div>
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

      {/* Customer Ledger Statement Modal (Print / Save as PDF) */}
      {showPrintStatement && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 110, padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '900px',
            maxWidth: '96%',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            {/* Modal Controls Header */}
            <div className="no-print" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 24px',
              borderBottom: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                  {activeTab === 'CUSTOMERS' ? 'Customer Account Ledger Statement' : 'Supplier Account Statement'}
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Print button dabane se browser "Save as PDF" ka option deta hai jahan se aap PDF save kar ke customer ko bhej saktay hain.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {activeTab === 'CUSTOMERS' && selectedCustomer && (
                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="btn btn-outline btn-sm"
                    style={{ borderColor: '#16a34a', color: '#16a34a', fontWeight: 700 }}
                    title="Send Khata Summary to Customer WhatsApp"
                  >
                    💬 WhatsApp Khata
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn btn-primary btn-sm"
                  style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Printer size={16} /> Print / Save as PDF
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintStatement(false)}
                  className="btn btn-outline btn-sm"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Scrollable Printable Sheet */}
            <div style={{ padding: '24px', overflowY: 'auto' }}>
              <div className="printable-area" style={{
                backgroundColor: '#ffffff',
                color: '#000000',
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '12px',
                lineHeight: 1.5,
              }}>
                {/* Official Letterhead */}
                <div style={{
                  borderBottom: '2px solid #000000',
                  paddingBottom: '12px',
                  marginBottom: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start'
                }}>
                  <div>
                    <h1 style={{ fontSize: '20px', fontWeight: 900, margin: 0, letterSpacing: '0.5px' }}>
                      RAFIQ AUTO & OIL TRADERS
                    </h1>
                    <div style={{ fontSize: '15px', fontWeight: 800, margin: '2px 0' }}>
                      رفیق آٹو اینڈ آئل ٹریڈرز
                    </div>
                    <div style={{ fontSize: '11px', color: '#333333' }}>
                      54-Stop Near MCB Bank, Dipalpur Road, Okara | Ph: 0306-9258573, 0327-7497457
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      display: 'inline-block',
                      backgroundColor: '#000000',
                      color: '#ffffff',
                      padding: '4px 12px',
                      fontWeight: 900,
                      fontSize: '12px',
                      borderRadius: '4px',
                      letterSpacing: '1px'
                    }}>
                      ACCOUNT STATEMENT
                    </div>
                    <div style={{ fontSize: '10px', marginTop: '4px', color: '#555555' }}>
                      Date: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </div>
                  </div>
                </div>

                {/* Account Details Box */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 1fr',
                  gap: '14px',
                  border: '1px solid #000000',
                  padding: '12px 14px',
                  borderRadius: '6px',
                  marginBottom: '16px',
                  backgroundColor: '#fafafa'
                }}>
                  <div>
                    <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', fontWeight: 700 }}>
                      Party / Account Name
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 900, color: '#000' }}>
                      {activeTab === 'CUSTOMERS' ? selectedCustomer?.shopName : selectedSupplier?.companyName}
                    </div>
                    <div style={{ fontSize: '11px', marginTop: '2px' }}>
                      Owner: <b>{activeTab === 'CUSTOMERS' ? selectedCustomer?.ownerName : selectedSupplier?.contactPerson}</b>
                    </div>
                    <div style={{ fontSize: '11px' }}>
                      Phone: <b>{activeTab === 'CUSTOMERS' ? selectedCustomer?.phone : selectedSupplier?.phone}</b>
                    </div>
                    <div style={{ fontSize: '11px' }}>
                      Area: {activeTab === 'CUSTOMERS' ? (selectedCustomer?.area || selectedCustomer?.address || 'Okara Local') : (selectedSupplier?.address || 'N/A')}
                    </div>
                  </div>

                  <div style={{ borderLeft: '1px solid #ccc', paddingLeft: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <span>Total Invoiced (Debits):</span>
                      <b>Rs. {Number(entitySummary?.totalDebit || 0).toLocaleString()}</b>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <span>Total Paid / Received:</span>
                      <b style={{ color: '#059669' }}>Rs. {Number(entitySummary?.totalCredit || 0).toLocaleString()}</b>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      borderTop: '1.5px solid #000',
                      paddingTop: '4px',
                      marginTop: '4px',
                      fontSize: '13px',
                      fontWeight: 900
                    }}>
                      <span>Net Balance / Udhar:</span>
                      <span>
                        Rs. {Number(activeTab === 'CUSTOMERS' ? entitySummary?.currentReceivable : entitySummary?.currentPayable || 0).toLocaleString()}
                      </span>
                    </div>
                    {Number(activeTab === 'CUSTOMERS' ? entitySummary?.currentReceivable : entitySummary?.currentPayable || 0) <= 0 && (
                      <div style={{
                        marginTop: '4px',
                        textAlign: 'right',
                        color: '#15803d',
                        fontWeight: 900,
                        fontSize: '11px'
                      }}>
                        ✓ KHATA MUKAMMAL CLEAR (0)
                      </div>
                    )}
                  </div>
                </div>

                {/* Ledger Transactions Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '20px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#000000', color: '#ffffff' }}>
                      <th style={{ padding: '6px 8px', textAlign: 'left' }}>DATE</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left' }}>TYPE</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left' }}>REF #</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left' }}>DESCRIPTION</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>DEBIT (Rs.)</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>CREDIT (Rs.)</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>BALANCE (Rs.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerEntries.map((e, idx) => (
                      <tr key={e.id} style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                        <td style={{ padding: '6px 8px' }}>{new Date(e.date).toLocaleDateString()}</td>
                        <td style={{ padding: '6px 8px', fontWeight: 700 }}>{e.transactionType}</td>
                        <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>{e.referenceId || '-'}</td>
                        <td style={{ padding: '6px 8px' }}>{e.description}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: Number(e.debit) > 0 ? 700 : 400 }}>
                          {Number(e.debit) > 0 ? Number(e.debit).toLocaleString() : '-'}
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: Number(e.credit) > 0 ? 700 : 400, color: Number(e.credit) > 0 ? '#059669' : '#000' }}>
                          {Number(e.credit) > 0 ? Number(e.credit).toLocaleString() : '-'}
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 900 }}>
                          Rs. {Number(e.runningBalance).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Signatures & Verification */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginTop: '40px', paddingTop: '20px', borderTop: '1px dashed #000000', fontSize: '11px', textAlign: 'center' }}>
                  <div>
                    <div style={{ borderBottom: '1px solid #000', height: '24px' }}></div>
                    <div style={{ marginTop: '6px', fontWeight: 700 }}>Prepared By (Accounts)</div>
                  </div>
                  <div>
                    <div style={{ borderBottom: '1px solid #000', height: '24px' }}></div>
                    <div style={{ marginTop: '6px', fontWeight: 700 }}>Proprietor (M. Shafiq) Stamp</div>
                  </div>
                  <div>
                    <div style={{ borderBottom: '1px solid #000', height: '24px' }}></div>
                    <div style={{ marginTop: '6px', fontWeight: 700 }}>Customer Confirmation</div>
                  </div>
                </div>

                <div style={{ textAlign: 'center', fontSize: '9px', color: '#666', marginTop: '20px' }}>
                  This statement was generated electronically from Rafiq Auto & Oil Traders ERP System.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
