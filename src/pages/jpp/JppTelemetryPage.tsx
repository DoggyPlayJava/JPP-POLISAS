import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import {
  Activity,
  Bell,
  RefreshCw,
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

function getInitials(name?: string | null, email?: string | null): string {
  const source = (name || '').trim() || (email || '').split('@')[0] || 'JPP';
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function JppTelemetryPage() {
  const { t, i18n } = useTranslation(['jpp', 'common']);
  const { isSuperAdmin, user, profile } = useAuth();
  const [data, setData] = useState<TelemetryData | null>(null);
  const [errorEvents, setErrorEvents] = useState<SystemErrorEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [currentTab, setCurrentTab] = useState<TopNavTab>('overview');
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [routeFilter, setRouteFilter] = useState<string | null>(null);

  // Parallel fetch: Telemetry metrics + Crash & error logs
  const fetchAllTelemetry = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error(t('jpp:telemetry_session_expired', 'Sesi tamat tempoh. Sila log masuk semula.'));
      }

      const baseUrl = import.meta.env.VITE_API_BASE_URL || API_BASE_URL || '';
      const headers = { Authorization: `Bearer ${session.access_token}` };

      const [telemetryRes, errorsRes] = await Promise.all([
        fetch(`${baseUrl}/api/system-telemetry`, { headers }),
        fetch(`${baseUrl}/api/system-errors?limit=25`, { headers }).catch(() => null),
      ]);

      if (!telemetryRes.ok) {
        const errJson = await telemetryRes.json().catch(() => ({}));
        throw new Error(
          errJson.error || t('jpp:telemetry_http_status', 'HTTP {{status}}', { status: telemetryRes.status })
        );
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
  }, [t]);

  useEffect(() => {
    fetchAllTelemetry();
  }, [fetchAllTelemetry]);

  useEffect(() => {
    if (!showIncidentModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowIncidentModal(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showIncidentModal]);

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

  const adminName = profile?.full_name?.trim() || user?.email?.split('@')[0] || t('jpp:telemetry_rail_admin', 'Admin');
  const adminInitials = getInitials(profile?.full_name, user?.email);

  const navTabs = [
    { id: 'overview', label: t('jpp:telemetry_tab_overview', 'Overview') },
    { id: 'alerts', label: t('jpp:telemetry_tab_alerts', 'Key Alerts'), count: allAlerts.length },
    { id: 'insights', label: t('jpp:telemetry_tab_insights', 'Insights') },
    { id: 'modules', label: t('jpp:telemetry_tab_modules', 'Modul Kampus') },
  ] as const;

  const formattedLastRefresh = lastRefresh
    ? lastRefresh.toLocaleTimeString(i18n.language.startsWith('en') ? 'en-MY' : 'ms-MY', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null;

  return (
    <div className="min-h-[100dvh] bg-[#F6FBF9] dark:bg-[#090B0E] text-[#0B2420] dark:text-[#F1F5F9] p-4 lg:p-6 font-sans antialiased">
      <div className="max-w-[1560px] mx-auto space-y-4">
        {/* ── Top Command Bar (JPP POLISAS System Telemetry) ── */}
        <header className="bg-white dark:bg-[#13171D] rounded-2xl border border-[#B8E4DC] dark:border-[#252B35] shadow-surface-sm px-4 sm:px-5 py-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            {/* Left: Official JPP POLISAS System Telemetry Brand */}
            <div className="flex items-center gap-2.5 min-w-0 shrink-0">
              <div className="w-9 h-9 rounded-xl bg-[#0F766E] dark:bg-[#2DD4BF]/15 border border-[#0F766E]/20 dark:border-[#2DD4BF]/30 flex items-center justify-center text-white dark:text-[#2DD4BF] shrink-0">
                <Activity className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-bold text-[#0B2420] dark:text-[#F1F5F9] tracking-tight whitespace-nowrap">
                  JPP Telemetry
                </h1>
                <p className="text-xs font-medium text-[#3B635C] dark:text-[#94A0B2] whitespace-nowrap">
                  {formattedLastRefresh
                    ? `POLISAS • ${formattedLastRefresh}`
                    : t('jpp:telemetry_env_production', 'Production — POLISAS')}
                </p>
              </div>
            </div>

            {/* Desktop Center: Navigation Pill Bar */}
            <nav
              aria-label="Navigasi Telemetri"
              role="tablist"
              className="hidden lg:flex items-center gap-1 p-1 rounded-xl bg-[#F6FBF9] dark:bg-[#0E1116] border border-[#B8E4DC] dark:border-[#252B35] min-w-0 overflow-x-auto scrollbar-hide"
            >
              {navTabs.map((tab) => {
                const active = currentTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setCurrentTab(tab.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-semibold transition-[transform,opacity,background-color,color] duration-200 ease-apple-out active:scale-[0.98] flex items-center gap-1.5 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] dark:focus-visible:ring-[#2DD4BF]',
                      active
                        ? 'bg-[#0F766E] text-white dark:bg-[#1B2028] dark:text-[#2DD4BF] shadow-surface-sm'
                        : 'text-[#3B635C] dark:text-[#94A0B2] hover:text-[#0B2420] dark:hover:text-[#F1F5F9] hover:bg-[#EBF7F4] dark:hover:bg-[#1B2028]/60'
                    )}
                  >
                    <span>{tab.label}</span>
                    {'count' in tab && tab.count > 0 && (
                      <span
                        className={cn(
                          'px-1.5 py-0.5 rounded-full text-xs font-semibold font-mono tabular-nums leading-none',
                          active
                            ? 'bg-white/20 text-white dark:bg-[#2DD4BF]/20 dark:text-[#2DD4BF]'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'
                        )}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Right: Environment Badge, Reload, Wired Incident Alerts Bell & Signed-In SuperAdmin */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="hidden 2xl:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EBF7F4] dark:bg-[#1B2028] text-[#0B2420] dark:text-[#F1F5F9] text-xs font-medium border border-[#B8E4DC] dark:border-[#252B35]">
                <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400" aria-hidden="true" />
                <span>{t('jpp:telemetry_env_production', 'Production — POLISAS')}</span>
              </div>

              <button
                type="button"
                onClick={fetchAllTelemetry}
                disabled={loading}
                aria-label={t('jpp:telemetry_reload_tooltip', 'Muat Semula Telemetri')}
                title={t('jpp:telemetry_reload_tooltip', 'Muat Semula Telemetri')}
                className="w-9 h-9 rounded-full flex items-center justify-center bg-[#F6FBF9] dark:bg-[#1B2028] border border-[#B8E4DC] dark:border-[#252B35] text-[#3B635C] dark:text-[#94A0B2] hover:text-[#0B2420] dark:hover:text-[#F1F5F9] hover:bg-[#EBF7F4] dark:hover:bg-[#232933] transition-[transform,opacity,background-color] duration-200 active:scale-[0.97] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] dark:focus-visible:ring-[#2DD4BF]"
              >
                <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin motion-reduce:animate-none')} aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => setShowIncidentModal(true)}
                aria-label={t('jpp:telemetry_incident_modal_title', 'Perincian Insiden & Tolak-Mata')}
                title={t('jpp:telemetry_incident_modal_title', 'Perincian Insiden & Tolak-Mata')}
                className="w-9 h-9 rounded-full bg-[#F6FBF9] dark:bg-[#1B2028] border border-[#B8E4DC] dark:border-[#252B35] flex items-center justify-center text-[#3B635C] dark:text-[#94A0B2] hover:text-[#0B2420] dark:hover:text-[#F1F5F9] hover:bg-[#EBF7F4] dark:hover:bg-[#232933] relative transition-[transform,opacity,background-color] duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] dark:focus-visible:ring-[#2DD4BF]"
              >
                <Bell className="w-4 h-4" aria-hidden="true" />
                {allAlerts.length > 0 && (
                  <span
                    className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-600 dark:bg-rose-400"
                    aria-hidden="true"
                  />
                )}
              </button>

              <div
                title={adminName}
                aria-label={adminName}
                className="h-9 px-2.5 rounded-full bg-[#EBF7F4] dark:bg-[#1B2028] border border-[#B8E4DC] dark:border-[#252B35] text-[#0F766E] dark:text-[#2DD4BF] flex items-center gap-2"
              >
                <span className="font-bold text-xs tracking-wide">{adminInitials}</span>
                <span className="hidden sm:inline text-xs font-medium text-[#0B2420] dark:text-[#F1F5F9] max-w-[120px] truncate">
                  {adminName}
                </span>
              </div>
            </div>
          </div>

          {/* Mobile & Tablet Horizontal Scrollable Pill Tab Bar */}
          <nav
            aria-label="Navigasi Tab Telemetri Mudah Alih"
            role="tablist"
            className="flex lg:hidden items-center gap-1.5 p-1 rounded-xl bg-[#F6FBF9] dark:bg-[#0E1116] border border-[#B8E4DC] dark:border-[#252B35] overflow-x-auto scrollbar-hide"
          >
            {navTabs.map((tab) => {
              const active = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setCurrentTab(tab.id)}
                  className={cn(
                    'px-3.5 py-2 rounded-lg text-xs font-semibold transition-[transform,opacity,background-color,color] duration-200 ease-apple-out active:scale-[0.98] flex items-center gap-1.5 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] dark:focus-visible:ring-[#2DD4BF]',
                    active
                      ? 'bg-[#0F766E] text-white dark:bg-[#1B2028] dark:text-[#2DD4BF] shadow-surface-sm'
                      : 'text-[#3B635C] dark:text-[#94A0B2] hover:text-[#0B2420] dark:hover:text-[#F1F5F9]'
                  )}
                >
                  <span>{tab.label}</span>
                  {'count' in tab && tab.count > 0 && (
                    <span
                      className={cn(
                        'px-1.5 py-0.5 rounded-full text-xs font-semibold font-mono tabular-nums leading-none',
                        active
                          ? 'bg-white/20 text-white dark:bg-[#2DD4BF]/20 dark:text-[#2DD4BF]'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'
                      )}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </header>

        {/* ── Error Banner ── */}
        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-rose-300 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/30 p-4 flex items-center gap-3 text-rose-800 dark:text-rose-200 text-xs font-semibold"
          >
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" aria-hidden="true" />
            <p>{error}</p>
          </div>
        )}

        {/* ── Loading Skeleton Screen ── */}
        {loading && !data && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch animate-pulse motion-reduce:animate-none">
            {/* Left Rail Skeleton (3/12) */}
            <div className="lg:col-span-3 space-y-4">
              <div className="bg-white dark:bg-[#13171D] rounded-2xl border border-[#B8E4DC] dark:border-[#252B35] p-5 space-y-4">
                <div className="h-6 w-32 bg-[#EBF7F4] dark:bg-[#1B2028] rounded-lg" />
                <div className="h-28 w-28 bg-[#EBF7F4] dark:bg-[#1B2028] rounded-full mx-auto" />
                <div className="space-y-2 pt-2">
                  <div className="h-4 w-full bg-[#EBF7F4] dark:bg-[#1B2028] rounded" />
                  <div className="h-4 w-3/4 bg-[#EBF7F4] dark:bg-[#1B2028] rounded" />
                </div>
              </div>
              <div className="bg-white dark:bg-[#13171D] rounded-2xl border border-[#B8E4DC] dark:border-[#252B35] p-4 space-y-2">
                <div className="h-4 w-28 bg-[#EBF7F4] dark:bg-[#1B2028] rounded" />
                <div className="h-8 w-full bg-[#EBF7F4] dark:bg-[#1B2028] rounded-xl" />
              </div>
            </div>

            {/* Center Topology + Quick Metrics Skeleton (6/12) */}
            <div className="lg:col-span-6 space-y-5 flex flex-col justify-between">
              <div className="bg-white dark:bg-[#13171D] rounded-2xl border border-[#B8E4DC] dark:border-[#252B35] p-6 space-y-4 min-h-[260px] flex flex-col justify-between">
                <div className="h-5 w-44 bg-[#EBF7F4] dark:bg-[#1B2028] rounded" />
                <div className="grid grid-cols-3 gap-4 py-6">
                  <div className="h-20 bg-[#EBF7F4] dark:bg-[#1B2028] rounded-2xl" />
                  <div className="h-20 bg-[#EBF7F4] dark:bg-[#1B2028] rounded-2xl" />
                  <div className="h-20 bg-[#EBF7F4] dark:bg-[#1B2028] rounded-2xl" />
                </div>
                <div className="h-4 w-1/2 bg-[#EBF7F4] dark:bg-[#1B2028] rounded" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((k) => (
                  <div
                    key={k}
                    className="bg-white dark:bg-[#13171D] rounded-2xl border border-[#B8E4DC] dark:border-[#252B35] p-4 space-y-2"
                  >
                    <div className="h-3 w-16 bg-[#EBF7F4] dark:bg-[#1B2028] rounded" />
                    <div className="h-6 w-12 bg-[#EBF7F4] dark:bg-[#1B2028] rounded font-mono" />
                  </div>
                ))}
              </div>
            </div>

            {/* Right Live Timeline Skeleton (3/12) */}
            <div className="lg:col-span-3">
              <div className="bg-white dark:bg-[#13171D] rounded-2xl border border-[#B8E4DC] dark:border-[#252B35] p-5 space-y-4 min-h-full">
                <div className="h-5 w-32 bg-[#EBF7F4] dark:bg-[#1B2028] rounded" />
                <div className="space-y-3 pt-2">
                  {[1, 2, 3, 4, 5].map((idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-[#F6FBF9] dark:bg-[#0E1116] space-y-2">
                      <div className="h-3 w-20 bg-[#EBF7F4] dark:bg-[#1B2028] rounded" />
                      <div className="h-3 w-full bg-[#EBF7F4] dark:bg-[#1B2028] rounded" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab 1: Overview ── */}
        {data && currentTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            <div className="lg:col-span-3">
              <TelemetryLeftRail
                data={data}
                adminName={adminName}
                onRefresh={fetchAllTelemetry}
                loading={loading}
                totalAlertsCount={allAlerts.length}
                onOpenIncidentsClick={() => setShowIncidentModal(true)}
              />
            </div>

            <div className="lg:col-span-6 space-y-5 flex flex-col justify-between min-w-0">
              <TelemetryTopologyFlow
                data={data}
                onFilterTimelineByRoute={(route) => setRouteFilter(route)}
              />
              <TelemetryQuickMetrics
                data={data}
                onViewThreatsClick={() => setShowIncidentModal(true)}
                onViewAutomationClick={() => setCurrentTab('modules')}
              />
            </div>

            <div className="lg:col-span-3 min-w-0">
              <TelemetryLiveTimeline
                events={unifiedTimeline}
                loading={loading}
                routeFilter={routeFilter}
                onClearRouteFilter={() => setRouteFilter(null)}
                onViewAllClick={() => setCurrentTab('alerts')}
              />
            </div>
          </div>
        )}

        {/* ── Tab 2: Modul Kampus & Insights Deep-Dive ── */}
        {data && (currentTab === 'modules' || currentTab === 'insights') && (
          <div className="space-y-4">
            <TelemetryModuleTabs data={data} />
          </div>
        )}

        {/* ── Tab 3: Key Alerts View ── */}
        {data && currentTab === 'alerts' && (
          <section className="bg-white dark:bg-[#13171D] rounded-2xl border border-[#B8E4DC] dark:border-[#252B35] shadow-surface-sm p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#B8E4DC]/60 dark:border-[#252B35]">
              <h2 className="text-base font-bold text-[#0B2420] dark:text-[#F1F5F9] [text-wrap:balance]">
                {t('jpp:telemetry_alerts_list_title', 'Senarai Lengkap Amaran Aktif & Ralat Sistem')}
              </h2>
              <button
                type="button"
                onClick={() => setShowIncidentModal(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#EBF7F4] dark:bg-[#1B2028] text-[#0F766E] dark:text-[#2DD4BF] border border-[#B8E4DC] dark:border-[#252B35] hover:bg-[#0F766E] hover:text-white dark:hover:bg-[#232933] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] dark:focus-visible:ring-[#2DD4BF]"
              >
                {t('jpp:telemetry_incident_modal_title', 'Perincian Insiden & Tolak-Mata')}
              </button>
            </div>
            <div className="space-y-2.5">
              {unifiedTimeline.map((ev, i) => (
                <div
                  key={ev.id || i}
                  className="p-3.5 rounded-xl bg-[#F6FBF9] dark:bg-[#0E1116] border border-[#B8E4DC]/80 dark:border-[#252B35] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-[#0B2420] dark:text-[#F1F5F9] break-words">{ev.title}</p>
                    <p className="text-xs text-[#3B635C] dark:text-[#94A0B2] font-mono mt-0.5 truncate">
                      {ev.source} {ev.pagePath ? `• ${ev.pagePath}` : ''}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider shrink-0 self-start sm:self-center border',
                      ev.severity === 'CRITICAL'
                        ? 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30'
                        : ev.severity === 'WARNING'
                        ? 'bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-500/30'
                        : 'bg-[#EBF7F4] dark:bg-[#1B2028] text-[#0F766E] dark:text-[#2DD4BF] border-[#B8E4DC] dark:border-[#252B35]'
                    )}
                  >
                    {ev.badge}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Incident Detail Modal ── */}
        <AnimatePresence>
          {showIncidentModal && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
              role="dialog"
              aria-modal="true"
              aria-labelledby="telemetry-incident-modal-title"
              onClick={() => setShowIncidentModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-[#13171D] rounded-2xl border border-[#B8E4DC] dark:border-[#252B35] shadow-surface-lg max-w-lg w-full p-5 sm:p-6 space-y-4 text-[#0B2420] dark:text-[#F1F5F9] max-h-[88dvh] overflow-y-auto overscroll-contain"
              >
                <div className="flex items-center justify-between pb-3 border-b border-[#B8E4DC]/60 dark:border-[#252B35]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#EBF7F4] dark:bg-[#1B2028] border border-[#B8E4DC] dark:border-[#252B35] flex items-center justify-center text-[#0F766E] dark:text-[#2DD4BF]">
                      <ShieldAlert className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <h3
                      id="telemetry-incident-modal-title"
                      className="text-base font-bold text-[#0B2420] dark:text-[#F1F5F9]"
                    >
                      {t('jpp:telemetry_incident_modal_title', 'Perincian Insiden & Tolak-Mata')}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowIncidentModal(false)}
                    aria-label={t('jpp:telemetry_close_btn', 'Tutup')}
                    className="p-1.5 rounded-lg text-[#3B635C] dark:text-[#94A0B2] hover:bg-[#EBF7F4] dark:hover:bg-[#1B2028] hover:text-[#0B2420] dark:hover:text-[#F1F5F9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] dark:focus-visible:ring-[#2DD4BF]"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-[#F6FBF9] dark:bg-[#0E1116] border border-[#B8E4DC] dark:border-[#252B35] flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#3B635C] dark:text-[#94A0B2]">
                      {t('jpp:telemetry_resilience_score', 'Skor Ketahanan:')}
                    </span>
                    <span className="text-base font-bold font-mono tabular-nums text-[#0B2420] dark:text-[#F1F5F9]">
                      {data?.resilience_score ?? 0} / 100 ({data?.resilience_rating ?? '-'})
                    </span>
                  </div>

                  <span className="text-xs font-semibold uppercase tracking-wider text-[#3B635C] dark:text-[#94A0B2] block">
                    {t('jpp:telemetry_detailed_penalties', 'Penalti Terperinci (Backend Rules):')}
                  </span>

                  {data?.resilience_deductions && data.resilience_deductions.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto overscroll-contain pr-1">
                      {data.resilience_deductions.map((ded, i) => (
                        <div
                          key={ded.code || i}
                          className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs flex justify-between items-center gap-3"
                        >
                          <span className="font-medium">{ded.label}</span>
                          <span className="font-mono font-bold tabular-nums shrink-0">{ded.points}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#0F766E] dark:text-[#2DD4BF] font-semibold">
                      {t('jpp:telemetry_no_penalties', 'Tiada sebarang penalti dikesan pada waktu ini.')}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-[#B8E4DC]/60 dark:border-[#252B35] flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowIncidentModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#0F766E] hover:bg-[#0D665F] dark:bg-[#2DD4BF] dark:hover:bg-[#14B8A6] text-white dark:text-[#090B0E] transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] dark:focus-visible:ring-[#2DD4BF]"
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
