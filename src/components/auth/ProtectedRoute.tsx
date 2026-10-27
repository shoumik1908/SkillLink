import React from 'react';
import { Navigate, useLocation, Link, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/Button';

interface ProtectedRouteProps {
  allowedRoles?: ('user' | 'admin')[];
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-purple-600/10 flex items-center justify-center border border-purple-200 animate-pulse">
            <span className="text-purple-600 font-bold text-xl">S</span>
          </div>
          <div className="absolute inset-0 rounded-2xl border-2 border-purple-600 border-t-transparent animate-spin" />
        </div>
        <p className="mt-4 text-sm font-medium text-slate-500">Checking your credentials...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200/80 shadow-md p-8 text-center">
          <div className="w-14 h-14 bg-red-50 border border-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-xs">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">Access Forbidden (403)</h2>
          <p className="text-slate-600 text-sm mb-6 leading-relaxed">
            Your current account role (<span className="font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">{role}</span>) does not have authorization to access this administrative page.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/dashboard">
              <Button className="w-full sm:w-auto">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
};
