import React, { useState } from 'react';
import { api } from '../../services/api';
import { X, CheckCircle2, ShoppingBag, AlertCircle, Loader2 } from 'lucide-react';

interface OrderModalProps {
  product: {
    id: string;
    name: string;
    brand: string;
    unitSymbol: string;
    primaryUnit: string | null;
    conversionFactor: number;
    publicPrice: number | null;
  };
  onClose: () => void;
}

export const OnlineOrderModal: React.FC<OrderModalProps> = ({ product, onClose }) => {
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [shopName, setShopName] = useState('');
  const [cityArea, setCityArea] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [unitType, setUnitType] = useState<'SECONDARY' | 'PRIMARY'>('SECONDARY');
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderResult, setOrderResult] = useState<{ orderNumber: string; totalAmount: number } | null>(null);

  // Price calculations
  const basePrice = product.publicPrice || 0;
  const unitPrice = unitType === 'PRIMARY' && product.conversionFactor > 1 
    ? basePrice * product.conversionFactor 
    : basePrice;
  const totalAmount = unitPrice * Math.max(1, quantity);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerName.trim()) {
      setError('Please enter your full name or shop contact person name.');
      return;
    }
    if (!phone.trim()) {
      setError('Please enter your contact mobile number.');
      return;
    }
    if (quantity <= 0) {
      setError('Quantity must be at least 1.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/public/orders', {
        customerName: customerName.trim(),
        phone: phone.trim(),
        shopName: shopName.trim() || undefined,
        cityArea: cityArea.trim() || undefined,
        deliveryAddress: deliveryAddress.trim() || undefined,
        notes: notes.trim() || undefined,
        items: [
          {
            productId: product.id,
            quantity: Number(quantity),
            unitType,
          },
        ],
      });

      if (res.data?.success) {
        setOrderResult(res.data.order);
      } else {
        setError(res.data?.message || 'Failed to place order.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Server error while submitting order. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
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
      zIndex: 9999,
      padding: '16px',
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '560px',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e2e8f0',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#f8fafc',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              backgroundColor: '#fef3c7',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <ShoppingBag size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                Online Order Booking
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                Order will be placed in queue for verification & dispatch
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              padding: '4px',
              borderRadius: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {orderResult ? (
          /* Order Placed Success State */
          <div style={{ padding: '36px 24px', textAlign: 'center' }}>
            <div style={{
              width: '64px',
              height: '64px',
              backgroundColor: '#dcfce7',
              color: '#16a34a',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
            }}>
              <CheckCircle2 size={36} />
            </div>

            <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', margin: '0 0 8px 0' }}>
              Order Placed in Queue!
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', margin: '0 0 20px 0', lineHeight: 1.5 }}>
              آپ کا آرڈر موصول ہو چکا ہے اور تصدیق کی قطار (Queue) میں شامل کر دیا گیا ہے۔ ایڈمن جلد از جلد آپ سے رابطہ کر کے آرڈر کی ترسیل کنفرم کرے گا۔
            </p>

            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px dashed #cbd5e1',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'left',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.88rem' }}>
                <span style={{ color: '#64748b' }}>Order Queue No:</span>
                <strong style={{ color: '#d97706', fontSize: '1rem' }}>{orderResult.orderNumber}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.88rem' }}>
                <span style={{ color: '#64748b' }}>Product:</span>
                <strong style={{ color: '#0f172a' }}>{product.name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.88rem' }}>
                <span style={{ color: '#64748b' }}>Quantity:</span>
                <strong style={{ color: '#0f172a' }}>{quantity} {unitType === 'PRIMARY' ? product.primaryUnit : product.unitSymbol}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #e2e8f0', fontSize: '0.9rem' }}>
                <span style={{ color: '#0f172a', fontWeight: 600 }}>Billing Status:</span>
                <strong style={{ color: '#059669', fontSize: '0.9rem' }}>Official Rate Applied on Dispatch</strong>
              </div>
            </div>

            <button
              onClick={onClose}
              style={{
                backgroundColor: '#0f172a',
                color: '#ffffff',
                border: 'none',
                padding: '12px 28px',
                borderRadius: '8px',
                fontSize: '0.92rem',
                fontWeight: 700,
                cursor: 'pointer',
                width: '100%',
              }}
            >
              Done & Return to Website
            </button>
          </div>
        ) : (
          /* Order Form */
          <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
            {/* Product Snapshot */}
            <div style={{
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '10px',
              padding: '14px',
              marginBottom: '20px',
            }}>
              <div style={{ fontSize: '0.78rem', color: '#b45309', fontWeight: 700, textTransform: 'uppercase' }}>
                {product.brand}
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                {product.name}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '4px' }}>
                Wholesale / Dealer Pricing applied upon confirmation
              </div>
            </div>

            {error && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                padding: '10px 14px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Packaging / Unit Selector */}
            {product.primaryUnit && product.conversionFactor > 1 && (
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                  Select Packaging Unit
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setUnitType('SECONDARY')}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: unitType === 'SECONDARY' ? '2px solid #d97706' : '1px solid #cbd5e1',
                      backgroundColor: unitType === 'SECONDARY' ? '#fef3c7' : '#ffffff',
                      color: unitType === 'SECONDARY' ? '#92400e' : '#334155',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    Loose / Single ({product.unitSymbol})
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnitType('PRIMARY')}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: unitType === 'PRIMARY' ? '2px solid #d97706' : '1px solid #cbd5e1',
                      backgroundColor: unitType === 'PRIMARY' ? '#fef3c7' : '#ffffff',
                      color: unitType === 'PRIMARY' ? '#92400e' : '#334155',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    Pack / Box ({product.primaryUnit} = {product.conversionFactor} {product.unitSymbol})
                  </button>
                </div>
              </div>
            )}

            {/* Quantity */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Quantity ({unitType === 'PRIMARY' && product.primaryUnit ? product.primaryUnit : product.unitSymbol}) *
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{
                    width: '140px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '1rem',
                    fontWeight: 700,
                  }}
                  required
                />
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  units ({unitType === 'PRIMARY' && product.primaryUnit ? product.primaryUnit : product.unitSymbol})
                </span>
              </div>
            </div>

            <div style={{ height: '1px', backgroundColor: '#e2e8f0', margin: '20px 0' }} />

            {/* Customer Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Full Name / Contact Person *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Muhammad Ali"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box',
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Mobile / WhatsApp Phone *
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 0300-1234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box',
                  }}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Shop / Workshop / Business Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Al-Madina Autos"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  City / Tehsil / Area *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Okara / Dipalpur / Renala"
                  value={cityArea}
                  onChange={(e) => setCityArea(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Delivery Address / Van Route Stop
              </label>
              <textarea
                rows={2}
                placeholder="Shop address, road or market landmark for van delivery..."
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.88rem',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Additional Notes / Special Instructions
              </label>
              <input
                type="text"
                placeholder="Any specific delivery time or packing instructions..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.88rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                style={{
                  padding: '10px 18px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: '11px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#d97706',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 8px rgba(217,119,6,0.3)',
                }}
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Submitting to Queue...
                  </>
                ) : (
                  <>
                    <ShoppingBag size={16} /> Place in Order Queue
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
