// ============================================================
// KeusahawananProgram.tsx — Program Keusahawanan CRUD Page
// Real Supabase integration: fetch, create, edit, delete
// Features: image poster upload, visibility toggle (AWAM/JPP_SAHAJA),
//           auto-counted participants, registration interest button
// ============================================================
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useExcoTheme } from '@/contexts/ExcoThemeContext';
import { hexToRgba } from '@/lib/utils';
import {
  Plus, Search, CalendarDays, Users, MapPin, ChevronRight, X,
  Upload, Trash2, Edit2, Eye, EyeOff, Loader2, Globe, Lock,
  CheckCircle2, RefreshCw, ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';

// ─── TYPES ──────────────────────────────────────────────────────────────────
type ProgramStatus     = 'upcoming' | 'active' | 'completed';
type ProgramVisibility = 'AWAM' | 'JPP_SAHAJA';

interface Program {
  id:                 string;
  title:              string;
  description:        string | null;
  icon:               string;
  image_url:          string | null;
  status:             ProgramStatus;
  date_label:         string | null;
  venue:              string | null;
  tags:               string[];
  max_participants:   number;
  participants_count: number;
  visibility:         ProgramVisibility;
  created_by:         string | null;
  created_at:         string;
}

type FormMode = 'create' | 'edit';

const EMOJI_OPTIONS = ['📌','🚀','💼','🧠','🏆','🎯','💡','🌟','🎓','🤝','📊','🏅'];
const BUCKET = 'keusahawanan';

// ─── HELPERS ────────────────────────────────────────────────────────────────
const statusMap: Record<ProgramStatus, { label: string; color: string; bg: string }> = {
  upcoming:  { label: 'Akan Datang',      color: '#3b82f6', bg: '#3b82f615' },
  active:    { label: 'Sedang Berjalan',  color: '#10b981', bg: '#10b98115' },
  completed: { label: 'Selesai',          color: '#94a3b8', bg: '#94a3b815' },
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export function KeusahawananProgram() {
  const { color }                     = useExcoTheme();
  const { user, profile, isSuperAdmin } = useAuth();

  // ── Auth helpers ──────────────────────────────────────────────────────────
  const isJppMember = !!(profile?.jpp_unit || profile?.jpp_position || isSuperAdmin);
  const canManage   = !!(profile?.jpp_unit === 'KEUSAHAWANAN' || profile?.jpp_position || isSuperAdmin);

  // ── Data state ────────────────────────────────────────────────────────────
  const [programs, setPrograms]               = useState<Program[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [search, setSearch]                   = useState('');
  const [filterStatus, setFilterStatus]       = useState<ProgramStatus | 'all'>('all');
  const [filterVisibility, setFilterVisibility] = useState<ProgramVisibility | 'all'>('all');
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [myRegistrations, setMyRegistrations] = useState<string[]>([]); // program ids I registered

  // ── Form state ────────────────────────────────────────────────────────────
  const [showForm, setShowForm]       = useState(false);
  const [formMode, setFormMode]       = useState<FormMode>('create');
  const [saving, setSaving]           = useState(false);
  const [deleting, setDeleting]       = useState<string | null>(null);
  const [registering, setRegistering] = useState<string | null>(null);

  // Form fields
  const [fTitle,       setFTitle]       = useState('');
  const [fDesc,        setFDesc]        = useState('');
  const [fIcon,        setFIcon]        = useState('📌');
  const [fStatus,      setFStatus]      = useState<ProgramStatus>('upcoming');
  const [fDate,        setFDate]        = useState('');
  const [fVenue,       setFVenue]       = useState('');
  const [fTags,        setFTags]        = useState('');
  const [fMaxPax,      setFMaxPax]      = useState('0');
  const [fVisibility,  setFVisibility]  = useState<ProgramVisibility>('AWAM');
  const [fImageFile,   setFImageFile]   = useState<File | null>(null);
  const [fImagePreview,setFImagePreview]= useState<string | null>(null);
  const [editingId,    setEditingId]    = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchPrograms = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase.from('keusahawanan_programs').select('*').order('created_at', { ascending: false });
      // Non-JPP members only see AWAM programs
      if (!isJppMember) q = q.eq('visibility', 'AWAM');

      const { data, error } = await q;
      if (error) throw error;
      setPrograms(data || []);
    } catch {
      toast.error('Gagal memuatkan program');
    } finally {
      setLoading(false);
    }
  }, [isJppMember]);

  const fetchMyRegistrations = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('keusahawanan_program_registrations')
      .select('program_id')
      .eq('user_id', user.id);
    if (data) setMyRegistrations(data.map(r => r.program_id));
  }, [user?.id]);

  useEffect(() => {
    fetchPrograms();
    fetchMyRegistrations();
  }, [fetchPrograms, fetchMyRegistrations]);

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = programs.filter(p => {
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || p.status === filterStatus;
    const matchVis    = filterVisibility === 'all' || p.visibility === filterVisibility;
    return matchSearch && matchStatus && matchVis;
  });

  // ── Form helpers ──────────────────────────────────────────────────────────
  const resetForm = () => {
    setEditingId(null);
    setFTitle(''); setFDesc(''); setFIcon('📌');
    setFStatus('upcoming'); setFDate(''); setFVenue('');
    setFTags(''); setFMaxPax('0'); setFVisibility('AWAM');
    setFImageFile(null); setFImagePreview(null);
  };

  const openCreate = () => {
    resetForm();
    setFormMode('create');
    setShowForm(true);
  };

  const openEdit = (p: Program, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(p.id);
    setFTitle(p.title);
    setFDesc(p.description || '');
    setFIcon(p.icon);
    setFStatus(p.status);
    setFDate(p.date_label || '');
    setFVenue(p.venue || '');
    setFTags((p.tags || []).join(', '));
    setFMaxPax(String(p.max_participants));
    setFVisibility(p.visibility);
    setFImageFile(null);
    setFImagePreview(p.image_url || null);
    setFormMode('edit');
    setShowForm(true);
    setSelectedProgram(null);
  };

  // ── Image upload ──────────────────────────────────────────────────────────
  const uploadImage = async (file: File): Promise<string> => {
    const ext      = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(7)}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(fileName, file);
    if (error) throw error;
    return supabase.storage.from(BUCKET).getPublicUrl(fileName).data.publicUrl;
  };

  // ── Save (create / edit) ──────────────────────────────────────────────────
  const handleSave = async () => {
    if (!fTitle.trim()) { toast.error('Tajuk wajib diisi'); return; }
    setSaving(true);
    try {
      let imageUrl = fImagePreview && !fImageFile ? fImagePreview : null;
      if (fImageFile) {
        toast.loading('Memuat naik poster...', { id: 'img_upload' });
        imageUrl = await uploadImage(fImageFile);
        toast.dismiss('img_upload');
      }

      const payload = {
        title:            fTitle.trim(),
        description:      fDesc.trim() || null,
        icon:             fIcon,
        status:           fStatus,
        date_label:       fDate.trim() || null,
        venue:            fVenue.trim() || null,
        tags:             fTags.split(',').map(t => t.trim()).filter(Boolean),
        max_participants: parseInt(fMaxPax) || 0,
        visibility:       fVisibility,
        updated_at:       new Date().toISOString(),
        ...(imageUrl !== undefined ? { image_url: imageUrl } : {}),
      };

      if (formMode === 'edit' && editingId) {
        const { error } = await supabase.from('keusahawanan_programs').update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success('Program dikemaskini ✓');
      } else {
        const { error } = await supabase.from('keusahawanan_programs').insert({
          ...payload,
          image_url:  imageUrl,
          created_by: user?.id,
        });
        if (error) throw error;
        toast.success('Program baharu ditambah ✓');
      }

      setShowForm(false);
      resetForm();
      fetchPrograms();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (p: Program, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Padam "${p.title}"? Tindakan ini tidak boleh dibatalkan.`)) return;
    setDeleting(p.id);
    try {
      if (p.image_url) {
        const parts    = p.image_url.split('/');
        const fileName = parts[parts.length - 1];
        await supabase.storage.from(BUCKET).remove([fileName]);
      }
      const { error } = await supabase.from('keusahawanan_programs').delete().eq('id', p.id);
      if (error) throw error;
      toast.success('Program dipadam');
      setSelectedProgram(null);
      fetchPrograms();
    } catch {
      toast.error('Gagal memadam');
    } finally {
      setDeleting(null);
    }
  };

  // ── Visibility toggle ─────────────────────────────────────────────────────
  const toggleVisibility = async (p: Program, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = p.visibility === 'AWAM' ? 'JPP_SAHAJA' : 'AWAM';
    const { error } = await supabase.from('keusahawanan_programs').update({ visibility: next }).eq('id', p.id);
    if (error) { toast.error('Gagal tukar visibiliti'); return; }
    toast.success(`Program kini ${next === 'AWAM' ? 'awam 🌍' : 'JPP sahaja 🔒'}`);
    fetchPrograms();
  };

  // ── Register interest ─────────────────────────────────────────────────────
  const handleRegister = async (p: Program) => {
    if (!user?.id) { toast.error('Sila log masuk'); return; }
    if (myRegistrations.includes(p.id)) { toast('Anda sudah daftar minat!', { icon: '✅' }); return; }
    setRegistering(p.id);
    try {
      const { error } = await supabase.from('keusahawanan_program_registrations').insert({
        program_id: p.id,
        user_id:    user.id,
      });
      if (error) throw error;
      toast.success('Minat berjaya didaftarkan ✓');
      setMyRegistrations(prev => [...prev, p.id]);
      fetchPrograms(); // refresh count
    } catch (err: any) {
      if (err.code === '23505') toast('Anda sudah daftar minat!', { icon: '✅' });
      else toast.error('Gagal mendaftar');
    } finally {
      setRegistering(null);
    }
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full p-4 sm:p-6 md:p-8 space-y-6">

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-1 h-5 rounded-full" style={{ background: color }} />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60">e-Keusahawanan</p>
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground leading-tight">Program Keusahawanan</h1>
          <p className="text-xs md:text-sm font-medium text-muted-foreground">Urus semua program, workshop dan pertandingan</p>
        </div>
        {canManage && (
          <Button
            onClick={openCreate}
            className="gap-2.5 font-black text-[11px] uppercase tracking-[0.15em] h-12 rounded-2xl flex-shrink-0 text-white w-full sm:w-auto shadow-lg active:scale-95 transition-all"
            style={{ background: color }}
          >
            <Plus className="w-4 h-4" />
            Tambah Program
          </Button>
        )}
      </motion.div>

      {/* ── Search & Filter ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari program..."
            className="w-full h-12 pl-12 pr-4 rounded-2xl text-sm font-medium outline-none bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/40 focus:border-border transition-all"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1 flex-wrap">
          {/* Status filters */}
          {(['all', 'upcoming', 'active', 'completed'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap transition-all border shrink-0 active:scale-95"
              style={
                filterStatus === s
                  ? { background: hexToRgba(color, 0.1), borderColor: hexToRgba(color, 0.35), color }
                  : { background: 'transparent', borderColor: 'hsl(var(--border)/0.5)', color: 'hsl(var(--muted-foreground)/0.6)' }
              }
            >
              {s === 'all' ? 'Semua' : statusMap[s].label}
            </button>
          ))}

          {/* Visibility filter (JPP members only) */}
          {isJppMember && (
            <>
              <div className="w-px h-6 bg-border/50 self-center mx-1 shrink-0" />
              {(['all', 'AWAM', 'JPP_SAHAJA'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setFilterVisibility(v)}
                  className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap transition-all border shrink-0 active:scale-95 flex items-center gap-1.5"
                  style={
                    filterVisibility === v
                      ? { background: hexToRgba(color, 0.1), borderColor: hexToRgba(color, 0.35), color }
                      : { background: 'transparent', borderColor: 'hsl(var(--border)/0.5)', color: 'hsl(var(--muted-foreground)/0.6)' }
                  }
                >
                  {v === 'all' ? <><Globe className="w-3 h-3" /> Semua Visibiliti</> :
                   v === 'AWAM' ? <><Globe className="w-3 h-3" /> Awam</> :
                   <><Lock className="w-3 h-3" /> JPP Sahaja</>}
                </button>
              ))}
            </>
          )}
        </div>
      </motion.div>

      {/* ── Grid ── */}
      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-52 rounded-2xl bg-muted/30 animate-pulse border border-border/30" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/40">Tiada program dijumpai</p>
          {canManage && (
            <button onClick={openCreate} className="mt-3 text-xs font-black underline underline-offset-2 transition-all"
              style={{ color }}>
              + Tambah Program Baharu
            </button>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((program, i) => {
            const st  = statusMap[program.status];
            const pct = program.max_participants > 0
              ? Math.min(100, Math.round((program.participants_count / program.max_participants) * 100))
              : 0;
            const isRegistered = myRegistrations.includes(program.id);

            return (
              <motion.div
                key={program.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 * i }}
                onClick={() => setSelectedProgram(program)}
                className="cursor-pointer group rounded-2xl overflow-hidden border border-border hover:border-muted-foreground/30 hover:shadow-md transition-all duration-200 bg-card"
              >
                {/* Poster image */}
                {program.image_url && (
                  <div className="h-36 overflow-hidden relative">
                    <img src={program.image_url} alt={program.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                    {/* Visibility badge on image */}
                    {isJppMember && (
                      <div className="absolute top-2 right-2">
                        {program.visibility === 'JPP_SAHAJA' ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-black/60 text-amber-400 backdrop-blur-sm">
                            <Lock className="w-2.5 h-2.5" /> JPP Sahaja
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-black/60 text-emerald-400 backdrop-blur-sm">
                            <Globe className="w-2.5 h-2.5" /> Awam
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {!program.image_url && (
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 bg-muted">
                          {program.icon}
                        </div>
                      )}
                      <div>
                        <h3 className="text-sm font-black leading-tight text-foreground">{program.title}</h3>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(program.tags || []).slice(0, 2).map(tag => (
                            <span key={tag} className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                              {tag}
                            </span>
                          ))}
                          {!program.image_url && isJppMember && (
                            <span className={`flex items-center gap-0.5 text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                              program.visibility === 'AWAM' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                            }`}>
                              {program.visibility === 'AWAM' ? <Globe className="w-2 h-2" /> : <Lock className="w-2 h-2" />}
                              {program.visibility === 'AWAM' ? 'Awam' : 'JPP'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase shrink-0"
                      style={{ background: st.bg, color: st.color }}>
                      {st.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-[11px] mb-4 text-muted-foreground">
                    {program.date_label && (
                      <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{program.date_label}</span>
                    )}
                    {program.venue && (
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{program.venue.split(',')[0]}</span>
                    )}
                  </div>

                  {/* Progress bar */}
                  {program.max_participants > 0 && (
                    <div className="space-y-1.5 mb-4">
                      <div className="flex justify-between text-[10px] font-black uppercase text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{program.participants_count} peserta</span>
                        <span>{pct}% penuh</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden bg-muted">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-muted-foreground group-hover:text-foreground transition-colors">
                      <span>Lihat Butiran</span>
                      <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </div>

                    {/* Management actions */}
                    {canManage && (
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <button onClick={e => toggleVisibility(program, e)}
                          className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-muted/50 transition-all"
                          title={program.visibility === 'AWAM' ? 'Tukar ke JPP Sahaja' : 'Tukar ke Awam'}>
                          {program.visibility === 'AWAM' ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={e => openEdit(program, e)}
                          className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-muted/50 transition-all" title="Edit">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={e => handleDelete(program, e)}
                          disabled={deleting === program.id}
                          className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-rose-500 hover:bg-rose-500/10 transition-all" title="Padam">
                          {deleting === program.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ══════════ DETAIL MODAL ══════════ */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {selectedProgram && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setSelectedProgram(null)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="relative w-full max-w-lg mx-auto rounded-3xl bg-card border border-border shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
              >
                {/* Poster */}
                {selectedProgram.image_url ? (
                  <div className="h-48 shrink-0 overflow-hidden relative">
                    <img src={selectedProgram.image_url} alt={selectedProgram.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-card/90 to-transparent" />
                    <button onClick={() => setSelectedProgram(null)}
                      className="absolute top-4 right-4 p-2 rounded-xl bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm transition-all">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setSelectedProgram(null)}
                    className="absolute top-5 right-5 p-1.5 rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors z-10">
                    <X className="w-4 h-4" />
                  </button>
                )}

                <div className="p-6 sm:p-8 overflow-y-auto scrollbar-hide">
                  <div className="flex items-start gap-3 mb-4">
                    {!selectedProgram.image_url && (
                      <div className="text-4xl shrink-0">{selectedProgram.icon}</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase"
                          style={{ background: statusMap[selectedProgram.status].bg, color: statusMap[selectedProgram.status].color }}>
                          {statusMap[selectedProgram.status].label}
                        </span>
                        {isJppMember && (
                          <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                            selectedProgram.visibility === 'AWAM' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                          }`}>
                            {selectedProgram.visibility === 'AWAM' ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                            {selectedProgram.visibility === 'AWAM' ? 'Awam' : 'JPP Sahaja'}
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl font-black text-foreground leading-tight">{selectedProgram.title}</h2>
                    </div>
                  </div>

                  {selectedProgram.description && (
                    <p className="text-sm mb-5 leading-relaxed text-muted-foreground">{selectedProgram.description}</p>
                  )}

                  <div className="space-y-2 text-sm font-medium text-muted-foreground mb-5">
                    {selectedProgram.date_label && (
                      <p className="flex items-center gap-2"><CalendarDays className="w-4 h-4" style={{ color }} />{selectedProgram.date_label}</p>
                    )}
                    {selectedProgram.venue && (
                      <p className="flex items-center gap-2"><MapPin className="w-4 h-4" style={{ color }} />{selectedProgram.venue}</p>
                    )}
                    {selectedProgram.max_participants > 0 && (
                      <p className="flex items-center gap-2">
                        <Users className="w-4 h-4" style={{ color }} />
                        {selectedProgram.participants_count} / {selectedProgram.max_participants} peserta
                      </p>
                    )}
                  </div>

                  {(selectedProgram.tags || []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {selectedProgram.tags.map(tag => (
                        <span key={tag} className="text-[10px] font-black uppercase px-3 py-1 rounded-full bg-muted text-muted-foreground">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="h-px mb-5" style={{ background: hexToRgba(color, 0.15) }} />

                  <div className="flex gap-3 flex-wrap">
                    {/* Register interest (non-JPP or AWAM programs) */}
                    {(!canManage || selectedProgram.visibility === 'AWAM') && selectedProgram.status !== 'completed' && (
                      <Button
                        onClick={() => handleRegister(selectedProgram)}
                        disabled={registering === selectedProgram.id || myRegistrations.includes(selectedProgram.id)}
                        className="flex-1 font-black text-[11px] uppercase tracking-wider rounded-xl text-white"
                        style={{ background: myRegistrations.includes(selectedProgram.id) ? '#10b981' : color }}
                      >
                        {registering === selectedProgram.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        ) : myRegistrations.includes(selectedProgram.id) ? (
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                        ) : null}
                        {myRegistrations.includes(selectedProgram.id) ? 'Sudah Daftar Minat' : 'Daftar Minat'}
                      </Button>
                    )}

                    {/* Edit / Delete (managers) */}
                    {canManage && (
                      <>
                        <Button onClick={e => openEdit(selectedProgram, e)}
                          className="font-black text-[11px] uppercase rounded-xl text-white" style={{ background: color }}>
                          <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit
                        </Button>
                        <Button variant="outline" onClick={e => handleDelete(selectedProgram, e)}
                          disabled={deleting === selectedProgram.id}
                          className="font-black text-[11px] uppercase rounded-xl text-rose-500 border-rose-500/30 hover:bg-rose-500/10">
                          {deleting === selectedProgram.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ══════════ CREATE / EDIT MODAL ══════════ */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showForm && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => { setShowForm(false); resetForm(); }} />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                className="relative w-full max-w-lg mx-auto rounded-3xl bg-card border border-border shadow-2xl flex flex-col max-h-[95vh]"
              >
                {/* Modal header */}
                <div className="flex items-center justify-between px-7 py-5 border-b border-border/50">
                  <h2 className="text-base font-black tracking-tight text-foreground">
                    {formMode === 'create' ? 'Tambah Program Baharu' : 'Edit Program'}
                  </h2>
                  <button onClick={() => { setShowForm(false); resetForm(); }}
                    className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Form body */}
                <div className="overflow-y-auto scrollbar-hide px-7 py-6 space-y-5">

                  {/* Emoji picker */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ikon</label>
                    <div className="flex gap-2 flex-wrap">
                      {EMOJI_OPTIONS.map(e => (
                        <button key={e} onClick={() => setFIcon(e)}
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all border-2"
                          style={{ borderColor: fIcon === e ? color : 'transparent', background: fIcon === e ? hexToRgba(color, 0.1) : 'hsl(var(--muted)/0.5)' }}>
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Title */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tajuk Program *</label>
                    <input value={fTitle} onChange={e => setFTitle(e.target.value)} placeholder="Nama program..."
                      className="w-full h-11 px-4 rounded-xl text-sm font-medium outline-none bg-muted/40 border border-border/50 text-foreground placeholder:text-muted-foreground/40 focus:border-border transition-all" />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Penerangan</label>
                    <textarea value={fDesc} onChange={e => setFDesc(e.target.value)} rows={3}
                      placeholder="Penerangan ringkas program..."
                      className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none bg-muted/40 border border-border/50 text-foreground placeholder:text-muted-foreground/40 resize-none focus:border-border transition-all" />
                  </div>

                  {/* Date + Venue */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tarikh</label>
                      <input value={fDate} onChange={e => setFDate(e.target.value)} placeholder="cth: 15–17 April 2026"
                        className="w-full h-11 px-3 rounded-xl text-sm font-medium outline-none bg-muted/40 border border-border/50 text-foreground placeholder:text-muted-foreground/40 focus:border-border transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tempat</label>
                      <input value={fVenue} onChange={e => setFVenue(e.target.value)} placeholder="Dewan, bilik..."
                        className="w-full h-11 px-3 rounded-xl text-sm font-medium outline-none bg-muted/40 border border-border/50 text-foreground placeholder:text-muted-foreground/40 focus:border-border transition-all" />
                    </div>
                  </div>

                  {/* Status + Max pax */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</label>
                      <select value={fStatus} onChange={e => setFStatus(e.target.value as ProgramStatus)}
                        className="w-full h-11 px-3 rounded-xl text-sm font-medium outline-none bg-muted/40 border border-border/50 text-foreground focus:border-border transition-all">
                        <option value="upcoming">Akan Datang</option>
                        <option value="active">Sedang Berjalan</option>
                        <option value="completed">Selesai</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Had Peserta</label>
                      <input type="number" value={fMaxPax} onChange={e => setFMaxPax(e.target.value)} min="0"
                        placeholder="0 = tiada had"
                        className="w-full h-11 px-3 rounded-xl text-sm font-medium outline-none bg-muted/40 border border-border/50 text-foreground placeholder:text-muted-foreground/40 focus:border-border transition-all" />
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tag (pisahkan dengan koma)</label>
                    <input value={fTags} onChange={e => setFTags(e.target.value)} placeholder="Workshop, Inovasi, Berbayar..."
                      className="w-full h-11 px-4 rounded-xl text-sm font-medium outline-none bg-muted/40 border border-border/50 text-foreground placeholder:text-muted-foreground/40 focus:border-border transition-all" />
                  </div>

                  {/* Visibility toggle */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Visibiliti</label>
                    <div className="flex gap-2">
                      {(['AWAM', 'JPP_SAHAJA'] as const).map(v => (
                        <button key={v} onClick={() => setFVisibility(v)}
                          className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl text-[11px] font-black uppercase tracking-wider border-2 transition-all"
                          style={fVisibility === v
                            ? { background: hexToRgba(color, 0.1), borderColor: color, color }
                            : { background: 'transparent', borderColor: 'hsl(var(--border)/0.5)', color: 'hsl(var(--muted-foreground)/0.6)' }
                          }>
                          {v === 'AWAM' ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                          {v === 'AWAM' ? 'Awam (Semua)' : 'JPP Sahaja'}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground/60">
                      {fVisibility === 'AWAM' ? '🌍 Semua pengguna portal boleh lihat program ini.' : '🔒 Hanya ahli JPP yang log masuk boleh lihat.'}
                    </p>
                  </div>

                  {/* Poster image */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Poster / Gambar (Opsional)</label>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) { setFImageFile(f); setFImagePreview(URL.createObjectURL(f)); }
                      }} />
                    {fImagePreview ? (
                      <div className="relative rounded-xl overflow-hidden h-36 bg-muted/30 border border-border/50">
                        <img src={fImagePreview} alt="preview" className="w-full h-full object-cover" />
                        <button
                          onClick={() => { setFImageFile(null); setFImagePreview(null); if (fileRef.current) fileRef.current.value = ''; }}
                          className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 transition-all">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => fileRef.current?.click()}
                        className="w-full h-24 rounded-xl border-2 border-dashed border-border/50 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-border hover:bg-muted/30 transition-all">
                        <ImageIcon className="w-5 h-5" />
                        <span className="text-[11px] font-bold">Klik untuk muat naik poster</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 px-7 py-5 border-t border-border/50 shrink-0">
                  <Button variant="ghost" onClick={() => { setShowForm(false); resetForm(); }}
                    className="flex-1 h-11 rounded-xl font-black text-[11px] uppercase tracking-wider">Batal</Button>
                  <Button onClick={handleSave} disabled={saving}
                    className="flex-1 h-11 rounded-xl font-black text-[11px] uppercase tracking-wider text-white"
                    style={{ background: color }}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : formMode === 'create' ? 'Tambah Program' : 'Simpan Perubahan'}
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
