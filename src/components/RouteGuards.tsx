import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

function LoadingScreen() {
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-background gap-6">
      <div className="w-16 h-16 rounded-[2rem] bg-primary flex items-center justify-center shadow-2xl overflow-hidden">
        <img src="/jpp-logo.png" alt="JPP" className="w-10 h-10 object-contain" />
      </div>
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 border-4 border-primary/15 rounded-full" />
        <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
        Memuatkan JPP Digital Portal...
      </p>
    </div>
  );
}

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function PublicRoute() {
  const { isAuthenticated, isLoading, profile } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (isAuthenticated) {
    // SUPER_ADMIN_JPP & JPP (Ahli JPP) → terus ke admin panel, skip portal
    if (profile?.role === 'SUPER_ADMIN_JPP' || profile?.role === 'JPP') {
      return <Navigate to="/jpp-admin" replace />;
    }
    // Semua pengguna lain → Portal Hub untuk pilih exco
    // (localStorage is_new_register dikekalkan untuk backward compat)
    localStorage.removeItem('is_new_register');
    return <Navigate to="/portal" replace />;
  }
  return <Outlet />;
}
