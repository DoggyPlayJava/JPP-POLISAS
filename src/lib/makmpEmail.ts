/**
 * makmpEmail.ts — Templat emel premium untuk keputusan MAKMP
 * Tema Maroon & Gold (selari identiti JPP Polisas).
 */

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

const esc = (s: string) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export interface MakmpEmailData {
  status: 'DISAHKAN' | 'DITOLAK';
  studentName: string;
  matricNo?: string | null;
  awardName: string;
  totalMerit?: number | null;
  reason?: string | null;
  portalUrl?: string;
}

function infoRow(label: string, value: string) {
  return `
    <tr>
      <td style="padding:10px 16px;color:${C.muted};font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;white-space:nowrap;border-bottom:1px solid ${C.border};">${label}</td>
      <td style="padding:10px 16px;color:${C.ink};font-size:14px;font-weight:600;border-bottom:1px solid ${C.border};">${value}</td>
    </tr>`;
}

export function buildMakmpEmail(data: MakmpEmailData): { subject: string; html: string } {
  const approved = data.status === 'DISAHKAN';
  const portalUrl = data.portalUrl || 'https://jpp-polisas.cipher-node.org/portal';

  const badge = approved
    ? { label: 'DISAHKAN', icon: '✓', bg: '#FFF3D6', color: '#9A6A00' }
    : { label: 'DITOLAK', icon: '✕', bg: '#FDE8E8', color: '#B91C1C' };

  const subject = approved
    ? `✅ Permohonan MAKMP "${data.awardName}" Telah Disahkan`
    : `ℹ️ Kemaskini Permohonan MAKMP "${data.awardName}"`;

  const meritRow = approved && data.totalMerit != null
    ? infoRow('Jumlah Merit', `+${data.totalMerit} merit`)
    : '';

  const reasonBlock = !approved && data.reason
    ? `
      <div style="margin-top:16px;padding:14px 16px;background:${badge.bg};border-left:4px solid ${badge.color};border-radius:10px;">
        <p style="margin:0;color:${badge.color};font-size:13px;font-weight:700;">Sebab penolakan:</p>
        <p style="margin:4px 0 0;color:${C.ink};font-size:14px;">${esc(data.reason)}</p>
      </div>`
    : '';

  const html = `
  <!DOCTYPE html>
  <html lang="ms">
  <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
  <body style="margin:0;padding:0;background:#F4EDE6;">
    <div style="background:#F4EDE6;padding:32px 16px;font-family:${FONT};">
      <div style="max-width:600px;margin:0 auto;background:${C.white};border-radius:20px;overflow:hidden;box-shadow:0 12px 40px rgba(55,16,16,0.12);">
        <div style="background:linear-gradient(135deg,${C.maroon} 0%,${C.maroonDeep} 55%,${C.maroonDark} 100%);padding:36px 32px 28px;text-align:center;">
          <div style="display:inline-block;background:linear-gradient(135deg,${C.gold} 0%,${C.goldLight} 100%);color:${C.maroonDark};font-size:11px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;padding:6px 16px;border-radius:999px;">JPP Polisas · MAKMP</div>
          <h1 style="margin:18px 0 4px;color:${C.white};font-size:24px;font-weight:800;line-height:1.3;">${badge.label}</h1>
          <p style="margin:0;color:rgba(255,255,255,0.78);font-size:13px;font-weight:500;">Majlis Anugerah Kecemerlangan Mahasiswa POLISAS</p>
        </div>
        <div style="padding:32px;">
          <div style="text-align:center;margin-bottom:24px;">
            <div style="display:inline-flex;align-items:center;gap:10px;background:${badge.bg};color:${badge.color};font-size:13px;font-weight:800;padding:10px 20px;border-radius:999px;">
              <span style="font-size:16px;">${badge.icon}</span> ${badge.label}
            </div>
          </div>
          <p style="margin:0 0 20px;color:${C.ink};font-size:15px;font-weight:600;line-height:1.6;">Salam sejahtera, <strong>${esc(data.studentName)}</strong>.</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid ${C.border};border-radius:12px;overflow:hidden;">
            ${infoRow('Anugerah', data.awardName)}
            ${data.matricNo ? infoRow('No. Matrik', data.matricNo) : ''}
            ${meritRow}
          </table>
          ${reasonBlock}
          <div style="margin-top:24px;text-align:center;">
            <a href="${portalUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,${C.gold} 0%,${C.goldLight} 100%);color:${C.maroonDark};font-size:14px;font-weight:800;letter-spacing:0.04em;text-decoration:none;border-radius:999px;">Lihat Status Permohonan</a>
          </div>
          <div style="margin-top:28px;padding-top:20px;border-top:1px solid ${C.border};text-align:center;">
            <p style="margin:0;color:${C.muted};font-size:11px;line-height:1.6;">Emel ini dihantar secara automatik oleh sistem MAKMP JPP Polisas.<br/>Sebarang pertanyaan, sila hubungi urus setia MAKMP.</p>
          </div>
        </div>
        <div style="background:${C.maroonDark};padding:20px 32px;text-align:center;">
          <p style="margin:0;color:${C.gold};font-size:12px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;">JPP Polisas</p>
          <p style="margin:4px 0 0;color:rgba(255,255,255,0.55);font-size:11px;">Bersama Membina Kesejahteraan Mahasiswa</p>
        </div>
      </div>
    </div>
  </body>
  </html>`;

  return { subject, html };
}
