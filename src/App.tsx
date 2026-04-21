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
// ── PolyMart Marketplace (prefix: /polymart/) ──
import { PolyMartLayout }          from './pages/polymart/PolyMartLayout';
import { PolyMartHome }            from './pages/polymart/PolyMartHome';
import { PolyMartProductDetail }   from './pages/polymart/PolyMartProductDetail';
import { PolyMartMyOrders }        from './pages/polymart/PolyMartMyOrders';
import { PolyMartVendorDashboard } from './pages/polymart/PolyMartVendorDashboard';
import { PolyMartAdminPanel }      from './pages/polymart/PolyMartAdminPanel';
// ── e-Akademik (prefix: /akademik/) ──
import { AkademikLayout }      from './pages/akademik/AkademikLayout';
import { AkademikDashboard }   from './pages/akademik/AkademikDashboard';
// ── SUPSAS — Sukan Polisas (prefix: /supsas/) ──
import { SupsasProvider }          from './contexts/SupsasContext';
import { SupsasLayout }            from './pages/supsas/SupsasLayout';
import { SupsasLandingPage }       from './pages/supsas/SupsasLandingPage';
import { SupsasScoreboardPage }    from './pages/supsas/SupsasScoreboardPage';
import { SupsasSportsPage }        from './pages/supsas/SupsasSportsPage';
import { SupsasSchedulePage }      from './pages/supsas/SupsasSchedulePage';
import { SupsasAdminLayout }       from './pages/supsas/admin/SupsasAdminLayout';
import { SupsasAdminHome }         from './pages/supsas/admin/SupsasAdminHome';
import { AdminSukanPage }          from './pages/supsas/admin/AdminSukanPage';
import { AdminKontigenPage }       from './pages/supsas/admin/AdminKontigenPage';
import { AdminKeputusanPage }      from './pages/supsas/admin/AdminKeputusanPage';
import { AdminTetapanPage }        from './pages/supsas/admin/AdminTetapanPage';
import { AdminJadualPage }         from './pages/supsas/admin/AdminJadualPage';
import { KetuaLayout }             from './pages/supsas/ketua/KetuaLayout';
import { KetuaDashboard }          from './pages/supsas/ketua/KetuaDashboard';
import { BracketPage }             from './pages/supsas/BracketPage';
import { SupsasHistoryPage }       from './pages/supsas/SupsasHistoryPage';
import { AkademikPencapaian }  from './pages/akademik/AkademikPencapaian';
import { AkademikMeritPage }   from './pages/akademik/AkademikMeritPage';
// ── E-Kebajikan Ticketing System ──
import { KebajikanLayout }      from './pages/kebajikan/KebajikanLayout';
import { KebajikanStatsPage }   from './pages/kebajikan/KebajikanPublicStats';
import { KebajikanSubmitPage }  from './pages/kebajikan/KebajikanSubmitPage';
import { KebajikanMyTickets }   from './pages/kebajikan/KebajikanMyTickets';
import { KebajikanDashboard }   from './pages/kebajikan/KebajikanDashboard';
import { KebajikanTicketsPage } from './pages/kebajikan/KebajikanTicketsPage';
import { KebajikanTicketDetail }from './pages/kebajikan/KebajikanTicketDetail';
import { KebajikanStudentChat } from './pages/kebajikan/KebajikanStudentChat';
import { KebajikanReportPage }   from './pages/kebajikan/KebajikanReportPage';
import { KebajikanStaffPage }    from './pages/kebajikan/KebajikanStaffPage';
import { KebajikanSettingsPage } from './pages/kebajikan/KebajikanSettingsPage';
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

      {/* 🌍 TRULY PUBLIC — no auth required */}
      <Route path="/kebajikan/statistik" element={<KebajikanStatsPage />} />

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

      </Route>

      {/* ── PolyMart Marketplace — PUBLIC (browse tanpa log masuk) ── */}
      <Route element={<PolyMartLayout />}>
        <Route path="/polymart"            element={<PolyMartHome />} />
        <Route path="/polymart/produk/:id" element={<PolyMartProductDetail />} />
      </Route>

      {/* ── PolyMart Marketplace — PROTECTED (perlu log masuk & approval) ── */}
      <Route element={<ProtectedRoute />}>
        <Route element={<RequireApproval><PolyMartLayout /></RequireApproval>}>
          <Route path="/polymart/pesanan-saya"  element={<PolyMartMyOrders />} />
          <Route path="/polymart/vendor"        element={<PolyMartVendorDashboard />} />
          <Route path="/polymart/admin"         element={<PolyMartAdminPanel />} />
        </Route>
      </Route>

      {/* ── e-Akademik (prefix: /akademik/) ── */}
      <Route element={<ProtectedRoute />}>
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

      {/* ── E-Kebajikan — Layout Bersama Sidebar ── */}
      <Route element={<ProtectedRoute />}>
        <Route element={<KebajikanLayout />}>
          {/* Public routes (Pelajar / Semua) */}
          <Route path="/kebajikan/buat-aduan" element={<KebajikanSubmitPage />} />
          <Route path="/kebajikan/aduan-saya" element={<KebajikanMyTickets />} />
          <Route path="/kebajikan/aduan/:id"  element={<KebajikanStudentChat />} />
          <Route path="/kebajikan/statistik"  element={<KebajikanStatsPage />} />

          {/* Exco + Staff dashboard */}
          <Route path="/kebajikan"             element={<KebajikanDashboard />} />
          <Route path="/kebajikan/tiket"       element={<KebajikanTicketsPage />} />
          <Route path="/kebajikan/tiket/:id"   element={<KebajikanTicketDetail />} />
          <Route path="/kebajikan/laporan"     element={<KebajikanReportPage />} />
          <Route path="/kebajikan/staff"       element={<KebajikanStaffPage />} />
          <Route path="/kebajikan/tetapan"     element={<KebajikanSettingsPage />} />
        </Route>
      </Route>

      {/* ── SUPSAS — Sukan Polisas (PUBLIC — no login needed for scoreboard) ── */}
      <Route element={<SupsasProvider><SupsasLayout /></SupsasProvider>}>
        <Route path="/supsas"             element={<SupsasLandingPage />} />
        <Route path="/supsas/scoreboard"  element={<SupsasScoreboardPage />} />
        <Route path="/supsas/jadual"      element={<SupsasSchedulePage />} />
        <Route path="/supsas/sukan"       element={<SupsasSportsPage />} />
        <Route path="/supsas/bracket/:sportId" element={<BracketPage />} />
        <Route path="/supsas/sejarah"     element={<SupsasHistoryPage />} />

        {/* Admin Panel — role guard inside SupsasAdminLayout */}
        <Route element={<SupsasAdminLayout />}>
          <Route path="/supsas/admin"            element={<SupsasAdminHome />} />
          <Route path="/supsas/admin/sukan"      element={<AdminSukanPage />} />
          <Route path="/supsas/admin/kontinjen"  element={<AdminKontigenPage />} />
          <Route path="/supsas/admin/keputusan"  element={<AdminKeputusanPage />} />
          <Route path="/supsas/admin/jadual"     element={<AdminJadualPage />} />
          <Route path="/supsas/admin/tetapan"    element={<AdminTetapanPage />} />
        </Route>

        {/* Ketua Kontingen Portal — auth guard inside KetuaLayout */}
        <Route element={<KetuaLayout />}>
          <Route path="/supsas/ketua" element={<KetuaDashboard />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

import { ThemeProvider } from '@/contexts/ThemeContext';
import { AiSettingsProvider } from '@/contexts/AiSettingsContext';
import { KarnivalProvider } from '@/contexts/KarnivalContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { JppConfigProvider } from '@/contexts/JppConfigContext';
import { PwaUpdater } from '@/components/PwaUpdater';
import { InstallAppPrompt } from '@/components/pwa/InstallAppPrompt';

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <NotificationProvider>
              <AiSettingsProvider>
                <JppConfigProvider>
                  <KarnivalProvider>
                    <AppRoutes />
                  <PwaUpdater />
                  <InstallAppPrompt />
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
                </JppConfigProvider>
              </AiSettingsProvider>
            </NotificationProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;