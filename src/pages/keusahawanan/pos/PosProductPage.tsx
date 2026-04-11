import React, { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useExcoTheme } from '@/contexts/ExcoThemeContext';
import { useBusinessSwitcher } from '@/contexts/BusinessSwitcherContext';
import { usePosData } from '@/hooks/usePosData';
import { supabase } from '@/lib/supabase';
import { hexToRgba } from '@/lib/utils';
import {
  Plus, Search, Edit2, Trash2, Package, AlertTriangle,
  Eye, EyeOff, Save, X, Camera, Check, ChevronDown,
} from 'lucide-react';
import { type BusinessProduct } from '@/types';
import toast from 'react-hot-toast';

const CATEGORIES = ['Makanan', 'Minuman', 'Aksesori', 'Perkhidmatan', 'Pakaian', 'Elektronik', 'Umum'];

const EMPTY_FORM = {
  name: '', description: '', price: '', category: 'Umum',
  stock_quantity: '10', stock_alert_threshold: '5', is_available: true, image_url: '',
};

export function PosProductPage() {
  const { color } = useExcoTheme();
  const { selectedBusiness, isKeusahawananAdmin } = useBusinessSwitcher();
  const businessId = selectedBusiness?.id;
  const isOwner = isKeusahawananAdmin || (selectedBusiness as any)?.myRole === 'OWNER';

  const pos = usePosData(businessId);

  const [search, setSearch]     = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]     = useState<string | null>(null);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving]      = useState(false);

  const filtered = pos.products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setEditId(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = (p: BusinessProduct) => {
    setEditId(p.id);
    setForm({
      name: p.name, description: p.description || '', price: String(p.price),
      category: p.category, stock_quantity: String(p.stock_quantity),
      stock_alert_threshold: String(p.stock_alert_threshold),
      is_available: p.is_available, image_url: p.image_url || '',
    });
    setShowForm(true);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !businessId) return;
    setUploading(true);
    const file = e.target.files[0];
    const path = `${businessId}/${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('keusahawanan-products').upload(path, file);
    if (error) { toast.error('Gagal muat naik: ' + error.message); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('keusahawanan-products').getPublicUrl(path);
    setForm(f => ({ ...f, image_url: publicUrl }));
    setUploading(false);
    toast.success('Gambar dimuat naik!');
  };

  const handleSave = async () => {
    if (!businessId) return;
    if (!form.name.trim()) { toast.error('Nama produk wajib diisi.'); return; }
    if (!form.price || parseFloat(form.price) < 0) { toast.error('Harga tidak sah.'); return; }
    setSaving(true);

    const payload = {
      name:                  form.name.trim(),
      description:           form.description.trim() || null,
      price:                 parseFloat(form.price),
      category:              form.category,
      stock_quantity:        parseInt(form.stock_quantity) || 0,
      stock_alert_threshold: parseInt(form.stock_alert_threshold) || 5,
      is_available:          form.is_available,
      image_url:             form.image_url || null,
    };

    if (editId) {
      await pos.updateProduct(editId, businessId, payload);
    } else {
      await pos.addProduct(businessId, payload as any);
    }
    setSaving(false);
    setShowForm(false);
  };

  const handleDelete = async (p: BusinessProduct) => {
    if (!window.confirm(`Padam "${p.name}"? Tindakan ini tidak boleh diundur.`)) return;
    if (businessId) await pos.deleteProduct(p.id, businessId, p.name);
  };

  const handleToggleAvailable = async (p: BusinessProduct) => {
    if (!businessId) return;
    await pos.updateProduct(p.id, businessId, { is_available: !p.is_available });
  };

  return (
    <div className="min-h-full p-4 sm:p-6 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-5 rounded-full" style={{ background: color }} />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/50">POS</p>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Katalog Produk</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{pos.products.length} produk dalam katalog</p>
        </div>
        {isOwner && (
          <button onClick={openAdd}
            className="flex items-center gap-2.5 h-12 px-6 rounded-2xl text-white text-xs font-black uppercase tracking-wider shadow-lg transition-all hover:brightness-110 active:scale-95"
            style={{ background: color }}>
            <Plus className="w-4 h-4" /> Tambah Produk
          </button>
        )}
      </motion.div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Cari produk..."
          className="w-full h-11 pl-12 pr-4 rounded-2xl text-sm font-medium outline-none bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/40 focus:border-border transition-all" />
      </div>

      {/* Product grid */}
      {pos.isLoading ? (
        <div className="h-40 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: color, borderTopColor: 'transparent' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-sm font-black text-muted-foreground/40">Tiada produk ditemui</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((p, i) => {
            const isLow = p.stock_quantity > 0 && p.stock_quantity <= p.stock_alert_threshold;
            const isOut = p.stock_quantity === 0;
            return (
              <motion.div key={p.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 * i }}
                className="rounded-2xl bg-card border border-border overflow-hidden shadow-sm hover:shadow-md transition-all group">
                {/* Image */}
                <div className="aspect-video bg-muted/30 relative overflow-hidden">
                  {p.image_url
                    ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    : <div className="w-full h-full flex items-center justify-center"><Package className="w-10 h-10 text-muted-foreground/20" /></div>
                  }
                  {/* Status overlays */}
                  {!p.is_available && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><span className="text-[10px] font-black uppercase text-white tracking-widest">Tidak Aktif</span></div>}
                  {isOut && <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-black">HABIS</div>}
                  {isLow && !isOut && <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center gap-1"><AlertTriangle className="w-2.5 h-2.5" /> Stok: {p.stock_quantity}</div>}
                </div>
                {/* Info */}
                <div className="p-4">
                  <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/40 mb-0.5">{p.category}</p>
                  <h3 className="text-sm font-black text-foreground leading-tight line-clamp-2 mb-2">{p.name}</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-black" style={{ color }}>{`RM ${p.price.toFixed(2)}`}</span>
                    <span className="text-xs text-muted-foreground">Stok: {p.stock_quantity}</span>
                  </div>
                  {isOwner && (
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => handleToggleAvailable(p)}
                        className="flex-1 h-8 rounded-xl text-[10px] font-black uppercase border border-border flex items-center justify-center gap-1.5 hover:bg-muted/50 transition-colors"
                        style={{ color: p.is_available ? color : 'hsl(var(--muted-foreground))' }}>
                        {p.is_available ? <><Eye className="w-3 h-3" /> Aktif</> : <><EyeOff className="w-3 h-3" /> Nyahaktif</>}
                      </button>
                      <button onClick={() => openEdit(p)}
                        className="w-8 h-8 rounded-xl bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors">
                        <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                      <button onClick={() => handleDelete(p)}
                        className="w-8 h-8 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 flex items-center justify-center transition-colors">
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Form Modal - PORTALED TO escaped stacking contexts */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showForm && (
            <div className="fixed inset-0 z-[9999]">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="absolute inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto rounded-3xl bg-card border border-border shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-hide">
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black">{editId ? 'Edit Produk' : 'Produk Baharu'}</h3>
                    <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button>
                  </div>

                  {/* Image upload */}
                  <div className="relative group">
                    <div className="aspect-video bg-muted/30 rounded-2xl overflow-hidden border border-border flex items-center justify-center">
                      {form.image_url
                        ? <img src={form.image_url} alt="preview" className="w-full h-full object-cover" />
                        : <Package className="w-12 h-12 text-muted-foreground/20" />
                      }
                      <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-2xl gap-2">
                        <Camera className="w-6 h-6 text-white" />
                        <span className="text-[11px] font-black text-white">{uploading ? 'Memuat naik...' : 'Tukar Gambar'}</span>
                        <input type="file" accept="image/*" className="hidden" onClick={e => e.stopPropagation()} onChange={handleUpload} disabled={uploading} />
                      </label>
                    </div>
                  </div>

                  {/* Fields */}
                  {[
                    { label: 'Nama Produk', key: 'name', type: 'text', placeholder: 'Nasi Lemak Ayam' },
                    { label: 'Harga (RM)', key: 'price', type: 'number', placeholder: '5.50' },
                    { label: 'Stok', key: 'stock_quantity', type: 'number', placeholder: '20' },
                    { label: 'Had Amaran Stok', key: 'stock_alert_threshold', type: 'number', placeholder: '5' },
                  ].map(field => (
                    <div key={field.key}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1.5">{field.label}</p>
                      <input type={field.type} value={(form as any)[field.key]} onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        className="w-full h-10 px-4 rounded-xl text-sm font-medium outline-none bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/40 focus:border-border transition-all" />
                    </div>
                  ))}

                  {/* Category select */}
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1.5">Kategori</p>
                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                      className="w-full h-10 px-4 rounded-xl text-sm font-medium outline-none bg-muted/30 border border-border/50 text-foreground focus:border-border transition-all">
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  {/* Description */}
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1.5">Penerangan (Pilihan)</p>
                    <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Penerangan ringkas produk..."
                      className="w-full h-20 px-4 py-3 rounded-xl text-sm font-medium outline-none bg-muted/30 border border-border/50 text-foreground resize-none placeholder:text-muted-foreground/40 focus:border-border transition-all" />
                  </div>

                  {/* Available toggle */}
                  <button onClick={() => setForm(f => ({ ...f, is_available: !f.is_available }))}
                    className="flex items-center gap-3 w-full p-3 rounded-xl bg-muted/30 hover:bg-muted/50 border border-border/50 transition-colors">
                    <div className={`w-10 h-5.5 rounded-full transition-colors relative ${form.is_available ? '' : 'bg-muted'}`}
                      style={form.is_available ? { background: color } : {}}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.is_available ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </div>
                    <span className="text-xs font-black text-foreground">{form.is_available ? 'Produk Aktif — Boleh Dijual' : 'Produk Tidak Aktif'}</span>
                  </button>

                  {/* Save */}
                  <button onClick={handleSave} disabled={saving}
                    className="w-full h-12 rounded-2xl text-white text-xs font-black uppercase tracking-wider disabled:opacity-50 shadow-lg transition-all hover:brightness-110"
                    style={{ background: color }}>
                    {saving ? 'Menyimpan...' : editId ? 'Kemaskini Produk' : 'Tambah Produk'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      , document.body)}
    </div>
  );
}
