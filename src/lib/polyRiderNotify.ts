/**
 * polyRiderNotify.ts
 * Helper untuk hantar push notification yang targeted dalam PolyRider.
 * Semua calls guna /api/polyrider-notify (bug-free, multi-device, multi-user).
 */

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
import { sendEmail } from './email';
import i18n from '@/lib/i18n';

const t = (k: string, fb: string, opt?: any): string =>
  (i18n.isInitialized ? (i18n.t(k, { defaultValue: fb, ...opt }) as string) : fb);

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

/**
 * Hantar emel notifikasi kepada Exco KLK apabila akaun digantung (ban)
 */
export async function notifyKLKOnSuspension(
  supabase: any,
  studentName: string,
  matricNo: string,
  reason: string
): Promise<void> {
  try {
    const { data: klkUsers } = await supabase
      .from('profiles')
      .select('email')
      .eq('role', 'JPP')
      .eq('jpp_unit', 'KLS')
      .not('email', 'is', null);

    if (!klkUsers || !klkUsers.length) return;
    
    const emails = klkUsers.map((u: any) => u.email);
    const valName = studentName || t('gig:unknown', 'Tidak diketahui');
    const valMatric = matricNo || t('gig:not_stated', 'Tidak dinyatakan');
    const emailTitle = t('gig:email_suspension_title', 'Notifikasi Sistem: Penggantungan Akaun PolyRider');
    const emailIntro = t('gig:email_suspension_intro', 'Akaun pelajar berikut telah digantung secara automatik atau melalui tindakan amaran (SOS Khianat):');
    const nameLabel = t('gig:label_name', 'Nama:');
    const matricLabel = t('gig:label_matric', 'No. Matrik:');
    const reasonLabel = t('gig:label_reason', 'Sebab:');
    const emailFooter = t('gig:email_suspension_footer', 'Akaun ini digantung selama 24 jam. Pelajar boleh membuat rayuan menerusi aplikasi yang akan dipaparkan pada Dashboard KLK anda.');
    const html = `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2 style="color: #dc2626;">${emailTitle}</h2>
        <p>${emailIntro}</p>
        <div style="background-color: #fef2f2; border: 1px solid #fca5a5; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <ul style="list-style: none; padding: 0; margin: 0;">
            <li style="margin-bottom: 8px;"><strong>${nameLabel}</strong> ${valName}</li>
            <li style="margin-bottom: 8px;"><strong>${matricLabel}</strong> ${valMatric}</li>
            <li><strong>${reasonLabel}</strong> ${reason}</li>
          </ul>
        </div>
        <p style="color: #475569; font-size: 14px;">${emailFooter}</p>
      </div>
    `;
    
    await sendEmail({
      to: emails,
      subject: t('gig:account_suspension_warning', '[PolyRider] Amaran: Penggantungan Akaun - {{name}}', { name: studentName }),
      html
    });
  } catch (e) {
    console.error('[polyRiderNotify] notifyKLKOnSuspension failed:', e);
  }
}
