import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute, PublicRoute } from '@/components/RouteGuards';
import { AppLayout } from '@/components/layout/AppLayout';

// Ceraikan (Lazy Load) semua halaman untuk mengurangkan saiz awal
const LoginPage = lazy(() => import('@/pages/LoginPage').then(m => ({ default: m.LoginPage })));
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const OnboardingPage = lazy(() => import('@/pages/OnboardingPage').then(m => ({ default: m.OnboardingPage })));
const LandingPage = lazy(() => import('@/pages/LandingPage').then(m => ({ default: m.LandingPage })));
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const KelabPage = lazy(() => import('@/pages/KelabPage').then(m => ({ default: m.KelabPage })));
const AktivitiFull = lazy(() => import('@/pages/AktivitiFull').then(m => ({ default: m.AktivitiFull })));
const AhliPage = lazy(() => import('@/pages/AhliPage').then(m => ({ default: m.AhliPage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const LaporanPage = lazy(() => import('@/pages/LaporanPage').then(m => ({ default: m.LaporanPage })));
const SemakanLaporanPage = lazy(() => import('@/pages/SemakanLaporanPage').then(m => ({ default: m.SemakanLaporanPage })));
const CarianPage = lazy(() => import('@/pages/CarianPage').then(m => ({ default: m.CarianPage })));
const PendingPage = lazy(() => import('@/pages/PendingPage').then(m => ({ default: m.PendingPage })));
const ClubDetailPage = lazy(() => import('@/pages/ClubDetailPage').then(m => ({ default: m.ClubDetailPage })));
const RejectedPage = lazy(() => import('@/pages/RejectedPage').then(m => ({ default: m.RejectedPage })));
const UrusKelabPage = lazy(() => import('@/pages/UrusKelabPage').then(m => ({ default: m.UrusKelabPage })));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage').then(m => ({ default: m.LeaderboardPage })));
const PenasihatLogPage = lazy(() => import('./pages/PenasihatLogPage').then(m => ({ default: m.PenasihatLogPage })));
// [Karnival v2 — sistem undian baharu]
const KarnivalLandingPage   = lazy(() => import('./pages/karnival/KarnivalLandingPage').then(m => ({ default: m.KarnivalLandingPage })));
const KarnivalVotePage      = lazy(() => import('./pages/karnival/KarnivalVotePage').then(m => ({ default: m.KarnivalVotePage })));
const KarnivalScoreboard    = lazy(() => import('./pages/karnival/KarnivalScoreboard').then(m => ({ default: m.KarnivalScoreboard })));
const KarnivalAdminDashboard  = lazy(() => import('./pages/karnival/admin/KarnivalAdminDashboard').then(m => ({ default: m.KarnivalAdminDashboard })));
const KarnivalAdminEdition    = lazy(() => import('./pages/karnival/admin/KarnivalAdminEdition').then(m => ({ default: m.KarnivalAdminEdition })));
const KarnivalAdminCategories = lazy(() => import('./pages/karnival/admin/KarnivalAdminCategories').then(m => ({ default: m.KarnivalAdminCategories })));
const KarnivalAdminBooths     = lazy(() => import('./pages/karnival/admin/KarnivalAdminBooths').then(m => ({ default: m.KarnivalAdminBooths })));
const KarnivalAdminResults    = lazy(() => import('./pages/karnival/admin/KarnivalAdminResults').then(m => ({ default: m.KarnivalAdminResults })));
const NexusPage = lazy(() => import('./pages/NexusPage').then(m => ({ default: m.NexusPage })));
const PortalPage = lazy(() => import('./pages/PortalPage').then(m => ({ default: m.PortalPage })));
const NotifikasiPage = lazy(() => import('./pages/NotifikasiPage').then(m => ({ default: m.NotifikasiPage })));
// ── JPP HQ Portal ──
import { JppLayout } from './pages/jpp/JppLayout';
const JppHomePage = lazy(() => import('./pages/jpp/JppHomePage').then(m => ({ default: m.JppHomePage })));
const JppMembersPage = lazy(() => import('./pages/jpp/JppMembersPage').then(m => ({ default: m.JppMembersPage })));
const JppOverviewPage = lazy(() => import('./pages/jpp/JppOverviewPage').then(m => ({ default: m.JppOverviewPage })));
const JppUnitDashboard = lazy(() => import('./pages/jpp/JppUnitDashboard').then(m => ({ default: m.JppUnitDashboard })));
const AnnouncementsPage = lazy(() => import('./pages/jpp/AnnouncementsPage').then(m => ({ default: m.default || m.AnnouncementsPage })));

// ── Exco Reporting System ──
const ExcoAktivitiWrapper = lazy(() => import('./pages/jpp/ExcoWrappers').then(m => ({ default: m.ExcoAktivitiWrapper })));
const ExcoLaporanWrapper = lazy(() => import('./pages/jpp/ExcoWrappers').then(m => ({ default: m.ExcoLaporanWrapper })));
const ExcoSemakanLaporanPage = lazy(() => import('./components/exco/ExcoSemakanLaporanPage').then(m => ({ default: m.ExcoSemakanLaporanPage })));

// ── e-Keusahawanan ──
import { KeusahawananLayout } from './pages/keusahawanan/KeusahawananLayout';
const KeusahawananDashboard = lazy(() => import('./pages/keusahawanan/KeusahawananDashboard').then(m => ({ default: m.KeusahawananDashboard })));
const KeusahawananProgram = lazy(() => import('./pages/keusahawanan/KeusahawananProgram').then(m => ({ default: m.KeusahawananProgram })));
const KeusahawananIdea = lazy(() => import('./pages/keusahawanan/KeusahawananPlaceholders').then(m => ({ default: m.KeusahawananIdea })));
const KeusahawananGeran = lazy(() => import('./pages/keusahawanan/KeusahawananPlaceholders').then(m => ({ default: m.KeusahawananGeran })));
const KeusahawananLaporan = lazy(() => import('./pages/keusahawanan/KeusahawananPlaceholders').then(m => ({ default: m.KeusahawananLaporan })));
const KeusahawananOnboarding = lazy(() => import('./pages/keusahawanan/KeusahawananOnboarding').then(m => ({ default: m.KeusahawananOnboarding })));
const UrusPerniagaanPage = lazy(() => import('./pages/keusahawanan/UrusPerniagaanPage').then(m => ({ default: m.UrusPerniagaanPage })));
const PosOrderPage = lazy(() => import('./pages/keusahawanan/pos/PosOrderPage').then(m => ({ default: m.PosOrderPage })));
const PosProductPage = lazy(() => import('./pages/keusahawanan/pos/PosProductPage').then(m => ({ default: m.PosProductPage })));
const PosStatsPage = lazy(() => import('./pages/keusahawanan/pos/PosStatsPage').then(m => ({ default: m.PosStatsPage })));
const PosHistoryPage = lazy(() => import('./pages/keusahawanan/pos/PosHistoryPage').then(m => ({ default: m.PosHistoryPage })));

// ── PolyMart Marketplace ──
import { PolyMartLayout } from './pages/polymart/PolyMartLayout';
const PolyMartHome = lazy(() => import('./pages/polymart/PolyMartHome').then(m => ({ default: m.PolyMartHome })));
const PolyMartProductDetail = lazy(() => import('./pages/polymart/PolyMartProductDetail').then(m => ({ default: m.PolyMartProductDetail })));
const PolyMartMyOrders = lazy(() => import('./pages/polymart/PolyMartMyOrders').then(m => ({ default: m.PolyMartMyOrders })));
const PolyMartVendorDashboard = lazy(() => import('./pages/polymart/PolyMartVendorDashboard').then(m => ({ default: m.PolyMartVendorDashboard })));
const PolyMartAdminPanel = lazy(() => import('./pages/polymart/PolyMartAdminPanel').then(m => ({ default: m.PolyMartAdminPanel })));

// ── e-Akademik ──
import { AkademikLayout } from './pages/akademik/AkademikLayout';
const AkademikDashboard = lazy(() => import('./pages/akademik/AkademikDashboard').then(m => ({ default: m.AkademikDashboard })));
const AkademikPencapaian = lazy(() => import('./pages/akademik/AkademikPencapaian').then(m => ({ default: m.AkademikPencapaian })));
const AkademikMeritPage = lazy(() => import('./pages/akademik/AkademikMeritPage').then(m => ({ default: m.AkademikMeritPage })));
const AkademikQrPage = lazy(() => import('./pages/akademik/AkademikQrPage').then(m => ({ default: m.AkademikQrPage })));
const AkademikQrScan = lazy(() => import('./pages/akademik/AkademikQrScan').then(m => ({ default: m.AkademikQrScan })));
const AkademikCgpa = lazy(() => import('./pages/akademik/AkademikCgpa').then(m => ({ default: m.AkademikCgpa })));
const AkademikFolderPage = lazy(() => import('./pages/akademik/AkademikFolderPage').then(m => ({ default: m.AkademikFolderPage })));
const AkademikLeaderboard = lazy(() => import('./pages/akademik/AkademikLeaderboard').then(m => ({ default: m.AkademikLeaderboard })));

// ── SUPSAS ──
import { SupsasProvider } from './contexts/SupsasContext';
import { SupsasLayout } from './pages/supsas/SupsasLayout';
import { SupsasAdminLayout } from './pages/supsas/admin/SupsasAdminLayout';
import { KetuaLayout } from './pages/supsas/ketua/KetuaLayout';
const SupsasLandingPage = lazy(() => import('./pages/supsas/SupsasLandingPage').then(m => ({ default: m.SupsasLandingPage })));
const SupsasScoreboardPage = lazy(() => import('./pages/supsas/SupsasScoreboardPage').then(m => ({ default: m.SupsasScoreboardPage })));
const SupsasSportsPage = lazy(() => import('./pages/supsas/SupsasSportsPage').then(m => ({ default: m.SupsasSportsPage })));
const SupsasSchedulePage = lazy(() => import('./pages/supsas/SupsasSchedulePage').then(m => ({ default: m.SupsasSchedulePage })));
const SupsasAdminHome = lazy(() => import('./pages/supsas/admin/SupsasAdminHome').then(m => ({ default: m.SupsasAdminHome })));
const AdminSukanPage = lazy(() => import('./pages/supsas/admin/AdminSukanPage').then(m => ({ default: m.AdminSukanPage })));
const AdminKontigenPage = lazy(() => import('./pages/supsas/admin/AdminKontigenPage').then(m => ({ default: m.AdminKontigenPage })));
const AdminKeputusanPage = lazy(() => import('./pages/supsas/admin/AdminKeputusanPage').then(m => ({ default: m.AdminKeputusanPage })));
const AdminTetapanPage = lazy(() => import('./pages/supsas/admin/AdminTetapanPage').then(m => ({ default: m.AdminTetapanPage })));
const AdminJadualPage = lazy(() => import('./pages/supsas/admin/AdminJadualPage').then(m => ({ default: m.AdminJadualPage })));
const KetuaDashboard = lazy(() => import('./pages/supsas/ketua/KetuaDashboard').then(m => ({ default: m.KetuaDashboard })));
const BracketPage = lazy(() => import('./pages/supsas/BracketPage').then(m => ({ default: m.BracketPage })));
const SupsasHistoryPage = lazy(() => import('./pages/supsas/SupsasHistoryPage').then(m => ({ default: m.SupsasHistoryPage })));

// ── Karnival JPP v2 (Layouts — import terus seperti SUPSAS) ──
import { KarnivalProvider } from './contexts/KarnivalContext';
import { KarnivalLayout } from './pages/karnival/KarnivalLayout';
import { KarnivalAdminLayout } from './pages/karnival/admin/KarnivalAdminLayout';

// ── E-Kebajikan ──
import { KebajikanLayout } from './pages/kebajikan/KebajikanLayout';
const KebajikanStatsPage = lazy(() => import('./pages/kebajikan/KebajikanPublicStats').then(m => ({ default: m.KebajikanStatsPage })));
const KebajikanSubmitPage = lazy(() => import('./pages/kebajikan/KebajikanSubmitPage').then(m => ({ default: m.KebajikanSubmitPage })));
const KebajikanMyTickets = lazy(() => import('./pages/kebajikan/KebajikanMyTickets').then(m => ({ default: m.KebajikanMyTickets })));
const KebajikanDashboard = lazy(() => import('./pages/kebajikan/KebajikanDashboard').then(m => ({ default: m.KebajikanDashboard })));
const KebajikanTicketsPage = lazy(() => import('./pages/kebajikan/KebajikanTicketsPage').then(m => ({ default: m.KebajikanTicketsPage })));
const KebajikanTicketDetail = lazy(() => import('./pages/kebajikan/KebajikanTicketDetail').then(m => ({ default: m.KebajikanTicketDetail })));
const KebajikanStudentChat = lazy(() => import('./pages/kebajikan/KebajikanStudentChat').then(m => ({ default: m.KebajikanStudentChat })));
const KebajikanReportPage = lazy(() => import('./pages/kebajikan/KebajikanReportPage').then(m => ({ default: m.KebajikanReportPage })));
const KebajikanStaffPage = lazy(() => import('./pages/kebajikan/KebajikanStaffPage').then(m => ({ default: m.KebajikanStaffPage })));
const KebajikanSettingsPage = lazy(() => import('./pages/kebajikan/KebajikanSettingsPage').then(m => ({ default: m.KebajikanSettingsPage })));

const JppUsersPage = lazy(() => import('./pages/jpp/JppUsersPage').then(m => ({ default: m.JppUsersPage })));
const JppTakwimPage = lazy(() => import('./pages/jpp/JppTakwimPage').then(m => ({ default: m.JppTakwimPage })));
const JppLogsPage = lazy(() => import('./pages/jpp/JppLogsPage').then(m => ({ default: m.JppLogsPage })));
const JppSettingsPage = lazy(() => import('./pages/jpp/JppSettingsPage').then(m => ({ default: m.JppSettingsPage })));
const JppNexusPage = lazy(() => import('./pages/jpp/JppNexusPage').then(m => ({ default: m.JppNexusPage })));
const JppAsramaPage = lazy(() => import('./pages/jpp/JppAsramaPage').then(m => ({ default: m.JppAsramaPage })));

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

// Global Fallback Loader semasa lazy loading
function InitialPageLoader() {
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-white">
      <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 animate-pulse">Memuat turun data...</p>
    </div>
  );
}

function AppRoutes() {
  return (
    <Suspense fallback={<InitialPageLoader />}>
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

        {/* 🔔 NOTIFIKASI — standalone tanpa sidebar */}
        <Route path="/notifikasi" element={<RequireApproval><NotifikasiPage /></RequireApproval>} />

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

      {/* ── Karnival JPP v2 — PUBLIC (scoreboard/landing tanpa login, undi wajib login) ── */}
      <Route element={<KarnivalLayout />}>
        <Route path="/karnival"            element={<KarnivalLandingPage />} />
        <Route path="/karnival/undi"       element={<KarnivalVotePage />} />
        <Route path="/karnival/scoreboard" element={<KarnivalScoreboard />} />

        {/* Admin Panel — role guard inside KarnivalAdminLayout */}
        <Route element={<KarnivalAdminLayout />}>
          <Route path="/karnival/admin"             element={<KarnivalAdminDashboard />} />
          <Route path="/karnival/admin/edition"     element={<KarnivalAdminEdition />} />
          <Route path="/karnival/admin/categories"  element={<KarnivalAdminCategories />} />
          <Route path="/karnival/admin/booths"      element={<KarnivalAdminBooths />} />
          <Route path="/karnival/admin/results"     element={<KarnivalAdminResults />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
}

import { ThemeProvider } from '@/contexts/ThemeContext';
import { AiSettingsProvider } from '@/contexts/AiSettingsContext';
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