import { supabase } from './supabase';

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
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: { to, subject, html }
    });

    if (error) {
      console.error("Supabase edge function error:", error);
      throw new Error(error.message || "Gagal menghubungi pelayan emel");
    }
    
    return { success: true, data };
  } catch (err: any) {
    console.error("Gagal menghantar emel:", err);
    return { success: false, error: err.message };
  }
}
