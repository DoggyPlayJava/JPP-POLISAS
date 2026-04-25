const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Extract url and anon key from src/lib/supabase.ts
const supabaseUrl = 'https://ujklcxfbmmzxsqtidjtz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqa2xjeGZibW16eHNxdGlkanR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MTg3MDYsImV4cCI6MjA5MDI5NDcwNn0.gfIXNKnXZ5E03Sf1Xc9RuTPacxbr0NqVnbNyW__SDR4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log('Connecting to Supabase...');
  // Check how many we have
  const { data: tickets, error: fetchErr } = await supabase
    .from('kebajikan_tickets')
    .select('id, ticket_no, status')
    .eq('status', 'CLOSED');

  if (fetchErr) {
    console.error('Error fetching tickets:', fetchErr);
    return;
  }

  console.log(`Found ${tickets.length} closed tickets.`);

  if (tickets.length > 0) {
    console.log('Attempting to delete...');
    const { error: deleteErr } = await supabase
      .from('kebajikan_tickets')
      .delete()
      .eq('status', 'CLOSED');

    if (deleteErr) {
      console.error('Error deleting tickets. RLS might be blocking this:', deleteErr);
    } else {
      console.log('Successfully deleted closed tickets.');
    }
  }
}

run();
