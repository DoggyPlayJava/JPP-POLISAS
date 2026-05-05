import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAiSettings } from '@/contexts/AiSettingsContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { uploadFileToDrive, uploadPdfToDrive } from '@/lib/driveUpload';
import { queryCache } from '@/lib/cache';
import { toast } from 'react-hot-toast';
import {
  Plus, Pencil, Calendar, MapPin,
  FileText, CheckCircle2, Lock,
  FileUp, CloudUpload, Clock, Check, Send, ChevronRight, MessageCircle,
  BellRing, Timer, History, Unlock, Archive, Info, Trash2,
  Zap, Users, CalendarDays, Activity, Filter, Image as ImageIcon, X, Sparkles,
  QrCode, Trophy, Copy, ExternalLink
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { format, differenceInDays, parseISO, isValid } from 'date-fns';
import { ms } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { AIGrammarCheck } from '@/components/ai/AIGrammarCheck';
import { AIBudgetGenerator } from '@/components/ai/AIBudgetGenerator';
import { QrCodeModal } from '@/components/program/QrCodeModal';
import { ProgramStatistikTab } from '@/components/program/ProgramStatistikTab';

// ─── STATUS CONFIG ────────────────────────────────────────────────────────────
const ACTIVITY_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  perancangan: { label: 'Perancangan', color: 'text-blue-600', bg: 'bg-blue-500/10' },
  aktif: { label: 'Aktif', color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  selesai: { label: 'Selesai', color: 'text-muted-foreground', bg: 'bg-muted' },
  ditangguh: { label: 'Ditangguh', color: 'text-orange-600', bg: 'bg-orange-500/10' },
};

const PRIORITY_CONFIG: Record<string, { label: string; dot: string }> = {
  rendah: { label: 'Rendah', dot: 'bg-blue-400' },
  sederhana: { label: 'Sederhana', dot: 'bg-amber-400' },
  tinggi: { label: 'Tinggi', dot: 'bg-rose-500' },
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export function AktivitiFull() {
  const { user, profile, isPresident, isMT, isSuperAdmin, selectedClubId, effectiveRole } = useAuth();
  const canManageTakwim = isMT || isSuperAdmin;

  return (
    <div className="page-container space-y-8 pb-20">
      {/* HEADER */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Badge className="mb-3 px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-accent/10 text-accent border-none">
          {profile?.club_id ? 'Kelab' : 'JPP'}
        </Badge>
        <h1 className="text-5xl font-black tracking-tighter gradient-text">Aktiviti</h1>
        <p className="text-muted-foreground mt-1 font-medium">
          Takwim Rasmi &amp; Aktiviti Harian Kelab
        </p>
      </motion.div>

      {/* TABS */}
      <Tabs defaultValue="aktiviti" className="w-full">
        <TabsList className="bg-muted/40 p-1.5 rounded-2xl gap-2 border border-border/50 shadow-inner mb-2 flex">
          <TabsTrigger
            value="aktiviti"
            className="flex-1 rounded-xl px-6 py-3 font-black text-[10px] uppercase tracking-[0.15em] data-[state=active]:bg-background data-[state=active]:shadow-xl data-[state=active]:text-emerald-600 flex items-center gap-2 justify-center"
          >
            <Zap className="w-3.5 h-3.5" /> Aktiviti Kelab
          </TabsTrigger>
          <TabsTrigger
            value="takwim"
            className="flex-1 rounded-xl px-6 py-3 font-black text-[10px] uppercase tracking-[0.15em] data-[state=active]:bg-background data-[state=active]:shadow-xl data-[state=active]:text-primary flex items-center gap-2 justify-center"
          >
            <CalendarDays className="w-3.5 h-3.5" /> Takwim Rasmi
          </TabsTrigger>
          <TabsTrigger
            value="statistik"
            className="flex-1 rounded-xl px-6 py-3 font-black text-[10px] uppercase tracking-[0.15em] data-[state=active]:bg-background data-[state=active]:shadow-xl data-[state=active]:text-violet-600 flex items-center gap-2 justify-center"
          >
            <Activity className="w-3.5 h-3.5" /> Statistik
          </TabsTrigger>
        </TabsList>

        {/* ─── TAB 1: AKTIVITI KELAB ─── */}
        <TabsContent value="aktiviti">
          <AktivitiKelabTab user={user} profile={profile} selectedClubId={selectedClubId} effectiveRole={effectiveRole} />
        </TabsContent>

        {/* ─── TAB 2: TAKWIM RASMI ─── */}
        <TabsContent value="takwim">
          <TakwimRasmiTab user={user} profile={profile} selectedClubId={selectedClubId} canManage={canManageTakwim} />
        </TabsContent>

        {/* ─── TAB 3: STATISTIK ─── */}
        <TabsContent value="statistik" className="mt-6">
          <ProgramStatistikTab selectedClubId={selectedClubId} isSuperAdmin={isSuperAdmin} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 1: AKTIVITI KELAB (club_activities)
// Ahli biasa read-only.
// ══════════════════════════════════════════════════════════════════════════════
function AktivitiKelabTab({ user, profile, selectedClubId, effectiveRole }: any) {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('semua');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const canManage = effectiveRole !== 'CLUB_MEMBER';

  const emptyForm = {
    title: '', description: '', status: 'perancangan', priority: 'sederhana',
    start_date: '', end_date: '', venue: '', tindakan: '', imageUrls: [],
    qr_enabled: false, qr_open_at: '', qr_close_at: '', merit_kelab: 0, merit_eakademik: 0,
  };
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    if (!selectedClubId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('club_activities')
      .select('*, creator:profiles!user_id(full_name)')
      .eq('club_id', selectedClubId)
      .eq('is_archived', false)
      .order('start_date', { ascending: false });
    if (!error) setActivities(data || []);
    setLoading(false);
  }, [selectedClubId]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (act: any) => {
    setEditTarget(act);
    setForm({
      title: act.title || '',
      description: act.description || '',
      status: act.status || 'perancangan',
      priority: act.priority || 'sederhana',
      start_date: act.start_date ? act.start_date.split('T')[0] : '',
      end_date: act.end_date ? act.end_date.split('T')[0] : '',
      venue: act.location || '',
      tindakan: act.tindakan || '',
      imageUrls: act.image_urls || [],
      qr_enabled: act.qr_enabled || false,
      qr_open_at: act.qr_open_at ? act.qr_open_at.replace('Z','').substring(0,16) : '',
      qr_close_at: act.qr_close_at ? act.qr_close_at.replace('Z','').substring(0,16) : '',
      merit_kelab: act.merit_kelab || 0,
      merit_eakademik: act.merit_eakademik || 0,
    });
    setDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = e.target.files;
    if (!rawFiles || rawFiles.length === 0) return;
    // Convert ke array DAHULU sebelum reset — supaya reference tidak hilang
    const allFiles = Array.from(rawFiles);
    const originalCount = rawFiles.length;
    // Reset input supaya fail yang sama boleh dipilih semula
    e.target.value = '';
    const currentCount = form.imageUrls?.length || 0;
    const remainingSlots = 2 - currentCount;
    if (remainingSlots <= 0) { toast.error('Maksimum 2 gambar dibenarkan.'); return; }

    const filesToUpload = allFiles
      .filter(f => f.type.startsWith('image/'))
      .slice(0, remainingSlots);

    if (filesToUpload.length === 0) { toast.error('Tiada fail imej yang sah.'); return; }
    const toastId = toast.loading(`Memuat naik ${filesToUpload.length} gambar...`);
    const urls: string[] = [];
    setUploading(true);
    try {
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        const url = await uploadFileToDrive(file, 'aktiviti');
        urls.push(url);
      }
      setForm((prev: any) => ({ ...prev, imageUrls: [...(prev.imageUrls || []), ...urls] }));
      if (originalCount > remainingSlots) {
        toast.success(`${urls.length} gambar dimuat naik (Maksimum 2).`, { id: toastId });
      } else {
        toast.success(`${urls.length} gambar berjaya dimuat naik! ☁️`, { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal upload gambar.', { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setForm((prev: any) => ({ ...prev, imageUrls: prev.imageUrls.filter((_: any, i: number) => i !== index) }));
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.start_date) {
      toast.error('Tajuk dan Tarikh Mula wajib diisi.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        club_id: selectedClubId,
        title: form.title.trim(),
        description: form.description.trim(),
        status: form.status,
        priority: form.priority,
        start_date: new Date(form.start_date).toISOString(),
        end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
        location: form.venue.trim(),
        tindakan: form.tindakan.trim(),
        image_urls: form.imageUrls,
        user_id: user?.id,
        budget: 0,
        qr_enabled: form.qr_enabled,
        qr_open_at: form.qr_open_at ? new Date(form.qr_open_at).toISOString() : null,
        qr_close_at: form.qr_close_at ? new Date(form.qr_close_at).toISOString() : null,
        merit_kelab: Number(form.merit_kelab) || 0,
        merit_eakademik: Number(form.merit_eakademik) || 0,
      };

      if (editTarget) {
        const { error } = await supabase.from('club_activities').update(payload).eq('id', editTarget.id);
        if (error) throw error;
        toast.success('Aktiviti dikemaskini!');
      } else {
        const { error } = await supabase.from('club_activities').insert([payload]);
        if (error) throw error;
        toast.success('Aktiviti baharu ditambah!');
      }
      queryCache.invalidate('dashboard_');
      setDialogOpen(false);

      // Auto-submit merit rasmi application if merit_eakademik > 0 and status = selesai
      if (Number(form.merit_eakademik) > 0 && form.status === 'selesai') {
        const actId = editTarget?.id;
        if (actId) {
          // Check if application already exists
          const { data: existing } = await supabase
            .from('merit_program_applications')
            .select('id')
            .eq('program_id', actId)
            .eq('program_type', 'aktiviti')
            .maybeSingle();
          
          if (!existing) {
            await supabase.from('merit_program_applications').insert({
              program_id: actId,
              program_type: 'aktiviti',
              program_title: form.title.trim(),
              applied_by: user?.id,
              merit_value: Number(form.merit_eakademik),
              justification: form.description.trim() || null,
              status: 'pending',
            });
            toast.success('📋 Permohonan Merit Rasmi dihantar untuk kelulusan!', { duration: 5000 });
          }
        }
      }

      load();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Padam aktiviti ini?')) return;
    const { error } = await supabase.from('club_activities').delete().eq('id', id);
    if (!error) {
      toast.success('Aktiviti dipadamkan.');
      queryCache.invalidate('dashboard_');
      load();
    }
    else toast.error('Gagal memadam.');
  };

  const filtered = filterStatus === 'semua'
    ? activities
    : activities.filter(a => a.status === filterStatus);

  const statusCounts = activities.reduce((acc: any, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  const groupActivitiesByMonth = (acts: any[]) => {
    const grouped: Record<string, any[]> = {};
    const keys: string[] = [];

    acts.forEach(a => {
      let m = 'Tiada Tarikh';
      if (a.start_date) {
        try {
          const d = parseISO(a.start_date);
          if (isValid(d)) m = format(d, 'MMMM yyyy', { locale: ms });
        } catch {}
      }
      if (!grouped[m]) {
        grouped[m] = [];
        keys.push(m);
      }
      grouped[m].push(a);
    });

    return { grouped, keys };
  };

  const { grouped, keys: groupKeys } = groupActivitiesByMonth(filtered);

  return (
    <div className="space-y-6">
      {/* STAT BAR + TAMBAH BUTTON */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex gap-3 flex-wrap">
          {[
            { key: 'semua', label: 'Semua', count: activities.length },
            { key: 'perancangan', label: 'Perancangan', count: statusCounts.perancangan || 0 },
            { key: 'aktif', label: 'Aktif', count: statusCounts.aktif || 0 },
            { key: 'selesai', label: 'Selesai', count: statusCounts.selesai || 0 },
            { key: 'ditangguh', label: 'Ditangguh', count: statusCounts.ditangguh || 0 },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilterStatus(f.key)}
              className={cn(
                'px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2',
                filterStatus === f.key
                  ? 'bg-primary text-white shadow-lg'
                  : 'bg-background border border-border text-muted-foreground hover:border-slate-400'
              )}
            >
              {f.label}
              <span className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black',
                filterStatus === f.key ? 'bg-card/20' : 'bg-muted'
              )}>
                {f.count}
              </span>
            </button>
          ))}
        </div>
        {canManage && (
          <Button
            onClick={openCreate}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-11 px-6 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-200 transition-all hover:scale-105 active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4 mr-2" /> Aktiviti Baru
          </Button>
        )}
      </div>

      {/* LIST */}
      {loading ? (
        <AktivitiSkeleton />
      ) : filtered.length === 0 ? (
        <Empty className="py-20 rounded-[3rem] border-dashed border-2 bg-muted/30 dark:bg-accent/5 dark:border-accent/20 backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <EmptyMedia variant="icon" className="w-16 h-16 rounded-3xl bg-background shadow-xl border border-border group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
            <Activity className="w-8 h-8 text-primary animate-pulse" />
          </EmptyMedia>
          <EmptyHeader className="relative z-10">
            <EmptyTitle className="text-xl font-black uppercase tracking-[0.2em] gradient-text">Tiada Aktiviti Ditemui</EmptyTitle>
            <EmptyDescription className="text-sm font-medium text-muted-foreground/80 max-w-[280px] leading-relaxed">
              {filterStatus === 'semua'
                ? 'Kelab anda baru dan masih segar? Mula rekodkan aktiviti spontan anda di sini.'
                : `Nampaknya tiada aktiviti dengan status '${filterStatus}' buat masa ini.`}
            </EmptyDescription>
          </EmptyHeader>
          {canManage && (
            <Button onClick={openCreate} variant="outline" className="rounded-xl font-black text-[10px] uppercase h-10 px-6">
              Mula Rekod Aktiviti
            </Button>
          )}
        </Empty>
      ) : (
        <div className="space-y-10">
          <AnimatePresence mode="popLayout">
            {groupKeys.map(month => (
              <motion.div key={month} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="flex items-center gap-4">
                  <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground/60 shrink-0">{month}</h3>
                  <div className="h-px bg-border/50 flex-1" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {grouped[month].map(act => (
                    <motion.div
                      key={act.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                    >
                      <ActivityKelabCard
                        act={act}
                        effectiveRole={effectiveRole}
                        currentUserId={user?.id}
                        onEdit={() => openEdit(act)}
                        onDelete={() => handleDelete(act.id)}
                      />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* DIALOG FORM */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[560px] rounded-[2.5rem] p-0 border-none overflow-hidden flex flex-col max-h-[95vh]">
          <div className="p-8 space-y-6 overflow-y-auto flex-1">
            <DialogHeader>
              <DialogTitle className="text-3xl font-black tracking-tighter">
                {editTarget ? 'Kemaskini Aktiviti' : 'Aktiviti Baharu'}
              </DialogTitle>
              <p className="text-xs text-muted-foreground font-medium">
                Aktiviti spontan yang tidak memerlukan kertas kerja rasmi
              </p>
            </DialogHeader>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                  Tajuk Aktiviti *
                </Label>
                <Input
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="Cth: Mesyuarat Bulanan, Gotong-Royong..."
                  className="h-12 rounded-2xl bg-muted/40 border-border/60 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                    Tarikh Mula *
                  </Label>
                  <Input
                    type="date"
                    value={form.start_date}
                    onChange={e => setForm({ ...form, start_date: e.target.value })}
                    className="h-12 rounded-2xl bg-muted/40 border-border/60 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                    Tarikh Tamat
                  </Label>
                  <Input
                    type="date"
                    value={form.end_date}
                    onChange={e => setForm({ ...form, end_date: e.target.value })}
                    className="h-12 rounded-2xl bg-muted/40 border-border/60 font-bold"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                  Lokasi / Tempat
                </Label>
                <Input
                  value={form.venue}
                  onChange={e => setForm({ ...form, venue: e.target.value })}
                  placeholder="Cth: Bilik Kuliah 203, Dewan Serbaguna..."
                  className="h-12 rounded-2xl bg-muted/40 border-border/60 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                    Status
                  </Label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger className="h-12 rounded-2xl bg-muted/40 border-border/60 font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="perancangan">Perancangan</SelectItem>
                      <SelectItem value="aktif">Aktif</SelectItem>
                      <SelectItem value="selesai">Selesai</SelectItem>
                      <SelectItem value="ditangguh">Ditangguh</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                    Keutamaan
                  </Label>
                  <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                    <SelectTrigger className="h-12 rounded-2xl bg-muted/40 border-border/60 font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rendah">Rendah</SelectItem>
                      <SelectItem value="sederhana">Sederhana</SelectItem>
                      <SelectItem value="tinggi">Tinggi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1.5 flex-1">
                    Objektif
                  </Label>
                  <AIGrammarCheck textValue={form.description} onApply={v => setForm({ ...form, description: v })} disabled={saving} />
                </div>
                <Textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Ringkasan aktiviti..."
                  className="rounded-2xl bg-muted/40 border-border/60 font-medium resize-none min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1.5 flex-1">
                    Tindakan / Catatan
                    <span className="ml-2 text-emerald-600 normal-case tracking-normal">← untuk Laporan Bulanan</span>
                  </Label>
                  <AIGrammarCheck textValue={form.tindakan} onApply={v => setForm({ ...form, tindakan: v })} disabled={saving} />
                </div>
                <Textarea
                  value={form.tindakan}
                  onChange={e => setForm({ ...form, tindakan: e.target.value })}
                  placeholder="Tindakan yang telah diambil atau rumusan aktiviti..."
                  className="rounded-2xl bg-muted/40 border-border/60 font-medium resize-none min-h-[80px]"
                />
              </div>

              {/* ─── QR & MERIT SECTION (Aktiviti Kelab) ─── */}
              <div className="space-y-4 p-4 rounded-[1.5rem] border border-primary/15 bg-primary/5">
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-primary" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary">QR & Merit Kelab</p>
                </div>

                {/* Toggle QR */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Aktifkan QR Kehadiran</Label>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">Peserta scan QR untuk daftar hadir</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, qr_enabled: !form.qr_enabled })}
                    className={cn(
                      'relative w-12 h-6 rounded-full transition-all shrink-0',
                      form.qr_enabled ? 'bg-primary' : 'bg-muted'
                    )}
                  >
                    <div className={cn(
                      'absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow',
                      form.qr_enabled ? 'left-7' : 'left-1'
                    )} />
                  </button>
                </div>

                {form.qr_enabled && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Buka QR Pada</Label>
                        <Input type="datetime-local" value={form.qr_open_at}
                          onChange={e => setForm({ ...form, qr_open_at: e.target.value })}
                          className="h-10 rounded-xl bg-muted/40 border-border/60 text-xs font-bold" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Tutup QR Pada</Label>
                        <Input type="datetime-local" value={form.qr_close_at}
                          onChange={e => setForm({ ...form, qr_close_at: e.target.value })}
                          className="h-10 rounded-xl bg-muted/40 border-border/60 text-xs font-bold" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Merit Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
                      <Trophy className="w-3 h-3 text-amber-500" />
                      Merit Kelab (auto)
                    </Label>
                    <Input
                      type="number" min={0} max={50}
                      value={form.merit_kelab}
                      onChange={e => setForm({ ...form, merit_kelab: Number(e.target.value) })}
                      placeholder="0"
                      className="h-10 rounded-xl bg-muted/40 border-border/60 font-bold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
                      <Trophy className="w-3 h-3 text-emerald-500" />
                      Merit Rasmi (perlu kelulusan)
                    </Label>
                    <Input
                      type="number" min={0} max={100}
                      value={form.merit_eakademik}
                      onChange={e => setForm({ ...form, merit_eakademik: Number(e.target.value) })}
                      placeholder="0"
                      className="h-10 rounded-xl bg-muted/40 border-border/60 font-bold"
                    />
                    <p className="text-[9px] text-muted-foreground/60">Akademik akan vouch, Kediaman luluskan</p>
                  </div>
                </div>
              </div>

              {/* Gambar bukti */}
              <div className="space-y-3 p-4 rounded-[2rem] border border-emerald-100 bg-emerald-500/5">
                <Label className="text-[10px] font-black uppercase text-emerald-800 tracking-widest flex justify-between">
                  <span>Muat Naik Gambar Bukti (Maks 2)</span>
                  <span className="text-emerald-500 normal-case opacity-70">{form.imageUrls?.length || 0} / 2</span>
                </Label>
                <div className="grid grid-cols-4 gap-3">
                  {(form.imageUrls || []).map((url: string, idx: number) => (
                    <div key={idx} className="relative group rounded-2xl overflow-hidden h-20 bg-card shadow-sm border border-emerald-100">
                      <img src={url} alt={`bukti ${idx}`} className="w-full h-full object-cover" />
                      <button onClick={(e) => { e.preventDefault(); handleRemoveImage(idx); }} type="button" className="absolute top-1.5 right-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-1 opacity-100 transition-opacity z-10">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {(!form.imageUrls || form.imageUrls.length < 2) && (
                    <div className="relative border-2 border-dashed border-emerald-200 rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 hover:bg-card hover:border-emerald-400 transition-colors h-20 cursor-pointer group shadow-sm bg-emerald-500/10/30">
                      <ImageIcon size={16} className="text-emerald-300 group-hover:text-emerald-500" />
                      <span className="text-[10px] font-black text-emerald-400 uppercase text-center group-hover:text-emerald-600">Tambah</span>
                      <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-6 bg-muted/20 border-t border-border/30 gap-3 shrink-0">
            <Button
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              className="flex-1 h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest"
            >
              Batal
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || uploading}
              className="flex-[2] h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-primary text-white shadow-xl hover:scale-105 transition-all"
            >
              {uploading ? 'Memuat naik gambar...' : saving ? 'Menyimpan...' : editTarget ? 'Kemaskini' : 'Simpan Aktiviti'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Card untuk setiap aktiviti kelab
function ActivityKelabCard({ act, currentUserId, effectiveRole, onEdit, onDelete }: any) {
  const statusCfg  = ACTIVITY_STATUS[act.status] || ACTIVITY_STATUS.perancangan;
  const priorityCfg = PRIORITY_CONFIG[act.priority] || PRIORITY_CONFIG.sederhana;
  const isOwner    = act.user_id === currentUserId;
  const [qrOpen, setQrOpen] = useState(false);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try { return format(parseISO(dateStr), 'd MMM yyyy', { locale: ms }); }
    catch { return dateStr; }
  };

  return (
    <>
      <Card className="bento-card border-none h-full overflow-hidden group hover:shadow-2xl transition-all duration-300">
        <CardContent className="p-6 space-y-5">
          {/* TOP ROW */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={cn('text-[10px] font-black uppercase px-2.5 py-1 border-none', statusCfg.bg, statusCfg.color)}>
                {statusCfg.label}
              </Badge>
              <div className="flex items-center gap-1.5">
                <div className={cn('w-1.5 h-1.5 rounded-full', priorityCfg.dot)} />
                <span className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest">
                  {priorityCfg.label}
                </span>
              </div>
            </div>
            {(isOwner || ['CLUB_PRESIDENT', 'CLUB_ADVISOR', 'SUPER_ADMIN_JPP'].includes(effectiveRole)) && (
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={onEdit}
                  className="w-7 h-7 rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  <Pencil size={11} />
                </button>
                <button
                  onClick={onDelete}
                  className="w-7 h-7 rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground hover:bg-rose-50 hover:text-rose-500 transition-colors"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            )}
          </div>

          {/* TITLE */}
          <h3 className="font-black text-lg tracking-tight leading-snug line-clamp-2">
            {act.title}
          </h3>

          {/* META */}
          <div className="space-y-2 text-[11px] font-bold text-muted-foreground">
            {(act.start_date) && (
              <div className="flex items-center gap-2">
                <Calendar size={12} className="text-muted-foreground/40 shrink-0" />
                <span>{formatDate(act.start_date)}{act.end_date ? ` — ${formatDate(act.end_date)}` : ''}</span>
              </div>
            )}
            {act.location && (
              <div className="flex items-center gap-2">
                <MapPin size={12} className="text-muted-foreground/40 shrink-0" />
                <span className="truncate">{act.location}</span>
              </div>
            )}
            {act.creator?.full_name && (
              <div className="flex items-center gap-2">
                <Users size={12} className="text-muted-foreground/40 shrink-0" />
                <span className="truncate">{act.creator.full_name}</span>
              </div>
            )}
          </div>

          {/* QR BADGE + MERIT */}
          {(act.qr_enabled || act.merit_kelab > 0 || act.merit_eakademik > 0) && (
            <div className="flex items-center gap-2 flex-wrap">
              {act.qr_enabled && (
                <button
                  onClick={() => setQrOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary/20 transition-colors"
                >
                  <QrCode size={10} />
                  Jana QR
                </button>
              )}
              {act.merit_kelab > 0 && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[9px] font-black uppercase tracking-widest text-amber-600">
                  <Trophy size={9} />
                  +{act.merit_kelab} Kelab
                </span>
              )}
              {act.merit_eakademik > 0 && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black uppercase tracking-widest text-emerald-700">
                  <Trophy size={9} />
                  +{act.merit_eakademik} Rasmi
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Modal */}
      {act.qr_token && (
        <QrCodeModal
          open={qrOpen}
          onClose={() => setQrOpen(false)}
          program={{
            id: act.id,
            type: 'aktiviti',
            title: act.title,
            qr_token: act.qr_token,
            merit_kelab: act.merit_kelab,
            qr_open_at: act.qr_open_at,
            qr_close_at: act.qr_close_at,
            date: act.start_date,
            venue: act.location,
          }}
        />
      )}
    </>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// TAB 2: TAKWIM RASMI (programs)
// Hanya MT & Presiden boleh buat — semua boleh nampak
// ══════════════════════════════════════════════════════════════════════════════
function TakwimRasmiTab({ user, profile, selectedClubId, canManage }: any) {
  const navigate = useNavigate();
  const { allowAiBudget } = useAiSettings();
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
  const [targetUnlock, setTargetUnlock] = useState<any>(null);
  const [unlockReason, setUnlockReason] = useState('');
  const [editTarget, setEditTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const emptyForm = {
    title: '', description: '', status: 'DRAFT',
    startDate: '', endDate: '', venue: '', budget: '',
    urlKertasKerja: '', urlPostMortem: '', isLocked: false,
    tindakan: '', pengarahProgram: '', imageUrls: [],
    qr_enabled: false, qr_open_at: '', qr_close_at: '',
    merit_kelab: 0, merit_eakademik: 0,
  };
  const [form, setForm] = useState<any>(emptyForm);
  const [allowAddTakwim, setAllowAddTakwim] = useState(true);

  const load = useCallback(async () => {
    if (!selectedClubId) return;
    setLoading(true);

    // DIOPTIMUM: Query terus menggunakan programs.club_id (selepas SQL Migration Ciri 3)
    const { data: progByClub } = await supabase
      .from('programs')
      .select('*')
      .eq('club_id', selectedClubId)
      .eq('is_archived', false)
      .order('tarikh_mula', { ascending: true });

    if (progByClub && progByClub.length > 0) {
      setActivities(progByClub);
    } else {
      // Fallback: guna user_id lookup (untuk data yang dicipta sebelum migration)
      const { data: members } = await supabase
        .from('profiles')
        .select('id')
        .eq('club_id', selectedClubId);
      const memberIds = members?.length ? members.map((m: any) => m.id) : [user?.id];
      const { data } = await supabase
        .from('programs')
        .select('*')
        .in('user_id', memberIds)
        .order('tarikh_mula', { ascending: true });
      if (data) setActivities(data);
    }

    const { data: settingData } = await supabase.from('system_settings').select('value').eq('key', 'allow_add_takwim').single();
    if (settingData !== null) setAllowAddTakwim(settingData.value);

    setLoading(false);
  }, [selectedClubId, user?.id]);

  useEffect(() => { load(); }, [load]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'kertas_kerja' | 'post_mortem') => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') { toast.error('Hanya PDF!'); return; }
    const toastId = toast.loading('Memuat naik ke Google Drive...');
    try {
      const fileName = `${type}_${selectedClubId}_${Date.now()}`;
      const url = await uploadPdfToDrive(file, 'program_docs', fileName);
      setForm((prev: any) => ({ ...prev, [type === 'kertas_kerja' ? 'urlKertasKerja' : 'urlPostMortem']: url }));
      toast.success('Fail sedia!', { id: toastId });
    } catch (err: any) {
      toast.error(err.message || 'Gagal upload.', { id: toastId });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const currentCount = form.imageUrls?.length || 0;
    const remainingSlots = 2 - currentCount;
    if (remainingSlots <= 0) { toast.error('Maksimum 2 gambar dibenarkan.'); return; }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    const toastId = toast.loading('Memuat naik gambar...');
    const urls: string[] = [];
    try {
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        if (!file.type.startsWith('image/')) continue;
        const fileName = `bukti_${selectedClubId}_${Date.now()}_${i}.png`;
        const filePath = `program_docs/${fileName}`;
        const { compressImage } = await import('@/lib/imageCompression');
        const compressedFile = await compressImage(file);
        await supabase.storage.from('reports').upload(filePath, compressedFile, { contentType: compressedFile.type });
        const { data: { publicUrl } } = supabase.storage.from('reports').getPublicUrl(filePath);
        urls.push(publicUrl);
      }
      setForm((prev: any) => ({ ...prev, imageUrls: [...(prev.imageUrls || []), ...urls] }));
      if (files.length > remainingSlots) toast.success(`${urls.length} gambar dimuat naik (Maks 2).`, { id: toastId });
      else toast.success(`${urls.length} gambar dimuat naik!`, { id: toastId });
    } catch {
      toast.error('Gagal upload gambar.', { id: toastId });
    }
  };

  const handleRemoveImage = async (index: number) => {
    const urlToRemove = form.imageUrls[index];
    setForm((prev: any) => ({
      ...prev,
      imageUrls: prev.imageUrls.filter((_: any, i: number) => i !== index)
    }));

    if (urlToRemove) {
      try {
        const urlParts = urlToRemove.split('/reports/');
        if (urlParts.length > 1) {
          const filePath = urlParts[1];
          await supabase.storage.from('reports').remove([filePath]);
        }
      } catch (e) {
        console.error('Failed to remove image from storage', e);
      }
    }
  };

  const handleSave = async () => {
    if (!form.title || !form.startDate || !form.pengarahProgram) { toast.error('Lengkapkan maklumat asas (termasuk Pengarah).'); return; }
    setSaving(true);
    const payload = {
      nama_program: form.title,
      deskripsi: form.description,
      tarikh_mula: form.startDate,
      tarikh_tamat: form.endDate,
      location: form.venue,
      budget: form.budget ? parseFloat(form.budget) : null,
      status: form.status,
      url_kertas_kerja: form.urlKertasKerja,
      url_post_mortem: form.urlPostMortem,
      user_id: user?.id,
      club_id: selectedClubId,
      tindakan: form.tindakan,
      pengarah_program: form.pengarahProgram,
      image_urls: form.imageUrls,
      qr_enabled: form.qr_enabled,
      qr_open_at: form.qr_open_at ? new Date(form.qr_open_at).toISOString() : null,
      qr_close_at: form.qr_close_at ? new Date(form.qr_close_at).toISOString() : null,
      merit_kelab: Number(form.merit_kelab) || 0,
      merit_eakademik: Number(form.merit_eakademik) || 0,
    };
    try {
      const res = editTarget
        ? await supabase.from('programs').update(payload).eq('id', editTarget.id)
        : await supabase.from('programs').insert([payload]);
      if (!res.error) {
        toast.success('Program disimpan.');
        
        // --- Trigger Push Notification ---
        if (!editTarget) {
          try {
            const { sendNotificationToKppExco } = await import('@/lib/notifications');
            await sendNotificationToKppExco({
              title: 'Kertas Kerja Baru (Takwim)',
              message: `Draf program baru telah ditambah: ${form.title}.`,
              type: 'DOCUMENT_UPLOAD',
              module: 'KPP',
              link: '/aktiviti'
            });
          } catch (e) {
            console.error("Gagal menghantar notifikasi push", e);
          }
        }
        
        queryCache.invalidate('dashboard_');
        setDialogOpen(false);
        load();
      }
      else throw res.error;
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan.');
    } finally { setSaving(false); }
  };

  const onConfirmUnlock = async () => {
    if (!unlockReason.trim()) { toast.error('Sila berikan alasan.'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('programs')
        .update({ status: 'REQUEST_UNLOCK', jpp_remarks: `[PERMOHONAN UNLOCK]: ${unlockReason}` })
        .eq('id', targetUnlock.id);
      if (error) throw error;

      // 4. Log Aktiviti
      await supabase.from('club_logs').insert([{
        club_id: selectedClubId,
        user_id: user?.id,
        type: 'UNLOCK_REQUEST',
        content: `MT [${user?.email}] memohon UNLOCK bagi program: ${targetUnlock.nama_program}. Sebab: ${unlockReason}`
      }]);

      toast.success("Permohonan Unlock dihantar ke JPP");
      setUnlockDialogOpen(false); setUnlockReason(''); load();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghantar permohonan.');
    } finally { setSaving(false); }
  };

  const handleDeleteProgram = async (actId: string) => {
    if (!window.confirm('Padam draf program ini secara kekal? Tindakan ini tidak boleh diundur.')) return;
    try {
      setSaving(true);
      const { error } = await supabase.from('programs').delete().eq('id', actId);
      if (error) throw error;
      toast.success('Draf berjaya dipadam');
      load();
    } catch (e: any) {
      toast.error('Gagal memadam draf: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const urgentItems = activities.filter(a =>
    (a.status === 'DRAFT' && differenceInDays(parseISO(a.tarikh_mula), new Date()) <= 14) ||
    ((a.status === 'DRAFT' || a.status === 'PENDING_POSTMORTEM') && !!a.jpp_remarks)
  );
  const activeZone = activities.filter(a => ['CONFIRMED', 'PENDING_APPROVAL', 'REQUEST_UNLOCK'].includes(a.status) && !urgentItems.includes(a));
  const draftingZone = activities.filter(a => a.status === 'DRAFT' && !urgentItems.includes(a));
  const archiveZone = activities.filter(a => a.status === 'COMPLETED');

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (act: any) => {
    setEditTarget(act);
    setForm({
      title: act.nama_program || '',
      description: act.deskripsi || '',
      status: act.status || 'DRAFT',
      startDate: act.tarikh_mula || '',
      endDate: act.tarikh_tamat || '',
      venue: act.location || '',
      budget: act.budget || '',
      urlKertasKerja: act.url_kertas_kerja || '',
      urlPostMortem: act.url_post_mortem || '',
      isLocked: false,
      tindakan: act.tindakan || '',
      pengarahProgram: act.pengarah_program || '',
      imageUrls: act.image_urls || [],
      qr_enabled: act.qr_enabled || false,
      qr_open_at: act.qr_open_at ? act.qr_open_at.replace('Z','').substring(0,16) : '',
      qr_close_at: act.qr_close_at ? act.qr_close_at.replace('Z','').substring(0,16) : '',
      merit_kelab: act.merit_kelab || 0,
      merit_eakademik: act.merit_eakademik || 0,
    });
    setDialogOpen(true);
  };

  if (!canManage && !loading && activities.length === 0) {
    return (
      <Empty className="py-24 rounded-[3rem] border-dashed border-2 bg-card shadow-sm">
        <EmptyMedia variant="icon">
          <CalendarDays className="w-10 h-10" />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle className="text-sm font-black uppercase tracking-widest">Takwim Belum Dikemaskini</EmptyTitle>
          <EmptyDescription className="text-xs">
            Presiden atau MT kelab anda belum mendaftarkan program rasmi dalam takwim.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-12 pb-20 pt-4 bg-muted/30 min-h-[60vh] rounded-[2rem] px-6 py-8">
      {/* TAKWIM HEADER ROW */}
      <div className="flex justify-between items-center">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Program Rasmi · Kertas Kerja Diperlukan
          </p>
        </div>
        {canManage && allowAddTakwim && (
          <Button
            onClick={openCreate}
            className="bg-primary text-white rounded-full h-12 px-6 shadow-xl shadow-primary/20 font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
          >
            <Plus className="mr-2 h-4 w-4" /> Program Baru
          </Button>
        )}
        {canManage && !allowAddTakwim && (
          <Button disabled variant="outline" className="rounded-full h-12 px-6 shadow-none font-black text-[10px] uppercase tracking-widest border-border cursor-not-allowed opacity-70">
            <Lock className="w-3.5 h-3.5 mr-2 text-muted-foreground" /> Pendaftaran Ditutup
          </Button>
        )}
      </div>

      {loading ? (
        <TakwimSkeleton />
      ) : (
        <div className="space-y-14">
          {urgentItems.length > 0 && (
            <section className="space-y-5">
              <SectionHeader title="Perhatian Segera" count={urgentItems.length} color="text-rose-500" icon={BellRing} />
              <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide">
                {urgentItems.map(act => (
                  <ProgramCard key={act.id} act={act} isUrgent canManage={canManage}
                    onEdit={() => openEdit(act)} load={load}
                    allowAddTakwim={allowAddTakwim} onDelete={() => handleDeleteProgram(act.id)}
                    onUnlock={() => { setTargetUnlock(act); setUnlockDialogOpen(true); }} />
                ))}
              </div>
            </section>
          )}

          <section className="space-y-5">
            <SectionHeader title="Status Semasa" count={activeZone.length} color="text-indigo-500" icon={Timer} />
            {activeZone.length === 0 ? (
              <p className="text-xs font-bold text-muted-foreground/40 uppercase tracking-widest px-2">
                Tiada program dalam pemprosesan
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {activeZone.map(act => (
                  <ProgramCard key={act.id} act={act} load={load} canManage={canManage}
                    onEdit={() => openEdit(act)}
                    allowAddTakwim={allowAddTakwim} onDelete={() => handleDeleteProgram(act.id)}
                    onUnlock={() => { setTargetUnlock(act); setUnlockDialogOpen(true); }} />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-5">
            <SectionHeader title="Draf Perancangan" count={draftingZone.length} color="text-muted-foreground" icon={Pencil} />
            {draftingZone.length === 0 ? (
              <p className="text-xs font-bold text-muted-foreground/40 uppercase tracking-widest px-2">
                Tiada draf sedia ada
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {draftingZone.map(act => (
                  <ProgramCard key={act.id} act={act} isMini load={load} canManage={canManage}
                    allowAddTakwim={allowAddTakwim} onDelete={() => handleDeleteProgram(act.id)}
                    onEdit={() => openEdit(act)} />
                ))}
              </div>
            )}
          </section>

          {archiveZone.length > 0 && (
            <section className="space-y-5 pt-8 border-t border-border">
              <SectionHeader title="Arkib & Selesai" count={archiveZone.length} color="text-slate-300" icon={Archive} />
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {archiveZone.map(act => (
                  <div key={act.id} className="p-4 bg-card/50 rounded-3xl flex items-center gap-3 border border-border shadow-sm">
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground/60">
                      <History size={13} />
                    </div>
                    <span className="text-[10px] font-black text-muted-foreground truncate uppercase tracking-tighter">
                      {act.nama_program}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* PROGRAM FORM DIALOG */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[620px] rounded-[3rem] p-0 border-none bg-card overflow-hidden flex flex-col max-h-[95vh]">
          <div className="p-10 space-y-8 overflow-y-auto flex-1">
            <DialogHeader>
              <DialogTitle className="text-4xl font-black tracking-tighter">
                {editTarget ? 'Kemaskini Program' : 'Program Baharu'}
              </DialogTitle>
              <p className="text-xs text-muted-foreground font-medium">
                Program rasmi memerlukan Kertas Kerja dan Post-Mortem
              </p>
            </DialogHeader>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-2 tracking-widest">
                  Nama Program *
                </Label>
                <Input
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="rounded-3xl border-none bg-muted/30 h-14 font-bold text-lg px-6"
                  placeholder="Nama program rasmi..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-2 tracking-widest">Tarikh Mula *</Label>
                  <div className="relative">
                    <Input type="date"
                      disabled={!!editTarget && form.status !== 'REQUEST_UNLOCK'}
                      value={form.startDate}
                      onChange={e => setForm({ ...form, startDate: e.target.value })}
                      className="rounded-3xl border-none bg-muted/30 h-14 font-black px-6" />
                    <Calendar size={16} className="absolute right-5 top-4.5 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-2 tracking-widest">Tarikh Tamat</Label>
                  <div className="relative">
                    <Input type="date"
                      disabled={!!editTarget && form.status !== 'REQUEST_UNLOCK'}
                      value={form.endDate}
                      onChange={e => setForm({ ...form, endDate: e.target.value })}
                      className="rounded-3xl border-none bg-muted/30 h-14 font-black px-6" />
                    <Calendar size={16} className="absolute right-5 top-4.5 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-2 tracking-widest">Lokasi</Label>
                  <Input value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })}
                    className="rounded-3xl border-none bg-muted/30 h-14 font-bold px-6" placeholder="Tempat program..." />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-end mb-1">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground ml-2 tracking-widest flex-1">Bajet (RM)</Label>
                      <AIBudgetGenerator 
                        initialTitle={form.title} 
                        initialDescription={form.description} 
                        onApplyBudget={(v) => setForm({...form, budget: v})} 
                        disabled={saving} 
                      />
                  </div>
                  <Input type="number" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })}
                    className="rounded-3xl border-none bg-muted/30 h-14 font-bold px-6" placeholder="0.00" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-2 tracking-widest">
                  Pengarah Program *
                </Label>
                <Input
                  value={form.pengarahProgram}
                  onChange={e => setForm({ ...form, pengarahProgram: e.target.value })}
                  className="rounded-3xl border-none bg-muted/30 h-14 font-bold text-lg px-6"
                  placeholder="Nama Pengarah Program..."
                />
              </div>

              <div className="space-y-4">
                {allowAiBudget && (
                  <div className="flex bg-indigo-500/10 rounded-2xl p-4 flex-col sm:flex-row items-center sm:items-start justify-between gap-4 border border-indigo-500/20">
                    <div>
                      <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5" /> Nexus AI Kertas Kerja
                      </h4>
                      <p className="text-[10px] text-muted-foreground font-medium mt-1">Jana draf atau betulkan format dengan bantuan AI.</p>
                    </div>
                    <Button type="button" onClick={() => navigate('/nexus')} variant="outline" className="w-full sm:w-auto shrink-0 bg-white dark:bg-background border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] hover:bg-indigo-500/10 uppercase tracking-widest gap-2">
                      <Sparkles className="w-3.5 h-3.5" /> Buka Nexus AI
                    </Button>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <UploadZone label="Kertas Kerja" isReady={!!form.urlKertasKerja}
                    onUpload={(e: any) => handleFileUpload(e, 'kertas_kerja')} color="bg-emerald-500/100" />
                  <UploadZone label="Post-Mortem PDF" isReady={!!form.urlPostMortem}
                    onUpload={(e: any) => handleFileUpload(e, 'post_mortem')} color="bg-indigo-600"
                    disabled={form.status !== 'PENDING_POSTMORTEM' && form.status !== 'CONFIRMED' && !form.urlPostMortem} />
                </div>
              </div>

              {/* ─── QR & MERIT SECTION (Takwim Rasmi) ─── */}
              <div className="space-y-4 p-6 rounded-[2rem] border border-primary/15 bg-primary/5">
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-primary" />
                  <p className="text-xs font-black uppercase tracking-widest text-primary">QR Check-in & Merit</p>
                </div>

                {/* Toggle QR */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Aktifkan QR Kehadiran</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">Peserta scan QR untuk daftar hadir automatik</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, qr_enabled: !form.qr_enabled })}
                    className={cn(
                      'relative w-12 h-6 rounded-full transition-all shrink-0',
                      form.qr_enabled ? 'bg-primary' : 'bg-muted'
                    )}
                  >
                    <div className={cn(
                      'absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow',
                      form.qr_enabled ? 'left-7' : 'left-1'
                    )} />
                  </button>
                </div>

                {form.qr_enabled && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Buka QR Pada</Label>
                      <Input type="datetime-local" value={form.qr_open_at}
                        onChange={e => setForm({ ...form, qr_open_at: e.target.value })}
                        className="h-11 rounded-2xl bg-muted/40 border-border/60 text-xs font-bold" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Tutup QR Pada</Label>
                      <Input type="datetime-local" value={form.qr_close_at}
                        onChange={e => setForm({ ...form, qr_close_at: e.target.value })}
                        className="h-11 rounded-2xl bg-muted/40 border-border/60 text-xs font-bold" />
                    </div>
                  </div>
                )}

                {/* Merit Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1">
                      <Trophy className="w-3 h-3 text-amber-500" />
                      Merit Kelab (auto)
                    </Label>
                    <Input type="number" min={0} max={50}
                      value={form.merit_kelab}
                      onChange={e => setForm({ ...form, merit_kelab: Number(e.target.value) })}
                      placeholder="0"
                      className="h-11 rounded-2xl bg-muted/40 border-border/60 font-bold" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1">
                      <Trophy className="w-3 h-3 text-emerald-500" />
                      Merit Rasmi (perlu kelulusan)
                    </Label>
                    <Input type="number" min={0} max={100}
                      value={form.merit_eakademik}
                      onChange={e => setForm({ ...form, merit_eakademik: Number(e.target.value) })}
                      placeholder="0"
                      className="h-11 rounded-2xl bg-muted/40 border-border/60 font-bold" />
                    <p className="text-[9px] text-muted-foreground/60">Akademik akan vouch, Kediaman luluskan</p>
                  </div>
                </div>
              </div>

              {/* Seksyen Post-Mortem Tambahan */}
              {(form.status === 'PENDING_POSTMORTEM' || form.status === 'CONFIRMED' || form.status === 'COMPLETED' || form.tindakan || (form.imageUrls && form.imageUrls.length > 0)) && (
                <div className="space-y-4 p-6 bg-indigo-500/5 border border-indigo-500/10 rounded-[2rem] animate-in slide-in-from-bottom-2 fade-in">
                  <h3 className="text-xs font-black uppercase text-indigo-500 tracking-widest pl-2">Butiran Tindakan & Gambar Bukti</h3>

                  <div className="space-y-2">
                    <div className="flex justify-between items-end">
                      <Label className="text-[10px] font-black uppercase text-indigo-400 ml-2 tracking-widest mb-1.5 flex-1">
                        Objektif / Deskripsi Program
                      </Label>
                      <AIGrammarCheck textValue={form.description} onApply={v => setForm({ ...form, description: v })} disabled={saving} />
                    </div>
                    <Textarea
                      value={form.description}
                      onChange={e => setForm({ ...form, description: e.target.value })}
                      placeholder="Matlamat atau objektif asal program ini dijalankan..."
                      className="rounded-3xl border border-border bg-card min-h-[100px] font-bold p-6 resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-end">
                      <Label className="text-[10px] font-black uppercase text-indigo-400 ml-2 tracking-widest mb-1.5 flex-1">
                        Rumusan Tindakan / Pencapaian
                      </Label>
                      <AIGrammarCheck textValue={form.tindakan} onApply={v => setForm({ ...form, tindakan: v })} disabled={saving} />
                    </div>
                    <Textarea
                      value={form.tindakan}
                      onChange={e => setForm({ ...form, tindakan: e.target.value })}
                      placeholder="Tindakan yang telah diambil, ulasan ringkas mengenai pelaksanaan program..."
                      className="rounded-3xl border border-border bg-card min-h-[100px] font-bold p-6 resize-none"
                    />
                  </div>

                  <div className="space-y-3 pt-2">
                    <Label className="text-[10px] font-black uppercase text-indigo-400 ml-2 tracking-widest flex justify-between">
                      <span>Muat Naik Gambar Bukti (Maks 2)</span>
                      <span className="text-indigo-300 normal-case opacity-70">{form.imageUrls?.length || 0} / 2</span>
                    </Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {(form.imageUrls || []).map((url: string, idx: number) => (
                        <div key={idx} className="relative group rounded-2xl overflow-hidden h-24 bg-muted border border-border shadow-sm">
                          <img src={url} alt={`bukti ${idx}`} className="w-full h-full object-cover" />
                          <button onClick={(e) => { e.preventDefault(); handleRemoveImage(idx); }} type="button" className="absolute top-1.5 right-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shadow-sm z-10">
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                      {(!form.imageUrls || form.imageUrls.length < 2) && (
                        <div className="relative border-2 border-dashed border-border rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 hover:bg-muted/50 hover:border-indigo-400 transition-colors h-24 cursor-pointer group shadow-sm bg-muted/20">
                          <ImageIcon size={20} className="text-muted-foreground group-hover:text-indigo-500 transition-colors" />
                          <span className="text-[9px] font-black text-muted-foreground uppercase text-center group-hover:text-indigo-600 transition-colors">Tambah Gambar</span>
                          <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" title="Muat naik gambar" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="p-8 bg-muted/20 border-t border-border shrink-0">
            <Button onClick={handleSave} disabled={saving}
              className="w-full bg-primary text-white rounded-2xl h-14 font-black text-sm uppercase tracking-widest shadow-xl">
              {saving ? 'Diproses...' : 'Sahkan & Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* UNLOCK DIALOG */}
      <Dialog open={unlockDialogOpen} onOpenChange={setUnlockDialogOpen}>
        <DialogContent className="rounded-[3rem] p-0 border-none bg-card overflow-hidden flex flex-col max-h-[95vh]">
          <div className="p-10 space-y-8 overflow-y-auto flex-1">
            <DialogHeader>
              <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-3xl flex items-center justify-center mb-4">
                <Unlock size={28} />
              </div>
              <DialogTitle className="text-3xl font-black">Mohon Unlock</DialogTitle>
            </DialogHeader>
            <div className="py-5 space-y-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground">Sebab Permohonan</Label>
              <Textarea value={unlockReason} onChange={e => setUnlockReason(e.target.value)}
                placeholder="Berikan alasan munasabah (cth: Perubahan tarikh exam)..."
                className="rounded-[2rem] bg-slate-50 border-none min-h-[120px] p-6 font-bold" />
            </div>
          </div>
          <DialogFooter className="gap-3 pt-2 shrink-0">
            <Button variant="ghost" onClick={() => { setUnlockDialogOpen(false); setUnlockReason(''); }}
              className="rounded-2xl font-bold h-12 flex-1 bg-muted">Batal</Button>
            <Button onClick={onConfirmUnlock} disabled={saving || !unlockReason.trim()}
              className="bg-indigo-600 text-white rounded-2xl h-12 flex-[2] font-black uppercase tracking-widest">
              {saving ? 'Menghantar...' : 'Hantar Permohonan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── SHARED SUB-COMPONENTS ────────────────────────────────────────────────────

function ProgramCard({ act, onEdit, load, isUrgent, isMini, onUnlock, canManage, onDelete, allowAddTakwim }: any) {
  const { user } = useAuth();
  const [qrOpen, setQrOpen] = useState(false);
  const daysLeft = act.tarikh_mula ? differenceInDays(parseISO(act.tarikh_mula), new Date()) : 999;
  const isPastDeadline = daysLeft < 9 && act.status === 'DRAFT';

  const submitAction = async (type: string) => {
    if (!confirm('Hantar permohonan ke JPP sekarang?')) return;
    const { error } = await supabase.from('programs').update({ status: type, jpp_remarks: null }).eq('id', act.id);
    if (!error) {
      toast.success('Berjaya dihantar!');
      await supabase.from('club_logs').insert([{
        club_id: act.club_id,
        user_id: user?.id,
        type: 'PROGRAM_SUBMISSION',
        content: `MT [${user?.email}] menghantar program [${act.title}] untuk semakan JPP (Status: ${type})`
      }]);
      load();
    }
  };

  const isRejectedKertasKerja = act.status === 'DRAFT' && !!act.jpp_remarks;
  const isRejectedPostMortem = act.status === 'PENDING_POSTMORTEM' && !!act.jpp_remarks;
  const isRejected = isRejectedKertasKerja || isRejectedPostMortem;

  return (
    <>
    <Card className={cn(
      'rounded-[2.5rem] border-none transition-all duration-300',
      isUrgent ? 'w-[300px] shrink-0 bg-card shadow-2xl ring-1 ring-rose-100 dark:ring-rose-900/50' : 'bg-card shadow-sm hover:shadow-xl',
      isMini && 'opacity-80 hover:opacity-100',
      isRejected && 'ring-1 ring-rose-200 dark:ring-rose-800/40'
    )}>
      <CardContent className={cn('p-7 space-y-5', isMini && 'p-5')}>
        <div className="flex justify-between items-start">
          <Badge className={cn(
            'rounded-full px-3 py-1 text-[9px] font-black uppercase border-none',
            isRejected ? 'bg-rose-500 text-white' :
              isPastDeadline ? 'bg-rose-500 text-white' :
                act.status === 'CONFIRMED' ? 'bg-emerald-500 text-white' :
                  act.status === 'REQUEST_UNLOCK' ? 'bg-indigo-500 text-white' :
                    'bg-muted text-muted-foreground'
          )}>
            {isRejectedKertasKerja ? '✕ Ditolak JPP' : isRejectedPostMortem ? '✕ Post-Mortem Ditolak' : isPastDeadline ? 'Masa Tamat' : act.status.replace(/_/g, ' ')}
          </Badge>
          {canManage && (
            <div className="flex gap-1.5">
              {(isPastDeadline || act.status === 'CONFIRMED') && (
                <Button onClick={onUnlock} variant="ghost" size="icon"
                  className="h-8 w-8 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" title="Mohon Buka Kunci Tarikh">
                  <Unlock size={13} />
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={onEdit}
                className="h-8 w-8 rounded-full bg-slate-50 dark:bg-muted/50 text-muted-foreground hover:bg-slate-200 dark:hover:bg-muted" title={isRejectedPostMortem ? "Muat Naik Semula Post-Mortem" : "Kemaskini"}>
                <Pencil size={13} />
              </Button>
              {act.status === 'DRAFT' && allowAddTakwim && (
                <Button variant="ghost" size="icon" onClick={onDelete}
                  className="h-8 w-8 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-500/20" title="Padam Program">
                  <Trash2 size={13} />
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <h3 className={cn('font-black text-foreground leading-tight',
            isMini ? 'text-base line-clamp-1' : 'text-xl line-clamp-2')}>
            {act.nama_program}
          </h3>
          {!isMini && act.tarikh_mula && (
            <p className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
              <Calendar size={12} className="text-muted-foreground/50" />
              {act.tarikh_mula}
            </p>
          )}
        </div>

        {/* QR + MERIT BADGES */}
        {(act.qr_enabled || act.merit_kelab > 0 || act.merit_eakademik > 0) && (
          <div className="flex items-center gap-2 flex-wrap">
            {act.qr_enabled && (
              <button
                onClick={() => setQrOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary/20 transition-colors"
              >
                <QrCode size={10} />
                Jana QR
              </button>
            )}
            {act.merit_kelab > 0 && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[9px] font-black uppercase text-amber-600">
                <Trophy size={9} />
                +{act.merit_kelab} Kelab
              </span>
            )}
            {act.merit_eakademik > 0 && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black uppercase text-emerald-700">
                <Trophy size={9} />
                +{act.merit_eakademik} Rasmi
              </span>
            )}
          </div>
        )}

        {act.jpp_remarks && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 rounded-2xl border border-rose-100 dark:border-rose-900/50 flex items-start gap-2">
            <Info size={13} className="text-rose-500 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-black uppercase text-rose-500 tracking-widest mb-0.5">Ulasan / Nota</p>
              <p className="text-[10px] font-bold text-rose-700 dark:text-rose-300 italic break-words">{act.jpp_remarks}</p>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-border/50 flex items-center justify-between">
          <div className="flex -space-x-1.5">
            <div className={cn('w-7 h-7 rounded-full border-2 border-background flex items-center justify-center shadow-sm',
              act.url_kertas_kerja ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground/40')}>
              <FileText size={11} />
            </div>
            <div className={cn('w-7 h-7 rounded-full border-2 border-background flex items-center justify-center shadow-sm',
              act.url_post_mortem ? 'bg-indigo-600 text-white' : 'bg-muted text-muted-foreground/40')}>
              <Check size={11} />
            </div>
          </div>
          {canManage && act.status === 'DRAFT' && (
            <Button disabled={!act.url_kertas_kerja || isPastDeadline}
              onClick={() => submitAction('PENDING_APPROVAL')}
              className={cn('h-9 px-5 rounded-full font-black text-[10px] uppercase shadow-md transition-all',
                isPastDeadline ? 'bg-muted text-muted-foreground shadow-none' : 'bg-primary text-primary-foreground hover:brightness-110 active:scale-95')}>
              {isPastDeadline ? <Lock size={11} className="mr-1" /> : <Send size={11} className="mr-1" />}
              Hantar
            </Button>
          )}
          {canManage && act.status === 'CONFIRMED' && (
            <Button disabled={!act.url_post_mortem}
              onClick={() => submitAction('PENDING_POSTMORTEM')}
              className="h-9 px-5 rounded-full font-black text-[10px] uppercase shadow-md transition-all bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95">
              <Send size={11} className="mr-1" />
              Hantar Post-Mortem
            </Button>
          )}
          {canManage && act.status === 'PENDING_POSTMORTEM' && act.jpp_remarks && (
            <Button disabled={!act.url_post_mortem}
              onClick={() => submitAction('PENDING_POSTMORTEM')}
              className="h-9 px-5 rounded-full font-black text-[10px] uppercase shadow-md transition-all bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95">
              <Send size={11} className="mr-1" />
              Hantar Semula
            </Button>
          )}
        </div>
      </CardContent>
    </Card>

    {/* QR Modal */}
    {act.qr_token && (
      <QrCodeModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        program={{
          id: act.id,
          type: 'takwim',
          title: act.nama_program,
          qr_token: act.qr_token,
          merit_kelab: act.merit_kelab,
          merit_eakademik: act.merit_eakademik,
          qr_open_at: act.qr_open_at,
          qr_close_at: act.qr_close_at,
          date: act.tarikh_mula,
          venue: act.location,
        }}
      />
    )}
  </>);
}

function SectionHeader({ title, count, color, icon: Icon }: any) {
  return (
    <div className="flex items-center justify-between px-1">
      <div className="flex items-center gap-3">
        <div className={cn('p-2.5 rounded-2xl', color.replace('text', 'bg').replace('500', '100').replace('400', '50').replace('300', '50'))}>
          <Icon size={18} className={color} />
        </div>
        <div>
          <h2 className="text-[12px] font-black uppercase tracking-[0.2em] text-foreground">{title}</h2>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{count} Program</p>
        </div>
      </div>
    </div>
  );
}

function AktivitiSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-in fade-in duration-500">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <Card key={i} className="rounded-[2.5rem] border-none bg-card p-7 h-64 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <Skeleton className="w-20 h-5 rounded-full" />
            <Skeleton className="w-8 h-8 rounded-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="w-full h-8 rounded-xl" />
            <Skeleton className="w-2/3 h-4 rounded-lg" />
          </div>
          <div className="mt-8 pt-6 border-t flex justify-between items-center">
            <Skeleton className="w-24 h-6 rounded-lg" />
            <Skeleton className="w-10 h-10 rounded-full" />
          </div>
        </Card>
      ))}
    </div>
  );
}

function TakwimSkeleton() {
  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      {[1, 2].map(i => (
        <section key={i} className="space-y-6">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="w-32 h-4 rounded-md" />
              <Skeleton className="w-24 h-3 rounded-md" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[1, 2, 3].map(j => (
              <Card key={j} className="rounded-[2.5rem] border-none bg-card p-7 h-56 shadow-sm">
                <Skeleton className="w-24 h-5 rounded-full mb-6" />
                <Skeleton className="w-full h-10 rounded-xl mb-4" />
                <Skeleton className="w-1/2 h-4 rounded-lg mb-8" />
                <div className="flex justify-between items-center border-t pt-4">
                  <div className="flex -space-x-2">
                    <Skeleton className="w-7 h-7 rounded-full border-2 border-white" />
                    <Skeleton className="w-7 h-7 rounded-full border-2 border-white" />
                  </div>
                  <Skeleton className="w-20 h-9 rounded-full" />
                </div>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function UploadZone({ label, isReady, onUpload, color, disabled }: any) {
  return (
    <div className={cn(
      'p-6 rounded-[2rem] border-2 border-dashed relative flex flex-col items-center gap-2 transition-all h-36 justify-center group',
      isReady ? `${color} text-white border-transparent shadow-xl scale-105` : 'bg-muted/30 border-border/60 hover:bg-muted/50 hover:border-primary/50',
      disabled && 'opacity-20 grayscale pointer-events-none'
    )}>
      {isReady ? <CheckCircle2 size={28} className="animate-in zoom-in" /> : <CloudUpload size={28} className="text-muted-foreground/50 group-hover:text-primary transition-colors" />}
      <span className={cn(
        "text-[10px] font-black uppercase tracking-widest text-center leading-tight",
        !isReady && "text-muted-foreground group-hover:text-primary transition-colors"
      )}>{label}</span>
      <input type="file" accept="application/pdf" onChange={onUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
    </div>
  );
}
