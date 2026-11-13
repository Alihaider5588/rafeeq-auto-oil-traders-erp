import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  ShoppingBag,
  Users,
  Building2,
  BookOpen,
  Truck,
  TrendingUp,
  Settings,
  LogOut,
  Droplet,
  Smartphone,
  Shield,
  FileText,
  Receipt,
  ShieldAlert,
  Globe,
  Inbox,
  Key,
  Wrench,
  Menu,
  X,
  Volume2,
  VolumeX
} from 'lucide-react';
import { SyncButton } from './SyncButton';
import { initGlobalAudioListeners, isSoundEnabled, toggleSound } from '../utils/soundEffects';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [soundActive, setSoundActive] = useState<boolean>(isSoundEnabled());

  useEffect(() => {
    initGlobalAudioListeners();
  }, []);

  const handleToggleSound = () => {
    const next = toggleSound();
    setSoundActive(next);
  };

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');
  const [submittingPass, setSubmittingPass] = useState(false);

  const handleSelfChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');
    setSubmittingPass(true);

    try {
      const res = await api.post('/auth/change-password', {
        currentPassword: currentPass,
        newPassword: newPass.trim(),
      });
      if (res.data?.success) {
        setPassSuccess('Your password has been changed successfully!');
        setCurrentPass('');
        setNewPass('');
        setTimeout(() => {
          setShowPassModal(false);
          setPassSuccess('');
        }, 1500);
      }
    } catch (err: any) {
      setPassError(err.response?.data?.message || 'Failed to update password');
    } finally {
      setSubmittingPass(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const canAccessTab = (path: string, defaultRoles: string[]) => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true; // Admin has unrestricted access to all modules

    // If custom granular tab permissions are configured for this staff member, respect them directly
    if (user.permissions && Array.isArray(user.permissions)) {
      const tabPerms = user.permissions.filter((p: string) => p.startsWith('/'));
      if (tabPerms.length > 0) {
        return tabPerms.includes(path);
      }
    }

    // Default fallback to role-based access if no custom permissions have been explicitly set
    return defaultRoles.includes(user.role);
  };

  const navItemStyle = ({ isActive }: { isActive: boolean }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '11px 16px',
    borderRadius: '10px',
    textDecoration: 'none',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: isActive ? '#ffffff' : '#94a3b8',
    backgroundColor: isActive ? '#d97706' : 'transparent',
    transition: 'all 0.15s ease',
    marginBottom: '4px',
  });

  return (
    <div className="app-container">
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        {/* Brand header */}
        <div style={{
          padding: '18px 16px',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img
              src="/logo.png"
              alt="Logo"
              style={{
                width: '40px',
                height: '40px',
                objectFit: 'contain',
                borderRadius: '10px',
                backgroundColor: '#ffffff',
                padding: '2px'
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#f8fafc', letterSpacing: '0.04em', lineHeight: 1.2 }}>
                RAFIQ AUTO & OIL
              </div>
              <div className="urdu-text" style={{ fontSize: '0.85rem', color: '#f59e0b', fontWeight: 700, marginTop: '2px', lineHeight: 1.4 }}>
                رفیق آٹو اینڈ آئل ٹریڈرز
              </div>
            </div>
          </div>

          <button
            onClick={() => setMobileMenuOpen(false)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              padding: '6px',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
            className="mobile-nav-toggle"
            title="Close Menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation list - auto closes on mobile tap */}
        <nav
          style={{ padding: '16px 12px', flex: 1, overflowY: 'auto' }}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('a')) {
              setMobileMenuOpen(false);
            }
          }}
        >
          {/* Role-specific home links (Can also be granted to other users by Admin) */}
          {canAccessTab('/admin', ['ADMIN']) && (
            <NavLink to="/admin" style={navItemStyle}>
              <LayoutDashboard size={18} /> Admin Dashboard
            </NavLink>
          )}

          {canAccessTab('/operator', ['ADMIN', 'OPERATOR']) && (
            <NavLink to="/operator" style={navItemStyle}>
              <LayoutDashboard size={18} /> Operator Desk
            </NavLink>
          )}

          {canAccessTab('/cashier', ['ADMIN', 'CASHIER']) && (
            <NavLink to="/cashier" style={navItemStyle}>
              <LayoutDashboard size={18} /> Cashier Desk
            </NavLink>
          )}

          {/* Sales Portal: available to SALESMAN, ADMIN, OPERATOR */}
          {canAccessTab('/salesman', ['SALESMAN', 'OPERATOR', 'ADMIN']) && (
            <NavLink to="/salesman" style={navItemStyle}>
              <Smartphone size={18} /> Sales Portal
            </NavLink>
          )}

          <div style={{ height: '1px', background: '#1e293b', margin: '12px 4px' }} />

          {/* Core ERP Modules - Dynamically Configurable Tabs A to Z by Admin */}
          
          {/* Products & Stock */}
          {canAccessTab('/products', ['ADMIN', 'OPERATOR']) && (
            <NavLink to="/products" style={navItemStyle}>
              <Package size={18} /> Products & Stock
            </NavLink>
          )}

          {/* Sales & POS */}
          {canAccessTab('/sales', ['ADMIN', 'OPERATOR', 'CASHIER']) && (
            <NavLink to="/sales" style={navItemStyle}>
              <ShoppingCart size={18} /> Sales & POS
            </NavLink>
          )}

          {/* Reclaimed Loose Oil Drum (ڈرم کا کھلا آئل) */}
          {canAccessTab('/reclaimed-drum', ['ADMIN', 'OPERATOR', 'CASHIER', 'SALESMAN']) && (
            <NavLink to="/reclaimed-drum" style={navItemStyle}>
              <Droplet size={18} /> Khula Oil Drum (ڈرم)
            </NavLink>
          )}

          {/* Warranty Claims & Defective Store (وارنٹی کلیمز) */}
          {canAccessTab('/claims', ['ADMIN', 'OPERATOR', 'CASHIER']) && (
            <NavLink to="/claims" style={navItemStyle}>
              <ShieldAlert size={18} /> Warranty Claims (کلیمز)
            </NavLink>
          )}

          {/* Web Orders Queue */}
          {canAccessTab('/web-orders', ['ADMIN', 'OPERATOR']) && (
            <NavLink to="/web-orders" style={navItemStyle}>
              <Inbox size={18} /> Web Orders Queue
            </NavLink>
          )}

          {/* Purchases (Inward) */}
          {canAccessTab('/purchases', ['ADMIN', 'OPERATOR']) && (
            <NavLink to="/purchases" style={navItemStyle}>
              <ShoppingBag size={18} /> Purchases (Inward)
            </NavLink>
          )}

          {/* Customers & Shops */}
          {canAccessTab('/customers', ['ADMIN', 'OPERATOR', 'SALESMAN', 'CASHIER']) && (
            <NavLink to="/customers" style={navItemStyle}>
              <Users size={18} /> Customers & Shops
            </NavLink>
          )}

          {/* Suppliers / Companies */}
          {canAccessTab('/suppliers', ['ADMIN', 'OPERATOR']) && (
            <NavLink to="/suppliers" style={navItemStyle}>
              <Building2 size={18} /> Suppliers / Companies
            </NavLink>
          )}

          {/* Ledgers & Accounts */}
          {canAccessTab('/ledgers', ['ADMIN', 'OPERATOR', 'CASHIER']) && (
            <NavLink to="/ledgers" style={navItemStyle}>
              <BookOpen size={18} /> Ledgers & Accounts
            </NavLink>
          )}

          {/* Van Delivery & Routes */}
          {canAccessTab('/delivery', ['ADMIN', 'OPERATOR']) && (
            <NavLink to="/delivery" style={navItemStyle}>
              <Truck size={18} /> Van Delivery & Routes
            </NavLink>
          )}

          {/* PDF Product Catalogue: All authenticated users */}
          {canAccessTab('/catalogue', ['ADMIN', 'OPERATOR', 'CASHIER', 'SALESMAN']) && (
            <NavLink to="/catalogue" style={navItemStyle}>
              <BookOpen size={18} /> PDF Product Catalogue
            </NavLink>
          )}

          {/* Daily Expenses */}
          {canAccessTab('/expenses', ['ADMIN', 'OPERATOR', 'CASHIER']) && (
            <NavLink to="/expenses" style={navItemStyle}>
              <Receipt size={18} /> Daily Expenses
            </NavLink>
          )}

          {/* Employees & Attendance */}
          {canAccessTab('/employees', ['ADMIN']) && (
            <NavLink to="/employees" style={navItemStyle}>
              <Users size={18} /> Employees & Attendance
            </NavLink>
          )}

          {/* Profit & Reports */}
          {canAccessTab('/reports', ['ADMIN']) && (
            <NavLink to="/reports" style={navItemStyle}>
              <TrendingUp size={18} /> Profit & Reports
            </NavLink>
          )}

          {/* User Management */}
          {canAccessTab('/admin/users', ['ADMIN', 'OPERATOR']) && (
            <NavLink to="/admin/users" style={navItemStyle}>
              <Shield size={18} /> User Management
            </NavLink>
          )}

          {/* Admin Vault, Audit, Settings & Utilities */}
          {(canAccessTab('/admin/confidential-brand', ['ADMIN']) ||
            canAccessTab('/admin/audit', ['ADMIN']) ||
            canAccessTab('/admin/settings', ['ADMIN']) ||
            canAccessTab('/admin/utilities', ['ADMIN'])) && (
            <>
              <div style={{ height: '1px', background: '#1e293b', margin: '12px 4px' }} />
              {canAccessTab('/admin/confidential-brand', ['ADMIN']) && (
                <NavLink to="/admin/confidential-brand" style={({ isActive }) => ({
                  ...navItemStyle({ isActive }),
                  color: isActive ? '#fff' : '#f87171',
                  backgroundColor: isActive ? '#991b1b' : 'transparent',
                })}>
                  <ShieldAlert size={18} /> Confidential Brand Vault
                </NavLink>
              )}
              {canAccessTab('/admin/audit', ['ADMIN']) && (
                <NavLink to="/admin/audit" style={navItemStyle}>
                  <FileText size={18} /> Audit Trail
                </NavLink>
              )}
              {canAccessTab('/admin/settings', ['ADMIN']) && (
                <NavLink to="/admin/settings" style={navItemStyle}>
                  <Settings size={18} /> System Settings
                </NavLink>
              )}
              {canAccessTab('/admin/utilities', ['ADMIN']) && (
                <NavLink to="/admin/utilities" style={navItemStyle}>
                  <Wrench size={18} /> Utilities
                </NavLink>
              )}
            </>
          )}

          <div style={{ height: '1px', background: '#1e293b', margin: '12px 4px' }} />
          <a
            href="/website"
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '11px 16px',
              borderRadius: '10px',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#38bdf8',
              backgroundColor: 'rgba(56, 189, 248, 0.08)',
              border: '1px dashed rgba(56, 189, 248, 0.3)',
              marginBottom: '4px'
            }}
          >
            <Globe size={18} /> View Public Website ↗
          </a>
        </nav>

        {/* User Card & Logout */}
        <div style={{
          padding: '16px',
          borderTop: '1px solid #1e293b',
          backgroundColor: '#090d16',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
              {user?.fullName}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#d97706', fontWeight: 600 }}>
              {user?.role}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={() => {
                setShowPassModal(true);
                setPassError('');
                setPassSuccess('');
                setCurrentPass('');
                setNewPass('');
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#f59e0b',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px'
              }}
              title="Change My Password"
            >
              <Key size={17} />
            </button>

            <button
              onClick={handleLogout}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px'
              }}
              title="Log Out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* Developer Credit */}
        <div style={{
          padding: '10px 16px',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          backgroundColor: '#070a12',
          textAlign: 'center',
          fontSize: '0.73rem',
          color: '#64748b'
        }}>
          Software by <a href="https://nexuradigi.site/" target="_blank" rel="noopener noreferrer" style={{ color: '#f59e0b', letterSpacing: '0.03em', fontWeight: 800, textDecoration: 'underline', textUnderlineOffset: '3px' }}>Nexura Digital</a>
        </div>
      </aside>

      {/* Main Area */}
      <div className="main-content">
        {/* Top Header */}
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              style={{
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                padding: '8px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'none',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0f172a',
              }}
              className="mobile-nav-toggle"
              title="Open Navigation Menu"
            >
              <Menu size={20} />
            </button>

            <img 
              src="/logo.png" 
              alt="Rafiq Auto & Oil Traders" 
              style={{ width: '36px', height: '36px', objectFit: 'contain', borderRadius: '8px', backgroundColor: '#fff', padding: '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} 
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.02rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '0.02em' }}>
                  RAFIQ AUTO & OIL TRADERS
                </h2>
                <span 
                  className="urdu-text" 
                  style={{ 
                    fontSize: '0.88rem', 
                    color: '#b45309', 
                    fontWeight: 700, 
                    backgroundColor: '#fef3c7', 
                    padding: '2px 8px', 
                    borderRadius: '6px',
                    border: '1px solid #fde68a',
                    lineHeight: 1.3
                  }}
                >
                  رفیق آٹو اینڈ آئل ٹریڈرز
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '3px' }}>
                54-Stop Near MCB Bank, Dipalpur Road, Okara
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Audio Effects Toggle */}
            <button
              type="button"
              onClick={handleToggleSound}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                backgroundColor: soundActive ? '#fef3c7' : '#f1f5f9',
                color: soundActive ? '#b45309' : '#64748b',
                border: `1px solid ${soundActive ? '#fde68a' : '#cbd5e1'}`,
                borderRadius: '20px',
                padding: '4px 10px',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title={soundActive ? 'UI Click & Print Sounds Active (Click to mute)' : 'UI Sounds Muted (Click to enable)'}
            >
              {soundActive ? <Volume2 size={14} color="#d97706" /> : <VolumeX size={14} color="#94a3b8" />}
              <span>{soundActive ? 'Sound On' : 'Muted'}</span>
            </button>

            <SyncButton />
            <div className="topbar-date" style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>
              {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </div>
          </div>
        </header>

        {/* Dynamic Page Content with Aesthetic Entrance Transition */}
        <main key={location.pathname} className="content-body aesthetic-page-transition">
          {children}
        </main>
      </div>

      {/* Change Password Modal */}
      {showPassModal && (
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
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '420px',
            padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ backgroundColor: '#fef3c7', padding: '10px', borderRadius: '10px', color: '#d97706' }}>
                <Key size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                  Change My Password
                </h3>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Logged in as: <strong>{user?.username}</strong> ({user?.role})
                </div>
              </div>
            </div>

            {passError && (
              <div style={{
                backgroundColor: '#fee2e2',
                color: '#991b1b',
                padding: '10px 14px',
                borderRadius: '8px',
                marginBottom: '14px',
                fontSize: '0.85rem'
              }}>
                {passError}
              </div>
            )}

            {passSuccess && (
              <div style={{
                backgroundColor: '#dcfce7',
                color: '#166534',
                padding: '10px 14px',
                borderRadius: '8px',
                marginBottom: '14px',
                fontSize: '0.85rem',
                fontWeight: 600
              }}>
                ✓ {passSuccess}
              </div>
            )}

            <form onSubmit={handleSelfChangePassword}>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                  Current Password *
                </label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Enter your current password"
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                  New Password *
                </label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Minimum 6 characters"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowPassModal(false)}
                  className="btn btn-outline"
                  disabled={submittingPass}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingPass || newPass.trim().length < 6}
                >
                  {submittingPass ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
