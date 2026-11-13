import React, { useEffect, useState, useRef } from 'react';
import api from '../services/api';
import { Sale, Customer, Product } from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  ShoppingCart, Eye, Printer, Filter, CheckCircle2, 
  XCircle, History, Search, RefreshCw, AlertTriangle,
  Edit3, RotateCcw, Plus, Trash2, Save,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Download
} from 'lucide-react';
import { exportSalesPDF } from '../utils/pdfExportUtils';
import { SearchableProductSelect } from '../components/SearchableProductSelect';
import { playPrintSound } from '../utils/soundEffects';

export const SalesListPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const hasCustomPerms = Boolean(user?.permissions && Array.isArray(user.permissions) && user.permissions.length > 0);
  const canEditInvoice = isAdmin || (hasCustomPerms ? Boolean(user?.permissions?.includes('action:edit_invoice')) : user?.role === 'OPERATOR');
  const canDeleteInvoice = isAdmin || (hasCustomPerms ? Boolean(user?.permissions?.includes('action:delete_invoice')) : false);

  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSaleType, setFilterSaleType] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination & Database Totals
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(50);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [filterPendingDelivery, setFilterPendingDelivery] = useState<boolean>(false);
  const [counts, setCounts] = useState<{
    all: number;
    counter: number;
    van: number;
    counterCash: number;
    counterCredit: number;
    vanCash: number;
    vanCredit: number;
    pendingDelivery: number;
    counterCashTotal: number;
    counterCreditTotal: number;
    vanCashTotal: number;
    vanCreditTotal: number;
  }>({
    all: 0,
    counter: 0,
    van: 0,
    counterCash: 0,
    counterCredit: 0,
    vanCash: 0,
    vanCredit: 0,
    pendingDelivery: 0,
    counterCashTotal: 0,
    counterCreditTotal: 0,
    vanCashTotal: 0,
    vanCreditTotal: 0,
  });
  const isInitialMount = useRef(true);

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
  const [editSaleType, setEditSaleType] = useState<'COUNTER' | 'VAN'>('VAN');
  const [editItems, setEditItems] = useState<Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    unitType: string;
  }>>([]);
  const [editDiscount, setEditDiscount] = useState<number | string>(0);
  const [editReceivedAmount, setEditReceivedAmount] = useState<number | string>(0);
  const [editPaymentMethod, setEditPaymentMethod] = useState('CASH');
  const [editSaleDate, setEditSaleDate] = useState('');
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
  const [refundCashAmount, setRefundCashAmount] = useState<number | string>(0);
  const [processingReturn, setProcessingReturn] = useState(false);

  // Warranty Claims & Defective Store States
  const [isClaimReturn, setIsClaimReturn] = useState(false);
  const [claimResolution, setClaimResolution] = useState<'REFUND' | 'REPLACEMENT'>('REFUND');
  const [claimCategory, setClaimCategory] = useState<'OIL' | 'NON_OIL'>('NON_OIL');

  // Delivery Handover Modal State
  const [deliverModalSale, setDeliverModalSale] = useState<Sale | null>(null);
  const [deliveringProcessing, setDeliveringProcessing] = useState(false);
  const [deliveryNotesInput, setDeliveryNotesInput] = useState('');

  // Active View Tab: Sales Register vs Warranty Claims
  const [activeViewTab, setActiveViewTab] = useState<'SALES' | 'CLAIMS'>('SALES');
  const [claimsList, setClaimsList] = useState<any[]>([]);
  const [claimsSummary, setClaimsSummary] = useState<any>(null);
  const [loadingClaims, setLoadingClaims] = useState(false);
  const [selectedClaimForDump, setSelectedClaimForDump] = useState<any>(null);
  const [dumpLitersInput, setDumpLitersInput] = useState<string>('');

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
    fetchSales(1, limit, '', '', '', '', '');
    fetchSettings();
    loadCustomers();
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchSales(1, limit, search, filterSaleType, filterStatus, startDate, endDate, filterPendingDelivery);
    }, 400);
    return () => clearTimeout(timer);
  }, [search, startDate, endDate]);

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

  const fetchSales = async (
    targetPage: number = currentPage,
    targetLimit: number = limit,
    targetSearch: string = search,
    targetSaleType: string = filterSaleType,
    targetStatus: string = filterStatus,
    targetStartDate: string = startDate,
    targetEndDate: string = endDate,
    targetPendingDelivery: boolean = filterPendingDelivery
  ) => {
    try {
      setLoading(true);
      const params: any = {
        page: targetPage,
        limit: targetLimit,
      };
      if (targetSearch.trim()) params.search = targetSearch.trim();
      if (targetSaleType) params.saleType = targetSaleType;
      if (targetStatus) params.status = targetStatus;
      if (targetStartDate) params.startDate = targetStartDate;
      if (targetEndDate) params.endDate = targetEndDate;
      if (targetPendingDelivery) params.pendingDelivery = 'true';

      const res = await api.get('/sales', { params });
      const saleList = res.data?.data || [];
      setSales(saleList);

      if (res.data?.pagination) {
        setTotalCount(res.data.pagination.total || 0);
        setTotalPages(res.data.pagination.totalPages || 1);
        setCurrentPage(res.data.pagination.page || targetPage);
      } else {
        setTotalCount(saleList.length);
        setTotalPages(1);
        setCurrentPage(1);
      }

      if (res.data?.counts) {
        setCounts(res.data.counts);
      }
    } catch (e) {
      console.error('Failed to load sales invoices:', e);
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
    playPrintSound();
    window.print();
  };

  const handleCancelSale = async (saleId: string) => {
    if (!canDeleteInvoice && !canEditInvoice) {
      alert('Aapke pas invoice cancel karne ki ijazat nahi hai (No Permission).');
      return;
    }
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
    if (!canDeleteInvoice) {
      alert('Aapke pas invoice delete karne ki ijazat nahi hai (No Delete Permission).');
      return;
    }
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
    if (!canEditInvoice) {
      alert('Aapke pas invoice edit karne ki ijazat nahi hai (No Edit Permission).');
      return;
    }
    loadCustomers();
    loadProducts();
    setEditModalSale(sale);
    setEditCustomerId(sale.customerId);
    setEditSaleType((sale.saleType as any) || 'VAN');
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
    const dt = sale.saleDate ? new Date(sale.saleDate) : new Date((sale as any).createdAt || Date.now());
    const offset = dt.getTimezoneOffset() * 60000;
    setEditSaleDate(new Date(dt.getTime() - offset).toISOString().slice(0, 16));
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
      updated[index].quantity = val;
    } else if (field === 'unitPrice') {
      updated[index].unitPrice = val;
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
        saleDate: editSaleDate ? new Date(editSaleDate).toISOString() : undefined,
        items: editItems.map((it) => ({
          productId: it.productId,
          quantity: parseFloat(String(it.quantity)) || 0,
          unitPrice: parseFloat(String(it.unitPrice)) || 0,
          unitType: it.unitType,
        })),
        saleType: editSaleType,
        discount: parseFloat(String(editDiscount)) || 0,
        receivedAmount: parseFloat(String(editReceivedAmount)) || 0,
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
    if (!canEditInvoice) {
      alert('Aapke pas order return process karne ki ijazat nahi hai (No Edit Permission).');
      return;
    }
    setReturnModalSale(sale);
    setReturnReason('Wrong Item Delivered');
    setCustomReasonNotes('');
    setRefundCashAmount(0);
    setIsClaimReturn(false);
    setClaimResolution('REFUND');
    setClaimCategory('NON_OIL');
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

  const handleReturnQtyChange = (index: number, qty: any) => {
    const updated = [...returnItems];
    updated[index].returnQty = qty;
    setReturnItems(updated);
  };

  const calculateReturnTotal = () => {
    return returnItems.reduce((acc, it) => acc + (parseFloat(String(it.returnQty)) || 0) * (parseFloat(String(it.unitPrice)) || 0), 0);
  };

  const handleProcessSalesReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnModalSale) return;

    const itemsToReturn = returnItems
      .filter((it) => (parseFloat(String(it.returnQty)) || 0) > 0)
      .map((it) => ({
        productId: it.productId,
        quantity: parseFloat(String(it.returnQty)) || 0,
        unitPrice: parseFloat(String(it.unitPrice)) || 0,
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
        refundAmount: isClaimReturn && claimResolution === 'REPLACEMENT' ? 0 : (parseFloat(String(refundCashAmount)) || 0),
        isClaim: isClaimReturn,
        claimResolution: isClaimReturn ? claimResolution : undefined,
        claimCategory: isClaimReturn ? claimCategory : undefined,
      });

      sessionStorage.removeItem('rot_cached_products');

      if (isClaimReturn) {
        triggerOperationSuccess(`Warranty Claim kamyabi se record ho gaya! Defective stock alag "Claims & Defective Store" me darj ho gaya.`);
        loadClaims();
      } else {
        triggerOperationSuccess(`Order Return kamyabi se record ho gaya! Stock godown me wapis jama ho gaya aur customer ledger update ho gaya.`);
      }
      setReturnModalSale(null);
      fetchSales();
    } catch (err: any) {
      triggerOperationError(err.response?.data?.message || 'Return process nahi ho saka.');
    } finally {
      setProcessingReturn(false);
    }
  };

  const loadClaims = async () => {
    try {
      setLoadingClaims(true);
      const res = await api.get('/sales/claims');
      if (res.data?.success) {
        setClaimsList(res.data.claims || []);
        setClaimsSummary(res.data.summary || null);
      }
    } catch (e) {
      console.error('Failed to load claims', e);
    } finally {
      setLoadingClaims(false);
    }
  };

  const handleClaimDisposition = async (claimId: string, action: string, dumpLiters?: number) => {
    try {
      const res = await api.post(`/sales/claims/${claimId}/disposition`, {
        action,
        dumpLiters,
        dispositionNotes: action === 'SENT_TO_COMPANY' ? 'Dispatched to company / vendor' : undefined,
      });
      if (res.data?.success) {
        triggerOperationSuccess(res.data.message || 'Claim disposition updated!');
        loadClaims();
        setSelectedClaimForDump(null);
      }
    } catch (err: any) {
      triggerOperationError(err.response?.data?.message || 'Failed to update claim disposition');
    }
  };

  const handleDeliverPendingSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliverModalSale) return;

    try {
      setDeliveringProcessing(true);
      const res = await api.post(`/sales/${deliverModalSale.id}/update-delivery`, {
        markAllDelivered: true,
        deliveryNotes: deliveryNotesInput.trim() || undefined,
      });
      if (res.data?.success) {
        triggerOperationSuccess(`Invoice #${deliverModalSale.invoiceNumber} ka saman kamyabi se delivered mark ho gaya!`);
        setDeliverModalSale(null);
        setDeliveryNotesInput('');
        fetchSales();
      }
    } catch (err: any) {
      triggerOperationError(err.response?.data?.message || 'Delivery update failed');
    } finally {
      setDeliveringProcessing(false);
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

  const handleFilterSaleTypeChange = (newType: string) => {
    setFilterSaleType(newType);
    setFilterPendingDelivery(false);
    setCurrentPage(1);
    fetchSales(1, limit, search, newType, filterStatus, startDate, endDate, false);
  };

  const handleTogglePendingDelivery = () => {
    const nextPending = !filterPendingDelivery;
    setFilterPendingDelivery(nextPending);
    if (nextPending) {
      setFilterSaleType('');
    }
    setCurrentPage(1);
    fetchSales(1, limit, search, nextPending ? '' : filterSaleType, filterStatus, startDate, endDate, nextPending);
  };

  const handleFilterStatusChange = (newStatus: string) => {
    setFilterStatus(newStatus);
    setCurrentPage(1);
    fetchSales(1, limit, search, filterSaleType, newStatus, startDate, endDate, filterPendingDelivery);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return;
    setCurrentPage(newPage);
    fetchSales(newPage, limit, search, filterSaleType, filterStatus, startDate, endDate, filterPendingDelivery);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setCurrentPage(1);
    fetchSales(1, newLimit, search, filterSaleType, filterStatus, startDate, endDate, filterPendingDelivery);
  };

  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [];
    if (currentPage <= 4) {
      pages.push(1, 2, 3, 4, 5, '...', totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }
    return pages;
  };

  const filteredSales = filterPendingDelivery
    ? sales.filter(s => s.notes?.includes('PENDING_DELIVERY'))
    : sales;

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
        {/* Quick Filter Buttons for Counter vs Van Sales & Cash/Credit Breakdown */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginRight: '4px' }}>
            Filter Sales:
          </span>
          <button
            type="button"
            onClick={() => handleFilterSaleTypeChange('')}
            className={`btn btn-sm ${filterSaleType === '' && !filterPendingDelivery ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontWeight: 700, borderRadius: '20px', padding: '5px 14px' }}
          >
            📋 All Sales ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => handleFilterSaleTypeChange('COUNTER_CASH')}
            className={`btn btn-sm ${filterSaleType === 'COUNTER_CASH' && !filterPendingDelivery ? 'btn-success' : 'btn-outline'}`}
            style={{ fontWeight: 700, borderRadius: '20px', padding: '5px 14px' }}
            title="Counter Cash Sales (Full Paid)"
          >
            🏪 Counter Cash ({counts.counterCash} | Rs. {Number(counts.counterCashTotal || 0).toLocaleString()})
          </button>
          <button
            type="button"
            onClick={() => handleFilterSaleTypeChange('COUNTER_CREDIT')}
            className={`btn btn-sm ${filterSaleType === 'COUNTER_CREDIT' && !filterPendingDelivery ? 'btn-warning' : 'btn-outline'}`}
            style={{ fontWeight: 700, borderRadius: '20px', padding: '5px 14px' }}
            title="Counter Credit Sales (Udhar Remaining)"
          >
            🏪 Counter Udhar ({counts.counterCredit} | Rs. {Number(counts.counterCreditTotal || 0).toLocaleString()})
          </button>
          <button
            type="button"
            onClick={() => handleFilterSaleTypeChange('VAN_CASH')}
            className={`btn btn-sm ${filterSaleType === 'VAN_CASH' && !filterPendingDelivery ? 'btn-info' : 'btn-outline'}`}
            style={{ fontWeight: 700, borderRadius: '20px', padding: '5px 14px' }}
            title="Van Cash Sales (Full Paid)"
          >
            🚐 Van Cash ({counts.vanCash} | Rs. {Number(counts.vanCashTotal || 0).toLocaleString()})
          </button>
          <button
            type="button"
            onClick={() => handleFilterSaleTypeChange('VAN_CREDIT')}
            className={`btn btn-sm ${filterSaleType === 'VAN_CREDIT' && !filterPendingDelivery ? 'btn-secondary' : 'btn-outline'}`}
            style={{ fontWeight: 700, borderRadius: '20px', padding: '5px 14px' }}
            title="Van Credit Sales (Udhar Remaining)"
          >
            🚐 Van Udhar ({counts.vanCredit} | Rs. {Number(counts.vanCreditTotal || 0).toLocaleString()})
          </button>
          <button
            type="button"
            onClick={handleTogglePendingDelivery}
            className={`btn btn-sm ${filterPendingDelivery ? 'btn-warning' : 'btn-outline'}`}
            style={{
              fontWeight: 800,
              borderRadius: '20px',
              padding: '5px 14px',
              backgroundColor: filterPendingDelivery ? '#f59e0b' : '#fffbeb',
              color: filterPendingDelivery ? '#ffffff' : '#b45309',
              borderColor: '#f59e0b',
              boxShadow: filterPendingDelivery ? '0 2px 6px rgba(245, 158, 11, 0.3)' : 'none'
            }}
            title="Show only orders with pending delivery items (صرف پینڈنگ ڈلیوری والے بل دکھائیں)"
          >
            ⏳ Pending Delivery Only ({counts.pendingDelivery})
          </button>
          <button
            type="button"
            onClick={() => {
              if (activeViewTab !== 'CLAIMS') {
                setActiveViewTab('CLAIMS');
                loadClaims();
              } else {
                setActiveViewTab('SALES');
              }
            }}
            className={`btn btn-sm ${activeViewTab === 'CLAIMS' ? 'btn-primary' : 'btn-outline'}`}
            style={{
              fontWeight: 700,
              borderRadius: '20px',
              padding: '5px 14px',
              backgroundColor: activeViewTab === 'CLAIMS' ? '#7c3aed' : '#ffffff',
              color: activeViewTab === 'CLAIMS' ? '#ffffff' : '#7c3aed',
              borderColor: '#7c3aed',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            🛡️ Claims Store
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', flex: 1 }}>
            {/* Search Box */}
            <div style={{ position: 'relative', minWidth: '220px', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                className="form-control"
                placeholder="Search by invoice # or customer shop name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    setCurrentPage(1);
                    fetchSales(1, limit, search, filterSaleType, filterStatus, startDate, endDate, filterPendingDelivery);
                  }
                }}
                style={{ paddingLeft: '32px', paddingRight: search ? '30px' : '10px', height: '38px', fontSize: '0.85rem' }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setCurrentPage(1);
                    fetchSales(1, limit, '', filterSaleType, filterStatus, startDate, endDate, filterPendingDelivery);
                  }}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    fontSize: '0.9rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    padding: '2px 6px',
                  }}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            <select
              className="form-control"
              value={filterPendingDelivery ? 'PENDING_ONLY' : filterSaleType}
              onChange={(e) => {
                if (e.target.value === 'PENDING_ONLY') {
                  setFilterPendingDelivery(true);
                  setFilterSaleType('');
                  setCurrentPage(1);
                  fetchSales(1, limit, search, '', filterStatus, startDate, endDate, true);
                } else {
                  setFilterPendingDelivery(false);
                  handleFilterSaleTypeChange(e.target.value);
                }
              }}
              style={{ width: 'auto', minWidth: '165px', height: '38px', fontSize: '0.85rem' }}
            >
              <option value="">All Types (تمام بل)</option>
              <option value="COUNTER_CASH">🏪 Counter Cash (نقد کاؤنٹر)</option>
              <option value="COUNTER_CREDIT">🏪 Counter Udhar (ادھار کاؤنٹر)</option>
              <option value="VAN_CASH">🚐 Van Cash (نقد وین)</option>
              <option value="VAN_CREDIT">🚐 Van Udhar (ادھار وین)</option>
              <option value="COUNTER">🏪 All Counter Sales (تمام کاؤنٹر)</option>
              <option value="VAN">🚐 All Van Sales (تمام وین)</option>
              <option value="PENDING_ONLY">⏳ Pending Delivery Only (صرف امانت بل)</option>
            </select>

            <select
              className="form-control"
              value={filterStatus}
              onChange={(e) => handleFilterStatusChange(e.target.value)}
              style={{ width: 'auto', minWidth: '140px', height: '38px', fontSize: '0.85rem' }}
            >
              <option value="">All Statuses</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>

            {/* Date Range: From */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>From:</span>
              <input
                type="date"
                className="form-control"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                  fetchSales(1, limit, search, filterSaleType, filterStatus, e.target.value, endDate);
                }}
                style={{ width: 'auto', height: '38px', fontSize: '0.85rem' }}
              />
            </div>

            {/* Date Range: To */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>To:</span>
              <input
                type="date"
                className="form-control"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                  fetchSales(1, limit, search, filterSaleType, filterStatus, startDate, e.target.value);
                }}
                style={{ width: 'auto', height: '38px', fontSize: '0.85rem' }}
              />
            </div>

            {(search || filterSaleType || filterStatus || startDate || endDate || filterPendingDelivery) && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setFilterSaleType('');
                  setFilterPendingDelivery(false);
                  setFilterStatus('');
                  setStartDate('');
                  setEndDate('');
                  setCurrentPage(1);
                  fetchSales(1, limit, '', '', '', '', '', false);
                }}
                className="btn btn-outline btn-sm"
                style={{ height: '38px', color: '#ef4444', borderColor: '#fca5a5' }}
              >
                Reset
              </button>
            )}

            <button
              onClick={() => fetchSales(currentPage, limit, search, filterSaleType, filterStatus, startDate, endDate, filterPendingDelivery)}
              className="btn btn-secondary"
              title="Refresh Invoices"
              disabled={loading}
              style={{ height: '38px' }}
            >
              <RefreshCw size={16} className={loading ? 'spin' : ''} />
            </button>
          </div>

          {/* Download Sales PDF */}
          <button
            type="button"
            onClick={() => exportSalesPDF(sales, `Sales Invoices List (${sales.length} Bills)`)}
            className="btn btn-outline"
            style={{
              height: '38px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 700,
              color: '#0284c7',
              borderColor: '#38bdf8',
              backgroundColor: '#f0f9ff'
            }}
          >
            <Download size={16} /> Download Sales PDF ({sales.length})
          </button>
        </div>
      </div>

      {activeViewTab === 'CLAIMS' ? (
        <div>
          {/* Claims Executive Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Total Warranty Claims</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#7c3aed', marginTop: '4px' }}>
                {claimsSummary?.totalClaims ?? claimsList.length}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>Total claimed cases logged</div>
            </div>

            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', border: '1.5px solid #fde68a', boxShadow: '0 2px 6px rgba(217, 119, 6, 0.08)' }}>
              <div style={{ fontSize: '0.8rem', color: '#b45309', fontWeight: 700 }}>Currently In Defective Store</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#d97706', marginTop: '4px' }}>
                {claimsSummary?.quarantinedCount ?? claimsList.filter((c) => c.claimStatus === 'IN_QUARANTINE').length}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#b45309', marginTop: '2px' }}>Awaiting company action or disposal</div>
            </div>

            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', border: '1.5px solid #fecaca', boxShadow: '0 2px 6px rgba(220, 38, 38, 0.08)' }}>
              <div style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 700 }}>Total Claim Replacement Loss</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#dc2626', marginTop: '4px' }}>
                Rs. {Number(claimsSummary?.totalClaimLoss ?? 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#991b1b', marginTop: '2px' }}>Cost of replacement stock given to customers</div>
            </div>
          </div>

          {/* Claims Table Container */}
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Claim # / Inv #</th>
                  <th>Customer</th>
                  <th>Item & Quantity</th>
                  <th>Type</th>
                  <th>Resolution & Loss</th>
                  <th>Status</th>
                  <th>Actions (اسٹاک کا کیا کیا؟)</th>
                </tr>
              </thead>
              <tbody>
                {loadingClaims ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                      Loading warranty claims...
                    </td>
                  </tr>
                ) : claimsList.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                      No warranty claims found in system.
                    </td>
                  </tr>
                ) : (
                  claimsList.map((c) => {
                    const isOil = c.claimCategory === 'OIL' || c.items.some((it: any) => (it.category || '').toLowerCase().includes('oil') || (it.category || '').toLowerCase().includes('lubricant'));
                    const isQuarantine = c.claimStatus === 'IN_QUARANTINE';

                    return (
                      <tr key={c.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{new Date(c.returnDate).toLocaleDateString()}</div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                            {new Date(c.returnDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 800, color: '#7c3aed', fontFamily: 'monospace' }}>{c.returnNumber}</div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Inv #{c.originalInvoice}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{c.customer?.shopName}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>📞 {c.customer?.phone}</div>
                        </td>
                        <td>
                          {c.items.map((it: any, iIdx: number) => (
                            <div key={iIdx} style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                              • {it.productName}{' '}
                              <span style={{ color: '#d97706', fontWeight: 800 }}>({it.quantity} {it.unitSymbol})</span>
                            </div>
                          ))}
                        </td>
                        <td>
                          <span className={`badge ${isOil ? 'badge-info' : 'badge-secondary'}`} style={{ fontSize: '0.7rem' }}>
                            {isOil ? '🧴 Oil' : '🔧 Non-Oil'}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>
                            {c.resolution === 'REPLACEMENT' ? '📦 Replacement Stock' : '💵 Refund / Credit'}
                          </div>
                          {c.lossAmount > 0 && (
                            <div style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 800 }}>
                              Loss: Rs. {Number(c.lossAmount).toLocaleString()}
                            </div>
                          )}
                        </td>
                        <td>
                          {c.claimStatus === 'IN_QUARANTINE' && (
                            <span style={{ backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800 }}>
                              ⚠️ In Quarantine Store
                            </span>
                          )}
                          {c.claimStatus === 'SENT_TO_COMPANY' && (
                            <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800 }}>
                              🏢 Sent to Company
                            </span>
                          )}
                          {c.claimStatus === 'RESOLVED_REPLACED' && (
                            <span style={{ backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #86efac', padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800 }}>
                              ✅ Company Replaced
                            </span>
                          )}
                          {c.claimStatus === 'RESOLVED_RESTOCKED' && (
                            <span style={{ backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800 }}>
                              🔧 Repaired & Restocked
                            </span>
                          )}
                          {c.claimStatus === 'SCRAPPED_LOSS' && (
                            <span style={{ backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800 }}>
                              🗑️ Scrapped Loss
                            </span>
                          )}
                          {c.claimStatus === 'DUMPED_IN_DRUM' && (
                            <span style={{ backgroundColor: '#ede9fe', color: '#6d28d9', border: '1px solid #ddd6fe', padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800 }}>
                              🛢️ Dumped in Drum
                            </span>
                          )}
                        </td>
                        <td>
                          {isQuarantine ? (
                            isOil ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedClaimForDump(c);
                                  const totalLtr = c.items.reduce((acc: number, it: any) => acc + (it.quantity * (Number(it.conversionFactor) || 1)), 0);
                                  setDumpLitersInput(String(totalLtr || ''));
                                }}
                                className="btn btn-sm"
                                style={{
                                  backgroundColor: '#f59e0b',
                                  color: '#0f172a',
                                  fontWeight: 800,
                                  fontSize: '0.74rem',
                                  padding: '4px 8px',
                                  border: 'none',
                                  borderRadius: '6px',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                🛢️ Dump in Loose Drum
                              </button>
                            ) : (
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                <button
                                  type="button"
                                  onClick={() => handleClaimDisposition(c.id, 'SENT_TO_COMPANY')}
                                  className="btn btn-sm btn-outline"
                                  style={{ padding: '2px 6px', fontSize: '0.7rem', fontWeight: 700 }}
                                  title="Send to company / supplier for warranty replacement"
                                >
                                  🏢 Sent to Co.
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleClaimDisposition(c.id, 'COMPANY_REPLACED')}
                                  className="btn btn-sm"
                                  style={{ backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #86efac', padding: '2px 6px', fontSize: '0.7rem', fontWeight: 800 }}
                                  title="Company gave replacement item -> Restores stock and clears loss"
                                >
                                  ✅ Co. Replaced
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleClaimDisposition(c.id, 'REPAIRED_RESTORED')}
                                  className="btn btn-sm"
                                  style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', padding: '2px 6px', fontSize: '0.7rem', fontWeight: 700 }}
                                  title="Item was repaired and returned to sellable stock"
                                >
                                  🔧 Repaired
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleClaimDisposition(c.id, 'SCRAP_LOSS')}
                                  className="btn btn-sm"
                                  style={{ backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', padding: '2px 6px', fontSize: '0.7rem', fontWeight: 700 }}
                                  title="Scrap item as confirmed loss"
                                >
                                  🗑️ Scrap
                                </button>
                              </div>
                            )
                          ) : (
                            <span style={{ fontSize: '0.74rem', color: '#64748b' }}>✓ Disposition Handled</span>
                          )}
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
        <>
          <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Date</th>
              <th>Customer / Shop</th>
              <th>Salesman / Type</th>
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
                    <div>{s.invoiceNumber}</div>
                    {s.notes?.includes('PENDING_DELIVERY') && (
                      <div style={{ marginTop: '2px' }}>
                        <span style={{
                          backgroundColor: '#fffbeb',
                          color: '#b45309',
                          border: '1px solid #fde68a',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          whiteSpace: 'nowrap',
                          display: 'inline-block'
                        }}>
                          ⚠️ Pending Order
                        </span>
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{new Date(s.saleDate).toLocaleDateString()}</div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                      {new Date(s.saleDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </div>
                  </td>
                  <td style={{ fontWeight: 600 }}>{s.customer?.shopName}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{s.salesman?.fullName || 'Direct Counter'}</div>
                    <div style={{ marginTop: '2px' }}>
                      {s.saleType === 'COUNTER' ? (
                        <span className="badge badge-success" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                          🏪 Counter
                        </span>
                      ) : (
                        <span className="badge badge-info" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                          🚐 Van
                        </span>
                      )}
                    </div>
                  </td>
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
                    {s.notes?.includes('"status":"PENDING_DELIVERY"') && (
                      <div style={{ marginTop: '3px' }}>
                        <span style={{
                          backgroundColor: '#fef3c7',
                          color: '#b45309',
                          border: '1px solid #fde68a',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          whiteSpace: 'nowrap',
                          display: 'inline-block'
                        }}>
                          ⏳ Pending Delivery
                        </span>
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                      {s.notes?.includes('"status":"PENDING_DELIVERY"') && (
                        <button
                          type="button"
                          onClick={() => setDeliverModalSale(s)}
                          className="btn btn-sm"
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#fef3c7',
                            color: '#b45309',
                            border: '1px solid #fde68a',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            whiteSpace: 'nowrap'
                          }}
                          title="Deliver pending items to customer"
                        >
                          📦 Deliver
                        </button>
                      )}
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

      {/* Pagination Controls */}
      {totalCount > 0 && (
        <div
          className="card"
          style={{
            marginTop: '16px',
            marginBottom: '20px',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            border: '1px solid #e2e8f0',
          }}
        >
          {/* Summary / Range Info */}
          <div style={{ fontSize: '0.88rem', color: '#475569', fontWeight: 600 }}>
            Showing{' '}
            <span style={{ fontWeight: 800, color: '#0f172a' }}>
              {(currentPage - 1) * limit + 1}
            </span>{' '}
            to{' '}
            <span style={{ fontWeight: 800, color: '#0f172a' }}>
              {Math.min(currentPage * limit, totalCount)}
            </span>{' '}
            of{' '}
            <span style={{ fontWeight: 800, color: '#d97706' }}>
              {totalCount}
            </span>{' '}
            invoices &nbsp;
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>
              (Page {currentPage} of {totalPages})
            </span>
          </div>

          {/* Page Navigation Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {/* First Page */}
            <button
              type="button"
              onClick={() => handlePageChange(1)}
              disabled={currentPage <= 1 || loading}
              className="btn btn-outline btn-sm"
              style={{
                padding: '6px 10px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                opacity: currentPage <= 1 ? 0.4 : 1,
                cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
              }}
              title="First Page (Pehla Page)"
            >
              <ChevronsLeft size={16} />
            </button>

            {/* Prev Page */}
            <button
              type="button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1 || loading}
              className="btn btn-outline btn-sm"
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                opacity: currentPage <= 1 ? 0.4 : 1,
                cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
              title="Previous Page (Pichla Page)"
            >
              <ChevronLeft size={15} /> Prev
            </button>

            {/* Page Number Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {getPageNumbers().map((pNum, idx) =>
                pNum === '...' ? (
                  <span
                    key={`ellipsis-${idx}`}
                    style={{ padding: '0 6px', color: '#94a3b8', fontWeight: 700, fontSize: '0.85rem' }}
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={`page-${pNum}`}
                    type="button"
                    onClick={() => handlePageChange(Number(pNum))}
                    disabled={loading}
                    className="btn btn-sm"
                    style={{
                      padding: '5px 12px',
                      borderRadius: '8px',
                      fontSize: '0.84rem',
                      fontWeight: 800,
                      backgroundColor: currentPage === pNum ? '#d97706' : '#f8fafc',
                      color: currentPage === pNum ? '#ffffff' : '#334155',
                      border: currentPage === pNum ? '1px solid #d97706' : '1px solid #cbd5e1',
                      minWidth: '36px',
                      boxShadow: currentPage === pNum ? '0 2px 6px rgba(217, 119, 6, 0.35)' : 'none',
                    }}
                  >
                    {pNum}
                  </button>
                )
              )}
            </div>

            {/* Next Page */}
            <button
              type="button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || loading}
              className="btn btn-outline btn-sm"
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                opacity: currentPage >= totalPages ? 0.4 : 1,
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
              title="Next Page (Agla Page)"
            >
              Next <ChevronRight size={15} />
            </button>

            {/* Last Page */}
            <button
              type="button"
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage >= totalPages || loading}
              className="btn btn-outline btn-sm"
              style={{
                padding: '6px 10px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                opacity: currentPage >= totalPages ? 0.4 : 1,
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
              }}
              title="Last Page (Aakhri Page)"
            >
              <ChevronsRight size={16} />
            </button>
          </div>

          {/* Rows Per Page Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#475569', fontWeight: 700 }}>
            <span>Per page:</span>
            <select
              className="form-control form-control-sm"
              style={{ width: '85px', padding: '5px 8px', fontWeight: 700, borderRadius: '8px' }}
              value={limit}
              onChange={(e) => handleLimitChange(Number(e.target.value))}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>
        </div>
      )}
        </>
      )}

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
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px' }}>
                  <span><b>TYPE:</b> <b>{selectedSale.saleType === 'COUNTER' ? 'COUNTER SALE (SHOP)' : 'VAN SALE (FIELD)'}</b></span>
                </div>
                {selectedSale.notes?.includes('"status":"PENDING_DELIVERY"') && (
                  <div style={{
                    marginTop: '6px',
                    padding: '5px 8px',
                    backgroundColor: '#fffbeb',
                    border: '1.5px dashed #b45309',
                    borderRadius: '4px',
                    textAlign: 'center',
                    fontWeight: 900,
                    fontSize: '11px',
                    color: '#b45309'
                  }}>
                    ⚠️ ORDER PENDING (امانت / ڈلیوری باقی ہے)
                    <div style={{ fontSize: '9px', fontWeight: 600, marginTop: '2px', color: '#78350f' }}>
                      Status: Delivery Pending (بعد میں سامان وصولی)
                    </div>
                  </div>
                )}
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
              {/* Customer, Sale Type & Date Selection */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: '14px', marginBottom: '18px' }}>
                <div>
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

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
                    Sale Type (سیلز قسم):
                  </label>
                  <select
                    className="form-control"
                    value={editSaleType}
                    onChange={(e) => setEditSaleType(e.target.value as any)}
                  >
                    <option value="COUNTER">🏪 Counter Sale (Shop)</option>
                    <option value="VAN">🚐 Van Sale (Field)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
                    Invoice Date & Time (تاریخ / وقت):
                  </label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    value={editSaleDate}
                    onChange={(e) => setEditSaleDate(e.target.value)}
                    required
                  />
                </div>
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
                        const lineTotal = (parseFloat(String(item.quantity)) || 0) * (parseFloat(String(item.unitPrice)) || 0);
                        return (
                          <tr key={idx}>
                            <td style={{ minWidth: '220px' }}>
                              <SearchableProductSelect
                                products={products}
                                value={item.productId}
                                onChange={(val) => handleEditItemChange(idx, 'productId', val)}
                                required
                                placeholder="Type to search product..."
                              />
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
                                step="any"
                                min="0.001"
                                className="form-control"
                                value={item.quantity}
                                onChange={(e) => handleEditItemChange(idx, 'quantity', e.target.value)}
                                required
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                step="any"
                                min="0"
                                className="form-control"
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
                    step="any"
                    min="0"
                    className="form-control"
                    value={editDiscount}
                    onChange={(e) => setEditDiscount(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                    Received Cash / Payment (Rs.):
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    className="form-control"
                    value={editReceivedAmount}
                    onChange={(e) => setEditReceivedAmount(e.target.value)}
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
              {/* Return Type Toggle: Standard Return vs Warranty Claim */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                marginBottom: '16px',
                padding: '6px',
                backgroundColor: '#f1f5f9',
                borderRadius: '10px'
              }}>
                <button
                  type="button"
                  onClick={() => setIsClaimReturn(false)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    backgroundColor: !isClaimReturn ? '#2563eb' : 'transparent',
                    color: !isClaimReturn ? '#ffffff' : '#475569',
                    transition: 'all 0.15s ease'
                  }}
                >
                  🔄 Standard Return (عام کسٹمر واپسی)
                </button>
                <button
                  type="button"
                  onClick={() => setIsClaimReturn(true)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    backgroundColor: isClaimReturn ? '#7c3aed' : 'transparent',
                    color: isClaimReturn ? '#ffffff' : '#475569',
                    transition: 'all 0.15s ease'
                  }}
                >
                  🛡️ Warranty Claim (وارنٹی / کلیم - خراب مال)
                </button>
              </div>

              {/* Warranty Claim Specific Settings */}
              {isClaimReturn && (
                <div style={{
                  backgroundColor: '#faf5ff',
                  border: '1.5px solid #d8b4fe',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  marginBottom: '16px'
                }}>
                  <div style={{ fontWeight: 800, color: '#6b21a8', fontSize: '0.86rem', marginBottom: '8px' }}>
                    🛡️ کلیم سیٹلمنٹ کی قسم (Claim Resolution Option):
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setClaimResolution('REFUND')}
                      style={{
                        padding: '8px',
                        borderRadius: '6px',
                        border: '1px solid',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        backgroundColor: claimResolution === 'REFUND' ? '#9333ea' : '#ffffff',
                        color: claimResolution === 'REFUND' ? '#ffffff' : '#6b21a8',
                        borderColor: claimResolution === 'REFUND' ? '#9333ea' : '#d8b4fe'
                      }}
                    >
                      💵 Refund / Credit Khata (پیسے واپس یا کھاتہ جمع)
                    </button>
                    <button
                      type="button"
                      onClick={() => setClaimResolution('REPLACEMENT')}
                      style={{
                        padding: '8px',
                        borderRadius: '6px',
                        border: '1px solid',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        backgroundColor: claimResolution === 'REPLACEMENT' ? '#9333ea' : '#ffffff',
                        color: claimResolution === 'REPLACEMENT' ? '#ffffff' : '#6b21a8',
                        borderColor: claimResolution === 'REPLACEMENT' ? '#9333ea' : '#d8b4fe'
                      }}
                    >
                      📦 Replacement Stock (نیا مال بدلے میں دینا)
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#6b21a8' }}>پروڈکٹ کی قسم:</span>
                    <button
                      type="button"
                      onClick={() => setClaimCategory('NON_OIL')}
                      style={{
                        padding: '3px 10px',
                        borderRadius: '6px',
                        border: '1px solid',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: claimCategory === 'NON_OIL' ? '#6b21a8' : '#ffffff',
                        color: claimCategory === 'NON_OIL' ? '#ffffff' : '#6b21a8',
                        borderColor: '#6b21a8',
                        cursor: 'pointer'
                      }}
                    >
                      🔧 فلٹر / پارٹس / دیگر
                    </button>
                    <button
                      type="button"
                      onClick={() => setClaimCategory('OIL')}
                      style={{
                        padding: '3px 10px',
                        borderRadius: '6px',
                        border: '1px solid',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: claimCategory === 'OIL' ? '#6b21a8' : '#ffffff',
                        color: claimCategory === 'OIL' ? '#ffffff' : '#6b21a8',
                        borderColor: '#6b21a8',
                        cursor: 'pointer'
                      }}
                    >
                      🧴 انجن آئل / لیوبریکنٹ
                    </button>
                  </div>

                  {claimResolution === 'REPLACEMENT' ? (
                    <div style={{ fontSize: '0.78rem', color: '#9333ea', backgroundColor: '#f3e8ff', padding: '8px', borderRadius: '6px' }}>
                      ⚠️ <b>نیا مال بدلے میں دینے کی صورت:</b> گاہک کو فری فریش یونٹ دیا جائے گا۔ خراب مال قابل فروخت اسٹاک میں واپس نہیں جائے گا بلکہ "Warranty Claims & Defective Store" میں محفوظ ہوگا، اور بدلے میں دیے گئے نئے یونٹ کی لاگت (Purchase Cost) کمپنی کے کلیم لاس میں منہا ہوگی۔
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.78rem', color: '#9333ea', backgroundColor: '#f3e8ff', padding: '8px', borderRadius: '6px' }}>
                      ℹ️ خراب مال وارنٹی کلیمز لسٹ میں الگ رہے گا، اور گاہک کو نقد ریفنڈ یا کھاتے میں کریڈٹ مل جائے گا۔
                    </div>
                  )}
                </div>
              )}

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
                              step="any"
                              className="form-control"
                              min="0"
                              max={item.soldQty}
                              value={item.returnQty}
                              onChange={(e) => handleReturnQtyChange(idx, e.target.value)}
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
                    step="any"
                    className="form-control"
                    min="0"
                    max={calculateReturnTotal()}
                    value={refundCashAmount}
                    onChange={(e) => setRefundCashAmount(e.target.value)}
                    placeholder="0 if adjusting in customer balance ledger"
                  />
                  <small style={{ color: '#64748b', fontSize: '0.75rem' }}>
                    Leave 0 agar customer ke khate (ledger) me credit karna ho.
                  </small>
                </div>

                <div style={{ backgroundColor: '#f1f5f9', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.85rem', color: '#475569' }}>Ledger Balance Adjustment:</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#059669', marginTop: '4px' }}>
                    Rs. {(calculateReturnTotal() - (parseFloat(String(refundCashAmount)) || 0)).toLocaleString()} Credit
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
                  style={{
                    backgroundColor: isClaimReturn ? '#7c3aed' : '#b45309',
                    borderColor: isClaimReturn ? '#7c3aed' : '#b45309',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <RotateCcw size={16} />{' '}
                  {processingReturn
                    ? 'Processing...'
                    : isClaimReturn
                    ? (claimResolution === 'REPLACEMENT' ? '🛡️ Confirm Claim & Give Replacement Unit' : '🛡️ Confirm Claim Refund')
                    : 'Confirm Return & Restore Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📦 DELIVER PENDING ITEMS MODAL */}
      {deliverModalSale && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 120, padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '16px',
            width: '600px',
            maxWidth: '95%',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div>
                <span className="badge badge-warning" style={{ marginBottom: '4px' }}>Amanat / Pending Delivery</span>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                  Handover Items for Invoice #{deliverModalSale.invoiceNumber}
                </h3>
                <p style={{ margin: '3px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                  Customer: <b>{deliverModalSale.customer?.shopName}</b> (📞 {deliverModalSale.customer?.phone})
                </p>
              </div>
              <button
                onClick={() => setDeliverModalSale(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleDeliverPendingSale}>
              <div style={{
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '8px',
                padding: '12px 14px',
                marginBottom: '16px'
              }}>
                <div style={{ fontWeight: 800, color: '#92400e', fontSize: '0.86rem', marginBottom: '6px' }}>
                  ⏳ Billed Items Pending Delivery:
                </div>
                {(() => {
                  let pItems: any[] = [];
                  try {
                    const match = (deliverModalSale.notes || '').match(/\[DELIVERY_META:(.*?)\]/);
                    if (match) {
                      const meta = JSON.parse(match[1]);
                      pItems = (meta.items || []).filter((it: any) => it.status !== 'DELIVERED');
                    }
                  } catch (e) {}

                  if (pItems.length === 0) {
                    pItems = (deliverModalSale.items || []).map((it: any) => ({
                      productName: it.product?.name || 'Product',
                      quantity: it.quantity,
                      unitType: it.unitType || 'SECONDARY',
                    }));
                  }

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {pItems.map((pi: any, idx: number) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#0f172a', padding: '2px 0' }}>
                          <span style={{ fontWeight: 600 }}>• {pi.productName}</span>
                          <span style={{ fontWeight: 800, color: '#b45309' }}>
                            {pi.quantity} {pi.unitType === 'PRIMARY' ? 'Ctn' : 'Pc'}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>
                  Handover Notes / Received By (اختیاری تفصیل):
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Saman dukaan par bhaijiya / Driver ko hawale kiya"
                  value={deliveryNotesInput}
                  onChange={(e) => setDeliveryNotesInput(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setDeliverModalSale(null)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deliveringProcessing}
                  className="btn btn-success"
                  style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  ✓ {deliveringProcessing ? 'Updating...' : 'Mark Handed Over (سب سامان دے دیا)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🛢️ DUMP IN LOOSE OIL DRUM MODAL */}
      {selectedClaimForDump && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 130, padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '16px',
            width: '480px',
            maxWidth: '95%',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div>
                <span className="badge badge-info" style={{ marginBottom: '4px' }}>Reclaimed Mixed Oil Drum</span>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                  Dump Claimed Oil into Drum
                </h3>
              </div>
              <button
                onClick={() => setSelectedClaimForDump(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}
              >
                ×
              </button>
            </div>

            <div>
              <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '14px' }}>
                Yeh claimed / defective engine oil <b>Reclaimed Loose Oil Drum (ڈرم کا کھلا آئل)</b> me shamil kar diya jaye ga aur POS billing screen par sab se upar frokht ke liye mojood hoga.
              </p>

              <div className="form-group" style={{ marginBottom: '18px' }}>
                <label className="form-label" style={{ fontWeight: 800, fontSize: '0.85rem' }}>
                  Liters to Dump into Drum (کتنے لیٹر ڈرم میں ڈالے؟):
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.1"
                  className="form-control"
                  placeholder="e.g. 4 or 20"
                  value={dumpLitersInput}
                  onChange={(e) => setDumpLitersInput(e.target.value)}
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedClaimForDump(null)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const ltrs = parseFloat(dumpLitersInput) || undefined;
                    handleClaimDisposition(selectedClaimForDump.id, 'DUMP_IN_DRUM', ltrs);
                  }}
                  className="btn btn-primary"
                  style={{ backgroundColor: '#f59e0b', borderColor: '#f59e0b', color: '#0f172a', fontWeight: 800 }}
                >
                  🛢️ Confirm Dump in Drum
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

