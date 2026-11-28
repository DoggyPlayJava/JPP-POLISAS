import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Loader2, ArrowLeft, Filter, ChevronRight, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useAuth } from '@/contexts/AuthContext';
import {
  resolveNotificationLink,
  localizeNotification,
  type AppNotification,
  type NotificationModule,
} from '@/lib/notifications';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { ms, enUS } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { BottomNav } from '@/components/layout/BottomNav';
import { FloatingAiChat } from '@/components/ai/FloatingAiChat';

// ─── Single Notif Row ──────────────────────────────────────────────────────────
function NotifRow({
  notif,
  onRead,
  config,
  dateLocale,
  lang,
}: {
  notif: AppNotification;
  onRead: () => void;
  config: { label: string; color: string; bg: string; dot: string; emoji: string };
  dateLocale: typeof ms | typeof enUS;
  lang: string;
  key?: React.Key;
}) {
  const { t } = useTranslation(['portal', 'common']);
  const isUnread = !notif.is_read;
  const cfg = config;
  const hasLink = !!resolveNotificationLink(notif);
  const localized = localizeNotification(notif, t, lang);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      onClick={onRead}
      className={cn(
        'group relative flex items-start gap-4 px-5 py-4 cursor-pointer',
        'border-b border-[#B8E4DC]/50 dark:border-[#252B35]/70 last:border-0 transition-colors',
        'hover:bg-[#EBF7F4]/60 dark:hover:bg-[#13171D]/80',
        isUnread && 'bg-[#EBF7F4]/40 dark:bg-[#13171D]/60'
      )}
    >
      {/* Module icon */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base mt-0.5"
        style={{ background: cfg.bg, color: cfg.color }}
      >
        {cfg.emoji}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full"
            style={{ background: cfg.bg, color: cfg.color }}
          >
            {cfg.label}
          </span>
          {isUnread && (
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
          )}
        </div>
        <p className={cn(
          'text-sm leading-snug mb-1',
          isUnread ? 'font-bold text-[#0B2420] dark:text-[#F1F5F9]' : 'font-medium text-[#3B635C] dark:text-[#94A0B2]'
        )}>
          {localized.title}
        </p>
        <p className="text-xs text-[#3B635C] dark:text-[#94A0B2] leading-relaxed line-clamp-2 mb-1.5">
          {localized.message}
        </p>
        <p className="text-xs text-[#3B635C]/75 dark:text-[#94A0B2]/65 font-medium">
          {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: dateLocale })}
        </p>
      </div>

      {/* Arrow */}
      {hasLink && (
        <ChevronRight className="w-4 h-4 text-[#3B635C]/70 dark:text-[#94A0B2]/70 group-hover:text-[#0F766E] dark:group-hover:text-[#2DD4BF] transition-colors flex-shrink-0 mt-3" />
      )}

      {/* Read indicator */}
      {!isUnread && (
        <Check className="w-3.5 h-3.5 text-[#0F766E] dark:text-[#2DD4BF] flex-shrink-0 mt-3.5" />
      )}
    </motion.div>
  );
}

// ─── Module Filter Chip ────────────────────────────────────────────────────────
const ALL_MODULES: NotificationModule[] = [
  'KEBAJIKAN', 'EKPP', 'AKADEMIK', 'KEUSAHAWANAN', 'JPP', 'SYSTEM',
  'POLYMART', 'KAMSIS', 'KLK', 'POLYRIDER', 'POLYTASK', 'POLYSUARA',
  'POLYRENT', 'MAKMP', 'FOODBANK',
];

function FilterChip({
  module,
  active,
  count,
  onClick,
  config,
  allLabel,
}: {
  module: NotificationModule | 'ALL';
  active: boolean;
  count: number;
  onClick: () => void;
  config?: { label: string; color: string; bg: string; dot: string; emoji: string };
  allLabel?: string;
  key?: React.Key;
}) {
  const cfg = module === 'ALL' ? null : config;
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 min-h-[36px] rounded-full text-xs font-semibold transition-all border cursor-pointer',
        active
          ? 'bg-[#0F766E] text-white border-[#0F766E] dark:bg-[#2DD4BF] dark:text-[#090B0E] dark:border-[#2DD4BF] shadow-xs'
          : 'bg-white dark:bg-[#13171D] text-[#3B635C] dark:text-[#94A0B2] border-[#B8E4DC]/80 dark:border-[#252B35] hover:bg-[#EBF7F4] dark:hover:bg-[#1B2028]'
      )}
      style={active && cfg ? { background: cfg.bg, color: cfg.color, borderColor: `${cfg.color}35` } : {}}
    >
      {module === 'ALL' ? <Bell className="w-3.5 h-3.5 shrink-0" /> : <span>{cfg?.emoji}</span>} {module === 'ALL' ? allLabel : cfg?.label}
      {count > 0 && (
        <span className={cn(
          'px-1.5 py-0.5 rounded-full text-xs font-bold leading-none',
          active ? 'bg-black/15 dark:bg-white/20' : 'bg-[#EBF7F4] dark:bg-white/10'
        )}>
          {count}
        </span>
      )}
    </button>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export function NotifikasiPage() {
  const { t, i18n } = useTranslation(['portal', 'common']);
  const dateLocale    = i18n.language?.startsWith('en') ? enUS : ms;
  const navigate      = useNavigate();
  const { user }      = useAuth();
  const notifs        = useNotificationStore(state => state.notifs);
  const unreadCount   = useNotificationStore(state => state.unreadCount);
  const isMarkingAll  = useNotificationStore(state => state.isMarkingAll);
  const markRead      = useNotificationStore(state => state.markRead);
  const markAllRead   = useNotificationStore(state => state.markAllRead);

  const [activeModule, setActiveModule] = useState<NotificationModule | 'ALL'>('ALL');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const moduleConfig = useMemo<Record<NotificationModule, { label: string; color: string; bg: string; dot: string; emoji: string }>>(() => ({
    KEBAJIKAN:    { label: t('portal:module_kebajikan_title', 'e-Kebajikan'),        color: '#0F766E', bg: 'rgba(15,118,110,0.12)',   dot: '#0F766E', emoji: '🩺' },
    EKPP:         { label: t('portal:module_ekpp_title', 'Sistem Kelab'),            color: '#B45309', bg: 'rgba(245,158,11,0.14)',   dot: '#D97706', emoji: '🏛️' },
    AKADEMIK:     { label: t('portal:module_akademik_title', 'e-Akademik'),          color: '#4338CA', bg: 'rgba(99,102,241,0.12)',   dot: '#4F46E5', emoji: '📚' },
    KEUSAHAWANAN: { label: t('portal:module_keusahawanan_title', 'e-Keusahawanan'),  color: '#C2410C', bg: 'rgba(249,115,22,0.12)',   dot: '#EA580C', emoji: '🛒' },
    JPP:          { label: 'JPP HQ',                                                  color: '#B91C1C', bg: 'rgba(239,68,68,0.10)',    dot: '#DC2626', emoji: '🏅' },
    SYSTEM:       { label: t('common:module_system', 'Sistem'),                       color: '#475569', bg: 'rgba(148,163,184,0.14)', dot: '#64748B', emoji: '⚙️' },
    POLYMART:     { label: 'PolyMart',                                                color: '#B45309', bg: 'rgba(245,158,11,0.14)',   dot: '#D97706', emoji: '🛍️' },
    KAMSIS:       { label: 'i-KAMSIS',                                                color: '#6D28D9', bg: 'rgba(139,92,246,0.12)',   dot: '#7C3AED', emoji: '🏠' },
    KLK:          { label: 'KLK',                                                     color: '#0F766E', bg: 'rgba(20,184,166,0.12)',   dot: '#0D9488', emoji: '🏢' },
    POLYRIDER:    { label: 'PolyRider',                                               color: '#B45309', bg: 'rgba(245,158,11,0.14)',   dot: '#D97706', emoji: '🏍️' },
    POLYTASK:     { label: 'PolyTask',                                                color: '#6D28D9', bg: 'rgba(139,92,246,0.12)',   dot: '#7C3AED', emoji: '📋' },
    POLYSUARA:    { label: 'PolySuara',                                               color: '#BE123C', bg: 'rgba(244,63,94,0.12)',    dot: '#E11D48', emoji: '✦' },
    POLYRENT:     { label: 'PolyRent',                                                color: '#047857', bg: 'rgba(16,185,129,0.12)',   dot: '#059669', emoji: '🏡' },
    MAKMP:        { label: 'MAKMP',                                                   color: '#B45309', bg: 'rgba(245,158,11,0.14)',   dot: '#D97706', emoji: '🏆' },
    FOODBANK:     { label: 'Food Bank',                                               color: '#0F766E', bg: 'rgba(15,118,110,0.12)',   dot: '#0F766E', emoji: '🍱' },
  }), [t]);

  const handleNotifClick = async (notif: AppNotification) => {
    if (!notif.is_read) await markRead(notif.id);
    const link = resolveNotificationLink(notif);
    if (link) navigate(link);
  };

  // Filter
  const filtered = useMemo(() => {
    let result = notifs;
    if (activeModule !== 'ALL') result = result.filter(n => n.module === activeModule);
    if (showUnreadOnly) result = result.filter(n => !n.is_read);
    return result;
  }, [notifs, activeModule, showUnreadOnly]);

  const grouped = useMemo(() => {
    const groups: Record<string, AppNotification[]> = {};

    for (const n of filtered) {
      const date = new Date(n.created_at);
      let label: string;
      if (isToday(date)) label = t('portal:today', 'Hari Ini');
      else if (isYesterday(date)) label = t('portal:yesterday', 'Semalam');
      else label = format(date, 'd MMMM yyyy', { locale: dateLocale });

      if (!groups[label]) groups[label] = [];
      groups[label].push(n);
    }

    return Object.entries(groups).map(([label, items]) => ({ label, items }));
  }, [filtered, t, dateLocale]);

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
  void user;

  return (
    <div className="min-h-[100dvh] bg-[#F6FBF9] dark:bg-[#090B0E] text-[#0B2420] dark:text-[#F1F5F9]">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white dark:bg-[#13171D] border-b border-[#B8E4DC]/70 dark:border-[#252B35] shadow-surface-sm pt-[var(--sat,env(safe-area-inset-top,0px))]">
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => navigate(-1)}
              aria-label={t('common:back', 'Kembali')}
              className="w-9 h-9 rounded-xl bg-[#EBF7F4] dark:bg-[#1B2028] hover:bg-[#D5EFEA] dark:hover:bg-[#232933] flex items-center justify-center transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-[#0F766E] dark:text-[#2DD4BF]" />
            </button>

            <div className="flex-1">
              <h1 className="text-base font-bold text-[#0B2420] dark:text-[#F1F5F9] tracking-tight">
                {t('portal:notifications_title', 'Notifikasi')}
              </h1>
              <p className="text-xs text-[#3B635C] dark:text-[#94A0B2] font-medium">
                {t('portal:notifications_count', { count: notifs.length, defaultValue: `${notifs.length} notifikasi` })}
                {unreadCount > 0 && t('portal:notifications_unread_count', { count: unreadCount, defaultValue: ` · ${unreadCount} belum dibaca` })}
              </p>
            </div>

            {/* Mark all read */}
            {unreadCount > 0 && (
              <Button
                size="sm"
                disabled={isMarkingAll}
                onClick={markAllRead}
                className="h-9 gap-1.5 text-xs font-semibold bg-[#EBF7F4] hover:bg-[#D5EFEA] dark:bg-[#1B2028] dark:hover:bg-[#232933] text-[#0F766E] dark:text-[#2DD4BF] border border-[#B8E4DC] dark:border-[#252B35] rounded-xl shadow-none px-3.5"
              >
                {isMarkingAll ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCheck className="w-3.5 h-3.5" />
                )}
                {isMarkingAll ? t('common:saving', 'Menyimpan...') : t('portal:mark_all_read', 'Baca Semua')}
              </Button>
            )}
          </div>

          {/* ── Filters ──────────────────────────────────────────────────────── */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <FilterChip
              module="ALL"
              active={activeModule === 'ALL'}
              count={moduleCount.ALL ?? 0}
              onClick={() => setActiveModule('ALL')}
              allLabel={t('portal:filter_all', 'Semua')}
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
                  config={moduleConfig[mod]}
                />
              );
            })}
            {/* Unread toggle */}
            <button
              onClick={() => setShowUnreadOnly(v => !v)}
              className={cn(
                'flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 min-h-[36px] rounded-full text-xs font-semibold transition-all border cursor-pointer',
                showUnreadOnly
                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                  : 'bg-white dark:bg-[#13171D] text-[#3B635C] dark:text-[#94A0B2] border-[#B8E4DC]/80 dark:border-[#252B35] hover:bg-[#EBF7F4] dark:hover:bg-[#1B2028]'
              )}
            >
              <Filter className="w-3 h-3" />
              {t('portal:filter_unread', 'Belum Baca')}
              {unreadCount > 0 && (
                <span className="bg-rose-500/20 text-rose-600 dark:text-rose-300 px-1.5 py-0.5 rounded-full text-xs leading-none">{unreadCount}</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 px-4">
            <div className="w-16 h-16 rounded-2xl bg-[#EBF7F4] dark:bg-[#13171D] border border-[#B8E4DC]/80 dark:border-[#252B35] flex items-center justify-center">
              <Bell className="w-8 h-8 text-[#0F766E] dark:text-[#2DD4BF]" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-[#0B2420] dark:text-[#F1F5F9]">
                {showUnreadOnly ? t('portal:no_unread_notifications', 'Tiada notifikasi belum dibaca') : t('portal:no_notifications', 'Tiada notifikasi')}
              </p>
              <p className="text-xs text-[#3B635C] dark:text-[#94A0B2] mt-1">
                {showUnreadOnly ? t('portal:all_notifications_read', 'Semua notifikasi sudah dibaca') : t('portal:will_receive_notifications_here', 'Anda akan menerima notifikasi di sini')}
              </p>
            </div>
            {showUnreadOnly && (
              <button
                onClick={() => setShowUnreadOnly(false)}
                className="text-xs font-semibold text-[#0F766E] dark:text-[#2DD4BF] hover:underline underline-offset-2 transition-colors cursor-pointer"
              >
                {t('portal:show_all_notifications', 'Papar semua notifikasi')}
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
                <div className="px-5 py-2.5 mt-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#3B635C] dark:text-[#94A0B2]">
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
                      config={moduleConfig[n.module] ?? moduleConfig.SYSTEM}
                      dateLocale={dateLocale}
                      lang={i18n.language || 'ms'}
                    />
                  );
                })}
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {/* Bottom spacing */}
        <div className="h-28 md:h-16" aria-hidden="true" />
      </div>
      <BottomNav />
      <FloatingAiChat />
    </div>
  );
}

export default NotifikasiPage;
