const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ujklcxfbmmzxsqtidjtz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqa2xjeGZibW16eHNxdGlkanR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MTg3MDYsImV4cCI6MjA5MDI5NDcwNn0.gfIXNKnXZ5E03Sf1Xc9RuTPacxbr0NqVnbNyW__SDR4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log('Connecting to Supabase...');
  const { data: tickets, error: fetchErr } = await supabase
    .from('kebajikan_tickets')
    .select('id, ticket_no, status');

  if (fetchErr) {
    console.error('Error fetching tickets:', fetchErr);
    return;
  }

  console.log(`Found ${tickets.length} total tickets.`);
  if (tickets.length > 0) {
    const statuses = [...new Set(tickets.map(t => t.status))];
    console.log('Statuses found:', statuses);
  }
}

run();
