import React, { useEffect, useState } from 'react';
import api, { getMediaUrl } from '../services/api';
import { Customer, Product } from '../types';
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
  ShoppingBag,
  Store
} from 'lucide-react';

interface ExtendedProduct extends Product {
  conversionFactor?: number;
  primaryUnit?: { id: string; name: string; symbol: string };
}

interface CartItem {
  product: ExtendedProduct;
  quantity: number;
  unitType: 'PRIMARY' | 'SECONDARY';
  unitPrice: number;
  standardRate: number;
  rateInfo?: {
    hasHistory: boolean;
    suggestedRate: number;
    standardRate: number;
    previousInvoice?: string;
    previousDate?: string;
  };
}

export const SalesmanPortal: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<ExtendedProduct[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [receivedPayment, setReceivedPayment] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'ONLINE' | 'CHEQUE'>('CASH');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [searchProduct, setSearchProduct] = useState('');
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [cRes, pRes] = await Promise.all([
        api.get('/partners/customers'),
        api.get('/products'),
      ]);
      setCustomers(cRes.data.customers || []);
      setProducts(pRes.data.data || []);
    } catch (e) {
      console.error('Error loading salesman data', e);
    }
  };

  const fetchCustomerRate = async (customerId: string, productId: string, unitType: 'PRIMARY' | 'SECONDARY') => {
    try {
      const res = await api.get('/sales/customer-rate', {
        params: { customerId, productId, unitType }
      });
      return res.data;
    } catch {
      return null;
    }
  };

  const addToCart = async (product: ExtendedProduct) => {
    if (fieldErrors.cart) setFieldErrors(prev => ({ ...prev, cart: '' }));
    const existingIndex = cart.findIndex((item) => item.product.id === product.id);
    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
      return;
    }

    let initialPrice = Number(product.salePrice);
    let rateInfo: any = null;

    if (selectedCustomer) {
      rateInfo = await fetchCustomerRate(selectedCustomer.id, product.id, 'SECONDARY');
      if (rateInfo?.suggestedRate) {
        initialPrice = Number(rateInfo.suggestedRate);
      }
    }

    setCart([
      ...cart,
      {
        product,
        quantity: 1,
        unitType: 'SECONDARY',
        unitPrice: initialPrice,
        standardRate: Number(product.salePrice),
        rateInfo: rateInfo || undefined,
      },
    ]);
  };

  const handleUnitChange = async (index: number, newUnit: 'PRIMARY' | 'SECONDARY') => {
    const item = cart[index];
    const conv = Number(item.product.conversionFactor) || 1;
    let newPrice = item.unitPrice;

    if (selectedCustomer) {
      const rateData = await fetchCustomerRate(selectedCustomer.id, item.product.id, newUnit);
      if (rateData?.suggestedRate) {
        newPrice = Number(rateData.suggestedRate);
      } else {
        newPrice = newUnit === 'PRIMARY' ? Number(item.product.salePrice) * conv : Number(item.product.salePrice);
      }
      const updated = [...cart];
      updated[index] = { ...item, unitType: newUnit, unitPrice: newPrice, rateInfo: rateData };
      setCart(updated);
    } else {
      if (newUnit === 'PRIMARY') {
        newPrice = Number(item.product.salePrice) * conv;
      } else {
        newPrice = Number(item.product.salePrice);
      }
      const updated = [...cart];
      updated[index] = { ...item, unitType: newUnit, unitPrice: newPrice };
      setCart(updated);
    }
  };

  const updateQuantity = (index: number, delta: number) => {
    const updated = [...cart];
    const newQty = updated[index].quantity + delta;
    if (newQty > 0) {
      updated[index].quantity = newQty;
      setCart(updated);
    } else {
      removeFromCart(index);
    }
  };

  const updatePrice = (index: number, newPrice: number) => {
    const updated = [...cart];
    updated[index].unitPrice = newPrice;
    setCart(updated);
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const previousDebt = Number(selectedCustomer?.currentReceivable || 0);
  const customerCreditLimit = Number(selectedCustomer?.creditLimit || 0);
  const isWalkIn = selectedCustomer?.phone === '00000000000' || selectedCustomer?.shopName?.toLowerCase().includes('walk-in');

  const totalBill = cart.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );

  const totalPayableWithDebt = totalBill + previousDebt;
  const netRemainingDebt = totalPayableWithDebt - receivedPayment;
  const isCreditExceeded = !isWalkIn && customerCreditLimit > 0 && netRemainingDebt > customerCreditLimit;

  const handleSubmitOrder = async () => {
    const errors: Record<string, string> = {};

    if (!selectedCustomer) {
      errors.customer = 'Pehlay Customer / Dukan select karna lazmi hai';
    }
    if (cart.length === 0) {
      errors.cart = 'Order me kam az kam 1 product add karna lazmi hai';
    }
    cart.forEach((it, idx) => {
      if (it.quantity <= 0 || isNaN(it.quantity)) {
        errors[`qty_${idx}`] = 'Tadaad (Quantity) kam az kam 1 honi chahiye';
      }
      if (it.unitPrice < 0 || isNaN(it.unitPrice)) {
        errors[`price_${idx}`] = 'Unit rate 0 ya is se barhi raqam honi chahiye';
      }
    });
    if (receivedPayment < 0 || isNaN(receivedPayment)) {
      errors.receivedPayment = 'Received payment minus me nahi ho sakti';
    }
    if (isCreditExceeded) {
      errors.customer = `⛔ Customer ka udhar credit limit (Rs. ${customerCreditLimit.toLocaleString()}) se barh gaya hai. Bill creation disabled hai!`;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setErrorMsg(isCreditExceeded ? `⛔ Credit Limit Exceeded! Customer ka udhar (Rs. ${netRemainingDebt.toLocaleString()}) credit limit se zyada hai.` : 'POS me entry me mistake ha! Neeche red box check karein.');
      return;
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
        items: cart.map((it) => ({
          productId: it.product.id,
          quantity: it.quantity,
          unitType: it.unitType,
          unitPrice: Number(it.unitPrice),
          isRateOverridden: it.unitPrice !== it.standardRate,
          originalRate: it.standardRate,
        })),
        receivedAmount: Number(receivedPayment),
        paymentMethod,
        notes,
      };

      const res = await api.post('/sales', payload);
      if (res.data.success) {
        setSuccessMsg(
          `Invoice ${res.data.sale?.invoiceNumber || ''} created successfully! Customer rate history updated.`
        );
        setErrorMsg('');
        setCart([]);
        setReceivedPayment(0);
        setNotes('');
        setSelectedCustomer(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        loadData();
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

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchProduct.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchProduct.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', paddingBottom: '60px' }}>
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
            {currentDateTime.toLocaleDateString()} {currentDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
          </div>
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

      {/* STEP 1: SELECT CUSTOMER */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <h3 className="card-title" style={{ margin: 0 }}>
            1. Select Customer / Shop (For Negotiated Rate History)
          </h3>
          <button
            type="button"
            onClick={() => {
              const walkIn = customers.find(c => c.phone === '00000000000' || c.shopName.toLowerCase().includes('walk-in'));
              if (walkIn) {
                setSelectedCustomer(walkIn);
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
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <select
            className="form-control"
            style={{
              fontSize: '1rem',
              padding: '12px',
              ...(fieldErrors.customer ? { border: '2px solid #ef4444', backgroundColor: '#fef2f2' } : {})
            }}
            value={selectedCustomer?.id || ''}
            onChange={(e) => {
              if (fieldErrors.customer) setFieldErrors(prev => ({ ...prev, customer: '' }));
              const cust = customers.find((c) => c.id === e.target.value);
              setSelectedCustomer(cust || null);
            }}
          >
            <option value="">-- Choose Assigned Shop / Garage --</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.shopName} ({c.ownerName}) - Balance: Rs. {Number(c.currentReceivable).toLocaleString()}
              </option>
            ))}
          </select>
          {renderFieldErrorTag('customer')}
        </div>

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
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Previous Udhar / Sabqa Baqaya:</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: Number(selectedCustomer.currentReceivable) > 0 ? '#dc2626' : '#16a34a' }}>
                Rs. {Number(selectedCustomer.currentReceivable).toLocaleString()}
              </div>
              {!isWalkIn && customerCreditLimit > 0 && (
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                  Credit Limit: <b>Rs. {customerCreditLimit.toLocaleString()}</b>
                  {previousDebt > customerCreditLimit && (
                    <span style={{ color: '#dc2626', fontWeight: 700, display: 'block' }}>⚠️ Udhar limit se zyada hai</span>
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
                      Code: {p.sku} | In Stock: <b>{Number(p.currentStock)}</b> {p.unit?.symbol || ''}
                      {p.conversionFactor && p.conversionFactor > 1 && (
                        <span style={{ marginLeft: '6px', color: '#d97706', fontWeight: 600 }}>
                          (1 {p.primaryUnit?.symbol || 'Ctn'} = {p.conversionFactor} {p.unit?.symbol || 'Pcs'})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, color: '#d97706', fontSize: '1.02rem' }}>
                    Rs. {Number(p.salePrice).toLocaleString()}
                  </div>
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
      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 className="card-title" style={{ marginBottom: '14px' }}>
          3. Order Basket & Negotiated Unit Rates
        </h3>

        {cart.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
            Basket is empty. Select products above to calculate bill.
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              {cart.map((item, index) => {
                const conv = Number(item.product.conversionFactor) || 1;
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
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{item.product.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Code: {item.product.sku}</div>
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
                      {/* Unit Type (Carton vs Bottle) */}
                      <div>
                        {conv > 1 ? (
                          <select
                            className="form-control"
                            style={{ fontSize: '0.8rem', padding: '6px 8px' }}
                            value={item.unitType}
                            onChange={(e) => handleUnitChange(index, e.target.value as any)}
                          >
                            <option value="SECONDARY">Bottle / Pcs</option>
                            <option value="PRIMARY">Carton ({conv} pcs)</option>
                          </select>
                        ) : (
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                            {item.product.unit?.symbol || 'Unit'}
                          </span>
                        )}
                      </div>

                      {/* Quantity Selector */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => updateQuantity(index, -1)}
                          className="btn btn-outline"
                          style={{ padding: '4px 8px' }}
                        >
                          <Minus size={12} />
                        </button>
                        <span style={{ fontWeight: 800, minWidth: '24px', textAlign: 'center', fontSize: '0.9rem' }}>
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(index, 1)}
                          className="btn btn-outline"
                          style={{ padding: '4px 8px' }}
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      {/* Editable Rate */}
                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '2px' }}>Unit Rate (Rs.)</div>
                        <input
                          type="number"
                          className="form-control"
                          style={{
                            fontSize: '0.85rem',
                            padding: '4px 8px',
                            fontWeight: 700,
                            ...(fieldErrors[`price_${index}`] ? { border: '2px solid #ef4444', backgroundColor: '#fef2f2' } : {})
                          }}
                          value={item.unitPrice === 0 ? '' : item.unitPrice}
                          placeholder="0"
                          onChange={(e) => {
                            if (fieldErrors[`price_${index}`]) {
                              setFieldErrors(prev => ({ ...prev, [`price_${index}`]: '' }));
                            }
                            const val = e.target.value === '' ? 0 : Number(e.target.value);
                            updatePrice(index, val);
                          }}
                        />
                        {renderFieldErrorTag(`price_${index}`)}
                      </div>

                      {/* Line Total */}
                      <div style={{ textAlign: 'right', minWidth: '90px' }}>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Line Total</div>
                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>
                          Rs. {(item.unitPrice * item.quantity).toLocaleString()}
                        </div>
                      </div>
                    </div>
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
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Sabqa Udhar (Previous Debt):</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: previousDebt > 0 ? '#dc2626' : '#16a34a' }}>
                    Rs. {previousDebt.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Total Payable (Bill + Sabqa Udhar) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', backgroundColor: '#e2e8f0', padding: '10px 14px', borderRadius: '8px', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>
                  Kul Wajib-ul-Ada (Current Bill + Sabqa Udhar):
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

                  {previousDebt > 0 && (
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
                    className="form-control"
                    placeholder="0"
                    value={receivedPayment === 0 ? '' : receivedPayment}
                    onChange={(e) => {
                      if (fieldErrors.receivedPayment) {
                        setFieldErrors(prev => ({ ...prev, receivedPayment: '' }));
                      }
                      const val = e.target.value === '' ? 0 : Number(e.target.value);
                      setReceivedPayment(val);
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
                  {receivedPayment > totalPayableWithDebt && (
                    <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px dashed #86efac', fontWeight: 800, fontSize: '0.92rem', color: '#047857' }}>
                      Baqaya Wapsi (Change Return): Rs. {(receivedPayment - totalPayableWithDebt).toLocaleString()}
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
                    ⛔ Credit Limit Exceeded! (Udhar Limit Se Zyada Ho Gaya Hai)
                  </div>
                  <div style={{ fontSize: '0.84rem', marginTop: '6px', lineHeight: 1.5 }}>
                    Is customer ka kul udhar (Rs. {netRemainingDebt.toLocaleString()}) iski manzoor shuda credit limit (Rs. {customerCreditLimit.toLocaleString()}) se barh chuka hai.
                    <br />
                    <b>Bill creation disabled hai.</b> Agar invoice banani hai to Customers page se iski credit limit barhayein ya cash wasooli enter karein taake udhar limit ke andar aa jaye.
                  </div>
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

            <button
              type="button"
              disabled={submitting || isCreditExceeded}
              onClick={handleSubmitOrder}
              className="btn btn-primary btn-lg"
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '10px',
                ...(isCreditExceeded ? { backgroundColor: '#ef4444', borderColor: '#ef4444', opacity: 0.85, cursor: 'not-allowed' } : {})
              }}
            >
              {submitting ? 'Submitting Order to Server...' : isCreditExceeded ? (
                <>
                  <AlertCircle size={20} /> ⛔ Credit Limit Exceeded — Invoice Disabled (Limit Barhayein Ya Cash Lein)
                </>
              ) : (
                <>
                  <Send size={20} /> Submit & Sync Order Now
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
