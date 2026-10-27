import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { ToastProvider } from './components/admin/Toast';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { Dashboard } from './pages/Dashboard';
import { Feed } from './pages/Feed';
import { Matches } from './pages/Matches';
import { Requests } from './pages/Requests';
import { Profile } from './pages/Profile';
import { CreateListing } from './pages/CreateListing';

// Admin Pages
import { AccessManagement } from './pages/admin/AccessManagement';
import { AdminListings } from './pages/admin/AdminListings';
import { AdminReports } from './pages/admin/AdminReports';
import { AdminAuditLog } from './pages/admin/AdminAuditLog';

function AppRoutes() {
  return (
    <Routes>
      {/* Public Authentication Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Protected App Routes (Authenticated Students & Admins) */}
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/matches" element={<Matches />} />
        <Route path="/requests" element={<Requests />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/listings/create" element={<CreateListing />} />

        {/* Admin Control Center Routes (Strict RBAC: role === 'admin' only) */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
          <Route path="/access-management" element={<AccessManagement />} />
          <Route path="/admin/users" element={<AccessManagement />} />
          <Route path="/admin/listings" element={<AdminListings />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/audit-log" element={<AdminAuditLog />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
