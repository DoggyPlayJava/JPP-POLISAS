import { afterEach, describe, expect, it, vi } from 'vitest';
import { getStudentSemesterInfo } from '../academicSemester';

describe('student semester from configured intake months', () => {
  afterEach(() => vi.useRealTimers());

  it('uses November intake configuration instead of January fallback', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-26T12:00:00+08:00'));
    const student = { intake_year: 2026, intake_period: 2, programme_code: 'DBS', semester_override: null };
    expect(getStudentSemesterInfo(student, 7, 11)?.semester).toBe(1);
    expect(getStudentSemesterInfo(student, 7, 1)?.semester).toBe(2);
  });

  it('preserves explicit manual semester override', () => {
    const student = { intake_year: 2026, intake_period: 2, programme_code: 'DBS', semester_override: 4 };
    expect(getStudentSemesterInfo(student, 7, 11)?.semester).toBe(4);
  });
});
