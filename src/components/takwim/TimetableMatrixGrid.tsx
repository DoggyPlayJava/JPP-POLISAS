import React from 'react';
import {
  Clock,
  MapPin,
  Globe,
  Trash2,
  Coffee,
  ChevronRight,
  Info,
} from 'lucide-react';
import { cn, hexToRgba } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { StudentTimetableEntry, ClassType } from '@/types';
import {
  MATRIX_TIME_SLOTS,
  REHAT_START_HOUR,
  getSlotGridSpan,
  formatMatrixTime,
} from '@/lib/timetableMatrix';

const DAYS = [
  { value: 1, label: 'ISNIN', shortLabel: 'ISN' },
  { value: 2, label: 'SELASA', shortLabel: 'SEL' },
  { value: 3, label: 'RABU', shortLabel: 'RAB' },
  { value: 4, label: 'KHAMIS', shortLabel: 'KHA' },
  { value: 5, label: 'JUMAAT', shortLabel: 'JUM' },
];

const CLASS_TYPE_ABBR: Record<ClassType, string> = {
  KULIAH: 'L',
  AMALI: 'P',
  TUTORIAL: 'TU',
  LAIN_LAIN: 'O',
};

export interface TimetableMatrixGridProps {
  entries: StudentTimetableEntry[];
  onSlotClick?: (slot: StudentTimetableEntry) => void;
  onSlotDelete?: (slotId: string) => void;
}

export function TimetableMatrixGrid({
  entries,
  onSlotClick,
  onSlotDelete,
}: TimetableMatrixGridProps) {
  const currentDayOfWeek = new Date().getDay();

  // Group entries by day
  const entriesByDay = React.useMemo(() => {
    const map: Record<number, StudentTimetableEntry[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    entries.forEach(e => {
      if (map[e.day_of_week]) {
        map[e.day_of_week].push(e);
      }
    });
    return map;
  }, [entries]);

  return (
    <div className="space-y-2.5">
      {/* Mobile Swipe Guidance Banner */}
      <div className="flex md:hidden items-center justify-between px-3 py-1.5 rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-[10px] text-slate-500 dark:text-white/50">
        <span className="flex items-center gap-1.5 font-bold">
          <Clock className="w-3 h-3 text-indigo-500" />
          <span>← Leret untuk lihat jadual penuh (8:00 PG - 5:00 PTG) →</span>
        </span>
        <ChevronRight className="w-3 h-3 shrink-0 animate-pulse text-indigo-500" />
      </div>

      {/* Matrix Canvas Container with Native Momentum Scrolling */}
      <div className="relative rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-xs overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <div className="min-w-[1040px] select-none">
            {/* ── Header Row: Days label + 9 Hourly Slots ── */}
            <div className="flex items-stretch border-b border-slate-200 dark:border-white/10 bg-slate-50/90 dark:bg-zinc-900/90 sticky top-0 z-30">
              {/* Corner Cell: Sticky Top & Left */}
              <div className="w-24 sm:w-28 shrink-0 p-3 flex flex-col justify-center items-center border-r border-slate-200 dark:border-white/10 bg-slate-100/95 dark:bg-zinc-900/95 sticky left-0 z-40">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-white/40">
                  HARI \ MASA
                </span>
              </div>

              {/* 9 Hourly Header Columns */}
              <div className="grid grid-cols-9 flex-1">
                {MATRIX_TIME_SLOTS.map(slot => (
                  <div
                    key={slot.index}
                    className={cn(
                      'p-2.5 text-center border-r border-slate-200/80 dark:border-white/5 last:border-r-0 flex flex-col items-center justify-center transition-colors',
                      slot.isBreak
                        ? 'bg-amber-500/[0.06] dark:bg-amber-500/[0.03]'
                        : 'bg-transparent'
                    )}
                  >
                    <span className="text-[11px] font-black text-slate-800 dark:text-white/90 tracking-tight leading-none mb-0.5">
                      {slot.label}
                    </span>
                    {slot.isBreak && (
                      <span className="text-[9px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        REHAT / SOLAT
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Day Rows: 5 Days (Isnin .. Jumaat) ── */}
            <div className="divide-y divide-slate-200/80 dark:divide-white/10">
              {DAYS.map(day => {
                const daySlots = entriesByDay[day.value] || [];
                const isToday = currentDayOfWeek === day.value;

                return (
                  <div
                    key={day.value}
                    className={cn(
                      'flex items-stretch min-h-[92px] transition-colors',
                      isToday
                        ? 'bg-indigo-500/[0.015]'
                        : 'hover:bg-slate-50/50 dark:hover:bg-white/[0.01]'
                    )}
                  >
                    {/* Day Column (Sticky Left) */}
                    <div
                      className={cn(
                        'w-24 sm:w-28 shrink-0 p-3 border-r border-slate-200/80 dark:border-white/10 flex flex-col justify-center items-center sticky left-0 z-20 transition-colors',
                        isToday
                          ? 'bg-indigo-50/95 dark:bg-indigo-950/40'
                          : 'bg-white/95 dark:bg-zinc-950/95'
                      )}
                    >
                      <span className="text-xs font-black text-slate-900 dark:text-white tracking-wider">
                        {day.label}
                      </span>
                      {isToday && (
                        <Badge className="mt-1 bg-indigo-600 text-white border-none text-[8px] font-black uppercase tracking-wider px-1.5 py-0.2">
                          HARI INI
                        </Badge>
                      )}
                      <span className="text-[9px] font-bold text-slate-400 dark:text-white/30 mt-0.5">
                        {daySlots.length} slot
                      </span>
                    </div>

                    {/* 9-Column Time Canvas for This Day */}
                    <div className="relative grid grid-cols-9 flex-1">
                      {/* Background hourly column guides */}
                      {MATRIX_TIME_SLOTS.map(slot => (
                        <div
                          key={`bg-${slot.index}`}
                          className={cn(
                            'border-r border-slate-100 dark:border-white/[0.03] last:border-r-0 h-full flex flex-col items-center justify-center',
                            slot.isBreak &&
                              'bg-amber-500/[0.03] dark:bg-amber-500/[0.015] border-dashed border-amber-300/30 dark:border-amber-500/10'
                          )}
                        >
                          {slot.isBreak && (
                            <div className="opacity-20 flex flex-col items-center gap-1 select-none pointer-events-none">
                              <Coffee className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                              <span className="text-[8px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">
                                REHAT
                              </span>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Positioned Class Slots */}
                      {daySlots.map(slot => {
                        const { colStart, colSpan } = getSlotGridSpan(
                          slot.start_time,
                          slot.end_time
                        );
                        const typeCode = CLASS_TYPE_ABBR[slot.class_type] || 'L';
                        const themeColor = slot.color || '#3b82f6';
                        const timeFormatted = `${formatMatrixTime(slot.start_time)} - ${formatMatrixTime(slot.end_time)}`;

                        return (
                          <div
                            key={slot.id}
                            onClick={() => onSlotClick?.(slot)}
                            style={{
                              gridColumn: `${colStart} / span ${colSpan}`,
                              backgroundColor: hexToRgba(themeColor, 0.12),
                              borderColor: hexToRgba(themeColor, 0.38),
                              borderLeftColor: themeColor,
                            }}
                            className={cn(
                              'group/slot absolute inset-1.5 p-2 rounded-xl border border-l-4 cursor-pointer transition-all flex flex-col justify-between overflow-hidden shadow-2xs hover:shadow-md hover:scale-[1.01] hover:z-20 active:scale-[0.99]'
                            )}
                            title={`${slot.course_code}: ${slot.course_name} (${timeFormatted})`}
                          >
                            {/* Card Top: Code & Class Type */}
                            <div className="flex items-start justify-between gap-1">
                              <div className="flex items-center gap-1 truncate">
                                <span className="text-[11px] font-black text-slate-900 dark:text-white tracking-tight leading-tight truncate">
                                  {slot.course_code} ({typeCode})
                                </span>
                              </div>

                              {/* Action controls (delete on hover) */}
                              <div className="flex items-center gap-0.5 shrink-0">
                                {slot.is_online && (
                                  <Globe className="w-3 h-3 text-sky-600 dark:text-sky-400 shrink-0" />
                                )}
                                {onSlotDelete && (
                                  <button
                                    type="button"
                                    onClick={e => {
                                      e.stopPropagation();
                                      onSlotDelete(slot.id);
                                    }}
                                    className="opacity-0 group-hover/slot:opacity-100 p-0.5 rounded text-slate-400 hover:text-rose-600 transition-opacity"
                                    title="Padam Slot"
                                    aria-label="Padam Slot"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Card Middle: Course Name (only if 2+ colSpan or space permits) */}
                            {colSpan >= 2 && slot.course_name && slot.course_name !== slot.course_code && (
                              <p className="text-[10px] font-semibold text-slate-700 dark:text-white/80 line-clamp-1 leading-tight my-0.5">
                                {slot.course_name}
                              </p>
                            )}

                            {/* Card Bottom: Room & Lecturer */}
                            <div className="flex items-center justify-between gap-1 text-[9px] font-bold text-slate-600 dark:text-white/70 mt-auto pt-0.5 border-t border-black/5 dark:border-white/5">
                              <span className="flex items-center gap-0.5 truncate">
                                <MapPin className="w-2.5 h-2.5 shrink-0 opacity-70" />
                                <span className="truncate">{slot.room_raw || 'Bilik'}</span>
                              </span>
                              {slot.lecturer_code && (
                                <span className="text-[8px] uppercase tracking-wider text-slate-500 dark:text-white/50 shrink-0">
                                  {slot.lecturer_code}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
