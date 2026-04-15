import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { hexToRgba } from '@/lib/utils';
import { uploadFileToDrive, uploadPdfToDrive } from '@/lib/driveUpload';
import {
  Folder, FolderOpen, File, Download, Upload, Plus, Loader2,
  FileText, Image, Archive, ChevronRight, Sparkles,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { ms } from 'date-fns/locale';

const THEME = '#818CF8';

// ─── Preset folder suggestions ────────────────────────────────
const FOLDER_PRESETS = [
  { name: 'Borang Permohonan JPP',    description: 'Borang-borang rasmi JPP untuk pelajar' },
  { name: 'Koleksi Nota & Rujukan',   description: 'Nota kuliah dan bahan rujukan akademik' },
  { name: 'Sumber Pembelajaran',      description: 'E-book, slides & modul pembelajaran' },
  { name: 'Jadual & Takwim',          description: 'Jadual kuliah, peperiksaan & aktiviti' },
  { name: 'Laporan & Minit Mesyuarat',description: 'Laporan rasmi JPP & minit mesyuarat' },
  { name: 'Sijil & Anugerah',         description: 'Template sijil dan borang pencalonan anugerah' },
  { name: 'Maklumat Bursary / Biasiswa', description: 'Flyers dan borang permohonan tajaan' },
  { name: 'Lain-lain',               description: 'Dokumen Am' },
];

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
      {/* Always-visible download for mobile */}
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
  const { profile, isSuperAdmin } = useAuth();
  const isAdmin = isSuperAdmin || profile?.role === 'JPP';

  const [folders,        setFolders]        = useState<any[]>([]);
  const [filesMap,       setFilesMap]       = useState<Record<string, any[]>>({});
  const [loadedFolders,  setLoadedFolders]  = useState<Set<string>>(new Set());
  const [openFolder,     setOpenFolder]     = useState<string | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [uploadingFor,   setUploadingFor]   = useState<string | null>(null); // which folder is uploading
  const [showCreate,     setShowCreate]     = useState(false);
  const [newFolder,      setNewFolder]      = useState({ name: '', description: '' });
  const [showPresets,    setShowPresets]    = useState(false);

  // Per-upload file input ref — controlled via hidden single input
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

  const loadFilesForFolder = useCallback(async (folderId: string) => {
    if (loadedFolders.has(folderId)) return; // already loaded
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

  // Single file input onChange — uses uploadingFor to know which folder
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingFor) return;
    e.target.value = ''; // reset so same file can be re-selected

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

      // The url from uploadPdfToDrive/uploadFileToDrive is the view URL (Google Drive)
      const { error: insertError } = await supabase.from('akademik_files').insert({
        folder_id:        folderId,
        name:             file.name,
        file_name:        file.name,
        drive_view_url:   url,
        drive_download_url: url.includes('/view') ? url.replace('/view', '/download') : url,
        file_size_bytes:  file.size,
        file_type:        file.type || 'application/octet-stream',
        uploaded_by:      profile?.id,
      });

      if (insertError) throw insertError;

      toast.success('Fail berjaya dimuat naik!', { id: 'file-upload' });

      // Reload files for this folder
      const { data } = await supabase
        .from('akademik_files')
        .select('*')
        .eq('folder_id', folderId)
        .order('created_at', { ascending: false });
      setFilesMap(p => ({ ...p, [folderId]: data || [] }));
      // Mark as loaded again
      setLoadedFolders(p => new Set([...p, folderId]));
    } catch (e: any) {
      toast.error(`Gagal muat naik: ${e.message}`, { id: 'file-upload' });
    }
  };

  const triggerUpload = (folderId: string) => {
    setUploadingFor(folderId);
    // Use setTimeout to ensure state is updated before click
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

  return (
    <div className="space-y-6">
      {/* Hidden single file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="*/*"
        onChange={handleFileChange}
      />

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/25 mb-1">Akademik</p>
          <h1 className="text-2xl font-black text-white">Dokumen & Sumber</h1>
          <p className="text-xs text-white/40 font-medium mt-1">Muat turun borang, nota, dan sumber akademik JPP</p>
        </div>
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

              {/* Presets */}
              <div>
                <button
                  onClick={() => setShowPresets(p => !p)}
                  className="flex items-center gap-1.5 text-[10px] font-black text-white/30 hover:text-white/50 transition-colors uppercase tracking-widest mb-2"
                >
                  <Sparkles className="w-3 h-3" />
                  Pilih dari cadangan
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
          <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Tiada folder lagi</p>
          {isAdmin && <p className="text-[10px] text-white/15">Klik "Folder Baru" untuk mulakan</p>}
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
                        {/* Upload button — admin only */}
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
