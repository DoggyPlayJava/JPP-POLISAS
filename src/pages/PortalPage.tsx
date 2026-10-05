import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { EXCO_MODULES, getExcoColor, ExcoColorSetting } from '@/config/excoModules';
import { HelpCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { PortalSidebar } from '@/components/layout/PortalSidebar';
import { useKarnivalStatus } from '@/contexts/KarnivalContext';
import { ExcoCard } from '@/components/portal/ExcoCard';
import { KarnivalEffects } from '@/components/portal/KarnivalEffects';
import { SupsasEffects } from '@/components/portal/SupsasEffects';
import { CurtainReveal } from '@/components/portal/CurtainReveal';
import { useAcademicSession } from '@/contexts/AcademicSessionContext';
import { PortalFooter } from '@/components/portal/PortalFooter';
import { useTour } from '@/hooks/useTour';
import { KamsisAppealModal } from '@/components/kamsis/KamsisAppealModal';
import { BottomNav } from '@/components/layout/BottomNav';
import { SuperAppHeader } from '@/components/portal/SuperAppHeader';
import { CampusServicesGrid } from '@/components/portal/CampusServicesGrid';
import { CampusCampaignCarousel } from '@/components/portal/CampusCampaignCarousel';
import { EmsEventsFeed } from '@/components/portal/EmsEventsFeed';
import { PolyMartFeed } from '@/components/portal/PolyMartFeed';
import { PolymartServiceModal } from '@/components/portal/PolymartServiceModal';
import { buildCampaignSlides } from '@/lib/superAppHelpers';

// Lazy-load SystemTour so react-joyride DOM watchers are completely bypassed during normal visits
const SystemTour = React.lazy(() => import('@/components/ui/SystemTour').then(m => ({ default: m.SystemTour })));

export function PortalPage() {
  const { profile, isSuperAdmin } = useAuth();
  const karnivalStatus = useKarnivalStatus();
  const karnivalActive = !!karnivalStatus?.isActive;

  // Initialize settings synchronously from localStorage to eliminate white flashes
  const [settings, setSettings] = useState<ExcoColorSetting[]>(() => {
    try {
      const cached = localStorage.getItem('jpp_portal_settings_cache');
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { runTour, startTour, closeTour } = useTour('jpp_has_seen_portal_tour', !!profile);

  // Kebajikan live stats
  const [kbStats, setKbStats] = useState<{ open: number; resolved: number; rating: number | null } | null>(null);

  // SUPSAS edition data
  const [supsasEdition, setSupsasEdition] = useState<{
    name: string; start_date: string | null; end_date: string | null; is_active: boolean;
  } | null>(null);

  // KAMSIS Application & Status
  const [kamsisStatus, setKamsisStatus] = useState<string | null>(null);
  const [kamsisExtraData, setKamsisExtraData] = useState<any>(null);
  const [kamsisToggles, setKamsisToggles] = useState<Record<string, boolean>>({});
  const [showAppealModal, setShowAppealModal] = useState(false);

  // MAKMP Status
  const [makmpStatus, setMakmpStatus] = useState<'DIJEMPUT' | 'TIDAK_TERPILIH' | null>(null);

  // PolyMart Modal
  const [showPolymartModal, setShowPolymartModal] = useState(false);

  const { activeSession, semesterString } = useAcademicSession();

  const isModuleEnabled = useCallback((moduleId: string): boolean => {
    const s = settings.find(st => st.exco_module === moduleId);
    return s ? s.is_enabled : moduleId === 'ekpp';
  }, [settings]);

  const supsasActive = isModuleEnabled('supsas');

  // ── Fetch User Specific Data (KAMSIS & MAKMP) in parallel ──
  const fetchUserData = useCallback(async () => {
    if (!profile?.id) return;

    try {
      const [appRes, toggleRes, makmpRes] = await Promise.all([
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
          .like('key', 'kamsis_%'),
        supabase.from('makmp_submissions')
          .select('winner_status')
          .eq('user_id', profile.id)
          .not('winner_status', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
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

      if (makmpRes.data?.winner_status) {
        setMakmpStatus(makmpRes.data.winner_status as 'DIJEMPUT' | 'TIDAK_TERPILIH');
      } else {
        setMakmpStatus(null);
      }
    } catch (err) {
      console.warn('Error fetching user portal data:', err);
    }
  }, [profile?.id, activeSession, semesterString]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // ── Unified parallel portal data fetch ──
  const fetchAllPortalData = useCallback(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const [settingsRes, kbOpenRes, kbResolvedRes, kbRatingRes] = await Promise.all([
        // 1. Portal settings
        supabase.from('portal_settings')
          .select('exco_module, color, is_enabled')
          .abortSignal(controller.signal),
        // 2. Kebajikan — open tickets
        supabase.from('kebajikan_tickets')
          .select('id', { count: 'exact', head: true })
          .not('status', 'in', '(RESOLVED,CLOSED,CANCELLED)'),
        // 3. Kebajikan — resolved tickets
        supabase.from('kebajikan_tickets')
          .select('id', { count: 'exact', head: true })
          .in('status', ['RESOLVED', 'CLOSED']),
        // 4. Kebajikan — ratings
        supabase.from('kebajikan_tickets')
          .select('rating')
          .not('rating', 'is', null),
      ]);

      // Process settings
      if (settingsRes.data) {
        const settingsData = settingsRes.data as ExcoColorSetting[];
        setSettings(settingsData);
        try {
          localStorage.setItem('jpp_portal_settings_cache', JSON.stringify(settingsData));
        } catch {}

        // SUPSAS edition — only fetch if supsas module is enabled
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

  useEffect(() => {
    fetchAllPortalData();
  }, [fetchAllPortalData]);

  // ── Karnival toast notification ──
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

  // ── SUPSAS toast notification ──
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
  }, [isModuleEnabled, supsasEdition?.name]);

  // ── QR Redirect Miss alert ──
  useEffect(() => {
    const missedQr = sessionStorage.getItem('qr_redirect_missed');
    if (missedQr) {
      sessionStorage.removeItem('qr_redirect_missed');
      setTimeout(() => {
        toast('🔗 Sila scan QR sekali lagi untuk meneruskan ke destinasi asal anda!', {
          duration: 8000,
          icon: '📲',
        });
      }, 1500);
    }
  }, []);

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

  // Compute KAMSIS display status and appeal eligibility
  const { displayStatus, canAppeal } = useMemo(() => {
    const isAppeal = !!kamsisExtraData?.appeal_reason || kamsisStatus === 'APPEALING' || kamsisStatus === 'APPEAL_REJECTED';
    const isResultOpen = kamsisToggles['kamsis_result_open'];
    const isAppealResultOpen = kamsisToggles['kamsis_appeal_result_open'];
    const isAppealOpen = kamsisToggles['kamsis_appeal_open'];

    let status = kamsisStatus;
    if (!isAppeal) {
      if (!isResultOpen) status = 'PENDING';
    } else {
      if (!isAppealResultOpen) status = 'APPEALING';
    }

    const eligible = kamsisStatus === 'REJECTED' && isResultOpen && isAppealOpen && !isAppeal;
    return { displayStatus: status, canAppeal: eligible };
  }, [kamsisStatus, kamsisExtraData, kamsisToggles]);

  // Dynamic campaign slides based on user state & campus events
  const campaignSlides = useMemo(() => {
    return buildCampaignSlides({
      kamsisStatus,
      makmpStatus,
      karnivalActive,
      supsasActive,
    });
  }, [kamsisStatus, makmpStatus, karnivalActive, supsasActive]);

  return (
    <div className={cn(
      'min-h-screen font-sans overflow-x-hidden w-full max-w-full transition-colors duration-700 relative flex flex-col',
      karnivalActive
        ? 'bg-[#060010] text-white selection:bg-violet-500/20'
        : supsasActive
          ? 'bg-[#030d1a] text-white selection:bg-amber-500/20'
          : 'bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white selection:bg-emerald-500/20'
    )}>

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

      {/* Help Button — Manual Tour Restart */}
      <button
        onClick={startTour}
        className="tour-help-button fixed top-20 right-4 z-[60] w-10 h-10 rounded-full bg-white/10 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-lg flex items-center justify-center text-slate-500 dark:text-white/40 hover:text-slate-800 dark:hover:text-white hover:bg-white/30 dark:hover:bg-white/10 hover:scale-110 active:scale-95 transition-all"
        title="Ulang Tutorial"
      >
        <HelpCircle className="w-5 h-5" />
      </button>

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

      {/* Modern Super App Header */}
      <SuperAppHeader
        profile={profile}
        onOpenSidebar={() => setIsSidebarOpen(true)}
        karnivalActive={karnivalActive}
        supsasActive={supsasActive}
      />

      {/* Main Content Experience */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 md:px-8 space-y-8 pt-6 pb-36 sm:pb-32 flex-1 after:content-[''] after:block after:h-28 after:shrink-0 overflow-x-hidden w-full max-w-full">
        {/* 1. Campus Services Grid */}
        <CampusServicesGrid
          isModuleEnabled={isModuleEnabled}
          isSuperAdmin={isSuperAdmin}
          onOpenPolymartModal={() => setShowPolymartModal(true)}
          onOpenKamsisModal={() => {
            if (canAppeal) setShowAppealModal(true);
            else toast('Status Asrama: ' + (displayStatus || 'Tiada Rekod'));
          }}
          kamsisStatus={kamsisStatus}
          kbStats={kbStats}
        />

        {/* 2. Campus Campaign Carousel */}
        <CampusCampaignCarousel
          slides={campaignSlides}
          onOpenAppealModal={() => setShowAppealModal(true)}
        />

        {/* 3. EMS Events Feed */}
        <EmsEventsFeed />

        {/* 4. PolyMart Marketplace Feed */}
        <PolyMartFeed />

        {/* 5. Official Exco Modules Section */}
        <section aria-label="Modul Rasmi Exco" className="tour-exco-modules space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Modul Rasmi Exco JPP
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-white/60">
                Akses terus ke portal rasmi pengurusan dan pentadbiran mahasiswa
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
            {EXCO_MODULES.filter(mod => mod.id !== 'kebajikan').map((mod, i, arr) => {
              let badgeText;
              let notificationCount;

              if (mod.id === 'kebajikan' && kbStats?.open) {
                notificationCount = kbStats.open;
              } else if (mod.id === 'karnival' && karnivalActive) {
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
                  isEnabled={isModuleEnabled(mod.id)}
                  isSuperAdmin={isSuperAdmin}
                  onToggle={handleToggle}
                  onColorSave={handleColorSave}
                  karnivalActive={karnivalActive}
                  supsasActive={supsasActive}
                  badgeText={badgeText}
                  notificationCount={notificationCount}
                  className={arr.length % 2 !== 0 && i === arr.length - 1 ? 'sm:col-span-2' : ''}
                />
              );
            })}
          </div>

          {/* Global Admin Status Line */}
          {isSuperAdmin && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="pt-6 flex flex-wrap justify-center items-center gap-x-8 gap-y-4 opacity-50 hover:opacity-100 transition-opacity duration-300"
            >
              <AdminStatusIndicator color="bg-emerald-400" label="Sistem Operasi (Live)" />
              <AdminStatusIndicator color="bg-amber-400" label="Pratonton Pentadbir" />
              <AdminStatusIndicator color="bg-black/20 dark:bg-white/20" label="Dalam Pembangunan" />
            </motion.div>
          )}
        </section>
      </main>

      <PortalFooter />

      {/* Polymart Service Modal */}
      <PolymartServiceModal
        isOpen={showPolymartModal}
        onClose={() => setShowPolymartModal(false)}
      />

      {/* Appeal Modal */}
      <AnimatePresence>
        {showAppealModal && profile && (
          <KamsisAppealModal
            userId={profile.id}
            onClose={() => setShowAppealModal(false)}
            onSuccess={() => {
              setShowAppealModal(false);
              fetchUserData();
            }}
          />
        )}
      </AnimatePresence>

      <BottomNav onOpenSidebar={() => setIsSidebarOpen(true)} />

    </div>
  );
}

function AdminStatusIndicator({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn("w-2 h-2 rounded-full", color, "shadow-[0_0_10px_rgba(0,0,0,0.1)] dark:shadow-[0_0_10px_rgba(255,255,255,0.2)]")} />
      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-white/50">{label}</span>
    </div>
  );
}

export default PortalPage;
