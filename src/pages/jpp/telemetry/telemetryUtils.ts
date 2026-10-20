import {
  ResilienceRating,
  SystemErrorEvent,
  TelemetryDiagnostics,
  UnifiedTimelineEvent,
} from './telemetryTypes';
import i18n from '@/lib/i18n';

const t = (k: string, fb: string, opt?: any): string => (i18n.isInitialized ? (i18n.t(k, { defaultValue: fb, ...opt }) as string) : fb);

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

export function extractPageRoute(urlOrEndpoint?: string): { path: string; name: string } {
  if (!urlOrEndpoint) return { path: t('jpp:telemetry_route_bg_path', 'Latar Belakang'), name: 'Background / Server Process' };

  try {
    let cleanPath = urlOrEndpoint;
    if (urlOrEndpoint.startsWith('http')) {
      const parsed = new URL(urlOrEndpoint);
      cleanPath = parsed.pathname;
    }

    if (cleanPath.startsWith('/polysuara')) return { path: '/polysuara', name: t('jpp:telemetry_route_polysuara', 'PolySuara Mahasiswa') };
    if (cleanPath.startsWith('/polymart')) return { path: '/polymart', name: t('jpp:telemetry_route_polymart', 'PolyMart Pasar Siswa') };
    if (cleanPath.startsWith('/polyrider')) return { path: '/polyrider', name: t('jpp:telemetry_route_polyrider', 'PolyRider Logistik') };
    if (cleanPath.startsWith('/kebajikan')) return { path: '/kebajikan', name: t('jpp:telemetry_route_kebajikan', 'e-Kebajikan & FoodBank') };
    if (cleanPath.startsWith('/akademik')) return { path: '/akademik', name: t('jpp:telemetry_route_akademik', 'e-Akademik Siswa') };
    if (cleanPath.startsWith('/polymaps')) return { path: '/polymaps', name: t('jpp:telemetry_route_polymaps', 'PolyMaps 360 Kampus') };
    if (cleanPath.startsWith('/ems')) return { path: '/ems', name: t('jpp:telemetry_route_ems', 'EMS Juri & Pertandingan') };
    if (cleanPath.startsWith('/jpp/asrama') || cleanPath.startsWith('/asrama')) return { path: '/jpp/asrama', name: t('jpp:telemetry_route_asrama', 'Asrama KAMSIS') };
    if (cleanPath.startsWith('/jpp/telemetry')) return { path: '/jpp/telemetry', name: t('jpp:telemetry_route_telemetry', 'Telemetri Sistem') };
    if (cleanPath.startsWith('/jpp')) return { path: '/jpp', name: t('jpp:telemetry_route_jpp_portal', 'Portal Pentadbiran JPP') };
    if (cleanPath.startsWith('/portal')) return { path: '/portal', name: t('jpp:telemetry_route_portal', 'Hab Pelajar Portal') };
    if (cleanPath.startsWith('/login')) return { path: '/login', name: t('jpp:telemetry_route_login', 'Daftar Masuk (SSO)') };
    if (cleanPath.startsWith('/api/')) return { path: cleanPath, name: `API Route (${cleanPath})` };
    if (cleanPath === '/') return { path: '/', name: t('jpp:telemetry_route_landing', 'Laman Utama (Landing)') };

    return { path: cleanPath, name: cleanPath };
  } catch {
    return { path: urlOrEndpoint, name: urlOrEndpoint };
  }
}

export function getRatingTheme(rating: ResilienceRating) {
  switch (rating) {
    case 'Cemerlang':
      return {
        text: 'text-emerald-700 dark:text-emerald-400',
        bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
        border: 'border-emerald-500/20 dark:border-emerald-500/30',
        accent: '#10B981',
        label: t('jpp:telemetry_rating_excellent', 'Cemerlang'),
        sub: t('jpp:telemetry_rating_excellent_sub', 'Sistem stabil pada tahap optimum'),
      };
    case 'Stabil':
      return {
        text: 'text-cyan-700 dark:text-cyan-400',
        bg: 'bg-cyan-500/10 dark:bg-cyan-500/15',
        border: 'border-cyan-500/20 dark:border-cyan-500/30',
        accent: '#06B6D4',
        label: t('jpp:telemetry_rating_stable', 'Stabil'),
        sub: t('jpp:telemetry_rating_stable_sub', 'Prestasi terkawal dengan beban normal'),
      };
    case 'Perhatian Diperlukan':
      return {
        text: 'text-amber-700 dark:text-amber-400',
        bg: 'bg-amber-500/10 dark:bg-amber-500/15',
        border: 'border-amber-500/20 dark:border-amber-500/30',
        accent: '#F59E0B',
        label: t('jpp:telemetry_rating_attention', 'Perhatian Diperlukan'),
        sub: t('jpp:telemetry_rating_attention_sub', 'Terdapat anomali perkhidmatan'),
      };
    case 'Kritikal':
    default:
      return {
        text: 'text-rose-700 dark:text-rose-400',
        bg: 'bg-rose-500/10 dark:bg-rose-500/15',
        border: 'border-rose-500/20 dark:border-rose-500/30',
        accent: '#EF4444',
        label: t('jpp:telemetry_rating_critical', 'Kritikal'),
        sub: t('jpp:telemetry_rating_critical_sub', 'Tindakan mitigasi segera diperlukan'),
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

  // 1. Crash & Error events from system_error_events (with exact page path identification!)
  errors.forEach((err, idx) => {
    const isCritical = err.severity === 'CRITICAL';
    const isWarn = err.severity === 'WARNING';
    const isSlow = err.error_type === 'slow_endpoint';
    const isHttp = err.error_type === 'client_http_error';
    const { path, name } = extractPageRoute(err.endpoint);

    // Clean human readable error message
    let displayTitle = err.message || err.error_type || t('jpp:telemetry_err_runtime_detected', 'Ralat Runtime dikesan');
    let source = 'Crash & Error Tracker';
    let badge: string = err.severity;

    if (isSlow) {
      // "GET /api/polymart — 2310ms (status 200)"  →  title + friendly source
      const m = displayTitle.match(/^(\w+) (\/api\/[^\s]+)\s+—\s+(\d+)ms\s+\(status (\d+)\)/);
      displayTitle = m ? `${m[1]} ${m[2]}` : displayTitle;
      source = 'Slow Endpoint (>1s)';
      badge = 'SLOW';
    } else if (isHttp) {
      // "HTTP 500 pada /api/xxx"  →  friendly
      source = 'HTTP Response Error';
      badge = 'HTTP ' + (err.status_code || 'ERR');
    } else if (displayTitle === 'Script error.') {
      displayTitle = err.filename
        ? t('jpp:telemetry_err_script_at', 'Script error pada {{file}}', { file: err.filename.split('/').pop() })
        : 'Script error (Cross-origin bundle)';
    }

    events.push({
      id: `err-${err.id || idx}-${err.occurred_at}`,
      type: 'error',
      severity: isCritical ? 'CRITICAL' : isWarn ? 'WARNING' : 'INFO',
      title: displayTitle,
      subtitle: err.stack ? err.stack.split('\n')[0] : (err.filename || undefined),
      timestamp: err.occurred_at || new Date().toISOString(),
      badge,
      source,
      endpoint: err.endpoint,
      pagePath: path,
      pageTitle: name,
      filename: err.filename,
      stack: err.stack,
      errorType: err.error_type,
      statusCode: err.status_code,
    });
  });

  // 2. Diagnostic alerts from modules
  if (diagnostics) {
    const moduleAlerts: Array<{
      source: string;
      alert: string;
      critical: boolean;
      pagePath: string;
      pageTitle: string;
    }> = [];

    (diagnostics.database?.alerts || []).forEach((a) =>
      moduleAlerts.push({
        source: t('jpp:telemetry_source_db', 'Pangkalan Data'),
        alert: a,
        critical: a.includes('KRITIKAL') || a.includes('🚨'),
        pagePath: '/jpp/telemetry',
        pageTitle: 'PostgreSQL Database',
      })
    );
    (diagnostics.polyrider?.alerts || []).forEach((a) =>
      moduleAlerts.push({
        source: 'PolyRider',
        alert: a,
        critical: a.includes('EMERGENCY'),
        pagePath: '/polyrider',
        pageTitle: 'PolyRider Logistik',
      })
    );
    (diagnostics.polymart?.alerts || []).forEach((a) =>
      moduleAlerts.push({
        source: 'PolyMart',
        alert: a,
        critical: a.includes('tinggi'),
        pagePath: '/polymart',
        pageTitle: t('jpp:telemetry_page_polymart', 'PolyMart Siswa'),
      })
    );
    (diagnostics.kebajikan?.alerts || []).forEach((a) =>
      moduleAlerts.push({
        source: 'e-Kebajikan',
        alert: a,
        critical: a.includes('SLA'),
        pagePath: '/kebajikan',
        pageTitle: 'e-Kebajikan Helpdesk',
      })
    );
    (diagnostics.ai?.alerts || []).forEach((a) =>
      moduleAlerts.push({
        source: 'AI Engine',
        alert: a,
        critical: a.includes('had'),
        pagePath: '/portal',
        pageTitle: 'Nexus AI Engine',
      })
    );

    moduleAlerts.forEach((item, idx) => {
      const eventTime = new Date(baseTime - (idx + 1) * 35000).toISOString();
      events.push({
        id: `alert-${idx}-${item.source}`,
        type: 'alert',
        severity: item.critical ? 'CRITICAL' : 'WARNING',
        title: item.alert,
        subtitle: t('jpp:telemetry_alert_threshold_diagnostic', 'Amaran threshold diagnostik subsistem {{source}}', { source: item.source }),
        timestamp: eventTime,
        badge: item.critical ? 'KRITIKAL' : 'AMARAN',
        source: item.source,
        pagePath: item.pagePath,
        pageTitle: item.pageTitle,
      });
    });
  }

  // 3. Fallback info event if no errors/alerts exist
  if (events.length === 0) {
    events.push({
      id: 'sys-all-clear',
      type: 'system',
      severity: 'INFO',
      title: t('jpp:telemetry_all_systems_normal_title', 'Semua Subsistem Beroperasi dengan Normal'),
      subtitle: t('jpp:telemetry_all_systems_normal_subtitle', 'Integriti Node.js, PostgreSQL pool, dan perkhidmatan aktif disahkan.'),
      timestamp: new Date(baseTime).toISOString(),
      badge: 'OPTIMAL',
      source: t('jpp:telemetry_source_watchdog', 'Watchdog Pemeriksa'),
      pagePath: '/jpp/telemetry',
      pageTitle: t('jpp:telemetry_page_control_center', 'Pusat Kawalan Sistem'),
    });
  }

  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
