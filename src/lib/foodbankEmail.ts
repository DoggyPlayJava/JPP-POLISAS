/**
 * foodbankEmail.ts — Templat emel premium untuk program Food Bank JPP POLISAS
 *
 * Tema: Maroon & Gold (selari dengan identiti JPP Polisas)
 *   - Maroon utama:  #871A1A
 *   - Maroon gelap:  #371010 (sidebar)
 *   - Emas:          #D19D1A / #EEA02B
 *
 * Templat adalah HTML inline (mesra klien emel seperti Gmail/Outlook).
 * Setiap fungsi mengembalikan { subject, html } untuk terus dihantar
 * melalui `sendEmail()` (src/lib/email.ts) → Resend.
 */

export type FoodBankEmailStatus = 'LULUS' | 'DITOLAK' | 'SELESAI' | 'MENUNGGU';

export interface FoodBankEmailItem {
  name: string;
  quantity: number;
  unit?: string;
}

export interface FoodBankEmailData {
  status: FoodBankEmailStatus;
  studentName: string;
  matricNo?: string | null;
  applicationNo: string;
  programme?: string | null;
  residence?: string | null;
  items?: FoodBankEmailItem[];
  pickupDate?: string | null;
  pickupTime?: string | null;
  location?: string | null;
  totalValue?: number | null;
  rejectionReason?: string | null;
  portalUrl?: string;
}

// ── Warna tema ────────────────────────────────────────────────────────────────
const C = {
  maroon: '#871A1A',
  maroonDark: '#371010',
  maroonDeep: '#4A1111',
  gold: '#D19D1A',
  goldLight: '#EEA02B',
  cream: '#FDF9F3',
  ink: '#2A1515',
  muted: '#8A6D6D',
  border: '#EFE3D8',
  white: '#FFFFFF',
};

const FONT = "'Manrope', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

// ── Status config (badge colour + label + icon) ──────────────────────────────
const STATUS_CONFIG: Record<FoodBankEmailStatus, { label: string; icon: string; badgeBg: string; badgeColor: string; hero: string }> = {
  LULUS: {
    label: 'DILULUSKAN',
    icon: '✓',
    badgeBg: '#FFF3D6',
    badgeColor: '#9A6A00',
    hero: '#871A1A',
  },
  DITOLAK: {
    label: 'DITOLAK',
    icon: '✕',
    badgeBg: '#FDE8E8',
    badgeColor: '#B91C1C',
    hero: '#7A1515',
  },
  SELESAI: {
    label: 'SELESAI DIAMBIL',
    icon: '★',
    badgeBg: '#E6F7EE',
    badgeColor: '#047857',
    hero: '#0F5A38',
  },
  MENUNGGU: {
    label: 'DITERIMA',
    icon: '…',
    badgeBg: '#FFF3D6',
    badgeColor: '#9A6A00',
    hero: '#871A1A',
  },
};

const esc = (s: string) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ── Barangan / maklumat asas ─────────────────────────────────────────────────
function infoRow(label: string, value: string) {
  return `
    <tr>
      <td style="padding:10px 16px;color:${C.muted};font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;white-space:nowrap;border-bottom:1px solid ${C.border};">${label}</td>
      <td style="padding:10px 16px;color:${C.ink};font-size:14px;font-weight:600;border-bottom:1px solid ${C.border};">${value}</td>
    </tr>`;
}

function itemsTable(items: FoodBankEmailItem[]) {
  const rows = items
    .map((it) => `
      <tr>
        <td style="padding:9px 16px;color:${C.ink};font-size:13px;font-weight:600;border-bottom:1px solid ${C.border};">${esc(it.name)}</td>
        <td style="padding:9px 16px;color:${C.muted};font-size:13px;text-align:right;border-bottom:1px solid ${C.border};white-space:nowrap;">${it.quantity} ${esc(it.unit || 'unit')}</td>
      </tr>`)
    .join('');
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:12px;">
      <tr>
        <td style="padding:10px 16px;background:${C.cream};color:${C.maroon};font-size:12px;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;border-radius:10px 10px 0 0;">Barangan Diluluskan</td>
      </tr>
      ${rows}
    </table>`;
}

// ── Pembina utama ────────────────────────────────────────────────────────────
export function buildFoodBankEmail(data: FoodBankEmailData): { subject: string; html: string } {
  const cfg = STATUS_CONFIG[data.status];
  const portalUrl = data.portalUrl || 'https://jpp-polisas.cipher-node.org/portal';

  const subjectMap: Record<FoodBankEmailStatus, string> = {
    LULUS: `✅ Permohonan Food Bank ${data.applicationNo} Telah DILULUSKAN`,
    DITOLAK: `ℹ️ Kemaskini Permohonan Food Bank ${data.applicationNo}`,
    SELESAI: `🎉 Bantuan Food Bank ${data.applicationNo} Telah Diambil`,
    MENUNGGU: `📩 Permohonan Food Bank ${data.applicationNo} Telah Diterima`,
  };

  // Blok maklumat pengambilan (hanya untuk LULUS / SELESAI / MENUNGGU)
  const pickupBlock =
    (data.pickupDate || data.pickupTime || data.location) && data.status !== 'DITOLAK'
      ? `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:12px;">
          <tr>
            <td style="padding:10px 16px;background:${C.cream};color:${C.maroon};font-size:12px;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;border-radius:10px 10px 0 0;">Maklumat Pengambilan</td>
          </tr>
          ${data.pickupDate ? infoRow('Tarikh', data.pickupDate) : ''}
          ${data.pickupTime ? infoRow('Masa', data.pickupTime) : ''}
          ${data.location ? infoRow('Lokasi', data.location) : ''}
        </table>`
      : '';

  // Blok sebab penolakan
  const rejectBlock =
    data.status === 'DITOLAK' && data.rejectionReason
      ? `
        <div style="margin-top:16px;padding:14px 16px;background:${cfg.badgeBg};border-left:4px solid ${cfg.badgeColor};border-radius:10px;">
          <p style="margin:0;color:${cfg.badgeColor};font-size:13px;font-weight:700;">Sebab penolakan:</p>
          <p style="margin:4px 0 0;color:${C.ink};font-size:14px;">${esc(data.rejectionReason)}</p>
        </div>`
      : '';

  const itemsBlock = data.items && data.items.length > 0 ? itemsTable(data.items) : '';

  const cta =
    data.status === 'LULUS'
      ? `
        <div style="margin-top:24px;text-align:center;">
          <a href="${portalUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,${C.gold} 0%,${C.goldLight} 100%);color:${C.maroonDark};font-size:14px;font-weight:800;letter-spacing:0.04em;text-decoration:none;border-radius:999px;">Muat Turun Pas QR Anda</a>
          <p style="margin:12px 0 0;color:${C.muted};font-size:12px;">Sila bawa pas QR ini semasa pengambilan barangan.</p>
        </div>`
      : '';

  const html = `
  <!DOCTYPE html>
  <html lang="ms">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin:0;padding:0;background:#F4EDE6;">
    <div style="background:#F4EDE6;padding:32px 16px;font-family:${FONT};">
      <div style="max-width:600px;margin:0 auto;background:${C.white};border-radius:20px;overflow:hidden;box-shadow:0 12px 40px rgba(55,16,16,0.12);">

        <!-- Header hero -->
        <div style="background:linear-gradient(135deg,${C.maroon} 0%,${C.maroonDeep} 55%,${C.maroonDark} 100%);padding:36px 32px 28px;text-align:center;">
          <div style="display:inline-block;background:linear-gradient(135deg,${C.gold} 0%,${C.goldLight} 100%);color:${C.maroonDark};font-size:11px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;padding:6px 16px;border-radius:999px;">JPP Polisas · Food Bank</div>
          <h1 style="margin:18px 0 4px;color:${C.white};font-size:24px;font-weight:800;line-height:1.3;">${cfg.label}</h1>
          <p style="margin:0;color:rgba(255,255,255,0.78);font-size:13px;font-weight:500;">Program Bantuan Makanan Mahasiswa POLISAS</p>
        </div>

        <!-- Body -->
        <div style="padding:32px;">
          <div style="text-align:center;margin-bottom:24px;">
            <div style="display:inline-flex;align-items:center;gap:10px;background:${cfg.badgeBg};color:${cfg.badgeColor};font-size:13px;font-weight:800;padding:10px 20px;border-radius:999px;">
              <span style="font-size:16px;">${cfg.icon}</span> ${cfg.label}
            </div>
          </div>

          <p style="margin:0 0 20px;color:${C.ink};font-size:15px;font-weight:600;line-height:1.6;">
            Salam sejahtera, <strong>${esc(data.studentName)}</strong>.
          </p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid ${C.border};border-radius:12px;overflow:hidden;">
            ${infoRow('No. Permohonan', data.applicationNo)}
            ${data.matricNo ? infoRow('No. Matrik', data.matricNo) : ''}
            ${data.programme ? infoRow('Program', data.programme) : ''}
            ${data.residence ? infoRow('Kediaman', data.residence) : ''}
          </table>

          ${itemsBlock}
          ${pickupBlock}
          ${rejectBlock}
          ${cta}

          <div style="margin-top:28px;padding-top:20px;border-top:1px solid ${C.border};text-align:center;">
            <p style="margin:0;color:${C.muted};font-size:11px;line-height:1.6;">
              Emel ini dihantar secara automatik oleh sistem Food Bank JPP Polisas.<br/>
              Sekiranya anda mempunyai sebarang pertanyaan, sila hubungi Exco Kebajikan JPP.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background:${C.maroonDark};padding:20px 32px;text-align:center;">
          <p style="margin:0;color:${C.gold};font-size:12px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;">JPP Polisas</p>
          <p style="margin:4px 0 0;color:rgba(255,255,255,0.55);font-size:11px;">Bersama Membina Kesejahteraan Mahasiswa</p>
        </div>

      </div>
    </div>
  </body>
  </html>`;

  return { subject: subjectMap[data.status], html };
}

// ── Helper ringkas untuk penghantaran pantas ─────────────────────────────────
export function foodBankEmailForStatus(
  status: FoodBankEmailStatus,
  data: Omit<FoodBankEmailData, 'status'>
) {
  return buildFoodBankEmail({ ...data, status });
}
