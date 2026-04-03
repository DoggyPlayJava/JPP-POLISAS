import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ujklcxfbmmzxsqtidjtz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqa2xjeGZibW16eHNxdGlkanR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MTg3MDYsImV4cCI6MjA5MDI5NDcwNn0.gfIXNKnXZ5E03Sf1Xc9RuTPacxbr0NqVnbNyW__SDR4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: users, error: err } = await supabase
    .from('profiles')
    .select('id, full_name, role, club_id')
    .ilike('full_name', '%SYUHADA%');
    
  console.log('Profiles:', users);

  for (const user of users || []) {
    const { data: memberships } = await supabase
      .from('student_club_memberships')
      .select('*')
      .eq('user_id', user.id);
    console.log(`Memberships for ${user.id}:`, memberships);
  }
}
check();
