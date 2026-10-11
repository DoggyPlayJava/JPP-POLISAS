import React from 'react';
import { motion } from 'framer-motion';
import {
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { TelemetryData } from './telemetryTypes';
import { formatUptime } from './telemetryUtils';

interface TelemetryLeftRailProps {
  data: TelemetryData;
  onRefresh: () => void;
  loading: boolean;
  totalAlertsCount: number;
  onOpenIncidentsClick?: () => void;
}

export const TelemetryLeftRail: React.FC<TelemetryLeftRailProps> = ({
  data,
  onRefresh,
  loading,
  totalAlertsCount,
  onOpenIncidentsClick,
}) => {
  const { resilience_score, resilience_rating, resilience_deductions, server } = data;

  // Determine critical vs medium issues count
  const criticalCount = resilience_deductions.filter((d) => Math.abs(d.points) >= 15).length;
  const mediumCount = resilience_deductions.filter((d) => Math.abs(d.points) < 15).length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-6">
      {/* ── 1. Greeting Card (Soft Peach / Sunset Gradient like SentinelAI) ── */}
      <div className="rounded-2xl p-5 bg-gradient-to-br from-[#FFF0EB] via-[#FFE8E0] to-[#FFDDD2] border border-[#FFD2C4]/80 shadow-2xs relative overflow-hidden">
        <h2 className="text-xl font-black text-slate-900 tracking-tight leading-tight">
          Good morning,
          <br />
          Admin
        </h2>
        <p className="text-xs text-slate-700/90 font-medium leading-relaxed mt-2.5">
          {totalAlertsCount > 0
            ? `${totalAlertsCount} amaran integriti dikesan semalaman. Satu insiden memerlukan pengesahan anda.`
            : 'Sistem beroperasi pada mod kestabilan tinggi semalaman. Tiada insiden kritikal.'}
        </p>

        <button
          onClick={onOpenIncidentsClick || onRefresh}
          disabled={loading}
          className="mt-4 w-full py-2.5 px-4 rounded-xl text-xs font-black text-white bg-[#FF5B37] hover:bg-[#E84E2A] active:scale-[0.98] transition-all flex items-center justify-between shadow-xs disabled:opacity-50"
        >
          <span>{loading ? 'Menyegerak...' : 'Review Incident'}</span>
          <ArrowRight className="w-4 h-4 ml-1" />
        </button>
      </div>

      {/* ── 2. Security Score (Resilience Score) ── */}
      <div>
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
            Security Score
          </span>
          <span className="text-slate-400 font-mono">%</span>
        </div>

        <div className="flex items-baseline gap-1.5 my-1">
          <span className="text-4xl font-black text-slate-900 tracking-tight tabular-nums">
            {resilience_score}
          </span>
          <span className="text-sm font-bold text-slate-400">/100</span>
        </div>

        <div className="flex items-center gap-2 mt-1.5">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-200">
            {resilience_rating}
          </span>
        </div>

        {/* Trend Bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold mb-1">
            <span className="flex items-center gap-1 text-emerald-600 font-bold">
              <TrendingUp className="w-3 h-3" />
              +2.4% vs semalam
            </span>
            <span className="text-slate-400 font-mono">{resilience_score}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${resilience_score}%` }}
            />
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100" />

      {/* ── 3. Open Incidents ── */}
      <div>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-1">
          Open Incidents
        </span>

        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-[#EA580C] tabular-nums">
            {resilience_deductions.length}
          </span>
          <span className="text-xs font-bold text-slate-600">Perhatian diperlukan</span>
        </div>

        <div className="flex items-center gap-3 mt-2 text-[10px] font-bold text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            High: {criticalCount}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Medium: {mediumCount}
          </span>
        </div>
      </div>

      <div className="border-t border-slate-100" />

      {/* ── 4. Auto Resolution ── */}
      <div>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-1">
          Auto Resolution
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-slate-900 tabular-nums">94%</span>
        </div>
        <p className="text-[10px] text-slate-400 font-bold mt-1">
          +3% vs semalam • Cron & Snapshot Aktif
        </p>
      </div>

      <div className="border-t border-slate-100" />

      {/* ── 5. AI Confidence & Engine ── */}
      <div>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-1">
          AI Confidence
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-slate-900 tabular-nums">97%</span>
        </div>
        <p className="text-[10px] text-slate-400 font-bold mt-1">
          AI model confidence tinggi • PID {server.pid}
        </p>
      </div>
    </div>
  );
};
