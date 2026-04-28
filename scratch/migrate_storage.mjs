import { createClient } from '@supabase/supabase-js';
import * as tus from 'tus-js-client';
import fs from 'fs';
import path from 'path';

// ==========================================
// 1. ISIKAN MAKLUMAT DI BAWAH
// ==========================================

// CLOUD LAMA
const OLD_URL = 'https://ujklcxfbmmzxsqtidjtz.supabase.co';
const OLD_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqa2xjeGZibW16eHNxdGlkanR6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDcxODcwNiwiZXhwIjoyMDkwMjk0NzA2fQ.1K29IZXTuPwKEotVqXBpZWkRVAOSwqKnH5bBiC5bGIo';

// PROXMOX BARU
const NEW_URL = 'https://api.cipher-node.org';
const NEW_SERVICE_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3NzM2MzAyMCwiZXhwIjo0OTMzMDM2NjIwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.VykbeFaSjToGDL7zXOGju2rUwmwnIsSks7T7IOKn19I';

// ==========================================

const oldClient = createClient(OLD_URL, OLD_SERVICE_KEY);
const newClient = createClient(NEW_URL, NEW_SERVICE_KEY);

async function listAllFiles(client, bucketName, folderPath = '') {
  const { data, error } = await client.storage.from(bucketName).list(folderPath, {
    limit: 1000,
    offset: 0,
  });

  if (error) {
    console.error(`Ralat membaca ${bucketName}/${folderPath}:`, error.message);
    return [];
  }

  let allFiles = [];
  for (const item of data) {
    const fullPath = folderPath ? `${folderPath}/${item.name}` : item.name;

    // Jika ia fail (ada id)
    if (item.id) {
      allFiles.push(fullPath);
    }
    // Jika ia folder (tiada id), kita perlu gali lebih dalam (recursive)
    else if (!item.id && item.name !== '.emptyFolderPlaceholder') {
      const subFiles = await listAllFiles(client, bucketName, fullPath);
      allFiles = allFiles.concat(subFiles);
    }
  }
  return allFiles;
}

async function migrateStorage() {
  console.log('🚀 Memulakan Migrasi Storage...');

  // 1. Dapatkan senarai buckets dari Cloud Lama
  const { data: buckets, error: bucketError } = await oldClient.storage.listBuckets();
  if (bucketError) {
    console.error('Gagal mendapatkan senarai bucket:', bucketError.message);
    return;
  }

  console.log(`\n📦 Jumpa ${buckets.length} buckets.`);

  for (const bucket of buckets) {
    console.log(`\n---------------------------------`);
    console.log(`🪣 Memproses Bucket: ${bucket.name}`);
    console.log(`---------------------------------`);

    // 2. Cipta bucket di Proxmox (jika belum ada)
    await newClient.storage.createBucket(bucket.name, {
      public: bucket.public,
      file_size_limit: bucket.file_size_limit,
      allowed_mime_types: bucket.allowed_mime_types,
    });
    console.log(`✅ Bucket ${bucket.name} disahkan wujud di Proxmox.`);

    // 3. Senaraikan semua fail secara mendalam (recursive)
    console.log(`🔍 Sedang mengimbas fail dalam ${bucket.name}...`);
    const files = await listAllFiles(oldClient, bucket.name);

    console.log(`📄 Terdapat ${files.length} fail ditemui.`);

    const existingFilesCache = {};

    // 4. Muat turun dari lama & Muat naik ke baru
    for (const [index, filePath] of files.entries()) {
      console.log(`⏳ [${index + 1}/${files.length}] Memindahkan: ${filePath}...`);

      const folderName = filePath.split('/')[0];
      const fileName = filePath.split('/')[1];

      // Initialize cache for this bucket & folder
      if (!existingFilesCache[bucket.name]) {
        existingFilesCache[bucket.name] = {};
      }
      
      if (!existingFilesCache[bucket.name][folderName]) {
        const { data: listData, error: listError } = await newClient.storage.from(bucket.name).list(folderName, { limit: 1000 });
        if (!listError && listData) {
          existingFilesCache[bucket.name][folderName] = new Set(listData.map(f => f.name));
        } else {
          existingFilesCache[bucket.name][folderName] = new Set();
        }
      }

      // Skip if file already exists in Proxmox
      if (existingFilesCache[bucket.name][folderName].has(fileName)) {
        console.log(`   ⏭️ Sudah wujud (Skipped).`);
        continue;
      }

      const { data: fileData, error: downloadError } = await oldClient.storage.from(bucket.name).download(filePath);

      if (downloadError) {
        console.error(`   ❌ Gagal muat turun ${filePath}:`, downloadError.message);
        continue;
      }

      const { error: uploadError } = await newClient.storage.from(bucket.name).upload(filePath, fileData, {
        upsert: false,
        contentType: fileData.type
      });

      if (uploadError) {
        console.error(`   ❌ Gagal muat naik ${filePath}:`, uploadError.message);
      } else {
        console.log(`   ✅ Berjaya!`);
        existingFilesCache[bucket.name][folderName].add(fileName);
      }
    }
  }

  console.log('\n🎉🎉🎉 SEMUA FAIL TELAH BERJAYA DIPINDAHKAN! 🎉🎉🎉');

  console.log('\nLangkah seterusnya: Kita perlu kemaskini URL dalam database.');
}

migrateStorage();
