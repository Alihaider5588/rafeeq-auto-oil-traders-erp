import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Customer, Supplier, User } from '../types';
import { Users, Building2, Plus, Phone, MapPin, Trash2, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const CustomersAndSuppliersPage: React.FC<{ type: 'CUSTOMERS' | 'SUPPLIERS' }> = ({ type }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [data, setData] = useState<any[]>([]);
  const [salesmen, setSalesmen] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [partnerMode, setPartnerMode] = useState<'STANDARD' | 'DUAL'>('STANDARD');
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [formCustomer, setFormCustomer] = useState({
    shopName: '',
    ownerName: '',
    phone: '',
    address: '',
    area: '',
    salesmanId: '',
    openingBalance: '0',
    creditLimit: '100000',
  });

  const [formSupplier, setFormSupplier] = useState({
    companyName: '',
    contactPerson: '',
    phone: '',
    address: '',
    openingBalance: '0',
  });

  const [formDual, setFormDual] = useState({
    name: '',
    ownerName: '',
    phone: '',
    address: '',
    area: '',
    salesmanId: '',
    openingReceivable: '0',
    openingPayable: '0',
    creditLimit: '100000',
    notes: '',
  });

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

  useEffect(() => {
    setSearchTerm('');
    loadData();
  }, [type]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (type === 'CUSTOMERS') {
        const [cRes, uRes] = await Promise.all([
          api.get('/partners/customers'),
          api.get('/auth/users'),
        ]);
        setData(cRes.data.customers || []);
        setSalesmen((uRes.data.users || []).filter((u: any) => u.role === 'SALESMAN'));
      } else {
        const [sRes, uRes] = await Promise.all([
          api.get('/partners/suppliers'),
          api.get('/auth/users'),
        ]);
        setData(sRes.data.suppliers || []);
        setSalesmen((uRes.data.users || []).filter((u: any) => u.role === 'SALESMAN'));
      }
    } catch (e: any) {
      console.error(e);
      triggerOperationError(e.response?.data?.message || 'Data load karne me masla pesh aya');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/partners/customers', {
        ...formCustomer,
        openingBalance: parseFloat(formCustomer.openingBalance || '0'),
        creditLimit: parseFloat(formCustomer.creditLimit || '0'),
      });
      setShowModal(false);
      triggerOperationSuccess(`Customer "${formCustomer.shopName}" kamyabi se shamil ho gaya!`);
      loadData();
    } catch (err: any) {
      triggerOperationError(err.response?.data?.message || 'Customer shamil nahi ho saka. Barah-e-karam details check karein.');
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/partners/suppliers', {
        ...formSupplier,
        openingBalance: parseFloat(formSupplier.openingBalance || '0'),
      });
      setShowModal(false);
      triggerOperationSuccess(`Supplier "${formSupplier.companyName}" kamyabi se shamil ho gaya!`);
      loadData();
    } catch (err: any) {
      triggerOperationError(err.response?.data?.message || 'Supplier shamil nahi ho saka. Barah-e-karam details check karein.');
    }
  };

  const handleCreateDualPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/partners/dual', {
        name: formDual.name,
        ownerName: formDual.ownerName,
        phone: formDual.phone,
        address: formDual.address,
        area: formDual.area,
        salesmanId: formDual.salesmanId || undefined,
        openingReceivable: parseFloat(formDual.openingReceivable || '0'),
        openingPayable: parseFloat(formDual.openingPayable || '0'),
        creditLimit: parseFloat(formDual.creditLimit || '100000'),
        notes: formDual.notes,
      });
      setShowModal(false);
      triggerOperationSuccess(`Dual Partner "${formDual.name}" (Customer + Supplier Both) kamyabi se shamil ho gaya! Ab yeh Sales aur Purchases dono me dastiyab hai.`);
      loadData();
    } catch (err: any) {
      triggerOperationError(err.response?.data?.message || 'Dual Partner shamil nahi ho saka. Barah-e-karam details check karein.');
    }
  };

  const handleDeleteItem = async (id: string, name: string) => {
    const isCustomer = type === 'CUSTOMERS';
    const label = isCustomer ? 'CUSTOMER' : 'SUPPLIER';
    const confirmed = window.confirm(
      `⚠️ KYA AAP WAQAI IS ${label} KO DATABASE AUR POS SE PERMANENTLY DELETE KARNA CHAHTE HAIN?\n\n"${name}"\n\nIs ${isCustomer ? 'customer ka tamam ledger aur sales' : 'supplier ka tamam ledger aur purchases'} database se mukammal delete ho jaye ga.`
    );
    if (!confirmed) return;

    try {
      setLoading(true);
      const url = isCustomer ? `/partners/customers/${id}` : `/partners/suppliers/${id}`;
      const res = await api.delete(url);
      triggerOperationSuccess(res.data.message || `${label} "${name}" database aur POS se permanently delete ho gaya!`);
      loadData();
    } catch (err: any) {
      triggerOperationError(err.response?.data?.message || `${label} delete nahi ho saka. Barah-e-karam dobara koshish karein.`);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = data.filter((item) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const name = (type === 'CUSTOMERS' ? item.shopName : item.companyName) || '';
    const contact = (type === 'CUSTOMERS' ? item.ownerName : item.contactPerson) || '';
    const phone = item.phone || '';
    const addressOrArea = (type === 'CUSTOMERS' ? item.area : item.address) || '';
    const salesman = item.salesman?.fullName || '';

    return (
      name.toLowerCase().includes(term) ||
      contact.toLowerCase().includes(term) ||
      phone.toLowerCase().includes(term) ||
      addressOrArea.toLowerCase().includes(term) ||
      salesman.toLowerCase().includes(term)
    );
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>
            {type === 'CUSTOMERS' ? 'Customer & Auto Shops Directory' : 'Oil Suppliers & Refining Companies'}
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            {type === 'CUSTOMERS'
              ? 'Manage retail buyers, workshops, route assignments and credit limits'
              : 'Authorized oil distributors, lubricant importers and direct suppliers'}
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <Plus size={18} /> Add New {type === 'CUSTOMERS' ? 'Customer' : 'Supplier'}
        </button>
      </div>

      {/* Search Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '16px',
        flexWrap: 'wrap'
      }}>
        <div style={{ position: 'relative', flex: '1', maxWidth: '480px', minWidth: '260px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            className="form-control"
            placeholder={
              type === 'CUSTOMERS'
                ? 'Search customer by shop, owner, phone, area...'
                : 'Search supplier by company, contact person, phone, address...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '38px', paddingRight: searchTerm ? '36px' : '12px' }}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              style={{
                position: 'absolute',
                right: '10px',
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
        <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
          {searchTerm ? (
            <span>Found <b style={{ color: '#0f172a' }}>{filteredData.length}</b> of <b>{data.length}</b> records</span>
          ) : (
            <span>Total: <b>{data.length}</b> {type === 'CUSTOMERS' ? 'Customers' : 'Suppliers'}</span>
          )}
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>{type === 'CUSTOMERS' ? 'Shop / Business' : 'Company Name'}</th>
              <th>Contact Person</th>
              <th>Phone</th>
              <th>{type === 'CUSTOMERS' ? 'Area / Route' : 'Address'}</th>
              {type === 'CUSTOMERS' && <th>Assigned Salesman</th>}
              <th style={{ textAlign: 'right' }}>
                {type === 'CUSTOMERS' ? 'Outstanding Udhar' : 'Outstanding Payable'}
              </th>
              <th>Status</th>
              <th style={{ textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  Loading directory...
                </td>
              </tr>
            ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '35px', color: '#94a3b8' }}>
                  {searchTerm ? (
                    <div>
                      <p style={{ fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>
                        No {type === 'CUSTOMERS' ? 'customers' : 'suppliers'} match "{searchTerm}".
                      </p>
                      <button
                        type="button"
                        onClick={() => setSearchTerm('')}
                        className="btn btn-outline btn-sm"
                      >
                        Clear Search
                      </button>
                    </div>
                  ) : (
                    'No records registered yet.'
                  )}
                </td>
              </tr>
            ) : (
              filteredData.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 700, color: '#0f172a' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span>{type === 'CUSTOMERS' ? item.shopName : item.companyName}</span>
                      {item.isDualPartner && (
                        <span className="badge badge-warning" style={{ fontSize: '0.68rem', fontWeight: 800, padding: '2px 6px' }}>
                          🤝 Dual Partner
                        </span>
                      )}
                    </div>
                  </td>
                  <td>{type === 'CUSTOMERS' ? item.ownerName : item.contactPerson || '-'}</td>
                  <td>{item.phone}</td>
                  <td>{type === 'CUSTOMERS' ? item.area || '-' : item.address || '-'}</td>
                  {type === 'CUSTOMERS' && <td>{item.salesman?.fullName || 'Unassigned'}</td>}
                  <td style={{
                    textAlign: 'right',
                    fontWeight: 800,
                    color: Number(type === 'CUSTOMERS' ? item.currentReceivable : item.currentPayable) > 0 ? '#dc2626' : '#059669'
                  }}>
                    Rs. {Number(type === 'CUSTOMERS' ? item.currentReceivable : item.currentPayable).toLocaleString()}
                  </td>
                  <td>
                    <span className="badge badge-success">Active</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {isAdmin ? (
                      <button
                        onClick={() => handleDeleteItem(item.id, type === 'CUSTOMERS' ? item.shopName : item.companyName)}
                        className="btn btn-sm"
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#fee2e2',
                          color: '#b91c1c',
                          border: '1px solid #fca5a5',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title={`Permanently Delete ${type === 'CUSTOMERS' ? 'Customer' : 'Supplier'} from DB & POS`}
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Add Partner */}
      {showModal && (
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
            maxWidth: '580px',
            maxHeight: '92vh',
            overflowY: 'auto',
            padding: '24px'
          }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '14px' }}>
              Add New {type === 'CUSTOMERS' ? 'Customer / Shop' : 'Supplier Company'}
            </h2>

            {/* Partner Mode Switcher: Standard vs Dual (Both) */}
            <div style={{
              display: 'flex',
              gap: '6px',
              marginBottom: '18px',
              backgroundColor: '#f1f5f9',
              padding: '4px',
              borderRadius: '8px'
            }}>
              <button
                type="button"
                onClick={() => setPartnerMode('STANDARD')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  backgroundColor: partnerMode === 'STANDARD' ? '#ffffff' : 'transparent',
                  color: partnerMode === 'STANDARD' ? '#0f172a' : '#64748b',
                  boxShadow: partnerMode === 'STANDARD' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                {type === 'CUSTOMERS' ? '👤 Standard Customer (صرف گاہک)' : '🏭 Standard Supplier (صرف سپلائر)'}
              </button>
              <button
                type="button"
                onClick={() => setPartnerMode('DUAL')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  backgroundColor: partnerMode === 'DUAL' ? '#f59e0b' : 'transparent',
                  color: partnerMode === 'DUAL' ? '#ffffff' : '#64748b',
                  boxShadow: partnerMode === 'DUAL' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                🤝 Both / Dual Partner (گاہک اور سپلائر دونوں)
              </button>
            </div>

            {partnerMode === 'DUAL' ? (
              /* DUAL PARTNER FORM (Customer + Supplier Both) */
              <form onSubmit={handleCreateDualPartner}>
                <div style={{
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fde68a',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  color: '#92400e',
                  marginBottom: '14px'
                }}>
                  💡 <b>مشترکہ پارٹنر (Dual Partner):</b> اس پارٹی کا نام کسٹمرز (سیلز) اور سپلائرز (پرچیزز) دونوں میں خودکار رجسٹر ہو جائے گا اور کھاتے میں کٹائی (Contra Clearing) کی جا سکے گی۔
                </div>

                <div className="form-group">
                  <label className="form-label">Shop / Company / Business Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Al-Madina Autos & Oil Depot"
                    value={formDual.name}
                    onChange={(e) => setFormDual({ ...formDual, name: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Owner / Contact Person *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Haji Muhammad Aslam"
                      value={formDual.ownerName}
                      onChange={(e) => setFormDual({ ...formDual, ownerName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mobile Number *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="03001234567"
                      value={formDual.phone}
                      onChange={(e) => setFormDual({ ...formDual, phone: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Area / Sector</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Dipalpur Road Sector"
                      value={formDual.area}
                      onChange={(e) => setFormDual({ ...formDual, area: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Assign Salesman</label>
                    <select
                      className="form-control"
                      value={formDual.salesmanId}
                      onChange={(e) => setFormDual({ ...formDual, salesmanId: e.target.value })}
                    >
                      <option value="">Unassigned</option>
                      {salesmen.map((sm) => (
                        <option key={sm.id} value={sm.id}>{sm.fullName}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Shop / Warehouse Address</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Full address details..."
                    value={formDual.address}
                    onChange={(e) => setFormDual({ ...formDual, address: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ color: '#047857' }}>
                      Opening Receivable (لینا ہے - Rs.)
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="0"
                      value={formDual.openingReceivable}
                      onChange={(e) => setFormDual({ ...formDual, openingReceivable: e.target.value })}
                    />
                    <small style={{ color: '#64748b', fontSize: '0.72rem' }}>اگر ان سے مال کا پیسہ لینا ہے</small>
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ color: '#b91c1c' }}>
                      Opening Payable (دینا ہے - Rs.)
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="0"
                      value={formDual.openingPayable}
                      onChange={(e) => setFormDual({ ...formDual, openingPayable: e.target.value })}
                    />
                    <small style={{ color: '#64748b', fontSize: '0.72rem' }}>اگر ان کو مال کا پیسہ دینا ہے</small>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
                  <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#d97706', borderColor: '#d97706' }}>
                    🤝 Save Dual Partner (دونوں کھاتے بنائیں)
                  </button>
                </div>
              </form>
            ) : type === 'CUSTOMERS' ? (
              <form onSubmit={handleCreateCustomer}>
                <div className="form-group">
                  <label className="form-label">Shop / Business Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Al-Madina Autos"
                    value={formCustomer.shopName}
                    onChange={(e) => setFormCustomer({ ...formCustomer, shopName: e.target.value })}
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Owner Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formCustomer.ownerName}
                      onChange={(e) => setFormCustomer({ ...formCustomer, ownerName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mobile Number *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formCustomer.phone}
                      onChange={(e) => setFormCustomer({ ...formCustomer, phone: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Area / Sector</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Bosan Road Sector"
                      value={formCustomer.area}
                      onChange={(e) => setFormCustomer({ ...formCustomer, area: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Assign Salesman</label>
                    <select
                      className="form-control"
                      value={formCustomer.salesmanId}
                      onChange={(e) => setFormCustomer({ ...formCustomer, salesmanId: e.target.value })}
                    >
                      <option value="">Unassigned</option>
                      {salesmen.map((sm) => (
                        <option key={sm.id} value={sm.id}>{sm.fullName}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Opening Udhar Balance (Rs.)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formCustomer.openingBalance}
                      onChange={(e) => setFormCustomer({ ...formCustomer, openingBalance: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Credit Limit (Rs.)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formCustomer.creditLimit}
                      onChange={(e) => setFormCustomer({ ...formCustomer, creditLimit: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                  <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">Save Customer</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCreateSupplier}>
                <div className="form-group">
                  <label className="form-label">Company / Distributor Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Shell Pakistan Distributor Multan"
                    value={formSupplier.companyName}
                    onChange={(e) => setFormSupplier({ ...formSupplier, companyName: e.target.value })}
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Contact Person</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formSupplier.contactPerson}
                      onChange={(e) => setFormSupplier({ ...formSupplier, contactPerson: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Number *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formSupplier.phone}
                      onChange={(e) => setFormSupplier({ ...formSupplier, phone: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Opening Payable Balance (Rs.)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={formSupplier.openingBalance}
                    onChange={(e) => setFormSupplier({ ...formSupplier, openingBalance: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                  <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">Save Supplier</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
