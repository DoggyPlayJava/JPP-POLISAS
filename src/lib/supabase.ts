import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  'http://192.168.0.20.sslip.io';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3NzM2MzAyMCwiZXhwIjo0OTMzMDM2NjIwLCJyb2xlIjoiYW5vbiJ9.EhvKo74pWR9CmMBN9Dggr_inV4YbA2MhEamc7MOnZh4';

// ── No-op lock implementation ──────────────────────────────────────────────
// Supabase JS v2 uses the browser Web Locks API to serialize token refreshes
// across tabs. When React StrictMode (or Vite HMR) causes the auth client to
// initialise twice, the second instance calls lock.request(..., { steal: true })
// which aborts the first instance's in-flight refresh with the error:
//   "Lock was released because another request stole it"
//
// The safest cross-environment fix is to replace the lock implementation with
// a no-op that immediately invokes the callback — there is no cross-tab token
// contention risk in a single-origin SPA that already has a globalThis singleton.
const noopLock: (name: string, acquireTimeout: number, fn: () => Promise<void>) => Promise<void> =
  (_name, _timeout, fn) => fn();

declare global {
  // eslint-disable-next-line no-var
  var __supabaseClient: SupabaseClient | undefined;
}

if (!globalThis.__supabaseClient) {
  globalThis.__supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storageKey: 'jpp-polisas-auth',
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      // Replace the Web Locks mechanism entirely so there is nothing to steal.
      lock: noopLock,
    },
  });
}

export const supabase = globalThis.__supabaseClient as SupabaseClient;

// ── Database types ────────────────────────────────────────────────────────
export interface Profile {
  id: string;        // uuid — matches auth.users.id
  email: string;
  full_name: string | null;
  role: 'SUPER_ADMIN_JPP' | 'JPP' | 'CLUB_PRESIDENT' | 'CLUB_MT' | 'CLUB_MEMBER' | 'CLUB_ADVISOR';
  club_id: string | null;
  department?: string | null;
  avatar_url?: string | null;
  matric_no?: string | null;
  jpp_position?: string | null;
  jpp_unit?: string | null;
  created_at?: string;
  updated_at?: string;
  account_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  subscription_tier?: 'free' | 'pro' | 'admin';
  ai_token_balance?: number;
  // Additional fields from DB
  merit?: number;
  phone?: string | null;
  ai_daily_usage?: number;
  ai_status?: string | null;
  ai_last_reset?: string | null;
  ai_tier_expiration?: string | null;
  // Sistem Kohort POLISAS
  programme_code?:    string | null;
  intake_year?:       number | null;
  intake_period?:     1 | 2 | null;
  semester_override?: number | null;
}

//LOGS SYSTEM
// Fungsi Global untuk merekod aktiviti
export const createLog = async (
  clubId: string | null,
  actorId: string | undefined,
  actorName: string | null,
  actionType: string,
  description: string,
  metadata: any = {} // Untuk data tambahan di masa depan
) => {
  await supabase.from('club_logs').insert([{
    club_id: clubId,
    actor_id: actorId,
    actor_name: actorName || 'Sistem',
    action_type: actionType,
    description: description,
    metadata: metadata
  }]);
};