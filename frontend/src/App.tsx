import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { Layout } from './components/Layout';
import { PublicLayout } from './components/PublicLayout';

import { Login } from './pages/Login';
import { AdminDashboard } from './pages/AdminDashboard';
import { SalesmanPortal } from './pages/SalesmanPortal';
import { ProductsPage } from './pages/ProductsPage';
import { SalesListPage } from './pages/SalesListPage';
import { PurchasesPage } from './pages/PurchasesPage';
import { CustomersAndSuppliersPage } from './pages/PartnersPage';
import { LedgersPage } from './pages/LedgersPage';
import { DeliveryManagementPage } from './pages/DeliveryManagementPage';
import { CashierDashboard } from './pages/CashierDashboard';
import { OperatorDashboard } from './pages/OperatorDashboard';
import { ReportsPage } from './pages/ReportsPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { SettingsPage } from './pages/SettingsPage';
import { AuditTrailPage } from './pages/AuditTrailPage';

// New Modules
import { CataloguePage } from './pages/CataloguePage';
import { ConfidentialBrandPage } from './pages/ConfidentialBrandPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { WebOrdersQueuePage } from './pages/WebOrdersQueuePage';
import { UtilitiesPage } from './pages/UtilitiesPage';

// Public Website Pages
import { HomePage } from './pages/public/HomePage';
import { ProductsCatalogPage } from './pages/public/ProductsCatalogPage';
import { CategoriesPage } from './pages/public/CategoriesPage';
import { ProductDetailPage } from './pages/public/ProductDetailPage';
import { AboutPage } from './pages/public/AboutPage';
import { ContactPage } from './pages/public/ContactPage';

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode; roles?: string[] }> = ({
  children,
  roles,
}) => {
  const { user, token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', color: '#f59e0b', fontSize: '1rem', fontWeight: 700 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.4rem' }}>🛢️</span> Loading Rafiq POS...
        </div>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  const userRole = (user.role || '').toUpperCase();
  if (roles && roles.length > 0 && !roles.map(r => r.toUpperCase()).includes(userRole)) {
    return <Navigate to="/app" replace />;
  }

  return <Layout>{children}</Layout>;
};

// Default Home redirect based on role
const RoleRedirect: React.FC = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  switch (user.role) {
    case 'ADMIN':
      return <Navigate to="/admin" replace />;
    case 'OPERATOR':
      return <Navigate to="/operator" replace />;
    case 'CASHIER':
      return <Navigate to="/cashier" replace />;
    case 'SALESMAN':
      return <Navigate to="/salesman" replace />;
    default:
      return <Navigate to="/products" replace />;
  }
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Routes>
          {/* Public Website Routes (No Login Required) */}
          <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
          <Route path="/website" element={<PublicLayout><HomePage /></PublicLayout>} />
          <Route path="/website/products" element={<PublicLayout><ProductsCatalogPage /></PublicLayout>} />
          <Route path="/website/products/:id" element={<PublicLayout><ProductDetailPage /></PublicLayout>} />
          <Route path="/website/categories" element={<PublicLayout><CategoriesPage /></PublicLayout>} />
          <Route path="/website/about" element={<PublicLayout><AboutPage /></PublicLayout>} />
          <Route path="/website/contact" element={<PublicLayout><ContactPage /></PublicLayout>} />

          {/* Authentication */}
          <Route path="/login" element={<Login />} />

          {/* Internal POS & ERP Entry Point */}
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <RoleRedirect />
              </ProtectedRoute>
            }
          />

          {/* Role Portals */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cashier"
            element={
              <ProtectedRoute roles={['ADMIN', 'CASHIER']}>
                <CashierDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/operator"
            element={
              <ProtectedRoute roles={['ADMIN', 'OPERATOR']}>
                <OperatorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/salesman"
            element={
              <ProtectedRoute>
                <SalesmanPortal />
              </ProtectedRoute>
            }
          />

          {/* Core ERP Modules */}
          <Route
            path="/products"
            element={
              <ProtectedRoute roles={['ADMIN', 'OPERATOR']}>
                <ProductsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sales"
            element={
              <ProtectedRoute roles={['ADMIN', 'OPERATOR', 'CASHIER']}>
                <SalesListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/web-orders"
            element={
              <ProtectedRoute roles={['ADMIN', 'OPERATOR']}>
                <WebOrdersQueuePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/purchases"
            element={
              <ProtectedRoute roles={['ADMIN', 'OPERATOR']}>
                <PurchasesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers"
            element={
              <ProtectedRoute roles={['ADMIN', 'OPERATOR', 'SALESMAN', 'CASHIER']}>
                <CustomersAndSuppliersPage type="CUSTOMERS" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/suppliers"
            element={
              <ProtectedRoute roles={['ADMIN', 'OPERATOR']}>
                <CustomersAndSuppliersPage type="SUPPLIERS" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ledgers"
            element={
              <ProtectedRoute roles={['ADMIN', 'OPERATOR', 'CASHIER']}>
                <LedgersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/delivery"
            element={
              <ProtectedRoute roles={['ADMIN', 'OPERATOR']}>
                <DeliveryManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/catalogue"
            element={
              <ProtectedRoute>
                <CataloguePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/expenses"
            element={
              <ProtectedRoute roles={['ADMIN', 'OPERATOR', 'CASHIER']}>
                <ExpensesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employees"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <EmployeesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <ReportsPage />
              </ProtectedRoute>
            }
          />

          {/* Confidential Owner Brand Module (Admin Only) */}
          <Route
            path="/admin/confidential-brand"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <ConfidentialBrandPage />
              </ProtectedRoute>
            }
          />

          {/* Admin Tools */}
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <UserManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/utilities"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <UtilitiesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/audit"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <AuditTrailPage />
              </ProtectedRoute>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </CartProvider>
  </AuthProvider>
);
};

export default App;
