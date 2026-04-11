import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  Users, Flag, BarChart3, Activity, Database,
  TrendingUp, Shield, Clock, FileText, Loader2,
} from 'lucide-react';
import { hexToRgba } from '@/lib/utils';
import { JPP_THEME_DEFAULT_COLOR, JPP_MODULE_ID, UNIT_CFG, UNIT_ORDER } from './jppConfig';
import { JPP_UNIT_LABELS } from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────────
interface SystemStats {
  totalJpp: number;
  totalClubs: number;
  activeClubs: number;
  totalActivities: number;
  totalReports: number;
  totalStudents: number;
}

interface UnitStat {
  code: string;
  memberCount: number;
}

// ── Stat block ────────────────────────────────────────────────────────────────
function BigStatCard({
  label, value, icon: Icon, color, sub, delay,
}: {
  label: string; value: number | string; icon: React.ElementType;
  color: string; sub?: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-[1.75rem] border border-white/[0.06] bg-white/[0.03] p-5 hover:bg-white/[0.05] transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{ background: hexToRgba(color, 0.15) }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <span className="text-[9px] font-black uppercase tracking-widest text-white/20">
          Sistem
        </span>
      </div>
      <p className="text-3xl font-black text-white leading-none">{value}</p>
      <p className="text-xs font-black uppercase tracking-widest text-white/35 mt-1">{label}</p>
      {sub && <p className="text-[10px] text-white/20 mt-1">{sub}</p>}
    </motion.div>
  );
}

// ── Unit breakdown row ────────────────────────────────────────────────────────
function UnitStatRow({ code, count, total, delay }: { code: string; count: number; total: number; delay: number }) {
  const cfg = UNIT_CFG[code];
  if (!cfg) return null;
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="flex items-center gap-3"
    >
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: hexToRgba(cfg.color, 0.12) }}
      >
        <cfg.icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-black text-white/60 truncate">{cfg.shortLabel}</span>
          <span className="text-[11px] font-black text-white/40 ml-2 flex-shrink-0">{count} ahli</span>
        </div>
        <div className="h-1 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ delay: delay + 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="h-full rounded-full"
            style={{ background: cfg.color }}
          />
        </div>
      </div>
      <span className="text-[10px] font-black text-white/25 flex-shrink-0 w-8 text-right">{pct}%</span>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function JppOverviewPage() {
  const { isSuperAdmin } = useAuth();

  const [themeColor, setThemeColor] = useState(JPP_THEME_DEFAULT_COLOR);
  const [stats, setStats]           = useState<SystemStats | null>(null);
  const [unitStats, setUnitStats]   = useState<UnitStat[]>([]);
  const [loading, setLoading]       = useState(true);

  // Fetch theme color
  useEffect(() => {
    supabase.from('portal_settings').select('color').eq('exco_module', JPP_MODULE_ID).maybeSingle()
      .then(({ data }) => { if (data?.color) setThemeColor(data.color); });
  }, []);

  // Fetch system stats
  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      const [jppRes, studRes, allClubRes, actClubRes, actRes, repRes, unitRes] = await Promise.all([
        // Total JPP members
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'JPP'),
        // Total registered students
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        // Total clubs
        supabase.from('clubs').select('id', { count: 'exact', head: true }),
        // Active clubs
        supabase.from('clubs').select('id', { count: 'exact', head: true }).eq('is_active', true),
        // Total activities
        supabase.from('club_activities').select('id', { count: 'exact', head: true }),
        // Total reports
        supabase.from('club_reports').select('id', { count: 'exact', head: true }),
        // JPP members by unit
        supabase.from('profiles').select('jpp_unit').eq('role', 'JPP').not('jpp_unit', 'is', null),
      ]);

      setStats({
        totalJpp:        jppRes.count ?? 0,
        totalStudents:   studRes.count ?? 0,
        totalClubs:      allClubRes.count ?? 0,
        activeClubs:     actClubRes.count ?? 0,
        totalActivities: actRes.count ?? 0,
        totalReports:    repRes.count ?? 0,
      });

      // Tally by unit
      const tally: Record<string, number> = {};
      (unitRes.data ?? []).forEach((row: any) => {
        if (row.jpp_unit) tally[row.jpp_unit] = (tally[row.jpp_unit] ?? 0) + 1;
      });
      setUnitStats(UNIT_ORDER.map(code => ({ code, memberCount: tally[code] ?? 0 })));

      setLoading(false);
    };
    fetchStats();
  }, []);

  const totalJppUnassigned = (stats?.totalJpp ?? 0) - unitStats.reduce((s, u) => s + u.memberCount, 0);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-[10%] right-[10%] w-[40vw] h-[40vw] rounded-full blur-3xl opacity-5"
          style={{ background: themeColor }} />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-10 space-y-10">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-2"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: hexToRgba(themeColor, 0.15), border: `1px solid ${hexToRgba(themeColor, 0.25)}` }}
            >
              <BarChart3 className="w-5 h-5" style={{ color: themeColor }} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white leading-tight">Gambaran Sistem</h1>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
                Data keseluruhan portal JPP
              </p>
            </div>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-white/20" />
          </div>
        ) : (
          <>
            {/* ── Main Stats Grid ─── */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <BigStatCard label="Ahli JPP"         value={stats?.totalJpp ?? 0}        icon={Shield}    color={themeColor} delay={0.05} />
              <BigStatCard label="Pelajar Berdaftar" value={stats?.totalStudents ?? 0}   icon={Users}     color="#60A5FA"    delay={0.10} />
              <BigStatCard label="Jumlah Kelab"      value={stats?.totalClubs ?? 0}      icon={Flag}      color="#4ADE80"
                sub={`${stats?.activeClubs ?? 0} aktif`} delay={0.15} />
              <BigStatCard label="Aktiviti"          value={stats?.totalActivities ?? 0} icon={Activity}  color="#F59E0B"    delay={0.20} />
              <BigStatCard label="Laporan"           value={stats?.totalReports ?? 0}    icon={FileText}  color="#A78BFA"    delay={0.25} />
              <BigStatCard label="Kelab Aktif"       value={stats?.activeClubs ?? 0}     icon={TrendingUp} color="#2DD4BF"   delay={0.30} />
            </div>

            {/* ── Unit Breakdown ─── */}
            <div className="rounded-[1.75rem] border border-white/[0.06] bg-white/[0.03] p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-[0.25em] text-white/40">
                  Taburan Ahli JPP per Unit
                </h2>
                <span className="text-[10px] font-black text-white/20">
                  {stats?.totalJpp ?? 0} ahli
                </span>
              </div>
              <div className="space-y-4">
                {unitStats.map((u, i) => (
                  <UnitStatRow
                    key={u.code}
                    code={u.code}
                    count={u.memberCount}
                    total={stats?.totalJpp ?? 1}
                    delay={0.05 * i}
                  />
                ))}
                {totalJppUnassigned > 0 && (
                  <div className="flex items-center gap-3 opacity-40">
                    <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                      <Users className="w-3.5 h-3.5 text-white/30" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-[11px] font-black text-white/40">Belum Di-assign</span>
                        <span className="text-[11px] font-black text-white/25">{totalJppUnassigned} ahli</span>
                      </div>
                      <div className="h-1 rounded-full bg-white/5" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Module Status ─── */}
            <div className="rounded-[1.75rem] border border-white/[0.06] bg-white/[0.03] p-6 space-y-4">
              <h2 className="text-xs font-black uppercase tracking-[0.25em] text-white/40">Status Modul</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {UNIT_ORDER.map((code, i) => {
                  const cfg = UNIT_CFG[code];
                  if (!cfg) return null;
                  return (
                    <motion.div
                      key={code}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.04 * i }}
                      className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/[0.04]"
                    >
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: hexToRgba(cfg.color, 0.12) }}
                      >
                        <cfg.icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                      </div>
                      <span className="text-xs font-black text-white/50 flex-1 truncate">{cfg.shortLabel}</span>
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                        cfg.isActive
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-white/5 text-white/20'
                      }`}>
                        {cfg.isActive ? 'Aktif' : 'Akan Datang'}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
