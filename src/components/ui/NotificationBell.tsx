import React from 'react';
import { Bell, ChevronRight, CheckCheck, Loader2, ArrowRight } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useNotificationStore } from '@/store/useNotificationStore';
import type { AppNotification } from '@/lib/notifications';
import { formatDistanceToNow } from 'date-fns';
import { ms } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { NotificationModule } from '@/lib/notifications';

// ─── Smart fallback link berdasarkan modul ────────────────────────────────────
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
};

function getNotifLink(notif: AppNotification): string | null {
  if (notif.link) return notif.link;
  return MODULE_FALLBACK[notif.module] ?? null;
}

// ─── Module badge config ───────────────────────────────────────────────────────
const MODULE_CONFIG: Record<NotificationModule, { label: string; color: string; bg: string; dot: string }> = {
  KEBAJIKAN:    { label: 'E-Kebajikan',  color: '#2DD4BF', bg: 'rgba(45,212,191,0.12)',   dot: '#2DD4BF' },
  EKPP:         { label: 'Portal Kelab', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',   dot: '#f59e0b' },
  AKADEMIK:     { label: 'E-Akademik',   color: '#6366f1', bg: 'rgba(99,102,241,0.12)',   dot: '#6366f1' },
  KEUSAHAWANAN: { label: 'Keusahawanan', color: '#f97316', bg: 'rgba(249,115,22,0.12)',   dot: '#f97316' },
  JPP:          { label: 'JPP HQ',       color: '#8b1a1a', bg: 'rgba(139,26,26,0.12)',    dot: '#ef4444' },
  SYSTEM:       { label: 'Sistem',       color: '#94a3b8', bg: 'rgba(148,163,184,0.10)', dot: '#94a3b8' },
  POLYMART:     { label: 'PolyMart',     color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',   dot: '#f59e0b' },
  KAMSIS:       { label: 'i-KAMSIS',     color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)',   dot: '#8B5CF6' },
  KLK:          { label: 'KLK',          color: '#14b8a6', bg: 'rgba(20,184,166,0.12)',   dot: '#14b8a6' },
  POLYRIDER:    { label: 'PolyRider',    color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',   dot: '#f59e0b' },
};

function ModuleBadge({ module }: { module: NotificationModule }) {
  const cfg = MODULE_CONFIG[module] ?? MODULE_CONFIG.SYSTEM;
  return (
    <span
      className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

function NotifItem({ notif, onRead }: { notif: AppNotification; onRead: () => void }) {
  const isUnread = !notif.is_read;
  const hasLink = !!getNotifLink(notif);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      onClick={onRead}
      className={cn(
        'relative px-4 py-3.5 cursor-pointer transition-colors group',
        'hover:bg-white/5 border-b border-white/[0.05] last:border-0',
        isUnread && 'bg-white/[0.025]'
      )}
    >
      {/* Unread dot */}
      {isUnread && (
        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-rose-400" />
      )}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="mb-1.5">
            <ModuleBadge module={notif.module} />
          </div>
          <p className={cn(
            'text-xs leading-snug mb-0.5',
            isUnread ? 'font-bold text-slate-100' : 'font-medium text-slate-300'
          )}>
            {notif.title}
          </p>
          <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
            {notif.message}
          </p>
          <p className="text-[9px] text-slate-500 font-medium mt-1.5 uppercase tracking-wider">
            {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: ms })}
          </p>
        </div>
        {hasLink && (
          <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-300 transition-colors flex-shrink-0 mt-1" />
        )}
      </div>
    </motion.div>
  );
}

export function NotificationBell({ variant = 'light' }: { variant?: 'dark' | 'light' }) {
  const notifs        = useNotificationStore(state => state.notifs);
  const unreadCount   = useNotificationStore(state => state.unreadCount);
  const isMarkingAll  = useNotificationStore(state => state.isMarkingAll);
  const markRead      = useNotificationStore(state => state.markRead);
  const markAllRead   = useNotificationStore(state => state.markAllRead);
  const navigate      = useNavigate();

  const handleNotifClick = async (notif: AppNotification) => {
    await markRead(notif.id);
    const link = getNotifLink(notif);
    if (link) navigate(link);
  };

  // Group by today vs older
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayNotifs = notifs.filter(n => new Date(n.created_at) >= today);
  const olderNotifs = notifs.filter(n => new Date(n.created_at) < today);

  const isDark = variant === 'dark';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'relative rounded-xl h-9 w-9 transition-all',
            isDark
              ? 'hover:bg-white/5 text-slate-400 hover:text-white'
              : 'hover:bg-muted/60 text-muted-foreground/70'
          )}
        >
          <Bell className="h-[18px] w-[18px]" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                key="badge"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1 w-[18px] h-[18px] bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-lg"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-80 p-0 rounded-2xl shadow-2xl border-0 overflow-hidden bg-slate-900"
        style={{ border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-950/80" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-2">
            <Bell className="w-3.5 h-3.5 text-slate-400" />
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-200">Notifikasi</p>
            {unreadCount > 0 && (
              <span className="text-[9px] font-black bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded-full">
                {unreadCount} baharu
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              disabled={isMarkingAll}
              className={cn(
                'flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider transition-all',
                isMarkingAll
                  ? 'text-slate-600 cursor-not-allowed'
                  : 'text-slate-500 hover:text-emerald-400'
              )}
            >
              {isMarkingAll ? (
                <>
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <CheckCheck className="w-2.5 h-2.5" />
                  <span>Baca semua</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Content */}
        <div className="max-h-[340px] overflow-y-auto scrollbar-hide">
          {notifs.length === 0 ? (
            <div className="py-10 text-center">
              <Bell className="w-8 h-8 text-slate-700 mx-auto mb-2 opacity-40" />
              <p className="text-xs text-slate-500 font-medium">Tiada notifikasi baharu</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {todayNotifs.length > 0 && (
                <React.Fragment key="today">
                  <p className="px-4 pt-3 pb-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Hari Ini</p>
                  {todayNotifs.map((n, i) => (
                    <NotifItem key={n.id || `today-${i}`} notif={n} onRead={() => handleNotifClick(n)} />
                  ))}
                </React.Fragment>
              )}
              {olderNotifs.length > 0 && (
                <React.Fragment key="older">
                  <p className="px-4 pt-3 pb-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Sebelumnya</p>
                  {olderNotifs.map((n, i) => (
                    <NotifItem key={n.id || `older-${i}`} notif={n} onRead={() => handleNotifClick(n)} />
                  ))}
                </React.Fragment>
              )}
            </AnimatePresence>
          )}
        </div>

        {/* Footer — Lihat Semua */}
        {notifs.length > 0 && (
          <div
            className="border-t px-4 py-2.5"
            style={{ borderColor: 'rgba(255,255,255,0.06)' }}
          >
            <button
              onClick={() => navigate('/notifikasi')}
              className="w-full flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors py-0.5"
            >
              <span>Lihat Semua Notifikasi</span>
              <ArrowRight className="w-2.5 h-2.5" />
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}