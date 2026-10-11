import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// Pure logic helpers mirroring SQL and Server rules
export function isWithinReminderWindow(
  currentTimeStr: string, // "HH:mm:ss"
  classStartTimeStr: string, // "HH:mm:ss"
  reminderMinutes: number = 30,
  bufferMinutes: number = 3
): boolean {
  const [cHour, cMin, cSec = 0] = currentTimeStr.split(':').map(Number);
  const [sHour, sMin, sSec = 0] = classStartTimeStr.split(':').map(Number);
  const currentTotalSec = cHour * 3600 + cMin * 60 + cSec;
  const startTotalSec = sHour * 3600 + sMin * 60 + sSec;
  const diffSec = startTotalSec - currentTotalSec;
  const diffMin = diffSec / 60;
  return diffMin >= (reminderMinutes - bufferMinutes) && diffMin <= (reminderMinutes + bufferMinutes);
}

export function isWithinSemesterBounds(
  currentDateStr: string, // "YYYY-MM-DD"
  semesterStartStr: string,
  semesterEndStr: string
): boolean {
  return currentDateStr >= semesterStartStr && currentDateStr <= semesterEndStr;
}

export function formatTimetableReminderLink(item: { is_online: boolean; location_id?: string | null; room_raw: string }): string {
  if (item.is_online) {
    return '/akademik/takwim';
  }
  if (item.location_id) {
    return `/polymaps?room=${item.location_id}`;
  }
  return `/polymaps?q=${encodeURIComponent(item.room_raw)}`;
}

export function getMalaysianDayOfWeek(date: Date): number {
  // Convert date to Asia/Kuala_Lumpur representation
  const dStr = date.toLocaleDateString('en-US', { timeZone: 'Asia/Kuala_Lumpur', weekday: 'short' });
  const map: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };
  return map[dStr] || 0;
}

describe('Timetable Notification Engine & Deduplication Logic', () => {
  describe('Timezone & Window Calculations (Asia/Kuala_Lumpur)', () => {
    it('should correctly determine Malaysian day of week (ISO 1=Mon .. 7=Sun)', () => {
      // 2026-10-11 16:30:00 UTC is 2026-10-12 00:30:00 in Asia/Kuala_Lumpur (Monday)
      const dateUtcSundayNight = new Date('2026-10-11T16:30:00Z');
      expect(getMalaysianDayOfWeek(dateUtcSundayNight)).toBe(1); // Monday in MYT

      // 2026-10-11 10:00:00 UTC is 2026-10-11 18:00:00 in Asia/Kuala_Lumpur (Sunday)
      const dateUtcSundayDay = new Date('2026-10-11T10:00:00Z');
      expect(getMalaysianDayOfWeek(dateUtcSundayDay)).toBe(7); // Sunday in MYT
    });

    it('should match ±3 minute buffer for standard 30-minute reminder window', () => {
      const classStart = '08:00:00';
      // Exactly 30 mins before -> 07:30
      expect(isWithinReminderWindow('07:30:00', classStart, 30, 3)).toBe(true);

      // Within ±3 mins buffer -> 27 to 33 mins before (07:27 to 07:33)
      expect(isWithinReminderWindow('07:27:00', classStart, 30, 3)).toBe(true);
      expect(isWithinReminderWindow('07:33:00', classStart, 30, 3)).toBe(true);

      // Outside ±3 mins buffer
      expect(isWithinReminderWindow('07:26:00', classStart, 30, 3)).toBe(false); // 34 mins away
      expect(isWithinReminderWindow('07:34:00', classStart, 30, 3)).toBe(false); // 26 mins away
      expect(isWithinReminderWindow('08:00:00', classStart, 30, 3)).toBe(false);
      expect(isWithinReminderWindow('08:15:00', classStart, 30, 3)).toBe(false);
    });

    it('should respect customized reminder window (e.g. 15 or 45 mins)', () => {
      const classStart = '10:00:00';
      // Custom 15 minutes window: 12-18 minutes before (09:42 to 09:48)
      expect(isWithinReminderWindow('09:45:00', classStart, 15, 3)).toBe(true);
      expect(isWithinReminderWindow('09:42:00', classStart, 15, 3)).toBe(true);
      expect(isWithinReminderWindow('09:48:00', classStart, 15, 3)).toBe(true);
      expect(isWithinReminderWindow('09:41:00', classStart, 15, 3)).toBe(false);
      expect(isWithinReminderWindow('09:30:00', classStart, 15, 3)).toBe(false);

      // Custom 45 minutes window: 42-48 minutes before (09:12 to 09:18)
      expect(isWithinReminderWindow('09:15:00', classStart, 45, 3)).toBe(true);
      expect(isWithinReminderWindow('09:12:00', classStart, 45, 3)).toBe(true);
      expect(isWithinReminderWindow('09:18:00', classStart, 45, 3)).toBe(true);
      expect(isWithinReminderWindow('09:10:00', classStart, 45, 3)).toBe(false);
    });

    it('should correctly enforce semester bounds', () => {
      const start = '2026-06-01';
      const end = '2026-10-31';

      expect(isWithinSemesterBounds('2026-06-01', start, end)).toBe(true);
      expect(isWithinSemesterBounds('2026-08-15', start, end)).toBe(true);
      expect(isWithinSemesterBounds('2026-10-31', start, end)).toBe(true);
      expect(isWithinSemesterBounds('2026-05-31', start, end)).toBe(false);
      expect(isWithinSemesterBounds('2026-11-01', start, end)).toBe(false);
    });

    it('should generate correct deep links based on location mode', () => {
      // Online class
      expect(formatTimetableReminderLink({ is_online: true, room_raw: 'MS TEAMS' }))
        .toBe('/akademik/takwim');

      // Physical with mapped location UUID
      expect(formatTimetableReminderLink({ is_online: false, location_id: 'loc-1234', room_raw: 'EA303' }))
        .toBe('/polymaps?room=loc-1234');

      // Physical without location UUID (fallback to room name query)
      expect(formatTimetableReminderLink({ is_online: false, location_id: null, room_raw: 'DK 1' }))
        .toBe('/polymaps?q=DK%201');
    });
  });

  describe('Deduplication Constraint & Multi-Worker Atomic Safety', () => {
    it('should simulate atomic logging with ON CONFLICT (timetable_id, notified_date)', () => {
      const loggedKeys = new Set<string>();

      const simulateLogTimetableNotification = (timetableId: string, notifiedDate: string): boolean => {
        const compositeKey = `${timetableId}_${notifiedDate}`;
        if (loggedKeys.has(compositeKey)) {
          // Emulates ON CONFLICT DO NOTHING -> 0 rows returned -> false
          return false;
        }
        loggedKeys.add(compositeKey);
        // Emulates RETURNING id -> row returned -> true
        return true;
      };

      const timetableId1 = 'tt-uuid-1';
      const today = '2026-10-12';
      const tomorrow = '2026-10-13';

      // First worker logs for today -> succeeds
      expect(simulateLogTimetableNotification(timetableId1, today)).toBe(true);

      // Second worker concurrent execution on same day -> blocked by conflict
      expect(simulateLogTimetableNotification(timetableId1, today)).toBe(false);

      // Subsequent cron run 5 mins later on same day -> blocked
      expect(simulateLogTimetableNotification(timetableId1, today)).toBe(false);

      // Next day -> permitted
      expect(simulateLogTimetableNotification(timetableId1, tomorrow)).toBe(true);
    });
  });

  describe('Migration File Contract (20261011000001_timetable_reminder_cron.sql)', () => {
    const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/20261011000001_timetable_reminder_cron.sql');

    it('should exist in supabase/migrations/', () => {
      expect(fs.existsSync(migrationPath)).toBe(true);
    });

    it('should contain get_upcoming_timetable_reminders function definition', () => {
      const content = fs.readFileSync(migrationPath, 'utf8');
      expect(content).toContain('FUNCTION public.get_upcoming_timetable_reminders');
      expect(content).toContain("AT TIME ZONE 'Asia/Kuala_Lumpur'");
      expect(content).toContain('EXTRACT(ISODOW FROM');
      expect(content).toContain('semester_start_date');
      expect(content).toContain('semester_end_date');
      expect(content).toContain('COALESCE(s.reminder_minutes, 30)');
    });

    it('should contain atomic log_timetable_notification function with ON CONFLICT DO NOTHING', () => {
      const content = fs.readFileSync(migrationPath, 'utf8');
      expect(content).toContain('FUNCTION public.log_timetable_notification');
      expect(content).toContain('ON CONFLICT (timetable_id, notified_date) DO NOTHING');
      expect(content).toContain('RETURNING id');
      expect(content).toContain("AT TIME ZONE 'Asia/Kuala_Lumpur'");
    });

    it('should include schedule scanning index on student_timetables', () => {
      const content = fs.readFileSync(migrationPath, 'utf8');
      expect(content).toMatch(/CREATE INDEX IF NOT EXISTS \w+ ON public\.student_timetables\s*\(day_of_week,\s*start_time\)/i);
    });
  });

  describe('Server Cron Job Contract (server.js)', () => {
    const serverPath = path.resolve(process.cwd(), 'server.js');

    it('should register a 5-minute cron job for timetable reminders', () => {
      const content = fs.readFileSync(serverPath, 'utf8');
      expect(content).toContain("cron.schedule('*/5 * * * *'");
      expect(content).toContain('get_upcoming_timetable_reminders');
      expect(content).toContain('log_timetable_notification');
    });

    it('should insert in-app notification with proper attributes and zero raw emojis', () => {
      const content = fs.readFileSync(serverPath, 'utf8');
      expect(content).toContain("type: 'timetable_reminder'");
      expect(content).toContain("module: 'AKADEMIK'");
      // Title must start with "Peringatan Kuliah:" and contain NO raw emojis
      expect(content).toMatch(/title:\s*`Peringatan Kuliah:\s*\$\{item\.course_code\}`/);
      expect(content).not.toMatch(/title:\s*`[^`]*[⏰🔔🎓📚][^`]*Peringatan Kuliah/);
    });

    it('should dispatch Web Push notification when subscriptions exist', () => {
      const content = fs.readFileSync(serverPath, 'utf8');
      expect(content).toContain("webpush.sendNotification");
      expect(content).toContain("tag: `timetable-reminder-${item.timetable_id}`");
    });
  });
});
