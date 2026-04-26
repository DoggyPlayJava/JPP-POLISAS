import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useKarnival } from '@/contexts/KarnivalContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { Plus, Trash2, GripVertical, Loader2, Tag, Save } from 'lucide-react';

const EMOJI_SUGGESTIONS = ['🏆', '🎨', '🌟', '🎪', '🎭', '🖼️', '🏅', '✨', '🎯', '🌈', '🎉', '🔥'];

interface CatForm { name: string; description: string; icon_emoji: string; max_votes: number; }
const defaultForm = (): CatForm => ({ name: '', description: '', icon_emoji: '🏆', max_votes: 1 });

export function KarnivalAdminCategories() {
  const { edition, categories, refetch } = useKarnival();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState<CatForm>(defaultForm());
  const [editId, setEditId]     = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const update = (k: keyof CatForm, v: any) => setForm(f => ({ ...f, [k]: v }));

  const openCreate = () => { setForm(defaultForm()); setEditId(null); setShowForm(true); };
  const openEdit   = (cat: any) => {
    setForm({ name: cat.name, description: cat.description ?? '', icon_emoji: cat.icon_emoji, max_votes: cat.max_votes });
    setEditId(cat.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!edition) return;
    if (!form.name.trim()) { toast.error('Nama kategori diperlukan'); return; }
    setSaving(true);

    const payload = {
      edition_id:  edition.id,
      name:        form.name.trim(),
      description: form.description.trim() || null,
      icon_emoji:  form.icon_emoji,
      max_votes:   Math.max(1, form.max_votes),
      sort_order:  editId ? undefined : categories.length,
    };

    let error;
    if (editId) {
      ({ error } = await supabase.from('karnival_categories').update(payload).eq('id', editId));
    } else {
      ({ error } = await supabase.from('karnival_categories').insert(payload));
    }

    if (error) toast.error(error.message);
    else {
      toast.success(editId ? 'Kategori dikemas kini!' : 'Kategori ditambah!');
      setShowForm(false);
      setEditId(null);
      refetch();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Padam kategori "${name}"? Semua booth dalam kategori ini akan turut dipadam.`)) return;
    setDeleting(id);
    const { error } = await supabase.from('karnival_categories').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Kategori dipadam'); refetch(); }
    setDeleting(null);
  };

  const inputCls = 'w-full px-4 py-2.5 rounded-xl bg-white/[0.08] border border-white/[0.15] text-sm font-medium text-white placeholder-white/40 outline-none focus:border-violet-500/70 focus:ring-1 focus:ring-violet-500/30 transition-all';

  if (!edition) {
    return (
      <div className="text-center py-16 text-white/50">
        <Tag className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p className="font-bold">Cipta edisi Karnival dahulu</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-black text-white">Kategori Pertandingan</h2>
          <p className="text-xs text-white/60 mt-0.5">{categories.length} kategori</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-black uppercase tracking-widest transition-all active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          Tambah Kategori
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
              {editId ? 'Edit Kategori' : 'Kategori Baru'}
            </p>

            {/* Emoji picker */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-2 block">Ikon</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {EMOJI_SUGGESTIONS.map(e => (
                  <button
                    key={e}
                    onClick={() => update('icon_emoji', e)}
                    className={`text-xl p-2 rounded-xl transition-all ${form.icon_emoji === e ? 'bg-violet-600/30 ring-2 ring-violet-500/50' : 'bg-white/[0.04] hover:bg-white/[0.08]'}`}
                  >
                    {e}
                  </button>
                ))}
                <input
                  value={form.icon_emoji}
                  onChange={e => update('icon_emoji', e.target.value)}
                  className="w-14 px-2 py-2 rounded-xl bg-white/[0.04] border border-white/[0.09] text-xl text-center outline-none"
                  maxLength={4}
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-1.5 block">Nama Kategori *</label>
              <input value={form.name} onChange={e => update('name', e.target.value)} placeholder="Booth Paling Kreatif" className={inputCls} />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-1.5 block">Penerangan (optional)</label>
              <input value={form.description} onChange={e => update('description', e.target.value)} placeholder="Huraikan kriteria penilaian..." className={inputCls} />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-1.5 block">
                Max Undi Per Pelajar
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={form.max_votes}
                onChange={e => update('max_votes', parseInt(e.target.value) || 1)}
                className={`${inputCls} w-24`}
              />
              <p className="text-[10px] text-white/45 mt-1">Berapa kali setiap pelajar boleh undi dalam kategori ini</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-black transition-all disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {editId ? 'Simpan' : 'Tambah'}
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-all">
                Batal
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── List ────────────────────────────────────────────────── */}
      {categories.length === 0 ? (
        <div className="text-center py-12 text-white/45">
          <Tag className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="font-bold text-sm">Belum ada kategori</p>
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-3 p-4 rounded-2xl border border-white/[0.15] bg-white/[0.06] hover:bg-white/[0.04] transition-all group"
            >
              <GripVertical className="w-4 h-4 text-white/15 flex-shrink-0" />
              <span className="text-2xl flex-shrink-0">{cat.icon_emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-white">{cat.name}</p>
                <p className="text-[10px] text-white/60 mt-0.5">
                  Max {cat.max_votes} undi per pelajar
                  {cat.description && ` · ${cat.description}`}
                </p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openEdit(cat)}
                  className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/[0.08] transition-all text-xs font-bold"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(cat.id, cat.name)}
                  disabled={deleting === cat.id}
                  className="p-2 rounded-xl text-rose-500/40 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                >
                  {deleting === cat.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
