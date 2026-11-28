import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, ChevronRight, CheckCheck, Loader2, ArrowRight } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useNotificationStore } from '@/store/useNotificationStore';
import {
  resolveNotificationLink,
  localizeNotification,
  type AppNotification,
  type NotificationModule,
} from '@/lib/notifications';
import { formatDistanceToNow } from 'date-fns';
import { ms, enUS } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ─── Module badge config (Dual-Theme WCAG AA) ──────────────────────────────────
const MODULE_CONFIG: Record<NotificationModule, { labelKey?: string; fallback: string; badgeClass: string; dotClass: string }> = {
  KEBAJIKAN:    { labelKey: 'common:module_kebajikan',    fallback: 'E-Kebajikan',  badgeClass: 'bg-teal-500/12 text-teal-800 dark:text-[#2DD4BF]',         dotClass: 'bg-teal-600 dark:bg-[#2DD4BF]' },
  EKPP:         { labelKey: 'common:club_portal',         fallback: 'Portal Kelab', badgeClass: 'bg-amber-500/12 text-amber-800 dark:text-amber-300',       dotClass: 'bg-amber-600 dark:bg-amber-400' },
  AKADEMIK:     { labelKey: 'common:module_akademik',     fallback: 'E-Akademik',   badgeClass: 'bg-indigo-500/12 text-indigo-700 dark:text-indigo-300',    dotClass: 'bg-indigo-600 dark:bg-indigo-400' },
  KEUSAHAWANAN: { labelKey: 'common:module_keusahawanan', fallback: 'Keusahawanan', badgeClass: 'bg-orange-500/12 text-orange-800 dark:text-orange-300',    dotClass: 'bg-orange-600 dark:bg-orange-400' },
  JPP:          {                                         fallback: 'JPP HQ',       badgeClass: 'bg-teal-600/12 text-[#0F766E] dark:text-[#2DD4BF]',        dotClass: 'bg-[#0F766E] dark:bg-[#2DD4BF]' },
  SYSTEM:       { labelKey: 'common:module_system',       fallback: 'Sistem',       badgeClass: 'bg-slate-500/12 text-slate-700 dark:text-slate-300',       dotClass: 'bg-slate-500 dark:bg-slate-400' },
  POLYMART:     {                                         fallback: 'PolyMart',     badgeClass: 'bg-amber-500/12 text-amber-800 dark:text-amber-300',       dotClass: 'bg-amber-600 dark:bg-amber-400' },
  KAMSIS:       {                                         fallback: 'i-KAMSIS',     badgeClass: 'bg-violet-500/12 text-violet-700 dark:text-violet-300',    dotClass: 'bg-violet-600 dark:bg-violet-400' },
  KLK:          {                                         fallback: 'KLK',          badgeClass: 'bg-teal-500/12 text-teal-800 dark:text-teal-300',          dotClass: 'bg-teal-600 dark:bg-teal-400' },
  POLYRIDER:    {                                         fallback: 'PolyRider',    badgeClass: 'bg-amber-500/12 text-amber-800 dark:text-amber-300',       dotClass: 'bg-amber-600 dark:bg-amber-400' },
  POLYTASK:     {                                         fallback: 'PolyTask',     badgeClass: 'bg-violet-500/12 text-violet-700 dark:text-violet-300',    dotClass: 'bg-violet-600 dark:bg-violet-400' },
  POLYSUARA:    {                                         fallback: 'PolySuara',    badgeClass: 'bg-rose-500/12 text-rose-700 dark:text-rose-300',          dotClass: 'bg-rose-600 dark:bg-rose-400' },
  POLYRENT:     {                                         fallback: 'PolyRent',     badgeClass: 'bg-emerald-500/12 text-emerald-800 dark:text-emerald-300', dotClass: 'bg-emerald-600 dark:bg-emerald-400' },
  MAKMP:        {                                         fallback: 'MAKMP',        badgeClass: 'bg-amber-500/12 text-amber-800 dark:text-amber-300',       dotClass: 'bg-amber-600 dark:bg-amber-400' },
  FOODBANK:     {                                         fallback: 'Food Bank',    badgeClass: 'bg-teal-500/12 text-teal-800 dark:text-[#2DD4BF]',         dotClass: 'bg-teal-600 dark:bg-[#2DD4BF]' },
};

function ModuleBadge({ module }: { module: NotificationModule }) {
  const { t } = useTranslation('common');
  const cfg = MODULE_CONFIG[module] ?? MODULE_CONFIG.SYSTEM;
  const label = cfg.labelKey ? t(cfg.labelKey, cfg.fallback) : cfg.fallback;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full',
        cfg.badgeClass
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', cfg.dotClass)} />
      {label}
    </span>
  );
}

function NotifItem({
  notif,
  onRead,
  dateLocale,
  lang,
}: {
  notif: AppNotification;
  onRead: () => void;
  dateLocale: typeof ms | typeof enUS;
  lang: string;
  key?: React.Key;
}) {
  const { t } = useTranslation(['common', 'portal']);
  const isUnread = !notif.is_read;
  const hasLink = !!resolveNotificationLink(notif);
  const localized = localizeNotification(notif, t, lang);

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={onRead}
      className={cn(
        'relative px-4 py-3.5 cursor-pointer transition-colors group',
        'hover:bg-muted/60 border-b border-border/60 last:border-0',
        isUnread && 'bg-primary/[0.05] dark:bg-primary/[0.08]'
      )}
    >
      {/* Unread dot */}
      {isUnread && (
        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-rose-500 dark:bg-rose-400" />
      )}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="mb-1.5">
            <ModuleBadge module={notif.module} />
          </div>
          <p className={cn(
            'text-xs leading-snug mb-0.5',
            isUnread ? 'font-bold text-foreground' : 'font-medium text-foreground/85'
          )}>
            {localized.title}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {localized.message}
          </p>
          <p className="text-xs text-muted-foreground/80 font-medium mt-1.5">
            {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: dateLocale })}
          </p>
        </div>
        {hasLink && (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-foreground transition-colors flex-shrink-0 mt-1" />
        )}
      </div>
    </motion.div>
  );
}

export function NotificationBell({ variant = 'light' }: { variant?: 'dark' | 'light' }) {
  const { t, i18n } = useTranslation(['common', 'portal']);
  const dateLocale    = i18n.language?.startsWith('en') ? enUS : ms;
  const notifs        = useNotificationStore(state => state.notifs);
  const unreadCount   = useNotificationStore(state => state.unreadCount);
  const isMarkingAll  = useNotificationStore(state => state.isMarkingAll);
  const markRead      = useNotificationStore(state => state.markRead);
  const markAllRead   = useNotificationStore(state => state.markAllRead);
  const navigate      = useNavigate();
  const [open, setOpen] = useState(false);

  const handleNotifClick = (notif: AppNotification) => {
    setOpen(false);
    void markRead(notif.id);
    const link = resolveNotificationLink(notif);
    if (link) navigate(link);
  };

  // Group by today vs older
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayNotifs = notifs.filter(n => new Date(n.created_at) >= today);
  const olderNotifs = notifs.filter(n => new Date(n.created_at) < today);

  const isDark = variant === 'dark';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('common:notifications', 'Notifikasi')}
          className={cn(
            'relative rounded-xl h-9 w-9',
            isDark
              ? 'hover:bg-white/10 text-slate-300 hover:text-white'
              : 'hover:bg-muted/70 text-muted-foreground hover:text-foreground'
          )}
        >
          <Bell className="h-[18px] w-[18px]" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                key="badge"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-xs font-bold leading-none rounded-full flex items-center justify-center shadow-surface-sm"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-80 p-0 rounded-2xl shadow-surface-lg border border-border overflow-hidden bg-card dark:bg-[#13171D] text-card-foreground"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/70 bg-muted/40 dark:bg-[#0E1116]">
          <div className="flex items-center gap-2">
            <Bell className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-xs font-bold uppercase tracking-wider text-foreground">
              {t('common:notifications', 'Notifikasi')}
            </p>
            {unreadCount > 0 && (
              <span className="text-xs font-semibold bg-rose-500/15 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-full">
                {t('common:new_count_badge', { count: unreadCount, defaultValue: `${unreadCount} baharu` })}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              disabled={isMarkingAll}
              className={cn(
                'flex items-center gap-1 text-xs font-semibold transition-colors cursor-pointer',
                isMarkingAll
                  ? 'text-muted-foreground/50 cursor-not-allowed'
                  : 'text-muted-foreground hover:text-primary'
              )}
            >
              {isMarkingAll ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>{t('common:saving', 'Menyimpan...')}</span>
                </>
              ) : (
                <>
                  <CheckCheck className="w-3 h-3" />
                  <span>{t('common:read_all', 'Baca semua')}</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Content */}
        <div className="max-h-[340px] overflow-y-auto overscroll-contain scrollbar-hide">
          {notifs.length === 0 ? (
            <div className="py-10 text-center">
              <Bell className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground font-medium">{t('common:no_new_notifications', 'Tiada notifikasi baharu')}</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {todayNotifs.length > 0 && (
                <React.Fragment key="today">
                  <p className="px-4 pt-3 pb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('common:today', 'Hari Ini')}</p>
                  {todayNotifs.map((n, i) => (
                    <NotifItem
                      key={n.id || `today-${i}`}
                      notif={n}
                      onRead={() => handleNotifClick(n)}
                      dateLocale={dateLocale}
                      lang={i18n.language || 'ms'}
                    />
                  ))}
                </React.Fragment>
              )}
              {olderNotifs.length > 0 && (
                <React.Fragment key="older">
                  <p className="px-4 pt-3 pb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('common:previous', 'Sebelumnya')}</p>
                  {olderNotifs.map((n, i) => (
                    <NotifItem
                      key={n.id || `older-${i}`}
                      notif={n}
                      onRead={() => handleNotifClick(n)}
                      dateLocale={dateLocale}
                      lang={i18n.language || 'ms'}
                    />
                  ))}
                </React.Fragment>
              )}
            </AnimatePresence>
          )}
        </div>

        {/* Footer — Lihat Semua */}
        {notifs.length > 0 && (
          <div className="border-t border-border/70 px-4 py-2.5 bg-muted/25 dark:bg-[#0E1116]/60">
            <button
              onClick={() => {
                setOpen(false);
                navigate('/notifikasi');
              }}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors py-0.5 cursor-pointer"
            >
              <span>{t('common:view_all_notifications', 'Lihat Semua Notifikasi')}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
