// ─────────────────────────────────────────────────────────────────────────────
// notifications.ts — Helper utility untuk sistem notifikasi bersepadu
// Guna fungsi-fungsi ini dari mana-mana modul untuk menghantar notifikasi
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from './supabase';
import { API_BASE_URL } from './utils';

export type NotificationModule = 'EKPP' | 'KEBAJIKAN' | 'AKADEMIK' | 'KEUSAHAWANAN' | 'JPP' | 'SYSTEM' | 'POLYMART' | 'KAMSIS' | 'KLK' | 'POLYRIDER' | 'POLYTASK' | 'POLYSUARA';

export interface NotificationPayload {
  title: string;
  message: string;
  type: string;
  module: NotificationModule;
  link?: string;
  reference_id?: string;
  actor_name?: string;
}

// ─── Shape of a notification row returned from Supabase ───────────────────────
export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  module: NotificationModule;
  link?: string | null;
  reference_id?: string | null;
  actor_name?: string | null;
  target_role?: string | null;
  is_read: boolean;
  created_at: string;
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

    await Promise.allSettled(
      subs.map(sub =>
        fetch(`${API_BASE_URL}/api/send-push-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            subscription: { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            title: payload.title,
            body:  payload.message,
            data:  { url: payload.link || '/portal', link: payload.link, module: payload.module, type: payload.type },
          })
        }).catch(err => console.error("Error pushing:", err))
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
    // 1-3. Parallel fetch: Exco Kebajikan + manual access + Super Admins
    const [excoByUnitRes, excoByAccessRes, superAdminsRes] = await Promise.all([
      supabase.from('profiles').select('id').eq('role', 'JPP').eq('jpp_unit', 'KEBAJIKAN'),
      supabase.from('user_exco_access').select('user_id').eq('exco_module', 'KEBAJIKAN').eq('is_active', true),
      supabase.from('profiles').select('id').eq('role', 'SUPER_ADMIN_JPP'),
    ]);

    // Gabungkan dan deduplicate
    const userIds = new Set<string>();
    excoByUnitRes.data?.forEach(p => userIds.add(p.id));
    excoByAccessRes.data?.forEach(e => userIds.add(e.user_id));
    superAdminsRes.data?.forEach(a => userIds.add(a.id));

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

// ─── Broadcast ke Exco KK (Kediaman & Kerohanian) ───────────────────────────
// Digunakan untuk tiket kategori KAFETERIA yang diuruskan oleh unit KK
export async function sendNotificationToKKExco(
  payload: NotificationPayload
): Promise<void> {
  try {
    const [excoByUnit, mtAssigned, superAdmins] = await Promise.all([
      supabase.from('profiles').select('id').eq('role', 'JPP').eq('jpp_unit', 'KK'),
      supabase.from('jpp_mt_assignments').select('mt_user_id').eq('unit', 'KK'),
      supabase.from('profiles').select('id').eq('role', 'SUPER_ADMIN_JPP'),
    ]);

    const userIds = new Set<string>();
    excoByUnit.data?.forEach(p => userIds.add(p.id));
    mtAssigned.data?.forEach(m => userIds.add(m.mt_user_id));
    superAdmins.data?.forEach(a => userIds.add(a.id));

    if (userIds.size === 0) return;

    const rows = Array.from(userIds).map(user_id => ({
      user_id,
      ...payload,
      is_read: false,
    }));

    const { error } = await supabase.from('notifications').insert(rows);
    if (error) {
      console.error('[sendNotificationToKKExco] Error:', error.message);
      return;
    }

    Array.from(userIds).forEach(uid => firePush(uid, payload).catch(() => {}));
  } catch (err) {
    console.error('[sendNotificationToKKExco] Unexpected error:', err);
  }
}

// ─── Broadcast notifikasi PolyMart ke Exco/MT Keusahawanan (laporan produk dll) ─
export async function sendNotificationToKeusahawananExco(
  payload: NotificationPayload
): Promise<void> {
  try {
    const [excoByUnit, mtAssigned, superAdmins] = await Promise.all([
      supabase.from('profiles').select('id').eq('role', 'JPP').eq('jpp_unit', 'KEUSAHAWANAN'),
      supabase.from('jpp_mt_assignments').select('mt_user_id').eq('unit', 'KEUSAHAWANAN'),
      supabase.from('profiles').select('id').eq('role', 'SUPER_ADMIN_JPP'),
    ]);

    const userIds = new Set<string>();
    excoByUnit.data?.forEach(p => userIds.add(p.id));
    mtAssigned.data?.forEach(m => userIds.add(m.mt_user_id));
    superAdmins.data?.forEach(a => userIds.add(a.id));

    if (userIds.size === 0) return;

    const rows = Array.from(userIds).map(user_id => ({
      user_id,
      ...payload,
      is_read: false,
    }));

    const { error } = await supabase.from('notifications').insert(rows);
    if (error) { console.error('[sendNotificationToKeusahawananExco] Error:', error.message); return; }
    Array.from(userIds).forEach(uid => firePush(uid, payload).catch(() => {}));
  } catch (err) {
    console.error('[sendNotificationToKeusahawananExco] Unexpected error:', err);
  }
}

// ─── Hantar notifikasi PolyMart kepada vendor perniagaan ─────────────────────
export async function sendNotificationToBusinessVendor(
  business_id: string,
  payload: NotificationPayload
): Promise<void> {
  try {
    // Owner perniagaan + semua member aktif perniagaan
    const [ownerRes, membersRes] = await Promise.all([
      supabase.from('keusahawanan_businesses').select('owner_id').eq('id', business_id).single(),
      supabase.from('student_business_memberships').select('user_id').eq('business_id', business_id).eq('status', 'ACTIVE'),
    ]);

    const userIds = new Set<string>();
    if (ownerRes.data?.owner_id) userIds.add(ownerRes.data.owner_id);
    membersRes.data?.forEach(m => userIds.add(m.user_id));

    if (userIds.size === 0) return;

    const rows = Array.from(userIds).map(user_id => ({ user_id, ...payload, is_read: false }));
    const { error } = await supabase.from('notifications').insert(rows);
    if (error) { console.error('[sendNotificationToBusinessVendor] Error:', error.message); return; }
    Array.from(userIds).forEach(uid => firePush(uid, payload).catch(() => {}));
  } catch (err) {
    console.error('[sendNotificationToBusinessVendor] Unexpected error:', err);
  }
}

// ─── Broadcast Global Announcement ─────────────────────────────────────────────
export async function broadcastAnnouncement(
  payload: NotificationPayload,
  targetRoles: string[] = []
): Promise<void> {
  try {
    let query = supabase.from('profiles').select('id');
    
    // Jika targetRoles diberikan dan bukan kosong, filter ikut role
    // Jika tiada (atau kosong), hantar kepada semua pengguna
    if (targetRoles.length > 0) {
      query = query.in('role', targetRoles);
    }
    
    const { data: users } = await query;
    if (!users?.length) return;
    
    const userIds = users.map(u => u.id);
    const rows = userIds.map(user_id => ({
      user_id,
      ...payload,
      is_read: false,
    }));
    
    // Batch insert untuk prestasi (Supabase API auto-batch jika besar)
    const { error } = await supabase.from('notifications').insert(rows);
    if (error) { console.error('[broadcastAnnouncement] Error:', error.message); return; }
    
    // Fire push to all users async
    userIds.forEach(uid => firePush(uid, payload).catch(() => {}));
  } catch (err) {
    console.error('[broadcastAnnouncement] Unexpected error:', err);
  }
}

// ─── Broadcast ke Exco Akademik ──────────────────────────────────────────────
export async function sendNotificationToAkademikExco(
  payload: NotificationPayload
): Promise<void> {
  try {
    const [excoByUnit, mtAssigned, superAdmins] = await Promise.all([
      supabase.from('profiles').select('id').eq('role', 'JPP').eq('jpp_unit', 'AKADEMIK'),
      supabase.from('jpp_mt_assignments').select('mt_user_id').eq('unit', 'AKADEMIK'),
      supabase.from('profiles').select('id').eq('role', 'SUPER_ADMIN_JPP'),
    ]);
    const userIds = new Set<string>();
    excoByUnit.data?.forEach(p => userIds.add(p.id));
    mtAssigned.data?.forEach(m => userIds.add(m.mt_user_id));
    superAdmins.data?.forEach(a => userIds.add(a.id));
    
    if (userIds.size === 0) return;
    
    const rows = Array.from(userIds).map(user_id => ({ user_id, ...payload, is_read: false }));
    const { error } = await supabase.from('notifications').insert(rows);
    if (error) return;
    Array.from(userIds).forEach(uid => firePush(uid, payload).catch(() => {}));
  } catch (err) {}
}

// ─── Broadcast ke Exco KPP ───────────────────────────────────────────────────
export async function sendNotificationToKppExco(
  payload: NotificationPayload
): Promise<void> {
  try {
    const [excoByUnit, mtAssigned, superAdmins] = await Promise.all([
      supabase.from('profiles').select('id').eq('role', 'JPP').eq('jpp_unit', 'KPP'),
      supabase.from('jpp_mt_assignments').select('mt_user_id').eq('unit', 'KPP'),
      supabase.from('profiles').select('id').eq('role', 'SUPER_ADMIN_JPP'),
    ]);
    const userIds = new Set<string>();
    excoByUnit.data?.forEach(p => userIds.add(p.id));
    mtAssigned.data?.forEach(m => userIds.add(m.mt_user_id));
    superAdmins.data?.forEach(a => userIds.add(a.id));
    
    if (userIds.size === 0) return;
    
    const rows = Array.from(userIds).map(user_id => ({ user_id, ...payload, is_read: false }));
    const { error } = await supabase.from('notifications').insert(rows);
    if (error) return;
    Array.from(userIds).forEach(uid => firePush(uid, payload).catch(() => {}));
  } catch (err) {}
}

// ─── Broadcast ke Exco Kamsis/Kediaman ───────────────────────────────────────
export async function sendNotificationToKamsisAdmin(
  payload: NotificationPayload
): Promise<void> {
  try {
    const [excoByUnit, mtAssigned, superAdmins] = await Promise.all([
      supabase.from('profiles').select('id').eq('role', 'JPP').eq('jpp_unit', 'KEDIAMAN'),
      supabase.from('jpp_mt_assignments').select('mt_user_id').eq('unit', 'KEDIAMAN'),
      supabase.from('profiles').select('id').eq('role', 'SUPER_ADMIN_JPP'),
    ]);
    const userIds = new Set<string>();
    excoByUnit.data?.forEach(p => userIds.add(p.id));
    mtAssigned.data?.forEach(m => userIds.add(m.mt_user_id));
    superAdmins.data?.forEach(a => userIds.add(a.id));
    
    if (userIds.size === 0) return;
    
    const rows = Array.from(userIds).map(user_id => ({ user_id, ...payload, is_read: false }));
    const { error } = await supabase.from('notifications').insert(rows);
    if (error) return;
    Array.from(userIds).forEach(uid => firePush(uid, payload).catch(() => {}));
  } catch (err) {}
}

// ─── Broadcast ke MT Kelab Tertentu ─────────────────────────────────────────
export async function sendNotificationToClubMT(
  club_id: string,
  payload: NotificationPayload
): Promise<void> {
  try {
    const { data: mtMembers } = await supabase
      .from('student_club_memberships')
      .select('user_id')
      .eq('club_id', club_id)
      .in('role', ['CLUB_PRESIDENT', 'CLUB_MT'])
      .eq('status', 'ACTIVE');
      
    if (!mtMembers?.length) return;
    
    const userIds = mtMembers.map(m => m.user_id);
    const rows = userIds.map(user_id => ({ user_id, ...payload, is_read: false }));
    
    const { error } = await supabase.from('notifications').insert(rows);
    if (error) return;
    userIds.forEach(uid => firePush(uid, payload).catch(() => {}));
  } catch (err) {}
}

// ─── Broadcast ke Exco KLK (Kediaman Luar Kampus & PolyRider) ───────────────
export async function sendNotificationToKLKExco(
  payload: NotificationPayload
): Promise<void> {
  try {
    const [excoByUnit, mtAssigned, superAdmins] = await Promise.all([
      supabase.from('profiles').select('id').eq('role', 'JPP').eq('jpp_unit', 'KLK'),
      supabase.from('jpp_mt_assignments').select('mt_user_id').eq('unit', 'KLK'),
      supabase.from('profiles').select('id').eq('role', 'SUPER_ADMIN_JPP'),
    ]);
    const userIds = new Set<string>();
    excoByUnit.data?.forEach(p => userIds.add(p.id));
    mtAssigned.data?.forEach(m => userIds.add(m.mt_user_id));
    superAdmins.data?.forEach(a => userIds.add(a.id));
    
    if (userIds.size === 0) return;
    
    const rows = Array.from(userIds).map(user_id => ({ user_id, ...payload, is_read: false }));
    const { error } = await supabase.from('notifications').insert(rows);
    if (error) return;
    Array.from(userIds).forEach(uid => firePush(uid, payload).catch(() => {}));
  } catch (err) {}
}

// ─── Broadcast ke Semua PolyRider Aktif (Untuk Pesanan Baru) ───────────────
export async function sendNotificationToActivePolyRiders(
  payload: NotificationPayload
): Promise<void> {
  try {
    // Cari rider yang is_on_duty = true dan license_status = 'APPROVED'
    const { data: activeRiders } = await supabase
      .from('polyrider_profiles')
      .select('user_id')
      .eq('is_on_duty', true)
      .eq('license_status', 'APPROVED');
      
    if (!activeRiders?.length) return;
    
    const userIds = activeRiders.map(r => r.user_id);
    const rows = userIds.map(user_id => ({ user_id, ...payload, is_read: false }));
    
    const { error } = await supabase.from('notifications').insert(rows);
    if (error) return;
    userIds.forEach(uid => firePush(uid, payload).catch(() => {}));
  } catch (err) {}
}

// ─── Broadcast Push-Only ke pelajar yang subscribe PolySuara ──────────────────
// Memanggil endpoint server /api/polysuara-broadcast yang menggunakan
// supabaseAdmin (service role) untuk query semua push_subscriptions.
// Push-only: Tidak insert ke jadual `notifications` untuk elak banjir DB.
export async function broadcastPolySuaraNewConfession(
  authorId: string,
  category: string
): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    await fetch(`${API_BASE_URL}/api/polysuara-broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ authorId, category }),
    }).catch(err => console.error('[broadcastPolySuara] Fetch error:', err));
  } catch (err) {
    console.error('[broadcastPolySuaraNewConfession] Error:', err);
  }
}

