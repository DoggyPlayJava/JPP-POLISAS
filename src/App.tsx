import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { AuthProvider, useAuth } from '@/contexts/AuthContext'; // Import useAuth di sini
import { ProtectedRoute, PublicRoute } from '@/components/RouteGuards';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/pages/LoginPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { LandingPage } from '@/pages/LandingPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { KelabPage } from '@/pages/KelabPage';
import { AktivitiFull } from '@/pages/AktivitiFull';
import { AhliPage } from '@/pages/AhliPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { LaporanPage } from '@/pages/LaporanPage';
import { SemakanLaporanPage } from '@/pages/SemakanLaporanPage';
import { CarianPage } from '@/pages/CarianPage';
import { PendingPage } from '@/pages/PendingPage';
import { ClubDetailPage } from '@/pages/ClubDetailPage';
import { RejectedPage } from '@/pages/RejectedPage';
import { JppAdminPage } from '@/pages/JppAdminPage';
import { UrusKelabPage } from '@/pages/UrusKelabPage'; // Import di atas sekali
import { LeaderboardPage } from './pages/LeaderboardPage';
import { PenasihatLogPage } from './pages/PenasihatLogPage';
import { KarnivalVotingPage } from './pages/KarnivalVotingPage';
import { NexusPage } from './pages/NexusPage';
import { PortalPage } from './pages/PortalPage';
// ── e-Keusahawanan (prefix: /keusahawanan/) ──
import { KeusahawananLayout } from './pages/keusahawanan/KeusahawananLayout';
import { KeusahawananDashboard } from './pages/keusahawanan/KeusahawananDashboard';
import { KeusahawananProgram } from './pages/keusahawanan/KeusahawananProgram';
import { GeraiPage } from './pages/keusahawanan/GeraiPage';
import { KeusahawananIdea, KeusahawananGeran, KeusahawananLaporan } from './pages/keusahawanan/KeusahawananPlaceholders';
import { KeusahawananOnboarding } from './pages/keusahawanan/KeusahawananOnboarding';
import { UrusPerniagaanPage } from './pages/keusahawanan/UrusPerniagaanPage';
import { PosOrderPage }   from './pages/keusahawanan/pos/PosOrderPage';
import { PosProductPage } from './pages/keusahawanan/pos/PosProductPage';
import { PosStatsPage }   from './pages/keusahawanan/pos/PosStatsPage';
import { PosHistoryPage } from './pages/keusahawanan/pos/PosHistoryPage';

function RequireApproval({ children }: { children: React.ReactNode }) {
  const { profile, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="animate-pulse font-black text-xs uppercase tracking-[0.3em] opacity-20">Mengesahkan Akses...</div>
      </div>
    );
  }

  // A. Jika status REJECTED, hantar ke skrin Ditolak
  if (profile?.account_status === 'REJECTED') {
    return <RejectedPage />;
  }

  // B. Jika status PENDING (untuk pengguna yang mohon sebagai PIMPINAN),
  // kita halang ke skrin Pending supaya mereka tunggu kelulusan pentadbir.
  if (profile?.account_status === 'PENDING') {
    return <PendingPage />;
  }

  // C. Lepaskan log masuk jika sah
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* 🔓 PUBLIC ROUTES */}
      <Route element={<PublicRoute />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* 🔑 RESET PASSWORD ROUTE (Standalone to handle Supabase recovery event without kicks) */}
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* 🔐 PROTECTED ROUTES */}
      <Route element={<ProtectedRoute />}>
        <Route path="/onboarding" element={<OnboardingPage />} />

        {/* 🌐 PORTAL HUB — standalone tanpa sidebar */}
        <Route path="/portal" element={<RequireApproval><PortalPage /></RequireApproval>} />

        {/* ✅ WRAP HALAMAN EXCO DALAM APPLAYOUT (ada sidebar) */}
        <Route element={<RequireApproval><AppLayout /></RequireApproval>}>
          {/* ── e-KPP (route tanpa prefix — konvensyen sedia ada, JANGAN ubah) ── */}
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/kelab" element={<KelabPage />} />
          <Route path="/sertai-kelab" element={<KelabPage />} />
          <Route path="/aktiviti" element={<AktivitiFull />} />
          <Route path="/ahli" element={<AhliPage />} />
          <Route path="/tetapan" element={<SettingsPage />} />
          <Route path="/carian" element={<CarianPage />} />
          <Route path="/kelab/:id" element={<ClubDetailPage />} />
          <Route path="/laporan" element={<LaporanPage />} />
          <Route path="/urus-kelab" element={<UrusKelabPage />} />
          <Route path="/semakan-laporan" element={<SemakanLaporanPage />} />
          <Route path="/jpp-admin" element={<JppAdminPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/logs" element={<PenasihatLogPage />} />
          <Route path="/karnival" element={<KarnivalVotingPage />} />
          <Route path="/nexus" element={<NexusPage />} />
        </Route>
        {/* ── e-Keusahawanan Onboarding (No Sidebar) ── */}
        <Route path="/keusahawanan/onboarding" element={<RequireApproval><KeusahawananOnboarding /></RequireApproval>} />

        {/* ── e-Keusahawanan (prefix: /keusahawanan/) ── */}
        <Route element={<RequireApproval><KeusahawananLayout /></RequireApproval>}>
          <Route path="/keusahawanan/dashboard"     element={<KeusahawananDashboard />} />
          <Route path="/keusahawanan/program"        element={<KeusahawananProgram />} />
          <Route path="/keusahawanan/gerai"          element={<GeraiPage />} />
          <Route path="/keusahawanan/idea"           element={<KeusahawananIdea />} />
          <Route path="/keusahawanan/geran"          element={<KeusahawananGeran />} />
          <Route path="/keusahawanan/laporan"        element={<KeusahawananLaporan />} />
          <Route path="/keusahawanan/urus-perniagaan" element={<UrusPerniagaanPage />} />
          {/* POS System */}
          <Route path="/keusahawanan/pos"           element={<PosOrderPage />} />
          <Route path="/keusahawanan/pos/products"  element={<PosProductPage />} />
          <Route path="/keusahawanan/pos/stats"     element={<PosStatsPage />} />
          <Route path="/keusahawanan/pos/history"   element={<PosHistoryPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

import { ThemeProvider } from '@/contexts/ThemeContext';
import { AiSettingsProvider } from '@/contexts/AiSettingsContext';
import { KarnivalProvider } from '@/contexts/KarnivalContext';

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <AiSettingsProvider>
              <KarnivalProvider>
                <AppRoutes />
                <Toaster
                  position="top-right"
                  toastOptions={{
                    className: 'glass !bg-white/90 dark:!bg-slate-900/90 !backdrop-blur-xl !border-white/20 !shadow-2xl rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest !text-slate-900 dark:!text-white py-4 px-6',
                    duration: 4000,
                    success: {
                      iconTheme: { primary: '#10b981', secondary: '#fff' },
                    },
                    error: {
                      iconTheme: { primary: '#ef4444', secondary: '#fff' },
                    },
                  }}
                />
                <SpeedInsights />
              </KarnivalProvider>
            </AiSettingsProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;