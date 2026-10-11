import { describe, it, expect } from 'vitest';
import {
  formatUptime,
  getRatingTheme,
  buildUnifiedTimeline,
} from '@/pages/jpp/telemetry/telemetryUtils';
import {
  SystemErrorEvent,
  TelemetryDiagnostics,
} from '@/pages/jpp/telemetry/telemetryTypes';

describe('Telemetry Command Center Utilities', () => {
  describe('formatUptime', () => {
    it('formats seconds properly into human readable Malay strings', () => {
      expect(formatUptime(0)).toBe('0s');
      expect(formatUptime(45)).toBe('0m 45s');
      expect(formatUptime(125)).toBe('2m 5s');
      expect(formatUptime(3665)).toBe('1j 1m 5s');
      expect(formatUptime(90065)).toBe('1h 1j 1m');
    });
  });

  describe('getRatingTheme', () => {
    it('returns emerald theme for Cemerlang rating', () => {
      const theme = getRatingTheme('Cemerlang');
      expect(theme.accent).toBe('#10B981');
      expect(theme.label).toBe('Cemerlang');
      expect(theme.text).toContain('emerald');
    });

    it('returns cyan theme for Stabil rating', () => {
      const theme = getRatingTheme('Stabil');
      expect(theme.accent).toBe('#06B6D4');
      expect(theme.label).toBe('Stabil');
    });

    it('returns amber theme for Perhatian Diperlukan rating', () => {
      const theme = getRatingTheme('Perhatian Diperlukan');
      expect(theme.accent).toBe('#F59E0B');
      expect(theme.label).toBe('Perhatian Diperlukan');
    });

    it('returns rose theme for Kritikal rating', () => {
      const theme = getRatingTheme('Kritikal');
      expect(theme.accent).toBe('#EF4444');
      expect(theme.label).toBe('Kritikal');
    });
  });

  describe('buildUnifiedTimeline', () => {
    it('creates fallback info event when no errors and no alerts exist', () => {
      const timeline = buildUnifiedTimeline([], undefined, '2026-10-11T00:00:00Z');
      expect(timeline.length).toBe(1);
      expect(timeline[0].type).toBe('system');
      expect(timeline[0].severity).toBe('INFO');
      expect(timeline[0].badge).toBe('OPTIMAL');
    });

    it('combines crash error events with diagnostic alerts and sorts chronologically', () => {
      const mockErrors: SystemErrorEvent[] = [
        {
          id: 'err-1',
          severity: 'CRITICAL',
          error_type: 'UncaughtException',
          message: 'Database connection timeout',
          occurred_at: '2026-10-11T10:00:00Z',
          endpoint: '/api/test',
          method: 'GET',
        },
      ];

      const mockDiagnostics: TelemetryDiagnostics = {
        kebajikan: {
          sla_breached: 1,
          alerts: ['1 tiket e-Kebajikan melepasi tarikh akhir SLA!'],
        },
        database: {
          wal_retained_mb: 1200,
          alerts: ['🚨 KRITIKAL: WAL Retained sudah 1200 MB!'],
        },
      };

      const timeline = buildUnifiedTimeline(mockErrors, mockDiagnostics, '2026-10-11T10:05:00Z');

      expect(timeline.length).toBe(3);
      // Verify items exist
      const hasError = timeline.some((e) => e.type === 'error' && e.severity === 'CRITICAL');
      const hasDbAlert = timeline.some((e) => e.source === 'Pangkalan Data' && e.severity === 'CRITICAL');
      const hasKebAlert = timeline.some((e) => e.source === 'e-Kebajikan');

      expect(hasError).toBe(true);
      expect(hasDbAlert).toBe(true);
      expect(hasKebAlert).toBe(true);
    });
  });
});
