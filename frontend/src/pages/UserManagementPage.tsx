import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { User, Role } from '../types';
import { Shield, Plus, Key, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const UserManagementPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'ADMIN';
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    phone: '',
    password: '',
    role: 'SALESMAN' as Role,
    permissions: [] as string[],
  });
  const [modalError, setModalError] = useState('');

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Granular Tab Permissions Modal
  const [showPermModal, setShowPermModal] = useState(false);
  const [selectedUserForPerms, setSelectedUserForPerms] = useState<User | null>(null);
  const [userPerms, setUserPerms] = useState<string[]>([]);
  const [savingPerms, setSavingPerms] = useState(false);

  const AVAILABLE_TABS = [
    { path: '/sales', label: 'Sales & POS Terminal (سیل و کاؤنٹر بلنگ)' },
    { path: '/salesman', label: 'Salesman Mobile Portal (سیلز مین پورٹل)' },
    { path: '/products', label: 'Products & Stock (پروڈکٹس و انوینٹری)' },
    { path: '/web-orders', label: 'Web Orders Queue (ویب سائٹ آرڈرز)' },
    { path: '/purchases', label: 'Purchases (انورڈ مال کی خریداری)' },
    { path: '/customers', label: 'Customers & Khata (کسٹمرز و دکانیں)' },
    { path: '/suppliers', label: 'Suppliers & Mills (سپلائرز و کمپنیاں)' },
    { path: '/ledgers', label: 'Ledgers & Accounts (کھاتے و وصولیاں)' },
    { path: '/expenses', label: 'Daily Expenses (روزمرہ دکان اخراجات)' },
    { path: '/delivery', label: 'Van Delivery & Routes (ڈلیوری وین و روٹس)' },
    { path: '/catalogue', label: 'PDF Product Catalogue (پروڈکٹ کیٹلاگ)' },
    { path: '/employees', label: 'Employees & Attendance (ملازمین و حاضری)' },
    { path: '/reports', label: 'Profit & Reports (منافع و تفصیلی رپورٹس)' },
    { path: '/admin/settings', label: 'System Settings (سسٹم پرنٹ و بزنس سیٹنگز)' },
    { path: '/admin/utilities', label: 'Utilities (ڈیٹا امپورٹ، بارکوڈ و ٹولز)' },
    { path: '/admin/users', label: 'User Management (صارفین و پرمیشن مینجمنٹ)' },
    { path: '/admin/audit', label: 'Audit Trail (سسٹم آڈٹ لاگز)' },
    { path: '/admin/confidential-brand', label: 'Confidential Brand Vault (خفیہ برانڈ تجوری)' },
    { path: '/admin', label: 'Admin Dashboard (ایڈمن ڈیش بورڈ)' },
    { path: '/operator', label: 'Operator Desk (آپریٹر ڈیسک)' },
    { path: '/cashier', label: 'Cashier Desk (کیشیئر ڈیسک)' },
  ];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/auth/users');
      setUsers(res.data.users || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPermsModal = (u: User) => {
    setSelectedUserForPerms(u);
    // If permissions array already defined, use it, else default by role
    if (u.permissions && Array.isArray(u.permissions)) {
      setUserPerms(u.permissions);
    } else {
      // Default initial templates based on standard role
      if (u.role === 'SALESMAN') {
        setUserPerms(['/salesman', '/customers', '/catalogue']);
      } else if (u.role === 'CASHIER') {
        setUserPerms(['/sales', '/customers', '/ledgers', '/expenses', '/catalogue']);
      } else if (u.role === 'OPERATOR') {
        setUserPerms(['/sales', '/products', '/purchases', '/customers', '/suppliers', '/ledgers', '/expenses', '/delivery', '/web-orders', '/catalogue']);
      } else {
        setUserPerms(AVAILABLE_TABS.map(t => t.path));
      }
    }
    setShowPermModal(true);
  };

  const toggleTabPerm = (path: string) => {
    if (userPerms.includes(path)) {
      setUserPerms(userPerms.filter(p => p !== path));
    } else {
      setUserPerms([...userPerms, path]);
    }
  };

  const handleSavePerms = async () => {
    if (!selectedUserForPerms) return;
    setSavingPerms(true);
    try {
      await api.put(`/auth/users/${selectedUserForPerms.id}`, {
        permissions: userPerms,
      });
      setShowPermModal(false);
      setSelectedUserForPerms(null);
      fetchUsers();
      alert('Tab access permissions updated successfully! The user will now only see their authorized tabs.');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update permissions');
    } finally {
      setSavingPerms(false);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForPassword) return;
    setPasswordError('');
    setPasswordSuccess('');
    setChangingPassword(true);

    try {
      const res = await api.post('/auth/change-password', {
        targetUserId: selectedUserForPassword.id,
        newPassword: newPassword.trim(),
      });
      if (res.data?.success) {
        setPasswordSuccess(res.data.message || 'Password updated successfully!');
        setNewPassword('');
        setTimeout(() => {
          setShowPasswordModal(false);
          setSelectedUserForPassword(null);
          setPasswordSuccess('');
        }, 1500);
      }
    } catch (err: any) {
      setPasswordError(err.response?.data?.message || 'Failed to update password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    try {
      const res = await api.post('/auth/users', formData);
      if (res.data.success) {
        setShowModal(false);
        setFormData({
          username: '',
          fullName: '',
          phone: '',
          password: '',
          role: 'SALESMAN',
          permissions: [],
        });
        fetchUsers();
      }
    } catch (err: any) {
      setModalError(err.response?.data?.message || 'Failed to create user');
    }
  };

  const toggleUserStatus = async (user: User) => {
    try {
      await api.put(`/auth/users/${user.id}`, { isActive: !user.isActive });
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update user');
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ backgroundColor: '#0f172a', color: '#ffb91f', padding: '10px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
            <Shield size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
              User Management & Role Permissions
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '2px 0 0 0' }}>
              Manage staff credentials, reset passwords, and enforce terminal permissions across Okara depot.
            </p>
          </div>
        </div>

        <button onClick={() => { setModalError(''); setShowModal(true); }} className="btn btn-primary" style={{ padding: '10px 18px', fontWeight: 800, borderRadius: '8px' }}>
          <Plus size={18} /> Add New User
        </button>
      </div>

      {/* KPI Stats Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px 20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Total Staff Accounts</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>{users.length}</div>
        </div>
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px 20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 800, textTransform: 'uppercase' }}>Active Terminals</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#16a34a', marginTop: '4px' }}>{users.filter(u => u.isActive).length}</div>
        </div>
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px 20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 800, textTransform: 'uppercase' }}>Field Salesmen</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#d97706', marginTop: '4px' }}>{users.filter(u => u.role === 'SALESMAN').length}</div>
        </div>
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px 20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 800, textTransform: 'uppercase' }}>Cashiers & Operators</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#2563eb', marginTop: '4px' }}>{users.filter(u => u.role === 'CASHIER' || u.role === 'OPERATOR').length}</div>
        </div>
      </div>

      <div className="table-container" style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        <table className="data-table" style={{ margin: 0 }}>
          <thead style={{ backgroundColor: '#f8fafc' }}>
            <tr>
              <th style={{ padding: '14px 16px' }}>Full Name</th>
              <th>Username</th>
              <th>Phone</th>
              <th>Assigned Role</th>
              <th>Account Status</th>
              <th style={{ textAlign: 'right', paddingRight: '20px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  Loading users...
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 700 }}>{u.fullName}</td>
                  <td className="font-mono">{u.username}</td>
                  <td>{u.phone || '-'}</td>
                  <td>
                    <span className={`badge ${
                      u.role === 'ADMIN' ? 'badge-danger' :
                      u.role === 'CASHIER' ? 'badge-warning' :
                      u.role === 'OPERATOR' ? 'badge-info' : 'badge-success'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td>
                    {u.isActive ? (
                      <span className="badge badge-success">Active</span>
                    ) : (
                      <span className="badge badge-danger">Disabled</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {u.role !== 'ADMIN' && (
                        <button
                          onClick={() => handleOpenPermsModal(u)}
                          className="btn btn-outline btn-sm"
                          style={{ padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#2563eb', borderColor: '#bfdbfe', backgroundColor: '#eff6ff' }}
                          title="Configure which portal tabs this staff member can access"
                        >
                          <Shield size={14} /> Tab Permissions
                        </button>
                      )}

                      {(isAdmin || u.role !== 'ADMIN') && (
                        <button
                          onClick={() => {
                            setSelectedUserForPassword(u);
                            setShowPasswordModal(true);
                            setPasswordError('');
                            setPasswordSuccess('');
                            setNewPassword('');
                          }}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          title="Change / Reset Password"
                        >
                          <Key size={14} /> Change Password
                        </button>
                      )}

                      {u.role !== 'ADMIN' && (
                        <button
                          onClick={() => toggleUserStatus(u)}
                          className={`btn btn-sm ${u.isActive ? 'btn-danger' : 'btn-success'}`}
                          style={{ padding: '4px 10px' }}
                        >
                          {u.isActive ? 'Disable' : 'Enable'}
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

      {/* Add User Modal */}
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
            maxWidth: '500px',
            padding: '24px'
          }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '16px' }}>
              Create Staff Account
            </h2>

            {modalError && (
              <div style={{
                backgroundColor: '#fee2e2',
                color: '#991b1b',
                padding: '10px 14px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '0.85rem'
              }}>
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateUser}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Asim Raza"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Username *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. asim12"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="03001234567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Min 6 characters"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">System Role *</label>
                  <select
                    className="form-control"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                    required
                  >
                    <option value="SALESMAN">Salesman</option>
                    <option value="CASHIER">Cashier</option>
                    <option value="OPERATOR">Computer Operator</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Staff User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && selectedUserForPassword && (
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
          zIndex: 110,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '440px',
            padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ backgroundColor: '#fef3c7', padding: '10px', borderRadius: '10px', color: '#d97706' }}>
                <Key size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  Update Password
                </h2>
                <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                  For user: <strong>{selectedUserForPassword.fullName}</strong> (@{selectedUserForPassword.username})
                </div>
              </div>
            </div>

            {passwordError && (
              <div style={{
                backgroundColor: '#fee2e2',
                color: '#991b1b',
                padding: '10px 14px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '0.85rem'
              }}>
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div style={{
                backgroundColor: '#dcfce7',
                color: '#166534',
                padding: '10px 14px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '0.85rem',
                fontWeight: 600
              }}>
                ✓ {passwordSuccess}
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit}>
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Enter New Secure Password *
                </label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoFocus
                  minLength={6}
                />
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                  User will use this new password on their next login attempt.
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="btn btn-outline"
                  disabled={changingPassword}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={changingPassword || newPassword.trim().length < 6}
                >
                  {changingPassword ? 'Updating...' : 'Save New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dynamic Tab Permissions Modal */}
      {showPermModal && selectedUserForPerms && (
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
          zIndex: 120,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '560px',
            padding: '26px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                  Portal Tab Access & Permissions
                </h2>
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0' }}>
                  User: <strong style={{ color: '#0f172a' }}>{selectedUserForPerms.fullName}</strong> ({selectedUserForPerms.username}) &bull; Role: <span className="badge badge-info">{selectedUserForPerms.role}</span>
                </p>
              </div>
              <button
                onClick={() => setShowPermModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <div style={{
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '16px',
              fontSize: '0.82rem',
              color: '#1e40af'
            }}>
              Select the tabs this employee is allowed to view and operate in their portal sidebar. Unchecked tabs will remain hidden and completely inaccessible.
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>
                Assigned Tabs ({userPerms.length} of {AVAILABLE_TABS.length})
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setUserPerms(AVAILABLE_TABS.map(t => t.path))}
                  style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Select All
                </button>
                <span style={{ color: '#cbd5e1' }}>|</span>
                <button
                  type="button"
                  onClick={() => setUserPerms([])}
                  style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Clear All
                </button>
              </div>
            </div>

            <div style={{
              flex: 1,
              overflowY: 'auto',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '12px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '10px',
              marginBottom: '20px',
              backgroundColor: '#f8fafc'
            }}>
              {AVAILABLE_TABS.map((tab) => {
                const isChecked = userPerms.includes(tab.path);
                return (
                  <label
                    key={tab.path}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      backgroundColor: isChecked ? '#e0f2fe' : '#ffffff',
                      border: isChecked ? '1px solid #38bdf8' : '1px solid #e2e8f0',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleTabPerm(tab.path)}
                      style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#0284c7' }}
                    />
                    <span style={{ fontSize: '0.88rem', fontWeight: isChecked ? 700 : 500, color: isChecked ? '#0369a1' : '#334155' }}>
                      {tab.label}
                    </span>
                  </label>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowPermModal(false)}
                className="btn btn-outline"
                disabled={savingPerms}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePerms}
                className="btn btn-primary"
                disabled={savingPerms}
                style={{ padding: '8px 20px', fontWeight: 800 }}
              >
                {savingPerms ? 'Saving Permissions...' : 'Save Tab Permissions'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

