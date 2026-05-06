import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useTakwimPusat } from '@/hooks/useTakwimPusat';
import { TAKWIM_JENIS, TAKWIM_FILTER_OPTIONS, SESI_OPTIONS, INSTITUSI_LABEL, type TakwimItem } from '@/config/takwim-constants';
import { TakwimPusatBulkForm } from '@/components/takwim/TakwimPusatBulkForm';
import { cn, hexToRgba } from '@/lib/utils';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ms } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { PDFDownloadLink } from '@react-pdf/renderer';
import TakwimPusatPDFTemplate from '@/components/reports/TakwimPusatPDFTemplate';
import {
  CalendarDays, Plus, Filter, Download, ChevronLeft, ChevronRight,
  Pencil, Trash2, X, Table, LayoutGrid, Bell, Loader2, Upload, Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { JPP_MT_POSITIONS } from '@/types';

// ── Logo URLs ──
const LOGO_POLISAS_URL = 'https://api.cipher-node.org/storage/v1/object/public/reports/LOGO%20POLISAS.jpeg';
const LOGO_KPT_URL     = 'https://api.cipher-node.org/storage/v1/object/public/reports/Logo%20Kementerian.jpeg';
const LOGO_JPP_URL     = 'https://api.cipher-node.org/storage/v1/object/public/reports/LOGO%20JPP.jpg';
async function toBase64(url: string): Promise<string> {
  try { const r = await fetch(url, { cache: 'force-cache' }); if (!r.ok) throw 0; const b = await r.blob(); return new Promise((res, rej) => { const rd = new FileReader(); rd.onloadend = () => res(rd.result as string); rd.onerror = rej; rd.readAsDataURL(b); }); }
  catch { return ''; }
}

// ── RBAC helper ──
function useRbac() {
  const { user, profile, isSuperAdmin } = useAuth();
  const jppPos = profile?.jpp_position as string | undefined;
  const jppUnit = profile?.jpp_unit as string | undefined;
  const isYDP = jppPos === 'YDP' || jppPos === 'YANG_DIPERTUA' || isSuperAdmin;
  const isMT = !isYDP && JPP_MT_POSITIONS.includes(jppPos as any);
  const [assigned, setAssigned] = useState<string[]>([]);
  useEffect(() => {
    if (!isMT || !user?.id) return;
    supabase.from('jpp_mt_assignments').select('unit').eq('mt_user_id', user.id)
      .then(({ data }) => { if (data) setAssigned(data.map((d: any) => d.unit)); });
  }, [user?.id, isMT]);

  const canAddJenis = (jenis: string) => {
    if (isYDP) return true;
    if (isMT) {
      const mod = TAKWIM_JENIS[jenis]?.excoModule;
      return mod ? assigned.includes(mod) : false;
    }
    if (jppUnit === 'AKADEMIK') return jenis === 'AKADEMIK' || jenis === 'AKADEMIK_EXCO' || jenis === 'CUTI_UMUM';
    if (jppUnit) return TAKWIM_JENIS[jenis]?.excoModule === jppUnit;
    return false;
  };

  const canEdit = (item: TakwimItem) => {
    if (item.type !== 'takwim_pusat') return false;
    if (isYDP) return true;
    if (isMT && item.exco_module) return assigned.includes(item.exco_module);
    return item.created_by === user?.id;
  };

  const allowedJenis = Object.keys(TAKWIM_JENIS).filter(j => canAddJenis(j) && j !== 'KELAB');
  const canAdd = allowedJenis.length > 0;
  const isAkademik = jppUnit === 'AKADEMIK' || isYDP;

  return { canAdd, canEdit, allowedJenis, isAkademik, isYDP, userId: user?.id };
}

// ── Main Page ──
export function JppTakwimPage() {
  const [filter, setFilter] = useState('KESELURUHAN');
  const [sesi, setSesi] = useState('2026/2027');
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TakwimItem | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [calMonth, setCalMonth] = useState(new Date());
  const [logos, setLogos] = useState<{ polisas: string; kpt: string; jpp: string }>({ polisas: '', kpt: '', jpp: '' });

  useEffect(() => { Promise.all([toBase64(LOGO_POLISAS_URL), toBase64(LOGO_KPT_URL), toBase64(LOGO_JPP_URL)]).then(([p, k, j]) => setLogos({ polisas: p, kpt: k, jpp: j })); }, []);

  const filterLabel = TAKWIM_FILTER_OPTIONS.find(o => o.value === filter)?.label || 'Keseluruhan';

  const { items, loading, refresh, stats } = useTakwimPusat({ filter, sesi });
  const rbac = useRbac();

  const emptyForm = { jenis: '', tajuk: '', catatan: '', tarikh_mula: '', tarikh_tamat: '', bil_minggu: '', aktiviti: '' };
  const [form, setForm] = useState<any>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const openCreate = () => { setEditTarget(null); setForm({ ...emptyForm, jenis: rbac.allowedJenis[0] || '' }); setDialogOpen(true); };
  const openEdit = (item: TakwimItem) => {
    setEditTarget(item);
    setForm({ jenis: item.jenis, tajuk: item.tajuk, catatan: item.catatan || '', tarikh_mula: item.tarikh_mula, tarikh_tamat: item.tarikh_tamat || '', bil_minggu: item.bil_minggu || '', aktiviti: item.aktiviti || '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.tajuk || !form.tarikh_mula || !form.jenis) { toast.error('Sila lengkapkan tajuk, tarikh & jenis.'); return; }
    setSaving(true);
    const payload = {
      jenis: form.jenis, tajuk: form.tajuk, catatan: form.catatan || null,
      tarikh_mula: form.tarikh_mula, tarikh_tamat: form.tarikh_tamat || null,
      bil_minggu: form.bil_minggu ? Number(form.bil_minggu) : null,
      aktiviti: form.aktiviti || null, sesi,
      exco_module: TAKWIM_JENIS[form.jenis]?.excoModule || null,
      created_by: rbac.userId,
    };
    try {
      const res = editTarget
        ? await supabase.from('takwim_pusat').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editTarget.id)
        : await supabase.from('takwim_pusat').insert([payload]);
      if (res.error) throw res.error;
      toast.success(editTarget ? 'Dikemaskini!' : 'Ditambah!');
      setDialogOpen(false);
      refresh();
    } catch (e: any) { toast.error(e.message || 'Gagal.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (item: TakwimItem) => {
    if (!window.confirm(`Padam "${item.tajuk}"?`)) return;
    const { error } = await supabase.from('takwim_pusat').delete().eq('id', item.id);
    if (error) toast.error(error.message); else { toast.success('Dipadam!'); refresh(); }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(bulkSelected);
    if (ids.length === 0) return;
    if (!window.confirm(`Padam ${ids.length} entri yang dipilih?`)) return;
    setBulkDeleting(true);
    try {
      const { error } = await supabase.from('takwim_pusat').delete().in('id', ids);
      if (error) throw error;
      toast.success(`${ids.length} entri berjaya dipadam!`);
      setBulkSelected(new Set());
      refresh();
    } catch (e: any) { toast.error(e.message || 'Gagal padam.'); }
    finally { setBulkDeleting(false); }
  };

  const handleNotify = async () => {
    try {
      const { sendNotificationToAkademikExco } = await import('@/lib/notifications');
      await sendNotificationToAkademikExco({ title: 'Takwim Dikemaskini', message: 'Takwim POLISAS Berpusat telah dikemaskini. Sila semak.', type: 'GENERAL', module: 'AKADEMIK', link: '/akademik/takwim' });
      toast.success('Notifikasi dihantar!');
    } catch { toast.error('Gagal hantar notifikasi.'); }
  };

  return (
    <div className="min-h-screen text-white">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-8">
        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">Takwim POLISAS Berpusat</h1>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{INSTITUSI_LABEL} · {sesi}</p>
            </div>
          </div>
        </motion.div>

        {/* ── Controls ── */}
        <div className="flex flex-wrap items-center gap-3">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px] h-10 rounded-xl bg-white/5 border-white/10 text-xs font-bold text-white">
              <Filter className="w-3 h-3 mr-2 text-white/40" /><SelectValue />
            </SelectTrigger>
            <SelectContent>{TAKWIM_FILTER_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={sesi} onValueChange={setSesi}>
            <SelectTrigger className="w-[150px] h-10 rounded-xl bg-white/5 border-white/10 text-xs font-bold text-white"><SelectValue /></SelectTrigger>
            <SelectContent>{SESI_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
          <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/10">
            <button onClick={() => setViewMode('table')} className={cn('p-2 rounded-lg transition-all', viewMode === 'table' ? 'bg-white/10 text-white' : 'text-white/40')}><Table className="w-4 h-4" /></button>
            <button onClick={() => setViewMode('calendar')} className={cn('p-2 rounded-lg transition-all', viewMode === 'calendar' ? 'bg-white/10 text-white' : 'text-white/40')}><LayoutGrid className="w-4 h-4" /></button>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {rbac.isAkademik && (
              <Button onClick={() => setBulkMode(true)} variant="outline" className="h-10 rounded-xl border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 text-[10px] font-black uppercase tracking-widest">
                <Upload className="w-3 h-3 mr-2" />
                Auto-Fill Akademik
              </Button>
            )}
            {rbac.isYDP && (
              <Button onClick={handleNotify} variant="outline" className="h-10 rounded-xl border-amber-500/30 text-amber-400 hover:bg-amber-500/10 text-[10px] font-black uppercase tracking-widest">
                <Bell className="w-3 h-3 mr-2" />Hebah
              </Button>
            )}
            {items.length > 0 && (
              <PDFDownloadLink
                document={<TakwimPusatPDFTemplate data={items} themeColor="#1e3a5f" session={sesi} filterLabel={filterLabel} logoPolisas={logos.polisas} logoKpt={logos.kpt} logoJpp={logos.jpp} />}
                fileName={`Takwim_POLISAS_${sesi.replace('/', '-')}_${filterLabel}.pdf`}
              >
                {({ loading: pdfLoading }) => (
                  <Button variant="outline" disabled={pdfLoading} className="h-10 rounded-xl border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 text-[10px] font-black uppercase tracking-widest">
                    {pdfLoading ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Download className="w-3 h-3 mr-2" />}PDF
                  </Button>
                )}
              </PDFDownloadLink>
            )}
            {rbac.canAdd && (
              <Button onClick={openCreate} className="h-10 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest">
                <Plus className="w-3 h-3 mr-2" />Tambah
              </Button>
            )}
          </div>
        </div>

        {/* ── Stats Badges ── */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(stats).filter(([k]) => k !== 'KESELURUHAN').map(([k, v]) => {
            const cfg = TAKWIM_JENIS[k];
            if (!cfg || v === 0) return null;
            return (
              <Badge key={k} className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 border-none cursor-pointer hover:scale-105 transition-transform"
                style={{ background: cfg.bgColor, color: cfg.color }}
                onClick={() => setFilter(k)}>
                {cfg.shortLabel}: {v}
              </Badge>
            );
          })}
          {stats.KESELURUHAN > 0 && <Badge className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 bg-white/5 text-white/50 border-none">Jumlah: {stats.KESELURUHAN}</Badge>}
        </div>

        {/* ── Bulk Actions Bar ── */}
        {bulkSelected.size > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-rose-500/5 border border-rose-500/15">
            <span className="text-[10px] font-black uppercase tracking-widest text-rose-400">
              {bulkSelected.size} dipilih
            </span>
            <Button onClick={handleBulkDelete} disabled={bulkDeleting} variant="outline" className="h-8 rounded-lg border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-[10px] font-black uppercase tracking-widest">
              {bulkDeleting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Trash2 className="w-3 h-3 mr-1" />}
              Padam Semua
            </Button>
            <button onClick={() => setBulkSelected(new Set())} className="text-[10px] font-bold text-white/30 hover:text-white/60 ml-auto">
              Nyahpilih
            </button>
          </div>
        )}

        {/* ── Content ── */}
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-white/30" /></div>
        ) : viewMode === 'table' ? (
          <TakwimTable items={items} rbac={rbac} onEdit={openEdit} onDelete={handleDelete} bulkSelected={bulkSelected} onBulkToggle={setBulkSelected} />
        ) : (
          <TakwimCalendar items={items} month={calMonth} onPrev={() => setCalMonth(m => subMonths(m, 1))} onNext={() => setCalMonth(m => addMonths(m, 1))} />
        )}
      </div>

      {/* ── CRUD Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[520px] rounded-[2rem] p-0 border-none bg-slate-900 overflow-hidden flex flex-col max-h-[90vh]">
          <div className="p-8 space-y-6 overflow-y-auto flex-1">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight text-white">{editTarget ? 'Kemaskini' : 'Entri Baharu'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-white/50 tracking-widest">Jenis *</Label>
                <Select value={form.jenis} onValueChange={v => setForm({ ...form, jenis: v })} disabled={!!editTarget}>
                  <SelectTrigger className="h-12 rounded-xl bg-white/5 border-white/10 text-white font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent>{rbac.allowedJenis.map(j => <SelectItem key={j} value={j}>{TAKWIM_JENIS[j]?.label || j}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-white/50 tracking-widest">Tajuk *</Label>
                <Input value={form.tajuk} onChange={e => setForm({ ...form, tajuk: e.target.value })} className="h-12 rounded-xl bg-white/5 border-white/10 text-white font-bold" placeholder="Nama aktiviti / peristiwa..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-white/50 tracking-widest">Tarikh Mula *</Label>
                  <Input type="date" value={form.tarikh_mula} onChange={e => setForm({ ...form, tarikh_mula: e.target.value })} className="h-12 rounded-xl bg-white/5 border-white/10 text-white font-bold" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-white/50 tracking-widest">Tarikh Tamat</Label>
                  <Input type="date" value={form.tarikh_tamat} onChange={e => setForm({ ...form, tarikh_tamat: e.target.value })} className="h-12 rounded-xl bg-white/5 border-white/10 text-white font-bold" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-white/50 tracking-widest">Catatan</Label>
                <Textarea value={form.catatan} onChange={e => setForm({ ...form, catatan: e.target.value })} className="rounded-xl bg-white/5 border-white/10 text-white font-medium min-h-[60px] resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-white/50 tracking-widest">Bil. Minggu</Label>
                  <Input type="number" value={form.bil_minggu} onChange={e => setForm({ ...form, bil_minggu: e.target.value })} className="h-12 rounded-xl bg-white/5 border-white/10 text-white font-bold" placeholder="—" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-white/50 tracking-widest">Aktiviti</Label>
                  <Input value={form.aktiviti} onChange={e => setForm({ ...form, aktiviti: e.target.value })} className="h-12 rounded-xl bg-white/5 border-white/10 text-white font-bold" />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="p-6 bg-white/[0.02] border-t border-white/5 gap-3">
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="flex-1 h-12 rounded-xl text-white/50">Batal</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-[2] h-12 rounded-xl bg-indigo-500 text-white font-black text-[10px] uppercase tracking-widest">
              {saving ? 'Menyimpan...' : editTarget ? 'Kemaskini' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk Form Dialog ── */}
      {rbac.userId && (
        <TakwimPusatBulkForm
          open={bulkMode}
          onClose={() => setBulkMode(false)}
          onSuccess={refresh}
          userId={rbac.userId}
          sesi={sesi}
        />
      )}
    </div>
  );
}

// ── Table View ──
function TakwimTable({ items, rbac, onEdit, onDelete, bulkSelected, onBulkToggle }: {
  items: TakwimItem[]; rbac: any; onEdit: (i: TakwimItem) => void; onDelete: (i: TakwimItem) => void;
  bulkSelected: Set<string>; onBulkToggle: (s: Set<string>) => void;
}) {
  if (items.length === 0) return <EmptyState />;
  const fmtDate = (d: string) => { try { return format(parseISO(d), 'd MMM yyyy', { locale: ms }); } catch { return d; } };
  const editableItems = items.filter(i => i.type === 'takwim_pusat' && rbac.canEdit(i));
  const allSelected = editableItems.length > 0 && editableItems.every(i => bulkSelected.has(i.id));

  const toggleAll = () => {
    if (allSelected) { onBulkToggle(new Set()); }
    else { onBulkToggle(new Set(editableItems.map(i => i.id))); }
  };
  const toggleOne = (id: string) => {
    const next = new Set(bulkSelected);
    if (next.has(id)) next.delete(id); else next.add(id);
    onBulkToggle(next);
  };

  return (
    <div className="rounded-2xl border border-white/10 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-white/[0.04]">
              <th className="px-3 py-3 w-10">
                {editableItems.length > 0 && (
                  <input type="checkbox" checked={allSelected} onChange={toggleAll}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-rose-500 focus:ring-rose-500/30" />
                )}
              </th>
              <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-white/30">Jenis</th>
              <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-white/30">Tajuk</th>
              <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-white/30">Tarikh</th>
              <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-white/30">Minggu</th>
              <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-white/30">Catatan</th>
              <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-white/30 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {items.map(item => {
              const cfg = TAKWIM_JENIS[item.jenis];
              const color = item.warna_custom || cfg?.color || '#94A3B8';
              const canMod = rbac.canEdit(item);
              const isChecked = bulkSelected.has(item.id);
              return (
                <tr key={`${item.type}-${item.id}`} className={cn('hover:bg-white/[0.02] transition-colors group', isChecked && 'bg-rose-500/[0.03]')}>
                  <td className="px-3 py-3">
                    {canMod && (
                      <input type="checkbox" checked={isChecked} onChange={() => toggleOne(item.id)}
                        className="w-4 h-4 rounded border-white/20 bg-white/5 text-rose-500 focus:ring-rose-500/30" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 border-none" style={{ background: hexToRgba(color, 0.15), color }}>{cfg?.shortLabel || item.jenis}</Badge>
                    {item.status && <Badge className="ml-1 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-amber-500/10 text-amber-400 border-none">{item.status}</Badge>}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-black text-white/90 leading-tight">{item.tajuk}</p>
                    {item.club_name && <p className="text-[10px] text-white/30 mt-0.5">{item.club_name}</p>}
                  </td>
                  <td className="px-4 py-3 text-[11px] font-bold text-white/60 whitespace-nowrap">
                    {fmtDate(item.tarikh_mula)}{item.tarikh_tamat && item.tarikh_tamat !== item.tarikh_mula ? ` — ${fmtDate(item.tarikh_tamat)}` : ''}
                  </td>
                  <td className="px-4 py-3 text-xs font-black text-white/40 text-center">{item.bil_minggu || '—'}</td>
                  <td className="px-4 py-3 text-[10px] text-white/40 max-w-[200px] truncate">{item.catatan || '—'}</td>
                  <td className="px-4 py-3">
                    {canMod && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onEdit(item)} className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:text-indigo-400 hover:bg-indigo-500/10"><Pencil size={11} /></button>
                        <button onClick={() => onDelete(item)} className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:text-rose-400 hover:bg-rose-500/10"><Trash2 size={11} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Calendar View ──
function TakwimCalendar({ items, month, onPrev, onNext }: { items: TakwimItem[]; month: Date; onPrev: () => void; onNext: () => void }) {
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const startDay = getDay(startOfMonth(month));
  const getEvents = (day: Date) => items.filter(i => { const s = parseISO(i.tarikh_mula); const e = i.tarikh_tamat ? parseISO(i.tarikh_tamat) : s; return day >= s && day <= e; });

  return (
    <div className="rounded-2xl border border-white/10 overflow-hidden">
      <div className="flex items-center justify-between p-4 bg-white/[0.03]">
        <button onClick={onPrev} className="p-2 rounded-lg hover:bg-white/10 text-white/50"><ChevronLeft className="w-4 h-4" /></button>
        <h3 className="text-sm font-black text-white uppercase tracking-widest">{format(month, 'MMMM yyyy', { locale: ms })}</h3>
        <button onClick={onNext} className="p-2 rounded-lg hover:bg-white/10 text-white/50"><ChevronRight className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-7">
        {['Ahd', 'Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab'].map(d => (
          <div key={d} className="p-2 text-center text-[9px] font-black uppercase tracking-widest text-white/25 border-b border-white/5">{d}</div>
        ))}
        {Array.from({ length: startDay }).map((_, i) => <div key={`e-${i}`} className="p-2 min-h-[80px] border-b border-r border-white/[0.03]" />)}
        {days.map(day => {
          const evts = getEvents(day);
          const isToday = isSameDay(day, new Date());
          return (
            <div key={day.toISOString()} className={cn('p-1.5 min-h-[80px] border-b border-r border-white/[0.03] transition-colors', isToday && 'bg-indigo-500/5')}>
              <span className={cn('text-[10px] font-black', isToday ? 'text-indigo-400 bg-indigo-500/20 w-6 h-6 rounded-full flex items-center justify-center' : 'text-white/40')}>
                {format(day, 'd')}
              </span>
              <div className="mt-1 space-y-0.5">
                {evts.slice(0, 3).map(e => {
                  const c = e.warna_custom || TAKWIM_JENIS[e.jenis]?.color || '#94A3B8';
                  return <div key={e.id} className="text-[8px] font-bold px-1.5 py-0.5 rounded truncate" style={{ background: hexToRgba(c, 0.15), color: c }}>{e.tajuk}</div>;
                })}
                {evts.length > 3 && <div className="text-[8px] font-bold text-white/30 px-1">+{evts.length - 3}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <CalendarDays className="w-10 h-10 text-white/10 mb-3" />
      <p className="text-xs font-black text-white/20 uppercase tracking-widest">Tiada entri takwim</p>
      <p className="text-[10px] text-white/15 mt-1">Gunakan butang "Tambah" untuk menambah entri baru</p>
    </div>
  );
}
