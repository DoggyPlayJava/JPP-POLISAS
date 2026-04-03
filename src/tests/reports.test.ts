import { describe, it, expect } from 'vitest';
import { normalizeReportData, RawActivity, RawProgram } from '../lib/report-utils';

describe('normalizeReportData', () => {
  it('should combine and sort activities and programs by date', () => {
    const activities: RawActivity[] = [
      {
        id: '1',
        title: 'Activity B',
        start_date: '2024-04-10T10:00:00Z',
        end_date: '2024-04-10T12:00:00Z',
      },
    ];

    const programs: RawProgram[] = [
      {
        id: '2',
        nama_program: 'Program A',
        tarikh_mula: '2024-04-05T09:00:00Z',
        tarikh_tamat: '2024-04-05T17:00:00Z',
      },
    ];

    const result = normalizeReportData(activities, programs);

    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('Program A'); // Earlier date
    expect(result[1].title).toBe('Activity B'); // Later date
    expect(result[0]._source).toBe('takwim');
    expect(result[1]._source).toBe('aktiviti');
  });

  it('should handle empty input', () => {
    const result = normalizeReportData([], []);
    expect(result).toEqual([]);
  });

  it('should use deskripsi as tindakan if tindakan is missing in programs', () => {
    const programs: RawProgram[] = [
      {
        id: '1',
        nama_program: 'Test',
        tarikh_mula: '2024-01-01',
        tarikh_tamat: '2024-01-01',
        deskripsi: 'My Description',
      },
    ];
    const result = normalizeReportData([], programs);
    expect(result[0].tindakan).toBe('My Description');
  });
});
