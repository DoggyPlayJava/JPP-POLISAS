import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import webpush from "npm:web-push@3.6.7";

serve(async (req) => {
  // Preflight CORS request
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    });
  }

  try {
    const { subscription, title, body, data } = await req.json();

    // Dapatkan pembolehubah persekitaran (akan disetup melalui Supabase Secrets)
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:jpp@cipher-node.org';
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error("VAPID keys belum dikonfigurasi di dalam Supabase Secrets.");
    }

    // Daftarkan maklumat VAPID kepada spesifikasi web-push
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    // Bina bentuk payload (data tambahan PWA)
    const payload = JSON.stringify({
      title: title,
      body: body,
      data: data,
      icon: '/icon-192-maskable.png', 
      badge: '/icon-192-maskable.png'
    });

    // Menolak notifikasi ke pelayan push (contoh: pelayan Apple Push)
    const result = await webpush.sendNotification(subscription, payload);

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { 
        "Content-Type": "application/json",
        'Access-Control-Allow-Origin': '*'
      },
      status: 200,
    });
  } catch (error: any) {
    console.error("Push Notification Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 
        "Content-Type": "application/json",
        'Access-Control-Allow-Origin': '*'
      },
      status: 500,
    });
  }
});
