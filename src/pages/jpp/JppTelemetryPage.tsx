import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
  RefreshCw,
  Loader2,
  AlertTriangle,
  X,
  ShieldAlert,
} from 'lucide-react';
import { cn, API_BASE_URL } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { TelemetryData, SystemErrorEvent } from './telemetry/telemetryTypes';
import { buildUnifiedTimeline } from './telemetry/telemetryUtils';
import { TelemetryLeftRail } from './telemetry/TelemetryLeftRail';
import { TelemetryTopologyFlow } from './telemetry/TelemetryTopologyFlow';
import { TelemetryLiveTimeline } from './telemetry/TelemetryLiveTimeline';
import { TelemetryQuickMetrics } from './telemetry/TelemetryQuickMetrics';
import { TelemetryModuleTabs } from './telemetry/TelemetryModuleTabs';
import { useTranslation } from 'react-i18next';

type TopNavTab = 'overview' | 'alerts' | 'insights' | 'modules';

export function JppTelemetryPage() {
  const { t } = useTranslation(['jpp', 'common']);
  const { isSuperAdmin, user } = useAuth();
  const [data, setData] = useState<TelemetryData | null>(null);
  const [errorEvents, setErrorEvents] = useState<SystemErrorEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [currentTab, setCurrentTab] = useState<TopNavTab>('overview');
  const [showIncidentModal, setShowIncidentModal] = useState(false);

  // Parallel fetch: Telemetry metrics + Crash & error logs
  const fetchAllTelemetry = async () => {
    setLoading(true);
    setError('');
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error(t('jpp:telemetry_session_expired', 'Sesi tamat tempoh. Sila log masuk semula.'));

      const baseUrl = import.meta.env.VITE_API_BASE_URL || API_BASE_URL || '';
      const headers = { Authorization: `Bearer ${session.access_token}` };

      const [telemetryRes, errorsRes] = await Promise.all([
        fetch(`${baseUrl}/api/system-telemetry`, { headers }),
        fetch(`${baseUrl}/api/system-errors?limit=25`, { headers }).catch(() => null),
      ]);

      if (!telemetryRes.ok) {
        const errJson = await telemetryRes.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${telemetryRes.status}`);
      }

      const telemetryJson: TelemetryData = await telemetryRes.json();
      setData(telemetryJson);

      if (errorsRes && errorsRes.ok) {
        const errorsJson = await errorsRes.json().catch(() => ({ errors: [] }));
        setErrorEvents(errorsJson.errors || []);
      }

      setLastRefresh(new Date());
    } catch (e: any) {
      setError(e.message || t('jpp:telemetry_fetch_error', 'Gagal memuatkan data telemetri.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllTelemetry();
  }, []);

  // RBAC Guard: Only SUPER_ADMIN_JPP
  if (!isSuperAdmin) return <Navigate to="/jpp" replace />;

  const allAlerts = data?.diagnostics
    ? [
        ...(data.diagnostics.polyrider?.alerts || []),
        ...(data.diagnostics.polymart?.alerts || []),
        ...(data.diagnostics.kebajikan?.alerts || []),
        ...(data.diagnostics.ai?.alerts || []),
        ...(data.diagnostics.database?.alerts || []),
      ]
    : [];

  const unifiedTimeline = buildUnifiedTimeline(
    errorEvents,
    data?.diagnostics,
    data?.timestamp
  );

  return (
    <div className="min-h-screen bg-[#F8F6EE]/60 dark:bg-[#151D16] text-slate-800 dark:text-slate-100 p-4 lg:p-6 transition-colors font-sans antialiased">
      <div className="max-w-[1560px] mx-auto space-y-4">
        {/* ── Top Navigation Bar (Exact SentinelAI Image 3 Style) ── */}
        <div className="bg-white dark:bg-[#1C261D] rounded-2xl border border-slate-200/90 dark:border-white/10 shadow-2xs px-5 py-3 flex items-center justify-between">
          {/* Left: SentinelAI Logo & Title */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FF5B37] flex items-center justify-center text-white shadow-2xs">
              <span className="font-black text-sm">S</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                SentinelAI
              </span>
              <span className="text-[10px] font-bold text-slate-400 dark:text-white/40 hidden sm:inline">
                • JPP Telemetry
              </span>
            </div>
          </div>

          {/* Center: Floating Pill Navigation Tabs */}
          <div className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200/60 dark:border-white/10">
            {(
              [
                { id: 'overview', label: t('jpp:telemetry_tab_overview', 'Overview') },
                { id: 'alerts', label: t('jpp:telemetry_tab_alerts', 'Key Alerts') },
                { id: 'insights', label: t('jpp:telemetry_tab_insights', 'Insights') },
                { id: 'modules', label: t('jpp:telemetry_tab_modules', 'Modul Kampus') },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={cn(
                  'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all',
                  currentTab === tab.id
                    ? 'bg-[#FFEDE7] dark:bg-[#FF5B37]/20 text-[#FF5B37] font-black shadow-2xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Right: Environment Pill, Notif Bell & Avatar */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>{t('jpp:telemetry_env_production', 'Production — POLISAS')}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </div>

            <button
              onClick={fetchAllTelemetry}
              disabled={loading}
              title={t('jpp:telemetry_reload_tooltip', 'Muat Semula Telemetri')}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all disabled:opacity-40"
            >
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </button>

            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 relative">
              <Bell className="w-4 h-4" />
              {allAlerts.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#FF5B37]" />
              )}
            </div>

            <div className="w-8 h-8 rounded-full bg-[#E0E7FF] text-[#4F46E5] flex items-center justify-center font-black text-xs">
              HZ
            </div>
          </div>
        </div>

        {/* ── Error Banner ── */}
        {error && (
          <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 flex items-center gap-3 text-rose-700 text-xs font-semibold">
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-500" />
            <p>{error}</p>
          </div>
        )}

        {/* ── Loading Skeleton Screen ── */}
        {loading && !data && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch animate-pulse">
            {/* Left Rail Skeleton (3/12) */}
            <div className="lg:col-span-3 space-y-4">
              <div className="bg-white dark:bg-[#1C261D] rounded-2xl border border-slate-200/90 dark:border-white/10 p-5 space-y-4">
                <div className="h-6 w-32 bg-slate-200 dark:bg-white/10 rounded-lg" />
                <div className="h-28 w-28 bg-slate-200 dark:bg-white/10 rounded-full mx-auto" />
                <div className="space-y-2 pt-2">
                  <div className="h-4 w-full bg-slate-200/60 dark:bg-white/5 rounded" />
                  <div className="h-4 w-3/4 bg-slate-200/60 dark:bg-white/5 rounded" />
                </div>
              </div>
              <div className="bg-white dark:bg-[#1C261D] rounded-2xl border border-slate-200/90 dark:border-white/10 p-4 space-y-2">
                <div className="h-4 w-28 bg-slate-200 dark:bg-white/10 rounded" />
                <div className="h-8 w-full bg-slate-200/60 dark:bg-white/5 rounded-xl" />
              </div>
            </div>

            {/* Center Topology + Quick Metrics Skeleton (6/12) */}
            <div className="lg:col-span-6 space-y-5 flex flex-col justify-between">
              <div className="bg-white dark:bg-[#1C261D] rounded-2xl border border-slate-200/90 dark:border-white/10 p-6 space-y-4 min-h-[260px] flex flex-col justify-between">
                <div className="h-5 w-44 bg-slate-200 dark:bg-white/10 rounded" />
                <div className="grid grid-cols-3 gap-4 py-6">
                  <div className="h-20 bg-slate-200/60 dark:bg-white/5 rounded-2xl" />
                  <div className="h-20 bg-slate-200/60 dark:bg-white/5 rounded-2xl" />
                  <div className="h-20 bg-slate-200/60 dark:bg-white/5 rounded-2xl" />
                </div>
                <div className="h-4 w-1/2 bg-slate-200/40 dark:bg-white/5 rounded" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((k) => (
                  <div key={k} className="bg-white dark:bg-[#1C261D] rounded-2xl border border-slate-200/90 dark:border-white/10 p-4 space-y-2">
                    <div className="h-3 w-16 bg-slate-200 dark:bg-white/10 rounded" />
                    <div className="h-6 w-12 bg-slate-200 dark:bg-white/10 rounded font-mono" />
                  </div>
                ))}
              </div>
            </div>

            {/* Right Live Timeline Skeleton (3/12) */}
            <div className="lg:col-span-3">
              <div className="bg-white dark:bg-[#1C261D] rounded-2xl border border-slate-200/90 dark:border-white/10 p-5 space-y-4 min-h-full">
                <div className="h-5 w-32 bg-slate-200 dark:bg-white/10 rounded" />
                <div className="space-y-3 pt-2">
                  {[1, 2, 3, 4, 5].map((idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-100/60 dark:bg-white/5 space-y-2">
                      <div className="h-3 w-20 bg-slate-200 dark:bg-white/10 rounded" />
                      <div className="h-3 w-full bg-slate-200/60 dark:bg-white/5 rounded" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab 1: Overview (The Exact SentinelAI Dashboard Image 3) ── */}
        {data && currentTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Left Column: Greeting, Security Score, Open Incidents, Auto Resolution (3/12) */}
            <div className="lg:col-span-3">
              <TelemetryLeftRail
                data={data}
                onRefresh={fetchAllTelemetry}
                loading={loading}
                totalAlertsCount={allAlerts.length}
                onOpenIncidentsClick={() => setShowIncidentModal(true)}
              />
            </div>

            {/* Center Column: Threat Overview Topology + 4-Column Row (6/12) */}
            <div className="lg:col-span-6 space-y-5 flex flex-col justify-between">
              <TelemetryTopologyFlow data={data} />
              <TelemetryQuickMetrics
                data={data}
                onViewThreatsClick={() => setShowIncidentModal(true)}
                onViewAutomationClick={() => setCurrentTab('modules')}
              />
            </div>

            {/* Right Column: Live Timeline (3/12) */}
            <div className="lg:col-span-3">
              <TelemetryLiveTimeline
                events={unifiedTimeline}
                loading={loading}
                onViewAllClick={() => setShowIncidentModal(true)}
              />
            </div>
          </div>
        )}

        {/* ── Tab 2: Modul Kampus & DB Deep-Dive ── */}
        {data && (currentTab === 'modules' || currentTab === 'insights') && (
          <div className="space-y-4">
            <TelemetryModuleTabs data={data} />
          </div>
        )}

        {/* ── Tab 3: Key Alerts Modal / View ── */}
        {data && currentTab === 'alerts' && (
          <div className="bg-white dark:bg-[#1C261D] rounded-2xl border border-slate-200/90 dark:border-white/10 shadow-xs p-6 space-y-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              {t('jpp:telemetry_alerts_list_title', 'Senarai Lengkap Amaran Aktif & Ralat Sistem')}
            </h3>
            <div className="space-y-2">
              {unifiedTimeline.map((ev, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl border border-slate-200 dark:border-white/10 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{ev.title}</span>
                    <span className="text-[10px] text-slate-400 dark:text-white/40 block font-mono">{ev.source}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                    {ev.badge}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Incident Detail Modal ── */}
        <AnimatePresence>
          {showIncidentModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-[#1C261D] rounded-2xl border border-slate-200 dark:border-white/10 shadow-xl max-w-lg w-full p-6 space-y-4 text-slate-900 dark:text-white"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-[#FF5B37]" />
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      {t('jpp:telemetry_incident_modal_title', 'Perincian Insiden & Tolak-Mata')}
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowIncidentModal(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200/60 dark:border-white/10 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{t('jpp:telemetry_resilience_score', 'Skor Ketahanan:')}</span>
                    <span className="text-base font-black text-slate-900 dark:text-white">
                      {data?.resilience_score} / 100 ({data?.resilience_rating})
                    </span>
                  </div>

                  <span className="text-[11px] font-black uppercase text-slate-400 dark:text-white/40 block">
                    {t('jpp:telemetry_detailed_penalties', 'Penalti Terperinci (Backend Rules):')}
                  </span>

                  {data?.resilience_deductions && data.resilience_deductions.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {data.resilience_deductions.map((ded, i) => (
                        <div
                          key={i}
                          className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 text-xs flex justify-between items-center"
                        >
                          <span className="font-medium">{ded.label}</span>
                          <span className="font-mono font-black">{ded.points}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                      {t('jpp:telemetry_no_penalties', 'Tiada sebarang penalti dikesan pada waktu ini.')}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-white/10 flex justify-end">
                  <button
                    onClick={() => setShowIncidentModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-black bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
                  >
                    {t('jpp:telemetry_close_btn', 'Tutup')}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default JppTelemetryPage;
