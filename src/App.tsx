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
import { UrusKelabPage } from '@/pages/UrusKelabPage'; // Import di atas sekali
import { LeaderboardPage } from './pages/LeaderboardPage';
import { PenasihatLogPage } from './pages/PenasihatLogPage';
import { KarnivalVotingPage } from './pages/KarnivalVotingPage';
import { NexusPage } from './pages/NexusPage';
import { PortalPage } from './pages/PortalPage';
// ── JPP HQ Portal (prefix: /jpp/) ──
import { JppLayout }          from './pages/jpp/JppLayout';
import { JppHomePage }        from './pages/jpp/JppHomePage';
import { JppMembersPage }     from './pages/jpp/JppMembersPage';
import { JppOverviewPage }    from './pages/jpp/JppOverviewPage';
import { JppUnitDashboard }   from './pages/jpp/JppUnitDashboard';
import AnnouncementsPage      from './pages/jpp/AnnouncementsPage';
// ── Exco Reporting System (universal template) ──
import { ExcoAktivitiWrapper, ExcoLaporanWrapper } from './pages/jpp/ExcoWrappers';
import { ExcoSemakanLaporanPage } from './components/exco/ExcoSemakanLaporanPage';
// ── e-Keusahawanan (prefix: /keusahawanan/) ──
import { KeusahawananLayout } from './pages/keusahawanan/KeusahawananLayout';
import { KeusahawananDashboard } from './pages/keusahawanan/KeusahawananDashboard';
import { KeusahawananProgram } from './pages/keusahawanan/KeusahawananProgram';
import { KeusahawananIdea, KeusahawananGeran, KeusahawananLaporan } from './pages/keusahawanan/KeusahawananPlaceholders';
import { KeusahawananOnboarding } from './pages/keusahawanan/KeusahawananOnboarding';
import { UrusPerniagaanPage } from './pages/keusahawanan/UrusPerniagaanPage';
import { PosOrderPage }   from './pages/keusahawanan/pos/PosOrderPage';
import { PosProductPage } from './pages/keusahawanan/pos/PosProductPage';
import { PosStatsPage }   from './pages/keusahawanan/pos/PosStatsPage';
import { PosHistoryPage } from './pages/keusahawanan/pos/PosHistoryPage';
// ── e-Akademik (prefix: /akademik/) ──
import { AkademikLayout }      from './pages/akademik/AkademikLayout';
import { AkademikDashboard }   from './pages/akademik/AkademikDashboard';
import { AkademikPencapaian }  from './pages/akademik/AkademikPencapaian';
import { AkademikMeritPage }   from './pages/akademik/AkademikMeritPage';
import { AkademikQrPage }      from './pages/akademik/AkademikQrPage';
import { AkademikQrScan }      from './pages/akademik/AkademikQrScan';
import { AkademikCgpa }        from './pages/akademik/AkademikCgpa';
import { AkademikFolderPage }  from './pages/akademik/AkademikFolderPage';
import { AkademikLeaderboard } from './pages/akademik/AkademikLeaderboard';

import { JppUsersPage } from './pages/jpp/JppUsersPage';
import { JppTakwimPage } from './pages/jpp/JppTakwimPage';
import { JppLogsPage } from './pages/jpp/JppLogsPage';
import { JppSettingsPage } from './pages/jpp/JppSettingsPage';
import { JppNexusPage } from './pages/jpp/JppNexusPage';
import { JppAsramaPage } from './pages/jpp/JppAsramaPage';

import { CompleteProfileModal } from '@/components/ui/CompleteProfileModal';
import { GlobalAnnouncementModal } from '@/components/GlobalAnnouncementModal';

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

  // C. Lepaskan log masuk jika sah, tetapi wajibkan maklumat profil jika kosong
  return (
    <>
      <CompleteProfileModal />
      <GlobalAnnouncementModal />
      {children}
    </>
  );
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
        
        {/* ⚙️ TETAPAN GLOBAL — standalone tanpa sidebar */}
        <Route path="/tetapan" element={<RequireApproval><SettingsPage /></RequireApproval>} />

        {/* ✅ WRAP HALAMAN EXCO DALAM APPLAYOUT (ada sidebar) */}
        <Route element={<RequireApproval><AppLayout /></RequireApproval>}>
          {/* ── e-KPP (route tanpa prefix — konvensyen sedia ada, JANGAN ubah) ── */}
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/kelab" element={<KelabPage />} />
          <Route path="/sertai-kelab" element={<KelabPage />} />
          <Route path="/aktiviti" element={<AktivitiFull />} />
          <Route path="/ahli" element={<AhliPage />} />
          <Route path="/carian" element={<CarianPage />} />
          <Route path="/kelab/:id" element={<ClubDetailPage />} />
          <Route path="/laporan" element={<LaporanPage />} />
          <Route path="/urus-kelab" element={<UrusKelabPage />} />
          <Route path="/semakan-laporan" element={<SemakanLaporanPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/logs" element={<PenasihatLogPage />} />
          <Route path="/karnival" element={<KarnivalVotingPage />} />
          <Route path="/nexus" element={<NexusPage />} />
        </Route>
        {/* ── JPP HQ Portal (prefix: /jpp/) ── */}
        <Route element={<RequireApproval><JppLayout /></RequireApproval>}>
          <Route path="/jpp"                  element={<JppHomePage />} />
          <Route path="/jpp/members"          element={<JppMembersPage />} />
          <Route path="/jpp/overview"         element={<JppOverviewPage />} />
          <Route path="/jpp/unit/:unitCode"   element={<JppUnitDashboard />} />
          <Route path="/jpp/announcements"    element={<AnnouncementsPage />} />
          <Route path="/jpp/users"            element={<JppUsersPage />} />
          <Route path="/jpp/takwim"           element={<JppTakwimPage />} />
          <Route path="/jpp/logs"             element={<JppLogsPage />} />
          <Route path="/jpp/settings"         element={<JppSettingsPage />} />
          <Route path="/jpp/nexus"            element={<JppNexusPage />} />
          {/* ── Exco Universal Template Routes ── */}
          <Route path="/exco/:unitCode/aktiviti"          element={<ExcoAktivitiWrapper />} />
          <Route path="/exco/:unitCode/laporan"           element={<ExcoLaporanWrapper />} />
          <Route path="/jpp/semak-laporan-exco/:unitCode" element={<ExcoSemakanLaporanPage />} />
          {/* ── e-Asrama Rujukan ── */}
          <Route path="/jpp/asrama"                      element={<JppAsramaPage />} />
        </Route>

        {/* ── e-Keusahawanan Onboarding (No Sidebar) ── */}
        <Route path="/keusahawanan/onboarding" element={<RequireApproval><KeusahawananOnboarding /></RequireApproval>} />

        {/* ── e-Keusahawanan (prefix: /keusahawanan/) ── */}
        <Route element={<RequireApproval><KeusahawananLayout /></RequireApproval>}>
          <Route path="/keusahawanan/dashboard"     element={<KeusahawananDashboard />} />
          <Route path="/keusahawanan/program"        element={<KeusahawananProgram />} />
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

        {/* ── e-Akademik (prefix: /akademik/) ── */}
        {/* Standalone claim page — papar tanpa layout sidebar, dicapai bila scan QR kod fizikal */}
        <Route path="/akademik/qr/:token" element={<RequireApproval><AkademikQrScan /></RequireApproval>} />
        <Route element={<RequireApproval><AkademikLayout /></RequireApproval>}>
          <Route path="/akademik"              element={<AkademikDashboard />} />
          <Route path="/akademik/pencapaian"   element={<AkademikPencapaian />} />
          <Route path="/akademik/merit"        element={<AkademikMeritPage />} />
          <Route path="/akademik/qr"           element={<AkademikQrPage />} />
          <Route path="/akademik/cgpa"         element={<AkademikCgpa />} />
          <Route path="/akademik/folder"       element={<AkademikFolderPage />} />
          <Route path="/akademik/leaderboard"  element={<AkademikLeaderboard />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

import { ThemeProvider } from '@/contexts/ThemeContext';
import { AiSettingsProvider } from '@/contexts/AiSettingsContext';
import { KarnivalProvider } from '@/contexts/KarnivalContext';
import { PwaUpdater } from '@/components/PwaUpdater';

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <AiSettingsProvider>
              <KarnivalProvider>
                <AppRoutes />
                <PwaUpdater />
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