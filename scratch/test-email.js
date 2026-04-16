import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ujklcxfbmmzxsqtidjtz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqa2xjeGZibW16eHNxdGlkanR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MTg3MDYsImV4cCI6MjA5MDI5NDcwNn0.gfIXNKnXZ5E03Sf1Xc9RuTPacxbr0NqVnbNyW__SDR4';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("Menghantar emel ujian ke alamat anda...");

const toEmail = process.argv[2] || 'amirulsyazwan146@gmail.com';

try {
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: { 
      to: toEmail, 
      subject: 'Ujian Resend JPP POLISAS', 
      html: '<h1>Tahniah!</h1><p>Emel Resend Edge Function anda telah berjaya berfungsi dengan lancar di pengeluaran sebenar!</p>' 
    }
  });

  if (error) {
    console.error("❌ Ralat pengujian emel:", error.message || error);
  } else {
    console.log("✅ Emel ujian berjaya dihantar!", data);
  }
} catch (e) {
  console.error("Ralat fatal:", e.message);
}
