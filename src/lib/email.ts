import { supabase } from './supabase';
import { API_BASE_URL } from './utils';

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
}

/**
 * Hantar notifikasi emel penting menggunakan Resend
 * Fungsi ini akan memanggil Supabase Edge Function `send-email`
 */
export async function sendEmail({ to, subject, html }: SendEmailParams) {
  try {
    const authSession = await supabase.auth.getSession();
    const token = authSession.data.session?.access_token;

    const response = await fetch(`${API_BASE_URL}/api/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ to, subject, html })
    });
    
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || "Gagal menghubungi pelayan emel");
    }

    return { success: true, data };
  } catch (err: any) {
    console.error("Gagal menghantar emel:", err);
    return { success: false, error: err.message };
  }
}
