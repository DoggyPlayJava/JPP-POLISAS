import { KEBAJIKAN_THEME_COLOR } from '@/types';

/**
 * Generate an HTML email for when a Kebajikan Ticket is assigned to an Exco.
 */
export function generateTicketAssignedEmail(studentName: string, excoName: string, ticketNo: string, ticketUrl: string): string {
  const primaryColor = KEBAJIKAN_THEME_COLOR; // '#0D9488'
  const appUrl = window.location.origin;
  const fullTicketUrl = ticketUrl.startsWith('http') ? ticketUrl : `${appUrl}${ticketUrl}`;
  const year = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html lang="ms">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aduan Anda Sedang Diuruskan</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5; margin: 0; padding: 0; color: #334155; }
    .container { max-width: 550px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
    .header { padding: 40px 30px; text-align: center; border-bottom: 1px solid #f1f5f9; }
    .header h1 { color: ${primaryColor}; font-size: 26px; font-weight: 900; margin: 0; letter-spacing: -0.5px; }
    .header .sub { color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 3px; margin-top: 6px; font-weight: 800; }
    .content { padding: 40px 30px; background-color: #ffffff; text-align: center; }
    .icon-box { width: 64px; height: 64px; background-color: #f0fdfa; border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 24px; }
    .icon-box span { font-size: 32px; }
    .status-title { font-size: 22px; font-weight: 800; margin: 0 0 16px 0; color: #0f172a; }
    .details-table { width: 100%; border-collapse: collapse; margin: 20px 0; text-align: left; }
    .details-table td { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
    .details-table td.label { color: #64748b; width: 100px; }
    .details-table td.value { font-weight: 600; color: #0f172a; }
    .details-table td.value a { color: ${primaryColor}; text-decoration: none; font-weight: 700; }
    .details-table td.value a:hover { text-decoration: underline; }
    .alert-box { margin: 24px 0; padding: 16px; border-radius: 10px; border: 1px solid #99f6e4; background: #f0fdfa; }
    .alert-box p { margin: 0; }
    .alert-box .alert-title { font-size: 14px; font-weight: 600; color: #0d9488; }
    .alert-box .alert-msg { margin-top: 8px; font-size: 13px; color: #0f766e; }
    .cta-container { text-align: center; margin: 32px 0 0; }
    .btn { display: inline-block; background-color: ${primaryColor}; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 700; font-size: 15px; }
    .btn:hover { background-color: #0f766e; }
    .footer { padding: 24px 30px; background-color: #f8fafc; text-align: center; border-top: 1px solid #f1f5f9; }
    .footer p { color: #94a3b8; font-size: 12px; margin: 0; font-weight: 500; }
    .footer .auto-note { margin-top: 8px; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>E-KEBAJIKAN</h1>
      <p class="sub">JPP POLISAS</p>
    </div>
    <div class="content">
      <div class="icon-box"><span>📋</span></div>
      <div class="status-title">Aduan Anda Sedang Diuruskan</div>
      <table class="details-table">
        <tr><td class="label">No. Tiket</td><td class="value"><a href="${fullTicketUrl}">${ticketNo}</a></td></tr>
        <tr><td class="label">Tajuk</td><td class="value">${ticketTitle}</td></tr>
        <tr><td class="label">Nama</td><td class="value">${studentName}</td></tr>
        <tr><td class="label">Exco</td><td class="value">${excoName}</td></tr>
      </table>
      <div class="alert-box">
        <p class="alert-title">📩 Dipantau oleh Exco</p>
        <p class="alert-msg">Aduan anda sedang diuruskan oleh ${excoName}. Sila log masuk ke portal untuk berbual atau memberi maklumat lanjut.</p>
      </div>
      <div class="cta-container">
        <a href="${fullTicketUrl}" class="btn">Lihat & Balas Mesej</a>
      </div>
    </div>
    <div class="footer">
      <p>&copy; ${year} Jawatankuasa Perwakilan Pelajar POLISAS. Hak cipta terpelihara.</p>
      <p class="auto-note">Emel ini dijana secara automatik. Sila jangan balas terus kepada emel ini.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate an HTML email for notifying Exco Kebajikan about ticket updates (New, SLA, Escalate, Reopen).
 */
export function generateStaffNotificationEmail(
  type: 'NEW' | 'WARNING' | 'ESCALATION' | 'REOPEN',
  ticketNo: string,
  ticketTitle: string,
  studentName: string,
  ticketUrl: string,
  additionalInfo?: string
): string {
  const primaryColor = KEBAJIKAN_THEME_COLOR; // '#0D9488'
  const appUrl = window.location.origin;
  const fullTicketUrl = ticketUrl.startsWith('http') ? ticketUrl : `${appUrl}${ticketUrl}`;
  const year = new Date().getFullYear();

  let title = '';
  let iconEmoji = '';
  let alertTitle = '';
  let alertMsg = '';

  switch (type) {
    case 'NEW':
      title = 'Aduan Baharu Diterima';
      iconEmoji = '📣';
      alertTitle = '⚠️ Tindakan diperlukan';
      alertMsg = 'Sila log masuk ke portal E-Kebajikan untuk mengambil tindakan.';
      break;
    case 'WARNING':
      title = '⚠️ Amaran SLA (48 Jam)';
      iconEmoji = '⏰';
      alertTitle = '⏳ Tindakan segera diperlukan';
      alertMsg = 'Tiket ini belum menerima sebarang kemaskini melebihi 48 jam. Sila ambil tindakan segera.';
      break;
    case 'ESCALATION':
      title = '🔴 Auto-Escalation (72 Jam)';
      iconEmoji = '🚨';
      alertTitle = '🔴 Tiket telah diescalate';
      alertMsg = 'Sistem telah auto-escalate tiket ini kerana tiada tindakan selama lebih 72 jam.';
      break;
    case 'REOPEN':
      title = 'Permohonan Buka Semula (Reopen)';
      iconEmoji = '🔄';
      alertTitle = '🔄 Permohonan buka semula';
      alertMsg = 'Pelajar telah memohon untuk membuka semula tiket ini. Sila semak kelulusan.';
      break;
  }

  return `
<!DOCTYPE html>
<html lang="ms">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - ${ticketNo}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5; margin: 0; padding: 0; color: #334155; }
    .container { max-width: 550px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
    .header { padding: 40px 30px; text-align: center; border-bottom: 1px solid #f1f5f9; background-color: #ffffff; }
    .header h1 { color: ${primaryColor}; font-size: 26px; font-weight: 900; margin: 0; letter-spacing: -0.5px; }
    .header .sub { color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 3px; margin-top: 6px; font-weight: 800; }
    .content { padding: 40px 30px; background-color: #ffffff; text-align: center; }
    .icon-box { width: 64px; height: 64px; border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 24px; }
    .status-title { font-size: 22px; font-weight: 800; margin: 0 0 16px 0; color: #0f172a; }
    .details-table { width: 100%; border-collapse: collapse; margin: 20px 0; text-align: left; }
    .details-table td { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
    .details-table td.label { color: #64748b; width: 100px; }
    .details-table td.value { font-weight: 600; color: #0f172a; }
    .details-table td.value a { color: ${primaryColor}; text-decoration: none; font-weight: 700; }
    .details-table td.value a:hover { text-decoration: underline; }
    .alert-box { margin: 24px 0; padding: 16px; border-radius: 10px; border: 1px solid; }
    .alert-box .alert-title { font-size: 14px; font-weight: 600; margin: 0; }
    .alert-box .alert-msg { margin-top: 8px; font-size: 13px; }
    .cta-container { text-align: center; margin: 32px 0 0; }
    .btn { display: inline-block; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 700; font-size: 15px; }
    .btn:hover { opacity: 0.9; }
    .footer { padding: 24px 30px; background-color: #f8fafc; text-align: center; border-top: 1px solid #f1f5f9; }
    .footer p { color: #94a3b8; font-size: 12px; margin: 0; font-weight: 500; }
    .footer .auto-note { margin-top: 8px; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>E-KEBAJIKAN</h1>
      <p class="sub">JPP POLISAS</p>
    </div>
    <div class="content">
      <div class="icon-box" style="background-color:${type === 'NEW' ? '#f0fdfa' : type === 'WARNING' ? '#fffbeb' : type === 'ESCALATION' ? '#fef2f2' : '#eef2ff'};"><span>${iconEmoji}</span></div>
      <div class="status-title">${title}</div>
      <table class="details-table">
        <tr><td class="label">No. Tiket</td><td class="value"><a href="${fullTicketUrl}">${ticketNo}</a></td></tr>
        <tr><td class="label">Tajuk Aduan</td><td class="value">${ticketTitle}</td></tr>
        <tr><td class="label">Nama Pelajar</td><td class="value">${studentName}</td></tr>
        ${additionalInfo ? `<tr><td class="label">Nota</td><td class="value">${additionalInfo}</td></tr>` : ''}
      </table>
      <div class="alert-box" style="background-color:${type === 'NEW' ? '#f0fdfa' : type === 'WARNING' ? '#fffbeb' : type === 'ESCALATION' ? '#fef2f2' : '#eef2ff'};border-color:${type === 'NEW' ? '#99f6e4' : type === 'WARNING' ? '#fde68a' : type === 'ESCALATION' ? '#fecaca' : '#c7d2fe'};">
        <p class="alert-title" style="color:${type === 'NEW' ? '#0d9488' : type === 'WARNING' ? '#d97706' : type === 'ESCALATION' ? '#dc2626' : '#6366f1'};">${alertTitle}</p>
        <p class="alert-msg" style="color:${type === 'NEW' ? '#0f766e' : type === 'WARNING' ? '#92400e' : type === 'ESCALATION' ? '#991b1b' : '#4338ca'};">${alertMsg}</p>
      </div>
      <div class="cta-container">
        <a href="${fullTicketUrl}" class="btn" style="background-color:${primaryColor};">Buka Tiket</a>
      </div>
    </div>
    <div class="footer">
      <p>&copy; ${year} Jawatankuasa Perwakilan Pelajar POLISAS. Hak cipta terpelihara.</p>
      <p class="auto-note">Emel ini dijana secara automatik. Sila jangan balas terus kepada emel ini.</p>
    </div>
  </div>
</body>
</html>
  `;
}
