// ─────────────────────────────────────────────────────────────────────────────
// notifications.ts — Helper utility untuk sistem notifikasi bersepadu
// Guna fungsi-fungsi ini dari mana-mana modul untuk menghantar notifikasi
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from './supabase';

export type NotificationModule = 'EKPP' | 'KEBAJIKAN' | 'AKADEMIK' | 'KEUSAHAWANAN' | 'JPP' | 'SYSTEM';

export interface NotificationPayload {
  title: string;
  message: string;
  type: string;
  module: NotificationModule;
  link?: string;
  reference_id?: string;
  actor_name?: string;
}

// ─── Send push notification via Edge Function ─────────────────────────────────
async function firePush(user_id: string, payload: NotificationPayload): Promise<void> {
  try {
    // Fetch all subscriptions for this user
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', user_id);

    if (!subs?.length) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    const supabaseUrl = (supabase as any).supabaseUrl as string;

    await Promise.allSettled(
      subs.map(sub =>
        fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: 'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            subscription: { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            title: payload.title,
            body:  payload.message,
            data:  { link: payload.link, module: payload.module, type: payload.type },
          }),
        }).catch(() => {})
      )
    );
  } catch (err) {
    console.error('[firePush] Error:', err);
  }
}

// ─── Hantar ke pengguna individu ─────────────────────────────────────────────
export async function sendNotificationToUser(
  user_id: string,
  payload: NotificationPayload
): Promise<void> {
  const { error } = await supabase.from('notifications').insert({
    user_id,
    ...payload,
    is_read: false,
  });
  if (error) {
    console.error('[sendNotificationToUser] Error:', error.message);
    return;
  }
  // Fire push silently in background - don't await
  firePush(user_id, payload).catch(() => {});
}

// ─── Broadcast ke semua Exco Kebajikan (fan-out per user) ────────────────────
export async function sendNotificationToKebajikanExco(
  payload: NotificationPayload
): Promise<void> {
  try {
    // 1. Exco Kebajikan = role JPP + jpp_unit = KEBAJIKAN (sama logik dengan AuthContext)
    const { data: excoByUnit } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'JPP')
      .eq('jpp_unit', 'KEBAJIKAN');

    // 2. Cari dari user_exco_access (kalau ada konfigurasi manual)
    const { data: excoByAccess } = await supabase
      .from('user_exco_access')
      .select('user_id')
      .eq('exco_module', 'KEBAJIKAN')
      .eq('is_active', true);

    // 3. Super Admin sentiasa dapat notifikasi (oversight)
    const { data: superAdmins } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'SUPER_ADMIN_JPP');

    // Gabungkan dan deduplicate
    const userIds = new Set<string>();
    excoByUnit?.forEach(p => userIds.add(p.id));
    excoByAccess?.forEach(e => userIds.add(e.user_id));
    superAdmins?.forEach(a => userIds.add(a.id));

    if (userIds.size === 0) return;

    const rows = Array.from(userIds).map(user_id => ({
      user_id,
      ...payload,
      is_read: false,
    }));

    const { error } = await supabase.from('notifications').insert(rows);
    if (error) {
      console.error('[sendNotificationToKebajikanExco] Error:', error.message);
      return;
    }

    // Fire push to each Exco
    Array.from(userIds).forEach(uid => firePush(uid, payload).catch(() => {}));
  } catch (err) {
    console.error('[sendNotificationToKebajikanExco] Unexpected error:', err);
  }
}

// ─── Broadcast ke semua Staff Kebajikan (fan-out per user) ───────────────────
export async function sendNotificationToKebajikanStaff(
  payload: NotificationPayload
): Promise<void> {
  try {
    const { data: staffUsers } = await supabase
      .from('kebajikan_staff_assignments')
      .select('staff_user_id')
      .eq('is_active', true);

    if (!staffUsers?.length) return;

    const rows = staffUsers.map(s => ({
      user_id: s.staff_user_id,
      ...payload,
      is_read: false,
    }));

    const { error } = await supabase.from('notifications').insert(rows);
    if (error) {
      console.error('[sendNotificationToKebajikanStaff] Error:', error.message);
      return;
    }

    staffUsers.forEach(s => firePush(s.staff_user_id, payload).catch(() => {}));
  } catch (err) {
    console.error('[sendNotificationToKebajikanStaff] Unexpected error:', err);
  }
}
