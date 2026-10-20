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
  const [searchProduct, setSearchProduct] = useState('');

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

  const totalBill = cart.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );

  const pendingBalance = Math.max(0, totalBill - receivedPayment);

  const handleSubmitOrder = async () => {
    if (!selectedCustomer) {
      setErrorMsg('Please select a customer / shop first');
      return;
    }
    if (cart.length === 0) {
      setErrorMsg('Please add at least one item to order');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
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
        setCart([]);
        setReceivedPayment(0);
        setNotes('');
        setSelectedCustomer(null);
        loadData();
      }
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.message || 'Failed to submit order. Please retry.'
      );
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
        justifyContent: 'space-between'
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
      </div>

      {successMsg && (
        <div style={{
          backgroundColor: '#d1fae5',
          border: '1px solid #a7f3d0',
          color: '#065f46',
          padding: '16px',
          borderRadius: '12px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <CheckCircle size={22} />
          <span style={{ fontWeight: 600 }}>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div style={{
          backgroundColor: '#fee2e2',
          border: '1px solid #fecaca',
          color: '#991b1b',
          padding: '16px',
          borderRadius: '12px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <AlertCircle size={22} />
          <span style={{ fontWeight: 600 }}>{errorMsg}</span>
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
            style={{ fontSize: '1rem', padding: '12px' }}
            value={selectedCustomer?.id || ''}
            onChange={(e) => {
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
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Previous Udhar / Balance:</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: Number(selectedCustomer.currentReceivable) > 0 ? '#dc2626' : '#16a34a' }}>
                Rs. {Number(selectedCustomer.currentReceivable).toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* STEP 2: SELECT PRODUCTS */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header" style={{ marginBottom: '12px' }}>
          <h3 className="card-title">2. Select Products</h3>
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
                    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr auto', gap: '10px', alignItems: 'center' }}>
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
                          style={{ fontSize: '0.85rem', padding: '4px 8px', fontWeight: 700 }}
                          value={item.unitPrice === 0 ? '' : item.unitPrice}
                          placeholder="0"
                          onChange={(e) => {
                            const val = e.target.value === '' ? 0 : Number(e.target.value);
                            updatePrice(index, val);
                          }}
                        />
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
              backgroundColor: '#f1f5f9',
              borderRadius: '12px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '1.1rem', fontWeight: 800 }}>
                <span>Total Order Amount:</span>
                <span style={{ color: '#0f172a' }}>Rs. {totalBill.toLocaleString()}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '14px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Payment Received (Rs.)</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="0"
                    value={receivedPayment === 0 ? '' : receivedPayment}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : Number(e.target.value);
                      setReceivedPayment(val);
                    }}
                    style={{ fontSize: '1.1rem', fontWeight: 700, color: '#059669' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Payment Mode</label>
                  <select
                    className="form-control"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                  >
                    <option value="CASH">Cash Drawer</option>
                    <option value="ONLINE">Bank / Online Transfer</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '16px',
                paddingTop: '12px',
                borderTop: '1px solid #cbd5e1',
                fontSize: '1rem',
                fontWeight: 800
              }}>
                <span>Remaining Balance (New Udhar):</span>
                <span style={{ color: pendingBalance > 0 ? '#dc2626' : '#059669' }}>
                  Rs. {pendingBalance.toLocaleString()}
                </span>
              </div>
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
              disabled={submitting}
              onClick={handleSubmitOrder}
              className="btn btn-primary btn-lg"
              style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '10px' }}
            >
              {submitting ? 'Submitting Order to Server...' : (
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
