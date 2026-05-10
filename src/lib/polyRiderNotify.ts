/**
 * polyRiderNotify.ts
 * Helper untuk hantar push notification yang targeted dalam PolyRider.
 * Semua calls guna /api/polyrider-notify (bug-free, multi-device, multi-user).
 */

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

interface NotifyOptions {
  tag?: string;
  url?: string;
}

/**
 * Hantar push notification kepada senarai userIds tertentu.
 */
export async function notifyUsers(
  token: string,
  userIds: string[],
  title: string,
  body: string,
  options?: NotifyOptions
): Promise<void> {
  if (!token || !userIds.length) return;
  try {
    await fetch(`${API_URL}/api/polyrider-notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        userIds,
        title,
        body,
        tag: options?.tag ?? 'polyrider',
        url: options?.url ?? '/polyrider',
      }),
    });
  } catch (e) {
    console.warn('[polyRiderNotify] notifyUsers failed:', e);
  }
}

/**
 * Hantar kepada semua rider yang sedang ON-DUTY (is_active=true, status=APPROVED).
 * Digunakan bila job baru dicipta atau harga dinaikkan.
 */
export async function notifyAllActiveRiders(
  token: string,
  supabase: any,
  title: string,
  body: string,
  options?: NotifyOptions
): Promise<void> {
  if (!token) return;
  try {
    const { data: riders } = await supabase
      .from('polyrider_profiles')
      .select('user_id')
      .eq('status', 'APPROVED')
      .eq('is_active', true);

    const riderIds: string[] = (riders ?? []).map((r: any) => r.user_id);
    if (!riderIds.length) return;

    await notifyUsers(token, riderIds, title, body, {
      tag: options?.tag ?? 'polyrider-job',
      url: options?.url ?? '/polyrider/rider',
    });
  } catch (e) {
    console.warn('[polyRiderNotify] notifyAllActiveRiders failed:', e);
  }
}

/**
 * Hantar kepada rider-rider yang telah bid pada job tertentu.
 * Digunakan bila job dibatalkan atau harga berubah.
 */
export async function notifyBiddingRiders(
  token: string,
  supabase: any,
  jobId: string,
  title: string,
  body: string,
  options?: NotifyOptions
): Promise<void> {
  if (!token || !jobId) return;
  try {
    const { data: bids } = await supabase
      .from('polyrider_bids')
      .select('rider_id')
      .eq('job_id', jobId)
      .in('status', ['PENDING']);

    const riderIds: string[] = (bids ?? []).map((b: any) => b.rider_id);
    if (!riderIds.length) return;

    await notifyUsers(token, riderIds, title, body, {
      tag: options?.tag ?? 'polyrider-bid',
      url: options?.url ?? '/polyrider/rider',
    });
  } catch (e) {
    console.warn('[polyRiderNotify] notifyBiddingRiders failed:', e);
  }
}
