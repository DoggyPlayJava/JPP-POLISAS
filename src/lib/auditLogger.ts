import { supabase } from '@/lib/supabase';

/**
 * ═══════════════════════════════════════════════════════════════
 * CENTRALIZED SYSTEM AUDIT LOGGER
 * ═══════════════════════════════════════════════════════════════
 * Semua modul WAJIB guna fungsi ini untuk log aktiviti admin.
 * Data masuk ke `admin_audit_logs` → muncul di `system_logs` VIEW.
 *
 * Modul yang disokong:
 * - JPP Admin, Akademik, PolyRider, SUPSAS, KLK, PolyMart,
 *   PolyMaps, Karnival, Takwim, Settings, Announcement, Merit
 */

export type AuditModule =
  | 'JPP Admin'
  | 'Akademik'
  | 'PolyRider'
  | 'SUPSAS'
  | 'KLK'
  | 'PolyMart'
  | 'PolyMaps'
  | 'Karnival'
  | 'Takwim'
  | 'Settings'
  | 'Announcement'
  | 'Merit';

interface LogParams {
  /** Jenis tindakan (e.g. 'ROLE_CHANGE', 'APPROVE', 'DELETE', etc.) */
  actionType: string;
  /** Modul yang terlibat */
  module: AuditModule;
  /** ID entiti yang terkesan (optional) */
  entityId?: string;
  /** Penerangan dalam Bahasa Melayu */
  description: string;
  /** Data tambahan dalam JSON */
  metadata?: Record<string, unknown>;
  /** ID pengguna yang buat tindakan */
  actorId: string;
}

/**
 * Log satu tindakan admin ke `admin_audit_logs`.
 * Fire-and-forget — takkan block UI flow.
 */
export async function logAuditAction(params: LogParams): Promise<void> {
  try {
    await supabase.from('admin_audit_logs').insert({
      actor_id: params.actorId,
      action_type: params.actionType,
      module: params.module,
      entity_id: params.entityId || null,
      description: params.description,
      metadata: params.metadata || {},
    });
  } catch {
    // Silent fail — jangan ganggu UX
    console.warn('[AuditLog] Gagal log:', params.actionType, params.module);
  }
}
