import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';

const t = (k: string, fb: string, opt?: any): string =>
  (i18n.isInitialized ? (i18n.t(k, { defaultValue: fb, ...opt }) as string) : fb);
import {
  Calendar,
  Clock,
  MapPin,
  ExternalLink,
  ArrowRight,
  Laptop,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StudentTimetableEntry } from '@/types';

export interface NextClassBentoCardProps {
  entries?: StudentTimetableEntry[] | null;
  className?: string;
}

export function getDayLabel(day: number, t?: (key: string, fallback?: string) => string): string {
  switch (day) {
    case 1:
      return t ? t('portal:day_monday', 'Isnin') : 'Isnin';
    case 2:
      return t ? t('portal:day_tuesday', 'Selasa') : 'Selasa';
    case 3:
      return t ? t('portal:day_wednesday', 'Rabu') : 'Rabu';
    case 4:
      return t ? t('portal:day_thursday', 'Khamis') : 'Khamis';
    case 5:
      return t ? t('portal:day_friday', 'Jumaat') : 'Jumaat';
    case 6:
      return t ? t('portal:day_saturday', 'Sabtu') : 'Sabtu';
    case 0:
    default:
      return t ? t('portal:day_sunday', 'Ahad') : 'Ahad';
  }
}

/**
 * Parses time string (e.g. "08:30:00" or "08:30") to minutes from midnight
 */
export function parseTimeToMinutes(t?: string | null): number {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Formats time string to "HH:mm"
 */
export function formatDisplayTime(timeStr?: string | null): string {
  if (!timeStr) return '';
  return timeStr.slice(0, 5);
}

/**
 * Returns Malaysian local time and day of week (Asia/Kuala_Lumpur, UTC+8)
 */
export function getMalaysianNow() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kuala_Lumpur',
    hour12: false,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  const parts = formatter.formatToParts(now);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '';
  const weekday = getPart('weekday');
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const dayOfWeek = weekdayMap[weekday] ?? 1;
  const hour = parseInt(getPart('hour'), 10) || 0;
  const minute = parseInt(getPart('minute'), 10) || 0;
  return {
    dayOfWeek,
    currentMinutes: hour * 60 + minute,
    hour,
    minute,
  };
}

/**
 * Finds the next upcoming class across the next available scheduled days
 */
export function findNextUpcomingClass(
  entries: StudentTimetableEntry[],
  currentDayOfWeek: number,
  t?: any
): { entry: StudentTimetableEntry; dayLabel: string; isTomorrow: boolean } | null {
  if (!entries || entries.length === 0) return null;

  for (let offset = 1; offset <= 7; offset++) {
    const nextDay = (currentDayOfWeek + offset) % 7;
    // Weekdays are 1 (Mon) through 5 (Fri)
    if (nextDay >= 1 && nextDay <= 5) {
      const dayClasses = entries
        .filter(e => e.day_of_week === nextDay && !e.is_archived)
        .sort((a, b) => parseTimeToMinutes(a.start_time) - parseTimeToMinutes(b.start_time));

      if (dayClasses.length > 0) {
        const isTomorrow = offset === 1;
        const tomorrowLabel = t ? t('portal:tomorrow', 'Esok') : 'Esok';
        const dayLabel = isTomorrow ? tomorrowLabel : getDayLabel(nextDay, t);
        return {
          entry: dayClasses[0],
          dayLabel,
          isTomorrow,
        };
      }
    }
  }
  return null;
}

export function buildPolyMapsRoomUrl(entry: Pick<StudentTimetableEntry, 'location_id' | 'room_raw'>): string {
  const target = entry.location_id || entry.room_raw;
  return `/polymaps?room=${encodeURIComponent(target || '')}`;
}

/**
 * Formats timetable location, condensing long building names to campus acronyms (JTMK, JKA, etc.)
 */
export function formatCompactLocation(
  entry?: Pick<StudentTimetableEntry, 'location' | 'room_raw'>,
  fallbackText: string = t('portal:hall_lecture_room', 'Dewan / Bilik Kuliah')
): string {
  if (!entry) return fallbackText;
  if (entry.location?.room_code) {
    const rawBuilding = entry.location.building?.name || entry.location.building?.code;
    const building = rawBuilding
      ? rawBuilding
          .replace(/BANGUNAN TEKNOLOGI MAKLUMAT & KOMUNIKASI/i, 'JTMK')
          .replace(/BANGUNAN KEJURUTERAAN AWAM/i, 'JKA')
          .replace(/BANGUNAN KEJURUTERAAN ELEKTRIK/i, 'JKE')
          .replace(/BANGUNAN KEJURUTERAAN MEKANIKAL/i, 'JKM')
          .replace(/BANGUNAN PERDAGANGAN/i, 'JP')
      : '';
    return building ? `${entry.location.room_code} · ${building}` : entry.location.room_code;
  }
  const raw = entry.room_raw || fallbackText;
  return raw
    .replace(/BANGUNAN TEKNOLOGI MAKLUMAT & KOMUNIKASI/i, 'JTMK')
    .replace(/BANGUNAN KEJURUTERAAN AWAM/i, 'JKA')
    .replace(/BANGUNAN KEJURUTERAAN ELEKTRIK/i, 'JKE')
    .replace(/BANGUNAN KEJURUTERAAN MEKANIKAL/i, 'JKM')
    .replace(/BANGUNAN PERDAGANGAN/i, 'JP');
}

export function NextClassBentoCard({
  entries,
  className,
}: NextClassBentoCardProps) {
  const { t } = useTranslation(['portal', 'common']);
  // Client-side live timer (zero DB polling) updating every 30 seconds
  const [now, setNow] = useState(() => getMalaysianNow());

  // Collapsible card state persisted in localStorage - defaults to COMPACT (isCollapsed = true)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('portal_next_class_collapsed');
      return saved !== null ? saved === 'true' : true; // DEFAULT TO COMPACT
    } catch {
      return true;
    }
  });

  const toggleCollapsed = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('portal_next_class_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    const updateTime = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      setNow(getMalaysianNow());
    };
    const timer = setInterval(updateTime, 30000);
    const onVisChange = () => {
      if (typeof document !== 'undefined' && !document.hidden) updateTime();
    };
    document.addEventListener('visibilitychange', onVisChange);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisChange);
    };
  }, []);

  const activeEntries = useMemo(() => {
    return (entries || []).filter(e => !e.is_archived);
  }, [entries]);

  // Determine current display state
  const stateData = useMemo(() => {
    // State 4: No timetable uploaded yet (Empty State)
    if (activeEntries.length === 0) {
      return { type: 'EMPTY' as const };
    }

    const isWeekday = now.dayOfWeek >= 1 && now.dayOfWeek <= 5;
    const todayClasses = isWeekday
      ? activeEntries
          .filter(e => e.day_of_week === now.dayOfWeek)
          .sort((a, b) => parseTimeToMinutes(a.start_time) - parseTimeToMinutes(b.start_time))
      : [];

    if (isWeekday && todayClasses.length > 0) {
      // Check for ongoing class
      const ongoing = todayClasses.find(e => {
        const start = parseTimeToMinutes(e.start_time);
        const end = parseTimeToMinutes(e.end_time);
        return now.currentMinutes >= start && now.currentMinutes < end;
      });

      // Check for upcoming class today
      const upcomingToday = todayClasses.find(e => {
        const start = parseTimeToMinutes(e.start_time);
        return start > now.currentMinutes;
      });

      // State 1: Active or Upcoming Class Today
      if (ongoing || upcomingToday) {
        const activeClass = ongoing || upcomingToday!;
        const isOngoing = Boolean(ongoing);
        return {
          type: 'TODAY_ACTIVE' as const,
          entry: activeClass,
          isOngoing,
        };
      }

      // State 2: All classes completed today
      const nextUpcoming = findNextUpcomingClass(activeEntries, now.dayOfWeek, t);
      return {
        type: 'COMPLETED_TODAY' as const,
        nextClass: nextUpcoming,
      };
    }

    // State 3: Weekend or no classes scheduled on this weekday
    const nextUpcoming = findNextUpcomingClass(activeEntries, now.dayOfWeek, t);
    return {
      type: 'NO_CLASS_TODAY' as const,
      isWeekend: !isWeekday,
      nextClass: nextUpcoming,
    };
  }, [activeEntries, now, t]);

  // Helper for PolyMaps deep link URL
  const getPolyMapsUrl = (entry: Pick<StudentTimetableEntry, 'location_id' | 'room_raw'>): string => {
    return buildPolyMapsRoomUrl(entry);
  };

  // Helper for physical location label
  const getLocationLabel = (entry: StudentTimetableEntry): string => {
    return formatCompactLocation(entry, t('portal:default_classroom', 'Dewan / Bilik Kuliah'));
  };

  const classTypeBadges: Record<string, { label: string; badgeClass: string }> = {
    KULIAH: {
      label: t('portal:class_lecture', 'Kuliah'),
      badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    },
    AMALI: {
      label: t('portal:class_practical', 'Amali'),
      badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    },
    TUTORIAL: {
      label: t('portal:class_tutorial', 'Tutorial'),
      badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    },
    LAIN_LAIN: {
      label: t('portal:class_other', 'Lain-lain'),
      badgeClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
    },
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // COLLAPSED COMPACT BAR (Default View)
  // ─────────────────────────────────────────────────────────────────────────────
  if (isCollapsed && stateData.type !== 'EMPTY') {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={toggleCollapsed}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCollapsed(); } }}
        className={cn(
          'w-full rounded-2xl p-3.5 sm:p-4 transition-all duration-200 cursor-pointer select-none',
          'bg-white/90 dark:bg-[#1a231b]/90 border border-[#2E3A2F]/10 dark:border-[#F8F6EE]/10',
          'shadow-sm hover:shadow-md hover:border-[#2E3A2F]/20 dark:hover:border-[#F8F6EE]/20 ',
          'group',
          className
        )}
      >
        <div className="flex items-center justify-between gap-3">
          {/* Left Info Section */}
          <div className="flex items-center gap-3 min-w-0">
            {stateData.type === 'TODAY_ACTIVE' ? (
              <span
                className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-xl shrink-0 transition-transform group-hover:scale-105',
                  stateData.isOngoing
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                )}
              >
                {stateData.isOngoing ? (
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
              </span>
            ) : stateData.type === 'COMPLETED_TODAY' ? (
              <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </span>
            ) : (
              <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
                <Calendar className="w-4 h-4" />
              </span>
            )}

            <div className="min-w-0 space-y-0.5">
              {stateData.type === 'TODAY_ACTIVE' ? (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-black text-[#2E3A2F] dark:text-[#F8F6EE] tracking-tight">
                      {stateData.entry.course_name?.trim() || stateData.entry.course_code}
                    </span>
                    <span className="text-xs text-[#556453] dark:text-[#A3B39F] font-medium font-mono tabular-nums">
                      ({formatDisplayTime(stateData.entry.start_time)} - {formatDisplayTime(stateData.entry.end_time)})
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#556453] dark:text-[#A3B39F] truncate">
                    {stateData.entry.is_online ? (
                      <span className="text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
                        <Laptop className="w-3 h-3" />
                        <span>{t('portal:online_teams', 'Dalam Talian (Teams)')}</span>
                      </span>
                    ) : (
                      <span className="text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                        <span className="truncate">{getLocationLabel(stateData.entry)}</span>
                      </span>
                    )}
                  </div>
                </>
              ) : stateData.type === 'COMPLETED_TODAY' ? (
                <>
                  <div className="text-sm font-bold text-[#2E3A2F] dark:text-[#F8F6EE]">
                    {t('portal:all_classes_completed_today', 'Semua kelas selesai hari ini')}
                  </div>
                  {stateData.nextClass && (
                    <div className="text-xs text-[#556453] dark:text-[#A3B39F] truncate">
                      {t('portal:next_class_prefix', 'Seterusnya')} {stateData.nextClass.dayLabel}: {stateData.nextClass.entry.course_name?.trim() || stateData.nextClass.entry.course_code} ({formatDisplayTime(stateData.nextClass.entry.start_time)})
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="text-sm font-bold text-[#2E3A2F] dark:text-[#F8F6EE]">
                    {t('portal:no_classes_today', 'Tiada kelas hari ini')}
                  </div>
                  {stateData.nextClass && (
                    <div className="text-xs text-[#556453] dark:text-[#A3B39F] truncate">
                      {t('portal:next_class_prefix', 'Seterusnya')} {stateData.nextClass.dayLabel}: {stateData.nextClass.entry.course_name?.trim() || stateData.nextClass.entry.course_code} ({formatDisplayTime(stateData.nextClass.entry.start_time)})
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Right Action & Expand Button */}
          <div className="flex items-center gap-2 shrink-0">
            {stateData.type === 'TODAY_ACTIVE' && (
              stateData.entry.is_online ? (
                <a
                  href="https://teams.microsoft.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm"
                  title={t('portal:join_online_class', 'Sertai Kelas Dalam Talian')}
                >
                  <Laptop className="w-3.5 h-3.5" />
                  <span>{t('portal:join_short', 'Sertai')}</span>
                  <ExternalLink className="w-3 h-3 opacity-80" />
                </a>
              ) : (
                <Link
                  to={getPolyMapsUrl(stateData.entry)}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2E3A2F] dark:bg-[#F8F6EE] text-[#F8F6EE] dark:text-[#2E3A2F] text-xs font-bold hover:opacity-90 transition-all shadow-sm group-hover:scale-105"
                  title={t('portal:directions_title', 'Tunjuk Arah ke Bilik Kelas')}
                >
                  <MapPin className="w-3.5 h-3.5 text-rose-400 dark:text-rose-600 shrink-0" />
                  <span>{t('portal:directions_short', 'Tunjuk Arah')}</span>
                  <ArrowRight className="w-3 h-3 opacity-80" />
                </Link>
              )
            )}

            {(stateData.type === 'COMPLETED_TODAY' || stateData.type === 'NO_CLASS_TODAY') && (
              <Link
                to="/akademik/takwim?tab=personal"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#2E3A2F]/10 dark:bg-[#F8F6EE]/10 text-[#2E3A2F] dark:text-[#F8F6EE] text-xs font-bold hover:bg-[#2E3A2F]/20 dark:hover:bg-[#F8F6EE]/20 transition-colors"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>{t('portal:schedule_short', 'Jadual')}</span>
              </Link>
            )}

            {/* Subtle expand chevron */}
            <span
              className="p-1 rounded-lg text-[#556453] dark:text-[#A3B39F] group-hover:text-[#2E3A2F] dark:group-hover:text-[#F8F6EE] group-hover:bg-[#2E3A2F]/5 dark:group-hover:bg-[#F8F6EE]/5 transition-colors"
              title={t('portal:expand_card', 'Kembangkan untuk maklumat penuh')}
            >
              <ChevronDown className="w-4 h-4" />
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STATE 4: No Timetable Uploaded Yet (Empty State)
  // ─────────────────────────────────────────────────────────────────────────────
  if (stateData.type === 'EMPTY') {
    return (
      <div
        className={cn(
          'w-full rounded-2xl md:rounded-3xl p-5 sm:p-6 transition-all duration-300',
          'bg-white/80 dark:bg-[#1a231b]/80 border border-[#2E3A2F]/10 dark:border-[#F8F6EE]/10',
          'shadow-sm hover:shadow-md ',
          className
        )}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#2E3A2F]/10 dark:bg-[#F8F6EE]/10 flex items-center justify-center shrink-0 text-[#2E3A2F] dark:text-[#F8F6EE]">
              <Calendar className="w-5 h-5 text-[#2E3A2F] dark:text-[#F8F6EE]" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                  {t('portal:student_personal_badge', 'Peribadi Pelajar')}
                </span>
                <span className="text-xs text-[#556453] dark:text-[#A3B39F]">e-Akademik</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-[#2E3A2F] dark:text-[#F8F6EE] tracking-tight">
                {t('portal:timetable_not_uploaded_title', 'Jadual Kuliah Belum Dimuat Naik')}
              </h3>
              <p className="text-xs sm:text-sm text-[#556453] dark:text-[#A3B39F] max-w-xl leading-relaxed">
                {t('portal:timetable_not_uploaded_desc', 'Takut terlepas kelas? Muat naik jadual sekarang untuk peringatan automatik & panduan lokasi bilik.')}
              </p>
            </div>
          </div>

          <Link
            to="/akademik/takwim"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#2E3A2F] dark:bg-[#F8F6EE] text-[#F8F6EE] dark:text-[#2E3A2F] font-bold text-xs sm:text-sm hover:opacity-90 transition-all shrink-0 shadow-sm"
          >
            <span>{t('portal:upload_timetable_btn', 'Muat Naik Jadual')}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STATE 1: Upcoming or Ongoing Class Today (Expanded State)
  // ─────────────────────────────────────────────────────────────────────────────
  if (stateData.type === 'TODAY_ACTIVE') {
    const { entry, isOngoing } = stateData;
    const typeBadge = classTypeBadges[entry.class_type] || classTypeBadges.KULIAH;

    const startMin = parseTimeToMinutes(entry.start_time);
    const endMin = parseTimeToMinutes(entry.end_time);
    const totalDuration = Math.max(endMin - startMin, 1);
    const elapsedMinutes = Math.min(Math.max(now.currentMinutes - startMin, 0), totalDuration);
    const progressPercent = Math.round((elapsedMinutes / totalDuration) * 100);

    // Clean Countdown text
    let countdownBadgeText = t('portal:ongoing_class', 'Sedang berlangsung');
    if (isOngoing) {
      const remainingMin = endMin - now.currentMinutes;
      if (remainingMin <= 0) {
        countdownBadgeText = t('portal:ongoing_class', 'Sedang berlangsung');
      } else if (remainingMin < 60) {
        countdownBadgeText = t('portal:ongoing_remaining_minutes', 'Sedang berlangsung · Berbaki {{count}} minit', { count: remainingMin });
      } else {
        const rh = Math.floor(remainingMin / 60);
        const rm = remainingMin % 60;
        countdownBadgeText = rm > 0
          ? t('portal:ongoing_remaining_hours_minutes', 'Sedang berlangsung · Berbaki {{hours}} jam {{mins}} minit', { hours: rh, mins: rm })
          : t('portal:ongoing_remaining_hours', 'Sedang berlangsung · Berbaki {{hours}} jam', { hours: rh });
      }
    } else {
      const diffMin = startMin - now.currentMinutes;
      if (diffMin <= 1) {
        countdownBadgeText = t('portal:starting_soon', 'Bermula sebentar lagi');
      } else if (diffMin < 60) {
        countdownBadgeText = t('portal:starting_in_minutes', 'Dalam {{count}} minit', { count: diffMin });
      } else {
        const hours = Math.floor(diffMin / 60);
        const mins = diffMin % 60;
        countdownBadgeText = mins > 0
          ? t('portal:starting_in_hours_minutes', 'Dalam {{hours}} jam {{mins}} minit', { hours, mins })
          : t('portal:starting_in_hours', 'Dalam {{hours}} jam', { hours });
      }
    }

    const displayName = entry.course_name && entry.course_name.trim().length > 0
      ? entry.course_name.trim()
      : entry.course_code;

    return (
      <div
        className={cn(
          'w-full rounded-2xl md:rounded-3xl p-5 sm:p-6 transition-all duration-300',
          'bg-white/90 dark:bg-[#1a231b]/90 border border-[#2E3A2F]/10 dark:border-[#F8F6EE]/10',
          'shadow-sm hover:shadow-md space-y-4',
          className
        )}
      >
        {/* Top Bar */}
        <div className="flex items-center justify-between gap-3">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border',
              isOngoing
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                : 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20'
            )}
          >
            <span
              className={cn(
                'w-2 h-2 rounded-full',
                isOngoing ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'
              )}
            />
            <span>{countdownBadgeText}</span>
          </span>

          <button
            type="button"
            onClick={toggleCollapsed}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-[#2E3A2F]/10 dark:hover:bg-[#F8F6EE]/10 text-xs font-semibold text-[#556453] dark:text-[#A3B39F] hover:text-[#2E3A2F] dark:hover:text-[#F8F6EE] transition-colors"
            title={t('portal:collapse_card', 'Kecilkan')}
            aria-label={t('portal:collapse_card', 'Kecilkan')}
          >
            <span>{t('portal:collapse_card', 'Kecilkan')}</span>
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Course Details */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border',
                typeBadge.badgeClass
              )}
            >
              {typeBadge.label}
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-[#2E3A2F] dark:text-[#F8F6EE] tracking-tight leading-snug">
            {displayName}
          </h3>

          {/* Meta Chips */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-xs text-[#556453] dark:text-[#A3B39F]">
            <div className="flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              <span>
                {formatDisplayTime(entry.start_time)} - {formatDisplayTime(entry.end_time)}
              </span>
            </div>

            {entry.is_online ? (
              <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-semibold">
                <Laptop className="w-3.5 h-3.5" />
                <span>{t('portal:online_teams_full', 'Dalam Talian (Microsoft Teams)')}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[#2E3A2F] dark:text-[#F8F6EE] font-semibold">
                <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span>{getLocationLabel(entry)}</span>
              </div>
            )}

            {entry.lecturer_code && (
              <div className="flex items-center gap-1 text-[11px] text-[#556453] dark:text-[#A3B39F]">
                <BookOpen className="w-3 h-3 opacity-70" />
                <span>{t('portal:lecturer_label', 'Pensyarah:')}</span>
                <span className="font-semibold text-[#2E3A2F] dark:text-[#F8F6EE]">{entry.lecturer_code}</span>
              </div>
            )}
          </div>

          {/* Ongoing Class Progress Bar */}
          {isOngoing && (
            <div className="pt-2 space-y-1">
              <div className="w-full bg-[#2E3A2F]/10 dark:bg-[#F8F6EE]/10 rounded-full h-1 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-[#556453] dark:text-[#A3B39F] font-medium">
                <span>{t('portal:min_elapsed', '{{count}} min berlalu', { count: elapsedMinutes })}</span>
                <span>{t('portal:min_remaining', '{{count}} min berbaki', { count: totalDuration - elapsedMinutes })}</span>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons Row */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          {entry.is_online ? (
            <a
              href="https://teams.microsoft.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs sm:text-sm hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Laptop className="w-4 h-4" />
              <span>{t('portal:join_online_class', 'Sertai Kelas Dalam Talian')}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : (
            <Link
              to={getPolyMapsUrl(entry)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#2E3A2F] dark:bg-[#F8F6EE] text-[#F8F6EE] dark:text-[#2E3A2F] font-bold text-xs sm:text-sm hover:opacity-90 transition-all shadow-sm"
            >
              <MapPin className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
              <span>{t('portal:polymaps_directions', 'Tunjuk Arah PolyMaps')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}

          <Link
            to="/akademik/takwim?tab=personal"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#2E3A2F]/15 dark:border-[#F8F6EE]/15 text-[#2E3A2F] dark:text-[#F8F6EE] text-xs font-semibold hover:bg-[#2E3A2F]/5 dark:hover:bg-[#F8F6EE]/5 transition-colors"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{t('portal:view_full_schedule', 'Lihat Jadual Penuh')}</span>
          </Link>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STATE 2: All Classes Completed Today
  // ─────────────────────────────────────────────────────────────────────────────
  if (stateData.type === 'COMPLETED_TODAY') {
    const { nextClass } = stateData;

    return (
      <div
        className={cn(
          'w-full rounded-2xl md:rounded-3xl p-5 sm:p-6 transition-all duration-300',
          'bg-white/90 dark:bg-[#1a231b]/90 border border-[#2E3A2F]/10 dark:border-[#F8F6EE]/10',
          'shadow-sm hover:shadow-md space-y-4',
          className
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 inline-block">
                {t('portal:today_done_badge', 'Hari Ini Selesai')}
              </span>
              <h3 className="text-base sm:text-lg font-black text-[#2E3A2F] dark:text-[#F8F6EE] tracking-tight">
                {t('portal:all_classes_completed_today', 'Semua kelas selesai hari ini')}
              </h3>
              <p className="text-xs text-[#556453] dark:text-[#A3B39F]">
                {t('portal:all_classes_completed_desc', 'Semua sesi kuliah anda telah tamat. Berehat atau buat persediaan untuk sesi kelas seterusnya.')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleCollapsed}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-[#2E3A2F]/10 dark:hover:bg-[#F8F6EE]/10 text-xs font-semibold text-[#556453] dark:text-[#A3B39F] hover:text-[#2E3A2F] dark:hover:text-[#F8F6EE] transition-colors shrink-0"
            title={t('portal:collapse_card', 'Kecilkan')}
            aria-label={t('portal:collapse_card', 'Kecilkan')}
          >
            <span>{t('portal:collapse_card', 'Kecilkan')}</span>
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Next Class Preview */}
        {nextClass && (
          <div className="rounded-xl p-3.5 sm:p-4 bg-[#2E3A2F]/5 dark:bg-[#F8F6EE]/5 border border-[#2E3A2F]/10 dark:border-[#F8F6EE]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-[#556453] dark:text-[#A3B39F]">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                <span>
                  {t('portal:next_class_prefix', 'Seterusnya')} {nextClass.dayLabel} ({formatDisplayTime(nextClass.entry.start_time)} - {formatDisplayTime(nextClass.entry.end_time)})
                </span>
              </div>
              <div className="text-sm font-bold text-[#2E3A2F] dark:text-[#F8F6EE]">
                {nextClass.entry.course_name?.trim() || nextClass.entry.course_code}
              </div>
              <div className="text-xs text-[#556453] dark:text-[#A3B39F] flex items-center gap-1.5">
                {nextClass.entry.is_online ? (
                  <>
                    <Laptop className="w-3 h-3 text-blue-500" />
                    <span>{t('portal:online_generic', 'Dalam Talian')}</span>
                  </>
                ) : (
                  <>
                    <MapPin className="w-3 h-3 text-rose-500" />
                    <span>{getLocationLabel(nextClass.entry)}</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {!nextClass.entry.is_online && (
                <Link
                  to={getPolyMapsUrl(nextClass.entry)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#2E3A2F]/10 dark:bg-[#F8F6EE]/10 text-[#2E3A2F] dark:text-[#F8F6EE] text-xs font-semibold hover:bg-[#2E3A2F]/20 dark:hover:bg-[#F8F6EE]/20 transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>PolyMaps</span>
                </Link>
              )}
              <Link
                to="/akademik/takwim?tab=personal"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#2E3A2F] dark:bg-[#F8F6EE] text-[#F8F6EE] dark:text-[#2E3A2F] text-xs font-bold hover:opacity-90 transition-opacity"
              >
                <span>{t('portal:view_schedule', 'Lihat Jadual')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STATE 3: Weekend / No Class Today
  // ─────────────────────────────────────────────────────────────────────────────
  const { nextClass, isWeekend } = stateData;

  return (
    <div
      className={cn(
        'w-full rounded-2xl md:rounded-3xl p-5 sm:p-6 transition-all duration-300',
        'bg-white/90 dark:bg-[#1a231b]/90 border border-[#2E3A2F]/10 dark:border-[#F8F6EE]/10',
        'shadow-sm hover:shadow-md space-y-4',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0 text-purple-600 dark:text-purple-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                {isWeekend ? t('portal:weekend_badge', 'Hujung Minggu') : t('portal:holiday_no_class_badge', 'Cuti / Tiada Kuliah')}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-[#2E3A2F] dark:text-[#F8F6EE] tracking-tight">
              {t('portal:no_classes_today', 'Tiada kelas hari ini')}
            </h3>
            <p className="text-xs text-[#556453] dark:text-[#A3B39F]">
              {isWeekend
                ? t('portal:weekend_desc', 'Selamat berehat pada hujung minggu! Bersedia untuk jadual kuliah minggu akan datang.')
                : t('portal:holiday_desc', 'Tiada sesi kelas berjadual untuk hari ini. Gunakan masa lapang untuk mengulang kaji pelajaran.')}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleCollapsed}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-[#2E3A2F]/10 dark:hover:bg-[#F8F6EE]/10 text-xs font-semibold text-[#556453] dark:text-[#A3B39F] hover:text-[#2E3A2F] dark:hover:text-[#F8F6EE] transition-colors shrink-0"
          title={t('portal:collapse_card', 'Kecilkan')}
          aria-label={t('portal:collapse_card', 'Kecilkan')}
        >
          <span>{t('portal:collapse_card', 'Kecilkan')}</span>
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Next Class Preview (e.g. Next Monday) */}
      {nextClass && (
        <div className="rounded-xl p-3.5 sm:p-4 bg-[#2E3A2F]/5 dark:bg-[#F8F6EE]/5 border border-[#2E3A2F]/10 dark:border-[#F8F6EE]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-[#556453] dark:text-[#A3B39F]">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              <span>
                {t('portal:next_class_prefix', 'Seterusnya')} {nextClass.dayLabel} ({formatDisplayTime(nextClass.entry.start_time)} - {formatDisplayTime(nextClass.entry.end_time)})
              </span>
            </div>
            <div className="text-sm font-bold text-[#2E3A2F] dark:text-[#F8F6EE]">
              {nextClass.entry.course_name?.trim() || nextClass.entry.course_code}
            </div>
            <div className="text-xs text-[#556453] dark:text-[#A3B39F] flex items-center gap-1.5">
              {nextClass.entry.is_online ? (
                <>
                  <Laptop className="w-3 h-3 text-blue-500" />
                  <span>{t('portal:online_generic', 'Dalam Talian')}</span>
                </>
              ) : (
                <>
                  <MapPin className="w-3 h-3 text-rose-500" />
                  <span>{getLocationLabel(nextClass.entry)}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!nextClass.entry.is_online && (
              <Link
                to={getPolyMapsUrl(nextClass.entry)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#2E3A2F]/10 dark:bg-[#F8F6EE]/10 text-[#2E3A2F] dark:text-[#F8F6EE] text-xs font-semibold hover:bg-[#2E3A2F]/20 dark:hover:bg-[#F8F6EE]/20 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>PolyMaps</span>
              </Link>
            )}
            <Link
              to="/akademik/takwim?tab=personal"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#2E3A2F] dark:bg-[#F8F6EE] text-[#F8F6EE] dark:text-[#2E3A2F] text-xs font-bold hover:opacity-90 transition-opacity"
            >
              <span>{t('portal:view_schedule', 'Lihat Jadual')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default NextClassBentoCard;
