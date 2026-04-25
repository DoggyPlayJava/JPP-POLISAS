import { KEBAJIKAN_THEME_COLOR } from '@/types';

/**
 * Generate an HTML email for when a Kebajikan Ticket is assigned to an Exco.
 */
export function generateTicketAssignedEmail(studentName: string, excoName: string, ticketNo: string, ticketUrl: string): string {
  const primaryColor = KEBAJIKAN_THEME_COLOR; // '#0D9488'
  const appUrl = window.location.origin; // e.g. https://portal.jpppolisas.com
  const fullTicketUrl = ticketUrl.startsWith('http') ? ticketUrl : `${appUrl}${ticketUrl}`;

  return `
<!DOCTYPE html>
<html lang="ms">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aduan Anda Sedang Diuruskan</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f1f5f9;
      margin: 0;
      padding: 0;
      color: #334155;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    .header {
      background-color: ${primaryColor};
      color: white;
      padding: 24px 32px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      padding: 32px;
      line-height: 1.6;
    }
    .greeting {
      font-size: 18px;
      font-weight: 600;
      color: #0f172a;
      margin-top: 0;
    }
    .message-box {
      background-color: #f8fafc;
      border-left: 4px solid ${primaryColor};
      padding: 16px;
      margin: 24px 0;
      border-radius: 0 4px 4px 0;
      font-size: 15px;
    }
    .ticket-badge {
      display: inline-block;
      background-color: #e2e8f0;
      color: #475569;
      padding: 4px 8px;
      border-radius: 4px;
      font-family: monospace;
      font-weight: bold;
      letter-spacing: 0.5px;
    }
    .cta-container {
      text-align: center;
      margin: 32px 0;
    }
    .btn {
      display: inline-block;
      background-color: ${primaryColor};
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
      transition: background-color 0.2s;
    }
    .btn:hover {
      background-color: #0f766e;
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px;
      text-align: center;
      font-size: 13px;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
    }
    .logo-text {
      font-weight: bold;
      color: #334155;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>E-Kebajikan JPP POLISAS</h1>
    </div>
    <div class="content">
      <p class="greeting">Salam ${studentName},</p>
      
      <p>Aduan anda dengan nombor tiket <span class="ticket-badge">${ticketNo}</span> kini sedang diambil tindakan oleh pihak kami.</p>
      
      <div class="message-box">
        <strong>Penting:</strong> Aduan anda sedang disemak dan diuruskan oleh Exco <strong>${excoName}</strong>. Beliau mungkin akan menghubungi anda melalui platform perbualan (chat) di dalam sistem untuk mendapatkan maklumat lanjut sekiranya perlu.
      </div>
      
      <p>Anda boleh log masuk ke portal untuk memantau status terkini aduan anda atau untuk membalas mesej dari Exco yang bertugas.</p>
      
      <div class="cta-container">
        <a href="${fullTicketUrl}" class="btn">Lihat & Balas Mesej</a>
      </div>
      
      <p>Terima kasih kerana menghubungi kami.<br>
      <em>Kami sedia membantu.</em></p>
    </div>
    <div class="footer">
      <p>Emel ini dijana secara automatik oleh <span class="logo-text">Sistem E-Kebajikan JPP POLISAS</span>. Sila jangan balas terus kepada emel ini.</p>
    </div>
  </div>
</body>
</html>
  `;
}
