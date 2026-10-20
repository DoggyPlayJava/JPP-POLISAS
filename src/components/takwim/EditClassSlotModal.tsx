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
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Save,
  Trash2,
  AlertTriangle,
  BookOpen,
  Clock,
  Calendar,
  MapPin,
  User,
  Palette,
  Wifi,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import type { StudentTimetableEntry, ClassType, ImapsRoomMapping } from '@/types';
import { COURSE_PALETTE, matchRoomToLocation, type RoomLocationLookup } from '@/lib/timetableParser';

export const DAY_OPTIONS: { value: number; label: string }[] = [
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

export function parseTimeToMinutes(t: string): number {
  if (!t) return 0;
  const parts = t.split(':');
  const hours = parseInt(parts[0], 10) || 0;
  const mins = parseInt(parts[1], 10) || 0;
  return hours * 60 + mins;
}

export function formatTimeToSeconds(timeStr: string): string {
  if (!timeStr) return '00:00:00';
  const trimmed = timeStr.trim();
  const parts = trimmed.split(':');
  if (parts.length === 2) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`;
  }
  if (parts.length >= 3) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${parts[2].padStart(2, '0')}`;
  }
  return `${trimmed}:00`;
}

export function detectSlotConflict(
  currentSlotId: string | undefined,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  allSlots: StudentTimetableEntry[] = []
): StudentTimetableEntry | null {
  const startMins = parseTimeToMinutes(startTime);
  const endMins = parseTimeToMinutes(endTime);
  if (startMins >= endMins) return null;

  for (const other of allSlots) {
    if (other.id === currentSlotId) continue;
    if (other.is_archived) continue;
    if (Number(other.day_of_week) !== Number(dayOfWeek)) continue;

    const oStart = parseTimeToMinutes(other.start_time);
    const oEnd = parseTimeToMinutes(other.end_time);

    // Overlap: start < oEnd && end > oStart
    if (startMins < oEnd && endMins > oStart) {
      return other;
    }
  }
  return null;
}

export interface EditClassSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  slot: StudentTimetableEntry | null;
  allSlots?: StudentTimetableEntry[];
  onSaveSuccess: () => void;
  onDeleteSuccess: () => void;
}

function useSafeAuth() {
  try {
    return useAuth();
  } catch {
    return { profile: null, user: null };
  }
}

export function EditClassSlotModal({
  isOpen,
  onClose,
  slot,
  allSlots = [],
  onSaveSuccess,
  onDeleteSuccess,
}: EditClassSlotModalProps) {
  const { t } = useTranslation(['jpp', 'common']);
  const auth = useSafeAuth();
  const userId = auth.profile?.id || auth.user?.id || slot?.user_id;

  // Form State initialized directly from slot
  const [courseCode, setCourseCode] = useState(slot?.course_code || '');
  const [courseName, setCourseName] = useState(slot?.course_name || '');
  const [dayOfWeek, setDayOfWeek] = useState<number>(Number(slot?.day_of_week) || 1);
  const [startTime, setStartTime] = useState(slot?.start_time ? slot.start_time.slice(0, 5) : '08:00');
  const [endTime, setEndTime] = useState(slot?.end_time ? slot.end_time.slice(0, 5) : '10:00');
  const [classType, setClassType] = useState<ClassType>(slot?.class_type || 'KULIAH');
  const [roomRaw, setRoomRaw] = useState(slot?.room_raw || '');
  const [locationId, setLocationId] = useState<string | null>(slot?.location_id || null);
  const [lecturerCode, setLecturerCode] = useState(slot?.lecturer_code || '');
  const [isOnline, setIsOnline] = useState(!!slot?.is_online);
  const [color, setColor] = useState(slot?.color || COURSE_PALETTE[0]);

  // Loading States
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Room Lookup Data
  const [locations, setLocations] = useState<RoomLocationLookup[]>([]);
  const [roomMappings, setRoomMappings] = useState<ImapsRoomMapping[]>([]);

  // Fetch lookup data when modal opens
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

          // If current room has no locationId resolved yet, attempt matching
          if (slot?.room_raw && !slot?.location_id && !slot?.is_online) {
            const matched = matchRoomToLocation(slot.room_raw, locs, maps);
            if (matched.location_id) {
              setLocationId(matched.location_id);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load room lookup data:', err);
      }
    }
    loadLookupData();
    return () => {
      isMounted = false;
    };
  }, [isOpen, slot]);

  // Prefill form values from slot
  useEffect(() => {
    if (slot) {
      setCourseCode(slot.course_code || '');
      setCourseName(slot.course_name || '');
      setDayOfWeek(Number(slot.day_of_week) || 1);
      setStartTime(slot.start_time ? slot.start_time.slice(0, 5) : '08:00');
      setEndTime(slot.end_time ? slot.end_time.slice(0, 5) : '10:00');
      setClassType(slot.class_type || 'KULIAH');
      setRoomRaw(slot.room_raw || '');
      setLocationId(slot.location_id || null);
      setLecturerCode(slot.lecturer_code || '');
      setIsOnline(!!slot.is_online);
      setColor(slot.color || COURSE_PALETTE[0]);
    }
  }, [slot, isOpen]);

  // Handle room changes with automated room lookup
  const handleRoomChange = (value: string) => {
    setRoomRaw(value);
    const matched = matchRoomToLocation(value, locations, roomMappings);
    setLocationId(matched.location_id);
    if (matched.is_online) {
      setIsOnline(true);
    }
  };

  // Conflict Detection
  const conflict = useMemo(() => {
    if (!slot) return null;
    return detectSlotConflict(slot.id, dayOfWeek, startTime, endTime, allSlots);
  }, [slot, dayOfWeek, startTime, endTime, allSlots]);

  // Time validity check
  const isTimeOrderValid = useMemo(() => {
    const s = parseTimeToMinutes(startTime);
    const e = parseTimeToMinutes(endTime);
    return s < e;
  }, [startTime, endTime]);

  // Save handler
  const handleSave = async () => {
    if (!slot || !userId) return;

    if (!courseCode.trim()) {
      toast.error(t('jpp:timetable_enter_course_code', 'Sila masukkan kod kursus.'));
      return;
    }

    if (!isTimeOrderValid) {
      toast.error(t('jpp:timetable_time_order_invalid', 'Masa tamat mestilah selepas masa mula.'));
      return;
    }

    try {
      setSaving(true);
      const formattedStartTime = formatTimeToSeconds(startTime);
      const formattedEndTime = formatTimeToSeconds(endTime);

      const { error } = await supabase
        .from('student_timetables')
        .update({
          course_code: courseCode.trim().toUpperCase(),
          course_name: courseName.trim(),
          day_of_week: Number(dayOfWeek),
          start_time: formattedStartTime,
          end_time: formattedEndTime,
          class_type: classType,
          room_raw: roomRaw.trim(),
          location_id: locationId,
          lecturer_code: lecturerCode.trim() || null,
          is_online: isOnline,
          color: color,
          updated_at: new Date().toISOString(),
        })
        .eq('id', slot.id)
        .eq('user_id', userId);

      if (error) throw error;

      toast.success(t('jpp:timetable_slot_updated_success', 'Slot kelas berjaya dikemaskini.'));
      onSaveSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error updating class slot:', err);
      toast.error(err?.message || t('jpp:timetable_slot_update_fail', 'Gagal mengemaskini slot kelas.'));
    } finally {
      setSaving(false);
    }
  };

  // Delete handler
  const handleDelete = async () => {
    if (!slot || !userId) return;

    const confirmed = window.confirm(t('jpp:timetable_confirm_delete_slot', 'Adakah anda pasti ingin memadam slot kelas ini?'));
    if (!confirmed) return;

    try {
      setDeleting(true);
      const { error } = await supabase
        .from('student_timetables')
        .update({ is_archived: true })
        .eq('id', slot.id)
        .eq('user_id', userId);

      if (error) throw error;

      toast.success(t('jpp:timetable_slot_deleted_success', 'Slot kelas berjaya dipadam.'));
      onDeleteSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error deleting class slot:', err);
      toast.error(err?.message || t('jpp:timetable_delete_slot_fail', 'Gagal memadam slot.'));
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen || !slot) {
    return null;
  }

  const selectedDayOpt = DAY_OPTIONS.find(d => d.value === dayOfWeek);
  const selectedDayLabel = selectedDayOpt ? t('jpp:day_' + selectedDayOpt.label.toLowerCase(), selectedDayOpt.label) : t('jpp:day_isnin', 'Isnin');

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto sm:rounded-2xl p-5 sm:p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-2xl">
        <DialogHeader className="pb-3 border-b border-slate-100 dark:border-white/10 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <DialogTitle className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>{t('jpp:timetable_edit_slot_modal_title', 'Kemaskini Slot Kelas')}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-white/60">
                {t('jpp:timetable_edit_slot_modal_desc', 'Ubah maklumat dan masa untuk slot subjek ini secara individu.')}
              </DialogDescription>
            </div>

            {/* Course & Day Badge */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span
                className="px-2.5 py-1 rounded-lg text-xs font-black uppercase text-white shadow-xs"
                style={{ backgroundColor: color }}
              >
                {courseCode || 'KOD'}
              </span>
              <span className="px-2 py-1 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white/80">
                {selectedDayLabel}
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Inline Conflict Warning Banner */}
        {conflict && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold">{t('jpp:timetable_conflict_warning_title', 'Amaran Pertindihan Jadual')}</p>
              <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
                {t(
                  'jpp:timetable_conflict_warning_body',
                  'Waktu slot ini bertindih dengan {{course}} ({{startTime}} - {{endTime}}) pada hari {{day}}.',
                  {
                    course: conflict.course_code || t('jpp:timetable_another_class', 'kelas lain'),
                    startTime: conflict.start_time.slice(0, 5),
                    endTime: conflict.end_time.slice(0, 5),
                    day: DAY_OPTIONS.find(d => d.value === conflict.day_of_week)
                      ? t('jpp:day_' + DAY_OPTIONS.find(d => d.value === conflict.day_of_week).label.toLowerCase(), DAY_OPTIONS.find(d => d.value === conflict.day_of_week).label)
                      : t('jpp:timetable_day_prefix', 'Hari {{day}}', { day: conflict.day_of_week }),
                  }
                )}
              </p>
            </div>
          </div>
        )}

        {/* Form Body */}
        <div className="space-y-4 py-2">
          {/* Row 1: Course Code & Course Name */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5 sm:col-span-1">
              <Label htmlFor="course_code" className="text-xs font-bold text-slate-700 dark:text-white/80 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                {t('jpp:timetable_course_code_label', 'Kod Kursus')}
              </Label>
              <Input
                id="course_code"
                value={courseCode}
                onChange={e => setCourseCode(e.target.value.toUpperCase())}
                placeholder="Cth: DFC10042"
                className="h-9 text-xs sm:text-sm font-bold uppercase border-slate-200 dark:border-white/10 focus-visible:ring-indigo-500"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="course_name" className="text-xs font-bold text-slate-700 dark:text-white/80">
                {t('jpp:timetable_course_name_label', 'Nama Kursus')}
              </Label>
              <Input
                id="course_name"
                value={courseName}
                onChange={e => setCourseName(e.target.value)}
                placeholder="Cth: Problem Solving and Algorithms"
                className="h-9 text-xs sm:text-sm border-slate-200 dark:border-white/10 focus-visible:ring-indigo-500"
              />
            </div>
          </div>

          {/* Row 2: Day of Week, Start Time, End Time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-white/80 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                {t('jpp:timetable_day_label', 'Hari')}
              </Label>
              <Select value={String(dayOfWeek)} onValueChange={v => setDayOfWeek(Number(v))}>
                <SelectTrigger className="h-9 text-xs sm:text-sm border-slate-200 dark:border-white/10">
                  <SelectValue placeholder={t('jpp:timetable_select_day_ph', 'Pilih Hari')} />
                </SelectTrigger>
                <SelectContent>
                  {DAY_OPTIONS.map(d => (
                    <SelectItem key={d.value} value={String(d.value)} className="text-xs sm:text-sm">
                      {t('jpp:day_' + d.label.toLowerCase(), d.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="start_time" className="text-xs font-bold text-slate-700 dark:text-white/80 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                {t('jpp:timetable_start_time_label', 'Masa Mula')}
              </Label>
              <Input
                id="start_time"
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="h-9 text-xs sm:text-sm font-semibold border-slate-200 dark:border-white/10 focus-visible:ring-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="end_time" className="text-xs font-bold text-slate-700 dark:text-white/80 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                {t('jpp:timetable_end_time_label', 'Masa Tamat')}
              </Label>
              <Input
                id="end_time"
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="h-9 text-xs sm:text-sm font-semibold border-slate-200 dark:border-white/10 focus-visible:ring-indigo-500"
              />
            </div>
          </div>

          {!isTimeOrderValid && (
            <p className="text-xs font-semibold text-rose-500">
              {t('jpp:timetable_time_order_note', '* Masa tamat mestilah lebih lewat daripada masa mula.')}
            </p>
          )}

          {/* Row 3: Class Type & Online Toggle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-white/80">
                {t('jpp:timetable_class_type_label', 'Jenis Kelas')}
              </Label>
              <Select value={classType} onValueChange={v => setClassType(v as ClassType)}>
                <SelectTrigger className="h-9 text-xs sm:text-sm border-slate-200 dark:border-white/10">
                  <SelectValue placeholder={t('jpp:timetable_select_type_ph', 'Pilih Jenis')} />
                </SelectTrigger>
                <SelectContent>
                  {CLASS_TYPE_OPTIONS.map(typeOpt => (
                    <SelectItem key={typeOpt.value} value={typeOpt.value} className="text-xs sm:text-sm">
                      {t('jpp:class_type_' + typeOpt.value.toLowerCase(), typeOpt.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] mt-1 sm:mt-5">
              <div className="space-y-0.5">
                <Label htmlFor="is_online" className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5 cursor-pointer">
                  <Wifi className="w-3.5 h-3.5 text-sky-500" />
                  {t('jpp:timetable_online_class_label', 'Kelas Atas Talian')}
                </Label>
                <span className="text-[10px] text-slate-500 dark:text-white/50 block">
                  {t('jpp:timetable_online_class_hint', 'Tandakan jika kelas berlangsung via Google Meet/Teams')}
                </span>
              </div>
              <Switch
                id="is_online"
                checked={isOnline}
                onCheckedChange={setIsOnline}
              />
            </div>
          </div>

          {/* Row 4: Room & Lecturer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="room_raw" className="text-xs font-bold text-slate-700 dark:text-white/80 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                  {t('jpp:timetable_room_label', 'Bilik / Ruang Kuliah')}
                </span>
                {locationId && (
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded">
                    {t('jpp:timetable_matched_badge', 'Dipadankan')}
                  </span>
                )}
              </Label>
              <Input
                id="room_raw"
                value={roomRaw}
                onChange={e => handleRoomChange(e.target.value)}
                placeholder={t('jpp:timetable_room_placeholder', 'Cth: BK01, MAKMAL 2, KULIAH 3')}
                className="h-9 text-xs sm:text-sm border-slate-200 dark:border-white/10 focus-visible:ring-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lecturer_code" className="text-xs font-bold text-slate-700 dark:text-white/80 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-500" />
                {t('jpp:timetable_lecturer_code_label', 'Kod Pensyarah')}
              </Label>
              <Input
                id="lecturer_code"
                value={lecturerCode}
                onChange={e => setLecturerCode(e.target.value.toUpperCase())}
                placeholder="Cth: MNA, AZR, SITI"
                className="h-9 text-xs sm:text-sm font-semibold uppercase border-slate-200 dark:border-white/10 focus-visible:ring-indigo-500"
              />
            </div>
          </div>

          {/* Row 5: Color Picker */}
          <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-white/5">
            <Label className="text-xs font-bold text-slate-700 dark:text-white/80 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-indigo-500" />
              {t('jpp:timetable_theme_color_label', 'Warna Tema Subjek')}
            </Label>
            <div className="flex items-center gap-2 flex-wrap">
              {COURSE_PALETTE.map(c => {
                const isSelected = color.toLowerCase() === c.toLowerCase();
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      'w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center',
                      isSelected
                        ? 'border-indigo-600 dark:border-white scale-110 shadow-sm'
                        : 'border-transparent hover:scale-105 opacity-80 hover:opacity-100'
                    )}
                    style={{ backgroundColor: c }}
                    aria-label={t('jpp:timetable_select_color_aria', 'Pilih warna {{color}}', { color: c })}
                  >
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-white shadow-xs" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <DialogFooter className="pt-3 border-t border-slate-100 dark:border-white/10 flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5">
          {/* Destructive Delete Button */}
          <Button
            type="button"
            variant="outline"
            onClick={handleDelete}
            disabled={saving || deleting}
            className="w-full sm:w-auto text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:border-rose-400 text-xs sm:text-sm font-bold gap-1.5"
          >
            {deleting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            {t('jpp:timetable_delete_this_slot_btn', 'Padam Slot Ini')}
          </Button>

          {/* Cancel & Save Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving || deleting}
              className="w-full sm:w-auto text-xs sm:text-sm font-bold border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5"
            >
              {t('common:cancel', 'Batal')}
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving || deleting || !isTimeOrderValid}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-xs gap-1.5"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {t('jpp:timetable_save_changes_btn', 'Simpan Perubahan')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default EditClassSlotModal;
