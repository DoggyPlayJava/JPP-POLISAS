import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  Bell,
  BellOff,
  Upload,
  Plus,
  Edit2,
  Trash2,
  MapPin,
  Globe,
  Sparkles,
  BookOpen,
  Layers,
  User,
  LayoutGrid,
  List,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Building,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { cn, hexToRgba } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type {
  StudentTimetableEntry,
  StudentTimetableSettings,
  StudentTimetableMetadata,
  ClassType,
} from '@/types';
import { TimetableUploadModal } from './TimetableUploadModal';
import { TimetablePreviewModal } from './TimetablePreviewModal';
import { EditClassSlotModal } from './EditClassSlotModal';
import { TimetableMatrixGrid } from './TimetableMatrixGrid';

const DAYS = [
  { value: 1, label: 'Isnin', shortLabel: 'Isn' },
  { value: 2, label: 'Selasa', shortLabel: 'Sel' },
  { value: 3, label: 'Rabu', shortLabel: 'Rab' },
  { value: 4, label: 'Khamis', shortLabel: 'Kha' },
  { value: 5, label: 'Jumaat', shortLabel: 'Jum' },
];

const CLASS_TYPE_BADGES: Record<ClassType, { label: string; color: string; bg: string }> = {
  KULIAH: {
    label: 'Kuliah',
    color: '#3b82f6',
    bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  },
  AMALI: {
    label: 'Amali',
    color: '#10b981',
    bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  TUTORIAL: {
    label: 'Tutorial',
    color: '#8b5cf6',
    bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  },
  LAIN_LAIN: {
    label: 'Lain-lain',
    color: '#64748b',
    bg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
  },
};

function formatDisplayTime(timeStr: string): string {
  if (!timeStr) return '';
  return timeStr.slice(0, 5);
}

export function MyTimetableView() {
  const { profile, user } = useAuth();
  const userId = profile?.id || user?.id;

  const [entries, setEntries] = useState<StudentTimetableEntry[]>([]);
  const [settings, setSettings] = useState<StudentTimetableSettings | null>(null);
  const [metadata, setMetadata] = useState<StudentTimetableMetadata | null>(null);
  const [viewMode, setViewModeState] = useState<'grid' | 'agenda'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('jpp_student_timetable_view');
        if (saved === 'grid' || saved === 'agenda') return saved;
      } catch {
        // Ignore localStorage error in restricted environments
      }
    }
    return 'grid'; // Default to grid matrix view
  });

  const setViewMode = (mode: 'grid' | 'agenda') => {
    setViewModeState(mode);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('jpp_student_timetable_view', mode);
      } catch {
        // Ignore localStorage error
      }
    }
  };

  // Default to 0 ("Semua" / All days) for continuous week scroll, or specific day when selected
  const [selectedDay, setSelectedDay] = useState<number>(0);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<StudentTimetableEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch timetable entries, settings, and metadata using Promise.all
  const fetchTimetableData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [entriesRes, settingsRes, metaRes] = await Promise.all([
        supabase
          .from('student_timetables')
          .select('*')
          .eq('user_id', userId)
          .eq('is_archived', false)
          .order('day_of_week', { ascending: true })
          .order('start_time', { ascending: true }),
        supabase
          .from('student_timetable_settings')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('student_timetable_metadata')
          .select('*')
          .eq('user_id', userId)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (entriesRes.error) throw entriesRes.error;

      setEntries((entriesRes.data as StudentTimetableEntry[]) || []);
      setSettings(
        (settingsRes.data as StudentTimetableSettings) || {
          user_id: userId,
          notifications_enabled: true,
          reminder_minutes: 30,
        }
      );
      setMetadata((metaRes.data as StudentTimetableMetadata) || null);
    } catch (err: any) {
      console.error('Error fetching student timetable:', err);
      toast.error('Ralat memuatkan jadual waktu kuliah.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchTimetableData();
  }, [fetchTimetableData]);

  // Toggle notification reminder
  const handleToggleNotifications = async () => {
    if (!userId) return;

    const currentEnabled = settings ? settings.notifications_enabled : true;
    const newEnabled = !currentEnabled;

    setSettings(prev =>
      prev
        ? { ...prev, notifications_enabled: newEnabled }
        : {
            user_id: userId,
            notifications_enabled: newEnabled,
            reminder_minutes: 30,
          }
    );

    try {
      const { error } = await supabase.from('student_timetable_settings').upsert({
        user_id: userId,
        notifications_enabled: newEnabled,
        reminder_minutes: settings?.reminder_minutes ?? 30,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;
      toast.success(
        newEnabled
          ? 'Peringatan kelas diaktifkan (30 minit sebelum kelas).'
          : 'Peringatan kelas dinyahaktifkan.'
      );
    } catch (err) {
      console.error('Error updating notification settings:', err);
      setSettings(prev => (prev ? { ...prev, notifications_enabled: currentEnabled } : null));
      toast.error('Gagal mengemas kini tetapan pemberitahuan.');
    }
  };

  // Delete single slot
  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm('Adakah anda pasti ingin memadam slot kelas ini?')) return;
    try {
      const { error } = await supabase
        .from('student_timetables')
        .update({ is_archived: true })
        .eq('id', slotId);

      if (error) throw error;
      setEntries(prev => prev.filter(e => e.id !== slotId));
      toast.success('Slot kelas berjaya dipadam.');
    } catch (err) {
      console.error('Error deleting slot:', err);
      toast.error('Gagal memadam slot.');
    }
  };

  // Archive entire timetable
  const handleClearAllTimetable = async () => {
    if (!userId) return;
    if (
      !confirm('Adakah anda pasti ingin memadam dan mengosongkan keseluruhan jadual kuliah ini?')
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('student_timetables')
        .update({ is_archived: true })
        .eq('user_id', userId)
        .eq('is_archived', false);

      if (error) throw error;
      setEntries([]);
      toast.success('Jadual kuliah berjaya dikosongkan.');
    } catch (err) {
      console.error('Error clearing timetable:', err);
      toast.error('Gagal mengosongkan jadual.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Group entries by day_of_week (1..5)
  const entriesByDay = useMemo(() => {
    const map: Record<number, StudentTimetableEntry[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    entries.forEach(e => {
      if (map[e.day_of_week]) {
        map[e.day_of_week].push(e);
      }
    });
    return map;
  }, [entries]);

  // Derived stats
  const totalSlots = entries.length;
  const uniqueCourses = useMemo(() => {
    return new Set(entries.map(e => e.course_code.trim().toUpperCase())).size;
  }, [entries]);
  const activeClassDays = useMemo(() => {
    return new Set(entries.map(e => e.day_of_week)).size;
  }, [entries]);

  const activeClassName = metadata?.class_name || (entries[0]?.class_name ?? '');
  const activeSession = metadata?.academic_session || (entries[0]?.academic_session ?? '');

  return (
    <div className="space-y-6">
      {/* ── Action Bar & Sub-Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-xs">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
              Jadual Kuliah Saya
            </h2>
            {activeClassName && (
              <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-[10px] font-black uppercase tracking-wider px-2 py-0.5">
                {activeClassName}
              </Badge>
            )}
            {activeSession && (
              <Badge className="bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white/70 border border-slate-200 dark:border-white/10 text-[10px] font-bold px-2 py-0.5">
                {activeSession}
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-white/40">
            {totalSlots > 0
              ? `${totalSlots} slot kelas · ${uniqueCourses} kursus berdaftar · ${activeClassDays} hari berjadual`
              : 'Susun jadual kelas mengikut PDF rasmi SPMP POLISAS.'}
          </p>
        </div>

        {/* 2-Tier Mobile / Unified Desktop Action Bar */}
        <div className="flex flex-col md:flex-row md:items-center gap-2.5 w-full md:w-auto">
          {/* Tier 1 on Mobile: Prominent Hero CTA */}
          <Button
            type="button"
            size="sm"
            onClick={() => setIsUploadModalOpen(true)}
            className="w-full md:w-auto h-10 px-4 rounded-xl text-xs font-black uppercase tracking-wider gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs order-1 md:order-2 shrink-0"
          >
            <Upload className="w-4 h-4" />
            <span>MUAT NAIK JADUAL</span>
          </Button>

          {/* Tier 2 on Mobile: Balanced Utility Bar */}
          <div className="flex items-center justify-between md:justify-end gap-2 w-full md:w-auto order-2 md:order-1">
            {/* View Mode Toggle: [Grid | Agenda] */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 rounded-xl p-1 border border-slate-200 dark:border-white/10 shadow-xs shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-1.5 rounded-lg transition-all',
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white/70'
                )}
                title="Paparan Grid Mingguan"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('agenda')}
                className={cn(
                  'p-1.5 rounded-lg transition-all',
                  viewMode === 'agenda'
                    ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white/70'
                )}
                title="Paparan Agenda Harian"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Tools Cluster */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Tambah Slot (+) button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsPreviewModalOpen(true)}
                className="h-9 px-2.5 sm:px-3 rounded-xl text-xs font-bold gap-1.5 bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-800 dark:text-white hover:bg-slate-50 dark:hover:bg-white/10 shadow-xs"
                title="Tambah Slot Manual"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tambah Slot</span>
              </Button>

              {/* Notification bell toggle */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleToggleNotifications}
                className={cn(
                  'h-9 px-2.5 sm:px-3 rounded-xl text-xs font-bold gap-1.5 transition-all shadow-xs',
                  settings?.notifications_enabled
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
                    : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/40'
                )}
                title={
                  settings?.notifications_enabled
                    ? 'Peringatan kelas aktif (30 minit sebelum)'
                    : 'Peringatan kelas dinyahaktifkan'
                }
              >
                {settings?.notifications_enabled ? (
                  <>
                    <Bell className="w-3.5 h-3.5 fill-current text-amber-500" />
                    <span className="hidden sm:inline">Peringatan</span>
                  </>
                ) : (
                  <>
                    <BellOff className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Peringatan</span>
                  </>
                )}
              </Button>

              {/* Padam Semua (Trash) button */}
              {entries.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClearAllTimetable}
                  disabled={isDeleting}
                  className="h-9 px-2.5 rounded-xl text-xs font-bold gap-1 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/20 hover:bg-rose-50 dark:hover:bg-rose-500/10 shadow-xs"
                  title="Padam Semua Jadual"
                >
                  {isDeleting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Timetable Content ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
          <p className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-white/30">
            Memuatkan jadual kuliah...
          </p>
        </div>
      ) : entries.length === 0 ? (
        /* Empty State */
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center p-8 md:p-14 text-center rounded-2xl border border-dashed border-slate-300 dark:border-white/10 bg-white/50 dark:bg-white/[0.01]"
        >
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4 text-indigo-600 dark:text-indigo-400">
            <Calendar className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight mb-2">
            Belum Ada Jadual Kuliah
          </h3>
          <p className="text-xs text-slate-500 dark:text-white/50 max-w-md leading-relaxed mb-6">
            Muat naik fail PDF jadual waktu kelas dari portal SPMP POLISAS untuk penjanaan automatik,
            atau masukkan slot kelas anda secara manual.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              type="button"
              onClick={() => setIsUploadModalOpen(true)}
              className="rounded-xl text-xs font-black uppercase tracking-wider gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
            >
              <Upload className="w-4 h-4" />
              MUAT NAIK JADUAL
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPreviewModalOpen(true)}
              className="rounded-xl text-xs font-bold gap-2 bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-800 dark:text-white shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Isi Jadual Manual
            </Button>
          </div>
        </motion.div>
      ) : viewMode === 'grid' ? (
        /* ── Weekly 5-Day PDF Matrix Grid ── */
        <TimetableMatrixGrid
          entries={entries}
          onSlotClick={slot => setEditingSlot(slot)}
          onSlotDelete={handleDeleteSlot}
        />
      ) : (
        /* ── Daily Agenda List (Mobile Segmented) ── */
        <div className="space-y-4">
          {/* Day Segmented Tabs (Semua + Isnin..Jumaat) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {/* Tab: Semua */}
            <button
              type="button"
              onClick={() => setSelectedDay(0)}
              className={cn(
                'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border',
                selectedDay === 0
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white dark:bg-white/5 border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-white/70 hover:bg-slate-50 dark:hover:bg-white/10'
              )}
            >
              <span>Semua</span>
              <span
                className={cn(
                  'text-[10px] font-black px-1.5 py-0.2 rounded-md',
                  selectedDay === 0 ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-white/10'
                )}
              >
                {entries.length}
              </span>
            </button>

            {DAYS.map(day => {
              const count = entriesByDay[day.value]?.length || 0;
              const isSelected = selectedDay === day.value;
              const isToday = new Date().getDay() === day.value;

              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => setSelectedDay(day.value)}
                  className={cn(
                    'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border',
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white dark:bg-white/5 border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-white/70 hover:bg-slate-50 dark:hover:bg-white/10'
                  )}
                >
                  <span>{day.label}</span>
                  {isToday && (
                    <span
                      className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        isSelected ? 'bg-white' : 'bg-indigo-500'
                      )}
                    />
                  )}
                  <span
                    className={cn(
                      'text-[10px] font-black px-1.5 py-0.2 rounded-md',
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-white/10'
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Agenda items */}
          <div className="space-y-4 max-w-3xl">
            {selectedDay === 0 ? (
              /* All Days Listing grouped by day */
              entries.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-white/[0.02]">
                  <Clock className="w-8 h-8 text-slate-300 dark:text-white/10 mb-2" />
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-white/30">
                    Tiada kelas berjadual
                  </p>
                </div>
              ) : (
                DAYS.map(day => {
                  const daySlots = entriesByDay[day.value] || [];
                  if (daySlots.length === 0) return null;
                  const isToday = new Date().getDay() === day.value;

                  return (
                    <div key={day.value} className="space-y-2">
                      <div className="flex items-center gap-2 px-1 pt-2">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                          {day.label}
                        </span>
                        {isToday && (
                          <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 text-[9px] font-black px-1.5 py-0.2">
                            Hari Ini
                          </Badge>
                        )}
                        <span className="text-[10px] text-slate-400 dark:text-white/30">
                          ({daySlots.length} slot)
                        </span>
                      </div>
                      <div className="space-y-2.5">
                        {daySlots.map(slot => (
                          <ClassCard
                            key={slot.id}
                            entry={slot}
                            onEdit={() => setEditingSlot(slot)}
                            onDelete={() => handleDeleteSlot(slot.id)}
                            extended
                          />
                        ))}
                      </div>
                    </div>
                  );
                })
              )
            ) : (
              /* Single Day Listing */
              (entriesByDay[selectedDay] || []).length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-white/[0.02]">
                  <Clock className="w-8 h-8 text-slate-300 dark:text-white/10 mb-2" />
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-white/30">
                    Tiada kelas dijadualkan pada hari ini
                  </p>
                </div>
              ) : (
                (entriesByDay[selectedDay] || []).map(slot => (
                  <ClassCard
                    key={slot.id}
                    entry={slot}
                    onEdit={() => setEditingSlot(slot)}
                    onDelete={() => handleDeleteSlot(slot.id)}
                    extended
                  />
                ))
              )
            )}
          </div>
        </div>
      )}

      {/* ── Timetable Upload Modal ── */}
      <TimetableUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => {
          fetchTimetableData();
          setIsUploadModalOpen(false);
        }}
      />

      {/* ── Timetable Preview / Manual Entry Modal ── */}
      {isPreviewModalOpen && (
        <TimetablePreviewModal
          isOpen={isPreviewModalOpen}
          onClose={() => setIsPreviewModalOpen(false)}
          initialMetadata={{
            session: metadata?.academic_session || '2026/2027',
            className: metadata?.class_name || '',
            semester: metadata?.semester || '1',
            semesterStartDate: metadata?.semester_start_date,
            semesterEndDate: metadata?.semester_end_date,
          }}
          initialEntries={
            entries.length > 0
              ? entries.map(e => ({
                  academic_session: e.academic_session,
                  semester: e.semester,
                  class_name: e.class_name,
                  day_of_week: e.day_of_week,
                  start_time: e.start_time,
                  end_time: e.end_time,
                  course_code: e.course_code,
                  course_name: e.course_name,
                  class_type: e.class_type,
                  lecturer_code: e.lecturer_code,
                  room_raw: e.room_raw,
                  location_id: e.location_id,
                  is_online: e.is_online,
                  color: e.color,
                  is_archived: false,
                }))
              : []
          }
          onSuccess={() => {
            fetchTimetableData();
            setIsPreviewModalOpen(false);
          }}
        />
      )}
      {/* ── Edit Single Class Slot Modal ── */}
      <EditClassSlotModal
        isOpen={Boolean(editingSlot)}
        onClose={() => setEditingSlot(null)}
        slot={editingSlot}
        allSlots={entries}
        onSaveSuccess={() => {
          fetchTimetableData();
          setEditingSlot(null);
        }}
        onDeleteSuccess={() => {
          fetchTimetableData();
          setEditingSlot(null);
        }}
      />
    </div>
  );
}

// ── Class Slot Card Component ──
function ClassCard({
  entry,
  onDelete,
  onEdit,
  extended = false,
}: {
  key?: React.Key;
  entry: StudentTimetableEntry;
  onDelete: () => void;
  onEdit?: () => void;
  extended?: boolean;
}) {
  const badgeCfg = CLASS_TYPE_BADGES[entry.class_type] || CLASS_TYPE_BADGES.KULIAH;
  const timeFormatted = `${formatDisplayTime(entry.start_time)} - ${formatDisplayTime(entry.end_time)}`;

  return (
    <div
      onClick={onEdit}
      className={cn(
        'group relative p-3 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-white/[0.03] cursor-pointer hover:border-indigo-500/40 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] transition-all shadow-xs overflow-hidden'
      )}
      style={{ borderLeftWidth: '4px', borderLeftColor: entry.color || '#3b82f6' }}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge
            variant="outline"
            className={cn('text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2', badgeCfg.bg)}
          >
            {badgeCfg.label}
          </Badge>
          {entry.is_online && (
            <Badge
              variant="outline"
              className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 text-[9px] font-bold px-1.5 py-0.2 gap-1"
            >
              <Globe className="w-2.5 h-2.5" />
              Atas Talian
            </Badge>
          )}
        </div>

        {/* Action buttons (Edit & Delete) in top right */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.();
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all"
            title="Kemaskini Slot"
            aria-label="Kemaskini Slot"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all"
            title="Padam Slot"
            aria-label="Padam Slot"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Course Code & Name */}
      <div className="mb-2">
        <h5 className="text-xs font-black text-slate-900 dark:text-white tracking-tight leading-tight">
          {entry.course_code}
        </h5>
        <p className="text-[11px] font-medium text-slate-600 dark:text-white/70 line-clamp-2 leading-snug">
          {entry.course_name}
        </p>
      </div>

      {/* Time & Room Details */}
      <div className="space-y-1 pt-1.5 border-t border-slate-100 dark:border-white/5 text-[10px] text-slate-500 dark:text-white/50">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-slate-400 dark:text-white/30 shrink-0" />
          <span className="font-bold text-slate-700 dark:text-white/80">{timeFormatted}</span>
        </div>

        <div className="flex items-center justify-between gap-2">
          {entry.room_raw ? (
            <div className="flex items-center gap-1.5 truncate">
              <MapPin className="w-3 h-3 text-indigo-500 dark:text-indigo-400 shrink-0" />
              <span className="truncate font-medium">{entry.room_raw}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-slate-400">
              <Building className="w-3 h-3 shrink-0" />
              <span>Bilik TBA</span>
            </div>
          )}

          {entry.lecturer_code && (
            <div className="flex items-center gap-1 text-[9px] font-bold text-slate-600 dark:text-white/60 bg-slate-100 dark:bg-white/10 px-1.5 py-0.2 rounded shrink-0">
              <User className="w-2.5 h-2.5" />
              <span>{entry.lecturer_code}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MyTimetableView;
