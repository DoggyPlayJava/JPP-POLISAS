import React, { Suspense, lazy, useEffect, useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Toaster, ToastBar, resolveValue } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Check, X, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute, PublicRoute } from '@/components/RouteGuards';

// Layout components — lazy-loaded since they're only needed per section
const AppLayout = lazy(() => import('@/components/layout/AppLayout').then(m => ({ default: m.AppLayout })));

// Ceraikan (Lazy Load) semua halaman untuk mengurangkan saiz awal
const LoginPage = lazy(() => import('@/pages/LoginPage').then(m => ({ default: m.LoginPage })));
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const OnboardingPage = lazy(() => import('@/pages/OnboardingPage').then(m => ({ default: m.OnboardingPage })));
const LandingPage = lazy(() => import('@/pages/LandingPage').then(m => ({ default: m.LandingPage })));
const PromoPage = lazy(() => import('@/pages/PromoPage').then(m => ({ default: m.PromoPage })));
const LaunchVideo = lazy(() => import('@/pages/LaunchVideo').then(m => ({ default: m.LaunchVideo })));
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
const PolyMapsPage = lazy(() => import('./pages/polymaps/PolyMapsPage').then(m => ({ default: m.PolyMapsPage })));
// ── JPP HQ Portal ──
const JppLayout = lazy(() => import('./pages/jpp/JppLayout').then(m => ({ default: m.JppLayout })));
const JppHomePage = lazy(() => import('./pages/jpp/JppHomePage').then(m => ({ default: m.JppHomePage })));
const JppMembersPage = lazy(() => import('./pages/jpp/JppMembersPage').then(m => ({ default: m.JppMembersPage })));
const JppOverviewPage = lazy(() => import('./pages/jpp/JppOverviewPage').then(m => ({ default: m.JppOverviewPage })));
const JppUnitDashboard = lazy(() => import('./pages/jpp/JppUnitDashboard').then(m => ({ default: m.JppUnitDashboard })));
const AnnouncementsPage = lazy(() => import('./pages/jpp/AnnouncementsPage').then(m => ({ default: m.default || m.AnnouncementsPage })));
const JppPolyMapsAdmin = lazy(() => import('./pages/jpp/JppPolyMapsAdmin').then(m => ({ default: m.JppPolyMapsAdmin })));

// ── Exco Reporting System ──
const ExcoAktivitiWrapper = lazy(() => import('./pages/jpp/ExcoWrappers').then(m => ({ default: m.ExcoAktivitiWrapper })));
const ExcoLaporanWrapper = lazy(() => import('./pages/jpp/ExcoWrappers').then(m => ({ default: m.ExcoLaporanWrapper })));
const ExcoSemakanLaporanPage = lazy(() => import('./components/exco/ExcoSemakanLaporanPage').then(m => ({ default: m.ExcoSemakanLaporanPage })));
const KeusahawananHubLanding = lazy(() => import('./pages/jpp/KeusahawananHubLanding').then(m => ({ default: m.KeusahawananHubLanding })));

// ── e-Keusahawanan ──
const KeusahawananLayout = lazy(() => import('./pages/keusahawanan/KeusahawananLayout').then(m => ({ default: m.KeusahawananLayout })));
const KeusahawananDashboard = lazy(() => import('./pages/keusahawanan/KeusahawananDashboard').then(m => ({ default: m.KeusahawananDashboard })));
const KeusahawananProgram = lazy(() => import('./pages/keusahawanan/KeusahawananProgram').then(m => ({ default: m.KeusahawananProgram })));
const KeusahawananIdea = lazy(() => import('./pages/keusahawanan/KeusahawananPlaceholders').then(m => ({ default: m.KeusahawananIdea })));
const KeusahawananGeran = lazy(() => import('./pages/keusahawanan/KeusahawananPlaceholders').then(m => ({ default: m.KeusahawananGeran })));
const KeusahawananLaporan = lazy(() => import('./pages/keusahawanan/KeusahawananPlaceholders').then(m => ({ default: m.KeusahawananLaporan })));
const KeusahawananOnboarding = lazy(() => import('./pages/keusahawanan/KeusahawananOnboarding').then(m => ({ default: m.KeusahawananOnboarding })));
const KeusahawananPoster = lazy(() => import('./pages/keusahawanan/KeusahawananPoster').then(m => ({ default: m.KeusahawananPoster })));
const UrusPerniagaanPage = lazy(() => import('./pages/keusahawanan/UrusPerniagaanPage').then(m => ({ default: m.UrusPerniagaanPage })));
const PosOrderPage = lazy(() => import('./pages/keusahawanan/pos/PosOrderPage').then(m => ({ default: m.PosOrderPage })));
const PosProductPage = lazy(() => import('./pages/keusahawanan/pos/PosProductPage').then(m => ({ default: m.PosProductPage })));
const PosStatsPage = lazy(() => import('./pages/keusahawanan/pos/PosStatsPage').then(m => ({ default: m.PosStatsPage })));
const PosHistoryPage = lazy(() => import('./pages/keusahawanan/pos/PosHistoryPage').then(m => ({ default: m.PosHistoryPage })));

// ── PolyMart Marketplace ──
const PolyMartLayout = lazy(() => import('./pages/polymart/PolyMartLayout').then(m => ({ default: m.PolyMartLayout })));
const PolyMartHome = lazy(() => import('./pages/polymart/PolyMartHome').then(m => ({ default: m.PolyMartHome })));
const PolyMartProductDetail = lazy(() => import('./pages/polymart/PolyMartProductDetail').then(m => ({ default: m.PolyMartProductDetail })));
const PolyMartMyOrders = lazy(() => import('./pages/polymart/PolyMartMyOrders').then(m => ({ default: m.PolyMartMyOrders })));
const PolyMartVendorDashboard = lazy(() => import('./pages/polymart/PolyMartVendorDashboard').then(m => ({ default: m.PolyMartVendorDashboard })));
const PolyMartAdminPanel = lazy(() => import('./pages/polymart/PolyMartAdminPanel').then(m => ({ default: m.PolyMartAdminPanel })));
const PolyMartCartPage = lazy(() => import('./pages/polymart/PolyMartCartPage').then(m => ({ default: m.PolyMartCartPage })));
const PolyMartVerifyPickup = lazy(() => import('./pages/polymart/PolyMartVerifyPickup').then(m => ({ default: m.PolyMartVerifyPickup })));
const PolyMartPaymentPage = lazy(() => import('./pages/polymart/PolyMartPaymentPage').then(m => ({ default: m.PolyMartPaymentPage })));
const PolyMartWishlist = lazy(() => import('./pages/polymart/PolyMartWishlist').then(m => ({ default: m.PolyMartWishlist })));
const PolyMartChat = lazy(() => import('./pages/polymart/PolyMartChat').then(m => ({ default: m.PolyMartChat })));

// ── e-Akademik ──
const AkademikLayout = lazy(() => import('./pages/akademik/AkademikLayout').then(m => ({ default: m.AkademikLayout })));
const AkademikDashboard = lazy(() => import('./pages/akademik/AkademikDashboard').then(m => ({ default: m.AkademikDashboard })));
const AkademikPencapaian = lazy(() => import('./pages/akademik/AkademikPencapaian').then(m => ({ default: m.AkademikPencapaian })));
const AkademikMeritPage = lazy(() => import('./pages/akademik/AkademikMeritPage').then(m => ({ default: m.AkademikMeritPage })));
const AkademikQrPage = lazy(() => import('./pages/akademik/AkademikQrPage').then(m => ({ default: m.AkademikQrPage })));
const AkademikQrScan = lazy(() => import('./pages/akademik/AkademikQrScan').then(m => ({ default: m.AkademikQrScan })));
const AkademikCgpa = lazy(() => import('./pages/akademik/AkademikCgpa').then(m => ({ default: m.AkademikCgpa })));
const AkademikFolderPage = lazy(() => import('./pages/akademik/AkademikFolderPage').then(m => ({ default: m.AkademikFolderPage })));
const AkademikLeaderboard = lazy(() => import('./pages/akademik/AkademikLeaderboard').then(m => ({ default: m.AkademikLeaderboard })));
const AkademikTakwimPage = lazy(() => import('./pages/akademik/AkademikTakwimPage').then(m => ({ default: m.AkademikTakwimPage })));
const DemeritManager = lazy(() => import('./pages/akademik/DemeritManager').then(m => ({ default: m.DemeritManager })));

// ── SUPSAS ──
import { SupsasProvider } from './contexts/SupsasContext';
const SupsasLayout = lazy(() => import('./pages/supsas/SupsasLayout').then(m => ({ default: m.SupsasLayout })));
const SupsasAdminLayout = lazy(() => import('./pages/supsas/admin/SupsasAdminLayout').then(m => ({ default: m.SupsasAdminLayout })));
const KetuaLayout = lazy(() => import('./pages/supsas/ketua/KetuaLayout').then(m => ({ default: m.KetuaLayout })));
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

// ── Karnival JPP v2 (Layouts — lazy loaded) ──
import { KarnivalProvider } from './contexts/KarnivalContext';
const KarnivalLayout = lazy(() => import('./pages/karnival/KarnivalLayout').then(m => ({ default: m.KarnivalLayout })));
const KarnivalAdminLayout = lazy(() => import('./pages/karnival/admin/KarnivalAdminLayout').then(m => ({ default: m.KarnivalAdminLayout })));

// ── E-Kebajikan ──
const KebajikanLayout = lazy(() => import('./pages/kebajikan/KebajikanLayout').then(m => ({ default: m.KebajikanLayout })));
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

// ── E-Kediaman Luar Kampus (KLK) ──
const KlkDashboard = lazy(() => import('./pages/klk/KlkDashboard').then(m => ({ default: m.KlkDashboard })));
const KlkPublicStats = lazy(() => import('./pages/klk/KlkPublicStats').then(m => ({ default: m.KlkPublicStats })));
const KlkResidencyFormPage = lazy(() => import('./pages/klk/KlkResidencyFormPage').then(m => ({ default: m.KlkResidencyFormPage })));
const KlkSettingsPage = lazy(() => import('./pages/klk/KlkSettingsPage').then(m => ({ default: m.KlkSettingsPage })));
const KlkLayout = lazy(() => import('./pages/klk/KlkLayout').then(m => ({ default: m.KlkLayout })));
const PolyRentAdmin = lazy(() => import('./pages/klk/PolyRentAdmin').then(m => ({ default: m.PolyRentAdmin })));


const JppUsersPage = lazy(() => import('./pages/jpp/JppUsersPage').then(m => ({ default: m.JppUsersPage })));
// ── Program Attendance (QR Check-in) ──
const ProgramAttendPage = lazy(() => import('@/pages/ProgramAttendPage').then(m => ({ default: m.ProgramAttendPage })));
const JppTakwimPage = lazy(() => import('./pages/jpp/JppTakwimPage').then(m => ({ default: m.JppTakwimPage })));
const JppLogsPage = lazy(() => import('./pages/jpp/JppLogsPage').then(m => ({ default: m.JppLogsPage })));
const JppSettingsPage = lazy(() => import('./pages/jpp/JppSettingsPage').then(m => ({ default: m.JppSettingsPage })));
const JppNexusPage = lazy(() => import('./pages/jpp/JppNexusPage').then(m => ({ default: m.JppNexusPage })));
const JppAsramaPage = lazy(() => import('./pages/jpp/JppAsramaPage').then(m => ({ default: m.JppAsramaPage })));
const JppTelemetryPage = lazy(() => import('./pages/jpp/JppTelemetryPage').then(m => ({ default: m.JppTelemetryPage })));

// ── PolyRider ──
const PolyRiderLayout = lazy(() => import('./pages/polyrider/PolyRiderLayout').then(m => ({ default: m.PolyRiderLayout })));
const PolyRiderHome = lazy(() => import('./pages/polyrider/PolyRiderHome').then(m => ({ default: m.PolyRiderHome })));
const PolyRiderDashboard = lazy(() => import('./pages/polyrider/PolyRiderDashboard').then(m => ({ default: m.PolyRiderDashboard })));
const PolyRiderAdminDashboard = lazy(() => import('./pages/polyrider/admin/PolyRiderAdminDashboard').then(m => ({ default: m.PolyRiderAdminDashboard })));

// ── PolyTask (Ekonomi Gig) ──
const PolyTaskLayout = lazy(() => import('./pages/polytask/PolyTaskLayout').then(m => ({ default: m.PolyTaskLayout })));
const PolyTaskBoard = lazy(() => import('./pages/polytask/PolyTaskBoard').then(m => ({ default: m.PolyTaskBoard })));
const PolyTaskMyJobs = lazy(() => import('./pages/polytask/PolyTaskMyJobs').then(m => ({ default: m.PolyTaskMyJobs })));
const PolyTaskMyBids = lazy(() => import('./pages/polytask/PolyTaskMyBids').then(m => ({ default: m.PolyTaskMyBids })));
const PolyTaskJobDetail = lazy(() => import('./pages/polytask/PolyTaskJobDetail').then(m => ({ default: m.PolyTaskJobDetail })));
const PolyTaskAdmin = lazy(() => import('./pages/polytask/admin/PolyTaskAdmin').then(m => ({ default: m.PolyTaskAdmin })));

// ── PolyServices ──
const PolySuaraPage = lazy(() => import('./pages/polyservices/PolySuaraPage').then(m => ({ default: m.PolySuaraPage })));
const PolyRentPage = lazy(() => import('./pages/polyrent/PolyRentPage').then(m => ({ default: m.PolyRentPage })));
const PolyServicesAdmin = lazy(() => import('./pages/jpp/PolyServicesAdmin').then(m => ({ default: m.PolyServicesAdmin })));

// ── Global Modals (lazy-loaded, deferred after paint) ──
const CompleteProfileModal = lazy(() => import('@/components/ui/CompleteProfileModal').then(m => ({ default: m.CompleteProfileModal })));
const GlobalAnnouncementModal = lazy(() => import('@/components/GlobalAnnouncementModal').then(m => ({ default: m.GlobalAnnouncementModal })));
const KamsisApplicationModal = lazy(() => import('@/components/kamsis/KamsisApplicationModal').then(m => ({ default: m.KamsisApplicationModal })));
const PushPermissionModal = lazy(() => import('@/components/ui/PushPermissionModal').then(m => ({ default: m.PushPermissionModal })));
const KlkResidencyModal = lazy(() => import('@/components/klk/KlkResidencyModal').then(m => ({ default: m.KlkResidencyModal })));

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

  // Defer modal mounting until after main content has painted
  const [modalsReady, setModalsReady] = useState(false);
  useEffect(() => {
    const cb = typeof window.requestIdleCallback === 'function'
      ? window.requestIdleCallback
      : (fn: () => void) => setTimeout(fn, 200);
    const id = cb(() => setModalsReady(true));
    return () => {
      if (typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(id as number);
      }
    };
  }, []);

  // C. Lepaskan log masuk jika sah, tetapi wajibkan maklumat profil jika kosong
  return (
    <>
      {modalsReady && (
        <Suspense fallback={null}>
          <CompleteProfileModal />
          <GlobalAnnouncementModal />
          <KlkResidencyModal />
          <KamsisApplicationModal />
          <PushPermissionModal />
        </Suspense>
      )}
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
      {/* 🔓 GUEST ONLY ROUTES (Redirects to dashboard if logged in) */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* 🔑 RESET PASSWORD ROUTE (Standalone to handle Supabase recovery event without kicks) */}
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* 🌍 TRULY PUBLIC — no auth required (Accessible to both guests and logged-in users) */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/promo" element={<PromoPage />} />
      <Route path="/launch" element={<LaunchVideo />} />
      <Route path="/kebajikan/statistik" element={<KebajikanStatsPage />} />
      <Route path="/klk/statistik" element={<KlkPublicStats />} />
      {/* 🗺️ POLYMAPS — Fully public, no login required (anyone can view campus map) */}
      <Route path="/polymaps" element={<PolyMapsPage />} />
      {/* QR Program Attendance — standalone, redirect ke login diuruskan dalam page itu sendiri */}
      <Route path="/program/attend/:token" element={<ProgramAttendPage />} />

      {/* 🔐 PROTECTED ROUTES */}
      <Route element={<ProtectedRoute />}>
        <Route path="/onboarding" element={<OnboardingPage />} />

        {/* 🌐 PORTAL HUB — standalone tanpa sidebar */}
        <Route path="/portal" element={<RequireApproval><PortalPage /></RequireApproval>} />

        {/* 🔔 NOTIFIKASI — standalone tanpa sidebar */}
        <Route path="/notifikasi" element={<RequireApproval><NotifikasiPage /></RequireApproval>} />

        {/* ⚙️ TETAPAN GLOBAL — standalone tanpa sidebar */}
        <Route path="/tetapan" element={<RequireApproval><SettingsPage /></RequireApproval>} />

        {/* ── PolyServices — standalone tanpa sidebar ── */}
        <Route path="/polysuara" element={<RequireApproval><PolySuaraPage /></RequireApproval>} />
        <Route path="/polyrent" element={<RequireApproval><PolyRentPage /></RequireApproval>} />

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
          <Route path="/jpp/keusahawanan-hub" element={<KeusahawananHubLanding />} />
          <Route path="/jpp/unit/:unitCode"   element={<JppUnitDashboard />} />
          <Route path="/jpp/announcements"    element={<AnnouncementsPage />} />
          <Route path="/jpp/users"            element={<JppUsersPage />} />
          <Route path="/jpp/takwim"           element={<JppTakwimPage />} />
          <Route path="/jpp/polymaps"            element={<JppPolyMapsAdmin />} />
          <Route path="/jpp/demerit"          element={<DemeritManager sourceOverride="MANUAL" />} />
          <Route path="/jpp/logs"             element={<JppLogsPage />} />
          <Route path="/jpp/settings"         element={<JppSettingsPage />} />
          <Route path="/jpp/nexus"            element={<JppNexusPage />} />
          <Route path="/jpp/telemetry"       element={<JppTelemetryPage />} />
          <Route path="/jpp/polyservices"     element={<PolyServicesAdmin />} />
          {/* ── Exco Universal Template Routes ── */}
          <Route path="/exco/:unitCode/aktiviti"          element={<ExcoAktivitiWrapper />} />
          <Route path="/exco/:unitCode/laporan"           element={<ExcoLaporanWrapper />} />
          <Route path="/jpp/semak-laporan-exco/:unitCode" element={<ExcoSemakanLaporanPage />} />
          {/* ── e-Asrama Rujukan ── */}
          <Route path="/jpp/asrama"                      element={<JppAsramaPage />} />
        </Route>

        {/* ── e-Keusahawanan Onboarding (No Sidebar) ── */}
        <Route path="/keusahawanan/onboarding" element={<RequireApproval><KeusahawananOnboarding /></RequireApproval>} />
        <Route path="/keusahawanan/poster" element={<RequireApproval><KeusahawananPoster /></RequireApproval>} />

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
          <Route path="/polymart/troli"         element={<PolyMartCartPage />} />
          <Route path="/polymart/vendor"        element={<PolyMartVendorDashboard />} />
          <Route path="/polymart/admin"         element={<PolyMartAdminPanel />} />
          <Route path="/polymart/verify/:orderId" element={<PolyMartVerifyPickup />} />
          <Route path="/polymart/bayar/:orderId"  element={<PolyMartPaymentPage />} />
          <Route path="/polymart/wishlist"         element={<PolyMartWishlist />} />
          <Route path="/polymart/mesej"            element={<PolyMartChat />} />
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
          <Route path="/akademik/takwim"       element={<AkademikTakwimPage />} />
        </Route>
      </Route>

      {/* ── E-Kediaman Luar Kampus (KLK) ── */}
      <Route element={<ProtectedRoute />}>
        {/* Standalone form pelajar — tanpa sidebar */}
        <Route path="/klk/form" element={<RequireApproval><KlkResidencyFormPage /></RequireApproval>} />
        {/* Dashboard + Tetapan — guna KlkLayout dengan sidebar sendiri */}
        <Route element={<RequireApproval><KlkLayout /></RequireApproval>}>
          <Route path="/klk"         element={<KlkDashboard />} />
          <Route path="/klk/tetapan" element={<KlkSettingsPage />} />
          <Route path="/klk/polyrent-admin" element={<PolyRentAdmin />} />
          <Route path="/polyrider-admin" element={<PolyRiderAdminDashboard />} />
        </Route>
      </Route>

      {/* ── PolyRider ── */}
      <Route element={<ProtectedRoute />}>
        <Route element={<RequireApproval><PolyRiderLayout /></RequireApproval>}>
          <Route path="/polyrider" element={<PolyRiderHome />} />
          <Route path="/polyrider/rider" element={<PolyRiderDashboard />} />
        </Route>
      </Route>

      {/* ── PolyTask (Ekonomi Gig) ── */}
      <Route element={<ProtectedRoute />}>
        {/* Admin Route (No specific layout, standalone dashboard) */}
        <Route path="/polytask/admin" element={<RequireApproval><PolyTaskAdmin /></RequireApproval>} />
        
        {/* User Routes (Wrapped in PolyTaskLayout) */}
        <Route element={<RequireApproval><PolyTaskLayout /></RequireApproval>}>
          <Route path="/polytask" element={<PolyTaskBoard />} />
          <Route path="/polytask/my-jobs" element={<PolyTaskMyJobs />} />
          <Route path="/polytask/my-bids" element={<PolyTaskMyBids />} />
          <Route path="/polytask/job/:id" element={<PolyTaskJobDetail />} />
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
import { ImageOptimizationProvider } from '@/contexts/ImageOptimizationContext';
import { OfflineIndicator } from '@/components/ui/OfflineIndicator';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { JppConfigProvider } from './contexts/JppConfigContext';
import { AcademicSessionProvider } from './contexts/AcademicSessionContext';
import { PwaUpdater } from '@/components/PwaUpdater';
import { InstallAppPrompt } from '@/components/pwa/InstallAppPrompt';
import { GlobalPullToUpdate } from '@/components/layout/GlobalPullToUpdate';

function GlobalRedirector() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // HANYA jalankan redirect jika pengguna berada di muka depan (/)
    // Jika tidak, ia akan bertembung dengan sistem login (yang juga guna ?redirect=)
    // dan menyebabkan infinite loop (flickering).
    if (location.pathname !== '/') return;

    const params = new URLSearchParams(location.search);
    const redirectPath = params.get('redirect');
    if (redirectPath) {
      navigate(redirectPath, { replace: true });
    }
  }, [location.search, location.pathname, navigate]);

  return null;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <BrowserRouter>
          <GlobalRedirector />
          <AuthProvider>
            <AcademicSessionProvider>
              <NotificationProvider>
                <AiSettingsProvider>
                  <JppConfigProvider>
                    <KarnivalProvider>
                      <GlobalPullToUpdate />
                      <AppRoutes />
                      <PwaUpdater />
                      <InstallAppPrompt />
                      <OfflineIndicator />
                      <Toaster position="top-center">
                        {(t) => {
                          const isError = t.type === 'error';
                          const isSuccess = t.type === 'success';
                          
                          return (
                            <motion.div
                              layout
                              initial={{ opacity: 0, y: -50, scale: 0.3, width: 60, height: 20 }}
                              animate={{ 
                                opacity: t.visible ? 1 : 0, 
                                y: t.visible ? 8 : -50,
                                scale: t.visible ? 1 : 0.5,
                                width: 'auto',
                                height: 'auto'
                              }}
                              exit={{ opacity: 0, y: -50, scale: 0.5 }}
                              transition={{ 
                                type: "spring", 
                                stiffness: 400, 
                                damping: 25,
                                mass: 0.8
                              }}
                              className={cn(
                                "flex items-center gap-3 px-4 py-2.5 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] pointer-events-auto overflow-hidden",
                                "bg-black border border-white/10",
                                "rounded-full min-w-[160px] max-w-[90vw] justify-center mt-[env(safe-area-inset-top,0px)]"
                              )}
                            >
                              <div className="flex-shrink-0">
                                {isSuccess && <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center"><Check className="w-3 h-3 text-emerald-400 stroke-[3]" /></div>}
                                {isError && <div className="w-5 h-5 rounded-full bg-rose-500/20 flex items-center justify-center"><X className="w-3 h-3 text-rose-400 stroke-[3]" /></div>}
                                {t.type === 'loading' && <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />}
                                {t.type !== 'success' && t.type !== 'error' && t.type !== 'loading' && (
                                  t.icon || <Bell className="w-4 h-4 text-white/50" />
                                )}
                              </div>
                              <div className="text-[11px] font-bold tracking-wide text-white line-clamp-2 pr-2">
                                {resolveValue(t.message, t)}
                              </div>
                            </motion.div>
                          );
                        }}
                      </Toaster>
                    </KarnivalProvider>
                  </JppConfigProvider>
                </AiSettingsProvider>
              </NotificationProvider>
            </AcademicSessionProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;