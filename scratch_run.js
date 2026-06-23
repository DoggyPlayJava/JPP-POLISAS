import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  console.log("Checking system_settings as ANON...");
  
  const supabaseAnon = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  const { data: anonData, error: anonErr } = await supabaseAnon
    .from('system_settings')
    .select('key, value');
  console.log("system_settings query as ANON:", { data: anonData, error: anonErr });
}

run();
