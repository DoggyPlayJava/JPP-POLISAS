import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import {
  Activity,
  RefreshCw,
  Loader2,
  AlertTriangle,
  ShieldCheck,
  ChevronRight,
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

export function JppTelemetryPage() {
  const { isSuperAdmin } = useAuth();
  const [data, setData] = useState<TelemetryData | null>(null);
  const [errorEvents, setErrorEvents] = useState<SystemErrorEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

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

      // Mandatory Promise.all for parallel fetching
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

  // Total active alerts count
  const allAlerts = data?.diagnostics
    ? [
        ...(data.diagnostics.polyrider?.alerts || []),
        ...(data.diagnostics.polymart?.alerts || []),
        ...(data.diagnostics.kebajikan?.alerts || []),
        ...(data.diagnostics.ai?.alerts || []),
        ...(data.diagnostics.database?.alerts || []),
      ]
    : [];

  // Build unified chronological timeline (Errors from system_error_events + Diagnostic alerts)
  const unifiedTimeline = buildUnifiedTimeline(
    errorEvents,
    data?.diagnostics,
    data?.timestamp
  );

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#08090D] text-slate-900 dark:text-white transition-colors duration-200">
      {/* Background radial glow */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-[15%] left-[25%] w-[40vw] h-[40vw] rounded-full blur-3xl opacity-[0.03] dark:opacity-[0.05] bg-blue-500" />
        <div className="absolute bottom-[5%] right-[10%] w-[30vw] h-[30vw] rounded-full blur-3xl opacity-[0.02] dark:opacity-[0.04] bg-emerald-500" />
      </div>

      <div className="relative z-10 max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* ── Top Header: Brand, Navigation & Refresh ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/[0.06]"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 dark:bg-orange-500/20 text-[#EA580C] dark:text-[#FB923C] flex items-center justify-center border border-orange-500/20 shadow-xs">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Sentinel Telemetry
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-200/70 dark:bg-white/10 text-slate-700 dark:text-white/70">
                  v3.4 Ops
                </span>
              </div>
              <p className="text-[11px] font-bold text-slate-400 dark:text-white/40">
                Pusat Pemantauan & Ketahanan Infrastruktur JPP-POLISAS
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            {lastRefresh && (
              <span className="text-[11px] text-slate-400 dark:text-white/30 font-medium font-mono hidden md:inline-block">
                Kemas kini: {lastRefresh.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
            <button
              onClick={fetchAllTelemetry}
              disabled={loading}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-white/[0.06] bg-slate-100/60 dark:bg-white/[0.02] shadow-2xs transition-all active:scale-95 disabled:opacity-40"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
              <span>Muat Semula</span>
            </button>
          </div>
        </motion.div>

        {/* ── Error Banner ── */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 flex items-center gap-3 text-rose-700 dark:text-rose-300 text-xs font-semibold"
          >
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-500" />
            <p>{error}</p>
          </motion.div>
        )}

        {/* ── Initial Loading State ── */}
        {loading && !data && (
          <div className="flex flex-col items-center justify-center py-36">
            <Loader2 className="w-9 h-9 animate-spin text-orange-500 mb-3" />
            <p className="text-xs font-bold text-slate-400 dark:text-white/30">
              Mengumpulkan telemetri dari pangkalan data Supabase & pelayan...
            </p>
          </div>
        )}

        {/* ── Main Command Center 3-Column Responsive Grid ── */}
        {data && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Lajur Kiri: Executive Health & Process Rail (3 / 12 cols) */}
            <div className="lg:col-span-3 order-1">
              <TelemetryLeftRail
                data={data}
                onRefresh={fetchAllTelemetry}
                loading={loading}
                totalAlertsCount={allAlerts.length}
              />
            </div>

            {/* Lajur Tengah: Topology Flow, Quick Metrics & Module Tabs (6 / 12 cols) */}
            <div className="lg:col-span-6 space-y-6 order-2">
              {/* Center Top: Aliran Topologi Interaktif */}
              <TelemetryTopologyFlow data={data} />

              {/* Center Middle: 4 Kad Ringkasan Pantas (Bottlenecks, DB, AI, Automation) */}
              <TelemetryQuickMetrics data={data} />

              {/* Center Bottom: Tab Navigasi Modul & Sejarah 30-Hari */}
              <TelemetryModuleTabs data={data} />
            </div>

            {/* Lajur Kanan: Live Incident & Error Timeline (3 / 12 cols) */}
            <div className="lg:col-span-3 order-3">
              <TelemetryLiveTimeline events={unifiedTimeline} loading={loading} />
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        {data && (
          <div className="pt-4 border-t border-slate-200/60 dark:border-white/[0.04] flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-400 dark:text-white/30 font-medium gap-2">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span className="font-bold uppercase tracking-wider">
                SUPER_ADMIN_JPP • Sesi Selamat Bersulit
              </span>
            </div>
            <div className="font-mono">
              Cap Masa Pelayan: {new Date(data.timestamp).toLocaleString('ms-MY')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
export default JppTelemetryPage;
