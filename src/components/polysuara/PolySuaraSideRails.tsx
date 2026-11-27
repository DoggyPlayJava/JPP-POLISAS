import React from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bookmark,
  CheckCircle2,
  Clock,
  Flame,
  Focus,
  Hash,
  HeartHandshake,
  HelpCircle,
  MessageSquarePlus,
  Search,
  ShieldCheck,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export type FeedSortMode = 'LATEST' | 'TRENDING' | 'JPP_REPLIED' | 'MINE' | 'BOOKMARKS';
export type FeedFormatFilter = 'ALL' | 'QNA' | 'SHOUTOUT' | 'DEBATE';

export interface PolySuaraLeftRailProps {
  sortBy: FeedSortMode;
  onSelectSort: (mode: FeedSortMode) => void;
  activeCategory: string;
  onSelectCategory: (category: string) => void;
  activeFormat?: FeedFormatFilter;
  onSelectFormat?: (format: FeedFormatFilter) => void;
  focusMode: boolean;
  onToggleFocusMode: () => void;
  onOpenCompose: () => void;
  jppRepliedCount: number;
  myCount: number;
  bookmarkCount: number;
  categoryOptions: ReadonlyArray<{ key: string; label: string }>;
}

export function PolySuaraLeftRail({
  sortBy,
  onSelectSort,
  activeCategory,
  onSelectCategory,
  activeFormat = 'ALL',
  onSelectFormat,
  focusMode,
  onToggleFocusMode,
  onOpenCompose,
  jppRepliedCount,
  myCount,
  bookmarkCount,
  categoryOptions,
}: PolySuaraLeftRailProps) {
  const { t } = useTranslation(['services', 'common']);

  const feedViews: Array<{
    id: FeedSortMode;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
  }> = [
    { id: 'LATEST', label: t('services:suara_sort_newest', 'Terkini'), icon: Clock },
    { id: 'TRENDING', label: t('services:suara_sort_trending', 'Hangat'), icon: Flame },
    {
      id: 'JPP_REPLIED',
      label: t('services:suara_tab_jpp_replied', 'Dijawab JPP'),
      icon: ShieldCheck,
      count: jppRepliedCount > 0 ? jppRepliedCount : undefined,
    },
    {
      id: 'MINE',
      label: t('services:suara_tab_my_voice', 'Suara Saya'),
      icon: UserCheck,
      count: myCount > 0 ? myCount : undefined,
    },
    {
      id: 'BOOKMARKS',
      label: t('services:suara_tab_saved', 'Disimpan'),
      icon: Bookmark,
      count: bookmarkCount > 0 ? bookmarkCount : undefined,
    },
  ];

  const formatOptions: Array<{
    id: FeedFormatFilter;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'ALL', label: t('services:suara_format_all', 'Semua'), icon: Sparkles },
    { id: 'QNA', label: t('services:suara_intent_qna', 'Tanya Kampus'), icon: HelpCircle },
    { id: 'SHOUTOUT', label: t('services:suara_intent_shoutout', 'Apresiasi'), icon: HeartHandshake },
    { id: 'DEBATE', label: t('services:suara_intent_debate', 'Debat Setuju/Tidak'), icon: Flame },
  ];

  return (
    <aside
      aria-label={t('services:suara_navigation_rail', 'Navigasi Saluran PolySuara')}
      className="hidden lg:flex lg:col-span-3 flex-col gap-5 sticky top-20 self-start pr-2"
    >
      {/* X / Threads style clean borderless feed navigation */}
      <nav className="space-y-1">
        <p className="px-3 pb-1 text-[11px] font-semibold text-[#3B635C] dark:text-[#94A0B2] uppercase tracking-wider">
          {t('services:suara_views_heading', 'Paparan Suapan')}
        </p>
        {feedViews.map((view) => {
          const Icon = view.icon;
          const active = sortBy === view.id;
          return (
            <button
              key={view.id}
              type="button"
              onClick={() => onSelectSort(view.id)}
              className={cn(
                'w-full flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-full text-sm transition-colors cursor-pointer text-left',
                active
                  ? 'bg-[#EBF7F4] dark:bg-[#1B2028] text-[#0F766E] dark:text-[#2DD4BF] font-bold'
                  : 'text-[#0B2420] dark:text-[#F1F5F9] font-medium hover:bg-[#EBF7F4]/70 dark:hover:bg-[#13171D]'
              )}
            >
              <span className="flex items-center gap-3 min-w-0">
                <Icon className={cn('w-4.5 h-4.5 shrink-0', active && 'text-[#0F766E] dark:text-[#2DD4BF]')} />
                <span className="truncate">{view.label}</span>
              </span>
              {view.count !== undefined && (
                <span
                  className={cn(
                    'text-[11px] font-mono tabular-nums px-2 py-0.5 rounded-full shrink-0',
                    active
                      ? 'bg-[#0F766E] text-white dark:bg-[#2DD4BF] dark:text-[#090B0E]'
                      : 'bg-[#EBF7F4] dark:bg-[#1B2028] text-[#3B635C] dark:text-[#94A0B2]'
                  )}
                >
                  {view.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Borderless Campus Channels */}
      <div className="pt-4 border-t border-[#B8E4DC]/60 dark:border-[#252B35]/80 space-y-1.5">
        <p className="px-3 pb-1 text-[11px] font-semibold text-[#3B635C] dark:text-[#94A0B2] uppercase tracking-wider">
          {t('services:suara_channels_heading', 'Saluran Kampus')}
        </p>
        <div className="space-y-0.5">
          {categoryOptions.map((cat) => {
            const active = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => onSelectCategory(cat.key)}
                className={cn(
                  'w-full flex items-center justify-between px-3.5 py-2 rounded-full text-xs sm:text-[13px] transition-colors cursor-pointer text-left',
                  active
                    ? 'bg-[#EBF7F4] dark:bg-[#1B2028] text-[#0F766E] dark:text-[#2DD4BF] font-bold'
                    : 'text-[#3B635C] dark:text-[#94A0B2] font-medium hover:bg-[#EBF7F4]/60 dark:hover:bg-[#13171D] hover:text-[#0B2420] dark:hover:text-[#F1F5F9]'
                )}
              >
                <span className="truncate">{cat.label}</span>
                {active && <span className="w-1.5 h-1.5 rounded-full bg-[#0F766E] dark:bg-[#2DD4BF] shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Post Format Filter Pills */}
      {onSelectFormat && (
        <div className="pt-4 border-t border-[#B8E4DC]/60 dark:border-[#252B35]/80 space-y-2 px-1">
          <p className="px-2 text-[11px] font-semibold text-[#3B635C] dark:text-[#94A0B2] uppercase tracking-wider">
            {t('services:suara_format_filter_label', 'Format Kiriman')}
          </p>
          <div className="flex flex-wrap gap-1.5 px-1">
            {formatOptions.map((fmt) => {
              const Icon = fmt.icon;
              const active = activeFormat === fmt.id;
              return (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => onSelectFormat(fmt.id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer',
                    active
                      ? 'bg-[#0F766E] border-[#0F766E] text-white dark:bg-[#2DD4BF] dark:border-[#2DD4BF] dark:text-[#090B0E]'
                      : 'bg-white dark:bg-[#13171D] border-[#B8E4DC]/70 dark:border-[#252B35] text-[#3B635C] dark:text-[#94A0B2] hover:text-[#0B2420] dark:hover:text-[#F1F5F9]'
                  )}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{fmt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Focus Mode + Primary Compose CTA (X-style) */}
      <div className="pt-4 border-t border-[#B8E4DC]/60 dark:border-[#252B35]/80 space-y-4">
        <div className="flex items-center justify-between gap-2 px-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0B2420] dark:text-[#F1F5F9]">
              <Focus className="w-3.5 h-3.5 text-[#0F766E] dark:text-[#2DD4BF] shrink-0" />
              <span>{t('services:suara_focus_mode_title', 'Mod Fokus')}</span>
            </div>
            <p className="text-[11px] text-[#3B635C] dark:text-[#94A0B2] mt-0.5 leading-snug">
              {t('services:suara_focus_mode_desc', 'Tapis akademik, fasiliti & rasmi sahaja')}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={focusMode}
            onClick={onToggleFocusMode}
            aria-label={t('services:suara_focus_mode_toggle', 'Togol Mod Fokus')}
            className={cn(
              'w-10 h-6 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 flex items-center',
              focusMode
                ? 'bg-[#0F766E] dark:bg-[#2DD4BF] justify-end'
                : 'bg-[#B8E4DC]/70 dark:bg-[#252B35] justify-start'
            )}
          >
            <span className="w-5 h-5 rounded-full bg-white dark:bg-[#090B0E] shadow-xs" />
          </button>
        </div>

        <button
          type="button"
          onClick={onOpenCompose}
          className="w-full h-11 px-5 rounded-full bg-[#0F766E] hover:bg-[#0D9488] dark:bg-[#2DD4BF] dark:hover:bg-[#5EEAD4] text-white dark:text-[#090B0E] font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition-[transform,background-color] duration-150 ease-out active:scale-[0.98] cursor-pointer"
        >
          <MessageSquarePlus className="w-4 h-4 shrink-0" />
          <span>{t('services:suara_write_secret_btn', 'Tulis Suara Rahsia')}</span>
        </button>
      </div>
    </aside>
  );
}

export interface PolySuaraMobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sortBy: FeedSortMode;
  onSelectSort: (mode: FeedSortMode) => void;
  activeCategory: string;
  onSelectCategory: (category: string) => void;
  activeFormat: FeedFormatFilter;
  onSelectFormat: (format: FeedFormatFilter) => void;
  focusMode: boolean;
  onToggleFocusMode: () => void;
  jppRepliedCount: number;
  myCount: number;
  bookmarkCount: number;
  categoryOptions: ReadonlyArray<{ key: string; label: string }>;
  trendingTags: Array<{ tag: string; count: number }>;
  activeTag: string | null;
  onSelectTag: (tag: string | null) => void;
}

export function PolySuaraMobileDrawer({
  isOpen,
  onClose,
  sortBy,
  onSelectSort,
  activeCategory,
  onSelectCategory,
  activeFormat,
  onSelectFormat,
  focusMode,
  onToggleFocusMode,
  jppRepliedCount,
  myCount,
  bookmarkCount,
  categoryOptions,
  trendingTags,
  activeTag,
  onSelectTag,
}: PolySuaraMobileDrawerProps) {
  const { t } = useTranslation(['services', 'common']);

  const drawerViews: Array<{ id: FeedSortMode; label: string; icon: React.ComponentType<{ className?: string }>; count?: number }> = [
    { id: 'LATEST', label: t('services:suara_sort_newest', 'Terkini'), icon: Clock },
    { id: 'TRENDING', label: t('services:suara_sort_trending', 'Hangat'), icon: Flame },
    { id: 'JPP_REPLIED', label: t('services:suara_tab_jpp_replied', 'Dijawab JPP'), icon: ShieldCheck, count: jppRepliedCount > 0 ? jppRepliedCount : undefined },
    { id: 'MINE', label: t('services:suara_tab_my_voice', 'Suara Saya'), icon: UserCheck, count: myCount > 0 ? myCount : undefined },
    { id: 'BOOKMARKS', label: t('services:suara_tab_saved', 'Disimpan'), icon: Bookmark, count: bookmarkCount > 0 ? bookmarkCount : undefined },
  ];

  const formatOptions: Array<{ id: FeedFormatFilter; label: string }> = [
    { id: 'ALL', label: t('services:suara_format_all', 'Semua') },
    { id: 'QNA', label: t('services:suara_intent_qna', 'Tanya Kampus') },
    { id: 'SHOUTOUT', label: t('services:suara_intent_shoutout', 'Apresiasi') },
    { id: 'DEBATE', label: t('services:suara_intent_debate', 'Debat Setuju/Tidak') },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#090B0E]/75 z-[99950] lg:hidden"
          />
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.24, ease: [0.32, 0.72, 0, 1] }}
            aria-label={t('services:suara_channels_filters_btn', 'Saluran & Tapis')}
            className="fixed inset-y-0 left-0 w-[84vw] max-w-xs bg-white dark:bg-[#13171D] border-r border-[#B8E4DC]/80 dark:border-[#252B35] z-[99955] lg:hidden flex flex-col overflow-y-auto overscroll-contain px-5 pt-[calc(1rem+var(--sat,env(safe-area-inset-top,0px)))] pb-28 space-y-5 text-[#0B2420] dark:text-[#F1F5F9]"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#B8E4DC]/60 dark:border-[#252B35]">
              <span className="font-bold text-base text-[#0B2420] dark:text-[#F1F5F9]">
                {t('services:suara_channels_filters_btn', 'Saluran & Tapis')}
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label={t('services:suara_drawer_close', 'Tutup panel')}
                className="w-8 h-8 rounded-full hover:bg-[#EBF7F4] dark:hover:bg-[#1B2028] flex items-center justify-center text-[#3B635C] dark:text-[#94A0B2] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-[#3B635C] dark:text-[#94A0B2] uppercase tracking-wider mb-1.5">
                {t('services:suara_views_heading', 'Paparan Suapan')}
              </p>
              {drawerViews.map((v) => {
                const Icon = v.icon;
                const active = sortBy === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      onSelectSort(v.id);
                      onClose();
                    }}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded-full text-sm transition-colors cursor-pointer',
                      active
                        ? 'bg-[#EBF7F4] dark:bg-[#1B2028] text-[#0F766E] dark:text-[#2DD4BF] font-bold'
                        : 'text-[#0B2420] dark:text-[#F1F5F9] hover:bg-[#F6FBF9] dark:hover:bg-[#0E1116]'
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{v.label}</span>
                    </span>
                    {v.count !== undefined && (
                      <span className="text-[11px] font-mono tabular-nums px-2 py-0.5 rounded-full bg-[#EBF7F4] dark:bg-[#1B2028] text-[#0F766E] dark:text-[#2DD4BF]">
                        {v.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-[#B8E4DC]/60 dark:border-[#252B35] space-y-2">
              <p className="text-[11px] font-semibold text-[#3B635C] dark:text-[#94A0B2] uppercase tracking-wider">
                {t('services:suara_channels_heading', 'Saluran Kampus')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {categoryOptions.map((cat) => (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => {
                      onSelectCategory(cat.key);
                      onClose();
                    }}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer',
                      activeCategory === cat.key
                        ? 'bg-[#0F766E] border-[#0F766E] text-white dark:bg-[#2DD4BF] dark:border-[#2DD4BF] dark:text-[#090B0E]'
                        : 'bg-[#F6FBF9] dark:bg-[#0E1116] border-[#B8E4DC]/70 dark:border-[#252B35] text-[#3B635C] dark:text-[#94A0B2]'
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-[#B8E4DC]/60 dark:border-[#252B35] space-y-2">
              <p className="text-[11px] font-semibold text-[#3B635C] dark:text-[#94A0B2] uppercase tracking-wider">
                {t('services:suara_format_filter_label', 'Format Kiriman')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {formatOptions.map((fmt) => (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => {
                      onSelectFormat(fmt.id);
                      onClose();
                    }}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer',
                      activeFormat === fmt.id
                        ? 'bg-[#0F766E] border-[#0F766E] text-white dark:bg-[#2DD4BF] dark:border-[#2DD4BF] dark:text-[#090B0E]'
                        : 'bg-[#F6FBF9] dark:bg-[#0E1116] border-[#B8E4DC]/70 dark:border-[#252B35] text-[#3B635C] dark:text-[#94A0B2]'
                    )}
                  >
                    {fmt.label}
                  </button>
                ))}
              </div>
            </div>

            {trendingTags.length > 0 && (
              <div className="pt-3 border-t border-[#B8E4DC]/60 dark:border-[#252B35] space-y-2">
                <p className="text-[11px] font-semibold text-[#3B635C] dark:text-[#94A0B2] uppercase tracking-wider">
                  {t('services:suara_trending_topics', 'Topik Hangat Minggu Ini')}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {trendingTags.slice(0, 8).map((item) => {
                    const selected = activeTag === item.tag;
                    return (
                      <button
                        key={item.tag}
                        type="button"
                        onClick={() => {
                          onSelectTag(selected ? null : item.tag);
                          onClose();
                        }}
                        className={cn(
                          'px-2.5 py-1 rounded-full text-xs font-semibold border cursor-pointer',
                          selected
                            ? 'bg-[#0F766E] border-[#0F766E] text-white dark:bg-[#2DD4BF] dark:border-[#2DD4BF] dark:text-[#090B0E]'
                            : 'bg-[#F6FBF9] dark:bg-[#0E1116] border-[#B8E4DC]/70 dark:border-[#252B35] text-[#3B635C] dark:text-[#94A0B2]'
                        )}
                      >
                        {item.tag} ({item.count})
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-[#B8E4DC]/60 dark:border-[#252B35] flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-xs font-bold block">{t('services:suara_focus_mode_title', 'Mod Fokus')}</span>
                <span className="text-[11px] text-[#3B635C] dark:text-[#94A0B2]">
                  {t('services:suara_focus_mode_desc', 'Tapis akademik, fasiliti & rasmi sahaja')}
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={focusMode}
                onClick={onToggleFocusMode}
                aria-label={t('services:suara_focus_mode_toggle', 'Togol Mod Fokus')}
                className={cn(
                  'w-10 h-6 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 flex items-center',
                  focusMode
                    ? 'bg-[#0F766E] dark:bg-[#2DD4BF] justify-end'
                    : 'bg-[#B8E4DC]/70 dark:bg-[#252B35] justify-start'
                )}
              >
                <span className="w-5 h-5 rounded-full bg-white dark:bg-[#090B0E] shadow-xs" />
              </button>
            </div>

            <div className="pt-3 border-t border-[#B8E4DC]/60 dark:border-[#252B35] flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#3B635C] dark:text-[#94A0B2]">
                {t('services:suara_drawer_preferences', 'Paparan & Bahasa')}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <LanguageToggle />
                <ThemeToggle />
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export interface JppActionHighlight {
  id: string;
  content: string;
  status: string;
  category: string;
}

export interface PolySuaraRightRailProps {
  resolvedCount: number;
  acknowledgedCount: number;
  recentActionItems: JppActionHighlight[];
  trendingTags: Array<{ tag: string; count: number }>;
  activeTag: string | null;
  onSelectTag: (tag: string | null) => void;
  onViewJppReplied: () => void;
  onFocusConfession: (confessionId: string) => void;
  onNavigate: (path: string) => void;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
}

export function PolySuaraRightRail({
  resolvedCount,
  acknowledgedCount,
  recentActionItems,
  trendingTags,
  activeTag,
  onSelectTag,
  onViewJppReplied,
  onFocusConfession,
  onNavigate,
  searchQuery = '',
  onSearchChange,
}: PolySuaraRightRailProps) {
  const { t } = useTranslation(['services', 'common']);

  const renderStatusLabel = (status: string) => {
    switch ((status || '').toUpperCase()) {
      case 'RESOLVED':
        return t('services:status_resolved', 'Selesai');
      case 'INVESTIGATING':
        return t('services:status_investigating', 'Disiasat');
      case 'ACKNOWLEDGED':
        return t('services:status_acknowledged', 'Diterima');
      case 'FACT_CHECK':
        return t('services:status_fact_check_short', 'Semak Fakta');
      case 'OFFICIAL_NOTE':
        return t('services:status_official_note', 'Nota Rasmi JPP');
      default:
        return t('services:status_official_note', 'Nota Rasmi JPP');
    }
  };

  return (
    <aside
      aria-label={t('services:suara_impact_sidebar', 'Impak JPP dan Topik Hangat')}
      className="hidden lg:flex lg:col-span-3 flex-col gap-4 sticky top-20 self-start"
    >
      {/* X-style Global Search in Right Rail */}
      {onSearchChange && (
        <div className="relative">
          <Search className="w-4 h-4 text-[#3B635C] dark:text-[#94A0B2] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('services:suara_search_placeholder_short', 'Cari suara, lokasi, #tag...')}
            className="w-full h-10 pl-10 pr-4 rounded-full bg-white dark:bg-[#13171D] border border-[#B8E4DC]/80 dark:border-[#252B35] text-xs text-[#0B2420] dark:text-[#F1F5F9] placeholder:text-[#3B635C]/70 dark:placeholder:text-[#94A0B2]/60 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/35"
          />
        </div>
      )}

      {/* You Spoke, We Fixed — JPP Impact Card */}
      <div className="bg-white dark:bg-[#13171D] border border-[#B8E4DC]/80 dark:border-[#252B35] rounded-3xl p-4 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#EBF7F4] dark:bg-[#1B2028] text-[#0F766E] dark:text-[#2DD4BF] flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#0B2420] dark:text-[#F1F5F9] leading-tight">
              {t('services:suara_impact_title', 'Suara → Tindakan')}
            </h3>
            <p className="text-[11px] text-[#3B635C] dark:text-[#94A0B2]">
              {t('services:suara_impact_subtitle', 'Kemajuan tindakan rasmi JPP')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-[#F6FBF9] dark:bg-[#0E1116] border border-[#B8E4DC]/70 dark:border-[#252B35] p-2.5">
            <span className="block text-[11px] text-[#3B635C] dark:text-[#94A0B2]">
              {t('services:status_resolved', 'Selesai')}
            </span>
            <span className="text-base font-bold font-mono tabular-nums text-[#0F766E] dark:text-[#2DD4BF]">
              {resolvedCount}
            </span>
          </div>
          <div className="rounded-2xl bg-[#F6FBF9] dark:bg-[#0E1116] border border-[#B8E4DC]/70 dark:border-[#252B35] p-2.5">
            <span className="block text-[11px] text-[#3B635C] dark:text-[#94A0B2]">
              {t('services:suara_in_action', 'Dalam Tindakan')}
            </span>
            <span className="text-base font-bold font-mono tabular-nums text-[#0B2420] dark:text-[#F1F5F9]">
              {acknowledgedCount}
            </span>
          </div>
        </div>

        {recentActionItems.length > 0 && (
          <div className="space-y-2 pt-1">
            {recentActionItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onFocusConfession(item.id)}
                className="w-full text-left p-2.5 rounded-2xl bg-[#F6FBF9] dark:bg-[#0E1116] hover:bg-[#EBF7F4] dark:hover:bg-[#1B2028] border border-[#B8E4DC]/60 dark:border-[#252B35] transition-colors cursor-pointer space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-[#0F766E] dark:text-[#2DD4BF]">
                    {renderStatusLabel(item.status)}
                  </span>
                  <span className="text-[11px] text-[#3B635C] dark:text-[#94A0B2]">{item.category}</span>
                </div>
                <p className="text-xs text-[#0B2420] dark:text-[#F1F5F9] line-clamp-2 leading-snug">
                  {item.content}
                </p>
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={onViewJppReplied}
          className="w-full py-2 px-3 rounded-xl border border-[#B8E4DC] dark:border-[#252B35] text-xs font-semibold text-[#0F766E] dark:text-[#2DD4BF] hover:bg-[#EBF7F4] dark:hover:bg-[#1B2028] transition-colors cursor-pointer"
        >
          {t('services:suara_view_all_jpp_replies', 'Lihat Semua Maklum Balas JPP')}
        </button>
      </div>

      {/* Trending Hashtags */}
      {trendingTags.length > 0 && (
        <div className="bg-white dark:bg-[#13171D] border border-[#B8E4DC]/80 dark:border-[#252B35] rounded-3xl p-4 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-[#0F766E] dark:text-[#2DD4BF]" />
            <h3 className="text-xs font-bold text-[#0B2420] dark:text-[#F1F5F9]">
              {t('services:suara_trending_topics', 'Topik Hangat Minggu Ini')}
            </h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {trendingTags.slice(0, 8).map((item) => {
              const isSelected = activeTag === item.tag;
              return (
                <button
                  key={item.tag}
                  type="button"
                  onClick={() => onSelectTag(isSelected ? null : item.tag)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer',
                    isSelected
                      ? 'bg-[#0F766E] border-[#0F766E] text-white dark:bg-[#2DD4BF] dark:border-[#2DD4BF] dark:text-[#090B0E]'
                      : 'bg-[#F6FBF9] dark:bg-[#0E1116] border-[#B8E4DC]/70 dark:border-[#252B35] text-[#3B635C] dark:text-[#94A0B2] hover:text-[#0F766E] dark:hover:text-[#2DD4BF]'
                  )}
                >
                  {item.tag} <span className="font-mono text-[11px] opacity-80">({item.count})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Privacy & Welfare Assurance */}
      <div className="bg-[#0B2420] dark:bg-[#13171D] text-[#F6FBF9] dark:text-[#F1F5F9] border border-[#1E4D45] dark:border-[#252B35] rounded-3xl p-4 shadow-xs space-y-2.5">
        <div className="flex items-center gap-2 text-[#2DD4BF] text-xs font-bold">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>{t('services:suara_privacy_card_title', 'Identiti Anda Dilindungi')}</span>
        </div>
        <p className="text-xs text-[#99CBC2] leading-relaxed">
          {t(
            'services:suara_privacy_card_desc',
            'Nama samaran bertukar secara automatik setiap hari menggunakan kriptografi pelayan. Untuk kes kecemasan atau kaunseling peribadi:'
          )}
        </p>
        <button
          type="button"
          onClick={() => onNavigate('/kebajikan/buat-aduan')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2DD4BF] hover:underline cursor-pointer text-left"
        >
          <HeartHandshake className="w-3.5 h-3.5 shrink-0" />
          <span>{t('services:suara_go_kebajikan_care', 'Hubungi e-Kebajikan & Kaunseling')}</span>
        </button>
      </div>
    </aside>
  );
}
