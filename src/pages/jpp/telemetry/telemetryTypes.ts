export type ResilienceRating = 'Cemerlang' | 'Stabil' | 'Perhatian Diperlukan' | 'Kritikal';

export interface ResilienceDeduction {
  code: string;
  label: string;
  points: number;
}

export interface TelemetryServerMetrics {
  uptime_seconds: number;
  memory: {
    rss_mb: number;
    heap_used_mb: number;
    heap_total_mb: number;
    external_mb: number;
  };
  cpu: {
    user_us: number;
    system_us: number;
  };
  node_version: string;
  platform: string;
  pid: number;
}

export interface TelemetryDiagnostics {
  polyrider?: {
    status_breakdown?: Record<string, number>;
    stuck_emergency?: number;
    cancel_rate_pct?: number;
    alerts?: string[];
  };
  polymart?: {
    status_breakdown?: Record<string, number>;
    pending_stale?: number;
    cancel_rate_pct?: number;
    alerts?: string[];
  };
  kebajikan?: {
    status_breakdown?: Record<string, number>;
    sla_breached?: number;
    unassigned?: number;
    high_priority_open?: number;
    reopen_count?: number;
    alerts?: string[];
  };
  ai?: {
    tokens_used?: number;
    token_limit?: number;
    usage_pct?: number;
    alerts?: string[];
  };
  push?: {
    total_subs?: number;
    total_profiles?: number;
    adoption_rate_pct?: number;
    alerts?: string[];
  };
  accounts?: {
    total?: number;
    pending?: number;
    rejected?: number;
    no_department?: number;
    alerts?: string[];
  };
  database?: {
    max_connections?: number;
    active_connections?: number;
    idle_connections?: number;
    txid_age?: number;
    db_size_mb?: number;
    cache_hit_rate_pct?: number;
    dead_tuples_pct?: number;
    waiting_locks?: number;
    long_running_queries?: number;
    wal_retained_mb?: number;
    replication_slot_name?: string;
    replication_slot_active?: boolean;
    realtime_tables?: number;
    realtime_list_changes_calls?: number;
    realtime_list_changes_total_ms?: number;
    db_uptime_seconds?: number;
    alerts?: string[];
  };
}

export interface TelemetrySnapshot {
  id?: string;
  snapshot_date: string;
  m_profiles?: number;
  m_clubs?: number;
  m_kebajikan_tickets?: number;
  m_polymart_orders?: number;
  m_polyrider_jobs?: number;
  [key: string]: any;
}

export interface TelemetryData {
  resilience_score: number;
  resilience_rating: ResilienceRating;
  resilience_deductions: ResilienceDeduction[];
  server: TelemetryServerMetrics;
  modules: Record<string, any>;
  diagnostics: TelemetryDiagnostics;
  snapshots: TelemetrySnapshot[];
  timestamp: string;
}

export interface SystemErrorEvent {
  id?: string;
  severity: 'CRITICAL' | 'ERROR' | 'WARNING' | 'INFO';
  error_type: string;
  message: string;
  stack?: string;
  endpoint?: string;
  method?: string;
  status_code?: number;
  user_agent?: string;
  ip?: string;
  filename?: string;
  occurred_at: string;
}

export interface SystemErrorsResponse {
  errors: SystemErrorEvent[];
}

export interface UnifiedTimelineEvent {
  id: string;
  type: 'error' | 'alert' | 'system';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  subtitle?: string;
  timestamp: string;
  badge: string;
  source: string;
  endpoint?: string;
}
