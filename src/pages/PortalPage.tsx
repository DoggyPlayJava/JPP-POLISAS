import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { EXCO_MODULES, getExcoColor, ExcoColorSetting } from '@/config/excoModules';

import { Sparkles, Building2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn, getMalaysianNickname } from '@/lib/utils';
import { PortalSidebar } from '@/components/layout/PortalSidebar';
import { useKarnivalStatus } from '@/contexts/KarnivalContext';
import { Badge } from '@/components/ui/badge';

// Extracted Components
import { ExcoCard } from '@/components/portal/ExcoCard';
import { KarnivalEffects } from '@/components/portal/KarnivalEffects';
import { SupsasEffects } from '@/components/portal/SupsasEffects';
import { CurtainReveal } from '@/components/portal/CurtainReveal';
import { useAcademicSession } from '@/contexts/AcademicSessionContext';
import { KarnivalMegaBanner } from '@/components/portal/KarnivalMegaBanner';
import { SupsasMegaBanner } from '@/components/portal/SupsasMegaBanner';
import { QuickActions } from '@/components/portal/QuickActions';
import { PortalNavbar } from '@/components/portal/PortalNavbar';
import { PortalFooter } from '@/components/portal/PortalFooter';
import { PortalSkeleton } from '@/components/portal/PortalSkeleton';
import { KamsisAppealModal } from '@/components/kamsis/KamsisAppealModal';
import { BottomNav } from '@/components/layout/BottomNav';
import { LayoutDashboard, GraduationCap, ShieldAlert as ShieldIcon } from 'lucide-react';

export function PortalPage() {
  const { profile, isSuperAdmin, hasKebajikanAccess } = useAuth();
  const navigate = useNavigate();
  const karnivalStatus = useKarnivalStatus();
  const karnivalActive = !!karnivalStatus?.isActive;

  const [settings, setSettings] = useState<ExcoColorSetting[]>([]);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 20);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ── Karnival: session toast (sekali per session) ──────────────
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

  // ── SUPSAS: session toast ─────────────────────────────────────
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

  // ── QR Redirect Miss: tunjuk toast "Sila scan QR sekali lagi!" ──
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

  // ── Unified parallel data fetch (eliminates network waterfall) ──
  const fetchAllPortalData = useCallback(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const [settingsRes, kbOpenRes, kbResolvedRes, kbRatingRes, polymartRes] = await Promise.all([
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
      setIsLoadingSettings(false);
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
      'min-h-screen font-sans overflow-x-hidden transition-colors duration-700 relative flex flex-col',
      karnivalActive
        ? 'bg-[#060010] text-white selection:bg-violet-500/20'
        : supsasActive
          ? 'bg-[#030d1a] text-white selection:bg-amber-500/20'
          : 'bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white selection:bg-emerald-500/20'
    )}>

      {/* Global Noise Overlay */}
      <div className="pointer-events-none fixed inset-0 z-50 opacity-[0.015] dark:opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }} />

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
      />

      {isLoadingSettings ? (
        <PortalSkeleton />
      ) : (
        <main className="relative z-10 pt-32 md:pt-40 after:content-[''] after:block after:h-32 after:shrink-0 px-4 md:px-8 max-w-7xl mx-auto flex-1">
          {/* Title Section */}
          <div className="flex flex-col items-center text-center mb-16 md:mb-24 space-y-6 md:space-y-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/[0.03] dark:bg-white/5 border border-black/5 dark:border-white/10 shadow-lg backdrop-blur-md"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 dark:text-white/50">
                EKOSISTEM DIGITAL V{__APP_VERSION__}
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
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
                  ? <>Sokong pasukan anda. Pantau keputusan sukan secara langsung. <br className="hidden md:block" />Bawa semangat ke padang! 🏅</>
                  : <>Platform bersepadu untuk pengurusan kelab, perniagaan, dan aktiviti JPP Polisas. <br className="hidden md:block" />Bawa kepimpinan anda ke tahap seterusnya.</>
                }
              </p>

              {/* ── Event Banners ── */}
              <AnimatePresence>
                {supsasActive && !karnivalActive && (
                  <SupsasMegaBanner supsasEdition={supsasEdition} />
                )}
              </AnimatePresence>

              <AnimatePresence>
                {karnivalActive && (
                  <KarnivalMegaBanner karnivalStatus={karnivalStatus} />
                )}
              </AnimatePresence>

              {/* ── KAMSIS STATUS BANNER ── */}
              <AnimatePresence>
                {kamsisStatus && kamsisStatus !== 'OPT_OUT' && (() => {
                  const isAppeal = !!kamsisExtraData?.appeal_reason || kamsisStatus === 'APPEALING' || kamsisStatus === 'APPEAL_REJECTED';
                  const isResultOpen = kamsisToggles['kamsis_result_open'];
                  const isAppealResultOpen = kamsisToggles['kamsis_appeal_result_open'];
                  const isAppealOpen = kamsisToggles['kamsis_appeal_open'];

                  let displayStatus = kamsisStatus;

                  if (!isAppeal) {
                    // Normal phase
                    if (!isResultOpen) displayStatus = 'PENDING';
                  } else {
                    // Appeal phase
                    if (!isAppealResultOpen) displayStatus = 'APPEALING';
                  }

                  const canAppeal = kamsisStatus === 'REJECTED' && isResultOpen && isAppealOpen && !isAppeal;

                  return (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn(
                      "p-5 rounded-3xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm w-full backdrop-blur-md text-left mt-4",
                      displayStatus === 'APPROVED' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400" :
                        (displayStatus === 'REJECTED' || displayStatus === 'APPEAL_REJECTED') ? "bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-400" :
                          "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400"
                    )}>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/50 dark:bg-black/20 flex items-center justify-center shrink-0 shadow-sm">
                          <Building2 className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-black text-sm uppercase tracking-widest mb-0.5">Status Permohonan Asrama (KAMSIS)</h3>
                          <p className="text-xs font-bold opacity-80 leading-relaxed max-w-[250px] sm:max-w-none">
                            {displayStatus === 'APPROVED' ? 'Tahniah! Permohonan asrama anda telah DILULUSKAN.' :
                              displayStatus === 'REJECTED' ? 'Dukacita dimaklumkan permohonan asrama anda DITOLAK.' :
                                displayStatus === 'APPEAL_REJECTED' ? 'Dukacita dimaklumkan rayuan asrama anda DITOLAK.' :
                                  displayStatus === 'APPEALING' ? 'Rayuan anda sedang dalam proses semakan pihak pengurusan.' :
                                    'Permohonan anda sedang dalam proses semakan pihak pengurusan.'}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                        <Badge className={cn(
                          "border-none px-4 py-2 font-black uppercase tracking-widest text-[10px] w-full sm:w-auto justify-center shadow-md shrink-0",
                          displayStatus === 'APPROVED' ? "bg-emerald-500 text-white" :
                            (displayStatus === 'REJECTED' || displayStatus === 'APPEAL_REJECTED') ? "bg-rose-500 text-white" :
                              "bg-amber-500 text-white"
                        )}>
                          {displayStatus === 'APPROVED' ? 'LULUS' :
                            displayStatus === 'REJECTED' ? 'TOLAK' :
                              displayStatus === 'APPEAL_REJECTED' ? 'RAYUAN DITOLAK' :
                                displayStatus === 'APPEALING' ? 'RAYUAN DIPROSES' :
                                  'MENUNGGU KELULUSAN'}
                        </Badge>

                        {canAppeal && (
                          <button
                            onClick={() => setShowAppealModal(true)}
                            className="w-full sm:w-auto px-4 py-2 rounded-full bg-slate-800 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-md shrink-0"
                          >
                            Buat Rayuan
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>

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

          {/* Modules Grid */}
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8 lg:gap-10">
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
          </div>

          {/* Global Admin Status Line */}
          {isSuperAdmin && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="mt-20 flex flex-wrap justify-center items-center gap-x-12 gap-y-6 opacity-40 hover:opacity-100 transition-opacity duration-500"
            >
              <AdminStatusIndicator color="bg-emerald-400" label="Sistem Operasi (Live)" />
              <AdminStatusIndicator color="bg-amber-400" label="Pratonton Pentadbir" />
              <AdminStatusIndicator color="bg-black/20 dark:bg-white/20" label="Dalam Pembangunan" />
            </motion.div>
          )}
        </main>
      )}

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

    </div>
  );
}

function AdminStatusIndicator({ color, label }: { color: string, label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn("w-2 h-2 rounded-full", color, "shadow-[0_0_10px_rgba(0,0,0,0.1)] dark:shadow-[0_0_10px_rgba(255,255,255,0.2)]")} />
      <span className="text-[9px] font-black uppercase tracking-widest text-slate- dark:text-white/50">{label}</span>
    </div>
  );
}
