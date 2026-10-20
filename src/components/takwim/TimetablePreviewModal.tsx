import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Calendar,
  Clock,
  AlertCircle,
  MapPin,
  Plus,
  Trash2,
  CheckCircle2,
  BookOpen,
  User,
  Building,
  Wifi,
  Sparkles,
  Layers,
  Palette,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import type { ClassType, StudentTimetableEntry, ImapsRoomMapping } from '@/types';
import { COURSE_PALETTE, matchRoomToLocation, type RoomLocationLookup } from '@/lib/timetableParser';

export const DAY_NAMES: { value: number; label: string }[] = [
  { value: 1, label: 'Isnin' },
  { value: 2, label: 'Selasa' },
  { value: 3, label: 'Rabu' },
  { value: 4, label: 'Khamis' },
  { value: 5, label: 'Jumaat' },
];

export const CLASS_TYPE_OPTIONS: { value: ClassType; label: string }[] = [
  { value: 'KULIAH', label: 'Kuliah' },
  { value: 'AMALI', label: 'Amali' },
  { value: 'TUTORIAL', label: 'Tutorial' },
  { value: 'LAIN_LAIN', label: 'Lain-lain' },
];

export interface ConflictInfo {
  indexA: number;
  indexB: number;
  dayOfWeek: number;
  message: string;
}

export function parseTimeToMinutes(t: string): number {
  if (!t) return 0;
  const parts = t.split(':');
  const hours = parseInt(parts[0], 10) || 0;
  const mins = parseInt(parts[1], 10) || 0;
  return hours * 60 + mins;
}

const t = (k: string, fb: string, opt?: any): string => fb;

export function checkTimetableConflicts(
  slots: { day_of_week: number; start_time: string; end_time: string; course_code: string }[]
): ConflictInfo[] {
  const conflicts: ConflictInfo[] = [];
  const dayNameMap: Record<number, string> = {
    1: 'Isnin',
    2: 'Selasa',
    3: 'Rabu',
    4: 'Khamis',
    5: 'Jumaat',
  };

  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const a = slots[i];
      const b = slots[j];

      if (a.day_of_week === b.day_of_week) {
        const startA = parseTimeToMinutes(a.start_time);
        const endA = parseTimeToMinutes(a.end_time);
        const startB = parseTimeToMinutes(b.start_time);
        const endB = parseTimeToMinutes(b.end_time);

        if (startA < endB && endA > startB) {
          const dayName = dayNameMap[a.day_of_week] || t('jpp:day_fallback', 'Hari {{day}}', { day: a.day_of_week });
          conflicts.push({
            indexA: i,
            indexB: j,
            dayOfWeek: a.day_of_week,
            message: t('jpp:timetable_conflict_msg', 'Pertindihan pada hari {{day}}: {{slotA}} ({{startA}} - {{endA}}) dengan {{slotB}} ({{startB}} - {{endB}})', { day: dayName, slotA: a.course_code || 'Slot', startA: a.start_time.slice(0, 5), endA: a.end_time.slice(0, 5), slotB: b.course_code || 'Slot', startB: b.start_time.slice(0, 5), endB: b.end_time.slice(0, 5) }),
          });
        }
      }
    }
  }
  return conflicts;
}

function formatDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function computeDefaultSemesterDates(
  effectiveDateRaw?: string,
  sessionRaw?: string
): { startDate: string; endDate: string } {
  if (effectiveDateRaw && effectiveDateRaw.trim()) {
    const trimmed = effectiveDateRaw.trim();
    const dmy = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
    if (dmy) {
      const day = parseInt(dmy[1], 10);
      const month = parseInt(dmy[2], 10) - 1;
      const year = dmy[3].length === 2 ? 2000 + parseInt(dmy[3], 10) : parseInt(dmy[3], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        const startStr = formatDateLocal(d);
        const endD = new Date(d.getTime() + 18 * 7 * 24 * 60 * 60 * 1000);
        const endStr = formatDateLocal(endD);
        return { startDate: startStr, endDate: endStr };
      }
    } else {
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) {
        const startStr = formatDateLocal(d);
        const endD = new Date(d.getTime() + 18 * 7 * 24 * 60 * 60 * 1000);
        const endStr = formatDateLocal(endD);
        return { startDate: startStr, endDate: endStr };
      }
    }
  }

  const isSesi2 = sessionRaw && (/\bII\b/i.test(sessionRaw) || /SESI\s*2\b/i.test(sessionRaw));
  if (isSesi2) {
    return { startDate: '2026-11-23', endDate: '2027-04-18' };
  }
  return { startDate: '2026-06-22', endDate: '2026-11-08' };
}

export function inferSemesterFromClassName(className?: string): string {
  if (!className) return '1';
  const match = className.match(/\b[A-Za-z]+(\d)[A-Za-z0-9]*\b/);
  if (match) return match[1];
  return '1';
}

export interface TimetablePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMetadata?: {
    session?: string;
    effectiveDate?: string;
    className?: string;
    department?: string;
    semester?: string;
    semesterStartDate?: string;
    semesterEndDate?: string;
  };
  initialEntries?: Omit<StudentTimetableEntry, 'id' | 'user_id'>[];
  onSuccess?: () => void;
}

export function TimetablePreviewModal({
  isOpen,
  onClose,
  initialMetadata,
  initialEntries = [],
  onSuccess,
}: TimetablePreviewModalProps) {
  const { t } = useTranslation(['kpp', 'common']);
  const { user } = useAuth();

  const [session, setSession] = useState('');
  const [className, setClassName] = useState('');
  const [semester, setSemester] = useState('1');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedDayFilter, setSelectedDayFilter] = useState<number>(0); // 0 = all
  const [slots, setSlots] = useState<Omit<StudentTimetableEntry, 'id' | 'user_id'>[]>([]);
  const [locations, setLocations] = useState<RoomLocationLookup[]>([]);
  const [roomMappings, setRoomMappings] = useState<ImapsRoomMapping[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize data when modal opens or initial data changes
  useEffect(() => {
    if (!isOpen) return;

    const currentClass = initialMetadata?.className || '';
    setClassName(currentClass);
    setSession(initialMetadata?.session || 'SESI I : 2024/2025');
    setSemester(initialMetadata?.semester || inferSemesterFromClassName(currentClass));

    const computedDates = computeDefaultSemesterDates(
      initialMetadata?.effectiveDate,
      initialMetadata?.session
    );
    setStartDate(initialMetadata?.semesterStartDate || computedDates.startDate);
    setEndDate(initialMetadata?.semesterEndDate || computedDates.endDate);

    setSlots(initialEntries.map(e => ({ ...e })));
  }, [isOpen, initialMetadata, initialEntries]);

  // Load locations and room mappings in parallel for real-time room matching
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    async function loadLookupData() {
      try {
        const [locsRes, mapRes] = await Promise.all([
          supabase.from('imaps_locations').select('id, room_code, search_tags'),
          supabase.from('imaps_room_mappings').select('*'),
        ]);
        if (isMounted) {
          const locs = (locsRes.data || []) as RoomLocationLookup[];
          const maps = (mapRes.data || []) as ImapsRoomMapping[];
          setLocations(locs);
          setRoomMappings(maps);

          // If initial entries had slots where location_id is missing, auto-resolve now
          setSlots(prev =>
            prev.map(slot => {
              if (!slot.location_id && slot.room_raw && !slot.is_online) {
                const matched = matchRoomToLocation(slot.room_raw, locs, maps);
                if (matched.location_id || matched.is_online) {
                  return {
                    ...slot,
                    location_id: matched.location_id,
                    is_online: matched.is_online,
                  };
                }
              }
              return slot;
            })
          );
        }
      } catch (err) {
        console.error('Failed to load room lookup data:', err);
      }
    }
    loadLookupData();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const conflicts = useMemo(() => {
    return checkTimetableConflicts(slots);
  }, [slots]);

  const conflictingIndices = useMemo(() => {
    const set = new Set<number>();
    conflicts.forEach(c => {
      set.add(c.indexA);
      set.add(c.indexB);
    });
    return set;
  }, [conflicts]);

  const handleUpdateSlot = (
    index: number,
    field: keyof Omit<StudentTimetableEntry, 'id' | 'user_id'>,
    value: any
  ) => {
    setSlots(prev => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };

      // If room changed, recalculate location_id and is_online using matchRoomToLocation
      if (field === 'room_raw' && typeof value === 'string') {
        const matched = matchRoomToLocation(value, locations, roomMappings);
        item.location_id = matched.location_id;
        item.is_online = matched.is_online;
      }

      updated[index] = item;
      return updated;
    });
  };

  const handleAddSlot = (dayOfWeek?: number) => {
    const targetDay = dayOfWeek || (selectedDayFilter > 0 ? selectedDayFilter : 1);
    const newSlot: Omit<StudentTimetableEntry, 'id' | 'user_id'> = {
      academic_session: session || 'SESI I : 2024/2025',
      semester: semester || '1',
      class_name: className || '',
      day_of_week: targetDay,
      start_time: '08:00:00',
      end_time: '10:00:00',
      course_code: '',
      course_name: '',
      class_type: 'KULIAH',
      lecturer_code: '',
      room_raw: '',
      location_id: null,
      is_online: false,
      color: COURSE_PALETTE[slots.length % COURSE_PALETTE.length],
      is_archived: false,
    };
    setSlots(prev => [...prev, newSlot]);
  };

  const handleDeleteSlot = (index: number) => {
    setSlots(prev => prev.filter((_, i) => i !== index));
  };

  const handleCycleColor = (index: number) => {
    const currentColor = slots[index].color;
    const currentIdx = COURSE_PALETTE.indexOf(currentColor);
    const nextColor = COURSE_PALETTE[(currentIdx + 1) % COURSE_PALETTE.length];
    handleUpdateSlot(index, 'color', nextColor);
  };

  const handleSave = async () => {
    if (!user) {
      toast.error(t('kpp:login_required_save_timetable', 'Sila log masuk untuk menyimpan jadual kuliah.'));
      return;
    }

    if (!className.trim()) {
      toast.error(t('kpp:class_name_required', 'Sila masukkan nama / kod kelas (cth: DEE1A).'));
      return;
    }

    if (!startDate || !endDate) {
      toast.error(t('kpp:semester_dates_required', 'Sila tetapkan tarikh mula dan tamat semester.'));
      return;
    }

    if (slots.length === 0) {
      toast.error(t('kpp:at_least_one_slot_required', 'Sila tambah sekurang-kurangnya satu slot kelas.'));
      return;
    }

    const invalidSlot = slots.some(s => !s.course_code.trim());
    if (invalidSlot) {
      toast.error(t('kpp:all_slots_need_course_code', 'Sila pastikan semua slot mempunyai kod kursus.'));
      return;
    }

    const hasInvalidTime = slots.some(s => {
      if (!s.start_time?.trim() || !s.end_time?.trim()) return true;
      const startParts = s.start_time.split(':');
      const endParts = s.end_time.split(':');
      const startH = parseInt(startParts[0], 10);
      const startM = parseInt(startParts[1], 10);
      const endH = parseInt(endParts[0], 10);
      const endM = parseInt(endParts[1], 10);
      if (
        isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM) ||
        startH < 0 || startH > 23 || startM < 0 || startM > 59 ||
        endH < 0 || endH > 23 || endM < 0 || endM > 59
      ) {
        return true;
      }
      const startMin = parseTimeToMinutes(s.start_time);
      const endMin = parseTimeToMinutes(s.end_time);
      return startMin >= endMin;
    });
    if (hasInvalidTime) {
      toast.error(t('kpp:valid_start_end_time_required', 'Sila pastikan waktu mula dan waktu tamat adalah sah.'));
      return;
    }

    setIsSaving(true);
    try {
      // 1. Archive existing non-archived timetable records for the student
      const { error: archiveError } = await supabase
        .from('student_timetables')
        .update({ is_archived: true })
        .eq('user_id', user.id)
        .eq('is_archived', false);

      if (archiveError) {
        console.error('Error archiving previous timetable records:', archiveError);
      }

      // 2. Prepare payload and insert verified records into student_timetables
      const entriesToInsert = slots.map(s => {
        const startTime = s.start_time.length === 5 ? `${s.start_time}:00` : s.start_time;
        const endTime = s.end_time.length === 5 ? `${s.end_time}:00` : s.end_time;
        return {
          user_id: user.id,
          academic_session: session.trim() || '2026/2027',
          semester: semester.trim() || '1',
          class_name: className.trim().toUpperCase(),
          day_of_week: s.day_of_week,
          start_time: startTime,
          end_time: endTime,
          course_code: s.course_code.trim().toUpperCase(),
          course_name: (s.course_name.trim() || s.course_code.trim()).toUpperCase(),
          class_type: s.class_type,
          lecturer_code: s.lecturer_code?.trim() || null,
          room_raw: s.room_raw?.trim() || '',
          location_id: s.location_id || null,
          is_online: !!s.is_online,
          color: s.color || '#3b82f6',
          is_archived: false,
        };
      });

      const { error: insertError } = await supabase
        .from('student_timetables')
        .insert(entriesToInsert);

      if (insertError) {
        throw insertError;
      }

      // 3. Mark old metadata as inactive and upsert student_timetable_metadata
      await supabase
        .from('student_timetable_metadata')
        .update({ is_active: false })
        .eq('user_id', user.id);

      const { error: metaError } = await supabase
        .from('student_timetable_metadata')
        .upsert(
          {
            user_id: user.id,
            academic_session: session.trim() || '2026/2027',
            semester: semester.trim() || '1',
            class_name: className.trim().toUpperCase(),
            semester_start_date: startDate,
            semester_end_date: endDate,
            is_active: true,
          },
          { onConflict: t('jpp:onconflict_user_session_sem', 'user_id,academic_session,semester') }
        );

      if (metaError) {
        throw metaError;
      }

      // 4. Auto-report unrecognized physical rooms to JPP (deduplicated via RPC)
      try {
        const unrecognizedRooms = Array.from(
          new Set(
            slots
              .filter(s => !s.is_online && !s.location_id && s.room_raw?.trim())
              .map(s => s.room_raw.trim().toUpperCase())
          )
        );

        if (unrecognizedRooms.length > 0) {
          Promise.all(
            unrecognizedRooms.map(roomCode =>
              supabase.rpc('report_missing_timetable_room', {
                p_room_code: roomCode,
                p_description: t('jpp:timetable_missing_room_desc', 'Dikesan daripada jadual waktu kelas {{class}} ({{session}})', { class: className.trim().toUpperCase(), session: session.trim() || 'Semasa' }),
              })
            )
          ).catch(err => {
            console.warn('Auto-reporting missing rooms failed silently:', err);
          });
        }
      } catch (err) {
        console.warn('Auto-report trigger error:', err);
      }

      toast.success(t('kpp:timetable_saved_success', 'Jadual kuliah berjaya disahkan dan disimpan!'));
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Failed to save timetable:', err);
      toast.error(err.message || t('kpp:failed_to_save_timetable', 'Gagal menyimpan jadual. Sila cuba lagi.'));
    } finally {
      setIsSaving(false);
    }
  };

  const filteredSlotsWithIndex = useMemo(() => {
    return slots
      .map((slot, index) => ({ slot, index }))
      .filter(({ slot }) => (selectedDayFilter === 0 ? true : slot.day_of_week === selectedDayFilter));
  }, [slots, selectedDayFilter]);

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="shrink-0 pb-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <DialogTitle className="text-xl font-bold">
                {t('kpp:verify_edit_timetable', 'Pengesahan & Suntingan Jadual Waktu Kuliah')}
              </DialogTitle>
            </div>
            <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold text-foreground">
              {t('kpp:slots_detected_badge', '{{count}} Slot Dikesan', { count: slots.length })}
            </span>
          </div>
          <DialogDescription className="text-sm text-muted-foreground mt-1">
            {t('kpp:preview_timetable_desc', 'Semak maklumat kelas, tarikh semester, dan slot waktu kuliah anda. Anda boleh menambah atau memadam subjek mengikut keperluan.')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1">
          {/* Mandatory Disclaimer Banner */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3 text-amber-900 dark:text-amber-200 text-sm">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold block">{t('kpp:timetable_reminder', 'Peringatan:')}</span>
              <p className="mt-0.5 leading-relaxed">
                {t('kpp:timetable_reminder_desc', 'Ini adalah jadual kuliah mingguan biasa. Untuk minggu peperiksaan, cuti umum, atau minggu amali khas, sila rujuk Takwim Rasmi atau arahan pensyarah.')}
              </p>
            </div>
          </div>

          {/* Conflict Warnings */}
          {conflicts.length > 0 && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 space-y-2 text-destructive">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{t('kpp:slot_conflict_detected', 'Pertindihan Slot Dikesan ({{count}} konflik)', { count: conflicts.length })}</span>
              </div>
              <ul className="text-xs space-y-1 pl-6 list-disc">
                {conflicts.map((c, i) => (
                  <li key={i}>{c.message}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Metadata Controls */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 p-4 bg-muted/40 rounded-xl border">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                {t('kpp:academic_session', 'Sesi Akademik')}
              </label>
              <Input
                value={session}
                onChange={e => setSession(e.target.value)}
                placeholder="cth: SESI I : 2024/2025"
                className="h-9 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                {t('kpp:class', 'Kelas')}
              </label>
              <Input
                value={className}
                onChange={e => setClassName(e.target.value)}
                placeholder="cth: DEE1A"
                className="h-9 text-sm font-semibold uppercase"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                {t('kpp:semester', 'Semester')}
              </label>
              <Select value={semester} onValueChange={setSemester}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder={t('kpp:semester', 'Semester')} />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                    <SelectItem key={s} value={String(s)}>
                      {t('kpp:semester', 'Semester')} {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                {t('kpp:semester_start', 'Mula Semester')}
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                {t('kpp:semester_end', 'Tamat Semester')}
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* Day Filter & Add Slot Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                variant={selectedDayFilter === 0 ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedDayFilter(0)}
                className="text-xs h-8"
              >
                {t('kpp:all', 'Semua')} ({slots.length})
              </Button>
              {DAY_NAMES.map(d => {
                const count = slots.filter(s => s.day_of_week === d.value).length;
                return (
                  <Button
                    key={d.value}
                    variant={selectedDayFilter === d.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedDayFilter(d.value)}
                    className="text-xs h-8"
                  >
                    {d.label} ({count})
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddSlot()}
              className="text-xs h-8 gap-1.5 border-dashed"
            >
              <Plus className="w-3.5 h-3.5" />
              {t('kpp:add_slot_manual', 'Tambah Slot Kelas Manual')}
            </Button>
          </div>

          {/* Slots List */}
          {filteredSlotsWithIndex.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-xl space-y-3">
              <Calendar className="w-10 h-10 mx-auto text-muted-foreground/60" />
              <div className="text-sm font-medium text-muted-foreground">
                {t('kpp:no_slots_for_view', 'Tiada slot kelas untuk paparan ini.')}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddSlot()}
                className="gap-1.5"
              >
                <Plus className="w-4 h-4" />
                {t('kpp:add_slot_manual', 'Tambah Slot Manual')}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSlotsWithIndex.map(({ slot, index }) => {
                const hasConflict = conflictingIndices.has(index);
                return (
                  <div
                    key={index}
                    className={`rounded-xl border p-3 transition-colors ${
                      hasConflict
                        ? 'border-destructive/60 bg-destructive/5'
                        : 'border-border bg-card'
                    }`}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
                      {/* Color bar + Day Selector */}
                      <div className="md:col-span-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCycleColor(index)}
                          title={t('kpp:click_to_change_color', 'Klik untuk tukar warna')}
                          className="w-4 h-8 rounded-md shrink-0 transition-transform active:scale-95 shadow-sm"
                          style={{ backgroundColor: slot.color }}
                        />
                        <Select
                          value={String(slot.day_of_week)}
                          onValueChange={v => handleUpdateSlot(index, 'day_of_week', parseInt(v, 10))}
                        >
                          <SelectTrigger className="h-8 text-xs font-semibold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DAY_NAMES.map(d => (
                              <SelectItem key={d.value} value={String(d.value)} className="text-xs">
                                {d.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Time Range */}
                      <div className="md:col-span-2 flex items-center gap-1">
                        <Input
                          type="time"
                          value={slot.start_time.slice(0, 5)}
                          onChange={e => handleUpdateSlot(index, 'start_time', `${e.target.value}:00`)}
                          className="h-8 text-xs px-2"
                        />
                        <span className="text-muted-foreground text-xs">-</span>
                        <Input
                          type="time"
                          value={slot.end_time.slice(0, 5)}
                          onChange={e => handleUpdateSlot(index, 'end_time', `${e.target.value}:00`)}
                          className="h-8 text-xs px-2"
                        />
                      </div>

                      {/* Course Code & Name */}
                      <div className="md:col-span-3 grid grid-cols-2 gap-1.5">
                        <Input
                          value={slot.course_code}
                          onChange={e => handleUpdateSlot(index, 'course_code', e.target.value)}
                          placeholder={t('kpp:course_code_placeholder', 'Kod (cth: DEC1013)')}
                          className="h-8 text-xs font-semibold uppercase"
                        />
                        <Input
                          value={slot.course_name}
                          onChange={e => handleUpdateSlot(index, 'course_name', e.target.value)}
                          placeholder={t('kpp:course_name_placeholder', 'Nama Kursus')}
                          className="h-8 text-xs"
                        />
                      </div>

                      {/* Class Type & Lecturer */}
                      <div className="md:col-span-2 grid grid-cols-2 gap-1.5">
                        <Select
                          value={slot.class_type}
                          onValueChange={v => handleUpdateSlot(index, 'class_type', v as ClassType)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CLASS_TYPE_OPTIONS.map(tOption => (
                              <SelectItem key={tOption.value} value={tOption.value} className="text-xs">
                                {tOption.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Input
                          value={slot.lecturer_code || ''}
                          onChange={e => handleUpdateSlot(index, 'lecturer_code', e.target.value)}
                          placeholder={t('kpp:lecturer_placeholder', 'Pensyarah')}
                          className="h-8 text-xs uppercase"
                        />
                      </div>

                      {/* Room & Actions */}
                      <div className="md:col-span-3 flex items-center justify-between gap-2">
                        <div className="flex-1 relative">
                          <Input
                            value={slot.room_raw}
                            onChange={e => handleUpdateSlot(index, 'room_raw', e.target.value)}
                            placeholder={t('kpp:room_placeholder', 'Bilik / Kod Ruang')}
                            className="h-8 text-xs"
                          />
                        </div>

                        {/* Badges for online / location mapping */}
                        {slot.is_online ? (
                          <span className="inline-flex items-center rounded-md border text-[10px] font-semibold h-6 px-1.5 gap-1 shrink-0 bg-blue-500/10 text-blue-600 border-blue-500/20">
                            <Wifi className="w-3 h-3" />
                            {t('kpp:online', 'Online')}
                          </span>
                        ) : slot.location_id ? (
                          <span className="inline-flex items-center rounded-md border text-[10px] font-semibold h-6 px-1.5 gap-1 shrink-0 text-emerald-600 border-emerald-500/30 bg-emerald-500/5">
                            <MapPin className="w-3 h-3" />
                            {t('kpp:map', 'Peta')}
                          </span>
                        ) : null}

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteSlot(index)}
                          title={t('kpp:delete_slot', 'Padam Slot')}
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 pt-3 border-t flex sm:justify-between items-center gap-3">
          <div className="text-xs text-muted-foreground">
            {t('kpp:total_slots_label', 'Jumlah: {{count}} slot jadual', { count: slots.length })}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              {t('common:cancel', 'Batal')}
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {isSaving ? t('kpp:saving', 'Menyimpan...') : t('kpp:confirm_save_timetable', 'Sahkan & Simpan Jadual')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default TimetablePreviewModal;
