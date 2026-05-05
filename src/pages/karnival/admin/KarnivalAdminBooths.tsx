import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useKarnival, KarnivalCategory } from '@/contexts/KarnivalContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import QRCode from 'react-qr-code';
import {
  Store, Plus, Trash2, QrCode, Download, Loader2,
  Save, Upload, X, ImageIcon,
} from 'lucide-react';

interface BoothForm {
  category_id: string;
  kelab_name: string;
  booth_number: string;
  theme: string;
  description: string;
  image_url: string;
}
const defaultForm = (): BoothForm => ({
  category_id: '', kelab_name: '', booth_number: '', theme: '', description: '', image_url: '',
});

const APP_URL = window.location.origin;

export function KarnivalAdminBooths() {
  const { edition, categories, booths, refetch } = useKarnival();
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [showForm, setShowForm]   = useState(false);
  const [editId, setEditId]       = useState<string | null>(null);
  const [form, setForm]           = useState<BoothForm>(defaultForm());
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [qrBooth, setQrBooth]     = useState<string | null>(null); // booth ID untuk preview QR
  const fileInputRef = useRef<HTMLInputElement>(null);

  const update = (k: keyof BoothForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  const selectedCat   = activeCat ? categories.find(c => c.id === activeCat) : categories[0];
  const filteredBooths = booths.filter(b => b.category_id === (selectedCat?.id ?? ''));

  const openCreate = () => {
    setForm({ ...defaultForm(), category_id: selectedCat?.id ?? '' });
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (booth: any) => {
    setForm({
      category_id:  booth.category_id,
      kelab_name:   booth.kelab_name,
      booth_number: booth.booth_number ?? '',
      theme:        booth.theme ?? '',
      description:  booth.description ?? '',
      image_url:    booth.image_url ?? '',
    });
    setEditId(booth.id);
    setShowForm(true);
  };

  // ── Image upload ────────────────────────────────────────────
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { compressImage } = await import('@/lib/imageCompression');
    const compressedFile = await compressImage(file);
    
    const ext  = compressedFile.name.split('.').pop();
    const path = `booth-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('karnival-booths').upload(path, compressedFile, { upsert: true, contentType: compressedFile.type });
    if (error) { toast.error('Upload gagal: ' + error.message); }
    else {
      const { data: urlData } = supabase.storage.from('karnival-booths').getPublicUrl(path);
      update('image_url', urlData.publicUrl);
      toast.success('Gambar berjaya dimuatnaik!');
    }
    setUploading(false);
  };

  // ── Save booth ──────────────────────────────────────────────
  const handleSave = async () => {
    if (!edition) return;
    if (!form.kelab_name.trim()) { toast.error('Nama booth/kelab diperlukan'); return; }
    if (!form.category_id) { toast.error('Pilih kategori'); return; }
    setSaving(true);

    const payload = {
      edition_id:  edition.id,
      category_id: form.category_id,
      kelab_name:  form.kelab_name.trim(),
      booth_number: form.booth_number.trim() || null,
      theme:       form.theme.trim() || null,
      description: form.description.trim() || null,
      image_url:   form.image_url || null,
    };

    let error;
    if (editId) {
      ({ error } = await supabase.from('karnival_booths').update(payload).eq('id', editId));
    } else {
      ({ error } = await supabase.from('karnival_booths').insert(payload));
    }

    if (error) {
      if (error.code === '23505')
        toast.error('Nama booth ini sudah wujud dalam kategori yang sama! Tukar nama atau pilih kategori lain.');
      else toast.error(error.message);
    } else {
      toast.success(editId ? 'Booth dikemas kini!' : 'Booth ditambah!');
      setShowForm(false);
      setEditId(null);
      refetch();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Padam booth "${name}"? Semua undi untuk booth ini akan turut dipadam.`)) return;
    setDeleting(id);
    const { error } = await supabase.from('karnival_booths').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Booth dipadam'); refetch(); }
    setDeleting(null);
  };

  // ── Download QR as PNG ──────────────────────────────────────
  const downloadQr = useCallback((boothId: string, boothName: string) => {
    const svg = document.getElementById(`qr-${boothId}`);
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas  = document.createElement('canvas');
    const ctx     = canvas.getContext('2d');
    const img     = new Image();
    canvas.width  = 400;
    canvas.height = 440;

    img.onload = () => {
      if (!ctx) return;
      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 400, 440);
      // QR
      ctx.drawImage(img, 50, 30, 300, 300);
      // Booth name text
      ctx.fillStyle = '#1a1a2e';
      ctx.font      = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(boothName, 200, 370);
      ctx.font      = '13px Arial';
      ctx.fillStyle = '#666';
      ctx.fillText('Imbas QR untuk mengundi', 200, 395);
      ctx.fillText('Karnival JPP POLISAS', 200, 415);

      const a = document.createElement('a');
      a.download = `QR-${boothName.replace(/\s+/g, '-')}.png`;
      a.href     = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  }, []);

  const inputCls = 'w-full px-4 py-2.5 rounded-xl bg-white/[0.08] border border-white/[0.15] text-sm font-medium text-white placeholder-white/40 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all';

  if (!edition) {
    return (
      <div className="text-center py-16 text-white/30">
        <Store className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p className="font-bold">Cipta edisi Karnival dahulu</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Category tabs ─────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => { setActiveCat(cat.id); setShowForm(false); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all flex-shrink-0 ${
              (activeCat ?? categories[0]?.id) === cat.id
                ? 'bg-violet-600 text-white'
                : 'bg-white/[0.04] border border-white/[0.15] text-white/50 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            {cat.icon_emoji} {cat.name}
            <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-[9px]">
              {booths.filter(b => b.category_id === cat.id).length}
            </span>
          </button>
        ))}
      </div>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-black text-white">
            {selectedCat ? `${selectedCat.icon_emoji} ${selectedCat.name}` : 'Booth'}
          </h2>
          <p className="text-xs text-white/60 mt-0.5">{filteredBooths.length} booth</p>
        </div>
        <button
          onClick={openCreate}
          disabled={!selectedCat}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-40"
        >
          <Plus className="w-3.5 h-3.5" />
          Tambah Booth
        </button>
      </div>

      {/* ── Form ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-2xl border border-violet-500/25 bg-violet-600/5 p-5 space-y-4 overflow-hidden"
          >
            <p className="text-xs font-black text-violet-300 uppercase tracking-widest">
              {editId ? 'Edit Booth' : 'Tambah Booth'}
            </p>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-1.5 block">Kategori</label>
              <select
                value={form.category_id}
                onChange={e => update('category_id', e.target.value)}
                className={inputCls}
              >
                <option value="">Pilih kategori...</option>
                {categories.map((c: KarnivalCategory) => (
                  <option key={c.id} value={c.id}>{c.icon_emoji} {c.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-1.5 block">Nama Kelab / Booth *</label>
                <input value={form.kelab_name} onChange={e => update('kelab_name', e.target.value)} placeholder="Kelab Muzik POLISAS" className={inputCls} />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-1.5 block">No. Booth</label>
                <input value={form.booth_number} onChange={e => update('booth_number', e.target.value)} placeholder="B-01" className={inputCls} />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-1.5 block">Tema Booth</label>
              <input value={form.theme} onChange={e => update('theme', e.target.value)} placeholder="Dunia Fantasi" className={inputCls} />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-1.5 block">Penerangan (optional)</label>
              <textarea value={form.description} onChange={e => update('description', e.target.value)} placeholder="Huraikan booth ini..." rows={2} className={`${inputCls} resize-none`} />
            </div>

            {/* Image upload */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-1.5 block">Gambar Booth</label>
              {form.image_url ? (
                <div className="relative inline-block">
                  <img src={form.image_url} alt="Preview" className="h-24 rounded-xl object-cover" />
                  <button
                    onClick={() => update('image_url', '')}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.08] border border-white/[0.15] text-xs font-bold text-white/50 hover:text-white hover:bg-white/[0.08] transition-all"
                >
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {uploading ? 'Uploading...' : 'Upload Gambar'}
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-black transition-all disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {editId ? 'Simpan' : 'Tambah Booth'}
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-all">
                Batal
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Booth list ─────────────────────────────────────────── */}
      {filteredBooths.length === 0 ? (
        <div className="text-center py-12 text-white/45">
          <Store className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="font-bold text-sm">Belum ada booth dalam kategori ini</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {filteredBooths.map((booth, i) => {
            const qrUrl = `${APP_URL}/karnival/undi?booth=${booth.id}`;
            return (
              <motion.div
                key={booth.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-2xl border border-white/[0.15] bg-white/[0.06] overflow-hidden"
              >
                {/* Image header */}
                {booth.image_url ? (
                  <div className="h-28 overflow-hidden">
                    <img src={booth.image_url} alt={booth.kelab_name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="h-16 bg-gradient-to-br from-violet-900/20 to-purple-900/10 flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-white/10" />
                  </div>
                )}

                <div className="p-4 space-y-3">
                  <div>
                    {booth.booth_number && (
                      <span className="text-[9px] font-black uppercase tracking-widest text-violet-400 bg-violet-600/15 px-2 py-0.5 rounded-full">
                        {booth.booth_number}
                      </span>
                    )}
                    <p className="text-sm font-black text-white mt-1">{booth.kelab_name}</p>
                    {booth.theme && <p className="text-[11px] text-white/40">"{booth.theme}"</p>}
                  </div>

                  {/* QR preview + controls */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setQrBooth(qrBooth === booth.id ? null : booth.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-bold text-white/50 hover:text-white transition-all"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        QR
                      </button>
                      <button
                        onClick={() => downloadQr(booth.id, booth.kelab_name)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600/15 hover:bg-violet-600/25 text-xs font-bold text-violet-400 transition-all"
                      >
                        <Download className="w-3.5 h-3.5" />
                        PNG
                      </button>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(booth)} className="px-3 py-1.5 rounded-xl text-xs font-bold text-white/40 hover:text-white hover:bg-white/[0.06] transition-all">Edit</button>
                      <button
                        onClick={() => handleDelete(booth.id, booth.kelab_name)}
                        disabled={deleting === booth.id}
                        className="p-1.5 rounded-xl text-rose-500/30 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                      >
                        {deleting === booth.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Hidden QR for download */}
                  <div style={{ position: 'absolute', left: '-9999px' }}>
                    <QRCode
                      id={`qr-${booth.id}`}
                      value={qrUrl}
                      size={300}
                      bgColor="#ffffff"
                      fgColor="#1a0533"
                    />
                  </div>

                  {/* QR preview */}
                  <AnimatePresence>
                    {qrBooth === booth.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="bg-white p-3 rounded-xl flex flex-col items-center gap-2">
                          <QRCode value={qrUrl} size={140} bgColor="#ffffff" fgColor="#1a0533" />
                          <p className="text-[10px] text-gray-600 font-bold text-center">{booth.kelab_name}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
