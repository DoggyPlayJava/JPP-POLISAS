import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  Users, Crown, ExternalLink, Lock, CalendarDays,
  ChevronRight, ShieldCheck, Sparkles, Clock, Flag, BarChart3, ArrowUpRight,
  Store, Heart, Trophy
} from 'lucide-react';
import { cn, hexToRgba, getMalaysianNickname } from '@/lib/utils';
import { JPP_MT_POSITIONS } from '@/types';
import { format, isPast, isWithinInterval, addDays } from 'date-fns';
import { ms } from 'date-fns/locale';
import { JPP_THEME_DEFAULT_COLOR, JPP_MODULE_ID } from './jppConfig';
import { useJppConfig } from '@/contexts/JppConfigContext';

// ─── Stat card ───────────────────────────────────────────────────────────────
function StatCard({
  label, value, icon: Icon, color, delay,
}: {
  label: string; value: number | string; icon: React.ElementType; color: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="flex-1 min-w-0 rounded-2xl p-4 border border-white/5 bg-white/[0.03] hover:bg-white/[0.06] transition-all"
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
        style={{ background: hexToRgba(color, 0.15) }}
      >
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <p className="text-2xl font-black text-white leading-none">{value}</p>
      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/40 mt-1">{label}</p>
    </motion.div>
  );
}

// ─── Unit card ───────────────────────────────────────────────────────────────
function UnitCard({
  code, isLocked, delay, onNavigate,
}: {
  code: string; isLocked: boolean; delay: number; onNavigate: (link: string) => void;
}) {
  const { unitConfig } = useJppConfig();
  const cfg = unitConfig[code];
  if (!cfg) return null;
  const canOpen = cfg.isActive && !isLocked;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      onClick={() => canOpen && onNavigate(`/jpp/unit/${code.toLowerCase()}`)}
      className={cn(
        'relative rounded-[1.75rem] border overflow-hidden transition-all duration-500 p-5',
        canOpen
          ? 'cursor-pointer hover:border-white/15 bg-white/[0.03] border-white/[0.06] group'
          : 'cursor-default bg-white/[0.015] border-white/[0.03] opacity-60'
      )}
      style={{ minHeight: 140 }}
    >
      {/* Hover gradient */}
      {canOpen && (
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{ background: `linear-gradient(135deg, ${hexToRgba(cfg.color, 0.08)}, transparent)` }}
        />
      )}

      <div className="relative z-10 flex flex-col h-full gap-4">
        <div className="flex items-start justify-between">
          {/* Icon */}
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center transition-transform duration-500 group-hover:scale-110"
            style={{ background: hexToRgba(cfg.color, 0.15), border: `1px solid ${hexToRgba(cfg.color, 0.2)}` }}
          >
            {isLocked
              ? <Lock className="w-4 h-4 text-white/20" />
              : <cfg.icon className="w-5 h-5" style={{ color: cfg.color }} />
            }
          </div>

          {/* Status badge */}
          <div className={cn(
            'px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border',
            cfg.isActive && !isLocked
              ? 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400'
              : cfg.isActive
                ? 'bg-blue-500/10 border-blue-500/15 text-blue-400'
                : 'bg-white/5 border-white/10 text-white/25'
          )}>
            {!cfg.isActive ? 'Akan Datang' : isLocked ? 'Pantau' : (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Aktif
              </span>
            )}
          </div>
        </div>

        <div>
          <h3 className={cn(
            'font-black text-base leading-tight',
            canOpen ? 'text-white' : 'text-white/40'
          )}>
            {cfg.shortLabel}
          </h3>
          <p className="text-[11px] text-white/35 mt-0.5 leading-relaxed line-clamp-2">
            {cfg.fullLabel}
          </p>
        </div>

        {canOpen && (
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-all duration-300 group-hover:gap-3"
            style={{ color: cfg.color }}>
            <span>Buka Modul</span>
            <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Takwim event card ───────────────────────────────────────────────────────
function TakwimCard({ event, delay }: { event: any; delay: number }) {
  const isOngoing = event.start_date && event.end_date &&
    isWithinInterval(new Date(), { start: new Date(event.start_date), end: new Date(event.end_date) });

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] transition-all"
    >
      <div className={cn(
        'w-2 h-2 rounded-full flex-shrink-0',
        isOngoing ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.7)]' : 'bg-white/20'
      )} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-black text-white/80 truncate">{event.title}</p>
        <p className="text-[10px] text-white/35 font-bold mt-0.5">
          {event.start_date
            ? format(new Date(event.start_date), 'dd MMM yyyy', { locale: ms })
            : '—'
          }
        </p>
      </div>
      {isOngoing && (
        <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full flex-shrink-0">
          Aktif
        </span>
      )}
    </motion.div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export function JppHomePage() {
  const { user, profile, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const { positionLabels, unitConfig, unitOrder } = useJppConfig();

  const [themeColor, setThemeColor] = useState(JPP_THEME_DEFAULT_COLOR);
  const [assignedUnits, setAssignedUnits] = useState<string[]>([]);
  const [stats, setStats] = useState({ jppMembers: 0, totalClubs: 0, totalActivities: 0, totalBusinesses: 0, totalTickets: 0 });
  const [takwim, setTakwim] = useState<any[]>([]);

  const jppPosition = profile?.jpp_position as string | undefined;
  const jppUnit     = profile?.jpp_unit as string | undefined;
  const isYDP       = jppPosition === 'YDP' || jppPosition === 'YANG_DIPERTUA' || isSuperAdmin;
  const isMT        = !isYDP && JPP_MT_POSITIONS.includes(jppPosition as any);
  const isNormalExco = !isYDP && !isMT && !!jppUnit;

  const displayName = useMemo(() => getMalaysianNickname(profile?.full_name) || 'Sahabat', [profile]);
  const posLabel    = jppPosition
    ? (positionLabels[jppPosition] ?? jppPosition)
    : isSuperAdmin ? 'Super Admin' : 'Ahli JPP';

  // Fetch JPP portal color
  useEffect(() => {
    supabase.from('portal_settings').select('color').eq('exco_module', JPP_MODULE_ID).maybeSingle()
      .then(({ data }) => { if (data?.color) setThemeColor(data.color); });
  }, []);

  // Fetch MT assignments
  useEffect(() => {
    if (!isMT || !user?.id) return;
    supabase.from('jpp_mt_assignments').select('unit').eq('mt_user_id', user.id)
      .then(({ data }) => { if (data) setAssignedUnits(data.map((d: any) => d.unit)); });
  }, [user?.id, isMT]);

  // Fetch page data
  useEffect(() => {
    const fetchData = async () => {
      const [jppRes, clubRes, actRes, bizRes, tickRes, takwimRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'JPP'),
        supabase.from('clubs').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('club_activities').select('id', { count: 'exact', head: true }).eq('is_archived', false),
        supabase.from('keusahawanan_businesses').select('id', { count: 'exact', head: true }),
        supabase.from('kebajikan_tickets').select('id', { count: 'exact', head: true }),
        supabase.from('club_activities')
          .select('id, title, start_date, end_date')
          .gte('end_date', new Date().toISOString())
          .order('start_date', { ascending: true })
          .limit(5),
      ]);
      setStats({
        jppMembers: jppRes.count ?? 0,
        totalClubs: clubRes.count ?? 0,
        totalActivities: actRes.count ?? 0,
        totalBusinesses: bizRes.count ?? 0,
        totalTickets: tickRes.count ?? 0,
      });
      setTakwim(takwimRes.data ?? []);
    };
    fetchData();
  }, []);

  // Auto-redirect normal exco to their respective module
  useEffect(() => {
    if (isNormalExco && jppUnit && unitConfig[jppUnit]) {
      navigate(`/jpp/unit/${jppUnit.toLowerCase()}`, { replace: true });
    }
  }, [isNormalExco, jppUnit, unitConfig, navigate]);

  // Determine visible units
  const visibleUnits = unitOrder.filter(code => {
    if (isYDP)  return true;
    if (isMT)   return assignedUnits.includes(code);
    return code === jppUnit;
  });

  if (isNormalExco) {
    return null; // The useEffect above handles the redirect
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">

      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[60vw] h-[60vw] rounded-full blur-3xl opacity-10"
          style={{ background: themeColor }} />
        <div className="absolute top-[50%] -right-[20%] w-[50vw] h-[50vw] rounded-full blur-3xl opacity-5"
          style={{ background: themeColor }} />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-10 md:py-14 space-y-12">

        {/* ── Hero Section ───────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-3"
        >
          {/* Badge */}
          <div className="flex items-center gap-2">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest"
              style={{
                background: hexToRgba(themeColor, 0.12),
                borderColor: hexToRgba(themeColor, 0.25),
                color: hexToRgba(themeColor, 0.9),
              }}
            >
              {isYDP
                ? <Crown className="w-3 h-3" />
                : isMT
                  ? <ShieldCheck className="w-3 h-3" />
                  : <Sparkles className="w-3 h-3" />
              }
              <span>{posLabel}</span>
              {jppUnit && <span className="opacity-60">· {jppUnit}</span>}
            </div>

            {/* Git Hash Badge */}
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest bg-amber-500/10 border-amber-500/20 text-amber-500"
              title="Current Build Hash"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
              <span>Build {__GIT_HASH__}</span>
            </div>
          </div>

          {/* Greeting */}
          <h1 className="text-4xl md:text-5xl font-black leading-tight tracking-tight">
            Selamat datang,{' '}
            <span className="text-transparent bg-clip-text"
              style={{ backgroundImage: `linear-gradient(135deg, ${themeColor}, #e11d48)` }}>
              {displayName}
            </span>
          </h1>
          <p className="text-white/40 text-sm font-medium max-w-lg leading-relaxed">
            Portal Ibu Pejabat JPP Politeknik Sultan Haji Ahmad Shah. Urus dan pantau semua unit exco dari sini.
          </p>
        </motion.div>

        {/* ── Quick Stats ──────────────────────────────────────────────── */}
        {(isYDP || (isMT && (assignedUnits.includes('KPP') || assignedUnits.includes('KEUSAHAWANAN') || assignedUnits.includes('KEBAJIKAN')))) && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {isYDP && <StatCard label="Ahli JPP" value={stats.jppMembers} icon={Crown} color={themeColor} delay={0.1} />}
            {(isYDP || (isMT && assignedUnits.includes('KPP'))) && <StatCard label="Kelab Aktif" value={stats.totalClubs} icon={Flag} color="#60A5FA" delay={0.15} />}
            {(isYDP || (isMT && assignedUnits.includes('KEUSAHAWANAN'))) && <StatCard label="Perniagaan" value={stats.totalBusinesses} icon={Store} color="#F59E0B" delay={0.2} />}
            {(isYDP || (isMT && assignedUnits.includes('KEBAJIKAN'))) && <StatCard label="Aduan E-Bantu" value={stats.totalTickets} icon={Heart} color="#EF4444" delay={0.25} />}
          </div>
        )}

        {/* ── Unit Exco Grid ───────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-[0.25em] text-white/40">Unit Exco</h2>
            {(isYDP || isMT) && (
              <span className="text-[9px] font-black uppercase tracking-widest text-white/20">
                {isYDP ? 'Akses Penuh' : `${assignedUnits.length} unit assigned`}
              </span>
            )}
          </div>

          {visibleUnits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Lock className="w-8 h-8 text-white/10 mb-3" />
              <p className="text-xs font-black text-white/20 uppercase tracking-widest">
                Tiada unit yang di-assign
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleUnits.map((code, i) => {
                const cfg = unitConfig[code];
                const isOwn = code === jppUnit;
                const hasDirectAccess = cfg?.isActive && (isYDP || isOwn || assignedUnits.includes(code));
                return (
                  <UnitCard
                    key={code}
                    code={code}
                    isLocked={!hasDirectAccess}
                    delay={0.05 * i}
                    onNavigate={(link) => navigate(link)}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* ── Takwim Terkini ────────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-[0.25em] text-white/40">
              Aktiviti Akan Datang
            </h2>
            <button
              onClick={() => navigate('/aktiviti')}
              className="text-[10px] font-black uppercase tracking-widest text-white/25 hover:text-white/50 transition-colors flex items-center gap-1"
            >
              Lihat Semua <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {takwim.length === 0 ? (
            <div className="flex items-center gap-3 px-4 py-5 rounded-2xl bg-white/[0.02] border border-white/5">
              <Clock className="w-4 h-4 text-white/15" />
              <p className="text-xs font-black text-white/20 uppercase tracking-widest">Tiada aktiviti dijadualkan</p>
            </div>
          ) : (
            <div className="space-y-2">
              {takwim.map((ev, i) => (
                <TakwimCard key={ev.id} event={ev} delay={0.05 * i} />
              ))}
            </div>
          )}
        </div>

        {/* ── Quick Actions (YDP only) ────────────────────────────────── */}
        {(isYDP) && (
          <div className="space-y-4">
            <h2 className="text-xs font-black uppercase tracking-[0.25em] text-white/40">Tindakan Pantas</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Ahli JPP',       icon: Users,      href: '/jpp/members',    color: themeColor },
                { label: 'Gambaran Sistem', icon: BarChart3,  href: '/jpp/overview',   color: '#60A5FA' },
                { label: 'Pangkalan Pelajar', icon: ShieldCheck, href: '/jpp/users', color: '#F59E0B' },
              ].map(({ label, icon: Icon, href, color }) => (
                <button
                  key={href}
                  onClick={() => navigate(href)}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/10 transition-all group text-left"
                >
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: hexToRgba(color, 0.15) }}>
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  <span className="text-xs font-black text-white/60 group-hover:text-white/80 transition-colors">{label}</span>
                  <ExternalLink className="w-3 h-3 text-white/20 ml-auto flex-shrink-0 group-hover:text-white/40 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
