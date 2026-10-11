import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  ExternalLink,
  Sparkles,
  ArrowRight,
  Laptop,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Building,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StudentTimetableEntry } from '@/types';

export interface NextClassBentoCardProps {
  entries?: StudentTimetableEntry[] | null;
  className?: string;
}

const DAY_LABELS: Record<number, string> = {
  1: 'Isnin',
  2: 'Selasa',
  3: 'Rabu',
  4: 'Khamis',
  5: 'Jumaat',
  6: 'Sabtu',
  0: 'Ahad',
};

const CLASS_TYPE_BADGES: Record<string, { label: string; badgeClass: string }> = {
  KULIAH: {
    label: 'Kuliah',
    badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  },
  AMALI: {
    label: 'Amali',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  TUTORIAL: {
    label: 'Tutorial',
    badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  },
  LAIN_LAIN: {
    label: 'Lain-lain',
    badgeClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
  },
};

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
  currentDayOfWeek: number
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
        const dayLabel = isTomorrow ? 'Esok' : (DAY_LABELS[nextDay] || `Hari ${nextDay}`);
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

export function NextClassBentoCard({
  entries,
  className,
}: NextClassBentoCardProps) {
  // Client-side live timer (zero DB polling) updating every 30 seconds
  const [now, setNow] = useState(() => getMalaysianNow());

  // Collapsible card state persisted in localStorage
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('portal_next_class_collapsed') === 'true';
    } catch {
      return false;
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
    const timer = setInterval(() => {
      setNow(getMalaysianNow());
    }, 30000);
    return () => clearInterval(timer);
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
      const nextUpcoming = findNextUpcomingClass(activeEntries, now.dayOfWeek);
      return {
        type: 'COMPLETED_TODAY' as const,
        nextClass: nextUpcoming,
      };
    }

    // State 3: Weekend or no classes scheduled on this weekday
    const nextUpcoming = findNextUpcomingClass(activeEntries, now.dayOfWeek);
    return {
      type: 'NO_CLASS_TODAY' as const,
      isWeekend: !isWeekday,
      nextClass: nextUpcoming,
    };
  }, [activeEntries, now]);

  // Helper for PolyMaps deep link URL
  const getPolyMapsUrl = (entry: Pick<StudentTimetableEntry, 'location_id' | 'room_raw'>): string => {
    return buildPolyMapsRoomUrl(entry);
  };

  // Helper for physical location label
  const getLocationLabel = (entry: StudentTimetableEntry): string => {
    if (entry.location) {
      const buildingName = entry.location.building?.name;
      return buildingName
        ? `${entry.location.room_code} · ${buildingName}`
        : entry.location.room_code;
    }
    return entry.room_raw || 'Dewan / Bilik Kuliah';
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // COLLAPSED COMPACT BAR (For active states)
  // ─────────────────────────────────────────────────────────────────────────────
  if (isCollapsed && stateData.type !== 'EMPTY') {
    return (
      <div
        className={cn(
          'w-full rounded-2xl p-3 sm:p-4 transition-all duration-300',
          'bg-white/80 dark:bg-[#1a231b]/80 border border-[#2E3A2F]/10 dark:border-[#F8F6EE]/10',
          'shadow-sm hover:shadow-md backdrop-blur-md',
          className
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {stateData.type === 'TODAY_ACTIVE' ? (
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                <Clock className="w-4 h-4" />
              </span>
            ) : stateData.type === 'COMPLETED_TODAY' ? (
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </span>
            ) : (
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
                <Calendar className="w-4 h-4" />
              </span>
            )}

            <div className="min-w-0 flex items-center gap-2 flex-wrap">
              {stateData.type === 'TODAY_ACTIVE' ? (
                <>
                  <span className="text-xs font-black text-[#2E3A2F] dark:text-[#F8F6EE] truncate">
                    {stateData.isOngoing ? 'Kelas Semasa' : 'Kelas Seterusnya'}: {stateData.entry.course_code}
                  </span>
                  <span className="text-[11px] text-[#556453] dark:text-[#A3B39F]">
                    ({formatDisplayTime(stateData.entry.start_time)} - {formatDisplayTime(stateData.entry.end_time)})
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 truncate">
                    · {stateData.entry.is_online ? 'Dalam Talian' : getLocationLabel(stateData.entry)}
                  </span>
                </>
              ) : stateData.type === 'COMPLETED_TODAY' ? (
                <>
                  <span className="text-xs font-bold text-[#2E3A2F] dark:text-[#F8F6EE]">
                    Semua kelas selesai hari ini
                  </span>
                  {stateData.nextClass && (
                    <span className="text-[11px] text-[#556453] dark:text-[#A3B39F] truncate">
                      · Seterusnya {stateData.nextClass.dayLabel}: {stateData.nextClass.entry.course_code} ({formatDisplayTime(stateData.nextClass.entry.start_time)})
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span className="text-xs font-bold text-[#2E3A2F] dark:text-[#F8F6EE]">
                    Tiada kelas hari ini
                  </span>
                  {stateData.nextClass && (
                    <span className="text-[11px] text-[#556453] dark:text-[#A3B39F] truncate">
                      · Seterusnya {stateData.nextClass.dayLabel}: {stateData.nextClass.entry.course_code} ({formatDisplayTime(stateData.nextClass.entry.start_time)})
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {stateData.type === 'TODAY_ACTIVE' && !stateData.entry.is_online && (
              <Link
                to={getPolyMapsUrl(stateData.entry)}
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#2E3A2F]/10 dark:bg-[#F8F6EE]/10 text-[#2E3A2F] dark:text-[#F8F6EE] text-xs font-semibold hover:bg-[#2E3A2F]/20 dark:hover:bg-[#F8F6EE]/20 transition-colors"
                title="Panduan PolyMaps"
              >
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                <span>Peta</span>
              </Link>
            )}
            <Link
              to="/akademik/takwim"
              className="text-xs font-semibold text-[#556453] dark:text-[#A3B39F] hover:text-[#2E3A2F] dark:hover:text-[#F8F6EE] transition-colors"
              title="Jadual Penuh"
            >
              Jadual
            </Link>
            <button
              type="button"
              onClick={toggleCollapsed}
              className="p-1 rounded-lg hover:bg-[#2E3A2F]/10 dark:hover:bg-[#F8F6EE]/10 text-[#556453] dark:text-[#A3B39F] hover:text-[#2E3A2F] dark:hover:text-[#F8F6EE] transition-colors"
              title="Kembangkan kad"
              aria-label="Kembangkan kad"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
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
          'shadow-sm hover:shadow-md backdrop-blur-md',
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
                  Peribadi Pelajar
                </span>
                <span className="text-xs text-[#556453] dark:text-[#A3B39F]">e-Akademik</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-[#2E3A2F] dark:text-[#F8F6EE] tracking-tight">
                Jadual Kuliah Belum Dimuat Naik
              </h3>
              <p className="text-xs sm:text-sm text-[#556453] dark:text-[#A3B39F] max-w-xl">
                Muat naik fail jadual kelas (PDF) anda di modul e-Akademik untuk semakan kelas masa nyata, kiraan detik automatik, dan navigasi pantas PolyMaps.
              </p>
            </div>
          </div>

          <Link
            to="/akademik/takwim"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#2E3A2F] dark:bg-[#F8F6EE] text-[#F8F6EE] dark:text-[#2E3A2F] font-bold text-xs sm:text-sm hover:opacity-90 transition-all shrink-0 shadow-sm"
          >
            <span>Muat Naik Jadual</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STATE 1: Upcoming or Ongoing Class Today
  // ─────────────────────────────────────────────────────────────────────────────
  if (stateData.type === 'TODAY_ACTIVE') {
    const { entry, isOngoing } = stateData;
    const typeBadge = CLASS_TYPE_BADGES[entry.class_type] || CLASS_TYPE_BADGES.KULIAH;

    // Countdown calculation
    let countdownBadgeText = 'Sedang berlangsung';
    if (isOngoing) {
      const remainingMin = parseTimeToMinutes(entry.end_time) - now.currentMinutes;
      countdownBadgeText = remainingMin > 0 ? `Sedang berlangsung · Berbaki ${remainingMin} min` : 'Sedang berlangsung';
    } else {
      const diffMin = parseTimeToMinutes(entry.start_time) - now.currentMinutes;
      if (diffMin <= 1) {
        countdownBadgeText = 'Bermula sebentar lagi';
      } else if (diffMin < 60) {
        countdownBadgeText = `Dalam ${diffMin} minit`;
      } else {
        const hours = Math.floor(diffMin / 60);
        const mins = diffMin % 60;
        countdownBadgeText = mins > 0 ? `Dalam ${hours} jam ${mins} minit` : `Dalam ${hours} jam`;
      }
    }

    return (
      <div
        className={cn(
          'w-full rounded-2xl md:rounded-3xl p-5 sm:p-6 transition-all duration-300',
          'bg-white/80 dark:bg-[#1a231b]/80 border border-[#2E3A2F]/10 dark:border-[#F8F6EE]/10',
          'shadow-sm hover:shadow-md backdrop-blur-md space-y-4',
          className
        )}
      >
        {/* Top Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#2E3A2F]/10 dark:bg-[#F8F6EE]/10 text-[#2E3A2F] dark:text-[#F8F6EE]">
              <Clock className="w-3 h-3" />
              <span>{isOngoing ? 'Kelas Semasa' : 'Kelas Seterusnya Hari Ini'}</span>
            </span>

            {/* Countdown / Live Indicator */}
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border',
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
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/akademik/takwim"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#556453] dark:text-[#A3B39F] hover:text-[#2E3A2F] dark:hover:text-[#F8F6EE] transition-colors"
            >
              <span>Jadual Penuh</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
            <button
              type="button"
              onClick={toggleCollapsed}
              className="p-1 rounded-lg hover:bg-[#2E3A2F]/10 dark:hover:bg-[#F8F6EE]/10 text-[#556453] dark:text-[#A3B39F] hover:text-[#2E3A2F] dark:hover:text-[#F8F6EE] transition-colors"
              title="Kecilkan kad"
              aria-label="Kecilkan kad"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Middle Subject Info */}
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#2E3A2F]/5 dark:bg-[#F8F6EE]/10 text-[#2E3A2F] dark:text-[#F8F6EE]">
              {entry.course_code}
            </span>
            <span
              className={cn(
                'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border',
                typeBadge.badgeClass
              )}
            >
              {typeBadge.label}
            </span>
          </div>

          <h3 className="text-lg sm:text-xl font-black text-[#2E3A2F] dark:text-[#F8F6EE] tracking-tight">
            {entry.course_name}
          </h3>

          {/* Time, Lecturer, & Location Meta */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-xs text-[#556453] dark:text-[#A3B39F]">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {formatDisplayTime(entry.start_time)} - {formatDisplayTime(entry.end_time)}
              </span>
            </div>

            {/* Room or Online Badge */}
            {entry.is_online ? (
              <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium">
                <Laptop className="w-3.5 h-3.5" />
                <span>DALAM TALIAN (TEAMS)</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[#2E3A2F] dark:text-[#F8F6EE] font-medium">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                <span>{getLocationLabel(entry)}</span>
              </div>
            )}

            {entry.lecturer_code && (
              <div className="flex items-center gap-1 text-[11px] text-[#556453] dark:text-[#A3B39F]">
                <span>Pensyarah:</span>
                <span className="font-semibold">{entry.lecturer_code}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          {entry.is_online ? (
            <a
              href="https://teams.microsoft.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs sm:text-sm hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Laptop className="w-4 h-4" />
              <span>Sertai Kelas Dalam Talian</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : (
            <Link
              to={getPolyMapsUrl(entry)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#2E3A2F] dark:bg-[#F8F6EE] text-[#F8F6EE] dark:text-[#2E3A2F] font-bold text-xs sm:text-sm hover:opacity-90 transition-all shadow-sm"
            >
              <MapPin className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
              <span>Panduan PolyMaps</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}

          <Link
            to="/akademik/takwim"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#2E3A2F]/15 dark:border-[#F8F6EE]/15 text-[#2E3A2F] dark:text-[#F8F6EE] text-xs font-semibold hover:bg-[#2E3A2F]/5 dark:hover:bg-[#F8F6EE]/5 transition-colors"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Lihat Jadual Penuh</span>
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
          'bg-white/80 dark:bg-[#1a231b]/80 border border-[#2E3A2F]/10 dark:border-[#F8F6EE]/10',
          'shadow-sm hover:shadow-md backdrop-blur-md space-y-4',
          className
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                  Hari Ini Selesai
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-[#2E3A2F] dark:text-[#F8F6EE] tracking-tight">
                Semua kelas selesai untuk hari ini
              </h3>
              <p className="text-xs text-[#556453] dark:text-[#A3B39F]">
                Semua sesi kuliah anda telah tamat. Berehat atau buat persediaan untuk sesi kelas yang seterusnya.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/akademik/takwim"
              className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-[#556453] dark:text-[#A3B39F] hover:text-[#2E3A2F] dark:hover:text-[#F8F6EE] transition-colors"
            >
              <span>Jadual Penuh</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
            <button
              type="button"
              onClick={toggleCollapsed}
              className="p-1 rounded-lg hover:bg-[#2E3A2F]/10 dark:hover:bg-[#F8F6EE]/10 text-[#556453] dark:text-[#A3B39F] hover:text-[#2E3A2F] dark:hover:text-[#F8F6EE] transition-colors"
              title="Kecilkan kad"
              aria-label="Kecilkan kad"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Next Class Preview */}
        {nextClass && (
          <div className="rounded-xl p-3 sm:p-4 bg-[#2E3A2F]/5 dark:bg-[#F8F6EE]/5 border border-[#2E3A2F]/10 dark:border-[#F8F6EE]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-[#556453] dark:text-[#A3B39F]">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                <span>
                  Kelas Seterusnya: {nextClass.dayLabel} ({formatDisplayTime(nextClass.entry.start_time)} - {formatDisplayTime(nextClass.entry.end_time)})
                </span>
              </div>
              <div className="text-sm font-bold text-[#2E3A2F] dark:text-[#F8F6EE]">
                {nextClass.entry.course_code} - {nextClass.entry.course_name}
              </div>
              <div className="text-xs text-[#556453] dark:text-[#A3B39F] flex items-center gap-1.5">
                {nextClass.entry.is_online ? (
                  <>
                    <Laptop className="w-3 h-3 text-blue-500" />
                    <span>Dalam Talian</span>
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
                to="/akademik/takwim"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#2E3A2F] dark:bg-[#F8F6EE] text-[#F8F6EE] dark:text-[#2E3A2F] text-xs font-bold hover:opacity-90 transition-opacity"
              >
                <span>Lihat Jadual</span>
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
        'bg-white/80 dark:bg-[#1a231b]/80 border border-[#2E3A2F]/10 dark:border-[#F8F6EE]/10',
        'shadow-sm hover:shadow-md backdrop-blur-md space-y-4',
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
                {isWeekend ? 'Hujung Minggu' : 'Cuti / Tiada Kuliah'}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-[#2E3A2F] dark:text-[#F8F6EE] tracking-tight">
              Tiada kelas hari ini
            </h3>
            <p className="text-xs text-[#556453] dark:text-[#A3B39F]">
              {isWeekend
                ? 'Selamat berehat pada hujung minggu! Bersedia untuk jadual kuliah minggu akan datang.'
                : 'Tiada sesi kelas berjadual untuk hari ini. Gunakan masa lapang untuk mengulang kaji pelajaran.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/akademik/takwim"
            className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-[#556453] dark:text-[#A3B39F] hover:text-[#2E3A2F] dark:hover:text-[#F8F6EE] transition-colors"
          >
            <span>Jadual Penuh</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
          <button
            type="button"
            onClick={toggleCollapsed}
            className="p-1 rounded-lg hover:bg-[#2E3A2F]/10 dark:hover:bg-[#F8F6EE]/10 text-[#556453] dark:text-[#A3B39F] hover:text-[#2E3A2F] dark:hover:text-[#F8F6EE] transition-colors"
            title="Kecilkan kad"
            aria-label="Kecilkan kad"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Next Class Preview (e.g. Next Monday) */}
      {nextClass && (
        <div className="rounded-xl p-3 sm:p-4 bg-[#2E3A2F]/5 dark:bg-[#F8F6EE]/5 border border-[#2E3A2F]/10 dark:border-[#F8F6EE]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-[#556453] dark:text-[#A3B39F]">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              <span>
                Kelas Seterusnya: {nextClass.dayLabel} ({formatDisplayTime(nextClass.entry.start_time)} - {formatDisplayTime(nextClass.entry.end_time)})
              </span>
            </div>
            <div className="text-sm font-bold text-[#2E3A2F] dark:text-[#F8F6EE]">
              {nextClass.entry.course_code} - {nextClass.entry.course_name}
            </div>
            <div className="text-xs text-[#556453] dark:text-[#A3B39F] flex items-center gap-1.5">
              {nextClass.entry.is_online ? (
                <>
                  <Laptop className="w-3 h-3 text-blue-500" />
                  <span>Dalam Talian</span>
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
              to="/akademik/takwim"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#2E3A2F] dark:bg-[#F8F6EE] text-[#F8F6EE] dark:text-[#2E3A2F] text-xs font-bold hover:opacity-90 transition-opacity"
            >
              <span>Lihat Jadual</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
