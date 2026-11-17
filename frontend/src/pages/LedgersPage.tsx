import React, { useEffect, useState, useMemo } from 'react';
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
  Plus,
  Minus,
  Receipt,
  Users,
  Activity,
  Filter,
  Clock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { exportConsolidatedAllPartyBalancesPDF, exportSingleLedgerStatementPDF } from '../utils/pdfExportUtils';
import { playPrintSound } from '../utils/soundEffects';

/**
 * Standard Pakistan Standard Time (PKT, UTC+5) formatters
 */
export const formatPakistanDateTime = (dateStrOrObj?: string | Date | null): string => {
  if (!dateStrOrObj) return '-';
  try {
    const d = new Date(dateStrOrObj);
    if (isNaN(d.getTime())) return '-';
    const dateFormatted = d.toLocaleDateString('en-GB', {
      timeZone: 'Asia/Karachi',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const timeFormatted = d.toLocaleTimeString('en-US', {
      timeZone: 'Asia/Karachi',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    return `${dateFormatted} ${timeFormatted}`;
  } catch {
    return String(dateStrOrObj);
  }
};

export const formatPakistanDateOnly = (dateStrOrObj?: string | Date | null): string => {
  if (!dateStrOrObj) return '-';
  try {
    const d = new Date(dateStrOrObj);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-GB', {
      timeZone: 'Asia/Karachi',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return String(dateStrOrObj);
  }
};

export const formatPakistanTimeOnly = (dateStrOrObj?: string | Date | null): string => {
  if (!dateStrOrObj) return '';
  try {
    const d = new Date(dateStrOrObj);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-US', {
      timeZone: 'Asia/Karachi',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
};

export const getPakistanNowDatetimeLocal = (): string => {
  const now = new Date();
  const pktDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Karachi' }));
  const y = pktDate.getFullYear();
  const m = String(pktDate.getMonth() + 1).padStart(2, '0');
  const d = String(pktDate.getDate()).padStart(2, '0');
  const hh = String(pktDate.getHours()).padStart(2, '0');
  const mm = String(pktDate.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${hh}:${mm}`;
};

export const LedgersPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const hasCustomPerms = Boolean(user?.permissions && Array.isArray(user.permissions) && user.permissions.length > 0);
  const canEditLedger = isAdmin || (hasCustomPerms ? Boolean(user?.permissions?.includes('action:edit_ledger')) : (user?.role === 'OPERATOR' || user?.role === 'CASHIER'));
  const canDeleteLedger = isAdmin || (hasCustomPerms ? Boolean(user?.permissions?.includes('action:delete_ledger')) : false);

  const [activeTab, setActiveTab] = useState<'CUSTOMERS' | 'SUPPLIERS' | 'DUAL_PARTNERS' | 'ALL_PARTIES' | 'CASH_FLOW_HISTORY'>('CUSTOMERS');
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
  const [payInvoiceNumber, setPayInvoiceNumber] = useState('');
  const [autoPrintReceipt, setAutoPrintReceipt] = useState(true);
  const [payNotes, setPayNotes] = useState('');
  const [payTargetType, setPayTargetType] = useState<'CUSTOMER' | 'SUPPLIER'>('CUSTOMER');
  const [payDirection, setPayDirection] = useState<'IN' | 'OUT'>('IN');
  const [payChannel, setPayChannel] = useState<'SHOP' | 'VAN'>('SHOP');
  const [payDate, setPayDate] = useState(() => getPakistanNowDatetimeLocal());
  const [paySubmitting, setPaySubmitting] = useState(false);

  // Today's Ledger Financial Summary (Cash In / Wasooli vs Cash Out / Adaiyigi)
  const [todaySummary, setTodaySummary] = useState<any>(null);
  const [loadingTodaySummary, setLoadingTodaySummary] = useState(false);

  // All Parties Master View & Filters
  const [onlyActiveToday, setOnlyActiveToday] = useState(false);
  const [allPartiesSearch, setAllPartiesSearch] = useState('');
  const [allPartiesTypeFilter, setAllPartiesTypeFilter] = useState<'ALL' | 'CUSTOMER' | 'SUPPLIER'>('ALL');

  // Cash In & Cash Out History View & Filters
  const [historyTypeFilter, setHistoryTypeFilter] = useState<'ALL' | 'IN' | 'OUT' | 'COUNTER' | 'VAN'>('ALL');
  const [historySearch, setHistorySearch] = useState('');

  // Contra settlement modal (Mutual offset)
  const [showContraModal, setShowContraModal] = useState(false);
  const [contraAmount, setContraAmount] = useState('');
  const [contraNotes, setContraNotes] = useState('');
  const [contraSubmitting, setContraSubmitting] = useState(false);

  // Instant Payment Receipt / Slip modal
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [paymentReceiptData, setPaymentReceiptData] = useState<any | null>(null);

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

  const loadTodaySummary = async () => {
    try {
      setLoadingTodaySummary(true);
      const res = await api.get('/ledgers/today-summary');
      if (res.data?.success && res.data?.data) {
        setTodaySummary(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load today ledger summary:', err);
    } finally {
      setLoadingTodaySummary(false);
    }
  };

  useEffect(() => {
    loadTodaySummary();
  }, []);

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
      } else if (activeTab === 'ALL_PARTIES' || activeTab === 'CASH_FLOW_HISTORY') {
        const [cRes, sRes] = await Promise.all([
          api.get('/partners/customers'),
          api.get('/partners/suppliers'),
        ]);
        setCustomers(cRes.data.customers || []);
        setSuppliers(sRes.data.suppliers || []);
      }
      loadTodaySummary();
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
    if (!selectedEntityId) {
      alert('Bara-e-meherbani pehle Party / Account select karein!');
      return;
    }
    if (!payNotes.trim()) {
      alert('Reason / Narration (Wajah) likhna lazmi hai!');
      return;
    }
    setPaySubmitting(true);
    try {
      let formattedDate = payDate;
      if (formattedDate && !formattedDate.includes('Z') && !formattedDate.includes('+')) {
        if (formattedDate.length === 16) formattedDate += ':00';
        formattedDate += '+05:00';
      }

      const payload: any = {
        amount: parseFloat(payAmount),
        direction: payDirection,
        channel: payChannel,
        paymentMethod: payMethod,
        reference: payReference,
        invoiceNumber: payInvoiceNumber.trim() || undefined,
        notes: payNotes,
        date: formattedDate,
      };

      if (activeTab === 'CUSTOMERS') {
        payload.customerId = selectedEntityId;
      } else if (activeTab === 'SUPPLIERS') {
        payload.supplierId = selectedEntityId;
      } else if (activeTab === 'DUAL_PARTNERS') {
        payload.isDualPartner = true;
        payload.partnerName = dualLedgerData?.partner?.name || selectedDualPartner?.name;
        if (payTargetType === 'CUSTOMER') {
          payload.customerId = dualLedgerData?.partner?.customerId || selectedEntityId;
        } else {
          payload.supplierId = dualLedgerData?.partner?.supplierId;
        }
      } else if (activeTab === 'ALL_PARTIES') {
        if (payTargetType === 'CUSTOMER') {
          payload.customerId = selectedEntityId;
        } else {
          payload.supplierId = selectedEntityId;
        }
      }

      const res = await api.post('/ledgers/payment', payload);
      if (res.data.success) {
        setOperationSuccess(
          payDirection === 'IN'
            ? 'Cash In / Wasooli voucher darj ho gaya aur 80mm POS receipt tayar ho gayi!'
            : 'Cash Out / Adaiyigi voucher darj ho gaya aur 80mm POS receipt tayar ho gayi!'
        );
        setOperationError('');
        const receipt = res.data.data?.receipt || res.data.receipt;
        if (receipt && autoPrintReceipt) {
          setPaymentReceiptData(receipt);
          setShowReceiptModal(true);
          playPrintSound();
        }
        setPayAmount('');
        setPayNotes('');
        setPayReference('');
        setPayInvoiceNumber('');
        setPayChannel('SHOP');
        setShowPaymentModal(false);
        loadLedger(selectedEntityId);
        loadEntities();
        loadTodaySummary();
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
        const receipt = res.data.data?.receipt || res.data.receipt;
        if (receipt) {
          setPaymentReceiptData(receipt);
          setShowReceiptModal(true);
          playPrintSound();
        }
        setShowContraModal(false);
        setContraAmount('');
        setContraNotes('');
        await loadLedger(selectedEntityId);
        await loadEntities();
        await loadTodaySummary();
      }
    } catch (err: any) {
      setOperationError(err.response?.data?.message || 'Contra settlement failed.');
    } finally {
      setContraSubmitting(false);
    }
  };

  const handleOpenPaymentReceiptFromEntry = async (entry: any) => {
    let serverReceipt: any = null;
    try {
      const res = await api.get('/ledgers/entry-detail', {
        params: {
          referenceId: entry.referenceId || '',
          type: entry.type || entry.transactionType || '',
          id: entry.id || '',
        },
      });

      if (res.data?.success && res.data?.receipt) {
        serverReceipt = res.data.receipt;
      }
    } catch (err) {
      console.warn('Could not load receipt from server, constructing fallback:', err);
    }

    const isCust = activeTab === 'CUSTOMERS' || entry.source === 'CUSTOMER_ACCOUNT' || Boolean(entry.customerId);
    const amt = Number(serverReceipt?.paidAmount || (Number(entry.credit) > 0 ? entry.credit : entry.debit) || 0);
    const isCashIn = serverReceipt ? (serverReceipt.direction === 'IN') : (Number(entry.credit) > 0);

    // Prefer entry.runningBalance if available (since the ledger table row has the exact running balance at that point in time)
    const rawRemaining = (entry.runningBalance !== undefined && entry.runningBalance !== null)
      ? Number(entry.runningBalance)
      : (serverReceipt?.remainingBalance !== undefined && serverReceipt?.remainingBalance !== null
          ? Number(serverReceipt.remainingBalance)
          : Number(entitySummary?.currentReceivable || entitySummary?.currentPayable || 0));

    const rawPrevious = (entry.runningBalance !== undefined && entry.runningBalance !== null)
      ? (isCashIn ? rawRemaining + amt : rawRemaining - amt)
      : (serverReceipt?.previousBalance !== undefined && serverReceipt?.previousBalance !== null
          ? Number(serverReceipt.previousBalance)
          : (isCashIn ? rawRemaining + amt : rawRemaining - amt));

    const partyName =
      serverReceipt?.partyName ||
      (activeTab === 'CUSTOMERS'
        ? selectedCustomer?.shopName || 'Customer'
        : activeTab === 'SUPPLIERS'
        ? selectedSupplier?.companyName || 'Supplier'
        : selectedDualPartner?.name || 'Dual Partner');

    const isVan = serverReceipt?.channel === 'VAN' || (entry.description || '').includes('[VAN]') || (entry.description || '').includes('وین');

    const receiptObj = {
      receiptNumber: serverReceipt?.receiptNumber || entry.referenceId || `VCH-${entry.id?.slice(0, 8) || Date.now()}`,
      invoiceNumber: serverReceipt?.invoiceNumber || entry.referenceId || `VCH-${entry.id?.slice(0, 8) || Date.now()}`,
      voucherType: serverReceipt?.voucherType || (isCust ? (isCashIn ? 'CUSTOMER_PAYMENT' : 'CUSTOMER_REFUND') : (isCashIn ? 'SUPPLIER_REFUND' : 'SUPPLIER_PAYMENT')),
      partyType: serverReceipt?.partyType || (activeTab === 'DUAL_PARTNERS' ? 'DUAL_PARTNER' : (isCust ? 'CUSTOMER' : 'SUPPLIER')),
      channel: isVan ? 'VAN' : 'SHOP',
      channelLabel: isVan ? '🚐 وین سپلائی وصولی (Van Collection)' : '🏪 دکان کاؤنٹر (Shop Counter)',
      isDualPartner: activeTab === 'DUAL_PARTNERS',
      partnerName: serverReceipt?.partnerName || selectedDualPartner?.name || null,
      partyName,
      contactPerson: serverReceipt?.contactPerson || (isCust ? selectedCustomer?.ownerName : selectedSupplier?.contactPerson),
      phone: serverReceipt?.phone || (isCust ? selectedCustomer?.phone : selectedSupplier?.phone),
      address: serverReceipt?.address || (isCust ? selectedCustomer?.area : selectedSupplier?.address),
      previousBalance: rawPrevious,
      paidAmount: amt,
      remainingBalance: rawRemaining,
      direction: isCashIn ? 'IN' : 'OUT',
      paymentMethod: serverReceipt?.paymentMethod || 'CASH',
      reference: serverReceipt?.reference || entry.referenceId || '-',
      notes: serverReceipt?.notes || entry.description || '',
      paymentDate: serverReceipt?.paymentDate || entry.date,
      recordedByName: serverReceipt?.recordedByName || user?.fullName || 'Cashier / Admin',
    };

    setPaymentReceiptData(receiptObj);
    setShowReceiptModal(true);
    playPrintSound();
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

  // Combine all accounts (Customers + Suppliers) for ALL_PARTIES tab
  const allPartiesList = useMemo(() => {
    const todayCustSet = new Set(todaySummary?.todayActiveCustomerIds || []);
    const todaySuppSet = new Set(todaySummary?.todayActiveSupplierIds || []);
    const activityMap = todaySummary?.partyActivityMap || {};

    const list: any[] = [];

    // Customers
    customers.forEach((c) => {
      const act = activityMap[c.id] || { debit: 0, credit: 0, count: 0 };
      const hadActivity = todayCustSet.has(c.id) || act.count > 0;
      list.push({
        id: c.id,
        entityType: 'CUSTOMER' as const,
        name: c.shopName,
        ownerName: c.ownerName,
        phone: c.phone,
        address: c.area || c.address || '',
        receivable: Number(c.currentReceivable || 0),
        payable: 0,
        netBalance: Number(c.currentReceivable || 0),
        isDual: Boolean(c.isDualPartner),
        transactedToday: hadActivity,
        todayDebit: act.debit,
        todayCredit: act.credit,
      });
    });

    // Suppliers
    suppliers.forEach((s) => {
      const act = activityMap[s.id] || { debit: 0, credit: 0, count: 0 };
      const hadActivity = todaySuppSet.has(s.id) || act.count > 0;
      list.push({
        id: s.id,
        entityType: 'SUPPLIER' as const,
        name: s.companyName,
        ownerName: s.contactPerson,
        phone: s.phone,
        address: s.address || '',
        receivable: 0,
        payable: Number(s.currentPayable || 0),
        netBalance: -Number(s.currentPayable || 0),
        isDual: Boolean(s.isDualPartner),
        transactedToday: hadActivity,
        todayDebit: act.debit,
        todayCredit: act.credit,
      });
    });

    return list;
  }, [customers, suppliers, todaySummary]);

  // Filtered All Parties
  const filteredAllParties = useMemo(() => {
    return allPartiesList.filter((p) => {
      if (onlyActiveToday && !p.transactedToday) {
        return false;
      }
      if (allPartiesTypeFilter !== 'ALL' && p.entityType !== allPartiesTypeFilter) {
        return false;
      }
      if (allPartiesSearch.trim()) {
        const q = allPartiesSearch.toLowerCase().trim();
        const matchesName = (p.name || '').toLowerCase().includes(q);
        const matchesOwner = (p.ownerName || '').toLowerCase().includes(q);
        const matchesPhone = (p.phone || '').includes(q);
        const matchesAddress = (p.address || '').toLowerCase().includes(q);
        return matchesName || matchesOwner || matchesPhone || matchesAddress;
      }
      return true;
    });
  }, [allPartiesList, onlyActiveToday, allPartiesTypeFilter, allPartiesSearch]);

  // Cash In & Cash Out History List (POS Style)
  const cashFlowHistoryList = useMemo(() => {
    const list = todaySummary?.recentTransactions || [];
    return list.filter((t: any) => {
      if (historyTypeFilter === 'IN' && t.direction !== 'IN') return false;
      if (historyTypeFilter === 'OUT' && t.direction !== 'OUT') return false;
      if (historyTypeFilter === 'COUNTER' && t.channel === 'VAN') return false;
      if (historyTypeFilter === 'VAN' && t.channel !== 'VAN') return false;
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase().trim();
        const matchesParty = (t.partyName || '').toLowerCase().includes(q);
        const matchesReceipt = (t.receiptNumber || '').toLowerCase().includes(q);
        const matchesInv = (t.invoiceNumber || '').toLowerCase().includes(q);
        const matchesNote = (t.notes || '').toLowerCase().includes(q);
        const matchesPhone = (t.phone || '').includes(q);
        return matchesParty || matchesReceipt || matchesInv || matchesNote || matchesPhone;
      }
      return true;
    });
  }, [todaySummary, historyTypeFilter, historySearch]);

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

      {/* Today's Ledger Financial Summary Banner (آج کی کل وصولی اور ادائیگی) */}
      <div className="card no-print" style={{
        marginBottom: '20px',
        padding: '16px 20px',
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        border: '1.5px solid #cbd5e1',
        borderRadius: '14px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.35)'
            }}>
              <Calendar size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  آج کی لیجر وصولی اور ادائیگی (Today's Ledger Cash Flow)
                </h3>
                <span className="badge badge-info" style={{ fontSize: '0.75rem', fontWeight: 800 }}>
                  📅 {new Date().toLocaleDateString('ur-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
                {loadingTodaySummary && (
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <RefreshCw size={12} className="spin" /> Updating...
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                آج کے دن لیجر میں کسٹمرز سے موصول شدہ (Cash In) اور سپلائرز کو ادا شدہ (Cash Out) کا مکمل خلاصہ
              </div>
            </div>
          </div>

          {canEditLedger && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  setPayTargetType(activeTab === 'SUPPLIERS' ? 'SUPPLIER' : 'CUSTOMER');
                  setPayDirection('IN');
                  setShowPaymentModal(true);
                }}
                className="btn"
                style={{
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '7px 14px',
                  boxShadow: '0 2px 6px rgba(22, 163, 74, 0.3)'
                }}
                title="Cash In / Wasooli (کسٹمر یا سپلائر سے رقم وصول کریں اور 80mm انوائس بنائیں)"
              >
                <Plus size={16} /> 🟢 رقم وصول کریں (Cash In)
              </button>
              <button
                type="button"
                onClick={() => {
                  setPayTargetType(activeTab === 'SUPPLIERS' ? 'SUPPLIER' : 'CUSTOMER');
                  setPayDirection('OUT');
                  setShowPaymentModal(true);
                }}
                className="btn"
                style={{
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '7px 14px',
                  boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)'
                }}
                title="Cash Out / Adaiyigi (سپلائر یا کسٹمر کو رقم ادا کریں)"
              >
                <Minus size={16} /> 🔴 رقم ادا کریں (Cash Out)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('CASH_FLOW_HISTORY')}
                className="btn"
                style={{
                  backgroundColor: activeTab === 'CASH_FLOW_HISTORY' ? '#0f172a' : '#f8fafc',
                  color: activeTab === 'CASH_FLOW_HISTORY' ? '#ffffff' : '#334155',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '7px 14px',
                }}
                title="آج کی تمام وصولیوں اور ادائیگیوں کی تفصیلی ہسٹری دیکھیں"
              >
                <Receipt size={16} /> 📜 آج کے واؤچرز ({todaySummary?.recentTransactions?.length || 0})
              </button>
            </div>
          )}
        </div>

        {/* Counter Cash vs Van Cash Breakdown Section */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '14px' }}>
          {/* Box 1: Counter Cash */}
          <div style={{
            backgroundColor: '#f0fdf4',
            border: '2px solid #86efac',
            borderRadius: '12px',
            padding: '14px 18px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 900, color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                🏪 کاؤنٹر کیش (Shop / Counter Cash)
              </span>
              <span className="badge" style={{ backgroundColor: '#bbf7d0', color: '#14532d', fontWeight: 800, fontSize: '0.72rem' }}>
                {(todaySummary?.counter?.receivedCount || 0) + (todaySummary?.counter?.paidCount || 0)} اینٹریز
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', textAlign: 'center' }}>
              <div style={{ backgroundColor: '#ffffff', padding: '8px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: '0.72rem', color: '#166534', fontWeight: 700 }}>وصولی (In)</div>
                <div style={{ fontSize: '0.98rem', fontWeight: 900, color: '#15803d' }}>
                  Rs. {Number(todaySummary?.counter?.received || 0).toLocaleString()}
                </div>
              </div>
              <div style={{ backgroundColor: '#ffffff', padding: '8px', borderRadius: '8px', border: '1px solid #fecaca' }}>
                <div style={{ fontSize: '0.72rem', color: '#991b1b', fontWeight: 700 }}>ادائیگی (Out)</div>
                <div style={{ fontSize: '0.98rem', fontWeight: 900, color: '#dc2626' }}>
                  Rs. {Number(todaySummary?.counter?.paid || 0).toLocaleString()}
                </div>
              </div>
              <div style={{ backgroundColor: '#ffffff', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <div style={{ fontSize: '0.72rem', color: '#334155', fontWeight: 700 }}>خالص نیٹ</div>
                <div style={{ fontSize: '0.98rem', fontWeight: 900, color: (todaySummary?.counter?.net || 0) >= 0 ? '#0369a1' : '#b45309' }}>
                  Rs. {Number(todaySummary?.counter?.net || 0).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Box 2: Van Cash */}
          <div style={{
            backgroundColor: '#fffbeb',
            border: '2px solid #fde68a',
            borderRadius: '12px',
            padding: '14px 18px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 900, color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                🚐 وین کیش (Delivery Van / Route Cash)
              </span>
              <span className="badge" style={{ backgroundColor: '#fef3c7', color: '#78350f', fontWeight: 800, fontSize: '0.72rem' }}>
                {(todaySummary?.van?.receivedCount || 0) + (todaySummary?.van?.paidCount || 0)} اینٹریز
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', textAlign: 'center' }}>
              <div style={{ backgroundColor: '#ffffff', padding: '8px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: '0.72rem', color: '#166534', fontWeight: 700 }}>وصولی (In)</div>
                <div style={{ fontSize: '0.98rem', fontWeight: 900, color: '#15803d' }}>
                  Rs. {Number(todaySummary?.van?.received || 0).toLocaleString()}
                </div>
              </div>
              <div style={{ backgroundColor: '#ffffff', padding: '8px', borderRadius: '8px', border: '1px solid #fecaca' }}>
                <div style={{ fontSize: '0.72rem', color: '#991b1b', fontWeight: 700 }}>ادائیگی (Out)</div>
                <div style={{ fontSize: '0.98rem', fontWeight: 900, color: '#dc2626' }}>
                  Rs. {Number(todaySummary?.van?.paid || 0).toLocaleString()}
                </div>
              </div>
              <div style={{ backgroundColor: '#ffffff', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <div style={{ fontSize: '0.72rem', color: '#334155', fontWeight: 700 }}>خالص نیٹ</div>
                <div style={{ fontSize: '0.98rem', fontWeight: 900, color: (todaySummary?.van?.net || 0) >= 0 ? '#0369a1' : '#b45309' }}>
                  Rs. {Number(todaySummary?.van?.net || 0).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Grand Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
          {/* Card 1: Today Received (Cash In) */}
          <div style={{
            backgroundColor: '#ffffff',
            border: '2px solid #86efac',
            borderLeft: '6px solid #16a34a',
            borderRadius: '12px',
            padding: '14px 18px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#15803d' }}>
                🟢 آج کی کل وصولی (Total Cash In)
              </span>
              <span className="badge" style={{ backgroundColor: '#dcfce7', color: '#166534', fontWeight: 800, fontSize: '0.72rem' }}>
                {todaySummary?.receivedCount || 0} وصولیاں
              </span>
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#15803d', margin: '4px 0 2px 0' }}>
              Rs. {Number(todaySummary?.totalReceived || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
              کاؤنٹر: <b>Rs. {Number(todaySummary?.counter?.received || 0).toLocaleString()}</b> | وین: <b>Rs. {Number(todaySummary?.van?.received || 0).toLocaleString()}</b>
            </div>
          </div>

          {/* Card 2: Today Paid (Cash Out) */}
          <div style={{
            backgroundColor: '#ffffff',
            border: '2px solid #fca5a5',
            borderLeft: '6px solid #dc2626',
            borderRadius: '12px',
            padding: '14px 18px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#b91c1c' }}>
                🔴 آج کی کل ادائیگی (Total Cash Out)
              </span>
              <span className="badge" style={{ backgroundColor: '#fee2e2', color: '#991b1b', fontWeight: 800, fontSize: '0.72rem' }}>
                {todaySummary?.paidCount || 0} ادائیگیاں
              </span>
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#dc2626', margin: '4px 0 2px 0' }}>
              Rs. {Number(todaySummary?.totalPaid || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
              کاؤنٹر: <b>Rs. {Number(todaySummary?.counter?.paid || 0).toLocaleString()}</b> | وین: <b>Rs. {Number(todaySummary?.van?.paid || 0).toLocaleString()}</b>
            </div>
          </div>

          {/* Card 3: Today Net Flow */}
          <div style={{
            backgroundColor: '#ffffff',
            border: '2px solid #cbd5e1',
            borderLeft: `6px solid ${(todaySummary?.netCashFlow || 0) >= 0 ? '#0284c7' : '#d97706'}`,
            borderRadius: '12px',
            padding: '14px 18px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#334155' }}>
                ⚖️ آج کا نیٹ کیش فلو (Net Flow)
              </span>
              <span className="badge" style={{ backgroundColor: '#f1f5f9', color: '#334155', fontWeight: 800, fontSize: '0.72rem' }}>
                {(todaySummary?.netCashFlow || 0) >= 0 ? 'Surplus (بچت)' : 'Deficit (خسارہ)'}
              </span>
            </div>
            <div style={{
              fontSize: '1.65rem',
              fontWeight: 900,
              color: (todaySummary?.netCashFlow || 0) >= 0 ? '#0369a1' : '#b45309',
              margin: '4px 0 2px 0'
            }}>
              Rs. {Number(todaySummary?.netCashFlow || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
              کاؤنٹر نیٹ: <b>Rs. {Number(todaySummary?.counter?.net || 0).toLocaleString()}</b> | وین نیٹ: <b>Rs. {Number(todaySummary?.van?.net || 0).toLocaleString()}</b>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="no-print" style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setActiveTab('CUSTOMERS')}
          className={`btn ${activeTab === 'CUSTOMERS' ? 'btn-primary' : 'btn-outline'}`}
          style={{ fontWeight: 700 }}
        >
          Customer Ledgers (گاہکوں کے کھاتے)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('SUPPLIERS')}
          className={`btn ${activeTab === 'SUPPLIERS' ? 'btn-primary' : 'btn-outline'}`}
          style={{ fontWeight: 700 }}
        >
          Supplier Ledgers (سپلائرز کے کھاتے)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('DUAL_PARTNERS')}
          className={`btn ${activeTab === 'DUAL_PARTNERS' ? 'btn-warning' : 'btn-outline'}`}
          style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          🤝 Dual Partners (مشترکہ کھاتے)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ALL_PARTIES')}
          className={`btn ${activeTab === 'ALL_PARTIES' ? 'btn-success' : 'btn-outline'}`}
          style={{
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: activeTab === 'ALL_PARTIES' ? '#0891b2' : 'transparent',
            borderColor: '#0891b2',
            color: activeTab === 'ALL_PARTIES' ? '#ffffff' : '#0891b2'
          }}
        >
          <Users size={16} /> 🏢 تمام پارٹیاں (All Parties / Full Khata)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('CASH_FLOW_HISTORY')}
          className={`btn ${activeTab === 'CASH_FLOW_HISTORY' ? 'btn-info' : 'btn-outline'}`}
          style={{
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: activeTab === 'CASH_FLOW_HISTORY' ? '#4f46e5' : 'transparent',
            borderColor: '#4f46e5',
            color: activeTab === 'CASH_FLOW_HISTORY' ? '#ffffff' : '#4f46e5'
          }}
        >
          <Receipt size={16} /> 📜 کیش ان / آؤٹ واؤچرز ({todaySummary?.recentTransactions?.length || 0})
        </button>
      </div>

      {activeTab === 'ALL_PARTIES' ? (
        /* ALL PARTIES MASTER KHATA VIEW */
        <div className="no-print">
          {/* Top Metrics Summary */}
          <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', marginBottom: '20px' }}>
            <div className="stat-card blue">
              <div className="stat-label">Total Parties (کل پارٹیاں)</div>
              <div className="stat-value">{allPartiesList.length}</div>
              <div className="stat-sub">{customers.length} گاہک + {suppliers.length} سپلائرز</div>
            </div>
            <div className="stat-card amber">
              <div className="stat-label">Active Today (آج لین دین ہوا)</div>
              <div className="stat-value" style={{ color: '#d97706' }}>
                {allPartiesList.filter((p) => p.transactedToday).length}
              </div>
              <div className="stat-sub">جن کے کھاتے میں آج انٹریز ہوئیں</div>
            </div>
            <div className="stat-card green">
              <div className="stat-label">Total Market Receivable (کل ادھار لینا ہے)</div>
              <div className="stat-value" style={{ color: '#059669' }}>
                Rs. {customers.reduce((sum, c) => sum + Number(c.currentReceivable || 0), 0).toLocaleString()}
              </div>
              <div className="stat-sub">گاہکوں سے مجموعی واجب الوصول رقم</div>
            </div>
            <div className="stat-card red">
              <div className="stat-label">Total Supplier Payable (کل واجب الادا دینا ہے)</div>
              <div className="stat-value" style={{ color: '#dc2626' }}>
                Rs. {suppliers.reduce((sum, s) => sum + Number(s.currentPayable || 0), 0).toLocaleString()}
              </div>
              <div className="stat-sub">سپلائر کمپنیوں کو واجب الادا رقم</div>
            </div>
          </div>

          {/* Filter & Action Toolbar */}
          <div className="card" style={{ marginBottom: '20px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1, minWidth: '280px', flexWrap: 'wrap' }}>
                {/* Search */}
                <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by name, owner, phone, area..."
                    value={allPartiesSearch}
                    onChange={(e) => setAllPartiesSearch(e.target.value)}
                    style={{ paddingLeft: '34px' }}
                  />
                  <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  {allPartiesSearch && (
                    <button
                      type="button"
                      onClick={() => setAllPartiesSearch('')}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontWeight: 700 }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Type Filter */}
                <select
                  className="form-control"
                  value={allPartiesTypeFilter}
                  onChange={(e: any) => setAllPartiesTypeFilter(e.target.value)}
                  style={{ width: 'auto', minWidth: '150px' }}
                >
                  <option value="ALL">All Accounts (تمام پارٹیاں)</option>
                  <option value="CUSTOMER">Customers Only (صرف گاہک)</option>
                  <option value="SUPPLIER">Suppliers Only (صرف سپلائرز)</option>
                </select>

                {/* ⚡ Today's Activity Filter Button */}
                <button
                  type="button"
                  onClick={() => setOnlyActiveToday(!onlyActiveToday)}
                  className="btn"
                  style={{
                    backgroundColor: onlyActiveToday ? '#fef3c7' : '#f8fafc',
                    color: onlyActiveToday ? '#92400e' : '#475569',
                    border: onlyActiveToday ? '1.5px solid #d97706' : '1px solid #cbd5e1',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                  title="صرف وہ کھاتے فلٹر کریں جن میں آج کوئی لین دین یا پیمنٹ ہوئی ہے"
                >
                  <Activity size={16} color={onlyActiveToday ? '#d97706' : '#64748b'} />
                  ⚡ جن میں آج لین دین ہوا ({allPartiesList.filter((p) => p.transactedToday).length})
                  {onlyActiveToday && <span style={{ fontSize: '0.74rem', marginLeft: '4px' }}>✕</span>}
                </button>
              </div>

              {/* PDF Export */}
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
                }}
              >
                <Download size={15} /> پی ڈی ایف رپورٹ (PDF)
              </button>
            </div>
          </div>

          {/* Parties Master Table */}
          <div className="table-container" style={{ maxHeight: '680px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '45px', textAlign: 'center' }}>#</th>
                  <th>پارٹی کا نام و تفصیل (Party / Shop Name)</th>
                  <th>کھاتہ کی قسم (Account Type)</th>
                  <th>فون و پتہ (Contact & Area)</th>
                  <th style={{ textAlign: 'center' }}>آج کی سرگرمی (Today's Activity)</th>
                  <th style={{ textAlign: 'right' }}>موجودہ بقایا بیلنس (Outstanding)</th>
                  <th style={{ textAlign: 'center', width: '220px' }}>ایکشنز (Actions)</th>
                </tr>
              </thead>
              <tbody>
                {filteredAllParties.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                      کوئی کھاتہ یا پارٹی نہیں ملی۔
                    </td>
                  </tr>
                ) : (
                  filteredAllParties.map((p, idx) => (
                    <tr key={`${p.entityType}-${p.id}`} style={{ backgroundColor: p.transactedToday ? '#fffbeb' : undefined }}>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{idx + 1}</td>
                      <td>
                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.92rem' }}>
                          {p.name}
                        </div>
                        {p.ownerName && (
                          <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                            مالک / پروپرائٹر: <b>{p.ownerName}</b>
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${p.entityType === 'CUSTOMER' ? 'badge-info' : 'badge-neutral'}`} style={{ fontWeight: 800 }}>
                          {p.entityType === 'CUSTOMER' ? '👤 گاہک (Customer)' : '🏭 سپلائر (Supplier)'}
                        </span>
                        {p.isDual && (
                          <span className="badge badge-warning" style={{ marginLeft: '4px', fontSize: '0.68rem', fontWeight: 800 }}>
                            🤝 مشترکہ
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#1e293b' }}>
                          {p.phone || '-'}
                        </div>
                        {p.address && (
                          <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                            {p.address}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {p.transactedToday ? (
                          <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
                            <span className="badge badge-warning" style={{ fontSize: '0.72rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Activity size={12} /> آج ٹرانزیکشن ہوئی
                            </span>
                            <div style={{ fontSize: '0.72rem', color: '#475569' }}>
                              {p.todayCredit > 0 && <span style={{ color: '#059669', fontWeight: 700 }}>جمع: Rs. {p.todayCredit.toLocaleString()} </span>}
                              {p.todayDebit > 0 && <span style={{ color: '#dc2626', fontWeight: 700 }}>نام: Rs. {p.todayDebit.toLocaleString()}</span>}
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>-</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {p.entityType === 'CUSTOMER' ? (
                          p.receivable > 0 ? (
                            <div style={{ color: '#059669', fontWeight: 900, fontSize: '0.94rem' }}>
                              Rs. {p.receivable.toLocaleString()} <span style={{ fontSize: '0.72rem', color: '#059669' }}>(لینا ہے)</span>
                            </div>
                          ) : (
                            <span style={{ color: '#64748b', fontWeight: 700 }}>صاف (Rs. 0)</span>
                          )
                        ) : (
                          p.payable > 0 ? (
                            <div style={{ color: '#dc2626', fontWeight: 900, fontSize: '0.94rem' }}>
                              Rs. {p.payable.toLocaleString()} <span style={{ fontSize: '0.72rem', color: '#dc2626' }}>(دینا ہے)</span>
                            </div>
                          ) : (
                            <span style={{ color: '#64748b', fontWeight: 700 }}>صاف (Rs. 0)</span>
                          )
                        )}
                      </td>
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: '5px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              if (p.entityType === 'CUSTOMER') {
                                setActiveTab('CUSTOMERS');
                                setSelectedEntityId(p.id);
                              } else {
                                setActiveTab('SUPPLIERS');
                                setSelectedEntityId(p.id);
                              }
                            }}
                            className="btn btn-outline"
                            style={{
                              color: '#0284c7',
                              borderColor: '#bae6fd',
                              backgroundColor: '#f0f9ff',
                              padding: '4px 8px',
                              fontSize: '0.75rem',
                              borderRadius: '6px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                            title="اس پارٹی کا مکمل لیجر کھاتہ کھولیں"
                          >
                            <Eye size={13} /> کھاتہ
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedEntityId(p.id);
                              setPayTargetType(p.entityType);
                              setPayDirection('IN');
                              setPayAmount('');
                              setPayNotes('');
                              setPayInvoiceNumber('');
                              setShowPaymentModal(true);
                            }}
                            className="btn btn-outline"
                            style={{
                              color: '#059669',
                              borderColor: '#a7f3d0',
                              backgroundColor: '#ecfdf5',
                              padding: '4px 8px',
                              fontSize: '0.75rem',
                              borderRadius: '6px',
                              fontWeight: 800,
                              cursor: 'pointer'
                            }}
                            title="اس پارٹی سے رقم وصول کریں (Cash In)"
                          >
                            <Plus size={13} /> وصولی
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedEntityId(p.id);
                              setPayTargetType(p.entityType);
                              setPayDirection('OUT');
                              setPayAmount('');
                              setPayNotes('');
                              setPayInvoiceNumber('');
                              setShowPaymentModal(true);
                            }}
                            className="btn btn-outline"
                            style={{
                              color: '#dc2626',
                              borderColor: '#fca5a5',
                              backgroundColor: '#fef2f2',
                              padding: '4px 8px',
                              fontSize: '0.75rem',
                              borderRadius: '6px',
                              fontWeight: 800,
                              cursor: 'pointer'
                            }}
                            title="اس پارٹی کو رقم ادا کریں (Cash Out)"
                          >
                            <Minus size={13} /> ادائیگی
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'CASH_FLOW_HISTORY' ? (
        /* CASH IN & CASH OUT VOUCHERS HISTORY VIEW (POS STYLE) */
        <div className="no-print">
          {/* Top KPI Cards */}
          <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', marginBottom: '20px' }}>
            <div className="stat-card green">
              <div className="stat-label">Total Cash In (کل وصولی)</div>
              <div className="stat-value" style={{ color: '#059669' }}>
                Rs. {Number(todaySummary?.totalReceived || 0).toLocaleString()}
              </div>
              <div className="stat-sub">{todaySummary?.receivedCount || 0} وصولی واؤچرز</div>
            </div>
            <div className="stat-card red">
              <div className="stat-label">Total Cash Out (کل ادائیگی)</div>
              <div className="stat-value" style={{ color: '#dc2626' }}>
                Rs. {Number(todaySummary?.totalPaid || 0).toLocaleString()}
              </div>
              <div className="stat-sub">{todaySummary?.paidCount || 0} ادائیگی واؤچرز</div>
            </div>
            <div className="stat-card blue">
              <div className="stat-label">Net Cash Flow (خالص کیش بچت)</div>
              <div className="stat-value" style={{ color: Number(todaySummary?.netCashFlow || 0) >= 0 ? '#0284c7' : '#dc2626' }}>
                Rs. {Number(todaySummary?.netCashFlow || 0).toLocaleString()}
              </div>
              <div className="stat-sub">وصولی منفی ادائیگی</div>
            </div>
            <div className="stat-card amber">
              <div className="stat-label">Total Vouchers Today (کل واؤچرز)</div>
              <div className="stat-value">{todaySummary?.recentTransactions?.length || 0}</div>
              <div className="stat-sub">آج کے تمام کیش ٹرانزیکشنز</div>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="card" style={{ marginBottom: '20px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1, minWidth: '280px', flexWrap: 'wrap' }}>
                {/* Search */}
                <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search voucher by party, receipt #, invoice #, phone..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    style={{ paddingLeft: '34px' }}
                  />
                  <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  {historySearch && (
                    <button
                      type="button"
                      onClick={() => setHistorySearch('')}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontWeight: 700 }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Flow Filter Pills */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setHistoryTypeFilter('ALL')}
                    className={`btn btn-sm ${historyTypeFilter === 'ALL' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ fontWeight: 700 }}
                  >
                    تمام ({todaySummary?.recentTransactions?.length || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryTypeFilter('IN')}
                    className={`btn btn-sm ${historyTypeFilter === 'IN' ? 'btn-success' : 'btn-outline'}`}
                    style={{ fontWeight: 800, backgroundColor: historyTypeFilter === 'IN' ? '#16a34a' : 'transparent', color: historyTypeFilter === 'IN' ? '#fff' : '#16a34a', borderColor: '#16a34a' }}
                  >
                    🟢 صرف وصولی (In)
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryTypeFilter('OUT')}
                    className={`btn btn-sm ${historyTypeFilter === 'OUT' ? 'btn-danger' : 'btn-outline'}`}
                    style={{ fontWeight: 800, backgroundColor: historyTypeFilter === 'OUT' ? '#dc2626' : 'transparent', color: historyTypeFilter === 'OUT' ? '#fff' : '#dc2626', borderColor: '#dc2626' }}
                  >
                    🔴 صرف ادائیگی (Out)
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryTypeFilter('COUNTER')}
                    className={`btn btn-sm ${historyTypeFilter === 'COUNTER' ? 'btn-info' : 'btn-outline'}`}
                    style={{ fontWeight: 800, backgroundColor: historyTypeFilter === 'COUNTER' ? '#0284c7' : 'transparent', color: historyTypeFilter === 'COUNTER' ? '#fff' : '#0284c7', borderColor: '#0284c7' }}
                  >
                    🏪 کاؤنٹر کیش (Counter)
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryTypeFilter('VAN')}
                    className={`btn btn-sm ${historyTypeFilter === 'VAN' ? 'btn-warning' : 'btn-outline'}`}
                    style={{ fontWeight: 800, backgroundColor: historyTypeFilter === 'VAN' ? '#d97706' : 'transparent', color: historyTypeFilter === 'VAN' ? '#fff' : '#d97706', borderColor: '#d97706' }}
                  >
                    🚐 وین کیش (Van Route)
                  </button>
                </div>
              </div>

              {/* Quick Record Button */}
              {canEditLedger && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setPayDirection('IN');
                      setPayAmount('');
                      setPayNotes('');
                      setPayInvoiceNumber('');
                      setShowPaymentModal(true);
                    }}
                    className="btn btn-success btn-sm"
                    style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Plus size={15} /> 🟢 نئی وصولی (Cash In)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPayDirection('OUT');
                      setPayAmount('');
                      setPayNotes('');
                      setPayInvoiceNumber('');
                      setShowPaymentModal(true);
                    }}
                    className="btn btn-danger btn-sm"
                    style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Minus size={15} /> 🔴 نئی ادائیگی (Cash Out)
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* POS Style Vouchers Table */}
          <div className="table-container" style={{ maxHeight: '680px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '45px', textAlign: 'center' }}>#</th>
                  <th>وقت و تاریخ (Time & Date - PKT)</th>
                  <th>رسید / واؤچر # (Receipt #)</th>
                  <th>پارٹی کا نام و تفصیل (Party)</th>
                  <th>قسم (Type)</th>
                  <th>ذریعہ (Method)</th>
                  <th>تفصیل و وجہ (Narration / Reason)</th>
                  <th style={{ textAlign: 'right' }}>رقم (Amount - Rs.)</th>
                  <th style={{ textAlign: 'right' }}>باقی بیلنس (Due)</th>
                  <th style={{ textAlign: 'center', width: '130px' }}>پرنٹ رسید (Slip)</th>
                </tr>
              </thead>
              <tbody>
                {cashFlowHistoryList.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                      آج کوئی کیش واؤچر ریکارڈ نہیں ہوا۔
                    </td>
                  </tr>
                ) : (
                  cashFlowHistoryList.map((t: any, idx: number) => {
                    const isIn = t.direction === 'IN';
                    return (
                      <tr key={t.id || idx} style={{ backgroundColor: isIn ? '#f0fdf4' : '#fef2f2' }}>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{idx + 1}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.84rem' }}>
                            {formatPakistanTimeOnly(t.paymentDate)}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                            {formatPakistanDateOnly(t.paymentDate)}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 800, fontFamily: 'monospace', color: '#0369a1', fontSize: '0.84rem' }}>
                            {t.receiptNumber}
                          </div>
                          {t.invoiceNumber && t.invoiceNumber !== t.receiptNumber && (
                            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                              بل: #{t.invoiceNumber}
                            </span>
                          )}
                        </td>
                        <td>
                          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>
                            {t.partyName}
                          </div>
                          {(t.ownerName || t.phone) && (
                            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                              {t.ownerName} {t.phone && `(${t.phone})`}
                            </div>
                          )}
                        </td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              backgroundColor: isIn ? '#dcfce7' : '#fee2e2',
                              color: isIn ? '#15803d' : '#b91c1c',
                              fontWeight: 900,
                              fontSize: '0.78rem',
                              border: `1px solid ${isIn ? '#86efac' : '#fca5a5'}`
                            }}
                          >
                            {isIn ? '🟢 وصولی (Cash In)' : '🔴 ادائیگی (Cash Out)'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-start' }}>
                            <span className="badge badge-neutral" style={{ fontSize: '0.74rem', fontWeight: 700 }}>
                              {t.paymentMethod || 'CASH'}
                            </span>
                            <span
                              className="badge"
                              style={{
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                backgroundColor: t.channel === 'VAN' ? '#fef3c7' : '#f1f5f9',
                                color: t.channel === 'VAN' ? '#92400e' : '#475569',
                                border: `1px solid ${t.channel === 'VAN' ? '#fde68a' : '#e2e8f0'}`
                              }}
                            >
                              {t.channel === 'VAN' ? '🚐 وین (Van)' : '🏪 دکان (Shop)'}
                            </span>
                          </div>
                        </td>
                        <td style={{ maxWidth: '240px' }}>
                          <div style={{ fontSize: '0.82rem', color: '#334155', fontWeight: 600 }}>
                            {t.notes || '-'}
                          </div>
                          {t.recordedByName && (
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                              بذریعہ: {t.recordedByName}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 900, fontSize: '1rem', color: isIn ? '#15803d' : '#b91c1c' }}>
                            Rs. {Number(t.amount).toLocaleString()}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '0.88rem' }}>
                          Rs. {Number(t.remainingBalance || 0).toLocaleString()}
                        </td>
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            onClick={() => {
                              const receiptObj = {
                                receiptNumber: t.receiptNumber,
                                invoiceNumber: t.invoiceNumber || t.receiptNumber,
                                voucherType: t.partyType === 'CUSTOMER' ? (isIn ? 'CUSTOMER_PAYMENT' : 'CUSTOMER_REFUND') : (isIn ? 'SUPPLIER_REFUND' : 'SUPPLIER_PAYMENT'),
                                partyType: t.partyType || 'CUSTOMER',
                                channel: t.channel || 'SHOP',
                                channelLabel: t.channel === 'VAN' ? '🚐 وین سپلائی وصولی (Van Collection)' : '🏪 دکان کاؤنٹر (Shop Counter)',
                                isDualPartner: false,
                                partnerName: null,
                                partyName: t.partyName,
                                contactPerson: t.ownerName,
                                phone: t.phone,
                                address: '',
                                previousBalance: t.previousBalance || (isIn ? Number(t.remainingBalance || 0) + Number(t.amount) : Number(t.remainingBalance || 0) - Number(t.amount)),
                                paidAmount: Number(t.amount),
                                remainingBalance: Number(t.remainingBalance || 0),
                                direction: t.direction,
                                paymentMethod: t.paymentMethod || 'CASH',
                                reference: t.reference || t.receiptNumber,
                                notes: t.notes || '',
                                paymentDate: t.paymentDate,
                                recordedByName: t.recordedByName || 'Cashier / Admin',
                              };
                              setPaymentReceiptData(receiptObj);
                              setShowReceiptModal(true);
                              playPrintSound();
                            }}
                            className="btn btn-outline"
                            style={{
                              color: '#059669',
                              borderColor: '#a7f3d0',
                              backgroundColor: '#ffffff',
                              padding: '5px 10px',
                              fontSize: '0.78rem',
                              borderRadius: '6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer',
                              fontWeight: 800,
                              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                            }}
                            title="80mm POS تھرمل رسید پرنٹ کریں"
                          >
                            <Receipt size={14} /> 🖨️ رسید (80mm)
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* SINGLE ACCOUNT LEDGER VIEW (CUSTOMERS / SUPPLIERS / DUAL_PARTNERS) */
        <>
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
      <div className="table-container no-print" style={{ maxHeight: '650px', overflowY: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Date & Time (PKT)</th>
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
                      {formatPakistanDateOnly(entry.date)}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                      {formatPakistanTimeOnly(entry.date)}
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

                      {(Number(entry.credit) > 0 || Number(entry.debit) > 0 || (entry.type || '').includes('PAYMENT') || (entry.type || '').includes('CONTRA') || entry.description?.includes('Contra') || (entry.type || '').includes('ADJUSTMENT')) && (
                        <button
                          type="button"
                          onClick={() => handleOpenPaymentReceiptFromEntry(entry)}
                          className="btn btn-outline"
                          style={{
                            color: '#059669',
                            borderColor: '#a7f3d0',
                            backgroundColor: '#ecfdf5',
                            padding: '4px 8px',
                            fontSize: '0.75rem',
                            borderRadius: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                            fontWeight: 700,
                          }}
                          title="80mm POS Invoice / Receipt Slip (80mm انوائس رسید دیکھیں اور پرنٹ کریں)"
                        >
                          <Receipt size={13} />
                          Invoice / رسید
                        </button>
                      )}

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
    </>
  )}

      {/* Contra Settlement Modal (Mutual Offset) */}
      {showContraModal && dualLedgerData?.partner && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 110, padding: '16px',
          overflowY: 'auto'
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '520px',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #cbd5e1'
          }}>
            <div style={{
              padding: '14px 20px',
              borderBottom: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ArrowLeftRight size={20} color="#d97706" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  Contra Settlement / آپسی کٹائی ایڈجسٹمنٹ
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowContraModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
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

              <form id="contraOffsetForm" onSubmit={handleRecordContra}>
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
              </form>
            </div>

            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              flexShrink: 0
            }}>
              <button
                type="button"
                onClick={() => setShowContraModal(false)}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="contraOffsetForm"
                disabled={contraSubmitting || !contraAmount || parseFloat(contraAmount) <= 0}
                className="btn btn-warning"
                style={{ fontWeight: 800 }}
              >
                {contraSubmitting ? 'Posting...' : '✓ Confirm Contra Settlement (کٹائی درج کریں)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Voucher Modal (100% Scrollable & Responsive) */}
      {showPaymentModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 110,
          padding: '16px',
          overflowY: 'auto'
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '520px',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #cbd5e1'
          }}>
            {/* Header - Fixed */}
            <div style={{
              padding: '14px 20px',
              borderBottom: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Receipt size={20} color={payDirection === 'IN' ? '#16a34a' : '#dc2626'} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  {payDirection === 'IN' ? '🟢 Cash In Voucher (رقم وصولی)' : '🔴 Cash Out Voucher (رقم ادائیگی)'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div style={{ padding: '18px 20px', overflowY: 'auto', flex: 1 }}>
              {/* Cash In / Cash Out Direction Toggle Pills */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                marginBottom: '14px',
                padding: '5px',
                backgroundColor: '#f1f5f9',
                borderRadius: '10px'
              }}>
                <button
                  type="button"
                  onClick={() => setPayDirection('IN')}
                  style={{
                    padding: '9px 12px',
                    borderRadius: '7px',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '0.86rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    backgroundColor: payDirection === 'IN' ? '#16a34a' : 'transparent',
                    color: payDirection === 'IN' ? '#ffffff' : '#475569',
                    boxShadow: payDirection === 'IN' ? '0 2px 6px rgba(22, 163, 74, 0.35)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Plus size={15} /> 🟢 Cash In (وصولی)
                </button>
                <button
                  type="button"
                  onClick={() => setPayDirection('OUT')}
                  style={{
                    padding: '9px 12px',
                    borderRadius: '7px',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '0.86rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    backgroundColor: payDirection === 'OUT' ? '#dc2626' : 'transparent',
                    color: payDirection === 'OUT' ? '#ffffff' : '#475569',
                    boxShadow: payDirection === 'OUT' ? '0 2px 6px rgba(220, 38, 38, 0.35)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Minus size={15} /> 🔴 Cash Out (ادائیگی)
                </button>
              </div>

              {/* Explanatory banner for chosen direction */}
              <div style={{
                backgroundColor: payDirection === 'IN' ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${payDirection === 'IN' ? '#86efac' : '#fca5a5'}`,
                borderRadius: '8px',
                padding: '9px 12px',
                marginBottom: '14px',
                fontSize: '0.8rem',
                color: payDirection === 'IN' ? '#15803d' : '#b91c1c'
              }}>
                {payTargetType === 'CUSTOMER' ? (
                  payDirection === 'IN' ? (
                    <span>✅ <b>Cash In (وصولی):</b> کسٹمر سے رقم وصول ہوئی۔ کسٹمر کا کھاتہ <b>کریڈٹ</b> ہوگا اور سابقہ ادھار کم ہو جائے گا۔</span>
                  ) : (
                    <span>⚠️ <b>Cash Out (ادائیگی / ریفنڈ):</b> کسٹمر کو رقم ادا / واپس کی گئی۔ کسٹمر کا کھاتہ <b>ڈیبٹ</b> ہوگا اور ادھار بڑھ جائے گا۔</span>
                  )
                ) : (
                  payDirection === 'OUT' ? (
                    <span>✅ <b>Cash Out (ادائیگی):</b> سپلائر کو نقد رقم ادا کی گئی۔ سپلائر کا کھاتہ <b>ڈیبٹ</b> ہوگا اور واجب الادا رقم کم ہو جائے گی۔</span>
                  ) : (
                    <span>⚠️ <b>Cash In (سپلائر سے واپسی):</b> سپلائر سے رقم وصول ہوئی۔ سپلائر کا کھاتہ <b>کریڈٹ</b> ہوگا اور واجب الادا رقم بڑھ جائے گا۔</span>
                  )
                )}
              </div>

              {(activeTab === 'DUAL_PARTNERS' || activeTab === 'ALL_PARTIES' || activeTab === 'CASH_FLOW_HISTORY') && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                  <button
                    type="button"
                    onClick={() => setPayTargetType('CUSTOMER')}
                    className={`btn btn-sm ${payTargetType === 'CUSTOMER' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ flex: 1, fontWeight: 700 }}
                  >
                    👤 گاہک کھاتہ (Customer)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayTargetType('SUPPLIER')}
                    className={`btn btn-sm ${payTargetType === 'SUPPLIER' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ flex: 1, fontWeight: 700 }}
                  >
                    🏭 سپلائر کھاتہ (Supplier)
                  </button>
                </div>
              )}

              <form id="paymentVoucherForm" onSubmit={handleRecordPayment}>
                {/* Payment Source / Channel (Shop Counter vs Delivery Van) */}
                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>وصولی / ادائیگی کا ذریعہ (Channel / Source) *</span>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setPayChannel('SHOP')}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: payChannel === 'SHOP' ? '2px solid #0284c7' : '1px solid #cbd5e1',
                        backgroundColor: payChannel === 'SHOP' ? '#e0f2fe' : '#ffffff',
                        color: payChannel === 'SHOP' ? '#0369a1' : '#475569',
                        fontWeight: 800,
                        fontSize: '0.84rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      🏪 دکان کاؤنٹر (Shop)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayChannel('VAN')}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: payChannel === 'VAN' ? '2px solid #d97706' : '1px solid #cbd5e1',
                        backgroundColor: payChannel === 'VAN' ? '#fef3c7' : '#ffffff',
                        color: payChannel === 'VAN' ? '#92400e' : '#475569',
                        fontWeight: 800,
                        fontSize: '0.84rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      🚐 وین سے وصولی (Delivery Van)
                    </button>
                  </div>
                </div>

                {/* Party / Account Selector */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Account / Party (کھاتہ / پارٹی) *
                  </label>
                  <select
                    className="form-control"
                    value={selectedEntityId}
                    onChange={(e) => setSelectedEntityId(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Account (پارٹی منتخب کریں) --</option>
                    {activeTab === 'CUSTOMERS' || ((activeTab === 'ALL_PARTIES' || activeTab === 'CASH_FLOW_HISTORY') && payTargetType === 'CUSTOMER')
                      ? customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.shopName} ({c.ownerName}) - Outstanding Due: Rs. {Number(c.currentReceivable).toLocaleString()}
                          </option>
                        ))
                      : activeTab === 'SUPPLIERS' || ((activeTab === 'ALL_PARTIES' || activeTab === 'CASH_FLOW_HISTORY') && payTargetType === 'SUPPLIER')
                      ? suppliers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.companyName} - Payable Due: Rs. {Number(s.currentPayable).toLocaleString()}
                          </option>
                        ))
                      : dualPartners.map((dp) => (
                          <option key={dp.id} value={dp.id}>
                            🤝 {dp.name} ({dp.ownerName}) - Net: Rs. {Math.abs(dp.netBalance).toLocaleString()}
                          </option>
                        ))}
                  </select>
                </div>

                {/* Date & Time Selector */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Calendar size={14} /> Voucher Date & Time (تاریخ اور وقت - PKT)
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

                {/* Invoice / Bill # Field */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Receipt size={14} color="#0284c7" />
                    Invoice / Bill # (انوائس یا بل نمبر - اختیاری)
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. ROT-INV-1029 / Bill # (اختیاری)"
                    value={payInvoiceNumber}
                    onChange={(e) => setPayInvoiceNumber(e.target.value)}
                  />
                  <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '3px' }}>
                    اگر یہ رقم کسی مخصوص بل یا انوائس کے تحت موصول / ادا ہوئی ہے تو یہاں بل نمبر درج کریں
                  </div>
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

                {/* Auto Generate 80mm POS Receipt Checkbox */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginTop: '10px',
                  marginBottom: '10px',
                  padding: '10px 14px',
                  backgroundColor: '#f0fdf4',
                  borderRadius: '8px',
                  border: '1.5px solid #86efac'
                }}>
                  <input
                    type="checkbox"
                    id="autoPrintReceiptCheck"
                    checked={autoPrintReceipt}
                    onChange={(e) => setAutoPrintReceipt(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#16a34a' }}
                  />
                  <label htmlFor="autoPrintReceiptCheck" style={{ fontSize: '0.84rem', fontWeight: 800, color: '#166534', cursor: 'pointer', margin: 0 }}>
                    🖨️ 80mm POS رسید / انوائس خودکار تیار کریں (Auto-generate 80mm POS Invoice)
                  </label>
                </div>
              </form>
            </div>

            {/* Footer - Fixed */}
            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              flexShrink: 0
            }}>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="btn btn-outline"
              >
                Cancel (منسوخ)
              </button>
              <button
                type="submit"
                form="paymentVoucherForm"
                disabled={paySubmitting}
                className="btn btn-primary"
                style={{
                  fontWeight: 800,
                  backgroundColor: payDirection === 'IN' ? '#16a34a' : '#dc2626',
                  borderColor: payDirection === 'IN' ? '#15803d' : '#b91c1c'
                }}
              >
                {paySubmitting ? 'Posting...' : '✓ Post Voucher (واؤچر درج کریں)'}
              </button>
            </div>
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
                          ? formatPakistanDateTime(selectedEntryDetail.sale.saleDate)
                          : selectedEntryDetail.purchase?.purchaseDate
                          ? formatPakistanDateTime(selectedEntryDetail.purchase.purchaseDate)
                          : selectedEntryDetail.payment?.paymentDate
                          ? formatPakistanDateTime(selectedEntryDetail.payment.paymentDate)
                          : selectedEntryDetail.rawEntry?.date
                          ? formatPakistanDateTime(selectedEntryDetail.rawEntry.date)
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
                      Date: {formatPakistanDateTime(new Date())}
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
                        <td style={{ padding: '5px 6px' }}>{formatPakistanDateTime(e.date)}</td>
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

      {/* Instant Payment Receipt / Slip Voucher Modal */}
      {showReceiptModal && paymentReceiptData && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 130, padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '460px',
            maxWidth: '96%',
            maxHeight: '94vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)'
          }}>
            {/* Modal Controls Bar (Hidden during print) */}
            <div className="no-print" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 20px',
              borderBottom: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Receipt size={20} color="#059669" />
                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                  Payment Receipt / کھاتہ رسید
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    playPrintSound();
                    window.print();
                  }}
                  className="btn btn-primary btn-sm"
                  style={{
                    backgroundColor: '#059669',
                    borderColor: '#047857',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Printer size={15} /> Print Slip (پرنٹ رسید)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowReceiptModal(false);
                    setPaymentReceiptData(null);
                  }}
                  className="btn btn-outline btn-sm"
                  style={{ padding: '4px 8px' }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Scrollable Printable Thermal Receipt Container */}
            <div style={{ padding: '20px 16px', overflowY: 'auto' }}>
              <style>{`
                @media print {
                  body * { visibility: hidden !important; }
                  #ledger-80mm-receipt, #ledger-80mm-receipt * { visibility: visible !important; }
                  #ledger-80mm-receipt {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    max-width: 80mm !important;
                    margin: 0 auto !important;
                    padding: 4mm !important;
                  }
                }
              `}</style>
              <div id="ledger-80mm-receipt" className="printable-area thermal-receipt" style={{
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
                  <div style={{
                    marginTop: '8px',
                    display: 'inline-block',
                    padding: '3px 12px',
                    border: '1.5px solid #000',
                    borderRadius: '4px',
                    fontWeight: 900,
                    fontSize: '11px',
                    backgroundColor: '#f1f5f9'
                  }}>
                    {paymentReceiptData.voucherType === 'CONTRA_VOUCHER'
                      ? '🤝 CONTRA OFFSET / آپسی کٹائی واؤچر'
                      : paymentReceiptData.direction === 'IN'
                      ? '💵 80mm POS CASH RECEIPT / وصولی انوائس رسید'
                      : '💸 80mm POS PAYMENT VOUCHER / ادائیگی انوائس واؤچر'}
                  </div>
                </div>

                {/* Receipt Metadata */}
                <div style={{ borderBottom: '1px dashed #000000', paddingBottom: '8px', marginBottom: '8px', fontSize: '11px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span><b>INV / REC #:</b> {paymentReceiptData.invoiceNumber || paymentReceiptData.receiptNumber || '-'}</span>
                    <span>
                      <b>DATE:</b> {formatPakistanDateTime(paymentReceiptData.paymentDate)}
                    </span>
                  </div>
                  {paymentReceiptData.invoiceNumber && paymentReceiptData.invoiceNumber !== paymentReceiptData.receiptNumber && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px', color: '#0369a1', fontWeight: 800 }}>
                      <span><b>BILL / INV REF:</b> {paymentReceiptData.invoiceNumber}</span>
                      <span><b>VOUCHER #:</b> {paymentReceiptData.receiptNumber}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px' }}>
                    <span><b>PARTY:</b> {paymentReceiptData.partyName || '-'}</span>
                    <span><b>TYPE:</b> {paymentReceiptData.isDualPartner ? 'مشترکہ کھاتہ' : (paymentReceiptData.partyType === 'CUSTOMER' ? 'گاہک' : 'سپلائر')}</span>
                  </div>
                  {paymentReceiptData.contactPerson && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px' }}>
                      <span><b>OWNER:</b> {paymentReceiptData.contactPerson}</span>
                      <span><b>PH:</b> {paymentReceiptData.phone || '-'}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px' }}>
                    <span><b>MODE:</b> {paymentReceiptData.paymentMethod || 'CASH'}</span>
                    <span><b>CHANNEL:</b> {paymentReceiptData.channel === 'VAN' ? '🚐 وین سپلائی وصولی' : '🏪 دکان کاؤنٹر'}</span>
                  </div>
                  {paymentReceiptData.reference && paymentReceiptData.reference !== '-' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px' }}>
                      <span><b>REF:</b> {paymentReceiptData.reference}</span>
                    </div>
                  )}
                </div>

                {/* Financial Details (Sabqa, Ada/Wasool, and Baqaya) */}
                <div style={{ marginBottom: '10px' }}>
                  {paymentReceiptData.voucherType === 'CONTRA_VOUCHER' ? (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px dotted #ccc' }}>
                        <span>Customer Bal (سابقہ لینا):</span>
                        <b>Rs. {Number(paymentReceiptData.previousReceivable || 0).toLocaleString()}</b>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px dotted #ccc' }}>
                        <span>Supplier Bal (سابقہ دینا):</span>
                        <b>Rs. {Number(paymentReceiptData.previousPayable || 0).toLocaleString()}</b>
                      </div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '6px 8px',
                        backgroundColor: '#eff6ff',
                        border: '1px dashed #3b82f6',
                        borderRadius: '4px',
                        fontWeight: 900,
                        margin: '6px 0',
                        fontSize: '12px'
                      }}>
                        <span>آپسی کٹائی رقم (Offset Amount):</span>
                        <span style={{ color: '#1d4ed8' }}>Rs. {Number(paymentReceiptData.paidAmount || 0).toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px dotted #ccc' }}>
                        <span>New Cust Receivable (باقی لینا):</span>
                        <b>Rs. {Number(paymentReceiptData.newReceivable || 0).toLocaleString()}</b>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px dotted #ccc' }}>
                        <span>New Supp Payable (باقی دینا):</span>
                        <b>Rs. {Number(paymentReceiptData.newPayable || 0).toLocaleString()}</b>
                      </div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '6px 8px',
                        backgroundColor: '#f8fafc',
                        border: '1.5px solid #000',
                        borderRadius: '4px',
                        fontWeight: 900,
                        marginTop: '6px',
                        fontSize: '13px'
                      }}>
                        <span>خالص باقی مشترکہ بیلنس:</span>
                        <span>Rs. {Math.abs(Number(paymentReceiptData.remainingBalance || 0)).toLocaleString()} {paymentReceiptData.remainingBalance > 0 ? '(لینا ہے)' : paymentReceiptData.remainingBalance < 0 ? '(دینا ہے)' : '(صاف)'}</span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {/* Previous Due / Balance */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '4px 0',
                        fontSize: '12px',
                        borderBottom: '1px dotted #94a3b8'
                      }}>
                        <span>سابقہ بقایا رقم (Previous Due):</span>
                        <b>Rs. {Number(paymentReceiptData.previousBalance || 0).toLocaleString()}</b>
                      </div>

                      {/* Paid / Received Amount */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '7px 8px',
                        margin: '7px 0',
                        backgroundColor: paymentReceiptData.direction === 'IN' ? '#ecfdf5' : '#fef2f2',
                        border: paymentReceiptData.direction === 'IN' ? '1.5px solid #059669' : '1.5px solid #dc2626',
                        borderRadius: '6px',
                        fontWeight: 900,
                        fontSize: '13px'
                      }}>
                        <span>
                          {paymentReceiptData.direction === 'IN' ? 'وصول شدہ رقم (Received Amount):' : 'ادا شدہ رقم (Paid Amount):'}
                        </span>
                        <span style={{
                          color: paymentReceiptData.direction === 'IN' ? '#047857' : '#b91c1c',
                          fontSize: '14px'
                        }}>
                          Rs. {Number(paymentReceiptData.paidAmount || 0).toLocaleString()}
                        </span>
                      </div>

                      {/* Remaining Balance / Net Due */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 10px',
                        backgroundColor: Number(paymentReceiptData.remainingBalance || 0) > 0 ? '#fffbeb' : '#f8fafc',
                        border: '2px solid #000000',
                        borderRadius: '6px',
                        fontWeight: 900,
                        fontSize: '13px',
                        marginTop: '6px'
                      }}>
                        <span>
                          {paymentReceiptData.partyType === 'SUPPLIER'
                            ? 'باقی واجب الادا (Payable Balance):'
                            : 'خالص باقی ادھار (Remaining Due):'}
                        </span>
                        <span style={{
                          color: Number(paymentReceiptData.remainingBalance || 0) > 0 ? '#b45309' : '#059669',
                          fontSize: '15px'
                        }}>
                          Rs. {Number(paymentReceiptData.remainingBalance || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Narration / Notes */}
                {paymentReceiptData.notes && (
                  <div style={{
                    borderTop: '1px dashed #000000',
                    paddingTop: '6px',
                    marginBottom: '10px',
                    fontSize: '10px'
                  }}>
                    <b>تفصیل / وجہ (Narration):</b> {paymentReceiptData.notes}
                  </div>
                )}

                {/* Operator info */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '9px',
                  color: '#475569',
                  borderTop: '1px dotted #cbd5e1',
                  paddingTop: '4px',
                  marginBottom: '14px'
                }}>
                  <span>Recorded By: <b>{paymentReceiptData.recordedByName || 'Admin'}</b></span>
                  <span>Rafiq Auto ERP</span>
                </div>

                {/* Barcode / Receipt Reference */}
                <div style={{ textAlign: 'center', marginTop: '14px', marginBottom: '4px' }}>
                  <div style={{ letterSpacing: '4px', fontSize: '13px', fontWeight: 900, color: '#000000' }}>
                    ||| | ||||| |||| | |||||| |||||
                  </div>
                  <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '1px', marginTop: '2px' }}>
                    * {paymentReceiptData.invoiceNumber || paymentReceiptData.receiptNumber} *
                  </div>
                </div>

                {/* Signature Lines */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '14px',
                  marginTop: '14px',
                  paddingTop: '10px',
                  borderTop: '1px dashed #000000',
                  textAlign: 'center',
                  fontSize: '10px'
                }}>
                  <div>
                    <div style={{ borderBottom: '1px solid #000000', height: '20px' }}></div>
                    <div style={{ marginTop: '4px', fontWeight: 700 }}>دستخط وصول کنندہ</div>
                    <div style={{ fontSize: '8px', color: '#64748b' }}>(Receiver Sign)</div>
                  </div>
                  <div>
                    <div style={{ borderBottom: '1px solid #000000', height: '20px' }}></div>
                    <div style={{ marginTop: '4px', fontWeight: 700 }}>دستخط دکاندار / کیشئر</div>
                    <div style={{ fontSize: '8px', color: '#64748b' }}>(Store / Cashier Stamp)</div>
                  </div>
                </div>

                {/* Bottom Notice */}
                <div style={{ textAlign: 'center', fontSize: '9px', marginTop: '12px', color: '#334155' }}>
                  <div>* یہ کمپیوٹرائزڈ رسید رفیق آٹو اینڈ آئل ٹریڈرز اوکاڑہ کے سسٹم سے جاری کی گئی ہے *</div>
                  <div style={{ marginTop: '4px', fontSize: '8px', color: '#64748b' }}>
                    Thank You For Your Business! | Rafiq Auto ERP
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer (Screen View) */}
            <div className="no-print" style={{
              padding: '12px 20px',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Thermal 80mm POS Receipt Ready
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    playPrintSound();
                    window.print();
                  }}
                  className="btn btn-primary btn-sm"
                  style={{
                    backgroundColor: '#059669',
                    borderColor: '#047857',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Printer size={15} /> پرنٹ 80mm رسید (Print 80mm Slip)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowReceiptModal(false);
                    setPaymentReceiptData(null);
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ fontWeight: 700 }}
                >
                  بند کریں (Close)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
