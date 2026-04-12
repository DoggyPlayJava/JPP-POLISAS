// ============================================================
// ExcoGenericDashboard — Dashboard overview untuk unit exco JPP
// Dipaparkan dalam JppUnitDashboard apabila unit != KPP & KEUSAHAWANAN
// Data: stat aktiviti, laporan terkini, dan shortcut navigasi
// ============================================================
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Zap, FileText, Clock, CheckCircle2, XCircle,
  AlertCircle, ArrowRight, RefreshCw, ClipboardCheck,
  ChevronRight, Calendar, MapPin, TrendingUp,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { cn, hexToRgba } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ms } from 'date-fns/locale';
import { JPP_MT_POSITIONS } from '@/types';

// ─── PROPS ───────────────────────────────────────────────────────────────────
interface Props {
  excoUnit:   string;  // e.g. 'KEBAJIKAN'
  themeColor: string;
  excoLabel:  string;  // e.g. 'Kebajikan & Pengaduan Awam'
}

// ─── STAT CARD ───────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, delay = 0, onClick }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      className={cn(
        'rounded-[1.5rem] p-5 border border-white/[0.06] bg-white/[0.03] flex flex-col gap-3',
        onClick && 'cursor-pointer hover:bg-white/[0.06] hover:border-white/[0.1] transition-all'
      )}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: hexToRgba(color, 0.15) }}
      >
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div>
        <p className="text-3xl font-black text-white leading-none">{value}</p>
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/35 mt-1">{label}</p>
      </div>
    </motion.div>
  );
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
export function ExcoGenericDashboard({ excoUnit, themeColor, excoLabel }: Props) {
  const { profile, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  const jppPos  = profile?.jpp_position as string | undefined;
  const jppUnit = profile?.jpp_unit as string | undefined;
  const isMT    = JPP_MT_POSITIONS.includes(jppPos as any);
  const isExco  = jppUnit === excoUnit;

  const unitLower = excoUnit.toLowerCase();

  // ── Stats state ───────────────────────────────────────────────────────────
  const [stats, setStats] = useState({
    totalAktiviti:   0,
    aktif:           0,
    selesai:         0,
    perancangan:     0,
    laporanMenunggu: 0,
    laporanDilulus:  0,
    laporanDitolak:  0,
  });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [recentReports, setRecentReports]       = useState<any[]>([]);
  const [loading, setLoading]                   = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [actsRes, reportsRes] = await Promise.all([
        supabase
          .from('club_activities')
          .select('id, title, status, start_date, location, priority')
          .eq('exco_unit', excoUnit)
          .eq('is_archived', false)
          .order('start_date', { ascending: false })
          .limit(50),
        supabase
          .from('club_reports')
          .select('id, file_name, status, created_at, is_archived')
          .eq('exco_unit', excoUnit)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      const activities = actsRes.data || [];
      const reports    = reportsRes.data || [];

      setStats({
        totalAktiviti:   activities.length,
        aktif:           activities.filter(a => a.status === 'aktif').length,
        selesai:         activities.filter(a => a.status === 'selesai').length,
        perancangan:     activities.filter(a => a.status === 'perancangan').length,
        laporanMenunggu: reports.filter(r => r.status === 'Menunggu' && !r.is_archived).length,
        laporanDilulus:  reports.filter(r => r.status === 'Diluluskan').length,
        laporanDitolak:  reports.filter(r => r.status === 'Ditolak' && !r.is_archived).length,
      });

      setRecentActivities(activities.slice(0, 4));
      setRecentReports(reports.filter(r => !r.is_archived).slice(0, 3));
    } finally {
      setLoading(false);
    }
  }, [excoUnit]);

  useEffect(() => { load(); }, [load]);

  // ── Status color lookup ───────────────────────────────────────────────────
  const statusMap: Record<string, { label: string; color: string; bg: string }> = {
    perancangan: { label: 'Perancangan', color: '#60a5fa', bg: '#60a5fa15' },
    aktif:       { label: 'Aktif',       color: '#34d399', bg: '#34d39915' },
    selesai:     { label: 'Selesai',     color: '#94a3b8', bg: '#94a3b815' },
    ditangguh:   { label: 'Ditangguh',   color: '#f97316', bg: '#f9731615' },
    Menunggu:    { label: 'Menunggu',    color: '#f59e0b', bg: '#f59e0b15' },
    Diluluskan:  { label: 'Diluluskan',  color: '#10b981', bg: '#10b98115' },
    Ditolak:     { label: 'Ditolak',     color: '#ef4444', bg: '#ef444415' },
  };

  const formatDate = (d: string) => {
    try { return format(parseISO(d), 'd MMM yyyy', { locale: ms }); }
    catch { return d; }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4 py-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 rounded-[1.5rem] bg-white/[0.03] animate-pulse border border-white/[0.04]" />
          ))}
        </div>
        <div className="h-48 rounded-[2rem] bg-white/[0.03] animate-pulse border border-white/[0.04]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 py-2">

      {/* ── Stat cards ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Jumlah Aktiviti"
          value={stats.totalAktiviti}
          icon={Zap}
          color={themeColor}
          delay={0.0}
          onClick={() => navigate(`/exco/${unitLower}/aktiviti`)}
        />
        <StatCard
          label="Aktif Sekarang"
          value={stats.aktif}
          icon={TrendingUp}
          color="#34d399"
          delay={0.06}
          onClick={() => navigate(`/exco/${unitLower}/aktiviti`)}
        />
        <StatCard
          label="Selesai"
          value={stats.selesai}
          icon={CheckCircle2}
          color="#94a3b8"
          delay={0.12}
        />
        <StatCard
          label="Laporan Menunggu"
          value={stats.laporanMenunggu}
          icon={Clock}
          color={stats.laporanMenunggu > 0 ? '#f59e0b' : '#94a3b8'}
          delay={0.18}
          onClick={() => navigate(isMT ? `/jpp/semak-laporan-exco/${unitLower}` : `/exco/${unitLower}/laporan`)}
        />
      </div>

      {/* ── Alert: laporan ditolak ─── */}
      {stats.laporanDitolak > 0 && isExco && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20"
        >
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-black text-rose-400 uppercase tracking-widest">
              {stats.laporanDitolak} laporan ditolak
            </p>
            <p className="text-[11px] text-rose-300/60 font-medium mt-0.5">
              Sila semak nota penolakan dan kemukakan semula laporan.
            </p>
          </div>
          <button
            onClick={() => navigate(`/exco/${unitLower}/laporan`)}
            className="text-[10px] font-black uppercase tracking-wider text-rose-400 hover:text-rose-300 transition-colors shrink-0"
          >
            Semak →
          </button>
        </motion.div>
      )}

      {/* ── Grid: aktiviti terkini + laporan terkini ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Aktiviti terkini */}
        <div className="rounded-[2rem] bg-white/[0.02] border border-white/[0.05] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40">Aktiviti Terkini</h3>
            <button
              onClick={() => navigate(`/exco/${unitLower}/aktiviti`)}
              className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1 transition-opacity hover:opacity-70"
              style={{ color: themeColor }}
            >
              Semua <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {recentActivities.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/15">Tiada aktiviti lagi</p>
              {(isExco || isSuperAdmin) && (
                <button
                  onClick={() => navigate(`/exco/${unitLower}/aktiviti`)}
                  className="text-[10px] font-black uppercase tracking-widest text-white/25 hover:text-white/50 underline underline-offset-2 mt-2 transition-all"
                >
                  Tambah Aktiviti
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentActivities.map(act => {
                const sc = statusMap[act.status] || statusMap.perancangan;
                return (
                  <div
                    key={act.id}
                    className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-all"
                  >
                    <div
                      className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                      style={{ background: sc.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-white leading-tight line-clamp-1">{act.title}</p>
                      <div className="flex items-center gap-3 mt-1">
                        {act.start_date && (
                          <span className="text-[10px] text-white/25 font-bold flex items-center gap-1">
                            <Calendar className="w-2.5 h-2.5" />
                            {formatDate(act.start_date)}
                          </span>
                        )}
                        {act.location && (
                          <span className="text-[10px] text-white/25 font-bold flex items-center gap-1 truncate">
                            <MapPin className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">{act.location}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0"
                      style={{ background: sc.bg, color: sc.color }}
                    >
                      {sc.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Laporan terkini */}
        <div className="rounded-[2rem] bg-white/[0.02] border border-white/[0.05] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40">Laporan Terkini</h3>
            <button
              onClick={() => navigate(isMT ? `/jpp/semak-laporan-exco/${unitLower}` : `/exco/${unitLower}/laporan`)}
              className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1 transition-opacity hover:opacity-70"
              style={{ color: themeColor }}
            >
              Semua <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {recentReports.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/15">Tiada laporan lagi</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentReports.map(r => {
                const sc = statusMap[r.status] || statusMap.Menunggu;
                return (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04]"
                  >
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: hexToRgba(themeColor, 0.12) }}
                    >
                      <FileText className="w-3.5 h-3.5" style={{ color: themeColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-white line-clamp-1 leading-tight">{r.file_name}</p>
                      <p className="text-[10px] text-white/25 font-bold mt-0.5">{formatDate(r.created_at)}</p>
                    </div>
                    <span
                      className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0"
                      style={{ background: sc.bg, color: sc.color }}
                    >
                      {sc.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Quick actions ─── */}
      <div>
        <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/25 mb-3">Tindakan Pantas</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Exco: Tambah Aktiviti + Jana Laporan */}
          {(isExco || isSuperAdmin) && (
            <>
              <QuickAction
                label="Rekod Aktiviti Baharu"
                description="Tambah aktiviti yang dirancang atau sedang berjalan"
                icon={Zap}
                color={themeColor}
                onClick={() => navigate(`/exco/${unitLower}/aktiviti`)}
              />
              <QuickAction
                label="Jana / Hantar Laporan"
                description="Jana laporan bulanan PDF secara auto atau muat naik manual"
                icon={FileText}
                color={themeColor}
                onClick={() => navigate(`/exco/${unitLower}/laporan`)}
              />
            </>
          )}
          {/* MT: Semak Laporan */}
          {(isMT || isSuperAdmin) && (
            <QuickAction
              label="Semak Laporan Exco"
              description={`Semak dan lulus/tolak laporan ${excoLabel}`}
              icon={ClipboardCheck}
              color={themeColor}
              onClick={() => navigate(`/jpp/semak-laporan-exco/${unitLower}`)}
            />
          )}
        </div>
      </div>

      {/* ── Status bar ─── */}
      <div className="rounded-2xl px-5 py-4 bg-white/[0.02] border border-white/[0.04] flex flex-wrap gap-6 items-center">
        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/25 shrink-0">Status</div>
        {[
          { label: 'Perancangan', value: stats.perancangan, color: '#60a5fa' },
          { label: 'Aktif',       value: stats.aktif,       color: '#34d399' },
          { label: 'Selesai',     value: stats.selesai,     color: '#94a3b8' },
          { label: 'Dilulus',     value: stats.laporanDilulus, color: '#10b981' },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
            <span className="text-[10px] font-black text-white/30">{s.label}</span>
            <span className="text-[10px] font-black" style={{ color: s.color }}>{s.value}</span>
          </div>
        ))}
        <button
          onClick={load}
          className="ml-auto text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-white/50 flex items-center gap-1.5 transition-all"
        >
          <RefreshCw className="w-3 h-3" /> Segarkan
        </button>
      </div>
    </div>
  );
}

// ─── QUICK ACTION CARD ────────────────────────────────────────────────────────
function QuickAction({ label, description, icon: Icon, color, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-4 p-4 rounded-2xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.1] transition-all text-left group"
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform"
        style={{ background: hexToRgba(color, 0.15) }}
      >
        <Icon className="w-4.5 h-4.5" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-black text-white leading-tight">{label}</p>
        <p className="text-[10px] text-white/30 font-medium mt-0.5 line-clamp-1">{description}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-white/15 group-hover:text-white/40 group-hover:translate-x-0.5 transition-all shrink-0" />
    </button>
  );
}
