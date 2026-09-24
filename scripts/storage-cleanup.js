import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("[Storage Cleanup] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
}

const supabase = (supabaseUrl && supabaseServiceKey)
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// ──────────────────────────────────────────────────────────
// DRY-RUN GUARD (data-integrity safety)
//
// DEFAULT = DRY-RUN. The script will NOT delete anything unless
// you explicitly pass --confirm (or --force).
//
//   node scripts/storage-cleanup.js            → dry-run (safe, read-only)
//   node scripts/storage-cleanup.js --confirm  → actually deletes
//
// Rationale: on 2026-09-24 an old version of this script wrongly
// deleted 38+ MAKMP sijil (student certificates) because
// `makmp_submission_items` was missing from the reference list.
// We now (a) include MAKMP refs, (b) bulk-load refs with an abort
// safety-net, and (c) default to dry-run so a bare invocation can
// never destroy data again.
// ──────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = !(args.includes('--confirm') || args.includes('--force'));

// ──────────────────────────────────────────────────────────
// MAP: Which DB tables/columns reference files in storage?
// Verified against actual DB schema on 2026-05-05.
// ──────────────────────────────────────────────────────────
const SCALAR_REFS = [
  // table                       column               (data_type: text)
  { table: 'profiles',            column: 'avatar_url' },
  { table: 'clubs',               column: 'logo_url' },
  { table: 'karnival_booths',     column: 'image_url' },
  { table: 'karnival_editions',   column: 'cover_image_url' },
  { table: 'keusahawanan_businesses', column: 'logo_url' },
  { table: 'keusahawanan_programs', column: 'image_url' },       // ← sebenar 'image_url', bukan 'poster_url'
  { table: 'business_products',   column: 'image_url' },         // ← sebenar 'business_products', bukan 'keusahawanan_products'
  { table: 'polymart_ads',        column: 'image_url' },
  { table: 'system_announcements', column: 'image_url' },
  { table: 'task_submissions',    column: 'file_url' },
  { table: 'club_reports',        column: 'file_url' },
  { table: 'club_reports',        column: 'marked_file_url' },
  { table: 'club_committee',      column: 'image_url' },
  { table: 'programs',            column: 'url_kertas_kerja' },
  { table: 'programs',            column: 'url_post_mortem' },
  { table: 'supsas_editions',     column: 'banner_url' },
  { table: 'supsas_editions',     column: 'logo_url' },
  { table: 'supsas_kontingen',    column: 'logo_url' },
  { table: 'supsas_medal_tally',  column: 'logo_url' },
  { table: 'polymart_orders',     column: 'payment_receipt_url' },
  { table: 'keusahawanan_businesses', column: 'payment_qr_url' },
  // MAKMP sijil — JANGAN padam (sebelum ni tersalah anggap orphaned)
  { table: 'makmp_submission_items', column: 'drive_view_url' },
  { table: 'makmp_submission_items', column: 'drive_download_url' },
];

// Array columns — need special handling with .contains()
const ARRAY_REFS = [
  { table: 'programs',            column: 'image_urls' },         // text[]
  { table: 'kebajikan_tickets',   column: 'image_urls' },         // text[] ← bukan 'image_url'
  { table: 'club_activities',     column: 'image_urls' },         // text[]
];

// ──────────────────────────────────────────────────────────
// Buckets to scan, with their subfolder structure
// ──────────────────────────────────────────────────────────
const BUCKETS_TO_CLEAN = [
  { name: 'avatars',               subfolders: [''] },
  { name: 'club-logos',            subfolders: [''] },
  { name: 'karnival-booths',       subfolders: [''] },
  { name: 'kebajikan-images',      subfolders: [''] },
  { name: 'keusahawanan-products', subfolders: [''] },
  { name: 'polymart-ads',          subfolders: [''] },
  { name: 'announcements',         subfolders: [''] },
  { name: 'reports',               subfolders: ['', 'task-proofs', 'program_docs'] },  // ← FIX: scan subfolders
  { name: 'kertas-kerja',          subfolders: [''] },
  { name: 'post-mortem',           subfolders: [''] },
  { name: 'receipts',              subfolders: [''] },
  { name: 'supsas-assets',         subfolders: [''] },
  { name: 'polymart-receipts',     subfolders: [''] },
];

/**
 * Normalize ANY url/path form into the storage-relative path:
 *   https://api.cipher-node.org/storage/v1/object/public/avatars/u1/a.jpg
 *   http://localhost:8000/storage/v1/object/public/avatars/u1/a.jpg
 *   avatars/u1/a.jpg
 *   u1/a.jpg
 * all → "u1/a.jpg"  (path WITHIN bucket, leading/trailing slashes stripped)
 */
function normalizePath(value) {
  if (!value) return null;
  let s = String(value);
  const q = s.indexOf('?');
  if (q !== -1) s = s.slice(0, q);
  const marker = '/object/public/';
  const i = s.indexOf(marker);
  if (i !== -1) s = s.slice(i + marker.length);
  s = s.replace(/^\/+|\/+$/g, '');
  try { s = decodeURIComponent(s); } catch { /* keep raw */ }
  return s || null;
}

/**
 * BULK-LOAD every referenced path from the DB into a Set.
 * Domain-agnostic: strips the host so `localhost:8000` vs `api.cipher-node.org`
 * mismatches can NEVER cause false "orphan" verdicts again (bug fixed 2026-08-12).
 * Paginated (PGRST_DB_MAX_ROWS=1000 truncates REST silently).
 */
async function loadReferencedPaths() {
  const refs = new Set();
  const failedColumns = [];
  const PAGE = 1000;
  const RETRIES = 3;

  // Helper: paginated select with retry on transient network errors.
  async function paginatedSelect(table, column) {
    const rows = [];
    let from = 0;
    while (true) {
      let data, error;
      for (let attempt = 0; attempt < RETRIES; attempt++) {
        ({ data, error } = await supabase
          .from(table)
          .select(column)
          .not(column, 'is', null)
          .range(from, from + PAGE - 1));
        if (!error) break;
        console.error(`[Storage Cleanup] WARN: retry ${attempt + 1}/${RETRIES} for ${table}.${column}: ${error.message}`);
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
      if (error) throw new Error(`${table}.${column}: ${error.message}`);
      if (!data || data.length === 0) break;
      rows.push(...data);
      if (data.length < PAGE) break;
      from += PAGE;
    }
    return rows;
  }

  // Scalar (text) columns
  for (const ref of SCALAR_REFS) {
    try {
      const data = await paginatedSelect(ref.table, ref.column);
      for (const row of data) {
        const norm = normalizePath(row[ref.column]);
        if (norm) {
          refs.add(norm);
          refs.add(norm.split('/').slice(1).join('/')); // strip bucket prefix too
        }
      }
    } catch (e) {
      console.error(`[Storage Cleanup] ERROR: cannot load ${ref.table}.${ref.column}: ${e.message}`);
      failedColumns.push(`${ref.table}.${ref.column}`);
    }
  }

  // Array (text[]) columns
  for (const ref of ARRAY_REFS) {
    try {
      const data = await paginatedSelect(ref.table, ref.column);
      for (const row of data) {
        const arr = Array.isArray(row[ref.column]) ? row[ref.column] : [];
        for (const v of arr) {
          const norm = normalizePath(v);
          if (norm) {
            refs.add(norm);
            refs.add(norm.split('/').slice(1).join('/'));
          }
        }
      }
    } catch (e) {
      console.error(`[Storage Cleanup] ERROR: cannot load ${ref.table}.${ref.column}: ${e.message}`);
      failedColumns.push(`${ref.table}.${ref.column}`);
    }
  }

  return { refs, failedColumns };
}

/**
 * List all files in a bucket/subfolder recursively, handling pagination (1000 per page) and subdirectories.
 */
async function listAllFiles(bucket, folder) {
  const allFiles = [];
  let offset = 0;
  const PAGE_SIZE = 1000;

  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(folder || undefined, {
      limit: PAGE_SIZE,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (error) {
      console.error(`[Storage Cleanup] Error listing ${bucket}/${folder}:`, error.message);
      break;
    }

    if (!data || data.length === 0) break;

    // Filter out folder placeholders and actual sub-folders
    for (const item of data) {
      if (item.name === '.emptyFolderPlaceholder') continue;

      const fullPath = folder ? `${folder}/${item.name}` : item.name;

      if (item.id === null) {
        // This is a directory. Traverse recursively.
        const subFiles = await listAllFiles(bucket, fullPath);
        allFiles.push(...subFiles);
      } else {
        // This is a file.
        allFiles.push(fullPath);
      }
    }

    if (data.length < PAGE_SIZE) break; // Last page
    offset += PAGE_SIZE;
  }

  return allFiles;
}

/**
 * Auto-delete receipt files older than 30 days from the polymart-receipts bucket
 * and set their references (payment_receipt_url) in polymart_orders to null.
 *
 * NOTE: In dry-run mode this only logs what WOULD be deleted, and does NOT
 * nullify any DB column. A --confirm run is required for real mutation.
 */
async function cleanOldReceipts() {
  console.log(`[Storage Cleanup] Checking for receipts older than 30 days to auto-delete...`);

  // Calculate threshold date (30 days ago)
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - 30);
  const thresholdStr = thresholdDate.toISOString();

  // Fetch orders older than 30 days with payment receipts
  const { data: orders, error } = await supabase
    .from('polymart_orders')
    .select('id, payment_receipt_url')
    .not('payment_receipt_url', 'is', null)
    .lt('created_at', thresholdStr);

  if (error) {
    console.error(`[Storage Cleanup] Error fetching old orders with receipts:`, error.message);
    return;
  }

  if (!orders || orders.length === 0) {
    console.log(`[Storage Cleanup] No receipts older than 30 days found.`);
    return;
  }

  console.log(`[Storage Cleanup] Found ${orders.length} orders with receipts older than 30 days.`);

  let deletedCount = 0;
  for (const order of orders) {
    const receiptUrl = order.payment_receipt_url;
    // Extract file path from publicUrl.
    // Example: https://.../storage/v1/object/public/polymart-receipts/receipts/orderId/filename.png
    const bucketMarker = 'polymart-receipts/';
    const markerIndex = receiptUrl.indexOf(bucketMarker);

    if (markerIndex !== -1) {
      const filePath = decodeURIComponent(receiptUrl.substring(markerIndex + bucketMarker.length));
      console.log(`[Storage Cleanup] ${DRY_RUN ? 'WOULD delete' : 'Deleting'} old receipt: ${filePath} for order ${order.id}`);

      if (!DRY_RUN) {
        const { error: deleteError } = await supabase.storage
          .from('polymart-receipts')
          .remove([filePath]);

        if (deleteError) {
          console.error(`[Storage Cleanup] Failed to delete receipt file ${filePath}:`, deleteError.message);
        } else {
          deletedCount++;
        }
      }
    } else {
      console.warn(`[Storage Cleanup] Could not extract storage file path from receipt URL: ${receiptUrl}`);
    }

    if (!DRY_RUN) {
      // Always nullify payment_receipt_url in DB to ensure consistency
      const { error: updateError } = await supabase
        .from('polymart_orders')
        .update({ payment_receipt_url: null })
        .eq('id', order.id);

      if (updateError) {
        console.error(`[Storage Cleanup] Failed to clear payment_receipt_url for order ${order.id}:`, updateError.message);
      }
    }
  }

  console.log(`[Storage Cleanup] ${DRY_RUN ? 'Dry-run — would have auto-deleted' : 'Auto-deleted'} ${deletedCount} receipt files.`);
}

async function runCleanup() {
  if (!supabase) {
    console.warn("[Storage Cleanup] Skipped — Supabase client not initialized (missing env vars).");
    return { totalScanned: 0, totalKept: 0, totalToDelete: 0, totalDeleted: 0, orphanedFiles: [], dryRun: DRY_RUN, aborted: true };
  }

  if (DRY_RUN) {
    console.log("────────────────────────────────────────────────────────────");
    console.log("[Storage Cleanup] DRY-RUN MODE — no files will be deleted.");
    console.log("[Storage Cleanup] Re-run with --confirm to actually delete.");
    console.log("────────────────────────────────────────────────────────────");
  } else {
    console.log("────────────────────────────────────────────────────────────");
    console.log("[Storage Cleanup] LIVE MODE — files WILL be deleted.");
    console.log("────────────────────────────────────────────────────────────");
  }

  console.log(`[Storage Cleanup] Started at ${new Date().toISOString()}`);

  // First run the 30-day receipt auto-cleanup
  try {
    await cleanOldReceipts();
  } catch (err) {
    console.error(`[Storage Cleanup] Error during cleanOldReceipts:`, err.message);
  }

  // ── SAFETY: bulk-load ALL referenced paths BEFORE deleting anything ──
  const { refs: referencedPaths, failedColumns } = await loadReferencedPaths();

  if (referencedPaths.size === 0) {
    // If the reference DB can't be loaded, deleting ANYTHING is unsafe.
    console.error("[Storage Cleanup] ABORT: 0 referenced paths loaded — refusing to delete. Check DB connectivity.");
    return { totalScanned: 0, totalKept: 0, totalToDelete: 0, totalDeleted: 0, orphanedFiles: [], dryRun: DRY_RUN, aborted: true };
  }

  if (failedColumns.length > 0) {
    // If ANY reference column failed to load (after retries), a false
    // "orphaned" verdict is possible — refuse to delete to be safe.
    console.error(`[Storage Cleanup] ABORT: ${failedColumns.length} reference column(s) failed to load — refusing to delete to avoid false positives.`);
    for (const c of failedColumns) console.error(`[Storage Cleanup]   - ${c}`);
    return { totalScanned: 0, totalKept: 0, totalToDelete: 0, totalDeleted: 0, orphanedFiles: [], dryRun: DRY_RUN, aborted: true, failedColumns };
  }

  console.log(`[Storage Cleanup] Loaded ${referencedPaths.size} referenced path(s) from DB.`);

  let totalScanned = 0;
  let totalToDelete = 0;
  let totalDeleted = 0;
  let totalKept = 0;
  const orphanedFiles = [];

  try {
    for (const bucket of BUCKETS_TO_CLEAN) {
      for (const folder of bucket.subfolders) {
        const label = folder ? `${bucket.name}/${folder}` : bucket.name;
        console.log(`[Storage Cleanup] Scanning: ${label}...`);

        const files = await listAllFiles(bucket.name, folder);
        if (files.length === 0) continue;

        console.log(`[Storage Cleanup]   Found ${files.length} files in ${label}`);

        for (const filePath of files) {
          totalScanned++;

          // Match file against referenced set:
          //   - raw relative path (listAllFiles form, e.g. "8b53e2a5.../img.jpg")
          //   - bucket-prefixed form ("keusahawanan-products/8b53e2a5.../img.jpg")
          //   - decoded variants (DB may store %-encoded chars)
          let referenced = false;
          const variants = [filePath, `${bucket.name}/${filePath}`];
          try {
            variants.push(decodeURIComponent(filePath), `${bucket.name}/${decodeURIComponent(filePath)}`);
          } catch { /* keep as-is */ }

          for (const v of variants) {
            if (referencedPaths.has(v)) { referenced = true; break; }
          }

          if (!referenced) {
            totalToDelete++;
            orphanedFiles.push(`${bucket.name}/${filePath}`);
            if (DRY_RUN) {
              console.log(`[Storage Cleanup]   ❌ Orphaned (dry-run, skipped): ${bucket.name}/${filePath}`);
            } else {
              console.log(`[Storage Cleanup]   ❌ Orphaned: ${bucket.name}/${filePath}`);
              const { error: deleteError } = await supabase.storage.from(bucket.name).remove([filePath]);
              if (deleteError) {
                console.error(`[Storage Cleanup]   Failed to delete: ${deleteError.message}`);
              } else {
                totalDeleted++;
              }
            }
          } else {
            totalKept++;
          }
        }
      }
    }

    console.log(`[Storage Cleanup] ─── Summary ───`);
    console.log(`[Storage Cleanup]   Scanned:      ${totalScanned}`);
    console.log(`[Storage Cleanup]   Kept:         ${totalKept}`);
    console.log(`[Storage Cleanup]   Orphaned:     ${totalToDelete}`);
    console.log(`[Storage Cleanup]   Deleted:      ${totalDeleted}${DRY_RUN ? ' (dry-run, 0 actually deleted)' : ''}`);
    console.log(`[Storage Cleanup] Completed at ${new Date().toISOString()}`);

    return { totalScanned, totalKept, totalToDelete, totalDeleted, orphanedFiles, dryRun: DRY_RUN, aborted: false };
  } catch (error) {
    console.error(`[Storage Cleanup] Unexpected error:`, error);
    return { totalScanned, totalKept, totalToDelete, totalDeleted, orphanedFiles, dryRun: DRY_RUN, aborted: true, error: error.message };
  }
}

// Allow running directly via: node scripts/storage-cleanup.js
if (process.argv[1] && process.argv[1].endsWith('storage-cleanup.js')) {
  runCleanup().then(() => process.exit(0));
}

export default runCleanup;
