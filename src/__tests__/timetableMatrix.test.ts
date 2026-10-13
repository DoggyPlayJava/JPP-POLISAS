import { describe, it, expect } from 'vitest';
import {
  MATRIX_TIME_SLOTS,
  MATRIX_START_HOUR,
  MATRIX_END_HOUR,
  REHAT_START_HOUR,
  getSlotGridSpan,
} from '@/lib/timetableMatrix';

describe('Timetable Matrix Engine', () => {
  it('should have 9 standard 1-hour slots from 08:00 to 17:00', () => {
    expect(MATRIX_TIME_SLOTS.length).toBe(9);
    expect(MATRIX_TIME_SLOTS[0].label).toBe('08:00 - 09:00');
    expect(MATRIX_TIME_SLOTS[8].label).toBe('16:00 - 17:00');
    expect(MATRIX_TIME_SLOTS[5].isBreak).toBe(true); // 13:00 - 14:00 Rehat
  });

  it('should calculate accurate grid span for 1-hour morning class (08:00 - 09:00)', () => {
    const span = getSlotGridSpan('08:00:00', '09:00:00');
    expect(span.colStart).toBe(1);
    expect(span.colSpan).toBe(1);
  });

  it('should calculate accurate grid span for 2-hour lab class (09:00 - 11:00)', () => {
    const span = getSlotGridSpan('09:00:00', '11:00:00');
    expect(span.colStart).toBe(2);
    expect(span.colSpan).toBe(2);
  });

  it('should calculate accurate grid span for 3-hour afternoon workshop (14:00 - 17:00)', () => {
    const span = getSlotGridSpan('14:00:00', '17:00:00');
    expect(span.colStart).toBe(7);
    expect(span.colSpan).toBe(3);
  });

  it('should clamp bounds if class times are formatted as HH:mm without seconds', () => {
    const span = getSlotGridSpan('10:00', '12:00');
    expect(span.colStart).toBe(3);
    expect(span.colSpan).toBe(2);
  });
});
