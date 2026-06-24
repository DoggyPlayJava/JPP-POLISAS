// Test script: send a test webhook request via pg_net to check if the secret works
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL || 'postgresql://postgres.psnhxjuuhgpbgkjagjhq:jpp-polisas-db-2025!@100.104.229.84:5432/postgres'
});

async function main() {
  const client = await pool.connect();
  try {
    // 1. Check what the trigger function would extract
    const settingsCheck = await client.query(`
      SELECT 
        key,
        jsonb_typeof(value) as jtype,
        value->>0 as extracted_value,
        value #>> '{}' as root_value
      FROM public.system_settings 
      WHERE key IN ('api_base_url', 'webhook_secret')
    `);
    console.log('=== system_settings values ===');
    settingsCheck.rows.forEach(r => {
      console.log(`  ${r.key}: type=${r.jtype}, value->>0="${r.extracted_value}", root="${r.root_value}"`);
    });

    // 2. Fire a test webhook via pg_net
    console.log('\n=== Sending test webhook via pg_net ===');
    const sendResult = await client.query(`
      SELECT http_post FROM net.http_post(
        'https://jpp.cipher-node.org/api/polysuara-new-confession-notify',
        '{"type":"INSERT","table":"test","schema":"public","record":{}}'::jsonb,
        '{}'::jsonb,
        '{"Content-Type":"application/json","x-webhook-secret":"f5e193c6de54ab1dde87f7990302b343a9055de6ed180e0e76cb777f2af9a748"}'::jsonb,
        5000
      );
    `);
    const requestId = sendResult.rows[0]?.http_post;
    console.log(`  Request ID: ${requestId}`);

    // 3. Wait for response
    console.log('  Waiting 6 seconds for response...');
    await new Promise(resolve => setTimeout(resolve, 6000));

    // 4. Check response
    const responseResult = await client.query(`
      SELECT id, status_code, content, timed_out, error_msg 
      FROM net._http_response 
      WHERE id = $1
    `, [requestId]);

    if (responseResult.rows.length === 0) {
      console.log('  No response yet (request may still be pending)');
    } else {
      const resp = responseResult.rows[0];
      console.log(`  Status: ${resp.status_code}`);
      console.log(`  Content: ${resp.content}`);
      console.log(`  Timed out: ${resp.timed_out}`);
      if (resp.error_msg) console.log(`  Error: ${resp.error_msg}`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
