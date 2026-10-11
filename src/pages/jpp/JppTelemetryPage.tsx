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

type TopNavTab = 'overview' | 'alerts' | 'insights' | 'modules';

export function JppTelemetryPage() {
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
      if (!session?.access_token) throw new Error('Sesi tamat tempoh. Sila log masuk semula.');

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
      setError(e.message || 'Gagal memuatkan data telemetri.');
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
    <div className="min-h-screen bg-[#ECEEF2] text-slate-800 p-4 lg:p-6 transition-colors font-sans antialiased">
      <div className="max-w-[1560px] mx-auto space-y-4">
        {/* ── Top Navigation Bar (Exact SentinelAI Image 3 Style) ── */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs px-5 py-3 flex items-center justify-between">
          {/* Left: SentinelAI Logo & Title */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FF5B37] flex items-center justify-center text-white shadow-2xs">
              <span className="font-black text-sm">S</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-black text-slate-900 tracking-tight">
                SentinelAI
              </span>
              <span className="text-[10px] font-bold text-slate-400 hidden sm:inline">
                • JPP Telemetry
              </span>
            </div>
          </div>

          {/* Center: Floating Pill Navigation Tabs */}
          <div className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-slate-50 border border-slate-200/60">
            {(
              [
                { id: 'overview', label: 'Overview' },
                { id: 'alerts', label: 'Key Alerts' },
                { id: 'insights', label: 'Insights' },
                { id: 'modules', label: 'Modul Kampus' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={cn(
                  'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all',
                  currentTab === tab.id
                    ? 'bg-[#FFEDE7] text-[#FF5B37] font-black shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
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
              <span>Production — POLISAS</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </div>

            <button
              onClick={fetchAllTelemetry}
              disabled={loading}
              title="Muat Semula Telemetri"
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

        {/* ── Loading State ── */}
        {loading && !data && (
          <div className="flex flex-col items-center justify-center py-36">
            <Loader2 className="w-9 h-9 animate-spin text-[#FF5B37] mb-3" />
            <p className="text-xs font-bold text-slate-400">
              Menghubungkan ke rangkaian SentinelAI & Pangkalan Data POLISAS...
            </p>
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
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4">
            <h3 className="text-base font-black text-slate-900">
              Senarai Lengkap Amaran Aktif & Ralat Sistem
            </h3>
            <div className="space-y-2">
              {unifiedTimeline.map((ev, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-800">{ev.title}</span>
                    <span className="text-[10px] text-slate-400 block font-mono">{ev.source}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-slate-100 text-slate-700">
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
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-[#FF5B37]" />
                    <h3 className="text-base font-black text-slate-900">
                      Perincian Insiden & Tolak-Mata
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowIncidentModal(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600">Skor Ketahanan:</span>
                    <span className="text-base font-black text-slate-900">
                      {data?.resilience_score} / 100 ({data?.resilience_rating})
                    </span>
                  </div>

                  <span className="text-[11px] font-black uppercase text-slate-400 block">
                    Penalti Terperinci (Backend Rules):
                  </span>

                  {data?.resilience_deductions && data.resilience_deductions.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {data.resilience_deductions.map((ded, i) => (
                        <div
                          key={i}
                          className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex justify-between items-center"
                        >
                          <span className="font-medium">{ded.label}</span>
                          <span className="font-mono font-black">{ded.points}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-emerald-600 font-bold">
                      Tiada sebarang penalti dikesan pada waktu ini.
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => setShowIncidentModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-black bg-slate-900 text-white hover:bg-slate-800"
                  >
                    Tutup
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
