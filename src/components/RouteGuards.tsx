import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function LoadingScreen() {
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setShowWarning(true), 3000);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-background gap-6 relative">
      <div className="w-16 h-16 rounded-[2rem] bg-primary flex items-center justify-center shadow-2xl overflow-hidden">
        <img src="/jpp-logo.png" alt="JPP" className="w-10 h-10 object-contain" />
      </div>
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 border-4 border-primary/15 rounded-full" />
        <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 text-center px-4 leading-relaxed">
        Memuatkan JPP Digital Portal...
      </p>

      <AnimatePresence>
        {showWarning && (
          <div className="absolute bottom-12 left-0 right-0 flex justify-center px-4 z-50">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="w-full max-w-sm p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 font-medium text-center flex flex-col items-center gap-2 shadow-xl"
            >
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-4 h-4" />
                <span>Internet lambat?</span>
              </div>
              <span>Anda mungkin menghadapi masalah sambungan. Sila <strong>refresh/reopen</strong> portal ini.</span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
  const navigate = useNavigate();

  // ── Logik redirect selepas log masuk ──────────────────────────────────────
  // PENTING: Diletakkan dalam useEffect dan bukannya dalam render body untuk
  // elak race condition. Supabase notify onAuthStateChange sebelum Promise
  // signInWithPassword resolve, jadi sessionStorage mungkin belum diset
  // semasa render pertama. useEffect dijamin berjalan SELEPAS React commit
  // semua state updates, memastikan sessionStorage sudah bersedia.
  useEffect(() => {
    if (isLoading || !isAuthenticated) return;

    const savedRedirect = sessionStorage.getItem('post_login_redirect');
    if (savedRedirect) {
      sessionStorage.removeItem('post_login_redirect');
      navigate(savedRedirect, { replace: true });
      return;
    }

    // Tiada redirect tersimpan — guna logik default berdasarkan role.
    // Tunggu profile dimuatkan sebelum buat keputusan role-based.
    if (profile === null) return; // profile masih loading, tunggu render seterusnya

    if (profile?.role === 'SUPER_ADMIN_JPP' || profile?.role === 'JPP') {
      navigate('/jpp', { replace: true });
    } else {
      localStorage.removeItem('is_new_register');
      navigate('/portal', { replace: true });
    }
  }, [isAuthenticated, isLoading, profile, navigate]);

  // Tunjuk loading semasa auth dalam transisi
  if (isLoading) return <LoadingScreen />;

  // Kalau sudah authenticated, tunjuk loading sementara useEffect handle redirect
  if (isAuthenticated) return <LoadingScreen />;

  return <Outlet />;
}
