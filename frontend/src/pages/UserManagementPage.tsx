import React, { useEffect, useState, useMemo } from 'react';
import api from '../services/api';
import { User, Role } from '../types';
import { Shield, Plus, Key, CheckCircle, XCircle, Search, Edit2, Trash2, Eye, Filter, CheckSquare, Square, Lock, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export interface TabPermissionModule {
  path: string;
  labelEn: string;
  labelUrdu: string;
  category: 'Billing & POS' | 'Inventory & Catalog' | 'CRM & Accounts' | 'Operations & Staff' | 'Administration';
  editAction?: {
    key: string;
    alias?: string;
    label: string;
    desc: string;
  };
  deleteAction?: {
    key: string;
    alias?: string;
    label: string;
    desc: string;
  };
}

export const PERMISSION_MODULES: TabPermissionModule[] = [
  // 1. Billing & POS
  {
    path: '/sales',
    labelEn: 'Sales & POS Billing Terminal',
    labelUrdu: 'سیل و کاؤنٹر انوائس بلنگ',
    category: 'Billing & POS',
    editAction: {
      key: 'action:edit_invoice',
      alias: 'action:edit_sale',
      label: 'Edit Invoices',
      desc: 'Allow user to edit or correct sales invoices.',
    },
    deleteAction: {
      key: 'action:delete_invoice',
      alias: 'action:delete_sale',
      label: 'Delete / Void Invoice',
      desc: 'Allow permanently deleting or cancelling sales invoices.',
    },
  },
  {
    path: '/salesman',
    labelEn: 'Salesman Mobile Portal & Van POS',
    labelUrdu: 'سیلز مین موبائل پورٹل و وین سیل',
    category: 'Billing & POS',
    deleteAction: {
      key: 'action:delete_draft',
      label: 'Delete Saved Drafts',
      desc: 'Allow user to delete pending draft orders in Salesman Portal.',
    },
  },
  {
    path: '/web-orders',
    labelEn: 'Web Orders Queue',
    labelUrdu: 'آن لائن ویب سائٹ آرڈرز کیو',
    category: 'Billing & POS',
    deleteAction: {
      key: 'action:delete_web_order',
      label: 'Reject / Delete Orders',
      desc: 'Allow rejecting or deleting website online orders.',
    },
  },

  // 2. Inventory & Products
  {
    path: '/products',
    labelEn: 'Products & Stock Inventory',
    labelUrdu: 'پروڈکٹس، کیٹگریز و انوینٹری اسٹاک',
    category: 'Inventory & Catalog',
    editAction: {
      key: 'action:edit_product',
      label: 'Edit Products & Stock',
      desc: 'Allow editing product names, cost, and selling rates.',
    },
    deleteAction: {
      key: 'action:delete_product',
      label: 'Delete Products',
      desc: 'Allow permanently deleting products from inventory.',
    },
  },
  {
    path: '/purchases',
    labelEn: 'Purchases (Stock Inward)',
    labelUrdu: 'انورڈ مال کی خریداری و بلنگ',
    category: 'Inventory & Catalog',
    editAction: {
      key: 'action:edit_purchase',
      label: 'Edit Purchases',
      desc: 'Allow modifying inward purchase records.',
    },
    deleteAction: {
      key: 'action:delete_purchase',
      label: 'Delete Purchases',
      desc: 'Allow deleting purchase records and reversing inward stock.',
    },
  },
  {
    path: '/catalogue',
    labelEn: 'PDF Product Catalogue',
    labelUrdu: 'پروڈکٹ کیٹلاگ و بروشر (View Only)',
    category: 'Inventory & Catalog',
  },

  // 3. CRM & Accounts
  {
    path: '/customers',
    labelEn: 'Customers & Khata',
    labelUrdu: 'کسٹمرز کھاتے و دکانیں',
    category: 'CRM & Accounts',
    editAction: {
      key: 'action:edit_customer',
      label: 'Edit Customer & Limits',
      desc: 'Allow editing customer info, phone, area, and credit limit.',
    },
    deleteAction: {
      key: 'action:delete_customer',
      label: 'Delete Customer Record',
      desc: 'Allow removing customers from directory.',
    },
  },
  {
    path: '/suppliers',
    labelEn: 'Suppliers & Mills',
    labelUrdu: 'سپلائرز، کمپنیاں و مِلیں',
    category: 'CRM & Accounts',
    editAction: {
      key: 'action:edit_supplier',
      label: 'Edit Supplier Info',
      desc: 'Allow updating supplier contact & bank information.',
    },
    deleteAction: {
      key: 'action:delete_supplier',
      label: 'Delete Supplier Record',
      desc: 'Allow deleting suppliers from directory.',
    },
  },
  {
    path: '/ledgers',
    labelEn: 'Ledgers & Accounts',
    labelUrdu: 'کھاتے، وصولیاں و ادائیگیاں',
    category: 'CRM & Accounts',
    editAction: {
      key: 'action:edit_ledger',
      label: 'Edit Ledger Entry',
      desc: 'Allow editing voucher or payment ledger entries.',
    },
    deleteAction: {
      key: 'action:delete_ledger',
      label: 'Delete Payment Records',
      desc: 'Allow deleting recorded payments or contra-settlement entries.',
    },
  },
  {
    path: '/expenses',
    labelEn: 'Daily Expenses',
    labelUrdu: 'روزمرہ دکان و وین کے اخراجات',
    category: 'CRM & Accounts',
    editAction: {
      key: 'action:edit_expense',
      label: 'Edit Expenses',
      desc: 'Allow modifying expense category and payment details.',
    },
    deleteAction: {
      key: 'action:delete_expense',
      label: 'Delete Expenses',
      desc: 'Allow deleting recorded shop expenses.',
    },
  },

  // 4. Operations & Staff
  {
    path: '/delivery',
    labelEn: 'Van Delivery & Route Schedules',
    labelUrdu: 'ڈلیوری وین، روٹس و روزانہ ٹرپ',
    category: 'Operations & Staff',
    editAction: {
      key: 'action:edit_delivery',
      label: 'Edit Vehicle / Routes',
      desc: 'Allow editing vehicle details, weekly routes, and trips.',
    },
    deleteAction: {
      key: 'action:delete_delivery',
      label: 'Delete Delivery / Vehicle',
      desc: 'Allow deleting delivery trips, routes, or vehicles.',
    },
  },
  {
    path: '/employees',
    labelEn: 'Employees & Attendance',
    labelUrdu: 'ملازمین، حاضری و پے رول تنخواہیں',
    category: 'Operations & Staff',
    editAction: {
      key: 'action:edit_employee',
      label: 'Edit Employee / Attendance',
      desc: 'Allow editing employee details and attendance entries.',
    },
    deleteAction: {
      key: 'action:delete_employee',
      label: 'Delete Employee / Attendance',
      desc: 'Allow deleting employee profiles or attendance logs.',
    },
  },
  {
    path: '/operator',
    labelEn: 'Operator Desk',
    labelUrdu: 'آپریٹر ڈیسک شارٹ کٹس (View Only)',
    category: 'Operations & Staff',
  },
  {
    path: '/cashier',
    labelEn: 'Cashier Desk',
    labelUrdu: 'کیشیئر ڈیسک شارٹ کٹس (View Only)',
    category: 'Operations & Staff',
  },

  // 5. System & Administration
  {
    path: '/reports',
    labelEn: 'Profit & Reports',
    labelUrdu: 'منافع و تفصیلی بزنس رپورٹس (View Only)',
    category: 'Administration',
  },
  {
    path: '/admin',
    labelEn: 'Admin Dashboard',
    labelUrdu: 'ایڈمن مرکزی ڈیش بورڈ (View Only)',
    category: 'Administration',
  },
  {
    path: '/admin/users',
    labelEn: 'User Management',
    labelUrdu: 'صارفین و پرمیشن مینجمنٹ',
    category: 'Administration',
    editAction: {
      key: 'action:edit_user',
      label: 'Edit Users & Roles',
      desc: 'Allow modifying other user accounts and reset passwords.',
    },
    deleteAction: {
      key: 'action:delete_user',
      label: 'Delete Staff Users',
      desc: 'Allow deactivating or deleting staff user accounts.',
    },
  },
  {
    path: '/admin/settings',
    labelEn: 'System Settings',
    labelUrdu: 'سسٹم پرنٹ و بزنس سیٹنگز',
    category: 'Administration',
    editAction: {
      key: 'action:edit_settings',
      label: 'Modify Settings',
      desc: 'Allow editing business name, invoice headers, and printer options.',
    },
  },
  {
    path: '/admin/utilities',
    labelEn: 'Utilities & Backup',
    labelUrdu: 'ڈیٹا امپورٹ، بارکوڈ و ٹولز (View Only)',
    category: 'Administration',
  },
  {
    path: '/admin/audit',
    labelEn: 'Audit Trail Logs',
    labelUrdu: 'سسٹم آڈٹ لاگز و ہسٹری (View Only)',
    category: 'Administration',
  },
  {
    path: '/admin/confidential-brand',
    labelEn: 'Confidential Brand Vault',
    labelUrdu: 'خفیہ برانڈ تجوری و خفیہ ریٹس (View Only)',
    category: 'Administration',
  },
];

export const UserManagementPage: React.FC = () => {
  const { user: currentUser, updateUser } = useAuth();
  const isAdmin = currentUser?.role === 'ADMIN';
  const canEditUser = isAdmin || Boolean(currentUser?.permissions?.includes('action:edit_user'));
  const canDeleteUser = isAdmin || Boolean(currentUser?.permissions?.includes('action:delete_user'));
  const [users, setUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');
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

  // Granular Tab & Action Permissions Modal
  const [showPermModal, setShowPermModal] = useState(false);
  const [selectedUserForPerms, setSelectedUserForPerms] = useState<User | null>(null);
  const [userPerms, setUserPerms] = useState<string[]>([]);
  const [savingPerms, setSavingPerms] = useState(false);
  const [permSearch, setPermSearch] = useState('');
  const [permCategoryFilter, setPermCategoryFilter] = useState('ALL');

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
    setPermSearch('');
    setPermCategoryFilter('ALL');
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
        setUserPerms(PERMISSION_MODULES.map(t => t.path));
      }
    }
    setShowPermModal(true);
  };

  const toggleTabPerm = (path: string) => {
    const mod = PERMISSION_MODULES.find(m => m.path === path);
    if (userPerms.includes(path)) {
      const keysToRemove = new Set<string>([path]);
      if (mod?.editAction) {
        keysToRemove.add(mod.editAction.key);
        if (mod.editAction.alias) keysToRemove.add(mod.editAction.alias);
      }
      if (mod?.deleteAction) {
        keysToRemove.add(mod.deleteAction.key);
        if (mod.deleteAction.alias) keysToRemove.add(mod.deleteAction.alias);
      }
      setUserPerms(userPerms.filter(p => !keysToRemove.has(p)));
    } else {
      setUserPerms([...userPerms, path]);
    }
  };

  const toggleActionPerm = (key: string, alias?: string, associatedPath?: string) => {
    const hasKey = userPerms.includes(key);
    if (hasKey) {
      setUserPerms(userPerms.filter(p => p !== key && (!alias || p !== alias)));
    } else {
      const toAdd = [key];
      if (alias && !userPerms.includes(alias)) toAdd.push(alias);
      if (associatedPath && !userPerms.includes(associatedPath)) toAdd.push(associatedPath);
      setUserPerms([...userPerms, ...toAdd]);
    }
  };

  const handleSelectAllTabs = () => {
    const allPaths = PERMISSION_MODULES.map(m => m.path);
    setUserPerms(Array.from(new Set([...userPerms, ...allPaths])));
  };

  const handleClearAllTabs = () => {
    const allPaths = new Set(PERMISSION_MODULES.map(m => m.path));
    setUserPerms(userPerms.filter(p => !allPaths.has(p)));
  };

  const handleGrantAllEdits = () => {
    const editKeys: string[] = [];
    PERMISSION_MODULES.forEach(m => {
      if (m.editAction) {
        editKeys.push(m.editAction.key);
        if (m.editAction.alias) editKeys.push(m.editAction.alias);
        editKeys.push(m.path);
      }
    });
    setUserPerms(Array.from(new Set([...userPerms, ...editKeys])));
  };

  const handleRevokeAllEdits = () => {
    const editKeys = new Set<string>();
    PERMISSION_MODULES.forEach(m => {
      if (m.editAction) {
        editKeys.add(m.editAction.key);
        if (m.editAction.alias) editKeys.add(m.editAction.alias);
      }
    });
    setUserPerms(userPerms.filter(p => !editKeys.has(p)));
  };

  const handleGrantAllDeletes = () => {
    const deleteKeys: string[] = [];
    PERMISSION_MODULES.forEach(m => {
      if (m.deleteAction) {
        deleteKeys.push(m.deleteAction.key);
        if (m.deleteAction.alias) deleteKeys.push(m.deleteAction.alias);
        deleteKeys.push(m.path);
      }
    });
    setUserPerms(Array.from(new Set([...userPerms, ...deleteKeys])));
  };

  const handleRevokeAllDeletes = () => {
    const deleteKeys = new Set<string>();
    PERMISSION_MODULES.forEach(m => {
      if (m.deleteAction) {
        deleteKeys.add(m.deleteAction.key);
        if (m.deleteAction.alias) deleteKeys.add(m.deleteAction.alias);
      }
    });
    setUserPerms(userPerms.filter(p => !deleteKeys.has(p)));
  };

  const handleGrantFullAccess = () => {
    const allItems: string[] = [];
    PERMISSION_MODULES.forEach(m => {
      allItems.push(m.path);
      if (m.editAction) {
        allItems.push(m.editAction.key);
        if (m.editAction.alias) allItems.push(m.editAction.alias);
      }
      if (m.deleteAction) {
        allItems.push(m.deleteAction.key);
        if (m.deleteAction.alias) allItems.push(m.deleteAction.alias);
      }
    });
    setUserPerms(Array.from(new Set(allItems)));
  };

  const handleClearEverything = () => {
    setUserPerms([]);
  };

  const filteredModules = useMemo(() => {
    return PERMISSION_MODULES.filter(m => {
      if (permCategoryFilter !== 'ALL' && m.category !== permCategoryFilter) {
        return false;
      }
      if (!permSearch.trim()) return true;
      const q = permSearch.toLowerCase();
      return (
        m.labelEn.toLowerCase().includes(q) ||
        m.labelUrdu.includes(q) ||
        m.path.toLowerCase().includes(q) ||
        (m.editAction && (m.editAction.label.toLowerCase().includes(q) || m.editAction.desc.toLowerCase().includes(q))) ||
        (m.deleteAction && (m.deleteAction.label.toLowerCase().includes(q) || m.deleteAction.desc.toLowerCase().includes(q)))
      );
    });
  }, [permSearch, permCategoryFilter]);

  const enabledTabsCount = useMemo(() => {
    return PERMISSION_MODULES.filter(m => userPerms.includes(m.path)).length;
  }, [userPerms]);

  const enabledEditsCount = useMemo(() => {
    return PERMISSION_MODULES.filter(m => m.editAction && userPerms.includes(m.editAction.key)).length;
  }, [userPerms]);

  const enabledDeletesCount = useMemo(() => {
    return PERMISSION_MODULES.filter(m => m.deleteAction && userPerms.includes(m.deleteAction.key)).length;
  }, [userPerms]);

  const handleSavePerms = async () => {
    if (!selectedUserForPerms) return;
    setSavingPerms(true);
    try {
      await api.put(`/auth/users/${selectedUserForPerms.id}`, {
        permissions: userPerms,
      });
      if (currentUser && selectedUserForPerms.id === currentUser.id) {
        updateUser({ ...currentUser, permissions: userPerms });
      }
      setShowPermModal(false);
      setSelectedUserForPerms(null);
      fetchUsers();
      alert('Tab access and Edit/Delete permissions updated successfully! The user will immediately be constrained to their authorized permissions.');
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

        {canEditUser && (
          <button onClick={() => { setModalError(''); setShowModal(true); }} className="btn btn-primary" style={{ padding: '10px 18px', fontWeight: 800, borderRadius: '8px' }}>
            <Plus size={18} /> Add New User
          </button>
        )}
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

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', width: '320px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search users by name, username, phone, role..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
          />
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
            ) : (() => {
              const filteredUsers = users.filter((u) => {
                if (!userSearch.trim()) return true;
                const q = userSearch.toLowerCase();
                return (
                  u.fullName?.toLowerCase().includes(q) ||
                  u.username?.toLowerCase().includes(q) ||
                  u.phone?.toLowerCase().includes(q) ||
                  u.role?.toLowerCase().includes(q)
                );
              });
              if (filteredUsers.length === 0) {
                return (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                      No user accounts found matching "{userSearch}".
                    </td>
                  </tr>
                );
              }
              return filteredUsers.map((u) => (
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
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      {u.role !== 'ADMIN' && isAdmin && (
                        <button
                          onClick={() => handleOpenPermsModal(u)}
                          className="btn btn-outline btn-sm"
                          style={{ padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#2563eb', borderColor: '#bfdbfe', backgroundColor: '#eff6ff' }}
                          title="Configure which portal tabs this staff member can access"
                        >
                          <Shield size={14} /> Tab Permissions
                        </button>
                      )}

                      {(isAdmin || (canEditUser && u.role !== 'ADMIN')) && (
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

                      {u.role !== 'ADMIN' && canDeleteUser && (
                        <button
                          onClick={() => toggleUserStatus(u)}
                          className={`btn btn-sm ${u.isActive ? 'btn-danger' : 'btn-success'}`}
                          style={{ padding: '4px 10px' }}
                        >
                          {u.isActive ? 'Disable' : 'Enable'}
                        </button>
                      )}

                      {!isAdmin && !canEditUser && !canDeleteUser && (
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                          View Only
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ));
            })()}
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

      {/* Dynamic Tab & Action Permissions Modal */}
      {showPermModal && selectedUserForPerms && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 120,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '1040px',
            height: '92vh',
            maxHeight: '920px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid #e2e8f0'
          }}>
            {/* 1. Modal Header (Fixed) */}
            <div style={{
              padding: '16px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8fafc',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  backgroundColor: '#e0f2fe',
                  color: '#0369a1',
                  padding: '10px',
                  borderRadius: '10px'
                }}>
                  <Shield size={22} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                    Portal Tab Access & Module Permissions (ماڈیول اختیارات و پرمیشنز)
                  </h2>
                  <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '3px 0 0 0' }}>
                    User: <strong style={{ color: '#0f172a' }}>{selectedUserForPerms.fullName}</strong> (@{selectedUserForPerms.username}) &bull; Role: <span className="badge badge-info">{selectedUserForPerms.role}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPermModal(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  fontSize: '1.1rem',
                  cursor: 'pointer',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* 2. Search, Filter & Quick Bulk Actions Bar (Fixed) */}
            <div style={{
              padding: '12px 20px',
              backgroundColor: '#ffffff',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                {/* Search input */}
                <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search module name, Urdu title, or path (e.g. sales, products, khata)..."
                    value={permSearch}
                    onChange={(e) => setPermSearch(e.target.value)}
                    style={{ paddingLeft: '36px', height: '36px', fontSize: '0.85rem' }}
                  />
                  {permSearch && (
                    <button
                      type="button"
                      onClick={() => setPermSearch('')}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        fontSize: '0.9rem'
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Bulk Action Buttons */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleSelectAllTabs}
                    className="btn btn-outline"
                    style={{ fontSize: '0.78rem', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '5px' }}
                    title="Allow viewing all sidebar tabs"
                  >
                    <Eye size={13} color="#0284c7" /> All Tabs
                  </button>
                  <button
                    type="button"
                    onClick={handleGrantAllEdits}
                    className="btn btn-outline"
                    style={{ fontSize: '0.78rem', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '5px' }}
                    title="Grant edit access to all applicable modules"
                  >
                    <Edit2 size={13} color="#4f46e5" /> All Edits
                  </button>
                  <button
                    type="button"
                    onClick={handleGrantAllDeletes}
                    className="btn btn-outline"
                    style={{ fontSize: '0.78rem', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '5px' }}
                    title="Grant delete access to all applicable modules"
                  >
                    <Trash2 size={13} color="#e11d48" /> All Deletes
                  </button>
                  <button
                    type="button"
                    onClick={handleGrantFullAccess}
                    className="btn btn-outline"
                    style={{ fontSize: '0.78rem', padding: '6px 10px', backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', color: '#047857', fontWeight: 700 }}
                    title="Grant full view + edit + delete everywhere"
                  >
                    ⚡ Full Access
                  </button>
                  <button
                    type="button"
                    onClick={handleClearEverything}
                    className="btn btn-outline"
                    style={{ fontSize: '0.78rem', padding: '6px 10px', color: '#dc2626', borderColor: '#fecaca' }}
                    title="Clear all permissions"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Category Filter Pills */}
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
                {[
                  { key: 'ALL', label: 'All Modules (تمام)' },
                  { key: 'Billing & POS', label: 'Billing & POS (سیل و بلنگ)' },
                  { key: 'Inventory & Catalog', label: 'Inventory (اسٹاک و پروڈکٹس)' },
                  { key: 'CRM & Accounts', label: 'Accounts (کھاتے و ادائیگیاں)' },
                  { key: 'Operations & Staff', label: 'Staff & Delivery (وین و عملہ)' },
                  { key: 'Administration', label: 'System (ایڈمن و کنٹرول)' },
                ].map(cat => {
                  const isActive = permCategoryFilter === cat.key;
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setPermCategoryFilter(cat.key)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '0.76rem',
                        fontWeight: isActive ? 700 : 500,
                        backgroundColor: isActive ? '#0f172a' : '#f1f5f9',
                        color: isActive ? '#ffffff' : '#475569',
                        border: 'none',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Main Scrollable Permissions Matrix Body (Never Squished!) */}
            <div style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              padding: '16px 20px',
              backgroundColor: '#f8fafc'
            }}>
              <div style={{
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                padding: '8px 12px',
                marginBottom: '12px',
                fontSize: '0.8rem',
                color: '#1e40af',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '1rem' }}>💡</span>
                <span>
                  Admin har tab ke samne <b>View Tab (سائیڈ بار میں نظر آنا)</b>، <b>✏️ Allow Edit (ترمیم کا اختیار)</b>، aur <b>🗑️ Allow Delete (ڈیلیٹ کا اختیار)</b> apni marzi se check/uncheck kar sakte hain.
                </span>
              </div>

              {filteredModules.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  No modules match your search filter "{permSearch}".
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {filteredModules.map((m) => {
                    const isTabActive = userPerms.includes(m.path);
                    const hasEdit = Boolean(m.editAction);
                    const isEditActive = hasEdit && m.editAction ? userPerms.includes(m.editAction.key) : false;
                    const hasDelete = Boolean(m.deleteAction);
                    const isDeleteActive = hasDelete && m.deleteAction ? userPerms.includes(m.deleteAction.key) : false;

                    return (
                      <div
                        key={m.path}
                        style={{
                          backgroundColor: '#ffffff',
                          borderRadius: '10px',
                          border: isTabActive ? '1.5px solid #93c5fd' : '1px solid #e2e8f0',
                          padding: '12px 16px',
                          display: 'grid',
                          gridTemplateColumns: 'minmax(250px, 1.3fr) 150px 170px 170px',
                          gap: '12px',
                          alignItems: 'center',
                          boxShadow: isTabActive ? '0 1px 3px rgba(37,99,235,0.06)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {/* Module Info */}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                            <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                              {m.labelEn}
                            </span>
                            <span style={{
                              fontSize: '0.68rem',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: '#f1f5f9',
                              color: '#64748b',
                              fontFamily: 'monospace'
                            }}>
                              {m.path}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>
                            {m.labelUrdu}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                            Category: <b style={{ color: '#64748b' }}>{m.category}</b>
                          </div>
                        </div>

                        {/* Column 1: Tab Access / View Checkbox */}
                        <div>
                          <label
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '8px 10px',
                              borderRadius: '8px',
                              backgroundColor: isTabActive ? '#e0f2fe' : '#f8fafc',
                              border: isTabActive ? '1.5px solid #0284c7' : '1px solid #e2e8f0',
                              cursor: 'pointer',
                              userSelect: 'none',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isTabActive}
                              onChange={() => toggleTabPerm(m.path)}
                              style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#0284c7' }}
                            />
                            <div>
                              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: isTabActive ? '#0369a1' : '#64748b' }}>
                                👁️ View Tab
                              </div>
                              <div style={{ fontSize: '0.7rem', color: isTabActive ? '#0284c7' : '#94a3b8' }}>
                                {isTabActive ? 'Active (نظر آئے گا)' : 'Hidden (پوشیدہ)'}
                              </div>
                            </div>
                          </label>
                        </div>

                        {/* Column 2: Edit Permission Checkbox */}
                        <div>
                          {hasEdit && m.editAction ? (
                            <label
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 10px',
                                borderRadius: '8px',
                                backgroundColor: isEditActive ? '#e0e7ff' : '#f8fafc',
                                border: isEditActive ? '1.5px solid #4f46e5' : '1px solid #e2e8f0',
                                cursor: 'pointer',
                                userSelect: 'none',
                                transition: 'all 0.15s ease'
                              }}
                              title={m.editAction.desc}
                            >
                              <input
                                type="checkbox"
                                checked={isEditActive}
                                onChange={() => toggleActionPerm(m.editAction!.key, m.editAction!.alias, m.path)}
                                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#4f46e5' }}
                              />
                              <div>
                                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: isEditActive ? '#3730a3' : '#64748b' }}>
                                  ✏️ Allow Edit
                                </div>
                                <div style={{ fontSize: '0.7rem', color: isEditActive ? '#4f46e5' : '#94a3b8' }}>
                                  {isEditActive ? 'Allowed (ترمیم جاری)' : 'No Edit (منع)'}
                                </div>
                              </div>
                            </label>
                          ) : (
                            <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8', padding: '6px' }}>
                              — <span style={{ fontSize: '0.7rem' }}>(View Only)</span>
                            </div>
                          )}
                        </div>

                        {/* Column 3: Delete Permission Checkbox */}
                        <div>
                          {hasDelete && m.deleteAction ? (
                            <label
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 10px',
                                borderRadius: '8px',
                                backgroundColor: isDeleteActive ? '#fee2e2' : '#f8fafc',
                                border: isDeleteActive ? '1.5px solid #e11d48' : '1px solid #e2e8f0',
                                cursor: 'pointer',
                                userSelect: 'none',
                                transition: 'all 0.15s ease'
                              }}
                              title={m.deleteAction.desc}
                            >
                              <input
                                type="checkbox"
                                checked={isDeleteActive}
                                onChange={() => toggleActionPerm(m.deleteAction!.key, m.deleteAction!.alias, m.path)}
                                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#e11d48' }}
                              />
                              <div>
                                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: isDeleteActive ? '#9f1239' : '#64748b' }}>
                                  🗑️ Allow Delete
                                </div>
                                <div style={{ fontSize: '0.7rem', color: isDeleteActive ? '#e11d48' : '#94a3b8' }}>
                                  {isDeleteActive ? 'Allowed (ڈیلیٹ جاری)' : 'No Delete (منع)'}
                                </div>
                              </div>
                            </label>
                          ) : (
                            <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8', padding: '6px' }}>
                              —
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 4. Modal Footer (Fixed) */}
            <div style={{
              padding: '14px 24px',
              borderTop: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0
            }}>
              {/* Stats Summary */}
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: '#475569' }}>
                  Tabs Active: <strong style={{ color: '#0284c7' }}>{enabledTabsCount}</strong> of {PERMISSION_MODULES.length}
                </span>
                <span style={{ color: '#cbd5e1' }}>•</span>
                <span style={{ fontSize: '0.8rem', color: '#475569' }}>
                  Edit Permissions: <strong style={{ color: '#4f46e5' }}>{enabledEditsCount}</strong>
                </span>
                <span style={{ color: '#cbd5e1' }}>•</span>
                <span style={{ fontSize: '0.8rem', color: '#475569' }}>
                  Delete Permissions: <strong style={{ color: '#e11d48' }}>{enabledDeletesCount}</strong>
                </span>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px' }}>
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
                  style={{ padding: '8px 24px', fontWeight: 800, minWidth: '170px' }}
                >
                  {savingPerms ? 'Saving Permissions...' : 'Save Permissions'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

