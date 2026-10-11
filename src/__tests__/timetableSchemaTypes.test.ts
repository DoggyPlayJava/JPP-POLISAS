import { describe, it, expect } from 'vitest';
import { 
  CLASS_TYPES,
  type StudentTimetableEntry, 
  type StudentTimetableMetadata, 
  type StudentTimetableSettings, 
  type ImapsRoomMapping,
  type StudentTimetableNotificationLog
} from '@/types';

describe('Timetable Schema Types Contract', () => {
  it('should validate complete StudentTimetableEntry shape', () => {
    const sample: StudentTimetableEntry = {
      id: 'uuid-1',
      user_id: 'user-uuid',
      academic_session: '2025/2026',
      semester: 'S2',
      class_name: 'DEE2A',
      day_of_week: 1,
      start_time: '08:00:00',
      end_time: '10:00:00',
      course_code: 'DEE20153',
      course_name: 'DIGITAL ELECTRONICS',
      class_type: 'KULIAH',
      lecturer_code: 'AI',
      room_raw: 'EA303',
      location_id: 'loc-uuid',
      is_online: false,
      color: '#3b82f6',
      is_archived: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    expect(sample.class_name).toBe('DEE2A');
    expect(sample.day_of_week).toBe(1);
    expect(sample.is_online).toBe(false);
  });

  it('should validate StudentTimetableMetadata shape', () => {
    const meta: StudentTimetableMetadata = {
      id: 'meta-1',
      user_id: 'user-uuid',
      academic_session: '2025/2026',
      semester: 'S2',
      class_name: 'DEE2A',
      semester_start_date: '2026-06-01',
      semester_end_date: '2026-10-31',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    expect(meta.is_active).toBe(true);
    expect(meta.semester).toBe('S2');
  });

  it('should validate StudentTimetableSettings shape', () => {
    const settings: StudentTimetableSettings = {
      user_id: 'user-uuid',
      notifications_enabled: true,
      reminder_minutes: 30,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    expect(settings.notifications_enabled).toBe(true);
    expect(settings.reminder_minutes).toBe(30);
  });

  it('should validate ImapsRoomMapping shape', () => {
    const mapping: ImapsRoomMapping = {
      id: 'map-1',
      room_code_pattern: '^EA303$',
      location_id: 'loc-uuid',
      is_online: false,
      notes: 'Makmal Komputer'
    };
    expect(mapping.room_code_pattern).toBe('^EA303$');
    expect(mapping.is_online).toBe(false);
  });

  it('should validate StudentTimetableNotificationLog shape', () => {
    const log: StudentTimetableNotificationLog = {
      id: 'log-1',
      timetable_id: 'uuid-1',
      user_id: 'user-uuid',
      notified_date: '2026-10-11',
      created_at: new Date().toISOString()
    };
    expect(log.timetable_id).toBe('uuid-1');
    expect(log.notified_date).toBe('2026-10-11');
  });

  it('should export CLASS_TYPES array with correct values', () => {
    expect(CLASS_TYPES).toEqual(['KULIAH', 'AMALI', 'TUTORIAL', 'LAIN_LAIN']);
  });
});
