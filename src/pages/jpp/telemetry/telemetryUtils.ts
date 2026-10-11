import {
  ResilienceRating,
  SystemErrorEvent,
  TelemetryDiagnostics,
  UnifiedTimelineEvent,
} from './telemetryTypes';

export function formatUptime(s: number): string {
  if (!s || s <= 0) return '0s';
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (d > 0) return `${d}h ${h}j ${m}m`;
  if (h > 0) return `${h}j ${m}m ${sec}s`;
  return `${m}m ${sec}s`;
}

export function getRatingTheme(rating: ResilienceRating) {
  switch (rating) {
    case 'Cemerlang':
      return {
        text: 'text-emerald-700 dark:text-emerald-400',
        bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
        border: 'border-emerald-500/20 dark:border-emerald-500/30',
        accent: '#10B981',
        label: 'Cemerlang',
        sub: 'Sistem stabil pada tahap optimum',
      };
    case 'Stabil':
      return {
        text: 'text-cyan-700 dark:text-cyan-400',
        bg: 'bg-cyan-500/10 dark:bg-cyan-500/15',
        border: 'border-cyan-500/20 dark:border-cyan-500/30',
        accent: '#06B6D4',
        label: 'Stabil',
        sub: 'Prestasi terkawal dengan beban normal',
      };
    case 'Perhatian Diperlukan':
      return {
        text: 'text-amber-700 dark:text-amber-400',
        bg: 'bg-amber-500/10 dark:bg-amber-500/15',
        border: 'border-amber-500/20 dark:border-amber-500/30',
        accent: '#F59E0B',
        label: 'Perhatian Diperlukan',
        sub: 'Terdapat anomali perkhidmatan',
      };
    case 'Kritikal':
    default:
      return {
        text: 'text-rose-700 dark:text-rose-400',
        bg: 'bg-rose-500/10 dark:bg-rose-500/15',
        border: 'border-rose-500/20 dark:border-rose-500/30',
        accent: '#EF4444',
        label: 'Kritikal',
        sub: 'Tindakan mitigasi segera diperlukan',
      };
  }
}

export function buildUnifiedTimeline(
  errors: SystemErrorEvent[] = [],
  diagnostics?: TelemetryDiagnostics,
  serverTimestamp?: string
): UnifiedTimelineEvent[] {
  const events: UnifiedTimelineEvent[] = [];
  const baseTime = serverTimestamp ? new Date(serverTimestamp).getTime() : Date.now();

  // 1. Errors from system_error_events
  errors.forEach((err, idx) => {
    const isCritical = err.severity === 'CRITICAL';
    const isWarn = err.severity === 'WARNING';
    events.push({
      id: `err-${err.id || idx}-${err.occurred_at}`,
      type: 'error',
      severity: isCritical ? 'CRITICAL' : isWarn ? 'WARNING' : 'INFO',
      title: err.message || err.error_type || 'Ralat Tidak Dikenali',
      subtitle: err.stack ? err.stack.split('\n')[0] : (err.filename || undefined),
      timestamp: err.occurred_at || new Date().toISOString(),
      badge: err.severity,
      source: 'Crash & Error Tracker',
      endpoint: err.endpoint ? `${err.method || 'GET'} ${err.endpoint}` : undefined,
    });
  });

  // 2. Diagnostic alerts from modules
  if (diagnostics) {
    const moduleAlerts: Array<{ source: string; alert: string; critical: boolean }> = [];

    (diagnostics.database?.alerts || []).forEach((a) =>
      moduleAlerts.push({ source: 'Pangkalan Data', alert: a, critical: a.includes('KRITIKAL') || a.includes('🚨') })
    );
    (diagnostics.polyrider?.alerts || []).forEach((a) =>
      moduleAlerts.push({ source: 'PolyRider', alert: a, critical: a.includes('EMERGENCY') })
    );
    (diagnostics.polymart?.alerts || []).forEach((a) =>
      moduleAlerts.push({ source: 'PolyMart', alert: a, critical: a.includes('tinggi') })
    );
    (diagnostics.kebajikan?.alerts || []).forEach((a) =>
      moduleAlerts.push({ source: 'e-Kebajikan', alert: a, critical: a.includes('SLA') })
    );
    (diagnostics.ai?.alerts || []).forEach((a) =>
      moduleAlerts.push({ source: 'AI Engine', alert: a, critical: a.includes('had') })
    );

    moduleAlerts.forEach((item, idx) => {
      // Simulate recent timestamp around server fetch time if not stamped
      const eventTime = new Date(baseTime - idx * 45000).toISOString();
      events.push({
        id: `alert-${idx}-${item.source}`,
        type: 'alert',
        severity: item.critical ? 'CRITICAL' : 'WARNING',
        title: item.alert,
        subtitle: `Amaran threshold diagnostik subsistem ${item.source}`,
        timestamp: eventTime,
        badge: item.critical ? 'KRITIKAL' : 'AMARAN',
        source: item.source,
      });
    });
  }

  // 3. Fallback info events if events list is minimal
  if (events.length === 0) {
    events.push({
      id: 'sys-all-clear',
      type: 'system',
      severity: 'INFO',
      title: 'Semua Subsistem Beroperasi dengan Normal',
      subtitle: 'Integriti Node.js, PostgreSQL pool, dan perkhidmatan aktif disahkan.',
      timestamp: new Date(baseTime).toISOString(),
      badge: 'OPTIMAL',
      source: 'Watchdog Pemeriksa',
    });
  }

  // Sort descending by timestamp
  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
