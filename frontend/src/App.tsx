import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { Layout } from './components/Layout';
import { PublicLayout } from './components/PublicLayout';

// Direct import for essential entry screen
import { Login } from './pages/Login';

// Helper for typed named-export lazy loading
const lazyNamed = <T extends Record<string, any>>(
  importFn: () => Promise<T>,
  exportName: keyof T
) => lazy(() => importFn().then((mod) => ({ default: mod[exportName] })));

// Lazy-loaded app modules for blazing-fast initial bundle load
const AdminDashboard = lazyNamed(() => import('./pages/AdminDashboard'), 'AdminDashboard');
const SalesmanPortal = lazyNamed(() => import('./pages/SalesmanPortal'), 'SalesmanPortal');
const ProductsPage = lazyNamed(() => import('./pages/ProductsPage'), 'ProductsPage');
const SalesListPage = lazyNamed(() => import('./pages/SalesListPage'), 'SalesListPage');
const PurchasesPage = lazyNamed(() => import('./pages/PurchasesPage'), 'PurchasesPage');
const CustomersAndSuppliersPage = lazyNamed(() => import('./pages/PartnersPage'), 'CustomersAndSuppliersPage');
const LedgersPage = lazyNamed(() => import('./pages/LedgersPage'), 'LedgersPage');
const DeliveryManagementPage = lazyNamed(() => import('./pages/DeliveryManagementPage'), 'DeliveryManagementPage');
const CashierDashboard = lazyNamed(() => import('./pages/CashierDashboard'), 'CashierDashboard');
const OperatorDashboard = lazyNamed(() => import('./pages/OperatorDashboard'), 'OperatorDashboard');
const ReportsPage = lazyNamed(() => import('./pages/ReportsPage'), 'ReportsPage');
const UserManagementPage = lazyNamed(() => import('./pages/UserManagementPage'), 'UserManagementPage');
const SettingsPage = lazyNamed(() => import('./pages/SettingsPage'), 'SettingsPage');
const AuditTrailPage = lazyNamed(() => import('./pages/AuditTrailPage'), 'AuditTrailPage');

// Heavy module pages (split out xlsx, jspdf, etc.)
const CataloguePage = lazyNamed(() => import('./pages/CataloguePage'), 'CataloguePage');
const ConfidentialBrandPage = lazyNamed(() => import('./pages/ConfidentialBrandPage'), 'ConfidentialBrandPage');
const ExpensesPage = lazyNamed(() => import('./pages/ExpensesPage'), 'ExpensesPage');
const EmployeesPage = lazyNamed(() => import('./pages/EmployeesPage'), 'EmployeesPage');
const WebOrdersQueuePage = lazyNamed(() => import('./pages/WebOrdersQueuePage'), 'WebOrdersQueuePage');
const UtilitiesPage = lazyNamed(() => import('./pages/UtilitiesPage'), 'UtilitiesPage');

// Public Website Pages
const HomePage = lazyNamed(() => import('./pages/public/HomePage'), 'HomePage');
const ProductsCatalogPage = lazyNamed(() => import('./pages/public/ProductsCatalogPage'), 'ProductsCatalogPage');
const CategoriesPage = lazyNamed(() => import('./pages/public/CategoriesPage'), 'CategoriesPage');
const ProductDetailPage = lazyNamed(() => import('./pages/public/ProductDetailPage'), 'ProductDetailPage');
const AboutPage = lazyNamed(() => import('./pages/public/AboutPage'), 'AboutPage');
const ContactPage = lazyNamed(() => import('./pages/public/ContactPage'), 'ContactPage');

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode; roles?: string[]; path?: string }> = ({
  children,
  roles,
  path,
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

  // Full Admin has universal access to A-Z modules
  if (user.role === 'ADMIN') {
    return <Layout>{children}</Layout>;
  }

  // Granular Admin Permissions: if Admin assigned permission for this path to this user
  if (path && user.permissions && Array.isArray(user.permissions) && user.permissions.includes(path)) {
    return <Layout>{children}</Layout>;
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

const RouteLoadingFallback = () => (
  <div style={{ display: 'flex', height: '60vh', alignItems: 'center', justifyContent: 'center', color: '#f59e0b', fontSize: '0.95rem', fontWeight: 700 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontSize: '1.2rem' }}>🛢️</span> Loading...
    </div>
  </div>
);

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Suspense fallback={<RouteLoadingFallback />}>
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
              <ProtectedRoute roles={['ADMIN']} path="/admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cashier"
            element={
              <ProtectedRoute roles={['ADMIN', 'CASHIER']} path="/cashier">
                <CashierDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/operator"
            element={
              <ProtectedRoute roles={['ADMIN', 'OPERATOR']} path="/operator">
                <OperatorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/salesman"
            element={
              <ProtectedRoute path="/salesman">
                <SalesmanPortal />
              </ProtectedRoute>
            }
          />

          {/* Core ERP Modules */}
          <Route
            path="/products"
            element={
              <ProtectedRoute roles={['ADMIN', 'OPERATOR']} path="/products">
                <ProductsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sales"
            element={
              <ProtectedRoute roles={['ADMIN', 'OPERATOR', 'CASHIER']} path="/sales">
                <SalesListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/web-orders"
            element={
              <ProtectedRoute roles={['ADMIN', 'OPERATOR']} path="/web-orders">
                <WebOrdersQueuePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/purchases"
            element={
              <ProtectedRoute roles={['ADMIN', 'OPERATOR']} path="/purchases">
                <PurchasesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers"
            element={
              <ProtectedRoute roles={['ADMIN', 'OPERATOR', 'SALESMAN', 'CASHIER']} path="/customers">
                <CustomersAndSuppliersPage type="CUSTOMERS" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/suppliers"
            element={
              <ProtectedRoute roles={['ADMIN', 'OPERATOR']} path="/suppliers">
                <CustomersAndSuppliersPage type="SUPPLIERS" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ledgers"
            element={
              <ProtectedRoute roles={['ADMIN', 'OPERATOR', 'CASHIER']} path="/ledgers">
                <LedgersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/delivery"
            element={
              <ProtectedRoute roles={['ADMIN', 'OPERATOR']} path="/delivery">
                <DeliveryManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/catalogue"
            element={
              <ProtectedRoute path="/catalogue">
                <CataloguePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/expenses"
            element={
              <ProtectedRoute roles={['ADMIN', 'OPERATOR', 'CASHIER']} path="/expenses">
                <ExpensesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employees"
            element={
              <ProtectedRoute roles={['ADMIN']} path="/employees">
                <EmployeesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute roles={['ADMIN']} path="/reports">
                <ReportsPage />
              </ProtectedRoute>
            }
          />

          {/* Confidential Owner Brand Module (Admin Only) */}
          <Route
            path="/admin/confidential-brand"
            element={
              <ProtectedRoute roles={['ADMIN']} path="/admin/confidential-brand">
                <ConfidentialBrandPage />
              </ProtectedRoute>
            }
          />

          {/* Admin Tools */}
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute roles={['ADMIN', 'OPERATOR']} path="/admin/users">
                <UserManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute roles={['ADMIN']} path="/admin/settings">
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/utilities"
            element={
              <ProtectedRoute roles={['ADMIN']} path="/admin/utilities">
                <UtilitiesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/audit"
            element={
              <ProtectedRoute roles={['ADMIN']} path="/admin/audit">
                <AuditTrailPage />
              </ProtectedRoute>
            }
          />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </CartProvider>
  </AuthProvider>
);
};

export default App;
