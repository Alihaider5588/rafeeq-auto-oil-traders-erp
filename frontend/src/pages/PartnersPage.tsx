import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Customer, Supplier, User } from '../types';
import { Users, Building2, Plus, Phone, MapPin } from 'lucide-react';

export const CustomersAndSuppliersPage: React.FC<{ type: 'CUSTOMERS' | 'SUPPLIERS' }> = ({ type }) => {
  const [data, setData] = useState<any[]>([]);
  const [salesmen, setSalesmen] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

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

  useEffect(() => {
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
        const res = await api.get('/partners/suppliers');
        setData(res.data.suppliers || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/partners/customers', {
        ...formCustomer,
        openingBalance: parseFloat(formCustomer.openingBalance),
        creditLimit: parseFloat(formCustomer.creditLimit),
      });
      setShowModal(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create customer');
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/partners/suppliers', {
        ...formSupplier,
        openingBalance: parseFloat(formSupplier.openingBalance),
      });
      setShowModal(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create supplier');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
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
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  Loading directory...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                  No records registered yet.
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 700, color: '#0f172a' }}>
                    {type === 'CUSTOMERS' ? item.shopName : item.companyName}
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
            maxWidth: '550px',
            padding: '24px'
          }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '16px' }}>
              Add New {type === 'CUSTOMERS' ? 'Customer / Shop' : 'Supplier Company'}
            </h2>

            {type === 'CUSTOMERS' ? (
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
