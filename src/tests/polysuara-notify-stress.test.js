/**
 * PolySuara Notification Stress Test
 * Jalankan: node src/tests/polysuara-notify-stress.test.js
 * 
 * Test ini simulate 60 concurrent webhooks serentak dan verifikasi
 * bahawa hanya 1 notifikasi sahaja yang dihantar.
 */

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'f5e193c6de54ab1dde87f7990302b343a9055de6ed180e0e76cb777f2af9a748';
const BASE_URL = 'http://localhost:3000'; // local server

const FAKE_AUTHOR_ID = '00000000-0000-0000-0000-000000000001';

function makePayload(type = 'INSERT', extra = {}) {
  return {
    type,
    table: 'polysuara_confessions',
    schema: 'public',
    record: {
      id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      author_id: FAKE_AUTHOR_ID,
      category: 'UMUM',
      codename: 'Hantu_Test',
      content: 'Ini adalah confession ujian dari stress test. Jangan panik.',
      upvotes: extra.upvotes ?? 0,
      created_at: new Date().toISOString(),
    },
    old_record: null,
  };
}

async function fireWebhook(payload, label) {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/api/polysuara-new-confession-notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': WEBHOOK_SECRET,
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    const ms = Date.now() - start;
    return { label, status: res.status, json, ms };
  } catch (e) {
    return { label, error: e.message };
  }
}

async function runTest(name, payloads) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  TEST: ${name}`);
  console.log('═'.repeat(60));

  const results = await Promise.all(
    payloads.map((p, i) => fireWebhook(p.payload, `req-${i + 1} [${p.label}]`))
  );

  let sentCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const r of results) {
    const icon = r.error ? '❌' : r.json?.sent > 0 ? '📣' : '🔇';
    const detail = r.error
      ? r.error
      : `sent:${r.json?.sent ?? '?'} | ${JSON.stringify(r.json).slice(0, 80)}`;
    console.log(`  ${icon} ${r.label} (${r.ms ?? '?'}ms) → ${detail}`);

    if (r.json?.sent > 0) sentCount++;
    else if (r.error) errorCount++;
    else skippedCount++;
  }

  console.log(`\n  📊 SUMMARY → Sent: ${sentCount} | Skipped: ${skippedCount} | Errors: ${errorCount}`);

  return { sentCount, skippedCount, errorCount };
}

async function main() {
  console.log('🔬 PolySuara Notification Stress Test');
  console.log(`   Server: ${BASE_URL}`);
  console.log(`   Masa: ${new Date().toLocaleString('ms-MY')}\n`);

  // ─── Test 1: 60 concurrent INSERTs dengan upvotes=0 ─────────────────────
  // Expected: throttled/skipped (ada state cooldown), atau 1 send (jika 3h fallback active)
  const test1Payloads = Array.from({ length: 60 }, (_, i) => ({
    label: `confession-${i + 1}`,
    payload: makePayload('INSERT'),
  }));

  const t1 = await runTest('60 Concurrent INSERTs (upvotes=0)', test1Payloads);
  console.log(t1.sentCount <= 1 ? '  ✅ PASS: Max 1 notification' : `  ❌ FAIL: ${t1.sentCount} notifications sent!`);

  // ─── Test 2: 10 concurrent UPVOTE_MILESTONE dengan upvotes=10 ────────────
  // Expected: hanya 1 yang fire (race condition test)
  await new Promise(r => setTimeout(r, 2000)); // delay kecil

  const test2Payloads = Array.from({ length: 10 }, (_, i) => ({
    label: `upvote-milestone-${i + 1}`,
    payload: makePayload('UPVOTE_MILESTONE', { upvotes: 10 }),
  }));

  const t2 = await runTest('10 Concurrent UPVOTE_MILESTONE (upvotes=10)', test2Payloads);
  console.log(t2.sentCount <= 1 ? '  ✅ PASS: Max 1 notification' : `  ❌ FAIL: ${t2.sentCount} notifications sent!`);

  // ─── Test 3: Invalid webhook secret ─────────────────────────────────────
  console.log(`\n${'═'.repeat(60)}`);
  console.log('  TEST: Invalid Webhook Secret');
  console.log('═'.repeat(60));
  const badSecretRes = await fetch(`${BASE_URL}/api/polysuara-new-confession-notify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-webhook-secret': 'WRONG_SECRET' },
    body: JSON.stringify(makePayload()),
  });
  console.log(`  ${badSecretRes.status === 401 || badSecretRes.status === 403 ? '✅' : '❌'} Status: ${badSecretRes.status} (expect 401/403)`);

  // ─── Test 4: Unknown event type ──────────────────────────────────────────
  console.log(`\n${'═'.repeat(60)}`);
  console.log('  TEST: Unknown Event Type (UPDATE)');
  console.log('═'.repeat(60));
  const updateRes = await fireWebhook(makePayload('UPDATE'), 'UPDATE event');
  console.log(`  ${updateRes.status === 200 ? '✅' : '❌'} Status: ${updateRes.status} | ${JSON.stringify(updateRes.json)}`);

  console.log(`\n${'═'.repeat(60)}`);
  console.log('  STRESS TEST COMPLETE');
  console.log('═'.repeat(60));
}

main().catch(console.error);
