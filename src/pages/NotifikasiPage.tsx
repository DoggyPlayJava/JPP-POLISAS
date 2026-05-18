import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Loader2, ArrowLeft, Filter, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useAuth } from '@/contexts/AuthContext';
import type { AppNotification, NotificationModule } from '@/lib/notifications';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { ms } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ─── Module config ─────────────────────────────────────────────────────────────
const MODULE_CONFIG: Record<NotificationModule, { label: string; color: string; bg: string; dot: string; emoji: string }> = {
  KEBAJIKAN:    { label: 'E-Kebajikan',  color: '#2DD4BF', bg: 'rgba(45,212,191,0.12)',   dot: '#2DD4BF', emoji: '🩺' },
  EKPP:         { label: 'Portal Kelab', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',   dot: '#f59e0b', emoji: '🏛️' },
  AKADEMIK:     { label: 'E-Akademik',   color: '#6366f1', bg: 'rgba(99,102,241,0.12)',   dot: '#6366f1', emoji: '📚' },
  KEUSAHAWANAN: { label: 'Keusahawanan', color: '#f97316', bg: 'rgba(249,115,22,0.12)',   dot: '#f97316', emoji: '🛒' },
  JPP:          { label: 'JPP HQ',       color: '#ef4444', bg: 'rgba(239,68,68,0.10)',    dot: '#ef4444', emoji: '🏅' },
  SYSTEM:       { label: 'Sistem',       color: '#94a3b8', bg: 'rgba(148,163,184,0.10)', dot: '#94a3b8', emoji: '⚙️' },
  POLYMART:     { label: 'PolyMart',     color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',   dot: '#f59e0b', emoji: '🛍️' },
  KAMSIS:       { label: 'i-KAMSIS',     color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)',   dot: '#8B5CF6', emoji: '🏠' },
  KLK:          { label: 'KLK',          color: '#14b8a6', bg: 'rgba(20,184,166,0.12)',   dot: '#14b8a6', emoji: '🏢' },
  POLYRIDER:    { label: 'PolyRider',    color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',   dot: '#f59e0b', emoji: '🏍️' },
  POLYTASK:     { label: 'PolyTask',     color: '#a78bfa', bg: 'rgba(167,139,250,0.12)',  dot: '#a78bfa', emoji: '📋' },
  POLYSUARA:    { label: 'PolySuara',    color: '#f43f5e', bg: 'rgba(244,63,94,0.12)',    dot: '#f43f5e', emoji: '👻' },
  POLYRENT:     { label: 'PolyRent',     color: '#34d399', bg: 'rgba(52,211,153,0.12)',   dot: '#34d399', emoji: '🏡' },
};

const MODULE_FALLBACK: Record<NotificationModule, string> = {
  KEBAJIKAN:    '/kebajikan',
  EKPP:         '/laporan',
  AKADEMIK:     '/akademik',
  KEUSAHAWANAN: '/keusahawanan',
  JPP:          '/portal',
  SYSTEM:       '/dashboard',
  POLYMART:     '/polymart',
  KAMSIS:       '/dashboard',
  KLK:          '/klk',
  POLYRIDER:    '/polyrider',
  POLYTASK:     '/polytask',
  POLYSUARA:    '/polysuara',
  POLYRENT:     '/polyrent',
};

function getNotifLink(notif: AppNotification): string | null {
  if (notif.link) return notif.link;
  return MODULE_FALLBACK[notif.module] ?? null;
}

function groupByDate(notifs: AppNotification[]): { label: string; items: AppNotification[] }[] {
  const groups: Record<string, AppNotification[]> = {};

  for (const n of notifs) {
    const date = new Date(n.created_at);
    let label: string;
    if (isToday(date)) label = 'Hari Ini';
    else if (isYesterday(date)) label = 'Semalam';
    else label = format(date, 'd MMMM yyyy', { locale: ms });

    if (!groups[label]) groups[label] = [];
    groups[label].push(n);
  }

  return Object.entries(groups).map(([label, items]) => ({ label, items }));
}

// ─── Single Notif Row ──────────────────────────────────────────────────────────
function NotifRow({ notif, onRead }: { notif: AppNotification; onRead: () => void; key?: React.Key }) {
  const isUnread = !notif.is_read;
  const cfg = MODULE_CONFIG[notif.module] ?? MODULE_CONFIG.SYSTEM;
  const hasLink = !!getNotifLink(notif);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, height: 0 }}
      onClick={onRead}
      className={cn(
        'group relative flex items-start gap-4 px-5 py-4 cursor-pointer',
        'border-b border-white/[0.04] last:border-0 transition-colors',
        'hover:bg-white/[0.03]',
        isUnread && 'bg-white/[0.02]'
      )}
    >
      {/* Module icon */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base mt-0.5"
        style={{ background: cfg.bg }}
      >
        {cfg.emoji}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
            style={{ background: cfg.bg, color: cfg.color }}
          >
            {cfg.label}
          </span>
          {isUnread && (
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 flex-shrink-0" />
          )}
        </div>
        <p className={cn(
          'text-sm leading-snug mb-1',
          isUnread ? 'font-bold text-white' : 'font-medium text-slate-300'
        )}>
          {notif.title}
        </p>
        <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 mb-1.5">
          {notif.message}
        </p>
        <p className="text-[10px] text-slate-600 font-medium uppercase tracking-wider">
          {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: ms })}
        </p>
      </div>

      {/* Arrow */}
      {hasLink && (
        <ChevronRight className="w-4 h-4 text-slate-700 group-hover:text-slate-400 transition-colors flex-shrink-0 mt-3" />
      )}

      {/* Read indicator */}
      {!isUnread && (
        <Check className="w-3 h-3 text-slate-700 flex-shrink-0 mt-3.5" />
      )}
    </motion.div>
  );
}

// ─── Module Filter Chip ────────────────────────────────────────────────────────
const ALL_MODULES: NotificationModule[] = ['KEBAJIKAN', 'EKPP', 'AKADEMIK', 'KEUSAHAWANAN', 'JPP', 'SYSTEM', 'POLYMART', 'KAMSIS', 'KLK', 'POLYRIDER', 'POLYTASK', 'POLYSUARA', 'POLYRENT'];

function FilterChip({
  module, active, count, onClick,
}: {
  module: NotificationModule | 'ALL';
  active: boolean;
  count: number;
  onClick: () => void;
  key?: React.Key;
}) {
  const cfg = module === 'ALL' ? null : MODULE_CONFIG[module];
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border',
        active
          ? 'bg-white text-slate-900 border-white shadow-md'
          : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white'
      )}
      style={active && cfg ? { background: cfg.bg, color: cfg.color, borderColor: `${cfg.color}30` } : {}}
    >
      {module === 'ALL' ? '🔔' : cfg?.emoji} {module === 'ALL' ? 'Semua' : cfg?.label}
      {count > 0 && (
        <span className={cn(
          'px-1 py-0 rounded-full text-[8px] font-black',
          active ? 'bg-white/20' : 'bg-white/10'
        )}>
          {count}
        </span>
      )}
    </button>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export function NotifikasiPage() {
  const navigate      = useNavigate();
  const { user }      = useAuth();
  const notifs        = useNotificationStore(state => state.notifs);
  const unreadCount   = useNotificationStore(state => state.unreadCount);
  const isMarkingAll  = useNotificationStore(state => state.isMarkingAll);
  const markRead      = useNotificationStore(state => state.markRead);
  const markAllRead   = useNotificationStore(state => state.markAllRead);

  const [activeModule, setActiveModule] = useState<NotificationModule | 'ALL'>('ALL');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const handleNotifClick = async (notif: AppNotification) => {
    if (!notif.is_read) await markRead(notif.id);
    const link = getNotifLink(notif);
    if (link) navigate(link);
  };

  // Filter
  const filtered = useMemo(() => {
    let result = notifs;
    if (activeModule !== 'ALL') result = result.filter(n => n.module === activeModule);
    if (showUnreadOnly) result = result.filter(n => !n.is_read);
    return result;
  }, [notifs, activeModule, showUnreadOnly]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  // Count per module
  const moduleCount = useMemo(() => {
    const counts: Record<NotificationModule | 'ALL', number> = { ALL: notifs.length } as Record<NotificationModule | 'ALL', number>;
    for (const mod of ALL_MODULES) {
      counts[mod] = notifs.filter(n => n.module === mod).length;
    }
    return counts;
  }, [notifs]);

  // Which modules are actually present
  const activeModules = ALL_MODULES.filter(m => (moduleCount[m] ?? 0) > 0);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => navigate(-1)}
              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-slate-400" />
            </button>

            <div className="flex-1">
              <h1 className="text-sm font-black text-white tracking-tight">Notifikasi</h1>
              <p className="text-[10px] text-slate-500 font-medium">
                {notifs.length} notifikasi
                {unreadCount > 0 && ` · ${unreadCount} belum dibaca`}
              </p>
            </div>

            {/* Mark all read */}
            {unreadCount > 0 && (
              <Button
                size="sm"
                disabled={isMarkingAll}
                onClick={markAllRead}
                className="h-8 gap-1.5 text-[9px] font-black uppercase tracking-wider bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/20 rounded-xl shadow-none px-3"
              >
                {isMarkingAll ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <CheckCheck className="w-3 h-3" />
                )}
                {isMarkingAll ? 'Menyimpan...' : 'Baca Semua'}
              </Button>
            )}
          </div>

          {/* ── Filters ──────────────────────────────────────────────────────── */}
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
            <FilterChip
              module="ALL"
              active={activeModule === 'ALL'}
              count={moduleCount.ALL ?? 0}
              onClick={() => setActiveModule('ALL')}
            />
            {activeModules.map(mod => {
              const handleClick: () => void = () => setActiveModule(mod);
              return (
                <FilterChip
                  key={mod}
                  module={mod}
                  active={activeModule === mod}
                  count={moduleCount[mod] as number}
                  onClick={handleClick}
                />
              );
            })}
            {/* Unread toggle */}
            <button
              onClick={() => setShowUnreadOnly(v => !v)}
              className={cn(
                'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border',
                showUnreadOnly
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white'
              )}
            >
              <Filter className="w-2.5 h-2.5" />
              Belum Baca
              {unreadCount > 0 && (
                <span className="bg-rose-500/30 text-rose-300 px-1 rounded-full text-[8px]">{unreadCount}</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
              <Bell className="w-8 h-8 text-slate-600" />
            </div>
            <div className="text-center">
              <p className="text-sm font-black text-slate-400">
                {showUnreadOnly ? 'Tiada notifikasi belum dibaca' : 'Tiada notifikasi'}
              </p>
              <p className="text-xs text-slate-600 mt-1">
                {showUnreadOnly ? 'Semua notifikasi sudah dibaca' : 'Anda akan menerima notifikasi di sini'}
              </p>
            </div>
            {showUnreadOnly && (
              <button
                onClick={() => setShowUnreadOnly(false)}
                className="text-xs text-slate-500 hover:text-slate-300 underline underline-offset-2 transition-colors"
              >
                Papar semua notifikasi
              </button>
            )}
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {grouped.map(group => (
              <motion.div
                key={group.label}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {/* Date group label */}
                <div className="px-5 py-2 mt-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
                    {group.label}
                  </p>
                </div>
                {/* Notif rows */}
                {group.items.map((n: AppNotification, i: number) => {
                  const handleRead: () => void = () => { handleNotifClick(n); };
                  return (
                    <NotifRow
                      key={n.id || `${group.label}-${i}`}
                      notif={n}
                      onRead={handleRead}
                    />
                  );
                })}
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {/* Bottom spacing */}
        <div className="h-16" />
      </div>
    </div>
  );
}
