import React, { useEffect, useState, useRef } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { sanitizeRedirect } from '@/utils/sanitizeRedirect';
import { AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function LoadingScreen() {
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setShowWarning(true), 5000);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-background gap-6 relative">
      <div className="relative flex flex-col items-center justify-center mb-6 mt-[-5vh]">
        {/* Latar belakang bercahaya untuk HZ logo (berwarna ungu/oren) */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="absolute inset-0 bg-gradient-to-tr from-purple-500/20 to-orange-500/20 blur-[100px] rounded-full animate-pulse" 
        />
        
        {/* Logo HZ dengan animasi masuk ala wayang (Cinematic Intro) */}
        <motion.img 
          initial={{ scale: 0.85, opacity: 0, filter: "blur(15px)" }}
          animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }} // smooth spring-like ease out
          src="/HZ.png?v=2" 
          alt="HZ Infinity" 
          className="relative z-10 w-[85vw] max-w-[320px] md:max-w-[450px] h-auto object-contain drop-shadow-[0_0_50px_rgba(168,85,247,0.8)]" 
        />
      </div>
      
      {/* Teks branding yang muncul lepas logo (mengelakkan feel "loading") */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.8 }}
        className="flex flex-col items-center gap-2 z-10"
      >
        <h1 className="text-base md:text-lg font-black uppercase tracking-[0.4em] text-black/80 dark:text-white/90 drop-shadow-md text-center pl-1">
          JPP Digital Portal
        </h1>
        
        <div className="flex flex-col items-center gap-1.5 mt-1">
          <div className="flex items-center gap-2 text-[10px] md:text-xs font-black uppercase tracking-[0.25em] text-black/50 dark:text-white/50">
            <span>A Digital Experience By</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-orange-500 dark:from-purple-400 dark:to-orange-400 drop-shadow-sm font-black">
              JPP Haziq
            </span>
          </div>
          <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-black/30 dark:text-white/30 text-center max-w-[350px] leading-relaxed">
            & Exco Kelab, Persatuan Dan Perpaduan
          </p>
        </div>
      </motion.div>

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
  const location = useLocation();
  const navigate = useNavigate();
  const [minDelayPassed, setMinDelayPassed] = useState(false);
  // Hard timeout — kalau loading masih true selepas 8 saat, paksa ke /login
  const hardTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Semak jika user dah tengok splash screen dalam sesi/PWA boot kali ni
    const hasSeenSplash = sessionStorage.getItem('hz_splash_seen');
    
    if (hasSeenSplash) {
      // Jika dah tengok (contoh: tengah navigate dari PolyMart), skip delay terus!
      setMinDelayPassed(true);
    } else {
      // Jika ini cold boot PWA / tab baru, tunjuk splash screen 3 saat
      const timer = setTimeout(() => {
        setMinDelayPassed(true);
        sessionStorage.setItem('hz_splash_seen', 'true');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Hard timeout: jika loading stuck selama 8s, paksa redirect ke /login
  useEffect(() => {
    if (isLoading) {
      hardTimeoutRef.current = setTimeout(() => {
        console.warn('[ProtectedRoute] Hard timeout — loading stuck, redirecting to /login');
        navigate('/login', { replace: true });
      }, 8000);
    } else {
      if (hardTimeoutRef.current) {
        clearTimeout(hardTimeoutRef.current);
        hardTimeoutRef.current = null;
      }
    }
    return () => {
      if (hardTimeoutRef.current) clearTimeout(hardTimeoutRef.current);
    };
  }, [isLoading, navigate]);

  if (isLoading || !minDelayPassed) return <LoadingScreen />;
  if (!isAuthenticated) {
    // Simpan URL asal supaya user boleh diredirect semula selepas log masuk.
    // Ini adalah kunci untuk QR link fallback — tanpa ini, user akan selalu
    // dihantar ke /portal walaupun mereka scan QR ke halaman tertentu.
    const destination = location.pathname + location.search;
    return <Navigate to={`/login?redirect=${encodeURIComponent(destination)}`} replace />;
  }
  return <Outlet />;
}

export function PublicRoute() {
  const { isAuthenticated, isLoading, profile } = useAuth();
  const navigate = useNavigate();
  const [minDelayPassed, setMinDelayPassed] = useState(false);

  useEffect(() => {
    // Semak jika user dah tengok splash screen dalam sesi/PWA boot kali ni
    const hasSeenSplash = sessionStorage.getItem('hz_splash_seen');
    
    if (hasSeenSplash) {
      // Jika dah tengok (contoh: klik PolyMart), skip delay terus!
      setMinDelayPassed(true);
    } else {
      // Jika ini cold boot PWA / tab baru, tunjuk splash screen 3 saat
      const timer = setTimeout(() => {
        setMinDelayPassed(true);
        sessionStorage.setItem('hz_splash_seen', 'true');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  // ── Logik redirect selepas log masuk ──────────────────────────────────────
  // PENTING: Diletakkan dalam useEffect dan bukannya dalam render body untuk
  // elak race condition. Supabase notify onAuthStateChange sebelum Promise
  // signInWithPassword resolve, jadi sessionStorage mungkin belum diset
  // semasa render pertama. useEffect dijamin berjalan SELEPAS React commit
  // semua state updates, memastikan sessionStorage sudah bersedia.
  useEffect(() => {
    if (isLoading || !isAuthenticated) return;

    const savedRedirect = sanitizeRedirect(sessionStorage.getItem('post_login_redirect'));
    const isNewRegister = localStorage.getItem('is_new_register') === 'true';

    if (savedRedirect) {
      // Jika user BARU register, jangan ikut redirect langsung — hantar ke /portal dulu.
      // Set flag supaya PortalPage boleh papar toast "Sila scan QR sekali lagi!"
      if (isNewRegister) {
        sessionStorage.removeItem('post_login_redirect');
        sessionStorage.setItem('qr_redirect_missed', '1');
        localStorage.removeItem('is_new_register');
        navigate('/portal', { replace: true });
        return;
      }
      // User sedia ada (bukan baru register) — terus redirect ke destinasi QR
      sessionStorage.removeItem('post_login_redirect');
      navigate(savedRedirect, { replace: true });
      return;
    }

    // Tiada redirect tersimpan — guna logik default berdasarkan role.
    // Tunggu profile dimuatkan sebelum buat keputusan role-based.
    if (profile === null) {
      // Profile gagal dimuatkan — beri 3s kelonggaran, kemudian fallback ke /portal
      // Tanpa ini, user akan stuck di HZ splash screen selamanya jika fetchProfile gagal
      const fallbackTimer = setTimeout(() => {
        console.warn('[PublicRoute] Profile null after timeout — fallback to /portal');
        navigate('/portal', { replace: true });
      }, 3000);
      return () => clearTimeout(fallbackTimer);
    }

    if (profile?.role === 'SUPER_ADMIN_JPP' || profile?.role === 'JPP') {
      navigate('/jpp', { replace: true });
    } else {
      localStorage.removeItem('is_new_register');
      navigate('/portal', { replace: true });
    }
  }, [isAuthenticated, isLoading, profile, navigate]);

  // Tunjuk loading semasa auth dalam transisi atau delay masih berjalan
  if (isLoading || !minDelayPassed) return <LoadingScreen />;

  // Kalau sudah authenticated, tunjuk loading sementara useEffect handle redirect
  if (isAuthenticated) return <LoadingScreen />;

  return <Outlet />;
}
