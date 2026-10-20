/**
 * ─── Smart Image Upload Helper ──────────────────────────────────────────────
 * Guna Supabase Storage dengan auto-compress untuk jimat quota.
 * Gambar dicompress dari ~2-5MB → ~100-300KB sebelum upload.
 * 1GB free quota ≈ 3,000-10,000 gambar compressed!
 */

import { supabase } from '@/lib/supabase';
import i18n from '@/lib/i18n';

const t = (k: string, fb: string, opt?: any): string =>
  (i18n.isInitialized ? (i18n.t(k, { defaultValue: fb, ...opt }) as string) : fb);

export type UploadSubfolder = 'kertas_kerja' | 'postmortem' | 'aktiviti' | 'avatar' | 'lain' | (string & {});

/**
 * Compress gambar menggunakan Canvas API.
 * Resize ke max 1200px dan compress ke JPEG quality 0.7
 */
async function compressImage(file: File, maxWidth = 1200, quality = 0.7): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      // Resize jika lebih besar dari maxWidth
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error(t('services:failed_compress_image', 'Gagal compress gambar')));
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => reject(new Error(t('services:failed_read_image', 'Gagal baca gambar')));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Upload fail ke Supabase Storage dengan auto-compress.
 */
export async function uploadFileToDrive(
  file: File,
  subfolder: UploadSubfolder = 'lain',
  customName?: string
): Promise<string> {
  // Compress jika image
  let uploadFile: File | Blob = file;
  let fileName: string;

  if (file.type.startsWith('image/')) {
    try {
      const originalSize = file.size;
      uploadFile = await compressImage(file);
      const compressedSize = uploadFile.size;
      const savings = Math.round((1 - compressedSize / originalSize) * 100);
      console.log(`[upload] Compressed: ${(originalSize/1024).toFixed(0)}KB → ${(compressedSize/1024).toFixed(0)}KB (${savings}% jimat)`);
    } catch {
      // Fallback ke original jika compress gagal
      uploadFile = file;
    }
    const ts = Date.now();
    fileName = customName
      ? `${subfolder}/${customName}.jpg`
      : `${subfolder}/${subfolder}_${ts}.jpg`;
  } else {
    const ts = Date.now();
    const ext = file.name.split('.').pop() || 'bin';
    fileName = customName
      ? `${subfolder}/${customName}.${ext}`
      : `${subfolder}/${subfolder}_${ts}.${ext}`;
  }

  // Upload ke Supabase Storage — dengan retry utk rangkaian flaky (tunnel/QUIC drop)
  let uploadError: Error | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const { error } = await supabase.storage
      .from('reports')
      .upload(fileName, uploadFile, {
        cacheControl: '3600',
        upsert: false,
      });

    if (!error) {
      uploadError = null;
      break;
    }
    uploadError = error;
    // Retry hanya utk kegagalan rangkaian; error RLS/400 lain biar terus keluar
    const isNetworkError = /fetch failed|failed to fetch|abort|timeout|network/i.test(error.message || '');
    if (!isNetworkError || attempt === 3) break;
    console.warn(`[upload] Cuba #${attempt} gagal (${error.message}) — retry...`);
    await new Promise((r) => setTimeout(r, 1000 * attempt));
  }

  if (uploadError) {
    console.error('[upload] Storage error:', uploadError.message);
    throw new Error(t('services:upload_failed_msg', 'Upload gagal: {{msg}}', { msg: uploadError.message }));
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('reports')
    .getPublicUrl(fileName);

  console.log(`[upload] Berjaya: ${publicUrl}`);
  return publicUrl;
}

/**
 * Upload beberapa gambar sekaligus (max 3).
 */
export async function uploadMultipleImages(
  files: FileList | File[],
  subfolder: UploadSubfolder,
  maxCount = 3
): Promise<string[]> {
  const arr = Array.from(files)
    .filter(f => f.type.startsWith('image/'))
    .slice(0, maxCount);

  const urls: string[] = [];
  for (const file of arr) {
    urls.push(await uploadFileToDrive(file, subfolder));
  }
  return urls;
}

/**
 * Upload dokumen PDF terus ke Google Drive menggunakan Supabase Edge Function
 * (Menjimatkan kuota Supabase Storage)
 */
export async function uploadPdfToDrive(
  file: File,
  subfolder: UploadSubfolder = 'lain',
  customName?: string
): Promise<string> {
  if (file.type !== 'application/pdf') {
    throw new Error(t('services:pdf_only_hybrid_drive', 'Hanya fail PDF dibenarkan untuk dimuat naik secara hibrid ke Google Drive.'));
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error(t('services:please_login_upload', 'Sila log masuk untuk memuat naik fail.'));
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('subfolder', subfolder);
  if (customName) formData.append('customName', customName);

  // Direct fetch to Express API
  const response = await fetch('/api/upload-to-drive', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: formData,
  });

  const responseText = await response.text();
  console.log(`[drive-upload] Status: ${response.status}, Body: ${responseText}`);

  if (!response.ok) {
    let errorMsg = t('services:edge_function_error_status', 'Edge Function Error ({{status}})', { status: response.status });
    try {
      const errJson = JSON.parse(responseText);
      errorMsg = errJson.error || errorMsg;
    } catch { /* response was not JSON */ }
    throw new Error(t('services:drive_upload_failed_msg', 'Muat naik ke Drive gagal: {{msg}}', { msg: errorMsg }));
  }

  let data: any;
  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error(t('services:invalid_edge_json_response', 'Respons Edge Function bukan JSON yang sah.'));
  }

  if (data?.error) {
    throw new Error(t('services:google_drive_error_msg', 'Ralat Google Drive: {{error}}', { error: data.error }));
  }

  if (!data?.url) {
    throw new Error(t('services:drive_no_doc_url_returned', 'URL dokumen tidak dikembalikan oleh Drive.'));
  }

  console.log(`[upload-drive] Berjaya PDF: ${data.url}`);
  return data.url;
}
