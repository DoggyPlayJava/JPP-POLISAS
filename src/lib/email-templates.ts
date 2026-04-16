export const emailLayout = (title: string, bodyHTML: string, preheader?: string) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#f4f4f5;">
    ${preheader ? `<div style="display:none;font-size:1px;color:#f4f4f5;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</div>` : ''}
    <div style="background-color:#f4f4f5;padding:40px 20px;text-align:center;">
        <table align="center" style="max-width:550px;margin:0 auto;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 25px -5px rgba(0,0,0,0.05);width:100%;border-collapse:collapse;" cellpadding="0" cellspacing="0">
            <tr>
                <td style="padding:40px 30px;text-align:center;border-bottom:1px solid #f1f5f9;background-color:#ffffff;">
                    <h1 style="color:#881B1B;font-size:26px;font-weight:900;margin:0;letter-spacing:-0.5px;">JPP POLISAS</h1>
                    <p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:3px;margin-top:6px;font-weight:800;margin-bottom:0;">Digital Portal</p>
                </td>
            </tr>
            <tr>
                <td style="padding:40px 30px;text-align:center;background-color:#ffffff;">
                    ${bodyHTML}
                </td>
            </tr>
            <tr>
                <td style="padding:24px 30px;background-color:#f8fafc;text-align:center;border-top:1px solid #f1f5f9;">
                    <p style="color:#94a3b8;font-size:12px;margin:0;font-weight:500;">&copy; ${new Date().getFullYear()} Jawatankuasa Perwakilan Pelajar POLISAS.<br/>Hak cipta terpelihara.</p>
                </td>
            </tr>
        </table>
    </div>
</body>
</html>
`;

export const applicationApprovedTemplate = (studentName: string, roleName: string, clubName: string) => {
  const body = `
      <h2 style="color:#0f172a;font-size:22px;font-weight:800;margin:0 0 20px 0;">Permohonan Berjaya! ✨</h2>
      <p style="color:#475569;font-size:16px;line-height:1.6;margin:0 0 20px 0;text-align:left;">
          Salam <strong>${studentName}</strong>,
      </p>
      <p style="color:#475569;font-size:16px;line-height:1.6;margin:0 0 25px 0;text-align:left;">
          Tahniah! Permohonan kepimpinan anda untuk menggalas peranan sebagai <strong style="color:#881B1B;">${roleName}</strong> bagi kelab/unit <strong>${clubName}</strong> telah rasmi <strong>diluluskan</strong> oleh penasihat.
      </p>
      <div style="margin:35px 0;">
          <a href="${window.location.origin}/dashboard" style="display:inline-block;background-color:#881B1B;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:16px 36px;border-radius:10px;text-transform:uppercase;letter-spacing:1px;box-shadow:0 4px 14px 0 rgba(136,27,27,0.39);">Ke Papan Pemuka</a>
      </div>
      <p style="color:#475569;font-size:14px;line-height:1.6;margin:0;text-align:left;">
          Sila log masuk untuk mengakses ciri pentadbiran kelab anda.
      </p>
  `;
  return emailLayout('Permohonan Diluluskan | JPP POLISAS', body, 'Tahniah! Permohonan anda telah berjaya diluluskan.');
};

export const generalNotificationTemplate = (title: string, message: string) => {
  const body = `
      <h2 style="color:#0f172a;font-size:22px;font-weight:800;margin:0 0 20px 0;">${title}</h2>
      <p style="color:#475569;font-size:16px;line-height:1.6;margin:0 0 30px 0;text-align:left;white-space:pre-wrap;">${message}</p>
      <div style="margin:20px 0;">
          <a href="${window.location.origin}/" style="display:inline-block;background-color:#0f172a;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;text-transform:uppercase;letter-spacing:1px;">Log Masuk Aplikasi</a>
      </div>
  `;
  return emailLayout(`${title} | JPP POLISAS`, body);
};
