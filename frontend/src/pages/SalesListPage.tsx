import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Sale, Customer, Product } from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  ShoppingCart, Eye, Printer, Filter, CheckCircle2, 
  XCircle, History, Search, RefreshCw, AlertTriangle,
  Edit3, RotateCcw, Plus, Trash2, Save
} from 'lucide-react';

export const SalesListPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const canEditInvoice = isAdmin || Boolean(user?.permissions?.includes('action:edit_invoice'));
  const canDeleteInvoice = isAdmin || Boolean(user?.permissions?.includes('action:delete_invoice'));

  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Products & Customers
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Customer Rate History Modal
  const [showRatesModal, setShowRatesModal] = useState(false);
  const [selectedRateCustomer, setSelectedRateCustomer] = useState<string>('');
  const [customerRates, setCustomerRates] = useState<any[]>([]);
  const [loadingRates, setLoadingRates] = useState(false);
  const [partySearch, setPartySearch] = useState('');

  // Admin Edit Invoice Modal
  const [editModalSale, setEditModalSale] = useState<Sale | null>(null);
  const [editCustomerId, setEditCustomerId] = useState('');
  const [editItems, setEditItems] = useState<Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    unitType: string;
  }>>([]);
  const [editDiscount, setEditDiscount] = useState(0);
  const [editReceivedAmount, setEditReceivedAmount] = useState(0);
  const [editPaymentMethod, setEditPaymentMethod] = useState('CASH');
  const [editNotes, setEditNotes] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Sales Return (Order Wapsi) Modal
  const [returnModalSale, setReturnModalSale] = useState<Sale | null>(null);
  const [returnReason, setReturnReason] = useState('Wrong Item Delivered');
  const [customReasonNotes, setCustomReasonNotes] = useState('');
  const [returnItems, setReturnItems] = useState<Array<{
    productId: string;
    productName: string;
    soldQty: number;
    returnQty: number;
    unitPrice: number;
  }>>([]);
  const [refundCashAmount, setRefundCashAmount] = useState(0);
  const [processingReturn, setProcessingReturn] = useState(false);

  // Top Page Operation Notification Banners
  const [operationError, setOperationError] = useState('');
  const [operationSuccess, setOperationSuccess] = useState('');

  const triggerOperationError = (msg: string) => {
    setOperationError(msg);
    setOperationSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const triggerOperationSuccess = (msg: string) => {
    setOperationSuccess(msg);
    setOperationError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    fetchSales();
    fetchSettings();
    loadCustomers();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      if (res.data?.settings) {
        setSettings(res.data.settings);
      }
    } catch (e) {
      console.error('Failed to load settings', e);
    }
  };

  const fetchSales = async () => {
    try {
      setLoading(true);
      const res = await api.get('/sales');
      setSales(res.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const res = await api.get('/partners/customers');
      setCustomers(res.data.customers || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadProducts = async () => {
    try {
      const res = await api.get('/products');
      setProducts(res.data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCancelSale = async (saleId: string) => {
    const reason = window.prompt('Enter reason for voiding/cancelling this sale invoice:');
    if (!reason) return;

    try {
      await api.post(`/sales/${saleId}/cancel`, { reason });
      sessionStorage.removeItem('rot_cached_products');
      triggerOperationSuccess('Invoice cancelled and reversed successfully! Stock has been returned to inventory.');
      if (selectedSale?.id === saleId) {
        setSelectedSale(null);
      }
      fetchSales();
    } catch (err: any) {
      triggerOperationError(err.response?.data?.message || 'Invoice cancel nahi ho saki.');
    }
  };

  const handleDeleteSalePermanent = async (saleId: string, invoiceNumber: string) => {
    const confirmed = window.confirm(
      `⚠️ KYA AAP IS SALE INVOICE KO DATABASE AUR POS SE PERMANENTLY DELETE KARNA CHAHTE HAIN?\n\nInvoice: #${invoiceNumber}\n\nIs se stock wapis add ho jaye ga aur customer ledger se bhi invoice mukammal khatam ho jaye gi.`
    );
    if (!confirmed) return;

    try {
      setLoading(true);
      const res = await api.delete(`/sales/${saleId}`);
      sessionStorage.removeItem('rot_cached_products');
      triggerOperationSuccess(res.data.message || `Invoice #${invoiceNumber} database aur POS se permanently delete ho gayi!`);
      if (selectedSale?.id === saleId) {
        setSelectedSale(null);
      }
      fetchSales();
    } catch (err: any) {
      triggerOperationError(err.response?.data?.message || 'Invoice delete nahi ho saki. Barah-e-karam dobara koshish karein.');
    } finally {
      setLoading(false);
    }
  };

  // Open Edit Invoice Modal (Admin Only)
  const openEditModal = (sale: Sale) => {
    loadCustomers();
    loadProducts();
    setEditModalSale(sale);
    setEditCustomerId(sale.customerId);
    setEditItems(
      (sale.items || []).map((it: any) => ({
        productId: it.productId,
        quantity: Number(it.quantity),
        unitPrice: Number(it.unitPrice),
        unitType: it.unitType || 'SECONDARY',
      }))
    );
    setEditDiscount(Number(sale.discount || 0));
    setEditReceivedAmount(Number(sale.receivedAmount || 0));
    setEditPaymentMethod((sale as any).paymentMethod || 'CASH');
    setEditNotes(sale.notes || '');
  };

  const handleAddEditItem = () => {
    if (products.length === 0) return;
    const firstProd = products[0];
    setEditItems([
      ...editItems,
      {
        productId: firstProd.id,
        quantity: 1,
        unitPrice: Number(firstProd.salePrice || 0),
        unitType: 'SECONDARY',
      },
    ]);
  };

  const handleRemoveEditItem = (index: number) => {
    setEditItems(editItems.filter((_, i) => i !== index));
  };

  const handleEditItemChange = (index: number, field: string, val: any) => {
    const updated = [...editItems];
    if (field === 'productId') {
      const found = products.find((p) => p.id === val);
      updated[index].productId = val;
      if (found) {
        updated[index].unitPrice = Number(found.salePrice || 0);
      }
    } else if (field === 'quantity') {
      updated[index].quantity = Math.max(1, Number(val) || 1);
    } else if (field === 'unitPrice') {
      updated[index].unitPrice = Math.max(0, Number(val) || 0);
    } else if (field === 'unitType') {
      updated[index].unitType = val;
    }
    setEditItems(updated);
  };

  const handleSaveEditInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalSale) return;
    if (editItems.length === 0) {
      triggerOperationError('Invoice me kam az kam aik product item add karein.');
      return;
    }

    try {
      setSavingEdit(true);
      await api.put(`/sales/${editModalSale.id}/edit`, {
        customerId: editCustomerId,
        items: editItems,
        discount: Number(editDiscount),
        receivedAmount: Number(editReceivedAmount),
        paymentMethod: editPaymentMethod,
        notes: editNotes,
      });

      sessionStorage.removeItem('rot_cached_products');

      triggerOperationSuccess(`Invoice #${editModalSale.invoiceNumber} kamyabi se update ho gayi aur inventory/ledger recalculate ho gaya!`);
      setEditModalSale(null);
      fetchSales();
    } catch (err: any) {
      triggerOperationError(err.response?.data?.message || 'Invoice update nahi ho saki.');
    } finally {
      setSavingEdit(false);
    }
  };

  // Open Sales Return (Order Wapsi) Modal
  const openReturnModal = (sale: Sale) => {
    setReturnModalSale(sale);
    setReturnReason('Wrong Item Delivered');
    setCustomReasonNotes('');
    setRefundCashAmount(0);
    setReturnItems(
      (sale.items || []).map((it: any) => ({
        productId: it.productId,
        productName: it.product?.name || 'Product',
        soldQty: Number(it.quantity),
        returnQty: 0,
        unitPrice: Number(it.unitPrice),
      }))
    );
  };

  const handleReturnQtyChange = (index: number, qty: number) => {
    const updated = [...returnItems];
    const maxQty = updated[index].soldQty;
    const safeQty = Math.max(0, Math.min(maxQty, Number(qty) || 0));
    updated[index].returnQty = safeQty;
    setReturnItems(updated);
  };

  const calculateReturnTotal = () => {
    return returnItems.reduce((acc, it) => acc + it.returnQty * it.unitPrice, 0);
  };

  const handleProcessSalesReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnModalSale) return;

    const itemsToReturn = returnItems
      .filter((it) => it.returnQty > 0)
      .map((it) => ({
        productId: it.productId,
        quantity: it.returnQty,
        unitPrice: it.unitPrice,
      }));

    if (itemsToReturn.length === 0) {
      triggerOperationError('Wapsi darj karne ke liye kam az kam aik item ki return quantity 1 ya is se barhi enter karein.');
      return;
    }

    const fullReason = customReasonNotes
      ? `${returnReason} - ${customReasonNotes}`
      : returnReason;

    try {
      setProcessingReturn(true);
      await api.post(`/sales/${returnModalSale.id}/return`, {
        saleId: returnModalSale.id,
        reason: fullReason,
        items: itemsToReturn,
        refundAmount: Number(refundCashAmount) || 0,
      });

      sessionStorage.removeItem('rot_cached_products');

      triggerOperationSuccess(`Order Return kamyabi se record ho gaya! Stock godown me wapis jama ho gaya aur customer ledger update ho gaya.`);
      setReturnModalSale(null);
      fetchSales();
    } catch (err: any) {
      triggerOperationError(err.response?.data?.message || 'Return process nahi ho saka.');
    } finally {
      setProcessingReturn(false);
    }
  };

  const handleViewCustomerRates = async (custId: string) => {
    setSelectedRateCustomer(custId);
    if (!custId) {
      setCustomerRates([]);
      return;
    }

    try {
      setLoadingRates(true);
      const res = await api.get(`/sales/customer-rates?customerId=${custId}`);
      setCustomerRates(res.data.rates || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRates(false);
    }
  };

  const filteredSales = sales.filter((s) => {
    const matchesSearch =
      s.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      (s.customer?.shopName && s.customer.shopName.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = filterStatus ? s.status === filterStatus : true;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      {/* Top Operation Failure / Success Banners */}
      {operationError && (
        <div style={{
          backgroundColor: '#fee2e2',
          border: '2px solid #ef4444',
          borderRadius: '10px',
          padding: '14px 18px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#991b1b',
          fontWeight: 700,
          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>⚠️</span>
            <div>
              <div style={{ fontSize: '0.95rem' }}>Operation Nakaam Raha:</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#b91c1c' }}>{operationError}</div>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => setOperationError('')}
            style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#991b1b', fontWeight: 900 }}
          >
            ✕
          </button>
        </div>
      )}

      {operationSuccess && (
        <div style={{
          backgroundColor: '#ecfdf5',
          border: '2px solid #10b981',
          borderRadius: '10px',
          padding: '14px 18px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#065f46',
          fontWeight: 700,
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>✅</span>
            <div>
              <div style={{ fontSize: '0.95rem' }}>Kamyabi (Operation Successful):</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#047857' }}>{operationSuccess}</div>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => setOperationSuccess('')}
            style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#065f46', fontWeight: 900 }}
          >
            ✕
          </button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>Sales Register & POS Billing</h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0' }}>
            Consolidated record of store counter billing, salesmen orders, and party-wise pricing history
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => {
              loadCustomers();
              setShowRatesModal(true);
            }}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <History size={16} /> Party Rate History
          </button>
          <a href="/salesman" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShoppingCart size={18} /> New POS Bill / Mobile Order
          </a>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '14px', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Search by invoice # or customer shop name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="form-control"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>

          <button onClick={fetchSales} className="btn btn-secondary" title="Refresh">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Date</th>
              <th>Customer / Shop</th>
              <th>Salesman</th>
              <th style={{ textAlign: 'right' }}>Total Bill</th>
              <th style={{ textAlign: 'right' }}>Received</th>
              <th style={{ textAlign: 'right' }}>Balance</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  Loading sales invoices...
                </td>
              </tr>
            ) : filteredSales.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                  No sales found matching your criteria.
                </td>
              </tr>
            ) : (
              filteredSales.map((s) => (
                <tr key={s.id} style={{ opacity: s.status === 'CANCELLED' ? 0.6 : 1 }}>
                  <td className="font-mono" style={{ fontWeight: 700, color: s.status === 'CANCELLED' ? '#94a3b8' : '#d97706' }}>
                    {s.invoiceNumber}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{new Date(s.saleDate).toLocaleDateString()}</div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                      {new Date(s.saleDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </div>
                  </td>
                  <td style={{ fontWeight: 600 }}>{s.customer?.shopName}</td>
                  <td>{s.salesman?.fullName || 'Direct Counter'}</td>
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
                    <span className={`badge ${s.status === 'COMPLETED' ? 'badge-success' : s.status === 'CANCELLED' ? 'badge-danger' : 'badge-warning'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <button
                        onClick={() => setSelectedSale(s)}
                        className="btn btn-outline btn-sm"
                        style={{ padding: '4px 8px' }}
                        title="View / Print Receipt"
                      >
                        <Eye size={14} /> View
                      </button>

                      {/* Edit / Correct Invoice (Admin or with edit permission) */}
                      {canEditInvoice && s.status !== 'CANCELLED' && (
                        <button
                          onClick={() => openEditModal(s)}
                          className="btn btn-sm"
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#e0e7ff',
                            color: '#4338ca',
                            border: '1px solid #c7d2fe',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title="Edit: Fix fake or wrong bill / products"
                        >
                          <Edit3 size={13} /> Edit
                        </button>
                      )}

                      {/* Return Order / Wapsi */}
                      {s.status === 'COMPLETED' && (
                        <button
                          onClick={() => openReturnModal(s)}
                          className="btn btn-sm"
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#fef3c7',
                            color: '#b45309',
                            border: '1px solid #fde68a',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title="Sales Return (Order Wapis with reason)"
                        >
                          <RotateCcw size={13} /> Return
                        </button>
                      )}

                      {/* Void / Cancel Sale */}
                      {canDeleteInvoice && s.status !== 'CANCELLED' && (
                        <button
                          onClick={() => handleCancelSale(s.id)}
                          className="btn btn-danger btn-sm"
                          style={{ padding: '4px 8px' }}
                          title="Void / Cancel Invoice"
                        >
                          <XCircle size={14} />
                        </button>
                      )}

                      {/* Permanent Delete Invoice */}
                      {canDeleteInvoice && (
                        <button
                          onClick={() => handleDeleteSalePermanent(s.id, s.invoiceNumber)}
                          className="btn btn-sm"
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#fee2e2',
                            color: '#b91c1c',
                            border: '1px solid #fca5a5',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title="Permanently Delete Invoice from DB & POS"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Invoice Modal & Printable Document */}
      {selectedSale && (
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
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '780px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '30px'
          }}>
            {/* Modal Actions */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                {selectedSale.status === 'CANCELLED' && (
                  <span className="badge badge-danger" style={{ fontSize: '0.85rem' }}>
                    VOIDED / CANCELLED INVOICE
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={handlePrint} className="btn btn-primary btn-sm">
                  <Printer size={16} /> Print Sales Receipt
                </button>
                {selectedSale.status !== 'CANCELLED' && (
                  <button onClick={() => handleCancelSale(selectedSale.id)} className="btn btn-danger btn-sm">
                    <XCircle size={16} /> Void Invoice
                  </button>
                )}
                <button
                  onClick={() => setSelectedSale(null)}
                  className="btn btn-outline btn-sm"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Printable Invoice Template - Retail Thermal POS Slip Design */}
            <div className="printable-area thermal-receipt" style={{
              width: '100%',
              maxWidth: '380px',
              margin: '0 auto',
              backgroundColor: '#ffffff',
              border: '1px dashed #cbd5e1',
              padding: '16px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              lineHeight: 1.4,
              color: '#000000',
              fontFamily: 'Courier New, Courier, monospace'
            }}>
              {/* Header */}
              <div style={{ textAlign: 'center', borderBottom: '1px dashed #000000', paddingBottom: '10px', marginBottom: '10px' }}>
                <div style={{ fontSize: '15px', fontWeight: 900, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  RAFIQ AUTO & OIL TRADERS
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, margin: '2px 0' }}>
                  رفیق آٹو اینڈ آئل ٹریڈرز
                </div>
                <div style={{ fontSize: '10px', margin: '2px 0' }}>
                  54-Stop Near MCB Bank, Dipalpur Road, Okara
                </div>
                <div style={{ fontSize: '10px' }}>
                  Ph: 0306-9258573 | 0327-7497457
                </div>
              </div>

              {/* Bill Details */}
              <div style={{ borderBottom: '1px dashed #000000', paddingBottom: '8px', marginBottom: '8px', fontSize: '11px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span><b>INV #:</b> {selectedSale.invoiceNumber}</span>
                  <span><b>DATE:</b> {new Date(selectedSale.saleDate).toLocaleDateString()} {new Date(selectedSale.saleDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px' }}>
                  <span><b>CUST:</b> {selectedSale.customer?.shopName || 'Walk-in'}</span>
                  <span><b>PH:</b> {selectedSale.customer?.phone || 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px' }}>
                  <span><b>REP:</b> {selectedSale.salesman?.fullName || 'Desk POS'}</span>
                  <span><b>MODE:</b> {selectedSale.paymentMethod}</span>
                </div>
              </div>

              {/* Items List */}
              <div style={{ borderBottom: '1px dashed #000000', paddingBottom: '8px', marginBottom: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #000000', textAlign: 'left' }}>
                      <th style={{ paddingBottom: '4px' }}>ITEM</th>
                      <th style={{ textAlign: 'center', paddingBottom: '4px' }}>QTY</th>
                      <th style={{ textAlign: 'right', paddingBottom: '4px' }}>RATE</th>
                      <th style={{ textAlign: 'right', paddingBottom: '4px' }}>TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSale.items?.map((it, idx) => {
                      const isPrimary = it.unitType === 'PRIMARY';
                      const unitName = isPrimary
                        ? (it.product?.primaryUnit?.name || it.product?.primaryUnit?.symbol || 'Carton')
                        : (it.product?.unit?.name || it.product?.unit?.symbol || 'Piece');
                      return (
                        <tr key={idx} style={{ verticalAlign: 'top' }}>
                          <td style={{ paddingTop: '4px', maxWidth: '140px', wordBreak: 'break-word' }}>
                            <b>{it.product?.name}</b>
                          </td>
                          <td style={{ textAlign: 'center', paddingTop: '4px', whiteSpace: 'nowrap' }}>
                            <b>{Number(it.quantity)}</b> <span style={{ fontSize: '9px', color: '#333' }}>{unitName}</span>
                          </td>
                          <td style={{ textAlign: 'right', paddingTop: '4px' }}>{Number(it.unitPrice).toLocaleString()}</td>
                          <td style={{ textAlign: 'right', paddingTop: '4px', fontWeight: 700 }}>
                            {(Number(it.quantity) * Number(it.unitPrice)).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Totals Breakdown */}
              {(() => {
                const isWalkIn = !selectedSale.customer || selectedSale.customer.phone === '00000000000' || selectedSale.customer.shopName?.toLowerCase().includes('walk-in');
                const netBill = Number(selectedSale.netAmount || 0);
                const currentReceivable = Number(selectedSale.customer?.currentReceivable || 0);
                const billRemaining = Number(selectedSale.remainingBalance || 0);
                // Previous udhar prior to this invoice
                const previousUdhar = isWalkIn ? 0 : Math.max(0, currentReceivable - billRemaining);
                const grandTotal = netBill + previousUdhar;
                const paidAmount = Number(selectedSale.receivedAmount || 0);
                const remainingBalance = Math.max(0, grandTotal - paidAmount);

                return (
                  <div style={{ borderBottom: '1px dashed #000000', paddingBottom: '8px', marginBottom: '10px', fontSize: '11px' }}>
                    {Number(selectedSale.discount) > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', color: '#555' }}>
                        <span>GROSS TOTAL:</span>
                        <span>Rs. {Number(selectedSale.totalAmount).toLocaleString()}</span>
                      </div>
                    )}
                    {Number(selectedSale.discount) > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#15803d', fontWeight: 600 }}>
                        <span>DISCOUNT:</span>
                        <span>- Rs. {Number(selectedSale.discount).toLocaleString()}</span>
                      </div>
                    )}

                    {/* 1. NET BILL */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '12px', borderTop: Number(selectedSale.discount) > 0 ? '1px dashed #000000' : 'none', paddingTop: '3px' }}>
                      <span>NET BILL:</span>
                      <span>Rs. {netBill.toLocaleString()}</span>
                    </div>

                    {/* 2. PREVIOUS UDHAAR */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px' }}>
                      <span>PREVIOUS UDHAAR:</span>
                      <span style={{ fontWeight: 600 }}>
                        {isWalkIn || previousUdhar <= 0 ? 'Rs. 0' : `Rs. ${previousUdhar.toLocaleString()}`}
                      </span>
                    </div>

                    {/* 3. GRAND TOTAL */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '13px', borderTop: '1px solid #000000', borderBottom: '1px solid #000000', padding: '4px 0', margin: '4px 0' }}>
                      <span>GRAND TOTAL:</span>
                      <span>Rs. {grandTotal.toLocaleString()}</span>
                    </div>

                    {/* 4. PAID AMOUNT */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px' }}>
                      <span>PAID AMOUNT:</span>
                      <span style={{ fontWeight: 700 }}>Rs. {paidAmount.toLocaleString()}</span>
                    </div>

                    {/* 5. REMAINING BALANCE */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '12px', marginTop: '4px', paddingTop: '3px', borderTop: '1px dashed #000000' }}>
                      <span>REMAINING BALANCE:</span>
                      <span style={{ color: remainingBalance <= 0 ? '#15803d' : '#000000' }}>
                        {remainingBalance <= 0 ? 'CLEAR (Rs. 0)' : `Rs. ${remainingBalance.toLocaleString()}`}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Footer Barcode / Receipt Message */}
              <div style={{ textAlign: 'center', fontSize: '10px' }}>
                <div style={{ letterSpacing: '2px', fontWeight: 700, margin: '6px 0 4px 0' }}>
                  * {selectedSale.invoiceNumber} *
                </div>
                {settings?.showTermsOnInvoice !== false && (
                  <p style={{ margin: '3px 0', fontSize: '9px', lineHeight: '1.3' }}>
                    {settings?.invoiceFooterNote || 'Goods once sold will only be replaced within 3 days with original bill.'}
                  </p>
                )}
                <div style={{ margin: '6px 0 0 0', paddingTop: '6px', borderTop: '1px dashed #475569', fontSize: '9px', color: '#0f172a' }}>
                  Developed by <a href="https://nexuradigi.site/" target="_blank" rel="noopener noreferrer" style={{ color: '#000000', fontWeight: 900, textDecoration: 'underline' }}>Nexura Digital</a> | Contact: <a href="tel:03147816393" style={{ color: '#000000', fontWeight: 900, textDecoration: 'none' }}>03147816393</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Rate History Modal */}
      {showRatesModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100, padding: '20px'
        }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', width: '750px', maxWidth: '95%', maxHeight: '88vh', overflowY: 'auto', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                  Customer Negotiated Rate History (پارٹی ریٹ ہسٹری)
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  Inspect historical selling rates automatically saved per customer and product.
                </p>
              </div>
              <button
                onClick={() => setShowRatesModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '5px', color: '#334155' }}>
                  🔍 Search Party / Shop / Phone
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Type shop name, owner or phone..."
                  value={partySearch}
                  onChange={(e) => setPartySearch(e.target.value)}
                  style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', margin: 0 }}>
                    Select Party / Shop ({customers.length} Parties)
                  </label>
                  {customers.length === 0 && (
                    <button
                      type="button"
                      onClick={loadCustomers}
                      style={{ background: 'none', border: 'none', color: '#d97706', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                    >
                      🔄 Reload
                    </button>
                  )}
                </div>
                <select
                  className="form-control"
                  value={selectedRateCustomer}
                  onChange={(e) => handleViewCustomerRates(e.target.value)}
                  style={{ padding: '8px 12px', fontSize: '0.85rem', fontWeight: 600 }}
                >
                  <option value="">-- Choose Party ({customers.length} Available) --</option>
                  {customers
                    .filter((c) => {
                      if (!partySearch) return true;
                      const q = partySearch.toLowerCase();
                      return (
                        (c.shopName && c.shopName.toLowerCase().includes(q)) ||
                        (c.ownerName && c.ownerName.toLowerCase().includes(q)) ||
                        (c.phone && c.phone.includes(q))
                      );
                    })
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.shopName} {c.ownerName ? `(${c.ownerName})` : ''} - {c.phone || ''}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {loadingRates ? (
              <div style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                <RefreshCw size={24} className="animate-spin" style={{ display: 'inline-block', marginBottom: '8px' }} />
                <div>Loading party rate records...</div>
              </div>
            ) : !selectedRateCustomer ? (
              <div style={{
                padding: '30px',
                textAlign: 'center',
                backgroundColor: '#f8fafc',
                borderRadius: '10px',
                border: '1.5px dashed #cbd5e1',
                color: '#64748b'
              }}>
                <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>📋</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#334155', marginBottom: '4px' }}>
                  Please select a Customer / Party from the dropdown above
                </div>
                <div style={{ fontSize: '0.8rem' }}>
                  Is party ko pehle jis rate par jo product sale hua tha, unke rates yahan show honge.
                </div>
              </div>
            ) : customerRates.length === 0 ? (
              <div style={{
                padding: '30px',
                textAlign: 'center',
                backgroundColor: '#fffbeb',
                borderRadius: '10px',
                border: '1px solid #fde68a',
                color: '#92400e'
              }}>
                <div style={{ fontSize: '1.4rem', marginBottom: '6px' }}>ℹ️</div>
                <div style={{ fontWeight: 700, marginBottom: '4px' }}>
                  No prior rate history recorded for this customer yet.
                </div>
                <div style={{ fontSize: '0.8rem', color: '#b45309' }}>
                  Is customer ko pehle koi sale invoice generate nahi hui, is liye default catalog prices apply honge.
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '0.8rem', color: '#15803d', fontWeight: 700, marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>✓ Total {customerRates.length} Negotiated Product Rates Found</span>
                  <span style={{ color: '#64748b', fontWeight: 500 }}>Rates auto-update on each completed sale</span>
                </div>
                <div className="table-container" style={{ border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Product & Details</th>
                        <th>Sold Unit</th>
                        <th style={{ textAlign: 'right' }}>Last Sold Rate</th>
                        <th>Last Invoice</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerRates.map((r: any) => {
                        const conv = Number(r.product?.conversionFactor || 1);
                        const isPrimary = r.unitType === 'PRIMARY';
                        const primarySymbol = r.product?.primaryUnit?.symbol || 'Ctn';
                        const secSymbol = r.product?.unit?.symbol || 'Pcs';
                        const numRate = Number(r.lastRate) || 0;

                        return (
                          <tr key={r.id}>
                            <td>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>{r.product?.name}</div>
                              {r.product?.sku && (
                                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Code: {r.product.sku}</div>
                              )}
                            </td>
                            <td>
                              <span
                                className="badge"
                                style={{
                                  backgroundColor: isPrimary ? '#fef3c7' : '#f1f5f9',
                                  color: isPrimary ? '#b45309' : '#475569',
                                  fontWeight: 700,
                                  border: isPrimary ? '1px solid #fde68a' : '1px solid #cbd5e1'
                                }}
                              >
                                {isPrimary ? `📦 ${primarySymbol} (${conv} ${secSymbol})` : `🧴 ${secSymbol}`}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: 800, color: '#059669', fontSize: '0.98rem' }}>
                                Rs. {numRate.toLocaleString()}{' '}
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#047857' }}>
                                  / {isPrimary ? primarySymbol : secSymbol}
                                </span>
                              </div>
                              {conv > 1 && (
                                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                  {isPrimary ? (
                                    `(= Rs. ${(Math.round((numRate / conv) * 100) / 100).toLocaleString()} / ${secSymbol})`
                                  ) : (
                                    `(= Rs. ${(Math.round(numRate * conv)).toLocaleString()} / ${primarySymbol})`
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="font-mono" style={{ fontWeight: 700, color: '#d97706', fontSize: '0.84rem' }}>
                              {r.lastInvoice || '—'}
                            </td>
                            <td style={{ fontSize: '0.82rem', color: '#475569' }}>
                              {r.lastDate ? new Date(r.lastDate).toLocaleDateString() : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ADMIN-ONLY: Edit / Re-correct Invoice Modal */}
      {editModalSale && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 110, padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '16px',
            width: '840px',
            maxWidth: '95%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '28px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px' }}>
              <div>
                <span className="badge badge-info" style={{ marginBottom: '6px' }}>Admin Mode Only</span>
                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>
                  Edit & Correct Bill #{editModalSale.invoiceNumber}
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Agar bill galti se ya fake ban gaya ho to products, quantity, unit rate ya customer change karain. Stock & Ledger khud-ba-khud adjust ho jayega.
                </p>
              </div>
              <button
                onClick={() => setEditModalSale(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveEditInvoice}>
              {/* Customer Selection */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
                  Customer / Party Name:
                </label>
                <select
                  className="form-control"
                  value={editCustomerId}
                  onChange={(e) => setEditCustomerId(e.target.value)}
                  required
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.shopName} ({c.ownerName}) - Bal: Rs. {Number(c.currentReceivable).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Items Table */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 700 }}>Invoice Products Selection:</label>
                  <button
                    type="button"
                    onClick={handleAddEditItem}
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Plus size={14} /> Add Product Line
                  </button>
                </div>

                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                  <table className="table" style={{ width: '100%', margin: 0 }}>
                    <thead style={{ backgroundColor: '#f8fafc' }}>
                      <tr>
                        <th>Product Item</th>
                        <th style={{ width: '100px' }}>Unit</th>
                        <th style={{ width: '100px' }}>Qty</th>
                        <th style={{ width: '130px' }}>Rate (Rs.)</th>
                        <th style={{ width: '130px', textAlign: 'right' }}>Line Total</th>
                        <th style={{ width: '50px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {editItems.map((item, idx) => {
                        const lineTotal = item.quantity * item.unitPrice;
                        return (
                          <tr key={idx}>
                            <td>
                              <select
                                className="form-control"
                                value={item.productId}
                                onChange={(e) => handleEditItemChange(idx, 'productId', e.target.value)}
                                required
                              >
                                {products.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} ({p.sku}) [Stock: {p.currentStock}]
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <select
                                className="form-control"
                                value={item.unitType}
                                onChange={(e) => handleEditItemChange(idx, 'unitType', e.target.value)}
                              >
                                <option value="SECONDARY">Base/Can</option>
                                <option value="PRIMARY">Carton</option>
                              </select>
                            </td>
                            <td>
                              <input
                                type="number"
                                className="form-control"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handleEditItemChange(idx, 'quantity', e.target.value)}
                                required
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                className="form-control"
                                min="0"
                                value={item.unitPrice}
                                onChange={(e) => handleEditItemChange(idx, 'unitPrice', e.target.value)}
                                required
                              />
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 700, verticalAlign: 'middle' }}>
                              Rs. {lineTotal.toLocaleString()}
                            </td>
                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                              {editItems.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveEditItem(idx)}
                                  className="btn btn-sm btn-outline-danger"
                                  style={{ padding: '4px', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                  title="Delete item row"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Discount, Received & Payment Details */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                    Discount (Rs.):
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    min="0"
                    value={editDiscount}
                    onChange={(e) => setEditDiscount(Number(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                    Received Cash / Payment (Rs.):
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    min="0"
                    value={editReceivedAmount}
                    onChange={(e) => setEditReceivedAmount(Number(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                    Payment Method:
                  </label>
                  <select
                    className="form-control"
                    value={editPaymentMethod}
                    onChange={(e) => setEditPaymentMethod(e.target.value)}
                  >
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="ONLINE">Online</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                  Correction Notes / Reason for change:
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Rate wrong punch hua tha ya product galat select thi..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setEditModalSale(null)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingEdit}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Save size={16} /> {savingEdit ? 'Updating Bill...' : 'Save & Recalculate Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SALES RETURN (ORDER WAPSI) MODAL WITH REASON TRACKING */}
      {returnModalSale && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 110, padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '16px',
            width: '740px',
            maxWidth: '95%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '28px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px' }}>
              <div>
                <span className="badge badge-warning" style={{ marginBottom: '6px' }}>Sales Return / Order Wapsi</span>
                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>
                  Record Return for Invoice #{returnModalSale.invoiceNumber}
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Customer: <b>{returnModalSale.customer?.shopName}</b> | Select returned items and return reason.
                </p>
              </div>
              <button
                onClick={() => setReturnModalSale(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleProcessSalesReturn}>
              {/* Return Reason selection */}
              <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', padding: '16px', borderRadius: '10px', marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: '#92400e', marginBottom: '6px' }}>
                  Order Wapsi Ki Waja (Return Reason):
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <select
                    className="form-control"
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    required
                  >
                    <option value="Wrong Item Delivered">Wrong Item Delivered (Galat Product Bheji Gai)</option>
                    <option value="Damaged / Leaking Bottle">Damaged / Leaking Bottle (Bottle Phatee Ya Leaking Thi)</option>
                    <option value="Customer Rejected / Cancelled">Customer Cancelled (Customer Ne Lene Se Inkar Kar Diya)</option>
                    <option value="Wrong Viscosity / Grade">Wrong Viscosity/Grade (Grade/Viscosity Customer Ki Demand Ke Mutabiq Nahi Thi)</option>
                    <option value="Expired / Faulty Batch">Expired / Faulty Batch (Expiry Ya Kharaab Mal)</option>
                    <option value="Excess / Over Supply">Excess Order (Zyada Qty Chali Gai Thi)</option>
                    <option value="Other Reason">Other Reason (Koi or waja)</option>
                  </select>

                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter additional details / notes..."
                    value={customReasonNotes}
                    onChange={(e) => setCustomReasonNotes(e.target.value)}
                  />
                </div>
              </div>

              {/* Items Return Table */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '8px', display: 'block' }}>
                  Products to Return (Enter Return Qty):
                </label>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                  <table className="table" style={{ width: '100%', margin: 0 }}>
                    <thead style={{ backgroundColor: '#f8fafc' }}>
                      <tr>
                        <th>Product</th>
                        <th style={{ width: '110px', textAlign: 'center' }}>Sold Qty</th>
                        <th style={{ width: '130px', textAlign: 'center' }}>Wapis Qty</th>
                        <th style={{ width: '120px', textAlign: 'right' }}>Unit Rate</th>
                        <th style={{ width: '140px', textAlign: 'right' }}>Return Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {returnItems.map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600 }}>{item.productName}</td>
                          <td style={{ textAlign: 'center', color: '#64748b' }}>{item.soldQty}</td>
                          <td>
                            <input
                              type="number"
                              className="form-control"
                              min="0"
                              max={item.soldQty}
                              value={item.returnQty}
                              onChange={(e) => handleReturnQtyChange(idx, Number(e.target.value))}
                              style={{ textAlign: 'center', fontWeight: 700, borderColor: item.returnQty > 0 ? '#f59e0b' : '#cbd5e1' }}
                            />
                          </td>
                          <td style={{ textAlign: 'right' }}>Rs. {item.unitPrice.toLocaleString()}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: item.returnQty > 0 ? '#b45309' : '#94a3b8' }}>
                            Rs. {(item.returnQty * item.unitPrice).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot style={{ backgroundColor: '#f8fafc', fontWeight: 800 }}>
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'right' }}>Total Return Credit Value:</td>
                        <td style={{ textAlign: 'right', color: '#b45309', fontSize: '1rem' }}>
                          Rs. {calculateReturnTotal().toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Cash refund or Ledger adjustment */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                    Cash Refunded at Counter (Rs.):
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    min="0"
                    max={calculateReturnTotal()}
                    value={refundCashAmount}
                    onChange={(e) => setRefundCashAmount(Number(e.target.value) || 0)}
                    placeholder="0 if adjusting in customer balance ledger"
                  />
                  <small style={{ color: '#64748b', fontSize: '0.75rem' }}>
                    Leave 0 agar customer ke khate (ledger) me credit karna ho.
                  </small>
                </div>

                <div style={{ backgroundColor: '#f1f5f9', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.85rem', color: '#475569' }}>Ledger Balance Adjustment:</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#059669', marginTop: '4px' }}>
                    Rs. {(calculateReturnTotal() - (refundCashAmount || 0)).toLocaleString()} Credit
                  </div>
                  <small style={{ color: '#64748b', fontSize: '0.75rem' }}>
                    Will reduce party balance automatically.
                  </small>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setReturnModalSale(null)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={processingReturn || calculateReturnTotal() === 0}
                  style={{ backgroundColor: '#b45309', borderColor: '#b45309', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <RotateCcw size={16} /> {processingReturn ? 'Processing...' : 'Confirm Return & Restore Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

