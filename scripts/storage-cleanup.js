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
  const PAGE = 1000;

  // Scalar (text) columns
  for (const ref of SCALAR_REFS) {
    try {
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from(ref.table)
          .select(ref.column)
          .not(ref.column, 'is', null)
          .range(from, from + PAGE - 1);
        if (error) throw new Error(`${ref.table}.${ref.column}: ${error.message}`);
        if (!data || data.length === 0) break;
        for (const row of data) {
          const norm = normalizePath(row[ref.column]);
          if (norm) {
            refs.add(norm);
            refs.add(norm.split('/').slice(1).join('/')); // strip bucket prefix too
          }
        }
        if (data.length < PAGE) break;
        from += PAGE;
      }
    } catch (e) {
      console.error(`[Storage Cleanup] WARN: cannot load ${ref.table}.${ref.column}: ${e.message}`);
    }
  }

  // Array (text[]) columns
  for (const ref of ARRAY_REFS) {
    try {
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from(ref.table)
          .select(ref.column)
          .not(ref.column, 'is', null)
          .range(from, from + PAGE - 1);
        if (error) throw new Error(`${ref.table}.${ref.column}: ${error.message}`);
        if (!data || data.length === 0) break;
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
        if (data.length < PAGE) break;
        from += PAGE;
      }
    } catch (e) {
      console.error(`[Storage Cleanup] WARN: cannot load ${ref.table}.${ref.column}: ${e.message}`);
    }
  }

  return refs;
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
      console.log(`[Storage Cleanup] Deleting old receipt: ${filePath} for order ${order.id}`);

      const { error: deleteError } = await supabase.storage
        .from('polymart-receipts')
        .remove([filePath]);

      if (deleteError) {
        console.error(`[Storage Cleanup] Failed to delete receipt file ${filePath}:`, deleteError.message);
      } else {
        deletedCount++;
      }
    } else {
      console.warn(`[Storage Cleanup] Could not extract storage file path from receipt URL: ${receiptUrl}`);
    }

    // Always nullify payment_receipt_url in DB to ensure consistency
    const { error: updateError } = await supabase
      .from('polymart_orders')
      .update({ payment_receipt_url: null })
      .eq('id', order.id);

    if (updateError) {
      console.error(`[Storage Cleanup] Failed to clear payment_receipt_url for order ${order.id}:`, updateError.message);
    }
  }

  console.log(`[Storage Cleanup] Auto-deleted ${deletedCount} receipt files and updated database.`);
}

async function runCleanup() {
  if (!supabase) {
    console.warn("[Storage Cleanup] Skipped — Supabase client not initialized (missing env vars).");
    return;
  }

  console.log(`[Storage Cleanup] Started at ${new Date().toISOString()}`);

  // First run the 30-day receipt auto-cleanup
  try {
    await cleanOldReceipts();
  } catch (err) {
    console.error(`[Storage Cleanup] Error during cleanOldReceipts:`, err.message);
  }

  // ── SAFETY: bulk-load ALL referenced paths BEFORE deleting anything ──
  const referencedPaths = await loadReferencedPaths();

  if (referencedPaths.size === 0) {
    // If the reference DB can't be loaded, deleting ANYTHING is unsafe.
    console.error("[Storage Cleanup] ABORT: 0 referenced paths loaded — refusing to delete. Check DB connectivity.");
    return;
  }
  console.log(`[Storage Cleanup] Loaded ${referencedPaths.size} referenced path(s) from DB.`);

  let totalScanned = 0;
  let totalDeleted = 0;
  let totalKept = 0;

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
            console.log(`[Storage Cleanup]   ❌ Orphaned: ${bucket.name}/${filePath}`);
            const { error: deleteError } = await supabase.storage.from(bucket.name).remove([filePath]);
            if (deleteError) {
              console.error(`[Storage Cleanup]   Failed to delete: ${deleteError.message}`);
            } else {
              totalDeleted++;
            }
          } else {
            totalKept++;
          }
        }
      }
    }

    console.log(`[Storage Cleanup] ─── Summary ───`);
    console.log(`[Storage Cleanup]   Scanned: ${totalScanned}`);
    console.log(`[Storage Cleanup]   Kept:    ${totalKept}`);
    console.log(`[Storage Cleanup]   Deleted: ${totalDeleted}`);
    console.log(`[Storage Cleanup] Completed at ${new Date().toISOString()}`);
  } catch (error) {
    console.error(`[Storage Cleanup] Unexpected error:`, error);
  }
}

// Allow running directly via: node scripts/storage-cleanup.js
if (process.argv[1] && process.argv[1].endsWith('storage-cleanup.js')) {
  runCleanup().then(() => process.exit(0));
}

export default runCleanup;
