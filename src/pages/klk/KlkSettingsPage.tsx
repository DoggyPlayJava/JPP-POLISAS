// ============================================================
// KlkSettingsPage — Tetapan Modul KLK (/klk/tetapan)
// Akses: Exco KLS + SUPER_ADMIN_JPP
// ============================================================
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Settings, MapPin, Upload, Wifi, Eye, EyeOff,
  Trash2, Edit3, Plus, Check, X, ArrowLeft,
  AlertTriangle, RefreshCw, Download, Send,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';

const KLS_COLOR = '#60A5FA';

interface Kawasan {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  sort_order: number;
}

interface SyncLog {
  id: string;
  source: string;
  total_rows: number;
  success: number;
  failed: number;
  created_at: string;
}

interface FormField {
  id: string;
  field_key: string;
  label: string;
  field_type: 'text' | 'number' | 'select' | 'radio' | 'textarea' | 'checkbox';
  options: string[] | null;
  is_required: boolean;
  is_active: boolean;
  applies_to: 'LUAR' | 'KAMSIS' | 'SEMUA';
  sort_order: number;
}

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: 'Teks Pendek', number: 'Nombor', select: 'Senarai Pilihan',
  radio: 'Pilihan Tunggal', textarea: 'Teks Panjang', checkbox: 'Kotak Pilihan',
};

export function KlkSettingsPage() {
  const { profile, isSuperAdmin } = useAuth();
  const [kawasanList, setKawasanList] = useState<Kawasan[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [dbReady, setDbReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSecret, setShowSecret] = useState(false);
  const [csvUploading, setCsvUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'kawasan' | 'hotspot' | 'formbuilder' | 'webhook' | 'csv'>('kawasan');
  const [editingKawasan, setEditingKawasan] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<Kawasan>>({});
  const [showAddKawasan, setShowAddKawasan] = useState(false);
  const [newKawasan, setNewKawasan] = useState({ name: '', latitude: '', longitude: '' });
  const [addingKawasan, setAddingKawasan] = useState(false);
  const [thresholds, setThresholds] = useState({ red: 20, yellow: 10, blue: 5 });
  const [savingThreshold, setSavingThreshold] = useState(false);
  // Form Builder state
  const [showAddField, setShowAddField] = useState(false);
  const [newField, setNewField] = useState({
    label: '', field_type: 'text' as FormField['field_type'],
    is_required: false, applies_to: 'LUAR' as FormField['applies_to'],
    options_raw: '', // comma-separated string untuk select/radio
  });
  const [addingField, setAddingField] = useState(false);
  const csvRef = useRef<HTMLInputElement>(null);

  // RBAC
  const isKlsExco = profile?.role === 'JPP' && profile?.jpp_unit === 'KLS';
  const hasAccess = isSuperAdmin || isKlsExco;

  // Webhook URL
  const webhookUrl = `${window.location.origin.replace(/:\d+$/, '')}:3000/api/klk-webhook`;

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { error: testErr } = await supabase.from('klk_kawasan').select('id').limit(1);
      if (testErr?.code === '42P01') { setDbReady(false); setLoading(false); return; }
      setDbReady(true);

      const [kawasanRes, logsRes, settingsRes, fieldsRes] = await Promise.all([
        supabase.from('klk_kawasan').select('*').order('sort_order').order('name'),
        supabase.from('klk_sync_log').select('*').order('created_at', { ascending: false }).limit(10),
        supabase.from('klk_settings').select('value').eq('key', 'hotspot_thresholds').single(),
        supabase.from('klk_form_fields').select('*').order('sort_order').order('created_at'),
      ]);
      if (kawasanRes.data) setKawasanList(kawasanRes.data);
      if (logsRes.data) setSyncLogs(logsRes.data);
      if (settingsRes.data?.value) setThresholds(settingsRes.data.value as any);
      if (fieldsRes.data) setFormFields(fieldsRes.data);
    } catch (e) { console.error('[KlkSettings]', e); }
    finally { setLoading(false); }
  };

  const saveThresholds = async () => {
    setSavingThreshold(true);
    const { error } = await supabase.from('klk_settings')
      .upsert({ key: 'hotspot_thresholds', value: thresholds, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    setSavingThreshold(false);
    if (error) { toast.error('Gagal simpan threshold.'); return; }
    // Also update localStorage for immediate map effect
    localStorage.setItem('klk_thresholds', JSON.stringify(thresholds));
    toast.success('Threshold hotspot disimpan!');
  };

  // CSV Upload
  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sila log masuk semula.');
      const formData = new FormData();
      formData.append('csv', file);
      const res = await fetch('/api/klk-csv-import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Import gagal.');
      toast.success(`Import berjaya! ${json.inserted} rekod ditambah, ${json.failed} gagal.`);
      fetchSettings();
    } catch (e: any) {
      toast.error(e.message ?? 'Import gagal.');
    } finally {
      setCsvUploading(false);
      if (csvRef.current) csvRef.current.value = '';
    }
  };

  // Toggle kawasan active
  const toggleKawasan = async (id: string, isActive: boolean) => {
    if (!dbReady) return;
    await supabase.from('klk_kawasan').update({ is_active: !isActive }).eq('id', id);
    setKawasanList(prev => prev.map(k => k.id === id ? { ...k, is_active: !isActive } : k));
  };

  // Save kawasan edit
  const saveEdit = async (id: string) => {
    if (!dbReady) return;
    const { error } = await supabase.from('klk_kawasan').update(editValues).eq('id', id);
    if (error) { toast.error('Gagal simpan.'); return; }
    setKawasanList(prev => prev.map(k => k.id === id ? { ...k, ...editValues } : k));
    setEditingKawasan(null);
    toast.success('Kawasan dikemaskini.');
  };

  if (!hasAccess) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-amber-400" />
        <p className="text-sm font-black text-white">Akses Tidak Dibenarkan</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto min-h-screen">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 mb-8">
        <Link to="/klk" className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-4 h-4 text-slate-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Tetapan KLK</h1>
          <p className="text-xs text-slate-500 font-medium">Urus kawasan, webhook, dan import data</p>
        </div>
      </motion.div>

      {/* DB Not Ready */}
      {!loading && !dbReady && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="mb-6 rounded-2xl p-5 border border-amber-500/20 bg-amber-500/5 flex items-start gap-4">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-black text-amber-300">Database Belum Sedia</p>
            <p className="text-xs text-amber-400/70 mt-1">Migration perlu dijalankan sebelum tetapan ini boleh digunakan. Webhook URL sudah boleh dikongsi dengan Google Apps Script.</p>
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex-wrap">
        {[
          { id: 'kawasan', label: 'Kawasan', icon: MapPin },
          { id: 'hotspot', label: 'Hotspot', icon: AlertTriangle },
          { id: 'formbuilder', label: 'Form Builder', icon: Plus },
          { id: 'webhook', label: 'Webhook', icon: Wifi },
          { id: 'csv', label: 'Import CSV', icon: Upload },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
              activeTab === tab.id ? 'bg-blue-500/20 text-blue-300' : 'text-slate-500 hover:text-slate-300'
            }`}>
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Kawasan ── */}
      {activeTab === 'kawasan' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.04]">
              <div>
                <h2 className="font-black text-sm text-slate-100">Senarai Kawasan</h2>
                <p className="text-[10px] text-slate-500">{kawasanList.filter(k => k.is_active).length} kawasan aktif</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowAddKawasan(v => !v)}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-xl bg-blue-500/15 text-blue-300 text-[10px] font-black hover:bg-blue-500/25 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Tambah
                </button>
                <button onClick={fetchSettings} className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                  <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Form tambah kawasan baru */}
            {showAddKawasan && (
              <div className="px-5 py-4 border-b border-white/[0.04] bg-blue-500/5">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-3">Kawasan Baru</p>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <input value={newKawasan.name} onChange={e => setNewKawasan(p => ({ ...p, name: e.target.value.toUpperCase() }))}
                    placeholder="Nama kawasan" className="col-span-1 h-9 px-3 rounded-xl bg-slate-800 border border-white/10 text-white text-xs" />
                  <input type="number" step="0.0001" value={newKawasan.latitude} onChange={e => setNewKawasan(p => ({ ...p, latitude: e.target.value }))}
                    placeholder="Latitud (cth: 3.8172)" className="h-9 px-3 rounded-xl bg-slate-800 border border-white/10 text-white text-xs" />
                  <input type="number" step="0.0001" value={newKawasan.longitude} onChange={e => setNewKawasan(p => ({ ...p, longitude: e.target.value }))}
                    placeholder="Longitud (cth: 103.3414)" className="h-9 px-3 rounded-xl bg-slate-800 border border-white/10 text-white text-xs" />
                </div>
                <p className="text-[9px] text-slate-600 mb-3">💡 Dapatkan koordinat dari <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">Google Maps</a> — klik kanan lokasi → "Apakah yang ada di sini?"</p>
                <div className="flex gap-2">
                  <button onClick={async () => {
                    if (!newKawasan.name.trim()) { toast.error('Sila isi nama kawasan.'); return; }
                    setAddingKawasan(true);
                    const { error } = await supabase.from('klk_kawasan').insert({
                      name: newKawasan.name.trim(),
                      latitude: newKawasan.latitude ? parseFloat(newKawasan.latitude) : null,
                      longitude: newKawasan.longitude ? parseFloat(newKawasan.longitude) : null,
                    });
                    setAddingKawasan(false);
                    if (error) { toast.error('Gagal tambah kawasan.'); return; }
                    toast.success('Kawasan ditambah!');
                    setNewKawasan({ name: '', latitude: '', longitude: '' });
                    setShowAddKawasan(false);
                    fetchSettings();
                  }} disabled={addingKawasan}
                    className="h-8 px-4 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-300 text-[10px] font-black hover:bg-blue-500/30 transition-colors disabled:opacity-50">
                    {addingKawasan ? 'Menyimpan...' : 'Simpan Kawasan'}
                  </button>
                  <button onClick={() => setShowAddKawasan(false)} className="h-8 px-4 rounded-xl bg-white/5 text-slate-400 text-[10px] font-black hover:bg-white/10">
                    Batal
                  </button>
                </div>
              </div>
            )}

            {loading ? (
              <div className="py-12 text-center text-xs text-slate-500">Memuatkan...</div>
            ) : kawasanList.length === 0 ? (
              <div className="py-12 text-center">
                <MapPin className="w-10 h-10 mx-auto mb-3 text-slate-700" />
                <p className="text-xs text-slate-500">Tiada kawasan — menunggu migration</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.03]">
                {kawasanList.map(k => (
                  <div key={k.id} className="flex items-center gap-4 px-5 py-3">
                    {editingKawasan === k.id ? (
                      // Edit mode
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <input
                          defaultValue={k.name}
                          onChange={e => setEditValues(prev => ({ ...prev, name: e.target.value }))}
                          className="col-span-1 h-8 px-3 rounded-lg bg-slate-800 border border-white/10 text-white text-xs"
                        />
                        <input
                          type="number" step="0.0001" defaultValue={k.latitude ?? ''}
                          placeholder="Lat"
                          onChange={e => setEditValues(prev => ({ ...prev, latitude: parseFloat(e.target.value) }))}
                          className="h-8 px-3 rounded-lg bg-slate-800 border border-white/10 text-white text-xs"
                        />
                        <input
                          type="number" step="0.0001" defaultValue={k.longitude ?? ''}
                          placeholder="Lng"
                          onChange={e => setEditValues(prev => ({ ...prev, longitude: parseFloat(e.target.value) }))}
                          className="h-8 px-3 rounded-lg bg-slate-800 border border-white/10 text-white text-xs"
                        />
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center gap-3 min-w-0">
                        <span className={`text-sm font-black truncate ${k.is_active ? 'text-slate-200' : 'text-slate-500 line-through'}`}>
                          {k.name}
                        </span>
                        {k.latitude && k.longitude && (
                          <span className="text-[9px] font-mono text-slate-600 flex-shrink-0">
                            {k.latitude.toFixed(4)}, {k.longitude.toFixed(4)}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {editingKawasan === k.id ? (
                        <>
                          <button onClick={() => saveEdit(k.id)} className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center hover:bg-emerald-500/25">
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          </button>
                          <button onClick={() => setEditingKawasan(null)} className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10">
                            <X className="w-3.5 h-3.5 text-slate-400" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => { setEditingKawasan(k.id); setEditValues({}); }}
                            className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                            <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                          </button>
                          <button
                            onClick={() => toggleKawasan(k.id, k.is_active)}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${k.is_active ? 'bg-blue-500/15 hover:bg-blue-500/25' : 'bg-white/5 hover:bg-white/10'}`}>
                            {k.is_active
                              ? <Eye className="w-3.5 h-3.5 text-blue-400" />
                              : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
                          </button>
                          <button
                            onClick={async () => {
                              if (!window.confirm(`Padam kawasan "${k.name}"? Tindakan ini tidak boleh dibatalkan.`)) return;
                              const { error } = await supabase.from('klk_kawasan').delete().eq('id', k.id);
                              if (error) { toast.error('Gagal padam.'); return; }
                              setKawasanList(prev => prev.filter(x => x.id !== k.id));
                              toast.success('Kawasan dipadamkan.');
                            }}
                            className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center hover:bg-red-500/25 transition-colors">
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Nota cara dapat koordinat */}
          <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Cara Dapatkan Koordinat</p>
            <ol className="space-y-1 text-[11px] text-slate-400">
              <li>1. Buka <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">Google Maps</a></li>
              <li>2. Cari kawasan berkenaan</li>
              <li>3. Klik kanan pada lokasi tepat → "Apakah yang ada di sini?"</li>
              <li>4. Koordinat muncul di bawah (contoh: 3.8172, 103.3414)</li>
              <li>5. Nombor pertama = Latitud, nombor kedua = Longitud</li>
            </ol>
          </div>
        </motion.div>
      )}

      {/* ── Tab: Hotspot Thresholds ── */}
      {activeTab === 'hotspot' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h2 className="font-black text-sm text-slate-100">Tetapan Hotspot</h2>
                <p className="text-[10px] text-slate-500">Had bilangan pelajar untuk warna dot pada peta</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Red threshold */}
              {[{ key: 'red' as const, label: 'Merah (Hotspot Kritikal)', color: '#EF4444', desc: 'Kawasan dengan pelajar sangat ramai' },
                { key: 'yellow' as const, label: 'Kuning (Sederhana)', color: '#F59E0B', desc: 'Kawasan dengan bilangan sederhana' },
                { key: 'blue' as const, label: 'Biru (Rendah)', color: '#60A5FA', desc: 'Kawasan dengan bilangan kecil' },
              ].map(t => (
                <div key={t.key} className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: t.color }} />
                  <div className="flex-1">
                    <p className="text-xs font-black text-slate-200">{t.label}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{t.desc}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500">≥</span>
                    <input
                      type="number" min={1} max={999}
                      value={thresholds[t.key]}
                      onChange={e => setThresholds(prev => ({ ...prev, [t.key]: parseInt(e.target.value) || 1 }))}
                      className="w-20 h-9 px-3 rounded-xl bg-slate-800 border border-white/10 text-white text-sm font-black text-center focus:outline-none focus:border-blue-500/50"
                    />
                    <span className="text-[10px] text-slate-500">pelajar</span>
                  </div>
                </div>
              ))}

              {/* Preview */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Preview Legenda Peta</p>
                <div className="flex items-center gap-6">
                  <span className="flex items-center gap-2 text-[10px] font-black text-slate-400">
                    <span className="w-3 h-3 rounded-full bg-red-500" />≥{thresholds.red} pelajar
                  </span>
                  <span className="flex items-center gap-2 text-[10px] font-black text-slate-400">
                    <span className="w-3 h-3 rounded-full bg-amber-400" />≥{thresholds.yellow} pelajar
                  </span>
                  <span className="flex items-center gap-2 text-[10px] font-black text-slate-400">
                    <span className="w-3 h-3 rounded-full bg-blue-400" />≥{thresholds.blue} pelajar
                  </span>
                  <span className="flex items-center gap-2 text-[10px] font-black text-slate-400">
                    <span className="w-3 h-3 rounded-full bg-emerald-400" />&lt;{thresholds.blue} pelajar
                  </span>
                </div>
              </div>

              <button onClick={saveThresholds} disabled={savingThreshold}
                className="w-full h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-300 text-[11px] font-black hover:bg-blue-500/30 transition-colors disabled:opacity-50">
                {savingThreshold ? 'Menyimpan...' : 'Simpan Threshold'}
              </button>

              <p className="text-[10px] text-slate-600 text-center">
                Threshold disimpan dalam <code className="font-mono">klk_settings</code> dan dikemaskini serta-merta pada peta.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Tab: Form Builder ── */}
      {activeTab === 'formbuilder' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.04]">
              <div>
                <h2 className="font-black text-sm text-slate-100">Soalan Tambahan</h2>
                <p className="text-[10px] text-slate-500">{formFields.filter(f => f.is_active).length} soalan aktif — akan muncul dalam form pelajar</p>
              </div>
              <button onClick={() => setShowAddField(v => !v)}
                className="flex items-center gap-1.5 h-8 px-3 rounded-xl bg-purple-500/15 text-purple-300 text-[10px] font-black hover:bg-purple-500/25 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Tambah Soalan
              </button>
            </div>

            {/* Form tambah soalan baru */}
            {showAddField && (
              <div className="px-5 py-4 border-b border-white/[0.04] bg-purple-500/5 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-purple-400">Soalan Baru</p>
                <div className="grid grid-cols-2 gap-2">
                  <input value={newField.label}
                    onChange={e => setNewField(p => ({ ...p, label: e.target.value }))}
                    placeholder="Label soalan (cth: Pendapatan Isi Rumah)"
                    className="col-span-2 h-9 px-3 rounded-xl bg-slate-800 border border-white/10 text-white text-xs" />
                  <select value={newField.field_type}
                    onChange={e => setNewField(p => ({ ...p, field_type: e.target.value as any }))}
                    className="h-9 px-3 rounded-xl bg-slate-800 border border-white/10 text-white text-xs">
                    {Object.entries(FIELD_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <select value={newField.applies_to}
                    onChange={e => setNewField(p => ({ ...p, applies_to: e.target.value as any }))}
                    className="h-9 px-3 rounded-xl bg-slate-800 border border-white/10 text-white text-xs">
                    <option value="LUAR">Luar Kampus sahaja</option>
                    <option value="KAMSIS">KAMSIS sahaja</option>
                    <option value="SEMUA">Semua pelajar</option>
                  </select>
                </div>
                {['select', 'radio'].includes(newField.field_type) && (
                  <div>
                    <input value={newField.options_raw}
                      onChange={e => setNewField(p => ({ ...p, options_raw: e.target.value }))}
                      placeholder="Pilihan dipisahkan koma: < RM1000, RM1000-2000, > RM2000"
                      className="w-full h-9 px-3 rounded-xl bg-slate-800 border border-white/10 text-white text-xs" />
                    <p className="text-[9px] text-slate-600 mt-1">Pisahkan setiap pilihan dengan koma (,)</p>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-[11px] text-slate-400 cursor-pointer">
                    <input type="checkbox" checked={newField.is_required}
                      onChange={e => setNewField(p => ({ ...p, is_required: e.target.checked }))}
                      className="w-4 h-4 accent-purple-500" />
                    Wajib diisi
                  </label>
                </div>
                <div className="flex gap-2">
                  <button disabled={addingField} onClick={async () => {
                    if (!newField.label.trim()) { toast.error('Sila isi label soalan.'); return; }
                    setAddingField(true);
                    const field_key = newField.label.trim().toLowerCase()
                      .replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
                    const options = ['select','radio'].includes(newField.field_type) && newField.options_raw.trim()
                      ? newField.options_raw.split(',').map(o => o.trim()).filter(Boolean)
                      : null;
                    const { data, error } = await supabase.from('klk_form_fields').insert({
                      field_key, label: newField.label.trim(),
                      field_type: newField.field_type, options,
                      is_required: newField.is_required, applies_to: newField.applies_to,
                      sort_order: formFields.length,
                    }).select().single();
                    setAddingField(false);
                    if (error) { toast.error('Gagal tambah soalan: ' + error.message); return; }
                    setFormFields(prev => [...prev, data]);
                    setNewField({ label: '', field_type: 'text', is_required: false, applies_to: 'LUAR', options_raw: '' });
                    setShowAddField(false);
                    toast.success('Soalan ditambah!');
                  }}
                    className="h-8 px-4 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[10px] font-black hover:bg-purple-500/30 disabled:opacity-50">
                    {addingField ? 'Menyimpan...' : 'Simpan Soalan'}
                  </button>
                  <button onClick={() => setShowAddField(false)} className="h-8 px-4 rounded-xl bg-white/5 text-slate-400 text-[10px] font-black hover:bg-white/10">
                    Batal
                  </button>
                </div>
              </div>
            )}

            {/* Senarai soalan */}
            {loading ? (
              <div className="py-10 text-center text-xs text-slate-500">Memuatkan...</div>
            ) : formFields.length === 0 ? (
              <div className="py-12 text-center">
                <Plus className="w-10 h-10 mx-auto mb-3 text-slate-700" />
                <p className="text-xs text-slate-500">Tiada soalan tambahan — klik "Tambah Soalan" untuk mula</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.03]">
                {formFields.map(f => (
                  <div key={f.id} className="flex items-center gap-4 px-5 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-black truncate ${f.is_active ? 'text-slate-200' : 'text-slate-500 line-through'}`}>
                          {f.label}
                        </span>
                        {f.is_required && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-red-500/15 text-red-400">WAJIB</span>
                        )}
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400">
                          {FIELD_TYPE_LABELS[f.field_type]}
                        </span>
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-500/15 text-slate-400">
                          {f.applies_to === 'LUAR' ? 'Luar Kampus' : f.applies_to === 'KAMSIS' ? 'KAMSIS' : 'Semua'}
                        </span>
                      </div>
                      {f.options && f.options.length > 0 && (
                        <p className="text-[10px] text-slate-600 mt-0.5 truncate">
                          Pilihan: {f.options.join(', ')}
                        </p>
                      )}
                      <p className="text-[9px] font-mono text-slate-700 mt-0.5">key: {f.field_key}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Toggle active */}
                      <button onClick={async () => {
                        const { error } = await supabase.from('klk_form_fields')
                          .update({ is_active: !f.is_active }).eq('id', f.id);
                        if (!error) setFormFields(prev => prev.map(x => x.id === f.id ? { ...x, is_active: !f.is_active } : x));
                      }}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                          f.is_active ? 'bg-purple-500/15 hover:bg-purple-500/25' : 'bg-white/5 hover:bg-white/10'
                        }`}>
                        {f.is_active ? <Eye className="w-3.5 h-3.5 text-purple-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
                      </button>
                      {/* Delete */}
                      <button onClick={async () => {
                        if (!window.confirm(`Padam soalan "${f.label}"? Data extra_data sedia ada TIDAK terpadam.`)) return;
                        const { error } = await supabase.from('klk_form_fields').delete().eq('id', f.id);
                        if (error) { toast.error('Gagal padam.'); return; }
                        setFormFields(prev => prev.filter(x => x.id !== f.id));
                        toast.success('Soalan dipadamkan.');
                      }}
                        className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center hover:bg-red-500/25 transition-colors">
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Nota penting */}
          <div className="rounded-2xl border border-purple-500/15 bg-purple-500/5 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-2">Nota Penting</p>
            <ul className="space-y-1.5 text-[11px] text-slate-400">
              <li>• Soalan di sini akan muncul secara automatik dalam form website pelajar</li>
              <li>• Jawapan disimpan dalam <code className="font-mono text-purple-300">extra_data</code> JSONB — tiada data hilang</li>
              <li>• Google Form TIDAK auto-update — Exco perlu tambah soalan yang sama secara manual di Google Form</li>
              <li>• Toggle OFF untuk sembunyikan soalan tanpa memadamnya</li>
            </ul>
          </div>
        </motion.div>
      )}

      {/* ── Tab: Webhook ── */}
      {activeTab === 'webhook' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
                <Wifi className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="font-black text-sm text-slate-100">Google Form Webhook</h2>
                <p className="text-[10px] text-slate-500">Endpoint untuk Apps Script sync</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Webhook URL</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 h-10 px-4 rounded-xl bg-slate-800/60 border border-white/[0.08] text-xs font-mono text-blue-300 flex items-center overflow-x-auto">
                    {webhookUrl}
                  </code>
                  <button
                    onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success('URL disalin!'); }}
                    className="h-10 px-4 rounded-xl bg-blue-500/15 text-blue-300 text-[10px] font-black hover:bg-blue-500/25 transition-colors flex-shrink-0">
                    Salin
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Webhook Secret (Header: x-webhook-secret)</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-10 px-4 rounded-xl bg-slate-800/60 border border-white/[0.08] flex items-center">
                    <span className="text-xs font-mono text-slate-400">
                      {showSecret ? (process.env.KLK_WEBHOOK_SECRET ?? '(set dalam .env)') : '••••••••••••••••'}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowSecret(!showSecret)}
                    className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                    {showSecret ? <EyeOff className="w-4 h-4 text-slate-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-600">Set <code className="font-mono">KLK_WEBHOOK_SECRET</code> dalam fail <code className="font-mono">.env</code> server anda.</p>
              </div>
            </div>
          </div>

          {/* Panduan Apps Script */}
          <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] p-6">
            <h3 className="font-black text-sm text-slate-200 mb-4">Panduan Setup Google Apps Script</h3>
            <ol className="space-y-3 text-xs text-slate-400">
              {[
                'Buka Google Form anda → Klik ikon titik tiga (...) → "Skrip"',
                'Tampal kod Apps Script di bawah ke dalam editor',
                'Tukar <secret> dengan nilai KLK_WEBHOOK_SECRET',
                'Simpan → Pergi ke "Pencetus" → Tambah pencetus "onFormSubmit"',
                'Uji dengan hantar satu submission test form',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-lg bg-blue-500/15 text-blue-400 font-black text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
            <pre className="mt-4 p-4 rounded-xl bg-slate-950 border border-white/[0.06] text-[10px] font-mono text-slate-400 overflow-x-auto leading-relaxed">{`function onFormSubmit(e) {
  var payload = {};
  for (var key in e.namedValues) {
    payload[key] = e.namedValues[key][0] || '';
  }
  UrlFetchApp.fetch('${webhookUrl}', {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-webhook-secret': '<KLK_WEBHOOK_SECRET>' },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
}`}</pre>
          </div>

          {/* Sync Logs */}
          {syncLogs.length > 0 && (
            <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.04]">
                <h3 className="font-black text-sm text-slate-100">Log Sync Terbaru</h3>
              </div>
              <div className="divide-y divide-white/[0.03]">
                {syncLogs.map(log => (
                  <div key={log.id} className="flex items-center gap-4 px-5 py-3">
                    <div className="flex-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{log.source}</span>
                      <p className="text-xs text-slate-300 mt-0.5">{log.success}/{log.total_rows} berjaya</p>
                    </div>
                    {log.failed > 0 && <span className="text-[10px] font-black text-red-400">{log.failed} gagal</span>}
                    <span className="text-[10px] text-slate-600">{new Date(log.created_at).toLocaleDateString('ms-MY')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Tab: CSV Import ── */}
      {activeTab === 'csv' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
                <Upload className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h2 className="font-black text-sm text-slate-100">Import Data Lama (CSV)</h2>
                <p className="text-[10px] text-slate-500">Upload export dari Google Sheets / Google Form</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Format note */}
              <div className="rounded-xl p-4 bg-amber-500/5 border border-amber-500/15">
                <p className="text-[11px] font-black text-amber-300 mb-2">Format CSV Yang Diterima</p>
                <p className="text-[10px] text-amber-400/70">
                  Header bersifat case-insensitive. Kolum yang dikenali: <em>Nama Pelajar, No Matriks, No Telefon, Jabatan, Alamat Kediaman, Kawasan Kediaman, Cadangan/Penambahbaikan</em>.
                  Kolum lain akan disimpan dalam <code className="font-mono">extra_data</code> JSON.
                </p>
              </div>

              {/* Upload zone */}
              <div
                onClick={() => csvRef.current?.click()}
                className="border-2 border-dashed border-white/[0.08] rounded-2xl p-10 text-center cursor-pointer hover:border-blue-500/30 hover:bg-blue-500/5 transition-all group"
              >
                <input ref={csvRef} type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
                <Upload className="w-10 h-10 mx-auto mb-3 text-slate-600 group-hover:text-blue-400 transition-colors" />
                <p className="text-sm font-black text-slate-300">Klik untuk pilih fail CSV</p>
                <p className="text-xs text-slate-500 mt-1">atau drag & drop di sini</p>
                {csvUploading && <p className="text-xs text-blue-400 mt-2 animate-pulse">Sedang mengimport...</p>}
              </div>

              <p className="text-[10px] text-slate-600 text-center">
                Data akan disimpan dengan source <code className="font-mono">CSV_IMPORT</code>. Duplikasi berdasarkan No Matrik + Semester akan ditangani secara automatik.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
