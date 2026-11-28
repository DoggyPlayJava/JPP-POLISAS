// ─────────────────────────────────────────────────────────────────────────────
// notifications.ts — Helper utility untuk sistem notifikasi bersepadu
// Guna fungsi-fungsi ini dari mana-mana modul untuk menghantar notifikasi
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from './supabase';
import { API_BASE_URL } from './utils';
import { isLegacyAnimalCodename, normalizePolySuaraCodename } from './polySuaraHelpers';

export type NotificationModule = 'EKPP' | 'KEBAJIKAN' | 'AKADEMIK' | 'KEUSAHAWANAN' | 'JPP' | 'SYSTEM' | 'POLYMART' | 'KAMSIS' | 'KLK' | 'POLYRIDER' | 'POLYTASK' | 'POLYSUARA' | 'POLYRENT' | 'MAKMP' | 'FOODBANK';

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

// ─── Smart fallback link berdasarkan modul ────────────────────────────────────
export const NOTIFICATION_MODULE_FALLBACK: Record<NotificationModule, string> = {
  KEBAJIKAN:    '/kebajikan',
  EKPP:         '/laporan',
  AKADEMIK:     '/akademik',
  KEUSAHAWANAN: '/keusahawanan',
  JPP:          '/portal',
  SYSTEM:       '/dashboard',
  POLYMART:     '/polymart',
  KAMSIS:       '/dashboard',
  KLK:          '/klk',
  POLYRIDER:    '/polyrider',
  POLYTASK:     '/polytask',
  POLYSUARA:    '/polysuara',
  POLYRENT:     '/polyrent',
  MAKMP:        '/makmp/status',
  FOODBANK:     '/kebajikan/foodbank',
};

/**
 * Shared deep-link resolver used by NotificationBell, NotifikasiPage, and Web Push.
 * Upgrades legacy ?id= links, enriches generic module links with reference_id deep-links,
 * and preserves all query parameters (?post=, &comment=, ?order=, ?businessId=, ?code=, ?tab=).
 */
export function resolveNotificationLink(
  notif: Pick<AppNotification, 'link' | 'module' | 'type' | 'reference_id'> & { title?: string | null }
): string | null {
  const rawLink = (notif.link || '').trim();
  const refId = (notif.reference_id || '').trim();
  const mod = (notif.module || 'SYSTEM').toUpperCase() as NotificationModule;
  const typeLower = (notif.type || '').toLowerCase();

  if (rawLink) {
    // 1. PolySuara deep-link normalization: /polysuara?id=<x> -> /polysuara?post=<x>
    if (rawLink.startsWith('/polysuara')) {
      const [pathname, queryStr = ''] = rawLink.split('?');
      const params = new URLSearchParams(queryStr);
      const legacyId = params.get('id');
      if (legacyId && !params.get('post')) {
        params.delete('id');
        params.set('post', legacyId);
      }
      if (!params.get('post') && refId) {
        params.set('post', refId);
      }
      const nextQs = params.toString();
      return nextQs ? `${pathname}?${nextQs}` : pathname;
    }

    // 2. Kebajikan chat notifications previously pointed to generic /kebajikan/buat-aduan
    if (rawLink === '/kebajikan/buat-aduan' && refId) {
      const titleLower = (notif.title || '').toLowerCase();
      const isExcoTarget = titleLower.includes('komen baru') || titleLower.includes('new comment') || titleLower.includes('aduan baru');
      return isExcoTarget ? `/kebajikan/tiket/${refId}` : `/kebajikan/aduan/${refId}`;
    }

    // 3. PolyMart orders & chat enrichment when reference_id exists
    if (rawLink === '/polymart/pesanan-saya' && refId) {
      return `/polymart/pesanan-saya?order=${encodeURIComponent(refId)}`;
    }
    if (rawLink === '/polymart/vendor' && refId) {
      return `/polymart/vendor?order=${encodeURIComponent(refId)}`;
    }
    if (rawLink === '/polymart' && typeLower.includes('chat') && refId) {
      return `/polymart/mesej?chat=${encodeURIComponent(refId)}`;
    }

    // 4. PolyTask generic link + reference_id -> job detail
    if (rawLink === '/polytask' && refId) {
      return `/polytask/job/${encodeURIComponent(refId)}`;
    }

    return rawLink;
  }

  // Fallback when link is absent but reference_id exists
  if (mod === 'POLYSUARA' && refId) {
    return `/polysuara?post=${encodeURIComponent(refId)}`;
  }
  if (mod === 'POLYTASK' && refId) {
    return `/polytask/job/${encodeURIComponent(refId)}`;
  }
  if (mod === 'KEBAJIKAN' && refId) {
    return `/kebajikan/aduan/${encodeURIComponent(refId)}`;
  }
  if (mod === 'POLYMART' && refId) {
    if (typeLower.includes('chat')) return `/polymart/mesej?chat=${encodeURIComponent(refId)}`;
    return `/polymart/pesanan-saya?order=${encodeURIComponent(refId)}`;
  }
  if (mod === 'MAKMP' && refId) {
    return `/makmp/status?code=${encodeURIComponent(refId)}`;
  }

  return NOTIFICATION_MODULE_FALLBACK[mod] ?? null;
}

function sanitizeLegacyAnimalMentions(text: string): string {
  if (!text) return '';
  let out = text.replace(/hantu\s+tanpa\s+nama/gi, 'Korra');
  // Replace "Kucing Oren baru luah..." / "Harimau Berani just shared..." patterns
  const prefixMatch = out.match(/^([^\w\s]*\s*)([A-Za-z]+(?:\s+[A-Za-z]+){0,2})(\s+(?:baru\s+luah|just\s+shared|telah\s+memadamkan|deleted))/i);
  if (prefixMatch && isLegacyAnimalCodename(prefixMatch[2])) {
    const persona = normalizePolySuaraCodename(prefixMatch[2]).displayName;
    out = `${prefixMatch[1]}${persona}${out.slice(prefixMatch[0].length - prefixMatch[3].length)}`;
  }
  return out;
}

/**
 * Translates known system/PolySuara/Kebajikan/PolyMart/MAKMP/EKPP/Akademik/PolyTask/PolyRider
 * notification titles & messages into the viewer's active language ('en' or 'ms').
 * Also ensures zero legacy animal codenames appear in PolySuara notifications.
 */
export function localizeNotification(
  notif: Pick<AppNotification, 'title' | 'message' | 'module' | 'type'>,
  _t?: any,
  lang = 'ms'
): { title: string; message: string } {
  const isEn = (lang || 'ms').toLowerCase().startsWith('en');
  const rawTitle = sanitizeLegacyAnimalMentions(String(notif.title || ''));
  const rawMessage = sanitizeLegacyAnimalMentions(String(notif.message || ''));
  const type = String(notif.type || '').toUpperCase();
  const cleanTitle = rawTitle.replace(/^[^\p{L}\p{N}\[]+/u, '').trim();

  // ── 1. PolySuara interaction & broadcast notifications ──
  if (notif.module === 'POLYSUARA' || ['COMMENT', 'COMMENT_REPLY', 'UPVOTE_MILESTONE', 'DOWNVOTE_WARNING', 'AUTO_HIDE', 'NEW_CONFESSION'].includes(type)) {
    // Reply to comment (check BEFORE comment so "balasan ... ulasan" matches reply first)
    if (type === 'COMMENT_REPLY' || /balasan\s+(?:baru|baharu)|new\s+reply/i.test(cleanTitle)) {
      const quoted = rawMessage.match(/"([^"]*)"/)?.[1];
      if (isEn) {
        return {
          title: 'New Reply',
          message: quoted !== undefined ? `Someone replied to your comment: "${quoted}"` : rawMessage.replace(/^Seseorang membalas ulasan anda:\s*/i, 'Someone replied to your comment: '),
        };
      }
      return {
        title: 'Balasan Baharu',
        message: quoted !== undefined ? `Seseorang membalas ulasan anda: "${quoted}"` : rawMessage.replace(/^Someone replied to your comment:\s*/i, 'Seseorang membalas ulasan anda: '),
      };
    }

    // Comment on confession
    if (type === 'COMMENT' || /ulasan\s+(?:baru|baharu)|new\s+comment/i.test(cleanTitle)) {
      const quoted = rawMessage.match(/"([^"]*)"/)?.[1];
      if (isEn) {
        return {
          title: 'New Comment',
          message: quoted !== undefined ? `Someone commented on your post: "${quoted}"` : rawMessage.replace(/^Seseorang mengulas luahan anda:\s*/i, 'Someone commented on your post: '),
        };
      }
      return {
        title: 'Ulasan Baharu',
        message: quoted !== undefined ? `Seseorang mengulas luahan anda: "${quoted}"` : rawMessage.replace(/^Someone commented on your (?:confession|post):\s*/i, 'Seseorang mengulas luahan anda: '),
      };
    }

    // Upvote milestone
    if (type === 'UPVOTE_MILESTONE' || /perkembangan popular|popular milestone|sedang hangat|trending/i.test(cleanTitle)) {
      const count = rawMessage.match(/\b(\d+)\b/)?.[1] || rawTitle.match(/\b(\d+)\b/)?.[1];
      if (isEn) {
        return {
          title: 'Popular Post on PolySuara',
          message: count ? `Your post has reached ${count} upvotes from campus students!` : 'Your post is gaining support!',
        };
      }
      return {
        title: 'Luahan PolySuara Hangat',
        message: count ? `Luahan anda telah mencapai ${count} sokongan daripada warga kampus!` : 'Luahan anda semakin mendapat sokongan!',
      };
    }

    // Downvote warning
    if (type === 'DOWNVOTE_WARNING' || /kritikan komuniti|amaran maklum balas komuniti|community feedback/i.test(cleanTitle)) {
      const count = rawMessage.match(/\b(\d+)\b/)?.[1];
      if (isEn) {
        return {
          title: 'Community Feedback Alert',
          message: count ? `Your post received ${count} community downvotes.` : 'Your post received multiple community downvotes. Please review community guidelines.',
        };
      }
      return {
        title: 'Amaran Maklum Balas Komuniti',
        message: count ? `Luahan anda telah ditentang oleh ${count} orang.` : 'Luahan anda menerima banyak undi kurang bersetuju. Sila semak garis panduan komuniti.',
      };
    }

    // Auto-hide
    if (type === 'AUTO_HIDE' || /luahan\s+(?:polysuara\s+)?disembunyikan|(?:confession|post)\s+hidden/i.test(cleanTitle)) {
      if (isEn) {
        return {
          title: 'PolySuara Post Hidden',
          message: 'Your post was automatically hidden after reaching the community moderation threshold.',
        };
      }
      return {
        title: 'Luahan Disembunyikan',
        message: 'Luahan anda telah disembunyikan secara automatik oleh komuniti kerana menerima banyak bantahan.',
      };
    }

    // New confession broadcast (supports both legacy "baru luah sesuatu" & upgraded "berkongsi di PolySuara")
    const baruLuahMatch = cleanTitle.match(/^(.+?)\s+(?:baru luah sesuatu|berkongsi di polysuara)$/i);
    if (baruLuahMatch) {
      const persona = normalizePolySuaraCodename(baruLuahMatch[1]).displayName;
      return {
        title: isEn ? `${persona} shared on PolySuara` : `${persona} berkongsi di PolySuara`,
        message: rawMessage,
      };
    }
    const justSharedMatch = cleanTitle.match(/^(.+?)\s+(?:just shared a confession|shared on polysuara)$/i);
    if (justSharedMatch) {
      const persona = normalizePolySuaraCodename(justSharedMatch[1]).displayName;
      return {
        title: isEn ? `${persona} shared on PolySuara` : `${persona} berkongsi di PolySuara`,
        message: rawMessage,
      };
    }
  }

  // ── 2. PolyMart orders & chat ──
  if (notif.module === 'POLYMART') {
    if (isEn) {
      const tLower = cleanTitle.toLowerCase();
      if (tLower.includes('bayaran disahkan')) {
        return {
          title: '[PolyMart] Payment Verified',
          message: rawMessage.replace(/Bayaran untuk tempahan anda telah disahkan.*?Pesanan sedang diproses!/i, 'Your payment has been verified. Your order is now being processed!'),
        };
      }
      if (tLower.includes('resit ditolak')) {
        return {
          title: '[PolyMart] Receipt Rejected',
          message: 'Your payment receipt was rejected. Please upload a valid receipt.',
        };
      }
      if (tLower.includes('pesanan siap diambil') || tLower.includes('sedia diambil')) {
        return {
          title: '[PolyMart] Order Ready for Pickup',
          message: rawMessage
            .replace(/^Pesanan anda\s*/i, 'Your order ')
            .replace(/sudah siap\.?\s*Sila datang ambil!?/i, 'is ready. Please come collect it!'),
        };
      }
      if (tLower.includes('pesanan selesai')) {
        return {
          title: '[PolyMart] Order Completed',
          message: 'Thank you for shopping at PolyMart!',
        };
      }
      if (tLower.includes('pesanan dibatalkan')) {
        return {
          title: '[PolyMart] Order Cancelled',
          message: rawMessage.replace(/^Pesanan anda dibatalkan/i, 'Your order has been cancelled'),
        };
      }
      if (tLower.includes('pesanan disahkan')) {
        return {
          title: '[PolyMart] Order Confirmed',
          message: rawMessage.replace(/^Pesanan anda telah disahkan/i, 'Your order has been confirmed'),
        };
      }
      if (tLower.includes('mesej baru dari pelanggan') || tLower.includes('mesej sembang peniaga')) {
        return {
          title: cleanTitle.replace(/Mesej Baru dari Pelanggan/i, 'New Message from Customer').replace(/Mesej Sembang Peniaga!?/i, 'New Customer Message'),
          message: rawMessage.replace(/Menghantar pautan produk/i, 'Sent a product link'),
        };
      }
      if (tLower.includes('mesej baru dari ') || tLower.includes('mesej dari ')) {
        return {
          title: cleanTitle.replace(/Mesej Baru dari /i, 'New Message from ').replace(/Mesej dari /i, 'Message from '),
          message: rawMessage.replace(/Menghantar pautan produk/i, 'Sent a product link'),
        };
      }
    }
  }

  // ── 3. Kebajikan & FoodBank ──
  if (notif.module === 'KEBAJIKAN' || notif.module === 'FOODBANK') {
    if (isEn) {
      if (/aduan baru/i.test(cleanTitle)) {
        return {
          title: cleanTitle.replace(/Aduan Baru/i, 'New Welfare Ticket'),
          message: rawMessage
            .replace(/dikemukakan oleh/i, 'submitted by')
            .replace(/Kategori:/i, 'Category:')
            .replace(/Sila semak dan ambil tindakan\.?/i, 'Please review and take action.'),
        };
      }
      if (/komen baru tiket/i.test(cleanTitle)) {
        return {
          title: cleanTitle.replace(/Komen Baru Tiket/i, 'New Comment on Ticket'),
          message: rawMessage.replace(/Menghantar pautan tiket/i, 'Sent a ticket link'),
        };
      }
      if (/maklumbalas tiket|maklum balas tiket/i.test(cleanTitle)) {
        return {
          title: cleanTitle.replace(/Maklum\s?balas Tiket/i, 'Ticket Reply'),
          message: rawMessage.replace(/Menghantar pautan tiket/i, 'Sent a ticket link'),
        };
      }
      if (/status aduan|tiket dikemaskini/i.test(cleanTitle)) {
        return {
          title: cleanTitle.replace(/Status Aduan/i, 'Ticket Status').replace(/Tiket Dikemaskini/i, 'Ticket Updated'),
          message: rawMessage,
        };
      }
    }
  }

  // ── 4. MAKMP & Akademik ──
  if (notif.module === 'MAKMP' || type === 'MAKMP' || notif.module === 'AKADEMIK') {
    if (isEn) {
      if (/dicalonkan 3 teratas makmp/i.test(cleanTitle)) {
        return {
          title: 'Congratulations! Top 3 MAKMP Finalist',
          message: rawMessage
            .replace(/Tahniah! Anda telah dicalonkan sebagai antara 3 teratas bagi anugerah/i, 'Congratulations! You have been shortlisted in the Top 3 for')
            .replace(/Sila lengkapkan maklumat diri anda di portal\.?/i, 'Please complete your profile details in the portal.'),
        };
      }
      if (/permohonan makmp disahkan|pencalonan makmp disahkan/i.test(cleanTitle)) {
        return {
          title: 'MAKMP Nomination Verified',
          message: rawMessage.replace(/Permohonan MAKMP anda telah disahkan/i, 'Your MAKMP nomination has been verified'),
        };
      }
      if (/permohonan makmp ditolak|pencalonan makmp ditolak/i.test(cleanTitle)) {
        return {
          title: 'MAKMP Nomination Rejected',
          message: rawMessage.replace(/Permohonan MAKMP anda ditolak/i, 'Your MAKMP nomination was rejected'),
        };
      }
      if (/dalam semakan/i.test(cleanTitle)) {
        return {
          title: cleanTitle.replace(/Dalam Semakan/i, 'Under Review'),
          message: rawMessage,
        };
      }
    }
  }

  // ── 5. EKPP / Club Portal & System ──
  if (isEn) {
    if (/permohonan diluluskan/i.test(cleanTitle)) {
      return {
        title: 'Application Approved',
        message: rawMessage
          .replace(/Tahniah! Permohonan anda untuk menyertai /i, 'Congratulations! Your application to join ')
          .replace(/ telah diluluskan\.?/i, ' has been approved.'),
      };
    }
    if (/permohonan ditolak/i.test(cleanTitle)) {
      return {
        title: 'Application Rejected',
        message: rawMessage
          .replace(/Dukacita dimaklumkan permohonan anda untuk menyertai /i, 'We regret to inform you that your application to join ')
          .replace(/ telah ditolak\.?/i, ' was not approved.'),
      };
    }
    if (/laporan diluluskan/i.test(cleanTitle)) {
      return {
        title: 'Report Approved',
        message: rawMessage,
      };
    }
    if (/laporan perlu pembetulan|laporan ditolak/i.test(cleanTitle)) {
      return {
        title: cleanTitle.replace(/Laporan Perlu Pembetulan/i, 'Report Needs Revision').replace(/Laporan Ditolak/i, 'Report Rejected'),
        message: rawMessage,
      };
    }
    if (/pengumuman baru|hebahan rasmi/i.test(cleanTitle)) {
      return {
        title: cleanTitle.replace(/Pengumuman Baru/i, 'New Announcement').replace(/Hebahan Rasmi/i, 'Official Broadcast'),
        message: rawMessage,
      };
    }
  }

  return { title: rawTitle, message: rawMessage };
}

// ─── Insert notifikasi (service-role via server + fallback direct) ───────────
// Sebelum ini insert terus ke Supabase terkena RLS 403 apabila pelajar
// menghantar notifikasi kepada user_id lain (contoh: laporan kelab → KPP Exco).
// Kini guna endpoint /api/notify yang insert dengan service role.
export async function insertNotifications(input: any | any[]): Promise<{ error: any }> {
    const rows = (Array.isArray(input) ? input : [input]).map((r: any) => ({
        ...r,
        message: r.message ?? r.content ?? '',
        title: r.title ?? '',
    }));
    if (rows.length === 0) return { error: null };

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
            const res = await fetch(`${API_BASE_URL}/api/notify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ rows }),
            });
            if (res.ok) return { error: null };
        }
    } catch (_) { /* fallback ke direct insert */ }

    const { error } = await supabase.from('notifications').insert(rows);
    if (error) console.error('[notify] Fallback direct insert error:', error.message);
    return { error: error || null };
}

// ─── Send push notification via Edge Function ─────────────────────────────────
async function firePush(user_id: string, payload: NotificationPayload): Promise<void> {
  try {
    // Fetch all subscriptions for this user
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', user_id);

    if (!subs?.length) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    const resolvedLink = resolveNotificationLink(payload) || '/portal';
    await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/send-push-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              subscription: { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              title: payload.title,
              body:  payload.message,
              data:  { url: resolvedLink, link: resolvedLink, module: payload.module, type: payload.type },
            })
          });

          // 410 = subscription mati/expired → padam supaya tak hantar lagi
          if (res.status === 410) {
            try {
              await supabase.from('push_subscriptions').delete().eq('id', sub.id);
            } catch {
              /* abaikan jika tiada keizinan (RLS) */
            }
          } else if (!res.ok) {
            // Gagal hantar tapi bukan subscription mati — log status sahaja
            console.warn(`[firePush] Push gagal (HTTP ${res.status}) untuk user ${user_id}`);
          }
        } catch (err) {
          console.warn('[firePush] Error pushing:', err);
        }
      })
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
  const { error } = await insertNotifications({
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

    const { error } = await insertNotifications(rows);
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

    const { error } = await insertNotifications(rows);
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

    const { error } = await insertNotifications(rows);
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

    const { error } = await insertNotifications(rows);
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
    const { error } = await insertNotifications(rows);
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
    const { error } = await insertNotifications(rows);
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
    const { error } = await insertNotifications(rows);
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
    const { error } = await insertNotifications(rows);
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
    const { error } = await insertNotifications(rows);
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
    
    const { error } = await insertNotifications(rows);
    if (error) return;
    userIds.forEach(uid => firePush(uid, payload).catch(() => {}));
  } catch (err) {}
}

// ─── Broadcast ke Exco KLS (Kediaman Luar Kampus — PolyRent & PolyRider) ────
// Note: Unit code dalam DB adalah 'KLS' (bukan 'KLK')
export async function sendNotificationToKLKExco(
  payload: NotificationPayload
): Promise<void> {
  return sendNotificationToKLSExco(payload);
}

export async function sendNotificationToKLSExco(
  payload: NotificationPayload
): Promise<void> {
  try {
    const [excoByUnit, mtAssigned, superAdmins] = await Promise.all([
      supabase.from('profiles').select('id').eq('role', 'JPP').eq('jpp_unit', 'KLS'),
      supabase.from('jpp_mt_assignments').select('mt_user_id').eq('unit', 'KLS'),
      supabase.from('profiles').select('id').eq('role', 'SUPER_ADMIN_JPP'),
    ]);
    const userIds = new Set<string>();
    excoByUnit.data?.forEach(p => userIds.add(p.id));
    mtAssigned.data?.forEach(m => userIds.add(m.mt_user_id));
    superAdmins.data?.forEach(a => userIds.add(a.id));
    
    if (userIds.size === 0) return;
    
    const rows = Array.from(userIds).map(user_id => ({ user_id, ...payload, is_read: false }));
    const { error } = await insertNotifications(rows);
    if (error) return;
    Array.from(userIds).forEach(uid => firePush(uid, payload).catch(() => {}));
  } catch (err) {}
}

// ─── Hantar notifikasi PolyRent kepada pengguna tertentu (Tuan Rumah / Pelajar) ─
export async function sendPolyRentNotification(
  user_id: string,
  payload: Omit<NotificationPayload, 'module'>
): Promise<void> {
  return sendNotificationToUser(user_id, { ...payload, module: 'POLYRENT' });
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
    
    const { error } = await insertNotifications(rows);
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

// ─── Broadcast ke Semua Ahli JPP dan Super Admin (Untuk Laporan Tempat Hilang) ───
export async function sendNotificationToJppAndSuperAdmin(
  payload: NotificationPayload
): Promise<void> {
  try {
    const [jppMembers, superAdmins] = await Promise.all([
      supabase.from('profiles').select('id').eq('role', 'JPP'),
      supabase.from('profiles').select('id').eq('role', 'SUPER_ADMIN_JPP'),
    ]);
    const userIds = new Set<string>();
    jppMembers.data?.forEach(p => userIds.add(p.id));
    superAdmins.data?.forEach(a => userIds.add(a.id));
    
    if (userIds.size === 0) return;
    
    const rows = Array.from(userIds).map(user_id => ({ user_id, ...payload, is_read: false }));
    const { error } = await insertNotifications(rows);
    if (error) return;
    Array.from(userIds).forEach(uid => firePush(uid, payload).catch(() => {}));
  } catch (err) {
    console.error('[sendNotificationToJppAndSuperAdmin] Error:', err);
  }
}


