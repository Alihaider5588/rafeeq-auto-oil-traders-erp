import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Customer, Supplier, LedgerEntry, DualPartner } from '../types';
import {
  BookOpen,
  DollarSign,
  PlusCircle,
  CheckCircle,
  Search,
  RefreshCw,
  Printer,
  AlertCircle,
  Phone,
  Trash2,
  ShieldAlert,
  ArrowLeftRight,
  CheckCircle2,
  Download,
  Eye,
  X,
  ShoppingCart,
  ShoppingBag,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { exportConsolidatedAllPartyBalancesPDF, exportSingleLedgerStatementPDF } from '../utils/pdfExportUtils';

export const LedgersPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const hasCustomPerms = Boolean(user?.permissions && Array.isArray(user.permissions) && user.permissions.length > 0);
  const canEditLedger = isAdmin || (hasCustomPerms ? Boolean(user?.permissions?.includes('action:edit_ledger')) : (user?.role === 'OPERATOR' || user?.role === 'CASHIER'));
  const canDeleteLedger = isAdmin || (hasCustomPerms ? Boolean(user?.permissions?.includes('action:delete_ledger')) : false);

  const [activeTab, setActiveTab] = useState<'CUSTOMERS' | 'SUPPLIERS' | 'DUAL_PARTNERS'>('CUSTOMERS');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [dualPartners, setDualPartners] = useState<DualPartner[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [entitySummary, setEntitySummary] = useState<any>(null);
  const [dualLedgerData, setDualLedgerData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Detail Modal State (Tafseel Dekhein)
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedEntryDetail, setSelectedEntryDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Payment voucher form modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPrintStatement, setShowPrintStatement] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('CASH');
  const [payReference, setPayReference] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payTargetType, setPayTargetType] = useState<'CUSTOMER' | 'SUPPLIER'>('CUSTOMER');
  const [payDirection, setPayDirection] = useState<'IN' | 'OUT'>('IN');
  const [payDate, setPayDate] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [paySubmitting, setPaySubmitting] = useState(false);

  // Contra settlement modal (Mutual offset)
  const [showContraModal, setShowContraModal] = useState(false);
  const [contraAmount, setContraAmount] = useState('');
  const [contraNotes, setContraNotes] = useState('');
  const [contraSubmitting, setContraSubmitting] = useState(false);

  // Feedback alerts
  const [operationError, setOperationError] = useState('');
  const [operationSuccess, setOperationSuccess] = useState('');

  // Search & Filter states
  const [accountSearch, setAccountSearch] = useState('');
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  useEffect(() => {
    setAccountSearch('');
    setLedgerSearch('');
    setSelectedEntityId('');
    setLedgerEntries([]);
    setEntitySummary(null);
    setDualLedgerData(null);
    loadEntities();
  }, [activeTab]);

  useEffect(() => {
    if (selectedEntityId) {
      loadLedger(selectedEntityId);
    } else {
      setLedgerEntries([]);
      setEntitySummary(null);
      setDualLedgerData(null);
    }
  }, [selectedEntityId]);

  const loadEntities = async () => {
    try {
      if (activeTab === 'CUSTOMERS') {
        const res = await api.get('/partners/customers');
        const list = res.data.customers || [];
        setCustomers(list);
        setSelectedEntityId(list.length > 0 ? list[0].id : '');
      } else if (activeTab === 'SUPPLIERS') {
        const res = await api.get('/partners/suppliers');
        const list = res.data.suppliers || [];
        setSuppliers(list);
        setSelectedEntityId(list.length > 0 ? list[0].id : '');
      } else if (activeTab === 'DUAL_PARTNERS') {
        const res = await api.get('/partners/dual');
        const list = res.data.dualPartners || [];
        setDualPartners(list);
        setSelectedEntityId(list.length > 0 ? list[0].id : '');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadLedger = async (id: string, sDate = startDate, eDate = endDate) => {
    if (!id) {
      setLedgerEntries([]);
      setEntitySummary(null);
      setDualLedgerData(null);
      return;
    }
    try {
      setLoading(true);
      const params: any = {};
      if (sDate) params.startDate = sDate;
      if (eDate) params.endDate = eDate;

      if (activeTab === 'DUAL_PARTNERS') {
        const res = await api.get(`/ledgers/dual/${id}`, { params });
        setDualLedgerData(res.data);
        setLedgerEntries(res.data.timeline || []);
        setEntitySummary(res.data.summary || {});
      } else {
        const url = activeTab === 'CUSTOMERS' ? `/ledgers/customer/${id}` : `/ledgers/supplier/${id}`;
        const res = await api.get(url, { params });
        setLedgerEntries(res.data.entries || []);
        setEntitySummary(res.data.summary || {});
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payNotes.trim()) {
      alert('Reason / Narration (Wajah) likhna lazmi hai!');
      return;
    }
    setPaySubmitting(true);
    try {
      const payload: any = {
        amount: parseFloat(payAmount),
        paymentMethod: payMethod,
        reference: payReference,
        notes: payNotes,
        date: payDate,
      };

      if (activeTab === 'CUSTOMERS') {
        payload.customerId = selectedEntityId;
      } else if (activeTab === 'SUPPLIERS') {
        payload.supplierId = selectedEntityId;
      } else if (activeTab === 'DUAL_PARTNERS') {
        if (payTargetType === 'CUSTOMER') {
          payload.customerId = dualLedgerData?.partner?.customerId || selectedEntityId;
        } else {
          payload.supplierId = dualLedgerData?.partner?.supplierId;
        }
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
        loadEntities();
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Payment voucher could not be recorded';
      setOperationError(errMsg);
    } finally {
      setPaySubmitting(false);
    }
  };

  const handleOpenContraModal = () => {
    const curRec = Number(entitySummary?.currentReceivable || 0);
    const curPay = Number(entitySummary?.currentPayable || 0);
    const maxOffset = Math.max(0, Math.min(curRec, curPay));
    setContraAmount(maxOffset > 0 ? String(maxOffset) : '');
    setContraNotes('Mutual balance offset (آپسی کٹائی)');
    setShowContraModal(true);
  };

  const handleRecordContra = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dualLedgerData?.partner) return;
    setContraSubmitting(true);
    try {
      const res = await api.post('/ledgers/contra-offset', {
        customerId: dualLedgerData.partner.customerId,
        supplierId: dualLedgerData.partner.supplierId,
        amount: parseFloat(contraAmount),
        notes: contraNotes,
      });
      if (res.data.success) {
        setOperationSuccess(res.data.message || 'Contra settlement voucher posted successfully!');
        setOperationError('');
        setShowContraModal(false);
        setContraAmount('');
        setContraNotes('');
        await loadLedger(selectedEntityId);
        await loadEntities();
      }
    } catch (err: any) {
      setOperationError(err.response?.data?.message || 'Contra settlement failed.');
    } finally {
      setContraSubmitting(false);
    }
  };

  const selectedCustomer = activeTab === 'CUSTOMERS' ? customers.find((c) => c.id === selectedEntityId) : null;
  const selectedSupplier = activeTab === 'SUPPLIERS' ? suppliers.find((s) => s.id === selectedEntityId) : null;
  const selectedDualPartner = activeTab === 'DUAL_PARTNERS' ? dualPartners.find((d) => d.id === selectedEntityId) : null;

  const handleShareWhatsApp = () => {
    if (activeTab === 'CUSTOMERS' && selectedCustomer) {
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
    } else if (activeTab === 'DUAL_PARTNERS' && selectedDualPartner) {
      const phone = selectedDualPartner.phone.replace(/^0+/, '').replace(/\D/g, '');
      const net = Number(entitySummary?.netMutualBalance || 0);
      const netText = net > 0
        ? `Aap ki taraf kul net baqaya (کٹائی کے بعد): Rs. ${net.toLocaleString()} (ہم نے وصول کرنے ہیں)`
        : net < 0
        ? `Aap ka kul net baqaya (کٹائی کے بعد): Rs. ${Math.abs(net).toLocaleString()} (ہم نے ادا کرنے ہیں)`
        : `Aap ka khata mukammal CLEAR (Rs. 0) hai.`;
      const text = encodeURIComponent(
        `*RAFIQ AUTO & OIL TRADERS — OKARA (مشترکہ کھاتہ)*\n\n` +
        `Mohtaram *${selectedDualPartner.name}* (${selectedDualPartner.ownerName}),\n` +
        `Aap ke Dual Partner Khate ki soorat-e-haal:\n\n` +
        `• Kul Mal Farokht (Sale to you): Rs. ${Number(entitySummary?.totalSales || 0).toLocaleString()}\n` +
        `• Kul Mal Kharidari (Purchase from you): Rs. ${Number(entitySummary?.totalPurchases || 0).toLocaleString()}\n` +
        `• Customer Receivable: Rs. ${Number(entitySummary?.currentReceivable || 0).toLocaleString()}\n` +
        `• Supplier Payable: Rs. ${Number(entitySummary?.currentPayable || 0).toLocaleString()}\n` +
        `• *${netText}*\n\n` +
        `Shukriya!\n*Rafiq Auto & Oil Traders, 54-Stop Okara*\nPh: 0306-9258573`
      );
      window.open(`https://wa.me/92${phone}?text=${text}`, '_blank');
    }
  };

  const handleDownloadAllBalancesPDF = async () => {
    try {
      const [cRes, sRes] = await Promise.all([
        api.get('/partners/customers'),
        api.get('/partners/suppliers'),
      ]);
      const custs = cRes.data.customers || [];
      const supps = sRes.data.suppliers || [];
      exportConsolidatedAllPartyBalancesPDF(custs, supps);
    } catch (err) {
      console.error(err);
      exportConsolidatedAllPartyBalancesPDF(customers, suppliers);
    }
  };

  const handleDownloadStatementPDF = () => {
    const partyName =
      activeTab === 'CUSTOMERS'
        ? selectedCustomer?.shopName || 'Customer'
        : activeTab === 'SUPPLIERS'
        ? selectedSupplier?.companyName || 'Supplier'
        : selectedDualPartner?.name || 'Dual Partner';

    const partyType =
      activeTab === 'CUSTOMERS'
        ? 'CUSTOMER'
        : activeTab === 'SUPPLIERS'
        ? 'SUPPLIER'
        : 'DUAL_PARTNER';

    const phone =
      activeTab === 'CUSTOMERS'
        ? selectedCustomer?.phone || ''
        : activeTab === 'SUPPLIERS'
        ? selectedSupplier?.phone || ''
        : selectedDualPartner?.phone || '';

    const address =
      activeTab === 'CUSTOMERS'
        ? selectedCustomer?.area || ''
        : activeTab === 'SUPPLIERS'
        ? selectedSupplier?.address || ''
        : selectedDualPartner?.address || '';

    const curBal = Number(
      activeTab === 'CUSTOMERS'
        ? entitySummary?.currentReceivable
        : activeTab === 'SUPPLIERS'
        ? entitySummary?.currentPayable
        : entitySummary?.netMutualBalance || 0
    );

    exportSingleLedgerStatementPDF(partyName, partyType, phone, address, filteredLedgerEntries, curBal);
  };

  const handleViewEntryDetail = async (entry: any) => {
    setLoadingDetail(true);
    setDetailModalOpen(true);
    setSelectedEntryDetail({ rawEntry: entry });

    try {
      const res = await api.get('/ledgers/entry-detail', {
        params: {
          referenceId: entry.referenceId || '',
          type: entry.type || entry.transactionType || '',
          id: entry.id || '',
        },
      });

      if (res.data?.success) {
        setSelectedEntryDetail({
          rawEntry: entry,
          kind: res.data.kind,
          sale: res.data.sale,
          purchase: res.data.purchase,
          payment: res.data.payment,
          ledgerEntry: res.data.ledgerEntry,
        });
      }
    } catch (err: any) {
      console.warn('Could not fetch server detail for ledger entry, displaying local entry info:', err);
      setSelectedEntryDetail({
        rawEntry: entry,
        kind: 'FALLBACK',
      });
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDeletePaymentRecord = async (entry: any) => {
    if (!canDeleteLedger) {
      alert('Aap ke pas ledger payment record delete karne ki permission nahi hai!');
      return;
    }

    const amt = Number(entry.credit) > 0 ? Number(entry.credit) : Number(entry.debit);
    const confirmMsg = `⚠️ Delete Ledger Payment Record (Admin Only)?\n\nReference: ${entry.referenceId || '-'}\nType: ${entry.type || entry.transactionType}\nRaqam: Rs. ${amt.toLocaleString()}\nDescription: ${entry.description}\n\nIs entry ko delete karne se khata (balance) automatically revert ho jaye ga.\nKya aap waqai delete karna chahte hain?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      setDeletingId(entry.id);
      setOperationError('');
      setOperationSuccess('');
      const targetType = entry.source === 'SUPPLIER_ACCOUNT' ? 'SUPPLIERS' : activeTab === 'SUPPLIERS' ? 'SUPPLIERS' : 'CUSTOMERS';
      const res = await api.delete(`/ledgers/entry/${entry.id}?type=${targetType}`);
      setOperationSuccess(res.data?.message || 'Payment record delete ho geya aur balance revert ho gaya.');
      if (selectedEntityId) {
        await loadLedger(selectedEntityId);
      }
      await loadEntities();
    } catch (err: any) {
      setOperationError(err.response?.data?.message || err.message || 'Payment record delete nahi ho saka.');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredCustomers = customers.filter((c) => {
    if (!accountSearch.trim()) return true;
    const term = accountSearch.toLowerCase();
    return (
      (c.shopName && c.shopName.toLowerCase().includes(term)) ||
      (c.ownerName && c.ownerName.toLowerCase().includes(term)) ||
      (c.phone && c.phone.includes(term)) ||
      (c.area && c.area.toLowerCase().includes(term))
    );
  });

  const filteredSuppliers = suppliers.filter((s) => {
    if (!accountSearch.trim()) return true;
    const term = accountSearch.toLowerCase();
    return (
      (s.companyName && s.companyName.toLowerCase().includes(term)) ||
      (s.contactPerson && s.contactPerson.toLowerCase().includes(term)) ||
      (s.phone && s.phone.includes(term)) ||
      (s.address && s.address.toLowerCase().includes(term))
    );
  });

  const filteredDualPartners = dualPartners.filter((d) => {
    if (!accountSearch.trim()) return true;
    const term = accountSearch.toLowerCase();
    return (
      (d.name && d.name.toLowerCase().includes(term)) ||
      (d.ownerName && d.ownerName.toLowerCase().includes(term)) ||
      (d.phone && d.phone.includes(term)) ||
      (d.address && d.address.toLowerCase().includes(term))
    );
  });

  const filteredLedgerEntries = ledgerEntries.filter((entry) => {
    // 1. Date Range Filter
    if (startDate) {
      const eDate = new Date(entry.date).toISOString().slice(0, 10);
      if (eDate < startDate) return false;
    }
    if (endDate) {
      const eDate = new Date(entry.date).toISOString().slice(0, 10);
      if (eDate > endDate) return false;
    }

    // 2. Type Filter
    const typeStr = (entry.type || entry.transactionType || '').toUpperCase();
    if (filterType === 'INVOICES' && !typeStr.includes('INVOICE') && !typeStr.includes('SALE') && !typeStr.includes('PURCHASE')) {
      return false;
    }
    if (filterType === 'PAYMENTS' && !typeStr.includes('PAYMENT')) {
      return false;
    }
    if (filterType === 'ADJUSTMENTS' && !typeStr.includes('OPENING') && !typeStr.includes('CONTRA') && !typeStr.includes('ADJUSTMENT')) {
      return false;
    }

    // 3. Search Term Filter
    if (!ledgerSearch.trim()) return true;
    const term = ledgerSearch.toLowerCase();
    const ref = (entry.referenceId || '').toLowerCase();
    const desc = (entry.description || '').toLowerCase();
    const tStr = typeStr.toLowerCase();
    const dateStr = entry.date ? new Date(entry.date).toLocaleDateString().toLowerCase() : '';
    const debitStr = entry.debit ? String(entry.debit) : '';
    const creditStr = entry.credit ? String(entry.credit) : '';
    const runBalStr = entry.runningBalance ? String(entry.runningBalance) : '';
    const sourceStr = (entry.source || '').toLowerCase();

    return (
      ref.includes(term) ||
      desc.includes(term) ||
      tStr.includes(term) ||
      dateStr.includes(term) ||
      debitStr.includes(term) ||
      creditStr.includes(term) ||
      runBalStr.includes(term) ||
      sourceStr.includes(term)
    );
  });

  return (
    <div>
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Account Ledgers & Collections</h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Audit-grade double-entry ledger transactions, dual mutual offsets & running balances
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* 1. All Parties Summary PDF (Lena/Dena) */}
          <button
            type="button"
            onClick={handleDownloadAllBalancesPDF}
            className="btn btn-outline"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 800,
              color: '#047857',
              borderColor: '#6ee7b7',
              backgroundColor: '#ecfdf5',
              fontSize: '0.84rem'
            }}
            title="Download consolidated all-parties customer receivables & supplier payables PDF"
          >
            <Download size={15} /> All Parties Balances PDF (لینا / دینا سمری)
          </button>

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
              {activeTab === 'DUAL_PARTNERS' && canEditLedger && (
                <button
                  type="button"
                  onClick={handleOpenContraModal}
                  className="btn btn-warning"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                  title="Record Mutual Contra Settlement / آپسی کٹائی"
                >
                  <ArrowLeftRight size={16} /> Record Contra Offset (آپسی کٹائی)
                </button>
              )}

              {/* Single Party Ledger PDF Download Button */}
              <button
                type="button"
                onClick={handleDownloadStatementPDF}
                className="btn btn-outline"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 700,
                  color: '#1d4ed8',
                  borderColor: '#93c5fd',
                  backgroundColor: '#eff6ff',
                  fontSize: '0.84rem'
                }}
                title="Download single party ledger statement as clean PDF"
              >
                <Download size={15} /> Statement PDF
              </button>

              <button
                type="button"
                onClick={() => setShowPrintStatement(true)}
                className="btn btn-outline"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                title="Print or Save PDF Statement"
              >
                <Printer size={16} /> Print View
              </button>

              {canEditLedger && (
                <button
                  type="button"
                  onClick={() => {
                    setPayTargetType(activeTab === 'SUPPLIERS' ? 'SUPPLIER' : 'CUSTOMER');
                    setShowPaymentModal(true);
                  }}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                >
                  <DollarSign size={18} /> Record Payment / Receipt
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Operation Feedback Alerts */}
      {operationError && (
        <div className="no-print" style={{
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
        <div className="no-print" style={{
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
      <div className="no-print" style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setActiveTab('CUSTOMERS')}
          className={`btn ${activeTab === 'CUSTOMERS' ? 'btn-primary' : 'btn-outline'}`}
          style={{ fontWeight: 700 }}
        >
          Customer Ledgers (Udhar / Receivables)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('SUPPLIERS')}
          className={`btn ${activeTab === 'SUPPLIERS' ? 'btn-primary' : 'btn-outline'}`}
          style={{ fontWeight: 700 }}
        >
          Supplier Ledgers (Company Payables)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('DUAL_PARTNERS')}
          className={`btn ${activeTab === 'DUAL_PARTNERS' ? 'btn-warning' : 'btn-outline'}`}
          style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          🤝 Dual Partners (Customer + Supplier Both / مشترکہ کٹائی کھاتے)
        </button>
      </div>

      {/* Select Entity Card with Quick Search */}
      <div className="card no-print" style={{ marginBottom: '20px', padding: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', alignItems: 'end', width: '100%' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Search size={15} style={{ color: '#d97706' }} /> Quick Search Account
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-control"
                placeholder={
                  activeTab === 'CUSTOMERS'
                    ? 'Search customer by shop, owner, phone...'
                    : activeTab === 'SUPPLIERS'
                    ? 'Search supplier by company, person, phone...'
                    : 'Search dual partner by name, phone...'
                }
                value={accountSearch}
                onChange={(e) => setAccountSearch(e.target.value)}
                style={{ paddingRight: accountSearch ? '30px' : '12px' }}
              />
              {accountSearch && (
                <button
                  type="button"
                  onClick={() => setAccountSearch('')}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '1rem'
                  }}
                  title="Clear filter"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>
                Select {activeTab === 'CUSTOMERS' ? 'Customer / Shop' : activeTab === 'SUPPLIERS' ? 'Supplier Company' : '🤝 Dual Trading Partner (مشترکہ پارٹی)'}
              </span>
              {accountSearch && (
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#d97706' }}>
                  ({activeTab === 'CUSTOMERS' ? filteredCustomers.length : activeTab === 'SUPPLIERS' ? filteredSuppliers.length : filteredDualPartners.length} matches found)
                </span>
              )}
            </label>
            <select
              className="form-control"
              value={selectedEntityId}
              onChange={(e) => setSelectedEntityId(e.target.value)}
            >
              <option value="">-- Choose Account to inspect ledger --</option>
              {activeTab === 'CUSTOMERS'
                ? filteredCustomers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.shopName} ({c.ownerName}) - Outstanding: Rs. {Number(c.currentReceivable).toLocaleString()}
                      {c.isDualPartner ? ' [🤝 Dual Partner]' : ''}
                    </option>
                  ))
                : activeTab === 'SUPPLIERS'
                ? filteredSuppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.companyName} - Outstanding Payable: Rs. {Number(s.currentPayable).toLocaleString()}
                      {s.isDualPartner ? ' [🤝 Dual Partner]' : ''}
                    </option>
                  ))
                : filteredDualPartners.map((dp) => (
                    <option key={dp.id} value={dp.id}>
                      🤝 {dp.name} ({dp.ownerName}) - Net: Rs. {Math.abs(dp.netBalance).toLocaleString()} ({dp.status === 'RECEIVABLE' ? 'لینا ہے' : dp.status === 'PAYABLE' ? 'دینا ہے' : 'صاف ہے'})
                    </option>
                  ))}
            </select>
          </div>
        </div>
      </div>

      {/* Account Balance Summary Cards */}
      {entitySummary && (
        <div className="no-print" style={{ marginBottom: '20px' }}>
          {activeTab === 'DUAL_PARTNERS' ? (
            /* DUAL PARTNER MUTUAL CLEARANCE KPI CARDS */
            <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              <div className="stat-card blue">
                <div className="stat-label">Total Sales to Partner (سیلز)</div>
                <div className="stat-value">Rs. {Number(entitySummary.totalSales || 0).toLocaleString()}</div>
                <div className="stat-sub">ہم نے جو مال بیچا ہے</div>
              </div>

              <div className="stat-card amber">
                <div className="stat-label">Total Purchases (خریداری)</div>
                <div className="stat-value">Rs. {Number(entitySummary.totalPurchases || 0).toLocaleString()}</div>
                <div className="stat-sub">ہم نے جو مال خریدا ہے</div>
              </div>

              <div className="stat-card crimson">
                <div className="stat-label">Customer Receivable (لینا ہے)</div>
                <div className="stat-value">Rs. {Number(entitySummary.currentReceivable || 0).toLocaleString()}</div>
                <div className="stat-sub">کسٹمر کھاتے کا بقایا ادھار</div>
              </div>

              <div className="stat-card crimson" style={{ borderLeft: '4px solid #ef4444' }}>
                <div className="stat-label">Supplier Payable (دینا ہے)</div>
                <div className="stat-value">Rs. {Number(entitySummary.currentPayable || 0).toLocaleString()}</div>
                <div className="stat-sub">سپلائر کھاتے کا واجب الادا</div>
              </div>

              <div className="stat-card emerald" style={{
                borderLeft: entitySummary.netMutualBalance > 0 ? '4px solid #10b981' : entitySummary.netMutualBalance < 0 ? '4px solid #ef4444' : '4px solid #64748b',
                background: entitySummary.netMutualBalance > 0 ? '#f0fdf4' : entitySummary.netMutualBalance < 0 ? '#fef2f2' : '#f8fafc'
              }}>
                <div className="stat-label" style={{ fontWeight: 800, color: entitySummary.netMutualBalance > 0 ? '#047857' : entitySummary.netMutualBalance < 0 ? '#b91c1c' : '#334155' }}>
                  NET FINAL BALANCE (خالص کٹائی بیلنس)
                </div>
                <div className="stat-value" style={{
                  color: entitySummary.netMutualBalance > 0 ? '#059669' : entitySummary.netMutualBalance < 0 ? '#dc2626' : '#334155',
                  fontSize: '1.55rem',
                  fontWeight: 900
                }}>
                  Rs. {Math.abs(Number(entitySummary.netMutualBalance || 0)).toLocaleString()}
                </div>
                <div className="stat-sub" style={{ fontWeight: 700, color: entitySummary.netMutualBalance > 0 ? '#047857' : entitySummary.netMutualBalance < 0 ? '#b91c1c' : '#64748b' }}>
                  {entitySummary.netMutualBalance > 0
                    ? '● ہم نے وصول کرنے ہیں (Receivable from Party)'
                    : entitySummary.netMutualBalance < 0
                    ? '● ہم نے ادا کرنے ہیں (Payable to Party)'
                    : '✓ حساب مکمل برابر اور صاف ہے (Cleared)'}
                </div>
              </div>
            </div>
          ) : (
            /* STANDARD CUSTOMER / SUPPLIER KPI CARDS */
            <div className="stat-grid">
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
        </div>
      )}

      {/* Ledger Transactions Search & Comprehensive Filter Bar */}
      {selectedEntityId && (
        <div className="no-print" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '14px',
          flexWrap: 'wrap',
          backgroundColor: '#f8fafc',
          padding: '10px 14px',
          borderRadius: '10px',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
            {/* Search input */}
            <div style={{ position: 'relative', minWidth: '220px', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                className="form-control"
                placeholder="Search by Ref #, reason, amount..."
                value={ledgerSearch}
                onChange={(e) => setLedgerSearch(e.target.value)}
                style={{ paddingLeft: '34px', paddingRight: ledgerSearch ? '30px' : '10px', height: '36px', fontSize: '0.84rem' }}
              />
              {ledgerSearch && (
                <button
                  type="button"
                  onClick={() => setLedgerSearch('')}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Date From */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>From:</span>
              <input
                type="date"
                className="form-control"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  loadLedger(selectedEntityId, e.target.value, endDate);
                }}
                style={{ width: '135px', height: '36px', fontSize: '0.8rem' }}
              />
            </div>

            {/* Date To */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>To:</span>
              <input
                type="date"
                className="form-control"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  loadLedger(selectedEntityId, startDate, e.target.value);
                }}
                style={{ width: '135px', height: '36px', fontSize: '0.8rem' }}
              />
            </div>

            {/* Filter by Type */}
            <select
              className="form-control"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{ width: 'auto', minWidth: '130px', height: '36px', fontSize: '0.8rem' }}
            >
              <option value="ALL">All Entries (تمام)</option>
              <option value="INVOICES">Invoices Only (بلز)</option>
              <option value="PAYMENTS">Payments Only (ادائیگیاں)</option>
              <option value="ADJUSTMENTS">Adjustments / Contra</option>
            </select>

            {(ledgerSearch || startDate || endDate || filterType !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setLedgerSearch('');
                  setStartDate('');
                  setEndDate('');
                  setFilterType('ALL');
                  loadLedger(selectedEntityId, '', '');
                }}
                className="btn btn-outline"
                style={{ height: '36px', fontSize: '0.78rem', padding: '4px 10px' }}
              >
                Reset
              </button>
            )}
          </div>

          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>
            Showing <b>{filteredLedgerEntries.length}</b> of <b>{ledgerEntries.length}</b> entries
          </div>
        </div>
      )}

      {/* Ledger Transactions Table */}
      <div className="table-container no-print">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date & Time</th>
              {activeTab === 'DUAL_PARTNERS' && <th>Account Side</th>}
              <th>Transaction Type</th>
              <th>Reference #</th>
              <th>Description / Reason</th>
              <th style={{ textAlign: 'right' }}>Debit (Rs.)</th>
              <th style={{ textAlign: 'right' }}>Credit (Rs.)</th>
              <th style={{ textAlign: 'right' }}>Running Balance</th>
              <th style={{ textAlign: 'center', width: '140px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={activeTab === 'DUAL_PARTNERS' ? 10 : 9} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  Loading ledger transactions...
                </td>
              </tr>
            ) : filteredLedgerEntries.length === 0 ? (
              <tr>
                <td colSpan={activeTab === 'DUAL_PARTNERS' ? 10 : 9} style={{ textAlign: 'center', padding: '35px', color: '#94a3b8' }}>
                  {(ledgerSearch || startDate || endDate || filterType !== 'ALL') ? (
                    <div>
                      <p style={{ fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>
                        No ledger transactions match selected filters.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setLedgerSearch('');
                          setStartDate('');
                          setEndDate('');
                          setFilterType('ALL');
                          loadLedger(selectedEntityId, '', '');
                        }}
                        className="btn btn-outline btn-sm"
                      >
                        Clear Filters
                      </button>
                    </div>
                  ) : (
                    'No ledger entries recorded yet.'
                  )}
                </td>
              </tr>
            ) : (
              filteredLedgerEntries.map((entry) => (
                <tr key={entry.id} style={{
                  backgroundColor: entry.type === 'ADJUSTMENT' && entry.description?.includes('Contra') ? '#fffbeb' : undefined
                }}>
                  <td style={{ whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                    <div style={{ fontWeight: 700, color: '#1e293b' }}>
                      {new Date(entry.date).toLocaleDateString()}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                      {new Date(entry.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  {activeTab === 'DUAL_PARTNERS' && (
                    <td>
                      <span className={`badge ${entry.source === 'CUSTOMER_ACCOUNT' ? 'badge-info' : 'badge-warning'}`} style={{ fontSize: '0.68rem', fontWeight: 700 }}>
                        {entry.source === 'CUSTOMER_ACCOUNT' ? '👤 Sale / Cust' : '🏭 Purch / Supp'}
                      </span>
                    </td>
                  )}
                  <td>
                    <span className="badge badge-neutral font-mono">{entry.type || entry.transactionType}</span>
                  </td>
                  <td className="font-mono" style={{ fontSize: '0.8rem', color: '#d97706' }}>
                    {entry.referenceId || '-'}
                  </td>
                  <td>
                    {entry.description}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: Number(entry.debit) > 0 ? '#dc2626' : '#64748b' }}>
                    {Number(entry.debit) > 0 ? `Rs. ${Number(entry.debit).toLocaleString()}` : '-'}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: Number(entry.credit) > 0 ? '#059669' : '#64748b' }}>
                    {Number(entry.credit) > 0 ? `Rs. ${Number(entry.credit).toLocaleString()}` : '-'}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 800 }}>
                    Rs. {Number(entry.runningBalance).toLocaleString()}
                  </td>
                  <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <button
                        type="button"
                        onClick={() => handleViewEntryDetail(entry)}
                        className="btn btn-outline"
                        style={{
                          color: '#0284c7',
                          borderColor: '#bae6fd',
                          backgroundColor: '#f0f9ff',
                          padding: '4px 8px',
                          fontSize: '0.75rem',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          cursor: 'pointer',
                          fontWeight: 700,
                        }}
                        title="Tafseel Dekhein (View full transaction items & voucher details)"
                      >
                        <Eye size={13} />
                        Detail
                      </button>

                      {canDeleteLedger && (
                        <button
                          type="button"
                          onClick={() => handleDeletePaymentRecord(entry)}
                          disabled={deletingId === entry.id}
                          className="btn btn-outline"
                          style={{
                            color: '#ef4444',
                            borderColor: '#fca5a5',
                            backgroundColor: '#fef2f2',
                            padding: '4px 8px',
                            fontSize: '0.75rem',
                            borderRadius: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                          }}
                          title="Admin Only: Delete payment record and revert ledger balance"
                        >
                          <Trash2 size={13} />
                          {deletingId === entry.id ? 'Deleting...' : 'Delete'}
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

      {/* Contra Settlement Modal (Mutual Offset) */}
      {showContraModal && dualLedgerData?.partner && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 110, padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '520px',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <ArrowLeftRight size={22} color="#d97706" />
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                Contra Settlement / آپسی کٹائی ایڈجسٹمنٹ
              </h2>
            </div>

            <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0 0 16px 0' }}>
              Party: <b>{dualLedgerData.partner.name}</b> ({dualLedgerData.partner.ownerName})
            </p>

            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px',
              backgroundColor: '#f8fafc', padding: '12px', borderRadius: '10px',
              border: '1px solid #e2e8f0', marginBottom: '16px'
            }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Customer Receivable (لینا ہے)</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#059669', marginTop: '2px' }}>
                  Rs. {Number(entitySummary?.currentReceivable || 0).toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Supplier Payable (دینا ہے)</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#dc2626', marginTop: '2px' }}>
                  Rs. {Number(entitySummary?.currentPayable || 0).toLocaleString()}
                </div>
              </div>
            </div>

            <form onSubmit={handleRecordContra}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Contra Offset Amount (کٹائی کی رقم - Rs.) *
                </label>
                <input
                  type="number"
                  step="any"
                  className="form-control"
                  placeholder="Enter settlement amount..."
                  value={contraAmount}
                  onChange={(e) => setContraAmount(e.target.value)}
                  required
                  autoFocus
                />
                <small style={{ color: '#64748b', fontSize: '0.72rem' }}>
                  یہ رقم کسٹمر کے ادھار سے بھی منہا ہو گی اور سپلائر کے واجب الادا سے بھی۔
                </small>
              </div>

              <div className="form-group">
                <label className="form-label">Notes / تفصیل</label>
                <input
                  type="text"
                  className="form-control"
                  value={contraNotes}
                  onChange={(e) => setContraNotes(e.target.value)}
                  placeholder="e.g. Mutual oil and filter bill clearance"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setShowContraModal(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={contraSubmitting || !contraAmount || parseFloat(contraAmount) <= 0}
                  className="btn btn-warning"
                  style={{ fontWeight: 800 }}
                >
                  {contraSubmitting ? 'Posting...' : '✓ Confirm Contra Settlement (کٹائی درج کریں)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
              Record {activeTab === 'CUSTOMERS' ? 'Customer Payment Receipt' : activeTab === 'SUPPLIERS' ? 'Supplier Disbursement' : 'Payment Voucher'}
            </h2>

            {activeTab === 'DUAL_PARTNERS' && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                <button
                  type="button"
                  onClick={() => setPayTargetType('CUSTOMER')}
                  className={`btn btn-sm ${payTargetType === 'CUSTOMER' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ flex: 1, fontWeight: 700 }}
                >
                  کسٹمر سے وصولی (Collection)
                </button>
                <button
                  type="button"
                  onClick={() => setPayTargetType('SUPPLIER')}
                  className={`btn btn-sm ${payTargetType === 'SUPPLIER' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ flex: 1, fontWeight: 700 }}
                >
                  سپلائر کو ادائیگی (Payment)
                </button>
              </div>
            )}

            <form onSubmit={handleRecordPayment}>
              {/* Date & Time Selector */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Calendar size={14} /> Voucher Date & Time (تاریخ اور وقت)
                </label>
                <input
                  type="datetime-local"
                  className="form-control"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Payment Amount (رقم - Rs.) *</label>
                <input
                  type="number"
                  step="any"
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
                  <option value="CASH">Cash (نقد)</option>
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
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Reason / Narration (تفصیل اور وجہ) * <span style={{ color: '#ef4444' }}>(لازمی ہے)</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Wajah likhna lazmi hai (e.g. Purana udhar wasool hua / Naqad adaiyigi)"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  required
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
                <button type="submit" disabled={paySubmitting} className="btn btn-primary" style={{ fontWeight: 700 }}>
                  {paySubmitting ? 'Posting...' : '✓ Post Voucher (واؤچر درج کریں)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transaction Detail Modal (Tafseel Dekhein) */}
      {detailModalOpen && selectedEntryDetail && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 120, padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '760px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #cbd5e1',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '2px solid #d97706'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {selectedEntryDetail.sale ? (
                  <ShoppingCart size={22} color="#38bdf8" />
                ) : selectedEntryDetail.purchase ? (
                  <ShoppingBag size={22} color="#fbbf24" />
                ) : (
                  <DollarSign size={22} color="#4ade80" />
                )}
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>
                    {selectedEntryDetail.sale
                      ? `Sale Invoice Details: ${selectedEntryDetail.sale.invoiceNumber}`
                      : selectedEntryDetail.purchase
                      ? `Purchase Bill Details: ${selectedEntryDetail.purchase.invoiceNumber}`
                      : selectedEntryDetail.payment
                      ? `Payment Voucher Details: ${selectedEntryDetail.payment.receiptNumber}`
                      : `Ledger Transaction Details`}
                  </h3>
                  <div style={{ fontSize: '0.74rem', color: '#cbd5e1' }}>
                    Rafiq Auto & Oil Traders - Transaction Audit Record
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDetailModalOpen(false);
                  setSelectedEntryDetail(null);
                }}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              {loadingDetail ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 10px auto', color: '#0284c7' }} />
                  <div style={{ fontWeight: 700 }}>Transaction details load ho rahi hain...</div>
                </div>
              ) : (
                <div>
                  {/* Meta Information Bar */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                    gap: '12px',
                    backgroundColor: '#f8fafc',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    marginBottom: '18px'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Date & Time (تاریخ و وقت)</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>
                        {selectedEntryDetail.sale?.saleDate
                          ? new Date(selectedEntryDetail.sale.saleDate).toLocaleString()
                          : selectedEntryDetail.purchase?.purchaseDate
                          ? new Date(selectedEntryDetail.purchase.purchaseDate).toLocaleString()
                          : selectedEntryDetail.payment?.paymentDate
                          ? new Date(selectedEntryDetail.payment.paymentDate).toLocaleString()
                          : selectedEntryDetail.rawEntry?.date
                          ? new Date(selectedEntryDetail.rawEntry.date).toLocaleString()
                          : '-'}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Party Name (پارٹی کا نام)</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0369a1' }}>
                        {selectedEntryDetail.sale?.customer?.shopName ||
                          selectedEntryDetail.purchase?.supplier?.companyName ||
                          selectedEntryDetail.payment?.customer?.shopName ||
                          selectedEntryDetail.payment?.supplier?.companyName ||
                          selectedCustomer?.shopName ||
                          selectedSupplier?.companyName ||
                          dualLedgerData?.partner?.shopName ||
                          '-'}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Reference / Voucher #</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, fontFamily: 'monospace', color: '#d97706' }}>
                        {selectedEntryDetail.sale?.invoiceNumber ||
                          selectedEntryDetail.purchase?.invoiceNumber ||
                          selectedEntryDetail.payment?.receiptNumber ||
                          selectedEntryDetail.rawEntry?.referenceId ||
                          '-'}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Transaction Type</div>
                      <span className="badge badge-neutral" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                        {selectedEntryDetail.rawEntry?.type ||
                          selectedEntryDetail.rawEntry?.transactionType ||
                          (selectedEntryDetail.sale ? 'SALE_INVOICE' : selectedEntryDetail.purchase ? 'PURCHASE_INVOICE' : 'PAYMENT')}
                      </span>
                    </div>
                  </div>

                  {/* 1. SALE INVOICE DETAIL VIEW */}
                  {selectedEntryDetail.sale && (
                    <div>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
                        📦 Sold Products & Bill Items (فروخت کردہ مال کی تفصیل)
                      </h4>
                      <table className="data-table" style={{ fontSize: '0.82rem', marginBottom: '14px' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f1f5f9' }}>
                            <th style={{ width: '35px', textAlign: 'center' }}>#</th>
                            <th>Product Name</th>
                            <th>Packaging</th>
                            <th style={{ textAlign: 'center' }}>Qty</th>
                            <th style={{ textAlign: 'right' }}>Rate (Rs.)</th>
                            <th style={{ textAlign: 'right' }}>Total (Rs.)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedEntryDetail.sale.items?.map((it: any, idx: number) => {
                            const pConv = Number(it.product?.conversionFactor) || 1;
                            const isPrimary = it.unitType === 'PRIMARY';
                            return (
                              <tr key={it.id || idx}>
                                <td style={{ textAlign: 'center', fontWeight: 600 }}>{idx + 1}</td>
                                <td>
                                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{it.product?.name}</div>
                                  {it.product?.sku && (
                                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>#{it.product.sku}</span>
                                  )}
                                </td>
                                <td>
                                  {isPrimary ? (
                                    <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>
                                      📦 {it.product?.primaryUnit?.symbol || 'Ctn'} ({pConv} {it.product?.unit?.symbol || 'Pcs'})
                                    </span>
                                  ) : (
                                    <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                                      🧴 {it.product?.unit?.symbol || 'Pcs'}
                                    </span>
                                  )}
                                </td>
                                <td style={{ textAlign: 'center', fontWeight: 800 }}>{Number(it.quantity)}</td>
                                <td style={{ textAlign: 'right' }}>Rs. {Number(it.unitPrice).toLocaleString()}</td>
                                <td style={{ textAlign: 'right', fontWeight: 800 }}>Rs. {Number(it.totalPrice).toLocaleString()}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      {/* Sale Bill Calculation Summary */}
                      <div style={{
                        backgroundColor: '#f8fafc',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                        gap: '10px',
                        textAlign: 'center'
                      }}>
                        <div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Gross Total</div>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                            Rs. {Number(selectedEntryDetail.sale.totalAmount).toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Bill Discount</div>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#dc2626' }}>
                            - Rs. {Number(selectedEntryDetail.sale.discount || 0).toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Net Bill</div>
                          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                            Rs. {Number(selectedEntryDetail.sale.netAmount).toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Received Now</div>
                          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#059669' }}>
                            Rs. {Number(selectedEntryDetail.sale.receivedAmount || 0).toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Added to Khata</div>
                          <div style={{ fontWeight: 900, fontSize: '0.95rem', color: '#d97706' }}>
                            Rs. {Number(selectedEntryDetail.sale.remainingBalance || 0).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {selectedEntryDetail.sale.notes && (
                        <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#475569', fontStyle: 'italic' }}>
                          <b>Note:</b> {selectedEntryDetail.sale.notes}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 2. PURCHASE INVOICE DETAIL VIEW */}
                  {selectedEntryDetail.purchase && (
                    <div>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
                        📥 Purchased Stock Items (کمپنی سے وصول شدہ مال کی تفصیل)
                      </h4>
                      <table className="data-table" style={{ fontSize: '0.82rem', marginBottom: '14px' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f1f5f9' }}>
                            <th style={{ width: '35px', textAlign: 'center' }}>#</th>
                            <th>Product Name</th>
                            <th>Packaging</th>
                            <th style={{ textAlign: 'center' }}>Qty</th>
                            <th style={{ textAlign: 'right' }}>Cost Rate (Rs.)</th>
                            <th style={{ textAlign: 'right' }}>Total Cost (Rs.)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedEntryDetail.purchase.items?.map((it: any, idx: number) => {
                            const pConv = Number(it.product?.conversionFactor) || 1;
                            const isPrimary = it.unitType === 'PRIMARY';
                            return (
                              <tr key={it.id || idx}>
                                <td style={{ textAlign: 'center', fontWeight: 600 }}>{idx + 1}</td>
                                <td>
                                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{it.product?.name}</div>
                                  {it.product?.sku && (
                                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>#{it.product.sku}</span>
                                  )}
                                </td>
                                <td>
                                  {isPrimary ? (
                                    <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>
                                      📦 {it.product?.primaryUnit?.symbol || 'Ctn'} ({pConv} {it.product?.unit?.symbol || 'Pcs'})
                                    </span>
                                  ) : (
                                    <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                                      🧴 {it.product?.unit?.symbol || 'Pcs'}
                                    </span>
                                  )}
                                </td>
                                <td style={{ textAlign: 'center', fontWeight: 800 }}>{Number(it.quantity)}</td>
                                <td style={{ textAlign: 'right' }}>Rs. {Number(it.unitCost).toLocaleString()}</td>
                                <td style={{ textAlign: 'right', fontWeight: 800 }}>Rs. {Number(it.totalCost).toLocaleString()}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      {/* Purchase Bill Calculation Summary */}
                      <div style={{
                        backgroundColor: '#f8fafc',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                        gap: '10px',
                        textAlign: 'center'
                      }}>
                        <div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Items Subtotal</div>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                            Rs. {Number(selectedEntryDetail.purchase.totalAmount).toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Bill Discount</div>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#dc2626' }}>
                            - Rs. {Number(selectedEntryDetail.purchase.discount || 0).toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Net Payable</div>
                          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                            Rs. {Number(selectedEntryDetail.purchase.netAmount).toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Paid to Supplier</div>
                          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#059669' }}>
                            Rs. {Number(selectedEntryDetail.purchase.paidAmount || 0).toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Payable Balance</div>
                          <div style={{ fontWeight: 900, fontSize: '0.95rem', color: '#d97706' }}>
                            Rs. {Number(selectedEntryDetail.purchase.remainingAmount || 0).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {selectedEntryDetail.purchase.notes && (
                        <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#475569', fontStyle: 'italic' }}>
                          <b>Note:</b> {selectedEntryDetail.purchase.notes}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3. PAYMENT RECEIPT / DISBURSEMENT VIEW */}
                  {(selectedEntryDetail.payment || (!selectedEntryDetail.sale && !selectedEntryDetail.purchase)) && (
                    <div style={{
                      backgroundColor: '#f8fafc',
                      borderRadius: '12px',
                      border: '1.5px dashed #cbd5e1',
                      padding: '20px',
                      marginTop: '10px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                        <span style={{
                          fontSize: '0.85rem',
                          fontWeight: 800,
                          color: Number(selectedEntryDetail.rawEntry?.credit || selectedEntryDetail.payment?.amount) > 0 ? '#059669' : '#dc2626'
                        }}>
                          {Number(selectedEntryDetail.rawEntry?.credit || 0) > 0
                            ? '✓ CASH IN / COLLECTION (وصولی - کریڈٹ)'
                            : '↑ CASH OUT / DISBURSEMENT (ادائیگی - ڈیبٹ)'}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          Method: <b>{selectedEntryDetail.payment?.paymentMethod || 'CASH'}</b>
                        </span>
                      </div>

                      <div style={{ textAlign: 'center', margin: '14px 0' }}>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Transaction Amount (رقم)</div>
                        <div style={{
                          fontSize: '1.8rem',
                          fontWeight: 900,
                          color: Number(selectedEntryDetail.rawEntry?.credit || 0) > 0 ? '#059669' : '#dc2626',
                          letterSpacing: '-0.5px'
                        }}>
                          Rs. {Number(
                            selectedEntryDetail.payment?.amount ??
                            (Number(selectedEntryDetail.rawEntry?.credit) > 0 ? selectedEntryDetail.rawEntry?.credit : selectedEntryDetail.rawEntry?.debit) ??
                            0
                          ).toLocaleString()}
                        </div>
                      </div>

                      <div style={{
                        backgroundColor: '#ffffff',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        fontSize: '0.85rem'
                      }}>
                        <div style={{ fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                          Reason / Narration (تفصیل و وجہ):
                        </div>
                        <div style={{ color: '#0f172a', fontWeight: 600 }}>
                          {selectedEntryDetail.payment?.notes || selectedEntryDetail.rawEntry?.description || 'N/A'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '14px', fontSize: '0.78rem', color: '#64748b' }}>
                        <div>
                          Running Balance Impact: <b>Rs. {Number(selectedEntryDetail.rawEntry?.runningBalance || 0).toLocaleString()}</b>
                        </div>
                        <div>
                          Recorded By: <b>{selectedEntryDetail.payment?.recordedBy?.fullName || 'Admin'}</b>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '14px 20px',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Rafiq Auto & Oil Traders, 54-Stop Okara
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn btn-outline btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                >
                  <Printer size={14} />
                  Print Details
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDetailModalOpen(false);
                    setSelectedEntryDetail(null);
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ fontWeight: 700 }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable Statement Modal (Print / Save as PDF) */}
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
                  {activeTab === 'CUSTOMERS' ? 'Customer Account Ledger Statement' : activeTab === 'SUPPLIERS' ? 'Supplier Account Statement' : '🤝 Dual Partner Mutual Clearance Statement (مشترکہ کھاتہ)'}
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Print button dabane se browser "Save as PDF" ka option deta hai jahan se aap PDF save kar ke customer ko bhej saktay hain.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {(activeTab === 'CUSTOMERS' || activeTab === 'DUAL_PARTNERS') && (
                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="btn btn-outline btn-sm"
                    style={{ borderColor: '#16a34a', color: '#16a34a', fontWeight: 700 }}
                    title="Send Khata Summary to WhatsApp"
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
              <div className="printable-area a4-report" style={{
                backgroundColor: '#ffffff',
                color: '#000000',
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '11px',
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
                      fontSize: '11px',
                      borderRadius: '4px',
                      letterSpacing: '1px'
                    }}>
                      {activeTab === 'DUAL_PARTNERS' ? 'MUTUAL CLEARANCE STATEMENT' : 'ACCOUNT STATEMENT'}
                    </div>
                    <div style={{ fontSize: '10px', marginTop: '4px', color: '#555555' }}>
                      Date: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </div>
                  </div>
                </div>

                {/* Account Details Box */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: activeTab === 'DUAL_PARTNERS' ? '1.1fr 1fr' : '1.2fr 1fr',
                  gap: '14px',
                  border: '1px solid #000000',
                  padding: '12px 14px',
                  borderRadius: '6px',
                  marginBottom: '16px',
                  backgroundColor: '#fafafa'
                }}>
                  <div>
                    <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', fontWeight: 700 }}>
                      Party / Business Account
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 900, color: '#000' }}>
                      {activeTab === 'CUSTOMERS' ? selectedCustomer?.shopName : activeTab === 'SUPPLIERS' ? selectedSupplier?.companyName : selectedDualPartner?.name}
                    </div>
                    <div style={{ fontSize: '11px', marginTop: '2px' }}>
                      Owner / Contact: <b>{activeTab === 'CUSTOMERS' ? selectedCustomer?.ownerName : activeTab === 'SUPPLIERS' ? selectedSupplier?.contactPerson : selectedDualPartner?.ownerName}</b>
                    </div>
                    <div style={{ fontSize: '11px' }}>
                      Phone: <b>{activeTab === 'CUSTOMERS' ? selectedCustomer?.phone : activeTab === 'SUPPLIERS' ? selectedSupplier?.phone : selectedDualPartner?.phone}</b>
                    </div>
                    <div style={{ fontSize: '11px' }}>
                      Address: {activeTab === 'CUSTOMERS' ? (selectedCustomer?.area || selectedCustomer?.address || 'Okara Local') : activeTab === 'SUPPLIERS' ? (selectedSupplier?.address || 'N/A') : (selectedDualPartner?.address || 'Okara')}
                    </div>
                  </div>

                  <div style={{ borderLeft: '1px solid #ccc', paddingLeft: '14px' }}>
                    {activeTab === 'DUAL_PARTNERS' ? (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                          <span>Total Sales (فروخت مال):</span>
                          <b>Rs. {Number(entitySummary?.totalSales || 0).toLocaleString()}</b>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                          <span>Total Purchases (خریداری مال):</span>
                          <b>Rs. {Number(entitySummary?.totalPurchases || 0).toLocaleString()}</b>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                          <span>Customer Receivable (لینا ہے):</span>
                          <b style={{ color: '#059669' }}>Rs. {Number(entitySummary?.currentReceivable || 0).toLocaleString()}</b>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                          <span>Supplier Payable (دینا ہے):</span>
                          <b style={{ color: '#dc2626' }}>Rs. {Number(entitySummary?.currentPayable || 0).toLocaleString()}</b>
                        </div>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          borderTop: '1.5px solid #000',
                          paddingTop: '4px',
                          marginTop: '4px',
                          fontSize: '12px',
                          fontWeight: 900
                        }}>
                          <span>NET MUTUAL BALANCE:</span>
                          <span style={{ color: entitySummary?.netMutualBalance > 0 ? '#059669' : entitySummary?.netMutualBalance < 0 ? '#dc2626' : '#000' }}>
                            Rs. {Math.abs(Number(entitySummary?.netMutualBalance || 0)).toLocaleString()} {entitySummary?.netMutualBalance > 0 ? '(لینا ہے)' : entitySummary?.netMutualBalance < 0 ? '(دینا ہے)' : '(صاف ہے)'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div>
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
                      </div>
                    )}
                  </div>
                </div>

                {/* Ledger Transactions Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '20px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#000000', color: '#ffffff' }}>
                      <th style={{ padding: '5px 6px', textAlign: 'left' }}>DATE</th>
                      {activeTab === 'DUAL_PARTNERS' && <th style={{ padding: '5px 6px', textAlign: 'left' }}>ACCOUNT</th>}
                      <th style={{ padding: '5px 6px', textAlign: 'left' }}>TYPE</th>
                      <th style={{ padding: '5px 6px', textAlign: 'left' }}>REF #</th>
                      <th style={{ padding: '5px 6px', textAlign: 'left' }}>DESCRIPTION</th>
                      <th style={{ padding: '5px 6px', textAlign: 'right' }}>DEBIT (Rs.)</th>
                      <th style={{ padding: '5px 6px', textAlign: 'right' }}>CREDIT (Rs.)</th>
                      <th style={{ padding: '5px 6px', textAlign: 'right' }}>BALANCE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerEntries.map((e, idx) => (
                      <tr key={e.id} style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                        <td style={{ padding: '5px 6px' }}>{new Date(e.date).toLocaleDateString()}</td>
                        {activeTab === 'DUAL_PARTNERS' && (
                          <td style={{ padding: '5px 6px', fontWeight: 700 }}>
                            {e.source === 'CUSTOMER_ACCOUNT' ? 'Sale (گاہک)' : 'Purchase (سپلائر)'}
                          </td>
                        )}
                        <td style={{ padding: '5px 6px', fontWeight: 700 }}>{e.type || e.transactionType}</td>
                        <td style={{ padding: '5px 6px', fontFamily: 'monospace' }}>{e.referenceId || '-'}</td>
                        <td style={{ padding: '5px 6px' }}>{e.description}</td>
                        <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: Number(e.debit) > 0 ? 700 : 400 }}>
                          {Number(e.debit) > 0 ? Number(e.debit).toLocaleString() : '-'}
                        </td>
                        <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: Number(e.credit) > 0 ? 700 : 400, color: Number(e.credit) > 0 ? '#059669' : '#000' }}>
                          {Number(e.credit) > 0 ? Number(e.credit).toLocaleString() : '-'}
                        </td>
                        <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 900 }}>
                          Rs. {Number(e.runningBalance).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Signatures & Verification */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginTop: '30px', paddingTop: '16px', borderTop: '1px dashed #000000', fontSize: '10px', textAlign: 'center' }}>
                  <div>
                    <div style={{ borderBottom: '1px solid #000', height: '22px' }}></div>
                    <div style={{ marginTop: '5px', fontWeight: 700 }}>Prepared By (Accounts)</div>
                  </div>
                  <div>
                    <div style={{ borderBottom: '1px solid #000', height: '22px' }}></div>
                    <div style={{ marginTop: '5px', fontWeight: 700 }}>Proprietor (M. Shafiq) Stamp</div>
                  </div>
                  <div>
                    <div style={{ borderBottom: '1px solid #000', height: '22px' }}></div>
                    <div style={{ marginTop: '5px', fontWeight: 700 }}>Partner Confirmation</div>
                  </div>
                </div>

                <div style={{ textAlign: 'center', fontSize: '8px', color: '#666', marginTop: '16px' }}>
                  This statement was generated electronically from Rafiq Auto & Oil Traders ERP System | Okara
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
