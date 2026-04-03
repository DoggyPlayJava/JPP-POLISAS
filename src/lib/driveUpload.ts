/**
 * ─── Smart Image Upload Helper ──────────────────────────────────────────────
 * Guna Supabase Storage dengan auto-compress untuk jimat quota.
 * Gambar dicompress dari ~2-5MB → ~100-300KB sebelum upload.
 * 1GB free quota ≈ 3,000-10,000 gambar compressed!
 */

import { supabase } from '@/lib/supabase';

export type UploadSubfolder = 'kertas_kerja' | 'postmortem' | 'aktiviti' | 'avatar' | 'lain';

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
          else reject(new Error('Gagal compress gambar'));
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => reject(new Error('Gagal baca gambar'));
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

  // Upload ke Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('reports')
    .upload(fileName, uploadFile, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    console.error('[upload] Storage error:', uploadError.message);
    throw new Error(`Upload gagal: ${uploadError.message}`);
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
