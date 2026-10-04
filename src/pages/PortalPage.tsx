import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { EXCO_MODULES, getExcoColor, ExcoColorSetting } from '@/config/excoModules';

import { toast } from 'react-hot-toast';
import { cn, getMalaysianNickname } from '@/lib/utils';
import { PortalSidebar } from '@/components/layout/PortalSidebar';
import { useKarnivalStatus } from '@/contexts/KarnivalContext';

// Extracted Components
import { ExcoCard } from '@/components/portal/ExcoCard';
import { KarnivalEffects } from '@/components/portal/KarnivalEffects';
import { SupsasEffects } from '@/components/portal/SupsasEffects';
import { CurtainReveal } from '@/components/portal/CurtainReveal';
import { useAcademicSession } from '@/contexts/AcademicSessionContext';
import { PortalNotificationCenter } from '@/components/portal/PortalNotificationCenter';
import { QuickActions } from '@/components/portal/QuickActions';
import { PortalNavbar } from '@/components/portal/PortalNavbar';
import { PortalFooter } from '@/components/portal/PortalFooter';
import { PortalAdminToolbar } from '@/components/portal/PortalAdminToolbar';
import { useTour } from '@/hooks/useTour';
import { KamsisAppealModal } from '@/components/kamsis/KamsisAppealModal';
import { BottomNav } from '@/components/layout/BottomNav';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';

// Lazy-load SystemTour so react-joyride DOM watchers are completely bypassed during normal visits
const SystemTour = React.lazy(() => import('@/components/ui/SystemTour').then(m => ({ default: m.SystemTour })));

export function PortalPage() {
  const { profile, isSuperAdmin, hasKebajikanAccess } = useAuth();
  const navigate = useNavigate();
  const karnivalStatus = useKarnivalStatus();
  const karnivalActive = !!karnivalStatus?.isActive;
  const { isLowPerf } = useDevicePerformance();

  // Initialize settings synchronously from localStorage to eliminate white flashes and skeleton blocking
  const [settings, setSettings] = useState<ExcoColorSetting[]>(() => {
    try {
      const cached = localStorage.getItem('jpp_portal_settings_cache');
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  });
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { runTour, startTour, closeTour } = useTour('jpp_has_seen_portal_tour', !!profile);

  // Kebajikan live stats
  const [kbStats, setKbStats] = useState<{ open: number; resolved: number; rating: number | null } | null>(null);

  const isJPPMode = profile?.role === 'JPP' || isSuperAdmin;

  // PolyMart live stats
  const [polyMartStats, setPolyMartStats] = useState<{ listings: number; businesses: number } | null>(null);

  // SUPSAS edition data
  const [supsasEdition, setSupsasEdition] = useState<{
    name: string; start_date: string | null; end_date: string | null; is_active: boolean;
  } | null>(null);

  // KAMSIS Application Status
  const [kamsisStatus, setKamsisStatus] = useState<string | null>(null);
  const [kamsisExtraData, setKamsisExtraData] = useState<any>(null);
  const [kamsisToggles, setKamsisToggles] = useState<Record<string, boolean>>({});
  const [showAppealModal, setShowAppealModal] = useState(false);

  const { activeSession, semesterString } = useAcademicSession();

  const fetchKamsisStatus = useCallback(async () => {
    if (!profile?.id) return;

    const [appRes, toggleRes] = await Promise.all([
      supabase.from('kamsis_applications')
        .select('status, extra_data')
        .eq('user_id', profile.id)
        .eq('session', activeSession)
        .eq('semester', semesterString)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from('system_settings')
        .select('key, value')
        .like('key', 'kamsis_%')
    ]);

    if (appRes.data) {
      setKamsisStatus(appRes.data.status);
      setKamsisExtraData(appRes.data.extra_data);
    }

    if (toggleRes.data) {
      const map: Record<string, boolean> = {};
      toggleRes.data.forEach(d => {
        map[d.key] = typeof d.value === 'string' ? d.value === 'true' : !!d.value;
      });
      setKamsisToggles(map);
    }
  }, [profile?.id, activeSession, semesterString]);

  useEffect(() => {
    fetchKamsisStatus();
  }, [fetchKamsisStatus]);

  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 20);
  });

  // Karnival: session toast (sekali per session)
  useEffect(() => {
    if (!karnivalActive || !karnivalStatus?.name) return;
    const key = `karnival_toast_${karnivalStatus.name}`;
    if (!sessionStorage.getItem(key)) {
      const t = setTimeout(() => {
        toast('🎊 Karnival JPP sedang berlangsung! Undi booth kegemaran anda sekarang.', { duration: 5000 });
        sessionStorage.setItem(key, '1');
      }, 1800);
      return () => clearTimeout(t);
    }
  }, [karnivalActive, karnivalStatus?.name]);

  // SUPSAS: session toast
  useEffect(() => {
    if (!isModuleEnabled('supsas') || !supsasEdition?.name) return;
    const key = `supsas_toast_${supsasEdition.name}`;
    if (!sessionStorage.getItem(key)) {
      const t = setTimeout(() => {
        toast('🏆 SUPSAS sedang berlangsung! Pantau keputusan dan jadual sukan terkini.', { duration: 5000 });
        sessionStorage.setItem(key, '1');
      }, 1800);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, supsasEdition?.name]);

  // QR Redirect Miss: tunjuk toast "Sila scan QR sekali lagi!"
  // Berlaku bila user BARU register & ada QR redirect yang tidak dapat diikut
  // (kerana account baru perlu ke /portal dulu). Flag diset oleh PublicRoute.
  useEffect(() => {
    const missedQr = sessionStorage.getItem('qr_redirect_missed');
    if (missedQr) {
      sessionStorage.removeItem('qr_redirect_missed');
      setTimeout(() => {
        toast('🔗 Sila scan QR sekali lagi untuk meneruskan ke destinasi asal anda!', {
          duration: 8000,
          icon: '📲',
        });
      }, 1500); // Delay sikit supaya portal dah fully loaded
    }
  }, []);

  // Unified parallel data fetch (eliminates network waterfall)
  const fetchAllPortalData = useCallback(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const [settingsRes, kbOpenRes, kbResolvedRes, kbRatingRes, polymartRes] = await Promise.all([
        // 1. Portal settings
        supabase.from('portal_settings')
          .select('exco_module, color, is_enabled')
          .abortSignal(controller.signal),
        // 2. Kebajikan - open tickets
        supabase.from('kebajikan_tickets')
          .select('id', { count: 'exact', head: true })
          .not('status', 'in', '(RESOLVED,CLOSED,CANCELLED)'),
        // 3. Kebajikan - resolved tickets
        supabase.from('kebajikan_tickets')
          .select('id', { count: 'exact', head: true })
          .in('status', ['RESOLVED', 'CLOSED']),
        // 4. Kebajikan - ratings
        supabase.from('kebajikan_tickets')
          .select('rating')
          .not('rating', 'is', null),
        // 5. PolyMart stats
        supabase.from('business_products')
          .select('business_id, keusahawanan_businesses!inner(status)')
          .eq('publish_to_polymart', true)
          .eq('is_available', true)
          .eq('keusahawanan_businesses.status', 'ACTIVE'),
      ]);

      // Process settings
      if (settingsRes.data) {
        const settingsData = settingsRes.data as ExcoColorSetting[];
        setSettings(settingsData);
        try {
          localStorage.setItem('jpp_portal_settings_cache', JSON.stringify(settingsData));
        } catch {}

        // SUPSAS edition - only fetch if supsas module is enabled
        const supsasSetting = settingsData.find(s => s.exco_module === 'supsas');
        const supsasOn = supsasSetting ? supsasSetting.is_enabled : false;
        if (supsasOn) {
          supabase.from('supsas_editions')
            .select('name, start_date, end_date, is_active')
            .order('edition_year', { ascending: false })
            .limit(1)
            .maybeSingle()
            .then(({ data }) => { if (data) setSupsasEdition(data as any); });
        }
      }

      // Process kebajikan stats
      const ratings = (kbRatingRes.data || []).map((r: any) => r.rating as number);
      const avg = ratings.length ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : null;
      setKbStats({ open: kbOpenRes.count ?? 0, resolved: kbResolvedRes.count ?? 0, rating: avg });

      // Process PolyMart stats
      const listingsCount = polymartRes.data?.length ?? 0;
      const uniqueBusinesses = new Set(polymartRes.data?.map(p => p.business_id)).size;
      setPolyMartStats({ listings: listingsCount, businesses: uniqueBusinesses });

    } catch (e: any) {
      if (e.name === 'AbortError') {
        console.warn('⚠️ Portal data fetch timed out (5s). Using defaults.');
      } else {
        console.error('Portal data fetch error:', e);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }, []);

  useEffect(() => { fetchAllPortalData(); }, [fetchAllPortalData]);

  const isModuleEnabled = (moduleId: string): boolean => {
    const s = settings.find(s => s.exco_module === moduleId);
    return s ? s.is_enabled : moduleId === 'ekpp';
  };

  const handleToggle = async (moduleId: string, newState: boolean) => {
    const { error } = await supabase
      .from('portal_settings')
      .update({ is_enabled: newState, updated_by: profile?.id, updated_at: new Date().toISOString() })
      .eq('exco_module', moduleId);

    if (error) { toast.error('Failed to update status.'); return; }

    setSettings(prev => prev.map(s => s.exco_module === moduleId ? { ...s, is_enabled: newState } : s));
    toast.success(`${moduleId} ${newState ? 'enabled' : 'disabled'}.`);
  };

  const handleColorSave = async (moduleId: string, newColor: string) => {
    const { error } = await supabase
      .from('portal_settings')
      .update({ color: newColor, updated_by: profile?.id, updated_at: new Date().toISOString() })
      .eq('exco_module', moduleId);

    if (error) { toast.error('Failed to save color.'); return; }

    setSettings(prev => prev.map(s => s.exco_module === moduleId ? { ...s, color: newColor } : s));
    toast.success('Theme color updated! 🎨');
  };

  const displayName = useMemo(() => getMalaysianNickname(profile?.full_name) || 'Student', [profile]);
  const supsasActive = isModuleEnabled('supsas');

  return (
    <div className={cn(
      'min-h-screen min-h-[100dvh] font-sans overflow-x-hidden transition-colors duration-700 relative flex flex-col',
      karnivalActive
        ? 'bg-[#060010] text-white selection:bg-violet-500/20'
        : supsasActive
          ? 'bg-[#030d1a] text-white selection:bg-amber-500/20'
          : 'bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white selection:bg-emerald-500/20'
    )}>

      {/* Calibrated Ambient Aura & Specular Highlights */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        {karnivalActive ? (
          <>
            <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1100px] h-[550px] bg-gradient-to-b from-pink-600/10 via-violet-600/5 to-transparent blur-3xl opacity-75" />
            <div className="absolute top-1/3 -left-48 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
          </>
        ) : supsasActive ? (
          <>
            <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1100px] h-[550px] bg-gradient-to-b from-amber-500/10 via-sky-600/5 to-transparent blur-3xl opacity-75" />
            <div className="absolute top-1/3 -right-48 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
          </>
        ) : (
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1100px] h-[500px] bg-gradient-to-b from-emerald-500/5 via-slate-500/5 to-transparent blur-3xl opacity-50 dark:opacity-40" />
        )}
      </div>

      {/* SystemTour loaded lazily ONLY if runTour is true */}
      {runTour && (
        <React.Suspense fallback={null}>
          <SystemTour 
            run={runTour}
            onClose={closeTour}
            steps={[
              {
                target: 'body',
                content: 'Selamat Datang ke Ekosistem Digital JPP-POLISAS! Mari luangkan masa 1 minit untuk mengenali setiap butang dan fungsi supaya anda tidak keliru.',
                title: 'Selamat Datang! 👋',
                placement: 'center',
                disableBeacon: true,
              },
              {
                target: '.tour-navbar-profile',
                content: 'Klik di sini untuk buka menu Profil. Anda boleh tukar nama, gambar profil, kata laluan, atau log keluar dari sistem di sini.',
                title: 'Menu Profil ⚙️',
                placement: 'bottom',
              },
              {
                target: '.tour-qa-polyservices',
                content: 'Ini adalah PolyServices. Di dalam ini terdapat pelbagai perkhidmatan pantas seperti tempahan dan perkhidmatan luar.',
                title: 'PolyServices ⚡',
                placement: 'top',
              },
              {
                target: '.tour-qa-kebajikan',
                content: 'Perlu lapor kerosakan bilik kuliah? Atau mohon bantuan tabung siswa? Tekan butang E-Kebajikan ini untuk membuat aduan rasmi.',
                title: 'E-Kebajikan ❤️',
                placement: 'top',
              },
              {
                target: '.tour-qa-qr',
                content: 'Semasa menghadiri program atau aktiviti, tekan butang ini untuk imbas Kod QR dan secara automatik kumpul mata merit ke dalam akaun anda.',
                title: 'Imbas QR Merit 📸',
                placement: 'top',
              },
              {
                target: '.tour-qa-takwim',
                content: 'Takwim Rasmi JPP dan POLISAS. Anda boleh semak senarai cuti, tarikh penting, dan program yang akan datang di sini.',
                title: 'Takwim & Jadual 🗓️',
                placement: 'top',
              },
              {
                target: '.tour-mod-ekpp',
                content: 'Modul Sistem Kelab (EKPP). Jika anda adalah wakil kelab persatuan, pengurusan pendaftaran, laporan, dan aktiviti akan dilakukan di sini.',
                title: 'Sistem Kelab 🏛️',
                placement: 'top',
              },
              {
                target: '.tour-mod-keusahawanan',
                content: 'PolyMart. Ruang khas untuk pelajar memulakan bisnes kecil, mengiklankan produk jualan, dan menjalankan perniagaan e-Dagang kampus.',
                title: 'e-Keusahawanan 💡',
                placement: 'top',
              },
              {
                target: '.tour-mod-akademik',
                content: 'Modul e-Akademik. Di sinilah tempat anda menyemak baki jumlah mata merit semasa, senarai program, dan maklumat akademik anda.',
                title: 'e-Akademik 🎓',
                placement: 'top',
              },
              {
                target: '.tour-bottomnav-fab',
                content: 'Terakhir dan paling penting! Ini adalah Navigasi Pintar. Jika anda tersesat di halaman mana sekalipun, tekan butang (+) ini untuk menu pintas.',
                title: 'Navigasi Pintar (FAB) 🧭',
                placement: 'top',
              }
            ]}
          />
        </React.Suspense>
      )}

      <PortalSidebar
        isOpen={isSidebarOpen}
        onOpen={() => setIsSidebarOpen(true)}
        onClose={() => setIsSidebarOpen(false)}
        settings={settings}
      />

      {/* Visual Effects */}
      <CurtainReveal karnivalActive={karnivalActive} supsasActive={supsasActive} />
      {karnivalActive && <KarnivalEffects />}
      {supsasActive && !karnivalActive && <SupsasEffects />}

      {/* Navigation */}
      <PortalNavbar
        isScrolled={isScrolled}
        karnivalActive={karnivalActive}
        supsasActive={supsasActive}
        profile={profile}
        setIsSidebarOpen={setIsSidebarOpen}
        onStartTour={startTour}
      />

      {/* Main Content - Renders IMMEDIATELY without waiting for DB waterfalls, optimizing LCP & INP */}
      <main className="relative z-10 pt-28 md:pt-36 after:content-[''] after:block after:h-40 after:shrink-0 px-4 md:px-8 max-w-7xl mx-auto flex-1 w-full">
        {/* Title Section */}
        <div className="flex flex-col items-center text-center mb-10 md:mb-14 space-y-4 md:space-y-6">
          <motion.div
            initial={{ opacity: isLowPerf ? 1 : 0, y: isLowPerf ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={isLowPerf ? { duration: 0 } : { delay: 0.1 }}
            className="space-y-4 w-full"
          >
            {/* Executive Role & Merit Aura */}
            {profile && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-black/[0.03] dark:bg-white/5 border border-black/5 dark:border-white/10 text-slate-600 dark:text-white/70">
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full animate-pulse",
                  karnivalActive ? "bg-pink-400" :
                  supsasActive ? "bg-amber-400" :
                  "bg-emerald-500"
                )} />
                <span className="uppercase tracking-widest text-[10px] font-bold">
                  {profile.role || 'STUDENT'}
                </span>
                {(profile.merit_points !== undefined || profile.merit !== undefined) && (
                  <>
                    <span className="text-black/20 dark:text-white/20">/</span>
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                      {profile.merit_points ?? profile.merit ?? 0} Merit
                    </span>
                  </>
                )}
              </div>
            )}

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1] max-w-4xl mx-auto text-transparent bg-clip-text bg-gradient-to-b from-slate-900 to-slate-600 dark:from-white dark:to-white/60">
              {supsasActive && !karnivalActive ? 'Semangat Sukan,' :
                (() => {
                  const hour = new Date().getHours();
                  if (hour >= 5 && hour < 12) return 'Selamat Pagi,';
                  if (hour >= 12 && hour < 19) return 'Selamat Petang,';
                  if (hour >= 19 && hour < 24) return 'Selamat Malam,';
                  return 'Masih berjaga,';
                })()
              } <br />
              <span className={supsasActive && !karnivalActive ? 'text-amber-400' : karnivalActive ? 'text-violet-400' : 'text-emerald-500 dark:text-emerald-400'}>
                {displayName}
              </span>
            </h1>
            <p className="text-sm md:text-lg text-slate-500 dark:text-white/50 font-medium max-w-2xl mx-auto leading-relaxed px-4">
              {supsasActive && !karnivalActive
                ? <>Sokong pasukan anda. Pantau keputusan sukan secara langsung. <br className="hidden md:block" />Bawa semangat ke padang! 🏅</>
                : <>Platform bersepadu untuk pengurusan kelab, perniagaan, dan aktiviti JPP Polisas. <br className="hidden md:block" />Bawa kepimpinan anda ke tahap seterusnya.</>
              }
            </p>

            {/* Campaign Deck */}
            <PortalNotificationCenter
              kamsisStatus={kamsisStatus}
              kamsisExtraData={kamsisExtraData}
              kamsisToggles={kamsisToggles}
              onOpenKamsisAppeal={() => setShowAppealModal(true)}
              supsasActive={supsasActive}
              supsasEdition={supsasEdition}
              karnivalActive={karnivalActive}
              karnivalStatus={karnivalStatus}
            />

            {/* Quick Actions */}
            <QuickActions
              isSuperAdmin={isSuperAdmin}
              isModuleEnabled={isModuleEnabled}
              polyMartStats={polyMartStats}
              hasKebajikanAccess={hasKebajikanAccess}
              kbStats={kbStats}
              isJPPMode={isJPPMode}
              karnivalActive={karnivalActive}
              supsasActive={supsasActive}
            />

          </motion.div>
        </div>

        {/* Asymmetric Linear Bento Grid */}
        <div className="tour-exco-modules max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-6 lg:gap-8 max-w-6xl mx-auto">
            {EXCO_MODULES.filter(mod => mod.id !== 'kebajikan').map((mod, i) => {
              let badgeText: string | undefined;
              let notificationCount: number | undefined;

              if (mod.id === 'karnival' && karnivalActive) {
                badgeText = "🎪 BERLANGSUNG";
              } else if (mod.id === 'supsas' && supsasActive) {
                badgeText = "🏆 BERLANGSUNG";
              } else if (mod.id === 'akademik') {
                badgeText = "NEW";
              }

              return (
                <ExcoCard
                  key={mod.id}
                  module={mod}
                  color={getExcoColor(mod.id, settings)}
                  index={i}
                  totalModules={4}
                  isEnabled={isModuleEnabled(mod.id)}
                  isSuperAdmin={isSuperAdmin}
                  onToggle={handleToggle}
                  onColorSave={handleColorSave}
                  karnivalActive={karnivalActive}
                  supsasActive={supsasActive}
                  badgeText={badgeText}
                  notificationCount={notificationCount}
                />
              );
            })}
          </div>
        </div>
      </main>

      <PortalFooter />

      {/* Appeal Modal */}
      <AnimatePresence>
        {showAppealModal && profile && (
          <KamsisAppealModal
            userId={profile.id}
            onClose={() => setShowAppealModal(false)}
            onSuccess={() => {
              setShowAppealModal(false);
              fetchKamsisStatus();
            }}
          />
        )}
      </AnimatePresence>

      <BottomNav onOpenSidebar={() => setIsSidebarOpen(true)} />

      {/* SuperAdmin Floating Toolbar */}
      {isSuperAdmin && (
        <PortalAdminToolbar
          modules={EXCO_MODULES}
          settings={settings}
          onToggle={handleToggle}
          onColorSave={handleColorSave}
        />
      )}

    </div>
  );
}
