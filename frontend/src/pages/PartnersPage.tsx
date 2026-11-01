import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Customer, Supplier, User } from '../types';
import { Users, Building2, Plus, Phone, MapPin, Trash2, Search, Edit2, ShieldAlert } from 'lucide-react';
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

  // Edit states
  const [showEditModal, setShowEditModal] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const [editCustomerForm, setEditCustomerForm] = useState({
    id: '',
    shopName: '',
    ownerName: '',
    phone: '',
    address: '',
    area: '',
    salesmanId: '',
    creditLimit: '100000',
    notes: '',
  });

  const [editSupplierForm, setEditSupplierForm] = useState({
    id: '',
    companyName: '',
    contactPerson: '',
    phone: '',
    address: '',
    ntnTaxNumber: '',
    notes: '',
  });

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

  const loadData = async (force: boolean = false) => {
    try {
      setLoading(true);
      const now = Date.now();
      const CACHE_TTL = 15 * 60 * 1000;

      if (type === 'CUSTOMERS') {
        let cachedCustomers = false;
        if (!force) {
          const cachedCustStr = sessionStorage.getItem('rot_cached_customers');
          if (cachedCustStr) {
            try {
              const parsed = JSON.parse(cachedCustStr);
              if (now - parsed.timestamp < CACHE_TTL && Array.isArray(parsed.data) && parsed.data.length > 0) {
                const sanitized = parsed.data.map((c: any) => {
                  if (!c || c.phone === '00000000000' || c.shopName?.toLowerCase().includes('walk-in') || c.id === 'walk-in') {
                    return { ...c, currentReceivable: 0, creditLimit: 0, openingBalance: 0 };
                  }
                  return c;
                });
                setData(sanitized);
                cachedCustomers = true;
              }
            } catch (e) { }
          }
        }

        const promises: Promise<any>[] = [];
        if (!cachedCustomers || force) {
          promises.push(api.get('/partners/customers'));
        } else {
          promises.push(Promise.resolve(null));
        }
        promises.push(api.get('/auth/users').catch(() => null));

        const [cRes, uRes] = await Promise.all(promises);
        if (cRes?.data?.customers) {
          const sanitized = cRes.data.customers.map((c: any) => {
            if (!c || c.phone === '00000000000' || c.shopName?.toLowerCase().includes('walk-in') || c.id === 'walk-in') {
              return { ...c, currentReceivable: 0, creditLimit: 0, openingBalance: 0 };
            }
            return c;
          });
          setData(sanitized);
          try {
            sessionStorage.setItem('rot_cached_customers', JSON.stringify({ data: sanitized, timestamp: now }));
          } catch (e) { }
        }
        if (uRes?.data?.users) {
          setSalesmen((uRes.data.users || []).filter((u: any) => u.role === 'SALESMAN'));
        }
      } else {
        const [sRes, uRes] = await Promise.all([
          api.get('/partners/suppliers'),
          api.get('/auth/users').catch(() => null),
        ]);
        setData(sRes.data.suppliers || []);
        if (uRes?.data?.users) {
          setSalesmen((uRes.data.users || []).filter((u: any) => u.role === 'SALESMAN'));
        }
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
      loadData(true);
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
      loadData(true);
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

  const handleOpenEdit = (item: any) => {
    if (type === 'CUSTOMERS') {
      setEditCustomerForm({
        id: item.id,
        shopName: item.shopName || '',
        ownerName: item.ownerName || '',
        phone: item.phone || '',
        address: item.address || '',
        area: item.area || '',
        salesmanId: item.salesmanId || item.salesman?.id || '',
        creditLimit: item.creditLimit !== undefined ? String(item.creditLimit) : '100000',
        notes: (item.notes || '').replace(/\[DUAL_PARTNER:[^\]]+\]/g, '').trim(),
      });
    } else {
      setEditSupplierForm({
        id: item.id,
        companyName: item.companyName || '',
        contactPerson: item.contactPerson || '',
        phone: item.phone || '',
        address: item.address || '',
        ntnTaxNumber: item.ntnTaxNumber || '',
        notes: (item.notes || '').replace(/\[DUAL_PARTNER:[^\]]+\]/g, '').trim(),
      });
    }
    setShowEditModal(true);
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEdit(true);
    try {
      await api.put(`/partners/customers/${editCustomerForm.id}`, {
        shopName: editCustomerForm.shopName,
        ownerName: editCustomerForm.ownerName,
        phone: editCustomerForm.phone,
        address: editCustomerForm.address,
        area: editCustomerForm.area,
        salesmanId: editCustomerForm.salesmanId || null,
        creditLimit: parseFloat(editCustomerForm.creditLimit || '0'),
        notes: editCustomerForm.notes,
      });
      setShowEditModal(false);
      triggerOperationSuccess(`Customer "${editCustomerForm.shopName}" ki tafseelat kamyabi se update ho gayi hain!`);
      loadData(true);
    } catch (err: any) {
      triggerOperationError(err.response?.data?.message || 'Customer update nahi ho saka. Details check karein.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleUpdateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEdit(true);
    try {
      await api.put(`/partners/suppliers/${editSupplierForm.id}`, {
        companyName: editSupplierForm.companyName,
        contactPerson: editSupplierForm.contactPerson,
        phone: editSupplierForm.phone,
        address: editSupplierForm.address,
        ntnTaxNumber: editSupplierForm.ntnTaxNumber,
        notes: editSupplierForm.notes,
      });
      setShowEditModal(false);
      triggerOperationSuccess(`Supplier "${editSupplierForm.companyName}" ki tafseelat kamyabi se update ho gayi hain!`);
      loadData(true);
    } catch (err: any) {
      triggerOperationError(err.response?.data?.message || 'Supplier update nahi ho saka. Details check karein.');
    } finally {
      setSavingEdit(false);
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
              {type === 'CUSTOMERS' && (
                <th style={{ textAlign: 'right' }}>Credit Limit</th>
              )}
              <th>Status</th>
              <th style={{ textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={type === 'CUSTOMERS' ? 9 : 8} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  Loading directory...
                </td>
              </tr>
            ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan={type === 'CUSTOMERS' ? 9 : 8} style={{ textAlign: 'center', padding: '35px', color: '#94a3b8' }}>
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
                  {type === 'CUSTOMERS' && (
                    <td style={{ textAlign: 'right' }}>
                      {Number(item.creditLimit) > 0 ? (
                        <div>
                          <span style={{ fontWeight: 700, color: '#334155' }}>
                            Rs. {Number(item.creditLimit).toLocaleString()}
                          </span>
                          {Number(item.currentReceivable) >= Number(item.creditLimit) && (
                            <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#dc2626' }}>
                              ⚠️ Limit Reached
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: '#059669', fontSize: '0.78rem', fontWeight: 700 }}>
                          Unlimited
                        </span>
                      )}
                    </td>
                  )}
                  <td>
                    <span className="badge badge-success">Active</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(item)}
                        className="btn btn-sm btn-outline"
                        style={{
                          padding: '4px 8px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: '#4338ca',
                          borderColor: '#c7d2fe',
                          backgroundColor: '#eef2ff'
                        }}
                        title={`Edit ${type === 'CUSTOMERS' ? 'Customer & Credit Limit' : 'Supplier'} Details`}
                      >
                        <Edit2 size={13} /> Edit
                      </button>
                      {isAdmin && (
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
                      )}
                    </div>
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

      {/* Edit Partner Modal */}
      {showEditModal && (
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
            backgroundColor: '#fff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '620px',
            maxHeight: '92vh',
            overflowY: 'auto',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#eef2ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Edit2 size={18} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                    {type === 'CUSTOMERS' ? 'Edit Customer & Credit Limit' : 'Edit Supplier Details'}
                  </h2>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    {type === 'CUSTOMERS' ? 'کسٹمر کی تفصیلات اور ادھار لمٹ میں ترمیم' : 'سپلائر کمپنی کی معلومات میں ترمیم'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#64748b', fontWeight: 700 }}
              >
                ✕
              </button>
            </div>

            {type === 'CUSTOMERS' ? (
              <form onSubmit={handleUpdateCustomer}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Shop / Business Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editCustomerForm.shopName}
                      onChange={(e) => setEditCustomerForm({ ...editCustomerForm, shopName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Owner / Contact Person *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editCustomerForm.ownerName}
                      onChange={(e) => setEditCustomerForm({ ...editCustomerForm, ownerName: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Phone Number *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editCustomerForm.phone}
                      onChange={(e) => setEditCustomerForm({ ...editCustomerForm, phone: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Area / Route (علاقہ / روٹ)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Faisalabad Road, Okara"
                      value={editCustomerForm.area}
                      onChange={(e) => setEditCustomerForm({ ...editCustomerForm, area: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label">Shop Address</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Near MCB Bank, Dipalpur Road"
                    value={editCustomerForm.address}
                    onChange={(e) => setEditCustomerForm({ ...editCustomerForm, address: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label">Assigned Salesman / Order Booker</label>
                  <select
                    className="form-control"
                    value={editCustomerForm.salesmanId}
                    onChange={(e) => setEditCustomerForm({ ...editCustomerForm, salesmanId: e.target.value })}
                  >
                    <option value="">-- No Salesman Assigned (Direct Counter) --</option>
                    {salesmen.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName} ({s.username})
                      </option>
                    ))}
                  </select>
                </div>

                {/* CREDIT LIMIT SECTION */}
                <div style={{
                  backgroundColor: '#f8fafc',
                  border: '2px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '14px',
                  marginBottom: '16px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label className="form-label" style={{ marginBottom: 0, fontWeight: 800, color: '#0f172a', fontSize: '0.92rem' }}>
                      ⚡ Customer Credit Limit / ادھار کی حد (Rs.)
                    </label>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      (0 = Unlimited / بغیر کسی حد کے)
                    </span>
                  </div>

                  <input
                    type="number"
                    min="0"
                    step="1000"
                    className="form-control"
                    style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0369a1', backgroundColor: '#ffffff' }}
                    value={editCustomerForm.creditLimit}
                    onChange={(e) => setEditCustomerForm({ ...editCustomerForm, creditLimit: e.target.value })}
                  />

                  <div style={{ marginTop: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', alignSelf: 'center', marginRight: '4px' }}>
                      فوری اضافہ (Quick Boost):
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditCustomerForm(prev => ({
                        ...prev,
                        creditLimit: String(Math.max(0, Number(prev.creditLimit || 0) + 20000))
                      }))}
                      className="btn btn-sm"
                      style={{ padding: '2px 8px', fontSize: '0.75rem', backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', fontWeight: 700 }}
                    >
                      + Rs. 20,000
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditCustomerForm(prev => ({
                        ...prev,
                        creditLimit: String(Math.max(0, Number(prev.creditLimit || 0) + 50000))
                      }))}
                      className="btn btn-sm"
                      style={{ padding: '2px 8px', fontSize: '0.75rem', backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', fontWeight: 700 }}
                    >
                      + Rs. 50,000
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditCustomerForm(prev => ({
                        ...prev,
                        creditLimit: String(Math.max(0, Number(prev.creditLimit || 0) + 100000))
                      }))}
                      className="btn btn-sm"
                      style={{ padding: '2px 8px', fontSize: '0.75rem', backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', fontWeight: 700 }}
                    >
                      + Rs. 100,000
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditCustomerForm(prev => ({ ...prev, creditLimit: '0' }))}
                      className="btn btn-sm"
                      style={{ padding: '2px 8px', fontSize: '0.75rem', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', fontWeight: 700 }}
                    >
                      No Limit (0)
                    </button>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '6px' }}>
                    💡 Agar customer ka sabqa udhar pura ho gaya ho to yahan se limit barha kar foran naya maal / supply de saktay hain.
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label">Notes / Instructions</label>
                  <textarea
                    rows={2}
                    className="form-control"
                    placeholder="e.g. Reliable customer, special payment term notes..."
                    value={editCustomerForm.notes}
                    onChange={(e) => setEditCustomerForm({ ...editCustomerForm, notes: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button type="button" onClick={() => setShowEditModal(false)} className="btn btn-outline">
                    Cancel
                  </button>
                  <button type="submit" disabled={savingEdit} className="btn btn-primary" style={{ fontWeight: 800 }}>
                    {savingEdit ? 'Saving Changes...' : 'Save Customer Changes / محفوظ کریں'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleUpdateSupplier}>
                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label">Company / Distributor Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editSupplierForm.companyName}
                    onChange={(e) => setEditSupplierForm({ ...editSupplierForm, companyName: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Contact Person</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editSupplierForm.contactPerson}
                      onChange={(e) => setEditSupplierForm({ ...editSupplierForm, contactPerson: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Phone Number *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editSupplierForm.phone}
                      onChange={(e) => setEditSupplierForm({ ...editSupplierForm, phone: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Address / Office Location</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editSupplierForm.address}
                      onChange={(e) => setEditSupplierForm({ ...editSupplierForm, address: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">NTN / Sales Tax Number</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 1234567-8"
                      value={editSupplierForm.ntnTaxNumber}
                      onChange={(e) => setEditSupplierForm({ ...editSupplierForm, ntnTaxNumber: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label">Notes</label>
                  <textarea
                    rows={2}
                    className="form-control"
                    placeholder="e.g. Main supplier for Caltex, Havoline..."
                    value={editSupplierForm.notes}
                    onChange={(e) => setEditSupplierForm({ ...editSupplierForm, notes: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button type="button" onClick={() => setShowEditModal(false)} className="btn btn-outline">
                    Cancel
                  </button>
                  <button type="submit" disabled={savingEdit} className="btn btn-primary" style={{ fontWeight: 800 }}>
                    {savingEdit ? 'Saving Changes...' : 'Save Supplier Changes / محفوظ کریں'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
