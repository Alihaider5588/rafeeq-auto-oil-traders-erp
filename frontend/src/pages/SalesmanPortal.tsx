import React, { useEffect, useState, useRef } from 'react';
import api, { getMediaUrl } from '../services/api';
import { Customer, Product } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Smartphone,
  CheckCircle,
  Plus,
  Minus,
  Trash2,
  Send,
  AlertCircle,
  Clock,
  Sparkles,
  Layers,
  History,
  UserCheck,
  UserPlus,
  ShoppingBag,
  Store,
  Printer,
  Percent,
  X,
  Search,
  RefreshCw,
  AlertTriangle,
  Truck,
  ChevronDown,
  ChevronUp,
  Bookmark,
  FileText
} from 'lucide-react';

export interface PosDraftOrder {
  id: string;
  name: string;
  customer: Customer | null;
  cart: CartItem[];
  receivedPayment: number | string;
  paymentMethod: 'CASH' | 'ONLINE' | 'CHEQUE';
  isCounterSale?: boolean;
  notes: string;
  totalBill: number;
  itemsCount: number;
  createdAt: string;
}

interface ExtendedProduct extends Product {
  conversionFactor?: number;
  primaryUnit?: { id: string; name: string; symbol: string };
}

interface CartItem {
  product: ExtendedProduct;
  quantity: number | string;
  unitType: 'PRIMARY' | 'SECONDARY';
  unitPrice: number | string;
  standardRate: number;
  discountPercent?: number;
  rateInfo?: {
    hasHistory: boolean;
    suggestedRate: number;
    standardRate: number;
    previousInvoice?: string;
    previousDate?: string;
  };
}

// Dedicated clock component to prevent re-rendering the entire POS page every 1 second
const PosLiveClock: React.FC = React.memo(() => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{
      textAlign: 'right',
      backgroundColor: '#0f172a',
      padding: '8px 14px',
      borderRadius: '10px',
      border: '1px solid #334155'
    }}>
      <div style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
        <Clock size={12} /> POS Date & Time
      </div>
      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f59e0b', marginTop: '2px' }}>
        {time.toLocaleDateString()} {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
      </div>
    </div>
  );
});

export const SalesmanPortal: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<ExtendedProduct[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [receivedPayment, setReceivedPayment] = useState<number | string>(0);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'ONLINE' | 'CHEQUE'>('CASH');
  const [isCounterSale, setIsCounterSale] = useState<boolean>(false);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [searchProduct, setSearchProduct] = useState('');
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const rateCacheRef = useRef<Record<string, any>>({});

  // Category, Full Bill & Product Discount States
  const [discountScope, setDiscountScope] = useState<'FULL_BILL' | 'CATEGORY' | 'PRODUCT'>('FULL_BILL');
  const [discountCategory, setDiscountCategory] = useState<string>('');
  const [discountProductId, setDiscountProductId] = useState<string>('');
  const [discountPercent, setDiscountPercent] = useState<string>('0');
  const [appliedDiscountSummary, setAppliedDiscountSummary] = useState<string>('');
  const [posSaleDate, setPosSaleDate] = useState<string>(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });

  // Post-Sync Generated Invoice Receipt Modal
  const [completedSale, setCompletedSale] = useState<any>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState<boolean>(false);
  const [settings, setSettings] = useState<any>(null);

  // Active Van Delivery Route & Loaded Stock State
  const [activeVan, setActiveVan] = useState<any>(null);
  const [showVanDetails, setShowVanDetails] = useState<boolean>(true);

  // Quick Add Customer Modal
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [quickCustForm, setQuickCustForm] = useState({
    shopName: '',
    ownerName: '',
    phone: '',
    address: '',
    area: '',
    creditLimit: '100000',
  });

  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const canDeleteDraft = isAdmin || Boolean(user?.permissions?.includes('action:delete_draft')) || Boolean(user?.permissions?.includes('action:delete_invoice'));

  // Saved Draft Orders State
  const [drafts, setDrafts] = useState<PosDraftOrder[]>(() => {
    try {
      const saved = localStorage.getItem('rot_pos_draft_orders');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [showDraftsModal, setShowDraftsModal] = useState<boolean>(false);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);

  // Selected Van Product Id for highlighting
  const [selectedVanProductId, setSelectedVanProductId] = useState<string | null>(null);

  // Quick Adjust Credit Limit Modal
  const [showCreditLimitModal, setShowCreditLimitModal] = useState(false);
  const [newCreditLimitInput, setNewCreditLimitInput] = useState('');
  const [updatingCreditLimit, setUpdatingCreditLimit] = useState(false);
  const [creditLimitSuccessMsg, setCreditLimitSuccessMsg] = useState('');

  const renderFieldErrorTag = (fieldName: string) => {
    if (!fieldErrors[fieldName]) return null;
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        backgroundColor: '#fee2e2',
        color: '#b91c1c',
        padding: '3px 8px',
        borderRadius: '6px',
        fontSize: '0.74rem',
        fontWeight: 700,
        marginTop: '4px',
        border: '1px solid #fca5a5'
      }}>
        <span>⚠️ yaha par mistake ho rai ha:</span> {fieldErrors[fieldName]}
      </div>
    );
  };

  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadData();

    // Restore active cart session backup if user navigated to another tab and came back
    try {
      const backupStr = localStorage.getItem('rot_pos_active_cart_backup');
      if (backupStr) {
        const backup = JSON.parse(backupStr);
        if (backup && Array.isArray(backup.cart) && backup.cart.length > 0 && (Date.now() - (backup.savedAt || 0) < 24 * 60 * 60 * 1000)) {
          setCart(backup.cart);
          if (backup.customer) setSelectedCustomer(backup.customer);
          if (backup.receivedPayment !== undefined) setReceivedPayment(backup.receivedPayment);
          if (backup.paymentMethod) setPaymentMethod(backup.paymentMethod);
          if (backup.isCounterSale !== undefined) setIsCounterSale(backup.isCounterSale);
          if (backup.notes) setNotes(backup.notes);
          if (backup.activeDraftId) setActiveDraftId(backup.activeDraftId);
          setSuccessMsg('ℹ️ Pichli session ka in-progress order restore kar diya gaya hai!');
          setTimeout(() => setSuccessMsg(''), 4000);
        }
      }
    } catch (e) {}
  }, []);

  // Keep active cart backup synced so navigating away preserves everything
  useEffect(() => {
    if (cart.length > 0) {
      try {
        localStorage.setItem('rot_pos_active_cart_backup', JSON.stringify({
          cart,
          customer: selectedCustomer,
          receivedPayment,
          paymentMethod,
          isCounterSale,
          notes,
          activeDraftId,
          savedAt: Date.now()
        }));
      } catch (e) {}
    } else if (!activeDraftId) {
      try {
        localStorage.removeItem('rot_pos_active_cart_backup');
      } catch (e) {}
    }
  }, [cart, selectedCustomer, receivedPayment, paymentMethod, isCounterSale, notes, activeDraftId]);

  const sanitizeCustomerList = (list: any[]): Customer[] => {
    if (!Array.isArray(list)) return [];
    return list.map((c) => {
      const isWalk = !c || c.phone === '00000000000' || c.shopName?.toLowerCase().includes('walk-in') || c.id === 'walk-in';
      if (isWalk) {
        return {
          ...c,
          currentReceivable: 0,
          creditLimit: 0,
          openingBalance: 0,
        };
      }
      return c;
    });
  };

  const loadData = async (force: boolean = false) => {
    try {
      const now = Date.now();
      const CACHE_TTL = 15 * 60 * 1000; // 15 minutes cache

      if (!force) {
        const cachedProdStr = sessionStorage.getItem('rot_cached_products');
        const cachedCustStr = sessionStorage.getItem('rot_cached_customers');
        let hasValidProds = false;
        let hasValidCusts = false;

        if (cachedProdStr) {
          try {
            const parsed = JSON.parse(cachedProdStr);
            if (now - parsed.timestamp < CACHE_TTL && Array.isArray(parsed.data) && parsed.data.length > 0) {
              setProducts(parsed.data);
              hasValidProds = true;
            }
          } catch (e) {}
        }

        if (cachedCustStr) {
          try {
            const parsed = JSON.parse(cachedCustStr);
            if (now - parsed.timestamp < CACHE_TTL && Array.isArray(parsed.data) && parsed.data.length > 0) {
              setCustomers(sanitizeCustomerList(parsed.data));
              hasValidCusts = true;
            }
          } catch (e) {}
        }

        if (hasValidProds && hasValidCusts) {
          api.get('/logistics/active-van').then(r => {
            setActiveVan(r.data?.activeVan || null);
          }).catch(() => {});
          const cachedSettings = sessionStorage.getItem('rot_cached_settings');
          if (cachedSettings) {
            try { setSettings(JSON.parse(cachedSettings)); return; } catch (e) {}
          }
        }
      }

      setSyncing(true);
      const [cRes, pRes, sRes, vanRes] = await Promise.all([
        api.get('/partners/customers'),
        api.get('/products?limit=1500'),
        api.get('/settings').catch(() => null),
        api.get('/logistics/active-van').catch(() => null),
      ]);

      setActiveVan(vanRes?.data?.activeVan || null);

      if (cRes?.data?.customers) {
        const sanitized = sanitizeCustomerList(cRes.data.customers);
        setCustomers(sanitized);
        try {
          sessionStorage.setItem('rot_cached_customers', JSON.stringify({ data: sanitized, timestamp: now }));
        } catch (e) {}
      }

      if (pRes?.data?.data) {
        setProducts(pRes.data.data);
        try {
          sessionStorage.setItem('rot_cached_products', JSON.stringify({ data: pRes.data.data, timestamp: now }));
        } catch (e) {}
      }

      if (sRes?.data?.settings) {
        setSettings(sRes.data.settings);
        try {
          sessionStorage.setItem('rot_cached_settings', JSON.stringify(sRes.data.settings));
        } catch (e) {}
      }
    } catch (e) {
      console.error('Error loading salesman data', e);
    } finally {
      setSyncing(false);
    }
  };

  const fetchCustomerRate = async (customerId: string, productId: string, unitType: 'PRIMARY' | 'SECONDARY') => {
    if (!customerId || customerId === 'walk-in') return null;
    const cacheKey = `${customerId}:${productId}:${unitType}`;
    if (rateCacheRef.current[cacheKey]) {
      return rateCacheRef.current[cacheKey];
    }
    try {
      const res = await api.get('/sales/customer-rate', {
        params: { customerId, productId, unitType }
      });
      if (res.data?.success) {
        rateCacheRef.current[cacheKey] = res.data;
      }
      return res.data;
    } catch {
      return null;
    }
  };

  const addToCart = (product: ExtendedProduct) => {
    if (fieldErrors.cart) setFieldErrors(prev => ({ ...prev, cart: '' }));
    const existingIndex = cart.findIndex((item) => item.product.id === product.id);
    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].quantity = (parseFloat(String(updated[existingIndex].quantity)) || 0) + 1;
      setCart(updated);
      return;
    }

    const conv = Number(product.conversionFactor) || 1;
    const hasPrimary = (!!product.primaryUnit || !!product.primaryUnitId) && conv > 1;
    // Default to PRIMARY unit (Carton) if configured, else SECONDARY (Piece)
    const defaultUnit: 'PRIMARY' | 'SECONDARY' = hasPrimary ? 'PRIMARY' : 'SECONDARY';

    const standardBase = Number(product.salePrice);
    const defaultStandardRate = defaultUnit === 'PRIMARY' ? standardBase * conv : standardBase;
    const isWalkIn = !selectedCustomer || selectedCustomer.id === 'walk-in' || selectedCustomer.phone === '00000000000' || selectedCustomer.shopName.toLowerCase().includes('walk-in');

    const cacheKey = selectedCustomer ? `${selectedCustomer.id}:${product.id}:${defaultUnit}` : '';
    const cachedRate = cacheKey ? rateCacheRef.current[cacheKey] : null;
    const initialPrice = cachedRate?.suggestedRate ? Number(cachedRate.suggestedRate) : defaultStandardRate;

    // Instantly add to cart with primary unit (Carton) as default if available
    setCart(prev => [
      ...prev,
      {
        product,
        quantity: 1,
        unitType: defaultUnit,
        unitPrice: initialPrice,
        standardRate: defaultStandardRate,
        rateInfo: cachedRate || undefined,
      },
    ]);

    // Asynchronously update with negotiated rate in background if available
    if (!isWalkIn && selectedCustomer && !cachedRate) {
      fetchCustomerRate(selectedCustomer.id, product.id, defaultUnit).then(rateInfo => {
        if (rateInfo?.suggestedRate) {
          setCart(curCart =>
            curCart.map(it =>
              it.product.id === product.id && it.unitType === defaultUnit
                ? { ...it, unitPrice: Number(rateInfo.suggestedRate), rateInfo }
                : it
            )
          );
        }
      });
    }
  };

  const handleUnitChange = (index: number, newUnit: 'PRIMARY' | 'SECONDARY') => {
    const item = cart[index];
    const conv = Number(item.product.conversionFactor) || 1;
    const standardBase = Number(item.product.salePrice);
    const newStandardRate = newUnit === 'PRIMARY' ? standardBase * conv : standardBase;

    const isWalkIn = !selectedCustomer || selectedCustomer.id === 'walk-in' || selectedCustomer.phone === '00000000000' || selectedCustomer.shopName.toLowerCase().includes('walk-in');
    const cacheKey = selectedCustomer ? `${selectedCustomer.id}:${item.product.id}:${newUnit}` : '';
    const cachedRate = cacheKey ? rateCacheRef.current[cacheKey] : null;

    let targetPrice = cachedRate?.suggestedRate ? Number(cachedRate.suggestedRate) : 0;
    if (!targetPrice) {
      if (item.unitType !== newUnit) {
        const currentItemPrice = parseFloat(String(item.unitPrice)) || 0;
        if (newUnit === 'PRIMARY') {
          targetPrice = currentItemPrice > 0 ? Math.round(currentItemPrice * conv) : newStandardRate;
        } else {
          targetPrice = currentItemPrice > 0 ? Math.round(currentItemPrice / conv) : newStandardRate;
        }
      } else {
        targetPrice = newStandardRate;
      }
    }

    const updated = [...cart];
    updated[index] = {
      ...item,
      unitType: newUnit,
      unitPrice: targetPrice,
      standardRate: newStandardRate,
      rateInfo: cachedRate || undefined,
    };
    setCart(updated);

    if (!isWalkIn && selectedCustomer && !cachedRate) {
      fetchCustomerRate(selectedCustomer.id, item.product.id, newUnit).then(rateData => {
        if (rateData?.suggestedRate) {
          setCart(curCart => {
            const next = [...curCart];
            if (next[index] && next[index].product.id === item.product.id && next[index].unitType === newUnit) {
              next[index] = { ...next[index], unitPrice: Number(rateData.suggestedRate), rateInfo: rateData };
            }
            return next;
          });
        }
      });
    }
  };

  const updateQuantity = (index: number, delta: number) => {
    const updated = [...cart];
    const currentQty = parseFloat(String(updated[index].quantity)) || 0;
    const newQty = Math.round((currentQty + delta) * 1000) / 1000;
    if (newQty > 0) {
      updated[index].quantity = newQty;
      setCart(updated);
    } else {
      removeFromCart(index);
    }
  };

  const setDirectQuantity = (index: number, qty: number | string) => {
    const updated = [...cart];
    updated[index].quantity = qty;
    setCart(updated);
  };

  const updatePrice = (index: number, newPrice: number | string) => {
    const updated = [...cart];
    updated[index].unitPrice = newPrice;
    setCart(updated);
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const handleAddVanItemToBill = (vi: any) => {
    const targetProduct: ExtendedProduct = products.find(p => p.id === vi.productId) || {
      id: vi.productId,
      name: vi.product?.name || 'Product',
      sku: vi.product?.sku || '',
      salePrice: Number(vi.product?.salePrice || vi.unitPrice || 0),
      purchasePrice: Number(vi.product?.purchasePrice || 0),
      conversionFactor: Number(vi.product?.conversionFactor) || 1,
      unit: vi.product?.unit || { name: 'Pcs', symbol: 'Pcs' },
      primaryUnit: vi.product?.primaryUnit,
      currentStock: vi.remainingInVan,
    } as ExtendedProduct;

    addToCart(targetProduct);

    setSuccessMsg(`✓ "${targetProduct.name}" bill basket mein shamil kar diya gaya hai!`);
    setTimeout(() => setSuccessMsg(''), 4000);

    setTimeout(() => {
      const cartEl = document.getElementById('pos-order-cart-section');
      if (cartEl) {
        cartEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 150);
  };

  const isWalkIn = Boolean(
    !selectedCustomer ||
    selectedCustomer?.phone === '00000000000' ||
    selectedCustomer?.shopName?.toLowerCase().includes('walk-in') ||
    selectedCustomer?.id === 'walk-in'
  );
  const previousDebt = isWalkIn ? 0 : Number(selectedCustomer?.currentReceivable || 0);
  const customerCreditLimit = isWalkIn ? 0 : Number(selectedCustomer?.creditLimit || 0);

  const totalBill = cart.reduce(
    (sum, item) => sum + (parseFloat(String(item.unitPrice)) || 0) * (parseFloat(String(item.quantity)) || 0),
    0
  );

  const numReceived = parseFloat(String(receivedPayment)) || 0;
  const totalPayableWithDebt = isWalkIn ? totalBill : (totalBill + previousDebt);
  const netRemainingDebt = isWalkIn ? Math.max(0, totalBill - numReceived) : (totalPayableWithDebt - numReceived);
  const isCreditExceeded = !isWalkIn && customerCreditLimit > 0 && netRemainingDebt > customerCreditLimit;
  const isWalkInCreditAttempt = isWalkIn && totalBill > 0 && (totalBill - numReceived) > 0;

  // Drafts Management Handlers
  const handleSaveAsDraft = () => {
    if (cart.length === 0) {
      alert('Draft mein save karne ke liye basket mein kam az kam 1 product shamil hona chahiye.');
      return;
    }

    const draftId = activeDraftId || `draft_${Date.now()}`;
    const custLabel = selectedCustomer?.shopName || 'Walk-in Counter Customer';
    const draftName = `${custLabel} — Rs. ${totalBill.toLocaleString()}`;

    const newDraft: PosDraftOrder = {
      id: draftId,
      name: draftName,
      customer: selectedCustomer,
      cart: [...cart],
      receivedPayment,
      paymentMethod,
      isCounterSale,
      notes,
      totalBill,
      itemsCount: cart.length,
      createdAt: new Date().toISOString(),
    };

    const updatedDrafts = [newDraft, ...drafts.filter((d) => d.id !== draftId)];
    setDrafts(updatedDrafts);
    try {
      localStorage.setItem('rot_pos_draft_orders', JSON.stringify(updatedDrafts));
      localStorage.removeItem('rot_pos_active_cart_backup');
    } catch (e) {}

    // Reset current working cart so salesman can start another bill
    setCart([]);
    setSelectedCustomer(null);
    setReceivedPayment(0);
    setIsCounterSale(false);
    setNotes('');
    setActiveDraftId(null);
    setSuccessMsg(`✓ Draft order "${draftName}" mehfooz ho gaya hai! Aap kisi bhi waqt 'Draft Orders' se ise wapis load ya delete kar saktay hain.`);
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const handleLoadDraft = (draft: PosDraftOrder) => {
    if (cart.length > 0 && activeDraftId !== draft.id) {
      const confirmLoad = window.confirm(
        'Mojooda basket mein pehle se products hain. Kya aap mojooda basket ko is draft se tabdeel karna chahte hain?'
      );
      if (!confirmLoad) return;
    }

    setSelectedCustomer(draft.customer);
    setCart(draft.cart || []);
    setReceivedPayment(draft.receivedPayment || 0);
    setPaymentMethod(draft.paymentMethod || 'CASH');
    setIsCounterSale(Boolean(draft.isCounterSale));
    setNotes(draft.notes || '');
    setActiveDraftId(draft.id);
    setShowDraftsModal(false);

    setSuccessMsg(`✓ Draft order "${draft.name}" bill basket mein load ho gaya!`);
    setTimeout(() => setSuccessMsg(''), 4000);

    setTimeout(() => {
      const cartEl = document.getElementById('pos-order-cart-section');
      if (cartEl) {
        cartEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 150);
  };

  const handleDeleteDraft = (draftId: string, draftName: string) => {
    if (!canDeleteDraft) {
      alert('Aap ke pas draft delete karne ki permission nahi hai. Barah-e-karam Admin se rabta karein.');
      return;
    }

    if (window.confirm(`Kya aap draft order "${draftName}" ko delete karna chahte hain?`)) {
      const updated = drafts.filter((d) => d.id !== draftId);
      setDrafts(updated);
      try {
        localStorage.setItem('rot_pos_draft_orders', JSON.stringify(updated));
      } catch (e) {}
      if (activeDraftId === draftId) {
        setActiveDraftId(null);
        try {
          localStorage.removeItem('rot_pos_active_cart_backup');
        } catch (e) {}
      }
      setSuccessMsg(`✓ Draft order delete kar diya gaya.`);
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  const handleQuickCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingCustomer(true);
    setErrorMsg('');
    try {
      const res = await api.post('/partners/customers', {
        ...quickCustForm,
        openingBalance: 0,
        creditLimit: parseFloat(quickCustForm.creditLimit || '100000'),
      });
      if (res.data?.success && res.data.customer) {
        const created = res.data.customer;
        setCustomers((prev) => {
          const updated = [created, ...prev];
          try {
            sessionStorage.setItem('rot_cached_customers', JSON.stringify({ data: updated, timestamp: Date.now() }));
          } catch (e) {}
          return updated;
        });
        setSelectedCustomer(created);
        setShowAddCustomerModal(false);
        setQuickCustForm({
          shopName: '',
          ownerName: '',
          phone: '',
          address: '',
          area: '',
          creditLimit: '100000',
        });
        setSuccessMsg(`Customer "${created.shopName}" shamil ho gaya aur automatically select ho chuka hai!`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Customer shamil nahi ho saka.');
    } finally {
      setCreatingCustomer(false);
    }
  };

  const openCreditLimitModal = (suggestedAmount?: number) => {
    if (!selectedCustomer) return;
    const def = suggestedAmount 
      ? suggestedAmount 
      : isCreditExceeded 
        ? Math.max(Number(selectedCustomer.creditLimit || 0) + 50000, Math.ceil(netRemainingDebt / 5000) * 5000 + 10000)
        : Number(selectedCustomer.creditLimit || 100000);
    setNewCreditLimitInput(String(def));
    setCreditLimitSuccessMsg('');
    setShowCreditLimitModal(true);
  };

  const handleSaveCreditLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    const num = parseFloat(newCreditLimitInput);
    if (isNaN(num) || num < 0) {
      alert('Valid credit limit amount enter karein');
      return;
    }

    setUpdatingCreditLimit(true);
    try {
      const res = await api.put(`/partners/customers/${selectedCustomer.id}`, {
        creditLimit: num,
      });
      if (res.data?.success) {
        const updatedCust = { ...selectedCustomer, creditLimit: num };
        setSelectedCustomer(updatedCust);
        setCustomers((prev) => {
          const updated = prev.map((c) => (c.id === selectedCustomer.id ? { ...c, creditLimit: num } : c));
          try {
            sessionStorage.setItem('rot_cached_customers', JSON.stringify({ data: updated, timestamp: Date.now() }));
          } catch (e) {}
          return updated;
        });
        setCreditLimitSuccessMsg(`✓ Credit limit barha kar Rs. ${num.toLocaleString()} kar di gayi hai! Ab aap foran supply / bill bana saktay hain.`);
        setShowCreditLimitModal(false);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Credit limit update karne me masla pesh aya');
    } finally {
      setUpdatingCreditLimit(false);
    }
  };

  const availableCategories = Array.from(
    new Map(
      products
        .filter((p) => p.category?.name || p.categoryId)
        .map((p) => [p.category?.name || p.categoryId, p.category?.name || 'General Lubricant'])
    ).entries()
  ).map(([id, name]) => ({ id, name }));

  const handleApplyDiscount = () => {
    const pct = parseFloat(discountPercent);
    if (isNaN(pct) || pct <= 0 || pct > 100) {
      alert('Barahe karam 1% se 100% ke darmian valid discount percentage darj karein.');
      return;
    }
    if (cart.length === 0) {
      alert('Pehlay basket me kam az kam 1 product shamil karein.');
      return;
    }
    if (discountScope === 'CATEGORY' && !discountCategory) {
      alert('Pehlay wo category select karein jis par discount lagana chahte hain.');
      return;
    }
    if (discountScope === 'PRODUCT' && !discountProductId) {
      alert('Pehlay basket me se wo product select karein jis par discount lagana chahte hain.');
      return;
    }

    let affectedCount = 0;
    const updated = cart.map((item) => {
      const itemCatName = item.product.category?.name || item.product.categoryId || '';
      const matches =
        discountScope === 'FULL_BILL' ||
        (discountScope === 'CATEGORY' && (itemCatName === discountCategory || item.product.categoryId === discountCategory)) ||
        (discountScope === 'PRODUCT' && item.product.id === discountProductId);

      if (matches) {
        affectedCount++;
        const conv = Number(item.product.conversionFactor) || 1;
        const baseRate =
          item.unitType === 'PRIMARY'
            ? Number(item.product.salePrice) * conv
            : Number(item.product.salePrice);
        const discountedPrice = Math.round(baseRate * (1 - pct / 100));
        return {
          ...item,
          unitPrice: discountedPrice,
          discountPercent: pct,
        };
      }
      return item;
    });

    setCart(updated);
    if (discountScope === 'FULL_BILL') {
      setAppliedDiscountSummary(`Full Bill: ${pct}% discount applied to all ${affectedCount} item(s)!`);
    } else if (discountScope === 'CATEGORY') {
      setAppliedDiscountSummary(`Category "${discountCategory}": ${pct}% discount applied to ${affectedCount} item(s)!`);
    } else {
      const pName = cart.find(c => c.product.id === discountProductId)?.product.name || 'Selected Item';
      setAppliedDiscountSummary(`Product "${pName}": ${pct}% discount applied!`);
    }
  };

  const handleResetDiscount = () => {
    const updated = cart.map((item) => {
      const conv = Number(item.product.conversionFactor) || 1;
      const baseRate =
        item.unitType === 'PRIMARY'
          ? Number(item.product.salePrice) * conv
          : Number(item.product.salePrice);
      return {
        ...item,
        unitPrice: baseRate,
        discountPercent: undefined,
      };
    });
    setCart(updated);
    setAppliedDiscountSummary('');
  };

  const handleSubmitOrder = async () => {
    const errors: Record<string, string> = {};

    if (!selectedCustomer) {
      errors.customer = 'Pehlay Customer / Dukan select karna lazmi hai';
    }
    if (cart.length === 0) {
      errors.cart = 'Order me kam az kam 1 product add karna lazmi hai';
    }
    cart.forEach((it, idx) => {
      const q = parseFloat(String(it.quantity)) || 0;
      const p = parseFloat(String(it.unitPrice)) || 0;
      if (q <= 0 || isNaN(q)) {
        errors[`qty_${idx}`] = 'Tadaad (Quantity) kam az kam 0 se barhi honi chahiye';
      }
      if (p < 0 || isNaN(p)) {
        errors[`price_${idx}`] = 'Unit rate 0 ya is se barhi raqam honi chahiye';
      }
    });
    const numReceivedVal = parseFloat(String(receivedPayment)) || 0;
    if (numReceivedVal < 0 || isNaN(numReceivedVal)) {
      errors.receivedPayment = 'Received payment minus me nahi ho sakti';
    }
    if (isWalkInCreditAttempt) {
      errors.receivedPayment = `Walk-in customer ko udhar dena sakht mana hai (Baqaya: Rs. ${(totalBill - numReceivedVal).toLocaleString()}). Customer list me shamil karein ya poora cash wasool karein.`;
    }
    if (isCreditExceeded) {
      errors.customer = `⛔ Customer ka udhar credit limit (Rs. ${customerCreditLimit.toLocaleString()}) se barh gaya hai. Bill creation disabled hai!`;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setErrorMsg(
        isWalkInCreditAttempt
          ? `⛔ Walk-in Customer ko udhar / credit par saman dena sakht mana hai! Barahe karam poora cash wasool karein ya customer account banayein.`
          : isCreditExceeded
          ? `⛔ Credit Limit Exceeded! Customer ka udhar (Rs. ${netRemainingDebt.toLocaleString()}) credit limit se zyada hai.`
          : 'POS me entry me mistake ha! Neeche red box check karein.'
      );
      if (errors.customer) {
        document.getElementById('pos-customer-selection-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // Safety check: Prompt confirmation if any product is being sold below purchase cost
    const belowCostItems = cart.filter((it) => {
      const conv = Number(it.product.conversionFactor) || 1;
      const cost = it.unitType === 'PRIMARY' ? (Number(it.product.purchasePrice || 0) * conv) : Number(it.product.purchasePrice || 0);
      const up = parseFloat(String(it.unitPrice)) || 0;
      return cost > 0 && up > 0 && up < cost;
    });

    if (belowCostItems.length > 0) {
      const itemsList = belowCostItems
        .map(it => {
          const conv = Number(it.product.conversionFactor) || 1;
          const cost = it.unitType === 'PRIMARY' ? (Number(it.product.purchasePrice || 0) * conv) : Number(it.product.purchasePrice || 0);
          const up = parseFloat(String(it.unitPrice)) || 0;
          const loss = cost - up;
          return `• ${it.product.name}: Sale Rate Rs. ${up.toLocaleString()} (Khareed Rs. ${cost.toLocaleString()} → Nuksaan Rs. ${loss.toLocaleString()}/unit)`;
        })
        .join('\n');

      const proceed = window.confirm(
        `⚠️ ATTENTION / KHAREED QEEMAT REMINDER:\n\nMandarja zail items apni KHAREED QEEMAT (Purchase Cost) se kam rate par sale ho rahe hain:\n\n${itemsList}\n\nKya aap waqayi is rate par bill confirm karna chahte hain?`
      );
      if (!proceed) {
        return;
      }
    }

    setSubmitting(true);
    setErrorMsg('');
    setFieldErrors({});
    setSuccessMsg('');

    try {
      let targetCustomerId = selectedCustomer.id;
      if (targetCustomerId === 'walk-in') {
        const found = customers.find(c => c.phone === '00000000000' || c.shopName.toLowerCase().includes('walk-in'));
        if (found) {
          targetCustomerId = found.id;
        } else {
          const createCustRes = await api.post('/partners/customers', {
            shopName: 'Walk-in Customer / Counter Sale',
            ownerName: 'Direct Cash Customer',
            phone: '00000000000',
            address: 'Main Shop / Counter',
            area: 'Okara Local',
            openingBalance: 0,
            creditLimit: 0,
          });
          targetCustomerId = createCustRes.data?.customer?.id;
        }
      }

      const payload = {
        customerId: targetCustomerId,
        saleType: isCounterSale ? 'COUNTER' : 'VAN',
        saleDate: posSaleDate ? new Date(posSaleDate).toISOString() : new Date().toISOString(),
        items: cart.map((it) => {
          const q = parseFloat(String(it.quantity)) || 0;
          const p = parseFloat(String(it.unitPrice)) || 0;
          return {
            productId: it.product.id,
            quantity: q,
            unitType: it.unitType,
            unitPrice: p,
            discountPercent: it.discountPercent || 0,
            isRateOverridden: p !== it.standardRate,
            originalRate: it.standardRate,
          };
        }),
        receivedAmount: parseFloat(String(receivedPayment)) || 0,
        paymentMethod,
        notes,
      };

      const res = await api.post('/sales', payload);
      if (res.data.success) {
        let createdSaleData = res.data.sale;
        try {
          const fullRes = await api.get(`/sales/${createdSaleData.id}`);
          if (fullRes.data?.sale) {
            createdSaleData = fullRes.data.sale;
          }
        } catch {
          if (!createdSaleData.customer) {
            createdSaleData.customer = selectedCustomer;
          }
        }

        setCompletedSale(createdSaleData);
        setShowInvoiceModal(true);
        setSuccessMsg(
          `Invoice ${createdSaleData?.invoiceNumber || ''} created successfully! Record Sales & POS me save ho chuka hai.`
        );
        setErrorMsg('');
        // Optimistic local stock & debt update (completely eliminates heavy Neon re-fetch after sale)
        const soldItems = cart.map((it) => ({
          productId: it.product.id,
          qtyBase: it.unitType === 'PRIMARY' ? (parseFloat(String(it.quantity)) || 0) * (Number(it.product.conversionFactor) || 1) : (parseFloat(String(it.quantity)) || 0),
        }));

        setProducts((prevProducts) => {
          const updated = prevProducts.map((p) => {
            const sold = soldItems.find((s) => s.productId === p.id);
            if (sold) {
              const current = Number(p.currentStock || 0);
              return { ...p, currentStock: Math.max(0, current - sold.qtyBase) };
            }
            return p;
          });
          try {
            sessionStorage.setItem('rot_cached_products', JSON.stringify({ data: updated, timestamp: Date.now() }));
          } catch (e) {}
          return updated;
        });

        if (targetCustomerId && targetCustomerId !== 'walk-in' && !isWalkIn) {
          setCustomers((prevCusts) => {
            const updated = prevCusts.map((c) => {
              if (c.id === targetCustomerId) {
                return { ...c, currentReceivable: netRemainingDebt };
              }
              return c;
            });
            try {
              sessionStorage.setItem('rot_cached_customers', JSON.stringify({ data: updated, timestamp: Date.now() }));
            } catch (e) {}
            return updated;
          });
        }

        // Live update active van stock & financial counters locally
        setActiveVan((prevVan: any) => {
          if (!prevVan || !Array.isArray(prevVan.items)) return prevVan;
          const updatedItems = prevVan.items.map((vi: any) => {
            const sold = soldItems.find((s) => s.productId === vi.productId);
            if (sold) {
              const newSold = (vi.soldQty || 0) + sold.qtyBase;
              const newRemaining = Math.max(0, (vi.loadedQty || 0) - newSold);
              return { ...vi, soldQty: newSold, remainingInVan: newRemaining };
            }
            return vi;
          });
          const newFin = {
            ...prevVan.financials,
            totalSales: (prevVan.financials?.totalSales || 0) + totalBill,
            totalCash: (prevVan.financials?.totalCash || 0) + Number(receivedPayment),
            totalCredit: (prevVan.financials?.totalCredit || 0) + Math.max(0, totalBill - Number(receivedPayment)),
            salesCount: (prevVan.financials?.salesCount || 0) + 1,
          };
          return { ...prevVan, items: updatedItems, financials: newFin };
        });

        // If this sale was from a draft, remove it from drafts
        if (activeDraftId) {
          setDrafts((prevDrafts) => {
            const rem = prevDrafts.filter((d) => d.id !== activeDraftId);
            try {
              localStorage.setItem('rot_pos_draft_orders', JSON.stringify(rem));
            } catch (e) {}
            return rem;
          });
          setActiveDraftId(null);
        }
        try {
          localStorage.removeItem('rot_pos_active_cart_backup');
        } catch (e) {}

        setCart([]);
        setReceivedPayment(0);
        setIsCounterSale(false);
        setNotes('');
        setSelectedCustomer(null);
        setAppliedDiscountSummary('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.message || 'Order submit nahi ho saka. Barah-e-karam dobara koshish karein.'
      );
      setSuccessMsg('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCustomers = customers.filter((c) => {
    if (!customerSearchTerm.trim()) return true;
    const term = customerSearchTerm.toLowerCase();
    return (
      (c.shopName && c.shopName.toLowerCase().includes(term)) ||
      (c.ownerName && c.ownerName.toLowerCase().includes(term)) ||
      (c.phone && c.phone.includes(term)) ||
      (c.area && c.area.toLowerCase().includes(term))
    );
  });

  const filteredProducts = products.filter(
    (p) =>
      (p.name || '').toLowerCase().includes(searchProduct.toLowerCase()) ||
      (p.sku || '').toLowerCase().includes(searchProduct.toLowerCase()) ||
      (p.brand || '').toLowerCase().includes(searchProduct.toLowerCase()) ||
      (p.category?.name || '').toLowerCase().includes(searchProduct.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '850px', width: '100%', margin: '0 auto', paddingBottom: '60px', overflowX: 'hidden' }}>
      {/* Mobile-First Header */}
      <div style={{
        backgroundColor: '#1e293b',
        color: '#ffffff',
        padding: '20px',
        borderRadius: '16px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            backgroundColor: '#d97706',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Smartphone size={24} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>Sales Portal — Van Delivery & Field Billing</h2>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Real-time customer rate auto-suggestion & unit conversions</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={syncing}
            title="Refresh latest products & customer balances from database"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#334155',
              color: '#f8fafc',
              border: '1px solid #475569',
              borderRadius: '10px',
              padding: '8px 12px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: syncing ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <RefreshCw size={13} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
            {syncing ? 'Syncing...' : 'Sync Stock'}
          </button>

          <button
            type="button"
            onClick={() => setShowDraftsModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: drafts.length > 0 ? '#b45309' : '#334155',
              color: '#ffffff',
              border: drafts.length > 0 ? '1px solid #f59e0b' : '1px solid #475569',
              borderRadius: '10px',
              padding: '8px 12px',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: drafts.length > 0 ? '0 0 10px rgba(245, 158, 11, 0.45)' : 'none',
              transition: 'all 0.2s'
            }}
            title="Saved draft orders - Switch tabs safely without losing data"
          >
            <Bookmark size={13} />
            <span>Draft Orders</span>
            {drafts.length > 0 && (
              <span style={{
                backgroundColor: '#f59e0b',
                color: '#0f172a',
                borderRadius: '10px',
                padding: '1px 6px',
                fontSize: '0.72rem',
                fontWeight: 900
              }}>
                {drafts.length}
              </span>
            )}
          </button>
          <PosLiveClock />
        </div>
      </div>

      {errorMsg && (
        <div style={{
          backgroundColor: '#fee2e2',
          border: '2px solid #ef4444',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#991b1b',
          fontWeight: 700,
          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.5rem' }}>⚠️</span>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 800 }}>Operation Nakaam Raha (Invoice Not Created):</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#b91c1c', marginTop: '2px' }}>{errorMsg}</div>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => setErrorMsg('')}
            style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#991b1b', fontWeight: 900 }}
          >
            ✕
          </button>
        </div>
      )}

      {successMsg && (
        <div style={{
          backgroundColor: '#ecfdf5',
          border: '2px solid #10b981',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#065f46',
          fontWeight: 700,
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.5rem' }}>✅</span>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 800 }}>Kamyabi (Invoice Created Successfully):</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#047857', marginTop: '2px' }}>{successMsg}</div>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => setSuccessMsg('')}
            style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#065f46', fontWeight: 900 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ACTIVE VAN DISPATCH & LOADED INVENTORY BANNER */}
      {activeVan && (
        <div style={{
          backgroundColor: '#0f172a',
          border: '2px solid #f59e0b',
          borderRadius: '16px',
          padding: '16px 18px',
          marginBottom: '20px',
          color: '#ffffff',
          boxShadow: '0 6px 20px -3px rgba(245, 158, 11, 0.25)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ backgroundColor: '#d97706', padding: '8px', borderRadius: '10px', color: '#fff' }}>
                <Truck size={20} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: '#fef3c7' }}>
                    🚐 Active Route Van: {activeVan.vehicle?.vehicleNumber}
                  </span>
                  <span style={{ backgroundColor: '#1e293b', border: '1px solid #475569', color: '#cbd5e1', padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700 }}>
                    Route: {activeVan.routeArea}
                  </span>
                  <span style={{ backgroundColor: '#065f46', color: '#34d399', padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800 }}>
                    LIVE DISPATCH
                  </span>
                </div>
                <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '2px' }}>
                  Driver: <strong>{activeVan.vehicle?.driverName}</strong> | Loaded Value: <strong>Rs. {Number(activeVan.financials?.totalLoadedValue || 0).toLocaleString()}</strong>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    document.getElementById('pos-order-cart-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#16a34a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px 14px',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  <ShoppingBag size={14} /> Bill Cart ({cart.reduce((s, i) => s + (parseFloat(String(i.quantity)) || 0), 0)} Items)
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowVanDetails(!showVanDetails)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#1e293b',
                  color: '#f59e0b',
                  border: '1px solid #d97706',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {showVanDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {showVanDetails ? 'Van Stock Chhupayein' : `Van Stock Dekhein (${activeVan.items?.length || 0} Items)`}
              </button>
            </div>
          </div>

          {/* Quick Route Financials Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '8px',
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: '1px solid #334155'
          }}>
            <div style={{ backgroundColor: '#1e293b', padding: '8px 10px', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Total Route Sales:</div>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#38bdf8' }}>
                Rs. {Number(activeVan.financials?.totalSales || 0).toLocaleString()}
              </div>
            </div>
            <div style={{ backgroundColor: '#1e293b', padding: '8px 10px', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Cash Wasooli:</div>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#4ade80' }}>
                Rs. {Number(activeVan.financials?.totalCash || 0).toLocaleString()}
              </div>
            </div>
            <div style={{ backgroundColor: '#1e293b', padding: '8px 10px', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Udhar (Credit):</div>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#f87171' }}>
                Rs. {Number(activeVan.financials?.totalCredit || 0).toLocaleString()}
              </div>
            </div>
            <div style={{ backgroundColor: '#1e293b', padding: '8px 10px', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Invoices Created:</div>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#fbbf24' }}>
                {activeVan.financials?.salesCount || 0} Bills
              </div>
            </div>
          </div>

          {/* Expandable Loaded Items List */}
          {showVanDetails && activeVan.items && activeVan.items.length > 0 && (
            <div style={{ marginTop: '14px', backgroundColor: '#1e293b', borderRadius: '10px', padding: '10px', overflowX: 'auto' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#f59e0b', marginBottom: '8px' }}>
                📦 Aaj Subah Ka Loaded Maal & Live Van Stock:
              </div>
              <table style={{ width: '100%', fontSize: '0.78rem', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                    <th style={{ padding: '6px 8px' }}>Item Name</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center' }}>Loaded</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center' }}>Sold</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center' }}>Van Baqi</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activeVan.items.map((vi: any) => {
                    const prodInMain = products.find(p => p.id === vi.productId);
                    const cartItem = cart.find(ci => ci.product.id === vi.productId);
                    const isInBill = Boolean(cartItem);
                    const isRowClicked = selectedVanProductId === vi.productId;

                    return (
                      <tr
                        key={vi.id}
                        onClick={() => setSelectedVanProductId(prev => prev === vi.productId ? null : vi.productId)}
                        style={{
                          borderBottom: '1px solid #334155',
                          backgroundColor: isInBill ? '#064e3b' : (isRowClicked ? '#1e3a5f' : 'transparent'),
                          boxShadow: isInBill ? 'inset 4px 0 0 #34d399' : (isRowClicked ? 'inset 4px 0 0 #38bdf8' : 'none'),
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <td style={{ padding: '8px 8px', fontWeight: 700, color: '#f8fafc' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span>{vi.product?.name}</span>
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>({vi.product?.sku})</span>
                            {isInBill && (
                              <span style={{
                                backgroundColor: '#10b981',
                                color: '#ffffff',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                fontWeight: 800,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                boxShadow: '0 0 8px rgba(16, 185, 129, 0.4)'
                              }}>
                                ✓ IN BILL: {cartItem?.quantity} {cartItem?.unitType === 'PRIMARY' ? 'Ctn' : 'Pcs'}
                              </span>
                            )}
                            {!isInBill && isRowClicked && (
                              <span style={{
                                backgroundColor: '#0284c7',
                                color: '#ffffff',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '0.68rem',
                                fontWeight: 800
                              }}>
                                👉 SELECTED
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '8px 8px', textAlign: 'center', color: '#94a3b8' }}>
                          {vi.loadedQty}
                        </td>
                        <td style={{ padding: '8px 8px', textAlign: 'center', color: '#4ade80', fontWeight: 800 }}>
                          {vi.soldQty || 0}
                        </td>
                        <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                          <span style={{
                            backgroundColor: vi.remainingInVan > 0 ? '#1e3a8a' : '#450a0a',
                            color: vi.remainingInVan > 0 ? '#93c5fd' : '#fca5a5',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontWeight: 800
                          }}>
                            {vi.remainingInVan} {vi.product?.unit?.symbol || 'Pcs'}
                          </span>
                        </td>
                        <td style={{ padding: '8px 8px', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedVanProductId(vi.productId);
                              handleAddVanItemToBill(vi);
                            }}
                            style={{
                              backgroundColor: isInBill ? '#10b981' : '#f59e0b',
                              color: isInBill ? '#ffffff' : '#0f172a',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '5px 12px',
                              fontSize: '0.78rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <Plus size={13} /> {isInBill ? '+ Bill More' : '+ Bill'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* STEP 1: SELECT CUSTOMER */}
      <div id="pos-customer-selection-section" className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <h3 className="card-title" style={{ margin: 0 }}>
            1. Select Customer / Shop (For Negotiated Rate History)
          </h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                if (fieldErrors.customer) setFieldErrors(prev => ({ ...prev, customer: '' }));
                const walkIn = customers.find(c => c.phone === '00000000000' || c.shopName.toLowerCase().includes('walk-in'));
                if (walkIn) {
                  setSelectedCustomer({
                    ...walkIn,
                    currentReceivable: 0,
                    creditLimit: 0,
                    openingBalance: 0,
                  });
                } else {
                  setSelectedCustomer({
                    id: 'walk-in',
                    shopName: 'Walk-in Customer / Counter Sale',
                    ownerName: 'Direct Cash Customer',
                    phone: '00000000000',
                    address: 'Shop Counter',
                    area: 'Okara Local',
                    currentReceivable: 0,
                    creditLimit: 0,
                    openingBalance: 0,
                    createdAt: new Date().toISOString(),
                  } as any);
                }
                if (totalBill > 0 && receivedPayment === 0) {
                  setReceivedPayment(totalBill);
                }
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: (selectedCustomer?.phone === '00000000000' || selectedCustomer?.shopName?.toLowerCase().includes('walk-in')) ? '#16a34a' : '#0f172a',
                color: '#ffffff',
                border: 'none',
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <UserCheck size={16} /> Walk-in Customer (Shop Counter)
            </button>
            <button
              type="button"
              onClick={() => {
                setFieldErrors((prev) => ({ ...prev, customer: '' }));
                setShowAddCustomerModal(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                border: 'none',
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <UserPlus size={16} /> + Add New Customer
            </button>
          </div>
        </div>

        {/* Quick Search & Select Controls */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px', alignItems: 'end', width: '100%' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 700, fontSize: '0.83rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Search size={14} style={{ color: '#0284c7' }} /> Quick Search Customer
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Search shop, owner, phone..."
                value={customerSearchTerm}
                onChange={(e) => setCustomerSearchTerm(e.target.value)}
                style={{ paddingRight: customerSearchTerm ? '30px' : '10px', fontSize: '0.92rem' }}
              />
              {customerSearchTerm && (
                <button
                  type="button"
                  onClick={() => setCustomerSearchTerm('')}
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
                    fontSize: '1rem',
                    lineHeight: 1
                  }}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 700, fontSize: '0.83rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Choose Customer / Shop</span>
              {customerSearchTerm && (
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#0284c7' }}>
                  ({filteredCustomers.length} matches found)
                </span>
              )}
            </label>
            <select
              className="form-control"
              style={{
                fontSize: '0.95rem',
                padding: '9px 12px',
                ...(fieldErrors.customer ? { border: '2px solid #ef4444', backgroundColor: '#fef2f2' } : {})
              }}
              value={selectedCustomer?.id || ''}
              onChange={(e) => {
                if (fieldErrors.customer) setFieldErrors(prev => ({ ...prev, customer: '' }));
                const cust = customers.find((c) => c.id === e.target.value);
                if (cust && (cust.phone === '00000000000' || cust.shopName.toLowerCase().includes('walk-in') || cust.id === 'walk-in')) {
                  setSelectedCustomer({
                    ...cust,
                    currentReceivable: 0,
                    creditLimit: 0,
                    openingBalance: 0,
                  });
                  if (totalBill > 0 && receivedPayment === 0) {
                    setReceivedPayment(totalBill);
                  }
                } else {
                  setSelectedCustomer(cust || null);
                }
              }}
            >
              <option value="">-- Choose Assigned Shop / Garage --</option>
              {filteredCustomers.map((c) => {
                const isCustWalkIn = c.phone === '00000000000' || c.shopName.toLowerCase().includes('walk-in') || c.id === 'walk-in';
                return (
                  <option key={c.id} value={c.id}>
                    {c.shopName} ({c.ownerName}) - Balance: {isCustWalkIn ? 'Rs. 0 (Cash Only)' : `Rs. ${Number(c.currentReceivable).toLocaleString()}`}
                  </option>
                );
              })}
            </select>
            {renderFieldErrorTag('customer')}
          </div>
        </div>

        {/* Quick Pick Chips for Fast Selection */}
        {customerSearchTerm && filteredCustomers.length > 0 && filteredCustomers.length <= 6 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Quick Pick:</span>
            {filteredCustomers.map(c => {
              const isCustWalkIn = c.phone === '00000000000' || c.shopName.toLowerCase().includes('walk-in') || c.id === 'walk-in';
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    if (fieldErrors.customer) setFieldErrors(prev => ({ ...prev, customer: '' }));
                    if (isCustWalkIn) {
                      setSelectedCustomer({
                        ...c,
                        currentReceivable: 0,
                        creditLimit: 0,
                        openingBalance: 0,
                      });
                      if (totalBill > 0 && receivedPayment === 0) {
                        setReceivedPayment(totalBill);
                      }
                    } else {
                      setSelectedCustomer(c);
                    }
                  }}
                  style={{
                    padding: '3px 10px',
                    fontSize: '0.8rem',
                    borderRadius: '16px',
                    backgroundColor: selectedCustomer?.id === c.id ? '#0284c7' : '#f1f5f9',
                    color: selectedCustomer?.id === c.id ? '#ffffff' : '#334155',
                    border: selectedCustomer?.id === c.id ? '1px solid #0284c7' : '1px solid #cbd5e1',
                    cursor: 'pointer',
                    fontWeight: 600,
                    transition: 'all 0.15s ease'
                  }}
                >
                  ✓ {c.shopName}
                </button>
              );
            })}
          </div>
        )}

        {selectedCustomer && (
          <div style={{
            marginTop: '14px',
            padding: '12px 16px',
            backgroundColor: (selectedCustomer.phone === '00000000000' || selectedCustomer.shopName.toLowerCase().includes('walk-in')) ? '#f0fdf4' : '#f8fafc',
            borderRadius: '10px',
            border: (selectedCustomer.phone === '00000000000' || selectedCustomer.shopName.toLowerCase().includes('walk-in')) ? '1px solid #86efac' : '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontWeight: 700, color: (selectedCustomer.phone === '00000000000' || selectedCustomer.shopName.toLowerCase().includes('walk-in')) ? '#15803d' : '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Store size={18} /> {selectedCustomer.shopName}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Phone: {selectedCustomer.phone} | Area: {selectedCustomer.area || 'N/A'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {isWalkIn ? 'Khata / Account Status:' : 'Previous Udhar / Sabqa Baqaya:'}
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: isWalkIn ? '#16a34a' : (Number(selectedCustomer.currentReceivable) > 0 ? '#dc2626' : '#16a34a') }}>
                {isWalkIn ? 'Rs. 0 (Counter Cash Sale)' : `Rs. ${Number(selectedCustomer.currentReceivable).toLocaleString()}`}
              </div>
              {!isWalkIn && (
                <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                  Credit Limit: <b style={{ color: '#0f172a' }}>{customerCreditLimit > 0 ? `Rs. ${customerCreditLimit.toLocaleString()}` : 'Unlimited (No Limit)'}</b>
                  <button
                    type="button"
                    onClick={() => openCreditLimitModal()}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#0284c7',
                      cursor: 'pointer',
                      fontWeight: 700,
                      textDecoration: 'underline',
                      marginLeft: '6px',
                      fontSize: '0.74rem'
                    }}
                    title="Change or Increase Customer Credit Limit"
                  >
                    ✏️ Adjust Limit
                  </button>
                  {customerCreditLimit > 0 && previousDebt > customerCreditLimit && (
                    <span style={{ color: '#dc2626', fontWeight: 700, display: 'block' }}>⚠️ Sabqa udhar limit se zyada hai</span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* STEP 2: SELECT PRODUCTS */}
      <div className="card" style={{
        marginBottom: '20px',
        ...(fieldErrors.cart ? { border: '2px solid #ef4444', backgroundColor: '#fff5f5' } : {})
      }}>
        <div className="card-header" style={{ marginBottom: '12px' }}>
          <div>
            <h3 className="card-title">2. Select Products</h3>
            {renderFieldErrorTag('cart')}
          </div>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Tap product to add with auto-pricing</span>
        </div>

        <input
          type="text"
          className="form-control"
          placeholder="Search by oil brand, viscosity, code (e.g. Total, 5W-40, Guard)..."
          value={searchProduct}
          onChange={(e) => setSearchProduct(e.target.value)}
          style={{ marginBottom: '14px', padding: '12px' }}
        />

        <div style={{
          maxHeight: '320px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          {filteredProducts.map((p) => {
            const inCartItem = cart.find((item) => item.product.id === p.id);
            const isSelected = !!inCartItem;

            return (
              <div
                key={p.id}
                onClick={() => addToCart(p)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: isSelected ? '2px solid #d97706' : '1px solid #e2e8f0',
                  backgroundColor: isSelected ? '#fffbeb' : '#ffffff',
                  boxShadow: isSelected ? '0 4px 12px rgba(217, 119, 6, 0.15)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = '#ffffff';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {p.imageUrl ? (
                    <img 
                      src={getMediaUrl(p.imageUrl)} 
                      alt={p.name}
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '8px',
                        objectFit: 'contain',
                        border: isSelected ? '2px solid #d97706' : '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        padding: '2px'
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '8px',
                      backgroundColor: isSelected ? '#d97706' : '#f1f5f9',
                      color: isSelected ? '#ffffff' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.85rem'
                    }}>
                      {isSelected ? <CheckCircle size={20} /> : <ShoppingBag size={18} />}
                    </div>
                  )}

                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.93rem', color: isSelected ? '#92400e' : '#0f172a' }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: isSelected ? '#b45309' : '#64748b' }}>
                      Code: {p.sku} | In Stock:{' '}
                      {p.conversionFactor && p.conversionFactor > 1 && p.primaryUnit ? (
                        <span>
                          <b style={{ color: Number(p.currentStock) > 0 ? '#15803d' : '#dc2626' }}>
                            {Math.floor(Number(p.currentStock) / Number(p.conversionFactor))} {p.primaryUnit?.symbol || 'Ctn'}
                            {Number(p.currentStock) % Number(p.conversionFactor) > 0 ? ` + ${Number(p.currentStock) % Number(p.conversionFactor)} ${p.unit?.symbol || 'Pcs'}` : ''}
                          </b>{' '}
                          <span style={{ color: '#64748b' }}>(Total: {Number(p.currentStock)} {p.unit?.symbol || 'Pcs'})</span>
                        </span>
                      ) : (
                        <b style={{ color: Number(p.currentStock) > 0 ? '#15803d' : '#dc2626' }}>
                          {Number(p.currentStock)} {p.unit?.symbol || ''}
                        </b>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  {p.conversionFactor && p.conversionFactor > 1 && p.primaryUnit ? (
                    <div>
                      <div style={{ fontWeight: 800, color: '#d97706', fontSize: '1.05rem' }}>
                        Rs. {(Number(p.salePrice) * Number(p.conversionFactor)).toLocaleString()}{' '}
                        <span style={{ fontSize: '0.78rem', color: '#92400e', fontWeight: 700 }}>
                          /{p.primaryUnit?.symbol || 'Ctn'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                        (Rs. {Number(p.salePrice).toLocaleString()} / {p.unit?.symbol || 'Pc'})
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontWeight: 800, color: '#d97706', fontSize: '1.02rem' }}>
                      Rs. {Number(p.salePrice).toLocaleString()}{' '}
                      <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        /{p.unit?.symbol || 'Pc'}
                      </span>
                    </div>
                  )}
                  {isSelected ? (
                    <span style={{
                      marginTop: '4px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 10px',
                      borderRadius: '20px',
                      backgroundColor: '#d97706',
                      color: '#ffffff',
                      fontSize: '0.75rem',
                      fontWeight: 800
                    }}>
                      ✓ In Basket ({inCartItem.quantity} {inCartItem.unitType === 'PRIMARY' ? (p.primaryUnit?.symbol || 'Ctn') : (p.unit?.symbol || 'Pcs')})
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      style={{ marginTop: '4px', padding: '4px 10px' }}
                    >
                      <Plus size={14} /> Add
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* STEP 3: ORDER ITEMS & PAYMENT */}
      <div id="pos-order-cart-section" className="card" style={{ marginBottom: '24px' }}>
        <h3 className="card-title" style={{ marginBottom: '14px' }}>
          3. Order Basket & Negotiated Unit Rates
        </h3>

        {/* INVOICE DATE & TIME PICKER */}
        <div style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '10px 14px',
          marginBottom: '14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={16} color="#d97706" />
            <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#334155' }}>
              Invoice Date & Time (بل کی تاریخ اور وقت):
            </span>
          </div>
          <input
            type="datetime-local"
            className="form-control"
            value={posSaleDate}
            onChange={(e) => setPosSaleDate(e.target.value)}
            style={{ width: 'auto', minWidth: '220px', fontWeight: 800, height: '36px', fontSize: '0.85rem' }}
          />
        </div>

        {/* ACTIVE DRAFT BANNER IF EDITING A SAVED DRAFT */}
        {activeDraftId && (
          <div style={{
            backgroundColor: '#fef3c7',
            border: '1.5px dashed #f59e0b',
            borderRadius: '10px',
            padding: '10px 14px',
            marginBottom: '14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Bookmark size={16} /> 📋 Editing Saved Draft Order (Is order ko invoice banayein ya update karein)
            </span>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Kya aap is draft ko chhor kar naya taaza bill shuru karna chahte hain?')) {
                  setActiveDraftId(null);
                  setCart([]);
                  setSelectedCustomer(null);
                  setReceivedPayment(0);
                  setNotes('');
                  try {
                    localStorage.removeItem('rot_pos_active_cart_backup');
                  } catch (e) {}
                }
              }}
              style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', textDecoration: 'underline' }}
            >
              Discard & Start New Bill
            </button>
          </div>
        )}

        {/* DISCOUNT PANEL: Category-Wise or Full Bill Percentage Discount */}
        {cart.length > 0 && (
          <div style={{
            padding: '14px 16px',
            backgroundColor: '#f0fdf4',
            border: '1.5px solid #86efac',
            borderRadius: '12px',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800
                }}>
                  <Percent size={16} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#166534' }}>
                    Discount Manager (% Raayat)
                  </h4>
                  <span style={{ fontSize: '0.74rem', color: '#15803d' }}>
                    Category-wise ya Full Bill par percentage discount lagayein (automatically applied on products)
                  </span>
                </div>
              </div>

              {appliedDiscountSummary && (
                <span style={{
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  backgroundColor: '#dcfce7',
                  color: '#166534',
                  padding: '3px 10px',
                  borderRadius: '20px',
                  border: '1px solid #86efac'
                }}>
                  ✓ {appliedDiscountSummary}
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', alignItems: 'flex-end' }}>
              {/* Scope: Full Bill vs Category vs Product */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#166534', marginBottom: '4px' }}>
                  Discount Scope:
                </label>
                <select
                  className="form-control"
                  style={{ fontSize: '0.82rem', padding: '6px 8px', backgroundColor: '#ffffff' }}
                  value={discountScope}
                  onChange={(e) => setDiscountScope(e.target.value as any)}
                >
                  <option value="FULL_BILL">Full Bill Discount (پورا بل)</option>
                  <option value="CATEGORY">Category-Wise Discount</option>
                  <option value="PRODUCT">🛒 Product-Wise (Basket Item)</option>
                </select>
              </div>

              {/* Category Dropdown (if Scope === CATEGORY) */}
              {discountScope === 'CATEGORY' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#166534', marginBottom: '4px' }}>
                    Select Category:
                  </label>
                  <select
                    className="form-control"
                    style={{ fontSize: '0.82rem', padding: '6px 8px', backgroundColor: '#ffffff' }}
                    value={discountCategory}
                    onChange={(e) => setDiscountCategory(e.target.value)}
                  >
                    <option value="">-- Choose Category --</option>
                    {availableCategories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Product Dropdown (if Scope === PRODUCT - Basket items only) */}
              {discountScope === 'PRODUCT' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#166534', marginBottom: '4px' }}>
                    Select Basket Product (صرف باسکٹ کے آئٹمز):
                  </label>
                  <select
                    className="form-control"
                    style={{ fontSize: '0.82rem', padding: '6px 8px', backgroundColor: '#ffffff' }}
                    value={discountProductId}
                    onChange={(e) => setDiscountProductId(e.target.value)}
                  >
                    <option value="">-- Choose Basket Product --</option>
                    {cart.map((item, idx) => (
                      <option key={`${item.product.id}-${idx}`} value={item.product.id}>
                        {item.product.name} ({item.unitType === 'PRIMARY' ? 'Carton' : 'Pc'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Discount % Input */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#166534', marginBottom: '4px' }}>
                  Discount (% Percentage):
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    className="form-control"
                    style={{ fontSize: '0.85rem', padding: '6px 26px 6px 8px', fontWeight: 700, backgroundColor: '#ffffff' }}
                    placeholder="0"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(e.target.value)}
                  />
                  <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: '#16a34a', fontSize: '0.82rem' }}>
                    %
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={handleApplyDiscount}
                  style={{
                    flex: 1,
                    backgroundColor: parseFloat(discountPercent) > 0 ? '#16a34a' : '#64748b',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {parseFloat(discountPercent) > 0 ? `Apply ${discountPercent}%` : 'Apply (% darj karein)'}
                </button>

                {appliedDiscountSummary && (
                  <button
                    type="button"
                    onClick={handleResetDiscount}
                    style={{
                      backgroundColor: '#fee2e2',
                      color: '#b91c1c',
                      border: '1px solid #fca5a5',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      cursor: 'pointer'
                    }}
                    title="Reset back to standard prices"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {cart.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
            Basket is empty. Select products above to calculate bill.
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              {cart.map((item, index) => {
                const conv = Number(item.product.conversionFactor) || 1;
                const primaryLabel = item.product.primaryUnit?.name || item.product.primaryUnit?.symbol || 'Carton';
                const primarySymbol = item.product.primaryUnit?.symbol || primaryLabel;
                const secondaryLabel = item.product.unit?.name || item.product.unit?.symbol || 'Piece';
                const secondarySymbol = item.product.unit?.symbol || secondaryLabel;
                const hasMultipleUnits = (!!item.product.primaryUnit || !!item.product.primaryUnitId) && conv > 1;
                const currentUnitSymbol = item.unitType === 'PRIMARY' ? primarySymbol : secondarySymbol;
                const basePurchasePrice = Number(item.product.purchasePrice) || 0;
                const effectivePurchasePrice = item.unitType === 'PRIMARY' ? (basePurchasePrice * conv) : basePurchasePrice;
                const itemUnitPrice = parseFloat(String(item.unitPrice)) || 0;
                const itemQuantity = parseFloat(String(item.quantity)) || 0;
                const isBelowCost = effectivePurchasePrice > 0 && itemUnitPrice > 0 && itemUnitPrice < effectivePurchasePrice;
                const lossPerUnit = Math.max(0, effectivePurchasePrice - itemUnitPrice);
                const totalLoss = lossPerUnit * itemQuantity;
                return (
                  <div
                    key={`${item.product.id}-${index}`}
                    style={{
                      padding: '14px',
                      borderRadius: '10px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{item.product.name}</span>
                          {item.discountPercent && (
                            <span style={{
                              backgroundColor: '#dcfce7',
                              color: '#15803d',
                              border: '1px solid #86efac',
                              padding: '2px 8px',
                              borderRadius: '20px',
                              fontSize: '0.72rem',
                              fontWeight: 800
                            }}>
                              -{item.discountPercent}% OFF
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          Code: {item.product.sku} | Cat: {item.product.category?.name || 'Lubricant'}
                          {item.discountPercent && (
                            <span style={{ marginLeft: '6px', color: '#64748b', textDecoration: 'line-through' }}>
                              Standard: Rs. {item.standardRate.toLocaleString()}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#0369a1', fontWeight: 700, marginTop: '2px' }}>
                          Cost Rate: Rs. {effectivePurchasePrice.toLocaleString()} / {currentUnitSymbol}
                          {effectivePurchasePrice > 0 && itemUnitPrice > 0 && (
                            <span style={{ marginLeft: '6px', color: isBelowCost ? '#dc2626' : '#16a34a' }}>
                              ({isBelowCost ? `⚠️ -Rs. ${lossPerUnit.toFixed(1)} Below Cost` : `+Rs. ${(itemUnitPrice - effectivePurchasePrice).toFixed(1)} Profit Margin`})
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromCart(index)}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                        title="Remove Item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Previous Rate Notification Badge */}
                    {item.rateInfo && item.rateInfo.hasHistory ? (
                      <div style={{
                        padding: '6px 10px',
                        backgroundColor: '#ecfdf5',
                        border: '1px solid #a7f3d0',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        color: '#065f46',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginBottom: '10px'
                      }}>
                        <Sparkles size={14} color="#059669" />
                        <span>
                          <b>Customer Past Rate Applied:</b> Rs. {item.rateInfo.suggestedRate.toLocaleString()} on{' '}
                          {item.rateInfo.previousDate ? new Date(item.rateInfo.previousDate).toLocaleDateString() : 'Previous Order'}{' '}
                          (Inv #{item.rateInfo.previousInvoice || 'N/A'})
                        </span>
                      </div>
                    ) : (
                      <div style={{
                        padding: '4px 8px',
                        backgroundColor: '#f1f5f9',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        color: '#64748b',
                        marginBottom: '10px'
                      }}>
                        Default catalog rate applied (No prior purchase history for this customer).
                      </div>
                    )}

                    {/* Unit Selector, Editable Rate, and Quantity */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px', alignItems: 'center' }}>
                      {/* Unit Type (Primary vs Secondary) */}
                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '2px', fontWeight: 600 }}>Unit / Packaging</div>
                        {hasMultipleUnits ? (
                          <select
                            className="form-control"
                            style={{
                              fontSize: '0.82rem',
                              padding: '6px 8px',
                              fontWeight: 800,
                              backgroundColor: item.unitType === 'PRIMARY' ? '#fef3c7' : '#ffffff',
                              borderColor: item.unitType === 'PRIMARY' ? '#d97706' : '#94a3b8',
                              color: item.unitType === 'PRIMARY' ? '#92400e' : '#1e293b'
                            }}
                            value={item.unitType}
                            onChange={(e) => handleUnitChange(index, e.target.value as any)}
                          >
                            <option value="PRIMARY">📦 {primaryLabel} ({primarySymbol} = {conv} {secondarySymbol}) [کارٹن]</option>
                            <option value="SECONDARY">🧴 {secondaryLabel} ({secondarySymbol}) [کُھلے پیس]</option>
                          </select>
                        ) : (
                          <div style={{
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            color: '#334155',
                            padding: '6px 8px',
                            backgroundColor: '#f1f5f9',
                            borderRadius: '6px',
                            border: '1px solid #e2e8f0',
                            textAlign: 'center'
                          }}>
                            {secondaryLabel} ({secondarySymbol})
                          </div>
                        )}
                      </div>

                      {/* Quantity Selector with Manual Input */}
                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '2px', fontWeight: 600 }}>Quantity ({currentUnitSymbol})</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => updateQuantity(index, -1)}
                            className="btn btn-outline"
                            style={{ padding: '4px 8px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Minus 1"
                          >
                            <Minus size={12} />
                          </button>
                          <input
                            type="number"
                            min="0.001"
                            step="any"
                            value={item.quantity === 0 || item.quantity === '' ? '' : item.quantity}
                            onChange={(e) => {
                              setDirectQuantity(index, e.target.value);
                            }}
                            onBlur={() => {
                              const num = parseFloat(String(item.quantity));
                              if (isNaN(num) || num <= 0) {
                                setDirectQuantity(index, 1);
                              }
                            }}
                            className="form-control"
                            style={{
                              width: '64px',
                              height: '32px',
                              textAlign: 'center',
                              fontWeight: 800,
                              fontSize: '0.95rem',
                              padding: '2px 4px',
                              borderRadius: '6px',
                              border: '1.5px solid #cbd5e1',
                              backgroundColor: '#ffffff'
                            }}
                            title="Direct quantity type karein ya + / - use karein"
                          />
                          <button
                            type="button"
                            onClick={() => updateQuantity(index, 1)}
                            className="btn btn-outline"
                            style={{ padding: '4px 8px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Add 1"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Editable Rate */}
                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '2px', fontWeight: 600 }}>
                          Rate per {currentUnitSymbol} (Rs.)
                        </div>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          className="form-control"
                          style={{
                            fontSize: '0.85rem',
                            padding: '4px 8px',
                            fontWeight: 700,
                            ...(isBelowCost
                              ? { border: '2px solid #f43f5e', backgroundColor: '#fff1f2', color: '#be123c' }
                              : fieldErrors[`price_${index}`]
                              ? { border: '2px solid #ef4444', backgroundColor: '#fef2f2' }
                              : {})
                          }}
                          value={item.unitPrice === 0 || item.unitPrice === '' ? '' : item.unitPrice}
                          placeholder="0"
                          onChange={(e) => {
                            if (fieldErrors[`price_${index}`]) {
                              setFieldErrors(prev => ({ ...prev, [`price_${index}`]: '' }));
                            }
                            updatePrice(index, e.target.value);
                          }}
                        />
                        {renderFieldErrorTag(`price_${index}`)}
                      </div>

                      {/* Line Total */}
                      <div style={{ textAlign: 'right', minWidth: '95px' }}>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          {item.quantity} {currentUnitSymbol} Total
                        </div>
                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>
                          Rs. {(itemUnitPrice * itemQuantity).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>

                    {/* Below Purchase Cost Warning Banner */}
                    {isBelowCost && (
                      <div style={{
                        marginTop: '10px',
                        backgroundColor: '#fff1f2',
                        border: '1.5px solid #f43f5e',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '8px',
                        color: '#9f1239',
                        fontSize: '0.78rem',
                        fontWeight: 700
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <AlertTriangle size={16} color="#e11d48" style={{ minWidth: '16px' }} />
                          <span>
                            <strong>⚠️ Khareed Qeemat (Purchase Cost) Reminder:</strong> Yeh item purchase rate (<strong>Rs. {effectivePurchasePrice.toLocaleString()}</strong>) se <strong>Rs. {lossPerUnit.toLocaleString()} kam</strong> rate par sale ho raha hai!
                          </span>
                        </div>
                        <span style={{
                          backgroundColor: '#e11d48',
                          color: '#ffffff',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.74rem',
                          fontWeight: 800
                        }}>
                          Loss: -Rs. {totalLoss.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Calculations Box */}
            <div style={{
              padding: '18px',
              backgroundColor: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              borderRadius: '12px',
              marginBottom: '20px'
            }}>
              {/* Order and Udhar Breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px', marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid #cbd5e1' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Current Bill (Is Order Ka Total):</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                    Rs. {totalBill.toLocaleString()}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    {isWalkIn ? 'Khata / Udhar Balance:' : 'Sabqa Udhar (Previous Debt):'}
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#16a34a' }}>
                    {isWalkIn ? 'Rs. 0 (Cash Only)' : `Rs. ${previousDebt.toLocaleString()}`}
                  </div>
                </div>
              </div>

              {/* Total Payable (Bill + Sabqa Udhar) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', backgroundColor: '#e2e8f0', padding: '10px 14px', borderRadius: '8px', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>
                  {isWalkIn ? 'Kul Wajib-ul-Ada (Current Cash Bill):' : 'Kul Wajib-ul-Ada (Current Bill + Sabqa Udhar):'}
                </span>
                <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                  Rs. {totalPayableWithDebt.toLocaleString()}
                </span>
              </div>

              {/* Quick Pay Helper Buttons */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>
                  Quick Payment Shortcuts (Fauri Wasooli Button):
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (fieldErrors.receivedPayment) setFieldErrors(prev => ({ ...prev, receivedPayment: '' }));
                      setReceivedPayment(totalBill);
                    }}
                    style={{
                      backgroundColor: '#eff6ff',
                      color: '#1d4ed8',
                      border: '1px solid #bfdbfe',
                      padding: '5px 12px',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Pay Current Bill Only (Rs. {totalBill.toLocaleString()})
                  </button>

                  {!isWalkIn && previousDebt > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (fieldErrors.receivedPayment) setFieldErrors(prev => ({ ...prev, receivedPayment: '' }));
                        setReceivedPayment(totalPayableWithDebt);
                      }}
                      style={{
                        backgroundColor: '#dcfce7',
                        color: '#15803d',
                        border: '1px solid #86efac',
                        padding: '5px 12px',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      Clear All (Bill + Sabqa Udhar = Rs. {totalPayableWithDebt.toLocaleString()})
                    </button>
                  )}
                </div>
              </div>

              {/* Payment Input Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px', marginTop: '10px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Payment Received / Wasool (Rs.) *</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    className="form-control"
                    placeholder="0"
                    value={receivedPayment === 0 || receivedPayment === '0' ? '' : receivedPayment}
                    onChange={(e) => {
                      if (fieldErrors.receivedPayment) {
                        setFieldErrors(prev => ({ ...prev, receivedPayment: '' }));
                      }
                      setReceivedPayment(e.target.value);
                    }}
                    style={{
                      fontSize: '1.15rem',
                      fontWeight: 800,
                      color: '#059669',
                      ...(fieldErrors.receivedPayment ? { border: '2px solid #ef4444', backgroundColor: '#fef2f2' } : {})
                    }}
                  />
                  {renderFieldErrorTag('receivedPayment')}
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Payment Mode</label>
                  <select
                    className="form-control"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                  >
                    <option value="CASH">Cash Drawer / Counter</option>
                    <option value="ONLINE">Bank / Online Transfer</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
              </div>

              {/* SALE TYPE CHECK OPTION: Checkin = Counter Sale (Shop), Checkout/Unchecked = Van Sale */}
              <div 
                style={{
                  marginTop: '14px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  backgroundColor: isCounterSale ? '#ecfdf5' : '#f8fafc',
                  border: isCounterSale ? '2px solid #10b981' : '1.5px solid #cbd5e1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease-in-out'
                }}
                onClick={() => setIsCounterSale(!isCounterSale)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    id="counterSaleCheckInput"
                    checked={isCounterSale}
                    onChange={(e) => setIsCounterSale(e.target.checked)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#10b981' }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div>
                    <label 
                      htmlFor="counterSaleCheckInput" 
                      style={{ 
                        fontWeight: 800, 
                        fontSize: '0.92rem', 
                        cursor: 'pointer', 
                        color: isCounterSale ? '#065f46' : '#1e293b', 
                        display: 'block', 
                        marginBottom: '2px' 
                      }}
                    >
                      {isCounterSale ? '🏪 Counter Sale (Shop / Dukan ki Sale)' : '🚐 Van Sale (Field / Supply Delivery)'}
                    </label>
                    <div style={{ fontSize: '0.76rem', color: isCounterSale ? '#047857' : '#64748b' }}>
                      {isCounterSale 
                        ? '✓ Check-in Active: Ye sale shop counter sale me shamil hogi aur Admin panel me Counter Sales me show hogi.' 
                        : '○ Checkout / Unchecked: Ye sale Van Sales me shamil hogi aur Admin panel me Van Sales me show hogi.'}
                    </div>
                  </div>
                </div>
                <span 
                  className={`badge ${isCounterSale ? 'badge-success' : 'badge-secondary'}`} 
                  style={{ fontSize: '0.8rem', padding: '6px 10px', fontWeight: 800, whiteSpace: 'nowrap' }}
                >
                  {isCounterSale ? '🏪 COUNTER' : '🚐 VAN'}
                </span>
              </div>

              {/* Net Remaining Debt or Empty Ledger Status Card */}
              {netRemainingDebt <= 0 ? (
                <div style={{
                  marginTop: '16px',
                  padding: '14px 16px',
                  borderRadius: '10px',
                  backgroundColor: '#dcfce7',
                  border: '2px solid #22c55e',
                  color: '#15803d'
                }}>
                  <div style={{ fontWeight: 900, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={22} color="#16a34a" />
                    ✓ Net Udhar: Rs. 0 (Khata Mukammal Clear / Empty!)
                  </div>
                  <div style={{ fontSize: '0.82rem', marginTop: '4px', color: '#166534' }}>
                    Customer ne apna current bill aur sabqa udhar mukammal ada kar diya hai. Is invoice ke save hotay hi customer ka ledger 0 ho jaye ga.
                  </div>
                  {(parseFloat(String(receivedPayment)) || 0) > totalPayableWithDebt && (
                    <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px dashed #86efac', fontWeight: 800, fontSize: '0.92rem', color: '#047857' }}>
                      Baqaya Wapsi (Change Return): Rs. {((parseFloat(String(receivedPayment)) || 0) - totalPayableWithDebt).toLocaleString()}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{
                  marginTop: '16px',
                  padding: '14px 16px',
                  borderRadius: '10px',
                  backgroundColor: isCreditExceeded ? '#fee2e2' : netRemainingDebt > previousDebt ? '#fff7ed' : '#eff6ff',
                  border: isCreditExceeded ? '2px solid #ef4444' : netRemainingDebt > previousDebt ? '1.5px solid #fdba74' : '1.5px solid #93c5fd',
                  color: isCreditExceeded ? '#991b1b' : netRemainingDebt > previousDebt ? '#c2410c' : '#1e40af'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 900, fontSize: '1.05rem' }}>
                    <span>Net Baqaya Udhar (Remaining Debt):</span>
                    <span style={{ fontSize: '1.2rem', color: isCreditExceeded ? '#dc2626' : netRemainingDebt > previousDebt ? '#ea580c' : '#2563eb' }}>
                      Rs. {netRemainingDebt.toLocaleString()}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.82rem', marginTop: '4px' }}>
                    {netRemainingDebt > previousDebt && (
                      <span>⚠️ Udhar barh gaya hai: Purana udhar Rs. {previousDebt.toLocaleString()} tha, ab Rs. {(netRemainingDebt - previousDebt).toLocaleString()} mazeed udhar barh gaya hai.</span>
                    )}
                    {netRemainingDebt < previousDebt && (
                      <span>📉 Purana udhar kam ho gaya: Purana Rs. {previousDebt.toLocaleString()} tha, ab Rs. {(previousDebt - netRemainingDebt).toLocaleString()} ada ho kar kam ho gaya hai.</span>
                    )}
                    {netRemainingDebt === previousDebt && (
                      <span>↔️ Current bill cash wasool ho gaya, purana udhar Rs. {previousDebt.toLocaleString()} barabar hai.</span>
                    )}
                  </div>
                </div>
              )}

              {/* Walk-in Customer Credit Prohibition Banner */}
              {isWalkInCreditAttempt && (
                <div style={{
                  marginTop: '14px',
                  padding: '14px 16px',
                  borderRadius: '10px',
                  backgroundColor: '#fef2f2',
                  border: '2px solid #dc2626',
                  color: '#991b1b'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertCircle size={22} color="#dc2626" />
                      <span style={{ fontWeight: 800, fontSize: '0.96rem' }}>
                        ⛔ Walk-in Customer Ko Udhar Dena Sakht Mana Hai!
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddCustomerModal(true)}
                      className="btn btn-primary btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}
                    >
                      <UserPlus size={15} /> + Add Customer in List
                    </button>
                  </div>
                  <div style={{ fontSize: '0.84rem', marginTop: '6px', lineHeight: 1.5 }}>
                    Walk-in counter customer ka koi pichla khata / record nahi hota. Baqaya udhar: <b>Rs. {(totalBill - (parseFloat(String(receivedPayment)) || 0)).toLocaleString()}</b>.
                    <br />
                    Agar is customer ko udhar lena hai to pehle isay <b>Customer List</b> me shamil karein taake iska proper khata aur ledger maintain ho sakay.
                  </div>
                </div>
              )}

              {/* Credit Limit Exceeded Warning Banner */}
              {isCreditExceeded && (
                <div style={{
                  marginTop: '14px',
                  padding: '14px 16px',
                  borderRadius: '10px',
                  backgroundColor: '#fee2e2',
                  border: '2px solid #dc2626',
                  color: '#991b1b'
                }}>
                  <div style={{ fontWeight: 800, fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={22} color="#dc2626" />
                    ⛔ Credit Limit Exceeded! (Udhar Limit Pori Ho Gayi Hai)
                  </div>
                  <div style={{ fontSize: '0.84rem', marginTop: '6px', lineHeight: 1.5 }}>
                    Is customer ka kul udhar (Rs. {netRemainingDebt.toLocaleString()}) iski manzoor shuda credit limit (Rs. {customerCreditLimit.toLocaleString()}) se barh chuka hai.
                    <br />
                    <b>Agar is customer ko mazeed maal / supply deni hai to neeche diye gaye button par click kar ke foran credit limit barhayein:</b>
                  </div>
                  <div style={{ marginTop: '10px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => openCreditLimitModal(Math.max(customerCreditLimit + 50000, Math.ceil(netRemainingDebt / 5000) * 5000 + 10000))}
                      className="btn btn-sm"
                      style={{
                        backgroundColor: '#dc2626',
                        color: '#ffffff',
                        fontWeight: 800,
                        padding: '8px 14px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(220, 38, 38, 0.3)'
                      }}
                    >
                      ⚡ Increase Credit Limit to Allow Supply (کریڈٹ لمٹ بڑھائیں اور سپلائی دیں)
                    </button>
                  </div>
                </div>
              )}

              {creditLimitSuccessMsg && (
                <div style={{
                  marginTop: '12px',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#ecfdf5',
                  border: '1.5px solid #10b981',
                  color: '#065f46',
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>{creditLimitSuccessMsg}</span>
                  <button
                    type="button"
                    onClick={() => setCreditLimitSuccessMsg('')}
                    style={{ background: 'none', border: 'none', color: '#065f46', cursor: 'pointer', fontWeight: 900 }}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Notes / Instructions</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Special delivery instructions, van dispatch details"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {isWalkInCreditAttempt && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1.5px solid #f87171',
                borderRadius: '10px',
                padding: '12px 16px',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <div style={{ fontSize: '0.84rem', color: '#991b1b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={18} />
                  <span>⛔ Walk-in Customer ko udhar mana hai. Poora cash wasool karein.</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setReceivedPayment(totalBill);
                    if (fieldErrors.receivedPayment) setFieldErrors(prev => ({ ...prev, receivedPayment: '' }));
                  }}
                  style={{
                    backgroundColor: '#16a34a',
                    color: '#ffffff',
                    border: 'none',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  ✓ Fauri Poora Cash (Rs. {totalBill.toLocaleString()}) Darj Karein
                </button>
              </div>
            )}

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(200px, 1fr) auto auto',
              gap: '10px',
              marginTop: '10px',
              alignItems: 'stretch'
            }}>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmitOrder}
                className="btn btn-primary btn-lg"
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: submitting ? 'wait' : 'pointer',
                  ...(isCreditExceeded || isWalkInCreditAttempt ? { backgroundColor: '#dc2626', borderColor: '#dc2626' } : {})
                }}
              >
                {submitting ? (
                  'Submitting Order to Server...'
                ) : isWalkInCreditAttempt ? (
                  <>
                    <AlertCircle size={20} /> ⚠️ Walk-in Poora Cash Wasool Karein (Click to Submit)
                  </>
                ) : isCreditExceeded ? (
                  <>
                    <AlertCircle size={20} /> ⚠️ Credit Limit Barhayein Ya Cash Lein (Click to View)
                  </>
                ) : (
                  <>
                    <Send size={20} /> Submit & Sync Order Now
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSaveAsDraft}
                disabled={submitting || cart.length === 0}
                style={{
                  backgroundColor: '#fef3c7',
                  color: '#92400e',
                  border: '1.5px solid #fcd34d',
                  borderRadius: '10px',
                  padding: '12px 18px',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  cursor: submitting || cart.length === 0 ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap'
                }}
                title="Save current order in drafts so you can switch tabs or resume later"
              >
                <Bookmark size={18} /> Save as Draft
              </button>

              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Kya aap is order basket ko khali karna chahte hain?')) {
                    setCart([]);
                    setSelectedCustomer(null);
                    setReceivedPayment(0);
                    setActiveDraftId(null);
                    try {
                      localStorage.removeItem('rot_pos_active_cart_backup');
                    } catch (e) {}
                  }
                }}
                disabled={submitting || cart.length === 0}
                style={{
                  backgroundColor: '#fee2e2',
                  color: '#b91c1c',
                  border: '1.5px solid #fca5a5',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: submitting || cart.length === 0 ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
                title="Clear Basket"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Add Customer Modal */}
      {showAddCustomerModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '520px',
            maxHeight: '92vh',
            overflowY: 'auto',
            padding: '20px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ backgroundColor: '#e0f2fe', color: '#0284c7', padding: '8px', borderRadius: '10px' }}>
                  <UserPlus size={20} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                  Add New Customer / Shop
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleQuickCreateCustomer}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Shop / Business Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Al-Madina Autos"
                  value={quickCustForm.shopName}
                  onChange={(e) => setQuickCustForm({ ...quickCustForm, shopName: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Owner Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Haji Aslam"
                    value={quickCustForm.ownerName}
                    onChange={(e) => setQuickCustForm({ ...quickCustForm, ownerName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Mobile Number *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="03001234567"
                    value={quickCustForm.phone}
                    onChange={(e) => setQuickCustForm({ ...quickCustForm, phone: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Area / Van Route</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Dipalpur Road / Kasur"
                    value={quickCustForm.area}
                    onChange={(e) => setQuickCustForm({ ...quickCustForm, area: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Credit Limit (Rs.)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    className="form-control"
                    value={quickCustForm.creditLimit}
                    onChange={(e) => setQuickCustForm({ ...quickCustForm, creditLimit: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Address / Landmark</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Near Shell Pump, Main Bazar"
                  value={quickCustForm.address}
                  onChange={(e) => setQuickCustForm({ ...quickCustForm, address: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingCustomer}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}
                >
                  <UserPlus size={16} /> {creatingCustomer ? 'Saving...' : 'Add & Select Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust / Increase Credit Limit Modal */}
      {showCreditLimitModal && selectedCustomer && (
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
          zIndex: 10000,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '520px',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                  ⚡ Increase Credit Limit / ادھار لمٹ میں اضافہ
                </h3>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  {selectedCustomer.shopName} ({selectedCustomer.ownerName})
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreditLimitModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#64748b', fontWeight: 700 }}
              >
                ✕
              </button>
            </div>

            {/* Financial summary breakdown */}
            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
              fontSize: '0.85rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#64748b' }}>Previous Udhar (سابقہ ادھار):</span>
                <span style={{ fontWeight: 700 }}>Rs. {previousDebt.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#64748b' }}>This Order Total (نیا بل):</span>
                <span style={{ fontWeight: 700, color: '#2563eb' }}>+ Rs. {totalBill.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', borderTop: '1px dashed #cbd5e1', paddingTop: '4px' }}>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>Projected Debt (مجموعی مطلوبہ ادھار):</span>
                <span style={{ fontWeight: 900, color: '#b91c1c' }}>Rs. {netRemainingDebt.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '4px', marginTop: '4px' }}>
                <span style={{ color: '#64748b' }}>Current Credit Limit (موجودہ لمٹ):</span>
                <span style={{ fontWeight: 800, color: '#475569' }}>
                  {customerCreditLimit > 0 ? `Rs. ${customerCreditLimit.toLocaleString()}` : 'Unlimited (0)'}
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveCreditLimit}>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontWeight: 800 }}>
                  Enter New Credit Limit (نئی کریڈٹ لمٹ) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  className="form-control"
                  style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0369a1' }}
                  value={newCreditLimitInput}
                  onChange={(e) => setNewCreditLimitInput(e.target.value)}
                  required
                />
              </div>

              {/* Quick Preset Buttons */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '0.74rem', color: '#64748b', marginBottom: '6px' }}>
                  فوری سلیکشن (Quick Presets):
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setNewCreditLimitInput(String(Math.ceil(netRemainingDebt / 5000) * 5000))}
                    className="btn btn-sm"
                    style={{ padding: '3px 8px', fontSize: '0.75rem', backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', fontWeight: 700 }}
                  >
                    Exact Bill Total (Rs. {(Math.ceil(netRemainingDebt / 5000) * 5000).toLocaleString()})
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewCreditLimitInput(String(Math.max(customerCreditLimit, netRemainingDebt) + 20000))}
                    className="btn btn-sm"
                    style={{ padding: '3px 8px', fontSize: '0.75rem', backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', fontWeight: 700 }}
                  >
                    + Rs. 20,000
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewCreditLimitInput(String(Math.max(customerCreditLimit, netRemainingDebt) + 50000))}
                    className="btn btn-sm"
                    style={{ padding: '3px 8px', fontSize: '0.75rem', backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', fontWeight: 700 }}
                  >
                    + Rs. 50,000
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewCreditLimitInput(String(Math.max(customerCreditLimit, netRemainingDebt) + 100000))}
                    className="btn btn-sm"
                    style={{ padding: '3px 8px', fontSize: '0.75rem', backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', fontWeight: 700 }}
                  >
                    + Rs. 100,000
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewCreditLimitInput('0')}
                    className="btn btn-sm"
                    style={{ padding: '3px 8px', fontSize: '0.75rem', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', fontWeight: 700 }}
                  >
                    Unlimited (0)
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreditLimitModal(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingCreditLimit}
                  className="btn btn-primary"
                  style={{ fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  {updatingCreditLimit ? 'Updating...' : '✓ Update Limit & Allow Supply (لمٹ بڑھائیں)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Post-Sync Generated Invoice Receipt Modal */}
      {showInvoiceModal && completedSale && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            maxWidth: '460px',
            width: '100%',
            maxHeight: '94vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '14px 18px',
              backgroundColor: '#1e293b',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Printer size={18} color="#d97706" />
                <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>
                  Invoice Generated (Record Saved in POS)
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn btn-primary btn-sm"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '6px 12px',
                    fontSize: '0.8rem',
                    fontWeight: 700
                  }}
                >
                  <Printer size={14} /> Print Receipt
                </button>
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(false)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px'
                  }}
                  title="Close Modal"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body / Thermal Printable Area */}
            <div style={{ padding: '20px', overflowY: 'auto', backgroundColor: '#f8fafc' }}>
              <style>{`
                @media print {
                  body * { visibility: hidden !important; }
                  #salesman-receipt-container, #salesman-receipt-container * { visibility: visible !important; }
                  #salesman-receipt-container {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    max-width: 80mm !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    box-shadow: none !important;
                    border: none !important;
                    color: #000000 !important;
                  }
                }
              `}</style>

              <div id="salesman-receipt-container" style={{
                backgroundColor: '#ffffff',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                fontFamily: 'monospace',
                color: '#000000',
                fontSize: '11px'
              }}>
                {/* Company Header */}
                <div style={{ textAlign: 'center', borderBottom: '1px dashed #000000', paddingBottom: '8px', marginBottom: '8px' }}>
                  <h2 style={{ fontSize: '15px', fontWeight: 900, margin: '0 0 2px 0', letterSpacing: '0.5px' }}>
                    {settings?.companyName || 'RAFIQ AUTO & OIL TRADERS'}
                  </h2>
                  <p style={{ margin: '1px 0', fontSize: '10px', fontWeight: 700 }}>
                    Prop: {settings?.proprietorNames || 'M. Shafiq & Haji Muhammad Rafiq'}
                  </p>
                  <p style={{ margin: '1px 0', fontSize: '10px' }}>
                    {settings?.address || '54-Stop Near MCB Bank, Dipalpur Road, Okara'}
                  </p>
                  <p style={{ margin: '1px 0', fontSize: '10px' }}>
                    Ph: {settings?.phone || '0306-9258573 / 0327-7497457'}
                  </p>
                </div>

                {/* Invoice Meta */}
                <div style={{ borderBottom: '1px dashed #000000', paddingBottom: '6px', marginBottom: '8px', fontSize: '11px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span><b>INV #:</b> {completedSale.invoiceNumber}</span>
                    <span><b>DATE:</b> {new Date(completedSale.saleDate || completedSale.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                    <span><b>CUSTOMER:</b> {completedSale.customer?.shopName || 'Walk-in Customer'}</span>
                    <span><b>PHONE:</b> {completedSale.customer?.phone || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                    <span><b>SALESMAN:</b> {completedSale.salesman?.fullName || 'Sales Portal'}</span>
                    <span><b>MODE:</b> {completedSale.paymentMethod || 'CASH'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                    <span><b>TYPE:</b> <b>{completedSale.saleType === 'COUNTER' ? 'COUNTER SALE (SHOP)' : 'VAN SALE (FIELD)'}</b></span>
                  </div>
                </div>

                {/* Items Table */}
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
                      {completedSale.items?.map((it: any, idx: number) => {
                        const isPrimary = it.unitType === 'PRIMARY';
                        const unitName = isPrimary
                          ? (it.product?.primaryUnit?.name || it.product?.primaryUnit?.symbol || 'Carton')
                          : (it.product?.unit?.name || it.product?.unit?.symbol || 'Piece');
                        return (
                          <tr key={idx} style={{ verticalAlign: 'top' }}>
                            <td style={{ paddingTop: '4px', maxWidth: '140px', wordBreak: 'break-word' }}>
                              <b>{it.product?.name || `Item #${idx + 1}`}</b>
                            </td>
                            <td style={{ textAlign: 'center', paddingTop: '4px', whiteSpace: 'nowrap' }}>
                              <b>{Number(it.quantity)}</b> <span style={{ fontSize: '9px', color: '#333' }}>{unitName}</span>
                            </td>
                            <td style={{ textAlign: 'right', paddingTop: '4px' }}>
                              {Number(it.unitPrice).toLocaleString()}
                            </td>
                            <td style={{ textAlign: 'right', paddingTop: '4px', fontWeight: 700 }}>
                              {(Number(it.quantity) * Number(it.unitPrice)).toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Totals Breakdown in EXACT REQUIRED SEQUENCE */}
                {(() => {
                  const isWalkIn =
                    !completedSale.customer ||
                    completedSale.customer.phone === '00000000000' ||
                    completedSale.customer.shopName?.toLowerCase().includes('walk-in');
                  const netBill = Number(completedSale.netAmount || 0);
                  const currentReceivable = Number(completedSale.customer?.currentReceivable || 0);
                  const billRemaining = Number(completedSale.remainingBalance || 0);
                  // Previous udhar before this invoice
                  const previousUdhar = isWalkIn ? 0 : Math.max(0, currentReceivable - billRemaining);
                  const grandTotal = netBill + previousUdhar;
                  const paidAmount = Number(completedSale.receivedAmount || 0);
                  const remainingBalance = Math.max(0, grandTotal - paidAmount);

                  return (
                    <div style={{ borderBottom: '1px dashed #000000', paddingBottom: '8px', marginBottom: '10px', fontSize: '11px' }}>
                      {Number(completedSale.discount) > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', color: '#555' }}>
                          <span>GROSS TOTAL:</span>
                          <span>Rs. {Number(completedSale.totalAmount).toLocaleString()}</span>
                        </div>
                      )}
                      {Number(completedSale.discount) > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#15803d', fontWeight: 600 }}>
                          <span>DISCOUNT:</span>
                          <span>- Rs. {Number(completedSale.discount).toLocaleString()}</span>
                        </div>
                      )}

                      {/* 1. NET BILL */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontWeight: 900,
                        fontSize: '12px',
                        borderTop: Number(completedSale.discount) > 0 ? '1px dashed #000000' : 'none',
                        paddingTop: '3px'
                      }}>
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
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontWeight: 900,
                        fontSize: '13px',
                        borderTop: '1px solid #000000',
                        borderBottom: '1px solid #000000',
                        padding: '4px 0',
                        margin: '4px 0'
                      }}>
                        <span>GRAND TOTAL:</span>
                        <span>Rs. {grandTotal.toLocaleString()}</span>
                      </div>

                      {/* 4. PAID AMOUNT */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px' }}>
                        <span>PAID AMOUNT:</span>
                        <span style={{ fontWeight: 700 }}>Rs. {paidAmount.toLocaleString()}</span>
                      </div>

                      {/* 5. REMAINING BALANCE */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontWeight: 900,
                        fontSize: '12px',
                        marginTop: '4px',
                        paddingTop: '3px',
                        borderTop: '1px dashed #000000'
                      }}>
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
                    * {completedSale.invoiceNumber} *
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
        </div>
      )}

      {/* SAVED DRAFT ORDERS MODAL */}
      {showDraftsModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ backgroundColor: '#f59e0b', padding: '6px', borderRadius: '8px', color: '#0f172a' }}>
                  <Bookmark size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                    Saved Draft Orders (عارضی محفوظ شدہ ڈرافٹس)
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    Jab tak invoice submit na ho, yahan orders mehfooz rehte hain
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDraftsModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.4rem', cursor: 'pointer', fontWeight: 800 }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1, backgroundColor: '#f8fafc' }}>
              {drafts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📋</div>
                  <h4 style={{ fontWeight: 800, color: '#334155', margin: '0 0 6px 0' }}>Koi Draft Order Save Nahi Hai</h4>
                  <p style={{ fontSize: '0.85rem', maxWidth: '380px', margin: '0 auto', color: '#64748b' }}>
                    Jab aap order basket mein items add kar ke <b>"Save as Draft"</b> click karein ge, ya kisi aur tab mein jayen ge, to order yahan mehfooz rahe ga.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Kul Mehfooz Drafts: {drafts.length}</span>
                    <span>Click 'Load' to resume bill</span>
                  </div>

                  {drafts.map((draft) => {
                    const isDraftWalkIn = !draft.customer || draft.customer.phone === '00000000000' || draft.customer.shopName?.toLowerCase().includes('walk-in');
                    return (
                      <div
                        key={draft.id}
                        style={{
                          backgroundColor: '#ffffff',
                          border: activeDraftId === draft.id ? '2px solid #f59e0b' : '1px solid #e2e8f0',
                          borderRadius: '12px',
                          padding: '16px',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Store size={16} color="#d97706" />
                              {draft.customer?.shopName || 'Walk-in Customer / Counter Sale'}
                              {isDraftWalkIn && (
                                <span style={{ backgroundColor: '#dcfce7', color: '#15803d', fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                  Cash Counter
                                </span>
                              )}
                              {activeDraftId === draft.id && (
                                <span style={{ backgroundColor: '#fef3c7', color: '#b45309', fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                                  Currently Open
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                              Phone: {draft.customer?.phone || '00000000000'} &bull; Saved: {new Date(draft.createdAt).toLocaleString()}
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Draft Bill Total:</div>
                            <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#059669' }}>
                              Rs. {Number(draft.totalBill || 0).toLocaleString()}
                            </div>
                          </div>
                        </div>

                        {/* Items preview */}
                        <div style={{
                          backgroundColor: '#f8fafc',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          color: '#334155',
                          border: '1px solid #e2e8f0'
                        }}>
                          <div style={{ fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
                            Products ({draft.cart?.length || 0} items):
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {draft.cart?.map((it, idx) => (
                              <span
                                key={idx}
                                style={{
                                  backgroundColor: '#ffffff',
                                  border: '1px solid #cbd5e1',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem'
                                }}
                              >
                                {it.product.name} &times; <b>{it.quantity} {it.unitType === 'PRIMARY' ? 'Ctn' : 'Pcs'}</b> (@ Rs. {it.unitPrice})
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                          <button
                            type="button"
                            onClick={() => handleDeleteDraft(draft.id, draft.name)}
                            className="btn btn-sm"
                            style={{
                              backgroundColor: '#fee2e2',
                              color: '#b91c1c',
                              border: '1px solid #fca5a5',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontWeight: 700,
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Trash2 size={14} /> Delete Draft
                          </button>

                          <button
                            type="button"
                            onClick={() => handleLoadDraft(draft)}
                            className="btn btn-primary btn-sm"
                            style={{
                              padding: '6px 14px',
                              borderRadius: '6px',
                              fontWeight: 800,
                              fontSize: '0.8rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <FileText size={14} /> Load / Continue Invoice
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#ffffff' }}>
              <button
                type="button"
                onClick={() => setShowDraftsModal(false)}
                className="btn btn-outline"
                style={{ padding: '6px 18px', fontWeight: 700 }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
