// ============================================================
// KebajikanUnitDashboard.tsx
// Dashboard unit Kebajikan dalam JPP HQ Portal.
// Tabs: Overview | Aduan | Aktiviti | Laporan | Semakan Laporan
// ============================================================

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HeartHandshake, TicketCheck, CheckCircle2, Clock, AlertCircle,
  FileText, Activity, ChevronRight, RefreshCw, ArrowRight,
  ExternalLink, Loader2, Search, XCircle, TrendingUp,
  ClipboardCheck, Calendar, MessageSquare, Flag, ShieldAlert,
  Zap, MapPin,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { cn, hexToRgba } from '@/lib/utils';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { ms } from 'date-fns/locale';
import {
  KebajikanTicket, KebajikanTicketStatus,
  KEBAJIKAN_STATUS_LABELS, KEBAJIKAN_CATEGORY_LABELS,
  KEBAJIKAN_PRIORITY_LABELS,
} from '@/types';
import { JPP_MT_POSITIONS } from '@/types';
import { UNIT_CFG } from '../jppConfig';

const TEAL = UNIT_CFG['KEBAJIKAN']?.color ?? '#2DD4BF';

// ─── Status meta ──────────────────────────────────────────────────────────────
const STATUS_META: Record<KebajikanTicketStatus, { color: string; bg: string }> = {
  NEW: { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  IN_PROGRESS: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  WAITING_INFO: { color: '#c084fc', bg: 'rgba(192,132,252,0.12)' },
  DELEGATED: { color: '#fb923c', bg: 'rgba(251,146,36,0.12)' },
  ESCALATED: { color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  REOPENED: { color: '#22d3ee', bg: 'rgba(34,211,238,0.12)' },
  RESOLVED: { color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  CLOSED: { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
  CANCELLED: { color: '#64748b', bg: 'rgba(100,116,139,0.08)' },
};

const PRIORITY_META: Record<string, { color: string; label: string }> = {
  URGENT: { color: '#ef4444', label: 'Urgent' },
  HIGH: { color: '#f97316', label: 'Tinggi' },
  NORMAL: { color: '#94a3b8', label: 'Biasa' },
  LOW: { color: '#475569', label: 'Rendah' },
};

// ─── Sub-tab button ────────────────────────────────────────────────────────────
type KbjTab = 'overview' | 'aduan' | 'aktiviti' | 'laporan' | 'semakan';

const TABS: { id: KbjTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'aduan', label: 'Aduan Pelajar' },
  { id: 'aktiviti', label: 'Aktiviti' },
  { id: 'laporan', label: 'Laporan' },
  { id: 'semakan', label: 'Semakan Laporan' },
];

function SubTabBtn({ id, label, active, badge, onClick }: {
  id: string; label: string; active: boolean; badge?: number; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all shrink-0 flex items-center gap-1.5',
        active ? 'text-[#0a0a0f]' : 'bg-white/[0.04] text-white/40 hover:bg-white/[0.08] hover:text-white/70'
      )}
      style={active ? { backgroundColor: TEAL } : {}}
    >
      {label}
      {badge != null && badge > 0 && (
        <span
          className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black"
          style={active
            ? { background: 'rgba(0,0,0,0.2)', color: '#0a0a0f' }
            : { background: hexToRgba(TEAL, 0.2), color: TEAL }}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, sub, delay = 0, onClick }: any) {
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
        {sub && <p className="text-[10px] text-white/20 mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  );
}

// ─── Ticket row ───────────────────────────────────────────────────────────────
function TicketRow({ ticket, onClick }: { ticket: KebajikanTicket; onClick: () => void }) {
  const sm = STATUS_META[ticket.status];
  const pm = PRIORITY_META[ticket.priority] ?? PRIORITY_META.NORMAL;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="flex items-center gap-4 p-3.5 rounded-2xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.1] transition-all cursor-pointer group"
    >
      {/* Priority dot */}
      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: pm.color }} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] font-black uppercase tracking-widest text-white/30">
            {ticket.ticket_no}
          </span>
          <span className="text-[10px] text-white/20">·</span>
          <span className="text-[10px] text-white/30">
            {KEBAJIKAN_CATEGORY_LABELS[ticket.category]}
          </span>
        </div>
        <p className="text-xs font-black text-white leading-tight line-clamp-1">{ticket.title}</p>
        <p className="text-[10px] text-white/30 mt-0.5">
          {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: ms })}
          {ticket.full_name && ` · ${ticket.full_name}`}
        </p>
      </div>

      {/* Status badge */}
      <span
        className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shrink-0"
        style={{ background: sm.bg, color: sm.color }}
      >
        {KEBAJIKAN_STATUS_LABELS[ticket.status]}
      </span>

      <ChevronRight className="w-3.5 h-3.5 text-white/15 group-hover:text-white/50 group-hover:translate-x-0.5 transition-all shrink-0" />
    </motion.div>
  );
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
export function KebajikanUnitDashboard() {
  const navigate = useNavigate();
  const { profile, isSuperAdmin } = useAuth();

  const jppPos = profile?.jpp_position as string | undefined;
  const isMT = JPP_MT_POSITIONS.includes(jppPos as any);
  const isYDP = jppPos === 'YDP' || isSuperAdmin;

  const [tab, setTab] = useState<KbjTab>('overview');

  // ── Tiket (Aduan) ──────────────────────────────────────────────────────────
  const [tickets, setTickets] = useState<KebajikanTicket[]>([]);
  const [ticketLoading, setTLoading] = useState(true);
  const [ticketSearch, setTicketSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<KebajikanTicketStatus | 'ALL'>('ALL');

  // ── Exco Aktiviti & Laporan ────────────────────────────────────────────────
  const [activities, setActivities] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [excoLoading, setELoading] = useState(true);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const activeCount = tickets.filter(t => ['NEW', 'IN_PROGRESS', 'WAITING_INFO', 'DELEGATED', 'ESCALATED', 'REOPENED'].includes(t.status)).length;
  const resolvedCount = tickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length;
  const newCount = tickets.filter(t => t.status === 'NEW').length;
  const pendingReports = reports.filter(r => r.status === 'Menunggu' && !r.is_archived).length;

  // ── Fetch tiket ────────────────────────────────────────────────────────────
  const fetchTickets = useCallback(async () => {
    setTLoading(true);
    const { data } = await supabase
      .from('kebajikan_tickets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    setTickets((data as KebajikanTicket[]) || []);
    setTLoading(false);
  }, []);

  // ── Fetch exco aktiviti & laporan ─────────────────────────────────────────
  const fetchExco = useCallback(async () => {
    setELoading(true);
    const [actsRes, repsRes] = await Promise.all([
      supabase
        .from('club_activities')
        .select('id, title, status, start_date, location')
        .eq('exco_unit', 'KEBAJIKAN')
        .eq('is_archived', false)
        .order('start_date', { ascending: false })
        .limit(50),
      supabase
        .from('club_reports')
        .select('id, file_name, status, created_at, is_archived')
        .eq('exco_unit', 'KEBAJIKAN')
        .order('created_at', { ascending: false })
        .limit(30),
    ]);
    setActivities(actsRes.data || []);
    setReports(repsRes.data || []);
    setELoading(false);
  }, []);

  useEffect(() => { fetchTickets(); fetchExco(); }, [fetchTickets, fetchExco]);

  // ── Filtered tickets ───────────────────────────────────────────────────────
  const filteredTickets = tickets.filter(t => {
    const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const q = ticketSearch.toLowerCase();
    const matchSearch = !q
      || t.ticket_no.toLowerCase().includes(q)
      || t.title.toLowerCase().includes(q)
      || t.full_name.toLowerCase().includes(q)
      || (t.matric_no ?? '').toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  // ── Activity status display ────────────────────────────────────────────────
  const actStatus: Record<string, { color: string; bg: string; label: string }> = {
    perancangan: { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)', label: 'Perancangan' },
    aktif: { color: '#34d399', bg: 'rgba(52,211,153,0.12)', label: 'Aktif' },
    selesai: { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', label: 'Selesai' },
    ditangguh: { color: '#fb923c', bg: 'rgba(251,146,36,0.12)', label: 'Ditangguh' },
  };
  const repStatus: Record<string, { color: string; bg: string; label: string }> = {
    Menunggu: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Menunggu' },
    Diluluskan: { color: '#34d399', bg: 'rgba(52,211,153,0.12)', label: 'Diluluskan' },
    Ditolak: { color: '#f87171', bg: 'rgba(248,113,113,0.12)', label: 'Ditolak' },
  };

  const fmtDate = (d: string) => {
    try { return format(parseISO(d), 'd MMM yyyy', { locale: ms }); }
    catch { return d; }
  };

  // ─── ALL_STATUSES for filter ──────────────────────────────────────────────
  const ALL_STATUSES: KebajikanTicketStatus[] = [
    'NEW', 'IN_PROGRESS', 'WAITING_INFO', 'DELEGATED',
    'ESCALATED', 'REOPENED', 'RESOLVED', 'CLOSED', 'CANCELLED',
  ];

  return (
    <div className="space-y-5">
      {/* ── Sub-nav ── */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {TABS.map(t => (
          <SubTabBtn
            key={t.id}
            id={t.id}
            label={t.label}
            active={tab === t.id}
            badge={t.id === 'aduan' ? activeCount : t.id === 'semakan' ? pendingReports : undefined}
            onClick={() => setTab(t.id)}
          />
        ))}
        <button onClick={() => { fetchTickets(); fetchExco(); }} className="ml-auto flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-white/50 transition-all shrink-0">
          <RefreshCw className="w-3 h-3" /> Segarkan
        </button>
      </div>

      {/* ══════════════════════════════════════════════
          TAB: OVERVIEW
      ══════════════════════════════════════════════ */}
      {tab === 'overview' && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-400">

          {/* Alert: tiket baru menunggu tindakan */}
          {newCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-4 rounded-2xl border border-blue-500/20 bg-blue-500/[0.06]"
            >
              <AlertCircle className="w-4 h-4 text-blue-400 shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-black text-blue-400">{newCount} aduan baharu belum disemak</p>
                <p className="text-[10px] text-blue-300/50 mt-0.5">Semak dan assign kepada pegawai yang berkenaan.</p>
              </div>
              <button
                onClick={() => { setStatusFilter('NEW'); setTab('aduan'); }}
                className="text-[10px] font-black uppercase tracking-widest text-blue-400 hover:text-blue-300 shrink-0"
              >
                Semak →
              </button>
            </motion.div>
          )}

          {/* Stat cards */}
          {ticketLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-28 rounded-[1.5rem] bg-white/[0.03] animate-pulse border border-white/[0.04]" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Jumlah Aduan" value={tickets.length} icon={TicketCheck} color={TEAL} delay={0.0}
                onClick={() => { setStatusFilter('ALL'); setTab('aduan'); }} />
              <StatCard label="Aktif / Dalam Proses" value={activeCount} icon={TrendingUp} color="#f59e0b" delay={0.06}
                onClick={() => { setStatusFilter('IN_PROGRESS'); setTab('aduan'); }} />
              <StatCard label="Selesai" value={resolvedCount} icon={CheckCircle2} color="#34d399" delay={0.12} />
              <StatCard label="Laporan Menunggu" value={pendingReports}
                icon={Clock} color={pendingReports > 0 ? '#f59e0b' : '#94a3b8'} delay={0.18}
                onClick={() => setTab('semakan')} />
            </div>
          )}

          {/* 2-col grid: Tiket Terkini + Aktiviti Terkini */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Tiket terkini */}
            <div className="rounded-[2rem] bg-white/[0.02] border border-white/[0.05] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40">Aduan Terkini</h3>
                <button
                  onClick={() => { setStatusFilter('ALL'); setTab('aduan'); }}
                  className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:opacity-70 transition-opacity"
                  style={{ color: TEAL }}
                >
                  Semua <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              {ticketLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-2xl bg-white/[0.02] animate-pulse" />)}
                </div>
              ) : tickets.slice(0, 4).length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/15">Tiada aduan lagi</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tickets.slice(0, 4).map(t => (
                    <TicketRow
                      key={t.id}
                      ticket={t}
                      onClick={() => navigate(`/kebajikan/tiket/${t.id}`)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Aktiviti terkini */}
            <div className="rounded-[2rem] bg-white/[0.02] border border-white/[0.05] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40">Aktiviti Exco</h3>
                <button
                  onClick={() => setTab('aktiviti')}
                  className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:opacity-70 transition-opacity"
                  style={{ color: TEAL }}
                >
                  Semua <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              {excoLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-2xl bg-white/[0.02] animate-pulse" />)}
                </div>
              ) : activities.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/15">Tiada aktiviti lagi</p>
                  <button
                    onClick={() => navigate('/exco/kebajikan/aktiviti')}
                    className="text-[10px] text-white/25 hover:text-white/50 underline underline-offset-2 mt-2 transition-all font-black uppercase tracking-widest"
                  >
                    Tambah Aktiviti
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {activities.slice(0, 4).map(act => {
                    const sc = actStatus[act.status] ?? actStatus.perancangan;
                    return (
                      <div key={act.id} className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                        <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: sc.color }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-white leading-tight line-clamp-1">{act.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {act.start_date && (
                              <span className="text-[10px] text-white/25 font-bold flex items-center gap-1">
                                <Calendar className="w-2.5 h-2.5" />{fmtDate(act.start_date)}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0"
                          style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/25 mb-3">Tindakan Pantas</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <QuickAction
                label="Buka Modul E-Kebajikan"
                description="Urus tiket, aduan, dan tetapan kebajikan"
                icon={HeartHandshake}
                color={TEAL}
                onClick={() => navigate('/kebajikan')}
              />
              <QuickAction
                label="Rekod Aktiviti Baharu"
                description="Tambah aktiviti yang dirancang atau sedang berjalan"
                icon={Activity}
                color={TEAL}
                onClick={() => navigate('/exco/kebajikan/aktiviti')}
              />
              <QuickAction
                label="Semak Laporan Exco"
                description="Semak dan lulus / tolak laporan exco Kebajikan"
                icon={ClipboardCheck}
                color={TEAL}
                onClick={() => navigate('/jpp/semak-laporan-exco/kebajikan')}
              />
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          TAB: ADUAN (TIKET)
      ══════════════════════════════════════════════ */}
      {tab === 'aduan' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-400">

          {/* Header banner */}
          <div
            className="rounded-[2rem] p-6 text-white relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${hexToRgba(TEAL, 0.25)} 0%, ${hexToRgba(TEAL, 0.05)} 100%)`, border: `1px solid ${hexToRgba(TEAL, 0.2)}` }}
          >
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-1" style={{ color: hexToRgba(TEAL, 0.7) }}>Sistem Aduan Pelajar</p>
              <h2 className="text-2xl font-black text-white">Semua Aduan E-Kebajikan</h2>
              <p className="text-white/40 text-xs mt-1">{tickets.length} aduan dalam sistem</p>
            </div>
            <TicketCheck className="absolute bottom-4 right-6 w-20 h-20 opacity-10" style={{ color: TEAL }} />
          </div>

          {/* Status filter chips */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStatusFilter('ALL')}
              className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
              style={statusFilter === 'ALL'
                ? { background: hexToRgba(TEAL, 0.2), color: TEAL, border: `1px solid ${hexToRgba(TEAL, 0.3)}` }
                : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              Semua ({tickets.length})
            </button>
            {ALL_STATUSES.map(s => {
              const sm = STATUS_META[s];
              const cnt = tickets.filter(t => t.status === s).length;
              if (cnt === 0) return null;
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                  style={statusFilter === s
                    ? { background: sm.bg, color: sm.color, border: `1px solid ${sm.color}33` }
                    : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  {KEBAJIKAN_STATUS_LABELS[s]} ({cnt})
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20 pointer-events-none" />
            <input
              value={ticketSearch}
              onChange={e => setTicketSearch(e.target.value)}
              placeholder="Cari ticket no, tajuk, nama, matrik..."
              className="w-full px-10 py-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-xs text-white placeholder-white/20 outline-none focus:border-white/20 transition-colors"
            />
            {ticketSearch && (
              <button onClick={() => setTicketSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2">
                <XCircle className="w-3.5 h-3.5 text-white/25 hover:text-white/50 transition-colors" />
              </button>
            )}
          </div>

          {/* Ticket list */}
          {ticketLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 rounded-2xl bg-white/[0.02] animate-pulse border border-white/[0.04]" />)}
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Tiada aduan ditemui</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="space-y-2">
                {filteredTickets.map(t => (
                  <TicketRow
                    key={t.id}
                    ticket={t}
                    onClick={() => navigate(`/kebajikan/tiket/${t.id}`)}
                  />
                ))}
              </div>
            </AnimatePresence>
          )}

          {/* CTA: Open full module */}
          <button
            onClick={() => navigate('/kebajikan/tiket')}
            className="w-full flex items-center justify-between gap-3 px-5 py-4 rounded-2xl border hover:opacity-80 transition-all"
            style={{ borderColor: hexToRgba(TEAL, 0.2), background: hexToRgba(TEAL, 0.04) }}
          >
            <span className="text-xs font-black" style={{ color: TEAL }}>Buka Halaman Tiket Penuh dalam E-Kebajikan</span>
            <ExternalLink className="w-3.5 h-3.5" style={{ color: TEAL }} />
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          TAB: AKTIVITI
      ══════════════════════════════════════════════ */}
      {tab === 'aktiviti' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-400">
          <div className="rounded-[2rem] p-7 text-white relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${hexToRgba(TEAL, 0.3)} 0%, ${hexToRgba(TEAL, 0.05)} 100%)`, border: `1px solid ${hexToRgba(TEAL, 0.2)}` }}>
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-1" style={{ color: hexToRgba(TEAL, 0.7) }}>Exco Kebajikan</p>
              <h2 className="text-2xl font-black text-white">Aktiviti Dianjurkan</h2>
              <p className="text-white/40 text-xs mt-1">{activities.length} aktiviti dalam rekod</p>
            </div>
            <Activity className="absolute bottom-4 right-6 w-20 h-20 opacity-10" style={{ color: TEAL }} />
          </div>

          {excoLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-2xl bg-white/[0.02] animate-pulse border border-white/[0.04]" />)}
            </div>
          ) : activities.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Tiada aktiviti direkod</p>
              <button
                onClick={() => navigate('/exco/kebajikan/aktiviti')}
                className="text-[11px] font-black uppercase tracking-widest underline underline-offset-2 transition-all"
                style={{ color: TEAL }}
              >
                + Tambah Aktiviti
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {activities.map(act => {
                const sc = actStatus[act.status] ?? actStatus.perancangan;
                return (
                  <div key={act.id} className="flex items-start gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-all">
                    <div className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{ background: sc.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-white leading-tight">{act.title}</p>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        {act.start_date && (
                          <span className="text-[10px] text-white/30 font-bold flex items-center gap-1">
                            <Calendar className="w-2.5 h-2.5" />{fmtDate(act.start_date)}
                          </span>
                        )}
                        {act.location && (
                          <span className="text-[10px] text-white/30 font-bold flex items-center gap-1 truncate">
                            <MapPin className="w-2.5 h-2.5 shrink-0" /><span className="truncate">{act.location}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full shrink-0"
                      style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                  </div>
                );
              })}
            </div>
          )}

          <button
            onClick={() => navigate('/exco/kebajikan/aktiviti')}
            className="w-full flex items-center justify-between gap-3 px-5 py-4 rounded-2xl border hover:opacity-80 transition-all"
            style={{ borderColor: hexToRgba(TEAL, 0.2), background: hexToRgba(TEAL, 0.04) }}
          >
            <span className="text-xs font-black" style={{ color: TEAL }}>Urus Semua Aktiviti Exco Kebajikan</span>
            <ExternalLink className="w-3.5 h-3.5" style={{ color: TEAL }} />
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          TAB: LAPORAN
      ══════════════════════════════════════════════ */}
      {tab === 'laporan' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-400">
          <div className="rounded-[2rem] p-7 text-white relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(99,102,241,0.04) 100%)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-300/60 mb-1">Kebajikan</p>
              <h2 className="text-2xl font-black text-white">Laporan Exco</h2>
              <p className="text-white/40 text-xs mt-1">{reports.filter(r => !r.is_archived).length} laporan · {pendingReports} menunggu semakan</p>
            </div>
            <FileText className="absolute bottom-4 right-6 w-20 h-20 text-indigo-500/10" />
          </div>

          {excoLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-2xl bg-white/[0.02] animate-pulse border border-white/[0.04]" />)}
            </div>
          ) : reports.filter(r => !r.is_archived).length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Tiada laporan lagi</p>
            </div>
          ) : (
            <div className="space-y-2">
              {reports.filter(r => !r.is_archived).map(r => {
                const sc = repStatus[r.status] ?? repStatus.Menunggu;
                return (
                  <div key={r.id} className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(99,102,241,0.12)' }}>
                      <FileText className="w-3.5 h-3.5 text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-white line-clamp-1 leading-tight">{r.file_name}</p>
                      <p className="text-[10px] text-white/30 mt-0.5">{fmtDate(r.created_at)}</p>
                    </div>
                    <span className="text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full shrink-0"
                      style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => navigate('/exco/kebajikan/laporan')}
              className="flex items-center justify-between gap-2 px-4 py-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] transition-all"
            >
              <span className="text-[11px] font-black text-white/50">Jana / Hantar Laporan</span>
              <ExternalLink className="w-3 h-3 text-white/25" />
            </button>
            <button
              onClick={() => setTab('semakan')}
              className="flex items-center justify-between gap-2 px-4 py-3.5 rounded-2xl border transition-all"
              style={{ borderColor: hexToRgba(TEAL, 0.2), background: hexToRgba(TEAL, 0.05) }}
            >
              <span className="text-[11px] font-black" style={{ color: TEAL }}>Semak Laporan {pendingReports > 0 && `(${pendingReports})`}</span>
              <ChevronRight className="w-3 h-3" style={{ color: TEAL }} />
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          TAB: SEMAKAN LAPORAN
      ══════════════════════════════════════════════ */}
      {tab === 'semakan' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-400">

          {/* CTA Card */}
          <div className="rounded-[2.5rem] p-8 relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${hexToRgba(TEAL, 0.25)} 0%, rgba(10,10,15,0.5) 100%)`, border: `1px solid ${hexToRgba(TEAL, 0.2)}` }}>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl" style={{ background: hexToRgba(TEAL, 0.2), border: `1px solid ${hexToRgba(TEAL, 0.3)}` }}>
                  <ClipboardCheck className="w-7 h-7" style={{ color: TEAL }} />
                </div>
                <div>
                  <h3 className="font-black text-xl text-white">Semakan Laporan Exco Kebajikan</h3>
                  <p className="text-xs text-white/40 font-medium mt-1">
                    {pendingReports > 0
                      ? <span className="text-amber-400 font-black">{pendingReports} laporan menunggu kelulusan anda</span>
                      : 'Tiada laporan menunggu semakan'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/jpp/semak-laporan-exco/kebajikan')}
                className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-sm font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shrink-0"
                style={{ background: hexToRgba(TEAL, 0.2), color: TEAL, border: `1px solid ${hexToRgba(TEAL, 0.3)}` }}
              >
                <ExternalLink className="w-4 h-4" />
                Buka Halaman Semakan
              </button>
            </div>
          </div>

          {/* Recent reports pending */}
          {reports.filter(r => r.status === 'Menunggu' && !r.is_archived).length > 0 && (
            <div className="rounded-[2rem] bg-white/[0.02] border border-white/[0.05] p-5 space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40">Laporan Menunggu Semakan</h3>
              <div className="space-y-2">
                {reports.filter(r => r.status === 'Menunggu' && !r.is_archived).map(r => (
                  <div key={r.id} className="flex items-center gap-3 p-3 rounded-2xl bg-amber-500/[0.05] border border-amber-500/10">
                    <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-white line-clamp-1">{r.file_name}</p>
                      <p className="text-[10px] text-white/30 mt-0.5">{fmtDate(r.created_at)}</p>
                    </div>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-amber-500/20 text-amber-400 bg-amber-500/10">Menunggu</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stats summary */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Menunggu', val: reports.filter(r => r.status === 'Menunggu' && !r.is_archived).length, color: '#f59e0b' },
              { label: 'Diluluskan', val: reports.filter(r => r.status === 'Diluluskan').length, color: '#34d399' },
              { label: 'Ditolak', val: reports.filter(r => r.status === 'Ditolak' && !r.is_archived).length, color: '#f87171' },
            ].map(s => (
              <div key={s.label} className="p-4 rounded-2xl border border-white/[0.05] bg-white/[0.02] text-center">
                <p className="text-2xl font-black" style={{ color: s.color }}>{s.val}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Quick Action Card ────────────────────────────────────────────────────────
function QuickAction({ label, description, icon: Icon, color, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-4 p-4 rounded-2xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.1] transition-all text-left group"
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform"
        style={{ background: hexToRgba(color, 0.15) }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-black text-white leading-tight">{label}</p>
        <p className="text-[10px] text-white/30 font-medium mt-0.5 line-clamp-1">{description}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-white/15 group-hover:text-white/40 group-hover:translate-x-0.5 transition-all shrink-0" />
    </button>
  );
}
