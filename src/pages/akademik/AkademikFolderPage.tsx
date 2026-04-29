import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { hexToRgba } from '@/lib/utils';
import { uploadFileToDrive, uploadPdfToDrive } from '@/lib/driveUpload';
import {
  Folder, FolderOpen, File, Download, Upload, Plus, Loader2,
  FileText, Image, Archive, ChevronRight, ChevronDown, Sparkles, PackageOpen,
  FolderArchive, AlertTriangle,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { ms } from 'date-fns/locale';
// fflate for client-side ZIP (already in node_modules via dependencies)
import { zipSync, strToU8 } from 'fflate';

const THEME = '#818CF8';

const FOLDER_PRESETS = [
  { name: 'Sijil Penyertaan',    description: 'Sijil penyertaan program dan bengkel' },
  { name: 'Sijil Penghargaan',   description: 'Sijil penghargaan dan anugerah' },
  { name: 'Slip Keputusan',      description: 'Slip keputusan peperiksaan setiap semester' },
  { name: 'Surat Tawaran',       description: 'Surat tawaran masuk & tawaran biasiswa' },
  { name: 'Resit Pembayaran',    description: 'Resit pembayaran yuran pengajian & asrama' },
  { name: 'Nota Peribadi',       description: 'Nota dan bahan rujukan peribadi' },
  { name: 'Lain-lain',           description: 'Dokumen dan fail am' },
];

// ─── Helpers ──────────────────────────────────────────────────
function sanitizeFilename(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, '_');
}

function isSupabaseUrl(url: string): boolean {
  return url.includes('supabase.co/storage') || url.includes('supabase.in/storage') || url.includes('api.cipher-node.org/storage');
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://api.cipher-node.org';

/** Fetch a file as Uint8Array — Supabase Storage (direct) or Google Drive (via no-auth proxy) */
async function fetchAsBytes(
  url: string,
  fileName: string
): Promise<Uint8Array | null> {
  try {
    let fetchUrl: string;

    if (isSupabaseUrl(url)) {
      fetchUrl = url;
    } else {
      // Google Drive — route through proxy Edge Function (no JWT needed)
      const fileId = (() => {
        const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (match) return match[1];
        try { return new URL(url).searchParams.get('id') || null; } catch { return null; }
      })();
      if (!fileId) return null;
      fetchUrl = `${SUPABASE_URL}/functions/v1/proxy-drive-download?fileId=${fileId}&fileName=${encodeURIComponent(fileName)}`;
    }

    const res = await fetch(fetchUrl);
    if (!res.ok) {
      console.warn(`[zip] fetch failed ${res.status} for ${url}`);
      return null;
    }
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  } catch (e) {
    console.warn('[zip] fetchAsBytes error:', e);
    return null;
  }
}

/** Build and trigger download of a ZIP containing files from one or more folders */
async function buildAndDownloadZip(
  folderMap: Record<string, { folderName: string; files: any[] }>,
  zipName: string,
  onProgress?: (done: number, total: number) => void
) {
  const zipEntries: Record<string, Uint8Array> = {};
  const failed: string[] = []; // files that couldn't be fetched

  let done = 0;
  const total = Object.values(folderMap).reduce((s, f) => s + f.files.length, 0);

  for (const { folderName, files } of Object.values(folderMap)) {
    const safeFolderName = sanitizeFilename(folderName);

    for (const file of files) {
      done++;
      onProgress?.(done, total);

      const url      = file.drive_view_url || file.drive_download_url || '';
      const fileName = sanitizeFilename(file.file_name || file.name || `file_${done}`);
      const entryPath = `${safeFolderName}/${fileName}`;

      const bytes = await fetchAsBytes(url, fileName);
      if (bytes) {
        zipEntries[entryPath] = bytes;
      } else {
        failed.push(`${folderName}/${fileName}`);
      }
    }
  }

  if (Object.keys(zipEntries).length === 0) {
    throw new Error('Gagal muat turun mana-mana fail. Sila cuba lagi.');
  }

  // Add a note for any files that failed (edge cases)
  if (failed.length > 0) {
    const note = ['FAIL YANG TIDAK BERJAYA DIMUAT TURUN:', '', ...failed].join('\n');
    zipEntries['_gagal.txt'] = strToU8(note);
  }

  const zipped = zipSync(zipEntries, { level: 1 });
  const blob   = new Blob([zipped as unknown as BlobPart], { type: 'application/zip' });
  const link   = document.createElement('a');
  link.href    = URL.createObjectURL(blob);
  link.download = `${zipName}.zip`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 10000);

  return failed.length;
}

// ─── File icon helper ─────────────────────────────────────────
function FileIcon({ name }: { name: string }) {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return <Image className="w-4 h-4" />;
  if (['zip', 'rar', '7z'].includes(ext)) return <Archive className="w-4 h-4" />;
  if (ext === 'pdf') return <FileText className="w-4 h-4" />;
  return <File className="w-4 h-4" />;
}

// ─── File card ────────────────────────────────────────────────
function FileCard({ file, isAdmin, onDelete }: { file: any; isAdmin: boolean; onDelete: () => void }) {
  const displayName = file.file_name || file.name || '';
  const ext   = displayName.split('.').pop()?.toLowerCase() || '';
  const rawSize = file.file_size_bytes || file.file_size || 0;
  const size  = rawSize ? `${(rawSize / 1024).toFixed(0)} KB` : '';
  const color = ext === 'pdf' ? '#EF4444' : ['jpg', 'png', 'webp'].includes(ext) ? '#10B981' : '#818CF8';
  const isPdf = ext === 'pdf';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 p-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-all group"
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: hexToRgba(color, 0.15), color }}>
        <FileIcon name={displayName} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-black text-white line-clamp-1">{displayName}</p>
        <p className="text-[9px] text-white/30 font-bold mt-0.5">
          {isPdf && <span className="text-amber-400/60 mr-2">PDF · Google Drive</span>}
          {size}{size && ' · '}{file.created_at && format(parseISO(file.created_at), 'd MMM yyyy', { locale: ms })}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <a
          href={file.drive_download_url || file.drive_view_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all opacity-0 group-hover:opacity-100"
          style={{ background: hexToRgba(THEME, 0.15), color: THEME, border: `1px solid ${hexToRgba(THEME, 0.25)}` }}
          title="Muat turun fail ini"
        >
          <Download className="w-3 h-3" />
          Muat Turun
        </a>
        {isAdmin && (
          <button onClick={onDelete}
            className="p-1.5 rounded-xl text-white/20 hover:text-rose-400 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100">
            ×
          </button>
        )}
      </div>
      {/* Mobile always-visible download */}
      <a
        href={file.drive_download_url || file.drive_view_url}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 text-white/30 hover:text-white/60 transition-colors md:hidden"
      >
        <Download className="w-4 h-4" />
      </a>
    </motion.div>
  );
}

// ─── Folder card ──────────────────────────────────────────────
function FolderCard({ folder, isOpen, onClick, fileCount }: any) {
  return (
    <button
      onClick={onClick}
      className="w-full p-4 rounded-2xl border transition-all text-left hover:scale-[1.01] active:scale-[0.99]"
      style={isOpen
        ? { borderColor: hexToRgba(THEME, 0.4), background: hexToRgba(THEME, 0.08) }
        : { borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }
      }
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: isOpen ? hexToRgba(THEME, 0.2) : hexToRgba(THEME, 0.1), color: THEME }}>
          {isOpen ? <FolderOpen className="w-5 h-5" /> : <Folder className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-white text-left">{folder.name}</p>
          {folder.description && (
            <p className="text-[10px] text-white/30 font-medium mt-0.5 line-clamp-1 text-left">{folder.description}</p>
          )}
          <p className="text-[9px] text-white/20 font-bold mt-1 text-left">{fileCount} fail</p>
        </div>
        <ChevronRight className={`w-4 h-4 text-white/20 shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
      </div>
    </button>
  );
}

// ─── Main Folder Page ─────────────────────────────────────────
export function AkademikFolderPage() {
  const { profile } = useAuth();
  // Semua pengguna adalah 'admin' untuk folder peribadi mereka sendiri
  const isAdmin = true;

  const [folders,        setFolders]        = useState<any[]>([]);
  const [filesMap,       setFilesMap]       = useState<Record<string, any[]>>({});
  const [loadedFolders,  setLoadedFolders]  = useState<Set<string>>(new Set());
  const [openFolder,     setOpenFolder]     = useState<string | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [uploadingFor,   setUploadingFor]   = useState<string | null>(null);
  const [showCreate,     setShowCreate]     = useState(false);
  const [newFolder,      setNewFolder]      = useState({ name: '', description: '' });
  const [showPresets,    setShowPresets]    = useState(false);

  // ZIP download state
  const [zipping,        setZipping]        = useState<'folder' | 'all' | null>(null);
  const [zipProgress,    setZipProgress]    = useState({ done: 0, total: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFolders = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('akademik_folders')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) console.error('[folder] load error:', error.message);
    setFolders(data || []);
    setLoading(false);
  }, []);

  const loadFilesForFolder = useCallback(async (folderId: string, force = false) => {
    if (!force && loadedFolders.has(folderId)) return;
    const { data, error } = await supabase
      .from('akademik_files')
      .select('*')
      .eq('folder_id', folderId)
      .order('created_at', { ascending: false });
    if (error) console.error('[folder] files error:', error.message);
    setFilesMap(p => ({ ...p, [folderId]: data || [] }));
    setLoadedFolders(p => new Set([...p, folderId]));
  }, [loadedFolders]);

  useEffect(() => { loadFolders(); }, [loadFolders]);
  useEffect(() => {
    if (openFolder) loadFilesForFolder(openFolder);
  }, [openFolder]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingFor) return;
    e.target.value = '';

    const folderId = uploadingFor;
    setUploadingFor(null);

    try {
      toast.loading('Memuat naik fail...', { id: 'file-upload' });
      let url: string;
      if (file.type === 'application/pdf') {
        url = await uploadPdfToDrive(file, `akademik/folders/${folderId}`, file.name.replace(/\.[^.]+$/, ''));
      } else {
        url = await uploadFileToDrive(file, `akademik/folders/${folderId}`, file.name.replace(/\.[^.]+$/, ''));
      }
      const { error: insertError } = await supabase.from('akademik_files').insert({
        folder_id:          folderId,
        name:               file.name,
        file_name:          file.name,
        drive_view_url:     url,
        drive_download_url: url.includes('/view') ? url.replace('/view', '/download') : url,
        file_size_bytes:    file.size,
        file_type:          file.type || 'application/octet-stream',
        uploaded_by:        profile?.id,
      });
      if (insertError) throw insertError;
      toast.success('Fail berjaya dimuat naik!', { id: 'file-upload' });
      await loadFilesForFolder(folderId, true);
    } catch (e: any) {
      toast.error(`Gagal muat naik: ${e.message}`, { id: 'file-upload' });
    }
  };

  const triggerUpload = (folderId: string) => {
    setUploadingFor(folderId);
    setTimeout(() => fileInputRef.current?.click(), 50);
  };
  const handleDeleteFile = async (fileId: string, folderId: string) => {
    if (!confirm('Padam fail ini?')) return;
    const { error } = await supabase.from('akademik_files').delete().eq('id', fileId);
    if (error) { toast.error('Gagal padam fail.'); return; }
    setFilesMap(p => ({ ...p, [folderId]: (p[folderId] || []).filter(f => f.id !== fileId) }));
    toast.success('Fail dipadam.');
  };

  const handleCreateFolder = async () => {
    if (!newFolder.name) { toast.error('Nama folder diperlukan.'); return; }
    const { error } = await supabase.from('akademik_folders').insert({
      name: newFolder.name,
      description: newFolder.description || null,
      created_by: profile?.id,
    });
    if (error) { toast.error(`Gagal: ${error.message}`); return; }
    toast.success('Folder dicipta!');
    setNewFolder({ name: '', description: '' });
    setShowCreate(false);
    loadFolders();
  };

  // ── ZIP: Download one folder ──────────────────────────────────
  const handleDownloadFolder = async (folder: any) => {
    const files = filesMap[folder.id] || [];
    if (files.length === 0) { toast.error('Folder ini kosong.'); return; }

    setZipping('folder');
    setZipProgress({ done: 0, total: files.length });
    const toastId = 'zip-folder';

    try {
      toast.loading(`Menyediakan ZIP "${folder.name}"...`, { id: toastId });
      const failedCount = await buildAndDownloadZip(
        { [folder.id]: { folderName: folder.name, files } },
        sanitizeFilename(folder.name),
        (done, total) => {
          setZipProgress({ done, total });
          toast.loading(`Menyediakan ZIP... (${done}/${total} fail)`, { id: toastId });
        }
      );
      if (failedCount > 0) {
        toast.success(
          `ZIP berjaya! (${failedCount} fail gagal dimuat turun — semak _gagal.txt dalam ZIP)`,
          { id: toastId, duration: 7000 }
        );
      } else {
        toast.success(`ZIP "${folder.name}" berjaya! Semua fail termasuk. ✅`, { id: toastId });
      }
    } catch (e: any) {
      toast.error(e.message || 'Gagal buat ZIP.', { id: toastId });
    } finally {
      setZipping(null);
    }
  };

  // ── ZIP: Download all folders ─────────────────────────────────
  const handleDownloadAll = async () => {
    if (folders.length === 0) { toast.error('Tiada folder untuk dimuat turun.'); return; }

    setZipping('all');
    const toastId = 'zip-all';

    try {

      // Load all unloaded folders first
      toast.loading('Memuat data folder...', { id: toastId });
      await Promise.all(folders.map(f => loadFilesForFolder(f.id, false)));

      // Brief delay to allow state to settle
      await new Promise(r => setTimeout(r, 300));

      const allFiles = folders.reduce((s, f) => s + (filesMap[f.id] || []).length, 0);
      setZipProgress({ done: 0, total: allFiles });

      const folderMap: Record<string, { folderName: string; files: any[] }> = {};
      for (const folder of folders) {
        const files = filesMap[folder.id] || [];
        if (files.length > 0) {
          folderMap[folder.id] = { folderName: folder.name, files };
        }
      }

      if (Object.keys(folderMap).length === 0) {
        toast.error('Semua folder kosong.', { id: toastId });
        setZipping(null);
        return;
      }

      toast.loading(`Menyediakan ZIP keseluruhan...`, { id: toastId });
      const failedCount = await buildAndDownloadZip(
        folderMap,
        'akademik_dokumen',
        (done, total) => {
          setZipProgress({ done, total });
          toast.loading(`Menyediakan ZIP keseluruhan... (${done}/${total} fail)`, { id: toastId });
        }
      );

      if (failedCount > 0) {
        toast.success(
          `ZIP keseluruhan berjaya! (${failedCount} fail gagal — semak _gagal.txt dalam ZIP)`,
          { id: toastId, duration: 8000 }
        );
      } else {
        toast.success('ZIP keseluruhan berjaya! Semua fail termasuk. ✅', { id: toastId });
      }
    } catch (e: any) {
      toast.error(e.message || 'Gagal buat ZIP.', { id: toastId });
    } finally {
      setZipping(null);
    }
  };

  const isZipping = zipping !== null;

  return (
    <div className="space-y-6">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="*/*"
        onChange={handleFileChange}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/25 mb-1">Akademik</p>
          <h1 className="text-2xl font-black text-white">Dokumen Peribadi</h1>
          <p className="text-xs text-white/40 font-medium mt-1">Muat naik dan simpan sijil serta dokumen akademik anda</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Download All ZIP */}
          <button
            onClick={handleDownloadAll}
            disabled={isZipping || folders.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-40"
            style={{ background: hexToRgba('#34D399', 0.12), color: '#34D399', border: `1px solid ${hexToRgba('#34D399', 0.2)}` }}
            title="Muat turun semua dokumen sebagai ZIP"
          >
            {zipping === 'all'
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <FolderArchive className="w-3.5 h-3.5" />
            }
            {zipping === 'all'
              ? `${zipProgress.done}/${zipProgress.total}`
              : 'Muat Turun Semua'
            }
          </button>

          {isAdmin && (
            <button
              onClick={() => setShowCreate(p => !p)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
              style={{ background: hexToRgba(THEME, 0.15), color: THEME, border: `1px solid ${hexToRgba(THEME, 0.25)}` }}
            >
              <Plus className="w-3.5 h-3.5" />
              Folder Baru
            </button>
          )}
        </div>
      </div>

      {/* PDF notice */}
      <div className="flex items-start gap-2 px-4 py-3 rounded-2xl border border-amber-500/15 bg-amber-500/[0.06]">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400/70 shrink-0 mt-0.5" />
        <p className="text-[10px] text-amber-300/60 font-medium leading-relaxed">
          <span className="font-black text-amber-300/80">Nota:</span> Fail PDF disimpan di Google Drive (jimat storan) — muat turun terus via butang atau link. Gambar boleh disertakan dalam ZIP.
        </p>
      </div>

      {/* Create folder form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Folder Baru</p>

              <div>
                <button
                  onClick={() => setShowPresets(p => !p)}
                  className="flex items-center justify-between w-full bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white/70 transition-all mb-3 font-medium group"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                    <span>Pilih cadangan folder...</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-white/30 transition-transform ${showPresets ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {showPresets && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                        {FOLDER_PRESETS.map(p => (
                          <button
                            key={p.name}
                            onClick={() => {
                              setNewFolder({ name: p.name, description: p.description });
                              setShowPresets(false);
                            }}
                            className="flex flex-col gap-0.5 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] text-left hover:bg-white/[0.06] hover:border-white/[0.12] transition-all"
                          >
                            <span className="text-[11px] font-black text-white/70">{p.name}</span>
                            <span className="text-[9px] text-white/30 font-medium">{p.description}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <input
                value={newFolder.name}
                onChange={e => setNewFolder(p => ({ ...p, name: e.target.value }))}
                placeholder="Nama folder *"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-white/20 font-bold"
              />
              <input
                value={newFolder.description}
                onChange={e => setNewFolder(p => ({ ...p, description: e.target.value }))}
                placeholder="Penerangan folder (optional)"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-white/20"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreateFolder}
                  className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest"
                  style={{ background: THEME, color: '#fff' }}
                >
                  Cipta Folder
                </button>
                <button
                  onClick={() => { setShowCreate(false); setShowPresets(false); }}
                  className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-white/30 bg-white/[0.04]"
                >
                  Batal
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Folder list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-2xl bg-white/[0.03] animate-pulse" />)}
        </div>
      ) : folders.length === 0 ? (
        <div className="py-20 text-center space-y-3">
          <Folder className="w-10 h-10 mx-auto text-white/10" />
          <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Tiada folder peribadi</p>
          <p className="text-[10px] text-white/15">Klik "Folder Baru" untuk mula simpan dokumen anda</p>
        </div>
      ) : (
        <div className="space-y-3">
          {folders.map(folder => {
            const isOpen = openFolder === folder.id;
            const files  = filesMap[folder.id] || [];
            const isCurrentlyUploading = uploadingFor === folder.id;

            return (
              <div key={folder.id}>
                <FolderCard
                  folder={folder}
                  isOpen={isOpen}
                  onClick={() => setOpenFolder(isOpen ? null : folder.id)}
                  fileCount={files.length}
                />

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="ml-4 mt-2 space-y-2 pl-4 border-l border-white/[0.06]">
                        {/* Folder action bar */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {isAdmin && (
                            <button
                              onClick={() => triggerUpload(folder.id)}
                              disabled={!!uploadingFor}
                              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-40"
                              style={{ background: hexToRgba(THEME, 0.1), color: THEME, border: `1px solid ${hexToRgba(THEME, 0.2)}` }}
                            >
                              {isCurrentlyUploading
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : <Upload className="w-3 h-3" />
                              }
                              {isCurrentlyUploading ? 'Memuat Naik...' : 'Muat Naik Fail'}
                            </button>
                          )}

                          {/* Download folder as ZIP */}
                          {files.length > 0 && (
                            <button
                              onClick={() => handleDownloadFolder(folder)}
                              disabled={isZipping}
                              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-40"
                              style={{ background: hexToRgba('#34D399', 0.08), color: '#34D399', border: `1px solid ${hexToRgba('#34D399', 0.15)}` }}
                              title="Muat turun semua fail dalam folder ini sebagai ZIP"
                            >
                              {zipping === 'folder'
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : <PackageOpen className="w-3 h-3" />
                              }
                              {zipping === 'folder'
                                ? `${zipProgress.done}/${zipProgress.total}`
                                : `Muat Turun Folder (${files.length} fail)`
                              }
                            </button>
                          )}
                        </div>

                        {files.length === 0 ? (
                          <div className="py-6 text-center">
                            <p className="text-[10px] text-white/20 font-medium">Tiada fail dalam folder ini</p>
                            {isAdmin && <p className="text-[9px] text-white/10 mt-1">Klik "Muat Naik Fail" untuk tambah dokumen</p>}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {files.map(file => (
                              <FileCard
                                key={file.id}
                                file={file}
                                isAdmin={isAdmin}
                                onDelete={() => handleDeleteFile(file.id, folder.id)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
