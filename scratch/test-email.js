import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://api.cipher-node.org'; // Menggunakan URL self-hosted
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqa2xjeGZibW16eHNxdGlkanR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MTg3MDYsImV4cCI6MjA5MDI5NDcwNn0.gfIXNKnXZ5E03Sf1Xc9RuTPacxbr0NqVnbNyW__SDR4'; // Sila pastikan guna Anon Key yang betul

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("Sila jalankan ujian emel dari dalam aplikasi (UI) memandangkan endpoint /api/send-email kini dilindungi oleh sistem Auth (memerlukan Bearer Token).");
console.log("Untuk ujian automatik skrip ini, ia perlu log masuk (signInWithPassword) terlebih dahulu untuk mendapatkan token JWT sebelum membuat panggilan fetch ke https://api.cipher-node.org/api/send-email.");

const toEmail = process.argv[2] || 'amirulsyazwan146@gmail.com';

// Contoh cara ujian sekiranya mempunyai token:
// const response = await fetch('https://api.cipher-node.org/api/send-email', {
//   method: 'POST',
//   headers: {
//     'Content-Type': 'application/json',
//     'Authorization': `Bearer ${token}`
//   },
//   body: JSON.stringify({ to: toEmail, subject: 'Test', html: '<h1>Test</h1>' })
// });
